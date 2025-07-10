/* FrogFen — play-test build v0.3.1
   • PLAYTEST_RANDOM = true  → unique board each reload
   • Guaranteed exactly five overlapping starter words
   • Dictionary & scoring unchanged
-----------------------------------------------------*/
const BOARD_SIZE = 11;

/* — DOM references — */
const boardEl   = document.getElementById('board');
const bankEl    = document.getElementById('letter-bank');
const submitBtn = document.getElementById('submit-btn');
const totalEl   = document.getElementById('total-score');
const detailBox = document.getElementById('detail-box');

/* — Data — */
const dictionary = new Set(window.dictionaryWords);   // demo list (≈3 000 words)
const letterScores = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,
                      P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
const distribution =
  "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* — Seed logic — */
const PLAYTEST_RANDOM = true;                       // set false for daily board
const seedStr = PLAYTEST_RANDOM ? Date.now().toString()
                                : new Date().toISOString().slice(0,10);

let seed = 0;
for (const ch of seedStr) seed += ch.charCodeAt(0);

function mulberry32(a){
  return ()=>{let t=a+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
}
const rand   = mulberry32(seed);
const choice = arr => arr[Math.floor(rand()*arr.length)];

/* — Build empty 11×11 board — */
const boardCells = [];
for (let r=0; r<BOARD_SIZE; r++){
  for (let c=0; c<BOARD_SIZE; c++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = r;
    cell.dataset.col = c;
    cell.ondragover = e => e.preventDefault();
    cell.ondrop = e => {
      const id = e.dataTransfer.getData('text');
      const tile = document.getElementById(id);
      if (!tile || cell.firstChild) return;
      cell.appendChild(tile);
    };
    boardEl.appendChild(cell);
    boardCells.push(cell);
  }
}

/* — Random bonus tiles — */
const bonusPlan = [
  ['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
  ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']
];
const booked = new Set();
bonusPlan.forEach(([type,mult,count,cls])=>{
  let p=0;
  while (p<count){
    const idx=Math.floor(rand()*boardCells.length);
    if(booked.has(idx)) continue;
    booked.add(idx);
    const cell=boardCells[idx];
    cell.dataset.bonusType=type;
    cell.dataset.bonusMult=mult;
    cell.classList.add(cls);
    const tag=document.createElement('span');
    tag.className='bonus';
    tag.textContent = type==='word' ? `${mult}xW` : `${mult}xL`;
    cell.appendChild(tag);
    p++;
  }
});

/* — Place exactly five starter words — */
(function placeStarterWords(){
  const MAX_TOTAL_RETRIES = 3;

  for (let pass=0; pass<MAX_TOTAL_RETRIES; pass++){
    // clear board letters
    boardCells.forEach(c => { delete c.dataset.letter; c.textContent = ''; });

    const placed=[];
    const fits = (word,r,c,d)=>{
      if(d==='h'){
        if(c+word.length>BOARD_SIZE) return false;
        for(let i=0;i<word.length;i++){
          const cell=boardCells[r*BOARD_SIZE + c+i];
          if(cell.dataset.letter && cell.dataset.letter!==word[i]) return false;
        }
      }else{
        if(r+word.length>BOARD_SIZE) return false;
        for(let i=0;i<word.length;i++){
          const cell=boardCells[(r+i)*BOARD_SIZE + c];
          if(cell.dataset.letter && cell.dataset.letter!==word[i]) return false;
        }
      }
      return true;
    };
    const draw = (word,r,c,d)=>{
      for(let i=0;i<word.length;i++){
        const cell=d==='h'? boardCells[r*BOARD_SIZE+c+i]
                          : boardCells[(r+i)*BOARD_SIZE+c];
        cell.dataset.letter = word[i];
        cell.textContent    = word[i];
      }
    };

    // first word centred horizontally
    const first = choice([...dictionary]).toUpperCase().slice(0,8);
    const row   = Math.floor(BOARD_SIZE/2);
    const col   = Math.floor((BOARD_SIZE-first.length)/2);
    draw(first,row,col,'h'); placed.push(first);

    let tries=0;
    while (placed.length<5 && tries<1000){
      const w   = choice([...dictionary]).toUpperCase().slice(0,8);
      const dir = Math.random()<0.5 ? 'h' : 'v';
      const anchor = Math.floor(rand()*w.length);
      const ch = w[anchor];

      const matches = boardCells.filter(c=>c.dataset.letter===ch);
      if(!matches.length){ tries++; continue; }

      const tgt = choice(matches);
      const sr  = dir==='h' ? +tgt.dataset.row             : +tgt.dataset.row - anchor;
      const sc  = dir==='h' ? +tgt.dataset.col - anchor    : +tgt.dataset.col;

      if (fits(w,sr,sc,dir)){ draw(w,sr,sc,dir); placed.push(w); }
      tries++;
    }
    if (placed.length===5) return;   // success!
  }
  alert("Failed to place 5 starter words after several retries.");
})();

/* — 15-tile rack — */
const rack=[];
while(rack.length<15) rack.push(choice(distribution));
rack.forEach((ltr,i)=>{
  const tile=document.createElement('div');
  tile.className='tile'; tile.id=`tile-${i}`; tile.textContent=ltr; tile.draggable=true;
  const sm=document.createElement('small'); sm.textContent=letterScores[ltr]; tile.appendChild(sm);
  tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);
  bankEl.appendChild(tile);
});

/* — Gameplay — */
let turn=0,total=0;
const activeTiles = ()=>[...boardEl.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const isStraight  = tls=>{
  const rows=tls.map(t=>+t.parentElement.dataset.row);
  const cols=tls.map(t=>+t.parentElement.dataset.col);
  return rows.every(r=>r===rows[0])||cols.every(c=>c===cols[0]);
};

submitBtn.onclick=()=>{
  if(turn>=3){alert('No turns left');return;}

  const tiles=activeTiles();
  if(!tiles.length){alert('Place tiles');return;}
  if(!isStraight(tiles)){alert('Tiles must form a straight line');return;}

  tiles.sort((a,b)=>{
    const ar=+a.parentElement.dataset.row, br=+b.parentElement.dataset.row;
    const ac=+a.parentElement.dataset.col, bc=+b.parentElement.dataset.col;
    return ar!==br ? ar-br : ac-bc;
  });
  const word=tiles.map(t=>t.textContent).join('').toLowerCase();
  if(!dictionary.has(word)){alert('INVALID WORD');return;}

  let base=0,mult=1;
  tiles.forEach(t=>{
    const cell=t.parentElement;
    let sc=letterScores[t.textContent];
    if(cell.dataset.bonusType==='letter') sc*=+cell.dataset.bonusMult;
    if(cell.dataset.bonusType==='word')   mult*=+cell.dataset.bonusMult;
    base+=sc;
  });
  const gained=Math.round(base*mult);
  total+=gained; totalEl.textContent=total;
  detailBox.textContent+=`${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${gained}\n`;
  tiles.forEach(t=>t.dataset.locked='1');

  turn++; if(turn===3) alert('Game over!  Total '+total);
};
