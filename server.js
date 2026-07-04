/* =====================================================================
   МОНОПОЛИЯ · «БИРЖА 1929» — сервер (Агент S)
   Статика public/ + auth (scrypt, cookie-сессии) + демо-почта + комнаты +
   SSE-поток + игровой цикл (таймеры, боты) + персист data/users.json.
   Node 22, ноль npm-зависимостей. Запуск: node server.js [--port 3200]
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* движок пишется параллельно (агент E): грузим с заглушкой, чтобы auth и
   комнаты работали даже без engine.js (партию тогда просто не начать) */
let Engine = null;
function getEngine(){
  if(Engine) return Engine;
  try{ Engine = require('./engine.js'); }
  catch(e){ console.warn('[engine] engine.js не загружен: ' + e.message); }
  return Engine;
}
getEngine();

/* ---------------- конфиг ---------------- */
function argPort(){
  const i = process.argv.indexOf('--port');
  if(i > -1 && process.argv[i+1]) return parseInt(process.argv[i+1], 10) || 3200;
  const eq = process.argv.find(a => a.startsWith('--port='));
  if(eq) return parseInt(eq.split('=')[1], 10) || 3200;
  return 3200;
}
const PORT = process.env.PORT ? (parseInt(process.env.PORT, 10) || argPort()) : argPort();
const HOST = process.env.HOST || '0.0.0.0';   // в проде systemd задаёт 127.0.0.1 (за Caddy)
const ROOT = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'users.json');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
};
const COLORS = ['#1f9d55','#e03131','#1c7ed6','#f08c00','#9c36b5','#0ca678'];   // яркие, различимые
const TOKENS = ['🎩','💼','📈','🚢','🏎️','👑','💰','⌛'];
const BOT_NAMES = ['Botschild','Monopolina','Lord Deposit','Margie Call','Baron Rent'];
const SESSION_MS = 30 * 864e5;          // 30 дней
const CODE_TTL = 15 * 60e3;             // код верификации: 15 минут
const CODE_ATTEMPTS = 5;

/* ---------------- персист: data/users.json ----------------
   Структура: {seq, users:[{id,username,email,pass:{salt,hash},verified,
   code:{code,exp,attempts}|null, stats:{games,wins}, created}], sessions:{sid:{uid,exp}}}
   Пишем атомарно (tmp+rename) с debounce 500 мс. */
let db = { seq:0, users:[], sessions:{} };
function loadDb(){
  try{
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    db = { seq: d.seq || 0, users: d.users || [], sessions: d.sessions || {} };
  }catch(e){ /* нет файла — стартуем с пустой базой */ }
  const now = Date.now();
  for(const sid of Object.keys(db.sessions))
    if(!db.sessions[sid] || db.sessions[sid].exp < now) delete db.sessions[sid];
}
let saveTimer = null;
function saveDb(){
  if(saveTimer) return;
  saveTimer = setTimeout(()=>{ saveTimer = null; writeDbNow(); }, 500);
}
function writeDbNow(){
  if(saveTimer){ clearTimeout(saveTimer); saveTimer = null; }
  try{
    fs.mkdirSync(DATA_DIR, {recursive:true});
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
    fs.renameSync(tmp, DB_FILE);
  }catch(e){ console.error('[db] запись не удалась:', e.message); }
}
process.on('SIGINT', ()=>{ writeDbNow(); process.exit(0); });
process.on('SIGTERM', ()=>{ writeDbNow(); process.exit(0); });

/* ---------------- демо-почта (в памяти, письма не покидают сервер) ---------------- */
const MAIL = new Map();   // email → [{to, subject, code, ts}] (свежие сверху)
function sendCode(user){
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  user.code = { code, exp: Date.now() + CODE_TTL, attempts: 0 };
  /* токен доступа к демо-ящику: выдаётся тому, кто регистрировался,
     чтобы за прокси чужие письма было не прочитать */
  if(!user.mailToken) user.mailToken = crypto.randomBytes(16).toString('hex');
  const letter = { to: user.email, subject: 'Код подтверждения · Биржа 1929', code, ts: Date.now() };
  if(!MAIL.has(user.email)) MAIL.set(user.email, []);
  MAIL.get(user.email).unshift(letter);
  console.log(`[mail] код для ${user.email}: ${code}`);
}

