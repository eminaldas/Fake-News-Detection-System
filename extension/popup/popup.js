// ── Helpers ───────────────────────────────────────────────────────────────
const $   = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function msg(type, payload = {}) {
    return new Promise(resolve =>
        chrome.runtime.sendMessage({ type, ...payload }, resolve)
    );
}

// ── URL parsing ───────────────────────────────────────────────────────────
function parseUrl(url) {
    try {
        const u    = new URL(url);
        const path = u.pathname.length > 1
            ? u.pathname.slice(0, 36) + (u.pathname.length > 36 ? '…' : '')
            : '';
        return { host: u.hostname, path };
    } catch {
        return { host: (url || '').slice(0, 30), path: '' };
    }
}

function fillUrlBar(hostId, pathId, url) {
    const { host, path } = parseUrl(url);
    $(hostId).textContent = host;
    $(pathId).textContent = path;
}

// ── Bağlantı durumu ───────────────────────────────────────────────────────
function setConn(state) {
    const dot = $('conn-dot');
    const lbl = $('conn-lbl');
    dot.className = 'dot';
    if (state === 'online') {
        dot.classList.add('dot-on');
        lbl.textContent = 'bağlı';
    } else if (state === 'analyzing') {
        dot.classList.add('dot-busy');
        lbl.textContent = 'analiz ediliyor';
    } else {
        dot.classList.add('dot-off');
        lbl.textContent = '—';
    }
}

// ── Makale metnini content script'ten al ─────────────────────────────────
async function getArticleText(tabId) {
    return new Promise(resolve => {
        chrome.tabs.sendMessage(tabId, { type: 'GET_ARTICLE_TEXT' }, res => {
            if (chrome.runtime.lastError || !res?.text) resolve(null);
            else resolve(res.text);
        });
    });
}

// ── Tema ─────────────────────────────────────────────────────────────────
function getTheme(status) {
    const s = (status || '').toUpperCase().trim();
    const css = getComputedStyle(document.documentElement);
    const v   = k => css.getPropertyValue(k).trim();

    if (['FAKE', 'YANLIŞ', 'YANLIS', 'FALSE'].includes(s))
        return { cls: 'v-fake', hex: v('--fake') || '#ff7351',
                 tag: '[ RİSK TESPİT EDİLDİ ]', title: 'Yüksek Yanıltma Riski Mevcut' };
    if (['AUTHENTIC', 'DOĞRU', 'DOGRU', 'TRUE', 'REAL'].includes(s))
        return { cls: 'v-auth', hex: v('--auth') || '#3fff8b',
                 tag: '[ ANALİZ TAMAMLANDI ]', title: 'Güvenilir İçerik Tespit Edildi' };
    return { cls: 'v-warn', hex: v('--warn') || '#f59e0b',
             tag: '[ İDDİA / BELİRSİZ ]', title: 'Sonuç Doğrulanamadı' };
}

// ── buildExplanation ──────────────────────────────────────────────────────
const SIG_THRESH = 0.12;

function buildExplanation(signals) {
    if (!signals) return null;
    const tw    = signals.triggered_words || {};
    const parts = [];
    if ((signals.clickbait_score   || 0) > SIG_THRESH) {
        const w = (tw.clickbait || []).slice(0, 3);
        parts.push(w.length ? `'${w.join("', '")}' gibi clickbait ifadeler` : 'clickbait dil yapısı');
    }
    if ((signals.exclamation_ratio || 0) > SIG_THRESH) parts.push('yüksek ünlem oranı');
    if ((signals.uppercase_ratio   || 0) > SIG_THRESH) parts.push('anormal büyük harf kullanımı');
    if ((signals.hedge_ratio       || 0) > SIG_THRESH) {
        const w = (tw.hedge || []).slice(0, 2);
        parts.push(w.length ? `'${w.join("', '")}' gibi belirsiz kaynak ifadeleri` : 'belirsiz kaynak dili');
    }
    if ((signals.question_density  || 0) > SIG_THRESH) parts.push('yüksek soru yoğunluğu');
    if ((signals.number_density    || 0) > SIG_THRESH) parts.push('yoğun sayısal veri');

    if (!parts.length) {
        if ((signals.source_score || 0) > SIG_THRESH) return 'Güvenilir kaynak referansı tespit edildi.';
        return null;
    }
    let s = `Bu haber ${parts.join(', ')} içeriyor.`;
    if ((signals.source_score || 0) > SIG_THRESH) s += ' Ancak güvenilir kaynak referansları da mevcut.';
    return s;
}

