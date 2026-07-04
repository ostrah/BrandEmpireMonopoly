/* =====================================================================
   МОНОПОЛИЯ · «БИРЖА 1929» — оболочка приложения (агент A)
   Навигация, auth (register/verify/login/goggle), демо-почта, лобби,
   транспорт window.Net (SSE + fetch), тосты window.toast, локализация.
   Экраны #page-room и #page-game рисует game.js (window.Game).
   ===================================================================== */

/* ===================== window.Net — транспорт ===================== */
window.Net = (function(){
  let es = null;          // текущий EventSource
  let wantStream = false; // держим ли соединение (false после logout)
  let retry = 800;        // пауза перед переподключением, мс
  const subs = {};        // type → [обработчики]

  function emit(type, msg){
    (subs[type] || []).forEach(fn => { try{ fn(msg); }catch(e){ console.error('[Net]', e); } });
  }
  function connect(){
    wantStream = true;
    if(es){ es.close(); es = null; }
    es = new EventSource('/api/stream');
    es.onopen = () => { retry = 800; };
    es.onmessage = e => {
      let msg = null;
      try{ msg = JSON.parse(e.data); }catch(err){ return; }
      if(msg && msg.type) emit(msg.type, msg);
    };
    es.onerror = () => {  // соединение упало — переоткрываем сами, с нарастающей паузой
      if(es){ es.close(); es = null; }
      if(!wantStream) return;
      setTimeout(() => { if(wantStream && !es) connect(); }, retry);
      retry = Math.min(Math.round(retry * 1.7), 12000);
    };
  }
  function close(){ wantStream = false; if(es){ es.close(); es = null; } }
  function on(type, fn){ (subs[type] = subs[type] || []).push(fn); }
  async function api(path, body){
    try{
      const r = await fetch(path, {
        method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body || {}),
      });
      return await r.json();
    }catch(e){ return {error:'error'}; }
  }
  async function get(path){
    try{
      const r = await fetch(path, {credentials:'same-origin'});
      return await r.json();
    }catch(e){ return {error:'error'}; }
  }
  return {connect, close, on, api, get};
})();

/* ===================== тосты и мелкие помощники ===================== */
window.toast = function(msg){
  const box = document.getElementById('toasts');
  if(!box) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  box.appendChild(el);
  requestAnimationFrame(()=> el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 400); }, 3800);
};

/* перевод кода ошибки API в человеческий текст */
function apiErr(code){
  const key = 'api.' + code;
  const msg = t(key);
  return msg === key ? t('api.error') : msg;
}
/* экранирование пользовательского текста для innerHTML */
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function openModal(id){ const m = document.getElementById(id); if(m) m.classList.remove('hidden'); }
function closeModal(id){ const m = document.getElementById(id); if(m) m.classList.add('hidden'); }

/* ===================== состояние оболочки ===================== */
let ME = null;            // {id, username, email} после входа
let VERIFY_EMAIL = null;  // почта, ожидающая код подтверждения
let MAIL_TOKEN = null;    // токен доступа к демо-ящику (выдаёт /api/register)
function setMailToken(tk){
  if(!tk) return;
  MAIL_TOKEN = tk;
  try{ sessionStorage.setItem('mono_mailtoken', tk); }catch(e){}
}
function mailboxUrl(email){
  return '/api/mailbox?email=' + encodeURIComponent(email) +
    (MAIL_TOKEN ? '&token=' + encodeURIComponent(MAIL_TOKEN) : '');
}
let IN_GAME = false;      // идёт ли партия — управляет вкладкой «Партия»
let ROOMS = [];           // комнаты лобби
let MAIL_LETTERS = [];    // письма демо-почты

/* ===================== навигация между экранами ===================== */
function showPage(name){
  if(name === 'lobby' && !ME){ toast(t('toast.needLogin')); name = 'login'; }
  const page = document.getElementById('page-' + name);
  if(!page) return;
  document.querySelectorAll('.tab-page').forEach(p=>p.classList.remove('active'));
  page.classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b.dataset.tab === name));
  if(name === 'lobby') loadRooms();
  window.scrollTo({top:0, behavior:'instant'});
}
document.querySelectorAll('.tab-btn').forEach(b => b.addEventListener('click', ()=>showPage(b.dataset.tab)));
document.querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', ()=>showPage(el.dataset.goto)));

