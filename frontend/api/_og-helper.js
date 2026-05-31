// frontend/api/_og-helper.js
const SITE_URL    = 'https://www.nehaber.dev';
const SITE_NAME   = 'Ne Haber';
const API_BASE    = process.env.VITE_API_BASE_URL || 'https://api.nehaber.dev/api/v1';
const DEFAULT_IMG = `${SITE_URL}/og-image.png`;

export const BOT_RE = /whatsapp|telegram|snapchat|slack|discord|twitterbot|facebookexternalhit|linkedinbot|googlebot|bingbot|curl|wget/i;

export function ogHtml({ title, description, imageUrl, pageUrl }) {
    const t   = esc(title       || `${SITE_NAME} | AI ile Haber Doğrulama`);
    const d   = esc(description || 'Yapay zeka destekli haber doğrulama platformu.');
    const img = esc(imageUrl    || DEFAULT_IMG);
    const url = esc(pageUrl     || SITE_URL);

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"/>
  <title>${t}</title>
  <meta name="description" content="${d}"/>
  <meta property="og:type"        content="article"/>
  <meta property="og:site_name"   content="${SITE_NAME}"/>
  <meta property="og:url"         content="${url}"/>
  <meta property="og:title"       content="${t}"/>
  <meta property="og:description" content="${d}"/>
  <meta property="og:image"       content="${img}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card"        content="summary_large_image"/>
  <meta name="twitter:title"       content="${t}"/>
  <meta name="twitter:description" content="${d}"/>
  <meta name="twitter:image"       content="${img}"/>
</head>
<body>
  <p><a href="${url}">${t}</a></p>
</body>
</html>`;
}

/** Bot değilse Vercel'in index.html'ini döndür (SPA passthrough) */
export async function spaPassthrough() {
    const res = await fetch(`${SITE_URL}/index.html`);
    const html = await res.text();
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
}

function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export { API_BASE, SITE_URL, DEFAULT_IMG };