// ── SVG Ring ─────────────────────────────────────────────────────────────
const RING_CIRC = 2 * Math.PI * 24; // r=24 → ~150.8

function animateRing(pct, hex) {
    const fill  = $('ring-fill');
    const track = $('ring-track');
    if (!fill) return;
    fill.setAttribute('stroke', hex);
    track.setAttribute('stroke', hex + '28');
    fill.style.transition = 'none';
    fill.style.strokeDashoffset = RING_CIRC;
    requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)';
        fill.style.strokeDashoffset = RING_CIRC * (1 - pct / 100);
    }));
}

// ── Sinyal barları ────────────────────────────────────────────────────────
const SIG_CONFIG = [
    { key: 'clickbait_score',   label: 'Clickbait',    norm: v => v * 100      },
    { key: 'exclamation_ratio', label: 'Ünlem',         norm: v => v * 100      },
    { key: 'uppercase_ratio',   label: 'Büyük Harf',   norm: v => v * 100      },
    { key: 'hedge_ratio',       label: 'Belirsiz Dil',  norm: v => v * 100     },
    { key: 'question_density',  label: 'Soru Yoğ.',    norm: v => v * 100      },
    { key: 'number_density',    label: 'Sayı Yoğ.',    norm: v => v * 100      },
    { key: 'source_score',      label: 'Kaynak',        norm: v => v * 100, green: true },
];

function renderSignals(signals, theme) {
    const container = $('sig-rows');
    container.innerHTML = '';
    const css     = getComputedStyle(document.documentElement);
    const authHex = css.getPropertyValue('--auth').trim() || '#3fff8b';
    const visible = SIG_CONFIG.filter(({ key }) => (signals[key] || 0) > SIG_THRESH).slice(0, 4);
    if (!visible.length) { hide('signals'); return; }

    visible.forEach(({ key, label, norm, green }) => {
        const raw = signals[key] || 0;
        const pct = Math.min(norm(raw), 100);
        const hex = green ? authHex : theme.hex;
        const row = document.createElement('div');
        row.className = 'sig-row';
        row.innerHTML = `
            <div class="sig-name">${label}</div>
            <div class="sig-track">
                <div class="sig-fill" style="width:0%;background:${hex}"></div>
            </div>
            <div class="sig-val">${raw.toFixed(2)}</div>
        `;
        container.appendChild(row);
        setTimeout(() => { row.querySelector('.sig-fill').style.width = `${pct}%`; }, 120);
    });
    show('signals');
}

// ═══════════════════════════════════════════════════════════════════════════
//  VIEWS
// ═══════════════════════════════════════════════════════════════════════════

const ALL_VIEWS = ['view-login','view-analyze','view-loading','view-result'];

function showLogin() {
    ALL_VIEWS.forEach(hide);
    show('view-login');
    setConn('offline');
}

