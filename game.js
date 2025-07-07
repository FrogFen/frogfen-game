/*  FrogFen – playable daily demo  (2024-07)  */
/*  Builds 11×11 board, bonus tiles, 5 starter words,
    weighted 15-tile rack, drag-drop, scoring + validation  */

const BOARD_SIZE = 11;

// ── DOM refs ─────────────────────────────────────────────
const boardEl   = document.getElementById('board');
const bankEl    = document.getElementById('letter-bank');
const submitBtn = document.getElementById('submit-btn');
const totalEl   = document.getElementById('total-score');
const detailBox = document.getElementById('detail-box');

// ── Data ────────────────────────────────────────────────
const dictionary     = new Set(window.dictionaryWords);   // from dictionary.js
const letterScores   = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,
                        M:3,N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};
const distribution   = "EEEEEEEEEEEEEEEEEEEEAAAAAAAIIIIIIIIIIOOOOOOOONNNNNNRRRRRRTTTTTTLLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

// PRNG seeded by current date so every player sees the same puzzle
function mulberry32(a) {
  return function() {
    let t = a += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const dateSeed  = new Date().toISOString().slice(0,10)
                    .split('').reduce((s,c)=>s + c.charCodeAt(0), 0);
const rand      = mulberry32(dateSeed);
const choice    = arr => arr[Math.floor(rand() * arr.length)];

// ── Build empty board ───────────────────────────────────
const boardCells = [];
for (let r = 0; r < BOARD_SIZE; r++) {
  for (let c = 0; c < BOARD_SIZE; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = r;
    cell.dataset.col = c;

    cell.ondragover = e => e.preventDefault();
    cell.ondrop = e => {
      const id = e.dataTransfer.getData('text');
      const tile = document.getElementById(id);
      if (!tile || cell.firstChild) return;
      cell.appendChild(tile);
    };

    boardEl.appendChild(cell);
    boardCells.push(cell);
  }
}

// ── Random bonus tiles ──────────────────────────────────
const bonusPlan = [
  ['word',   1.1, 5, 'green1'],
  ['word',   1.5, 3, 'green15'],
  ['word',     2, 1, 'green2'],
  ['letter',   2, 5, 'purple2'],
  ['letter',   3, 3, 'purple3'],
  ['letter',   5, 1, 'purple5']
];
const usedIdx = new Set();
bonusPlan.forEach(([type, mult, count, cls]) => {
  let placed = 0;
  while (placed < count) {
    const idx = Math.floor(rand() * boardCells.length);
    if (usedIdx.has(idx)) continue;
    usedIdx.add(idx);
    const cell = boardCells[idx];
    cell.dataset.bonusType = type;
    cell.dataset.bonusMult = mult;
    cell.classList.add(cls);
    const tag = document.createElement('span');
    tag.className = 'bonus';
    tag.textContent = type === 'word' ? `${mult}xW` : `${mult}xL`;
    cell.appendChild(tag);
    placed++;
  }
});

// ── Place 5 overlapping starter words ───────────────────
(function placeStarterWords() {
  const placed = [];

  function canPlace(word, r, c, dir) {
    if (dir === 'h') {
      if (c + word.length > BOARD_SIZE) return false;
      for (let i = 0; i < word.length; i++) {
        const cell = boardCells[r * BOARD_SIZE + c + i];
        if (cell.dataset.letter && cell.dataset.letter !== word[i]) return false;
      }
    } else {
      if (r + word.length > BOARD_SIZE) return false;
      for (let i = 0; i < word.length; i++) {
        const cell = boardCells[(r + i) * BOARD_SIZE + c];
        if (cell.dataset.letter && cell.dataset.letter !== word[i]) return false;
      }
    }
    return true;
  }

  function doPlace(word, r, c, dir) {
    for (let i = 0; i < word.length; i++) {
      const cell = dir === 'h'
        ? boardCells[r * BOARD_SIZE + c + i]
        : boardCells[(r + i) * BOARD_SIZE + c];
      cell.dataset.letter = word[i];
      cell.textContent    = word[i];
    }
  }

  // first word – horizontal centre
  const first = choice([...dictionary]).toUpperCase().slice(0, 8);
  const row   = Math.floor(BOARD_SIZE / 2);
  const col   = Math.floor((BOARD_SIZE - first.length) / 2);
  doPlace(first, row, col, 'h');
  placed.push({ word:first, row, col, dir:'h' });

  // attempt to place 4 more crossing words
  let tries = 0;
  while (placed.length < 5 && tries < 800) {
    const w   = choice([...dictionary]).toUpperCase().slice(0, 8);
    const dir = Math.random() < 0.5 ? 'h' : 'v';
    const anchor = Math.floor(rand() * w.length);
    const anchorLetter = w[anchor];

    const candidates = boardCells.filter(c => c.dataset.letter === anchorLetter);
    if (candidates.length === 0) { tries++; continue; }

    const target = choice(candidates);
    const tr = +target.dataset.row;
    const tc = +target.dataset.col;

    const startRow = dir === 'h' ? tr : tr - anchor;
    const startCol = dir === 'h' ? tc - anchor : tc;

    if (canPlace(w, startRow, startCol, dir)) {
      doPlace(w, startRow, startCol, dir);
      placed.push({ word:w, row:startRow, col:startCol, dir });
    }
    tries++;
  }
})();

// ── Build weighted 15-letter rack ───────────────────────
const rack = [];
while (rack.length < 15) rack.push(choice(distribution));

rack.forEach((ltr, i) => {
  const tile = document.createElement('div');
  tile.className  = 'tile';
  tile.id         = `tile-${i}`;
  tile.textContent = ltr;
  tile.draggable  = true;

  const small = document.createElement('small');
  small.textContent = letterScores[ltr];
  tile.appendChild(small);

  tile.ondragstart = e => e.dataTransfer.setData('text', tile.id);
  bankEl.appendChild(tile);
});

// ── Gameplay logic ──────────────────────────────────────
let turn  = 0;
let total = 0;

function activeTiles() {
  return [...boardEl.querySelectorAll('.tile')].filter(t => !t.dataset.locked);
}
function inStraightLine(tiles) {
  const rows = tiles.map(t => +t.parentElement.dataset.row);
  const cols = tiles.map(t => +t.parentElement.dataset.col);
  return rows.every(r => r === rows[0]) || cols.every(c => c === cols[0]);
}

submitBtn.onclick = () => {
  if (turn >= 3) { alert('No turns left'); return; }

  const tiles = activeTiles();
  if (tiles.length === 0) { alert('Place tiles'); return; }
  if (!inStraightLine(tiles)) { alert('Tiles must form a straight line'); return; }

  // sort tiles left-to-right or top-to-bottom
  tiles.sort((a, b) => {
    const ar = +a.parentElement.dataset.row, br = +b.parentElement.dataset.row;
    const ac = +a.parentElement.dataset.col, bc = +b.parentElement.dataset.col;
    return ar !== br ? ar - br : ac - bc;
  });

  const word = tiles.map(t => t.textContent).join('').toLowerCase();
  if (!dictionary.has(word)) { alert('INVALID WORD'); return; }

  let base = 0, wMult = 1;
  tiles.forEach(tile => {
    const cell = tile.parentElement;
    let score  = letterScores[tile.textContent];
    if (cell.dataset.bonusType === 'letter') score *= +cell.dataset.bonusMult;
    if (cell.dataset.bonusType === 'word')   wMult *= +cell.dataset.bonusMult;
    base += score;
  });
  const gained = Math.round(base * wMult);

  total += gained;
  totalEl.textContent = total;
  detailBox.textContent += `${word.toUpperCase()}: ${base} × ${wMult.toFixed(2)} = ${gained}\n`;

  tiles.forEach(t => t.dataset.locked = '1');
  turn++;
  if (turn === 3) alert('Game over! Total ' + total);
};
