import socketIo from "socket.io-client";
import * as chatKeys from "../shared/keys";
import type { ChatMessage } from "../types/types";

// #region agent log
fetch('http://127.0.0.1:7242/ingest/d57227e9-63c1-4bd2-9c39-e0fc80432844',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.ts:5',message:'chat.ts LOADED',data:{url:window.location.href},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
// #endregion

const socket = socketIo();

const listing = document.querySelector<HTMLDivElement>("#message-listing");
const input = document.querySelector<HTMLInputElement>("#message-submit input");
const button = document.querySelector<HTMLButtonElement>("#message-submit button");
const messageTemplate = document.querySelector<HTMLTemplateElement>("#template-chat-message");

// #region agent log
fetch('http://127.0.0.1:7242/ingest/d57227e9-63c1-4bd2-9c39-e0fc80432844',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.ts:15',message:'chat DOM elements check',data:{hasListing:!!listing,hasInput:!!input,hasButton:!!button,hasTemplate:!!messageTemplate},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
// #endregion

const appendMessage = ({ username, created_at, message }: ChatMessage) => {
  if (!messageTemplate || !listing) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d57227e9-63c1-4bd2-9c39-e0fc80432844',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.ts:appendMessage',message:'MISSING DOM ELEMENTS in appendMessage',data:{hasTemplate:!!messageTemplate,hasListing:!!listing},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return;
  }
  const clone = messageTemplate.content.cloneNode(true) as DocumentFragment;

  const timeSpan = clone.querySelector(".message-time");
  const time = new Date(created_at);
  if (timeSpan) timeSpan.textContent = time.toLocaleDateString();
  console.log(time, timeSpan);

  const usernameSpan = clone.querySelector(".message-username");
  if (usernameSpan) usernameSpan.textContent = username;
  console.log(username, usernameSpan);

  const msgSpan = clone.querySelector(".message-text");
  if (msgSpan) msgSpan.textContent = message;
  console.log(message, msgSpan);

  listing.appendChild(clone);
};

socket.on(chatKeys.CHAT_LISTING, ({ messages }: { messages: ChatMessage[] }) => {
  console.log(chatKeys.CHAT_LISTING, { messages });

  messages.forEach((message) => {
    appendMessage(message);
  });
});

socket.on(chatKeys.CHAT_MESSAGE, (message: ChatMessage) => {
  console.log(chatKeys.CHAT_MESSAGE, message);

  appendMessage(message);
});

const sendMessage = () => {
  if (!input) return;
  const message = input.value.trim();

  if (message.length > 0) {
    const body = JSON.stringify({ message });

    fetch("/chat/", {
      method: "post",
      body,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  input.value = "";
};

if (button) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    sendMessage();
  });
}

if (input) {
  input.addEventListener("keydown", (event) => {
    if (event.key == "Enter") {
      sendMessage();
    }
  });
}

// #region agent log
// Check for z-index / overlay issues (Hypothesis 2 & 5)
document.addEventListener("DOMContentLoaded", () => {
  const bgEl = document.querySelector(".bg") as HTMLElement;
  if (bgEl) {
    const bgStyle = window.getComputedStyle(bgEl);
    fetch('http://127.0.0.1:7242/ingest/d57227e9-63c1-4bd2-9c39-e0fc80432844',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.ts:DOMReady',message:'BG element styles',data:{zIndex:bgStyle.zIndex,position:bgStyle.position,pointerEvents:bgStyle.pointerEvents,opacity:bgStyle.opacity,display:bgStyle.display},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
  }
  
  // Check for any fixed/absolute positioned overlays
  const allElements = document.querySelectorAll("*");
  const overlays: any[] = [];
  allElements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if ((style.position === "fixed" || style.position === "absolute") && 
        style.zIndex !== "auto" && parseInt(style.zIndex) > 0) {
      overlays.push({
        tag: el.tagName,
        class: el.className,
        zIndex: style.zIndex,
        opacity: style.opacity
      });
    }
  });
  if (overlays.length > 0) {
    fetch('http://127.0.0.1:7242/ingest/d57227e9-63c1-4bd2-9c39-e0fc80432844',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'chat.ts:DOMReady',message:'Potential overlay elements found',data:{overlays:overlays.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
  }
});
// #endregion

// Load message history when page loads
fetch("/chat/", {
  method: "get",
  credentials: "include",
});
