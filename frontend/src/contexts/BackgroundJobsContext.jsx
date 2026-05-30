/**
 * BackgroundJobsContext — analiz/rapor işlerini arkaplanda takip eder.
 * Global WS eventlerini dinler, işleri localStorage'da tutar, tamamlanınca
 * toast üretir. Toast'ın TEK sahibi burasıdır (hooks başarı toast'ı üretmez).
 */
import React, { createContext, useContext, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from './WebSocketContext';
import AnalysisService from '../services/analysis.service';
import toast from '../services/toast';

const LS_KEY = 'bg_jobs';
const TTL_MS = 30 * 60 * 1000;   // 30 dk — zombi iş temizliği
const POLL_MS = 20_000;          // rapor fallback polling

const Ctx = createContext(null);

function loadJobs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const now = Date.now();
    const fresh = {};
    for (const [id, job] of Object.entries(parsed)) {
      if (job && now - (job.createdAt || 0) < TTL_MS) fresh[id] = job;
    }
    return fresh;
  } catch { return {}; }
}

function persistJobs(jobs) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(jobs)); } catch { /* yoksay */ }
}

export function BackgroundJobsProvider({ children }) {
  const [jobs, setJobs] = useState(loadJobs);
  const jobsRef = useRef(jobs);
  // ref'i render dışında sync'le — lint kuralı gereği layout effect içinde
  useLayoutEffect(() => { jobsRef.current = jobs; });
  const { subscribe } = useWebSocket();
  const navigate = useNavigate();

  const commit = useCallback((next) => {
    jobsRef.current = next;
    persistJobs(next);
    setJobs(next);
  }, []);

  const dismiss = useCallback((taskId) => {
    if (!jobsRef.current[taskId]) return;
    const next = { ...jobsRef.current };
    delete next[taskId];
    commit(next);
  }, [commit]);

  const upsert = useCallback((taskId, patch) => {
    const prev = jobsRef.current[taskId] || {};
    commit({ ...jobsRef.current, [taskId]: { ...prev, ...patch, taskId } });
  }, [commit]);

  const startJob = useCallback((taskId, kind, meta = {}) => {
    if (!taskId) return;
    upsert(taskId, {
      kind, status: 'running', stage: 0,
      label: 'Başlatılıyor…', title: meta.title || '', createdAt: Date.now(),
    });
  }, [upsert]);

  const updateStage = useCallback((taskId, stage, label) => {
    const job = jobsRef.current[taskId];
    if (!job || job.status !== 'running') return;
    upsert(taskId, { stage, label });
  }, [upsert]);

  const completeJob = useCallback((taskId) => {
    const job = jobsRef.current[taskId];
    if (!job || job.status === 'done') return; // idempotent
    upsert(taskId, { status: 'done' });
    const isReport = job.kind === 'report';
    toast.success(isReport ? 'Tam rapor hazır' : 'Analiz tamamlandı', {
      sub: job.title || undefined,
      action: {
        label: 'Görüntüle',
        onClick: () => navigate(isReport ? `/analysis/report/${taskId}` : '/'),
      },
    });
    setTimeout(() => {
      const j = jobsRef.current[taskId];
      if (j && j.status === 'done') dismiss(taskId);
    }, 8000);
  }, [upsert, navigate, dismiss]);

  const failJob = useCallback((taskId) => {
    const job = jobsRef.current[taskId];
    if (!job || job.status === 'failed') return;
    upsert(taskId, { status: 'failed' });
    toast.error('Rapor oluşturulamadı', { sub: job.title || undefined });
    setTimeout(() => dismiss(taskId), 6000);
  }, [upsert, dismiss]);

  const startReport   = useCallback((taskId, meta = {}) => startJob(taskId, 'report', meta), [startJob]);
  const trackAnalysis = useCallback((taskId, meta = {}) => startJob(taskId, 'analysis', meta), [startJob]);
  const getJob        = useCallback((taskId) => jobsRef.current[taskId] || null, []);

  // Global WS aboneliği (bir kez)
  useEffect(() => {
    const unsubs = [
      subscribe('report_progress', (p) => p?.task_id && updateStage(p.task_id, p.stage ?? 0, p.label || 'İşleniyor…')),
      subscribe('report_ready',    (p) => p?.task_id && completeJob(p.task_id)),
      subscribe('report_failed',   (p) => p?.task_id && failJob(p.task_id)),
      subscribe('analysis_progress', (p) => p?.task_id && updateStage(p.task_id, 0, typeof p.stage === 'string' ? p.stage : 'İşleniyor…')),
      subscribe('analysis_complete', (p) => p?.task_id && completeJob(p.task_id)),
    ];
    return () => unsubs.forEach((u) => u && u());
  }, [subscribe, updateStage, completeJob, failJob]);

  // Çalışan rapor işlerinin id kümesi — yalnızca KÜME değişince polling yeniden kurulur
  // (her stage güncellemesinde değil; yoksa 20sn'lik güvenlik ağı sürekli sıfırlanır).
  const runningReportKey = Object.values(jobs)
    .filter((j) => j.kind === 'report' && j.status === 'running')
    .map((j) => j.taskId)
    .join(',');

  // Rapor işleri için fallback polling (WS kaçarsa güvenlik ağı)
  useEffect(() => {
    if (!runningReportKey) return undefined;
    const ids = runningReportKey.split(',');
    const iv = setInterval(() => {
      ids.forEach((taskId) => {
        AnalysisService.getFullReport(taskId)
          .then((data) => { if (data?.status === 'cached' && data.report) completeJob(taskId); })
          .catch(() => { /* pending=200; gerçek 404 sessiz geç */ });
      });
    }, POLL_MS);
    return () => clearInterval(iv);
  }, [runningReportKey, completeJob]);

  const value = useMemo(() => ({
    jobs, startReport, trackAnalysis, updateStage, completeJob, failJob, getJob, dismiss,
  }), [jobs, startReport, trackAnalysis, updateStage, completeJob, failJob, getJob, dismiss]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBackgroundJobs() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useBackgroundJobs must be used within BackgroundJobsProvider');
  return ctx;
}
