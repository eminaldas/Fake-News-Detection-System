import React, { useState, useEffect } from 'react';
import { ThumbsUp } from 'lucide-react';
import axiosInstance from '../../api/axios';

const ProfileFeedback = () => {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance.get('/users/me/feedback')
            .then(r => setData(r.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="text-sm text-muted p-4">Yükleniyor...</div>;

    if (!data || data.total_sent === 0) return (
        <div className="text-sm text-muted p-4">
            Henüz model düzeltmesi göndermedin. Analiz geçmişindeki kartlara tıklayarak düzeltme ekleyebilirsin.
        </div>
    );

    return (
        <div className="space-y-4 max-w-lg">
            {/* Özet kartları */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-4 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <p className="text-2xl font-black text-tx-primary">{data.total_sent}</p>
                    <p className="text-[10px] text-muted mt-1">gönderdiğin düzeltme</p>
                </div>
                <div className="rounded-xl border p-4 text-center" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <p className="text-2xl font-black" style={{ color: 'var(--color-brand-primary)' }}>{data.total_accepted}</p>
                    <p className="text-[10px] text-muted mt-1">modele yansıdı</p>
                </div>
            </div>

            {/* Düzeltme listesi */}
            <div className="rounded-xl border" style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-border)' }}>
                    <ThumbsUp className="w-4 h-4 text-muted" />
                    <p className="text-[10px] font-black uppercase tracking-wider text-muted">Düzeltme Geçmişi</p>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                    {data.items.map((item, i) => (
                        <div key={i} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-tx-secondary truncate max-w-[260px]">{item.article_title}</p>
                                <p className="text-[10px] text-muted flex-shrink-0 ml-2">
                                    {new Date(item.created_at).toLocaleDateString('tr-TR')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {item.model_status && (
                                    <>
                                        <span className={`text-[10px] px-2 py-0.5 rounded ${item.model_status === 'Yanıltıcı' ? 'bg-red-500/15 text-red-400' : 'bg-green-500/15 text-green-400'}`}>
                                            Sistem: {item.model_status}
                                        </span>
                                        <span className="text-[10px] text-muted">→</span>
                                    </>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded ${item.submitted_label === 'Yanıltıcı' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>
                                    Senin oyun: {item.submitted_label}
                                </span>
                                <span className="text-[10px] ml-auto">
                                    <span className={item.accepted ? '' : 'text-muted'} style={item.accepted ? { color: 'var(--color-brand-primary)' } : {}}>
                                        {item.accepted ? 'Kabul edildi' : 'Beklemede'}
                                    </span>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProfileFeedback;
