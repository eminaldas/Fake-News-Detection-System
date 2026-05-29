const $    = id => document.getElementById(id);
const show = id => $(id).classList.remove('hidden');
const hide = id => $(id).classList.add('hidden');

function msg(type, payload = {}) {
    return new Promise(resolve =>
        chrome.runtime.sendMessage({ type, ...payload }, resolve)
    );
}

function parseUrl(url) {
    try {
        const u    = new URL(url);
        const path = u.pathname.length > 1
            ? u.pathname.slice(0, 36) + (u.pathname.length > 36 ? '…' : '')
            : '';
        return { host: u.hostname, path };
    } catch { return { host: (url || '').slice(0, 30), path: '' }; }
}

function fillUrlBar(hostId, pathId, url) {
    const { host, path } = parseUrl(url);
    $(hostId).textContent = host;
    $(pathId).textContent = path;
}

function setConn(state) {
    const dot = $('conn-dot');
    const lbl = $('conn-lbl');
    dot.className = 'dot';
    if (state === 'online') {
        dot.classList.add('dot-on');   lbl.textContent = 'bağlı';
    } else if (state === 'analyzing') {
        dot.classList.add('dot-busy'); lbl.textContent = 'analiz ediliyor';
    } else {
        dot.classList.add('dot-off');  lbl.textContent = '—';
    }
}

function getTheme(status) {
    const s = (status || '').toUpperCase().trim();
    if (['FAKE', 'YANLIŞ', 'YANLIS', 'FALSE'].includes(s))
        return { cls: 'v-fake', hex: '#ff7351', tag: '[ RİSK TESPİT EDİLDİ ]', title: 'Yüksek Yanıltma Riski Mevcut' };
    if (['AUTHENTIC', 'DOĞRU', 'DOGRU', 'TRUE', 'REAL'].includes(s))
        return { cls: 'v-auth', hex: '#3fff8b', tag: '[ ANALİZ TAMAMLANDI ]', title: 'Güvenilir İçerik Tespit Edildi' };
    return { cls: 'v-warn', hex: '#f59e0b', tag: '[ İDDİA / BELİRSİZ ]', title: 'Sonuç Doğrulanamadı' };
}

const SIG_THRESH = 0.05;
const SIG_CONFIG = [
    { key: 'clickbait_score',   label: 'Clickbait',   color: '#ff7351' },
    { key: 'caps_ratio',        label: 'Büyük Harf',  color: '#f59e0b' },
    { key: 'exclamation_ratio', label: 'Ünlem',        color: '#f59e0b' },
    { key: 'hedge_ratio',       label: 'Belirsiz Dil', color: '#f59e0b' },
    { key: 'source_score',      label: 'Kaynak',       color: '#3fff8b' },
];

function renderSignalsMini(signals) {
    const container = $('s-sig-rows');
    container.innerHTML = '';
    const visible = SIG_CONFIG.filter(s => (signals[s.key] || 0) > SIG_THRESH).slice(0, 4);
    if (!visible.length) { hide('s-signals'); return; }
    visible.forEach(({ key, label, color }) => {
        const val = Math.min(Math.round((signals[key] || 0) * 100), 100);
        const row = document.createElement('div');
        row.className = 'sig-row';
        row.innerHTML = `
            <div class="sig-name">${label}</div>
            <div class="sig-track">
                <div class="sig-fill" style="width:0%;background:${color}"></div>
            </div>
            <div class="sig-val" style="color:${color}">%${val}</div>
        `;
        container.appendChild(row);
        setTimeout(() => row.querySelector('.sig-fill').style.width = `${val}%`, 80);
    });
    show('s-signals');
}

