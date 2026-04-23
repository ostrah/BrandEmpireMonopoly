// @ts-nocheck
import { useState, useRef, useEffect } from "react";

const GC = { fashion:'#E91E63', drinks:'#0288D1', cars:'#D32F2F', tech:'#2E7D32', hotels:'#F57C00' };
const GI = { fashion:'👗', drinks:'🥤', cars:'🚗', tech:'💻', hotels:'🏨' };
const GL = { fashion:'Fashion', drinks:'Drinks', cars:'Cars', tech:'Tech', hotels:'Hotels' };

const CELLS = [
  {id:0,type:'corner',name:'GO',icon:'🏁',sub:'+$200'},
  {id:1,type:'property',name:'Nike',group:'fashion',price:60,rent:10},
  {id:2,type:'property',name:'Adidas',group:'fashion',price:60,rent:10},
  {id:3,type:'chance',name:'Chance',icon:'🎴'},
  {id:4,type:'property',name:'Pepsi',group:'drinks',price:100,rent:18},
  {id:5,type:'property',name:'Coca-Cola',group:'drinks',price:100,rent:18},
  {id:6,type:'property',name:'Red Bull',group:'drinks',price:120,rent:22},
  {id:7,type:'corner',name:'JAIL',icon:'🔒',sub:'Just Visiting'},
  {id:8,type:'property',name:'Volkswagen',group:'cars',price:140,rent:26},
  {id:9,type:'property',name:'BMW',group:'cars',price:140,rent:26},
  {id:10,type:'community',name:'Community',icon:'📋'},
  {id:11,type:'property',name:'Tesla',group:'cars',price:160,rent:30},
  {id:12,type:'property',name:'Ferrari',group:'cars',price:160,rent:30},
  {id:13,type:'property',name:'Heineken',group:'drinks',price:80,rent:14},
  {id:14,type:'corner',name:'FREE\nPARKING',icon:'🅿️'},
  {id:15,type:'property',name:'Apple',group:'tech',price:200,rent:38},
  {id:16,type:'property',name:'Google',group:'tech',price:200,rent:38},
  {id:17,type:'chance',name:'Chance',icon:'🎴'},
  {id:18,type:'property',name:'Microsoft',group:'tech',price:220,rent:42},
  {id:19,type:'property',name:'Samsung',group:'tech',price:220,rent:42},
  {id:20,type:'property',name:'Hilton',group:'hotels',price:260,rent:50},
  {id:21,type:'corner',name:'GO TO\nJAIL',icon:'👮'},
  {id:22,type:'property',name:'Marriott',group:'hotels',price:260,rent:50},
  {id:23,type:'tax',name:'Luxury Tax',icon:'💸',sub:'Pay $75'},
  {id:24,type:'property',name:'Four Seasons',group:'hotels',price:300,rent:58},
  {id:25,type:'property',name:'Ritz',group:'hotels',price:350,rent:70},
  {id:26,type:'property',name:'Zara',group:'fashion',price:80,rent:14},
  {id:27,type:'property',name:'Gucci',group:'fashion',price:80,rent:14},
];

const POS = [[8,1],[8,2],[8,3],[8,4],[8,5],[8,6],[8,7],[8,8],[7,8],[6,8],[5,8],[4,8],[3,8],[2,8],[1,8],[1,7],[1,6],[1,5],[1,4],[1,3],[1,2],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1]];
const SIDE = [null,'bottom','bottom','bottom','bottom','bottom','bottom',null,'right','right','right','right','right','right',null,'top','top','top','top','top','top',null,'left','left','left','left','left','left'];

const CHANCE = [
  {text:'Your brands go viral! 📱',eff:{t:'gain',n:150}},
  {text:'Market crash!',eff:{t:'lose',n:100}},
  {text:'Bank pays dividend.',eff:{t:'gain',n:50}},
  {text:'Go directly to Jail!',eff:{t:'jail'}},
  {text:'Advance to GO! Collect $200.',eff:{t:'goto',pos:0,n:200}},
  {text:'Pay school fees.',eff:{t:'lose',n:150}},
  {text:'Win brand award! 🏆',eff:{t:'gain',n:100}},
  {text:'Speeding fine.',eff:{t:'lose',n:50}},
  {text:'Investor pitch wins! 💰',eff:{t:'gain',n:200}},
];
const COMMUNITY = [
  {text:'Bank error in your favor! 🏦',eff:{t:'gain',n:200}},
  {text:"Doctor's fees.",eff:{t:'lose',n:50}},
  {text:'Life insurance matures.',eff:{t:'gain',n:100}},
  {text:'Income tax refund!',eff:{t:'gain',n:20}},
  {text:'Hospital fees.',eff:{t:'lose',n:100}},
  {text:'Win the lottery! 🎰',eff:{t:'gain',n:150}},
];

// Light theme — distinct, saturated player colors for strong contrast on white
const PCOL = ['#DC2626','#2563EB','#16A34A','#D97706'];
const PSHP = ['●','■','▲','◆'];
const SAVE = 'brand_empire_v4_light';

// Design tokens (light theme)
const T = {
  bg:        '#F5F2EC',      // warm off-white page bg
  surface:   '#FFFFFF',      // cards
  surface2:  '#FAFAF7',      // inset
  border:    '#E5E2DA',
  borderStrong: '#CFCAC0',
  text:      '#1A1A1A',
  textMuted: '#6B6B6B',
  textFaint: '#9A9A9A',
  accent:    '#1A1A1A',      // gold/dark for emphasis
  gold:      '#B8860B',
  goldBg:    '#FFF8E1',
  shadow:    '0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.06)',
};

const rnd = n => { const a = new Uint8Array(1); window.crypto.getRandomValues(a); return a[0] % n; };
const roll1 = () => rnd(6) + 1;
const mkP = n => Array.from({length:n}, (_,i) => ({id:i, name:`Player ${i+1}`, color:PCOL[i], shape:PSHP[i], pos:0, money:1500, bankrupt:false}));
const mkGs = n => ({players:mkP(n), cur:0, phase:'roll', dice:[1,1], props:{}, hq:{}, mortgaged:{}, log:['🎮 Game started! Player 1 goes first.'], chat:[], modal:null, trade:null, winner:null});

let _ac = null;
const getAc = () => { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); if (_ac.state === 'suspended') _ac.resume(); return _ac; };
const beep = (f, d, type='sine', v=0.2) => { try { const c=getAc(),o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.value=f; g.gain.setValueAtTime(v,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+d); } catch(e) {} };
const sweep = (f0, f1, d, v=0.18) => { try { const c=getAc(),o=c.createOscillator(),g=c.createGain(); o.frequency.setValueAtTime(f0,c.currentTime); o.frequency.linearRampToValueAtTime(f1,c.currentTime+d); g.gain.setValueAtTime(v,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime+d); } catch(e) {} };
const SFX = {
  roll: s => s && [0,.07,.14].forEach(t => setTimeout(() => beep(120+Math.random()*120,.06,'square',.06), t*1000)),
  buy:  s => s && [261,329,392,523].forEach((f,i) => setTimeout(() => beep(f,.15), i*75)),
  rent: s => s && [392,311,261].forEach((f,i) => setTimeout(() => beep(f,.13,'sawtooth',.16), i*80)),
  card: s => s && sweep(280,880,.28),
  win:  s => s && [523,659,784,1046,1318].forEach((f,i) => setTimeout(() => beep(f,.35,'sine',.28), i*130)),
  trade:s => s && [392,494,587,784].forEach((f,i) => setTimeout(() => beep(f,.15,'sine',.18), i*90)),
  mort: s => s && sweep(440,180,.3,'sawtooth'),
};

