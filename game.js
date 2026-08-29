/* ЧЕСТНЫЙ ГЕНЕРАТОР СЛУЧАЙНЫХ ЧИСЕЛ: crypto.getRandomValues + rejection sampling */
const RNG = (function(){
  const cr = (typeof window !== 'undefined') && (window.crypto || window.msCrypto);
  const hasCrypto = !!(cr && cr.getRandomValues);
  const POOL = hasCrypto ? new Uint32Array(256) : null;
  let pos = POOL ? POOL.length : 0;
  function nextWord(){
    if(!hasCrypto) return Math.floor(Math.random() * 4294967296);
    if(pos >= POOL.length){ cr.getRandomValues(POOL); pos = 0; }
    return POOL[pos++];
  }
  function int(n){
    n = Math.floor(n);
    if(n <= 1) return 0;
    const limit = Math.floor(4294967296 / n) * n;
    let w = nextWord(), guard = 0;
    while(w >= limit && guard++ < 64) w = nextWord();
    return w % n;
  }
  return { int: int, float: function(){ return nextWord() / 4294967296; },
           die: function(){ return 1 + int(6); }, secure: hasCrypto };
})();
(function(){
"use strict";

const L = 6;
const W = 7;
const N = 2 * L + W;
const C = L + Math.floor(W/2);
const HOME_LEN = 4;

function buildBoard(){
  const ring = [];
  for(let c = L; c <= L + W - 1; c++) ring.push([0, c]);
  for(let r = 1; r <= L; r++) ring.push([r, L + W - 1]);
  for(let c = L + W; c <= N - 1; c++) ring.push([L, c]);
  for(let r = L + 1; r <= L + W - 1; r++) ring.push([r, N - 1]);
  for(let c = N - 2; c >= L + W - 1; c--) ring.push([L + W - 1, c]);
  for(let r = L + W; r <= N - 1; r++) ring.push([r, L + W - 1]);
  for(let c = L + W - 2; c >= L; c--) ring.push([N - 1, c]);
  for(let r = N - 2; r >= L + W - 1; r--) ring.push([r, L]);
  for(let c = L - 1; c >= 0; c--) ring.push([L + W - 1, c]);
  for(let r = L + W - 2; r >= L; r--) ring.push([r, 0]);
  for(let c = 1; c <= L; c++) ring.push([L, c]);
  for(let r = L - 1; r >= 1; r--) ring.push([r, L]);

  const entryIdx = {
    top: ring.findIndex(([r,c]) => r===0 && c===L+W-1),      
    right: ring.findIndex(([r,c]) => r===L+W-1 && c===N-1),  
    bottom: ring.findIndex(([r,c]) => r===N-1 && c===L),     
    left: ring.findIndex(([r,c]) => r===L && c===0)          
  };

  const homeStretches = {
    top:    [[1, C], [2, C], [3, C], [4, C]],      
    right:  [[C, N-2], [C, N-3], [C, N-4], [C, N-5]], 
    bottom: [[N-2, C], [N-3, C], [N-4, C], [N-5, C]], 
    left:   [[C, 1], [C, 2], [C, 3], [C, 4]]       
  };

  return { ring, entryIdx, homeStretches, ringLen:ring.length };
}

const BOARD = buildBoard();
const RING_LEN = BOARD.ringLen; 

function computeLapSteps() {
  const xCellIdx = BOARD.ring.findIndex(([r,c]) => r===0 && c===C);
  const entry = BOARD.entryIdx['top'];
  let dist = xCellIdx - entry;
  if (dist < 0) dist += RING_LEN;
  return dist + 1;
}
const LAP_STEPS = computeLapSteps(); 
const FINISH_STEP = LAP_STEPS + HOME_LEN - 1;

const DIRS = ['top','right','bottom','left'];
const COLOR = {
  top:   { name:'Жёлтые',  hex:'#f0b02b', dark:'#a06f12', icon:'🟡' },
  right: { name:'Синие',   hex:'#4a92d6', dark:'#1d5c94', icon:'🔵' },
  bottom:{ name:'Красные',  hex:'#e0524c', dark:'#8e1f1c', icon:'🔴' },
  left:  { name:'Зелёные', hex:'#57a05e', dark:'#2c6234', icon:'🟢' },
};
const TEAM_OF = { top:'A', bottom:'A', left:'B', right:'B' };
const PARTNER_DIR = { top:'bottom', bottom:'top', left:'right', right:'left' };

const BASE_SLOTS = {
  top:    [[1,14], [1,17], [4,14], [4,17]], 
  right:  [[14,14], [14,17], [17,14], [17,17]], 
  bottom: [[14,1], [14,4], [17,1], [17,4]], 
  left:   [[1,1], [1,4], [4,1], [4,4]], 
};

const CORNER_CELLS = {
  tl: [L, L],                   
  tr: [L, L+W-1],               
  br: [L+W-1, L+W-1],           
  bl: [L+W-1, L],               
};
const CORNER_NEXT = { tl:'tr', tr:'br', br:'bl', bl:'tl' }; 
const CORNER_KEY_TO_NEXT_RINGIDX = {};
Object.keys(CORNER_CELLS).forEach(k=>{
  const cell = CORNER_CELLS[k];
  const nc = CORNER_CELLS[CORNER_NEXT[k]];
  const idx = BOARD.ring.findIndex(([r,c])=>r===nc[0]&&c===nc[1]);
  CORNER_KEY_TO_NEXT_RINGIDX[cell[0]+','+cell[1]] = idx;
});

function isCornerCell(cell){ return !!cell && (cell[0]+','+cell[1]) in CORNER_KEY_TO_NEXT_RINGIDX; }
function nextCornerRingIdx(cell){ return CORNER_KEY_TO_NEXT_RINGIDX[cell[0]+','+cell[1]]; }

function stepToCell(dir, step, lap){
  if(step < 0) return null;
  if (step >= LAP_STEPS && step <= FINISH_STEP && lap === 0) {
     return BOARD.homeStretches[dir][step - LAP_STEPS];
  }
  if (step >= LAP_STEPS + RING_LEN && step <= FINISH_STEP + RING_LEN && lap === 1) {
     return BOARD.homeStretches[dir][step - (LAP_STEPS + RING_LEN)];
  }
  const idx = (BOARD.entryIdx[dir] + step) % RING_LEN;
  return BOARD.ring[idx];
}
function sameCell(a,b){ return a&&b&&a[0]===b[0]&&a[1]===b[1]; }

let players = [];
let currentIdx = 0;
let diceValue = 1;

/* ====== 11. ПРОВЕРЯЕМЫЙ КУБИК (commit-reveal) ======
   Вся последовательность бросков определена секретным seed'ом ДО первого хода.
   Бросок №n = SHA-256(seed + ':' + n + ':0') -> первый байт mod 6 + 1.
   Игра не видит поля при генерации: вход — только seed и номер броска. */
const SHA_K = [1116352408,1899447441,3049323471,3921009573,961987163,1508970993,2453635748,2870763221,3624381080,310598401,607225278,1426881987,1925078388,2162078206,2614888103,3248222580,3835390401,4022224774,264347078,604807628,770255983,1249150122,1555081692,1996064986,2554220882,2821834349,2952996808,3210313671,3336571891,3584528711,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,2177026350,2456956037,2730485921,2820302411,3259730800,3345764771,3516065817,3600352804,4094571909,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,2227730452,2361852424,2428436474,2756734187,3204031479,3329325298];
function sha256hex(msg){
  const bytes = [];
  for(let i = 0; i < msg.length; i++){
    const c = msg.charCodeAt(i);
    if(c < 128) bytes.push(c);
    else if(c < 2048){ bytes.push(192 | (c >> 6), 128 | (c & 63)); }
    else { bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63)); }
  }
  const bitLen = bytes.length * 8;
  bytes.push(128);
  while(bytes.length % 64 !== 56) bytes.push(0);
  for(let i = 7; i >= 0; i--) bytes.push((i < 4) ? ((bitLen >>> (i * 8)) & 255) : 0);
  let h0=1779033703,h1=3144134277,h2=1013904242,h3=2773480762,h4=1359893119,h5=2600822924,h6=528734635,h7=1541459225;
  const w = new Array(64);
  for(let off = 0; off < bytes.length; off += 64){
    for(let i = 0; i < 16; i++){
      w[i] = ((bytes[off+i*4] << 24) | (bytes[off+i*4+1] << 16) | (bytes[off+i*4+2] << 8) | bytes[off+i*4+3]) | 0;
    }
    for(let i = 16; i < 64; i++){
      const a = w[i-15], b = w[i-2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for(let i = 0; i < 64; i++){
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA_K[i] + w[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const mj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + mj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    h0=(h0+a)|0; h1=(h1+b)|0; h2=(h2+c)|0; h3=(h3+d)|0;
    h4=(h4+e)|0; h5=(h5+f)|0; h6=(h6+g)|0; h7=(h7+h)|0;
  }
  return [h0,h1,h2,h3,h4,h5,h6,h7].map(function(x){ return ((x >>> 0).toString(16)).padStart(8, '0'); }).join('');
}
function newDiceSeed(){
  let out = '';
  for(let i = 0; i < 8; i++) out += (RNG.int(65536)).toString(16).padStart(4, '0');
  return out;
}
let DICE_SEED = newDiceSeed();
let DICE_COMMIT = sha256hex(DICE_SEED);
let DICE_INDEX = 0;
let DICE_LOG = [];
function resetDiceSequence(){
  DICE_SEED = newDiceSeed();
  DICE_COMMIT = sha256hex(DICE_SEED);
  DICE_INDEX = 0;
  DICE_LOG = [];
}
/* бросок из заранее зафиксированной последовательности */
function fairDie(){
  const n = DICE_INDEX++;
  for(let k = 0; k < 64; k++){
    const byte = parseInt(sha256hex(DICE_SEED + ':' + n + ':' + k).slice(0, 2), 16);
    if(byte < 252){
      const v = 1 + (byte % 6);
      DICE_LOG.push({ n: n, v: v });
      if(DICE_LOG.length > 400) DICE_LOG.shift();
      return v;
    }
  }
  const v = RNG.die();
  DICE_LOG.push({ n: n, v: v });
  return v;
}

let rolling = false;
let mustPickPiece = false;
let movablePieces = [];
let selectedPiece = -1;
let validTargets = [];
let gameOver = false;
let gameMode = 'ffa';
let botDifficulty = 'normal';

let animState = null;
let poofs = [];


/* ---------- SPEED ---------- */
let gameSpeed = 'normal';
const SPEED_FACTOR = { slow: 1.6, normal: 1, fast: 0.5 };
let TURBO = false;
try{ window.__turbo = (v)=>{ TURBO = !!v; return TURBO; }; }catch(e){}
function sp(ms){ if(TURBO) return 0; return Math.max(30, Math.round(ms * (SPEED_FACTOR[gameSpeed] || 1))); }

/* ---------- HAPTICS ---------- */
const Haptic = {
  enabled: true,
  buzz(pattern){
    if(!this.enabled) return;
    if(navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
  },
  tap(){ this.buzz(9); },
  roll(power){ const k = Math.max(0.4, Math.min(2.6, power||1)); this.buzz([8, Math.round(14*k), 10, Math.round(26*k)]); },
  bounce(){ this.buzz(7); },
  land(){ this.buzz([18, 26]); },
  move(){ this.buzz(12); },
  capture(){ this.buzz([28, 40, 22, 70]); },
  teleport(){ this.buzz([10, 18, 10, 18, 28]); },
  trap(){ this.buzz([50, 70, 50]); },
  bonus(){ this.buzz([10, 22, 10]); },
  finish(){ this.buzz([16, 30, 16, 30, 60]); },
  win(){ this.buzz([30, 60, 30, 60, 90]); }
};

/* ============================================================
   БЛОК 3 · НАСТРОЙКИ · WAKE LOCK · ХАРАКТЕРЫ · ЧАТ · ЭФФЕКТЫ ·
            БОНУСЫ · КРЕЙЗИ-РЕЖИМ · MVP · СТАТИСТИКА · МЕНЮ
   ============================================================ */

/* ---------- 3.1 Настройки игрока ---------- */
const SET_KEY = 'mandashnya_settings_v1';
const Settings = {
  sound:true, haptic:true, chat:true, wake:true, fx:true, music:true, theme:'dark', scale:100, throwMode:'physics',
  load(){ try{ const d=JSON.parse(localStorage.getItem(SET_KEY)||'{}'); Object.keys(d).forEach(k=>{ if(k in this && typeof this[k] === 'boolean') this[k]=!!d[k]; }); if(d.theme === 'light' || d.theme === 'dark') this.theme = d.theme; if([85,100,120].indexOf(parseInt(d.scale,10)) >= 0) this.scale = parseInt(d.scale,10); if(d.throwMode === 'fast' || d.throwMode === 'physics' || d.throwMode === 'instant') this.throwMode = d.throwMode; }catch(e){} },
  save(){ try{ localStorage.setItem(SET_KEY, JSON.stringify({sound:this.sound,haptic:this.haptic,chat:this.chat,wake:this.wake,fx:this.fx,music:this.music,theme:this.theme,scale:this.scale,throwMode:this.throwMode})); }catch(e){} }
};
Settings.load();

/* ---------- 3.1b Оформление: ночная и дневная (солнечная) темы ---------- */
const THEMES = {
  dark: {
    boardBg:'#0c1c30', quad:'#132a45', cellTop:'#33587c', cellBot:'#24405e',
    cellLine:'rgba(175,220,255,0.34)', slot:'rgba(255,255,255,0.09)',
    arrowCell:'rgba(255,255,255,0.13)', crater:'rgba(2,8,16,0.96)',
    halo:'rgba(255,255,255,0.95)', pad:'rgba(240,176,43,0.30)',
    homeInner:'rgba(255,255,255,0.2)', watermark:0.08
  },
  light: {
    boardBg:'#eaf2fb', quad:'#c9dcf0', cellTop:'#ffffff', cellBot:'#dbe8f6',
    cellLine:'rgba(16,48,86,0.52)', slot:'rgba(18,48,82,0.16)',
    arrowCell:'rgba(18,48,82,0.14)', crater:'rgba(255,255,255,0.94)',
    halo:'rgba(10,30,54,0.92)', pad:'rgba(224,142,12,0.40)',
    homeInner:'rgba(255,255,255,0.42)', watermark:0.12
  }
};
function TH(){ return THEMES[Settings.theme === 'light' ? 'light' : 'dark']; }
function applyTheme(t){
  if(t){ Settings.theme = (t === 'light' ? 'light' : 'dark'); Settings.save(); }
  const light = Settings.theme === 'light';
  try{ document.body.classList.toggle('theme-light', light); }catch(e){}
  try{ const m = document.querySelector('meta[name="theme-color"]'); if(m) m.setAttribute('content', light ? '#e6eff9' : '#050c18'); }catch(e){}
  try{ if(typeof ctx !== 'undefined' && ctx) draw(); }catch(e){}
}
applyTheme();

/* ---------- 3.1c Масштаб интерфейса 85 / 100 / 120 % ---------- */
function applyScale(v){
  if(v){ const n = parseInt(v,10); if([85,100,120].indexOf(n) >= 0){ Settings.scale = n; Settings.save(); } }
  const app = document.getElementById('app');
  if(app){
    const k = (Settings.scale || 100)/100;
    app.style.zoom = (k === 1 ? '' : String(k));
    if(k === 1){
      app.style.height = '';
      app.style.width = '';
    } else {
      /* zoom не пересчитывает vh/vw: задаём размер в px с учётом масштаба */
      app.style.height = Math.round(window.innerHeight / k) + 'px';
      app.style.width = Math.round(window.innerWidth / k) + 'px';
    }
  }
  try{ if(typeof resizeCanvas === 'function') resizeCanvas(); }catch(e){}
}
window.addEventListener('resize', function(){ try{ applyScale(); }catch(e){} });
window.addEventListener('orientationchange', function(){ setTimeout(function(){ try{ applyScale(); }catch(e){} }, 250); });
try{ applyScale(); }catch(e){}

/* ---------- 3.1d Фоновая музыка: два процедурных настроения ---------- */
const Music = (function(){
  let ac = null, master = null, timer = null, step = 0, mood = 'calm', on = false;
  const SCALE = [0, 3, 5, 7, 10, 12];
  function ctxAudio(){
    if(!ac){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.0001;
      master.connect(ac.destination);
    }
    if(ac.state === 'suspended'){ try{ ac.resume(); }catch(e){} }
    return ac;
  }
  function note(freq, dur, type, vol, when){
    const c = ctxAudio(); if(!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(master);
    o.start(when); o.stop(when + dur + 0.06);
  }
  function tick(){
    const c = ctxAudio(); if(!c){ on = false; return; }
    const t = c.currentTime + 0.06;
    const tense = (mood === 'tense');
    const root = tense ? 116.5 : 98;
    const beat = tense ? 0.30 : 0.44;
    if(step % 4 === 0) note(root/2, beat*3.6, 'triangle', 0.20, t);
    if(step % 2 === 0){
      const semi = SCALE[Math.floor(step/2) % SCALE.length];
      note(root * Math.pow(2, semi/12) * 2, beat*1.5, 'sine', 0.085, t);
    }
    if(tense && step % 4 === 2) note(root * 1.5, beat*0.8, 'sawtooth', 0.045, t);
    if(!tense && step % 8 === 5) note(root * 3, beat*1.1, 'sine', 0.05, t);
    step++;
    timer = setTimeout(tick, beat*1000);
  }
  return {
    start(){
      if(on) return;
      const c = ctxAudio(); if(!c) return;
      on = true; step = 0;
      try{
        master.gain.cancelScheduledValues(c.currentTime);
        master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), c.currentTime);
        master.gain.linearRampToValueAtTime(0.55, c.currentTime + 2.2);
      }catch(e){}
      tick();
    },
    stop(){
      if(!on) return;
      on = false;
      if(timer){ clearTimeout(timer); timer = null; }
      try{ master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(0.0001, ac.currentTime + 1.1); }catch(e){}
    },
    setMood(m){
      m = (m === 'tense') ? 'tense' : 'calm';
      if(m === mood) return;
      mood = m;
      if(on && ac){
        try{
          master.gain.cancelScheduledValues(ac.currentTime);
          master.gain.setValueAtTime(master.gain.value, ac.currentTime);
          master.gain.linearRampToValueAtTime(0.16, ac.currentTime + 0.55);
          master.gain.linearRampToValueAtTime(0.55, ac.currentTime + 1.8);
        }catch(e){}
      }
    },
    isOn(){ return on; }
  };
})();
function musicMood(){
  try{
    let mx = 0;
    (players||[]).forEach(p=>{ mx = Math.max(mx, getHomeCount(p)); });
    return mx >= 3 ? 'tense' : 'calm';
  }catch(e){ return 'calm'; }
}
function musicSync(){
  try{
    if(Settings.music && inGame() && !gameOver) Music.start(); else Music.stop();
    Music.setMood(musicMood());
  }catch(e){}
}

/* ---------- 3.2 Wake Lock API: экран не гаснет ---------- */
let wakeLock = null;
function inGame(){ const g = document.getElementById('game'); return !!g && g.style.display === 'flex'; }
async function requestWakeLock(){
  if(!Settings.wake) return;
  try{
    if('wakeLock' in navigator){
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', ()=>{ wakeLock = null; });
    }
  }catch(e){}
}
function releaseWakeLock(){ try{ if(wakeLock) wakeLock.release(); }catch(e){} wakeLock = null; }
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && inGame() && !gameOver) requestWakeLock(); });

/* ---------- 3.3 Характеры ботов ---------- */
const PERSONAS = [
  { key:'ace', name:'АС', icon:'🎖', desc:'Ледяной расчёт', aggr:1.15, risk:0.55, chatter:0.4, blunder:0, camp:1.6,
    lines:{ capture:['Цель уничтожена. Работаю дальше.','Чисто. Как в учебнике.'], six:['Форсаж по расписанию.'],
      doublesix:['Две шестёрки — это не везение, это класс.'], teleport:['Смена эшелона.'], finish:['Посадка штатная.'],
      nomove:['Жду коридор.'], taunt:['Вы предсказуемы, коллега.'], bonus:['Груз принят, спасибо диспетчеру.'] } },
  { key:'berserk', name:'БЕРСЕРК', icon:'💥', desc:'Таранит всё, что движется', aggr:2.3, risk:1.5, chatter:0.8, blunder:0.08, camp:0.2,
    lines:{ capture:['ХА! РАЗОБРАЛ НА ЗАПЧАСТИ!','Обломки красиво падают!'], six:['ФОРСАЖ! ДЕРЖИТЕСЬ!'],
      doublesix:['ДВЕ ШЕСТЁРКИ! КОНЕЦ ВАМ!'], teleport:['Обхожу с тыла!'], finish:['О��ин сел, остальных сожгу!'],
      nomove:['ГДЕ МОЙ КОРИДОР?!'], taunt:['Стой, я только разогрелся!'], bonus:['МОЁ! Всё моё!'] } },
  { key:'turtle', name:'ЧЕРЕПАХА', icon:'🛡', desc:'Осторожный, берёт наверняка', aggr:0.55, risk:0.2, chatter:0.3, blunder:0.02, camp:1.9,
    lines:{ capture:['Извини, ничего личного.'], six:['Аккуратно добавлю тяги.'],
      doublesix:['Две шестёрки… главное не разбиться.'], teleport:['Тихо ушёл в облака.'], finish:['Сел. Наконец-то.'],
      nomove:['Постою, погода плохая.'], taunt:['Я не спешу, я долетаю.'], bonus:['Пригодится в дороге.'] } },
  { key:'trickster', name:'ШУТНИК', icon:'🃏', desc:'Телепорты и подколы', aggr:1.35, risk:1.2, chatter:1.0, blunder:0.05, camp:2.2,
    lines:{ capture:['Упс. Это было твоё? 😏','Скажи спасибо, я тебя домой отвёз.'], six:['Шестёрка, как всегда у меня.'],
      doublesix:['Две шестёрки! Кубик мне родственник.'], teleport:['Фокус-покус, я в другом углу!'], finish:['Я дома, чайник поставил.'],
      nomove:['Пас. Отдыхаю, любуюсь.'], taunt:['Ты точно за штурвалом, а не под ним?'], bonus:['Ой, кажется это было ваше 🎁'] } },
  { key:'rookie', name:'САЛАГА', icon:'🐣', desc:'Смелый, но косячит', aggr:0.9, risk:1.0, chatter:0.7, blunder:0.32, camp:0.4,
    lines:{ capture:['Я попал! Я реально попал!'], six:['Шесть! Это ведь хорошо?'],
      doublesix:['Две шестёрки! Я легенда!'], teleport:['Ой, куда меня унесло?'], finish:['Сел… почти ровно.'],
      nomove:['А что делать, если ходов нет?'], taunt:['Инструктор говорил не так, но ладно.'], bonus:['Ух ты, посылка!'] } },
  { key:'sniper', name:'СНАЙПЕР', icon:'🎯', desc:'Ждёт в засаде у телепорта', aggr:1.4, risk:0.5, chatter:0.4, blunder:0.01, camp:2.4,
    lines:{ capture:['Цель была в перекрестии с прошлого хода.','Ждал. Дождался.'], six:['Шестёрка — просто инструмент.'],
      doublesix:['Две шестёрки. Позиция идеальная.'], teleport:['Засада сработала. Я уже там.'], finish:['Задача закрыта.'],
      nomove:['Стою на точке. Так надо.'], taunt:['Ты уже в моём секторе.'], bonus:['Припасы лишними не бывают.'] } },
  { key:'strategist', name:'ШТАБНОЙ', icon:'🧠', desc:'Считает на три хода вперёд', aggr:1.0, risk:0.45, chatter:0.5, blunder:0.005, camp:1.8,
    lines:{ capture:['По плану. Пункт четыре.'], six:['Ресурс распределён.'],
      doublesix:['Две шестёрки укладываются в модель.'], teleport:['Переброска по расчёту.'], finish:['Первый борт на стоянке, идём дальше.'],
      nomove:['Пауза тоже ход.'], taunt:['Вы играете, я решаю задачу.'], bonus:['Логистика решает.'] } },
  { key:'kamikaze', name:'КАМИКАДЗЕ', icon:'☄️', desc:'Живёт один ход, зато ярко', aggr:2.6, risk:2.2, chatter:0.9, blunder:0.14, camp:0.1,
    lines:{ capture:['Размен! И я в плюсе!'], six:['ВСЁ ВПЕРЁД!'],
      doublesix:['Две шестёрки — судьба велела таранить!'], teleport:['Прыжок в неизвестность!'], finish:['Долетел?! Сам не верю!'],
      nomove:['Дайте мне хоть какой-нибудь курс!'], taunt:['Я не торможу принципиально.'], bonus:['Хватай что горит!'] } },
  { key:'granny', name:'БАБУШКА', icon:'🧶', desc:'Медленно, но неотвратимо', aggr:0.6, risk:0.25, chatter:0.8, blunder:0.03, camp:1.5,
    lines:{ capture:['Ой, милок, ну куда ж ты полез.'], six:['Шесточка, внучок.'],
      doublesix:['Две шестёрки, надо же, повезло старушке.'], teleport:['Срежу через двор.'], finish:['Прилетела, чай остыл.'],
      nomove:['Посижу, отдохну.'], taunt:['Не спеши, суп остынет.'], bonus:['В хозяйстве пригодится.'] } },
  { key:'pirate', name:'ПИРАТ', icon:'🏴‍☠️', desc:'Забирает всё, что плохо лежит', aggr:1.8, risk:1.3, chatter:0.9, blunder:0.06, camp:1.2,
    lines:{ capture:['На абордаж! Груз мой!'], six:['Попутный ветер!'],
      doublesix:['Две шестёрки — сундук открылся!'], teleport:['Тайный фарватер, салага.'], finish:['Швартуюсь в порту.'],
      nomove:['Штиль, чтоб его.'], taunt:['Мёртвые ходов не делают.'], bonus:['Это теперь моё сокровище.'] } },
  { key:'robot', name:'АВТОПИЛОТ', icon:'🤖', desc:'Ноль эмоций, чистая математика', aggr:1.1, risk:0.6, chatter:0.2, blunder:0, camp:2.0,
    lines:{ capture:['Цель устранена. Отклонение 0.0%.'], six:['Тяга 100%.'],
      doublesix:['Вероятность 1/36. Зафиксировано.'], teleport:['Смена координат выполнена.'], finish:['Посадка завершена.'],
      nomove:['Нет допустимых решений.'], taunt:['Ваш стиль игры неоптимален.'], bonus:['Ресурс получен.'] } },
  { key:'showman', name:'АРТИСТ', icon:'🎤', desc:'Играет на публику', aggr:1.5, risk:1.4, chatter:1.2, blunder:0.09, camp:0.8,
    lines:{ capture:['И зал аплодирует стоя!'], six:['Барабанная дробь… ШЕСТЬ!'],
      doublesix:['Две шестёрки — на бис!'], teleport:['Исчез со сцены, появился в зале!'], finish:['Занавес, я дома.'],
      nomove:['Держу драматическую паузу.'], taunt:['Вы прекрасная массовка.'], bonus:['Подарок от поклонников!'] } }
];
function personaOf(p){ return (p && p.persona) ? p.persona : PERSONAS[0]; }
function assignPersonas(){
  const pool = PERSONAS.slice();
  players.forEach(p=>{
    if(!p.isAI){ p.persona = null; return; }
    if(!pool.length) PERSONAS.forEach(x=>pool.push(x));
    const idx = RNG.int(pool.length);
    p.persona = pool.splice(idx,1)[0];
  });
}

/* ---------- 3.4 Автоматический чат эмоций ---------- */
const CHAT_LINES = {
  capture: ['Минус борт! Кто следующий? 😈','Сбит! Отправляй по частям.','Держи квитанцию.'],
  hit:     ['Меня подбили! Ухожу на базу…','Да ну блин 😭','Катапультируюсь!'],
  six:     ['Шестёрка! Форсаж 🔥','Тяга на максимум!'],
  doublesix:['ДВЕ ШЕСТЁРКИ подряд! 🔥🔥','Кубик у меня в друзьях 😎'],
  teleport:['Ушёл в облака и вышел в другом углу.','Манёвр Пугачёва, догоняй.'],
  finish:  ['Шасси выпущены, я дома 🏅','На стоянку! Один готов.'],
  enter:   ['Взлетаю, убирайтесь с полосы 🛫','Свежий борт в воздухе!'],
  nomove:  ['Метео не пускает… 😑','Нет коридора, стою.'],
  bonus:   ['Подобрал контейнер! 🎁','Это теперь моё 😏'],
  shield:  ['Щит выдержал попадание 🛡'],
  taunt:   ['Спокойно, я на курсе 😎'],
  win:     ['Задание выполнено! Небо за нами 🏆','Все борты на стоянке. Отбой.'],
  revenge: ['Ты сбил меня первым 😡','Мы квиты. Пока.']
};
const PERSONA_REVENGE = {
  ace: ['Вы сами открыли этот счёт.','Долг закрыт. Без эмоций.'],
  berserk: ['Я ЖДАЛ ЭТОГО! ПОЛУЧАЙ!','НЕ НАДО БЫЛО МЕНЯ ТРОГАТЬ!!'],
  turtle: ['Я медленный, но память долгая.','Вот теперь мы квиты.'],
  trickster: ['Помнишь меня? А я тебя — да 😏','Сюрприз! Это за прошлый раз.'],
  rookie: ['Это за меня! Я смог!','Инструктор бы гордился!'],
  sniper: ['Ты был в списке с того хода.','Отметка снята.'],
  strategist: ['Компенсация получена.','Баланс восстановлен.'],
  kamikaze: ['Ты первым начал, я закончил!','Месть — лучший топливо!'],
  granny: ['Я всё записала, милок.','Вот тебе сдача с прошлого раза.'],
  pirate: ['Пираты долгов не прощают!','За борт, как и меня тогда!'],
  robot: ['Запись в журнале: ответный удар выполнен.','Цикл отмщения завершён.'],
  showman: ['А теперь — сцена мести!','Зрители ждали этого акта!']
};
const chatFeedEl = document.getElementById('chatFeed');
/* чат говорит только о важном: срубил, вышел из дома, зашёл в дом,
   телепорт, две-три шестёрки подряд */
const CHAT_KINDS = { capture:1, enter:1, finish:1, teleport:1, doublesix:1, revenge:1 };
function chatBubble(kind, p, textOverride){
  if(!Settings.chat || !chatFeedEl) return;
  if(!CHAT_KINDS[kind]) return;
  const col = p ? COLOR[p.dir] : { hex:'#7ec8ff', icon:'📡', name:'ДИСПЕТЧЕР' };
  const per = (p && p.isAI) ? personaOf(p) : null;
  let text = textOverride;
  if(!text && per && kind === 'revenge' && PERSONA_REVENGE[per.key]) text = pickOne(PERSONA_REVENGE[per.key]);
  if(!text && per && per.lines[kind]) text = pickOne(per.lines[kind]);
  if(!text) text = pickOne(CHAT_LINES[kind] || CHAT_LINES.taunt);
  const el = document.createElement('div');
  el.className = 'chat-bubble' + ((p && !p.isAI) ? ' right' : '');
  el.innerHTML = '<span class="chat-emoji">' + (CHAT_EMOJI[kind] || '💬') + '</span>' +
    '<span><span class="chat-who" style="color:' + col.hex + '">' + col.icon + ' ' + col.name +
    (per ? ' · ' + per.icon + ' ' + per.name : '') + '</span><br><span class="chat-text">' + text + '</span></span>';
  chatFeedEl.appendChild(el);
  while(chatFeedEl.children.length > 3) chatFeedEl.removeChild(chatFeedEl.firstChild);
  try{ Sound.radioBeep(); }catch(e){}
  setTimeout(()=>{ el.remove(); }, 3700);
}
function clearChat(){ if(chatFeedEl) chatFeedEl.innerHTML = ''; }
let sixStreak = {};

/* ---------- 3.5 Взрывы, ударные волны, инверсионный след ---------- */
let particles = [], shocks = [], trails = [];
function spawnExplosion(r, c, colorHex){
  const {x, y} = px(r, c);
  const cx = x + cellSize/2, cy = y + cellSize/2;
  const now = performance.now();
  shocks.push({ x:cx, y:cy, start:now, col:'#ffe0a3' });
  shocks.push({ x:cx, y:cy, start:now + 90, col: colorHex || '#ff6a3d' });
  if(Settings.fx){
    for(let i=0;i<28;i++){
      const a = Math.random()*Math.PI*2, v = cellSize*(0.02 + Math.random()*0.1);
      particles.push({ x:cx, y:cy, vx:Math.cos(a)*v, vy:Math.sin(a)*v - cellSize*0.012,
        life: 400 + Math.random()*450, start:now, r: cellSize*(0.05 + Math.random()*0.13),
        col: i%3===0 ? '#fff3c4' : (i%3===1 ? '#ffa23d' : (colorHex || '#ff5f4d')) });
    }
    boardShake();
    flashScreen();
  }
}
function boardShake(){
  if(!Settings.fx) return;
  const w = document.getElementById('boardWrap');
  if(!w) return;
  w.classList.remove('shake'); void w.offsetWidth; w.classList.add('shake');
  setTimeout(()=>w.classList.remove('shake'), 420);
}
function flashScreen(){
  if(!Settings.fx) return;
  const f = document.getElementById('flash');
  if(!f) return;
  f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}
function spawnTrail(cx, cy, hex){
  if(!Settings.fx) return;
  trails.push({ x:cx, y:cy, start:performance.now(), col:hex, r:cellSize*0.17 });
  if(trails.length > 80) trails.shift();
}
function drawEffects(now){
  trails = trails.filter(t=>{
    const k = (now - t.start)/520;
    if(k >= 1) return false;
    ctx.save(); ctx.globalAlpha = 0.4*(1-k);
    ctx.fillStyle = t.col;
    ctx.beginPath(); ctx.arc(t.x, t.y, t.r*(1 - k*0.55), 0, 7); ctx.fill();
    ctx.restore(); return true;
  });
  shocks = shocks.filter(sh=>{
    const k = (now - sh.start)/540;
    if(k < 0) return true;
    if(k >= 1) return false;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1-k);
    ctx.strokeStyle = sh.col;
    ctx.lineWidth = Math.max(1.5, cellSize*0.15*(1-k));
    ctx.beginPath(); ctx.arc(sh.x, sh.y, cellSize*0.2 + k*cellSize*1.8, 0, 7); ctx.stroke();
    ctx.restore(); return true;
  });
  particles = particles.filter(pt=>{
    const age = now - pt.start;
    if(age >= pt.life) return false;
    const k = age/pt.life;
    const x = pt.x + pt.vx*age*0.85;
    const y = pt.y + pt.vy*age*0.85 + cellSize*0.0000045*age*age;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1-k);
    ctx.fillStyle = pt.col;
    ctx.beginPath(); ctx.arc(x, y, pt.r*(1 - k*0.7), 0, 7); ctx.fill();
    ctx.restore(); return true;
  });
}

