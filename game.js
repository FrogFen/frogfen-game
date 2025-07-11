/* ────────────────────────────────────────────────────────── */
/* FrogFen – play-test build v0.4.2 (10×10, 16-rack letters) */
/* • Bonus drop, rack swap/back, attachment, scoring, detail */
/* • Clears old cell when tile is moved (“GNN” bug fixed)    */
/* ────────────────────────────────────────────────────────── */

/* === 1. DOM refs === */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* === 2. Static data === */
const BOARD = 10;
const SIZE  = BOARD;

/* letter → points */
const points = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
                 N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10 };

/* bonus layout (row,col) ► label */
const bonuses = {
  "0,3":"3×L", "0,5":"3×L", "1,6":"1.5×W", "0,0":"1.5×W",
  "3,1":"2×W", "4,4":"5×L", "5,8":"2×L", "8,0":"1.1×W",
  "9,6":"1.5×W"
};

/* random helper */
const rand = max => Math.floor(Math.random()*max);

/* === 3. Build board === */
for (let r=0;r<SIZE;r++) {
  const tr = board.insertRow();
  for (let c=0;c<SIZE;c++) {
    const td = tr.insertCell();
    td.dataset.row = r;
    td.dataset.col = c;
    const key = `${r},${c}`;
    if (bonuses[key]) {
      td.dataset.bonus = bonuses[key];
    }
  }
}

/* === 4. Drag helpers === */
let dragTile = null;
board.addEventListener('dragstart',e=>{
  if (!e.target.classList.contains('tile')) return;
  dragTile = e.target;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain','');
  setTimeout(()=>dragTile.classList.add('drag'),0);
});
board.addEventListener('dragend',()=>dragTile?.classList.remove('drag'));
['dragover','dragenter'].forEach(ev=>{
  board.addEventListener(ev,e=>e.preventDefault(),false);
});
board.addEventListener('drop',e=>{
  e.preventDefault();
  const cell = e.target.closest('td');
  if (!cell || cell.querySelector('.tile')) return;
  cell.appendChild(dragTile);
  dragTile.dataset.row = cell.dataset.row;
  dragTile.dataset.col = cell.dataset.col;
});

/* rack → board & back */
rackBox.addEventListener('dragstart',e=>e.stopPropagation());
rackBox.addEventListener('drop',e=>{
  e.preventDefault();
  if (dragTile?.classList.contains('lock')) return;
  rackBox.appendChild(dragTile);
  dragTile.removeAttribute('data-row');
  dragTile.removeAttribute('data-col');
});

/* === 5. Seed 5 random words (upper-case) === */
const dictArr = window.dictionaryWords.filter(w=>w.length<=BOARD);
const dirs = [[1,0],[0,1]]; /* right or down */

function place(word) {
  word = word.toUpperCase();
  for (let tries=0;tries<30;tries++) {
    const dir = dirs[rand(2)];
    const r0  = rand(SIZE - dir[0]*word.length);
    const c0  = rand(SIZE - dir[1]*word.length);
    let ok=true;
    for (let i=0;i<word.length;i++) {
      const r = r0+dir[0]*i, c = c0+dir[1]*i;
      const cell = board.rows[r].cells[c];
      if (cell.querySelector('.tile')) { ok=false; break; }
    }
    if (!ok) continue;
    /* paint */
    for (let i=0;i<word.length;i++){
      const r = r0+dir[0]*i, c = c0+dir[1]*i;
      const cell = board.rows[r].cells[c];
      cell.appendChild(makeTile(word[i],true));
    }
    return true;
  }
  return false;
}

function seed() {
  let placed=0;
  while (placed<5) {
    const w = dictArr[rand(dictArr.length)];
    if (place(w)) placed++;
  }
}
seed();

/* === 6. Rack === */
function makeTile(ch,locked=false) {
  const div = document.createElement('div');
  div.className='tile';
  if (locked) div.classList.add('lock');
  div.draggable = !locked;
  div.textContent = ch;
  const pt = points[ch]??1;
  const sub = document.createElement('sub');
  sub.textContent = pt;
  div.appendChild(sub);
  div.dataset.letter = ch;
  return div;
}
function populateRack() {
  rackBox.innerHTML='';
  const letters = "EEEEEEEEEEEEEEEEEEEEEEEEAAAAAAAAIIIIIIII" +
                  "OOOOOOOOOOO NN RR TT LL SS UUDDGGBBCCMMPPFHVWYJKQXZ";
  while (rackBox.children.length<16){
    const ch = letters[rand(letters.length)];
    rackBox.appendChild(makeTile(ch));
  }
}
populateRack();

/* === 7. Submit turn === */
submit.onclick = () => {
  const played = [...board.querySelectorAll('.tile:not(.lock)')];
  if (!played.length) return;
  /* must all touch an existing lock */
  const touches = played.some(t=>{
    const r=+t.dataset.row, c=+t.dataset.col;
    return [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{
      const rr=r+dr, cc=c+dc;
      return rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE &&
             board.rows[rr].cells[cc].querySelector('.lock');
    });
  });
  /* allow first turn */
  const firstTurn = board.querySelectorAll('.lock').length===0;
  if (!firstTurn && !touches) { alert('Tiles must connect'); return; }

  /* read words formed */
  const grid = Array.from({length:SIZE},()=>Array(SIZE).fill(''));
  board.querySelectorAll('.tile').forEach(t=>{
    grid[+t.dataset.row][+t.dataset.col] = t.dataset.letter;
  });
  const words=[];
  /* horizontal */
  for (let r=0;r<SIZE;r++){
    let str='',from=-1;
    for (let c=0;c<=SIZE;c++){
      const ch = grid[r][c]||'';
      if (ch) { if (str===''){from=c;} str+=ch; }
      else { if(str.length>1) words.push(str); str=''; }
    }
  }
  /* vertical */
  for (let c=0;c<SIZE;c++){
    let str='';
    for (let r=0;r<=SIZE;r++){
      const ch = (grid[r]||[])[c]||'';
      if (ch){ str+=ch; }
      else { if(str.length>1) words.push(str); str=''; }
    }
  }
  if (!words.length){ alert('Need a 2-letter word'); return; }

  /* validate & score */
  const dict = new Set(window.dictionaryWords);
  let turnScore=0, summary='';
  for (const w of words){
    if (!dict.has(w.toLowerCase())){ alert(`INVALID WORD: ${w}`); return; }
    let wordMult=1, wordPts=0;
    [...w].forEach((ch,i)=>{
      const coord = played.find(t=>t.dataset.letter===ch&&
                     +t.dataset.row===undefined?false:true);
    });
    /* simple per-letter sum (bonus handled visually only) */
    [...w].forEach(ch=>wordPts+=points[ch]);
    turnScore+=wordPts*wordMult;
    summary+=`${w}: ${wordPts} × ${wordMult.toFixed(2)} = ${wordPts*wordMult}\n`;
  }

  totalEl.textContent = +totalEl.textContent + turnScore;
  detail.textContent += summary;

  /* lock tiles, clear rack */
  played.forEach(t=>{ t.classList.add('lock'); t.draggable=false; });
  populateRack();
};
