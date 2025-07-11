/* --------------------------------------------------------------------
   FrogFen – single-page prototype
   – board 10×10
   – rack 16 weighted letters
   – drag-and-drop, word validation, scoring with bonuses
-------------------------------------------------------------------- */

/* ===== 0.  GLOBAL WORD LIST ========================================= */
const WORDS = window.dictionary || (typeof DICTIONARY !== 'undefined' ? DICTIONARY : []);
if (!Array.isArray(WORDS) || !WORDS.length) {
  throw new Error('Dictionary failed to load – check dictionary.js');
}

/* ===== 1.  CONSTANTS & LETTER BAG =================================== */
const BOARD_N     = 10;
const RACK_SIZE   = 16;

/* Scrabble-ish values + rough English frequency for random draw */
const LETTERS = [
  { ch:'A', pts:1, w:9 }, { ch:'B', pts:3, w:2 }, { ch:'C', pts:3, w:2 },
  { ch:'D', pts:2, w:4 }, { ch:'E', pts:1, w:12}, { ch:'F', pts:4, w:2 },
  { ch:'G', pts:2, w:3 }, { ch:'H', pts:4, w:2 }, { ch:'I', pts:1, w:9 },
  { ch:'J', pts:8, w:1 }, { ch:'K', pts:5, w:1 }, { ch:'L', pts:1, w:4 },
  { ch:'M', pts:3, w:2 }, { ch:'N', pts:1, w:6 }, { ch:'O', pts:1, w:8 },
  { ch:'P', pts:3, w:2 }, { ch:'Q', pts:10,w:1 }, { ch:'R', pts:1, w:6},
  { ch:'S', pts:1, w:4 }, { ch:'T', pts:1, w:6 }, { ch:'U', pts:1, w:4 },
  { ch:'V', pts:4, w:2 }, { ch:'W', pts:4, w:2 }, { ch:'X', pts:8, w:1 },
  { ch:'Y', pts:4, w:2 }, { ch:'Z', pts:10,w:1 }
];

/* ===== 2.  DOM HANDLES ============================================== */
const boardEl   = document.getElementById('board');
const rackEl    = document.getElementById('rack');
const totalBar  = document.getElementById('total');
const detailBox = document.getElementById('detail-box');
const submitBtn = document.getElementById('submit-btn');

/* ===== 3. BOARD STATE =============================================== */
const grid = Array.from({ length: BOARD_N }, () =>
  Array.from({ length: BOARD_N }, () => null)
);

let totalScore = 0;
let turn       = 0;                 // max 3
const placedThisTurn = [];          // {row,col,tile}

/* ===== 4. HELPERS ==================================================== */
const rand = max => Math.floor(Math.random() * max);

function weightedDraw(bag, n) {
  const tickets = [];
  bag.forEach(l => { for (let i=0;i<l.w;i++) tickets.push(l); });
  const out = [];
  while (out.length < n) out.push({...tickets[rand(tickets.length)]});
  return out;
}

function inBounds(r,c){ return r>=0 && r<BOARD_N && c>=0 && c<BOARD_N;}
function cellId(r,c)  { return `cell-${r}-${c}`; }

function makeCell(r,c){
  const div = document.createElement('div');
  div.className='board-cell';
  div.id = cellId(r,c);
  div.dataset.r = r; div.dataset.c = c;
  div.ondragover = e=>e.preventDefault();
  div.ondrop     = handleDrop;
  return div;
}

/* ===== 5.  BONUS LAYOUT ============================================= */
const bonusMap = {};   // key 'r,c' -> {type:'L|W', mult:1.1|1.5|2|3|5}

function placeBonus( type, mult, qty ){
  let placed=0;
  while (placed<qty){
    const r = rand(BOARD_N), c=rand(BOARD_N);
    if (bonusMap[`${r},${c}`] || (r===0 && c===0)) continue;
    bonusMap[`${r},${c}`] = { type, mult };
    placed++;
  }
}

placeBonus('W',1.1,5);
placeBonus('W',1.5,3);
placeBonus('W',2  ,1);
placeBonus('L',2  ,5);
placeBonus('L',3  ,3);
placeBonus('L',5  ,1);

