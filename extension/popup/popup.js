// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const show = id => $(id).classList.remove("hidden");
const hide = id => $(id).classList.add("hidden");

function msg(type, payload = {}) {
    return new Promise(resolve =>
        chrome.runtime.sendMessage({ type, ...payload }, resolve)
    );
}

// ── State ─────────────────────────────────────────────────────────────────────
async function showLogin() {
    hide("view-analyze"); hide("view-result");
    show("view-login");
}

async function showAnalyze(signalsData) {
    hide("view-login"); hide("view-result");

    // Mevcut sekme URL'ini göster
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    $("current-url").textContent = tab?.url || "";

    // Katman 1 sinyal varsa badge preview göster
    if (signalsData) {
        const preview = $("badge-preview");
        preview.classList.remove("hidden", "badge-suspicious", "badge-clean");
        if (signalsData.label === "suspicious") {
            preview.classList.add("badge-suspicious");
            preview.textContent = `⚠ Şüpheli — Risk: %${Math.round(signalsData.risk_score * 100)}`;
        } else {
            preview.classList.add("badge-clean");
            preview.textContent = `✓ Temiz görünüyor`;
        }
    }

    show("view-analyze");
}

async function showResult(data) {
    hide("view-login"); hide("view-analyze");

    const result = data.result || data;
    const status = result.status || result.prediction;
    const confidence = result.confidence ?? 0;

    const label = $("result-label");
    label.className = "result-label";
    if (status === "FAKE") {
        label.textContent = "SAHTE";
        label.classList.add("result-fake");
    } else {
        label.textContent = "GERÇEĞİ YANSITMIYOR DEĞİL";
        label.classList.add("result-authentic");
    }

    $("result-score").textContent = `%${Math.round(confidence * 100)}`;
    $("result-desc").textContent = result.note || result.summary || "";

    show("view-result");
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
    const { token } = await msg("GET_TOKEN");
    if (!token) { showLogin(); return; }

    // Katman 1: mevcut sekmenin başlığını analiz et
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let signalsData = null;
    if (tab?.title) {
        const res = await msg("SIGNALS", { text: tab.title });
        if (res?.ok) signalsData = res.data;
    }
    showAnalyze(signalsData);
})();

// ── Login ─────────────────────────────────────────────────────────────────────
$("btn-login").addEventListener("click", async () => {
    const username = $("username").value.trim();
    const password = $("password").value;
    $("login-error").classList.add("hidden");

    const res = await msg("LOGIN", { username, password });
    if (res?.ok) {
        showAnalyze(null);
    } else {
        $("login-error").textContent = res?.error || "Giriş başarısız";
        $("login-error").classList.remove("hidden");
    }
});

// ── Detaylı analiz ────────────────────────────────────────────────────────────
$("btn-analyze").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return;

    hide("btn-analyze");
    show("analyze-status");
    $("analyze-status").textContent = "Analiz ediliyor…";

    const res = await msg("ANALYZE_URL", { url: tab.url });
    if (res?.ok) {
        showResult(res.data);
    } else {
        $("analyze-status").textContent = res?.error || "Hata oluştu";
        show("btn-analyze");
    }
});

// ── Yeniden analiz ────────────────────────────────────────────────────────────
$("btn-reanalyze").addEventListener("click", () => showAnalyze(null));

// ── Çıkış ────────────────────────────────────────────────────────────────────
["btn-logout", "btn-logout2"].forEach(id => {
    $(id).addEventListener("click", async () => {
        await msg("LOGOUT");
        showLogin();
    });
});
