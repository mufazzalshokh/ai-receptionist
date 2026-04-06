/**
 * AI Receptionist — Embeddable Chat Widget
 *
 * Embed on any website with:
 * <script src="https://your-domain.com/widget.js" data-business-id="vividerm" async></script>
 *
 * Options (via data attributes):
 *   data-business-id   — Business identifier (required)
 *   data-language       — Default language: en, lv, ru (default: en)
 *   data-color          — Primary color hex (default: #6366f1)
 *   data-position       — bottom-right or bottom-left (default: bottom-right)
 *   data-api-url        — API base URL (default: inferred from script src)
 */

interface WidgetConfig {
  businessId: string;
  businessName: string;
  language: string;
  color: string;
  position: string;
  apiUrl: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

(function () {
  // Prevent double initialization
  if ((window as unknown as Record<string, unknown>).__ai_receptionist_loaded) return;
  (window as unknown as Record<string, unknown>).__ai_receptionist_loaded = true;

  // Read configuration from script tag
  const scriptTag = document.currentScript as HTMLScriptElement | null;
  const config: WidgetConfig = {
    businessId: scriptTag?.getAttribute("data-business-id") ?? "vividerm",
    businessName: scriptTag?.getAttribute("data-business-name") ?? "",
    language: scriptTag?.getAttribute("data-language") ?? "en",
    color: scriptTag?.getAttribute("data-color") ?? "#6366f1",
    position: scriptTag?.getAttribute("data-position") ?? "bottom-right",
    apiUrl: scriptTag?.getAttribute("data-api-url") ?? inferApiUrl(),
  };

  function inferApiUrl(): string {
    if (scriptTag?.src) {
      const url = new URL(scriptTag.src);
      return `${url.protocol}//${url.host}`;
    }
    return "http://localhost:3000";
  }

  // State
  let isOpen = false;
  let messages: Message[] = [];
  let conversationId: string | null = null;
  let isLoading = false;
  let currentLanguage = config.language;

  const GREETINGS: Record<string, string> = {
    en: "Hello! How can I help you today?",
    lv: "Sveicināti! Kā varu jums palīdzēt?",
    ru: "Здравствуйте! Чем могу помочь?",
  };

  const PLACEHOLDERS: Record<string, string> = {
    en: "Type your message...",
    lv: "Ierakstiet ziņojumu...",
    ru: "Введите сообщение...",
  };

  // ---- CSS ----
  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      #ai-rcpt-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
      #ai-rcpt-btn {
        position: fixed; ${config.position === "bottom-left" ? "left: 20px" : "right: 20px"}; bottom: 20px;
        width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
        background: ${config.color}; color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s; z-index: 99998;
      }
      #ai-rcpt-btn:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(0,0,0,0.2); }
      #ai-rcpt-window {
        position: fixed; ${config.position === "bottom-left" ? "left: 20px" : "right: 20px"}; bottom: 90px;
        width: 380px; height: 520px; border-radius: 16px; overflow: hidden;
        background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: none; flex-direction: column; z-index: 99999;
        animation: ai-rcpt-slide-up 0.3s ease;
      }
      #ai-rcpt-window.open { display: flex; }
      @keyframes ai-rcpt-slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      #ai-rcpt-header {
        background: linear-gradient(135deg, ${config.color}, ${adjustColor(config.color, -20)});
        padding: 16px 20px; color: #fff; display: flex; align-items: center; justify-content: space-between;
      }
      #ai-rcpt-header-info { display: flex; align-items: center; gap: 10px; }
      #ai-rcpt-avatar { width: 36px; height: 36px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 16px; }
      #ai-rcpt-header-text h3 { font-size: 15px; font-weight: 600; }
      #ai-rcpt-header-text p { font-size: 11px; opacity: 0.8; }
      #ai-rcpt-close { background: none; border: none; color: #fff; cursor: pointer; font-size: 20px; opacity: 0.7; }
      #ai-rcpt-close:hover { opacity: 1; }
      #ai-rcpt-langs { display: flex; gap: 4px; }
      #ai-rcpt-langs button { background: rgba(255,255,255,0.15); border: none; color: #fff; padding: 2px 8px; border-radius: 6px; font-size: 11px; cursor: pointer; font-weight: 500; }
      #ai-rcpt-langs button.active { background: rgba(255,255,255,0.3); }
      #ai-rcpt-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
      .ai-rcpt-msg { max-width: 80%; padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.5; word-wrap: break-word; }
      .ai-rcpt-msg.user { align-self: flex-end; background: ${config.color}; color: #fff; border-bottom-right-radius: 4px; }
      .ai-rcpt-msg.assistant { align-self: flex-start; background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
      .ai-rcpt-typing { align-self: flex-start; background: #f1f5f9; padding: 12px 16px; border-radius: 16px; display: none; gap: 5px; }
      .ai-rcpt-typing.show { display: flex; }
      .ai-rcpt-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; animation: ai-rcpt-bounce 1.4s infinite; }
      .ai-rcpt-dot:nth-child(2) { animation-delay: 0.16s; }
      .ai-rcpt-dot:nth-child(3) { animation-delay: 0.32s; }
      @keyframes ai-rcpt-bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      #ai-rcpt-input-area { padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; gap: 8px; }
      #ai-rcpt-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 14px; outline: none; background: #fff; }
      #ai-rcpt-input:focus { border-color: ${config.color}; box-shadow: 0 0 0 2px ${config.color}22; }
      #ai-rcpt-send { width: 40px; height: 40px; border-radius: 12px; border: none; background: ${config.color}; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      #ai-rcpt-send:disabled { opacity: 0.5; cursor: default; }
      @media (max-width: 420px) { #ai-rcpt-window { width: calc(100vw - 16px); left: 8px; right: 8px; bottom: 80px; height: 60vh; } }
    `;
    document.head.appendChild(style);
  }

  function adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
    const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }

  // ---- DOM ----
  function createWidget() {
    const container = document.createElement("div");
    container.id = "ai-rcpt-container";

    // Floating button
    container.innerHTML = `
      <button id="ai-rcpt-btn" aria-label="Open chat">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <div id="ai-rcpt-window">
        <div id="ai-rcpt-header">
          <div id="ai-rcpt-header-info">
            <div id="ai-rcpt-avatar">${config.businessName.charAt(0).toUpperCase()}</div>
            <div id="ai-rcpt-header-text">
              <h3>${escapeHtml(config.businessName)}</h3>
              <p>Virtual Assistant</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div id="ai-rcpt-langs">
              <button data-lang="en" class="${currentLanguage === "en" ? "active" : ""}">EN</button>
              <button data-lang="lv" class="${currentLanguage === "lv" ? "active" : ""}">LV</button>
              <button data-lang="ru" class="${currentLanguage === "ru" ? "active" : ""}">RU</button>
            </div>
            <button id="ai-rcpt-close">&times;</button>
          </div>
        </div>
        <div id="ai-rcpt-messages"></div>
        <div id="ai-rcpt-input-area">
          <input id="ai-rcpt-input" type="text" placeholder="${PLACEHOLDERS[currentLanguage] ?? PLACEHOLDERS.en}" />
          <button id="ai-rcpt-send" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    bindEvents();
    addGreeting();
  }

  function bindEvents() {
    const btn = document.getElementById("ai-rcpt-btn")!;
    const closeBtn = document.getElementById("ai-rcpt-close")!;
    const input = document.getElementById("ai-rcpt-input") as HTMLInputElement;
    const sendBtn = document.getElementById("ai-rcpt-send")!;
    const langBtns = document.querySelectorAll("#ai-rcpt-langs button");

    btn.addEventListener("click", toggleChat);
    closeBtn.addEventListener("click", toggleChat);

    input.addEventListener("input", () => {
      sendBtn.toggleAttribute("disabled", !input.value.trim());
    });

    input.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn.addEventListener("click", sendMessage);

    langBtns.forEach((b) => {
      b.addEventListener("click", () => {
        const lang = (b as HTMLElement).dataset.lang!;
        currentLanguage = lang;
        langBtns.forEach((lb) => lb.classList.remove("active"));
        b.classList.add("active");
        input.placeholder = PLACEHOLDERS[lang] ?? PLACEHOLDERS.en;
      });
    });
  }

  function toggleChat() {
    isOpen = !isOpen;
    const window = document.getElementById("ai-rcpt-window")!;
    const btn = document.getElementById("ai-rcpt-btn")!;
    window.classList.toggle("open", isOpen);
    btn.innerHTML = isOpen
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
      : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

    if (isOpen) {
      setTimeout(() => document.getElementById("ai-rcpt-input")?.focus(), 100);
    }
  }

  function addGreeting() {
    const greeting = GREETINGS[currentLanguage] ?? GREETINGS.en;
    messages.push({ id: "greeting", role: "assistant", content: greeting });
    renderMessages();
  }

  function renderMessages() {
    const container = document.getElementById("ai-rcpt-messages")!;
    container.innerHTML = messages
      .map(
        (m) =>
          `<div class="ai-rcpt-msg ${m.role}">${escapeHtml(m.content)}</div>`
      )
      .join("");

    container.innerHTML += `<div class="ai-rcpt-typing ${isLoading ? "show" : ""}"><div class="ai-rcpt-dot"></div><div class="ai-rcpt-dot"></div><div class="ai-rcpt-dot"></div></div>`;

    container.scrollTop = container.scrollHeight;
  }

  function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  async function sendMessage() {
    const input = document.getElementById("ai-rcpt-input") as HTMLInputElement;
    const text = input.value.trim();
    if (!text || isLoading) return;

    // Add user message
    messages = [...messages, { id: genId(), role: "user", content: text }];
    input.value = "";
    document.getElementById("ai-rcpt-send")!.toggleAttribute("disabled", true);
    isLoading = true;
    renderMessages();

    try {
      const res = await fetch(`${config.apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: text,
          language: currentLanguage,
          channel: "chat",
          businessId: config.businessId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        conversationId = data.data.conversationId;
        if (data.data.language && data.data.language !== currentLanguage) {
          currentLanguage = data.data.language;
          document.querySelectorAll("#ai-rcpt-langs button").forEach((b) => {
            b.classList.toggle("active", (b as HTMLElement).dataset.lang === currentLanguage);
          });
        }
        messages = [
          ...messages,
          { id: genId(), role: "assistant", content: data.data.message },
        ];
      } else {
        messages = [
          ...messages,
          {
            id: genId(),
            role: "assistant",
            content: "Sorry, something went wrong. Please call +371 23 444 401.",
          },
        ];
      }
    } catch {
      messages = [
        ...messages,
        {
          id: genId(),
          role: "assistant",
          content: "Connection error. Please call +371 23 444 401.",
        },
      ];
    } finally {
      isLoading = false;
      renderMessages();
      input.focus();
    }
  }

  function genId(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  // ---- Init ----
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootstrap);
    } else {
      bootstrap();
    }
  }

  async function bootstrap() {
    // Fetch server config (best-effort — falls back to data attributes / defaults)
    try {
      const res = await fetch(
        `${config.apiUrl}/api/widget/config?businessId=${encodeURIComponent(config.businessId)}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          if (d.businessName) config.businessName = d.businessName;
          if (d.greeting) GREETINGS[config.language] = d.greeting;
          if (d.primaryColor && !scriptTag?.getAttribute("data-color")) config.color = d.primaryColor;
          if (d.language && !scriptTag?.getAttribute("data-language")) {
            config.language = d.language;
            currentLanguage = d.language;
          }
        }
      }
    } catch {
      // Config fetch failed — proceed with defaults
    }

    // Derive display name from config or businessId
    if (!config.businessName) {
      config.businessName = config.businessId.charAt(0).toUpperCase() + config.businessId.slice(1);
    }

    injectStyles();
    createWidget();
  }

  init();
})();
