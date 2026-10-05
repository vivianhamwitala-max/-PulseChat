import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.1/+esm";

const cfg = window.PULSECHAT_SUPABASE_CONFIG;
const root = document.querySelector("#app");
const state = {
  user: null,
  authMode: "login",
  activeChat: null,
  messages: [],
  chats: [],
  searchResults: [],
  unsubscribeMessages: null,
  ready: false
};

const supabase = cfg?.url && cfg?.publishableKey
  ? createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function toast(t) {
  let x = document.querySelector(".toast");
  if (!x) {
    document.body.insertAdjacentHTML("beforeend", '<div class="toast"></div>');
    x = document.querySelector(".toast");
  }
  x.textContent = t;
  x.classList.add("show");
  setTimeout(() => x.classList.remove("show"), 2600);
}
function fmtTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
}
function directKey(a,b) { return [a,b].sort().join(":"); }

async function loadChats() {
  if (!supabase || !state.user) return;
  const { data, error } = await supabase
    .from("conversations")
    .select("id,direct_key,last_message_text,last_message_at,updated_at,conversation_members(user_id)")
    .order("updated_at", { ascending:false });
  if (error) { toast("Could not load chats: " + error.message); return; }

  state.chats = (data || []).filter(c =>
    (c.conversation_members || []).some(m => m.user_id === state.user.id)
  );
  render();
}

async function openChat(otherId, otherName, otherEmail) {
  if (!supabase || !state.user) return;
  const key = directKey(state.user.id, otherId);

  let { data: chat, error } = await supabase
    .from("conversations")
    .select("id,direct_key,last_message_text,last_message_at,updated_at")
    .eq("direct_key", key)
    .maybeSingle();

  if (error) { toast("Could not open chat: " + error.message); return; }

  if (!chat) {
    const created = await supabase
      .from("conversations")
      .insert({ owner_id: state.user.id, direct_key:key })
      .select("id,direct_key,last_message_text,last_message_at,updated_at")
      .single();
    if (created.error) { toast("Could not create chat: " + created.error.message); return; }
    chat = created.data;

    const members = await supabase.from("conversation_members").insert([
      {conversation_id: chat.id, user_id: state.user.id},
      {conversation_id: chat.id, user_id: otherId}
    ]);
    if (members.error) { toast("Could not add chat member: " + members.error.message); return; }
  }

  state.activeChat = { id:chat.id, otherId, name:otherName || otherEmail || "PulseChat contact", email:otherEmail || "" };
  state.unsubscribeMessages?.();

  const { data: messages, error: msgError } = await supabase
    .from("messages")
    .select("id,body,sender_id,created_at")
    .eq("conversation_id", chat.id)
    .order("created_at", {ascending:true});
  if (msgError) { toast("Could not load messages: " + msgError.message); return; }
  state.messages = messages || [];
  render();

  const channel = supabase
    .channel("chat-" + chat.id)
    .on("postgres_changes", {
      event:"INSERT", schema:"public", table:"messages",
      filter:"conversation_id=eq." + chat.id
    }, payload => {
      if (!state.messages.some(m => m.id === payload.new.id)) {
        state.messages.push(payload.new);
        state.messages.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
        renderMessages();
      }
    })
    .subscribe();

  state.unsubscribeMessages = () => supabase.removeChannel(channel);
}

async function sendMessage(body) {
  const text = body.trim();
  if (!text || !state.activeChat || !state.user) return;
  const { error } = await supabase.from("messages").insert({
    conversation_id: state.activeChat.id,
    sender_id: state.user.id,
    body: text
  });
  if (error) toast("Could not send message: " + error.message);
}

