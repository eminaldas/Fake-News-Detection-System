// ── Heuristik: haber sayfası mı? ─────────────────────────────────────────────
function isNewsPage() {
    const hasArticle = document.querySelector("article") !== null;
    const longParagraphs = [...document.querySelectorAll("p")].filter(p => p.textContent.length > 200);
    return hasArticle || longParagraphs.length >= 3;
}

// ── Badge oluştur ─────────────────────────────────────────────────────────────
let badge = null;

function createBadge() {
    if (badge) return;
    badge = document.createElement("div");
    badge.id = "__shd_badge__";
    badge.title = "Sahte Haber Dedektifi — Tıkla";
    Object.assign(badge.style, {
        position:     "fixed",
        bottom:       "20px",
        right:        "20px",
        width:        "48px",
        height:       "48px",
        borderRadius: "50%",
        background:   "#6366f1",
        color:        "#fff",
        fontSize:     "18px",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        cursor:       "pointer",
        zIndex:       "2147483647",
        boxShadow:    "0 2px 12px rgba(0,0,0,0.4)",
        transition:   "background 0.3s",
        userSelect:   "none",
    });
    badge.textContent = "?";

    // Tıklayınca popup'ı aç
    badge.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    });

    document.body.appendChild(badge);
}

function updateBadge(state, score) {
    if (!badge) return;
    if (state === "loading") {
        badge.textContent = "⟳";
        badge.style.background = "#4b5563";
    } else if (state === "suspicious") {
        badge.textContent = "⚠";
        badge.style.background = "#d97706";
        badge.title = `Şüpheli — Risk: %${Math.round(score * 100)}`;
    } else if (state === "clean") {
        badge.textContent = "✓";
        badge.style.background = "#059669";
        badge.title = "Temiz görünüyor";
    } else if (state === "fake") {
        badge.textContent = "✗";
        badge.style.background = "#dc2626";
        badge.title = `SAHTE — %${Math.round(score * 100)}`;
    } else if (state === "authentic") {
        badge.textContent = "✓";
        badge.style.background = "#059669";
        badge.title = `Güvenilir — %${Math.round(score * 100)}`;
    }
}

// ── Mesaj dinleyici (background ve popup'tan) ─────────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SIGNALS_RESULT") {
        updateBadge(msg.data.label === "suspicious" ? "suspicious" : "clean", msg.data.risk_score);
    } else if (msg.type === "ANALYSIS_RESULT") {
        const result = msg.data.result || msg.data;
        const status = result.status || result.prediction;
        const confidence = result.confidence ?? 0;
        updateBadge(status === "FAKE" ? "fake" : "authentic", confidence);
    }
});

// ── Başlangıç ─────────────────────────────────────────────────────────────────
if (isNewsPage()) {
    createBadge();
    updateBadge("loading", 0);

    // Background'a sinyal analizi iste
    chrome.runtime.sendMessage(
        { type: "SIGNALS", text: document.title },
        (res) => {
            if (res?.ok && res.data) {
                updateBadge(res.data.label === "suspicious" ? "suspicious" : "clean", res.data.risk_score);
            } else {
                // Token yoksa sadece "?" göster
                badge.style.background = "#6366f1";
                badge.textContent = "?";
            }
        }
    );
}
