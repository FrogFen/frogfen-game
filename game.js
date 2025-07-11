/* -------------  FrogFen game.js  (10×10 board)  ------------------ */
const BOARD_SIZE = 10;
const RACK_SIZE  = 16;
const MAX_TURNS  = 3;

/* ── letter distribution / values (Scrabble-like) ───────────────── */
const LETTERS = [
  { l:'E', n:12, v:1 }, { l:'A', n:9, v:1 }, { l:'I', n:9, v:1 },
  { l:'O', n:8, v:1 },  { l:'N', n:6, v:1 }, { l:'R', n:6, v:1 },
  { l:'T', n:6, v:1 },  { l:'L', n:4, v:1 }, { l:'S', n:4, v:1 },
  { l:'U', n:4, v:1 },  { l:'D', n:4, v:2 }, { l:'G', n:3, v:2 },
  { l:'B', n:2, v:3 },  { l:'C', n:2, v:3 }, { l:'M', n:2, v:3 },
  { l:'P', n:2, v:3 },  { l:'F', n:2, v:4 }, { l:'H', n:2, v:4 },
  { l:'V', n:2, v:4 },  { l:'W', n:2, v:4 }, { l:'Y', n:2, v:4 },
  { l:'K', n:1, v:5 },  { l:'J', n:1, v:8 }, { l:'X', n:1, v:8 },
  { l:'Q', n:1, v:10 }, { l:'Z', n:1, v:10 }
];

/* ── bonus layout helpers ───────────────────────────────────────── */
const board = document.getElementById('board');
const rack  = document.getElementById('letter-bank');
const totalBox = document.getElementById('total-score');
const detailBox= document.getElementById('detail-box');
let rackTiles   = [];
let placedThisTurn = [];
let totalScore  = 0;
let turnCount   = 0;

/* random helpers (seeded per-day in real version) */
function rand(max){return Math.floor(Math.random()*max);}

/* build board cells + random bonuses */
const bonusMap = {};                    // key "r,c" => {type:'word'|'letter', mult:1.1|...}
function addBonus(r,c,type,mult,cls,label){
  bonusMap[`${r},${c}`]={type,mult};
  const cell = board.children[r*BOARD_SIZE+c];
  cell.classList.add(cls,'bonus'); cell.textContent=label;
}
(function makeBoard(){
  board.style.setProperty('--sz',BOARD_SIZE);
  for(let i=0;i<BOARD_SIZE**2;i++){
    const d=document.createElement('div');d.className='cell';
    board.appendChild(d);
  }
  /* random green word bonuses */
  placeRandom(5,'word',1.1,'green1','1.1xW');
  placeRandom(3,'word',1.5,'green15','1.5xW');
  placeRandom(1,'word',2,'green2','2xW');
  /* random purple letter bonuses */
  placeRandom(5,'letter',2,'purple2','2xL');
  placeRandom(3,'letter',3,'purple3','3xL');
  placeRandom(1,'letter',5,'purple5','5xL');
  function placeRandom(num,type,mult,cls,label){
    let placed=0;
    while(placed<num){
      const r=rand(BOARD_SIZE),c=rand(BOARD_SIZE);
      if(!bonusMap[`${r},${c}`]){
        addBonus(r,c,type,mult,cls,label); placed++;
      }
    }
  }
})();