/* активная сейчас страница (id секции) */
function activePageId(){
  const cur = document.querySelector('.tab-page.active');
  return cur ? cur.id : '';
}

/* ===================== шапка: гость / вошедший ===================== */
function updateHeader(){
  const logged = !!ME;
  document.getElementById('navLogin').classList.toggle('hidden', logged);
  document.getElementById('navRegister').classList.toggle('hidden', logged);
  document.getElementById('userChip').classList.toggle('hidden', !logged);
  document.getElementById('logoutBtn').classList.toggle('hidden', !logged);
  document.getElementById('userName').textContent = logged ? ME.username : '';
  document.getElementById('mailBtn').classList.toggle('hidden', !mailEmail());
  document.getElementById('tabGame').classList.toggle('hidden', !IN_GAME);
}

document.getElementById('logoutBtn').addEventListener('click', async ()=>{
  await Net.api('/api/logout');
  Net.close();
  ME = null; IN_GAME = false; ROOMS = []; MAIL_LETTERS = [];
  updateHeader();
  if(window.Game && Game.reset){ try{ Game.reset(); }catch(e){} }
  showPage('home');
  toast(t('toast.bye'));
});

/* общий финал входа: register→verify, login, goggle */
function finishLogin(user){
  ME = user;
  IN_GAME = false;
  updateHeader();
  refreshMailBadge();
  Net.connect();
  showPage('lobby');
  toast(t('toast.hello').replace('{name}', user.username));
}

/* ===================== SSE-маршрутизация ===================== */
Net.on('hello', msg => {
  if(msg.user){ ME = msg.user; }
  if(msg.where === 'game'){
    IN_GAME = true;
    if(window.Game && Game.showGame && msg.game){ try{ Game.showGame(msg.game); }catch(e){} }
    showPage('game');
  } else if(msg.where === 'room'){
    IN_GAME = false;
    if(window.Game && Game.showRoom && msg.room){ try{ Game.showRoom(msg.room); }catch(e){} }
    showPage('room');
  } else {
    IN_GAME = false;
    /* нас вернули в лобби — уводим со «застрявших» игровых экранов */
    if(activePageId() === 'page-room' || activePageId() === 'page-game') showPage('lobby');
  }
  updateHeader();
});

Net.on('lobby', msg => { ROOMS = msg.rooms || []; renderRooms(); });

Net.on('room', msg => {
  if(msg.room){
    if(activePageId() !== 'page-game') showPage('room');
  } else {
    /* комната распущена или мы ушли */
    IN_GAME = false;
    updateHeader();
    if(window.Game && Game.reset){ try{ Game.reset(); }catch(e){} }
    if(activePageId() === 'page-room' || activePageId() === 'page-game') showPage('lobby');
  }
});

Net.on('game', msg => {
  if(!IN_GAME){
    IN_GAME = true;
    updateHeader();
    showPage('game');
  }
  /* сам стейт рисует game.js по своей подписке */
});

/* ===================== ЛОББИ: комнаты ===================== */
async function loadRooms(){
  if(!ME) return;
  const j = await Net.get('/api/rooms');
  if(j && j.ok){ ROOMS = j.rooms || []; renderRooms(); }
}
function renderRooms(){
  const box = document.getElementById('roomsList');
  if(!box) return;
  if(!ROOMS.length){
    box.innerHTML = '<div class="rooms-empty">' + esc(t('lobby.empty')) + '</div>';
    return;
  }
  box.innerHTML = ROOMS.map(r => {
    const full = r.members >= r.maxPlayers;
    return '<div class="room">' +
      '<div><div class="rn">' + esc(r.name) + '</div>' +
      '<div class="rh">' + esc(t('lobby.host')) + ' ' + esc(r.host && r.host.username) + '</div></div>' +
      '<span class="cnt"><b>' + (r.members|0) + '</b>/' + (r.maxPlayers|0) + '</span>' +
      (full
        ? '<button class="btn" disabled>' + esc(t('lobby.full')) + '</button>'
        : '<button class="btn btn-primary" data-join="' + esc(r.id) + '">' + esc(t('lobby.enter')) + '</button>') +
      '</div>';
  }).join('');
}
async function joinRoom(roomId){
  const j = await Net.api('/api/rooms/join', {roomId});
  if(j.ok) showPage('room');
  else toast(apiErr(j.error));
}
document.getElementById('roomsList').addEventListener('click', e => {
  const b = e.target.closest('[data-join]');
  if(b) joinRoom(b.dataset.join);
});

