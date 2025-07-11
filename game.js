/*  FrogFen play-test  v0.5.0
    – 10×10 board, 16-tile rack, inline submit, tile tint, all fixes */

const SIZE = 10;

/* === DOM === */
const board   = document.getElementById('board');
const rackBox = document.getElementById('letter-bank');
const submit  = document.getElementById('submit-btn');
const totalEl = document.getElementById('total-score');
const detail  = document.getElementById('detail-box');

/* === Dictionary === */
const dict = new Set(window.dictionaryWords);   // provided by dictionary.js

/* === Letter points === */
const pts = {A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:5,L:1,M:3,
             N:1,O:1,P:3,Q:10,R:1,S:1,T:1,U:1,V:4,W:4,X:8,Y:4,Z:10};

/* === Tile bag (Scrabble-like weighted) === */
const bag = "EEEEEEEEEEEEEEEEEEAAAAAAIIIIIIIIIIOOOOOOONNNNNNRRRRRRTTTTTT"+
            "LLLLSSSSUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ";

/* === simple seeded RNG (changes every refresh) === */
let seed = Date.now();
function rng(){ seed = Math.imul(seed,16807) & 0xffffffff; return (seed>>>0)/2**32; }
const pick = str => str[Math.floor(rng()*str.length)];

/* ───────────────────────────────────────────────────────────── */
/* 1. Build empty grid                                           */
/* ───────────────────────────────────────────────────────────── */
const cells = [];
for (let r = 0; r < SIZE; r++) {
  for (let c = 0; c < SIZE; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = r;
    cell.dataset.col = c;

    cell.ondragover = e => e.preventDefault();
    cell.ondrop = e => {
      const id = e.dataTransfer.getData('text');
      if (!id) return;
      const tile = document.getElementById(id);
      if (!tile || tile.dataset.locked === '1' || cell.querySelector('.tile')) return;

      /* clear previous board cell */
      if (tile._prevCell && tile._prevCell !== cell) {
        delete tile._prevCell.dataset.letter;
        delete tile._prevCell.dataset.locked;
        tile._prevCell.innerHTML =
          tile._prevCell.querySelector('.bonus')?.outerHTML || '';
      }

      cell.appendChild(tile);
      cell.dataset.letter = tile.dataset.letter;
      tile._prevCell = cell;
      tintTile(tile, cell);          // colour to match bonus
    };

    board.appendChild(cell);
    cells.push(cell);
  }
}

/* ───────────────────────────────────────────────────────────── */
/* 2. Bonus squares                                              */
/* ───────────────────────────────────────────────────────────── */
const bonusPlan = [
  ['word', 1.1, 5, 'green1'],
  ['word', 1.5, 3, 'green15'],
  ['word', 2,   1, 'green2'],
  ['letter', 2, 5, 'purple2'],
  ['letter', 3, 3, 'purple3'],
  ['letter', 5, 1, 'purple5']
];

const used = new Set();
bonusPlan.forEach(([type, mult, num, cls]) => {
  let placed = 0;
  while (placed < num) {
    const idx = Math.floor(rng() * cells.length);
    if (used.has(idx)) continue;
    used.add(idx);

    const cell = cells[idx];
    cell.dataset.bonusType  = type;
    cell.dataset.bonusMult  = mult;
    cell.classList.add(cls);

    const tag = document.createElement('span');
    tag.className = 'bonus';
    tag.textContent = type === 'word' ? `${mult}xW` : `${mult}xL`;
    cell.appendChild(tag);

    placed++;
  }
});

/* helper: colour a tile to match the bonus cell */
function tintTile(tile, cell) {
  tile.classList.remove(
    'green1','green15','green2','purple2','purple3','purple5'
  );
  if (cell && cell.dataset.bonusType) {
    ['green1','green15','green2','purple2','purple3','purple5']
      .forEach(cls => {
        if (cell.classList.contains(cls)) tile.classList.add(cls);
      });
  }
}

