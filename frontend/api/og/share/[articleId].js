// frontend/api/og/share/[articleId].js
// /analysis/share/:articleId sayfası için OG preview
import { ogHtml, API_BASE, SITE_URL, DEFAULT_IMG } from '../../_og-helper.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
    const url       = new URL(req.url);
    const articleId = url.pathname.split('/').pop();
    if (!articleId) return new Response('Not found', { status: 404 });

    const ua    = req.headers.get('user-agent') || '';
    const isBot = /whatsapp|telegram|snapchat|slack|discord|twitterbot|facebookexternalhit|linkedinbot|googlebot|bingbot|curl|wget/i.test(ua);

    if (!isBot) {
        return new Response(null, {
            status: 302,
            headers: { Location: `${SITE_URL}/analysis/share/${articleId}` },
        });
    }

    try {
        const res = await fetch(`${API_BASE}/analysis/share/${articleId}`, {
            headers: { 'Accept': 'application/json' },
            signal:  AbortSignal.timeout(5000),
        });

        let title       = 'Ne Haber — Analiz Sonucu';
        let description = 'Bu haberin AI analiz sonucunu görüntüle.';

        if (res.ok) {
            const data = await res.json();
            if (data.title)      title = `${data.title} — Analiz | Ne Haber`;
            if (data.prediction) {
                const conf = data.confidence ? ` (%${Math.round(data.confidence * 100)} güven)` : '';
                description = `Sonuç: ${data.prediction === 'AUTHENTIC' ? '✓ Güvenilir' : '✗ Şüpheli'}${conf} — Ne Haber AI analizi`;
            }
        }

        return new Response(ogHtml({
            title,
            description,
            imageUrl: DEFAULT_IMG,
            pageUrl:  `${SITE_URL}/analysis/share/${articleId}`,
        }), {
            headers: {
                'Content-Type':  'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=600, s-maxage=600',
            },
        });
    } catch {
        return new Response(ogHtml({ pageUrl: `${SITE_URL}/analysis/share/${articleId}` }), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }
}
