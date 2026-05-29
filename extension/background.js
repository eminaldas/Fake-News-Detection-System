// ── API URL ───────────────────────────────────────────────────────────────
const API_ROOT = 'https://nehaber.dev/api/v1';

// ── Token yönetimi ────────────────────────────────────────────────────────
async function getToken() {
    const { token } = await chrome.storage.local.get('token');
    return token || null;
}
async function saveToken(token) { await chrome.storage.local.set({ token }); }
async function clearToken()     { await chrome.storage.local.remove('token'); }

// ── Ücretsiz hak sayacı ───────────────────────────────────────────────────
async function getFreeCount() {
    const { freeCount } = await chrome.storage.local.get('freeCount');
    return freeCount || 0;
}
async function incrementFreeCount() {
    const count = await getFreeCount();
    await chrome.storage.local.set({ freeCount: count + 1 });
    return count + 1;
}

// ── API çağrıları ─────────────────────────────────────────────────────────
async function apiLogin(username, password) {
    const res = await fetch(`${API_ROOT}/auth/login`, {
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
    const token  = await getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_ROOT}/analysis/analyze/signals`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text: text.slice(0, 1000) }),
    });
    if (res.status === 401 && token) { await clearToken(); }
    if (!res.ok) throw new Error('Sinyal analizi başarısız');
    return res.json();
}

async function apiAnalyzeUrl(url) {
    const token = await getToken();
    if (!token) throw new Error('TOKEN_MISSING');

    const res = await fetch(`${API_ROOT}/analysis/analyze/url`, {
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

    for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(`${API_ROOT}/analysis/status/${task_id}`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!poll.ok) continue;
        const data = await poll.json();
        if (data.status === 'SUCCESS' || data.result) return data;
    }
    throw new Error('Zaman aşımı');
}

async function apiSummarize(text) {
    const token = await getToken();
    if (!token) throw new Error('TOKEN_MISSING');

    const res = await fetch(`${API_ROOT}/analysis/summarize`, {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify({ text: text.slice(0, 3000) }),
    });
    if (res.status === 401) { await clearToken(); throw new Error('TOKEN_EXPIRED'); }
    if (!res.ok) throw new Error('Özetleme başarısız');
    return res.json();
}

// ── Context menu kurulum ──────────────────────────────────────────────────
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

    chrome.tabs.sendMessage(tab.id, { type: 'CONTEXT_LOADING' }).catch(() => {});
    try {
        const data = await apiSignals(text);
        chrome.tabs.sendMessage(tab.id, { type: 'CONTEXT_RESULT', data }).catch(() => {});
    } catch (err) {
        chrome.tabs.sendMessage(tab.id, {
            type:  'CONTEXT_RESULT',
            error: err.message === 'TOKEN_MISSING' || err.message === 'TOKEN_EXPIRED'
                ? 'Önce giriş yapın — toolbar ikonuna tıklayın'
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

            } else if (msg.type === 'GET_FREE_COUNT') {
                const count = await getFreeCount();
                sendResponse({ count });

            } else if (msg.type === 'SIGNALS') {
                const data = await apiSignals(msg.text);
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: 'SIGNALS_RESULT', data }).catch(() => {});
                }
                sendResponse({ ok: true, data });

            } else if (msg.type === 'ANALYZE_URL') {
                const token = await getToken();
                const count = await getFreeCount();
                if (!token && count >= 5) {
                    sendResponse({ ok: false, error: 'LIMIT_REACHED' });
                    return;
                }
                if (!token) await incrementFreeCount();
                const data = await apiAnalyzeUrl(msg.url);
                // Sonucu cache'e kaydet — popup kapanmış olsa bile açılınca okusun
                await chrome.storage.local.set({
                    lastResult: { url: msg.url, data, ts: Date.now() }
                });

                // Geçmişe ekle (max 5)
                const { analysisHistory = [] } = await chrome.storage.local.get('analysisHistory');
                const result  = data.result || data;
                const histItem = {
                    url:       msg.url,
                    verdict:   result.status || result.prediction || 'UNKNOWN',
                    confidence: result.confidence ?? 0,
                    articleId: result.direct_match_data?.db_article_id ?? result.db_article_id ?? null,
                    ts:        Date.now(),
                };
                analysisHistory.unshift(histItem);
                if (analysisHistory.length > 5) analysisHistory.splice(5);
                await chrome.storage.local.set({ analysisHistory });

                // Badge bildirimi
                chrome.action.setBadgeText({ text: '!' }).catch(() => {});
                chrome.action.setBadgeBackgroundColor({ color: '#10b981' }).catch(() => {});

                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: 'ANALYSIS_RESULT', data }).catch(() => {});
                }
                sendResponse({ ok: true, data });

            } else if (msg.type === 'SUMMARIZE') {
                const data = await apiSummarize(msg.text);
                sendResponse({ ok: true, summary: data.summary });

            } else if (msg.type === 'GET_API_URL') {
                sendResponse({ apiUrl: 'https://nehaber.dev' });
            }
        } catch (err) {
            sendResponse({ ok: false, error: err.message });
        }
    })();
    return true;
});