/* ───────────────────────────────────────────────────────────── */
/* 3. Seed 5 starter words (same algorithm as earlier builds)    */
/* ───────────────────────────────────────────────────────────── */
(function seedStarters() {

  /* returns a Set of every horizontal/vertical word currently on board */
  function scanBoard() {
    const out = new Set();

    // horizontal
    for (let r = 0; r < SIZE; r++) {
      let w = '';
      for (let c = 0; c < SIZE; c++) {
        const ch = cells[r * SIZE + c].dataset.letter;
        if (ch) w += ch;
        else { if (w.length > 1) out.add(w.toLowerCase()); w = ''; }
      }
      if (w.length > 1) out.add(w.toLowerCase());
    }

    // vertical
    for (let c = 0; c < SIZE; c++) {
      let w = '';
      for (let r = 0; r < SIZE; r++) {
        const ch = cells[r * SIZE + c].dataset.letter;
        if (ch) w += ch;
        else { if (w.length > 1) out.add(w.toLowerCase()); w = ''; }
      }
      if (w.length > 1) out.add(w.toLowerCase());
    }

    return out;
  }

  /* draw a fixed starter word */
  function draw(word, r, c, dir) {
    for (let i = 0; i < word.length; i++) {
      const cell = dir === 'h'
        ? cells[r * SIZE + c + i]
        : cells[(r + i) * SIZE + c];

      cell.dataset.letter = word[i];
      cell.dataset.locked = '1';

      const div = document.createElement('div');
      div.className = 'fixed-tile';
      div.dataset.letter = word[i];
      div.textContent = word[i];

      const sm = document.createElement('small');
      sm.textContent = pts[word[i]];
      div.appendChild(sm);

      cell.innerHTML = '';
      cell.appendChild(div);
    }
  }

  let placed = 0, tries = 0;
  const mid = Math.floor(SIZE / 2);

  while (placed < 5 && tries < 1200) {

    /* first word: horizontal across middle row */
    if (placed === 0) {
      const w = pick([...dict]).toUpperCase().slice(0, 8);
      draw(w, mid, Math.floor((SIZE - w.length) / 2), 'h');
      placed++; tries++; continue;
    }

    /* subsequent words */
    const word = pick([...dict]).toUpperCase().slice(0, 8);
    const dir  = rng() < 0.5 ? 'h' : 'v';
    const anchor = Math.floor(rng() * word.length);

    const anchorCells = cells.filter(c => c.dataset.letter === word[anchor]);
    if (!anchorCells.length) { tries++; continue; }

    const tgt = anchorCells[Math.floor(rng() * anchorCells.length)];
    const sr  = dir === 'h' ? +tgt.dataset.row : +tgt.dataset.row - anchor;
    const sc  = dir === 'h' ? +tgt.dataset.col - anchor : +tgt.dataset.col;

    // bounds & collision check
    let fits = true;
    if (dir === 'h') {
      if (sc < 0 || sc + word.length > SIZE) fits = false;
      else for (let i = 0; i < word.length; i++) {
        const cl = cells[sr * SIZE + sc + i];
        if (cl.dataset.letter && cl.dataset.letter !== word[i]) { fits = false; break; }
      }
    } else {
      if (sr < 0 || sr + word.length > SIZE) fits = false;
      else for (let i = 0; i < word.length; i++) {
        const cl = cells[(sr + i) * SIZE + sc];
        if (cl.dataset.letter && cl.dataset.letter !== word[i]) { fits = false; break; }
      }
    }
    if (!fits) { tries++; continue; }

    const temp = [];
    for (let i = 0; i < word.length; i++) {
      const cl = dir === 'h' ? cells[sr * SIZE + sc + i] : cells[(sr + i) * SIZE + sc];
      if (!cl.dataset.letter) { cl.dataset.letter = word[i]; temp.push(cl); }
    }

    if ([...scanBoard()].some(w => !dict.has(w))) {
      temp.forEach(c => delete c.dataset.letter);     // rollback
    } else {
      draw(word, sr, sc, dir);
      placed++;
    }

    tries++;
  }
})();

/* ───────────────────────────────────────────────────────────── */
/* 4. Build 16-tile rack                                         */
/* ───────────────────────────────────────────────────────────── */
for (let i = 0; i < 16; i++) {
  const L = pick(bag);

  const tile = document.createElement('div');
  tile.className = 'tile';
  tile.id = 't' + i;
  tile.dataset.letter = L;
  tile.textContent = L;
  tile.draggable = true;

  const sm = document.createElement('small');
  sm.textContent = pts[L];
  tile.appendChild(sm);

  tile.ondragstart = e => e.dataTransfer.setData('text', tile.id);

  /* swap inside rack */
  tile.ondragover = e => e.preventDefault();
  tile.ondrop = e => {
    const id = e.dataTransfer.getData('text');
    const drag = document.getElementById(id);
    if (!drag || drag.dataset.locked === '1' || drag === tile) return;

    rackBox.insertBefore(drag, tile);

    if (drag._prevCell) {
      delete drag._prevCell.dataset.letter;
      delete drag._prevCell.dataset.locked;
      drag._prevCell.innerHTML =
        drag._prevCell.querySelector('.bonus')?.outerHTML || '';
      tintTile(drag, null);
      drag._prevCell = null;
    }
  };

  rackBox.appendChild(tile);
}

