// ── Video site engeli ─────────────────────────────────────────────────────
const VIDEO_HOSTS = [
    'youtube.com', 'youtu.be', 'netflix.com', 'tiktok.com',
    'twitch.tv', 'vimeo.com', 'dailymotion.com', 'primevideo.com',
    'disneyplus.com', 'mubi.com', 'exxen.com', 'gain.tv',
];

function isVideoSite() {
    return VIDEO_HOSTS.some(h => location.hostname.includes(h));
}

// ── Makale metni çıkarma ──────────────────────────────────────────────────
function extractArticleText() {
    const selectors = [
        'article', '[role="article"]', '.article-body', '.article-content',
        '.news-article', '.news-content', '.post-content', '.entry-content',
        '.story-body', '.haber-icerik', '.haber-detay', 'main',
    ];
    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const clone = el.cloneNode(true);
        clone.querySelectorAll('script,style,nav,header,footer,aside,.ad,.reklam').forEach(n => n.remove());
        const text = clone.innerText.trim().replace(/\s+/g, ' ');
        if (text.length > 120) return text.slice(0, 1000);
    }
    const paras = [...document.querySelectorAll('p')]
        .filter(p => p.textContent.trim().length > 100)
        .map(p => p.textContent.trim())
        .join(' ');
    if (paras.length > 80) return paras.slice(0, 1000);
    return document.title;
}

function isNewsPage() {
    const hasArticle = document.querySelector(
        'article,[role="article"],.article-body,.news-content,.post-content'
    ) !== null;
    const longParas = [...document.querySelectorAll('p')]
        .filter(p => p.textContent.trim().length > 180);
    return hasArticle || longParas.length >= 3;
}

// ── Panel CSS enjeksiyonu ─────────────────────────────────────────────────
function injectPanelStyles() {
    if (document.getElementById('__nhb_styles__')) return;
    const style = document.createElement('style');
    style.id = '__nhb_styles__';
    style.textContent = `
        #__nhb_panel__ {
            position: fixed; top: 16px; right: 16px; z-index: 2147483647;
            width: 300px; background: rgba(11,21,24,0.97);
            border: 1px solid #2d343d; border-radius: 12px;
            font-family: 'Segoe UI', system-ui, sans-serif;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            backdrop-filter: blur(12px);
            animation: nhbFadeIn 0.3s cubic-bezier(0.22,1,0.36,1);
            overflow: hidden;
        }
        @keyframes nhbFadeIn {
            from { opacity:0; transform:translateY(-8px) scale(0.97) }
            to   { opacity:1; transform:none }
        }
        .nhb-header {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 14px 8px; border-bottom: 1px solid #1e2d35;
            background: rgba(16,185,129,0.06);
        }
        .nhb-logo {
            font-size: 12px; font-weight: 800; color: #10b981;
            letter-spacing: 0.04em;
        }
        .nhb-user-btn {
            font-size: 10px; font-weight: 700; color: #7d8896;
            background: none; border: 1px solid #2d343d; border-radius: 4px;
            padding: 3px 8px; cursor: pointer; transition: all 0.2s;
        }
        .nhb-user-btn:hover { color: #10b981; border-color: #10b981; }
        .nhb-verdict {
            padding: 12px 14px 8px;
            display: flex; align-items: center; gap: 8px;
        }
        .nhb-verdict-icon { font-size: 16px; }
        .nhb-verdict-label { font-size: 13px; font-weight: 700; flex: 1; }
        .nhb-verdict-pct {
            font-size: 18px; font-weight: 800;
            font-variant-numeric: tabular-nums;
        }
        .nhb-signals { padding: 0 14px 10px; }
        .nhb-sig-row { margin-bottom: 7px; }
        .nhb-sig-top { display: flex; justify-content: space-between;
            font-size: 10px; margin-bottom: 3px; }
        .nhb-sig-name { color: #eef2f7; font-weight: 600; }
        .nhb-sig-val { font-family: monospace; }
        .nhb-sig-track {
            height: 4px; background: #1e2d35; border-radius: 2px; overflow: hidden;
        }
        .nhb-sig-fill {
            height: 100%; border-radius: 2px; width: 0%;
            transition: width 0.8s cubic-bezier(0.22,1,0.36,1);
        }
        .nhb-actions {
            padding: 8px 14px 10px; display: flex; gap: 8px;
            border-top: 1px solid #1e2d35;
        }
        .nhb-btn {
            flex: 1; padding: 8px 0; border-radius: 6px; border: none;
            font-size: 11px; font-weight: 700; cursor: pointer;
            transition: all 0.2s; letter-spacing: 0.02em;
        }
        .nhb-btn-primary { background: #10b981; color: #fff; }
        .nhb-btn-primary:hover { background: #0ea572; }
        .nhb-btn-sec {
            background: rgba(16,185,129,0.08); color: #10b981;
            border: 1px solid rgba(16,185,129,0.25);
        }
        .nhb-btn-sec:hover { background: rgba(16,185,129,0.15); }
        .nhb-btn:disabled {
            opacity: 0.35; cursor: not-allowed;
            background: #1e2d35; color: #7d8896; border: none;
        }
        .nhb-limit-bar {
            padding: 8px 14px; background: rgba(245,158,11,0.12);
            border-top: 1px solid rgba(245,158,11,0.25);
            font-size: 10px; color: #f59e0b; text-align: center;
            display: none;
        }
        .nhb-limit-bar a {
            color: #f59e0b; text-decoration: underline; cursor: pointer;
        }
        .nhb-summary-box {
            margin: 0 14px 10px; padding: 10px 12px;
            background: rgba(16,185,129,0.06); border-radius: 8px;
            border-left: 3px solid #10b981;
            font-size: 11px; line-height: 1.6; color: #aab8c2;
            display: none;
        }
        .nhb-summary-box.visible { display: block; }
        .v-fake .nhb-verdict-label { color: #ff7351; }
        .v-fake .nhb-verdict-pct   { color: #ff7351; }
        .v-warn .nhb-verdict-label { color: #f59e0b; }
        .v-warn .nhb-verdict-pct   { color: #f59e0b; }
        .v-auth .nhb-verdict-label { color: #3fff8b; }
        .v-auth .nhb-verdict-pct   { color: #3fff8b; }
    `;
    document.head.appendChild(style);
}

