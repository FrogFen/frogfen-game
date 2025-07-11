/* ---------- FrogFen   game.js  (10×10, 16-tile rack) ------------ */
const BOARD = 10;
const RACK  = 16;
const MAX_TURNS = 3;

/* ••• letter pool ••• */
const LETTERS = [
  {l:'E',n:12,v:1},{l:'A',n:9,v:1},{l:'I',n:9,v:1},{l:'O',n:8,v:1},
  {l:'N',n:6,v:1},{l:'R',n:6,v:1},{l:'T',n:6,v:1},{l:'L',n:4,v:1},
  {l:'S',n:4,v:1},{l:'U',n:4,v:1},{l:'D',n:4,v:2},{l:'G',n:3,v:2},
  {l:'B',n:2,v:3},{l:'C',n:2,v:3},{l:'M',n:2,v:3},{l:'P',n:2,v:3},
  {l:'F',n:2,v:4},{l:'H',n:2,v:4},{l:'V',n:2,v:4},{l:'W',n:2,v:4},
  {l:'Y',n:2,v:4},{l:'K',n:1,v:5},{l:'J',n:1,v:8},{l:'X',n:1,v:8},
  {l:'Q',n:1,v:10},{l:'Z',n:1,v:10}
];

/* references */
const board = document.getElementById('board'),
      rack  = document.getElementById('letter-bank'),
      totalBox = document.getElementById('total-score'),
      detailBox= document.getElementById('detail-box'),
      submitBtn= document.getElementById('submit-btn');

/* state */
const bonusMap = {};           // "r,c" → {type, mult}
let rackTiles = [], placed = [];
let turns=0, total=0;

/* helpers */
const rand = n => Math.floor(Math.random()*n);
const val  = ch=>LETTERS.find(o=>o.l===ch).v;

/* ---------- build empty board ---------- */
board.style.setProperty('--sz',BOARD);
for(let i=0;i<BOARD*BOARD;i++){
  board.appendChild(Object.assign(document.createElement('div'),{className:'cell'}));
}
function addBonus(r,c,type,mult,cls,txt){
  bonusMap[`${r},${c}`]={type,mult};
  const d=board.children[r*BOARD+c];
  d.classList.add(cls,'bonus');d.textContent=txt;
}
function place(n,type,mult,cls,txt){
  let k=0;while(k<n){
    const r=rand(BOARD),c=rand(BOARD);
    if(!bonusMap[`${r},${c}`]){
      addBonus(r,c,type,mult,cls,txt);k++;
    }
  }
}
place(5,'word',1.1,'g11','1.1xW');
place(3,'word',1.5,'g15','1.5xW');
place(1,'word',2,'g2','2xW');
place(5,'letter',2,'p2','2xL');
place(3,'letter',3,'p3','3xL');
place(1,'letter',5,'p5','5xL');

/* ---------- seed 5 interconnected words ---------- */
function fixedTile(ch){
  const d=document.createElement('div');
  d.className='fixed-tile'; d.dataset.letter=ch; d.textContent=ch;
  d.appendChild(Object.assign(document.createElement('small'),{textContent:val(ch)}));
  return d;
}
function putWord(w,r,c,h){              // h = horizontal?
  if(h && c+w.length>BOARD) return false;
  if(!h && r+w.length>BOARD) return false;
  // collision check
  for(let i=0;i<w.length;i++){
    const rr=r+(h?0:i),cc=c+(h?i:0);
    const cell=board.children[rr*BOARD+cc];
    if(cell.dataset.letter && cell.dataset.letter!==w[i]) return false;
  }
  // place
  for(let i=0;i<w.length;i++){
    const rr=r+(h?0:i),cc=c+(h?i:0),
          cell=board.children[rr*BOARD+cc];
    if(!cell.dataset.letter){
      cell.appendChild(fixedTile(w[i]));
      cell.dataset.letter=w[i];
    }
  }
  return true;
}
function seed(){
  let placed=0, attempts=0;
  while(placed<5 && attempts<300){
    attempts++;
    const w=dictionary[rand(dictionary.length)].toUpperCase();
    const h=Math.random()<.5, r=rand(BOARD), c=rand(BOARD);
    if(putWord(w,r,c,h)) placed++;
  }
}
seed();

/* ---------- rack ---------- */
function tile(ch){
  const d=document.createElement('div');
  d.className='tile'; d.draggable=true; d.dataset.letter=ch; d.textContent=ch;
  d.appendChild(Object.assign(document.createElement('small'),{textContent:val(ch)}));
  d.ondragstart=e=>{e.dataTransfer.setData('id','tile');dragged=d;};
  return d;
}
function refill(){
  while(rackTiles.length<RACK){
    const pool=[];LETTERS.forEach(o=>{for(let i=0;i<o.n;i++)pool.push(o.l)});
    document.querySelectorAll('.tile,.fixed-tile').forEach(t=>{
      const ix=pool.indexOf(t.dataset.letter);if(ix>-1) pool.splice(ix,1);
    });
    if(!pool.length) break;
    const ch=pool[rand(pool.length)];
    const t=tile(ch); rack.appendChild(t); rackTiles.push(t);
  }
}
let dragged=null;
refill();