/* ---------------- пароли и сессии ---------------- */
function hashPass(pw){
  const salt = crypto.randomBytes(16).toString('hex');
  return { salt, hash: crypto.scryptSync(pw, salt, 64).toString('hex') };
}
function verifyPass(user, pw){
  if(!user.pass) return false;
  try{
    const h = crypto.scryptSync(pw, user.pass.salt, 64);
    return crypto.timingSafeEqual(h, Buffer.from(user.pass.hash, 'hex'));
  }catch(e){ return false; }
}
function pubUser(u){ return { id: u.id, username: u.username, email: u.email }; }
function findUserByEmail(email){ return db.users.find(u => u.email === email); }
function findUserById(id){ return db.users.find(u => u.id === id); }
function parseCookies(req){
  const out = {};
  (req.headers.cookie || '').split(';').forEach(part=>{
    const i = part.indexOf('=');
    if(i > -1) out[part.slice(0, i).trim()] = part.slice(i+1).trim();
  });
  return out;
}
function authUser(req){
  const sid = parseCookies(req).mono_sid;
  if(!sid) return null;
  const s = db.sessions[sid];
  if(!s || s.exp < Date.now()){ if(s){ delete db.sessions[sid]; saveDb(); } return null; }
  const u = findUserById(s.uid);
  return u ? { u, sid } : null;
}
function cookieSecure(req){
  /* за Caddy с HTTPS ставим Secure-флаг */
  return String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https' ? '; Secure' : '';
}
function newSession(ctx, u){
  const sid = crypto.randomBytes(24).toString('hex');
  db.sessions[sid] = { uid: u.id, exp: Date.now() + SESSION_MS };
  saveDb();
  ctx.res.setHeader('Set-Cookie',
    `mono_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MS/1000}` + cookieSecure(ctx.req));
}
function clearSession(ctx){
  ctx.res.setHeader('Set-Cookie', 'mono_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' + cookieSecure(ctx.req));
}

/* транслит для goggle-slug (пародийный OAuth) */
const TR = {'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i',
  'й':'i','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u',
  'ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'};
function slugify(name){
  const s = name.toLowerCase().split('').map(ch => TR[ch] !== undefined ? TR[ch] : ch).join('')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  return s || 'player';
}

