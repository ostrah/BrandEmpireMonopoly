'use strict';
/* Монте-карло: боты доигрывают партии через движок. Проверяем, что движок
   не падает, инварианты держатся, и эндшпиль (банкротство/победа) достижим.
   Запуск: node monopoly/test/sim.js [nGames] [nPlayers] */
const E = require('../engine.js');
const B = E.BOARD;

function botIdle(g, p){
  for(let pass = 0; pass < 25; pass++){
    let built = false;
    // выкупить заложенное при жирной кассе
    if(p.cash > 600){ for(let i=0;i<40;i++){ if(g.tiles[i].owner===p.id && g.tiles[i].mortgaged){ if(E.act(g,p.id,{type:'unmortgage',tile:i}).ok){ built=true; break; } } } }
    if(built) continue;
    // равномерная застройка монополий, буфер 250
    for(let i=0;i<40;i++){
      if(g.tiles[i].owner!==p.id || B[i].t!=='prop') continue;
      if(p.cash - B[i].hc < 250) continue;
      if(E.act(g, p.id, { type:'build', tile:i }).ok){ built = true; break; }
    }
    if(!built) break;
  }
  E.act(g, p.id, { type:'endTurn' });
}
function botAuction(g){
  const au = g.auction;
  const cand = g.players.find(p => !p.bankrupt && !au.passed.includes(p.id) && au.highBidder !== p.id);
  if(cand && au.highBid < B[au.tile].p * 0.7 && cand.cash > au.highBid + 60) E.act(g, cand.id, { type:'bid', amount:(au.highBid||0) + 10 });
  else if(cand) E.act(g, cand.id, { type:'pass' });
  else E.act(g, null, { type:'auctionClose' });
}
function checkInvariants(g){
  const sum = g.players.reduce((s,p)=>s+p.cash,0);
  if(g.phase !== 'debt'){ for(const p of g.players){ if(!p.bankrupt && p.cash < 0) throw new Error('NEG cash '+p.id+'='+p.cash); } }
  for(const t of g.tiles){ if(t.houses < 0 || t.houses > 5) throw new Error('bad houses '+t.houses); }
  const alive = g.players.filter(p=>!p.bankrupt).length;
  if(g.phase==='ended' && alive!==1) throw new Error('ended but alive='+alive);
  if(sum < 0) throw new Error('total cash negative '+sum);
}
function play(nPlayers){
  const pls = [];
  for(let i=0;i<nPlayers;i++) pls.push({ id:'p'+i, name:'P'+i, emoji:'x', color:'#000', isBot:true });
  const g = E.createGame(pls, { capital:1500 });
  let steps = 0;
  while(g.phase !== 'ended' && steps < 8000){
    steps++;
    if(g.phase === 'auction'){ botAuction(g); checkInvariants(g); continue; }
    const actor = E.currentActor(g);
    if(actor == null) break;
    const p = g.players.find(x => x.id === actor);
    if(g.phase === 'debt') E.act(g, actor, { type:'autoResolveDebt' });
    else if(g.phase === 'buy'){ const price = B[g.pendingTile].p; E.act(g, actor, p.cash - price >= 100 ? { type:'buy' } : { type:'decline' }); }
    else if(g.phase === 'idle') botIdle(g, p);
    else if(g.phase === 'roll') E.act(g, actor, { type:'roll' });
    else break;
    checkInvariants(g);
  }
  return { ended: g.phase === 'ended', steps, winner: g.winner };
}

const N = parseInt(process.argv[2] || '400', 10);
const NP = parseInt(process.argv[3] || '3', 10);
let ended = 0, sumSteps = 0, maxSteps = 0, errors = 0;
const t0 = Date.now();
for(let i=0;i<N;i++){
  try{ const r = play(NP); if(r.ended) ended++; sumSteps += r.steps; if(r.steps > maxSteps) maxSteps = r.steps; }
  catch(e){ errors++; console.error('ПАРТИЯ', i, 'ОШИБКА:', e.message); if(errors > 5){ console.error('слишком много ошибок, стоп'); break; } }
}
console.log(`\nМонте-карло: ${N} партий по ${NP} бота, ${Date.now()-t0}мс`);
console.log(`  завершено естественно: ${ended}/${N} (${Math.round(ended/N*100)}%)`);
console.log(`  оборвано на лимите 8000: ${N-ended}`);
console.log(`  средняя длина: ${Math.round(sumSteps/N)} действий, макс: ${maxSteps}`);
console.log(`  нарушений инвариантов/крашей: ${errors}`);
process.exit(errors > 0 ? 1 : 0);