function authView() {
  root.innerHTML = `<div class="auth"><div class="card">
    <div class="brand">Pulse<span>Chat</span></div>
    <h1>${state.authMode === "login" ? "Welcome back" : "Create your account"}</h1>
    <p class="muted">Free Supabase authentication with persistent sign-in and real-time messaging.</p>
    <div class="muted" style="margin-top:14px;text-align:center;font-size:12px">Created by Leonard Kaluwe from Zambia · AG 16</div>
    <form class="form" id="authForm">
      ${state.authMode === "register" ? '<input id="displayName" placeholder="Display name" required>' : ""}
      <input id="email" type="email" placeholder="Email" required>
      <input id="password" type="password" minlength="6" placeholder="Password" required>
      <button class="primary">${state.authMode === "login" ? "Sign in" : "Register"}</button>
    </form>
    ${state.authMode === "login" ? '<p><button class="switch" id="forgot">Forgot password?</button></p>' : ""}
    <p><button class="switch" id="switch">${state.authMode === "login" ? "Need an account? Register" : "Already have an account? Sign in"}</button></p>
  </div></div>`;

  document.querySelector("#switch").onclick = () => {
    state.authMode = state.authMode === "login" ? "register" : "login";
    authView();
  };

  document.querySelector("#forgot")?.addEventListener("click", async () => {
    const email = document.querySelector("#email").value.trim();
    if (!email) return toast("Enter your email first.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: location.origin + location.pathname
    });
    toast(error ? error.message : "Password reset email sent.");
  });

  document.querySelector("#authForm").onsubmit = async e => {
    e.preventDefault();
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;

    if (state.authMode === "login") {
      const { error } = await supabase.auth.signInWithPassword({email,password});
      if (error) toast(error.message);
    } else {
      const displayName = document.querySelector("#displayName").value.trim();
      const { data, error } = await supabase.auth.signUp({
        email, password, options:{ data:{display_name:displayName} }
      });
      if (error) return toast(error.message);
      if (data.user && data.session) {
        await ensureProfile(data.user, displayName);
      }
      toast(data.session ? "Account created." : "Account created. Check your email to confirm it.");
    }
  };
}

async function ensureProfile(user, displayName) {
  const { error } = await supabase.from("profiles").upsert({
    id:user.id, email:user.email || "", display_name:displayName || (user.email || "").split("@")[0],
    updated_at:new Date().toISOString()
  });
  if (error) console.warn("Profile update:", error.message);
}

async function searchUsers(term) {
  const clean = term.trim();
  if (!clean) return;
  const [byEmail, byName] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name").ilike("email", "%" + clean + "%").limit(10),
    supabase.from("profiles").select("id,email,display_name").ilike("display_name", "%" + clean + "%").limit(10)
  ]);
  if (byEmail.error || byName.error) {
    toast((byEmail.error || byName.error).message);
    return;
  }
  const map = new Map();
  [...(byEmail.data||[]), ...(byName.data||[])].forEach(u => {
    if (u.id !== state.user.id) map.set(u.id,u);
  });
  state.searchResults = [...map.values()];
  renderSearchResults();
}

function renderSearchResults() {
  const el = document.querySelector("#results");
  if (!el) return;
  el.innerHTML = state.searchResults.map(u => `<div class="contact result-user" data-uid="${esc(u.id)}">
    <div class="avatar">${esc((u.display_name || u.email || "P")[0].toUpperCase())}</div>
    <div><b>${esc(u.display_name || u.email || "PulseChat contact")}</b><br><small>${esc(u.email || "")}</small></div>
  </div>`).join("") || '<div class="muted" style="padding:8px 4px">No user found.</div>';
  document.querySelectorAll(".result-user").forEach(el => {
    const u = state.searchResults.find(x => x.id === el.dataset.uid);
    el.onclick = () => u && openChat(u.id, u.display_name, u.email);
  });
}

function sidebar() {
  const chats = state.chats.map(c => `<div class="contact ${state.activeChat?.id===c.id?"active":""}" data-chat="${esc(c.id)}">
    <div class="avatar">P</div>
    <div><b>Conversation</b><br><small>${esc(c.last_message_text || "Open conversation")}</small></div>
  </div>`).join("");

  return `<aside class="sidebar">
    <div class="brand">Pulse<span>Chat</span></div>
    <form id="searchForm" class="search-row"><input class="search" id="search" placeholder="Search by email or name..."><button class="icon">🔎</button></form>
    <div id="results"></div>
    <div class="section">Chats</div>
    ${chats || '<div class="muted" style="padding:8px 4px">No conversations yet.</div>'}
    <div class="section">Account</div>
    <div class="contact"><div class="avatar">${esc((state.user?.email||"P")[0].toUpperCase())}</div><div><b>${esc(state.user?.email||"")}</b><br><small>Signed in</small></div></div>
    <button class="icon" id="about">About PulseChat</button>
    <button class="icon" id="logout" style="margin-top:auto">Sign out</button>
  </aside>`;
}