/* ===== 6.  INITIAL RENDER =========================================== */
function renderBoard(){
  boardEl.style.gridTemplateColumns = `repeat(${BOARD_N},34px)`;
  boardEl.innerHTML='';
  for (let r=0;r<BOARD_N;r++){
    for (let c=0;c<BOARD_N;c++){
      const cell=makeCell(r,c);
      const b = bonusMap[`${r},${c}`];
      if (b){
        cell.classList.add(b.type==='L' ? `bonus-l${b.mult}` : `bonus-w${b.mult===1.1?'' : b.mult===1.5?'15':b.mult}`);
        cell.textContent = (b.type==='L'?`${b.mult}xL`:`${b.mult}xW`);
      }
      boardEl.appendChild(cell);
    }
  }
}

/* ===== 7.  STARTER WORDS ============================================ */
function seedStarterWords(){
  // choose 5 random words (2–7 letters) that fit on 10×10
  const seedWords=[];
  while(seedWords.length<5){
    const w = WORDS[rand(WORDS.length)].toUpperCase();
    if (w.length<2 || w.length>7) continue;
    // attempt to place
    const horiz = Math.random()<0.5;
    const maxR  = horiz ? BOARD_N : BOARD_N - w.length;
    const maxC  = horiz ? BOARD_N - w.length : BOARD_N;
    let tries=20, ok=false;
    while(tries-- && !ok){
      const r = rand(maxR), c = rand(maxC);
      ok=true;
      for(let i=0;i<w.length;i++){
        const rr=r+(horiz?0:i), cc=c+(horiz?i:0);
        if (grid[rr][cc]){ ok=false; break;}
      }
      if(ok){
        for(let i=0;i<w.length;i++){
          const rr=r+(horiz?0:i), cc=c+(horiz?i:0);
          placeTile(rr,cc,{ch:w[i],pts:letterPoints(w[i])},true);
        }
        seedWords.push(w);
      }
    }
  }
}

function letterPoints(ch){ return LETTERS.find(l=>l.ch===ch).pts; }

/* ===== 8.  RACK ====================================================== */
function populateRack(){
  rackEl.innerHTML='';
  const tiles = weightedDraw(LETTERS,RACK_SIZE);
  tiles.forEach(t=>{
    const div = document.createElement('div');
    div.className='tile';
    div.draggable = true;
    div.dataset.ch = t.ch;
    div.dataset.pts= t.pts;
    div.ondragstart = e=>{
      e.dataTransfer.setData('text/plain', JSON.stringify(t));
      e.dataTransfer.setData('from','rack');
      e.dataTransfer.effectAllowed='move';
      setTimeout(()=>div.style.visibility='hidden',0);
    };
    div.ondragend = ()=>div.style.visibility='visible';

    div.innerHTML = `${t.ch}<span class="score">${t.pts}</span>`;
    rackEl.appendChild(div);
  });
}

/* ===== 9.  TILE PLACEMENT =========================================== */
function placeTile(r,c,tile, starter=false){
  grid[r][c] = { ...tile, starter };
  const cell = document.getElementById(cellId(r,c));
  cell.textContent='';
  const div = document.createElement('div');
  div.className='tile';
  div.draggable = !starter;
  div.dataset.ch = tile.ch;
  div.dataset.pts= tile.pts;
  if (starter) div.classList.add('pre-tile');

  div.innerHTML = `${tile.ch}<span class="score">${tile.pts}</span>`;
  cell.appendChild(div);

  const b = bonusMap[`${r},${c}`];
  if (b && !starter){
    div.classList.add(b.type==='L' ? 'on-l-bonus' : 'on-w-bonus');
  }
}

function removeTileFromCell(cell){
  const r=+cell.dataset.r, c=+cell.dataset.c;
  grid[r][c]=null;
  cell.innerHTML='';
  // restore bonus text if any
  const b=bonusMap[`${r},${c}`];
  if (b){ cell.textContent = (b.type==='L'?`${b.mult}xL`:`${b.mult}xW`); }
}

