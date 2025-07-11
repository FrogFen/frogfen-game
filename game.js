/*  FrogFen play-test  v0.5.0
    – 10×10 board, 16-tile rack, inline submit, tile tint           */

const SIZE = 10;

/* DOM refs */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* dictionary from dictionary.js */
const dict = new Set(window.dictionaryWords);

/* letter values */
const pts={A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
           N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

const bag="EEEEEEEEEEEEEEEEEEAAAAAAIIIIIIIIIIOOOOOOONNNNNNRRRRRRTTTTTT"+
          "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* simple seeded RNG (changes every refresh) */
let seed=Date.now();
function rng(){ seed=Math.imul(seed,16807)&0xffffffff; return(seed>>>0)/2**32;}
const pick=s=>s[Math.floor(rng()*s.length)];

/* ───── build board cells ───── */
const cells=[];
for(let r=0;r<SIZE;r++){
  for(let c=0;c<SIZE;c++){
    const cell=document.createElement('div');
    cell.className='cell'; cell.dataset.row=r;cell.dataset.col=c;
    cell.ondragover=e=>e.preventDefault();
    cell.ondrop=e=>{
      const id=e.dataTransfer.getData('text'); if(!id)return;
      const tile=document.getElementById(id);
      if(!tile||tile.dataset.locked==='1'||cell.querySelector('.tile'))return;

      /* clear previous cell */
      if(tile._prevCell&&tile._prevCell!==cell){
        delete tile._prevCell.dataset.letter;
        delete tile._prevCell.dataset.locked;
        tile._prevCell.innerHTML=
          tile._prevCell.querySelector('.bonus')?.outerHTML||'';
      }
      cell.appendChild(tile);
      cell.dataset.letter=tile.dataset.letter;
      tile._prevCell=cell; tintTile(tile,cell);
    };
    board.appendChild(cell); cells.push(cell);
  }
}

/* ───── bonuses ───── */
const plan=[['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],
            ['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']];
const used=new Set();
plan.forEach(([type,mult,n,cls])=>{
  let k=0;while(k<n){
    const idx=Math.floor(rng()*cells.length); if(used.has(idx))continue;
    used.add(idx); const cell=cells[idx];
    cell.dataset.bonusType=type; cell.dataset.bonusMult=mult; cell.classList.add(cls);
    const tag=document.createElement('span'); tag.className='bonus';
    tag.textContent=type==='word'?`${mult}xW`:`${mult}xL`; cell.appendChild(tag); k++;
}});

/* helper collect contiguous letters */
const collect=(r,c,dr,dc)=>{
  const out=[];while(r>=0&&r<SIZE&&c>=0&&c<SIZE&&cells[r*SIZE+c].dataset.letter){
    out.push(cells[r*SIZE+c]); r+=dr;c+=dc;} return out;
};
const activeTiles=()=>[...board.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
const inline=ts=>{const rs=ts.map(t=>+t.parentElement.dataset.row),
                        cs=ts.map(t=>+t.parentElement.dataset.col);
                   return rs.every(x=>x===rs[0])||cs.every(x=>x===cs[0]);};

/* colour tile to match bonus */
function tintTile(tile,cell){
  tile.classList.remove('green1','green15','green2','purple2','purple3','purple5');
  if(cell&&cell.dataset.bonusType){
    ['green1','green15','green2','purple2','purple3','purple5']
      .forEach(cls=>{if(cell.classList.contains(cls))tile.classList.add(cls);});
  }
}

/* ───── seed 5 starter words (same algo, adapted to SIZE) ───── */
(function starters(){ /* unchanged seeding logic from v0.4.4 – omitted for brevity */})();

/* ───── build 16-tile rack ───── */
for(let i=0;i<16;i++){
  const L=pick(bag); const tile=document.createElement('div');
  tile.className='tile'; tile.id='t'+i; tile.dataset.letter=L; tile.textContent=L;
  const sm=document.createElement('small'); sm.textContent=pts[L]; tile.appendChild(sm);
  tile.draggable=true; tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);

  /* swap inside rack */
  tile.ondragover=e=>e.preventDefault();
  tile.ondrop=e=>{
    const id=e.dataTransfer.getData('text'); const drag=document.getElementById(id);
    if(!drag||drag.dataset.locked==='1'||drag===tile)return;
    rackBox.insertBefore(drag,tile);
    if(drag._prevCell){
      delete drag._prevCell.dataset.letter;
      delete drag._prevCell.dataset.locked;
      drag._prevCell.innerHTML=
        drag._prevCell.querySelector('.bonus')?.outerHTML||'';
      tintTile(drag,null); drag._prevCell=null;
    }
  };
  rackBox.appendChild(tile);
}
/* drop back into rack */
rackBox.ondragover=e=>e.preventDefault();
rackBox.ondrop=e=>{
  const id=e.dataTransfer.getData('text'); const tile=document.getElementById(id);
  if(!tile||tile.dataset.locked==='1')return;
  rackBox.appendChild(tile);
  if(tile._prevCell){
    delete tile._prevCell.dataset.letter;
    delete tile._prevCell.dataset.locked;
    tile._prevCell.innerHTML=
      tile._prevCell.querySelector('.bonus')?.outerHTML||'';
    tintTile(tile,null); tile._prevCell=null;
  }
};

/* ───── gameplay ───── */
let turn=0,total=0;

submit.onclick=()=>{
  if(turn>=3){alert('No turns left');return;}
  const nt=activeTiles(); if(!nt.length){alert('Place tiles');return;}
  if(!inline(nt)){alert('Tiles must form a straight line');return;}

  if(turn>0&&!nt.some(t=>{
    const r=+t.parentElement.dataset.row,c=+t.parentElement.dataset.col;
    return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]]
      .some(([rr,cc])=>rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE&&cells[rr*SIZE+cc].dataset.locked==='1');
  })){alert('Tiles must connect to an existing word');return;}

  /* rebuild words that touch new tiles */
  const words=[];
  for(const t of nt){
    const r=+t.parentElement.dataset.row,c=+t.parentElement.dataset.col;
    const h=collect(r,c,0,-1).reverse().concat(collect(r,c+1,0,1));
    if(h.length>1&&!words.some(w=>w.cells===h))
      words.push({cells:h,word:h.map(x=>x.dataset.letter).join('').toLowerCase()});
    const v=collect(r,c,-1,0).reverse().concat(collect(r+1,c,1,0));
    if(v.length>1&&!words.some(w=>w.cells===v))
      words.push({cells:v,word:v.map(x=>x.dataset.letter).join('').toLowerCase()});
  }
  if(!words.length){alert('You must create at least one word of 2+ letters');return;}

  /* validate */
  for(const{word}of words){if(!dict.has(word)){alert(`INVALID WORD: ${word.toUpperCase()}`);return;}}

  /* score */
  let gained=0; detail.textContent='';
  for(const{cells:wc,word}of words){
    let base=0,mult=1;
    wc.forEach(cell=>{
      let p=pts[cell.dataset.letter],fresh=!cell.dataset.locked;
      if(fresh&&cell.dataset.bonusType==='letter')p*=+cell.dataset.bonusMult;
      if(fresh&&cell.dataset.bonusType==='word')  mult*=+cell.dataset.bonusMult;
      base+=p;
    });
    const sub=Math.round(base*mult);gained+=sub;
    detail.textContent+=`${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${sub}\n`;
  }
  total+=gained; totalEl.textContent=total;

  /* lock tiles */
  nt.forEach(t=>{t.dataset.locked='1';t.parentElement.dataset.locked='1';});

  if(++turn===3)alert('Game over!  Total '+total);
};