/* allow drop onto empty rack space */
rackBox.ondragover = e => e.preventDefault();
rackBox.ondrop = e => {
  const id = e.dataTransfer.getData('text');
  const tile = document.getElementById(id);
  if (!tile || tile.dataset.locked === '1') return;

  rackBox.appendChild(tile);
  if (tile._prevCell) {
    delete tile._prevCell.dataset.letter;
    delete tile._prevCell.dataset.locked;
    tile._prevCell.innerHTML =
      tile._prevCell.querySelector('.bonus')?.outerHTML || '';
    tintTile(tile, null);
    tile._prevCell = null;
  }
};

/* ───────────────────────────────────────────────────────────── */
/* 5. Gameplay                                                   */
/* ───────────────────────────────────────────────────────────── */
const collect = (r, c, dr, dc) => {
  const arr = [];
  while (
    r >= 0 && r < SIZE && c >= 0 && c < SIZE &&
    cells[r * SIZE + c].dataset.letter
  ) {
    arr.push(cells[r * SIZE + c]);
    r += dr; c += dc;
  }
  return arr;
};

const inline = ts => {
  const rs = ts.map(t => +t.parentElement.dataset.row);
  const cs = ts.map(t => +t.parentElement.dataset.col);
  return rs.every(v => v === rs[0]) || cs.every(v => v === cs[0]);
};

const active = () => [...board.querySelectorAll('.tile')].filter(t => !t.dataset.locked);

let turn = 0, total = 0;

submit.onclick = () => {
  if (turn >= 3) { alert('No turns left'); return; }

  const nt = active();
  if (!nt.length)            { alert('Place tiles'); return; }
  if (!inline(nt))           { alert('Tiles must form a straight line'); return; }

  /* adjacency check (after first turn) */
  if (turn > 0 && !nt.some(t => {
    const r = +t.parentElement.dataset.row, c = +t.parentElement.dataset.col;
    return [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([rr,cc]) =>
      rr>=0 && rr<SIZE && cc>=0 && cc<SIZE &&
      cells[rr * SIZE + cc].dataset.locked === '1');
  })) {
    alert('Tiles must connect to an existing word');
    return;
  }

  /* rebuild all words that include at least one new tile */
  const words = [];
  for (const t of nt) {
    const r = +t.parentElement.dataset.row, c = +t.parentElement.dataset.col;

    const horiz = collect(r, c, 0, -1).reverse().concat(collect(r, c + 1, 0, 1));
    if (horiz.length > 1 && !words.some(w => w.cells === horiz))
      words.push({ cells: horiz, word: horiz.map(x => x.dataset.letter).join('').toLowerCase() });

    const vert  = collect(r, c, -1, 0).reverse().concat(collect(r + 1, c, 1, 0));
    if (vert.length > 1 && !words.some(w => w.cells === vert))
      words.push({ cells: vert,  word: vert.map(x => x.dataset.letter).join('').toLowerCase() });
  }

  if (!words.length) {
    alert('You must create at least one word of 2+ letters'); return;
  }

  /* validate words */
  for (const { word } of words) {
    if (!dict.has(word)) { alert(`INVALID WORD: ${word.toUpperCase()}`); return; }
  }

  /* scoring */
  let gained = 0;
  detail.textContent = '';
  for (const { cells: wc, word } of words) {
    let base = 0, mult = 1;
    wc.forEach(cell => {
      let p = pts[cell.dataset.letter];
      const fresh = !cell.dataset.locked;
      if (fresh && cell.dataset.bonusType === 'letter') p *= +cell.dataset.bonusMult;
      if (fresh && cell.dataset.bonusType === 'word')   mult *= +cell.dataset.bonusMult;
      base += p;
    });
    const sub = Math.round(base * mult);
    gained += sub;
    detail.textContent += `${word.toUpperCase()}: ${base} × ${mult.toFixed(2)} = ${sub}\n`;
  }

  total += gained;
  totalEl.textContent = total;

  /* lock new tiles */
  nt.forEach(t => {
    t.dataset.locked = '1';
    t.parentElement.dataset.locked = '1';
  });

  if (++turn === 3) alert('Game over!  Total ' + total);
};
