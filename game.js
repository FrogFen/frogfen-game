/*  FrogFen play-test build v0.4.4
    – ghost-tile fix, single-tile cross-word validation          */

const SIZE = 11;

/* == DOM refs == */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* == Data == */
const dict = new Set(window.dictionaryWords);          // from dictionary.js

const pts = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
             N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

const bag = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTT"+
            "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* === simple seeded RNG so every reload differs === */
let seed = Date.now();
function rng(){ seed=Math.imul(16807,seed)&0xffffffff; return (seed>>>0)/2**32; }
const pick = str=>str[Math.floor(rng()*str.length)];

/* == Build grid == */
const cells=[];
for(let r=0;r<SIZE;r++){
  for(let c=0;c<SIZE;c++){
    const cell=document.createElement('div');
    cell.className='cell'; cell.dataset.row=r; cell.dataset.col=c;
    cell.ondragover=e=>e.preventDefault();
    cell.ondrop=e=>{
      const id=e.dataTransfer.getData('text'); if(!id) return;
      const tile=document.getElementById(id);
      if(!tile||tile.dataset.locked==='1'||cell.querySelector('.tile')) return;

      /* tidy previous cell if tile came from board */
      if(tile._prevCell && tile._prevCell!==cell){
        delete tile._prevCell.dataset.letter;
        delete tile._prevCell.dataset.locked;
        tile._prevCell.innerHTML =
          tile._prevCell.querySelector('.bonus')?.outerHTML || '';
      }
      cell.appendChild(tile);
      cell.dataset.letter = tile.dataset.letter;
      tile._prevCell = cell;
    };
    board.appendChild(cell); cells.push(cell);
  }
}