/* ---------- 3.6 Бонусы и режим КРЕЙЗИ ---------- */
const BONUS_TYPES = [
  { key:'boost',    icon:'🚀', name:'Ускоритель', kind:'good' },
  { key:'shield',   icon:'🛡', name:'Щит',        kind:'good' },
  { key:'portal',   icon:'🌀', name:'Портал',      kind:'good' },
  { key:'reroll',   icon:'🎲', name:'Кубик х2',   kind:'good' },
  { key:'mine',     icon:'💣', name:'Мина',       kind:'trap' },
  { key:'freeze',   icon:'🧊', name:'Заморозка',  kind:'trap' },
  { key:'oil',      icon:'🛢', name:'Гололёд',    kind:'trap' },
  { key:'blockade', icon:'🚧', name:'Шлагбаум',   kind:'trap' }
];
const GOOD_BONUS_TYPES = BONUS_TYPES.filter(t=>t.kind === 'good');
function bonusTypeByKey(k){ return BONUS_TYPES.find(t=>t.key === k) || BONUS_TYPES[0]; }
const SHIELD_MS = 60000;
const BLOCKADE_LAPS = 2;
let blockades = [];
let finishOrder = [];
let doubleNext = {};
function crazyFlash(text){
  const wrap = document.getElementById('boardWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'crazy-flash';
  el.textContent = text;
  wrap.appendChild(el);
  setTimeout(()=>el.remove(), 2500);
}
let bonuses = [], crazyTurnCount = 0, bonusExtraRoll = false;
function isCrazy(){ return gameMode === 'crazy'; }
function isDuel(){ return gameMode === 'duel'; }
function winTarget(){ return isDuel() ? 3 : 4; }
function cellKey(cell){ return cell ? cell[0] + ',' + cell[1] : ''; }
function pieceShielded(pc){ return !!pc && !!pc.shieldUntil && Date.now() < pc.shieldUntil; }
function shieldSecondsLeft(pc){ return pieceShielded(pc) ? Math.max(0, Math.ceil((pc.shieldUntil - Date.now())/1000)) : 0; }
function blockadeAt(cell){ return cell ? blockades.find(b=>cellKey(b.cell) === cellKey(cell)) : null; }
function tickBlockades(){
  if(!blockades.length) return;
  blockades.forEach(b=>{ b.turns--; });
  const before = blockades.length;
  blockades = blockades.filter(b=>b.turns > 0);
  if(blockades.length !== before){ addHistory('🚧 Шлагбаум убран, проезд свободен', '#f0b02b'); refillItems(); }
}
function blockadeStopStep(p, pc, ns){
  if(!isCrazy() || !blockades.length) return ns;
  const homeEnterStep = pc.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  for(let s = pc.step + 1; s <= ns; s++){
    if(s >= homeEnterStep) break;
    if(blockadeAt(stepToCell(p.dir, s, pc.lap))) return s - 1;
  }
  return ns;
}
function occupiedCells(){
  const set = {};
  players.forEach(p=>p.pieces.forEach(pc=>{
    if(pc.step < 0) return;
    const cell = stepToCell(p.dir, pc.step, pc.lap);
    if(cell) set[cellKey(cell)] = true;
  }));
  return set;
}
/* ---- ЖИЗНЬ ПРЕДМЕТОВ НА ПОЛЕ (режим КРЕЙЗИ) ----
   * на поле одновременно не больше MAX_FIELD_ITEMS предметов;
   * каждый предмет живёт ограниченное число ходов, потом исчезает
     и появляется в другом месте. */
const ITEM_QUOTA = 2;
const MAX_FIELD_ITEMS = 15;
const ITEM_LIFE_MIN = 6;
const ITEM_LIFE_MAX = 14;
function randItemLife(){ return ITEM_LIFE_MIN + RNG.int(ITEM_LIFE_MAX - ITEM_LIFE_MIN + 1); }
function fieldItemCount(){ return bonuses.length + blockades.length; }
function fieldItemsFull(){ return fieldItemCount() >= MAX_FIELD_ITEMS; }
/* Свободная клетка: не угол, не под фишкой и без другого предмета — бонусы не накладываются */
function itemAt(cell){
  if(!cell) return null;
  return bonuses.find(b=>cellKey(b.cell) === cellKey(cell)) || blockadeAt(cell) || null;
}
function freeItemCell(){
  const busy = occupiedCells();
  for(let tries=0; tries<120; tries++){
    const cell = BOARD.ring[RNG.int(RING_LEN)];
    if(!cell || isCornerCell(cell)) continue;
    if(busy[cellKey(cell)]) continue;
    if(itemAt(cell)) continue;
    return cell;
  }
  return null;
}
function spawnItemAt(cell, type){
  if(!cell || !type) return false;
  if(itemAt(cell)) return false;
  if(fieldItemsFull()) return false;
  if(type.key === 'blockade'){
    blockades.push({ cell, turns: Math.min(BLOCKADE_LAPS * Math.max(1, players.length), ITEM_LIFE_MAX) });
  } else {
    bonuses.push({ cell, type, life: randItemLife(), born: performance.now() });
  }
  return true;
}
/* Каждый ход предметы стареют: отжившие пропадают и тут же появляются в других клетках */
function tickItemLife(){
  if(!isCrazy() || gameOver) return 0;
  const expired = [];
  bonuses = bonuses.filter(b=>{
    if(b.life == null) b.life = randItemLife();
    b.life--;
    if(b.life > 0) return true;
    expired.push(b.type);
    return false;
  });
  if(!expired.length) return 0;
  let moved = 0;
  expired.forEach(type=>{
    const cell = freeItemCell();
    if(cell && spawnItemAt(cell, type)){ moved++; }
  });
  if(moved) addHistory('🔄 Диспетчер перебросил груз: ' + moved + ' предм. сменили клетку', '#7ec8ff');
  return moved;
}
function spawnRandomItem(pool){
  const list = pool && pool.length ? pool : BONUS_TYPES;
  const cell = freeItemCell();
  if(!cell) return false;
  return spawnItemAt(cell, list[RNG.int(list.length)]);
}
function itemCount(type){
  return type.key === 'blockade'
    ? blockades.length
    : bonuses.filter(b=>b.type.key === type.key).length;
}
/* Добиваем каждый тип до 2 штук, но не больше 20 предметов на поле суммарно */
function refillItems(){
  if(!isCrazy() || gameOver) return 0;
  let added = 0;
  BONUS_TYPES.forEach(type=>{
    let n = itemCount(type);
    while(n < ITEM_QUOTA){
      if(fieldItemsFull()) return;
      const cell = freeItemCell();
      if(!cell || !spawnItemAt(cell, type)) break;
      added++; n++;
    }
  });
  return added;
}
function maybeSpawnBonus(){
  if(!isCrazy() || gameOver) return;
  crazyTurnCount++;
  tickItemLife();
  refillItems();
}
function drawShieldAura(cx, cy, pc, now){
  if(!pieceShielded(pc)) return;
  const pulse = 0.5 + 0.5*Math.sin(now/200);
  ctx.save();
  ctx.strokeStyle = 'rgba(126,200,255,' + (0.55 + 0.35*pulse) + ')';
  ctx.lineWidth = Math.max(1.5, cellSize*0.08);
  ctx.beginPath(); ctx.arc(cx, cy, cellSize*(0.46 + 0.05*pulse), 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(10,20,35,0.75)';
  const w = cellSize*0.52, h = cellSize*0.3;
  roundRect(cx - w/2, cy - cellSize*0.78, w, h, h*0.4);
  ctx.fill();
  ctx.fillStyle = '#7ec8ff';
  ctx.font = 'bold ' + (cellSize*0.24) + 'px Menlo,Consolas,monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🛡' + shieldSecondsLeft(pc), cx, cy - cellSize*0.63);
  ctx.restore();
}
function drawBlockades(now){
  if(!blockades.length) return;
  const pulse = 0.5 + 0.5*Math.sin(now/300);
  blockades.forEach(b=>{
    const {x, y} = px(b.cell[0], b.cell[1]);
    const cx = x + cellSize/2, cy = y + cellSize/2;
    ctx.save();
    ctx.fillStyle = 'rgba(240,120,40,' + (0.18 + 0.14*pulse) + ')';
    roundRect(x + cellSize*0.08, y + cellSize*0.08, cellSize*0.84, cellSize*0.84, cellSize*0.18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,120,40,0.95)';
    ctx.lineWidth = Math.max(1, cellSize*0.06);
    roundRect(x + cellSize*0.08, y + cellSize*0.08, cellSize*0.84, cellSize*0.84, cellSize*0.18);
    ctx.stroke();
    ctx.font = (cellSize*0.5) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚧', cx, cy + cellSize*0.02);
    ctx.restore();
  });
}
function drawBonuses(now){
  drawBlockades(now);
  if(!bonuses.length) return;
  const pulse = 0.5 + 0.5*Math.sin(now/260);
  const blink = 0.5 + 0.5*Math.sin(now/90);
  bonuses.forEach(b=>{
    const {x, y} = px(b.cell[0], b.cell[1]);
    const cx = x + cellSize/2, cy = y + cellSize/2;
    const dying = (b.life != null && b.life <= 2);
    const hex = b.type.kind === 'trap' ? '#e0524c' : '#f0b02b';
    ctx.save();
    if(dying) ctx.globalAlpha = 0.45 + 0.45*blink;   /* скоро исчезнет — мигает */
    ctx.fillStyle = hex + '55';
    ctx.beginPath(); ctx.arc(cx, cy, cellSize*(0.38 + 0.04*pulse), 0, 7); ctx.fill();
    ctx.strokeStyle = hex;
    ctx.lineWidth = Math.max(1.3, cellSize*0.06);
    ctx.setLineDash(b.type.kind === 'trap' ? [cellSize*0.14, cellSize*0.1] : []);
    ctx.beginPath(); ctx.arc(cx, cy, cellSize*0.36, 0, 7); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = (cellSize*0.48) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.type.icon, cx, cy + cellSize*0.02);
    ctx.restore();
  });
}
function ringStepBase(pc){ return pc.lap === 0 ? 0 : RING_LEN; }
function advancePiece(p, i, n){
  const pc = p.pieces[i];
  if(!pc || pc.step < 0) return 0;
  const homeEnterStep = pc.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  const targetHomeStep = pc.lap === 0 ? FINISH_STEP : FINISH_STEP + RING_LEN;
  let moved = 0;
  for(let k = 0; k < n; k++){
    const ns = pc.step + 1;
    if(ns > targetHomeStep) break;
    if(ns < homeEnterStep && blockadeAt(stepToCell(p.dir, ns, pc.lap))) break;
    if(ownAt(p, ns, i, pc.lap)) break;
    pc.step = ns;
    moved++;
  }
  if(moved > 0) applyMoveTo(p, i, pc.step, pc.lap);
  return moved;
}
function slidePieceBack(p, i, n){
  const pc = p.pieces[i];
  if(!pc || pc.step < 0) return 0;
  const base = ringStepBase(pc);
  let moved = 0;
  for(let k = 0; k < n; k++){
    const ns = pc.step - 1;
    if(ns < base) break;
    if(blockadeAt(stepToCell(p.dir, ns, pc.lap))) break;
    if(ownAt(p, ns, i, pc.lap)) break;
    pc.step = ns;
    moved++;
  }
  if(moved > 0) applyMoveTo(p, i, pc.step, pc.lap);
  return moved;
}
function portalJump(p, i){
  const pc = p.pieces[i];
  if(!pc || pc.step < 0) return false;
  const base = ringStepBase(pc);
  for(let tries = 0; tries < 60; tries++){
    const ns = base + RNG.int(LAP_STEPS);
    if(ns === pc.step) continue;
    const cell = stepToCell(p.dir, ns, pc.lap);
    if(!cell || blockadeAt(cell)) continue;
    if(ownAt(p, ns, i, pc.lap)) continue;
    applyMoveTo(p, i, ns, pc.lap);
    Sound.teleport();
    return true;
  }
  return false;
}
let bonusChainDepth = 0;
function checkBonusPickup(p, pieceIdx){
  if(!isCrazy() || !bonuses.length) return;
  const pc = p.pieces[pieceIdx];
  if(!pc || pc.step < 0) return;
  const cell = stepToCell(p.dir, pc.step, pc.lap);
  if(!cell) return;
  const bi = bonuses.findIndex(b=>cellKey(b.cell) === cellKey(cell));
  if(bi < 0) return;
  const b = bonuses.splice(bi, 1)[0];
  applyBonus(p, pieceIdx, b.type);
  refillItems();
  /* если рывок или портал перенёс фишку на другой бонус — подбираем и его (максимум 3 звена) */
  if(bonusChainDepth < 3){
    bonusChainDepth++;
    checkBonusPickup(p, pieceIdx);
    bonusChainDepth--;
  }
}
function applyBonus(p, pieceIdx, type){
  if(stats[p.dir]) stats[p.dir].bonuses = (stats[p.dir].bonuses||0) + 1;
  metaBump('bonuses', 1);
  const pc = p.pieces[pieceIdx];
  const shielded = pieceShielded(pc);
  let extra = '';

  if(type.key === 'shield'){
    pc.shieldUntil = Date.now() + SHIELD_MS;
    extra = 'щит на 60 сек';
  }
  else if(type.key === 'reroll'){
    bonusExtraRoll = true;
    extra = 'мгновенный повторный бросок';
  }
  else if(type.key === 'boost'){
    const moved = advancePiece(p, pieceIdx, 6);
    extra = moved > 0 ? ('рывок на ' + moved + ' кл.') : 'впереди закрыто';
  }
  else if(type.key === 'portal'){
    extra = portalJump(p, pieceIdx) ? 'портал забросил в случайную клетку' : 'портал сбоит';
  }
  else if(type.key === 'mine'){
    if(shielded){ extra = '🛡 щит поглотил взрыв'; }
    else {
      const cell = stepToCell(p.dir, pc.step, pc.lap);
      pc.step = -1; pc.lap = 0; pc.shieldUntil = 0; pc.frozen = 0; pc.shield = false;
      if(stats[p.dir]) stats[p.dir].lost++;
      if(cell) spawnExplosion(cell[0], cell[1], COLOR[p.dir].hex);
      Sound.explosion();
      Haptic.capture();
      extra = 'взрыв, фишка уходит на базу';
    }
  }
  else if(type.key === 'freeze'){
    if(shielded){ extra = '🛡 щит не дал заморозить'; }
    else { pc.frozen = 2; extra = 'фишка пропускает 1 ход'; }
  }
  else if(type.key === 'oil'){
    if(shielded){ extra = '🛡 щит удержал на курсе'; }
    else {
      const back = slidePieceBack(p, pieceIdx, 6);
      extra = back > 0 ? ('занесло на ' + back + ' кл. назад') : 'скользнуло на месте';
    }
  }

  if(type.kind === 'trap'){ Sound.alarm(); Haptic.trap(); } else { Sound.bonus(); Haptic.bonus(); }
  addHistory(COLOR[p.dir].icon + ' ' + p.name + ': ' + type.icon + ' ' + type.name + (extra ? ' · ' + extra : ''), COLOR[p.dir].hex);
  renderScoreStrip();
}
function goldRush(){
  const room = Math.max(0, MAX_FIELD_ITEMS - fieldItemCount());
  const count = Math.min(room, 6 + RNG.int(3));
  if(count <= 0) return;
  let spawned = 0;
  for(let k = 0; k < count; k++){ if(spawnRandomItem(GOOD_BONUS_TYPES)) spawned++; }
  if(!spawned) return;
  Sound.bonus();
  crazyFlash('💰 ЗОЛОТАЯ ЛИХОРАДКА! Бонусов на поле: ' + spawned);
  addHistory('💰 ЗОЛОТАЯ ЛИХОРАДКА: разбросано ' + spawned + ' бонусов', '#f0b02b');
}
function crazyEvent(){
  if(!isCrazy() || gameOver) return;
  if(crazyTurnCount === 0 || crazyTurnCount % 12 !== 0) return;
  if(RNG.float() > 0.6) return;
  goldRush();
}
const PLACE_ICON = ['🥇','🥈','🥉','4️⃣'];
function pieceProgress(p){
  return p.pieces.reduce((acc, pc)=> acc + (pc.step < 0 ? 0 : pc.step + 1), 0);
}
function placeStandings(){
  const list = players.map(p=>({ p, home: getHomeCount(p), rank: finishOrder.indexOf(p.dir) }));
  list.sort((a, b)=>{
    const fa = a.rank < 0 ? 99 : a.rank;
    const fb = b.rank < 0 ? 99 : b.rank;
    if(fa !== fb) return fa - fb;
    if(b.home !== a.home) return b.home - a.home;
    return pieceProgress(b.p) - pieceProgress(a.p);
  });
  return list;
}
function noteFinishOrder(){
  players.forEach(p=>{
    if(getHomeCount(p) >= winTarget() && finishOrder.indexOf(p.dir) < 0) finishOrder.push(p.dir);
  });
}
function renderScoreStrip(){
  const el = document.getElementById('scoreStrip');
  if(!el) return;
  if(!isCrazy() || !players.length){ el.style.display = 'none'; return; }
  noteFinishOrder();
  el.style.display = 'flex';
  el.innerHTML = placeStandings().map((row, idx)=>{
    const col = COLOR[row.p.dir];
    return '<span class="sc" style="color:' + col.hex + '">' + (PLACE_ICON[idx] || (idx+1) + '.') + ' ' + col.icon + ' ' + row.home + '/4</span>';
  }).join('') +
  '<span class="sc items">🎁 ' + fieldItemCount() + '/' + MAX_FIELD_ITEMS + '</span>';
}
function renderPlaces(){
  if(!isCrazy() || !players.length) return '';
  noteFinishOrder();
  return '<div style="margin-top:8px;text-align:left;">' +
    placeStandings().map((row, idx)=>{
      const col = COLOR[row.p.dir];
      return '<div class="award-row"><span>' + (PLACE_ICON[idx] || (idx+1) + '.') + ' ' + (idx+1) + ' место</span>' +
        '<span style="color:' + col.hex + '"><b>' + col.icon + ' ' + row.p.name + '</b> · ' + row.home + '/4 дома</span></div>';
    }).join('') + '</div>';
}