/* seed 5 interconnected words (simplified) ------------------------ */
function seedWords(){
  let wordsPlaced=0, attempts=0;
  while(wordsPlaced<5 && attempts<200){
    attempts++;
    const word=dictionary[rand(dictionary.length)];
    if(word.length>BOARD_SIZE) continue;
    const horiz=Math.random()<0.5;
    const maxStart=BOARD_SIZE-word.length;
    const r=rand(BOARD_SIZE),c=rand(maxStart+1);
    if(placeSeed(word.toUpperCase(),r,c,horiz)) wordsPlaced++;
  }
}
function placeSeed(word,r,c,horiz){
  for(let i=0;i<word.length;i++){
    const rr=r+(horiz?0:i), cc=c+(horiz?i:0);
    const cell=board.children[rr*BOARD_SIZE+cc];
    if(cell.dataset.letter && cell.dataset.letter!==word[i]) return false;
  }
  for(let i=0;i<word.length;i++){
    const rr=r+(horiz?0:i), cc=c+(horiz?i:0);
    const cell=board.children[rr*BOARD_SIZE+cc];
    if(!cell.dataset.letter){
      const t=makeFixedTile(word[i]);
      cell.appendChild(t);
      cell.dataset.letter=word[i];
    }
  }
  return true;
}
function makeFixedTile(ch){
  const div=document.createElement('div');div.className='fixed-tile';
  div.textContent=ch;
  const sm=document.createElement('small');sm.textContent=letterValue(ch);
  div.appendChild(sm);
  return div;
}
seedWords();

/* build rack ------------------------------------------------------ */
function refillRack(){
  while(rackTiles.length<RACK_SIZE){
    const letter=getRandomLetter();
    if(!letter) break;
    const t=createTile(letter);
    rack.appendChild(t); rackTiles.push(t);
  }
}
function getRandomLetter(){
  let pool=[];
  LETTERS.forEach(o=>{for(let i=0;i<o.n;i++) pool.push(o.l)});
  // remove already used letters
  document.querySelectorAll('.tile,.fixed-tile').forEach(div=>{
    const idx=pool.indexOf(div.dataset.letter);
    if(idx>-1) pool.splice(idx,1);
  });
  return pool.length?pool[rand(pool.length)]:null;
}
function createTile(ch){
  const div=document.createElement('div');
  div.className='tile'; div.draggable=true;
  div.dataset.letter=ch; div.textContent=ch;
  const sm=document.createElement('small');sm.textContent=letterValue(ch);
  div.appendChild(sm);
  div.addEventListener('dragstart',e=>{
    e.dataTransfer.setData('text/plain','tile');
    draggedTile=div;
  });
  return div;
}
refillRack();

/* drag & drop on board/rack -------------------------------------- */
let draggedTile=null;
board.addEventListener('dragover',e=>e.preventDefault());
rack .addEventListener('dragover',e=>e.preventDefault());

board.addEventListener('drop',e=>{
  if(!draggedTile) return;
  const cell = e.target.closest('.cell');
  if(!cell || cell.children.length) return;
  cell.appendChild(draggedTile);
  rackTiles=rackTiles.filter(t=>t!==draggedTile);
  placedThisTurn.push(draggedTile);
  applyBonusTint(draggedTile,cell);
});

rack.addEventListener('drop',e=>{
  if(!draggedTile) return;
  if(rackTiles.includes(draggedTile)) return; // already in rack
  const emptySpot = [...rack.children].filter(c=>!c.firstChild)[0];
  if(!emptySpot) return;
  emptySpot.appendChild(draggedTile);
  removeBonusTint(draggedTile);
  rackTiles.push(draggedTile);
  placedThisTurn=placedThisTurn.filter(t=>t!==draggedTile);
});

/* submit turn ----------------------------------------------------- */
document.getElementById('submit-btn').onclick=()=>{
  if(!placedThisTurn.length){alert('Place tiles before submitting');return;}
  if(turnCount>=MAX_TURNS){alert('No turns left');return;}

  const words = collectWords();
  if(!words.length){alert('Tiles must connect to an existing word');return;}

  // dedupe same word (horizontal+vertical)
  const uniqueWords=[...new Set(words)];
  // filter out single-letter mains
  if(placedThisTurn.length===1){
    if(uniqueWords.length===1){alert('Word must be 2+ letters');return;}
    uniqueWords.shift();            // first elem is that single letter
  }

  // dictionary check
  const bad=uniqueWords.find(w=>!dictionary.includes(w.toLowerCase()));
  if(bad){alert('INVALID WORD: '+bad);return;}

  /* scoring */
  let turnScore=0, breakdown='';
  uniqueWords.forEach(w=>{
    const {pts,wordMult}=scoreWord(w);
    const total=pts*wordMult;
    turnScore+=total;
    breakdown+=`${w}: ${pts} × ${wordMult.toFixed(2)} = ${total}\n`;
  });

  // lock placed tiles
  placedThisTurn.forEach(t=>{t.classList.add('fixed-tile');t.classList.remove('tile')});
  placedThisTurn=[];
  turnCount++;
  totalScore+=turnScore;
  totalBox.textContent=totalScore;

  // append (not overwrite) detail box
  detailBox.textContent+=breakdown+'\n';

  refillRack();
};