// ── Loading ───────────────────────────────────────────────────────────────
const LOAD_STEPS = [
    { label: 'URL taranıyor',               minMs: 1400     },
    { label: 'NLP sinyalleri hesaplanıyor', minMs: 3500     },
    { label: 'Gemini değerlendiriyor',      minMs: 9000     },
    { label: 'Sonuç hazırlanıyor',          minMs: Infinity },
];
const TIPS = [
    '"Şok", "Bomba", "Flaş" gibi kelimeler clickbait haberlerin en güçlü göstergesidir.',
    'Anonim kaynaklı haberler gerçek olma ihtimalini azaltır.',
    'Eski haberler yeni gelişmeler gibi sunulabilir — tarihi kontrol edin.',
    'Resmi kaynaklara referans veren haberler daha güvenilir eğilimindedir.',
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
        el.innerHTML = `<div class="step-ico"><div class="step-spin"></div></div>
                        <div class="step-lbl active">${s.label}…</div>`;
        list.appendChild(el);
        return el;
    });
    const completeStep = (idx) => {
        const el = stepEls[idx];
        el.querySelector('.step-ico').innerHTML = '<div class="step-chk">✓</div>';
        el.querySelector('.step-lbl').className = 'step-lbl done';
        const ok = document.createElement('div');
        ok.className = 'step-ok'; ok.textContent = 'OK'; el.appendChild(ok);
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

// ── Ring animasyonu ───────────────────────────────────────────────────────
const RING_CIRC = 2 * Math.PI * 24;

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

// ── Sinyal barları (result view) ──────────────────────────────────────────
function renderSignals(signals, theme) {
    const container = $('sig-rows');
    container.innerHTML = '';
    const visible = SIG_CONFIG.filter(s => (signals[s.key] || 0) > SIG_THRESH).slice(0, 4);
    if (!visible.length) { hide('signals'); return; }
    visible.forEach(({ key, label, color }) => {
        const val = Math.min(Math.round((signals[key] || 0) * 100), 100);
        const row = document.createElement('div');
        row.className = 'sig-row';
        row.innerHTML = `
            <div class="sig-name">${label}</div>
            <div class="sig-track">
                <div class="sig-fill" style="width:0%;background:${color}"></div>
            </div>
            <div class="sig-val" style="color:${color}">%${val}</div>
        `;
        container.appendChild(row);
        setTimeout(() => row.querySelector('.sig-fill').style.width = `${val}%`, 120);
    });
    show('signals');
}

// ── Result ────────────────────────────────────────────────────────────────
function buildExplanation(signals) {
    if (!signals) return null;
    const tw    = signals.triggered_words || {};
    const parts = [];
    if ((signals.clickbait_score || 0) > 0.12) {
        const w = (tw.clickbait || []).slice(0, 3);
        parts.push(w.length ? `'${w.join("', '")}' gibi clickbait ifadeler` : 'clickbait dil yapısı');
    }
    if ((signals.exclamation_ratio || 0) > 0.12) parts.push('yüksek ünlem oranı');
    if ((signals.caps_ratio        || 0) > 0.12) parts.push('anormal büyük harf kullanımı');
    if ((signals.hedge_ratio       || 0) > 0.12) {
        const w = (tw.hedge || []).slice(0, 2);
        parts.push(w.length ? `'${w.join("', '")}' gibi belirsiz kaynak ifadeleri` : 'belirsiz kaynak dili');
    }
    if (!parts.length) {
        if ((signals.source_score || 0) > 0.12) return 'Güvenilir kaynak referansı tespit edildi.';
        return null;
    }
    let s = `Bu haber ${parts.join(', ')} içeriyor.`;
    if ((signals.source_score || 0) > 0.12) s += ' Ancak güvenilir kaynak referansları da mevcut.';
    return s;
}

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
    $('verdict').className    = `verdict-card ${theme.cls}`;
    $('v-tag').textContent    = theme.tag;
    $('v-title').textContent  = theme.title;
    $('v-meta').textContent   = result.isDirectMatch
        ? 'Veritabanı eşleşmesi'
        : (aiComment?.gemini_verdict ? 'Gemini AI kararı' : 'Yapay zeka sınıflandırması');
    $('ring-pct').textContent = `%${pct}`;
    $('ring-pct').style.color = theme.hex;
    animateRing(pct, theme.hex);
    const aiText = aiComment?.summary || aiComment?.news_summary
        || aiComment?.verdict_explanation || buildExplanation(signals);
    if (aiText) {
        $('ai-txt').textContent = aiText;
        $('ai-box').className   = `ai-box ${theme.cls}`;
        show('ai-box');
    } else {
        hide('ai-box');
    }
    if (signals) renderSignals(signals, theme); else hide('signals');
    const articleId = result.direct_match_data?.db_article_id ?? result.db_article_id;
    if (articleId) show('btn-report'); else hide('btn-report');
    show('view-result');
    setConn('online');
}

