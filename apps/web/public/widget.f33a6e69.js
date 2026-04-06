"use strict";(()=>{(function(){if(window.__ai_receptionist_loaded)return;window.__ai_receptionist_loaded=!0;let r=document.currentScript,e={businessId:r?.getAttribute("data-business-id")??"vividerm",businessName:r?.getAttribute("data-business-name")??"",language:r?.getAttribute("data-language")??"en",color:r?.getAttribute("data-color")??"#6366f1",position:r?.getAttribute("data-position")??"bottom-right",apiUrl:r?.getAttribute("data-api-url")??k()};function k(){if(r?.src){let t=new URL(r.src);return`${t.protocol}//${t.host}`}return"http://localhost:3000"}let l=!1,s=[],x=null,p=!1,a=e.language,f={en:"Hello! How can I help you today?",lv:"Sveicin\u0101ti! K\u0101 varu jums pal\u012Bdz\u0113t?",ru:"\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u0427\u0435\u043C \u043C\u043E\u0433\u0443 \u043F\u043E\u043C\u043E\u0447\u044C?"},g={en:"Type your message...",lv:"Ierakstiet zi\u0146ojumu...",ru:"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435..."};function E(){let t=document.createElement("style");t.textContent=`
      #ai-rcpt-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
      #ai-rcpt-btn {
        position: fixed; ${e.position==="bottom-left"?"left: 20px":"right: 20px"}; bottom: 20px;
        width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer;
        background: ${e.color}; color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s; z-index: 99998;
      }
      #ai-rcpt-btn:hover { transform: scale(1.05); box-shadow: 0 6px 24px rgba(0,0,0,0.2); }
      #ai-rcpt-window {
        position: fixed; ${e.position==="bottom-left"?"left: 20px":"right: 20px"}; bottom: 90px;
        width: 380px; height: 520px; border-radius: 16px; overflow: hidden;
        background: #fff; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        display: none; flex-direction: column; z-index: 99999;
        animation: ai-rcpt-slide-up 0.3s ease;
      }
      #ai-rcpt-window.open { display: flex; }
      @keyframes ai-rcpt-slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      #ai-rcpt-header {
        background: linear-gradient(135deg, ${e.color}, ${I(e.color,-20)});
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
      .ai-rcpt-msg.user { align-self: flex-end; background: ${e.color}; color: #fff; border-bottom-right-radius: 4px; }
      .ai-rcpt-msg.assistant { align-self: flex-start; background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
      .ai-rcpt-typing { align-self: flex-start; background: #f1f5f9; padding: 12px 16px; border-radius: 16px; display: none; gap: 5px; }
      .ai-rcpt-typing.show { display: flex; }
      .ai-rcpt-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; animation: ai-rcpt-bounce 1.4s infinite; }
      .ai-rcpt-dot:nth-child(2) { animation-delay: 0.16s; }
      .ai-rcpt-dot:nth-child(3) { animation-delay: 0.32s; }
      @keyframes ai-rcpt-bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
      #ai-rcpt-input-area { padding: 12px 16px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; gap: 8px; }
      #ai-rcpt-input { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 14px; outline: none; background: #fff; }
      #ai-rcpt-input:focus { border-color: ${e.color}; box-shadow: 0 0 0 2px ${e.color}22; }
      #ai-rcpt-send { width: 40px; height: 40px; border-radius: 12px; border: none; background: ${e.color}; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; }
      #ai-rcpt-send:disabled { opacity: 0.5; cursor: default; }
      @media (max-width: 420px) { #ai-rcpt-window { width: calc(100vw - 16px); left: 8px; right: 8px; bottom: 80px; height: 60vh; } }
    `,document.head.appendChild(t)}function I(t,n){let i=parseInt(t.replace("#",""),16),o=Math.min(255,Math.max(0,(i>>16&255)+n)),c=Math.min(255,Math.max(0,(i>>8&255)+n)),d=Math.min(255,Math.max(0,(i&255)+n));return`#${(o<<16|c<<8|d).toString(16).padStart(6,"0")}`}function L(){let t=document.createElement("div");t.id="ai-rcpt-container",t.innerHTML=`
      <button id="ai-rcpt-btn" aria-label="Open chat">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>
      <div id="ai-rcpt-window">
        <div id="ai-rcpt-header">
          <div id="ai-rcpt-header-info">
            <div id="ai-rcpt-avatar">${e.businessName.charAt(0).toUpperCase()}</div>
            <div id="ai-rcpt-header-text">
              <h3>${h(e.businessName)}</h3>
              <p>Virtual Assistant</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div id="ai-rcpt-langs">
              <button data-lang="en" class="${a==="en"?"active":""}">EN</button>
              <button data-lang="lv" class="${a==="lv"?"active":""}">LV</button>
              <button data-lang="ru" class="${a==="ru"?"active":""}">RU</button>
            </div>
            <button id="ai-rcpt-close">&times;</button>
          </div>
        </div>
        <div id="ai-rcpt-messages"></div>
        <div id="ai-rcpt-input-area">
          <input id="ai-rcpt-input" type="text" placeholder="${g[a]??g.en}" />
          <button id="ai-rcpt-send" disabled>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    `,document.body.appendChild(t),M(),$()}function M(){let t=document.getElementById("ai-rcpt-btn"),n=document.getElementById("ai-rcpt-close"),i=document.getElementById("ai-rcpt-input"),o=document.getElementById("ai-rcpt-send"),c=document.querySelectorAll("#ai-rcpt-langs button");t.addEventListener("click",m),n.addEventListener("click",m),i.addEventListener("input",()=>{o.toggleAttribute("disabled",!i.value.trim())}),i.addEventListener("keydown",d=>{d.key==="Enter"&&!d.shiftKey&&(d.preventDefault(),v())}),o.addEventListener("click",v),c.forEach(d=>{d.addEventListener("click",()=>{let w=d.dataset.lang;a=w,c.forEach(B=>B.classList.remove("active")),d.classList.add("active"),i.placeholder=g[w]??g.en})})}function m(){l=!l;let t=document.getElementById("ai-rcpt-window"),n=document.getElementById("ai-rcpt-btn");t.classList.toggle("open",l),n.innerHTML=l?'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>':'<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',l&&setTimeout(()=>document.getElementById("ai-rcpt-input")?.focus(),100)}function $(){let t=f[a]??f.en;s.push({id:"greeting",role:"assistant",content:t}),b()}function b(){let t=document.getElementById("ai-rcpt-messages");t.innerHTML=s.map(n=>`<div class="ai-rcpt-msg ${n.role}">${h(n.content)}</div>`).join(""),t.innerHTML+=`<div class="ai-rcpt-typing ${p?"show":""}"><div class="ai-rcpt-dot"></div><div class="ai-rcpt-dot"></div><div class="ai-rcpt-dot"></div></div>`,t.scrollTop=t.scrollHeight}function h(t){let n=document.createElement("div");return n.textContent=t,n.innerHTML}async function v(){let t=document.getElementById("ai-rcpt-input"),n=t.value.trim();if(!(!n||p)){s=[...s,{id:u(),role:"user",content:n}],t.value="",document.getElementById("ai-rcpt-send").toggleAttribute("disabled",!0),p=!0,b();try{let o=await(await fetch(`${e.apiUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conversationId:x,message:n,language:a,channel:"chat",businessId:e.businessId})})).json();o.success?(x=o.data.conversationId,o.data.language&&o.data.language!==a&&(a=o.data.language,document.querySelectorAll("#ai-rcpt-langs button").forEach(c=>{c.classList.toggle("active",c.dataset.lang===a)})),s=[...s,{id:u(),role:"assistant",content:o.data.message}]):s=[...s,{id:u(),role:"assistant",content:"Sorry, something went wrong. Please call +371 23 444 401."}]}catch{s=[...s,{id:u(),role:"assistant",content:"Connection error. Please call +371 23 444 401."}]}finally{p=!1,b(),t.focus()}}}function u(){return Math.random().toString(36).slice(2,10)}function C(){document.readyState==="loading"?document.addEventListener("DOMContentLoaded",y):y()}async function y(){try{let t=await fetch(`${e.apiUrl}/api/widget/config?businessId=${encodeURIComponent(e.businessId)}`);if(t.ok){let n=await t.json();if(n.success&&n.data){let i=n.data;i.businessName&&(e.businessName=i.businessName),i.greeting&&(f[e.language]=i.greeting),i.primaryColor&&!r?.getAttribute("data-color")&&(e.color=i.primaryColor),i.language&&!r?.getAttribute("data-language")&&(e.language=i.language,a=i.language)}}}catch{}e.businessName||(e.businessName=e.businessId.charAt(0).toUpperCase()+e.businessId.slice(1)),E(),L()}C()})();})();
