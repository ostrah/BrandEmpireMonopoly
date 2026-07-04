'use strict';
/* Сквозной тест: поднимает server.js, регистрируется, верифицирует, создаёт
   комнату с ботом, стартует партию и играет через HTTP/SSE до победителя
   или лимита. Проверяет реальную интеграцию сервер+движок+боты+SSE.
   Запуск: node monopoly/test/integration.js */
const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 3202;
const HOST = '127.0.0.1';
const EMAIL = `t${Date.now()}@x.com`;
let cookie = '';

function req(method, p, body){
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = http.request({ host:HOST, port:PORT, path:p, method, headers:{
      'Content-Type':'application/json', ...(cookie?{Cookie:cookie}:{}), ...(data?{'Content-Length':data.length}:{}),
    }}, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        const sc = res.headers['set-cookie'];
        if(sc) cookie = sc[0].split(';')[0];
        let json = null; try{ json = JSON.parse(buf); }catch(e){}
        resolve({ status: res.statusCode, json });
      });
    });
    r.on('error', reject);
    if(data) r.write(data); r.end();
  });
}
function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
async function waitUp(){ for(let i=0;i<50;i++){ try{ await req('GET','/'); return true; }catch(e){ await sleep(150); } } return false; }

let me = null, lastGame = null, actionsSent = 0;

function decide(g){
  // определить действие за «человека» me по состоянию
  if(g.phase === 'ended') return null;
  if(g.phase === 'auction'){
    const au = g.auction;
    if(!au) return null;
    if(au.passed.includes(me) || au.highBidder === me) return null;
    // простая логика: изредка ставим, иначе пасуем
    return { type:'pass' };
  }
  if(g.phase === 'debt'){ if(g.debt && g.debt.playerId === me) return { type:'autoResolveDebt' }; return null; }
  const cur = g.players[g.turnIdx];
  if(!cur || cur.id !== me) return null;
  if(g.phase === 'buy'){ const price = g.board[g.pendingTile].p; return (cur.cash - price >= 100) ? { type:'buy' } : { type:'decline' }; }
  if(g.phase === 'idle') return { type:'endTurn' };
  if(g.phase === 'roll') return { type:'roll' };
  return null;
}
async function reactLoop(){
  // реагируем на текущее состояние, пока наш ход
  for(let i=0;i<6;i++){
    if(!lastGame || lastGame.phase === 'ended') return;
    const a = decide(lastGame);
    if(!a) return;
    const r = await req('POST','/api/game/action',{ action:a });
    actionsSent++;
    if(!r.json || !r.json.ok) return;   // сервер сам разошлёт новое состояние через SSE
    await sleep(30);
  }
}

function openStream(){
  const r = http.request({ host:HOST, port:PORT, path:'/api/stream', method:'GET', headers:{ Cookie:cookie } }, res => {
    let buf = '';
    res.on('data', chunk => {
      buf += chunk;
      let idx;
      while((idx = buf.indexOf('\n\n')) >= 0){
        const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
        for(const line of block.split('\n')){
          if(!line.startsWith('data:')) continue;
          let msg = null; try{ msg = JSON.parse(line.slice(5).trim()); }catch(e){ continue; }
          if(msg.type === 'hello'){ me = msg.user.id; }
          if(msg.type === 'game'){ lastGame = msg.game; reactLoop(); }
        }
      }
    });
    res.on('error', ()=>{});
  });
  r.on('error', ()=>{});
  r.end();
  return r;
}

(async () => {
  const srv = spawn('node', [path.join(__dirname,'..','server.js'), '--port', String(PORT)], { stdio:['ignore','pipe','pipe'] });
  let srvErr = '';
  srv.stderr.on('data', d => srvErr += d);
  let failed = false;
  const fail = (m) => { console.error('❌', m); failed = true; };
  try{
    if(!await waitUp()) throw new Error('сервер не поднялся: ' + srvErr);
    console.log('✔ сервер поднят на', PORT);

    let r = await req('POST','/api/register',{ username:'Tester', email:EMAIL, password:'secret1' });
    if(!r.json || !r.json.ok) throw new Error('register: ' + JSON.stringify(r.json));
    console.log('✔ регистрация');

    r = await req('GET','/api/mailbox?email=' + encodeURIComponent(EMAIL));
    const code = r.json && r.json.letters && r.json.letters[r.json.letters.length-1] && r.json.letters[r.json.letters.length-1].code;
    if(!code) throw new Error('нет кода в почте: ' + JSON.stringify(r.json));
    console.log('✔ код из демо-почты:', code);

    r = await req('POST','/api/verify',{ email:EMAIL, code });
    if(!r.json || !r.json.ok) throw new Error('verify: ' + JSON.stringify(r.json));
    if(!cookie) throw new Error('нет cookie после verify');
    console.log('✔ верификация + сессия');

    r = await req('POST','/api/rooms/create',{ name:'ИТ-тест', maxPlayers:2, capital:1500, turnTime:null, private:false });
    if(!r.json || !r.json.ok) throw new Error('create: ' + JSON.stringify(r.json));
    console.log('✔ комната создана:', r.json.roomId);

    r = await req('POST','/api/rooms/bot',{ op:'add' });
    if(!r.json || !r.json.ok) throw new Error('bot add: ' + JSON.stringify(r.json));
    console.log('✔ бот добавлен');

    openStream();
    await sleep(400);           // получить hello + room

    r = await req('POST','/api/rooms/start',{});
    if(!r.json || !r.json.ok) throw new Error('start: ' + JSON.stringify(r.json));
    console.log('✔ партия запущена, играем...');

    // ждём завершения или лимита
    const t0 = Date.now();
    while(Date.now() - t0 < 40000){
      await sleep(500);
      if(lastGame && lastGame.phase === 'ended') break;
    }
    if(!lastGame) throw new Error('не пришло ни одного game-снапшота (SSE?)');
    console.log(`  действий отправлено «человеком»: ${actionsSent}, раунд: ${lastGame.round}, фаза: ${lastGame.phase}`);
    if(lastGame.phase === 'ended'){
      const w = lastGame.players.find(p => p.id === lastGame.winner);
      console.log('✔ ПАРТИЯ ЗАВЕРШЕНА, победитель:', w ? w.name : lastGame.winner);
    } else {
      console.log('⏱ партия не закончилась за 40с (норм для долгой игры), но состояние прогрессировало —',
                  'позиции:', lastGame.players.map(p=>p.pos).join(','), 'кассы:', lastGame.players.map(p=>p.cash).join(','));
      if(actionsSent < 3) fail('слишком мало действий — интеграция буксует');
    }
  }catch(e){ fail(e.message); }
  finally{
    srv.kill();
    await sleep(200);
    console.log(failed ? '\nИТОГ: ПРОВАЛ' : '\nИТОГ: OK');
    process.exit(failed ? 1 : 0);
  }
})();
