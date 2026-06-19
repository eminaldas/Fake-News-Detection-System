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
      position: 'fixed', bottom: 96, right: 20, zIndex: 8000,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none',
    }}>
      {running.map((job) => {
        const isReport = job.kind === 'report';
        return (
          <div
            key={job.taskId}
            onClick={() => navigate(isReport ? `/analysis/report/${job.taskId}` : '/')}
            style={{
              pointerEvents: 'auto', cursor: 'pointer',
              background: 'var(--color-terminal-surface)',
              borderRight: '1px solid var(--color-terminal-border-raw)',
              borderBottom: '1px solid var(--color-terminal-border-raw)',
              borderTop: '2px solid #10b981',
              borderLeft: '3px solid #10b981',
              borderRadius: 0,
              padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 2px 16px rgba(0,0,0,0.45)', width: 340,
            }}
          >
            <Loader2 size={15} color="#10b981" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {isReport ? 'Tam rapor hazırlanıyor' : 'Analiz ediliyor'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted-accent)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {job.label || '…'}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); dismiss(job.taskId); }}
              aria-label="Kapat"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted-accent)', padding: 0, flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
