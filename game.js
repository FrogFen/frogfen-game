/* FrogFen – stable play-test build v0.4.3
   • centred board, ▲ button
   • duplicate-word scoring fixed
   • keeps full score history            */

const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* --- parameters --- */
const SIZE   = 10;     /* 10×10 board */
const RACK   = 16;     /* 16 tiles (2×8) */
const points = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
                N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

/* sample bonus layout */
const bonuses={
  "0,0":"1.5×W","0,3":"3×L","0,5":"3×L","1,4":"1.5×W",
  "3,1":"2×W","4,4":"5×L","6,0":"1.1×W","9,9":"2×L"
};

/* quick helpers */
const rand = m=>Math.floor(Math.random()*m);
const dict = new Set(window.dictionaryWords);        /* lower-case list */

/* --- build board --- */
for(let r=0;r<SIZE;r++){
  const tr=board.insertRow();
  for(let c=0;c<SIZE;c++){
    const td=tr.insertCell();
    td.dataset.row=r; td.dataset.col=c;
    const key=`${r},${c}`; if(bonuses[key]) td.dataset.bonus=bonuses[key];
  }
}

/* --- drag/drop --- */
let dragTile=null;

function makeTile(ch,locked=false){
  const div=document.createElement('div');
  div.className='tile'+(locked?' lock':'');
  div.draggable=!locked;
  div.textContent=ch;
  div.dataset.letter=ch;
  const sub=document.createElement('sub');
  sub.textContent=points[ch];
  div.appendChild(sub);
  return div;
}
/* rack interactions */
function populateRack(){
  rackBox.innerHTML='';
  const bag="EEEEEEEEEEEEEEEEAAAAAAAAIIIIIIIIOOOOOOO" +
            "NNRR T T LLSS UUDDGGBBCCMMPPFHVWYJKQXZ";
  while(rackBox.children.length<RACK){
    const ch=bag[rand(bag.length)];
    rackBox.appendChild(makeTile(ch));
  }
}
populateRack();

rackBox.addEventListener('dragstart',e=>e.stopPropagation());
rackBox.addEventListener('drop',e=>{
  e.preventDefault();
  if(dragTile?.classList.contains('lock'))return;
  rackBox.appendChild(dragTile);
  dragTile.removeAttribute('data-row');
  dragTile.removeAttribute('data-col');
});

/* board drag */
board.addEventListener('dragstart',e=>{
  if(!e.target.classList.contains('tile'))return;
  dragTile=e.target;e.dataTransfer.setData('text/plain','');
  setTimeout(()=>dragTile.classList.add('drag'),0);
});
board.addEventListener('dragend',()=>dragTile?.classList.remove('drag'));
['dragover','dragenter'].forEach(ev=>{
  board.addEventListener(ev,e=>e.preventDefault());
});
board.addEventListener('drop',e=>{
  const td=e.target.closest('td'); if(!td)return;
  if(td.querySelector('.tile'))return;
  td.appendChild(dragTile);
  td.classList.add('drop');
  dragTile.dataset.row=td.dataset.row;
  dragTile.dataset.col=td.dataset.col;
});

/* --- seed 5 words --- */
const dirs=[[1,0],[0,1]];
function place(word){
  word=word.toUpperCase();
  for(let t=0;t<50;t++){
    const d=dirs[rand(2)];
    const r0=rand(SIZE-d[0]*word.length);
    const c0=rand(SIZE-d[1]*word.length);
    let ok=true;
    for(let i=0;i<word.length;i++){
      const cell=board.rows[r0+d[0]*i].cells[c0+d[1]*i];
      if(cell.firstChild){ok=false;break;}
    }
    if(!ok)continue;
    for(let i=0;i<word.length;i++){
      const cell=board.rows[r0+d[0]*i].cells[c0+d[1]*i];
      cell.appendChild(makeTile(word[i],true));
    }
    return true;
  }
  return false;
}
(function seed(){
  const words=window.dictionaryWords.filter(w=>w.length<=SIZE);
  let placed=0;while(placed<5){ if(place(words[rand(words.length)])) placed++; }
})();

/* --- submit turn --- */
submit.onclick=()=>{
  const newTiles=[...board.querySelectorAll('.tile:not(.lock)')];
  if(!newTiles.length)return;

  /* all new tiles must share a row or col */
  const rows=new Set(newTiles.map(t=>t.dataset.row));
  const cols=new Set(newTiles.map(t=>t.dataset.col));
  if(rows.size>1&&cols.size>1){alert('Tiles must align');return;}

  /* must touch an existing lock unless first turn */
  const first=board.querySelectorAll('.lock').length===0;
  if(!first){
    const touch=newTiles.some(t=>{
      const r=+t.dataset.row,c=+t.dataset.col;
      return [[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{
        const rr=r+dr,cc=c+dc;
        return rr>=0&&rr<SIZE&&cc>=0&&cc<SIZE &&
               board.rows[rr].cells[cc].querySelector('.lock');
      });
    });
    if(!touch){alert('Tiles must connect to existing word');return;}
  }

  /* build letter grid */
  const grid=Array.from({length:SIZE},()=>Array(SIZE).fill(''));
  board.querySelectorAll('.tile').forEach(t=>{
    grid[+t.dataset.row][+t.dataset.col]=t.dataset.letter;
  });

  /* collect words (horizontal & vertical) */
  const list=[];
  const pushWord=w=>w.length>1&&list.push(w);
  for(let r=0;r<SIZE;r++){
    let str='';for(let c=0;c<=SIZE;c++){
      const ch=grid[r][c]||''; str+=ch;
      if(!ch){ pushWord(str);str=''; }
    }
  }
  for(let c=0;c<SIZE;c++){
    let str='';for(let r=0;r<=SIZE;r++){
      const ch=(grid[r]||[])[c]||''; str+=ch;
      if(!ch){ pushWord(str);str=''; }
    }
  }

  /* uniq the list so a word is scored once */
  const words=[...new Set(list)];
  let turn=0,lines='';
  for(const w of words){
    if(!dict.has(w.toLowerCase())){alert(`INVALID WORD: ${w}`);return;}
    let pts=[...w].reduce((s,ch)=>s+points[ch],0);
    turn+=pts; lines+=`${w}: ${pts} × 1.00 = ${pts}\n`;
  }
  totalEl.textContent=+totalEl.textContent+turn;
  detail.textContent+=lines;

  /* lock & recolour */
  newTiles.forEach(t=>t.classList.add('lock'));
  populateRack();
};
