/**
 * ActiveJobsPill — sol-altta sabit, çalışan arkaplan işlerini gösterir.
 * (Sağ-altı ToastContainer kullanır.) Tıklayınca ilgili sayfaya gider.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { useBackgroundJobs } from '../../contexts/BackgroundJobsContext';

export default function ActiveJobsPill() {
  const { jobs, dismiss } = useBackgroundJobs();
  const navigate = useNavigate();
  const running = Object.values(jobs).filter((j) => j.status === 'running');
  if (running.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 20, left: 20, zIndex: 8000,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {running.map((job) => {
        const isReport = job.kind === 'report';
        return (
          <div
            key={job.taskId}
            onClick={() => navigate(isReport ? `/analysis/report/${job.taskId}` : '/')}
            style={{
              pointerEvents: 'auto', cursor: 'pointer', background: '#1c2128',
              borderLeft: '3px solid #10b981', borderRadius: 4, padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 16px rgba(0,0,0,0.45)', width: 300,
            }}
          >
            <Loader2 size={15} color="#10b981" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#eef2f7' }}>
                {isReport ? 'Tam rapor hazırlanıyor' : 'Analiz ediliyor'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#8b949e', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {job.label || '…'}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(job.taskId); }}
              aria-label="Kapat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#484f58', padding: 0, flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
