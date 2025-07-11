/*  FrogFen – play-test build v0.3.8  (complete file)
    ───────────────────────────────────────────────────
    • Drag-back rack tiles, fixed starter tiles, bonus squares
    • Submit validates primary & cross-words, per-turn scoring
    • Console logs show every word checked
    • dataset.letter always stores ONLY the uppercase letter
      (score numbers in <small> are ignored)
-------------------------------------------------------------------------- */

const BOARD_SIZE = 11;

/* ── DOM references ─────────────────────────────────────── */
const boardEl   = document.getElementById('board');
const bankEl    = document.getElementById('letter-bank');
const submitBtn = document.getElementById('submit-btn');
const totalEl   = document.getElementById('total-score');
const detailBox = document.getElementById('detail-box');

/* allow dropping tiles back to the rack */
bankEl.ondragover = e => e.preventDefault();
bankEl.ondrop = e => {
  const id   = e.dataTransfer.getData('text');
  const tile = document.getElementById(id);
  if (!tile || tile.dataset.locked === '1') return;
  bankEl.appendChild(tile);

  /* clear previous board cell */
  const src = tile._prevCell;
  if (src) {
    delete src.dataset.letter;
    delete src.dataset.locked;
    src.innerHTML = '';
    tile._prevCell = null;
  }
};

/* ── Data constants ─────────────────────────────────────── */
const dictionary = new Set(window.dictionaryWords);   // lower-case
const letterScores = {
  A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,
  O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10
};

/* simple weighted distribution string */
const distribution =
  "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTT"+
  "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* ── Seeded RNG (same board per day unless PLAYTEST_RANDOM) ─────────── */
const PLAYTEST_RANDOM = true;   // set false for fixed daily seed
const seedStr = PLAYTEST_RANDOM ? Date.now().toString()
                                : new Date().toISOString().slice(0,10);