/* вход в приватную комнату по коду */
document.getElementById('joinCodeBtn').addEventListener('click', ()=>{
  const code = document.getElementById('joinCode').value.trim();
  if(code) joinRoom(code);
});
document.getElementById('joinCode').addEventListener('keydown', e => {
  if(e.key === 'Enter' && e.target.value.trim()) joinRoom(e.target.value.trim());
});

/* учредить партию */
function segVal(which){
  const on = document.querySelector('.seg[data-seg="' + which + '"] button.on');
  return on ? (on.dataset.val || '') : '';
}
document.getElementById('createRoomBtn').addEventListener('click', async e => {
  const btn = e.currentTarget;
  const name = (document.getElementById('roomName').value.trim() || t('lobby.roomval')).slice(0, 40);
  const maxPlayers = parseInt(segVal('players'), 10) || 4;
  const capital = parseInt(segVal('capital'), 10) || 1500;
  const ttRaw = segVal('turntime');
  const turnTime = ttRaw ? parseInt(ttRaw, 10) : null;
  const priv = document.getElementById('privateSwitch').classList.contains('on');
  const mode = segVal('mode') === 'classic' ? 'classic' : 'blitz';
  btn.disabled = true;
  const j = await Net.api('/api/rooms/create', {name, maxPlayers, capital, turnTime, mode, private: priv});
  btn.disabled = false;
  if(j.ok) showPage('room');
  else toast(apiErr(j.error));
});

/* переключатель «приватная комната» */
const privSwitch = document.getElementById('privateSwitch');
privSwitch.addEventListener('click', ()=>{
  privSwitch.classList.toggle('on');
  privSwitch.setAttribute('aria-checked', privSwitch.classList.contains('on') ? 'true' : 'false');
});

/* сегментные переключатели */
document.querySelectorAll('.seg').forEach(seg => {
  seg.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', ()=>{
      seg.querySelectorAll('button').forEach(x=>x.classList.remove('on'));
      btn.classList.add('on');
    });
  });
});

/* ===================== AUTH: формы входа и регистрации ===================== */
document.querySelectorAll('form[data-auth]').forEach(form => {
  form.addEventListener('submit', async e => {
    e.preventDefault();
    form.querySelectorAll('.err').forEach(x=>x.textContent='');
    const setErr = (f, key)=>{ const box = form.querySelector('[data-err="'+f+'"]'); if(box) box.textContent = t(key); };
    const email = (form.querySelector('input[name=email]').value || '').trim();
    const password = form.querySelector('input[name=password]').value || '';
    let ok = true;
    if(!/^\S+@\S+\.\S+$/.test(email)){ setErr('email', 'err.email'); ok = false; }
    if(password.length < 6){ setErr('password', 'err.password'); ok = false; }

    if(form.dataset.auth === 'register'){
      const username = form.querySelector('input[name=username]').value.trim();
      const confirm = form.querySelector('input[name=confirm]').value;
      const terms = form.querySelector('input[name=terms]');
      if(username.length < 2 || username.length > 24){ setErr('username', 'err.username'); ok = false; }
      if(confirm !== password){ setErr('confirm', 'err.confirm'); ok = false; }
      if(!terms.checked){ setErr('terms', 'err.terms'); ok = false; }
      if(!ok) return;
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      const j = await Net.api('/api/register', {username, email, password});
      btn.disabled = false;
      if(j.ok){
        setMailToken(j.mailToken);
        showVerify(email);
        startResendCooldown();   // письмо только что ушло
        openMail();              // автопоказ телеграммы с кодом
      }
      else if(j.error === 'email_taken') setErr('email', 'api.email_taken');
      else toast(apiErr(j.error));
    } else {
      if(!ok) return;
      const btn = form.querySelector('button[type=submit]'); btn.disabled = true;
      const j = await Net.api('/api/login', {email, password});
      btn.disabled = false;
      if(j.ok) finishLogin(j.user);
      else if(j.error === 'unverified'){ toast(t('api.unverified')); showVerify(email); }
      else if(j.error === 'bad_credentials') setErr('password', 'api.bad_credentials');
      else toast(apiErr(j.error));
    }
  });
});

