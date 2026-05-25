// ── Emerald Sentinel renk tokenları ──────────────────────────────────────
const C = {
    brand:   '#10b981',
    fake:    '#ff7351',  fakeBg:  'rgba(255,115,81,0.12)',  fakeBrd: 'rgba(255,115,81,0.35)',
    auth:    '#3fff8b',  authBg:  'rgba(63,255,139,0.10)',  authBrd: 'rgba(63,255,139,0.30)',
    warn:    '#f59e0b',  warnBg:  'rgba(245,158,11,0.12)',  warnBrd: 'rgba(245,158,11,0.35)',
    surface: 'rgba(11,21,24,0.94)',
    border:  '#2d343d',
    mut:     '#7d8896',
    pri:     '#eef2f7',
};

// ═══════════════════════════════════════════════════════════════════════════
//  Makale metni çıkarma — başlık yerine gerçek içerik
// ═══════════════════════════════════════════════════════════════════════════
function extractArticleText() {
    // Öncelik sırasına göre semantik seçiciler
    const selectors = [
        'article',
        '[role="article"]',
        '.article-body',
        '.article-content',
        '.news-article',
        '.news-content',
        '.post-content',
        '.entry-content',
        '.story-body',
        '.haber-icerik',
        '.haber-detay',
        'main',
    ];

    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) continue;

        // Script/style içeriğini atla
        const clone = el.cloneNode(true);
        clone.querySelectorAll('script, style, nav, header, footer, aside, .ad, .reklam').forEach(n => n.remove());

        const text = clone.innerText.trim().replace(/\s+/g, ' ');
        if (text.length > 120) return text.slice(0, 1000);
    }

    // Fallback: uzun paragraflar
    const paras = [...document.querySelectorAll('p')]
        .filter(p => p.textContent.trim().length > 100)
        .map(p => p.textContent.trim())
        .join(' ');

    if (paras.length > 80) return paras.slice(0, 1000);

    // Son çare: başlık
    return document.title;
}

