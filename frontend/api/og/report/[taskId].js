// frontend/api/og/report/[taskId].js
import { ogHtml, spaPassthrough, BOT_RE, API_BASE, SITE_URL, DEFAULT_IMG } from '../../_og-helper.js';

export const config = { runtime: 'edge' };

const VERDICT_LABEL = {
    'DOĞRU':                '✓ Doğru',
    'BÜYÜK_ÖLÇÜDE_DOĞRU':   '✓ Büyük Ölçüde Doğru',
    'KISMEN_DOĞRU':         '~ Kısmen Doğru',
    'KANIT_YETERSİZ':       '? Kanıt Yetersiz',
    'YANILTICI':            '⚠ Yanıltıcı',
    'BAĞLAMDAN_KOPARILMIŞ': '⚠ Bağlamdan Koparılmış',
    'SAHTE':                '✗ Sahte',
};

export default async function handler(req) {
    const url    = new URL(req.url);
    const taskId = url.pathname.split('/').pop();

    const ua    = req.headers.get('user-agent') || '';
    const isBot = BOT_RE.test(ua);

    // Gerçek kullanıcı → index.html (SPA) döndür
    if (!isBot) return spaPassthrough();

    try {
        const res = await fetch(`${API_BASE}/analysis/analyze/full-report/${taskId}`, {
            headers: { 'Accept': 'application/json' },
            signal:  AbortSignal.timeout(5000),
        });

        let title       = 'Ne Haber — Tam Rapor';
        let description = 'Yapay zeka destekli derin haber doğrulama raporu.';

        if (res.ok) {
            const data = await res.json();
            if (data.title) title = `${data.title} — Tam Rapor | Ne Haber`;
            if (data.report?.verdict?.decision) {
                const label = VERDICT_LABEL[data.report.verdict.decision] || data.report.verdict.decision;
                const score = data.report.credibility_score?.overall;
                description = `Karar: ${label}${score != null ? ` · Güvenilirlik: ${score}/100` : ''} — Ne Haber AI analizi`;
            } else if (data.report?.overall_assessment) {
                description = data.report.overall_assessment.slice(0, 200);
            }
        }

        return new Response(ogHtml({
            title, description,
            imageUrl: DEFAULT_IMG,
            pageUrl: `${SITE_URL}/analysis/report/${taskId}`,
        }), {
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
        });
    } catch {
        return new Response(ogHtml({ pageUrl: `${SITE_URL}/analysis/report/${taskId}` }), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }
}