// ── Panel bileşeni ────────────────────────────────────────────────────────
let _panel = null;
let _articleText = '';

function createPanel(signals, token, freeCount) {
    if (_panel) _panel.remove();
    injectPanelStyles();

    const risk   = signals.risk_score || 0;
    const pct    = Math.round(risk * 100);
    const isFake = risk >= 0.75;
    const isWarn = risk >= 0.50 && risk < 0.75;
    const cls    = isFake ? 'v-fake' : isWarn ? 'v-warn' : 'v-auth';
    const icon   = isFake ? '⚠' : isWarn ? '⚠' : '✓';
    const label  = isFake ? 'Şüpheli İçerik' : isWarn ? 'Dikkat' : 'Güvenilir';
    const limitReached = !token && freeCount >= 5;

    const sigList = [
        { key: 'clickbait_score',   label: 'Clickbait'    },
        { key: 'caps_ratio',        label: 'Büyük Harf'   },
        { key: 'exclamation_ratio', label: 'Ünlem Oranı'  },
        { key: 'hedge_ratio',       label: 'Belirsiz Dil' },
    ].filter(s => (signals[s.key] || 0) > 0.05)
     .slice(0, 4);

    const sigColor = isFake ? '#ff7351' : isWarn ? '#f59e0b' : '#3fff8b';

    _panel = document.createElement('div');
    _panel.id = '__nhb_panel__';
    _panel.className = cls;
    _panel.innerHTML = `
        <div class="nhb-header">
            <div class="nhb-logo">✦ nehaber</div>
            <button class="nhb-user-btn" id="__nhb_user_btn__">
                ${token ? '👤 Hesabım' : '👤 Giriş Yap'}
            </button>
        </div>
        <div class="nhb-verdict">
            <span class="nhb-verdict-icon">${icon}</span>
            <span class="nhb-verdict-label">${label}</span>
            <span class="nhb-verdict-pct">%${pct}</span>
        </div>
        <div class="nhb-signals">
            ${sigList.map(s => {
                const val = Math.round((signals[s.key] || 0) * 100);
                return `
                <div class="nhb-sig-row">
                    <div class="nhb-sig-top">
                        <span class="nhb-sig-name">${s.label}</span>
                        <span class="nhb-sig-val" style="color:${sigColor}">%${val}</span>
                    </div>
                    <div class="nhb-sig-track">
                        <div class="nhb-sig-fill" data-val="${val}"
                             style="background:${sigColor}"></div>
                    </div>
                </div>`;
            }).join('')}
        </div>
        <div class="nhb-summary-box" id="__nhb_summary__"></div>
        <div class="nhb-actions">
            <button class="nhb-btn nhb-btn-primary" id="__nhb_analyze__"
                    ${limitReached ? 'disabled' : ''}>Detaylı Analiz Et</button>
            <button class="nhb-btn nhb-btn-sec" id="__nhb_summarize__"
                    ${!token ? 'disabled' : ''}>Haberi Özetle</button>
        </div>
        <div class="nhb-limit-bar" id="__nhb_limit__"
             style="${limitReached ? 'display:block' : ''}">
            5 ücretsiz hakkın doldu —
            <a id="__nhb_login_link__">giriş yap</a>
        </div>
    `;
    document.body.appendChild(_panel);

    requestAnimationFrame(() => {
        _panel.querySelectorAll('.nhb-sig-fill').forEach(el => {
            el.style.width = `${el.dataset.val}%`;
        });
    });

    _panel.querySelector('#__nhb_user_btn__')
        .addEventListener('click', () => chrome.tabs.create({ url: 'https://nehaber.dev' }));

    const analyzeBtn = _panel.querySelector('#__nhb_analyze__');
    if (analyzeBtn && !limitReached) {
        analyzeBtn.addEventListener('click', () => {
            analyzeBtn.textContent = 'Analiz ediliyor…';
            analyzeBtn.disabled = true;
            chrome.runtime.sendMessage(
                { type: 'ANALYZE_URL', url: location.href },
                (res) => {
                    analyzeBtn.textContent = 'Detaylı Analiz Et';
                    analyzeBtn.disabled = false;
                }
            );
        });
    }

    const summarizeBtn = _panel.querySelector('#__nhb_summarize__');
    if (summarizeBtn && token) {
        summarizeBtn.addEventListener('click', () => {
            summarizeBtn.textContent = 'Özetleniyor…';
            summarizeBtn.disabled = true;
            chrome.runtime.sendMessage(
                { type: 'SUMMARIZE', text: _articleText },
                (res) => {
                    summarizeBtn.textContent = 'Haberi Özetle';
                    summarizeBtn.disabled = false;
                    if (res?.ok) {
                        const box = _panel.querySelector('#__nhb_summary__');
                        box.textContent = res.summary;
                        box.classList.add('visible');
                    }
                }
            );
        });
    }

    const loginLink = _panel.querySelector('#__nhb_login_link__');
    if (loginLink) {
        loginLink.addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://nehaber.dev' });
        });
    }
}

