import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const STORAGE_KEY = 'forum_view_count';
const NUDGE_THRESHOLD = 5;

/**
 * Forum sayfalarında kullanılır.
 * Giriş yapmamış kullanıcı 5 forum sayfası görüntüleyince modal çıkar.
 * Kullanım:
 *   const [showNudge, closeNudge] = useLoginNudge();
 *   {showNudge && <LoginNudgeModal onClose={closeNudge} />}
 */
export function useLoginNudge() {
    const { user } = useAuth();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (user) return; // giriş yapılmışsa sayma

        const count = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) + 1;
        localStorage.setItem(STORAGE_KEY, String(count));

        if (count >= NUDGE_THRESHOLD) {
            localStorage.setItem(STORAGE_KEY, '0');
            setShow(true);
        }
    }, []); // yalnızca mount'ta çalışır

    return [show, () => setShow(false)];
}

export default function LoginNudgeModal({ onClose }) {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-border rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
                <h2 className="text-lg font-bold mb-2">Daha fazlası için giriş yap</h2>
                <p className="text-sm text-muted mb-6">
                    Forum tartışmalarına katılmak, oy vermek ve analiz sonuçlarını
                    paylaşmak için hesap oluştur.
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/login')}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                    >
                        Giriş Yap
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl border border-border text-sm text-muted hover:text-foreground transition-colors"
                    >
                        Şimdi Değil
                    </button>
                </div>
            </div>
        </div>
    );
}
