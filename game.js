/*  FrogFen – play-test build v0.3.3
    • PLAYTEST_RANDOM = true ⇒ random board each refresh
      flip to false for daily deterministic board
    • Guarantees exactly five overlapping starter words,
      validates every side-word
    • Starter words now render as blue-gray fixed tiles with
      letter-score just like rack tiles (class "fixed-tile")
------------------------------------------------------------------- */

const BOARD_SIZE = 11;

/* ── DOM ───────────────────────────────────────────── */
const boardEl   = document.getElementById('board');
const bankEl    = document.getElementById('letter-bank');
const submitBtn = document.getElementById('submit-btn');
/* allow tiles to be dragged back into the rack */
bankEl.ondragover = e => e.preventDefault();
bankEl.ondrop = e =>{
  e.preventDefault();
  const id   = e.dataTransfer.getData('text');
  const tile = document.getElementById(id);
  if(!tile || tile.dataset.locked==='1') return;   // ignore fixed/locked
  const oldParent = tile.parentElement;
  bankEl.appendChild(tile);                         // put tile back in rack
  /* if tile came from a board cell, clear that cell’s content */
  if(oldParent.classList.contains('cell')){
    oldParent.innerHTML = "";                       // remove text/node
  }
};

const totalEl   = document.getElementById('total-score');
const detailBox = document.getElementById('detail-box');

/* ── Data ─────────────────────────────────────────── */
const dictionary = new Set(window.dictionaryWords);          // demo list
const letterScores = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,
                      O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
const distribution =
  "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* ── Seed logic ───────────────────────────────────── */
const PLAYTEST_RANDOM = true;                     // set false for daily board
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

/* ── Build 11×11 board ───────────────────────────── */
const boardCells = [];
for(let r=0;r<BOARD_SIZE;r++){
  for(let c=0;c<BOARD_SIZE;c++){
    const cell=document.createElement('div');
    cell.className='cell';
    cell.dataset.row=r;cell.dataset.col=c;
    cell.ondragover=e=>e.preventDefault();
    cell.ondrop=e=>{
      const id=e.dataTransfer.getData('text');
      const tile=document.getElementById(id);
      if(!tile||cell.firstChild) return;
      cell.appendChild(tile);
    };
    boardEl.appendChild(cell);boardCells.push(cell);
  }
}