/* helpers --------------------------------------------------------- */
function collectWords(){
  // returns array of words made/affected this turn (main first)
  const grid=[...Array(BOARD_SIZE)].map(()=>Array(BOARD_SIZE).fill(''));
  document.querySelectorAll('.cell').forEach((c,i)=>{
    if(c.dataset.letter) grid[Math.floor(i/BOARD_SIZE)][i%BOARD_SIZE]=c.dataset.letter;
  });
  const newCoords=placedThisTurn.map(t=>{
    const i=[...board.children].indexOf(t.parentElement);
    return {r:Math.floor(i/BOARD_SIZE),c:i%BOARD_SIZE};
  });
  // main direction
  const horiz = newCoords.every(({r})=>r===newCoords[0].r);
  const words=[];
  function scan(r,c,dr,dc){
    let word='', rr=r, cc=c;
    while(rr>=0&&rr<BOARD_SIZE&&cc>=0&&cc<BOARD_SIZE&&grid[rr][cc]){rr-=dr;cc-=dc}
    rr+=dr; cc+=dc;
    while(rr>=0&&rr<BOARD_SIZE&&cc>=0&&cc<BOARD_SIZE&&grid[rr][cc]){
      word+=grid[rr][cc]; rr+=dr; cc+=dc;
    }
    return word.length>1?word:'';
  }
  // main word
  const {r,c}=newCoords[0];
  words.push(scan(r,c,0,horiz?1:0));         // horizontal main if horiz
  // cross words
  newCoords.forEach(({r,c})=>{
    const w=scan(r,c,1,horiz?0:1); if(w) words.push(w);
  });
  return words;
}
function scoreWord(word){
  let pts=0, wordMult=1;
  // walk through tiles of the word
  [...word].forEach((ch,i)=>{
    // locate tile div
    const tile=[...document.querySelectorAll('.fixed-tile,.tile')]
               .find(t=>t.dataset.letter===ch && !t.scored);
    if(tile){ tile.scored=true; } // mark once per scoring pass
    const val=letterValue(ch); pts+=val;
    if(tile&&tile.parentElement){
      const idx=[...board.children].indexOf(tile.parentElement);
      const r=Math.floor(idx/BOARD_SIZE),c=idx%BOARD_SIZE;
      const bonus=bonusMap[`${r},${c}`];
      if(bonus){
        if(bonus.type==='letter') pts+=(val*(bonus.mult-1));
        else wordMult*=bonus.mult;
      }
    }
  });
  // clear 'scored' flag
  document.querySelectorAll('[scored]').forEach(t=>delete t.scored);
  return {pts,wordMult};
}
function letterValue(ch){
  return LETTERS.find(o=>o.l===ch).v;
}
function applyBonusTint(tile,cell){
  const idx=[...board.children].indexOf(cell);
  const r=Math.floor(idx/BOARD_SIZE),c=idx%BOARD_SIZE;
  const bonus=bonusMap[`${r},${c}`];
  if(bonus){
    tile.classList.add(bonus.mult===2? (bonus.type==='word'?'green2':'purple2'):
                       bonus.mult===1.5? (bonus.type==='word'?'green15':'purple3'):
                       bonus.mult===1.1? 'green1':'purple5');
  }
}
function removeBonusTint(tile){
  tile.classList.remove('green1','green15','green2','purple2','purple3','purple5');
}