/* == Bonus squares == */
const bonusCfg=[
  ['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
  ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']
];
const used=new Set();
bonusCfg.forEach(([t,m,q,cls])=>{
  let n=0;
  while(n<q){
    const idx=Math.floor(rng()*cells.length);
    if(used.has(idx)) continue; used.add(idx);
    const c=cells[idx];
    c.dataset.bonusType=t; c.dataset.bonusMult=m; c.classList.add(cls);
    const sp=document.createElement('span'); sp.className='bonus';
    sp.textContent=t==='word'?`${m}xW`:`${m}xL`;
    c.appendChild(sp); n++;
  }
});

/* == Helper functions == */
const collect=(r,c,dr,dc)=>{
  const out=[];
  while(r>=0&&r<SIZE&&c>=0&&c<SIZE&&cells[r*SIZE+c].dataset.letter){
    out.push(cells[r*SIZE+c]); r+=dr; c+=dc;
  }
  return out;
};
const active=()=>[...board.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const inline=ts=>{
  const rs=ts.map(t=>+t.parentElement.dataset.row),
        cs=ts.map(t=>+t.parentElement.dataset.col);
  return rs.every(x=>x===rs[0])||cs.every(x=>x===cs[0]);
};

/* == Place 5 starter words (same algorithm as before) == */
(function starters(){
  const scan=()=>{
    const s=new Set();
    for(let r=0;r<SIZE;r++){
      let w=''; for(let c=0;c<SIZE;c++){
        const ch=cells[r*SIZE+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) s.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) s.add(w.toLowerCase());
    }
    for(let c=0;c<SIZE;c++){
      let w=''; for(let r=0;r<SIZE;r++){
        const ch=cells[r*SIZE+c].dataset.letter;
        if(ch) w+=ch; else{ if(w.length>1) s.add(w.toLowerCase()); w=''; }
      }
      if(w.length>1) s.add(w.toLowerCase());
    }
    return s;
  };
  const draw=(w,r,c,d)=>{
    for(let i=0;i<w.length;i++){
      const cell=d==='h'?cells[r*SIZE+c+i]:cells[(r+i)*SIZE+c];
      cell.dataset.letter=w[i]; cell.dataset.locked='1';
      cell.innerHTML=''; const t=document.createElement('div');
      t.className='fixed-tile'; t.textContent=w[i];
      const sm=document.createElement('small'); sm.textContent=pts[w[i]];
      t.appendChild(sm); cell.appendChild(t);
    }
  };
  let placed=0,tries=0,mid=Math.floor(SIZE/2);
  while(placed<5&&tries<1200){
    if(placed===0){
      const w=pick([...dict]).toUpperCase().slice(0,8);
      draw(w,mid,Math.floor((SIZE-w.length)/2),'h');
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
    let ok=true;
    if(dir==='h'){
      if(sc<0||sc+word.length>SIZE) ok=false;
      else for(let i=0;i<word.length;i++){
        const cl=cells[sr*SIZE+sc+i];
        if(cl.dataset.letter&&cl.dataset.letter!==word[i]){ok=false;break;}
      }
    }else{
      if(sr<0||sr+word.length>SIZE) ok=false;
      else for(let i=0;i<word.length;i++){
        const cl=cells[(sr+i)*SIZE+sc];
        if(cl.dataset.letter&&cl.dataset.letter!==word[i]){ok=false;break;}
      }
    }
    if(!ok){tries++;continue;}
    const tmp=[];
    for(let i=0;i<word.length;i++){
      const cl=dir==='h'?cells[sr*SIZE+sc+i]:cells[(sr+i)*SIZE+sc];
      if(!cl.dataset.letter){cl.dataset.letter=word[i]; tmp.push(cl);}
    }
    if([...scan()].some(w=>!dict.has(w))) tmp.forEach(c=>delete c.dataset.letter);
    else{draw(word,sr,sc,dir); placed++;}
    tries++;
  }
})();

/* == Build 15 rack tiles == */
for(let i=0;i<15;i++){
  const L=pick(bag);
  const tile=document.createElement('div'); tile.className='tile'; tile.id='t'+i;
  tile.textContent=L; tile.dataset.letter=L; tile.draggable=true;
  const sm=document.createElement('small'); sm.textContent=pts[L]; tile.appendChild(sm);
  tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);
  tile.ondragover=e=>e.preventDefault();
  tile.ondrop=e=>{
    const id=e.dataTransfer.getData('text'); const drg=document.getElementById(id);
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
rackBox.ondragover=e=>e.preventDefault();
rackBox.ondrop=e=>{
  const id=e.dataTransfer.getData('text'); const tile=document.getElementById(id);
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

/* == Gameplay == */
let turn=0,total=0;

submit.onclick=()=>{
  if(turn>=3){alert('No turns left');return;}
  const nt=active();
  if(!nt.length){alert('Place tiles');return;}
  if(!inline(nt)){alert('Tiles must form a straight line');return;}

  /* adjacency check after 1st turn */
  if(turn>0 && !nt.some(t=>{
    const r=+t.parentElement.dataset.row, c=+t.parentElement.dataset.col;
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
      .some(([rr,cc])=>rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&cells[rr*SIZE+cc].dataset.locked==='1');
  })){alert('Tiles must connect to an existing word');return;}

  /* ── Rebuild ALL words that include any new tile ── */
  const words=[];
  for(const t of nt){
    const r=+t.parentElement.dataset.row, c=+t.parentElement.dataset.col;

    /* horiz */
    const horiz=collect(r,c,0,-1).reverse().concat(collect(r,c+1,0,1));
    if(horiz.length>1 && !words.some(w=>w.cells===horiz)){
      words.push({cells:horiz,word:horiz.map(x=>x.dataset.letter).join('').toLowerCase()});
    }
    /* vert */
    const vert=collect(r,c,-1,0).reverse().concat(collect(r+1,c,1,0));
    if(vert.length>1 && !words.some(w=>w.cells===vert)){
      words.push({cells:vert,word:vert.map(x=>x.dataset.letter).join('').toLowerCase()});
    }
  }
  if(!words.length){alert('You must create at least one word of 2+ letters');return;}

  /* validate */
  for(const {word} of words){
    if(!dict.has(word)){alert(`INVALID WORD: ${word.toUpperCase()}`);return;}
  }

  /* scoring */
  let gained=0; detail.textContent='';
  for(const {cells:wc,word} of words){
    let base=0,mult=1;
    wc.forEach(cell=>{
      let p=pts[cell.dataset.letter];
      const fresh=!cell.dataset.locked;
      if(fresh&&cell.dataset.bonusType==='letter') p*=+cell.dataset.bonusMult;
      if(fresh&&cell.dataset.bonusType==='word')   mult*=+cell.dataset.bonusMult;
      base+=p;
    });
    const sub=Math.round(base*mult);
    gained+=sub;
    detail.textContent+=`${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${sub}\n`;
  }
  total+=gained; totalEl.textContent=total;

  /* lock tiles */
  nt.forEach(t=>{
    t.dataset.locked='1';
    t.parentElement.dataset.locked='1';
  });

  if(++turn===3) alert('Game over!  Total '+total);
};
