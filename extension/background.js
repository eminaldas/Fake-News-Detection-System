// ── API URL ───────────────────────────────────────────────────────────────
const API_ROOT = 'https://nehaber.dev/api/v1';
async function getApiRoot() { return API_ROOT; }

// ── Token yönetimi ────────────────────────────────────────────────────────
async function getToken() {
    const { token } = await chrome.storage.local.get('token');
    return token || null;
}
async function saveToken(token) { await chrome.storage.local.set({ token }); }
async function clearToken()     { await chrome.storage.local.remove('token'); }

// ── API çağrıları ─────────────────────────────────────────────────────────
async function apiLogin(username, password) {
    const root = await getApiRoot();
    const res  = await fetch(`${root}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({ username, password }),
    });
    if (!res.ok) throw new Error('Giriş başarısız');
    const data = await res.json();
    await saveToken(data.access_token);
    return data;
}

async function apiSignals(text) {
    const token = await getToken();
    if (!token) throw new Error('TOKEN_MISSING');
    const root  = await getApiRoot();
    const res   = await fetch(`${root}/analysis/analyze/signals`, {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({ text: text.slice(0, 1000) }),
    });
    if (res.status === 401) { await clearToken(); throw new Error('TOKEN_EXPIRED'); }
    if (!res.ok) throw new Error('Sinyal analizi başarısız');
    return res.json();
}

async function apiAnalyzeUrl(url) {
    const token = await getToken();
    if (!token) throw new Error('TOKEN_MISSING');
    const root  = await getApiRoot();

    const res = await fetch(`${root}/analysis/analyze/url`, {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({ url }),
    });
    if (res.status === 401) { await clearToken(); throw new Error('TOKEN_EXPIRED'); }
    if (!res.ok) throw new Error('Analiz başlatılamadı');
    const { task_id } = await res.json();

    // Polling — max 60s
    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(`${root}/analysis/status/${task_id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!poll.ok) continue;
        const data = await poll.json();
        if (data.status === 'SUCCESS' || data.result) return data;
    }
    throw new Error('Zaman aşımı');
}

// ── Context menu — kurulum ────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id:       'shd-analyze',
        title:    '🔍 Seçili metni analiz et',
        contexts: ['selection'],
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== 'shd-analyze' || !info.selectionText) return;

    const text = info.selectionText.trim();
    if (!tab?.id) return;

    // Hemen "analiz ediliyor" bildirimi gönder
    chrome.tabs.sendMessage(tab.id, { type: 'CONTEXT_LOADING' }).catch(() => {});

    try {
        const data = await apiSignals(text);
        chrome.tabs.sendMessage(tab.id, { type: 'CONTEXT_RESULT', data }).catch(() => {});
    } catch (err) {
        chrome.tabs.sendMessage(tab.id, {
            type:  'CONTEXT_RESULT',
            error: err.message === 'TOKEN_MISSING' || err.message === 'TOKEN_EXPIRED'
                ? 'Önce giriş yapın — araç çubuğu ikonuna tıklayın'
                : err.message,
        }).catch(() => {});
    }
});

// ── Mesaj dinleyici ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
        try {
            if (msg.type === 'LOGIN') {
                await apiLogin(msg.username, msg.password);
                sendResponse({ ok: true });

            } else if (msg.type === 'LOGOUT') {
                await clearToken();
                sendResponse({ ok: true });

            } else if (msg.type === 'GET_TOKEN') {
                const token = await getToken();
                sendResponse({ token });

            } else if (msg.type === 'SIGNALS') {
                const data = await apiSignals(msg.text);
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: 'SIGNALS_RESULT', data }).catch(() => {});
                }
                sendResponse({ ok: true, data });

            } else if (msg.type === 'ANALYZE_URL') {
                const data = await apiAnalyzeUrl(msg.url);
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: 'ANALYSIS_RESULT', data }).catch(() => {});
                }
                sendResponse({ ok: true, data });

            } else if (msg.type === 'GET_API_URL') {
                sendResponse({ apiUrl: 'https://nehaber.dev' });
            }
        } catch (err) {
            sendResponse({ ok: false, error: err.message });
        }
    })();
    return true;
});