let seed = 0; for (const ch of seedStr) seed += ch.charCodeAt(0);
function mulberry32(a){return()=>{let t=a+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);
t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const rand = mulberry32(seed);
const choice = arr => arr[Math.floor(rand()*arr.length)];

/* ── Build empty board grid ─────────────────────────────────────────── */
const boardCells = [];
for (let r=0; r<BOARD_SIZE; r++){
  for (let c=0; c<BOARD_SIZE; c++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = r;
    cell.dataset.col = c;

    cell.ondragover = e => e.preventDefault();
    cell.ondrop = e => {
      const id   = e.dataTransfer.getData('text');
      const tile = document.getElementById(id);
      if (!tile || tile.dataset.locked === '1' || cell.firstChild) return;

      /* remember previous cell in case tile is dragged back out */
      tile._prevCell = tile.parentElement.classList.contains('cell')
        ? tile.parentElement : null;

      cell.appendChild(tile);
      cell.dataset.letter = tile.dataset.letter;   // << clean letter only
    };

    boardEl.appendChild(cell);
    boardCells.push(cell);
  }
}

/* ── Bonus squares ─────────────────────────────────────────────────── */
const bonusPlan = [
  ['word',   1.1, 5, 'green1'],
  ['word',   1.5, 3, 'green15'],
  ['word',     2, 1, 'green2'],
  ['letter',   2, 5, 'purple2'],
  ['letter',   3, 3, 'purple3'],
  ['letter',   5, 1, 'purple5']
];

const booked = new Set();
bonusPlan.forEach(([type, mult, count, cls])=>{
  let placed = 0;
  while (placed < count) {
    const idx = Math.floor(rand()*boardCells.length);
    if (booked.has(idx)) continue;
    booked.add(idx);

    const cell = boardCells[idx];
    cell.dataset.bonusType  = type;
    cell.dataset.bonusMult  = mult;
    cell.classList.add(cls);

    const tag = document.createElement('span');
    tag.className = 'bonus';
    tag.textContent = type === 'word' ? `${mult}xW` : `${mult}xL`;
    cell.appendChild(tag);
    placed++;
  }
});

/* ── Place 5 valid starter words (blue tiles) ───────────────────────── */
(function placeStarterWords(){

  /* collect every horizontal & vertical word currently on the board */
  const scanWords = () => {
    const set = new Set();

    // horizontal first
    for (let r=0; r<BOARD_SIZE; r++){
      let w=''; for (let c=0; c<BOARD_SIZE; c++){
        const cell = boardCells[r*BOARD_SIZE + c];
        if (cell.dataset.letter) w += cell.dataset.letter;
        else { if (w.length > 1) set.add(w.toLowerCase()); w=''; }
      }
      if (w.length > 1) set.add(w.toLowerCase());
    }

    // vertical
    for (let c=0; c<BOARD_SIZE; c++){
      let w=''; for (let r=0; r<BOARD_SIZE; r++){
        const cell = boardCells[r*BOARD_SIZE + c];
        if (cell.dataset.letter) w += cell.dataset.letter;
        else { if (w.length > 1) set.add(w.toLowerCase()); w=''; }
      }
      if (w.length > 1) set.add(w.toLowerCase());
    }

    return set;
  };

  /* draw fixed starter word */
  const drawFixed = (word, r, c, dir) => {
    for (let i=0; i<word.length; i++){
      const cell = dir === 'h'
        ? boardCells[r*BOARD_SIZE + c+i]
        : boardCells[(r+i)*BOARD_SIZE + c];

      cell.dataset.letter = word[i];
      cell.dataset.locked = '1';

      const div = document.createElement('div');
      div.className = 'fixed-tile';
      div.textContent = word[i];
      div.dataset.letter = word[i];        // store clean letter
      const sm = document.createElement('small');
      sm.textContent = letterScores[word[i]];
      div.appendChild(sm);
      cell.innerHTML = '';
      cell.appendChild(div);
    }
  };

  let attempts = 0;
  while (true){
    /* clear board if we need to restart */
    boardCells.forEach(c=>{
      delete c.dataset.letter;
      delete c.dataset.locked;
      c.innerHTML = '';
    });

    const first = choice([...dictionary]).toUpperCase().slice(0,8);
    drawFixed(first,
      Math.floor(BOARD_SIZE/2),
      Math.floor((BOARD_SIZE-first.length)/2),
      'h');

    let placed = 1, tries = 0;
    while (placed < 5 && tries < 1500){
      const w   = choice([...dictionary]).toUpperCase().slice(0,8);
      const dir = Math.random() < 0.5 ? 'h' : 'v';
      const anchor = Math.floor(rand()*w.length);
      const ch     = w[anchor];

      const anchors = boardCells.filter(c=>c.dataset.letter === ch);
      if (!anchors.length){ tries++; continue; }

      const tgt = choice(anchors);
      const sr  = dir==='h' ? +tgt.dataset.row - 0
                            : +tgt.dataset.row - anchor;
      const sc  = dir==='h' ? +tgt.dataset.col - anchor
                            : +tgt.dataset.col - 0;

      /* check bounds + collisions */
      let fits = true;
      if (dir==='h'){
        if (sc < 0 || sc+w.length > BOARD_SIZE) fits=false;
        else for (let i=0;i<w.length;i++){
          const cell=boardCells[sr*BOARD_SIZE+sc+i];
          if (cell.dataset.letter && cell.dataset.letter!==w[i]){ fits=false; break;}
        }
      }else{
        if (sr < 0 || sr+w.length > BOARD_SIZE) fits=false;
        else for (let i=0;i<w.length;i++){
          const cell=boardCells[(sr+i)*BOARD_SIZE+sc];
          if (cell.dataset.letter && cell.dataset.letter!==w[i]){ fits=false; break;}
        }
      }
      if (!fits){ tries++; continue; }

      /* temp place, validate resulting board */
      const temps=[];
      for (let i=0;i<w.length;i++){
        const cell=dir==='h'?boardCells[sr*BOARD_SIZE+sc+i]
                            :boardCells[(sr+i)*BOARD_SIZE+sc];
        if (!cell.dataset.letter){
          cell.dataset.letter=w[i]; temps.push(cell);
        }
      }
      if ([...scanWords()].some(x=>!dictionary.has(x)))
        temps.forEach(c=>delete c.dataset.letter);
      else {
        drawFixed(w,sr,sc,dir);
        placed++;
      }
      tries++;
    }
    if (placed===5) break;
    if (++attempts > 4){ alert('Board generation failed'); break; }
  }
})();

/* ── Build 15-tile rack ─────────────────────────────────────────────── */
const rack=[];
while (rack.length<15) rack.push(choice(distribution));

rack.forEach((ltr,i)=>{
  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.id = `tile-${i}`;
  tile.textContent = ltr;          // big letter
  tile.dataset.letter = ltr;       // clean letter for logic
  tile.draggable = true;

  const sm = document.createElement('small');
  sm.textContent = letterScores[ltr];
  tile.appendChild(sm);

  tile.ondragstart = e => e.dataTransfer.setData('text', tile.id);

  /* allow swapping within the rack */
  tile.ondragover = e => e.preventDefault();
  tile.ondrop = e => {
    const id = e.dataTransfer.getData('text');
    const drg = document.getElementById(id);
    if (!drg || drg.dataset.locked==='1') return;
    bankEl.appendChild(drg);

    const src = drg._prevCell;
    if (src){
      delete src.dataset.letter;
      delete src.dataset.locked;
      src.innerHTML='';
      drg._prevCell = null;
    }
  };

  bankEl.appendChild(tile);
});

/* ── Helper functions ──────────────────────────────────────────────── */
const activeTiles = () =>
  [...boardEl.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);

const straightLine = ts => {
  const rows = ts.map(t=>+t.parentElement.dataset.row);
  const cols = ts.map(t=>+t.parentElement.dataset.col);
  return rows.every(r=>r===rows[0]) || cols.every(c=>c===cols[0]);
};

const collect = (r,c,dr,dc) => {
  const arr=[]; while (
    r>=0 && r<BOARD_SIZE && c>=0 && c<BOARD_SIZE &&
    boardCells[r*BOARD综合
::contentReference[oaicite:0]{index=0}
