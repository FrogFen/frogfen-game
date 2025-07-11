/*  FrogFen – play-test build v0.4.2
    ─────────────────────────────────────────────────────────────
    • Bonus drop, rack swap, attachment, scoring, clean letters
    • Clears previous cell when a tile is moved (fixes “GINN” bug)
--------------------------------------------------------------------*/

/* === 1. DOM references === */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* === 2. Static data === */
const SIZE = 11;
const dict = new Set(window.dictionaryWords);       // provided lowercase list

const points = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
                N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

const bag = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTT"+
            "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* simple seeded RNG so every refresh differs while play-testing */
const SEED = Date.now();
let s = SEED;
function rng(){s = Math.imul(16807, s) & 0xffffffff; return (s>>>0)/2**32;}
const pick = str => str[Math.floor(rng()*str.length)];

/* === 3. Build empty grid === */
const cells = [];
for (let r=0;r<SIZE;r++){
  for (let c=0;c<SIZE;c++){
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = r; cell.dataset.col = c;

    cell.ondragover = e => e.preventDefault();

    cell.ondrop = e => {
      const id   = e.dataTransfer.getData('text');
      const tile = document.getElementById(id);
      if (!tile || tile.dataset.locked==='1' || cell.querySelector('.tile')) return;

      /* clear previous cell if moving from another board cell */
      if (tile._prevCell && tile._prevCell !== cell){
        delete tile._prevCell.dataset.letter;
        delete tile._prevCell.dataset.locked;
        tile._prevCell.innerHTML = tile._prevCell.querySelector('.bonus')?.outerHTML || '';
      }

      cell.appendChild(tile);
      cell.dataset.letter = tile.dataset.letter;   // store clean letter
      tile._prevCell = cell;
    };

    board.appendChild(cell);
    cells.push(cell);
  }
}