/* показать/скрыть пароль */
document.querySelectorAll('.pw-toggle').forEach(btn => {
  btn.addEventListener('click', ()=>{
    const input = btn.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.textContent = show ? t('pw.hide') : t('pw.show');
  });
});

/* индикатор надёжности пароля (регистрация) */
const regPw = document.querySelector('#page-register input[name=password]');
if(regPw){
  const meter = document.querySelector('#page-register .pw-strength');
  const bar = meter && meter.querySelector('i');
  const lbl = meter && meter.querySelector('span');
  const KEYS = ['pw.default','pw.weak','pw.weak','pw.medium','pw.good','pw.strong','pw.strong'];
  const COLORS = ['var(--oxblood)','var(--oxblood)','var(--oxblood)','var(--gold)','var(--emerald-lt)','var(--emerald)','var(--emerald)'];
  regPw.addEventListener('input', ()=>{
    const v = regPw.value; let s = 0;
    if(v.length >= 6) s++;
    if(v.length >= 10) s++;
    if(/[A-ZА-Я]/.test(v) && /[a-zа-я]/.test(v)) s++;
    if(/\d/.test(v)) s++;
    if(/[^\w\s]/.test(v)) s++;
    if(bar){ bar.style.width = (v ? Math.max(12, s*20) : 0) + '%'; bar.style.background = COLORS[v ? s : 0]; }
    if(lbl){ lbl.textContent = v ? t(KEYS[s]) : t('pw.default'); }
  });
}

/* ===================== ВЕРИФИКАЦИЯ ПОЧТЫ ===================== */
function codeCells(){ return Array.from(document.querySelectorAll('#codeCells .code-cell')); }
function clearCodeCells(){ codeCells().forEach(c=>c.value=''); }

function showVerify(email){
  VERIFY_EMAIL = email;
  try{ sessionStorage.setItem('mono_verify', email); }catch(e){}
  document.getElementById('verifyEmailLbl').textContent = email;
  document.getElementById('verifyErr').textContent = '';
  clearCodeCells();
  updateHeader();
  refreshMailBadge();
  showPage('verify');
  const first = codeCells()[0];
  if(first) first.focus();
}

let verifyBusy = false;
async function submitVerify(){
  if(verifyBusy || !VERIFY_EMAIL) return;
  const errBox = document.getElementById('verifyErr');
  errBox.textContent = '';
  const code = codeCells().map(c=>c.value).join('');
  if(code.length < 6){ errBox.textContent = t('verify.err.short'); return; }
  verifyBusy = true;
  const j = await Net.api('/api/verify', {email: VERIFY_EMAIL, code});
  verifyBusy = false;
  if(j.ok){
    try{ sessionStorage.removeItem('mono_verify'); }catch(e){}
    VERIFY_EMAIL = null;
    finishLogin(j.user);
  } else {
    errBox.textContent = apiErr(j.error);
    if(j.error === 'bad_code'){ clearCodeCells(); const f = codeCells()[0]; if(f) f.focus(); }
  }
}
document.getElementById('verifyBtn').addEventListener('click', submitVerify);