// ── Context menu toast'ları ───────────────────────────────────────────────
function showContextToast(data, error) {
    const existing = document.getElementById('__shd_toast__');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = '__shd_toast__';
    const color = error ? '#f59e0b' : data?.label === 'suspicious' ? '#f59e0b' : '#3fff8b';
    const bg    = error ? 'rgba(245,158,11,0.12)' : data?.label === 'suspicious' ? 'rgba(245,158,11,0.12)' : 'rgba(63,255,139,0.10)';
    const brd   = error ? 'rgba(245,158,11,0.35)' : data?.label === 'suspicious' ? 'rgba(245,158,11,0.35)' : 'rgba(63,255,139,0.30)';
    const text  = error
        ? error
        : data?.label === 'suspicious'
            ? `Şüpheli dil — Risk: %${Math.round((data.risk_score || 0) * 100)}`
            : 'Belirgin manipülasyon sinyali yok';
    Object.assign(toast.style, {
        position:'fixed', top:'20px', right:'20px', zIndex:'2147483647',
        padding:'10px 14px', borderRadius:'8px', background:bg,
        border:`1px solid ${brd}`, borderLeft:`3px solid ${color}`,
        color, fontFamily:"'Segoe UI',system-ui,sans-serif", fontSize:'12px',
        fontWeight:'700', boxShadow:'0 4px 24px rgba(0,0,0,0.55)',
        backdropFilter:'blur(8px)', maxWidth:'300px', lineHeight:'1.5',
        pointerEvents:'none', opacity:'1', transition:'opacity 0.3s ease',
    });
    toast.textContent = text;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 320); }, 5000);
}

function showContextLoading() {
    const existing = document.getElementById('__shd_toast__');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = '__shd_toast__';
    Object.assign(toast.style, {
        position:'fixed', top:'20px', right:'20px', zIndex:'2147483647',
        padding:'10px 14px', borderRadius:'8px',
        background:'rgba(11,21,24,0.94)', border:'1px solid #2d343d',
        borderLeft:'3px solid #10b981', color:'#7d8896',
        fontFamily:"'Segoe UI',system-ui,sans-serif", fontSize:'12px',
        fontWeight:'700', boxShadow:'0 4px 24px rgba(0,0,0,0.55)',
        backdropFilter:'blur(8px)', maxWidth:'300px', lineHeight:'1.5',
        pointerEvents:'none',
    });
    toast.textContent = 'Seçili metin analiz ediliyor…';
    document.body.appendChild(toast);
}

// ── Mesaj dinleyici ───────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ARTICLE_TEXT') {
        sendResponse({ text: extractArticleText() });
        return;
    }
    if (message.type === 'CONTEXT_LOADING') { showContextLoading(); return; }
    if (message.type === 'CONTEXT_RESULT')  { showContextToast(message.data, message.error); return; }
});

// ── Başlangıç ─────────────────────────────────────────────────────────────
if (!isVideoSite() && isNewsPage()) {
    _articleText = extractArticleText();

    chrome.runtime.sendMessage({ type: 'GET_TOKEN' }, (tokenRes) => {
        const token = tokenRes?.token || null;

        chrome.runtime.sendMessage({ type: 'GET_FREE_COUNT' }, (countRes) => {
            const freeCount = countRes?.count || 0;

            chrome.runtime.sendMessage(
                { type: 'SIGNALS', text: _articleText },
                (res) => {
                    if (chrome.runtime.lastError || !res?.ok) return;
                    const risk = res.data?.risk_score || 0;
                    if (risk >= 0.75) {
                        createPanel(res.data, token, freeCount);
                    }
                }
            );
        });
    });
}