// ── Views ─────────────────────────────────────────────────────────────────
const ALL_VIEWS = ['view-signals', 'view-loading', 'view-result'];

// ── Init ──────────────────────────────────────────────────────────────────
(async () => {
    setConn('offline');
    const [tab]        = await chrome.tabs.query({ active: true, currentWindow: true });
    const url          = tab?.url || '';
    const tokenRes     = await msg('GET_TOKEN');
    const token        = tokenRes?.token || null;
    const countRes     = await msg('GET_FREE_COUNT');
    const freeCount    = countRes?.count || 0;
    const limitReached = !token && freeCount >= 5;

    if (url) fillUrlBar('s-host', 's-path', url);

    // Önceki analiz sonucu var mı? (tab değiştirince kaybolan sorunu çözer)
    const { lastResult } = await chrome.storage.local.get('lastResult');
    const TEN_MIN = 10 * 60 * 1000;
    if (lastResult && lastResult.url === url && (Date.now() - lastResult.ts) < TEN_MIN) {
        showResult(lastResult.data, url);
        setConn('online');
        return;
    }

    let signalsData = null;
    if (tab?.id) {
        const articleText = await new Promise(resolve => {
            chrome.tabs.sendMessage(tab.id, { type: 'GET_ARTICLE_TEXT' }, res => {
                resolve(chrome.runtime.lastError || !res?.text ? null : res.text);
            });
        });
        if (articleText) {
            const res = await msg('SIGNALS', { text: articleText });
            if (res?.ok) signalsData = res.data;
        }
    }

    if (signalsData) {
        const risk   = signalsData.risk_score || 0;
        const pct    = Math.round(risk * 100);
        const isFake = risk >= 0.75;
        const isWarn = risk >= 0.50;
        const cls    = isFake ? 'v-fake' : isWarn ? 'v-warn' : 'v-auth';
        const label  = isFake
            ? `⚠ Şüpheli — Risk %${pct}`
            : isWarn
            ? `⚠ Dikkat — Risk %${pct}`
            : `✓ Güvenilir — Risk %${pct}`;
        const verdict = $('s-verdict');
        verdict.textContent = label;
        verdict.className   = `verdict-mini ${cls}`;
        show('s-verdict');
        renderSignalsMini(signalsData);
    }

    if (limitReached) {
        $('btn-analyze').disabled = true;
        show('limit-warn');
    }

    show('view-signals');
    setConn('online');
})();

// ── Buton olayları ────────────────────────────────────────────────────────
$('btn-analyze').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;
    showLoading(tab.url);
    const res = await msg('ANALYZE_URL', { url: tab.url });
    if (res?.ok) {
        showResult(res.data, tab.url);
    } else {
        ALL_VIEWS.forEach(hide);
        show('view-signals');
        if (res?.error === 'LIMIT_REACHED') show('limit-warn');
    }
});

$('btn-reanalyze').addEventListener('click', () => {
    ALL_VIEWS.forEach(hide);
    show('view-signals');
});

$('btn-report').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://nehaber.dev' });
});

$('btn-user').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://nehaber.dev' });
});

$('btn-login-link').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://nehaber.dev' });
});