/* 6 клеток: автопереход, backspace назад, вставка из буфера */
codeCells().forEach((cell, i, cells) => {
  cell.addEventListener('input', ()=>{
    cell.value = cell.value.replace(/\D/g, '').slice(0, 1);
    if(cell.value && i < cells.length - 1) cells[i+1].focus();
    if(cells.every(c=>c.value)) submitVerify();
  });
  cell.addEventListener('keydown', e => {
    if(e.key === 'Backspace' && !cell.value && i > 0){
      cells[i-1].focus(); cells[i-1].value = '';
      e.preventDefault();
    }
    if(e.key === 'Enter') submitVerify();
  });
  cell.addEventListener('paste', e => {
    const txt = (e.clipboardData || window.clipboardData).getData('text') || '';
    const digits = txt.replace(/\D/g, '').slice(0, 6);
    if(!digits) return;
    e.preventDefault();
    digits.split('').forEach((d, k)=>{ if(cells[k]) cells[k].value = d; });
    cells[Math.min(digits.length, cells.length - 1)].focus();
    if(cells.every(c=>c.value)) submitVerify();
  });
});

/* «Отправить ещё раз» с кулдауном 30 с */
let resendUntil = 0, resendIv = null;
function startResendCooldown(){
  resendUntil = Date.now() + 30000;
  if(resendIv) clearInterval(resendIv);
  resendIv = setInterval(tickResend, 500);
  tickResend();
}
function tickResend(){
  const a = document.getElementById('resendBtn');
  if(!a) return;
  const left = Math.ceil((resendUntil - Date.now()) / 1000);
  if(left > 0){
    a.classList.add('disabled');
    a.textContent = t('verify.resendIn').replace('{s}', left);
  } else {
    a.classList.remove('disabled');
    a.textContent = t('verify.resend');
    if(resendIv){ clearInterval(resendIv); resendIv = null; }
  }
}
document.getElementById('resendBtn').addEventListener('click', async ()=>{
  if(!VERIFY_EMAIL || Date.now() < resendUntil) return;
  const j = await Net.api('/api/resend', {email: VERIFY_EMAIL});
  if(j.ok){
    setMailToken(j.mailToken);
    toast(t('toast.codeSent'));
    startResendCooldown();
    refreshMailBadge();
  } else toast(apiErr(j.error));
});
document.getElementById('verifyMailLink').addEventListener('click', ()=>openMail());

/* ===================== ДЕМО-ПОЧТА «Почтовое отделение» ===================== */
function mailEmail(){ return ME ? ME.email : VERIFY_EMAIL; }
function seenKey(){ return 'mono_mail_seen:' + (mailEmail() || ''); }

function updateMailBadge(){
  let seen = 0;
  try{ seen = parseInt(localStorage.getItem(seenKey()) || '0', 10) || 0; }catch(e){}
  const unread = Math.max(0, MAIL_LETTERS.length - seen);
  const b = document.getElementById('mailBadge');
  b.textContent = unread;
  b.classList.toggle('hidden', unread === 0);
}
async function refreshMailBadge(){
  updateHeader();
  const email = mailEmail();
  if(!email) return;
  const j = await Net.get(mailboxUrl(email));
  if(j && j.ok){ MAIL_LETTERS = j.letters || []; updateMailBadge(); }
}
function renderMail(){
  const box = document.getElementById('mailLetters');
  if(!box) return;
  if(!MAIL_LETTERS.length){
    box.innerHTML = '<div class="mail-empty">' + esc(t('mail.empty')) + '</div>';
    return;
  }
  const loc = window.LANG === 'ru' ? 'ru-RU' : 'en-GB';
  box.innerHTML = MAIL_LETTERS.slice().reverse().map(L => {
    let when = '';
    try{ if(L.ts) when = new Date(L.ts).toLocaleTimeString(loc, {hour:'2-digit', minute:'2-digit'}); }catch(e){}
    return '<div class="tg">' +
      '<div class="tg-row"><span>' + esc(t('mail.to')) + ':</span><b>' + esc(L.to) + '</b></div>' +
      '<div class="tg-row"><span>' + esc(t('mail.subject')) + ':</span><b>' + esc(L.subject) + '</b></div>' +
      '<div class="tg-code">' + esc(L.code) + '</div>' +
      '<div class="tg-cap">' + esc(t('mail.code')) + (when ? ' · ' + when : '') + '</div>' +
      '</div>';
  }).join('');
}
async function openMail(){
  const email = mailEmail();
  if(!email) return;
  const j = await Net.get(mailboxUrl(email));
  if(j && j.ok) MAIL_LETTERS = j.letters || [];
  renderMail();
  openModal('modal-mail');
  try{ localStorage.setItem(seenKey(), String(MAIL_LETTERS.length)); }catch(e){}
  updateMailBadge();
}
document.getElementById('mailBtn').addEventListener('click', ()=>openMail());
document.getElementById('mailClose').addEventListener('click', ()=>closeModal('modal-mail'));