/* ---------- 3.7 Общая статистика налёта ---------- */
const META_KEY = 'mandashnya_meta_v1';
const META_DEFAULT = { matches:0, crazyMatches:0, moves:0, captures:0, lost:0, sixes:0, teleports:0, finished:0, bonuses:0, wins:{}, bestMvp:null, lastPlayed:null, faces:[0,0,0,0,0,0], rolls:0 };
function noteDieFace(face){
  try{
    if(!Array.isArray(META.faces) || META.faces.length !== 6) META.faces = [0,0,0,0,0,0];
    META.faces[face - 1]++;
    META.rolls = (META.rolls || 0) + 1;
    if(META.rolls % 10 === 0) metaSave();
  }catch(e){}
}
function metaLoad(){
  try{
    const d = JSON.parse(localStorage.getItem(META_KEY) || 'null');
    const m = Object.assign({}, META_DEFAULT, d || {});
    m.wins = Object.assign({}, (d && d.wins) || {});
    m.faces = (d && Array.isArray(d.faces) && d.faces.length === 6) ? d.faces.slice() : [0,0,0,0,0,0];
    m.rolls = (d && d.rolls) || 0;
    return m;
  }catch(e){ return Object.assign({}, META_DEFAULT, { wins:{} }); }
}
let META = metaLoad();
function metaSave(){ try{ localStorage.setItem(META_KEY, JSON.stringify(META)); }catch(e){} }
function metaBump(key, n){ META[key] = (META[key]||0) + n; }
function metaResetAll(){ META = Object.assign({}, META_DEFAULT, { wins:{}, faces:[0,0,0,0,0,0], rolls:0 }); metaSave(); renderStatsSheet(); }
function recordMatchToMeta(winner, mvp){
  META.matches++;
  if(isCrazy()) META.crazyMatches++;
  META.lastPlayed = Date.now();
  players.forEach(p=>{
    const st = stats[p.dir] || {};
    metaBump('moves', st.moves||0); metaBump('captures', st.captures||0);
    metaBump('lost', st.lost||0); metaBump('sixes', st.sixes||0);
    metaBump('teleports', st.teleports||0); metaBump('finished', st.finished||0);
  });
  if(winner) META.wins[winner] = (META.wins[winner]||0) + 1;
  if(mvp && (!META.bestMvp || mvp.score > META.bestMvp.score)) META.bestMvp = { name: mvp.label, score: mvp.score };
  metaSave();
}
function renderDiceFairness(){
  const faces = (Array.isArray(META.faces) && META.faces.length === 6) ? META.faces : [0,0,0,0,0,0];
  const total = faces.reduce(function(a, b){ return a + b; }, 0);
  const src = '<div class="dice-src">' + (RNG.secure
    ? '🔒 Генератор: crypto.getRandomValues · без перекоса граней'
    : '⚠ Генератор: Math.random()') + '</div>';
  if(!total) return src + '<div class="hist-empty">Бросков пока нет</div>' + renderDiceProof();
  const max = Math.max.apply(null, faces);
  const bars = faces.map(function(v, i){
    const pct = 100 * v / total;
    const w = Math.max(2, Math.round(100 * v / max));
    return '<div class="die-row"><span class="die-f">' + (i + 1) + '</span>'
      + '<span class="die-bar"><i style="width:' + w + '%"></i></span>'
      + '<span class="die-v">' + pct.toFixed(1) + '%</span></div>';
  }).join('');
  const dev = Math.max.apply(null, faces.map(function(v){ return Math.abs(100 * v / total - 16.667); }));
  const verdict = total < 60
    ? 'Мало бросков — разброс пока нормален'
    : (dev <= 4 ? 'Ровное распределение — кубик честный'
                 : 'Отклонение до ' + dev.toFixed(1) + '% — обычный шум случайности');
  return src + '<div class="die-hist">' + bars + '</div>'
    + '<div class="medal">🎯 Бросков всего: <b>' + total + '</b> · идеал — 16.7% на грань</div>'
    + '<div class="medal">' + verdict + '</div>'
    + renderDiceProof();
}

/* блок «доказательство честности»: хеш до партии + раскрытие после */
function renderDiceProof(){
  const revealed = !!gameOver || !players || !players.length;
  const log = DICE_LOG.slice(-12).map(function(r){
    return '<span class="proof-roll">#' + r.n + '→' + r.v + '</span>';
  }).join('');
  let out = '<div class="proof-box">'
    + '<div class="proof-title">🔐 Проверяемая случайность</div>'
    + '<div class="proof-line">Все броски партии зафиксированы <b>до первого хода</b>. Игра не может их менять по ходу.</div>'
    + '<div class="proof-line">Сделано бросков: <b>' + DICE_INDEX + '</b></div>'
    + '<div class="proof-line">Печать (SHA-256 от seed):<br><code>' + DICE_COMMIT + '</code></div>';
  if(revealed){
    out += '<div class="proof-line">Seed раскрыт:<br><code>' + DICE_SEED + '</code></div>'
      + '<div class="proof-line proof-how">Проверка любым калькулятором SHA-256: бросок №n = первый байт хеша от строки <code>seed:n:0</code>, взятый mod 6, плюс 1.</div>';
  } else {
    out += '<div class="proof-line proof-how">Seed будет раскрыт после партии — сверишь печать и пересчитаешь все броски сам.</div>';
  }
  if(log) out += '<div class="proof-log">' + log + '</div>';
  return out + '</div>';
}

function renderStatsSheet(){
  const box = document.getElementById('statsSheetBody');
  if(!box) return;
  if(!META.matches){
    box.innerHTML = '<div class="hist-empty">Статистики пока нет — слетай хотя бы один вылет ✈</div>'
      + '<h4>Честность кубика</h4>' + renderDiceFairness();
    return;
  }
  const cards = [
    ['Вылетов сыграно', META.matches], ['Ходов сделано', META.moves],
    ['Сбито бортов', META.captures], ['Потеряно бортов', META.lost],
    ['Шестёрок выпало', META.sixes], ['Телепортов', META.teleports],
    ['Бортов на стоянке', META.finished], ['Бонусов собрано', META.bonuses]
  ].map(([k, v])=>'<div class="stat-card"><div class="v">' + v + '</div><div class="k">' + k + '</div></div>').join('');
  const kd = META.lost ? (META.captures/META.lost).toFixed(2) : (META.captures ? '∞' : '0.00');
  const winRows = Object.keys(META.wins||{}).sort((a,b)=>META.wins[b]-META.wins[a]);
  const medals = [
    '<div class="medal">⚔️ Сбил / потерял: <b>' + kd + '</b></div>',
    '<div class="medal">🏆 Чаще всех побеждает: <b>' + (winRows.length ? winRows[0] : '—') + '</b></div>',
    '<div class="medal">📐 В среднем ходов за вылет: <b>' + Math.round(META.moves/Math.max(1, META.matches)) + '</b></div>',
    '<div class="medal">🎲 Шестёрка выпадает в <b>' + Math.round(100*META.sixes/Math.max(1, META.moves)) + '%</b> ходов</div>',
    '<div class="medal">🤪 Вылетов в режиме КРЕЙЗИ: <b>' + (META.crazyMatches||0) + '</b></div>',
    '<div class="medal">🎁 Бонусов за вылет: <b>' + (META.bonuses/Math.max(1, META.matches)).toFixed(1) + '</b></div>',
    (META.bestMvp ? '<div class="medal">🎖 Лучший MVP: <b>' + META.bestMvp.name + '</b> · ' + META.bestMvp.score + ' очк.</div>' : ''),
    '<div class="medal">🕓 Последний вылет: <b>' + (META.lastPlayed ? new Date(META.lastPlayed).toLocaleString('ru-RU', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'}) : '—') + '</b></div>'
  ].join('');
  const winList = winRows.length
    ? winRows.map(k=>'<div class="medal">🥇 ' + k + ': <b>' + META.wins[k] + '</b></div>').join('')
    : '<div class="hist-empty">Победы пока не записаны</div>';
  box.innerHTML = '<h4>Общий налёт</h4><div class="stat-grid">' + cards + '</div>'
    + '<h4>Честность кубика</h4>' + renderDiceFairness()
    + '<h4>Интересное</h4>' + medals + '<h4>Победы</h4>' + winList;
}

/* ---------- 3.8 MVP вылета ---------- */
function winnerLabel(){
  if(gameMode === 'teams' || gameMode === 'physical'){
    const tot = {};
    players.forEach(pl=>{ const t = TEAM_OF[pl.dir]; tot[t] = (tot[t]||0) + getHomeCount(pl); });
    const wt = Object.keys(tot).find(t=>tot[t] >= 8) || 'A';
    return 'Команда ' + (wt === 'A' ? '1' : '2');
  }
  const p = mover();
  return COLOR[p.dir].icon + ' ' + p.name;
}
function mvpTitle(st){
  if((st.captures||0) >= 4) return 'Воздушный снайпер';
  if((st.finished||0) >= 3) return 'Мастер посадки';
  if((st.bonuses||0) >= 4) return 'Охотник за бонусами';
  if((st.teleports||0) >= 3) return 'Король эшелонов';
  if((st.sixes||0) >= 6) return 'Любимец кубика';
  return 'Командир вылета';
}
function computeMvp(){
  if(!players.length) return null;
  const scored = players.map(p=>{
    const st = stats[p.dir] || {};
    const score = (st.finished||0)*40 + (st.captures||0)*25 + (st.teleports||0)*8 + (st.sixes||0)*4 - (st.lost||0)*10;
    return { p, st, score };
  }).sort((a,b)=>b.score - a.score);
  const top = scored[0];
  const per = top.p.isAI ? personaOf(top.p) : null;
  top.label = COLOR[top.p.dir].icon + ' ' + top.p.name + (per ? ' «' + per.name + '»' : '');
  top.all = scored;
  return top;
}
function renderMvp(){
  const box = document.getElementById('mvpBox');
  const mvp = computeMvp();
  if(!box || !mvp) return null;
  const col = COLOR[mvp.p.dir];
  const anti = mvp.all[mvp.all.length - 1];
  box.innerHTML = '<div class="credit-role">🎖 MVP вылета</div>' +
    '<div style="font-size:16px;font-weight:800;color:' + col.hex + ';margin:4px 0 2px;">' + mvp.label + '</div>' +
    '<div style="font-size:11px;color:var(--stone-dark);">' + mvpTitle(mvp.st) + ' · рейтинг ' + mvp.score + '</div>' +
    '<div style="font-size:10px;font-family:Menlo,Consolas,monospace;color:var(--muted);margin-top:6px;">🏠 ' +
      (mvp.st.finished||0) + ' · ⚔️ ' + (mvp.st.captures||0) + ' · 🌀 ' + (mvp.st.teleports||0) + ' · 🎲6 ' + (mvp.st.sixes||0) +
      (isCrazy() ? ' · 🎁 ' + (mvp.st.bonuses||0) : '') + '</div>' +
    ((anti && anti !== mvp) ? '<div style="font-size:10.5px;color:var(--muted);margin-top:5px;">🪂 Антигерой вылета: ' + COLOR[anti.p.dir].icon + ' ' + anti.p.name + '</div>' : '') +
    renderPlaces() +
    renderAwards();
  return mvp;
}
/* Номинации для всех режимов */
function bestBy(key){
  let best = null;
  players.forEach(p=>{
    const v = (stats[p.dir] || {})[key] || 0;
    if(!best || v > best.v) best = { p, v };
  });
  return best;
}
function awardRow(icon, title, key, unit){
  const b = bestBy(key);
  if(!b || !b.v) return '<div class="award-row"><span>' + icon + ' ' + title + '</span><span style="color:var(--muted)">никто</span></div>';
  const col = COLOR[b.p.dir];
  return '<div class="award-row"><span>' + icon + ' ' + title + '</span>' +
    '<span style="color:' + col.hex + '"><b>' + col.icon + ' ' + b.p.name + '</b> · ' + b.v + ' ' + unit + '</span></div>';
}
function renderAwards(){
  return '<div style="margin-top:8px;text-align:left;">' +
    awardRow('⚔️', 'Больше всех срубил', 'captures', 'борт.') +
    awardRow('🎲', 'Больше всех шестёрок', 'sixes', 'шт.') +
    awardRow('🎯', 'Чаще всех рубили его', 'lost', 'раз') +
    awardRow('🌀', 'Больше всех телепортов', 'teleports', 'шт.') +
    '</div>';
}

/* ---------- 3.9 Экраны и главное меню ---------- */
function showScreen(name){
  document.getElementById('menu').style.display = (name === 'menu') ? 'flex' : 'none';
  document.getElementById('setup').style.display = (name === 'setup') ? 'flex' : 'none';
  document.getElementById('game').style.display = (name === 'game') ? 'flex' : 'none';
  var _on=document.getElementById('online'); if(_on) _on.style.display = (name === 'online') ? 'flex' : 'none';
  if(name !== 'game') releaseWakeLock();
  try{ musicSync(); }catch(e){}
}
function refreshMenuResume(){
  const btn = document.getElementById('menuResumeBtn');
  if(btn) btn.style.display = readSave() ? 'block' : 'none';
}
function doExit(){
  persistGame();
  releaseWakeLock();
  document.body.innerHTML = '<div style="height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:24px;color:#eaf3ff;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">' +
    '<div style="font-size:46px;">🛬</div><div style="font-size:17px;font-weight:800;letter-spacing:2px;">ВЫЛЕТ ЗАВЕРШЁН</div>' +
    '<div style="font-size:11.5px;color:#8ba3bd;font-family:Menlo,monospace;">Позиция сохранена. Можно закрыть окно.</div></div>';
  try{ window.close(); }catch(e){}
}
const SWITCHES = { swSound:'sound', swHaptic:'haptic', swChat:'chat', swWake:'wake', swFx:'fx', swMusic:'music' };
function syncSettingsUI(){
  Object.keys(SWITCHES).forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.classList.toggle('on', !!Settings[SWITCHES[id]]);
  });
  setSegActive(document.getElementById('speedSeg2'), 's', gameSpeed);
  setSegActive(document.getElementById('themeSeg'), 't', Settings.theme);
  setSegActive(document.getElementById('scaleSeg'), 'z', String(Settings.scale || 100));
  setSegActive(document.getElementById('throwSeg'), 'r', Settings.throwMode || 'physics');
  themeBtnLabel();
}
const throwSegEl = document.getElementById('throwSeg');
if(throwSegEl){
  throwSegEl.addEventListener('click', (e)=>{
    const b = e.target.closest ? e.target.closest('button') : null;
    if(!b || !b.dataset.r) return;
    Settings.throwMode = (b.dataset.r === 'fast') ? 'fast' : (b.dataset.r === 'instant' ? 'instant' : 'physics');
    Settings.save();
    setSegActive(throwSegEl, 'r', Settings.throwMode);
    try{ Sound.click(); }catch(err){}
  });
  try{ setSegActive(throwSegEl, 'r', Settings.throwMode || 'physics'); }catch(err){}
}
function addTapListener(el, fn){
  let tapped = false;
  el.addEventListener('touchend', function(e){
    e.preventDefault();
    if(tapped) return;
    tapped = true;
    setTimeout(()=>{ tapped = false; }, 400);
    fn();
  }, { passive: false });
  el.addEventListener('click', function(e){
    if(tapped) return;
    fn();
  });
}
document.querySelectorAll('[data-menu]').forEach(btn=>{
  addTapListener(btn, ()=>{
    const act = btn.dataset.menu;
    try{ Sound.unlock(); Sound.click(); }catch(e){}
    try{ Haptic.tap(); }catch(e){}
    if(act === 'play'){ refreshResumeBlock(); showScreen('setup'); }
    else if(act === 'resume'){ resumeGame(); }
    else if(act === 'settings'){ syncSettingsUI(); openSheet('settingsSheet'); }
    else if(act === 'rules'){ openSheet('rulesSheet'); }
    else if(act === 'stats'){ renderStatsSheet(); openSheet('statsSheet'); }
    else if(act === 'online'){ netOpenHome(); showScreen('online'); }
    else if(act === 'credits'){ openSheet('creditsSheet'); }
    else if(act === 'exit'){ doExit(); }
  });
});
Object.keys(SWITCHES).forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('click', ()=>{
    const key = SWITCHES[id];
    Settings[key] = !Settings[key];
    el.classList.toggle('on', Settings[key]);
    Settings.save();
    if(key === 'sound'){
      Sound.setMuted(!Settings.sound);
      const sb = document.getElementById('soundBtn');
      if(sb) sb.textContent = Settings.sound ? '🔊' : '🔇';
    }
    if(key === 'haptic') Haptic.enabled = Settings.haptic;
    if(key === 'music'){ try{ if(Settings.music) Music.start(); else Music.stop(); }catch(err){} }
    if(key === 'wake'){ if(Settings.wake && inGame()) requestWakeLock(); else releaseWakeLock(); }
    if(Settings.sound) Sound.click();
  });
});
const speedSeg2 = document.getElementById('speedSeg2');
if(speedSeg2){
  speedSeg2.addEventListener('click', (e)=>{
    const b = e.target.closest('button');
    if(!b) return;
    gameSpeed = b.dataset.s;
    setSegActive(speedSeg2, 's', gameSpeed);
    setSegActive(document.getElementById('speedSeg'), 's', gameSpeed);
    Sound.click();
  });
}
function themeBtnLabel(){
  const b = document.getElementById('pauseTheme');
  if(b) b.textContent = (Settings.theme === 'light') ? '🌙 Ночная тема' : '☀️ Светлая тема';
}
const scaleSeg = document.getElementById('scaleSeg');
if(scaleSeg){
  scaleSeg.addEventListener('click', (e)=>{
    const b = e.target.closest('button');
    if(!b) return;
    applyScale(b.dataset.z);
    setSegActive(scaleSeg, 'z', String(Settings.scale));
    try{ Sound.click(); }catch(err){}
  });
}
const themeSeg = document.getElementById('themeSeg');
if(themeSeg){
  themeSeg.addEventListener('click', (e)=>{
    const b = e.target.closest('button');
    if(!b) return;
    applyTheme(b.dataset.t);
    setSegActive(themeSeg, 't', Settings.theme);
    themeBtnLabel();
    try{ Sound.click(); }catch(err){}
  });
}
const pauseThemeBtn = document.getElementById('pauseTheme');
if(pauseThemeBtn){
  pauseThemeBtn.addEventListener('click', ()=>{
    applyTheme(Settings.theme === 'light' ? 'dark' : 'light');
    setSegActive(document.getElementById('themeSeg'), 't', Settings.theme);
    themeBtnLabel();
    try{ Sound.click(); }catch(err){}
  });
}
themeBtnLabel();
const setupBackBtn = document.getElementById('setupBack');
if(setupBackBtn) setupBackBtn.addEventListener('click', ()=>{ Sound.click(); showScreen('menu'); refreshMenuResume(); });
const resetStatsBtn = document.getElementById('resetStatsBtn');
if(resetStatsBtn) resetStatsBtn.addEventListener('click', ()=>{
  if(confirm('Сбросить всю статистику налёта?')){ metaResetAll(); Sound.click(); }
});
setTimeout(()=>{
  try{
    Sound.setMuted(!Settings.sound);
    Haptic.enabled = Settings.haptic;
    const sb = document.getElementById('soundBtn');
    if(sb) sb.textContent = Settings.sound ? '🔊' : '🔇';
    refreshMenuResume();
  }catch(e){}
}, 0);

/* ============================================================
   БЛОК 4 · ИСТОРИЯ ХОДОВ И СТАТИСТИКА ПАРТИИ
   ============================================================ */
let moveHistory = [];
let stats = {};

function addHistory(text, color){
  moveHistory.push({ text, color: color || '#e5e7eb' });
  logMsg(text);
  renderHistory();
}

function renderHistory(){
  const list = document.getElementById('histList');
  if(!list) return;
  if(!moveHistory.length){ list.innerHTML = '<div class="hist-empty">Ходов пока нет</div>'; return; }
  list.innerHTML = moveHistory
    .map((h,i)=>`<div class="hist-item"><span class="hist-n">${i+1}</span><span style="color:${h.color}">${h.text}</span></div>`)
    .slice(-120).reverse().join('');
}

