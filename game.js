/*****************  CONFIG  ***********************************************/
const BOARD_SIZE = 10;
const START_TILES = 16;            // 2 rows of 8
const LETTERS = {
  A: [9,1], B:[2,3], C:[2,3], D:[4,2], E:[12,1], F:[2,4], G:[3,2], H:[2,4],
  I: [9,1], J:[1,8], K:[1,5], L:[4,1], M:[2,3], N:[6,1], O:[8,1], P:[2,3],
  Q:[1,10], R:[6,1], S:[4,1], T:[6,1], U:[4,1], V:[2,4], W:[2,4], X:[1,8],
  Y:[2,4], Z:[1,10]
};

/*****************  DOM refs  *********************************************/
const boardEl   = document.getElementById('board');
const rackEl    = document.getElementById('rack')  || createRack(); // guard
const submitBtn = document.getElementById('submit-btn');
const totalEl   = document.getElementById('total-score');
const detailBox = document.getElementById('detail-box');

/*****************  Globals  **********************************************/
let board  = [...Array(BOARD_SIZE)].map(()=>Array(BOARD_SIZE).fill(null));
let rack   = [];
let total  = 0;
const wordsScored = new Set();

/*****************  Helpers  **********************************************/
function rand(arr){return arr[Math.floor(Math.random()*arr.length)]}

/* Create rack element if it was missing (safety) */
function createRack(){
  const el=document.createElement('div');
  el.id='rack';
  document.body.insertBefore(el, submitBtn);
  return el;
}

/*****************  Board & bonus generation *****************************/
function genBonuses(){
  const picks=(n,type)=>Array.from({length:n},()=>({...rand(blankCoords()),type}));
  const blankCoords=()=>()=>[Math.floor(Math.random()*BOARD_SIZE),Math.floor(Math.random()*BOARD_SIZE)];
  return [
    ...picks(5,'w11'), picks(3,'w15'), picks(1,'w20'),
    ...picks(5,'l2'), picks(3,'l3'), picks(1,'l5')
  ];
}
function renderBoard(){
  boardEl.innerHTML='';
  boardEl.style.gridTemplateColumns=`repeat(${BOARD_SIZE}, 1fr)`;
  for(let r=0;r<BOARD_SIZE;r++){
    for(let c=0;c<BOARD_SIZE;c++){
      const cell=document.createElement('div');
      cell.className='cell';
      boardEl.appendChild(cell);
      board[r][c]={el:cell,tile:null,bonus:null};
    }
  }
  // bonuses
  genBonuses().forEach(([r,c,type])=>{
    const cell=board[r][c];
    cell.bonus=type;
    cell.el.classList.add(type);
    cell.el.innerHTML=`<span class="bonus">${type.replace(/\D+/,'')}${type[1]==='x'?'L':'W'}</span>`;
  });
}

/*****************  Seed words ********************************************/
function seed(){
  if(!window.dictionary){console.error('Dictionary missing');return;}
  const seedWords=[];
  let attempts=0;
  while(seedWords.length<5 && attempts<1000){
    attempts++;
    const word=rand(dictionary).toUpperCase();
    if(word.length>BOARD_SIZE||word.length<3) continue;
    // place horizontally random row
    const row=Math.floor(Math.random()*BOARD_SIZE);
    const col=Math.floor(Math.random()*(BOARD_SIZE-word.length));
    if(word.split('').every((ch,i)=>!board[row][col+i].tile)){
      word.split('').forEach((ch,i)=>{
        const cell=board[row][col+i];
        cell.tile={letter:ch,score:LETTERS[ch][1],seed:true};
      });
      seedWords.push(word);
    }
  }
}

/*****************  Rack **************************************************/
function populateRack(){
  rack.length=0; rackEl.innerHTML='';
  const letters=[];
  Object.entries(LETTERS).forEach(([ch,[count]])=>{
    for(let i=0;i<count;i++) letters.push(ch);
  });
  while(rack.length<START_TILES){
    const l=rand(letters);
    rack.push({letter:l,score:LETTERS[l][1]});
  }
  rack.forEach(t=>{
    const div=makeTile(t);
    div.draggable=true;
    div.classList.add('tile');
    rackEl.appendChild(div);
  });
}

/*****************  Tile DOM **********************************************/
function makeTile(t){
  const div=document.createElement('div');
  div.className='seed-tile';
  div.innerHTML=`<span class="letter">${t.letter}</span><span class="score">${t.score}</span>`;
  div.dataset.letter=t.letter; div.dataset.score=t.score;
  return div;
}

/*****************  Drag & drop *******************************************/
let dragSrc=null;
boardEl.addEventListener('dragstart',e=>{
  if(!e.target.classList.contains('tile')) return;
  dragSrc=e.target;
  e.dataTransfer.setData('text/plain','');
});
boardEl.addEventListener('dragover',e=>{
  if(e.target.classList.contains('cell')) e.preventDefault();
});
rackEl.addEventListener('dragover',e=>e.preventDefault());
boardEl.addEventListener('drop',e=>{
  if(!dragSrc) return;
  if(!e.target.classList.contains('cell')) return;
  const cellEl=e.target;
  const [r,c]=cellIndex(cellEl);
  placeTile(r,c,dragSrc);
});
rackEl.addEventListener('drop',e=>{
  if(!dragSrc) return;
  rackEl.appendChild(dragSrc);
  dragSrc.classList.remove('on-bonus-l','on-bonus-w');
});
function cellIndex(cellEl){
  const idx=[...boardEl.children].indexOf(cellEl);
  return [Math.floor(idx/BOARD_SIZE), idx%BOARD_SIZE];
}
function placeTile(r,c,tileEl){
  const cell=board[r][c];
  if(cell.tile) return;          // already occupied
  cell.tile={letter:tileEl.dataset.letter,score:+tileEl.dataset.score,div:tileEl};
  cell.el.appendChild(tileEl);
  // tint outline if bonus
  if(cell.bonus?.startsWith('l')) tileEl.classList.add('on-bonus-l');
  if(cell.bonus?.startsWith('w')) tileEl.classList.add('on-bonus-w');
}

