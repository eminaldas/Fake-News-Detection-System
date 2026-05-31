// frontend/api/og/forum/[threadId].js
// /forum/:threadId sayfası için OG preview
import { ogHtml, API_BASE, SITE_URL, DEFAULT_IMG } from '../../_og-helper.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
    const url      = new URL(req.url);
    const threadId = url.pathname.split('/').pop();
    if (!threadId) return new Response('Not found', { status: 404 });

    const ua    = req.headers.get('user-agent') || '';
    const isBot = /whatsapp|telegram|snapchat|slack|discord|twitterbot|facebookexternalhit|linkedinbot|googlebot|bingbot|curl|wget/i.test(ua);

    if (!isBot) {
        return new Response(null, {
            status: 302,
            headers: { Location: `${SITE_URL}/forum/${threadId}` },
        });
    }

    try {
        const res = await fetch(`${API_BASE}/forum/threads/${threadId}`, {
            headers: { 'Accept': 'application/json' },
            signal:  AbortSignal.timeout(5000),
        });

        let title       = 'Ne Haber Forum — Tartışma';
        let description = 'Ne Haber topluluk forumunda bu haberi tartışın.';

        if (res.ok) {
            const data = await res.json();
            if (data.title) title = `${data.title} | Ne Haber Forum`;
            if (data.body)  description = data.body.replace(/\*\*|__|\[.*?\]\(.*?\)/g, '').slice(0, 200);
        }

        return new Response(ogHtml({
            title,
            description,
            imageUrl: DEFAULT_IMG,
            pageUrl:  `${SITE_URL}/forum/${threadId}`,
        }), {
            headers: {
                'Content-Type':  'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=300, s-maxage=300',
            },
        });
    } catch {
        return new Response(ogHtml({ pageUrl: `${SITE_URL}/forum/${threadId}` }), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }
}