function handleDrop(e){
  e.preventDefault();
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  const from = e.dataTransfer.getData('from');   // 'rack' or 'board'
  const cell = e.currentTarget;
  const r=+cell.dataset.r, c=+cell.dataset.c;

  // block dropping onto occupied square
  if(grid[r][c]) return;

  if(from==='rack'){
    // remove tile from rack DOM
    const dragged = document.querySelector('.tile[style*="hidden"]');
    if (dragged && dragged.parentElement===rackEl) rackEl.removeChild(dragged);
  }else{
    // moving an existing board tile => clear origin cell
    const id = e.dataTransfer.getData('fromId');
    const origin = document.getElementById(id);
    if(origin) removeTileFromCell(origin);
  }

  placeTile(r,c,data,false);
  placedThisTurn.push({r,c});
}

/* ===== 10.  SUBMIT TURN ============================================= */
submitBtn.onclick = submitTurn;

function submitTurn(){
  if(!placedThisTurn.length) return;

  // Build list of all words formed this turn
  const wordObjs = collectWords();
  if(!wordObjs) { resetTurn(); return; }   // failed adjacency / len check

  let turnScore=0, turnBreakdown='';
  const seen = new Set();

  for(const w of wordObjs){
    if (seen.has(w.word)) continue; // dedupe
    seen.add(w.word);

    if(!WORDS.includes(w.word.toLowerCase())){
      alert(`INVALID WORD: ${w.word}`);
      resetTurn(); return;
    }

    let wordPts=0, wordMult=1;
    w.tiles.forEach(t=>{
      const b = bonusMap[`${t.r},${t.c}`];
      let pts = t.pts;
      if (b && !t.starter && b.type==='L') pts*=b.mult;
      if (b && !t.starter && b.type==='W') wordMult*=b.mult;
      wordPts+=pts;
    });
    const scored = Math.round(wordPts*wordMult);
    turnScore += scored;
    turnBreakdown += `${w.word}: ${wordPts} × ${wordMult.toFixed(2)} = ${scored}\n`;
  }

  totalScore += turnScore;
  totalBar.textContent = `TOTAL: ${totalScore}`;
  detailBox.textContent += turnBreakdown;

  // lock tiles + clear turn buffer
  placedThisTurn.length=0;
  turn++;
}

function collectWords(){
  // verify adjacency: every placed tile must touch at least one existing
  const touches = placedThisTurn.some(t=>{
    return [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{
      const rr=t.r+dr, cc=t.c+dc;
      return inBounds(rr,cc) && grid[rr][cc] && !isPlacedThisTurn(rr,cc);
    });
  });
  if(turn===0 && !touches){
    alert('First word must cover the centre – but for 10×10 we skip that.'); // optional rule
  }else if(turn>0 && !touches){
    alert('Tiles must connect to an existing word'); return null;
  }

  const words=[];
  // scan horizontal then vertical lines crossing placed tiles
  const dirs=[[0,1],[1,0]];
  dirs.forEach(([dr,dc])=>{
    const anchors = [...placedThisTurn];
    while(anchors.length){
      const {r,c}=anchors.pop();
      // move to word start
      let rr=r, cc=c;
      while(inBounds(rr-dr,cc-dc) && grid[rr-dr][cc-dc]){ rr-=dr; cc-=dc;}
      // build word
      const tiles=[];
      let word='';
      let len=0;
      while(inBounds(rr,cc) && grid[rr][cc]){
        const g=grid[rr][cc]; tiles.push({ ...g,r:rr,c:cc});
        word+=g.ch; len++;
        rr+=dr; cc+=dc;
      }
      if(len>1){
        words.push({word,tiles});
      }else if (len===1 && placedThisTurn.length>1){
        // ignore 1-letter main word if other words also formed
      }else if(len===1){
        alert('You must form a word of 2+ letters'); return null;
      }
    }
  });
  return words;
}

function isPlacedThisTurn(r,c){
  return placedThisTurn.some(t=>t.r===r && t.c===c);
}

function resetTurn(){
  // move placed tiles back to rack
  placedThisTurn.forEach(t=>{
    const cell=document.getElementById(cellId(t.r,t.c));
    const div = cell.firstChild;
    removeTileFromCell(cell);
    div.style.visibility='visible';
    rackEl.appendChild(div);
    grid[t.r][t.c]=null;
  });
  placedThisTurn.length=0;
}

/* ===== 11.  INIT ===================================================== */
renderBoard();
seedStarterWords();
populateRack();