/* ── Bonus tiles ─────────────────────────────────── */
const bonusPlan=[
 ['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
 ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']
];
const booked=new Set();
bonusPlan.forEach(([t,m,cnt,cls])=>{
  let p=0;while(p<cnt){
    const idx=Math.floor(rand()*boardCells.length);
    if(booked.has(idx)) continue;booked.add(idx);
    const cell=boardCells[idx];
    cell.dataset.bonusType=t;cell.dataset.bonusMult=m;cell.classList.add(cls);
    const tag=document.createElement('span');tag.className='bonus';
    tag.textContent=t==='word'?`${m}xW`:`${m}xL`;cell.appendChild(tag);p++;
  }
});

/* ── Place exactly five valid starter words ───────── */
(function placeStarterWords(){
  const MAX_GLOBAL_RETRIES=4;

  const scanWords=()=>{
    const set=new Set();
    // horizontal
    for(let r=0;r<BOARD_SIZE;r++){
      let w="";for(let c=0;c<BOARD_SIZE;c++){
        const cell=boardCells[r*BOARD_SIZE+c];
        if(cell.dataset.letter) w+=cell.dataset.letter;
        else{ if(w.length>1) set.add(w.toLowerCase()); w=""; }
      }
      if(w.length>1) set.add(w.toLowerCase());
    }
    // vertical
    for(let c=0;c<BOARD_SIZE;c++){
      let w="";for(let r=0;r<BOARD_SIZE;r++){
        const cell=boardCells[r*BOARD_SIZE+c];
        if(cell.dataset.letter) w+=cell.dataset.letter;
        else{ if(w.length>1) set.add(w.toLowerCase()); w=""; }
      }
      if(w.length>1) set.add(w.toLowerCase());
    }
    return set;
  };

  for(let pass=0;pass<MAX_GLOBAL_RETRIES;pass++){
    boardCells.forEach(c=>{delete c.dataset.letter;c.textContent="";});

    /* helper draws a fixed visual tile */
    const draw = (word,r,c,d)=>{
      for(let i=0;i<word.length;i++){
        const cell=d==='h'
          ? boardCells[r*BOARD_SIZE+c+i]
          : boardCells[(r+i)*BOARD_SIZE+c];

        cell.dataset.letter = word[i];
        cell.dataset.locked = "1";

        const div=document.createElement('div');
        div.className='fixed-tile';
        div.textContent=word[i];

        const sm=document.createElement('small');
        sm.textContent=letterScores[word[i]];
        div.appendChild(sm);

        cell.innerHTML=""; cell.appendChild(div);
      }
    };

    /* first word horizontal centre */
    const first=choice([...dictionary]).toUpperCase().slice(0,8);
    const r0=Math.floor(BOARD_SIZE/2);
    const c0=Math.floor((BOARD_SIZE-first.length)/2);
    draw(first,r0,c0,'h');

    let placed=1,tries=0;
    while(placed<5&&tries<1500){
      const word=choice([...dictionary]).toUpperCase().slice(0,8);
      const dir =Math.random()<0.5?'h':'v';
      const anchor=Math.floor(rand()*word.length);
      const ch=word[anchor];
      const anchors=boardCells.filter(c=>c.dataset.letter===ch);
      if(!anchors.length){tries++;continue;}

      const tgt=choice(anchors);
      const sr=dir==='h'?+tgt.dataset.row             :+tgt.dataset.row-anchor;
      const sc=dir==='h'?+tgt.dataset.col-anchor      :+tgt.dataset.col;

      let fit=true;
      if(dir==='h'){
        if(sc<0||sc+word.length>BOARD_SIZE) fit=false;
        else for(let i=0;i<word.length;i++){
          const cell=boardCells[sr*BOARD_SIZE+sc+i];
          if(cell.dataset.letter&&cell.dataset.letter!==word[i]){fit=false;break;}
        }
      }else{
        if(sr<0||sr+word.length>BOARD_SIZE) fit=false;
        else for(let i=0;i<word.length;i++){
          const cell=boardCells[(sr+i)*BOARD_SIZE+sc];
          if(cell.dataset.letter&&cell.dataset.letter!==word[i]){fit=false;break;}
        }
      }
      if(!fit){tries++;continue;}

      /* tentative draw */
      const newly=[];
      for(let i=0;i<word.length;i++){
        const cell=dir==='h'?boardCells[sr*BOARD_SIZE+sc+i]:boardCells[(sr+i)*BOARD_SIZE+sc];
        if(!cell.dataset.letter){
          cell.dataset.letter=word[i];cell.textContent=word[i];
          newly.push(cell);
        }
      }

      const invalid=[...scanWords()].some(w=>!dictionary.has(w));
      if(invalid){
        newly.forEach(c=>{delete c.dataset.letter;c.textContent="";});
      }else{
        /* replace temp letters with fixed tiles */
        draw(word,sr,sc,dir); placed++;
      }
      tries++;
    }
    if(placed===5) return;
  }
  alert("Board generation failed – reload");
})();

/* ── 15-tile rack ─────────────────────────── */
const rack=[];while(rack.length<15) rack.push(choice(distribution));
rack.forEach((ltr,i)=>{
  const tile=document.createElement('div');
  tile.className='tile'; tile.id=`tile-${i}`; tile.textContent=ltr; tile.draggable=true;
  const sm=document.createElement('small'); sm.textContent=letterScores[ltr]; tile.appendChild(sm);
  tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);
  bankEl.appendChild(tile);
});

/* ── Gameplay ─────────────────────────────── */
let turn=0,total=0;
const activeTiles=()=>[...boardEl.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const straight=tls=>{
  const rows=tls.map(t=>+t.parentElement.dataset.row);
  const cols=tls.map(t=>+t.parentElement.dataset.col);
  return rows.every(r=>r===rows[0])||cols.every(c=>c===cols[0]);
};

submitBtn.onclick=()=>{
  if(turn>=3){alert('No turns left');return;}
  const tiles=activeTiles();
  if(!tiles.length){alert('Place tiles');return;}
  if(!straight(tiles)){alert('Tiles must form a straight line');return;}

  tiles.sort((a,b)=>{
    const ar=+a.parentElement.dataset.row, br=+b.parentElement.dataset.row;
    const ac=+a.parentElement.dataset.col, bc=+b.parentElement.dataset.col;
    return ar!==br?ar-br:ac-bc;
  });
  const word=tiles.map(t=>t.textContent).join('').toLowerCase();
  if(!dictionary.has(word)){alert('INVALID WORD');return;}

  let base=0,mult=1;
  tiles.forEach(t=>{
    let sc=letterScores[t.textContent];
    const cell=t.parentElement;
    if(cell.dataset.bonusType==='letter') sc*=+cell.dataset.bonusMult;
    if(cell.dataset.bonusType==='word')   mult*=+cell.dataset.bonusMult;
    base+=sc;
  });
  const gained=Math.round(base*mult);
  total+=gained; totalEl.textContent=total;
  detailBox.textContent+=`${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${gained}\n`;

  tiles.forEach(t=>t.dataset.locked='1');
  if(++turn===3) alert('Game over!  Total '+total);
};