// ── Haber sayfası tespiti ─────────────────────────────────────────────────
function isNewsPage() {
    const hasArticle = document.querySelector(
        'article, [role="article"], .article-body, .news-content, .post-content'
    ) !== null;
    const longParas = [...document.querySelectorAll('p')]
        .filter(p => p.textContent.trim().length > 180);
    return hasArticle || longParas.length >= 3;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Pill badge
// ═══════════════════════════════════════════════════════════════════════════
let badge = null;

function createBadge() {
    if (badge) return;
    badge = document.createElement('div');
    badge.id = '__shd__';

    Object.assign(badge.style, {
        position:       'fixed',
        bottom:         '20px',
        right:          '20px',
        zIndex:         '2147483647',
        display:        'flex',
        alignItems:     'center',
        gap:            '7px',
        padding:        '7px 13px',
        borderRadius:   '999px',
        background:     C.surface,
        border:         `1px solid ${C.border}`,
        color:          C.mut,
        fontFamily:     "'Segoe UI', system-ui, sans-serif",
        fontSize:       '12px',
        fontWeight:     '700',
        boxShadow:      '0 4px 20px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        transition:     'all 0.25s cubic-bezier(0.22,1,0.36,1)',
        userSelect:     'none',
        lineHeight:     '1',
        letterSpacing:  '0.01em',
        maxWidth:       '240px',
        overflow:       'hidden',
        whiteSpace:     'nowrap',
        // Badge sadece bilgilendirici — tıklanabilir görünmesini engelle
        cursor:         'default',
        pointerEvents:  'auto',
    });
    badge.title = 'Detaylar için araç çubuğu ikonuna tıklayın';

    const dot = document.createElement('span');
    dot.id = '__shd_dot__';
    Object.assign(dot.style, {
        width: '7px', height: '7px',
        borderRadius: '50%',
        background: C.mut,
        flexShrink: '0',
        transition: 'background 0.3s, box-shadow 0.3s',
    });

    const lbl = document.createElement('span');
    lbl.id = '__shd_lbl__';
    lbl.textContent = 'analiz ediliyor';

    const score = document.createElement('span');
    score.id = '__shd_score__';
    Object.assign(score.style, {
        padding: '2px 6px', borderRadius: '4px',
        fontSize: '10px', fontWeight: '800',
        fontFamily: 'monospace',
        display: 'none',
    });

    badge.appendChild(dot);
    badge.appendChild(lbl);
    badge.appendChild(score);
    document.body.appendChild(badge);
}

function updateBadge(state, pct) {
    if (!badge) return;
    const dot   = document.getElementById('__shd_dot__');
    const lbl   = document.getElementById('__shd_lbl__');
    const score = document.getElementById('__shd_score__');

    const apply = (bg, brd, color, dotColor, label, showScore) => {
        badge.style.background = bg;
        badge.style.border     = `1px solid ${brd}`;
        badge.style.color      = color;
        dot.style.background   = dotColor;
        dot.style.boxShadow    = dotColor !== C.mut ? `0 0 6px ${dotColor}` : 'none';
        lbl.textContent        = label;
        score.style.display    = showScore && pct != null ? 'inline' : 'none';
        if (showScore && pct != null) {
            score.textContent      = `%${Math.round(pct)}`;
            score.style.background = dotColor + '28';
            score.style.color      = dotColor;
        }
    };

    if      (state === 'loading')    apply(C.surface, C.border,  C.mut,  C.mut,   'analiz ediliyor',   false);
    else if (state === 'fake')       apply(C.fakeBg,  C.fakeBrd, C.fake, C.fake,  '✗  SAHTE',          true);
    else if (state === 'authentic')  apply(C.authBg,  C.authBrd, C.auth, C.auth,  '✓  GÜVENİLİR',      true);
    else if (state === 'suspicious') apply(C.warnBg,  C.warnBrd, C.warn, C.warn,  '⚠  ŞÜPHELİ',       true);
    else                             apply(C.surface, C.border,  C.mut,  C.brand, '?  Haber Dedektifi', false);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Context menu sonucu — toast bildirimi
// ═══════════════════════════════════════════════════════════════════════════
function showContextToast(data, error) {
    const existing = document.getElementById('__shd_toast__');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '__shd_toast__';

    let mainText, color, bg, brd;

    if (error) {
        mainText = error;
        color = C.warn; bg = C.warnBg; brd = C.warnBrd;
    } else if (data.label === 'suspicious') {
        const pct = Math.round((data.risk_score || 0) * 100);
        mainText = `Şüpheli dil tespit edildi — Risk: %${pct}`;
        color = C.warn; bg = C.warnBg; brd = C.warnBrd;
    } else {
        mainText = 'Belirgin manipülasyon sinyali yok';
        color = C.auth; bg = C.authBg; brd = C.authBrd;
    }

    Object.assign(toast.style, {
        position:       'fixed',
        top:            '20px',
        right:          '20px',
        zIndex:         '2147483647',
        padding:        '10px 14px',
        borderRadius:   '8px',
        background:     bg,
        border:         `1px solid ${brd}`,
        borderLeft:     `3px solid ${color}`,
        color:          color,
        fontFamily:     "'Segoe UI', system-ui, sans-serif",
        fontSize:       '12px',
        fontWeight:     '700',
        boxShadow:      '0 4px 24px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        maxWidth:       '300px',
        lineHeight:     '1.5',
        opacity:        '1',
        transition:     'opacity 0.3s ease',
        pointerEvents:  'none',
    });

    toast.innerHTML = `
        <div style="font-family:monospace;font-size:9px;letter-spacing:0.14em;
                    text-transform:uppercase;opacity:0.65;margin-bottom:5px;
                    color:${color}">
            // Sahte Haber Dedektifi — Seçili Metin
        </div>
        <div>${mainText}</div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 320);
    }, 5000);
}

function showContextLoading() {
    const existing = document.getElementById('__shd_toast__');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = '__shd_toast__';

    Object.assign(toast.style, {
        position:       'fixed',
        top:            '20px',
        right:          '20px',
        zIndex:         '2147483647',
        padding:        '10px 14px',
        borderRadius:   '8px',
        background:     C.surface,
        border:         `1px solid ${C.border}`,
        borderLeft:     `3px solid ${C.brand}`,
        color:          C.mut,
        fontFamily:     "'Segoe UI', system-ui, sans-serif",
        fontSize:       '12px',
        fontWeight:     '700',
        boxShadow:      '0 4px 24px rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        maxWidth:       '300px',
        lineHeight:     '1.5',
        pointerEvents:  'none',
    });

    toast.innerHTML = `
        <div style="font-family:monospace;font-size:9px;letter-spacing:0.14em;
                    text-transform:uppercase;opacity:0.65;margin-bottom:5px;
                    color:${C.brand}">
            // Sahte Haber Dedektifi
        </div>
        <div style="color:${C.pri}">Seçili metin analiz ediliyor…</div>
    `;

    document.body.appendChild(toast);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Mesaj dinleyici
// ═══════════════════════════════════════════════════════════════════════════
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ARTICLE_TEXT') {
        sendResponse({ text: extractArticleText() });
        return; // sync
    }

    if (message.type === 'SIGNALS_RESULT') {
        const d     = message.data;
        const state = d.label === 'suspicious' ? 'suspicious' : 'authentic';
        updateBadge(state, (d.risk_score || 0) * 100);
        return;
    }

    if (message.type === 'ANALYSIS_RESULT') {
        const result = message.data?.result || message.data;
        const status = (result.status || result.prediction || '').toUpperCase();
        const conf   = result.confidence ?? 0;
        const pct    = (conf <= 1 ? conf : conf / 100) * 100;

        if (['FAKE', 'YANLIŞ', 'YANLIS', 'FALSE'].includes(status))
            updateBadge('fake', pct);
        else if (['AUTHENTIC', 'DOĞRU', 'DOGRU', 'TRUE'].includes(status))
            updateBadge('authentic', pct);
        else
            updateBadge('suspicious', pct);
        return;
    }

    if (message.type === 'CONTEXT_LOADING') {
        showContextLoading();
        return;
    }

    if (message.type === 'CONTEXT_RESULT') {
        showContextToast(message.data, message.error);
        return;
    }
});

// ═══════════════════════════════════════════════════════════════════════════
//  Başlangıç — haber sayfasında badge göster + Layer 1 analiz
// ═══════════════════════════════════════════════════════════════════════════
if (isNewsPage()) {
    createBadge();
    updateBadge('loading', null);

    // Sayfa başlığı yerine makale metnini gönder
    const articleText = extractArticleText();

    chrome.runtime.sendMessage(
        { type: 'SIGNALS', text: articleText },
        (res) => {
            if (chrome.runtime.lastError) return;
            if (res?.ok && res.data) {
                const d     = res.data;
                const state = d.label === 'suspicious' ? 'suspicious' : 'authentic';
                updateBadge(state, (d.risk_score || 0) * 100);
            } else {
                updateBadge('idle', null);
            }
        }
    );
}