/* ===================== GOGGLE: пародийный OAuth ===================== */
async function goggleSubmit(name){
  name = (name || '').trim();
  const errBox = document.getElementById('goggleErr');
  errBox.textContent = '';
  if(name.length < 2 || name.length > 24){ errBox.textContent = t('goggle.err.name'); return; }
  const j = await Net.api('/api/goggle', {name});
  if(j.ok){
    closeModal('modal-goggle');
    finishLogin(j.user);
  } else errBox.textContent = apiErr(j.error);
}
document.querySelectorAll('[data-goggle]').forEach(b => b.addEventListener('click', ()=>{
  document.getElementById('goggleErr').textContent = '';
  document.getElementById('goggleName').value = '';
  openModal('modal-goggle');
  document.getElementById('goggleName').focus();
}));
document.querySelectorAll('.goggle-acc').forEach(b => b.addEventListener('click', ()=>{
  const nm = b.querySelector('b');
  goggleSubmit(nm ? nm.textContent : '');
}));
document.getElementById('goggleGo').addEventListener('click', ()=>goggleSubmit(document.getElementById('goggleName').value));
document.getElementById('goggleName').addEventListener('keydown', e => {
  if(e.key === 'Enter') goggleSubmit(e.target.value);
});

/* закрытие модалок: клик по подложке и Esc */
document.querySelectorAll('.modal-ovl').forEach(ovl => {
  ovl.addEventListener('click', e => { if(e.target === ovl) ovl.classList.add('hidden'); });
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') document.querySelectorAll('.modal-ovl').forEach(o=>o.classList.add('hidden'));
});

