/*  FrogFen – play-test build v0.4.3  (complete file)
    ─────────────────────────────────────────────────────────
    • Tiles drop on bonus squares, rack swap, ghost-letter fix
    • Tiles must connect to locked tiles after turn 1
    • Single-tile plays accepted only if they form cross-words
-------------------------------------------------------------------- */

/* === 1. DOM refs === */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* === 2. Data === */
const SIZE = 11;
const dict = new Set(window.dictionaryWords);        // lowercase list from dictionary.js

const pts = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
             N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

const bag = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTT"+
            "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* simple seeded RNG so every refresh differs while play-testing */
let seed = Date.now();
function rng() { seed = Math.imul(16807, seed) & 0xffffffff; return (seed>>>0)/2**32; }
const pick = str => str[Math.floor(rng()*str.length)];

/* === 3. Build empty grid === */
const cells=[];
for(let r=0;r<SIZE;r++){
  for(let c=0;c<SIZE;c++){
    const cell=document.createElement('div');
    cell.className='cell';
    cell.dataset.row=r; cell.dataset.col=c;

    cell.ondragover=e=>e.preventDefault();
    cell.ondrop=e=>{
      const id=e.dataTransfer.getData('text');
      const tile=document.getElementById(id);
      if(!tile||tile.dataset.locked==='1'||cell.querySelector('.tile')) return;

      /* clear previous cell if tile came from board */
      if(tile._prevCell && tile._prevCell!==cell){
        delete tile._prevCell.dataset.letter;
        delete tile._prevCell.dataset.locked;
        /* restore bonus text if cell had one */
        tile._prevCell.innerHTML =
          tile._prevCell.querySelector('.bonus')?.outerHTML || '';
      }
      cell.appendChild(tile);
      cell.dataset.letter = tile.dataset.letter;      // clean letter
      tile._prevCell = cell;
    };
    board.appendChild(cell); cells.push(cell);
  }
}

