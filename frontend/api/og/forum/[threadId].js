// frontend/api/og/forum/[threadId].js
import { ogHtml, spaPassthrough, BOT_RE, API_BASE, SITE_URL, DEFAULT_IMG } from '../../_og-helper.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
    const url      = new URL(req.url);
    const threadId = url.pathname.split('/').pop();

    // Forum'un özel alt sayfaları (new, search) — SPA'ya bırak
    if (!threadId || threadId === 'new' || threadId === 'search') {
        return spaPassthrough();
    }

    const ua    = req.headers.get('user-agent') || '';
    const isBot = BOT_RE.test(ua);
    if (!isBot) return spaPassthrough();

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
            title, description,
            imageUrl: DEFAULT_IMG,
            pageUrl: `${SITE_URL}/forum/${threadId}`,
        }), {
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
        });
    } catch {
        return new Response(ogHtml({ pageUrl: `${SITE_URL}/forum/${threadId}` }), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }
}
