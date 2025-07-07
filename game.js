
// FrogFen core script
const BOARD_SIZE=11;
const boardEl=document.getElementById('board');
const bankEl=document.getElementById('letter-bank');
const submitBtn=document.getElementById('submit-btn');
const totalScoreEl=document.getElementById('total-score');
const detailBox=document.getElementById('detail-box');

const dictionary=new Set(window.dictionaryWords);
const letterScores={A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
const distribution="EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

function mulberry32(a){return ()=>{var t=a+=0x6d2b79f5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
const seedStr=new Date().toISOString().slice(0,10);
let seed=0;for(const ch of seedStr) seed+=ch.charCodeAt(0);
const rand=mulberry32(seed);
const randChoice=a=>a[Math.floor(rand()*a.length)];

// Build board cells
const board=[];
for(let r=0;r<BOARD_SIZE;r++){
 for(let c=0;c<BOARD_SIZE;c++){
  const cell=document.createElement('div');cell.className='cell';cell.dataset.row=r;cell.dataset.col=c;
  cell.ondragover=e=>e.preventDefault();
  cell.ondrop=e=>{const id=e.dataTransfer.getData('text');const tile=document.getElementById(id);if(!tile||cell.firstChild)return;cell.appendChild(tile);};
  boardEl.appendChild(cell);board.push(cell);
 }}
// Bonus tiles
const bonusPlan=[['word',1.1,5,'green1'],['word',1.5,3,'green15'],['word',2,1,'green2'],['letter',2,5,'purple2'],['letter',3,3,'purple3'],['letter',5,1,'purple5']];
const used=new Set();
bonusPlan.forEach(([type,mult,count,cls])=>{
 let p=0;
 while(p<count){
   const idx=Math.floor(rand()*board.length);
   if(used.has(idx)) continue;
   used.add(idx);
   const cell=board[idx];
   cell.dataset.bonusType=type;cell.dataset.bonusMult=mult;cell.classList.add(cls);
   const sp=document.createElement('span');sp.className='bonus';sp.textContent=(type==='word'?mult+'xW':mult+'xL');cell.appendChild(sp);
   p++;
 }
});

// Place 5 overlapping starter words
function placeWords(){
 const placed=[];
 function canPlace(word,row,col,dir){
   if(dir==='h'){if(col+word.length>BOARD_SIZE)return false;
     for(let i=0;i<word.length;i++){
      const cell=board[row*BOARD_SIZE+col+i];
      if(cell.dataset.letter && cell.dataset.letter!==word[i])return false;
     }
     return true;
   }else{
     if(row+word.length>BOARD_SIZE)return false;
     for(let i=0;i<word.length;i++){
      const cell=board[(row+i)*BOARD_SIZE+col];
      if(cell.dataset.letter && cell.dataset.letter!==word[i])return false;
     }
     return true;
   }
 }
 function doPlace(word,row,col,dir){
   for(let i=0;i<word.length;i++){
     const cell=(dir==='h')?board[row*BOARD_SIZE+col+i]:board[(row+i)*BOARD_SIZE+col];
     cell.dataset.letter=word[i];
     cell.textContent=word[i];
   }
 }
 // first word horizontal center
 const first=randChoice([...dictionary]).toUpperCase().slice(0,8);
 const startCol=Math.floor((BOARD_SIZE-first.length)/2);
 const mid=Math.floor(BOARD_SIZE/2);
 doPlace(first,mid,startCol,'h');placed.push({word:first,row:mid,col:startCol,dir:'h'});
 // place 4 more
 let attempts=0;
 while(placed.length<5 && attempts<800){
   const w=randChoice([...dictionary]).toUpperCase().slice(0,8);
   const anchorIdx=Math.floor(rand()*w.length);
   const anchorLetter=w[anchorIdx];
   // find existing board cell with that letter
   const candidates=board.filter(c=>c.dataset.letter===anchorLetter);
   if(candidates.length===0){attempts++;continue;}
   const anchorCell=randChoice(candidates);
   const ar=+anchorCell.dataset.row, ac=+anchorCell.dataset.col;
   const dir=Math.random()<0.5?'h':'v';
   let row,col;
   if(dir==='h'){
     col=ac-anchorIdx;row=ar;
   }else{
     row=ar-anchorIdx;col=ac;
   }
   if(canPlace(w,row,col,dir)){doPlace(w,row,col,dir);placed.push({word:w,row,col,dir});}
   attempts++;
 }
}
placeWords();

// Build rack
const rack=[];
while(rack.length<15) rack.push(randChoice(distribution));
rack.forEach((ltr,i)=>{
 const tile=document.createElement('div');tile.className='tile';tile.id='tile-'+i;tile.textContent=ltr;tile.draggable=true;
 const sm=document.createElement('small');sm.textContent=letterScores[ltr];tile.appendChild(sm);
 tile.ondragstart=e=>e.dataTransfer.setData('text',tile.id);
 bankEl.appendChild(tile);
});

// Game play
let turn=0,total=0;
submitBtn.onclick=()=>{
 if(turn>=3){alert('No turns left');return;}
 const active=[...boardEl.querySelectorAll('.tile')].filter(t=>!t.dataset.locked);
 if(active.length===0){alert('Place tiles');return;}
 // verify straight line
 const rows=active.map(t=>+t.parentElement.dataset.row);
 const cols=active.map(t=>+t.parentElement.dataset.col);
 if(!(rows.every(r=>r===rows[0])||cols.every(c=>c===cols[0]))){alert('Tiles must form a straight line');return;}
 // build word
 active.sort((a,b)=>{
  const ar=+a.parentElement.dataset.row, br=+b.parentElement.dataset.row;
  const ac=+a.parentElement.dataset.col, bc=+b.parentElement.dataset.col;
  return ar!==br?ar-br:ac-bc;
 });
 const word=active.map(t=>t.textContent).join('').toLowerCase();
 if(!dictionary.has(word)){alert('INVALID WORD');return;}

 let base=0, wordMult=1;
 active.forEach(tile=>{
    const cell=tile.parentElement;
    let score=letterScores[tile.textContent];
    if(cell.dataset.bonusType==='letter') score*=+cell.dataset.bonusMult;
    if(cell.dataset.bonusType==='word') wordMult*=+cell.dataset.bonusMult;
    base+=score;
 });
 const wordScore=Math.round(base*wordMult);
 total+=wordScore;
 totalScoreEl.textContent=total;
 detailBox.textContent+=`${word.toUpperCase()}: ${base} × ${wordMult.toFixed(2)} = ${wordScore}\n`;
 active.forEach(t=>t.dataset.locked='1');
 turn++;
 if(turn===3) alert('Game over! Total '+total);
};