/*****************  Submit logic ******************************************/
submitBtn.onclick=()=>{
  const newTiles=[];
  board.forEach((row,r)=>row.forEach((c,i)=>{
    if(c.tile && c.tile.div.parentElement===c.el && !c.tile.seed && !c.tile.locked){
      newTiles.push({r,i,letter:c.tile.letter,score:c.tile.score});
    }
  }));
  if(newTiles.length===0) return;
  // ensure straight line
  const rs=newTiles.map(t=>t.r), cs=newTiles.map(t=>t.i);
  const singleRow=new Set(rs).size===1, singleCol=new Set(cs).size===1;
  if(!(singleRow||singleCol)){alert('Tiles must be in a straight line');return;}

  // ensure touch existing seed OR previous locked tiles
  const touches=newTiles.some(t=>{
    const adj=[[0,1],[1,0],[-1,0],[0,-1]];
    return adj.some(([dr,dc])=>{
      const nr=t.r+dr,nc=t.i+dc;
      return board[nr]?.[nc]?.tile && (board[nr][nc].tile.seed||board[nr][nc].tile.locked);
    });
  });
  if(!touches){alert('Tiles must connect to an existing word');return;}

  // build words
  const words=getWords();
  if(words.length===0){alert('No valid word');return;}

  // if main word is 1-letter remove it
  if((singleRow||singleCol) && words[0].length===1){
    if(words.length===1){alert('Need 2+ letters');return;}
    words.shift();
  }

  // deduplicate
  const unique=words.filter((w,i)=>words.indexOf(w)===i && w.length>1);
  const invalid=unique.filter(w=>!dictionary.includes(w.toLowerCase()));
  if(invalid.length){alert('INVALID WORD: '+invalid.join(', '));return;}

  // score
  unique.forEach(word=>{
    if(wordsScored.has(word)) return;           // already scored earlier
    const {points,mult}=scoreWord(word);
    const pts=Math.round(points*mult);
    total+=pts;
    detailBox.innerHTML+=`${word}: ${points} × ${mult.toFixed(2)} = ${pts}<br>`;
    wordsScored.add(word);
  });
  totalEl.textContent=total;

  // lock tiles so they count as existing for next move
  newTiles.forEach(t=>board[t.r][t.i].tile.locked=true);
};

/*****************  Word finding & scoring ********************************/
function getWords(){
  const words=[];
  // horizontal
  for(let r=0;r<BOARD_SIZE;r++){
    let word='';
    for(let c=0;c<BOARD_SIZE;c++){
      const ch=board[r][c].tile?.letter||'';
      if(ch) word+=ch; else if(word){words.push(word);word='';}
    }
    if(word) words.push(word);
  }
  // vertical
  for(let c=0;c<BOARD_SIZE;c++){
    let word='';
    for(let r=0;r<BOARD_SIZE;r++){
      const ch=board[r][c].tile?.letter||'';
      if(ch) word+=ch; else if(word){words.push(word);word='';}
    }
    if(word) words.push(word);
  }
  return words;
}
function scoreWord(word){
  let pts=0, mult=1;
  outer:for(let r=0;r<BOARD_SIZE;r++)
    for(let c=0;c<BOARD_SIZE;c++){
      if(!board[r][c].tile) continue;
      if(getWordAt(r,c,'H')===word || getWordAt(r,c,'V')===word){
        const letters=word.split('');
        letters.forEach((ch,i)=>{
          const cell=(singleRow?board[rs[0]][Math.min(...cs)+i]
                    :singleCol?board[Math.min(...rs)+i][cs[0]]
                    :null) || findCell(ch,word,i);
          let lpts=LETTERS[ch][1];
          if(cell.bonus?.startsWith('l')) lpts*=+cell.bonus[0];
          pts+=lpts;
          if(cell.bonus?.startsWith('w')) mult*=parseFloat(cell.bonus)/1;
        });
        break outer;
      }
    }
  return {points:pts,mult};
}
function findCell(ch,word,i){
  // fallback search
  for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)
    if(board[r][c].tile?.letter===ch)return board[r][c];
}
function getWordAt(r,c,dir){
  let word='', rr=r, cc=c;
  while(rr>=0&&cc>=0&&board[rr][cc].tile){ dir==='H'?cc--:rr--; }
  rr++; cc++;
  while(rr<BOARD_SIZE&&cc<BOARD_SIZE&&board[rr][cc].tile){
    word+=board[rr][cc].tile.letter;
    dir==='H'?cc++:rr++;
  }
  return word;
}

/*****************  Init ***************************************************/
renderBoard();
seed();
board.forEach(row=>row.forEach(cell=>{
  if(cell.tile){
    const div=makeTile(cell.tile);
    div.classList.add('seed-tile');
    cell.el.appendChild(div);
  }
}));
populateRack();