/* === 4. Bonus squares === */
const bonusCfg = [
  ['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
  ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']
];
const taken = new Set();
bonusCfg.forEach(([type,mult,count,cls])=>{
  let n=0;
  while(n<count){
    const idx = Math.floor(rng()*cells.length);
    if (taken.has(idx)) continue;
    taken.add(idx);
    const cell = cells[idx];
    cell.dataset.bonusType = type;
    cell.dataset.bonusMult = mult;
    cell.classList.add(cls);
    const tag = document.createElement('span');
    tag.className='bonus';
    tag.textContent = type==='word'?`${mult}xW`:`${mult}xL`;
    cell.appendChild(tag);
    n++;
  }
});

/* === 5. Starter words (5) === */
(function placeStarters(){
  const scanWords = () => {
    const out = new Set();
    /* horiz */
    for (let r=0;r<SIZE;r++){
      let w=''; for (let c=0;c<SIZE;c++){
        const ch = cells[r*SIZE+c].dataset.letter;
        if (ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if (w.length>1) out.add(w.toLowerCase());
    }
    /* vert */
    for (let c=0;c<SIZE;c++){
      let w=''; for (let r=0;r<SIZE;r++){
        const ch = cells[r*SIZE+c].dataset.letter;
        if (ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if (w.length>1) out.add(w.toLowerCase());
    }
    return out;
  };

  const drawFixed = (word,r,c,dir) => {
    for (let i=0;i<word.length;i++){
      const cell = dir==='h'?cells[r*SIZE+c+i]:cells[(r+i)*SIZE+c];
      cell.dataset.letter = word[i];
      cell.dataset.locked = '1';
      const div=document.createElement('div');
      div.className='fixed-tile'; div.textContent=word[i];
      div.dataset.letter = word[i];
      const sm=document.createElement('small'); sm.textContent=points[word[i]];
      div.appendChild(sm);
      cell.innerHTML=''; cell.appendChild(div);
    }
  };

  let placed=0, tries=0, center=Math.floor(SIZE/2);
  while(placed<5 && tries<1200){
    if (placed===0){
      const w = pick([...dict]).toUpperCase().slice(0,8);
      drawFixed(w,center,Math.floor((SIZE-w.length)/2),'h');
      placed++; tries++; continue;
    }
    const word=pick([...dict]).toUpperCase().slice(0,8);
    const dir = rng()<0.5?'h':'v';
    const anchor = Math.floor(rng()*word.length);
    const refs = cells.filter(c=>c.dataset.letter===word[anchor]);
    if(!refs.length){tries++;continue;}
    const base = refs[Math.floor(rng()*refs.length)];
    const sr = dir==='h'?+base.dataset.row:+base.dataset.row-anchor;
    const sc = dir==='h'?+base.dataset.col-anchor:+base.dataset.col;
    let fits=true;
    if(dir==='h'){
      if(sc<0||sc+word.length>SIZE) fits=false;
      else for(let i=0;i<word.length;i++){
        const cell=cells[sr*SIZE+sc+i];
        if(cell.dataset.letter && cell.dataset.letter!==word[i]){fits=false;break;}
      }
    }else{
      if(sr<0||sr+word.length>SIZE) fits=false;
      else for(let i=0;i<word.length;i++){
        const cell=cells[(sr+i)*SIZE+sc];
        if(cell.dataset.letter && cell.dataset.letter!==word[i]){fits=false;break;}
      }
    }
    if(!fits){tries++;continue;}

    const temps=[];
    for(let i=0;i<word.length;i++){
      const cell = dir==='h'?cells[sr*SIZE+sc+i]:cells[(sr+i)*SIZE+sc];
      if(!cell.dataset.letter){cell.dataset.letter=word[i]; temps.push(cell);}
    }
    if([...scanWords()].some(w=>!dict.has(w)))
      temps.forEach(c=>delete c.dataset.letter);
    else{drawFixed(word,sr,sc,dir); placed++;}
    tries++;
  }
})();

/* === 6. Build rack tiles === */
for(let i=0;i<15;i++){
  const L = pick(bag);
  const tile=document.createElement('div');
  tile.className='tile'; tile.id=`tile-${i}`;
  tile.textContent=L; tile.dataset.letter=L; tile.draggable=true;
  const sm=document.createElement('small'); sm.textContent=points[L];
  tile.appendChild(sm);

  tile.ondragstart = e => e.dataTransfer.setData('text',tile.id);

  /* allow swapping tiles in rack */
  tile.ondragover = e => e.preventDefault();
  tile.ondrop = e => {
    const id=e.dataTransfer.getData('text');
    const drag=document.getElementById(id);
    if(!drag||drag.dataset.locked==='1'||drag===tile) return;
    rackBox.insertBefore(drag,tile);
    if(drag._prevCell){
      delete drag._prevCell.dataset.letter;
      delete drag._prevCell.dataset.locked;
      drag._prevCell.innerHTML = drag._prevCell.querySelector('.bonus')?.outerHTML || '';
      drag._prevCell=null;
    }
  };
  rackBox.appendChild(tile);
}

/* rack as drop target */
rackBox.ondragover = e=>e.preventDefault();
rackBox.ondrop = e=>{
  const id=e.dataTransfer.getData('text');
  const tile=document.getElementById(id);
  if(!tile||tile.dataset.locked==='1') return;
  rackBox.appendChild(tile);
  if(tile._prevCell){
    delete tile._prevCell.dataset.letter;
    delete tile._prevCell.dataset.locked;
    tile._prevCell.innerHTML = tile._prevCell.querySelector('.bonus')?.outerHTML || '';
    tile._prevCell=null;
  }
};

/* === 7. Helper functions === */
const activeTiles = () => [...board.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const sameLine = ts => {
  const rs=ts.map(t=>+t.parentElement.dataset.row),
        cs=ts.map(t=>+t.parentElement.dataset.col);
  return rs.every(r=>r===rs[0])||cs.every(c=>c===cs[0]);
};
const collect = (r,c,dr,dc)=>{
  const arr=[];
  while(r>=0&&r<SIZE&&c>=0&&c<SIZE&&cells[r*SIZE+c].dataset.letter){
    arr.push(cells[r*SIZE+c]); r+=dr; c+=dc;
  }
  return arr;
};

/* === 8. Submit / scoring === */
let turn=0,total=0;

submit.onclick = () => {
  if(turn>=3){alert('No turns left');return;}
  const nt = activeTiles();
  if(!nt.length){alert('Place tiles');return;}
  if(!sameLine(nt)){alert('Tiles must form a straight line');return;}

  /* must touch locked tile (after first turn) */
  if(turn>0 && !nt.some(t=>{
    const r=+t.parentElement.dataset.row,
          c=+t.parentElement.dataset.col;
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([rr,cc])=>
      rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&cells[rr*SIZE+cc].dataset.locked==='1');
  })){alert('Tiles must connect to an existing word');return;}

  const horiz = nt.every(t=>+t.parentElement.dataset.row===+nt[0].parentElement.dataset.row);

  /* primary word */
  let mainCells;
  if(horiz){
    const r=+nt[0].parentElement.dataset.row,
          minC=Math.min(...nt.map(t=>+t.parentElement.dataset.col));
    mainCells = collect(r,minC,0,-1).reverse().concat(collect(r,minC+1,0,1));
  }else{
    const c=+nt[0].parentElement.dataset.col,
          minR=Math.min(...nt.map(t=>+t.parentElement.dataset.row));
    mainCells = collect(minR,c,-1,0).reverse().concat(collect(minR+1,c,1,0));
  }
  const mainWord = mainCells.map(c=>c.dataset.letter).join('').toLowerCase();
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
      let p=points[cell.dataset.letter];
      const fresh=!cell.dataset.locked;
      if(fresh&&cell.dataset.bonusType==='letter') p*=+cell.dataset.bonusMult;
      if(fresh&&cell.dataset.bonusType==='word')   mult*=+cell.dataset.bonusMult;
      base+=p;
    });
    const subtotal=Math.round(base*mult);
    gained+=subtotal;
    detail.textContent += `${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${subtotal}\n`;
  }

  total += gained; totalEl.textContent = total;
  nt.forEach(t=>{
    t.dataset.locked='1';
    t.parentElement.dataset.locked='1';
  });

  if(++turn===3) alert('Game over!  Total '+total);
};
