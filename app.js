const GUEST_STORAGE_KEY = "mirror_ai_demo_v1";
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const emptyState = () => ({messages:[], memories:[], traits:[]});
let currentUser = null;
let storageKey = GUEST_STORAGE_KEY;
let state = loadState(storageKey);
let supabaseClient = null;
let authMode = "login";
let cloudSaveTimer = null;

function loadState(key){
  try { return JSON.parse(localStorage.getItem(key)) || emptyState(); }
  catch { return emptyState(); }
}
function saveState(){
  localStorage.setItem(storageKey, JSON.stringify(state));
  if(currentUser && supabaseClient){
    clearTimeout(cloudSaveTimer);
    cloudSaveTimer = setTimeout(syncStateToCloud, 500);
  }
}
function isSupabaseConfigured(){
  const c = window.MIRROR_SUPABASE_CONFIG || {};
  return Boolean(window.supabase?.createClient && c.url && c.anonKey && !c.url.includes("YOUR_") && !c.anonKey.includes("YOUR_"));
}
async function syncStateToCloud(){
  if(!currentUser || !supabaseClient) return;
  const {error} = await supabaseClient.from("mirror_user_state").upsert({id:currentUser.id, data:state}, {onConflict:"id"});
  if(error){ console.error("MIRROR cloud sync:", error); showToast("ذخیره ابری انجام نشد؛ اتصال و تنظیمات را بررسی کن."); }
}
function updateAccountUI(){
  const signedIn = Boolean(currentUser);
  $("#userLabel").textContent = signedIn ? (currentUser.email.split("@")[0] || "کاربر") : "مهمان";
  $("#userSubLabel").textContent = signedIn ? "حساب متصل شده" : (isSupabaseConfigured() ? "ورود یا ثبت‌نام" : "اتصال Supabase تنظیم نشده");
  $("#userAvatar").textContent = signedIn ? (currentUser.email[0] || "M").toUpperCase() : "M";
  $("#privacyTitle").textContent = signedIn ? "حافظه خصوصی ابری" : "حالت مهمان";
  $("#privacyText").textContent = signedIn ? "داده‌ها به حساب خودت متصل‌اند." : "اطلاعات فعلاً روی همین مرورگر ذخیره می‌شود.";
  $("#storageHint").textContent = signedIn ? "گفت‌وگوها برای حساب تو همگام‌سازی می‌شوند" : "گفت‌وگوها روی همین مرورگر ذخیره می‌شوند";
  $("#privacyDot").style.background = signedIn ? "#68dcb4" : "#e0b66a";
  $("#authLogout").hidden = !signedIn;
}
function escapeHTML(value){
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function showToast(message){
  const toast=$("#toast"); toast.textContent=message; toast.classList.add("show");
  clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>toast.classList.remove("show"),2400);
}
function timeLabel(){ return new Intl.DateTimeFormat("fa-IR",{hour:"2-digit",minute:"2-digit"}).format(new Date()); }
function addMessage(role,text, persist=true){
  const wrap=document.createElement("div"); wrap.className=`message ${role}`;
  const avatar=role==="assistant"?'<div class="message-avatar"><span class="mini-mark">M</span></div>':'<div class="message-avatar"><span class="mini-mark">YOU</span></div>';
  const name=role==="assistant"?'MIRROR <span>• همراه شناخت</span>':'شما';
  wrap.innerHTML=`${avatar}<div class="message-body"><div class="message-name">${name}</div><div class="bubble">${escapeHTML(text).replace(/\n/g,"<br>")}</div><div class="message-time">${timeLabel()}</div></div>`;
  $("#conversation").appendChild(wrap); $("#conversation").scrollTop=$("#conversation").scrollHeight;
  if(persist){state.messages.push({role,text,at:Date.now()});saveState();}
}
function renderMessages(){
  const conversation=$("#conversation");
  conversation.innerHTML="";
  if(!state.messages.length) return;
  state.messages.forEach(m=>addMessage(m.role,m.text,false));
}
function localReply(text){
  const t=text.toLowerCase();
  if(/تنها|تنهایی|دلتنگ|دلتنگی/.test(t)) return "به نظر میاد ارتباط و نزدیکی با آدم‌ها برات اهمیت داره. دوست دارم بهتر بفهمم: وقتی احساس تنهایی می‌کنی، بیشتر دلت می‌خواد کسی کنارت باشه یا اینکه واقعاً درکت کنه؟";
  if(/عصبانی|ناراحت|دلخور|قهر/.test(t)) return "ممنون که این بخش رو گفتی. می‌خوام بدون قضاوت بیشتر بفهممش: وقتی ناراحت می‌شی، معمولاً همون لحظه درباره‌اش حرف می‌زنی یا اول ترجیح می‌دی با خودت خلوت کنی؟";
  if(/عشق|رابطه|دوست داشتن|عاشق/.test(t)) return "روابط عاطفی می‌تونن بخش مهمی از شناخت ما باشن. برای تو در یک رابطه، کدوم مهم‌تره: امنیت، آزادی، صداقت یا فهمیده‌شدن؟";
  if(/خودم|شخصیت|شناخت/.test(t)) return "بیایم از یک موقعیت واقعی شروع کنیم؛ آخرین باری که از واکنش خودت تعجب کردی، چه اتفاقی افتاد؟";
  return "می‌خوام بیشتر از زاویه نگاه خودت بفهممش. چه چیزی باعث شده به این نتیجه برسی؟ اگر دوست داری، یک مثال واقعی هم برام تعریف کن.";
}
function extractDemoTrait(text){
  const t=text.toLowerCase();
  const candidates=[
    {test:/احساساتم رو پنهان|احساساتم را پنهان|حرف نمی‌زنم/,name:"درون‌ریزی احساسات"},
    {test:/تنهایی|تنها می‌شم|تنها میشم/,name:"اهمیت ارتباط عاطفی"},
    {test:/زیاد فکر|فکر می‌کنم|overthink/,name:"تمایل به تحلیل زیاد"},
    {test:/صداقت|راستگویی/,name:"اهمیت صداقت"},
    {test:/آزادی|مستقل/,name:"اهمیت استقلال"},
    {test:/کمک به بقیه|کمک به دیگران/,name:"توجه به دیگران"}
  ];
  const found=candidates.find(x=>x.test.test(t));
  if(found && !state.traits.some(x=>x.name===found.name)) state.traits.push({name:found.name,level:55,confidence:"برداشت اولیه"});
  saveState(); renderProfile();
}
function sendMessage(text){
  const clean=text.trim(); if(!clean) return;
  $("#suggestions").style.display="none";
  addMessage("user",clean); $("#messageInput").value=""; autoResize();
  const typing=document.createElement("div"); typing.className="message assistant";typing.id="typing";
  typing.innerHTML='<div class="message-avatar"><span class="mini-mark">M</span></div><div class="message-body"><div class="message-name">MIRROR</div><div class="bubble typing"><i></i><i></i><i></i></div></div>';
  $("#conversation").appendChild(typing);$("#conversation").scrollTop=$("#conversation").scrollHeight;
  setTimeout(()=>{
    typing.remove(); const reply=localReply(clean);addMessage("assistant",reply);extractDemoTrait(clean);
  },650);
}
function autoResize(){const el=$("#messageInput");el.style.height="auto";el.style.height=Math.min(el.scrollHeight,120)+"px";}
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();sendMessage($("#messageInput").value);});
$("#messageInput").addEventListener("input",autoResize);
$("#messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#chatForm").requestSubmit();}});
$$(".suggestion").forEach(btn=>btn.addEventListener("click",()=>sendMessage(btn.textContent)));
$("#newChat").addEventListener("click",()=>{state.messages=[];saveState();$("#conversation").innerHTML="";addMessage("assistant","گفت‌وگوی تازه‌ای رو شروع کردیم. دوست داری امروز درباره چه چیزی حرف بزنیم؟");$("#suggestions").style.display="flex";showToast("گفت‌وگوی جدید شروع شد.");navigate("chat");$("#sidebar").classList.remove("open");});
function navigate(view){
  $$(".view").forEach(v=>v.classList.remove("active"));$("#"+view+"View").classList.add("active");
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  $("#topTitle").textContent=view==="chat"?"فضای گفت‌وگوی شخصی":view==="profile"?"نقشه شناخت شخصیت":"حافظه شخصی";
  if(view==="profile")renderProfile();if(view==="memories")renderMemories();
}
$$(".nav-item").forEach(btn=>btn.addEventListener("click",()=>{navigate(btn.dataset.view);$("#sidebar").classList.remove("open");}));
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#userMenu").addEventListener("click",openAuth);
function openAuth(){
  if(!isSupabaseConfigured()){
    showToast("ابتدا آدرس پروژه و کلید عمومی Supabase را در supabase-config.js وارد کن.");
    return;
  }
  setAuthMode(currentUser ? "account" : "login");
  $("#authBackdrop").classList.add("show");
  $("#authBackdrop").setAttribute("aria-hidden","false");
}
function closeAuth(){ $("#authBackdrop").classList.remove("show"); $("#authBackdrop").setAttribute("aria-hidden","true"); }
function setAuthMode(mode){
  authMode = mode;
  const account = mode === "account";
  const signup = mode === "signup";
  $("#authTitle").textContent = account ? "حساب MIRROR تو" : signup ? "ساخت فضای شخصی" : "ورود به فضای شخصی";
  $("#authDescription").textContent = account ? `واردشده با ${currentUser?.email || ""}` : signup ? "یک حساب بساز تا حافظه و گفت‌وگوهایت بین دستگاه‌ها همراهت بمانند." : "برای نگهداری گفت‌وگوها و حافظه‌ات وارد حساب شو.";
  $("#authForm").hidden = account;
  $("#authSwitch").hidden = account;
  $("#authLogout").hidden = !account;
  $("#authSubmit").textContent = signup ? "ساخت حساب" : "ورود";
  $("#authSwitch").textContent = signup ? "حساب داری؟ وارد شو" : "حساب نداری؟ ثبت‌نام کن";
  $("#authPassword").autocomplete = signup ? "new-password" : "current-password";
}
async function handleAuthSubmit(event){
  event.preventDefault();
  if(!supabaseClient){ showToast("اتصال Supabase آماده نیست."); return; }
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  const submit = $("#authSubmit");
  submit.disabled = true; submit.textContent = "در حال اتصال…";
  try{
    if(authMode === "signup"){
      const {data,error} = await supabaseClient.auth.signUp({email,password});
      if(error) throw error;
      if(data.session){ await activateUser(data.user); closeAuth(); showToast("حسابت ساخته شد؛ خوش اومدی."); }
      else { showToast("حساب ساخته شد. ایمیلت رو برای تأیید بررسی کن، بعد وارد شو."); setAuthMode("login"); }
    }else{
      const {data,error} = await supabaseClient.auth.signInWithPassword({email,password});
      if(error) throw error;
      await activateUser(data.user); closeAuth(); showToast("با موفقیت وارد شدی.");
    }
  }catch(error){
    console.error("MIRROR auth:", error);
    showToast(authErrorMessage(error));
  }finally{
    submit.disabled = false;
    submit.textContent = authMode === "signup" ? "ساخت حساب" : "ورود";
  }
}
function authErrorMessage(error){
  const message = String(error?.message || "");
  if(/Invalid login credentials/i.test(message)) return "ایمیل یا رمز عبور درست نیست.";
  if(/already registered/i.test(message)) return "این ایمیل قبلاً ثبت‌نام کرده؛ وارد شو.";
  if(/password/i.test(message)) return "رمز عبور باید حداقل ۸ کاراکتر باشد.";
  return message || "مشکلی در اتصال پیش آمد. دوباره تلاش کن.";
}
async function activateUser(user){
  if(!user || !supabaseClient) return;
  currentUser = user;
  storageKey = `mirror_ai_user_${user.id}`;
  const {data,error} = await supabaseClient.from("mirror_user_state").select("data").eq("id",user.id).maybeSingle();
  if(error) throw error;
  if(data?.data){
    state = {...emptyState(), ...data.data};
    localStorage.setItem(storageKey, JSON.stringify(state));
  }else{
    // First sign-in: carry the guest's current demo data into this user's private row.
    state = loadState(storageKey);
    if(!state.messages.length && !state.memories.length && !state.traits.length){
      const guestState = loadState(GUEST_STORAGE_KEY);
      if(guestState.messages.length || guestState.memories.length || guestState.traits.length) state = guestState;
    }
    await syncStateToCloud();
  }
  renderMessages(); renderProfile(); renderMemories(); updateAccountUI();
}
$("#authForm").addEventListener("submit",handleAuthSubmit);
$("#authSwitch").addEventListener("click",()=>setAuthMode(authMode === "signup" ? "login" : "signup"));
$("#authClose").addEventListener("click",closeAuth);
$("#authBackdrop").addEventListener("click",e=>{if(e.target === $("#authBackdrop")) closeAuth();});
$("#authLogout").addEventListener("click",async()=>{
  if(!supabaseClient) return;
  const {error} = await supabaseClient.auth.signOut();
  if(error){showToast("خروج انجام نشد؛ دوباره تلاش کن.");return;}
  closeAuth();
});
async function initializeSupabase(){
  if(!isSupabaseConfigured()) { updateAccountUI(); return; }
  const config = window.MIRROR_SUPABASE_CONFIG;
  supabaseClient = window.supabase.createClient(config.url, config.anonKey, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data:{session}} = await supabaseClient.auth.getSession();
  if(session?.user){
    try{ await activateUser(session.user); }catch(error){console.error(error);showToast("حساب وصل شد، اما خواندن حافظه ابری خطا داشت. SQL را بررسی کن.");currentUser=session.user;updateAccountUI();}
  }else updateAccountUI();
  supabaseClient.auth.onAuthStateChange((event,session)=>{
    if(event === "SIGNED_OUT"){
      currentUser = null; storageKey = GUEST_STORAGE_KEY; state = loadState(storageKey);
      renderMessages();renderProfile();renderMemories();updateAccountUI();
    }else if(event === "SIGNED_IN" && session?.user && currentUser?.id !== session.user.id){
      setTimeout(()=>activateUser(session.user).catch(err=>{console.error(err);showToast("همگام‌سازی حساب با خطا روبه‌رو شد.");}),0);
    }
  });
}
$("#clearData").addEventListener("click",()=>{if(confirm("همه پیام‌ها و یادداشت‌های ذخیره‌شده در این مرورگر پاک شوند؟")){localStorage.removeItem(storageKey);state=emptyState();saveState();renderMessages();renderProfile();renderMemories();showToast("داده‌های ذخیره‌شده پاک شدند.");}});
function renderProfile(){
  const count=Math.min(100,Math.round(state.traits.length/6*100));$("#profileProgress").style.width=count+"%";$("#progressLabel").textContent=count.toLocaleString("fa-IR")+"٪ تکمیل شناخت اولیه";
  const el=$("#traitsList");
  if(!state.traits.length){el.className="empty-state";el.innerHTML="<span>◎</span><b>هنوز اطلاعات کافی نداریم</b><p>با آینه گفت‌وگو کن تا نشانه‌های شخصیتی به‌مرور اینجا نمایش داده بشن.</p>";return;}
  el.className="trait-list";el.innerHTML=state.traits.map(x=>`<div class="trait-row"><span>${escapeHTML(x.name)}</span><div class="trait-bar"><span style="width:${x.level}%"></span></div><small>${escapeHTML(x.confidence)}</small></div>`).join("");
}
function renderMemories(){
  const el=$("#memoriesList");
  if(!state.memories.length){el.className="empty-state";el.innerHTML="<span>▤</span><b>حافظه‌ات هنوز خالیه</b><p>می‌تونی نکته‌های مهم درباره خودت رو دستی ذخیره کنی.</p>";return;}
  el.className="";el.innerHTML=state.memories.map((m,i)=>`<div class="memory-item"><div><p>${escapeHTML(m.text)}</p><small>${new Date(m.at).toLocaleDateString("fa-IR")}</small></div><button class="delete-memory" data-index="${i}" aria-label="حذف یادداشت">×</button></div>`).join("");
  $$(".delete-memory").forEach(b=>b.addEventListener("click",()=>{state.memories.splice(Number(b.dataset.index),1);saveState();renderMemories();showToast("یادداشت حذف شد.");}));
}
$("#addMemory").addEventListener("click",()=>{const text=prompt("چه چیزی رو دوست داری در حافظه‌ات نگه داری؟");if(text&&text.trim()){state.memories.unshift({text:text.trim(),at:Date.now()});saveState();renderMemories();showToast("یادداشت ذخیره شد.");}});
renderMessages();renderProfile();renderMemories();

initializeSupabase().catch(error=>{console.error("Supabase init:",error);showToast("اتصال Supabase برقرار نشد؛ تنظیمات را بررسی کن.");});