/* ---------- drag / drop ---------- */
['dragover','drop'].forEach(evt=>{
  board.addEventListener(evt,e=>e.preventDefault());
  rack .addEventListener(evt,e=>e.preventDefault());
});
board.ondrop=e=>{
  const cell=e.target.closest('.cell');
  if(!cell||cell.firstChild)return;
  cell.appendChild(dragged);
  rackTiles=rackTiles.filter(x=>x!==dragged);
  placed.push(dragged);
  tint(dragged,cell);
};
rack.ondrop=e=>{
  if(rackTiles.includes(dragged))return;
  const slot=[...rack.children].find(c=>!c.firstChild);
  if(slot){slot.appendChild(dragged);rackTiles.push(dragged);untint(dragged);placed=placed.filter(x=>x!==dragged);}
};
/* colour-tint */
function tint(t,cell){
  const i=[...board.children].indexOf(cell),
        r=Math.floor(i/BOARD),c=i%BOARD,
        b=bonusMap[`${r},${c}`];
  if(!b)return;
  t.classList.add(b.type==='word'?
                  (b.mult===2?'g2':b.mult===1.5?'g15':'g11'):
                  (b.mult===5?'p5':b.mult===3?'p3':'p2'));
}
function untint(t){
  t.classList.remove('g2','g15','g11','p5','p3','p2');
}

/* ---------- submit ---------- */
submitBtn.onclick=()=>{
  if(!placed.length){alert('Place tiles first');return;}
  if(turns>=MAX_TURNS){alert('No turns left');return;}

  const words = collect();                 // ← NEW collect() below
  if(!words.length){alert('Tiles must connect to an existing word');return;}

  /* dictionary */
  const bad=words.find(w=>!dictionary.includes(w.toLowerCase()));
  if(bad){alert('INVALID WORD: '+bad);return;}

  /* score */
  let turn=0, breakdown='';
  words.forEach(w=>{
    const {pts,mult}=score(w);
    const s=pts*mult;turn+=s;
    breakdown+=`${w}: ${pts} × ${mult.toFixed(2)} = ${s}\n`;
  });
  total+=turn; totalBox.textContent=total;
  detailBox.textContent+=breakdown+'\n';

  /* lock tiles */
  placed.forEach(t=>t.classList.replace('tile','fixed-tile'));
  placed.length=0; turns++; refill();
};

/* ---------- helpers ---------- */
function collect(){
  /* returns UNIQUE list of words affected this turn (main first) */
  const grid=[...Array(BOARD)].map(()=>Array(BOARD).fill(''));
  board.querySelectorAll('.cell').forEach((c,i)=>{
    if(c.dataset.letter) grid[Math.floor(i/BOARD)][i%BOARD]=c.dataset.letter;
  });
  const coords=placed.map(t=>{
    const i=[...board.children].indexOf(t.parentElement);
    return{r:Math.floor(i/BOARD),c:i%BOARD};
  });
  const horiz=coords.every(({r})=>r===coords[0].r);
  const words=[];
  const scan=(r,c,dr,dc)=>{
    let rr=r,cc=c;while(rr-dr>=0&&cc-dc>=0&&rr-dr<BOARD&&cc-dc<BOARD&&grid[rr-dr][cc-dc]){rr-=dr;cc-=dc}
    let w='';while(rr<BOARD&&cc<BOARD&&grid[rr][cc]){w+=grid[rr][cc];rr+=dr;cc+=dc}
    return w.length>1?w:'';
  };
  /* main   */
  words.push(scan(coords[0].r,coords[0].c,0,horiz?1:0));
  /* crosses */
  coords.forEach(({r,c})=>{
    const w=scan(r,c,1,horiz?0:1);
    if(w)words.push(w);
  });
  /* remove duplicates unconditionally */
  return [...new Set(words)];
}
function score(word){
  let pts=0, mult=1;
  [...word].forEach((ch,idx)=>{
    const tile=[...board.querySelectorAll('.fixed-tile')].find((t,i)=>!t.used&&t.dataset.letter===ch);
    if(tile){tile.used=true;}
    pts+=val(ch);
    const i=[...board.children].indexOf(tile.parentElement),
          r=Math.floor(i/BOARD),c=i%BOARD,
          b=bonusMap[`${r},${c}`];
    if(b){
      if(b.type==='letter') pts+=val(ch)*(b.mult-1);
      else mult*=b.mult;
    }
  });
  board.querySelectorAll('.fixed-tile').forEach(t=>delete t.used);
  return{pts,mult};
}
