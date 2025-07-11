/*  FrogFen  – stable play-test build  v0.4.0  */

const BOARD = 11;                     // 11×11 grid
const RACK  = 16;                     // two rows of eight
const TURNS = 3;                      // demo: three moves max

/* ── DOM refs ────────────────────────────────────────────── */
const boardEl  = document.getElementById('board');
const rackEl   = document.getElementById('letter-bank');
const btnEl    = document.getElementById('submit-btn');
const totalEl  = document.getElementById('total-score');
const detailEl = document.getElementById('detail-box');

/* ── data ───────────────────────────────────────────────── */
const dict  = new Set(window.dictionaryWords);   // lower-case demo list
const score = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,
               O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
const bag   = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* random helper ------------------------------------------------------- */
const r = (()=>{let s=Date.now()%1e9;return ()=>{s=Math.imul(48271,s)%2147483647;return s/2147483647;};})();
const pick = a => a[ Math.floor(r()*a.length) ];

/* ── build empty board grid ─────────────────────────────── */
const cells = [];
for(let y=0;y<BOARD;y++){
  for(let x=0;x<BOARD;x++){
    const c = document.createElement('div');
    c.className = 'cell';
    c.dataset.row=y; c.dataset.col=x;
    /* drag target */
    c.ondragover = e=>e.preventDefault();
    c.ondrop = e=>{
      const id=e.dataTransfer.getData('text');
      const t=document.getElementById(id);
      if(!t || t.dataset.locked==='1' || c.firstChild) return;
      c.appendChild(t);
    };
    boardEl.appendChild(c);
    cells.push(c);
  }
}

/* simple symmetrical bonus pattern ----------------------- */
const B=[                                 // (type , mult , qty , class)
  ['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
  ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']
];
const used = new Set();
B.forEach(([t,m,q,cls])=>{
  while(q--){
    let idx;
    do idx = Math.floor(r()*cells.length); while(used.has(idx));
    used.add(idx);
    const c=cells[idx];
    c.classList.add(cls);
    c.dataset.bonusType=t;
    c.dataset.bonusMult=m;
    /* show hint only until a tile is placed */
    c.textContent = (t==='word'?m+'×W':m+'×L');
    c.style.fontSize='0.55rem';
  }
});

/* ── helper to draw the fixed starter words --------------- */
const starterWords = (()=>{               // keep re-rolling until 5 fit
  const w = [...dict].filter(v=>v.length>=3 && v.length<=7);
  while(true){
    const choice=w.slice().sort(()=>r()-.5).slice(0,5).map(s=>s.toUpperCase());
    if(place(choice)) return;             // place() mutates board & exits
  }
})();
function place(list){
  /* clear board cells */
  cells.forEach(c=>{
    if(c.dataset.letter && !c.dataset.locked){
      delete c.dataset.letter; c.innerHTML='';
    }
  });
  let ok=true;
  list.forEach((word,i)=>{
    const dir = i%2?'v':'h';              // alternate orientation
    const max = BOARD - word.length;
    const r0  = Math.floor(r()*(dir==='h'?BOARD:max));
    const c0  = Math.floor(r()*(dir==='v'?BOARD:max));
    for(let j=0;j<word.length;j++){
      const r = dir==='h'?r0 : r0+j;
      const c = dir==='h'?c0+j : c0;
      const cell = cells[r*BOARD+c];
      if(cell.dataset.letter && cell.dataset.letter!==word[j]) ok=false;
    }
    if(!ok) return;                       // clash – abort
    // draw word
    for(let j=0;j<word.length;j++){
      const r = dir==='h'?r0 : r0+j;
      const c = dir==='h'?c0+j : c0;
      const cell = cells[r*BOARD+c];
      cell.dataset.letter = word[j];
      cell.dataset.locked = '1';
      cell.innerHTML = `<div class="fixed-tile">${word[j]}<small>${score[word[j]]}</small></div>`;
    }
  });
  return ok;
}

/* ── build rack -------------------------------------------------------- */
while(rackEl.firstChild) rackEl.firstChild.remove();
for(let i=0;i<RACK;i++){
  const ltr = pick(bag);
  const t = document.createElement('div');
  t.className='tile'; t.id='t'+i; t.textContent=ltr;
  t.draggable=true;
  t.innerHTML = `${ltr}<small>${score[ltr]}</small>`;
  t.ondragstart = e=>e.dataTransfer.setData('text',t.id);
  rackEl.appendChild(t);
}
/* allow drag-back from board */
rackEl.ondragover = e=>e.preventDefault();
rackEl.ondrop = e=>{
  const id=e.dataTransfer.getData('text');
  const t=document.getElementById(id);
  if(!t || t.dataset.locked==='1') return;
  const from=t.parentElement;
  rackEl.appendChild(t);
  if(from.classList.contains('cell')) from.innerHTML='';
};

/* ── gameplay ---------------------------------------------------------- */
let turn=0,total=0;
const played = new Set();                 // prevent duplicate logging

btnEl.onclick = ()=>{
  const tiles=[...boardEl.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
  if(!tiles.length){ alert('place tiles'); return; }
  /* straight line? */
  const rows=tiles.map(t=>+t.parentElement.dataset.row);
  const cols=tiles.map(t=>+t.parentElement.dataset.col);
  if(!(rows.every(v=>v===rows[0])||cols.every(v=>v===cols[0]))){
    alert('tiles must be in a straight line'); return;
  }
  tiles.sort((a,b)=>{
    const ra=+a.parentElement.dataset.row, rb=+b.parentElement.dataset.row;
    const ca=+a.parentElement.dataset.col, cb=+b.parentElement.dataset.col;
    return ra!==rb?ra-rb:ca-cb;
  });
  const word = tiles.map(t=>t.textContent).join('').toLowerCase();
  if(word.length<2){ alert('word must be 2+ letters'); return; }
  if(played.has(word)){ alert('already played'); return; }
  if(!dict.has(word)){ alert('invalid word'); return; }

  /* scoring ----------------------------------------------------------- */
  let base=0, mult=1;
  tiles.forEach(t=>{
    let v=score[t.textContent];
    const cell=t.parentElement;
    if(cell.dataset.bonusType==='letter') v*=+cell.dataset.bonusMult;
    if(cell.dataset.bonusType==='word')   mult*=+cell.dataset.bonusMult;
    base+=v;
  });
  const gain=Math.round(base*mult);
  total+=gain;  totalEl.textContent=total;
  detailEl.textContent+=`${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${gain}\n`;

  /* lock the tiles & advance turn ------------------------------------ */
  tiles.forEach(t=>t.dataset.locked='1');
  played.add(word);
  if(++turn===TURNS) alert(`Game over!  Total = ${total}`);
};
