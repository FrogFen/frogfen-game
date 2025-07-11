/*  FrogFen – play-test build v0.4.1  (full file)
    ───────────────────────────────────────────────
    • Tiles drop on bonus squares; rack drag-back works
    • Words must attach to existing locked tiles
    • dataset.letter always holds only the uppercase letter
    • Bonuses applied only to tiles placed this turn
-------------------------------------------------------------------------- */

/* ========== 1. DOM refs ========== */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* ========== 2. Data ========== */
const BOARD = 11;
const dict  = new Set(window.dictionaryWords);          // lower-case list

const pts = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
             N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

const bag = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTT"+
            "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* Seeded RNG so each refresh (play-test mode) gives a new board */
const PLAYTEST_RANDOM = true;
const seedStr = PLAYTEST_RANDOM ? Date.now().toString()
                                : new Date().toISOString().slice(0,10);
let seed = 0; for (const ch of seedStr) seed += ch.charCodeAt(0);
function RNG(a){return()=>{let t=a+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);
t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const rand = RNG(seed);
const pick = s => s[Math.floor(rand()*s.length)];

/* ========== 3. Build empty grid ========== */
const cells=[];
for(let r=0;r<BOARD;r++){
  for(let c=0;c<BOARD;c++){
    const cell=document.createElement('div');
    cell.className='cell';
    cell.dataset.row=r; cell.dataset.col=c;

    cell.ondragover=e=>e.preventDefault();
    cell.ondrop=e=>{
      const id=e.dataTransfer.getData('text');
      const tile=document.getElementById(id);
      if(!tile||tile.dataset.locked==='1'||cell.querySelector('.tile')) return;

      tile._prevCell = tile.parentElement.classList.contains('cell')
                     ? tile.parentElement : null;

      cell.appendChild(tile);
      cell.dataset.letter = tile.dataset.letter;   // clean letter only
    };

    board.appendChild(cell); cells.push(cell);
  }
}

/* ========== 4. Bonus squares ========== */
const bonuses=[
 ['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
 ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']
];
const used=new Set();
bonuses.forEach(([type,mult,count,cls])=>{
  let n=0; while(n<count){
    const idx=Math.floor(rand()*cells.length);
    if(used.has(idx)) continue;
    used.add(idx);
    const cell=cells[idx];
    cell.dataset.bonusType=type; cell.dataset.bonusMult=mult;
    cell.classList.add(cls);
    const tag=document.createElement('span');
    tag.className='bonus';
    tag.textContent=type==='word'?`${mult}xW`:`${mult}xL`;
    cell.appendChild(tag); n++;
  }
});

/* ========== 5. Starter words (5) ========== */
(function makeStarters(){
  /* collect all board words */
  const scan=()=>{
    const out=new Set();
    for(let r=0;r<BOARD;r++){
      let w=''; for(let c=0;c<BOARD;c++){
        const ch=cells[r*BOARD+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) out.add(w.toLowerCase());
    }
    for(let c=0;c<BOARD;c++){
      let w=''; for(let r=0;r<BOARD;r++){
        const ch=cells[r*BOARD+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) out.add(w.toLowerCase());
    }
    return out;
  };

  /* draw fixed word */
  const drawFixed=(word,r,c,dir)=>{
    for(let i=0;i<word.length;i++){
      const cell=dir==='h'?cells[r*BOARD+c+i]:cells[(r+i)*BOARD+c];
      cell.dataset.letter=word[i]; cell.dataset.locked='1';
      const div=document.createElement('div');
      div.className='fixed-tile'; div.textContent=word[i];
      div.dataset.letter=word[i];
      const sm=document.createElement('small');
      sm.textContent=pts[word[i]];
      div.appendChild(sm);
      cell.innerHTML=''; cell.appendChild(div);
    }
  };

  let placed=0, attempts=0, centerR=Math.floor(BOARD/2);
  while(placed<5 && attempts<1200){
    if(placed===0){
      const w=pick([...dict]).toUpperCase().slice(0,8);
      drawFixed(w,centerR,Math.floor((BOARD-w.length)/2),'h');
      placed++; attempts++; continue;
    }
    const word=pick([...dict]).toUpperCase().slice(0,8);
    const dir=Math.random()<0.5?'h':'v';
    const a=Math.floor(rand()*word.length);
    const anchors=cells.filter(c=>c.dataset.letter===word[a]);
    if(!anchors.length){attempts++;continue;}
    const tgt=pick(anchors);
    const sr=dir==='h'?+tgt.dataset.row:+tgt.dataset.row-a;
    const sc=dir==='h'?+tgt.dataset.col-a:+tgt.dataset.col;
    let fits=true;
    if(dir==='h'){
      if(sc<0||sc+word.length>BOARD) fits=false;
      else for(let i=0;i<word.length;i++){
        const cell=cells[sr*BOARD+sc+i];
        if(cell.dataset.letter && cell.dataset.letter!==word[i]){fits=false;break;}
      }
    }else{
      if(sr<0||sr+word.length>BOARD) fits=false;
      else for(let i=0;i<word.length;i++){
        const cell=cells[(sr+i)*BOARD+sc];
        if(cell.dataset.letter && cell.dataset.letter!==word[i]){fits=false;break;}
      }
    }
    if(!fits){attempts++;continue;}

    const temps=[];
    for(let i=0;i<word.length;i++){
      const cell=dir==='h'?cells[sr*BOARD+sc+i]:cells[(sr+i)*BOARD+sc];
      if(!cell.dataset.letter){cell.dataset.letter=word[i]; temps.push(cell);}
    }
    if([...scan()].some(w=>!dict.has(w)))
      temps.forEach(c=>delete c.dataset.letter);
    else{drawFixed(word,sr,sc,dir); placed++;}
    attempts++;
  }
})();

/* ========== 6. Rack tiles (15) ========== */
for(let i=0;i<15;i++){
  const l=pick(bag);
  const tile=document.createElement('div');
  tile.className='tile'; tile.id=`tile-${i}`;
  tile.textContent=l; tile.dataset.letter=l; tile.draggable=true;
  const sm=document.createElement('small'); sm.textContent=pts[l];
  tile.appendChild(sm);

  tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);
  tile.ondragover = e => e.preventDefault();
  tile.ondrop = e => {          // swap tiles inside rack
    const id=e.dataTransfer.getData('text');
    const drg=document.getElementById(id);
    if(!drg||drg.dataset.locked==='1'||drg===tile) return;
    rackBox.insertBefore(drg,tile);
    const src=drg._prevCell;
    if(src){delete src.dataset.letter;delete src.dataset.locked;
           src.innerHTML='';drg._prevCell=null;}
  };

  rackBox.appendChild(tile);
}

/* rack box drop target */
rackBox.ondragover=e=>e.preventDefault();
rackBox.ondrop=e=>{
  const id=e.dataTransfer.getData('text');
  const tile=document.getElementById(id);
  if(!tile||tile.dataset.locked==='1') return;
  rackBox.appendChild(tile);
  const src=tile._prevCell;
  if(src){delete src.dataset.letter;delete src.dataset.locked;
         src.innerHTML='';tile._prevCell=null;}
};

/* ========== 7. Helpers ========== */
const active   = () => [...board.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const inline   = ts => {
  const r=ts.map(t=>+t.parentElement.dataset.row),
        c=ts.map(t=>+t.parentElement.dataset.col);
  return r.every(v=>v===r[0])||c.every(v=>v===c[0]);
};
const collect  = (r,c,dr,dc)=>{
  const arr=[];
  while(r>=0&&r<BOARD&&c>=0&&c<BOARD&&cells[r*BOARD+c].dataset.letter){
    arr.push(cells[r*BOARD+c]); r+=dr; c+=dc;
  }
  return arr;
};

/* ========== 8. Submit / scoring ========== */
let turn=0,total=0;

submit.onclick=()=>{
  if(turn>=3){alert('No turns left');return;}
  const nt=active();
  if(!nt.length){alert('Place tiles');return;}
  if(!inline(nt)){alert('Tiles must form a straight line');return;}

  /* must touch locked tile */
  if(!nt.some(t=>{
    const r=+t.parentElement.dataset.row,
          c=+t.parentElement.dataset.col;
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([rr,cc])=>
      rr>=0&&rr<BOARD&&cc>=0&&cc<BOARD&&cells[rr*BOARD+cc].dataset.locked==='1');
  })){alert('Tiles must connect to an existing word');return;}

  const horiz = nt.every(t=>+t.parentElement.dataset.row===+nt[0].parentElement.dataset.row);

  /* main word */
  let mainCells;
  if(horiz){
    const r=+nt[0].parentElement.dataset.row,
          minC=Math.min(...nt.map(t=>+t.parentElement.dataset.col));
    mainCells=collect(r,minC,0,-1).reverse().concat(collect(r,minC+1,0,1));
  }else{
    const c=+nt[0].parentElement.dataset.col,
          minR=Math.min(...nt.map(t=>+t.parentElement.dataset.row));
    mainCells=collect(minR,c,-1,0).reverse().concat(collect(minR+1,c,1,0));
  }
  const mainWord=mainCells.map(c=>c.dataset.letter).join('').toLowerCase();
  if(!dict.has(mainWord)){alert(`INVALID WORD: ${mainWord.toUpperCase()}`);return;}

  const words=[{cells:mainCells,word:mainWord}];

  /* cross words */
  for(const t of nt){
    const r=+t.parentElement.dataset.row,
          c=+t.parentElement.dataset.col;
    const cross = horiz
      ? collect(r,c,-1,0).reverse().concat(collect(r+1,c,1,0))
      : collect(r,c,0,-1).reverse().concat(collect(r,c+1,0,1));
    if(cross.length>1){
      const w=cross.map(x=>x.dataset.letter).join('').toLowerCase();
      if(!dict.has(w)){alert(`INVALID WORD: ${w.toUpperCase()}`);return;}
      if(w!==mainWord) words.push({cells:cross,word:w});
    }
  }

  /* scoring */
  let gained=0;
  for(const {cells:wc,word} of words){
    let base=0,mult=1;
    wc.forEach(cell=>{
      let p=pts[cell.dataset.letter];
      const fresh=!cell.dataset.locked;
      if(fresh&&cell.dataset.bonusType==='letter') p*=+cell.dataset.bonusMult;
      if(fresh&&cell.dataset.bonusType==='word')   mult*=+cell.dataset.bonusMult;
      base+=p;
    });
    const subtotal=Math.round(base*mult);
    gained+=subtotal;
    detail.textContent+=`${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${subtotal}\n`;
  }

  total+=gained; totalEl.textContent=total;
  nt.forEach(t => {
  t.dataset.locked = '1';
  t.parentElement.dataset.locked = '1';   // ← new: mark the CELL too
});