/* ===================== бренд-кит и котировки (мокап-вкладки) ===================== */
const GROUPS = {
  brown:'var(--g-brown)', lblue:'var(--g-lblue)', pink:'var(--g-pink)', orange:'var(--g-orange)',
  red:'var(--g-red)', yellow:'var(--g-yellow)', green:'var(--g-green)', dblue:'var(--g-dblue)',
  air:'var(--ink-soft)', util:'var(--gold)',
};
const BRANDS = [
  {id:'nokla', n:'Nokla', g:'brown', p:60},   {id:'yahwoo', n:'Yahwoo!', g:'brown', p:60},
  {id:'tvitter', n:'Tvitter', g:'lblue', p:100}, {id:'skyqe', n:'Skyqe', g:'lblue', p:100},
  {id:'zoon', n:'Zoon', g:'lblue', p:120}, {id:'instaglam', n:'Instaglam', g:'pink', p:140},
  {id:'tnobile', n:'T-Nobile', g:'pink', p:140}, {id:'twutch', n:'Twutch', g:'pink', p:160},
  {id:'reddat', n:'Reddat', g:'orange', p:180}, {id:'soundclod', n:'SoundClod', g:'orange', p:180},
  {id:'firefax', n:'Firefax', g:'orange', p:200}, {id:'cosacola', n:'Cosa-Cola', g:'red', p:220},
  {id:'youtune', n:'YouTune', g:'red', p:220}, {id:'netflex', n:'Netflex', g:'red', p:240},
  {id:'mcronalds', n:"McRonald's", g:'yellow', p:260}, {id:'ikeya', n:'IKEYA', g:'yellow', p:260},
  {id:'snapchit', n:'Snapchit', g:'yellow', p:280}, {id:'spatify', n:'Spatify', g:'green', p:300},
  {id:'whatsupp', n:'WhatsUpp', g:'green', p:300}, {id:'startbucks', n:'Startbucks', g:'green', p:320},
  {id:'nozama', n:'Nozama', g:'dblue', p:350}, {id:'epple', n:'Epple', g:'dblue', p:400},
  {id:'fodex', n:'FodEx', g:'air', p:200}, {id:'uds', n:'UDS', g:'air', p:200},
  {id:'dhk', n:'DHK', g:'air', p:200}, {id:'ubar', n:'Ubar', g:'air', p:200},
  {id:'tesler', n:'Tesler Power', g:'util', p:150}, {id:'gogglecloud', n:'Goggle Cloud', g:'util', p:150},
];
function renderBrands(){
  const grid = document.getElementById('brandGrid');
  if(!grid) return;
  grid.innerHTML = BRANDS.map(b=>`
    <div class="brand-card">
      <div class="band-mini" style="--cg:${GROUPS[b.g]}"></div>
      <div class="bl">${LOGOS[b.id]}</div>
      <div class="bn">${b.n}</div>
      <div class="bhint">${t('hint.'+b.id)}</div>
      <div class="bmeta">$${b.p}</div>
    </div>`).join('');
}
function renderQuotes(){
  const hq = document.getElementById('homeQuotes');
  if(!hq) return;
  const pick = ['nozama','epple','netflex','spatify','reddat','instaglam','mcronalds','tvitter'];
  const moves = [
    {d:'up', p:'2.1'}, {d:'up', p:'0.8'}, {d:'up', p:'3.2'}, {d:'dn', p:'1.4'},
    {d:'dn', p:'2.3'}, {d:'up', p:'4.0'}, {d:'up', p:'0.5'}, {d:'dn', p:'0.9'},
  ];
  hq.innerHTML = pick.map((id,i)=>{
    const b = BRANDS.find(x=>x.id===id); const m = moves[i];
    return `<div class="q"><span class="ql">${LOGOS[id]}</span><span class="qn">${b.n}</span>` +
           `<span class="qp">$${b.p}</span><span class="qd ${m.d}">${m.d==='up'?'▲':'▼'} ${m.p}%</span></div>`;
  }).join('');
}

/* ===================== переключение языка ===================== */
function setLang(lang){
  window.LANG = (lang === 'en') ? 'en' : 'ru';
  document.documentElement.lang = window.LANG;
  applyStaticI18n();
  renderBrands();
  renderRooms();
  renderMail();
  tickResend();
  document.querySelectorAll('.pw-toggle').forEach(btn=>{
    const input = btn.parentElement.querySelector('input');
    btn.textContent = (input && input.type === 'password') ? t('pw.show') : t('pw.hide');
  });
  document.querySelectorAll('.lang-switch button').forEach(b=>b.classList.toggle('on', b.dataset.lang === window.LANG));
  if(window.Game && Game.rerender){ try{ Game.rerender(); }catch(e){} }
  try{ localStorage.setItem('mono_lang', window.LANG); }catch(e){}
}
document.querySelectorAll('.lang-switch button').forEach(b => b.addEventListener('click', ()=>setLang(b.dataset.lang)));

/* ===================== ИНИЦИАЛИЗАЦИЯ ===================== */
document.querySelectorAll('[data-crest]').forEach(el => el.innerHTML = CREST);
document.querySelectorAll('[data-logo]').forEach(el => el.innerHTML = LOGOS[el.dataset.logo] || '');
renderQuotes();

let savedLang = 'ru';
try{ savedLang = localStorage.getItem('mono_lang') || 'ru'; }catch(e){}
setLang(savedLang);   /* применяет i18n ко всей статике */

/* восстановление сессии: /api/me, затем SSE */
(async function boot(){
  try{ VERIFY_EMAIL = sessionStorage.getItem('mono_verify') || null; }catch(e){}
  try{ MAIL_TOKEN = sessionStorage.getItem('mono_mailtoken') || null; }catch(e){}
  const j = await Net.get('/api/me');
  if(j && j.ok && j.user){
    ME = j.user;
    Net.connect();   /* hello сам смаршрутизирует lobby/room/game */
  }
  updateHeader();
  refreshMailBadge();
})();
