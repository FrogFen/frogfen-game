/*  FrogFen – play-test build v0.4.0 (full file)
    ───────────────────────────────────────────────
    • Board + rack generated on load
    • Drag tiles onto board and back to rack
    • Five fixed starter words (blue tiles)
    • Bonus squares for letter/word multipliers
    • Submit validates primary & cross-words, scores correctly
    • dataset.letter ALWAYS holds only the single uppercase letter
    • Console logs show every word examined
-------------------------------------------------------------------------- */

/* ========== 1. DOM refs ========== */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* ========== 2. Constants ========== */
const BOARD   = 11;
const dict    = new Set(window.dictionaryWords);        // lower-case list

const score = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,
               O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

const bag = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTT"+
            "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* simple seeded RNG so every refresh (while PLAYTEST_RANDOM) is unique */
const PLAYTEST_RANDOM = true;
const seedStr = PLAYTEST_RANDOM ? Date.now().toString()
                                : new Date().toISOString().slice(0,10);
let seed = 0; for (const ch of seedStr) seed += ch.charCodeAt(0);
function RNG(a){return()=>{let t=a+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);
t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const rand = RNG(seed);
const pick = s => s[Math.floor(rand()*s.length)];

/* ========== 3. Board grid ========== */
const cells=[];
for(let r=0;r<BOARD;r++){
  for(let c=0;c<BOARD;c++){
    const cell=document.createElement('div');
    cell.className='cell'; cell.dataset.row=r; cell.dataset.col=c;

    cell.ondragover=e=>e.preventDefault();
    cell.ondrop=e=>{
      const id=e.dataTransfer.getData('text');
      const tile=document.getElementById(id);
      if(!tile||tile.dataset.locked==='1'||cell.firstChild) return;

      tile._prevCell = tile.parentElement.classList.contains('cell')
                     ? tile.parentElement : null;

      cell.appendChild(tile);
      cell.dataset.letter = tile.dataset.letter;     // **clean letter only**
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
  let n=0;
  while(n<count){
    const idx=Math.floor(rand()*cells.length);
    if(used.has(idx)) continue;
    used.add(idx);
    const cell=cells[idx];
    cell.dataset.bonusType=type; cell.dataset.bonusMult=mult;
    cell.classList.add(cls);
    const tag=document.createElement('span');
    tag.className='bonus'; tag.textContent=type==='word'?`${mult}xW`:`${mult}xL`;
    cell.appendChild(tag); n++;
  }
});

/* ========== 5. Starter words (5) ========== */
(function makeStarters(){
  const scan=()=>{
    const out=new Set();
    // horiz
    for(let r=0;r<BOARD;r++){
      let w=''; for(let c=0;c<BOARD;c++){
        const ch=cells[r*BOARD+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) out.add(w.toLowerCase());
    }
    // vert
    for(let c=0;c<BOARD;c++){
      let w=''; for(let r=0;r<BOARD;r++){
        const ch=cells[r*BOARD+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) out.add(w.toLowerCase());
    }
    return out;
  };

  const drawFixed = (word,r,c,dir)=>{
    for(let i=0;i<word.length;i++){
      const cell = dir==='h' ? cells[r*BOARD+c+i] : cells[(r+i)*BOARD+c];
      cell.dataset.letter = word[i];
      cell.dataset.locked = '1';
      const div=document.createElement('div');
      div.className='fixed-tile';
      div.textContent=word[i];
      div.dataset.letter = word[i];              // clean letter
      const sm=document.createElement('small');
      sm.textContent = score[word[i]];
      div.appendChild(sm);
      cell.innerHTML=''; cell.appendChild(div);
    }
  };

  let placed=0, attempts=0;
  const centerR=Math.floor(BOARD/2);
  while(placed<5 && attempts<1000){
    if(placed===0){
      const word=pick([...dict]).toUpperCase().slice(0,8);
      drawFixed(word,centerR,Math.floor((BOARD-word.length)/2),'h');
      placed++; attempts++; continue;
    }
    const word=pick([...dict]).toUpperCase().slice(0,8);
    const dir=Math.random()<0.5?'h':'v';
    const anchor=Math.floor(rand()*word.length);
    const ch=word[anchor];
    const anchors=cells.filter(c=>c.dataset.letter===ch);
    if(!anchors.length){attempts++;continue;}
    const tgt=pick(anchors);
    const sr=dir==='h'?+tgt.dataset.row:+tgt.dataset.row-anchor;
    const sc=dir==='h'?+tgt.dataset.col-anchor:+tgt.dataset.col;
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

    const temp=[];
    for(let i=0;i<word.length;i++){
      const cell=dir==='h'?cells[sr*BOARD+sc+i]:cells[(sr+i)*BOARD+sc];
      if(!cell.dataset.letter){cell.dataset.letter=word[i]; temp.push(cell);}
    }
    if([...scan()].some(w=>!dict.has(w))){temp.forEach(c=>delete c.dataset.letter);}
    else{ drawFixed(word,sr,sc,dir); placed++; }
    attempts++;
  }
})();

/* ========== 6. Rack tiles ========== */
for(let i=0;i<15;i++){
  const ltr=pick(bag);
  const tile=document.createElement('div');
  tile.className='tile'; tile.id=`tile-${i}`;
  tile.textContent=ltr; tile.dataset.letter=ltr; tile.draggable=true;
  const sm=document.createElement('small'); sm.textContent=score[ltr];
  tile.appendChild(sm);

  tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);
  tile.ondragover=e=>e.preventDefault();
  tile.ondrop=e=>{
    const id=e.dataTransfer.getData('text');
    const drg=document.getElementById(id);
    if(!drg||drg.dataset.locked==='1') return;
    rackBox.appendChild(drg);
    const src=drg._prevCell;
    if(src){delete src.dataset.letter;delete src.dataset.locked;
           src.innerHTML='';drg._prevCell=null;}
  };
  rackBox.appendChild(tile);
}

/* ========== 7. Submit logic ========== */
const active=()=>[...board.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const inline=ts=>{
  const rs=ts.map(t=>+t.parentElement.dataset.row);
  const cs=ts.map(t=>+t.parentElement.dataset.col);
  return rs.every(r=>r===rs[0])||cs.every(c=>c===cs[0]);
};
const collect=(r,c,dr,dc)=>{
  const out=[];
  while(r>=0&&r<BOARD&&c>=0&&c<BOARD&&cells[r*BOARD+c].dataset.letter){
    out.push(cells[r*BOARD+c]); r+=dr; c+=dc;
  }
  return out;
};

let turn=0, total=0;

submit.onclick=()=>{
  if(turn>=3){alert('No turns left');return;}
  const ntiles=active();
  if(!ntiles.length){alert('Place tiles');return;}
  if(!inline(ntiles)){alert('Tiles must form a straight line');return;}

  const rs=ntiles.map(t=>+t.parentElement.dataset.row);
  const cs=ntiles.map(t=>+t.parentElement.dataset.col);
  const horiz=rs.every(r=>r===rs[0]);

  /* primary word */
  let mainCells;
  if(horiz){
    const r=rs[0], minC=Math.min(...cs);
    mainCells=collect(r,minC,0,-1).reverse().concat(collect(r,minC+1,0,+1));
  }else{
    const c=cs[0], minR=Math.min(...rs);
    mainCells=collect(minR,c,-1,0).reverse().concat(collect(minR+1,c,+1,0));
  }
  const mainWord=mainCells.map(c=>c.dataset.letter).join('').toLowerCase();
  console.log('Primary word:', mainWord.toUpperCase());
  if(!dict.has(mainWord)){
    console.log('REJECT →', mainWord.toUpperCase(),'not in dictionary');
    alert(`INVALID WORD: ${mainWord.toUpperCase()} not in dictionary`);return;
  }

  const words=[{cells:mainCells,word:mainWord}];

  /* cross-words */
  for(const t of ntiles){
    const r=+t.parentElement.dataset.row;
    const c=+t.parentElement.dataset.col;
    const perp=horiz
      ? collect(r,c,-1,0).reverse().concat(collect(r+1,c,+1,0))
      : collect(r,c,0,-1).reverse().concat(collect(r,c+1,0,+1));
    if(perp.length>1){
      const w=perp.map(cell=>cell.dataset.letter).join('').toLowerCase();
      console.log('Cross-word found:',w.toUpperCase());
      if(!dict.has(w)){
        console.log('REJECT →',w.toUpperCase(),'not in dictionary');
        alert(`INVALID WORD: ${w.toUpperCase()} not in dictionary`);return;
      }
      if(w!==mainWord) words.push({cells:perp,word:w});
    }
  }

  /* scoring */
  let gained=0;
  for(const {cells:wc,word} of words){
    let base=0, mult=1;
    wc.forEach(cell=>{
      let pts=score[cell.dataset.letter];
      const newTile=!cell.dataset.locked;
      if(newTile&&cell.dataset.bonusType==='letter')
        pts*=+cell.dataset.bonusMult;
      if(newTile&&cell.dataset.bonusType==='word')
        mult*=+cell.dataset.bonusMult;
      base+=pts;
    });
    const pts=Math.round(base*mult);
    gained+=pts;
    detail.textContent += `${word.toUpperCase()}: ${base}`
                         + ` × ${mult.toFixed(2)} = ${pts}\n`;
  }

  total+=gained; totalEl.textContent=total;
  ntiles.forEach(t=>t.dataset.locked='1');
  if(++turn===3) alert('Game over!  Total '+total);
};