async function showAnalyze(signalsData, url) {
    ALL_VIEWS.forEach(hide);
    if (url) fillUrlBar('a-host', 'a-path', url);

    const card = $('l1-card');
    card.innerHTML = '';
    card.className = 'hidden';

    if (signalsData) {
        const isSusp = signalsData.label === 'suspicious';
        card.className = `l1-card ${isSusp ? 'l1-warn' : 'l1-clean'}`;
        card.innerHTML = `
            <div class="l1-icon">${isSusp ? '⚠' : '✓'}</div>
            <div class="l1-info">
                <div class="l1-label">${isSusp ? 'Şüpheli İçerik' : 'Temiz Görünüyor'}</div>
                <div class="l1-desc">Hızlı sinyal · Risk: %${Math.round((signalsData.risk_score || 0) * 100)}</div>
            </div>
        `;
    }

    show('view-analyze');
    setConn('online');
}

// ── Loading ───────────────────────────────────────────────────────────────
const LOAD_STEPS = [
    { label: 'URL taranıyor',                minMs: 1400     },
    { label: 'NLP sinyalleri hesaplanıyor',  minMs: 3500     },
    { label: 'Gemini değerlendiriyor',       minMs: 9000     },
    { label: 'Sonuç hazırlanıyor',           minMs: Infinity },
];
const TIPS = [
    '"Şok", "Bomba", "Flaş" gibi kelimeler clickbait haberlerin en güçlü göstergesidir.',
    'Anonim kaynaklı haberler gerçek olma ihtimalini %40 düşürür.',
    'Eski haberler yeni gelişmeler gibi sunulabilir — tarihi kontrol edin.',
    'Resmi kaynaklara referans veren haberler daha güvenilir eğilimindedir.',
    'Paylaşmadan önce bağımsız bir kaynaktan doğrulayın.',
];
let _lt = [], _tipIv = null, _progIv = null;

function _clearLoading() {
    _lt.forEach(clearTimeout); _lt = [];
    if (_tipIv)  { clearInterval(_tipIv);  _tipIv  = null; }
    if (_progIv) { clearInterval(_progIv); _progIv = null; }
}

function showLoading(url) {
    _clearLoading();
    ALL_VIEWS.forEach(hide);
    if (url) fillUrlBar('l-host', 'l-path', url);
    $('prog').style.width = '5%';

    const list = $('step-list');
    list.innerHTML = '';
    const stepEls = LOAD_STEPS.map((s, i) => {
        const el = document.createElement('div');
        el.className = `step-row${i > 0 ? ' hidden' : ''}`;
        el.innerHTML = `
            <div class="step-ico"><div class="step-spin"></div></div>
            <div class="step-lbl active">${s.label}…</div>
        `;
        list.appendChild(el);
        return el;
    });

    const completeStep = (idx) => {
        const el  = stepEls[idx];
        const ico = el.querySelector('.step-ico');
        ico.innerHTML = '<div class="step-chk">✓</div>';
        el.querySelector('.step-lbl').className = 'step-lbl done';
        const ok = document.createElement('div');
        ok.className = 'step-ok'; ok.textContent = 'OK';
        el.appendChild(ok);
        if (idx + 1 < LOAD_STEPS.length) {
            const t = setTimeout(() => {
                stepEls[idx + 1].classList.remove('hidden');
                if (LOAD_STEPS[idx + 1].minMs !== Infinity) {
                    const t2 = setTimeout(() => completeStep(idx + 1), LOAD_STEPS[idx + 1].minMs);
                    _lt.push(t2);
                }
            }, 320);
            _lt.push(t);
        }
    };
    _lt.push(setTimeout(() => completeStep(0), LOAD_STEPS[0].minMs));

    let tipIdx = Math.floor(Math.random() * TIPS.length);
    $('tip-txt').textContent = `"${TIPS[tipIdx]}"`;
    _tipIv = setInterval(() => {
        tipIdx = (tipIdx + 1) % TIPS.length;
        const el = $('tip-txt');
        el.style.opacity = '0';
        setTimeout(() => { el.textContent = `"${TIPS[tipIdx]}"`; el.style.opacity = '1'; }, 200);
    }, 4500);

    let pct = 5;
    _progIv = setInterval(() => { pct = Math.min(pct + 0.4, 88); $('prog').style.width = `${pct}%`; }, 400);

    show('view-loading');
    setConn('analyzing');
}

