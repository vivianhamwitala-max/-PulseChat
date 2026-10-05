import {initializeApp} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {getFirestore,doc,setDoc,getDoc,collection,addDoc,query,where,orderBy,onSnapshot,serverTimestamp,getDocs,limit} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

let auth=null;
const root=document.querySelector("#app");
const demoMessages=[
  {text:"Welcome to PulseChat Web 👋",mine:false,time:"Now"},
  {text:"Demo mode is active until Firebase is connected.",mine:true,time:"Now"}
];
const state={
  user:null, authMode:"login", demo:true, db:null, activeChat:null,
  messages:demoMessages, chats:[], unsubscribeChats:null, unsubscribeMessages:null
};
const cfg=window.PULSECHAT_FIREBASE_CONFIG;

if(cfg?.apiKey&&cfg.apiKey!=="YOUR_API_KEY"){
  try{
    const app=initializeApp(cfg);
    auth=getAuth(app);
    state.db=getFirestore(app);
    state.demo=false;
    onAuthStateChanged(auth,async user=>{
      state.user=user;
      if(user){ await ensureProfile(); await loadChats(); }
      else { cleanup(); }
      render();
    });
  }catch(err){ console.warn("Firebase unavailable",err); }
}

function cleanup(){
  state.unsubscribeChats?.(); state.unsubscribeMessages?.();
  state.unsubscribeChats=null; state.unsubscribeMessages=null;
  state.activeChat=null; state.chats=[];
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(t){
  let x=document.querySelector(".toast");
  if(!x){document.body.insertAdjacentHTML("beforeend",'<div class="toast"></div>');x=document.querySelector(".toast")}
  x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600);
}
async function ensureProfile(){
  if(!state.user||state.demo)return;
  const ref=doc(state.db,"users",state.user.uid), snap=await getDoc(ref);
  if(!snap.exists()) await setDoc(ref,{email:state.user.email||"",displayName:(state.user.email||"PulseChat User").split("@")[0],createdAt:serverTimestamp()});
}
async function loadChats(){
  if(state.demo||!state.user)return;
  state.unsubscribeChats?.();
  const q=query(collection(state.db,"conversations"),where("memberIds","array-contains",state.user.uid));
  state.unsubscribeChats=onSnapshot(q,snap=>{
    state.chats=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.updatedAt?.seconds||0)-(a.updatedAt?.seconds||0));
    render();
  },err=>toast("Could not load chats: "+err.message));
}
function otherMember(chat){
  const ids=chat.memberIds||[];
  return ids.find(id=>id!==state.user?.uid)||"";
}
function chatName(chat){
  const idx=(chat.memberIds||[]).findIndex(id=>id!==state.user?.uid);
  return chat.memberEmails?.[idx] || chat.memberNames?.[idx] || "PulseChat contact";
}
function conversationId(a,b){return [a,b].sort().join("_")}
async function openChat(otherId, otherEmail="PulseChat contact"){
  if(state.demo){state.activeChat={id:"demo",name:otherEmail||"Alex"};render();return}
  const id=conversationId(state.user.uid,otherId);
  const ref=doc(state.db,"conversations",id);
  await setDoc(ref,{
    memberIds:[state.user.uid,otherId],
    memberEmails:[state.user.email||"",otherEmail||""],
    updatedAt:serverTimestamp()
  },{merge:true});
  state.activeChat={id,name:otherEmail||"PulseChat contact",otherId};
  state.unsubscribeMessages?.();
  const q=query(collection(state.db,"conversations",id,"messages"),orderBy("createdAt","asc"));
  state.unsubscribeMessages=onSnapshot(q,snap=>{
    state.messages=snap.docs.map(d=>{const x=d.data();return {text:x.text||"",mine:x.senderId===state.user.uid,time:x.createdAt?.toDate?.().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})||""}});
    renderMessages();
  },err=>toast("Could not load messages: "+err.message));
  render();
}
async function sendMessage(text){
  if(!text)return;
  if(state.demo){state.messages.push({text,mine:true,time:"Now"});render();return}
  if(!state.activeChat){toast("Search for a person and start a chat first.");return}
  const cid=state.activeChat.id, cref=doc(state.db,"conversations",cid);
  try{
    await addDoc(collection(state.db,"conversations",cid,"messages"),{text,senderId:state.user.uid,createdAt:serverTimestamp()});
    await setDoc(cref,{updatedAt:serverTimestamp(),lastMessage:text},{merge:true});
  }catch(err){toast("Could not send message: "+err.message)}
}
function authView(){
  root.innerHTML=`<div class="auth"><div class="card">
    <div class="brand">Pulse<span>Chat</span></div>
    <h1>${state.authMode==="login"?"Welcome back":"Create your account"}</h1>
    <p class="muted">${state.demo?"Demo mode is active. Connect the Firebase Web App to enable real accounts and messaging.":"Use your PulseChat account."}</p>
    <form class="form" id="authForm">
      ${state.authMode==="register"?'<input id="displayName" placeholder="Display name" required>':""}
      <input id="email" type="email" placeholder="Email" required>
      <input id="password" type="password" minlength="6" placeholder="Password" required>
      <button class="primary">${state.authMode==="login"?"Sign in":"Register"}</button>
    </form>
    <p><button class="switch" id="switch">${state.authMode==="login"?"Need an account? Register":"Already have an account? Sign in"}</button></p>
  </div></div>`;
  document.querySelector("#switch").onclick=()=>{state.authMode=state.authMode==="login"?"register":"login";authView()};
  document.querySelector("#authForm").onsubmit=async e=>{
    e.preventDefault();
    const email=document.querySelector("#email").value.trim(),password=document.querySelector("#password").value;
    if(state.demo){state.user={uid:"demo",email};state.activeChat={id:"demo",name:"Alex"};render();return}
    try{
      if(state.authMode==="login") await signInWithEmailAndPassword(auth,email,password);
      else {
        const cred=await createUserWithEmailAndPassword(auth,email,password);
        const displayName=document.querySelector("#displayName").value.trim();
        await setDoc(doc(state.db,"users",cred.user.uid),{email,displayName,createdAt:serverTimestamp()});
      }
    }catch(err){toast(err.message)}
  };
}
function sidebar(){
  const chats=state.chats.map(c=>`<div class="contact ${state.activeChat?.id===c.id?"active":""}" data-chat="${esc(c.id)}">
    <div class="avatar">${esc(chatName(c)[0]?.toUpperCase()||"P")}</div>
    <div><b>${esc(chatName(c))}</b><br><small>${esc(c.lastMessage||"Open conversation")}</small></div>
  </div>`).join("");
  return `<aside class="sidebar">
    <div class="brand">Pulse<span>Chat</span></div>
    <form id="searchForm" class="search-row"><input class="search" id="search" placeholder="Search by email..."><button class="icon">🔎</button></form>
    <div id="results"></div>
    <div class="section">Chats</div>
    ${chats||'<div class="muted" style="padding:8px 4px">No conversations yet.</div>'}
    <div class="section">Account</div>
    <div class="contact"><div class="avatar">${esc((state.user?.email||"P")[0].toUpperCase())}</div><div><b>${esc(state.user?.email||"Demo user")}</b><br><small>Signed in</small></div></div>
    <button class="icon" id="logout" style="margin-top:auto">Sign out</button>
  </aside>`;
}
function appView(){
  const name=state.activeChat?.name||"PulseChat";
  root.innerHTML=`<div class="shell">${sidebar()}<main class="main">
    <header class="topbar"><div class="who"><div class="avatar">${esc(name[0]?.toUpperCase()||"P")}</div><div><b>${esc(name)}</b><div class="status">${state.demo?"Demo":"Connected"}</div></div></div><button class="icon" id="settings">⚙</button></header>
    <section class="messages" id="messages">${state.activeChat?state.messages.map(messageHtml).join(""):'<div class="empty"><h2>Start a conversation</h2><p>Search for a registered PulseChat user by email.</p></div>'}</section>
    <form class="composer" id="composer"><input id="message" autocomplete="off" placeholder="Write a message..." ${state.activeChat?"":"disabled"}><button class="send" ${state.activeChat?"":"disabled"}>Send</button></form>
  </main></div><div class="toast"></div>`;
  bindApp();
}
function messageHtml(m){return `<div class="bubble ${m.mine?"mine":""}">${esc(m.text)}<div class="meta">${esc(m.time||"")}</div></div>`}
function renderMessages(){
  const box=document.querySelector("#messages");
  if(!box)return;
  box.innerHTML=state.messages.map(messageHtml).join("")||'<div class="empty">No messages yet. Say hello!</div>';
  box.scrollTop=box.scrollHeight;
}
function render(){
  if(!state.user)authView(); else appView();
  renderMessages();
}
function bindApp(){
  document.querySelector("#logout")?.addEventListener("click",async()=>{if(state.demo){state.user=null;state.activeChat=null;render()}else await signOut(auth)});
  document.querySelector("#settings")?.addEventListener("click",()=>toast("Settings will be expanded in a future PulseChat update."));
  document.querySelector("#composer")?.addEventListener("submit",async e=>{e.preventDefault();const input=document.querySelector("#message");const text=input.value.trim();input.value="";await sendMessage(text);input.focus()});
  document.querySelector("#searchForm")?.addEventListener("submit",async e=>{
    e.preventDefault();const term=document.querySelector("#search").value.trim();
    if(!term)return;
    if(state.demo){document.querySelector("#results").innerHTML='<div class="contact active"><div class="avatar">A</div><div><b>Alex</b><br><small>Demo contact</small></div></div>';return}
    try{
      const q1=query(collection(state.db,"users"),where("email","==",term),limit(5));
      const q2=query(collection(state.db,"users"),where("displayName","==",term),limit(5));
      const [a,b]=await Promise.all([getDocs(q1),getDocs(q2)]);
      const users=new Map(); [...a.docs,...b.docs].forEach(d=>users.set(d.id,{id:d.id,...d.data()}));
      const html=[...users.values()].filter(u=>u.id!==state.user.uid).map(u=>`<div class="contact result-user" data-uid="${esc(u.id)}" data-email="${esc(u.email||u.displayName||"PulseChat contact")}"><div class="avatar">${esc((u.displayName||u.email||"P")[0].toUpperCase())}</div><div><b>${esc(u.displayName||u.email||"PulseChat contact")}</b><br><small>${esc(u.email||"")}</small></div></div>`).join("");
      document.querySelector("#results").innerHTML=html||'<div class="muted" style="padding:8px 4px">No user found.</div>';
      document.querySelectorAll(".result-user").forEach(el=>el.onclick=()=>openChat(el.dataset.uid,el.dataset.email));
    }catch(err){toast("Search failed: "+err.message)}
  });
  document.querySelectorAll("[data-chat]").forEach(el=>el.onclick=()=>{
    const c=state.chats.find(x=>x.id===el.dataset.chat);
    if(c)openChat(otherMember(c),chatName(c));
  });
}
if(state.demo)render();