function recordMove(p, act, res, finished){
  const st = stats[p.dir];
  if(st){
    st.moves++;
    if(diceValue === 6) st.sixes++;
    if(res.capturedOpponent) st.captures++;
    if(act.type === 'teleport') st.teleports++;
    if(finished) st.finished++;
  }
  const col = COLOR[p.dir];
  let what;
  if(act.type === 'enter') what = 'вышла из базы';
  else if(act.type === 'teleport') what = '🌀 телепорт в угол';
  else if(act.type === 'home') what = finished ? '🏠 зашла в дом' : 'ход в доме';
  else what = 'ход на ' + diceValue;
  if(res.capturedOpponent) what += ' · ⚔️ срубил фишку';
  addHistory(`${col.icon} ${p.name}: ${what} (🎲${diceValue})`, col.hex);
}

function renderStats(){
  const box = document.getElementById('statsBox');
  if(!box) return;
  const rows = players.map(p=>{
    const s = stats[p.dir] || {};
    const col = COLOR[p.dir];
    return `<tr><td class="nm" style="color:${col.hex}">${col.icon} ${p.name}</td>`+
      `<td class="num">${getHomeCount(p)}/4</td>`+
      `<td class="num">${s.moves||0}</td>`+
      `<td class="num">${s.captures||0}</td>`+
      `<td class="num">${s.lost||0}</td>`+
      `<td class="num">${s.sixes||0}</td></tr>`;
  }).join('');
  box.innerHTML = `<table><thead><tr><th class="nm">Игрок</th><th class="num">Дом</th><th class="num">Ходы</th><th class="num">Срубил</th><th class="num">Потерял</th><th class="num">🎲 6</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function initPlayers(config){
  players = config.map(cfg=>({
    dir: cfg.dir, isAI: cfg.isAI, name: COLOR[cfg.dir].name,
    grudge: {}, lastHitBy: null, revengeOn: null,
    pieces: [{step:-1,lap:0},{step:-1,lap:0},{step:-1,lap:0},{step:-1,lap:0}],
  }));
  currentIdx = 0;
  gameOver = false;
  stats = {};
  players.forEach(p=>{ stats[p.dir] = { moves:0, captures:0, lost:0, sixes:0, teleports:0, finished:0, points:0, bonuses:0 }; });
  moveHistory = [];
  renderHistory();
}

function isPieceInHome(pc) {
  if (!pc || pc.step < 0) return false;
  const homeEnterStep = pc.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  return pc.step >= homeEnterStep;
}

function getHomeCount(p){
  if(!p || !p.pieces) return 0;
  return p.pieces.filter(pc => isPieceInHome(pc)).length;
}

function activePlayer(){ return players[currentIdx]; }
function playerIdxByDir(dir){ return players.findIndex(p=>p.dir===dir); }

function movingIdx(){
  if(gameMode==='teams' || gameMode==='physical'){
    const cur = players[currentIdx];
    if(cur && getHomeCount(cur) >= winTarget()){
      const pi = playerIdxByDir(PARTNER_DIR[cur.dir]);
      if(pi >= 0 && getHomeCount(players[pi]) < 4) return pi;
    }
  }
  return currentIdx;
}
function mover(){ return players[movingIdx()]; }

function isCornerPiece(p, i){
  const pc = p.pieces[i];
  const homeEnterStep = pc.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  if(pc.step < 0 || pc.step >= homeEnterStep) return false;
  return isCornerCell(stepToCell(p.dir, pc.step, pc.lap));
}

function otherPiecesAt(dir, step, lap, excludePlayerDir){
  const cell = stepToCell(dir, step, lap);
  if(!cell) return [];
  const key = cell[0]+','+cell[1];
  const res=[];
  players.forEach((p,pi)=>{
    if(p.dir===excludePlayerDir) return;
    p.pieces.forEach((pc,ci)=>{
      if(pc.step<0) return;
      if(isPieceInHome(pc)) return;
      const c2 = stepToCell(p.dir, pc.step, pc.lap);
      if(c2 && c2[0]+','+c2[1]===key) res.push({playerIdx:pi, pieceIdx:ci});
    });
  });
  return res;
}

function ownAt(p, ns, excludeIdx, lap){
  const homeEnterStep = lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  const targetHomeStep = lap === 0 ? FINISH_STEP : FINISH_STEP + RING_LEN;
  if(ns > targetHomeStep) return false;
  const cell = stepToCell(p.dir, ns, lap);
  return p.pieces.some((pc,idx)=>{
    if(idx===excludeIdx) return false;
    if(pc.step<0) return false;
    if(ns >= homeEnterStep) {
      return pc.step === ns && pc.lap === lap;
    }
    return sameCell(stepToCell(p.dir, pc.step, pc.lap), cell);
  });
}

function teleportStepFor(p, i){
  const pc = p.pieces[i];
  const cell = stepToCell(p.dir, pc.step, pc.lap);
  const destIdx = nextCornerRingIdx(cell);
  if(destIdx==null) return null;
  const currentIdx = (BOARD.entryIdx[p.dir] + pc.step) % RING_LEN;
  let diff = destIdx - currentIdx;
  if(diff <= 0) diff += RING_LEN;
  const dest = pc.step + diff;
  const homeEnterStep = pc.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  /* Финиш — это только 4 домашние клетки: телепорт в угол не может "завести" фишку в дом */
  if(dest >= homeEnterStep) return null;
  if(isCrazy() && blockadeAt(stepToCell(p.dir, dest, pc.lap))) return null;
  return dest;
}

function getActions(p, i){
  const pc = p.pieces[i];
  const acts = [];
  if(isCrazy() && pc.frozen > 0) return acts;
  const homeEnterStep = pc.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  const targetHomeStep = pc.lap === 0 ? FINISH_STEP : FINISH_STEP + RING_LEN;
  const underHomeStep = homeEnterStep - 1;

  if(pc.step >= homeEnterStep){
    if (getHomeCount(p) >= winTarget()) {
      return acts;
    }
    const raw = pc.step + diceValue;
    if(raw <= targetHomeStep && !ownAt(p, raw, i, pc.lap)) {
      acts.push({type:'home', label:'🏠 Ход в доме', ns:raw});
    }
    return acts;
  }

  if(pc.step < 0){
    if((diceValue === 6 || isDuel()) && !ownAt(p, 0, i, pc.lap)) {
      acts.push({type:'enter', label:'Выйти из базы', ns:0});
    }
    return acts;
  }

  if(diceValue === 1 && pc.step < homeEnterStep && isCornerPiece(p,i)){
    const dest = teleportStepFor(p,i);
    if(dest != null && !ownAt(p, dest, i, pc.lap)) {
      acts.push({type:'teleport', label:'🌀 Телепорт', ns:dest});
    }
  }

  const rawRoll = pc.step + diceValue;
  const raw = blockadeStopStep(p, pc, rawRoll);
  if(raw <= pc.step) return acts;

  if(raw <= underHomeStep){
    if(!ownAt(p, raw, i, pc.lap)) {
      acts.push({type:'ring', label:'Ход вперёд', ns:raw});
    }
  }

  if(raw >= homeEnterStep && raw <= targetHomeStep){
    if(!ownAt(p, raw, i, pc.lap)) {
      acts.push({type:'home', label:'🏠 В дом', ns:raw});
    }
  }

  return acts;
}

function getPhysicalTargetsForPiece(p, i) {
  const targets = [];
  const savedDice = diceValue;
  for (let d = 1; d <= 6; d++) {
    diceValue = d;
    const acts = getActions(p, i);
    acts.forEach(act => {
      let cell = null;
      if (act.type === 'enter') {
        cell = stepToCell(p.dir, 0, 0);
      } else if (act.type === 'teleport') {
        cell = stepToCell(p.dir, act.ns, p.pieces[i].lap);
      } else {
        let lap = p.pieces[i].lap;
        if (act.type === 'lap2') lap = 1;
        cell = stepToCell(p.dir, act.ns, lap);
      }
      if (cell) {
        targets.push({
          cell: cell,
          act: act,
          d: d,
          pieceIdx: i
        });
      }
    });
  }
  diceValue = savedDice;
  return targets;
}

function executeAction(i, act){
  const p = mover();
  const pc = p.pieces[i];
  let lap = pc.lap;
  if(act.type==='lap2') lap = 1;
  const res = applyMoveTo(p, i, act.ns, lap);
  return { ...res, teleported: act.type==='teleport', lap2: act.type==='lap2' };
}

function applyMoveTo(p, pieceIdx, ns, lap){
  const pc = p.pieces[pieceIdx];
  pc.step = ns;
  pc.lap = lap;
  let capturedOpponent = false;
  let skippedInHome = false;
  const homeEnterStep = lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;

  if(ns < homeEnterStep){
    const hits = otherPiecesAt(p.dir, ns, lap, p.dir);
    hits.forEach(h=>{
      const targetPlayer = players[h.playerIdx];
      const op = targetPlayer.pieces[h.pieceIdx];
      const targetHome = op.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
      if(op.step >= targetHome){
        skippedInHome = true;
      } else if(pieceShielded(op) || op.shield){
        if(!pieceShielded(op)) op.shield = false;
        emoteAtCell(stepToCell(targetPlayer.dir, op.step, op.lap), EMO_ICON.shield);
        radio('Щит выдержал удар!', targetPlayer.dir);
        Sound.bonus();
      } else {
        emoteAtCell(stepToCell(targetPlayer.dir, op.step, op.lap), EMO_ICON.hit);
        radio(pickOne(RADIO_PHRASES.hit), targetPlayer.dir);
        const lostStep = op.step;
        op.step = -1;
        op.lap = 0;
        capturedOpponent = true;
        if(stats[targetPlayer.dir]) stats[targetPlayer.dir].lost++;
        /* месть: жертва запоминает обидчика, мститель гасит счёт */
        if(grudgeOf(p, targetPlayer.dir) >= 1) p.revengeOn = targetPlayer.dir;
        if(p.grudge && p.grudge[targetPlayer.dir]) p.grudge[targetPlayer.dir] = Math.max(0, p.grudge[targetPlayer.dir] - 1.5);
        addGrudge(targetPlayer, p.dir, lostStep >= LAP_STEPS - 14 ? 1.6 : 1);
      }
    });
  }
  return { capturedOpponent, skippedInHome };
}

function computeMovable(){
  const p = mover();
  const res=[];
  p.pieces.forEach((pc,i)=>{ if(getActions(p,i).length>0) res.push(i); });
  return res;
}

function checkWin(){
  if(gameMode==='teams' || gameMode==='physical'){
    const teams = {};
    players.forEach(pl=>{
      const t = TEAM_OF[pl.dir];
      if(!teams[t]) teams[t] = 0;
      teams[t] += getHomeCount(pl);
    });
    return Object.values(teams).some(total => total >= 8);
  }
  return getHomeCount(mover()) >= winTarget();
}

function nextTurn(extra){
  if(bonusExtraRoll){ bonusExtraRoll = false; extra = true; }
  if(!extra){ currentIdx = (currentIdx+1) % players.length; }
  if(!extra){ const nm = mover(); if(nm) decayGrudge(nm); players.forEach(p=>{ p.revengeOn = null; }); }
  if(isCrazy() && !extra){
    const fm = mover();
    if(fm) fm.pieces.forEach(pc=>{ if(pc.frozen > 0) pc.frozen--; });
    tickBlockades();
  }
  diceValue = 1;
  mustPickPiece = false;
  movablePieces = [];
  selectedPiece = -1;
  validTargets = [];
  clearChoice();
  maybeSpawnBonus();
  crazyEvent();
  renderScoreStrip();
  updateTurnBanner();
  try{ musicSync(); }catch(e){}
  persistGame();
}

const canvas = document.getElementById('boardCanvas');
const ctx = canvas.getContext('2d');
let cellSize = 10;

function resizeCanvas(){
  const wrap = document.getElementById('boardWrap');
  const scaleK = ((Settings && Settings.scale) || 100)/100;
  const size = Math.min(wrap.clientWidth-4, wrap.clientHeight-4, Math.round(880/scaleK));
  canvas.width = size * (window.devicePixelRatio||1);
  canvas.height = size * (window.devicePixelRatio||1);
  canvas.style.width = size+'px';
  canvas.style.height = size+'px';
  cellSize = canvas.width / N;
  draw();
}

function inCornerBlock(r,c){
  const tl = r<L && c<L;
  const tr = r<L && c>=L+W;
  const bl = r>=L+W && c<L;
  const br = r>=L+W && c>=L+W;
  return tl||tr||bl||br;
}
function cornerDirFor(r,c){
  const tl = r<L && c<L;
  const tr = r<L && c>=L+W;
  const bl = r>=L+W && c<L;
  const br = r>=L+W && c>=L+W;
  if(tl) return 'left';
  if(tr) return 'top';
  if(br) return 'right';
  if(bl) return 'bottom';
  return null;
}
function px(r,c){ return { x:c*cellSize, y:r*cellSize }; }

function entryDirForCell(r,c){
  for(const d of DIRS){
    const [er,ec] = BOARD.ring[BOARD.entryIdx[d]];
    if(er===r && ec===c) return d;
  }
  return null;
}

/* Только в КРЕЙЗИ: фишка получает тёмную подложку и ярк��й контур, чтобы не теряться среди бонусов */
function drawCrazyPieceHalo(cx, cy, col){
  if(!isCrazy()) return;
  ctx.save();
  /* тёмный кратер — гасит пёстрые бонусы под фишкой */
  ctx.fillStyle = TH().crater;
  ctx.beginPath(); ctx.arc(cx, cy, cellSize*0.52, 0, 7); ctx.fill();
  /* цветное свечение команды */
  ctx.shadowColor = col.hex;
  ctx.shadowBlur = cellSize*0.5;
  ctx.strokeStyle = col.hex;
  ctx.lineWidth = Math.max(1.6, cellSize*0.1);
  ctx.beginPath(); ctx.arc(cx, cy, cellSize*0.52, 0, 7); ctx.stroke();
  ctx.shadowBlur = 0;
  /* белый контур для максимального контраста на планшете */
  ctx.strokeStyle = TH().halo;
  ctx.lineWidth = Math.max(1.2, cellSize*0.05);
  ctx.beginPath(); ctx.arc(cx, cy, cellSize*0.585, 0, 7); ctx.stroke();
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = TH().boardBg;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = TH().quad;
  const tPx = px(0, L+1);
  ctx.fillRect(tPx.x, tPx.y, (W-2)*cellSize, L*cellSize);
  const bPx = px(L+W, L+1);
  ctx.fillRect(bPx.x, bPx.y, (W-2)*cellSize, L*cellSize);
  const lPx = px(L+1, 0);
  ctx.fillRect(lPx.x, lPx.y, L*cellSize, (W-2)*cellSize);
  const rPx = px(L+1, L+W);
  ctx.fillRect(rPx.x, rPx.y, L*cellSize, (W-2)*cellSize);

  DIRS.forEach(dir=>{
    const col = COLOR[dir];
    for(let r=0;r<N;r++) for(let c=0;c<N;c++){
      if(inCornerBlock(r,c) && cornerDirFor(r,c)===dir){
        const {x,y}=px(r,c);
        ctx.fillStyle = col.hex+'26';
        ctx.fillRect(x,y,cellSize,cellSize);
      }
    }
  });

  DIRS.forEach(dir=>{
    const col = COLOR[dir];
    let r0,c0;
    if(dir==='top'){ r0=0; c0=L+W; }
    if(dir==='right'){ r0=L+W; c0=L+W; }
    if(dir==='bottom'){ r0=L+W; c0=0; }
    if(dir==='left'){ r0=0; c0=0; }
    const {x,y}=px(r0,c0);
    ctx.strokeStyle = col.hex+'66';
    ctx.lineWidth = Math.max(1.5,cellSize*0.08);
    roundRect(x+cellSize*0.35, y+cellSize*0.35, cellSize*(L-0.7), cellSize*(L-0.7), cellSize*0.8);
    ctx.stroke();
  });

  BOARD.ring.forEach(([r,c])=>{
    const {x,y}=px(r,c);
    const cg = ctx.createLinearGradient(x, y, x, y+cellSize);
    cg.addColorStop(0, TH().cellTop);
    cg.addColorStop(1, TH().cellBot);
    ctx.fillStyle = cg;
    ctx.strokeStyle = TH().cellLine;
    ctx.lineWidth = Math.max(1, cellSize*0.045);
    roundRect(x+1.5, y+1.5, cellSize-3, cellSize-3, cellSize*0.25);
    ctx.fill(); ctx.stroke();

    const ed = entryDirForCell(r,c);
    if(ed){
      ctx.strokeStyle = COLOR[ed].hex;
      ctx.lineWidth = Math.max(2, cellSize*0.12);
      ctx.beginPath();
      ctx.arc(x+cellSize/2, y+cellSize/2, cellSize*0.28, 0, 7);
      ctx.stroke();
    }
    
    if(isCornerCell([r,c])){
      ctx.fillStyle = TH().pad;
      ctx.beginPath();
      ctx.arc(x+cellSize/2, y+cellSize/2, cellSize*0.35, 0, 7);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,80,0.85)';
      ctx.lineWidth = Math.max(1, cellSize*0.06);
      ctx.stroke();
      ctx.fillStyle = '#f0b02b';
      ctx.font = 'bold '+(cellSize*0.5)+'px sans-serif';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('⟳', x+cellSize/2, y+cellSize/2+cellSize*0.02);
    }
  });

  /* вход в домашнюю полосу: стрелка в сторону финиша */
  const entryArrows = [
    { cell:[0, C],   dir:'top',    vx:0,  vy:1  },
    { cell:[C, N-1], dir:'right',  vx:-1, vy:0  },
    { cell:[N-1, C], dir:'bottom', vx:0,  vy:-1 },
    { cell:[C, 0],   dir:'left',   vx:1,  vy:0  }
  ];
  entryArrows.forEach(a=>{
    const {x,y} = px(a.cell[0], a.cell[1]);
    const col = COLOR[a.dir];
    const cx = x + cellSize/2, cy = y + cellSize/2;
    const L = cellSize*0.3, HW = cellSize*0.22, HL = cellSize*0.26;
    const ux = a.vx, uy = a.vy, pxn = -uy, pyn = ux;
    ctx.save();
    ctx.fillStyle = TH().arrowCell;
    roundRect(x+1.5, y+1.5, cellSize-3, cellSize-3, cellSize*0.22); ctx.fill();
    ctx.strokeStyle = col.hex;
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, cellSize*0.13);
    ctx.beginPath();
    ctx.moveTo(cx - ux*L, cy - uy*L);
    ctx.lineTo(cx + ux*(L-HL*0.7), cy + uy*(L-HL*0.7));
    ctx.stroke();
    ctx.fillStyle = col.hex;
    ctx.beginPath();
    ctx.moveTo(cx + ux*L, cy + uy*L);
    ctx.lineTo(cx + ux*(L-HL) + pxn*HW, cy + uy*(L-HL) + pyn*HW);
    ctx.lineTo(cx + ux*(L-HL) - pxn*HW, cy + uy*(L-HL) - pyn*HW);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  });

  drawTeleportArrows();

  DIRS.forEach(dir=>{
    const col = COLOR[dir];
    BOARD.homeStretches[dir].forEach(([r,c])=>{
      const {x,y}=px(r,c);
      const grad = ctx.createLinearGradient(x, y, x+cellSize, y+cellSize);
      grad.addColorStop(0, lighten(col.hex, 0.15));
      grad.addColorStop(1, col.dark);
      ctx.fillStyle = grad;
      roundRect(x+1.5, y+1.5, cellSize-3, cellSize-3, cellSize*0.25);
      ctx.fill();
      
      ctx.fillStyle = TH().homeInner;
      roundRect(x+cellSize*0.2, y+cellSize*0.2, cellSize*0.6, cellSize*0.6, cellSize*0.15);
      ctx.fill();
    });
  });

  DIRS.forEach(dir=>{
    const col = COLOR[dir];
    BASE_SLOTS[dir].forEach(([r,c])=>{
      const {x,y}=px(r,c);
      ctx.fillStyle = TH().slot;
      ctx.beginPath();
      ctx.arc(x+cellSize/2, y+cellSize/2, cellSize*0.42, 0, 7);
      ctx.fill();
      ctx.strokeStyle = col.hex+'55';
      ctx.lineWidth = Math.max(1.5, cellSize*0.06);
      ctx.stroke();
    });
  });

  ctx.font = (cellSize*3.8)+'px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  DIRS.forEach(dir=>{
    let r,c;
    if(dir==='top'){ r=2.5; c=15.5; }
    if(dir==='right'){ r=15.5; c=15.5; }
    if(dir==='bottom'){ r=15.5; c=2.5; }
    if(dir==='left'){ r=2.5; c=2.5; }
    const {x,y}=px(r,c);
    ctx.globalAlpha=TH().watermark;
    ctx.fillText(COLOR[dir].icon, x, y);
    ctx.globalAlpha=1;
  });

  const now = performance.now();
  /* бонусы рисуем под фишками, чтобы фишки было видно */
  drawBonuses(now);
  const mp = mover();
  players.forEach((p,pi)=>{
    const col = COLOR[p.dir];
    const playerAllHome = getHomeCount(p) >= winTarget();
    p.pieces.forEach((pc,i)=>{
      if(animState && animState.playerIdx===pi && animState.pieceIdx===i) return; 
      let r,c;
      if(pc.step<0){ [r,c]=BASE_SLOTS[p.dir][i]; }
      else { 
        const cell = stepToCell(p.dir, pc.step, pc.lap);
        if(cell) { r=cell[0]; c=cell[1]; }
      }
      if(r===undefined) return;
      const {x,y}=px(r,c);
      const isLocked = playerAllHome;
      const isMov = !isLocked && (gameMode==='physical' ? (p===mp) : (movablePieces.includes(i) && p===mp));
      const isSel = selectedPiece===i && p===mp;
      const pulse = isMov ? (0.5+0.5*Math.sin(now/180)) : 0;
      drawCrazyPieceHalo(x+cellSize/2, y+cellSize/2, col);
      drawPiece(x+cellSize/2, y+cellSize/2, cellSize*(isCrazy()?0.44:0.4), col, isMov, isSel, pulse);
      drawShieldAura(x+cellSize/2, y+cellSize/2, pc, now);
      if(isCrazy() && pc.frozen > 0){
        ctx.save();
        ctx.font = (cellSize*0.42) + 'px sans-serif';
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🧊', x+cellSize*0.78, y+cellSize*0.24);
        ctx.restore();
      }
    });
  });

  if (gameMode === 'physical' && validTargets.length > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 150);
    validTargets.forEach(tgt => {
      const [r, c] = tgt.cell;
      const { x, y } = px(r, c);
      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * (0.38 + 0.08 * pulse), 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(126,200,255,0.28)';
      ctx.fill();
      ctx.lineWidth = Math.max(2, cellSize * 0.1);
      ctx.strokeStyle = '#7ec8ff';
      ctx.setLineDash([cellSize * 0.2, cellSize * 0.15]);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, cellSize * 0.22, 0, 2 * Math.PI);
      ctx.fillStyle = '#7ec8ff';
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + (cellSize * 0.3) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tgt.d, cx, cy + cellSize * 0.02);
      ctx.restore();
    });
  }

  if(animState){
    const st = animState;
    const col = COLOR[st.dir];
    const t = Math.min(1, (now-st.segStart)/st.segDur);
    const [r1,c1] = st.cells[st.idx];
    const nCell = st.cells[st.idx+1] || st.cells[st.idx];
    const [r2,c2] = nCell;
    let cx,cy,scale=1;
    if(st.kind==='teleport'){
      const p1=px(r1,c1), p2=px(r2,c2);
      if(t<0.5){ cx=p1.x+cellSize/2; cy=p1.y+cellSize/2; scale=Math.max(0.15,1-t*1.7); }
      else { cx=p2.x+cellSize/2; cy=p2.y+cellSize/2; scale=Math.max(0.15,(t-0.5)*1.7); }
    } else {
      const ease = t<0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
      const rr=r1+(r2-r1)*ease, cc=c1+(c2-c1)*ease;
      const pp=px(rr,cc);
      const arc = Math.sin(Math.PI*t)*cellSize*0.4;
      cx=pp.x+cellSize/2; cy=pp.y+cellSize/2-arc; scale=1+Math.sin(Math.PI*t)*0.18;
    }
    spawnTrail(cx, cy, col.hex);
    drawCrazyPieceHalo(cx, cy, col);
    drawPiece(cx,cy,cellSize*0.4*scale,col,true,false,0.8);
  }

  poofs = poofs.filter(pf=>{
    const t=(now-pf.start)/450;
    if(t>=1) return false;
    ctx.save();
    ctx.globalAlpha = Math.max(0,1-t);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = Math.max(2.5, cellSize*0.1);
    ctx.beginPath();
    ctx.arc(pf.x, pf.y, cellSize*0.2 + t*cellSize*0.8, 0, 7);
    ctx.stroke();
    ctx.restore();
    return true;
  });

  drawEffects(now);
  drawEmotes(now);
  /* HUD-uglы убраны: давали лишние голубые рамки у баз */
}

function drawTeleportArrows(){
  const center = c=>{ const {x,y}=px(c[0],c[1]); return [x+cellSize/2,y+cellSize/2]; };
  const pairs = [['tl','tr'],['tr','br'],['br','bl'],['bl','tl']];
  ctx.strokeStyle = 'rgba(240,176,43,0.4)';
  ctx.fillStyle = 'rgba(240,176,43,0.4)';
  ctx.lineWidth = Math.max(2, cellSize*0.08);
  pairs.forEach(([a,b])=>{
    const [x1,y1]=center(CORNER_CELLS[a]);
    const [x2,y2]=center(CORNER_CELLS[b]);
    const dx=x2-x1, dy=y2-y1, len=Math.hypot(dx,dy);
    const ux=dx/len, uy=dy/len;
    const sx=x1+ux*cellSize*0.36, sy=y1+uy*cellSize*0.36;
    const ex=x2-ux*cellSize*0.36, ey=y2-uy*cellSize*0.36;
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
    const ah=cellSize*0.22;
    ctx.beginPath();
    ctx.moveTo(ex,ey);
    ctx.lineTo(ex-ux*ah-uy*ah*0.6, ey-uy*ah+ux*ah*0.6);
    ctx.lineTo(ex-ux*ah+uy*ah*0.6, ey-uy*ah-ux*ah*0.6);
    ctx.closePath(); ctx.fill();
  });
}

function drawPiece(cx,cy,rad,col,highlight,selected,pulse){
  pulse = pulse||0;
  ctx.save();
  if(highlight||selected){
    ctx.shadowColor = selected ? '#ffffff' : col.hex; 
    ctx.shadowBlur = rad*(1.4+0.8*pulse);
  }
  
  const grad = ctx.createRadialGradient(cx-rad*0.35, cy-rad*0.35, rad*0.05, cx, cy, rad);
  grad.addColorStop(0, lighten(col.hex, 0.45));
  grad.addColorStop(0.5, col.hex);
  grad.addColorStop(1, col.dark);
  
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx,cy,rad,0,7); ctx.fill();
  
  ctx.lineWidth = Math.max(1.5, rad*0.15);
  ctx.strokeStyle = lighten(col.dark, 0.2);
  ctx.stroke();
  
  ctx.beginPath(); ctx.arc(cx, cy, rad*0.66, 0, 7);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = Math.max(0.8, rad*0.09);
  ctx.stroke();
  drawStar(cx, cy, rad*0.5);
  ctx.beginPath(); ctx.arc(cx-rad*0.45, cy-rad*0.48, rad*0.2, 0, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.38)'; ctx.fill();

  if(highlight||selected){
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rad*(1.35+0.18*pulse), 0, 7);
    ctx.strokeStyle = selected ? '#ffffff' : col.hex;
    ctx.lineWidth = Math.max(2, rad*0.14);
    ctx.setLineDash([rad*0.4, rad*0.3]);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.restore();
  }
}

function lighten(hex, amt){
  const n = parseInt(hex.slice(1),16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=Math.min(255,r+255*amt); g=Math.min(255,g+255*amt); b=Math.min(255,b+255*amt);
  return `rgb(${r|0},${g|0},${b|0})`;
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

const dice3d = document.getElementById('dice3d');
const PIP_MAP = { 1:[4], 2:[0,8], 3:[0,4,8], 4:[0,2,6,8], 5:[0,2,4,6,8], 6:[0,2,3,5,6,8] };
const FACE_VALUE = { front:1, right:2, top:3, bottom:4, left:5, back:6 };
const ROT = { 1:{x:0,y:0}, 2:{x:0,y:-90}, 3:{x:-90,y:0}, 4:{x:90,y:0}, 5:{x:0,y:90}, 6:{x:180,y:0} };

document.querySelectorAll('.dice-face').forEach(faceEl=>{
  const val = FACE_VALUE[faceEl.dataset.face];
  for(let k=0;k<9;k++){
    const i = document.createElement('i');
    if(PIP_MAP[val].includes(k)) i.classList.add('on');
    faceEl.appendChild(i);
  }
});

const TILT_X = -14, TILT_Y = 18;
function setDiceRotation(value){
  const r = ROT[value];
  dice3d.style.transform = `rotateX(${r.x + TILT_X}deg) rotateY(${r.y + TILT_Y}deg)`;
}
setDiceRotation(1);

/* ============================================================
   БЛОК 5 · АВИАЦИОННЫЙ ЗВУК (турбины, форсаж, взрывы, радио)
   ============================================================ */
const Sound = (function(){
  let ctx=null, muted=false;
  function ac(){ if(!ctx){ const AC=window.AudioContext||window.webkitAudioContext; ctx=new AC(); } if(ctx.state==='suspended') ctx.resume(); return ctx; }
  function tone(freq,dur,type,vol,delay,freqTo){
    if(muted) return;
    try{
      const c=ac(), t0=c.currentTime+(delay||0);
      const o=c.createOscillator(), g=c.createGain();
      o.type=type||'sine'; o.frequency.setValueAtTime(freq,t0);
      if(freqTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,freqTo), t0+dur);
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.linearRampToValueAtTime(vol||0.15,t0+0.012);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0+dur+0.03);
    }catch(e){}
  }
  function noise(dur,vol,delay,ftype,f0,f1,q){
    if(muted) return;
    try{
      const c=ac(), t0=c.currentTime+(delay||0);
      const n=Math.max(1,Math.floor(c.sampleRate*dur));
      const buf=c.createBuffer(1,n,c.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<n;i++) d[i]=(Math.random()*2-1);
      const src=c.createBufferSource(); src.buffer=buf;
      const flt=c.createBiquadFilter();
      flt.type=ftype||'bandpass';
      flt.frequency.setValueAtTime(f0||900,t0);
      if(f1) flt.frequency.exponentialRampToValueAtTime(Math.max(40,f1), t0+dur);
      flt.Q.value=q||1;
      const g=c.createGain();
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.linearRampToValueAtTime(vol||0.12,t0+Math.min(0.05,dur*0.25));
      g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      src.connect(flt); flt.connect(g); g.connect(c.destination);
      src.start(t0);
    }catch(e){}
  }
  return {
    setMuted(v){ muted=v; },
    isMuted(){ return muted; },
    unlock(){ try{ ac(); }catch(e){} },
    roll(){ tone(110,0.5,'sawtooth',0.06,0,430); noise(0.5,0.05,0,'bandpass',600,2600,0.8); },
    hop(){ noise(0.1,0.055,0,'bandpass',700+Math.random()*500,320,1.2); tone(210+Math.random()*70,0.07,'triangle',0.045); },
    enter(){ noise(0.24,0.09,0,'lowpass',950,180,0.7); tone(85,0.28,'square',0.07,0.02,160); },
    teleport(){ noise(0.5,0.1,0,'bandpass',300,3200,1.4); tone(170,0.45,'sawtooth',0.07,0,950); },
    explosion(){ noise(0.8,0.3,0,'lowpass',1900,55,0.6); tone(66,0.6,'sawtooth',0.2,0,26); noise(0.22,0.15,0.01,'highpass',2400,900,0.5); },
    capture(){ this.explosion(); },
    finishPiece(){ noise(0.32,0.13,0,'lowpass',1200,190,0.8); tone(320,0.16,'triangle',0.1,0.16); tone(480,0.22,'triangle',0.1,0.3); },
    win(){ [523,659,784,1046].forEach((f,i)=> tone(f,0.3,'triangle',0.15,i*0.16)); tone(880,0.9,'sine',0.05,0.1,1320); noise(0.7,0.05,0,'bandpass',1300,600,1.5); },
    noMove(){ tone(300,0.16,'square',0.09); tone(235,0.22,'square',0.08,0.16); },
    alarm(){ for(let i=0;i<3;i++){ tone(880,0.12,'square',0.09,i*0.17); tone(640,0.12,'square',0.08,i*0.17+0.085); } },
    bonus(){ [660,880,1175].forEach((f,i)=> tone(f,0.14,'triangle',0.11,i*0.07)); noise(0.18,0.05,0,'highpass',2000,3200,0.7); },
    radioBeep(){ tone(1500,0.05,'sine',0.045); noise(0.14,0.03,0.03,'bandpass',1800,900,3); },
    click(){ tone(1200,0.04,'sine',0.05); noise(0.05,0.028,0,'highpass',2600,1800,1); }
  };
})();

const soundBtn = document.getElementById('soundBtn');
soundBtn.addEventListener('click', ()=>{
  Sound.setMuted(!Sound.isMuted());
  soundBtn.textContent = Sound.isMuted() ? '🔇' : '🔊';
  Settings.sound = !Sound.isMuted();
  Settings.save();
  if(!Sound.isMuted()) Sound.click();
});
document.getElementById('app').addEventListener('pointerdown', ()=>Sound.unlock(), {once:true});

const passBtn = document.getElementById('passBtn');

passBtn.addEventListener('click', () => {
  if (rolling || gameMode !== 'physical') return;
  const skipper = mover();
  addHistory(`${COLOR[skipper.dir].icon} ${skipper.name}: ⬛ ход пропущен`, COLOR[skipper.dir].hex);
  selectedPiece = -1;
  validTargets = [];
  nextTurn(false);
  draw();
});

const choiceBar = document.getElementById('choiceBar');
function clearChoice(){ choiceBar.innerHTML=''; }

function showChoice(i, acts){
  clearChoice();
  selectedPiece = i;
  acts.forEach(act=>{
    const b = document.createElement('button');
    b.textContent = act.label;
    if(act.type==='home'||act.type==='teleport') b.classList.add('primary');
    b.addEventListener('click', ()=>{ commitMove(i, act); });
    choiceBar.appendChild(b);
  });
  draw();
}

canvas.addEventListener('pointerdown', (e)=>{
  if(gameOver || rolling) return;
  if(NET.on && !netMyTurn()) return;
  Haptic.tap();
  const m = mover();
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width/rect.width, scaleY = canvas.height/rect.height;
  const mx = (e.clientX-rect.left)*scaleX, my=(e.clientY-rect.top)*scaleY;

  if(gameMode === 'physical'){
    if(selectedPiece >= 0 && validTargets.length > 0){
      let hitTarget = null;
      let bestD = 1e9;
      validTargets.forEach(tgt => {
        const {x, y} = px(tgt.cell[0], tgt.cell[1]);
        const cx = x + cellSize/2, cy = y + cellSize/2;
        const d = Math.hypot(mx - cx, my - cy);
        if(d < cellSize * 0.85 && d < bestD){
          bestD = d;
          hitTarget = tgt;
        }
      });

      if(hitTarget){
        diceValue = hitTarget.d;
        setDiceRotation(diceValue);
        const chosenAct = hitTarget.act;
        const chosenPiece = hitTarget.pieceIdx;
        selectedPiece = -1;
        validTargets = [];
        commitMove(chosenPiece, chosenAct);
        return;
      }
    }

    let bestPiece = -1, bestD = 1e9;
    m.pieces.forEach((pc, i) => {
      if(getHomeCount(m) >= winTarget()) return;

      let r, c;
      if(pc.step < 0) [r, c] = BASE_SLOTS[m.dir][i];
      else {
        const cell = stepToCell(m.dir, pc.step, pc.lap);
        if(cell) { r = cell[0]; c = cell[1]; }
      }
      if(r !== undefined){
        const {x, y} = px(r, c);
        const cx = x + cellSize/2, cy = y + cellSize/2;
        const d = Math.hypot(mx - cx, my - cy);
        if(d < cellSize * 0.85 && d < bestD){
          bestD = d;
          bestPiece = i;
        }
      }
    });

    if(bestPiece >= 0){
      selectedPiece = bestPiece;
      validTargets = getPhysicalTargetsForPiece(m, bestPiece);
      if(validTargets.length === 0){
        logMsg('У этой фишки нет возможных ходов');
      } else {
        logMsg('Нажмите на подсвеченную клетку для хода');
      }
      updateTurnBanner();
      draw();
      return;
    }

    selectedPiece = -1;
    validTargets = [];
    updateTurnBanner();
    draw();
    return;
  }

  if(!mustPickPiece) return;
  const slot = activePlayer();
  if(slot.isAI) return;
  
  let best=-1, bestD=1e9;
  movablePieces.forEach(i=>{
    const pc = m.pieces[i];
    let r,c;
    if(pc.step<0) [r,c]=BASE_SLOTS[m.dir][i]; 
    else { const cell = stepToCell(m.dir, pc.step, pc.lap); r=cell[0]; c=cell[1]; }
    const {x,y}=px(r,c);
    const cx=x+cellSize/2, cy=y+cellSize/2;
    const d = Math.hypot(mx-cx,my-cy);
    if(d<cellSize*0.9 && d<bestD){ bestD=d; best=i; }
  });
  if(best>=0){
    const acts = getActions(m, best);
    if(acts.length===1){ commitMove(best, acts[0]); }
    else if(acts.length>1){ showChoice(best, acts); diceHint.textContent='Выбери действие'; }
  }
});

function buildHopCells(dir, fromStep, fromLap, act){
  if(act.type==='enter') return [null, stepToCell(dir, 0, 0)];
  if(act.type==='teleport') return [stepToCell(dir, fromStep, fromLap), stepToCell(dir, act.ns, fromLap)];
  if(act.type==='lap2'){
    const cells=[stepToCell(dir, fromStep, fromLap)];
    for(let k=1;k<=diceValue;k++){ cells.push(stepToCell(dir, fromStep+k, fromLap)); }
    return cells;
  }
  const cells=[stepToCell(dir, fromStep, fromLap)];
  for(let s=fromStep+1; s<=act.ns; s++) cells.push(stepToCell(dir, s, fromLap));
  return cells;
}

function commitMove(i, act){
  const m = mover();
  const pIdx = players.indexOf(m);
  const pieceIdxNow = i;
  const fromStep = m.pieces[i].step;
  const fromLap = m.pieces[i].lap;
  
  const res = executeAction(i, act);
  mustPickPiece=false; movablePieces=[]; selectedPiece=-1; validTargets=[];
  clearChoice();

  let cells = buildHopCells(m.dir, fromStep, fromLap, act);
  if(act.type==='enter') cells[0] = BASE_SLOTS[m.dir][i];

  if(act.type==='enter') Sound.enter();
  else if(act.type==='teleport'){ Sound.teleport(); Haptic.teleport(); }
  else Sound.hop();

  animState = {
    playerIdx: pIdx, pieceIdx: pieceIdxNow, dir: m.dir, cells, idx:0,
    segStart: performance.now(),
    segDur: sp(cells.length>3 ? 90 : 180),
    kind: act.type,
    onDone: ()=>{
      if(res.capturedOpponent){
        const lc = cells[cells.length-1];
        spawnPoof(lc[0], lc[1]);
        spawnExplosion(lc[0], lc[1], COLOR[m.dir].hex);
        Sound.explosion();
        Haptic.capture();
        cameraPunch(lc);
      } else {
        Haptic.move();
      }
      const homeEnterStep = m.pieces[i].lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
      const finishedPiece = fromStep < homeEnterStep && act.ns >= homeEnterStep;
      if(finishedPiece){ Sound.finishPiece(); Haptic.finish(); }
      if(finishedPiece) emoteEvent('finish', m, i);
      else if(res.capturedOpponent){ emoteEvent(m.revengeOn ? 'revenge' : 'capture', m, i); m.revengeOn = null; }
      else if(act.type==='teleport') emoteEvent('teleport', m, i);
      else if(act.type==='enter') emoteEvent('enter', m, i);
      draw();
      recordMove(m, act, res, finishedPiece);
      checkBonusPickup(m, i);
      noteFinishOrder();
      if(checkWin()){ endGame(); return; }
      setTimeout(()=>{ nextTurn(diceValue===6 || (isDuel() && res.capturedOpponent)); afterTurnAdvance(); }, sp((res.capturedOpponent||res.teleported)?300:100));
    }
  };
}

const diceBtn = document.getElementById('diceBtn');
const diceHint = document.getElementById('diceHint');
const turnBanner = document.getElementById('turnBanner');
const logEl = document.getElementById('log');

function logMsg(t){ if(logEl) logEl.textContent = t||''; }

function updateTurnBanner(){
  const slot = activePlayer();
  const m = mover();
  const col = COLOR[m.dir];

  if(gameMode === 'teams' || gameMode === 'physical'){
    if(m !== slot){
      turnBanner.textContent = `${COLOR[slot.dir].icon} ${slot.name}: ход напарника → ${col.icon} ${m.name}`;
    } else {
      turnBanner.textContent = `${col.icon} Ход: ${m.name}`;
    }
  } else {
    turnBanner.textContent = `${col.icon} Ход: ${m.name}${m.isAI ? ' · ' + personaOf(m).icon + ' ' + personaOf(m).name : ''}${m.isAI && grudgeTotal(m) >= 1 ? ' 😡' : ''}`;
  }

  tintDice(m.dir);
  turnBanner.style.color = col.hex;
  turnBanner.style.borderColor = col.hex+'55';
  turnBanner.style.boxShadow = `0 0 0 1px ${col.hex}33, inset 0 0 12px ${col.hex}15`;
  
  passBtn.style.display = (gameMode === 'physical' && !gameOver) ? 'block' : 'none';

  if(gameMode === 'physical'){
    diceBtn.classList.add('disabled');
    if(selectedPiece >= 0 && validTargets.length > 0){
      diceHint.textContent = 'Нажми на клетку с числом';
    } else if (m !== slot) {
      diceHint.textContent = 'Ходишь фишками напарника';
    } else {
      diceHint.textContent = 'Кинь кубик и нажми фишку';
    }
    turnBanner.classList.toggle('pulse', !gameOver);
  } else {
    diceBtn.classList.toggle('disabled', slot.isAI || rolling || mustPickPiece || gameOver);
    diceBtn.classList.toggle('hot', !slot.isAI && !mustPickPiece && !rolling && !gameOver);
    turnBanner.classList.toggle('pulse', !slot.isAI && !mustPickPiece && !rolling && !gameOver);
  }
  try{ netAdjustTurnUI(); }catch(e){}
}

const diceStage = document.getElementById('diceStage');
function tintDice(dir){
  if(!diceBtn) return;
  const col = COLOR[dir];
  if(!col) return;
  diceBtn.style.setProperty('--dcol', col.hex);
  diceBtn.style.setProperty('--dcol-l', lighten(col.hex, 0.45));
  diceBtn.style.setProperty('--dcol-d', col.dark);
  diceBtn.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.2), 0 12px 28px rgba(0,0,0,0.55), 0 0 20px ' + col.hex + '55';
}
function diceParkHome(){
  diceBtn.style.transition = 'transform .34s cubic-bezier(.2,.9,.3,1)';
  diceBtn.style.transform = 'translate(-50%, -50%)';
  setTimeout(()=>{ diceBtn.style.transition = ''; }, 360);
}
/* ближайший угол ВПЕРЁД по ходу вращения, равносильный целевому (mod 360):
   кубик доворачивается в ту же сторону, а не отматывает тысячи градусов назад */
function alignAhead(cur, target){
  const t = ((target % 360) + 360) % 360;
  let a = Math.ceil((cur - t)/360)*360 + t;
  while(a - cur < 55) a += 360;
  return a;
}
function flashDieResult(v){
  if(!Settings.fx) return;
  const wrap = document.getElementById('boardWrap');
  if(!wrap) return;
  let el = document.getElementById('dieFlash');
  if(!el){ el = document.createElement('div'); el.id = 'dieFlash'; wrap.appendChild(el); }
  el.textContent = String(v);
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}
function rollDice(power, vx, vy){
  if(rolling || mustPickPiece || gameOver || gameMode === 'physical') return;
  if(NET.on && !netMyTurn()) return;
  rolling = true;
  diceBtn.classList.add('disabled');
  diceBtn.classList.remove('hot');
  tintDice(mover().dir);

  const base = fairDie();
  noteDieFace(base);
  const pw = Math.max(0.4, Math.min(2.6, power || (0.5 + RNG.float()*0.6)));

  const finish = ()=>{
    diceValue = base;
    const dDir = mover().dir;
    if(doubleNext[dDir]){
      doubleNext[dDir] = false;
      diceValue = base * 2;
      Sound.bonus();
      crazyFlash('⚡ ДВОЙНАЯ ТЯГА: бросок ' + base + ' → ' + diceValue);
      addHistory('⚡ ДВОЙНАЯ ТЯГА: ' + COLOR[dDir].name + ' идёт на ' + diceValue, '#f0b02b');
    }
    rolling = false;
    flashDieResult(diceValue);
    onDiceRolled();
  };

  /* мгновенный режим — без анимации вообще */
  if(Settings.throwMode === 'instant'){
    dice3d.classList.remove('rolling');
    setDiceRotation(base);
    Sound.hop(); Haptic.land();
    setTimeout(finish, sp(70));
    return;
  }

  /* без эффектов — короткий бросок на месте */
  if(!Settings.fx || Settings.throwMode === 'fast'){
    dice3d.classList.add('rolling');
    Sound.roll(); Haptic.roll(pw);
    setTimeout(()=>{
      dice3d.classList.remove('rolling');
      setDiceRotation(base);
      Sound.hop(); Haptic.land();
      finish();
    }, sp(420));
    return;
  }

  const wrap = document.getElementById('boardWrap');
  const halfW = Math.max(24, (wrap ? wrap.clientWidth : 320)/2 - 54);
  const halfH = Math.max(24, (wrap ? wrap.clientHeight : 320)/2 - 54);
  const ang = (vx || vy) ? Math.atan2(vy, vx) : RNG.float()*Math.PI*2;
  let sx = Math.cos(ang) * 11 * pw, sy = Math.sin(ang) * 11 * pw;
  let x = 0, y = 0, spin = 0, acc = 0;
  const STEP_MS = 16.7;
  let last = performance.now();
  const t0 = last;

  dice3d.classList.remove('rolling');
  dice3d.style.transition = 'none';
  if(diceStage){ diceStage.classList.remove('landing'); diceStage.classList.remove('tossing'); }
  Sound.roll(); Haptic.roll(pw);

  const bump = ()=>{ Sound.hop(); Haptic.bounce(); };
  const stepFn = (now)=>{
    const dt = Math.min(64, now - last) || 16;
    last = now;
    acc += dt;
    let v = Math.hypot(sx, sy);
    let hit = false;
    let guard = 0;
    while(acc >= STEP_MS && guard++ < 8){
      acc -= STEP_MS;
      x += sx; y += sy;
      if(x > halfW){ x = halfW; sx = -sx*0.6; hit = true; }
      else if(x < -halfW){ x = -halfW; sx = -sx*0.6; hit = true; }
      if(y > halfH){ y = halfH; sy = -sy*0.6; hit = true; }
      else if(y < -halfH){ y = -halfH; sy = -sy*0.6; hit = true; }
      v = Math.hypot(sx, sy);
      sx *= 0.953; sy *= 0.953;
      spin += (v * 1.4 + 0.1) * 9;
    }
    if(acc > STEP_MS * 4) acc = 0;
    if(hit) bump();
    diceBtn.style.transform = 'translate(calc(-50% + ' + x.toFixed(1) + 'px), calc(-50% + ' + y.toFixed(1) + 'px))';
    dice3d.style.transform = 'rotateX(' + (spin*0.9).toFixed(1) + 'deg) rotateY(' + (spin*1.3).toFixed(1) + 'deg) rotateZ(' + (spin*0.45).toFixed(1) + 'deg)';
    if(v > 0.42 && (now - t0) < 3200){ requestAnimationFrame(stepFn); return; }
    const tx = alignAhead(spin*0.9, ROT[base].x + TILT_X);
    const ty = alignAhead(spin*1.3, ROT[base].y + TILT_Y);
    const tz = alignAhead(spin*0.45, 0);
    dice3d.style.transition = 'transform .5s cubic-bezier(.17,.7,.26,1)';
    dice3d.style.transform = 'rotateX(' + tx.toFixed(1) + 'deg) rotateY(' + ty.toFixed(1) + 'deg) rotateZ(' + tz.toFixed(1) + 'deg)';
    if(diceStage){ diceStage.classList.remove('landing'); void diceStage.offsetWidth; diceStage.classList.add('landing'); }
    Sound.hop(); Haptic.land();
    setTimeout(()=>{
      dice3d.style.transition = 'none';
      setDiceRotation(base);
      void dice3d.offsetWidth;
      dice3d.style.transition = 'transform .6s';
      diceParkHome();
      finish();
    }, sp(520));
  };
  requestAnimationFrame(stepFn);
}

/* бросок свайпом: чем резче движение — тем дальше и быстрее летит кубик */
let diceGrab = null;
diceBtn.addEventListener('pointerdown', (e)=>{
  if(gameMode === 'physical' || rolling || mustPickPiece || gameOver) return;
  if(activePlayer().isAI) return;
  if(NET.on && !netMyTurn()) return;
  const t = performance.now();
  const noDrag = (Settings.throwMode === 'fast') || !Settings.fx;
  diceGrab = { x:e.clientX, y:e.clientY, lx:e.clientX, ly:e.clientY, lt:t, vx:0, vy:0, noDrag };
  if(!noDrag) diceBtn.classList.add('grabbed');
});
window.addEventListener('pointermove', (e)=>{
  if(!diceGrab || diceGrab.noDrag) return;
  const now = performance.now();
  const dt = Math.max(8, now - diceGrab.lt);
  diceGrab.vx = (e.clientX - diceGrab.lx)/dt;
  diceGrab.vy = (e.clientY - diceGrab.ly)/dt;
  diceGrab.lx = e.clientX; diceGrab.ly = e.clientY; diceGrab.lt = now;
  const ox = (e.clientX - diceGrab.x) * 0.45, oy = (e.clientY - diceGrab.y) * 0.45;
  diceBtn.style.transform = 'translate(calc(-50% + ' + ox.toFixed(1) + 'px), calc(-50% + ' + oy.toFixed(1) + 'px))';
});
window.addEventListener('pointerup', (e)=>{
  if(!diceGrab) return;
  const g = diceGrab; diceGrab = null;
  diceBtn.classList.remove('grabbed');
  diceBtn.style.transform = 'translate(-50%, -50%)';
  const speed = Math.hypot(g.vx, g.vy);
  const power = speed > 0.2 ? Math.min(2.6, 0.55 + speed*1.6) : (0.45 + RNG.float()*0.4);
  rollDice(power, g.vx, g.vy);
});
window.addEventListener('pointercancel', ()=>{
  if(!diceGrab) return;
  diceGrab = null;
  diceBtn.classList.remove('grabbed');
  diceBtn.style.transform = 'translate(-50%, -50%)';
});

function onDiceRolled(){
  movablePieces = computeMovable();
  const rollDir = mover().dir;
  if(diceValue === 6){
    sixStreak[rollDir] = (sixStreak[rollDir]||0) + 1;
    emoteEvent(sixStreak[rollDir] >= 2 ? 'doublesix' : 'six', mover(), 0, true);
  } else {
    sixStreak[rollDir] = 0;
  }
  if(movablePieces.length===0){
    logMsg('Нет доступных ходов');
    Sound.noMove();
    emoteEvent('nomove', mover(), 0, true);
    const extra = diceValue===6;
    setTimeout(()=>{ nextTurn(extra); afterTurnAdvance(); }, sp(600));
    return;
  }
  const slot = activePlayer();
  const m = mover();
  if(slot.isAI){
    mustPickPiece=false;
    diceHint.textContent='Бот думает…';
    setTimeout(()=>{ 
      const choice = aiChoose(); 
      if(choice && choice.act) {
        commitMove(choice.i, choice.act); 
      } else {
        nextTurn(diceValue===6);
        afterTurnAdvance();
      }
    }, sp(550));
  } else {
    mustPickPiece = true;
    if(movablePieces.length===1){
      const only = movablePieces[0];
      const acts = getActions(m, only);
      if(acts.length===1){ commitMove(only, acts[0]); return; }
    }
    updateTurnBanner();
    draw();
  }
}

function afterTurnAdvance(){
  draw();
  updateTurnBanner();
  const slot = activePlayer();
  if(slot.isAI && !gameOver && gameMode !== 'physical'){
    diceBtn.classList.add('disabled');
    setTimeout(rollDice, sp(650));
  }
}

function aiIsFoe(p, op){
  if(!op || op.dir === p.dir) return false;
  if((gameMode === 'teams' || gameMode === 'physical') && TEAM_OF[op.dir] === TEAM_OF[p.dir]) return false;
  return true;
}
function aiHomeEnter(pc){ return pc.lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN; }
function aiTargetHome(pc){ return pc.lap === 0 ? FINISH_STEP : FINISH_STEP + RING_LEN; }
function aiRingIdx(dir, step){ return (BOARD.entryIdx[dir] + step) % RING_LEN; }
function aiOnRing(pc){ return pc.step >= 0 && pc.step < aiHomeEnter(pc); }
function aiStepsLeft(pc){ return aiHomeEnter(pc) - pc.step; }

/* Общая картина стола: кто лидирует и чья фишка ближе всех к дому */
function buildAiContext(p){
  const foes = players.filter(op=>aiIsFoe(p, op));
  let leader = null, leaderScore = -1;
  foes.forEach(op=>{
    const s = getHomeCount(op) * 1000 + pieceProgress(op);
    if(s > leaderScore){ leaderScore = s; leader = op; }
  });
  let runnerLeft = 9999;
  foes.forEach(op=>op.pieces.forEach(opPc=>{
    if(!aiOnRing(opPc)) return;
    const left = aiStepsLeft(opPc);
    if(left < runnerLeft) runnerLeft = left;
  }));
  return { foes, leader, runnerLeft };
}

/* Вероятность, что фишку на этой клетке собьют следующим кругом ходов */
function aiThreatAt(p, pieceIdx, ns, lap, ctx){
  const pc = p.pieces[pieceIdx];
  const homeEnterStep = lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  if(ns < 0 || ns >= homeEnterStep) return 0;
  if(isCrazy() && pieceShielded(pc)) return 0;
  const destIdx = aiRingIdx(p.dir, ns);
  let safe = 1;
  ctx.foes.forEach(op=>{
    op.pieces.forEach((opPc, oi)=>{
      let prob = 0;
      if(opPc.step < 0){
        /* соперник может выйти из базы шестёркой прямо на эту клетку */
        if(aiRingIdx(op.dir, 0) === destIdx && !ownAt(op, 0, oi, opPc.lap)) prob = 1/6;
      } else if(aiOnRing(opPc)){
        const opIdx = aiRingIdx(op.dir, opPc.step);
        const dist = (destIdx - opIdx + RING_LEN) % RING_LEN;
        if(dist >= 1 && dist <= 6 && dist <= aiStepsLeft(opPc)){
          const tgt = opPc.step + dist;
          const blocked = isCrazy() && blockadeStopStep(op, opPc, tgt) < tgt;
          if(!blocked && !ownAt(op, tgt, oi, opPc.lap)) prob = 1/6;
        }
        if(prob === 0 && isCornerPiece(op, oi)){
          const tp = teleportStepFor(op, oi);
          if(tp != null && aiRingIdx(op.dir, tp) === destIdx && !ownAt(op, tp, oi, opPc.lap)) prob = 1/6;
        }
      }
      if(prob > 0 && isCrazy() && opPc.frozen > 0) prob *= 0.35;
      if(prob > 0) safe *= (1 - prob);
    });
  });
  return 1 - safe;
}

/* ==================== 8. ПАМЯТЬ И МЕСТЬ БОТОВ ====================
   Каждый бот помнит, кто и сколько раз его сбил. Обида повышает ценность
   удара именно по обидчику, делает бота агрессивнее и смелее, и гаснет после мести.
   Во второй половине партии все боты играют жёстче и меньше сидят в засаде. */
const GRUDGE_MAX = 4;
function addGrudge(victim, attackerDir, weight){
  if(!victim || !attackerDir || victim.dir === attackerDir) return;
  if(!victim.grudge) victim.grudge = {};
  victim.grudge[attackerDir] = Math.min(GRUDGE_MAX, (victim.grudge[attackerDir] || 0) + (weight || 1));
  victim.lastHitBy = attackerDir;
}
function grudgeOf(p, dir){
  if(!p || !p.grudge || !dir) return 0;
  return p.grudge[dir] || 0;
}
function grudgeTotal(p){
  if(!p || !p.grudge) return 0;
  let t = 0;
  for(const k in p.grudge) t += p.grudge[k];
  return t;
}
function decayGrudge(p){
  if(!p || !p.grudge) return;
  for(const k in p.grudge){
    p.grudge[k] = Math.max(0, p.grudge[k] - 0.1);
    if(p.grudge[k] <= 0.02) delete p.grudge[k];
  }
  if(p.lastHitBy && !p.grudge[p.lastHitBy]) p.lastHitBy = null;
}
/* 0 — начало партии, 1 — развязка */
function gamePhase(){
  let best = 0;
  const need = Math.max(1, (typeof winTarget === 'function' ? winTarget() : 4));
  players.forEach(p=>{ const h = getHomeCount(p) / need; if(h > best) best = h; });
  return Math.max(0, Math.min(1, best));
}
/* Эффективный характер: личность + обида + фаза партии */
function aiPer(p){
  const base = personaOf(p);
  const g = grudgeTotal(p);
  const ph = gamePhase();
  const per = Object.assign({}, base);
  per.aggr = base.aggr * (1 + 0.22 * g + 0.35 * ph);
  per.risk = base.risk * (1 + 0.16 * g + 0.25 * ph);
  per.camp = (base.camp == null ? 1 : base.camp) * (1 - 0.2 * ph);
  per.blunder = base.blunder * (1 - 0.35 * ph);
  per.grudge = g;
  per.phase = ph;
  return per;
}

/* Сколько мы потеряем, если эту фишку собьют */
function aiPieceValue(pc, ns){
  const he = aiHomeEnter(pc);
  return 60 + Math.max(0, ns) * 14 + (ns >= he - 12 ? 160 : 0);
}

/* Насколько выгодно встать в 1-6 клетках позади чужой фишки (охота) */
function aiChaseGain(p, ns, lap, ctx, per){
  const homeEnterStep = lap === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN;
  if(ns >= homeEnterStep) return 0;
  const destIdx = aiRingIdx(p.dir, ns);
  let best = 0;
  ctx.foes.forEach(op=>op.pieces.forEach((opPc)=>{
    if(!aiOnRing(opPc)) return;
    if(isCrazy() && pieceShielded(opPc)) return;
    const opIdx = aiRingIdx(op.dir, opPc.step);
    const dist = (opIdx - destIdx + RING_LEN) % RING_LEN;
    if(dist < 1 || dist > 6) return;
    const left = aiStepsLeft(opPc);
    let v = 60 + Math.max(0, opPc.step) * 1.2;
    if(left <= 10) v += 240; else if(left <= 20) v += 120;
    if(ctx.leader && op.dir === ctx.leader.dir) v += 70;
    v += 110 * grudgeOf(p, op.dir);
    if(p.lastHitBy === op.dir) v += 60;
    if(v > best) best = v;
  }));
  return best * (0.55 + 0.5 * Math.min(2.3, per.aggr));
}

/* Оценка бонусов и ловушек режима КРЕЙЗИ на клетке назначения */
const AI_ITEM_VALUE = { boost: 210, shield: 280, reroll: 200, portal: 70, mine: -430, freeze: -260, oil: -210 };
function aiItemGain(p, pieceIdx, ns, lap, per){
  if(!isCrazy()) return 0;
  const cell = stepToCell(p.dir, ns, lap);
  if(!cell) return 0;
  const item = bonuses.find(b=>cellKey(b.cell) === cellKey(cell));
  if(!item) return 0;
  const pc = p.pieces[pieceIdx];
  let v = AI_ITEM_VALUE[item.type.key] || 0;
  if(item.type.key === 'portal' && aiStepsLeft(pc) <= 18) v = -160;
  if(v < 0){
    if(pieceShielded(pc)) v = 0;
    else v *= (1.4 - Math.min(1.1, per.risk));
  }
  return v;
}

/* ---- Засада на телепорте ----
   Сильная схема: одну фишку ставим на угловую (телепорт-) клетку и держим её там,
   второй спокойно идём по кругу. Как только выпадает 1 — караульный прыгает
   через четверть поля. Единица иначе почти бесполезна, поэтому размен выгоден. */
function aiPieceCell(p, pc){
  if(!pc || pc.step < 0) return null;
  if(pc.step >= aiHomeEnter(pc)) return null;
  return stepToCell(p.dir, pc.step, pc.lap);
}
function aiOnTeleportPad(p, pc){
  const cell = aiPieceCell(p, pc);
  return !!cell && isCornerCell(cell);
}
function aiCampersCount(p, exceptIdx){
  let n = 0;
  p.pieces.forEach((pc, idx)=>{ if(idx !== exceptIdx && aiOnTeleportPad(p, pc)) n++; });
  return n;
}
function aiCampGain(p, i, act, allMoves, per){
  let camp = (per.camp == null ? 1 : per.camp);
  if(camp <= 0 || botDifficulty === 'easy') return 0;
  if(botDifficulty === 'vet') camp = camp * 1.35;
  const pc = p.pieces[i];
  const lap = (act.type === 'lap2') ? 1 : pc.lap;
  const homeEnter = aiHomeEnter(pc);
  const destCell = (act.ns >= 0 && act.ns < homeEnter) ? stepToCell(p.dir, act.ns, lap) : null;
  const wasOnPad = aiOnTeleportPad(p, pc);
  const others = aiCampersCount(p, i);
  const onRing = p.pieces.filter(x=>x.step >= 0 && x.step < aiHomeEnter(x)).length;
  const left = aiStepsLeft(pc);
  let g = 0;

  /* 1. Встать в засаду на телепорт */
  if(destCell && isCornerCell(destCell) && act.type !== 'teleport'){
    if(others === 0 && left > 14) g += 210 * camp;
    else if(others === 0) g += 70 * camp;
    else g += 25 * camp;                       /* второй караульный почти не нужен */
    if(onRing >= 2) g += 60 * camp;            /* есть кем идти дальше — можно стоять */
  }

  /* 2. Не снимаем единственного караульного, если есть чем ходить */
  if(wasOnPad && act.type !== 'teleport' && others === 0){
    const hasAlternative = allMoves && allMoves.some(m=>m.i !== i);
    if(hasAlternative && onRing >= 2 && left > 12) g -= 190 * camp;
  }

  /* 3. Сам прыжок по единице — ради него всё и затевалось */
  if(act.type === 'teleport'){
    g += 120 * camp;
    if(left > 20) g += 90 * camp;
  }
  return g;
}

/* ==================== 10. НОВЫЙ МОЗГ БОТОВ ====================
   Просчёт на 2-3 полухода с честным ожиданием по всем 6 значениям кубика.
   Кубик НЕ подкручивается: движок только читает выпавшее число и никогда
   не влияет на бросок. Вся сила бота — в переборе позиций и вероятностях. */

const AI_RING_KEY_IDX = {};
BOARD.ring.forEach((c, i)=>{ AI_RING_KEY_IDX[c[0] + ',' + c[1]] = i; });
const AI_CORNER_NEXT = {};
Object.keys(CORNER_KEY_TO_NEXT_RINGIDX).forEach(k=>{
  const from = AI_RING_KEY_IDX[k];
  if(from != null) AI_CORNER_NEXT[from] = CORNER_KEY_TO_NEXT_RINGIDX[k];
});
/* отладочный переключатель для турнира "новый мозг против старого" */
const AI_LEGACY = {};
try{ window.__aiLegacy = AI_LEGACY; }catch(e){}

function aiHEs(l){ return l === 0 ? LAP_STEPS : LAP_STEPS + RING_LEN; }
function aiTHs(l){ return l === 0 ? FINISH_STEP : FINISH_STEP + RING_LEN; }
function aiIdx(dir, s){ return (BOARD.entryIdx[dir] + s) % RING_LEN; }
function aiInHome(pc){ return pc.s >= 0 && pc.s >= aiHEs(pc.l); }
function aiOnBoard(pc){ return pc.s >= 0 && pc.s < aiHEs(pc.l); }

/* Лёгкий снимок позиции: боты думают на нём, реальная партия не трогается */
function aiSnap(){
  return players.map(p=>({
    dir: p.dir,
    pcs: p.pieces.map(pc=>({
      s: pc.step, l: pc.lap,
      sh: (isCrazy() && pieceShielded(pc)) ? 1 : 0,
      fz: (isCrazy() && pc.frozen > 0) ? pc.frozen : 0
    }))
  }));
}
function aiClone(sn){
  return sn.map(x=>({ dir: x.dir, pcs: x.pcs.map(pc=>({ s: pc.s, l: pc.l, sh: pc.sh, fz: pc.fz })) }));
}
function aiBlockSet(){
  const set = {};
  if(!isCrazy()) return set;
  blockades.forEach(b=>{
    const ri = AI_RING_KEY_IDX[cellKey(b.cell)];
    if(ri != null) set[ri] = 1;
  });
  return set;
}
function aiAlly(meDir, dir){
  if(dir === meDir) return true;
  return (gameMode === 'teams' || gameMode === 'physical') && TEAM_OF[dir] === TEAM_OF[meDir];
}
function aiWeightOf(meDir, dir){
  if(dir === meDir) return 1;
  if(aiAlly(meDir, dir)) return 0.7;
  return -0.55;
}

function aiOwnAt(sp, ns, exclude, l){
  if(ns > aiTHs(l)) return true;
  if(ns >= aiHEs(l)) return sp.pcs.some((pc, idx)=> idx !== exclude && pc.s === ns && pc.l === l);
  const ri = aiIdx(sp.dir, ns);
  return sp.pcs.some((pc, idx)=>{
    if(idx === exclude || pc.s < 0 || aiInHome(pc)) return false;
    return aiIdx(sp.dir, pc.s) === ri;
  });
}

/* Ходы для конкретного значения кубика — те же правила, что в игре */
function aiActs(sn, si, i, d, blk){
  const sp = sn[si], pc = sp.pcs[i], out = [];
  if(pc.fz > 0) return out;
  const he = aiHEs(pc.l), th = aiTHs(pc.l);
  if(pc.s >= he){
    const raw = pc.s + d;
    if(raw <= th && !aiOwnAt(sp, raw, i, pc.l)) out.push({ t: 'home', ns: raw, l: pc.l });
    return out;
  }
  if(pc.s < 0){
    if((d === 6 || isDuel()) && !aiOwnAt(sp, 0, i, pc.l)) out.push({ t: 'enter', ns: 0, l: pc.l });
    return out;
  }
  if(d === 1){
    const ri = aiIdx(sp.dir, pc.s);
    const dst = AI_CORNER_NEXT[ri];
    if(dst != null){
      let diff = dst - ri;
      if(diff <= 0) diff += RING_LEN;
      const dest = pc.s + diff;
      if(dest < he && !blk[dst] && !aiOwnAt(sp, dest, i, pc.l)) out.push({ t: 'tp', ns: dest, l: pc.l });
    }
  }
  let raw = pc.s + d;
  for(let st = pc.s + 1; st <= raw; st++){
    if(st >= he) break;
    if(blk[aiIdx(sp.dir, st)]){ raw = st - 1; break; }
  }
  if(raw <= pc.s) return out;
  if(raw <= he - 1){
    if(!aiOwnAt(sp, raw, i, pc.l)) out.push({ t: 'ring', ns: raw, l: pc.l });
  } else if(raw <= th){
    if(!aiOwnAt(sp, raw, i, pc.l)) out.push({ t: 'home', ns: raw, l: pc.l });
  }
  return out;
}

function aiApply(sn, si, i, act){
  const sp = sn[si], pc = sp.pcs[i];
  pc.s = act.ns; pc.l = act.l;
  let cap = null;
  if(act.ns >= aiHEs(act.l)) return cap;
  const ri = aiIdx(sp.dir, act.ns);
  sn.forEach((op, oi)=>{
    if(oi === si) return;
    op.pcs.forEach(opc=>{
      if(!aiOnBoard(opc) || opc.sh) return;
      if(aiIdx(op.dir, opc.s) !== ri) return;
      cap = { dir: op.dir, step: opc.s, left: aiHEs(opc.l) - opc.s };
      opc.s = -1; opc.l = 0;
    });
  });
  return cap;
}

/* Точная вероятность потерять фишку: считаем СКОЛЬКО РАЗНЫХ значений кубика
   бьют её у каждого соперника (раньше было наивное 1/6 на каждую фишку) */
function aiCapProb(sn, si, i, blk){
  const sp = sn[si], pc = sp.pcs[i];
  if(!aiOnBoard(pc) || pc.sh) return 0;
  const ri = aiIdx(sp.dir, pc.s);
  let safe = 1;
  sn.forEach((op, oi)=>{
    if(oi === si || aiAlly(sp.dir, op.dir)) return;
    const hits = {};
    op.pcs.forEach((opc, k)=>{
      if(opc.fz > 0) return;
      for(let d = 1; d <= 6; d++){
        if(hits[d]) continue;
        const acts = aiActs(sn, oi, k, d, blk);
        for(let a = 0; a < acts.length; a++){
          const act = acts[a];
          if(act.ns >= aiHEs(act.l)) continue;
          if(aiIdx(op.dir, act.ns) === ri){ hits[d] = 1; break; }
        }
      }
    });
    let n = 0;
    for(const k in hits) n++;
    if(n > 0) safe *= (1 - n / 6);
  });
  return 1 - safe;
}

function aiPieceScore(pc){
  if(pc.s < 0) return 0;
  const he = aiHEs(pc.l), th = aiTHs(pc.l);
  if(pc.s >= he) return 1000 + (pc.s - he) * 55 + (pc.s === th ? 220 : 0);
  return 45 + pc.s * 13 + (pc.s >= he - 8 ? 150 : 0) + (pc.s >= he - 3 ? 90 : 0);
}

/* Сколько разных значений кубика вообще дают ход — бот не любит застревать */
function aiMobility(sn, si, blk){
  let n = 0;
  for(let d = 1; d <= 6; d++){
    for(let k = 0; k < sn[si].pcs.length; k++){
      if(aiActs(sn, si, k, d, blk).length){ n++; break; }
    }
  }
  return n;
}

function aiEval(sn, si, blk, per){
  const meDir = sn[si].dir;
  let v = 0;
  sn.forEach(sp=>{
    const w = aiWeightOf(meDir, sp.dir);
    let sub = 0, homes = 0;
    sp.pcs.forEach(pc=>{
      sub += aiPieceScore(pc);
      if(aiInHome(pc)) homes++;
    });
    sub += homes * homes * 130;
    v += w * sub;
  });
  sn[si].pcs.forEach((pc, i)=>{
    if(!aiOnBoard(pc)) return;
    const pr = aiCapProb(sn, si, i, blk);
    v -= pr * (200 + pc.s * 24) * (1.5 - Math.min(1.2, per.risk));
  });
  v += aiMobility(sn, si, blk) * 14;
  return v;
}

/* Полуход соперника: среднее по всем 6 броскам, худшее для нас */
function aiOppReply(sn, si, blk, per){
  const meDir = sn[si].dir;
  const myAt = {};
  sn[si].pcs.forEach(pc=>{
    if(!aiOnBoard(pc) || pc.sh) return;
    const ri = aiIdx(meDir, pc.s);
    if(myAt[ri] == null || pc.s > myAt[ri]) myAt[ri] = pc.s;
  });
  const order = [];
  for(let k = 1; k < sn.length; k++){
    const oi = (si + k) % sn.length;
    if(!aiAlly(meDir, sn[oi].dir)) order.push(oi);
  }
  const look = order.slice(0, Math.max(1, per.vision || 1));
  let total = 0;
  look.forEach((oi, rank)=>{
    let sum = 0;
    for(let d = 1; d <= 6; d++){
      let worst = 0;
      sn[oi].pcs.forEach((opc, k)=>{
        aiActs(sn, oi, k, d, blk).forEach(a=>{
          let loss = a.ns * 1.1;
          if(a.t === 'home') loss += 210;
          if(a.t === 'enter') loss += 70;
          if(a.ns < aiHEs(a.l)){
            const ri = aiIdx(sn[oi].dir, a.ns);
            if(myAt[ri] != null) loss += 300 + myAt[ri] * 17;
          }
          if(loss > worst) worst = loss;
        });
      });
      sum += worst;
    }
    total += (sum / 6) * (rank === 0 ? 1 : 0.45);
  });
  return total;
}

/* Наш следующий ход: средняя выгода по всем 6 броскам из новой позиции */
function aiOwnNext(sn, si, blk){
  const meDir = sn[si].dir;
  const foeAt = {};
  sn.forEach((op, oi)=>{
    if(oi === si || aiAlly(meDir, op.dir)) return;
    op.pcs.forEach(opc=>{
      if(!aiOnBoard(opc) || opc.sh) return;
      const ri = aiIdx(op.dir, opc.s);
      if(foeAt[ri] == null || opc.s > foeAt[ri]) foeAt[ri] = opc.s;
    });
  });
  let sum = 0;
  for(let d = 1; d <= 6; d++){
    let best = 0;
    sn[si].pcs.forEach((pc, k)=>{
      aiActs(sn, si, k, d, blk).forEach(a=>{
        let g = a.ns * 1.1;
        if(a.t === 'home') g += 240;
        if(a.t === 'enter') g += 80;
        if(a.ns < aiHEs(a.l)){
          const ri = aiIdx(meDir, a.ns);
          if(foeAt[ri] != null) g += 300 + foeAt[ri] * 14;
        }
        if(g > best) best = g;
      });
    });
    sum += best;
  }
  return sum / 6;
}

function scoreActionSmart(p, i, act, allMoves, ctx, per, depth, base, blk){
  const si = players.indexOf(p);
  const pc = p.pieces[i];
  const lap = (act.type === 'lap2') ? 1 : pc.lap;
  if(act.ns <= aiTHs(lap) && ownAt(p, act.ns, i, lap)) return -100000;
  const sn = aiClone(base);
  const a = { t: (act.type === 'teleport') ? 'tp' : act.type, ns: act.ns, l: lap };
  const cap = aiApply(sn, si, i, a);
  let v = aiEval(sn, si, blk, per);

  if(cap){
    if(aiAlly(p.dir, cap.dir)){
      v -= 2600;                                   /* по своим не бьём */
    } else {
      let g = 190 + cap.step * 16;
      if(cap.left <= 12) g *= 1.9; else if(cap.left <= 24) g *= 1.3;
      if(ctx.leader && cap.dir === ctx.leader.dir) g *= 1.4;
      g *= (1 + 0.32 * grudgeOf(p, cap.dir));
      if(p.lastHitBy === cap.dir) g *= 1.2;
      v += g * (0.75 + 0.35 * Math.min(2.3, per.aggr));
    }
  }
  if(a.t === 'tp') v += 130 + (per.key === 'trickster' ? 140 : 0) + (per.key === 'sniper' ? 150 : 0);
  if(a.t === 'enter') v += 150 + p.pieces.filter(x=>x.step < 0).length * 45;
  v += aiItemGain(p, i, act.ns, lap, per);
  v += aiCampGain(p, i, act, allMoves, per);
  if(depth >= 2) v -= aiOppReply(sn, si, blk, per) * (0.6 - 0.15 * Math.min(1.2, per.risk));
  if(depth >= 3) v += aiOwnNext(sn, si, blk) * 0.5;
  return v;
}

function aiChoose(){
  const p = mover();
  const allMoves = [];
  movablePieces.forEach(i=>{
    getActions(p,i).forEach(act=>{
      allMoves.push({i, act});
    });
  });
  if(allMoves.length===0) return null;
  if(allMoves.length===1) return allMoves[0];

  const per = aiPer(p);
  const blunderRate = per.blunder * (botDifficulty === 'vet' ? 0 : (botDifficulty === 'hard' ? 0.05 : (botDifficulty === 'normal' ? 0.45 : 1)));
  if(blunderRate > 0 && RNG.float() < blunderRate){
    return allMoves[RNG.int(allMoves.length)];
  }

  if(botDifficulty === 'easy'){
    // Легкий: почти случайно, но не упустит выход из базы и заход в дом
    const obvious = allMoves.filter(m=>m.act.type==='enter' || m.act.type==='home');
    if(obvious.length && RNG.float() < 0.5){
      return obvious[RNG.int(obvious.length)];
    }
    return allMoves[RNG.int(allMoves.length)];
  }

  const ctx = buildAiContext(p);
  const legacy = !!AI_LEGACY[p.dir];
  /* глубина просчёта = сила бота; ошибка бота — это "недосмотр", а не случайный ход */
  let depth = botDifficulty === 'vet' ? 2 : (botDifficulty === 'hard' ? 1 : 1);
  per.vision = botDifficulty === 'vet' ? 4 : (botDifficulty === 'hard' ? 3 : 1);
  if(per.blunder && depth > 1 && RNG.float() < per.blunder * 0.5){
    depth -= 1;
    per.vision = Math.max(1, per.vision - 1);
  }
  const base = legacy ? null : aiSnap();
  const blk = legacy ? null : aiBlockSet();
  const scored = allMoves
    .map(m=>({ m, s: legacy
      ? scoreActionHard(p, m.i, m.act, allMoves, ctx)
      : scoreActionSmart(p, m.i, m.act, allMoves, ctx, per, depth, base, blk) }))
    .sort((a,b)=>b.s-a.s);

  if(botDifficulty === 'normal'){
    // Средний: считает так же, но иногда берёт второй по силе ход
    if(scored.length > 1 && RNG.float() < 0.22 && (scored[0].s - scored[1].s) < 300){
      return scored[1].m;
    }
    return scored[0].m;
  }

  if(botDifficulty === 'vet'){
    /* Ветеран: считает как "умный", плюс блеф — иногда нарочно не бьёт,
       чтобы выманить фишку соперника под удар на следующем круге,
       и охотнее держит засаду на телепорте. */
    if(scored.length > 1 && (scored[0].s - scored[1].s) < 90 && RNG.float() < 0.12){
      return scored[1].m;
    }
    const bestV = scored[0].s;
    const topV = scored.filter(x=>bestV - x.s < 1);
    return topV[RNG.int(topV.length)].m;
  }

  // Сложный: из равных по силе ходов выбирает случайный, чтобы не быть предсказуемым
  const best = scored[0].s;
  const top = scored.filter(x=>best - x.s < 1);
  return top[RNG.int(top.length)].m;
}

function scoreActionHard(p, i, act, allMoves, ctx){
  const per = aiPer(p);
  const pc = p.pieces[i];
  ctx = ctx || buildAiContext(p);
  const lap = pc.lap;
  const homeEnterStep = aiHomeEnter(pc);
  const targetHomeStep = aiTargetHome(pc);
  const destCell = stepToCell(p.dir, act.ns, lap);

  /* на свою же фишку не встаём */
  if(act.ns <= targetHomeStep && ownAt(p, act.ns, i, lap)) return -100000;

  let score = Math.max(0, act.ns) * 2.5;

  if(act.type === 'home'){
    score += (act.ns === targetHomeStep) ? 2600 : 900 + (act.ns - homeEnterStep) * 30;
  } else if(act.type === 'enter'){
    score += 300 + p.pieces.filter(x=>x.step < 0).length * 70;
  } else if(act.type === 'teleport'){
    score += 240 + (act.ns - pc.step) * 6 + (per.key === 'trickster' ? 230 : 0) + (per.key === 'sniper' ? 260 : 0);
  } else if(act.ns >= homeEnterStep - 6){
    score += 70;
  }

  /* сбитие соперника: дороже всего те, кто подходит к финишу, и лидер стола */
  if(destCell && act.ns < homeEnterStep){
    players.forEach(op=>{
      if(op.dir === p.dir) return;
      const foe = aiIsFoe(p, op);
      op.pieces.forEach(opPc=>{
        if(!aiOnRing(opPc)) return;
        if(!sameCell(destCell, stepToCell(op.dir, opPc.step, opPc.lap))) return;
        if(!foe){ score -= 2500; return; }
        if(isCrazy() && pieceShielded(opPc)){ score -= 60; return; }
        const lost = Math.max(0, opPc.step + 1);
        const left = aiStepsLeft(opPc);
        let g = 140 + lost * 16;
        if(left <= 12) g *= 1.9; else if(left <= 24) g *= 1.35;
        if(ctx.leader && op.dir === ctx.leader.dir) g *= 1.45;
        const gr = grudgeOf(p, op.dir);
        if(gr > 0) g *= (1 + 0.32 * gr);
        if(p.lastHitBy === op.dir) g *= 1.2;
        score += g * (0.7 + 0.35 * Math.min(2.3, per.aggr));
      });
    });
  }

  /* не подставляемся: считаем шанс, что нас собьют на клетке назначения */
  const riskProb = aiThreatAt(p, i, act.ns, lap, ctx);
  score -= riskProb * aiPieceValue(pc, act.ns) * (1.5 - Math.min(1.15, per.risk));

  /* уводим фишку, которая уже стоит под ударом */
  if(aiOnRing(pc)){
    const curRisk = aiThreatAt(p, i, pc.step, lap, ctx);
    score += curRisk * aiPieceValue(pc, pc.step) * (1.15 - Math.min(1.0, per.risk) * 0.35);
  }

  score += aiChaseGain(p, act.ns, lap, ctx, per);
  score += aiItemGain(p, i, act.ns, lap, per);
  score += aiCampGain(p, i, act, allMoves, per);

  return score;
}

let totalCount = 4;
const modeSeg = document.getElementById('modeSeg');
const totalSeg = document.getElementById('totalSeg');
const totalBlock = document.getElementById('totalBlock');
const diffSeg = document.getElementById('diffSeg');
const diffBlock = document.getElementById('diffBlock');
const slotList = document.getElementById('slotList');

function renderSlots(){
  slotList.innerHTML='';
  DIRS.forEach((dir,i)=>{
    const col = COLOR[dir];
    const active = (gameMode==='teams' || gameMode==='physical') ? true : i<totalCount;
    const teamBadge = (gameMode==='teams' || gameMode==='physical')
      ? `<span class="team-badge">Команда ${TEAM_OF[dir]==='A'?'1':'2'}</span>` : '';
    const row = document.createElement('div');
    row.className='slot-row';
    row.innerHTML = `
      <div class="slot-name" style="opacity:${active?1:0.35}">
        <span class="swatch" style="background:${col.hex};color:${col.hex}"></span>
        ${col.icon} ${col.name}${teamBadge}
      </div>
      <div class="slot-toggle" data-dir="${dir}">
        <button data-mode="human" class="${active?'':'disabled'}">Человек</button>
        <button data-mode="ai" class="${(active && gameMode!=='physical')?'':'disabled'}">Бот</button>
        <button data-mode="off" class="${active?'disabled':''}">—</button>
      </div>`;
    slotList.appendChild(row);
  });
  applySlotDefaults();
}

let slotModes = {};
function applySlotDefaults(){
  DIRS.forEach((dir,i)=>{
    const active = (gameMode==='teams' || gameMode==='physical') ? true : i<totalCount;
    if(!active){ slotModes[dir]='off'; return; }
    if(gameMode === 'physical'){
      slotModes[dir] = 'human';
    } else {
      if(!slotModes[dir] || slotModes[dir]==='off') slotModes[dir] = i===0?'human':'ai';
    }
  });
  refreshSlotButtons();
}

function refreshSlotButtons(){
  slotList.querySelectorAll('.slot-toggle').forEach(tg=>{
    const dir = tg.dataset.dir;
    const idx = DIRS.indexOf(dir);
    const inRange = (gameMode==='teams' || gameMode==='physical') ? true : idx<totalCount;
    tg.querySelectorAll('button').forEach(b=>{
      const isOff = b.dataset.mode==='off';
      const isAi = b.dataset.mode==='ai';
      b.classList.toggle('active', slotModes[dir]===b.dataset.mode);
      b.classList.toggle('disabled', isOff || !inRange || (gameMode==='physical' && isAi));
    });
  });
}

slotList.addEventListener('click', (e)=>{
  const btn = e.target.closest('button');
  if(!btn || btn.classList.contains('disabled')) return;
  const tg = btn.closest('.slot-toggle');
  const dir = tg.dataset.dir;
  slotModes[dir] = btn.dataset.mode;
  refreshSlotButtons();
});

totalSeg.addEventListener('click', (e)=>{
  if(gameMode==='teams' || gameMode==='physical') return;
  const btn = e.target.closest('button'); if(!btn) return;
  totalCount = parseInt(btn.dataset.v,10);
  [...totalSeg.children].forEach(b=>b.classList.toggle('active', b===btn));
  renderSlots();
});

diffSeg.addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  botDifficulty = btn.dataset.d;
  [...diffSeg.children].forEach(b=>b.classList.toggle('active', b===btn));
});

const speedSeg = document.getElementById('speedSeg');
speedSeg.addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  gameSpeed = btn.dataset.s;
  [...speedSeg.children].forEach(b=>b.classList.toggle('active', b===btn));
});

/* ---------- SHEETS (правила / история) ---------- */
function openSheet(id){
  const el = document.getElementById(id);
  if(!el) return;
  if(id === 'histSheet') renderHistory();
  el.classList.add('open');
  Haptic.tap();
}
function closeSheets(){
  document.querySelectorAll('.sheet').forEach(s=>s.classList.remove('open'));
}
document.querySelectorAll('[data-close]').forEach(btn=>{
  addTapListener(btn, closeSheets);
});
addTapListener(document.getElementById('rulesBtn'), ()=>openSheet('rulesSheet'));
addTapListener(document.getElementById('helpBtn'), ()=>openSheet('rulesSheet'));
addTapListener(document.getElementById('histBtn'), ()=>openSheet('histSheet'));
document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') closeSheets(); });

modeSeg.addEventListener('click', (e)=>{
  const btn = e.target.closest('button'); if(!btn) return;
  gameMode = btn.dataset.m;
  [...modeSeg.children].forEach(b=>b.classList.toggle('active', b===btn));
  
  if(gameMode==='duel'){
    totalCount = 2;
    [...totalSeg.children].forEach(b=>{ b.classList.toggle('active', b.dataset.v==='2'); b.classList.add('disabled'); });
    totalBlock.style.opacity = '0.5';
    [...diffSeg.children].forEach(b=>b.classList.remove('disabled'));
    diffBlock.style.opacity = '1';
    gameSpeed = 'fast';
    setSegActive(document.getElementById('speedSeg'), 's', 'fast');
    setSegActive(document.getElementById('speedSeg2'), 's', 'fast');
    renderSlots();
    return;
  }
  if(gameMode==='teams' || gameMode==='physical'){
    totalCount = 4;
    [...totalSeg.children].forEach(b=>b.classList.toggle('active', b.dataset.v==='4'));
    [...totalSeg.children].forEach(b=>b.classList.add('disabled'));
    totalBlock.style.opacity = '0.5';
    
    if(gameMode==='physical'){
      [...diffSeg.children].forEach(b=>b.classList.add('disabled'));
      diffBlock.style.opacity = '0.5';
    } else {
      [...diffSeg.children].forEach(b=>b.classList.remove('disabled'));
      diffBlock.style.opacity = '1';
    }
  } else {
    [...totalSeg.children].forEach(b=>b.classList.remove('disabled'));
    totalBlock.style.opacity = '1';
    [...diffSeg.children].forEach(b=>b.classList.remove('disabled'));
    diffBlock.style.opacity = '1';
  }
  renderSlots();
});

totalSeg.children[2].classList.add('active');
renderSlots();

addTapListener(document.getElementById('startBtn'), ()=>{
  const count = (gameMode==='teams' || gameMode==='physical') ? 4 : (isDuel() ? 2 : totalCount);
  const uiDirs = DIRS.slice(0,count);
  const seatDirs = isDuel() ? ['top','bottom'] : uiDirs;
  const config = seatDirs.map((dir, idx)=>({
    dir,
    isAI: gameMode==='physical' ? false : (slotModes[isDuel() ? uiDirs[idx] : dir]==='ai')
  }));
  showScreen('game');
  startGame(config);
});

addTapListener(document.getElementById('menuBtn'), ()=>{
  persistLocal();
  openSheet('pauseSheet');
});

function exitToMenu(){
  closeSheets();
  clearChat();
  releaseWakeLock();
  document.getElementById('winOverlay').style.display='none';
  showScreen('menu');
  refreshResumeBlock();
  refreshMenuResume();
}

document.getElementById('againBtn').addEventListener('click', ()=>{
  closeSheets();
  document.getElementById('winOverlay').style.display='none';
  const config = players.map(p=>({dir:p.dir, isAI:p.isAI}));
  startGame(config);
});

function startGame(config){
  initPlayers(config);
  assignPersonas();
  bonuses = []; blockades = []; finishOrder = []; crazyTurnCount = 0; bonusExtraRoll = false; sixStreak = {}; doubleNext = {};
  resetDiceSequence();
  refillItems();
  particles = []; shocks = []; trails = [];
  clearChat();
  renderScoreStrip();
  requestWakeLock();
  try{ musicSync(); }catch(e){}
  resizeCanvas();
  logMsg('');
  clearChoice();
  emotes = [];
  updateTurnBanner();
  draw();
  persistGame();
  radio('Экипажи, взлёт разрешаю. Курс по часовой.', players[currentIdx].dir);

  if(activePlayer().isAI && gameMode !== 'physical') setTimeout(rollDice, 650);
}

function endGame(){
  gameOver = true;
  try{ musicSync(); }catch(e){}
  if(gameMode==='teams' || gameMode==='physical'){
    const teamTotals = {};
    players.forEach(pl=>{
      const t = TEAM_OF[pl.dir];
      if(!teamTotals[t]) teamTotals[t] = 0;
      teamTotals[t] += getHomeCount(pl);
    });
    const winningTeam = Object.keys(teamTotals).find(t => teamTotals[t] >= 8);
    const names = players.filter(pl=>TEAM_OF[pl.dir]===winningTeam)
      .map(pl=>COLOR[pl.dir].icon+' '+pl.name).join(' + ');
    document.getElementById('winText').innerHTML = `Побеждает<br>Команда (${names})!`;
  } else {
    const p = mover();
    const col = COLOR[p.dir];
    document.getElementById('winText').innerHTML = `${col.icon} ${p.name}<br>побеждает!`;
  }
  renderStats();
  const mvpInfo = renderMvp();
  recordMatchToMeta(winnerLabel(), mvpInfo);
  releaseWakeLock();
  document.getElementById('winOverlay').style.display='flex';
  Sound.win();
  clearSave();
  radio(pickOne(RADIO_PHRASES.win), mover().dir);
  Haptic.win();
  launchConfetti();
  draw();
}

function launchConfetti(){
  const overlay = document.getElementById('winOverlay');
  const colors = DIRS.map(d=>COLOR[d].hex);
  for(let i=0;i<56;i++){
    const el = document.createElement('div');
    el.className='confetti';
    el.style.left = (Math.random()*100)+'%';
    el.style.background = colors[i%colors.length];
    el.style.animationDuration = (1.5+Math.random()*1.5)+'s';
    el.style.animationDelay = (Math.random()*0.4)+'s';
    el.style.transform = `rotate(${Math.random()*360}deg)`;
    overlay.appendChild(el);
    setTimeout(()=>el.remove(), 3200);
  }
}

/* ==================== РАДИООБМЕН И ЭМОЦИИ ==================== */
const RADIO_PHRASES = {
  capture: ['Цель поражена!','Есть попадание!','Сбит!','Минус один!','Квитанция отправлена.'],
  hit:     ['Меня подбили!','Ухожу на аэродром!','Катапультируюсь!','Потеря борта…'],
  six:     ['Форсаж!','Полный газ!','Тяга на максимум!','Шестёрка, идём на второй заход!'],
  teleport:['Смена эшелона!','Ушёл в облака!','Манёвр Пугачёва!'],
  finish:  ['Посадка выполнена!','Шасси выпущены, есть касание!','На стоянку!'],
  nomove:  ['Нет коридора…','Метео не пускает…','Взлёт отменён.'],
  taunt:   ['Держи дистанцию, салага.','Вижу цель, работаю.','Спокойно, я на курсе.'],
  win:     ['Задание выполнено!','Небо за нами!','Все борты на стоянке. Отбой.'],
  doublesix:['Две шестёрки! Иду на третий заход!','Кубик горячий, держитесь!'],
  bonus:   ['Контейнер на борту!','Груз принят!'],
  shield:  ['Щит держит!'],
  revenge: ['За тот раз — получай!','Долг платежом красен.','Я запомнил, кто меня сбил.','Счёт закрыт.']
};
const EMO_ICON = { revenge:'😡', capture:'😈', hit:'😭', six:'🔥', doublesix:'🔥', enter:'🛫', teleport:'🌀', finish:'🏅', nomove:'😑', taunt:'😎', win:'🏆', bonus:'🎁', shield:'🛡' };
const CHAT_EMOJI = { revenge:'😡', capture:'😈', hit:'😭', six:'🔥', doublesix:'🔥', enter:'🛫', teleport:'🌀', finish:'🏅', nomove:'😑', taunt:'😎', win:'🏆', bonus:'🎁', shield:'🛡', bomb:'💣' };

let emotes = [];
function pickOne(arr){ return arr[RNG.int(arr.length)]; }

function pieceCell(p, i){
  if(!p || !p.pieces || !p.pieces[i]) return null;
  const pc = p.pieces[i];
  if(pc.step < 0) return BASE_SLOTS[p.dir][i];
  return stepToCell(p.dir, pc.step, pc.lap);
}

function emoteAtCell(cell, emoji){
  if(!cell || !emoji) return;
  const {x,y} = px(cell[0], cell[1]);
  emotes.push({ x:x+cellSize/2, y:y+cellSize/2, emoji, start:performance.now() });
  if(emotes.length > 14) emotes.shift();
}

const radioEl = document.getElementById('radio');
let radioTimer = null;
function radio(text, dir){
  if(!radioEl || !text) return;
  const col = dir ? COLOR[dir] : null;
  radioEl.textContent = '◄ ' + (col ? col.icon + ' ' + col.name + ': ' : '') + '«' + text + '»';
  radioEl.style.color = col ? col.hex : 'var(--hud)';
  radioEl.classList.add('on');
  clearTimeout(radioTimer);
  radioTimer = setTimeout(()=>radioEl.classList.remove('on'), 2800);
}

function emoteEvent(kind, p, i, noEmoji){
  if(!noEmoji && p) emoteAtCell(pieceCell(p, i||0), EMO_ICON[kind]);
  if(RADIO_PHRASES[kind]) radio(pickOne(RADIO_PHRASES[kind]), p ? p.dir : null);
  if(kind !== 'hit') chatBubble(kind, p || null);
}

function drawEmotes(now){
  if(!emotes.length) return;
  emotes = emotes.filter(em=>{
    const t = (now - em.start)/1500;
    if(t >= 1) return false;
    ctx.save();
    ctx.globalAlpha = t < 0.12 ? t/0.12 : Math.max(0, 1 - (t-0.12)/0.88);
    ctx.font = (cellSize * (1.0 + 0.45*Math.min(1, t*5))) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(em.emoji, em.x, em.y - cellSize*0.5 - t*cellSize*2.2);
    ctx.restore();
    return true;
  });
}

/* мини-камера: лёгкий наезд на место сбития */
function cameraPunch(cell){
  if(!Settings.fx || !cell) return;
  try{
    const ox = ((cell[1] + 0.5)/N*100), oy = ((cell[0] + 0.5)/N*100);
    canvas.style.transformOrigin = ox.toFixed(1) + '% ' + oy.toFixed(1) + '%';
    canvas.classList.remove('punch'); void canvas.offsetWidth; canvas.classList.add('punch');
    setTimeout(()=>canvas.classList.remove('punch'), 660);
  }catch(e){}
}

function drawStar(cx, cy, r){
  ctx.save();
  ctx.beginPath();
  for(let k=0;k<5;k++){
    const a1 = -Math.PI/2 + k*2*Math.PI/5;
    const a2 = a1 + Math.PI/5;
    ctx.lineTo(cx + Math.cos(a1)*r, cy + Math.sin(a1)*r);
    ctx.lineTo(cx + Math.cos(a2)*r*0.42, cy + Math.sin(a2)*r*0.42);
  }
  ctx.closePath();
  ctx.fillStyle = '#e0524c';
  ctx.fill();
  ctx.lineWidth = Math.max(0.6, r*0.14);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
  ctx.restore();
}

function drawHudFrame(){
  const w = canvas.width / (window.devicePixelRatio||1);
  const h = canvas.height / (window.devicePixelRatio||1);
  const m = Math.max(6, cellSize*0.35);
  const len = Math.max(14, cellSize*1.1);
  ctx.save();
  ctx.strokeStyle = 'rgba(126,200,255,0.35)';
  ctx.lineWidth = Math.max(1, cellSize*0.05);
  [[m,m,1,1],[w-m,m,-1,1],[m,h-m,1,-1],[w-m,h-m,-1,-1]].forEach(([x,y,sx,sy])=>{
    ctx.beginPath();
    ctx.moveTo(x + sx*len, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy*len);
    ctx.stroke();
  });
  ctx.restore();
}

function burstEmoji(emoji){
  const wrap = document.getElementById('boardWrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'emo-burst';
  el.textContent = emoji;
  el.style.left = (28 + Math.random()*44) + '%';
  wrap.appendChild(el);
  setTimeout(()=>{ el.remove(); }, 1300);
}

const EMO_BAR = [
  { e:'👍', t:'Так точно, к вылету готов!' },
  { e:'😎', t:'Спокойно, я на курсе.' },
  { e:'🔥', t:'Форсаж включён!' },
  { e:'😭', t:'Я подбит, прошу помощи!' },
  { e:'😂', t:'Ну и пилотаж у вас…' },
  { e:'👊', t:'Держись, догоню!' }
];
const emoBarEl = document.getElementById('emoBar');
if(emoBarEl){
  EMO_BAR.forEach(item=>{
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.e;
    b.title = item.t;
    b.addEventListener('click', ()=>{
      burstEmoji(item.e);
      Haptic.tap(); Sound.click();
      const m = players.length ? mover() : null;
      radio(item.t, m ? m.dir : null);
    });
    emoBarEl.appendChild(b);
  });
}

/* ==================== СОХРАНЕНИЕ ВЫЛЕТА ==================== */
const SAVE_KEY = 'mandashnya_save_v1';
const MODE_LABEL = { ffa:'Каждый сам за себя', teams:'2 на 2 (звенья)', crazy:'🤪 КРЕЙЗИ + бонусы', physical:'Свой кубик (2 на 2)' };

function collectSave(){
  return {
    v: 1,
    ts: Date.now(),
    players: players.map(p=>({ dir:p.dir, isAI:!!p.isAI, persona:(p.persona ? p.persona.key : null),
      grudge: Object.assign({}, p.grudge || {}), lastHitBy: p.lastHitBy || null,
      pieces:p.pieces.map(pc=>({ step:pc.step, lap:pc.lap||0, shield:!!pc.shield, shieldUntil:pc.shieldUntil||0, frozen:pc.frozen||0 })) })),
    bonuses: bonuses.map(b=>({ cell:b.cell, key:b.type.key })),
    blockades: blockades.map(b=>({ cell:b.cell, turns:b.turns })),
    finishOrder: finishOrder.slice(),
    crazyTurnCount,
    currentIdx, diceValue, gameMode, botDifficulty, gameSpeed, totalCount,
    diceSeed: DICE_SEED, diceIndex: DICE_INDEX,
    stats: JSON.parse(JSON.stringify(stats || {})),
    moveHistory: Array.isArray(moveHistory) ? moveHistory.slice(-120) : []
  };
}
function persistLocal(){
  if(!players || !players.length || gameOver) return;
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(collectSave())); }catch(e){}
}
function persistGame(){
  persistLocal();
  try{ netOnPersist(); }catch(e){}
}
function readSave(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    const d = JSON.parse(raw);
    if(!d || !Array.isArray(d.players) || !d.players.length) return null;
    return d;
  }catch(e){ return null; }
}
function clearSave(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(e){}
  refreshResumeBlock();
}
function homeCountOf(p){
  return (p.pieces||[]).filter(pc=>{
    if(!pc || pc.step < 0) return false;
    const he = (pc.lap === 0) ? LAP_STEPS : LAP_STEPS + RING_LEN;
    return pc.step >= he;
  }).length;
}
function describeSave(d){
  const when = new Date(d.ts);
  const stamp = when.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
  const board = d.players.map(p=>{
    const col = COLOR[p.dir];
    return '<span style="color:'+col.hex+'">'+col.icon+' '+homeCountOf(p)+'/4</span>';
  }).join('&nbsp;&nbsp; ');
  return (MODE_LABEL[d.gameMode] || 'Вылет') + ' · ' + stamp + '<br>' + board;
}
function refreshResumeBlock(){
  const block = document.getElementById('resumeBlock');
  const info = document.getElementById('resumeInfo');
  if(!block) return;
  const d = readSave();
  if(!d){ block.style.display = 'none'; return; }
  block.style.display = 'block';
  if(info) info.innerHTML = describeSave(d);
}
function setSegActive(seg, attr, value){
  if(!seg) return;
  Array.from(seg.children).forEach(b=>b.classList.toggle('active', b.dataset[attr] === String(value)));
}
function resumeGame(){
  const d = readSave();
  if(!d) return;
  gameMode = d.gameMode || 'ffa';
  botDifficulty = d.botDifficulty || 'normal';
  gameSpeed = d.gameSpeed || 'normal';
  totalCount = d.totalCount || d.players.length;
  players = d.players.map(p=>({
    dir: p.dir,
    isAI: !!p.isAI,
    name: COLOR[p.dir].name,
    persona: p.persona ? (PERSONAS.find(x=>x.key === p.persona) || null) : null,
    grudge: (p.grudge && typeof p.grudge === 'object') ? Object.assign({}, p.grudge) : {},
    lastHitBy: p.lastHitBy || null,
    revengeOn: null,
    pieces: p.pieces.map(pc=>({ step:pc.step, lap:pc.lap||0, shield:!!pc.shield, shieldUntil:pc.shieldUntil||0, frozen:pc.frozen||0 }))
  }));
  players.forEach(p=>{ if(p.isAI && !p.persona) p.persona = PERSONAS[RNG.int(PERSONAS.length)]; });
  bonuses = Array.isArray(d.bonuses)
    ? d.bonuses.map(b=>({ cell:b.cell, type: bonusTypeByKey(b.key) })).filter(b=>!!b.cell && b.type.key !== 'blockade')
    : [];
  blockades = Array.isArray(d.blockades)
    ? d.blockades.map(b=>({ cell:b.cell, turns: b.turns || 1 })).filter(b=>!!b.cell)
    : [];
  finishOrder = Array.isArray(d.finishOrder) ? d.finishOrder.slice() : [];
  crazyTurnCount = d.crazyTurnCount || 0;
  bonusExtraRoll = false; doubleNext = {};
  sixStreak = {}; particles = []; shocks = []; trails = [];
  currentIdx = Math.min(d.currentIdx || 0, players.length - 1);
  diceValue = d.diceValue || 1;
  if(typeof d.diceSeed === 'string' && d.diceSeed.length >= 8){
    DICE_SEED = d.diceSeed; DICE_COMMIT = sha256hex(DICE_SEED);
    DICE_INDEX = d.diceIndex || 0; DICE_LOG = [];
  } else { resetDiceSequence(); }
  stats = d.stats || {};
  players.forEach(p=>{ if(!stats[p.dir]) stats[p.dir] = { moves:0, captures:0, lost:0, sixes:0, teleports:0, finished:0, points:0, bonuses:0 }; });
  moveHistory = Array.isArray(d.moveHistory) ? d.moveHistory : [];
  gameOver = false;
  rolling = false;
  animState = null;
  mustPickPiece = false;
  movablePieces = [];
  selectedPiece = -1;
  validTargets = [];
  poofs = [];
  emotes = [];
  setSegActive(modeSeg, 'm', gameMode);
  setSegActive(diffSeg, 'd', botDifficulty);
  setSegActive(speedSeg, 's', gameSpeed);
  closeSheets();
  showScreen('game');
  document.getElementById('winOverlay').style.display = 'none';
  resizeCanvas();
  renderHistory();
  clearChoice();
  logMsg('Вылет продолжен');
  clearChat();
  renderScoreStrip();
  requestWakeLock();
  setDiceRotation(diceValue);
  updateTurnBanner();
  draw();
  radio('Возвращаемся на курс, продолжаем задание.', players[currentIdx].dir);
  if(activePlayer().isAI && gameMode !== 'physical') setTimeout(rollDice, sp(800));
}

addTapListener(document.getElementById('resumeBtn'), resumeGame);
addTapListener(document.getElementById('dropSaveBtn'), ()=>{ try{Sound.click();}catch(e){} clearSave(); });
addTapListener(document.getElementById('toMenuBtn'), ()=>{ exitToMenu(); });

addTapListener(document.getElementById('pauseResume'), ()=>{ try{Sound.click();}catch(e){} closeSheets(); });
addTapListener(document.getElementById('pauseSave'), ()=>{
  try{Sound.click();}catch(e){}
  persistLocal();
  exitToMenu();
});
addTapListener(document.getElementById('pauseRestart'), ()=>{
  try{Sound.click();}catch(e){}
  closeSheets();
  const config = players.map(p=>({ dir:p.dir, isAI:p.isAI }));
  document.getElementById('winOverlay').style.display = 'none';
  startGame(config);
});
addTapListener(document.getElementById('pauseRules'), ()=>{ try{Sound.click();}catch(e){} closeSheets(); openSheet('rulesSheet'); });
addTapListener(document.getElementById('pauseQuit'), ()=>{
  try{Sound.click();}catch(e){}
  clearSave();
  players = [];
  exitToMenu();
});

window.addEventListener('beforeunload', persistLocal);
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) persistLocal(); });
refreshResumeBlock();

function spawnPoof(r,c){
  const {x,y} = px(r,c);
  poofs.push({ x:x+cellSize/2, y:y+cellSize/2, start:performance.now() });
}

function updateAnim(ts){
  if(!animState) return;
  if(TURBO){
    const q = animState; animState = null;
    if(q.onDone) q.onDone();
    return;
  }
  const st = animState;
  if(ts - st.segStart >= st.segDur){
    st.idx++;
    if(st.idx >= st.cells.length-1){
      const done = st.onDone;
      animState = null;
      if(done) done();
      return;
    }
    st.segStart = ts;
    if(st.kind==='ring'||st.kind==='home'||st.kind==='lap2') Sound.hop();
  }
}

function renderLoop(ts){
  updateAnim(ts);
  if(!TURBO) draw();
  requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* ==================== ОНЛАЙН-РЕЖИМ (Firebase) ==================== */
var NET = { on:false, code:null, myId:null, isHost:false, seats:{}, seatNames:{}, seatsMeta:{}, mySeat:null, roomRef:null, applying:false, seq:0, count:2, status:'idle', unsub:[] };
var ONLINE_DIRS = ['top','right','bottom','left'];
var _fbDb = null;

function netConfigured(){
  return (typeof firebase !== 'undefined') && (typeof FIREBASE_CONFIG !== 'undefined')
    && !!FIREBASE_CONFIG.databaseURL && FIREBASE_CONFIG.databaseURL.indexOf('PASTE') < 0;
}
function netInit(){
  if(_fbDb) return true;
  if(!netConfigured()) return false;
  try{
    if(!(firebase.apps && firebase.apps.length)) firebase.initializeApp(FIREBASE_CONFIG);
    _fbDb = firebase.database();
    return true;
  }catch(e){ console.error('Firebase init error', e); return false; }
}
function netUid(){
  var id=null;
  try{ id=localStorage.getItem('mandashnya_uid'); }catch(e){}
  if(!id){ id='u'+Math.random().toString(36).slice(2,10); try{ localStorage.setItem('mandashnya_uid', id); }catch(e){} }
  return id;
}
function genCode(){ var AB='ACDEFGHJKLMNPQRSTUVWXYZ23456789'; var s=''; for(var i=0;i<4;i++) s+=AB[Math.floor(Math.random()*AB.length)]; return s; }
function onlineMsg(t){ var el=document.getElementById('onlineMsg'); if(el) el.textContent=t||''; }
function lobbyMsg(t){ var el=document.getElementById('lobbyMsg'); if(el) el.textContent=t||''; }

function netOpenHome(){
  var lb=document.getElementById('onlineLobby'); if(lb) lb.style.display='none';
  var hm=document.getElementById('onlineHome'); if(hm) hm.style.display='block';
  onlineMsg('');
  if(!netConfigured()) onlineMsg('⚠ Firebase не настроен: впиши databaseURL в firebase-config.js');
}

function netCreateRoom(){
  if(!netInit()){ onlineMsg('⚠ Firebase не настроен (см. firebase-config.js)'); return; }
  NET.myId = netUid();
  var code = genCode();
  var roomRef = _fbDb.ref('rooms/'+code);
  var seatDirs = ONLINE_DIRS.slice(0, NET.count);
  var seats = {};
  seats[seatDirs[0]] = { uid: NET.myId, name:'Игрок 1' };
  onlineMsg('Создаю комнату…');
  roomRef.set({ host:NET.myId, count:NET.count, status:'lobby', createdAt: firebase.database.ServerValue.TIMESTAMP, seats:seats })
    .then(function(){ NET.code=code; NET.isHost=true; NET.roomRef=roomRef; NET.mySeat=seatDirs[0]; netEnterLobby(); })
    .catch(function(e){ onlineMsg('Ошибка создания: '+e.message); });
}

function netJoinRoom(){
  if(!netInit()){ onlineMsg('⚠ Firebase не настроен (см. firebase-config.js)'); return; }
  var inp=document.getElementById('joinCodeInput');
  var code=((inp&&inp.value)||'').trim().toUpperCase();
  if(code.length<4){ onlineMsg('Введи код из 4 символов'); return; }
  NET.myId=netUid();
  var roomRef=_fbDb.ref('rooms/'+code);
  onlineMsg('Подключаюсь…');
  roomRef.get().then(function(snap){
    if(!snap.exists()){ onlineMsg('Комната не найдена'); return; }
    var room=snap.val();
    if(room.status!=='lobby'){ onlineMsg('Игра уже началась'); return; }
    var seatDirs=ONLINE_DIRS.slice(0, room.count);
    var mySeat=null;
    seatDirs.forEach(function(d){ if(room.seats&&room.seats[d]&&room.seats[d].uid===NET.myId) mySeat=d; });
    if(!mySeat){ mySeat=seatDirs.find(function(d){ return !(room.seats&&room.seats[d]); }); }
    if(!mySeat){ onlineMsg('В комнате нет свободных мест'); return; }
    var name='Игрок '+(seatDirs.indexOf(mySeat)+1);
    roomRef.child('seats/'+mySeat).set({ uid:NET.myId, name:name })
      .then(function(){ NET.code=code; NET.isHost=(room.host===NET.myId); NET.roomRef=roomRef; NET.count=room.count; NET.mySeat=mySeat; netEnterLobby(); })
      .catch(function(e){ onlineMsg('Ошибка входа: '+e.message); });
  }).catch(function(e){ onlineMsg('Ошибка: '+e.message); });
}

function netEnterLobby(){
  NET.status='lobby';
  document.getElementById('onlineHome').style.display='none';
  document.getElementById('onlineLobby').style.display='block';
  var cc=document.getElementById('lobbyCode'); if(cc) cc.textContent=NET.code;
  var handler=NET.roomRef.on('value', function(snap){
    if(!snap.exists()){ if(NET.status!=='playing'){ lobbyMsg('Комната закрыта'); netLeaveRoom(true); netOpenHome(); } return; }
    var room=snap.val();
    NET.count=room.count; NET.seatsMeta=room.seats||{};
    if(NET.status==='lobby') renderLobbySeats(room);
    if(room.status==='playing' && NET.status!=='playing'){ netStartClient(room); }
    if(room.status==='playing' && room.state){ netApplyIncoming(room.state); }
  });
  NET.unsub.push(function(){ try{ NET.roomRef.off('value', handler); }catch(e){} });
}

function renderLobbySeats(room){
  var wrap=document.getElementById('lobbySeats'); if(!wrap) return;
  var seatDirs=ONLINE_DIRS.slice(0, room.count);
  var filled=0; wrap.innerHTML='';
  seatDirs.forEach(function(d,i){
    var col=COLOR[d]; var s=room.seats&&room.seats[d]; if(s) filled++;
    var you=s&&s.uid===NET.myId; var isHost=s&&room.host===s.uid;
    var row=document.createElement('div'); row.className='slot-row';
    row.innerHTML='<div class="slot-name"><span class="swatch" style="background:'+col.hex+';color:'+col.hex+'"></span>'+col.icon+' '+col.name+'</div>'
      +'<div style="font-size:12px;font-weight:700;color:'+(s?col.hex:'#6b7f96')+'">'+(s?('Игрок '+(i+1)+(isHost?' 👑':'')+(you?' · ты':'')):'ожидание…')+'</div>';
    wrap.appendChild(row);
  });
  var so=document.getElementById('startOnlineBtn');
  if(so){ so.style.display=(NET.isHost)?'block':'none'; so.classList.toggle('disabled', filled<2); }
  lobbyMsg(NET.isHost ? (filled<2?'Ждём ещё игроков…':'Все в сборе — можно начинать!') : 'Ждём, когда хост начнёт…');
}

function netStartHost(){
  if(!NET.isHost || !NET.roomRef) return;
  var seatDirs=ONLINE_DIRS.slice(0, NET.count);
  var filled=seatDirs.filter(function(d){ return NET.seatsMeta&&NET.seatsMeta[d]; });
  if(filled.length<2){ lobbyMsg('Нужно минимум 2 игрока'); return; }
  NET.roomRef.child('status').set('playing').catch(function(e){ lobbyMsg('Ошибка: '+e.message); });
}

function netStartClient(room){
  NET.status='playing'; NET.on=true; NET.applying=false; NET.seq=0;
  NET.seats={}; NET.seatNames={};
  var seatDirs=ONLINE_DIRS.slice(0, room.count);
  var activeDirs=seatDirs.filter(function(d){ return room.seats&&room.seats[d]; });
  activeDirs.forEach(function(d){ NET.seats[d]=room.seats[d].uid; NET.seatNames[d]=room.seats[d].name; });
  gameMode='ffa'; botDifficulty='normal'; gameSpeed='normal'; totalCount=activeDirs.length;
  try{ closeSheets(); }catch(e){}
  showScreen('game');
  if(NET.isHost){
    var config=activeDirs.map(function(d){ return { dir:d, isAI:false }; });
    startGame(config);
  } else {
    try{ turnBanner.textContent='Ожидание старта партии…'; }catch(e){}
  }
}

function netMyTurn(){
  if(!NET.on) return true;
  var p=players[currentIdx];
  if(!p) return false;
  return NET.seats[p.dir]===NET.myId;
}

function netAdjustTurnUI(){
  if(!NET.on) return;
  var p=players[currentIdx]; if(!p) return;
  var mine=netMyTurn();
  try{
    diceBtn.classList.toggle('disabled', !mine || rolling || mustPickPiece || gameOver);
    diceBtn.classList.toggle('hot', mine && !mustPickPiece && !rolling && !gameOver);
  }catch(e){}
  if(!mine){
    var nm=(NET.seatNames&&NET.seatNames[p.dir])?NET.seatNames[p.dir]:COLOR[p.dir].name;
    try{ turnBanner.textContent=COLOR[p.dir].icon+' Ход: '+nm+' · ожидание…'; turnBanner.classList.remove('pulse'); }catch(e){}
  }
}

function netOnPersist(){
  if(!NET.on || NET.applying || !NET.roomRef) return;
  try{
    NET.seq=(NET.seq||0)+1;
    NET.roomRef.child('state').set({ seq:NET.seq, by:NET.myId, snapshot:collectSave() });
  }catch(e){ console.error('net push error', e); }
}

function netApplyIncoming(state){
  if(!state || typeof state.seq!=='number') return;
  if(state.seq<=NET.seq){ return; }
  NET.seq=state.seq;
  if(state.by===NET.myId) return;
  if(!state.snapshot) return;
  NET.applying=true;
  try{ applyNetState(state.snapshot); }catch(e){ console.error('applyNetState error', e); }
  NET.applying=false;
}

function applyNetState(d){
  if(!d || !Array.isArray(d.players) || !d.players.length) return;
  gameMode=d.gameMode||'ffa'; botDifficulty=d.botDifficulty||'normal'; gameSpeed=d.gameSpeed||'normal';
  totalCount=d.totalCount||d.players.length;
  players=d.players.map(function(p){ return {
    dir:p.dir, isAI:!!p.isAI, name:COLOR[p.dir].name,
    persona:p.persona?(PERSONAS.find(function(x){ return x.key===p.persona; })||null):null,
    grudge:(p.grudge&&typeof p.grudge==='object')?Object.assign({},p.grudge):{},
    lastHitBy:p.lastHitBy||null, revengeOn:null,
    pieces:p.pieces.map(function(pc){ return { step:pc.step, lap:pc.lap||0, shield:!!pc.shield, shieldUntil:pc.shieldUntil||0, frozen:pc.frozen||0 }; })
  }; });
  bonuses=Array.isArray(d.bonuses)?d.bonuses.map(function(b){ return { cell:b.cell, type:bonusTypeByKey(b.key) }; }).filter(function(b){ return !!b.cell&&b.type.key!=='blockade'; }):[];
  blockades=Array.isArray(d.blockades)?d.blockades.map(function(b){ return { cell:b.cell, turns:b.turns||1 }; }).filter(function(b){ return !!b.cell; }):[];
  finishOrder=Array.isArray(d.finishOrder)?d.finishOrder.slice():[];
  crazyTurnCount=d.crazyTurnCount||0;
  bonusExtraRoll=false; doubleNext={}; sixStreak={}; particles=[]; shocks=[]; trails=[];
  currentIdx=Math.min(d.currentIdx||0, players.length-1);
  diceValue=d.diceValue||1;
  if(typeof d.diceSeed==='string'&&d.diceSeed.length>=8){ DICE_SEED=d.diceSeed; DICE_COMMIT=sha256hex(DICE_SEED); DICE_INDEX=d.diceIndex||0; DICE_LOG=[]; }
  stats=d.stats||{};
  players.forEach(function(p){ if(!stats[p.dir]) stats[p.dir]={ moves:0,captures:0,lost:0,sixes:0,teleports:0,finished:0,points:0,bonuses:0 }; });
  moveHistory=Array.isArray(d.moveHistory)?d.moveHistory:[];
  gameOver=false; rolling=false; animState=null; mustPickPiece=false; movablePieces=[]; selectedPiece=-1; validTargets=[]; poofs=[]; emotes=[];
  var wo=document.getElementById('winOverlay'); if(wo) wo.style.display='none';
  try{ resizeCanvas(); }catch(e){}
  try{ renderHistory(); }catch(e){}
  try{ clearChoice(); }catch(e){}
  try{ renderScoreStrip(); }catch(e){}
  try{ setDiceRotation(diceValue); }catch(e){}
  try{ updateTurnBanner(); }catch(e){}
  try{ draw(); }catch(e){}
}

function netLeaveRoom(silent){
  try{ (NET.unsub||[]).forEach(function(fn){ fn(); }); }catch(e){}
  NET.unsub=[];
  if(!silent && NET.roomRef){
    try{
      if(NET.isHost) NET.roomRef.remove();
      else if(NET.mySeat) NET.roomRef.child('seats/'+NET.mySeat).remove();
    }catch(e){}
  }
  NET.on=false; NET.status='idle'; NET.roomRef=null; NET.code=null; NET.isHost=false; NET.seats={}; NET.mySeat=null;
  var lb=document.getElementById('onlineLobby'); if(lb) lb.style.display='none';
  var hm=document.getElementById('onlineHome'); if(hm) hm.style.display='block';
}

(function wireOnline(){
  var q=function(id){ return document.getElementById(id); };
  var back=q('onlineBack'); if(back) back.addEventListener('click', function(){ netLeaveRoom(); showScreen('menu'); });
  var seg=q('onlineCountSeg');
  if(seg) seg.addEventListener('click', function(e){ var b=e.target.closest('button'); if(!b) return; NET.count=parseInt(b.dataset.v,10)||2; Array.prototype.forEach.call(seg.children,function(x){ x.classList.toggle('active', x===b); }); });
  var cr=q('createRoomBtn'); if(cr) cr.addEventListener('click', netCreateRoom);
  var jr=q('joinRoomBtn'); if(jr) jr.addEventListener('click', netJoinRoom);
  var so=q('startOnlineBtn'); if(so) so.addEventListener('click', netStartHost);
  var lv=q('leaveRoomBtn'); if(lv) lv.addEventListener('click', function(){ netLeaveRoom(); });
  var cp=q('copyCodeBtn'); if(cp) cp.addEventListener('click', function(){ try{ navigator.clipboard.writeText(NET.code); cp.textContent='✓ Скопировано'; setTimeout(function(){ cp.textContent='📋 Скопировать код'; },1500); }catch(e){} });
  var ji=q('joinCodeInput'); if(ji) ji.addEventListener('input', function(){ ji.value=ji.value.toUpperCase(); });
})();

})();