function appView() {
  const name = state.activeChat?.name || "PulseChat";
  root.innerHTML = `<div class="shell">${sidebar()}<main class="main">
    <header class="topbar"><div class="who"><div class="avatar">${esc(name[0]?.toUpperCase()||"P")}</div><div><b>${esc(name)}</b><div class="status">Supabase • Real-time</div></div></div><button class="icon" id="settings">⚙</button></header>
    <section class="messages" id="messages">${state.activeChat ? state.messages.map(messageHtml).join("") : '<div class="empty"><h2>Start a conversation</h2><p>Search for a registered PulseChat user by email or name.</p></div>'}</section>
    <form class="composer" id="composer"><input id="message" autocomplete="off" placeholder="Write a message..." ${state.activeChat?"":"disabled"}><button class="send" ${state.activeChat?"":"disabled"}>Send</button></form>
  </main></div><div class="toast"></div>`;
  bindApp();
}

function messageHtml(m) {
  return `<div class="bubble ${m.sender_id===state.user?.id?"mine":""}">${esc(m.body)}<div class="meta">${esc(fmtTime(m.created_at))}</div></div>`;
}
function renderMessages() {
  const box = document.querySelector("#messages");
  if (!box) return;
  box.innerHTML = state.messages.map(messageHtml).join("") || '<div class="empty">No messages yet. Say hello!</div>';
  box.scrollTop = box.scrollHeight;
}
function render() {
  if (!state.user) authView(); else appView();
  renderMessages();
}

function bindApp() {
  document.querySelector("#logout")?.addEventListener("click", () => supabase.auth.signOut());
  document.querySelector("#settings")?.addEventListener("click", () => toast("PulseChat • Supabase real-time messaging"));
  document.querySelector("#about")?.addEventListener("click", () => toast("Created by Leonard Kaluwe from Zambia · AG 16"));
  document.querySelector("#composer")?.addEventListener("submit", async e => {
    e.preventDefault();
    const input = document.querySelector("#message");
    const text = input.value;
    input.value = "";
    await sendMessage(text);
    input.focus();
  });
  document.querySelector("#searchForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    await searchUsers(document.querySelector("#search").value);
  });
  document.querySelectorAll("[data-chat]").forEach(el => el.onclick = async () => {
    const c = state.chats.find(x => x.id === el.dataset.chat);
    if (!c) return;
    const { data: members } = await supabase.from("conversation_members").select("user_id").eq("conversation_id", c.id);
    const other = (members||[]).find(m => m.user_id !== state.user.id);
    if (!other) return;
    const { data: profile } = await supabase.from("profiles").select("email,display_name").eq("id", other.user_id).single();
    await openChat(other.user_id, profile?.display_name, profile?.email);
  });
}

if (!supabase) {
  root.innerHTML = '<div class="auth"><div class="card"><div class="brand">Pulse<span>Chat</span></div><h1>Setup required</h1><p class="muted">Supabase configuration is missing.</p></div></div>';
} else {
  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.user = session?.user || null;
    if (state.user) {
      await ensureProfile(state.user);
      await loadChats();
    } else {
      state.unsubscribeMessages?.();
      state.unsubscribeMessages = null;
      state.activeChat = null;
      state.messages = [];
      state.chats = [];
      render();
    }
  });
  const { data:{ session } } = await supabase.auth.getSession();
  state.user = session?.user || null;
  if (state.user) {
    await ensureProfile(state.user);
    await loadChats();
  }
  render();
}
