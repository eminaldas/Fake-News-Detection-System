import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, AlertCircle, ArrowRight, Calendar, Percent } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const SharedAnalysis = () => {
  const { articleId } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalysis() {
      try {
        const res = await axios.get(`${API_BASE_URL}/analysis/share/${articleId}`);
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.detail ||
            err.message ||
            'Analiz bulunamadı.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalysis();
    return () => { cancelled = true; };
  }, [articleId]);

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center
                      bg-surface dark:bg-es-bg text-tx-primary gap-4">
        <div className="w-10 h-10 rounded-full border-4
                        border-brutal-border dark:border-es-primary/30
                        border-t-brand dark:border-t-es-primary
                        animate-spin" />
        <p className="text-sm text-tx-secondary font-inter">Analiz yükleniyor…</p>
      </div>
    );
  }

  /* ─── Error ─── */
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center
                      bg-surface dark:bg-es-bg text-tx-primary gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center
                        bg-red-50 dark:bg-es-error/10
                        border border-red-200 dark:border-es-error/25">
          <AlertCircle size={28} className="text-red-500 dark:text-es-error" strokeWidth={1.8} />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-manrope font-bold text-tx-primary mb-2">
            Analiz bulunamadı
          </h1>
          <p className="text-sm text-tx-secondary font-inter">
            {error || 'Bu bağlantı artık geçerli değil ya da analiz mevcut değil.'}
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                     bg-tx-primary dark:bg-es-primary
                     text-white dark:text-es-bg
                     hover:opacity-90 active:scale-95
                     transition-all duration-200"
        >
          Ana Sayfaya Dön
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const isFake = data.prediction === 'FAKE';
  const confidencePct = Math.round((data.confidence ?? 0) * 100);
  const clickbaitPct  = data.clickbait_score != null
    ? Math.round(data.clickbait_score * 100)
    : null;

  /* ─── Result ─── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center
                    bg-surface dark:bg-es-bg px-4 py-16">

      {/* Arka plan glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className={`absolute left-1/2 top-0 -translate-x-1/2 w-[600px] h-[300px]
                         blur-3xl rounded-full opacity-30 dark:opacity-40
                         ${isFake
                           ? 'bg-red-400/20 dark:bg-es-error/15'
                           : 'bg-green-400/20 dark:bg-es-primary/15'}`} />
      </div>

      <div className="w-full max-w-lg glass-card rounded-3xl p-8 md:p-10 flex flex-col gap-8">

        {/* Rozet — SAHTE / GÜVENİLİR */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center
                           ${isFake
                             ? 'bg-red-50 dark:bg-es-error/10 border border-red-200 dark:border-es-error/25'
                             : 'bg-green-50 dark:bg-es-primary/10 border border-green-200 dark:border-es-primary/25'}`}>
            {isFake
              ? <ShieldAlert size={36} className="text-red-500 dark:text-es-error" strokeWidth={1.5} />
              : <ShieldCheck  size={36} className="text-green-600 dark:text-es-primary" strokeWidth={1.5} />
            }
          </div>

          <span className={`text-3xl md:text-4xl font-manrope font-extrabold tracking-tight
                            ${isFake
                              ? 'text-red-500 dark:text-es-error'
                              : 'text-green-600 dark:text-es-primary'}`}>
            {isFake ? 'SAHTE' : 'GÜVENİLİR'}
          </span>

          <p className="text-xs font-semibold uppercase tracking-widest text-tx-secondary font-inter">
            Yapay Zeka Analiz Sonucu
          </p>
        </div>

        {/* Güven skoru */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-end gap-1">
            <span className={`text-6xl font-manrope font-extrabold leading-none
                              ${isFake
                                ? 'text-red-500 dark:text-es-error'
                                : 'text-green-600 dark:text-es-primary'}`}>
              {confidencePct}
            </span>
            <Percent size={24} className="text-tx-secondary mb-2" strokeWidth={1.8} />
          </div>
          <p className="text-xs text-tx-secondary font-inter">güven skoru</p>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-brutal-border dark:bg-es-surface mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700
                          ${isFake ? 'bg-red-500 dark:bg-es-error' : 'bg-green-500 dark:bg-es-primary'}`}
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        {/* Haber başlığı */}
        {data.title && (
          <div className="glass-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-tx-secondary font-inter mb-2">
              Analiz Edilen Başlık
            </p>
            <p className="text-base font-manrope font-semibold text-tx-primary leading-snug">
              {data.title}
            </p>
          </div>
        )}

        {/* Ek metrikler */}
        <div className={`grid gap-3 ${clickbaitPct != null ? 'grid-cols-2' : 'grid-cols-1'}`}>

          {/* Risk skoru */}
          {data.risk_score != null && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-tx-secondary font-inter mb-1">Risk Skoru</p>
              <p className="text-xl font-manrope font-bold text-tx-primary">
                %{Math.round(data.risk_score * 100)}
              </p>
            </div>
          )}

          {/* Clickbait skoru */}
          {clickbaitPct != null && (
            <div className="glass-card rounded-xl p-4">
              <p className="text-xs text-tx-secondary font-inter mb-1">Tıklama Tuzağı</p>
              <p className="text-xl font-manrope font-bold text-es-tertiary dark:text-es-tertiary">
                %{clickbaitPct}
              </p>
            </div>
          )}
        </div>

        {/* Tarih */}
        <div className="flex items-center gap-2 text-xs text-tx-secondary font-inter">
          <Calendar size={13} className="shrink-0" strokeWidth={1.8} />
          <span>Analiz tarihi: {formatDate(data.created_at)}</span>
        </div>

        {/* CTA */}
        <Link
          to="/"
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl
                     font-bold text-sm font-inter
                     bg-tx-primary dark:bg-es-primary
                     text-white dark:text-es-bg
                     hover:opacity-90 active:scale-95
                     transition-all duration-200 shadow-md min-h-[48px]"
        >
          Kendi Haberini Analiz Et
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Footer notu */}
      <p className="mt-6 text-xs text-muted font-inter text-center max-w-xs">
        Bu sonuç yapay zeka tarafından üretilmiştir. Kesin yargı için birden fazla kaynağa başvurunuz.
      </p>
    </div>
  );
};

export default SharedAnalysis;
