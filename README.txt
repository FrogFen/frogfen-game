
FrogFen Demo (v0.1)
===================

Files
-----
index.html   : Main page structure.
style.css    : Responsive mobile-first styling with board, tiles, bonus colours.
dictionary.js: 3,000‑word English list stored as window.dictionaryWords (no fetch needed).
game.js      : All game logic (seeded board, bonuses, rack, drag‑drop, scoring).
CHANGELOG.md : Version history.

Key Functions
-------------
• Seed: The current date (YYYY‑MM‑DD) feeds a Mulberry32 PRNG so every player
  sees the same starter words, bonus layout, and rack.

• Board build:
  - 11×11 grid of .cell divs.
  - Random bonus tiles (word & letter multipliers) coloured green/purple.
  - Starter words: first horizontal in centre, then up to 4 more words placed
    crossing existing letters if space allows.

• Drag‑and‑drop:
  - Each .tile is draggable from Letter Bank to board and back (if cell empty).
  - Tiles remain movable until successfully submitted.

• Validation:
  - Word must be in straight line (row OR column).
  - Word (lower‑case) must be in dictionary Set.

• Scoring:
  - Base Scrabble letter points → apply per‑letter bonuses → apply word
    multipliers → placeholder Context ×1.0.
  - Total score updates; detail box logs breakdown.

• Turn system:
  - 3 submissions max. On 3rd valid word, game ends with alert.

Next Steps
----------
1. Replace simple starter‑word algorithm with robust crossword‑style placement.
2. Add outline colour change on tile drop to indicate bonus.
3. Daily star rating & shareable result.
4. Context multiplier via OpenAI API.
5. GitHub Actions CI to lint and deploy.
