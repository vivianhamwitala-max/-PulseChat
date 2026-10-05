import {initializeApp} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import {getFirestore,collection,addDoc,query,orderBy,onSnapshot,serverTimestamp} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const demoMessages=[
 {text:"Welcome to PulseChat Web 👋",mine:false,time:"Now"},
 {text:"This browser version is connected to the PulseChat project UI.",mine:true,time:"Now"}
];
let state={user:null,authMode:"login",active:"Alex",demo:true,messages:demoMessages,unsubscribe:null,db:null};
const cfg=window.PULSECHAT_FIREBASE_CONFIG;
if(cfg?.apiKey&&cfg.apiKey!=="YOUR_API_KEY"){
  try{
    const app=initializeApp(cfg); state.db=getFirestore(app); state.demo=false;
    const auth=getAuth(app);
    onAuthStateChanged(auth,u=>{state.user=u;render()});
  }catch(e){console.warn("Firebase unavailable",e)}
}
const root=document.querySelector("#app");
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(t){const x=document.querySelector(".toast");if(!x)return;x.textContent=t;x.classList.add("show");setTimeout(()=>x.classList.remove("show"),2600)}
function authView(){root.innerHTML=`<div class="auth"><div class="card"><div class="brand">Pulse<span>Chat</span></div><h1>${state.authMode==="login"?"Welcome back":"Create your account"}</h1><p class="muted">${state.demo?"Demo mode is active. Add Firebase config to enable real accounts and messages.":"Sign in securely with your PulseChat account."}</p><form class="form" id="authForm"><input id="email" type="email" placeholder="Email" required><input id="password" type="password" placeholder="Password" minlength="6" placeholder="Password" required><button class="primary">${state.authMode==="login"?"Sign in":"Register"}</button></form><p><button class="switch" id="switch">${state.authMode==="login"?"Need an account? Register":"Already have an account? Sign in"}</button></p></div></div>`;
document.querySelector("#switch").onclick=()=>{state.authMode=state.authMode==="login"?"register":"login";authView()};
document.querySelector("#authForm").onsubmit=async e=>{e.preventDefault();if(state.demo){state.user={email:document.querySelector("#email").value||"demo@pulsechat.local"};render();return}try{const auth=getAuth();const email=document.querySelector("#email").value,p=document.querySelector("#password").value;state.authMode==="login"?await signInWithEmailAndPassword(auth,email,p):await createUserWithEmailAndPassword(auth,email,p)}catch(err){toast(err.message)}}}
function appView(){const msgs=state.messages.map(m=>`<div class="bubble ${m.mine?"mine":""}">${esc(m.text)}<div class="meta">${esc(m.time||"")}</div></div>`).join("");root.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand">Pulse<span>Chat</span></div><input class="search" placeholder="Search people..." id="search"><div class="section">Chats</div><div class="contact active"><div class="avatar">A</div><div><b>Alex</b><br><small>Active now</small></div></div><div class="contact"><div class="avatar">M</div><div><b>Maria</b><br><small>Say hello</small></div></div><div class="section">Account</div><div class="contact" id="profile"><div class="avatar">${esc((state.user?.email||"P")[0].toUpperCase())}</div><div><b>Profile</b><br><small>${esc(state.user?.email||"Demo user")}</small></div></div><button class="icon" id="logout" style="margin-top:auto">Sign out</button></aside><main class="main"><header class="topbar"><div class="who"><div class="avatar">A</div><div><b>Alex</b><div class="status">● Online</div></div></div><button class="icon" id="settings">⚙</button></header><section class="messages" id="messages">${msgs}</section><form class="composer" id="composer"><input id="message" autocomplete="off" placeholder="Write a message..."><button class="send">Send</button></form></main></div><div class="toast"></div>`;
document.querySelector("#logout").onclick=async()=>{if(!state.demo)await signOut(getAuth());else{state.user=null;render()}};
document.querySelector("#settings").onclick=()=>toast("Settings panel is ready for the next web build step.");
document.querySelector("#composer").onsubmit=async e=>{e.preventDefault();const input=document.querySelector("#message"),text=input.value.trim();if(!text)return;if(state.demo){state.messages.push({text,mine:true,time:"Now"});input.value="";render();return}try{await addDoc(collection(state.db,"messages"),{text,uid:state.user.uid,createdAt:serverTimestamp()});input.value=""}catch(err){toast("Could not send message: "+err.message)}};
if(!state.demo&&state.db&&state.user){const q=query(collection(state.db,"messages"),orderBy("createdAt","asc"));state.unsubscribe?.();state.unsubscribe=onSnapshot(q,s=>{state.messages=s.docs.map(d=>({text:d.data().text||"",mine:d.data().uid===state.user.uid,time:""}));render()})}}
function render(){if(!state.user)authView();else appView()}
render();