// ── Result ────────────────────────────────────────────────────────────────
function showResult(data, url) {
    _clearLoading();
    ALL_VIEWS.forEach(hide);
    if (url) fillUrlBar('r-host', 'r-path', url);
    $('prog').style.width = '100%';

    const result     = data.result || data;
    const rawStatus  = result.status || result.prediction || 'UNKNOWN';
    const confidence = result.confidence ?? 0;
    const pct        = Math.round((confidence <= 1 ? confidence : confidence / 100) * 100);
    const signals    = result.signals || null;
    const aiComment  = result.ai_comment || null;
    const theme      = getTheme(rawStatus);

    $('verdict').className = `verdict-card ${theme.cls}`;
    $('v-tag').textContent   = theme.tag;
    $('v-title').textContent = theme.title;
    $('v-meta').textContent  = result.isDirectMatch
        ? 'Veritabanı eşleşmesi'
        : (aiComment?.gemini_verdict ? 'Gemini AI kararı' : 'Yapay zeka sınıflandırması');

    $('ring-pct').textContent = `%${pct}`;
    $('ring-pct').style.color = theme.hex;
    animateRing(pct, theme.hex);

    const aiText = aiComment?.summary || aiComment?.news_summary
        || aiComment?.verdict_explanation || buildExplanation(signals);
    if (aiText) {
        $('ai-txt').textContent = aiText;
        $('ai-box').className = `ai-box ${theme.cls}`;
        show('ai-box');
    } else {
        hide('ai-box');
    }

    if (signals) renderSignals(signals, theme);
    else hide('signals');

    const articleId = result.direct_match_data?.db_article_id ?? result.db_article_id;
    if (articleId) show('btn-report'); else hide('btn-report');

    show('view-result');
    setConn('online');
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════

(async () => {
    const { token } = await msg('GET_TOKEN');
    if (!token) { showLogin(); return; }

    setConn('online');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url   = tab?.url || '';

    // Makale metnini content script'ten çek, fallback: başlık
    let signalsData = null;
    if (tab?.id) {
        const articleText = await getArticleText(tab.id);
        const text = articleText || tab.title || '';
        if (text) {
            const res = await msg('SIGNALS', { text });
            if (res?.ok) signalsData = res.data;
        }
    }

    showAnalyze(signalsData, url);
})();

// ── Login ─────────────────────────────────────────────────────────────────
$('btn-login').addEventListener('click', async () => {
    const username = $('username').value.trim();
    const password = $('password').value;
    hide('login-err');
    const btn = $('btn-login');
    btn.textContent = 'Giriş yapılıyor…'; btn.disabled = true;
    const res = await msg('LOGIN', { username, password });
    btn.textContent = 'Giriş Yap'; btn.disabled = false;
    if (res?.ok) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        showAnalyze(null, tab?.url || '');
    } else {
        const err = $('login-err');
        err.textContent = res?.error && !['TOKEN_MISSING','TOKEN_EXPIRED'].includes(res.error)
            ? res.error : 'E-posta veya şifre hatalı';
        show('login-err');
    }
});

// ── Detaylı analiz ────────────────────────────────────────────────────────
$('btn-analyze').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    showLoading(tab.url);
    const res = await msg('ANALYZE_URL', { url: tab.url });
    if (res?.ok) showResult(res.data, tab.url);
    else {
        const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
        showAnalyze(null, t?.url || '');
    }
});

// ── Yeniden / Çıkış / Rapor ──────────────────────────────────────────────
$('btn-reanalyze').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    showAnalyze(null, tab?.url || '');
});

$('btn-report').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://nehaber.dev' });
});

['btn-logout', 'btn-logout2'].forEach(id => {
    $(id).addEventListener('click', async () => {
        await msg('LOGOUT'); showLogin();
    });
});