const DOTS = {1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,25],[72,25],[28,50],[72,50],[28,75],[72,75]]};

function Die({ v, rolling, mo }) {
  return (
    <div style={{width:52,height:52,background:'#FFFFFF',borderRadius:10,position:'relative',boxShadow:'0 2px 8px rgba(0,0,0,0.12), inset 0 0 0 1px '+T.border,animation:rolling&&mo?'spin .1s linear infinite':'none',flexShrink:0}}>
      {(DOTS[v]||DOTS[1]).map(([x,y],i) => (
        <div key={i} style={{position:'absolute',width:9,height:9,borderRadius:'50%',background:'#1A1A1A',left:`calc(${x}% - 4.5px)`,top:`calc(${y}% - 4.5px)`}} />
      ))}
    </div>
  );
}

function ModalWrap({ children }) {
  return (
    <div style={{position:'absolute',inset:0,background:'rgba(30,30,30,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,minHeight:'100%',backdropFilter:'blur(4px)'}}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'24px 28px',maxWidth:340,width:'93%',textAlign:'center',animation:'popIn .25s ease',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>
        {children}
      </div>
    </div>
  );
}

function BuyModal({ cell, curPl, onBuy, onPass }) {
  const can = curPl.money >= cell.price;
  return (
    <ModalWrap>
      <div style={{fontSize:32,marginBottom:6}}>{GI[cell.group]}</div>
      <div style={{color:T.text,fontSize:20,fontWeight:700,marginBottom:4}}>{cell.name}</div>
      <div style={{display:'inline-block',padding:'2px 10px',fontSize:9,borderRadius:999,background:GC[cell.group]+'18',color:GC[cell.group],fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:16}}>{cell.group}</div>
      <div style={{display:'flex',justifyContent:'space-around',marginBottom:16,padding:'12px 0',borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>
        {[['PRICE',`$${cell.price}`,T.gold],['RENT',`$${cell.rent}`,T.textMuted],['BALANCE',`$${curPl.money}`,can?'#16A34A':'#DC2626']].map(([l,v,c]) => (
          <div key={l}><div style={{color:T.textFaint,fontSize:8,letterSpacing:1,marginBottom:2}}>{l}</div><div style={{color:c,fontSize:18,fontWeight:700}}>{v}</div></div>
        ))}
      </div>
      <div style={{color:T.textMuted,fontSize:10,marginBottom:16,lineHeight:1.5}}>Own group → <strong style={{color:T.text}}>×2 rent</strong> · HQ upgrade → <strong style={{color:T.text}}>×4 rent</strong></div>
      <div style={{display:'flex',gap:8}}>
        <button onClick={onPass} style={{flex:1,padding:'10px 0',background:T.surface,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:10,fontSize:11,fontWeight:600,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>Pass</button>
        <button onClick={onBuy} disabled={!can} style={{flex:2,padding:'10px 0',background:can?T.text:T.surface2,color:can?'#FFF':T.textFaint,border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:can?'pointer':'not-allowed',letterSpacing:0.5,textTransform:'uppercase'}}>
          {can ? `Buy $${cell.price}` : 'Not enough'}
        </button>
      </div>
    </ModalWrap>
  );
}

function RentModal({ rent, own, mult, onClose }) {
  return (
    <ModalWrap>
      <div style={{fontSize:32,marginBottom:6}}>💸</div>
      <div style={{color:'#DC2626',fontSize:16,fontWeight:700,marginBottom:4,letterSpacing:0.5,textTransform:'uppercase'}}>Pay Rent</div>
      <div style={{color:T.gold,fontSize:28,fontWeight:800,marginBottom:4}}>${rent}</div>
      <div style={{color:T.textMuted,fontSize:11,marginBottom:10}}>to {own}</div>
      {mult > 1 && (
        <div style={{marginBottom:14}}>
          <span style={{display:'inline-block',padding:'3px 10px',fontSize:10,borderRadius:999,background:mult===4?T.goldBg:'#EFF6FF',color:mult===4?T.gold:'#2563EB',fontWeight:700}}>
            {mult===4 ? '🏢 HQ Rate ×4' : '🏠 Monopoly ×2'}
          </span>
        </div>
      )}
      <button onClick={onClose} style={{width:'100%',padding:'10px 0',background:'#DC2626',color:'#FFF',border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>Pay Up</button>
    </ModalWrap>
  );
}

function CardModal({ kind, card, onClose }) {
  const eff = card.eff;
  const effColor = eff.t==='gain' ? '#16A34A' : eff.t==='lose' ? '#DC2626' : '#2563EB';
  const effText = eff.t==='gain' ? `+$${eff.n}` : eff.t==='lose' ? `-$${eff.n}` : eff.t==='jail' ? '🔒 Go to Jail' : '→ GO +$200';
  return (
    <ModalWrap>
      <div style={{fontSize:32,marginBottom:6}}>{kind==='chance'?'🎴':'📋'}</div>
      <div style={{color:T.textMuted,fontSize:10,fontWeight:700,marginBottom:12,letterSpacing:2,textTransform:'uppercase'}}>{kind==='chance'?'Chance Card':'Community Chest'}</div>
      <div style={{color:T.text,fontSize:14,lineHeight:1.5,padding:'14px',background:T.surface2,borderRadius:10,marginBottom:12,border:`1px solid ${T.border}`}}>{card.text}</div>
      <div style={{fontSize:20,fontWeight:800,marginBottom:16,color:effColor}}>{effText}</div>
      <button onClick={onClose} style={{width:'100%',padding:'10px 0',background:T.text,color:'#FFF',border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>Got it</button>
    </ModalWrap>
  );
}

function TaxModal({ onClose }) {
  return (
    <ModalWrap>
      <div style={{fontSize:32,marginBottom:8}}>💸</div>
      <div style={{color:'#DC2626',fontSize:16,fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Luxury Tax</div>
      <div style={{color:T.textMuted,fontSize:12,marginBottom:14}}>Pay <strong style={{color:T.gold,fontSize:16}}>$75</strong> to bank</div>
      <button onClick={onClose} style={{width:'100%',padding:'10px 0',background:'#DC2626',color:'#FFF',border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>Pay Tax</button>
    </ModalWrap>
  );
}

function JailModal({ onClose }) {
  return (
    <ModalWrap>
      <div style={{fontSize:32,marginBottom:8}}>🔒</div>
      <div style={{color:'#D97706',fontSize:16,fontWeight:700,marginBottom:6,textTransform:'uppercase',letterSpacing:0.5}}>Go to Jail!</div>
      <div style={{color:T.textMuted,fontSize:12,marginBottom:14}}>Do not pass GO.</div>
      <button onClick={onClose} style={{width:'100%',padding:'10px 0',background:'#D97706',color:'#FFF',border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>OK</button>
    </ModalWrap>
  );
}

export default function Game() {
  const [screen, setScreen] = useState('setup');
  const [np, setNp] = useState(2);
  const [gs, setGs] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [anim, setAnim] = useState(null);
  const [hasSave, setHasSave] = useState(false);
  const [hov, setHov] = useState(null);
  const [soundOn, setSoundOn] = useState(true);
  const [motionOn, setMotionOn] = useState(true);
  const [showMyProps, setShowMyProps] = useState(false);
  const [centerTab, setCenterTab] = useState('chat');
  const [chatInput, setChatInput] = useState('');

  const [tTgt, setTTgt] = useState(null);
  const [tOM, setTOM] = useState('0');
  const [tRM, setTRM] = useState('0');
  const [tOP, setTOP] = useState([]);
  const [tRP, setTRP] = useState([]);

  const gsRef = useRef(null);
  const sndRef = useRef(soundOn);
  const chatRef = useRef();
  const logRef = useRef();

  useEffect(() => { gsRef.current = gs; }, [gs]);
  useEffect(() => { sndRef.current = soundOn; }, [soundOn]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [gs?.log]);
  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [gs?.chat]);

  useEffect(() => {
    try { const s = localStorage.getItem(SAVE); if (s) { const d = JSON.parse(s); if (d.gs && !d.gs.winner) setHasSave(true); } } catch(e) {}
  }, []);

  useEffect(() => {
    if (gs && !anim) try { localStorage.setItem(SAVE, JSON.stringify({gs, np})); } catch(e) {}
  }, [gs, anim, np]);

  useEffect(() => {
    if (!anim) return;
    const { pid, cur, target } = anim;
    if (cur === target) { processLanding(pid); setAnim(null); return; }
    const t = setTimeout(() => {
      const next = (cur + 1) % 28;
      setGs(p => p ? {...p, players: p.players.map((pl,i) => i===pid ? {...pl, pos:next} : pl)} : p);
      setAnim(p => p ? {...p, cur:next} : p);
    }, motionOn ? 200 : 0);
    return () => clearTimeout(t);
  }, [anim, motionOn]);

  const processLanding = pid => {
    setGs(prev => {
      if (!prev) return prev;
      const pl = prev.players[pid], cell = CELLS[pl.pos];
      let players = [...prev.players], log = `${pl.name} → ${cell.name}`, modal = null;

      if (cell.type === 'property') {
        const ow = prev.props[cell.id];
        if (ow === undefined) {
          modal = {t:'buy', cid:cell.id};
          log += ' 🏷️';
        } else if (ow === pid) {
          log += ' (own)';
        } else if (prev.mortgaged[cell.id]) {
          log += ' 💤 mortgaged — free!';
        } else {
          const gc = CELLS.filter(c => c.type==='property' && c.group===cell.group);
          const isHq = prev.hq[cell.group] === ow;
          const mono = gc.every(c => prev.props[c.id] === ow);
          const mult = isHq ? 4 : mono ? 2 : 1;
          const rent = cell.rent * mult;
          players = players.map((p,i) => i===pid ? {...p,money:p.money-rent} : i===ow ? {...p,money:p.money+rent} : p);
          modal = {t:'rent', rent, own:prev.players[ow].name, mult};
          log += ` 💸 Rent $${rent}${mult>1?` ×${mult}`:''}`;
        }
      } else if (cell.type === 'chance' || cell.type === 'community') {
        const deck = cell.type==='chance' ? CHANCE : COMMUNITY;
        const card = deck[rnd(deck.length)];
        const { eff } = card;
        if (eff.t==='gain') players = players.map((p,i) => i===pid ? {...p,money:p.money+eff.n} : p);
        else if (eff.t==='lose') players = players.map((p,i) => i===pid ? {...p,money:p.money-eff.n} : p);
        else if (eff.t==='goto') players = players.map((p,i) => i===pid ? {...p,pos:eff.pos,money:p.money+(eff.n||0)} : p);
        else if (eff.t==='jail') players = players.map((p,i) => i===pid ? {...p,pos:7} : p);
        modal = {t:'card', kind:cell.type, card};
        log += ` ${cell.type==='chance'?'🎴':'📋'}`;
        SFX.card(sndRef.current);
      } else if (cell.type === 'tax') {
        players = players.map((p,i) => i===pid ? {...p,money:p.money-75} : p);
        modal = {t:'tax'};
        log += ' 💸 $75';
      } else if (cell.id === 21) {
        players = players.map((p,i) => i===pid ? {...p,pos:7} : p);
        modal = {t:'jail'};
        log += ' 🔒';
      }

      players = players.map(p => p.money < 0 ? {...p,bankrupt:true} : p);
      const alive = players.filter(p => !p.bankrupt);
      const winner = alive.length === 1 ? alive[0] : null;
      if (modal?.t === 'rent') SFX.rent(sndRef.current);
      return {...prev, players, phase:'action', log:[...prev.log,log].slice(-20), modal, winner};
    });
  };

  const doRoll = () => {
    const g = gsRef.current;
    if (rolling || !g || g.phase!=='roll' || anim) return;
    const d1=roll1(), d2=roll1(), tot=d1+d2;
    const cp=g.cur, curPos=g.players[cp].pos, raw=curPos+tot, target=raw%28, passGo=raw>=28;
    SFX.roll(sndRef.current);
    setRolling(true);
    setTimeout(() => {
      setRolling(false);
      setGs(p => p ? {
        ...p, dice:[d1,d2], phase:'moving',
        players: p.players.map((pl,i) => i===cp && passGo ? {...pl,money:pl.money+200} : pl),
        log: [...p.log, `${p.players[cp].name} rolled ${d1}+${d2}=${tot}${passGo?' ✨+$200':''}`].slice(-20),
      } : p);
      setAnim({pid:cp, cur:curPos, target});
    }, motionOn ? 900 : 80);
  };

  const buyProp = () => setGs(prev => {
    if (!prev?.modal || prev.modal.t !== 'buy') return prev;
    const cell = CELLS[prev.modal.cid], cp = prev.cur;
    if (prev.players[cp].money < cell.price) return prev;
    SFX.buy(sndRef.current);
    return {...prev,
      players: prev.players.map((p,i) => i===cp ? {...p,money:p.money-cell.price} : p),
      props: {...prev.props, [prev.modal.cid]:cp},
      modal: null,
      log: [...prev.log, `${prev.players[cp].name} bought ${cell.name}! 🏷️`].slice(-20),
    };
  });

  const buyHQ = grp => setGs(prev => {
    if (!prev) return prev;
    const cp=prev.cur, pl=prev.players[cp];
    const gc = CELLS.filter(c => c.type==='property' && c.group===grp);
    if (pl.money<200 || prev.hq[grp]===cp || gc.some(c => prev.mortgaged[c.id])) return prev;
    return {...prev,
      players: prev.players.map((p,i) => i===cp ? {...p,money:p.money-200} : p),
      hq: {...prev.hq, [grp]:cp},
      log: [...prev.log, `${pl.name} upgraded ${GL[grp]} → HQ! 🏢 Rent ×4`].slice(-20),
    };
  });

  const sellHQ = grp => setGs(prev => {
    if (!prev || prev.hq[grp]!==prev.cur) return prev;
    return {...prev,
      players: prev.players.map((p,i) => i===prev.cur ? {...p,money:p.money+100} : p),
      hq: {...prev.hq, [grp]:undefined},
      log: [...prev.log, `${prev.players[prev.cur].name} sold ${GL[grp]} HQ +$100`].slice(-20),
    };
  });

  const mortgageProp = cid => setGs(prev => {
    if (!prev) return prev;
    const cp=prev.cur, cell=CELLS[cid];
    if (prev.props[cid]!==cp || prev.mortgaged[cid] || prev.hq[cell.group]===cp) return prev;
    const gain = Math.floor(cell.price/2);
    SFX.mort(sndRef.current);
    return {...prev,
      players: prev.players.map((p,i) => i===cp ? {...p,money:p.money+gain} : p),
      mortgaged: {...prev.mortgaged, [cid]:true},
      log: [...prev.log, `${prev.players[cp].name} mortgaged ${cell.name} +$${gain}`].slice(-20),
    };
  });

  const unmortgageProp = cid => setGs(prev => {
    if (!prev) return prev;
    const cp=prev.cur, cell=CELLS[cid];
    const cost = Math.ceil(cell.price/2*1.1);
    if (prev.props[cid]!==cp || !prev.mortgaged[cid] || prev.players[cp].money<cost) return prev;
    return {...prev,
      players: prev.players.map((p,i) => i===cp ? {...p,money:p.money-cost} : p),
      mortgaged: {...prev.mortgaged, [cid]:undefined},
      log: [...prev.log, `${prev.players[cp].name} redeemed ${cell.name} -$${cost}`].slice(-20),
    };
  });

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setGs(prev => prev ? {...prev, chat: [...(prev.chat||[]), {pid:prev.cur, text, ts:Date.now()}].slice(-50)} : prev);
    setChatInput('');
  };

  const openTrade = () => { setTTgt(null); setTOM('0'); setTRM('0'); setTOP([]); setTRP([]); setGs(p => p ? {...p, trade:{step:'propose'}} : p); };
  const closeTrade = () => setGs(p => p ? {...p, trade:null} : p);

  const proposeTrade = () => {
    if (tTgt === null) return;
    setGs(p => p ? {...p, trade:{step:'review', from:p.cur, to:tTgt, om:parseInt(tOM)||0, rm:parseInt(tRM)||0, op:tOP, rp:tRP}} : p);
  };

  const acceptTrade = () => setGs(prev => {
    if (!prev?.trade || prev.trade.step !== 'review') return prev;
    const {from, to, om, rm, op, rp} = prev.trade;
    if (prev.players[from].money<om || prev.players[to].money<rm) return prev;
    let players = [...prev.players];
    players = players.map((p,i) => i===from ? {...p,money:p.money-om+rm} : i===to ? {...p,money:p.money-rm+om} : p);
    let props = {...prev.props};
    op.forEach(cid => { props[cid] = to; });
    rp.forEach(cid => { props[cid] = from; });
    let hq = {...prev.hq};
    [...op,...rp].forEach(cid => { const g=CELLS[cid].group; if (hq[g]!==undefined) hq[g]=undefined; });
    SFX.trade(sndRef.current);
    return {...prev, players, props, hq, trade:null,
      log: [...prev.log, `Trade: ${prev.players[from].name} ↔ ${prev.players[to].name} ✅`].slice(-20),
    };
  });

  const closeModal = () => setGs(p => p ? {...p, modal:null} : p);

  const endTurn = () => setGs(prev => {
    if (!prev) return prev;
    const n=prev.players.length; let nx=(prev.cur+1)%n, s=0;
    while (prev.players[nx].bankrupt && s<n) { nx=(nx+1)%n; s++; }
    return {...prev, cur:nx, phase:'roll', modal:null, trade:null,
      log: [...prev.log, `→ ${prev.players[nx].name}'s turn`].slice(-20),
    };
  });

  const toggleP = (set, cid) => set(p => p.includes(cid) ? p.filter(x=>x!==cid) : [...p,cid]);

  // ─── Cell rendering ────────────────────────────────────────────────────
  const renderCell = c => {
    const [r,col] = POS[c.id], side = SIDE[c.id];
    const isCorner = c.type === 'corner';
    const here = gs ? gs.players.filter(p => !p.bankrupt && p.pos===c.id) : [];
    const owIdx = gs?.props[c.id];
    const owColor = owIdx !== undefined ? PCOL[owIdx] : null;
    const isHq = gs && c.type==='property' && gs.hq[c.group]===owIdx && owIdx!==undefined;
    const isMortg = !!gs?.mortgaged[c.id];
    const isActive = gs && !anim && gs.players[gs.cur]?.pos===c.id && gs.phase==='action';
    const isAnimOn = !!(anim && here.some(p => p.id===anim.pid));
    const sc = c.type==='property' ? (isMortg?'#CCCCCC':GC[c.group]) : c.type==='chance' ? '#7C3AED' : c.type==='community' ? '#0EA5E9' : c.type==='tax' ? '#F59E0B' : null;

    let bg = T.surface;
    if (isMortg) bg = '#F5F5F5';
    else if (isAnimOn) bg = '#FFF8E1';
    else if (isActive) bg = '#EFF6FF';
    else if (hov === c.id) bg = T.surface2;
    else if (isCorner) bg = T.surface2;

    const borderC = isAnimOn ? T.gold : isActive ? '#2563EB' : T.border;

    const base = {
      gridRow:r, gridColumn:col,
      border:`1px solid ${borderC}`,
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden', cursor:'pointer',
      transition:'background .15s, border-color .15s',
      background:bg, padding:isCorner?4:2, boxSizing:'border-box',
      opacity:isMortg?.6:1,
    };

    const strip = sc && side && (
      <div style={{position:'absolute', background:sc, zIndex:1, ...(side==='bottom'?{bottom:0,left:0,right:0,height:7}:side==='top'?{top:0,left:0,right:0,height:7}:side==='right'?{top:0,right:0,bottom:0,width:7}:{top:0,left:0,bottom:0,width:7})}} />
    );
    const owDot = owColor && !isMortg && <div style={{position:'absolute',top:2,right:2,width:8,height:8,borderRadius:'50%',background:owColor,zIndex:5,border:'1.5px solid white',boxShadow:'0 1px 2px rgba(0,0,0,0.2)'}} />;
    const badge = isMortg ? <div style={{position:'absolute',top:2,left:2,fontSize:9,zIndex:5}}>💤</div> : isHq ? <div style={{position:'absolute',top:side==='top'?10:2,left:2,fontSize:9,zIndex:5}}>🏢</div> : null;
    const tokens = here.length > 0 && (
      <div style={{display:'flex',gap:1,flexWrap:'wrap',justifyContent:'center',marginTop:1,zIndex:4,position:'relative'}}>
        {here.map(p => <span key={p.id} style={{color:p.color,fontSize:13,lineHeight:1,textShadow:'0 0 2px white, 0 0 2px white'}}>{p.shape}</span>)}
      </div>
    );

    if (isCorner) return (
      <div key={c.id} style={base} onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)}>
        <div style={{fontSize:20}}>{c.icon}</div>
        <div style={{fontSize:8,fontWeight:700,color:T.text,textAlign:'center',marginTop:2,whiteSpace:'pre-line',lineHeight:1.3,letterSpacing:0.3}}>{c.name}</div>
        {c.sub && <div style={{fontSize:6,color:T.textFaint}}>{c.sub}</div>}
        {tokens}
      </div>
    );

    if (c.type === 'property') return (
      <div key={c.id} style={base} onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)}>
        {strip}{owDot}{badge}
        <div style={{fontSize:12,zIndex:2,marginTop:side==='top'?9:2}}>{GI[c.group]}</div>
        <div style={{fontSize:6,fontWeight:600,color:isMortg?T.textFaint:T.text,textAlign:'center',lineHeight:1.2,zIndex:2,padding:'0 1px',marginBottom:side==='bottom'?9:1}}>{c.name}</div>
        <div style={{fontSize:6,color:isMortg?T.textFaint:T.gold,zIndex:2,fontWeight:700}}>${c.price}</div>
        {tokens}
      </div>
    );

    return (
      <div key={c.id} style={base} onMouseEnter={()=>setHov(c.id)} onMouseLeave={()=>setHov(null)}>
        {strip}
        <div style={{fontSize:17,zIndex:2}}>{c.icon}</div>
        <div style={{fontSize:6,color:T.textMuted,textAlign:'center',lineHeight:1.2,zIndex:2,padding:'0 2px'}}>{c.name}</div>
        {tokens}
      </div>
    );
  };

  // ─── Setup screen ──────────────────────────────────────────────────────
  if (screen === 'setup') return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'Inter',system-ui,sans-serif",gap:14,padding:20,color:T.text}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes popIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}} @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
      <div style={{fontSize:56}}>🌍</div>
      <div style={{color:T.text,fontSize:30,fontWeight:800,letterSpacing:4,textTransform:'uppercase'}}>Brand Empire</div>
      <div style={{color:T.textFaint,fontSize:10,letterSpacing:3,marginBottom:8}}>THE REAL BRANDS BOARD GAME</div>
      <div style={{color:T.textMuted,fontSize:10,letterSpacing:2,fontWeight:600}}>SELECT PLAYERS</div>
      <div style={{display:'flex',gap:10}}>
        {[2,3,4].map(n => (
          <button key={n} onClick={()=>setNp(n)} style={{width:60,height:60,borderRadius:14,fontSize:22,background:np===n?T.text:T.surface,color:np===n?'#FFF':T.textMuted,border:`1px solid ${np===n?T.text:T.border}`,cursor:'pointer',fontWeight:700,transition:'all .15s'}}>{n}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        {mkP(np).map(p => (
          <div key={p.id} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'12px 16px',background:T.surface,borderRadius:12,border:`1px solid ${p.color}44`,boxShadow:T.shadow}}>
            <span style={{color:p.color,fontSize:24}}>{p.shape}</span>
            <span style={{color:T.textMuted,fontSize:9,fontWeight:600}}>{p.name}</span>
          </div>
        ))}
      </div>
      <button onClick={()=>{try{localStorage.removeItem(SAVE);}catch(e){}setGs(mkGs(np));setHasSave(false);setScreen('game');}} style={{padding:'14px 56px',background:T.text,color:'#FFF',fontWeight:700,fontSize:13,letterSpacing:3,textTransform:'uppercase',border:'none',borderRadius:12,cursor:'pointer',marginTop:6,boxShadow:'0 4px 20px rgba(0,0,0,0.15)'}}>
        START GAME →
      </button>
      {hasSave && (
        <button onClick={()=>{try{const d=JSON.parse(localStorage.getItem(SAVE));setGs(d.gs);setNp(d.np||2);setScreen('game');}catch(e){}}} style={{padding:'9px 28px',background:'transparent',color:T.textMuted,fontWeight:600,fontSize:10,letterSpacing:2,border:`1px solid ${T.border}`,borderRadius:10,cursor:'pointer'}}>
          ↩ CONTINUE SAVED GAME
        </button>
      )}
    </div>
  );

  if (!gs) return null;

  const cp = gs.cur, curPl = gs.players[cp];
  const isMoving = gs.phase === 'moving' || !!anim;
  const hovCell = hov !== null ? CELLS[hov] : null;
  const myProps = CELLS.filter(c => c.type==='property' && gs.props[c.id]===cp);
  const myGroups = [...new Set(myProps.map(c => c.group))];
  const upgradeable = gs.phase==='action' && !gs.modal && !gs.trade && !gs.winner
    ? Object.keys(GC).filter(grp => {
        const gc = CELLS.filter(c => c.type==='property' && c.group===grp);
        return gc.every(c => gs.props[c.id]===cp) && gs.hq[grp]!==cp && curPl.money>=200 && !gc.some(c=>gs.mortgaged[c.id]);
      })
    : [];
  const myTradeProps = CELLS.filter(c => c.type==='property' && gs.props[c.id]===cp && !gs.mortgaged[c.id]);
  const tgtPlayer = tTgt !== null ? gs.players[tTgt] : null;
  const tgtProps = tTgt !== null ? CELLS.filter(c => c.type==='property' && gs.props[c.id]===tTgt) : [];
  const canTrade = gs.players.filter(p => !p.bankrupt && p.id!==cp).length > 0;

  const cardStyle = { background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:'10px 12px', boxShadow:T.shadow };
  const labelStyle = { color:T.textFaint, fontSize:8, letterSpacing:1.5, marginBottom:6, fontWeight:700, textTransform:'uppercase' };

  return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',flexDirection:'column',alignItems:'center',fontFamily:"'Inter',system-ui,sans-serif",padding:12,userSelect:'none',position:'relative',color:T.text}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}} @keyframes popIn{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      input[type="text"]:focus, input[type="number"]:focus { outline: none; border-color: #2563EB !important; }
      `}</style>

      <div style={{display:'flex',gap:12,width:'100%',maxWidth:840,alignItems:'flex-start'}}>

        {/* BOARD */}
        <div style={{flexShrink:0}}>
          <div style={{display:'grid',gridTemplateColumns:'72px repeat(6,1fr) 72px',gridTemplateRows:'72px repeat(6,1fr) 72px',width:560,height:560,background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',boxShadow:T.shadow}}>
            {CELLS.map(c => renderCell(c))}

            {/* CENTER — Chat & Log tabs */}
            <div style={{gridRow:'2/8',gridColumn:'2/8',background:T.surface2,display:'flex',flexDirection:'column',borderTop:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`}}>

              {/* Header with title + tabs */}
              <div style={{padding:'8px 12px 6px',borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontSize:16}}>🌍</span>
                    <span style={{color:T.text,fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase'}}>Brand Empire</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {gs.players.map((p,i) => (
                      <div key={p.id} style={{display:'flex',alignItems:'center',gap:2,opacity:p.bankrupt?.3:1}}>
                        <span style={{color:p.color,fontSize:11,filter:cp===i&&!p.bankrupt?`drop-shadow(0 0 3px ${p.color})`:'none'}}>{p.shape}</span>
                        <span style={{color:T.gold,fontSize:9,fontWeight:700}}>${p.money}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{display:'flex',gap:4}}>
                  <button onClick={()=>setCenterTab('chat')} style={{flex:1,padding:'5px 0',background:centerTab==='chat'?T.surface:'transparent',color:centerTab==='chat'?T.text:T.textMuted,border:`1px solid ${centerTab==='chat'?T.border:'transparent'}`,borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',letterSpacing:0.5}}>
                    💬 Chat{gs.chat?.length?` (${gs.chat.length})`:''}
                  </button>
                  <button onClick={()=>setCenterTab('log')} style={{flex:1,padding:'5px 0',background:centerTab==='log'?T.surface:'transparent',color:centerTab==='log'?T.text:T.textMuted,border:`1px solid ${centerTab==='log'?T.border:'transparent'}`,borderRadius:6,fontSize:10,fontWeight:600,cursor:'pointer',letterSpacing:0.5}}>
                    📜 Log
                  </button>
                </div>
              </div>

              {/* Content area */}
              {centerTab === 'chat' ? (
                <>
                  <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'8px 12px',minHeight:0}}>
                    {(!gs.chat || gs.chat.length===0) && (
                      <div style={{color:T.textFaint,fontSize:10,textAlign:'center',marginTop:20,lineHeight:1.6}}>
                        No messages yet.<br/>Start the conversation!<br/>
                        <span style={{fontSize:14,opacity:0.6}}>💬</span>
                      </div>
                    )}
                    {gs.chat?.map((m,i) => {
                      const p = gs.players[m.pid];
                      return (
                        <div key={i} style={{marginBottom:6,display:'flex',gap:6,alignItems:'flex-start',animation:'fadeIn .2s ease'}}>
                          <span style={{color:p.color,fontSize:12,flexShrink:0,marginTop:1}}>{p.shape}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{color:p.color,fontSize:9,fontWeight:700,marginBottom:1}}>{p.name}</div>
                            <div style={{color:T.text,fontSize:11,lineHeight:1.4,wordBreak:'break-word'}}>{m.text}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{padding:'6px 8px',borderTop:`1px solid ${T.border}`,background:T.surface,display:'flex',gap:4,flexShrink:0}}>
                    <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChat();}} placeholder={`${curPl.name} says...`} style={{flex:1,padding:'6px 10px',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:6,color:T.text,fontSize:11,fontFamily:'inherit'}} />
                    <button onClick={sendChat} disabled={!chatInput.trim()} style={{padding:'6px 12px',background:chatInput.trim()?T.text:T.surface2,color:chatInput.trim()?'#FFF':T.textFaint,border:'none',borderRadius:6,fontSize:10,fontWeight:700,cursor:chatInput.trim()?'pointer':'not-allowed',letterSpacing:0.5}}>→</button>
                  </div>
                </>
              ) : (
                <div ref={logRef} style={{flex:1,overflowY:'auto',padding:'8px 12px',minHeight:0}}>
                  {gs.log.map((e,i) => (
                    <div key={i} style={{color:i===gs.log.length-1?T.text:T.textMuted,fontSize:10,lineHeight:1.8,fontWeight:i===gs.log.length-1?600:400,animation:i===gs.log.length-1?'fadeIn .3s ease':'none'}}>
                      {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{height:22,marginTop:6,fontSize:10,color:T.textMuted,display:'flex',alignItems:'center',justifyContent:'center'}}>
            {hovCell?.type==='property'
              ? `${GI[hovCell.group]} ${hovCell.name} · $${hovCell.price} · Rent $${hovCell.rent}${gs.hq[hovCell.group]!==undefined?' · 🏢 HQ':''}${gs.mortgaged[hovCell.id]?' · 💤 mortgaged':''}`
              : hovCell ? `${hovCell.icon||''} ${hovCell.name}` : ''}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{flex:1,display:'flex',flexDirection:'column',gap:8,minWidth:0}}>

          {/* Current player */}
          <div style={{...cardStyle, borderLeft:`4px solid ${curPl.color}`}}>
            <div style={labelStyle}>Current Turn</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:curPl.color,fontSize:26,filter:`drop-shadow(0 0 4px ${curPl.color}66)`}}>{curPl.shape}</span>
              <div style={{flex:1}}>
                <div style={{color:T.text,fontSize:13,fontWeight:700}}>{curPl.name}</div>
                <div style={{color:T.gold,fontSize:16,fontWeight:800}}>${curPl.money}</div>
              </div>
              {isMoving && <div style={{color:T.gold,fontSize:9,fontWeight:600,animation:'pulse 1s infinite'}}>Moving…</div>}
            </div>
            <div style={{display:'flex',gap:5,marginTop:8,paddingTop:7,borderTop:`1px solid ${T.border}`}}>
              <button onClick={()=>setSoundOn(s=>!s)} style={{flex:1,padding:'4px 0',background:soundOn?'#EFF6FF':T.surface,color:soundOn?'#2563EB':T.textMuted,border:`1px solid ${soundOn?'#BFDBFE':T.border}`,borderRadius:6,fontSize:9,cursor:'pointer',fontWeight:600}}>{soundOn?'🔊 Sound':'🔇 Muted'}</button>
              <button onClick={()=>setMotionOn(m=>!m)} style={{flex:1,padding:'4px 0',background:motionOn?'#EFF6FF':T.surface,color:motionOn?'#2563EB':T.textMuted,border:`1px solid ${motionOn?'#BFDBFE':T.border}`,borderRadius:6,fontSize:9,cursor:'pointer',fontWeight:600}}>{motionOn?'⚡ Motion':'🧊 Instant'}</button>
            </div>
          </div>

          {/* Dice */}
          <div style={cardStyle}>
            <div style={labelStyle}>Dice</div>
            <div style={{display:'flex',gap:10,justifyContent:'center',marginBottom:8}}>
              <Die v={gs.dice[0]} rolling={rolling} mo={motionOn} />
              <Die v={gs.dice[1]} rolling={rolling} mo={motionOn} />
            </div>
            <div style={{textAlign:'center',color:T.textMuted,fontSize:10,marginBottom:8}}>
              {gs.dice[0]} + {gs.dice[1]} = <strong style={{color:T.text,fontSize:11}}>{gs.dice[0]+gs.dice[1]}</strong>
            </div>
            <button onClick={doRoll} disabled={rolling||gs.phase!=='roll'||!!gs.winner||isMoving} style={{width:'100%',padding:'10px 0',background:(rolling||gs.phase!=='roll'||isMoving)?T.surface2:T.text,color:(rolling||gs.phase!=='roll'||isMoving)?T.textFaint:'#FFF',fontWeight:700,fontSize:11,letterSpacing:1,textTransform:'uppercase',border:'none',borderRadius:8,cursor:(rolling||gs.phase!=='roll'||isMoving)?'not-allowed':'pointer'}}>
              {rolling ? '⏳ Rolling…' : isMoving ? '⏳ Moving…' : '🎲 Roll Dice'}
            </button>
          </div>

          {/* Action row */}
          {gs.phase==='action' && !gs.modal && !gs.trade && !gs.winner && (
            <div style={{display:'flex',gap:6}}>
              <button onClick={openTrade} disabled={!canTrade} style={{flex:1,padding:'8px 0',background:canTrade?'#EFF6FF':T.surface,color:canTrade?'#2563EB':T.textFaint,border:`1px solid ${canTrade?'#BFDBFE':T.border}`,borderRadius:8,fontSize:10,fontWeight:700,cursor:canTrade?'pointer':'not-allowed',letterSpacing:0.5,textTransform:'uppercase'}}>🤝 Trade</button>
              <button onClick={endTurn} style={{flex:2,padding:'8px 0',background:T.surface,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:8,fontSize:10,fontWeight:700,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>End Turn →</button>
            </div>
          )}

          {/* HQ Upgrades */}
          {upgradeable.length > 0 && (
            <div style={{...cardStyle,background:'#F0FDF4',borderColor:'#BBF7D0'}}>
              <div style={{...labelStyle,color:'#16A34A'}}>🏢 Upgrade to HQ — ×4 Rent</div>
              {upgradeable.map(grp => (
                <div key={grp} style={{display:'flex',alignItems:'center',gap:7,marginBottom:5}}>
                  <div style={{width:8,height:8,borderRadius:2,background:GC[grp],flexShrink:0}} />
                  <span style={{color:T.text,fontSize:10,flex:1,fontWeight:500}}>{GI[grp]} {GL[grp]}</span>
                  <button onClick={()=>buyHQ(grp)} style={{padding:'4px 10px',background:GC[grp],color:'#FFF',border:'none',borderRadius:6,fontSize:9,fontWeight:700,cursor:'pointer',letterSpacing:0.3}}>HQ $200</button>
                </div>
              ))}
            </div>
          )}

          {/* My Brands */}
          {myProps.length > 0 && gs.phase==='action' && !gs.modal && !gs.trade && !gs.winner && (
            <div style={cardStyle}>
              <button onClick={()=>setShowMyProps(s=>!s)} style={{width:'100%',background:'transparent',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',padding:0}}>
                <span style={labelStyle}>My Brands ({myProps.length})</span>
                <span style={{color:T.textMuted,fontSize:10}}>{showMyProps?'▲':'▼'}</span>
              </button>
              {showMyProps && (
                <div style={{marginTop:8,maxHeight:160,overflowY:'auto'}}>
                  {myGroups.filter(g=>gs.hq[g]===cp).map(g => (
                    <button key={g} onClick={()=>sellHQ(g)} style={{width:'100%',marginBottom:4,padding:'5px 0',background:T.surface2,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:6,fontSize:9,cursor:'pointer',fontWeight:600}}>Sell {GL[g]} HQ → +$100</button>
                  ))}
                  {myProps.map(c => {
                    const m = gs.mortgaged[c.id], cost = Math.ceil(c.price/2*1.1), canUnm = curPl.money>=cost, hasHq = gs.hq[c.group]===cp;
                    return (
                      <div key={c.id} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4,padding:'5px 7px',background:T.surface2,borderRadius:6,border:`1px solid ${T.border}`}}>
                        <span style={{fontSize:11}}>{GI[c.group]}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{color:m?T.textFaint:T.text,fontSize:9,fontWeight:600}}>{c.name}</div>
                          <div style={{color:T.textFaint,fontSize:8}}>{m?`Redeem $${cost}`:hasHq?'🏢 HQ':`$${c.price}`}</div>
                        </div>
                        {m
                          ? <button onClick={()=>unmortgageProp(c.id)} disabled={!canUnm} style={{padding:'3px 7px',background:canUnm?'#16A34A':T.surface,color:canUnm?'#FFF':T.textFaint,border:`1px solid ${canUnm?'#16A34A':T.border}`,borderRadius:5,fontSize:8,cursor:canUnm?'pointer':'not-allowed',fontWeight:700}}>-${cost}</button>
                          : <button onClick={()=>mortgageProp(c.id)} disabled={hasHq} style={{padding:'3px 7px',background:hasHq?T.surface:'#FEE2E2',color:hasHq?T.textFaint:'#DC2626',border:`1px solid ${hasHq?T.border:'#FECACA'}`,borderRadius:5,fontSize:8,cursor:hasHq?'not-allowed':'pointer',fontWeight:700}}>+${Math.floor(c.price/2)}</button>
                        }
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Scoreboard */}
          <div style={cardStyle}>
            <div style={labelStyle}>Scoreboard</div>
            {gs.players.map((p,i) => {
              const brands = Object.values(gs.props).filter(v=>v===i).length;
              const hqs = Object.values(gs.hq).filter(v=>v===i).length;
              return (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 6px',borderRadius:6,marginBottom:2,opacity:p.bankrupt?.35:1,background:cp===i&&!p.bankrupt?T.surface2:'transparent',border:`1px solid ${cp===i&&!p.bankrupt?p.color+'44':'transparent'}`}}>
                  <span style={{color:p.color,fontSize:14}}>{p.shape}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:T.text,fontSize:10,fontWeight:600}}>{p.name}{p.bankrupt?' 💀':cp===i?' ◀':''}</div>
                    <div style={{display:'flex',gap:8}}>
                      <span style={{color:T.gold,fontSize:10,fontWeight:700}}>${p.money}</span>
                      <span style={{color:T.textFaint,fontSize:9}}>{brands} brands{hqs>0?` · ${hqs}🏢`:''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={()=>setScreen('setup')} style={{padding:'6px 0',background:'transparent',color:T.textFaint,border:`1px solid ${T.border}`,borderRadius:8,fontSize:9,cursor:'pointer',letterSpacing:1,fontWeight:600}}>↩ New Game</button>
        </div>
      </div>

      {/* TRADE MODAL */}
      {gs.trade && !gs.winner && (
        <div style={{position:'absolute',inset:0,background:'rgba(30,30,30,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:100,minHeight:'100%',backdropFilter:'blur(4px)'}}>
          <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:16,padding:'22px 24px',maxWidth:420,width:'93%',animation:'popIn .25s ease',boxShadow:'0 20px 60px rgba(0,0,0,0.15)'}}>

            {gs.trade.step === 'propose' && (
              <div>
                <div style={{color:T.text,fontSize:15,fontWeight:700,marginBottom:14,textAlign:'center'}}>🤝 Propose Trade</div>
                <div style={{marginBottom:12}}>
                  <div style={{color:T.textFaint,fontSize:8,letterSpacing:1.5,marginBottom:6,fontWeight:700,textTransform:'uppercase'}}>Trade With</div>
                  <div style={{display:'flex',gap:6}}>
                    {gs.players.filter(p => !p.bankrupt && p.id!==cp).map(p => (
                      <button key={p.id} onClick={()=>{setTTgt(p.id);setTRP([]);}} style={{flex:1,padding:'10px 4px',borderRadius:10,cursor:'pointer',background:tTgt===p.id?p.color+'18':T.surface2,border:`1px solid ${tTgt===p.id?p.color:T.border}`,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                        <span style={{color:p.color,fontSize:18}}>{p.shape}</span>
                        <span style={{color:T.text,fontSize:9,fontWeight:600}}>{p.name}</span>
                        <span style={{color:T.gold,fontSize:9,fontWeight:700}}>${p.money}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14}}>
                  <div>
                    <div style={{color:T.textFaint,fontSize:8,marginBottom:5,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>You Offer $</div>
                    <input type="number" min="0" max={curPl.money} value={tOM} onChange={e=>setTOM(e.target.value)} style={{width:'100%',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:6,color:T.gold,fontSize:12,padding:'6px 8px',fontWeight:700,boxSizing:'border-box',marginBottom:6,fontFamily:'inherit'}} />
                    <div style={{maxHeight:120,overflowY:'auto'}}>
                      {myTradeProps.length===0 && <div style={{color:T.textFaint,fontSize:9}}>No brands to offer</div>}
                      {myTradeProps.map(c => (
                        <label key={c.id} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',cursor:'pointer',borderRadius:4,marginBottom:2,background:tOP.includes(c.id)?GC[c.group]+'15':'transparent'}}>
                          <input type="checkbox" checked={tOP.includes(c.id)} onChange={()=>toggleP(setTOP,c.id)} />
                          <span style={{color:T.text,fontSize:9}}>{GI[c.group]} {c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{color:T.textFaint,fontSize:8,marginBottom:5,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>You Request $</div>
                    <input type="number" min="0" max={tgtPlayer?.money||0} value={tRM} onChange={e=>setTRM(e.target.value)} style={{width:'100%',background:T.surface2,border:`1px solid ${T.border}`,borderRadius:6,color:T.gold,fontSize:12,padding:'6px 8px',fontWeight:700,boxSizing:'border-box',marginBottom:6,fontFamily:'inherit'}} />
                    <div style={{maxHeight:120,overflowY:'auto'}}>
                      {!tgtPlayer && <div style={{color:T.textFaint,fontSize:9}}>Select player first</div>}
                      {tgtPlayer && tgtProps.length===0 && <div style={{color:T.textFaint,fontSize:9}}>No brands</div>}
                      {tgtProps.map(c => (
                        <label key={c.id} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',cursor:'pointer',borderRadius:4,marginBottom:2,background:tRP.includes(c.id)?GC[c.group]+'15':'transparent'}}>
                          <input type="checkbox" checked={tRP.includes(c.id)} onChange={()=>toggleP(setTRP,c.id)} />
                          <span style={{color:T.text,fontSize:9}}>{GI[c.group]} {c.name}{gs.mortgaged[c.id]?' 💤':''}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={closeTrade} style={{flex:1,padding:'9px 0',background:T.surface,color:T.textMuted,border:`1px solid ${T.border}`,borderRadius:8,fontSize:10,cursor:'pointer',fontWeight:700,letterSpacing:0.5,textTransform:'uppercase'}}>Cancel</button>
                  <button onClick={proposeTrade} disabled={tTgt===null} style={{flex:2,padding:'9px 0',background:tTgt!==null?T.text:T.surface2,color:tTgt!==null?'#FFF':T.textFaint,border:'none',borderRadius:8,fontSize:10,fontWeight:700,cursor:tTgt!==null?'pointer':'not-allowed',letterSpacing:0.5,textTransform:'uppercase'}}>Send Offer →</button>
                </div>
              </div>
            )}

            {gs.trade?.step === 'review' && (
              <div>
                <div style={{textAlign:'center',marginBottom:14}}>
                  <div style={{color:T.text,fontSize:14,fontWeight:700,marginBottom:3}}>📱 Pass device to {gs.players[gs.trade.to].name}</div>
                  <div style={{color:T.textFaint,fontSize:10}}>Trade offer from {gs.players[gs.trade.from].name}</div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center',marginBottom:16}}>
                  <div style={{background:T.surface2,borderRadius:10,padding:'12px 8px',textAlign:'center',border:`1px solid ${T.border}`}}>
                    <div style={{color:gs.players[gs.trade.from].color,fontSize:12,marginBottom:6,fontWeight:600}}>{gs.players[gs.trade.from].shape} {gs.players[gs.trade.from].name}</div>
                    {gs.trade.om>0 && <div style={{color:T.gold,fontSize:14,fontWeight:700,marginBottom:3}}>${gs.trade.om}</div>}
                    {gs.trade.op.map(cid => <div key={cid} style={{color:T.textMuted,fontSize:9,lineHeight:1.8}}>{GI[CELLS[cid].group]} {CELLS[cid].name}</div>)}
                  </div>
                  <div style={{color:T.textMuted,fontSize:22}}>⇄</div>
                  <div style={{background:T.surface2,borderRadius:10,padding:'12px 8px',textAlign:'center',border:`1px solid ${T.border}`}}>
                    <div style={{color:gs.players[gs.trade.to].color,fontSize:12,marginBottom:6,fontWeight:600}}>{gs.players[gs.trade.to].shape} {gs.players[gs.trade.to].name}</div>
                    {gs.trade.rm>0 && <div style={{color:T.gold,fontSize:14,fontWeight:700,marginBottom:3}}>${gs.trade.rm}</div>}
                    {gs.trade.rp.map(cid => <div key={cid} style={{color:T.textMuted,fontSize:9,lineHeight:1.8}}>{GI[CELLS[cid].group]} {CELLS[cid].name}</div>)}
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={closeTrade} style={{flex:1,padding:'11px 0',background:'#DC2626',color:'#FFF',border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>✕ Reject</button>
                  <button onClick={acceptTrade} style={{flex:2,padding:'11px 0',background:'#16A34A',color:'#FFF',border:'none',borderRadius:10,fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:0.5,textTransform:'uppercase'}}>✓ Accept</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME MODALS */}
      {gs.modal && !gs.winner && (
        gs.modal.t==='buy'  ? <BuyModal  cell={CELLS[gs.modal.cid]} curPl={curPl} onBuy={buyProp} onPass={closeModal} /> :
        gs.modal.t==='rent' ? <RentModal rent={gs.modal.rent} own={gs.modal.own} mult={gs.modal.mult} onClose={closeModal} /> :
        gs.modal.t==='card' ? <CardModal kind={gs.modal.kind} card={gs.modal.card} onClose={closeModal} /> :
        gs.modal.t==='tax'  ? <TaxModal  onClose={closeModal} /> :
        gs.modal.t==='jail' ? <JailModal onClose={closeModal} /> : null
      )}

      {/* WINNER */}
      {gs.winner && (
        <div style={{position:'absolute',inset:0,background:'rgba(30,30,30,0.6)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200,minHeight:'100%',backdropFilter:'blur(6px)'}}>
          <div style={{background:T.surface,border:`2px solid ${gs.winner.color}`,borderRadius:20,padding:'36px 52px',textAlign:'center',animation:'popIn .4s ease',boxShadow:`0 30px 80px ${gs.winner.color}44`}}>
            <div style={{fontSize:56,marginBottom:10}}>🏆</div>
            <div style={{color:gs.winner.color,fontSize:30,fontWeight:800,letterSpacing:3,marginBottom:4}}>{gs.winner.name}</div>
            <div style={{color:T.gold,fontSize:14,fontWeight:700,marginBottom:4,letterSpacing:2,textTransform:'uppercase'}}>Wins the Empire!</div>
            <div style={{color:T.textFaint,fontSize:11}}>${gs.winner.money} remaining</div>
            <button onClick={()=>{try{localStorage.removeItem(SAVE);}catch(e){}setHasSave(false);setScreen('setup');}} style={{marginTop:22,padding:'13px 40px',background:T.text,color:'#FFF',fontWeight:700,fontSize:12,letterSpacing:2,border:'none',borderRadius:12,cursor:'pointer',textTransform:'uppercase'}}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}