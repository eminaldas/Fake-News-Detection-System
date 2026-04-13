const API_BASE = "http://localhost:8000/api/v1";

// ── Token yönetimi ────────────────────────────────────────────────────────────
async function getToken() {
    const { token } = await chrome.storage.local.get("token");
    return token || null;
}

async function saveToken(token) {
    await chrome.storage.local.set({ token });
}

async function clearToken() {
    await chrome.storage.local.remove("token");
}

// ── API çağrıları ─────────────────────────────────────────────────────────────
async function apiLogin(username, password) {
    const body = new URLSearchParams({ username, password });
    const res = await fetch(`${API_BASE}/auth/login?client=extension`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) throw new Error("Giriş başarısız");
    const data = await res.json();
    await saveToken(data.access_token);
    return data;
}

async function apiSignals(text) {
    const token = await getToken();
    if (!token) throw new Error("TOKEN_MISSING");
    const res = await fetch(`${API_BASE}/analyze/signals`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text.slice(0, 500) }),
    });
    if (res.status === 401) { await clearToken(); throw new Error("TOKEN_EXPIRED"); }
    if (!res.ok) throw new Error("Sinyal analizi başarısız");
    return await res.json();
}

async function apiAnalyzeUrl(url) {
    const token = await getToken();
    if (!token) throw new Error("TOKEN_MISSING");
    // Task başlat
    const res = await fetch(`${API_BASE}/analyze/url`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
    });
    if (res.status === 401) { await clearToken(); throw new Error("TOKEN_EXPIRED"); }
    if (!res.ok) throw new Error("Analiz başlatılamadı");
    const { task_id } = await res.json();

    // Polling — max 30s
    for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const poll = await fetch(`${API_BASE}/analysis/status/${task_id}`, {
            headers: { "Authorization": `Bearer ${token}` },
        });
        if (!poll.ok) continue;
        const data = await poll.json();
        if (data.status === "completed" || data.result) return data;
    }
    throw new Error("Zaman aşımı");
}

// ── Mesaj dinleyici ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    (async () => {
        try {
            if (msg.type === "LOGIN") {
                await apiLogin(msg.username, msg.password);
                sendResponse({ ok: true });
            } else if (msg.type === "LOGOUT") {
                await clearToken();
                sendResponse({ ok: true });
            } else if (msg.type === "GET_TOKEN") {
                const token = await getToken();
                sendResponse({ token });
            } else if (msg.type === "SIGNALS") {
                const data = await apiSignals(msg.text);
                // content script'e de gönder
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: "SIGNALS_RESULT", data });
                }
                sendResponse({ ok: true, data });
            } else if (msg.type === "ANALYZE_URL") {
                const data = await apiAnalyzeUrl(msg.url);
                // content script'e de gönder
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab?.id) {
                    chrome.tabs.sendMessage(tab.id, { type: "ANALYSIS_RESULT", data });
                }
                sendResponse({ ok: true, data });
            } else if (msg.type === "PAGE_LOADED") {
                try {
                    const data = await apiSignals(msg.title);
                    if (_sender.tab?.id) {
                        chrome.tabs.sendMessage(_sender.tab.id, { type: "SIGNALS_RESULT", data });
                    }
                } catch (_) {
                    // fail silently — Katman 1 arka planda çalışır
                }
                sendResponse({ ok: true });
            } else if (msg.type === "OPEN_POPUP") {
                if (chrome.action?.openPopup) {
                    chrome.action.openPopup().catch(() => {});
                }
                sendResponse({ ok: true });
            }
        } catch (err) {
            sendResponse({ ok: false, error: err.message });
        }
    })();
    return true; // async response
});