/* ---------------- HTTP-мелочи ---------------- */
function json(res, obj, status){
  res.writeHead(status || 200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(obj));
}
function readBody(req){
  return new Promise((resolve, reject)=>{
    let size = 0; const chunks = [];
    req.on('data', ch=>{
      size += ch.length;
      if(size > 65536){ reject(new Error('too_big')); req.destroy(); return; }
      chunks.push(ch);
    });
    req.on('end', ()=>resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function isLocal(req){
  /* За реверс-прокси (Caddy) remoteAddress ВСЕГДА 127.0.0.1 — такие запросы
     локальными НЕ считаем (иначе демо-почта с кодами станет публичной). */
  if(req.headers['x-forwarded-for']) return false;
  const a = req.socket.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}
/* реальный IP клиента: за прокси берём первый из X-Forwarded-For */
function clientIp(req){
  const a = req.socket.remoteAddress || '';
  const behindProxy = a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
  const xff = req.headers['x-forwarded-for'];
  if(behindProxy && xff) return String(xff).split(',')[0].trim();
  return a;
}
/* простой rate-limit для auth-эндпоинтов: 30 запросов / 10 мин на IP */
const RATE = new Map();   // ip → [timestamps]
function rateLimited(req){
  const ip = clientIp(req), now = Date.now();
  let arr = RATE.get(ip);
  if(!arr){ arr = []; RATE.set(ip, arr); }
  while(arr.length && now - arr[0] > 600000) arr.shift();
  if(arr.length >= 30) return true;
  arr.push(now);
  return false;
}
setInterval(()=>{ const now = Date.now(); for(const [ip, arr] of RATE){ while(arr.length && now - arr[0] > 600000) arr.shift(); if(!arr.length) RATE.delete(ip); } }, 300000);

/* ---------------- SSE-реестр ---------------- */
let connSeq = 0;
const CONNS = new Map();          // connId → {uid, res}
function sseWrite(res, obj){
  try{ res.write('data: ' + JSON.stringify(obj) + '\n\n'); }catch(e){}
}
function sendToUser(uid, obj){
  for(const c of CONNS.values()) if(c.uid === uid) sseWrite(c.res, obj);
}
setInterval(()=>{   // heartbeat-комментарий каждые 25 с
  for(const c of CONNS.values()){ try{ c.res.write(': hb\n\n'); }catch(e){} }
}, 25000);

/* ---------------- комнаты (в памяти; рестарт = сброс партий) ---------------- */
const ROOMS = new Map();          // roomId → room
const userRoom = new Map();       // userId → roomId
function roomCode(){
  const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let s;
  do{ s = ''; for(let i=0;i<6;i++) s += A[crypto.randomInt(A.length)]; }while(ROOMS.has(s));
  return s;
}
function whereOf(uid){
  const rid = userRoom.get(uid);
  if(!rid) return 'lobby';
  const room = ROOMS.get(rid);
  if(!room){ userRoom.delete(uid); return 'lobby'; }
  return room.status === 'waiting' ? 'room' : 'game';
}
function lobbyRooms(){
  return [...ROOMS.values()].filter(r => !r.private && r.status === 'waiting').map(r=>{
    const host = findUserById(r.hostId);
    return { id: r.id, name: r.name, host: {id: r.hostId, username: host ? host.username : '?'},
      members: r.members.length, maxPlayers: r.maxPlayers, status: r.status };
  });
}
function roomMsg(room){
  const host = findUserById(room.hostId);
  return {
    id: room.id, name: room.name,
    host: { id: room.hostId, username: host ? host.username : '?' },
    private: room.private, maxPlayers: room.maxPlayers, capital: room.capital,
    turnTime: room.turnTime, mode: room.mode || 'blitz', status: room.status,
    members: room.members.map(m => ({ id: m.id, name: m.name, emoji: m.emoji, isBot: !!m.isBot })),
  };
}
function broadcastLobby(){
  const msg = { type:'lobby', rooms: lobbyRooms() };
  for(const c of CONNS.values()) if(!userRoom.has(c.uid)) sseWrite(c.res, msg);
}
function roomAudience(room){   // живые участники-люди, всё ещё привязанные к комнате
  return room.members.filter(m => !m.isBot && userRoom.get(m.id) === room.id).map(m => m.id);
}
function broadcastRoom(room){
  const msg = { type:'room', room: roomMsg(room) };
  for(const uid of roomAudience(room)) sendToUser(uid, msg);
}
function broadcastGame(room, events){
  const msg = { type:'game', game: room.game, events: events || [], deadline: room.deadline || null };
  for(const uid of roomAudience(room)) sendToUser(uid, msg);
}
function broadcastChat(room, from, text){
  const msg = { type:'chat', from, text, ts: Date.now() };
  for(const uid of roomAudience(room)) sendToUser(uid, msg);
}

/* ---------------- таймеры комнаты ---------------- */
function setRoomTimer(room, ms, fn){
  const t = setTimeout(()=>{
    const i = room.timers.indexOf(t);
    if(i > -1) room.timers.splice(i, 1);
    if(!ROOMS.has(room.id)) return;   // комната уже расформирована
    fn();
  }, ms);
  room.timers.push(t);
}
function clearRoomTimers(room){
  room.timers.forEach(clearTimeout);
  room.timers = [];
}
function rnd(min, max){ return min + crypto.randomInt(max - min + 1); }
function safeCall(fn, dflt){
  try{ return fn(); }catch(e){ console.error('[engine] исключение:', e.message); return dflt; }
}

/* ---------------- игровой цикл ----------------
   Действия обрабатываются синхронно (Node однопоточен). После каждого
   успешного act: seq++, сброс таймеров, broadcast, планирование ботов и
   таймера хода. Таймеры проверяют актуальность через ROOMS/фазу/актора. */
function tryAct(room, pid, action){
  const g = room.game;
  if(!g || !Engine) return { ok:false, error:'cant' };
  let r;
  try{ r = Engine.act(g, pid, action); }
  catch(e){
    console.error('[engine] act упал:', action && action.type, '—', e.message);
    return { ok:false, error:'cant' };
  }
  if(r && r.ok) afterAct(room, r.events || []);
  return r || { ok:false, error:'cant' };
}
function afterAct(room, events){
  room.seq++;
  clearRoomTimers(room);
  room.deadline = null;   // авторитетный дедлайн решений — уезжает клиентам в broadcast
  const g = room.game;
  if(g && g.phase !== 'ended'){ scheduleActors(room); scheduleTurnTimer(room); }
  broadcastGame(room, events);
  if(g && g.winner != null && !room.ended){ room.ended = true; onGameEnd(room); }
}

/* конец партии: статистика, показ победителя 60 с, расформирование */
function onGameEnd(room){
  const g = room.game;
  for(const pl of g.players){
    if(pl.isBot) continue;
    const u = findUserById(pl.id);
    if(!u) continue;
    u.stats = u.stats || { games:0, wins:0 };
    u.stats.games++;
    if(g.winner === pl.id) u.stats.wins++;
  }
  saveDb();
  const w = g.players.find(p => p.id === g.winner);
  console.log(`[game] партия в комнате ${room.id} окончена, победитель: ${w ? w.name : g.winner}`);
  room.endTimer = setTimeout(()=>disbandRoom(room), 60000);
}
function disbandRoom(room){
  clearRoomTimers(room);
  if(room.endTimer){ clearTimeout(room.endTimer); room.endTimer = null; }
  ROOMS.delete(room.id);
  for(const m of room.members){
    if(m.isBot) continue;
    if(userRoom.get(m.id) === room.id) userRoom.delete(m.id);
    sendToUser(m.id, { type:'room', room:null });
  }
  broadcastLobby();
  console.log(`[room] комната ${room.id} расформирована`);
}

/* таймер хода: по истечении — autoAction / autoResolveDebt */
function scheduleTurnTimer(room){
  const g = room.game;
  if(!g || g.phase === 'ended' || g.phase === 'auction') return;
  const tt = g.settings && g.settings.turnTime;
  if(!tt) return;
  room.deadline = Date.now() + tt * 1000;
  setRoomTimer(room, tt * 1000, ()=>onTurnTimeout(room));
}
function onTurnTimeout(room){
  const g = room.game;
  if(!g || g.phase === 'ended') return;
  if(g.phase === 'debt' && g.debt){
    if(!tryAct(room, g.debt.playerId, {type:'autoResolveDebt'}).ok)
      forceLiquidate(room, g.debt.playerId);
    return;
  }
  const actor = safeCall(()=>Engine.currentActor(g), null);
  if(actor == null) return;
  const a = safeCall(()=>Engine.autoAction(g), null);
  if(a) tryAct(room, actor, a);
}
/* страховка: если движок не принял autoResolveDebt как action — зовём напрямую */
function forceLiquidate(room, pid){
  const ev = safeCall(()=>Engine.autoLiquidate(room.game, pid), null);
  if(ev) afterAct(room, ev);
}

/* планирование действий ботов и отключившихся (раздел 7) */
function scheduleActors(room){
  const g = room.game;
  if(!g || g.phase === 'ended' || !Engine) return;
  const actor = safeCall(()=>Engine.currentActor(g), null);
  if(actor != null){
    const p = g.players.find(x => x.id === actor);
    if(p && !p.bankrupt){
      if(p.isBot) setRoomTimer(room, rnd(600, 1200), ()=>botAct(room, p.id));
      else if(room.disconnected.has(p.id)) setRoomTimer(room, 1000, ()=>autoFor(room, p.id));
    }
  }
  if(g.phase === 'auction' && g.auction){
    for(const p of g.players){
      if(p.bankrupt) continue;
      if(g.auction.passed.includes(p.id)) continue;
      if(g.auction.highBidder === p.id) continue;
      if(p.isBot) setRoomTimer(room, rnd(600, 1200), ()=>botBid(room, p.id));
      else if(room.disconnected.has(p.id))
        setRoomTimer(room, 800, ()=>tryAct(room, p.id, {type:'pass'}));
    }
    const lull = (room.mode === 'blitz') ? 8000 : 12000;   // блиц — аукционы бодрее
    room.deadline = Date.now() + lull;
    setRoomTimer(room, lull, ()=>tryAct(room, null, {type:'auctionClose'}));
  }
  for(const tr of (g.trades || [])){
    const to = g.players.find(x => x.id === tr.to);
    if(!to || to.bankrupt) continue;
    if(to.isBot) setRoomTimer(room, 1000, ()=>botTrade(room, to.id, tr.id));
    else if(room.disconnected.has(to.id))
      setRoomTimer(room, 1000, ()=>tryAct(room, to.id, {type:'tradeDecline', id: tr.id}));
  }
}
/* отключившийся человек — играет autoAction движка */
function autoFor(room, pid){
  const g = room.game;
  if(!g || g.phase === 'ended') return;
  if(safeCall(()=>Engine.currentActor(g), null) !== pid) return;
  if(g.phase === 'debt' && g.debt && g.debt.playerId === pid){
    if(!tryAct(room, pid, {type:'autoResolveDebt'}).ok) forceLiquidate(room, pid);
    return;
  }
  const a = safeCall(()=>Engine.autoAction(g), null);
  if(a) tryAct(room, pid, a);
}

/* ---------------- эвристики ботов (раздел 7) ---------------- */
function groupIdx(g, grp){
  const out = [];
  for(let i = 0; i < g.board.length; i++)
    if(g.board[i].t === 'prop' && g.board[i].g === grp) out.push(i);
  return out;
}
function botBuildPick(g, p){   // самое дешёвое доступное отделение (even-rule, буфер 300)
  let best = null, bestCost = Infinity;
  for(let i = 0; i < g.board.length; i++){
    const b = g.board[i];
    if(b.t !== 'prop' || !b.g) continue;
    const tl = g.tiles[i];
    if(tl.owner !== p.id || tl.houses >= 5 || tl.mortgaged) continue;
    const grp = groupIdx(g, b.g);
    if(!grp.every(j => g.tiles[j].owner === p.id && !g.tiles[j].mortgaged)) continue;
    const minH = Math.min(...grp.map(j => g.tiles[j].houses));
    if(tl.houses !== minH) continue;                       // even-rule
    if(p.cash - b.hc < 300) continue;                      // денежный буфер
    if(b.hc < bestCost){ bestCost = b.hc; best = i; }
  }
  return best;
}
function botUnmortgagePick(g, p){   // самый дешёвый выкуп заклада с буфером
  let best = null, bestCost = Infinity;
  for(let i = 0; i < g.board.length; i++){
    const tl = g.tiles[i];
    if(tl.owner !== p.id || !tl.mortgaged) continue;
    const cost = Math.round((g.board[i].p / 2) * 1.1);
    if(p.cash - cost < 300) continue;
    if(cost < bestCost){ bestCost = cost; best = i; }
  }
  return best;
}
function botAct(room, pid){
  const g = room.game;
  if(!g || g.phase === 'ended') return;
  if(safeCall(()=>Engine.currentActor(g), null) !== pid) return;
  const p = g.players.find(x => x.id === pid);
  if(!p) return;
  let done = false;
  if(g.phase === 'roll'){
    if(p.inJail){
      if(p.jailCards > 0) done = tryAct(room, pid, {type:'jailCard'}).ok;
      if(!done && p.cash >= 150) done = tryAct(room, pid, {type:'jailPay'}).ok;
      /* после jailPay фаза остаётся roll — бросок случится на следующем тике */
    }
    if(!done) done = tryAct(room, pid, {type:'roll'}).ok;
  } else if(g.phase === 'buy'){
    const t = g.pendingTile;
    const price = (t != null && g.board[t] && g.board[t].p) || 0;
    if(p.cash - price >= 150) done = tryAct(room, pid, {type:'buy'}).ok;
    if(!done) done = tryAct(room, pid, {type:'decline'}).ok;
  } else if(g.phase === 'idle'){
    if(p.cash > 400){
      const b = botBuildPick(g, p);
      if(b != null) done = tryAct(room, pid, {type:'build', tile: b}).ok;
    }
    if(!done && p.cash > 500){
      const m = botUnmortgagePick(g, p);
      if(m != null) done = tryAct(room, pid, {type:'unmortgage', tile: m}).ok;
    }
    if(!done) done = tryAct(room, pid, {type:'endTurn'}).ok;
  } else if(g.phase === 'debt'){
    done = tryAct(room, pid, {type:'autoResolveDebt'}).ok;
    if(!done){ forceLiquidate(room, pid); done = true; }
  }
  if(!done){   // последний рубеж — autoAction движка, чтобы не зависнуть
    const a = safeCall(()=>Engine.autoAction(g), null);
    if(a) tryAct(room, pid, a);
  }
}
function botBid(room, pid){
  const g = room.game;
  if(!g || g.phase !== 'auction' || !g.auction) return;
  const a = g.auction;
  if(a.passed.includes(pid) || a.highBidder === pid) return;
  const p = g.players.find(x => x.id === pid);
  if(!p || p.bankrupt) return;
  const price = (g.board[a.tile] && g.board[a.tile].p) || 100;
  const maxBid = Math.min(Math.floor(price * 0.75), p.cash - 100);
  const next = a.highBidder == null ? 10 : a.highBid + 10 * rnd(1, 5);   // перебивает +10..50
  if(next <= maxBid && tryAct(room, pid, {type:'bid', amount: next}).ok) return;
  tryAct(room, pid, {type:'pass'});
}
/* оценка сделки ботом: получаю − отдаю ≥ +50 → принять */
function tileValue(g, idx, forId){
  const b = g.board[idx];
  if(!b) return 0;
  let v = b.p || 0;
  if(b.t === 'prop' && b.g){
    const grp = groupIdx(g, b.g);
    if(grp.every(j => j === idx || g.tiles[j].owner === forId)) v *= 2;  // завершает группу
  }
  return v;
}
function botTrade(room, pid, tradeId){
  const g = room.game;
  if(!g || g.phase === 'ended') return;
  const tr = (g.trades || []).find(x => x.id === tradeId && x.to === pid);
  if(!tr) return;
  const gain = (tr.giveCash || 0) + (tr.giveTiles || []).reduce((s, t)=>s + tileValue(g, t, pid), 0);
  const loss = (tr.takeCash || 0) + (tr.takeTiles || []).reduce((s, t)=>s + tileValue(g, t, tr.from), 0);
  tryAct(room, pid, { type: gain - loss >= 50 ? 'tradeAccept' : 'tradeDecline', id: tradeId });
}

/* =====================================================================
   API-ХЕНДЛЕРЫ
   Все ответы {ok:true,...} | {error:'code'} (HTTP 200), кроме 401 на
   /api/me и защищённых без сессии.
   ===================================================================== */
const EMAIL_RE = /^\S+@\S+\.\S+$/;

function hRegister(ctx){
  const uname = String(ctx.body.username || '').trim();
  const email = String(ctx.body.email || '').trim().toLowerCase();
  const pw = String(ctx.body.password || '');
  if(uname.length < 2 || uname.length > 24 || !EMAIL_RE.test(email) || pw.length < 6)
    return json(ctx.res, {error:'bad_input'});
  const exist = findUserByEmail(email);
  if(exist && exist.verified) return json(ctx.res, {error:'email_taken'});
  let u = exist;
  if(u){   // неподтверждённый — перезаписываем (код мог потеряться)
    u.username = uname;
    u.pass = hashPass(pw);
  } else {
    u = { id:'u' + (++db.seq), username: uname, email, pass: hashPass(pw),
      verified:false, code:null, stats:{games:0, wins:0}, created: Date.now() };
    db.users.push(u);
  }
  sendCode(u);
  saveDb();
  console.log(`[auth] регистрация: ${uname} <${email}>`);
  json(ctx.res, {ok:true, needVerify:true, mailToken: u.mailToken});
}
function hVerify(ctx){
  const email = String(ctx.body.email || '').trim().toLowerCase();
  const code = String(ctx.body.code || '').trim();
  const u = findUserByEmail(email);
  if(!u) return json(ctx.res, {error:'not_found'});
  const c = u.code;
  if(!c) return json(ctx.res, {error:'bad_code'});
  if(c.attempts >= CODE_ATTEMPTS) return json(ctx.res, {error:'too_many_attempts'});
  if(Date.now() > c.exp) return json(ctx.res, {error:'expired'});
  if(code !== c.code){
    c.attempts++;
    saveDb();
    return json(ctx.res, {error: c.attempts >= CODE_ATTEMPTS ? 'too_many_attempts' : 'bad_code'});
  }
  u.verified = true;
  u.code = null;
  newSession(ctx, u);
  saveDb();
  console.log(`[auth] подтверждён: ${u.email}`);
  json(ctx.res, {ok:true, user: pubUser(u)});
}
function hResend(ctx){
  const email = String(ctx.body.email || '').trim().toLowerCase();
  const u = findUserByEmail(email);
  if(!u) return json(ctx.res, {error:'not_found'});
  if(u.verified) return json(ctx.res, {error:'bad_input'});
  sendCode(u);
  saveDb();
  json(ctx.res, {ok:true, mailToken: u.mailToken});
}
function hLogin(ctx){
  const email = String(ctx.body.email || '').trim().toLowerCase();
  const pw = String(ctx.body.password || '');
  const u = findUserByEmail(email);
  if(!u || !verifyPass(u, pw)) return json(ctx.res, {error:'bad_credentials'});
  if(!u.verified) return json(ctx.res, {error:'unverified'});
  newSession(ctx, u);
  console.log(`[auth] вход: ${u.email}`);
  json(ctx.res, {ok:true, user: pubUser(u)});
}
function hGoggle(ctx){
  const name = String(ctx.body.name || '').trim();
  if(name.length < 2 || name.length > 24) return json(ctx.res, {error:'bad_input'});
  const email = slugify(name) + '@goggle.demo';
  let u = findUserByEmail(email);
  if(!u){
    u = { id:'u' + (++db.seq), username: name, email, pass:null,
      verified:true, code:null, stats:{games:0, wins:0}, created: Date.now() };
    db.users.push(u);
    console.log(`[auth] goggle-аккаунт: ${name} <${email}>`);
  }
  newSession(ctx, u);
  saveDb();
  json(ctx.res, {ok:true, user: pubUser(u)});
}
function hLogout(ctx){
  const sid = parseCookies(ctx.req).mono_sid;
  if(sid && db.sessions[sid]){ delete db.sessions[sid]; saveDb(); }
  clearSession(ctx);
  json(ctx.res, {ok:true});
}
function hMe(ctx){ json(ctx.res, {ok:true, user: pubUser(ctx.user)}); }
function hMailbox(ctx){
  const email = String(ctx.query.get('email') || '').trim().toLowerCase();
  const token = String(ctx.query.get('token') || '');
  const u = findUserByEmail(email);
  /* доступ к ящику: локальная разработка без прокси, ИЛИ токен из регистрации,
     ИЛИ авторизованный владелец этого email */
  const byToken = !!(u && u.mailToken && token &&
    token.length === u.mailToken.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(u.mailToken)));
  const bySession = !!(ctx.user && ctx.user.email === email);
  if(!isLocal(ctx.req) && !byToken && !bySession)
    return json(ctx.res, {error:'forbidden'}, 403);
  json(ctx.res, {ok:true, letters: MAIL.get(email) || []});
}

/* ---------------- комнаты ---------------- */
function hRooms(ctx){ json(ctx.res, {ok:true, rooms: lobbyRooms()}); }

function hRoomCreate(ctx){
  const uid = ctx.user.id;
  if(userRoom.has(uid)) return json(ctx.res, {error:'in_room'});
  const name = String(ctx.body.name || '').trim();
  const maxPlayers = parseInt(ctx.body.maxPlayers, 10);
  const capital = parseInt(ctx.body.capital, 10);
  let turnTime = ctx.body.turnTime;
  if(turnTime != null) turnTime = parseInt(turnTime, 10);
  const mode = ctx.body.mode === 'classic' ? 'classic' : 'blitz';   // по умолчанию блиц
  if(!name || name.length > 40 || !(maxPlayers >= 2 && maxPlayers <= 6) ||
     ![1000, 1500, 2000].includes(capital) ||
     !(turnTime == null || [30, 60, 120].includes(turnTime)))
    return json(ctx.res, {error:'bad_input'});
  const room = {
    id: roomCode(), name, hostId: uid, private: !!ctx.body.private,
    maxPlayers, capital, mode, turnTime: turnTime == null ? null : turnTime,
    status:'waiting',
    members: [{ id: uid, name: ctx.user.username, emoji: null, isBot: false }],
    game: null, timers: [], endTimer: null, seq: 0, botSeq: 0,
    disconnected: new Set(), ended: false,
  };
  ROOMS.set(room.id, room);
  userRoom.set(uid, room.id);
  console.log(`[room] создана ${room.id} «${name}» (хост ${ctx.user.username})`);
  json(ctx.res, {ok:true, roomId: room.id});
  broadcastRoom(room);
  broadcastLobby();
}
function hRoomJoin(ctx){
  const uid = ctx.user.id;
  if(userRoom.has(uid)) return json(ctx.res, {error:'in_room'});
  const rid = String(ctx.body.roomId || '').trim().toUpperCase();
  const room = ROOMS.get(rid);
  if(!room) return json(ctx.res, {error:'not_found'});
  if(room.status !== 'waiting') return json(ctx.res, {error:'started'});
  if(room.members.length >= room.maxPlayers) return json(ctx.res, {error:'full'});
  room.members.push({ id: uid, name: ctx.user.username, emoji: null, isBot: false });
  userRoom.set(uid, room.id);
  json(ctx.res, {ok:true});
  broadcastRoom(room);
  broadcastLobby();
}
function hRoomLeave(ctx){
  const uid = ctx.user.id;
  const rid = userRoom.get(uid);
  if(!rid) return json(ctx.res, {ok:true});
  const room = ROOMS.get(rid);
  userRoom.delete(uid);
  json(ctx.res, {ok:true});
  sendToUser(uid, { type:'room', room:null });
  sendToUser(uid, { type:'lobby', rooms: lobbyRooms() });
  if(!room) return;
  if(room.status === 'waiting'){
    room.members = room.members.filter(m => m.id !== uid);
    const humans = room.members.filter(m => !m.isBot);
    if(!humans.length){                       // остались только боты (или пусто) — комната умирает
      clearRoomTimers(room);
      ROOMS.delete(room.id);
      console.log(`[room] комната ${room.id} закрыта (пусто)`);
    } else {
      if(room.hostId === uid) room.hostId = humans[0].id;   // передача хоста
      broadcastRoom(room);
    }
    broadcastLobby();
  } else {
    /* идущая игра: помечаем disconnected, за игрока играет авто-таймер */
    room.disconnected.add(uid);
    console.log(`[game] игрок ${ctx.user.username} покинул партию ${room.id} (авто-режим)`);
    const allGone = room.members.every(m => m.isBot || room.disconnected.has(m.id));
    if(allGone){ disbandRoom(room); return; }  // смотреть некому — расформировываем
    if(room.game && room.game.phase !== 'ended'){
      clearRoomTimers(room);
      scheduleActors(room);
      scheduleTurnTimer(room);
    }
  }
}
function hRoomBot(ctx){
  const uid = ctx.user.id;
  const room = ROOMS.get(userRoom.get(uid));
  if(!room) return json(ctx.res, {error:'not_found'});
  if(room.hostId !== uid || room.status !== 'waiting') return json(ctx.res, {error:'cant'});
  const op = ctx.body.op;
  if(op === 'add'){
    if(room.members.length >= room.maxPlayers) return json(ctx.res, {error:'full'});
    const used = new Set(room.members.filter(m => m.isBot).map(m => m.name));
    const name = BOT_NAMES.find(n => !used.has(n)) || ('Bot ' + (room.botSeq + 1));
    room.members.push({ id: 'b' + (++room.botSeq), name, emoji: '🤖', isBot: true });
  } else if(op === 'remove'){
    let idx = -1;
    if(ctx.body.botId) idx = room.members.findIndex(m => m.isBot && m.id === ctx.body.botId);
    else { for(let i = room.members.length - 1; i >= 0; i--) if(room.members[i].isBot){ idx = i; break; } }
    if(idx < 0) return json(ctx.res, {error:'not_found'});
    room.members.splice(idx, 1);
  } else return json(ctx.res, {error:'bad_input'});
  json(ctx.res, {ok:true});
  broadcastRoom(room);
  broadcastLobby();
}
function hRoomToken(ctx){
  const uid = ctx.user.id;
  const room = ROOMS.get(userRoom.get(uid));
  if(!room || room.status !== 'waiting') return json(ctx.res, {error:'not_found'});
  const emoji = String(ctx.body.emoji || '');
  if(!TOKENS.includes(emoji)) return json(ctx.res, {error:'bad_input'});
  if(room.members.some(m => m.id !== uid && m.emoji === emoji))
    return json(ctx.res, {error:'taken'});
  const me = room.members.find(m => m.id === uid);
  if(!me) return json(ctx.res, {error:'not_found'});
  me.emoji = emoji;
  json(ctx.res, {ok:true});
  broadcastRoom(room);
}
function hRoomStart(ctx){
  const uid = ctx.user.id;
  const room = ROOMS.get(userRoom.get(uid));
  if(!room) return json(ctx.res, {error:'not_found'});
  if(room.hostId !== uid || room.status !== 'waiting' || room.members.length < 2)
    return json(ctx.res, {error:'cant'});
  const E = getEngine();
  if(!E){
    console.error('[game] engine.js недоступен — партию не начать');
    return json(ctx.res, {error:'cant'});
  }
  const used = new Set(room.members.map(m => m.emoji).filter(Boolean));
  const players = room.members.map((m, i)=>{
    let em = m.isBot ? '🤖' : m.emoji;
    if(!em){ em = TOKENS.find(t => !used.has(t)) || '🎲'; used.add(em); }
    return { id: m.id, name: m.name, emoji: em, color: COLORS[i % COLORS.length], isBot: !!m.isBot };
  });
  let game;
  try{ game = E.createGame(players, { capital: room.capital, turnTime: room.turnTime, mode: room.mode || 'blitz' }); }
  catch(e){
    console.error('[game] createGame упал:', e.message);
    return json(ctx.res, {error:'cant'});
  }
  room.game = game;
  room.status = 'playing';
  room.ended = false;
  console.log(`[game] старт партии в ${room.id}: ${players.map(p => p.name).join(', ')}`);
  json(ctx.res, {ok:true});
  broadcastLobby();
  afterAct(room, []);   // первый снапшот + планирование ботов/таймера
}

/* ---------------- игровые действия и чат ---------------- */
const CLIENT_ACTIONS = new Set(['roll','buy','decline','bid','pass','endTurn','build',
  'sellHouse','mortgage','unmortgage','jailPay','jailCard','trade','tradeAccept',
  'tradeDecline','tradeCancel','bankrupt']);

function hGameAction(ctx){
  const uid = ctx.user.id;
  const room = ROOMS.get(userRoom.get(uid));
  if(!room || room.status !== 'playing' || !room.game) return json(ctx.res, {error:'not_found'});
  const action = ctx.body.action;
  if(!action || typeof action !== 'object' || !CLIENT_ACTIONS.has(action.type))
    return json(ctx.res, {error:'bad_input'});
  const r = tryAct(room, uid, action);
  json(ctx.res, r.ok ? {ok:true} : {error: r.error || 'cant'});
}
function hChat(ctx){
  const uid = ctx.user.id;
  const room = ROOMS.get(userRoom.get(uid));
  if(!room) return json(ctx.res, {error:'cant'});
  const text = String(ctx.body.text || '').trim();
  if(!text || text.length > 300) return json(ctx.res, {error:'bad_input'});
  json(ctx.res, {ok:true});
  broadcastChat(room, { id: uid, name: ctx.user.username }, text);
}

/* ---------------- SSE-поток ---------------- */
function hStream(ctx){
  const { req, res, user } = ctx;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');
  const id = ++connSeq;
  CONNS.set(id, { uid: user.id, res });
  req.on('close', ()=>CONNS.delete(id));
  const where = whereOf(user.id);
  sseWrite(res, { type:'hello', user: pubUser(user), where });
  /* сразу шлём актуальный снапшот, чтобы клиенту было что рисовать */
  if(where === 'lobby'){
    sseWrite(res, { type:'lobby', rooms: lobbyRooms() });
  } else {
    const room = ROOMS.get(userRoom.get(user.id));
    if(room){
      if(where === 'room') sseWrite(res, { type:'room', room: roomMsg(room) });
      else sseWrite(res, { type:'game', game: room.game, events: [], deadline: room.deadline || null });
    }
  }
}

/* ---------------- роутер ---------------- */
const API = {
  'POST /api/register':     { rate:true, h: hRegister },
  'POST /api/verify':       { rate:true, h: hVerify },
  'POST /api/resend':       { rate:true, h: hResend },
  'POST /api/login':        { rate:true, h: hLogin },
  'POST /api/goggle':       { rate:true, h: hGoggle },
  'POST /api/logout':       { h: hLogout },
  'GET /api/me':            { auth:true, h: hMe },
  'GET /api/mailbox':       { h: hMailbox },
  'GET /api/rooms':         { auth:true, h: hRooms },
  'POST /api/rooms/create': { auth:true, h: hRoomCreate },
  'POST /api/rooms/join':   { auth:true, h: hRoomJoin },
  'POST /api/rooms/leave':  { auth:true, h: hRoomLeave },
  'POST /api/rooms/bot':    { auth:true, h: hRoomBot },
  'POST /api/rooms/token':  { auth:true, h: hRoomToken },
  'POST /api/rooms/start':  { auth:true, h: hRoomStart },
  'POST /api/game/action':  { auth:true, h: hGameAction },
  'POST /api/chat':         { auth:true, h: hChat },
  'GET /api/stream':        { auth:true, h: hStream },
};

async function handleApi(req, res, pathname, url){
  const route = API[req.method + ' ' + pathname];
  if(!route) return json(res, {error:'not_found'}, 404);
  let body = {};
  if(req.method === 'POST'){
    let raw = '';
    try{ raw = await readBody(req); }
    catch(e){ return json(res, {error:'bad_input'}); }
    if(raw){
      try{ body = JSON.parse(raw); }
      catch(e){ return json(res, {error:'bad_input'}); }
    }
    if(!body || typeof body !== 'object' || Array.isArray(body)) body = {};
  }
  if(route.rate && rateLimited(req)) return json(res, {error:'rate_limited'}, 429);
  const auth = authUser(req);
  if(route.auth && !auth) return json(res, {error:'unauthorized'}, 401);
  try{
    route.h({ req, res, body, query: url.searchParams, user: auth && auth.u, sid: auth && auth.sid });
  }catch(e){
    console.error('[api]', req.method, pathname, '—', e);
    if(!res.headersSent) json(res, {error:'server_error'}, 500);
  }
}

/* статика из public/ (MIME + no-store, как в design/serve.js) */
function serveStatic(req, res, pathname){
  if(req.method !== 'GET' && req.method !== 'HEAD'){
    res.writeHead(405, {'Content-Type':'text/plain; charset=utf-8'});
    return res.end('Method not allowed');
  }
  let p = pathname;
  try{ p = decodeURIComponent(p); }catch(e){}
  if(p === '/') p = '/index.html';
  const filePath = path.join(ROOT, path.normalize(p));
  if(!filePath.startsWith(ROOT)){
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data)=>{
    if(err){
      res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'});
      return res.end('Not found: ' + p);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    });
    res.end(data);
  });
}

/* ---------------- старт ---------------- */
loadDb();
fs.mkdirSync(DATA_DIR, {recursive:true});
http.createServer((req, res)=>{
  let url;
  try{ url = new URL(req.url, 'http://localhost'); }
  catch(e){ res.writeHead(400); return res.end('Bad request'); }
  if(url.pathname.startsWith('/api/')) handleApi(req, res, url.pathname, url);
  else serveStatic(req, res, url.pathname);
}).listen(PORT, HOST, ()=>console.log('Монополия · Биржа 1929 → http://' + HOST + ':' + PORT));