/* === 4. Bonus squares === */
const bonusCfg = [
  ['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
  ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']
];
const used=new Set();
bonusCfg.forEach(([type,mult,count,cls])=>{
  let n=0; while(n<count){
    const idx=Math.floor(rng()*cells.length);
    if(used.has(idx)) continue;
    used.add(idx);
    const cell=cells[idx];
    cell.dataset.bonusType=type;
    cell.dataset.bonusMult=mult;
    cell.classList.add(cls);
    const tag=document.createElement('span');
    tag.className='bonus';
    tag.textContent=type==='word'?`${mult}xW`:`${mult}xL`;
    cell.appendChild(tag);
    n++;
  }
});

/* === 5. Place 5 starter words === */
(function starters(){
  const scan=()=>{
    const out=new Set();
    /* horiz */
    for(let r=0;r<SIZE;r++){
      let w=''; for(let c=0;c<SIZE;c++){
        const ch=cells[r*SIZE+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) out.add(w.toLowerCase());
    }
    /* vert */
    for(let c=0;c<SIZE;c++){
      let w=''; for(let r=0;r<SIZE;r++){
        const ch=cells[r*SIZE+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) out.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) out.add(w.toLowerCase());
    }
    return out;
  };

  const draw=(w,r,c,dir)=>{
    for(let i=0;i<w.length;i++){
      const cell = dir==='h'?cells[r*SIZE+c+i]:cells[(r+i)*SIZE+c];
      cell.dataset.letter=w[i]; cell.dataset.locked='1';
      const div=document.createElement('div');
      div.className='fixed-tile'; div.textContent=w[i];
      div.dataset.letter = w[i];
      const sm=document.createElement('small'); sm.textContent=pts[w[i]];
      div.appendChild(sm);
      cell.innerHTML=''; cell.appendChild(div);
    }
  };

  let placed=0, tries=0, center=Math.floor(SIZE/2);
  while(placed<5 && tries<1200){
    if(placed===0){                 /* first word across center row */
      const w=pick([...dict]).toUpperCase().slice(0,8);
      draw(w,center,Math.floor((SIZE-w.length)/2),'h');
      placed++; tries++; continue;
    }
    const word=pick([...dict]).toUpperCase().slice(0,8);
    const dir=rng()<0.5?'h':'v';
    const a=Math.floor(rng()*word.length);
    const anchors=cells.filter(c=>c.dataset.letter===word[a]);
    if(!anchors.length){tries++;continue;}
    const tgt=anchors[Math.floor(rng()*anchors.length)];
    const sr=dir==='h'?+tgt.dataset.row:+tgt.dataset.row-a;
    const sc=dir==='h'?+tgt.dataset.col-a:+tgt.dataset.col;
    let fits=true;
    if(dir==='h'){
      if(sc<0||sc+word.length>SIZE) fits=false;
      else for(let i=0;i<word.length;i++){
        const cl=cells[sr*SIZE+sc+i];
        if(cl.dataset.letter && cl.dataset.letter!==word[i]){fits=false;break;}
      }
    }else{
      if(sr<0||sr+word.length>SIZE) fits=false;
      else for(let i=0;i<word.length;i++){
        const cl=cells[(sr+i)*SIZE+sc];
        if(cl.dataset.letter && cl.dataset.letter!==word[i]){fits=false;break;}
      }
    }
    if(!fits){tries++;continue;}

    const tmp=[];
    for(let i=0;i<word.length;i++){
      const cl=dir==='h'?cells[sr*SIZE+sc+i]:cells[(sr+i)*SIZE+sc];
      if(!cl.dataset.letter){cl.dataset.letter=word[i]; tmp.push(cl);}
    }
    if([...scan()].some(w=>!dict.has(w)))
      tmp.forEach(c=>delete c.dataset.letter);
    else{draw(word,sr,sc,dir); placed++;}
    tries++;
  }
})();

/* === 6. Generate rack tiles === */
for(let i=0;i<15;i++){
  const L=pick(bag);
  const tile=document.createElement('div');
  tile.className='tile'; tile.id=`tile-${i}`;
  tile.textContent=L; tile.dataset.letter=L; tile.draggable=true;
  const sm=document.createElement('small'); sm.textContent=pts[L];
  tile.appendChild(sm);

  tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);

  /* allow swap inside rack */
  tile.ondragover=e=>e.preventDefault();
  tile.ondrop=e=>{
    const id=e.dataTransfer.getData('text');
    const drg=document.getElementById(id);
    if(!drg||drg.dataset.locked==='1'||drg===tile) return;
    rackBox.insertBefore(drg,tile);
    if(drg._prevCell){
      delete drg._prevCell.dataset.letter;
      delete drg._prevCell.dataset.locked;
      drg._prevCell.innerHTML =
        drg._prevCell.querySelector('.bonus')?.outerHTML || '';
      drg._prevCell=null;
    }
  };

  rackBox.appendChild(tile);
}

/* rack drop target */
rackBox.ondragover=e=>e.preventDefault();
rackBox.ondrop=e=>{
  const id=e.dataTransfer.getData('text');
  const tile=document.getElementById(id);
  if(!tile||tile.dataset.locked==='1') return;
  rackBox.appendChild(tile);
  if(tile._prevCell){
    delete tile._prevCell.dataset.letter;
    delete tile._prevCell.dataset.locked;
    tile._prevCell.innerHTML =
      tile._prevCell.querySelector('.bonus')?.outerHTML || '';
    tile._prevCell=null;
  }
};

/* === 7. Utility funcs === */
const active = () => [...board.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const inline = ts => {
  const rs=ts.map(t=>+t.parentElement.dataset.row),
        cs=ts.map(t=>+t.parentElement.dataset.col);
  return rs.every(x=>x===rs[0])||cs.every(x=>x===cs[0]);
};
const collect=(r,c,dr,dc)=>{
  const a=[];
  while(r>=0&&r<SIZE&&c>=0&&c<SIZE&&cells[r*SIZE+c].dataset.letter){
    a.push(cells[r*SIZE+c]); r+=dr; c+=dc;
  }
  return a;
};

/* === 8. Submit / scoring === */
let turn=0,total=0;

submit.onclick=()=>{
  if(turn>=3){alert('No turns left');return;}
  const nt=active();
  if(!nt.length){alert('Place tiles');return;}
  if(!inline(nt)){alert('Tiles must form a straight line');return;}

  /* require adjacency after first turn */
  if(turn>0 && !nt.some(t=>{
    const r=+t.parentElement.dataset.row,
          c=+t.parentElement.dataset.col;
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([rr,cc])=>
      rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&cells[rr*SIZE+cc].dataset.locked==='1');
  })){alert('Tiles must connect to an existing word');return;}

  const horiz = nt.every(t=>+t.parentElement.dataset.row===+nt[0].parentElement.dataset.row);

  /* main word */
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
  const mainWord=mainCells.map(c=>c.dataset.letter).join('').toLowerCase();
  if(!dict.has(mainWord) && mainWord.length>1){
    alert(`INVALID WORD: ${mainWord.toUpperCase()}`); return;
  }

  const words=[{cells:mainCells,word:mainWord}];
  const singleMain = mainWord.length===1;

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

  /* Guard: single letter must create cross words */
  if(singleMain && words.length===1){
    alert('You must form a word of 2+ letters or create a cross-word'); return;
  }
  if(singleMain && words.length>1){
    words.shift();   // drop the single-letter main word from scoring/validation
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
  nt.forEach(t=>{
    t.dataset.locked='1';
    t.parentElement.dataset.locked='1';
  });

  if(++turn===3) alert('Game over!  Total '+total);
};
