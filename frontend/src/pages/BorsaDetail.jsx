import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Star, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import MarketService from '../services/market.service';
import { useMarketPrefs } from '../hooks/useMarketPrefs';
import PriceChart from '../components/features/borsa/PriceChart';

const TS = { background: 'var(--color-terminal-surface)', borderColor: 'var(--color-terminal-border-raw)' };
const RANGES = [['1g', '1G'], ['1h', '1H'], ['1a', '1A'], ['1y', '1Y'], ['5y', '5Y']];

function Corner() {
    return (
        <>
            <div className="absolute top-0 left-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute top-0 left-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3.5 h-[2px] bg-brand pointer-events-none" />
            <div className="absolute bottom-0 right-0 h-3.5 w-[2px] bg-brand pointer-events-none" />
        </>
    );
}

function unitOf(c) { return c === 'USD' ? '$' : c === 'TRY' ? '₺' : ''; }
function fmt(v, c) {
    if (v == null) return '—';
    return `${unitOf(c)}${Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
}
function fmtBig(v, c) {
    if (v == null) return '—';
    const u = unitOf(c);
    const a = Math.abs(v);
    if (a >= 1e12) return `${u}${(v / 1e12).toFixed(2)}T`;
    if (a >= 1e9)  return `${u}${(v / 1e9).toFixed(2)}B`;
    if (a >= 1e6)  return `${u}${(v / 1e6).toFixed(1)}M`;
    return `${u}${Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}`;
}

function Panel({ title, color, children }) {
    return (
        <div className="relative border mb-3.5" style={{ ...TS, borderLeft: '3px solid rgba(63,255,139,0.55)' }}>
            <Corner />
            <div className="font-mono text-[10px] font-bold tracking-widest px-4 py-3 border-b"
                 style={{ color: color || 'var(--color-brand-primary)', borderColor: 'var(--color-terminal-border-raw)' }}>
                {title}
            </div>
            {children}
        </div>
    );
}

export default function BorsaDetail() {
    const { symbol } = useParams();
    const { isActive, toggle } = useMarketPrefs();
    const [range, setRange]   = useState('1a');
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState(false);

    useEffect(() => {
        let alive = true;
        (async () => {
            setLoading(true); setError(false);
            try { const d = await MarketService.getAnalysis(symbol, range); if (alive) { if (d?.error) setError(true); else setData(d); } }
            catch { if (alive) setError(true); }
            finally { if (alive) setLoading(false); }
        })();
        return () => { alive = false; };
    }, [symbol, range]);

    const starred = isActive(symbol);
    const up = data && data.change_pct >= 0;
    const chgColor = up ? 'var(--color-brand-primary)' : 'var(--color-fake-fill)';
    const rsi = data?.rsi;
    const rsiSignal = rsi == null ? '—' : rsi >= 70 ? 'Aşırı alım' : rsi <= 30 ? 'Aşırı satım' : 'Nötr';
    const perf = data?.perf ?? {};

    const perfColor = (v) => (v == null ? 'var(--color-text-muted)' : v >= 0 ? 'var(--color-brand-primary)' : 'var(--color-fake-fill)');
    const perfTxt   = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);

    return (
        <div className="w-full max-w-3xl mx-auto px-4 py-6">
            <Link to="/borsa" className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold mb-3"
                  style={{ color: 'var(--color-brand-primary)' }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Piyasalar
            </Link>

            {loading && !data ? (
                <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--color-brand-primary)' }} /></div>
            ) : error || !data ? (
                <div className="font-mono text-sm text-center py-20" style={{ color: 'var(--color-text-muted)' }}>sembol verisi alınamadı</div>
            ) : (
                <div className="animate-fade-up">
                    {/* ── Üst kart ── */}
                    <div className="relative border mb-3.5" style={TS}>
                        <Corner />
                        <div className="flex items-center gap-3.5 p-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <h1 className="font-extrabold text-xl leading-none" style={{ color: 'var(--color-text-primary)' }}>{data.name}</h1>
                                    <button type="button" onClick={() => toggle(symbol)} aria-label="Yıldızla">
                                        <Star className="w-4 h-4" fill={starred ? '#f59e0b' : 'none'} style={{ color: '#f59e0b' }} />
                                    </button>
                                </div>
                                <div className="font-mono text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>{symbol}</div>
                            </div>
                            <div className="ml-auto text-right">
                                <div className="font-mono font-black text-2xl" style={{ color: 'var(--color-text-primary)' }}>{fmt(data.price, data.currency)}</div>
                                <span className="font-mono text-[13px] font-bold inline-flex items-center gap-1" style={{ color: chgColor }}>
                                    {up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                    {Math.abs(data.change_pct).toFixed(2)}% · {data.change_abs >= 0 ? '+' : ''}{fmt(data.change_abs, data.currency)}
                                </span>
                            </div>
                        </div>

                        {/* aralık */}
                        <div className="flex gap-1 px-3 pb-2">
                            {RANGES.map(([k, lbl]) => (
                                <button key={k} type="button" onClick={() => setRange(k)}
                                        className="font-mono text-[11px] font-bold px-3 py-1 border transition-colors"
                                        style={range === k
                                            ? { background: 'var(--color-brand-primary)', color: 'var(--color-brand-badge-text)', borderColor: 'var(--color-brand-primary)' }
                                            : { color: 'var(--color-text-muted)', borderColor: 'var(--color-terminal-border-raw)' }}>
                                    {lbl}
                                </button>
                            ))}
                        </div>

                        {/* grafik */}
                        <div className="px-2 pb-3">
                            <PriceChart series={data.series} ma20Series={data.ma20_series} currency={data.currency} />
                            <div className="flex gap-3.5 mt-1.5 px-2 font-mono text-[10px]">
                                <span style={{ color: 'var(--color-brand-primary)' }}>━ Fiyat</span>
                                <span style={{ color: '#7c3aed' }}>┅ MA20</span>
                            </div>
                            {rsi != null && (
                                <div className="px-2 mt-3">
                                    <div className="flex justify-between font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>
                                        <span>RSI (14)</span><span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{rsi} · {rsiSignal}</span>
                                    </div>
                                    <div className="relative h-1.5 mt-1.5"
                                         style={{ background: 'linear-gradient(90deg,#16a34a 0 30%,var(--color-terminal-border-raw) 30% 70%,#dc2626 70% 100%)' }}>
                                        <span className="absolute top-[-3px] w-0.5 h-3" style={{ left: `${Math.min(100, Math.max(0, rsi))}%`, background: 'var(--color-text-primary)' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* istatistik grid */}
                        <div className="grid grid-cols-4 border-t" style={{ borderColor: 'var(--color-terminal-border-raw)' }}>
                            {[
                                ['AÇILIŞ', fmt(data.open, data.currency)],
                                ['GÜN YÜKSEK', fmt(data.day_high, data.currency)],
                                ['GÜN DÜŞÜK', fmt(data.day_low, data.currency)],
                                ['ÖNC. KAPANIŞ', fmt(data.prev_close, data.currency)],
                                ['HACİM', fmtBig(data.volume, data.currency)],
                                ['52H YÜKSEK', fmt(data.week52_high, data.currency)],
                                ['52H DÜŞÜK', fmt(data.week52_low, data.currency)],
                                ['PİYASA DEĞ.', fmtBig(data.market_cap, data.currency)],
                            ].map(([l, v], i) => (
                                <div key={l} className="px-3 py-2.5"
                                     style={{ borderRight: i % 4 !== 3 ? '1px solid var(--color-terminal-border-raw)' : 'none', borderTop: i >= 4 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                                    <div className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{l}</div>
                                    <div className="font-mono text-[12px] font-bold mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{v}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* performans */}
                    <Panel title="DÖNEM PERFORMANSI">
                        <div className="flex">
                            {[['1 HAFTA', perf.w1], ['1 AY', perf.m1], ['1 YIL', perf.y1], ['52H KONUM', perf.pos52 != null ? perf.pos52 : null]].map(([l, v], i) => (
                                <div key={l} className="flex-1 text-center py-3"
                                     style={{ borderRight: i < 3 ? '1px solid var(--color-terminal-border-raw)' : 'none' }}>
                                    <div className="font-mono text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{l}</div>
                                    <div className="font-mono text-base font-extrabold mt-1"
                                         style={{ color: l === '52H KONUM' ? 'var(--color-accent-amber)' : perfColor(v) }}>
                                        {l === '52H KONUM' ? (v != null ? `%${v}` : '—') : perfTxt(v)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>

                    {/* teknik */}
                    <Panel title="TEKNİK GÖSTERGELER">
                        <div className="flex flex-wrap gap-2.5 p-3.5">
                            {[
                                ['MA20', data.ma20 != null && data.price >= data.ma20 ? '↑ fiyat üstte' : '↓ fiyat altta'],
                                ['MA50', data.ma50 != null && data.price >= data.ma50 ? '↑ fiyat üstte' : '↓ fiyat altta'],
                                ['RSI(14)', rsi != null ? `${rsi} · ${rsiSignal}` : '—'],
                            ].map(([k, v]) => (
                                <span key={k} className="font-mono text-[11px] px-2.5 py-1.5 border"
                                      style={{ borderColor: 'var(--color-terminal-border-raw)', background: 'rgba(16,185,129,0.05)', color: 'var(--color-text-secondary)' }}>
                                    {k} <b style={{ color: 'var(--color-brand-primary)' }}>{v}</b>
                                </span>
                            ))}
                        </div>
                    </Panel>

                    {/* özet */}
                    <div className="relative border mb-3.5" style={{ ...TS, borderLeft: '3px solid var(--color-brand-primary)' }}>
                        <Corner />
                        <div className="font-mono text-[10px] font-bold tracking-widest px-4 py-3 border-b"
                             style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-terminal-border-raw)' }}>ÖZET</div>
                        <p className="px-4 py-3 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{data.summary}</p>
                    </div>

                    {/* AI bloğu — Task B9 */}
                </div>
            )}
        </div>
    );
}
