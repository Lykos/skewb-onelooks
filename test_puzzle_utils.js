#!/usr/bin/env node
/**
 * test_puzzle_utils.js — Unit tests for puzzle_utils.js
 *
 * Role: Tests every exported symbol from puzzle_utils.js in isolation — no
 * dependency on app.js, server.js, or any data files. Covers:
 *   - Shared utilities: invMove, solve (generic BFS), areOppositeColors,
 *     cleanupPath, cleanupSkewbPath
 *   - 2×2 simulation: Cube2x2, getCube2x2Colors, sticker helpers, move
 *     inversibility, order-4 move law, state recognition, scramble generators
 *   - Skewb simulation: Skewb, getSkewbColors, sticker helpers, move
 *     inversibility, order-3 move law, state recognition, scramble generators
 *   - Skewb Anki hint analysis: getAnkiCaseForSkewb
 *
 * Run with: node test_puzzle_utils.js
 */
'use strict';

const assert = require('assert');
const {
  // Shared utilities
  invMove,
  solve,
  areOppositeColors,
  cleanupPath,
  cleanupSkewbPath,
  // 2x2 simulation
  CORNER_VECS,
  FACE_CENTER_COLORS_2X2,
  CUBE2X2_ALLOWED_MOVES,
  Cube2x2,
  getCube2x2Colors,
  getStickerColorOnFace,
  get2x2StickerColor,
  getStickerFace,
  isCorner2x2Solved,
  isDiagonalPairSolved,
  check2x2EasyState,
  generateRandom2x2State,
  generateEasy2x2State,
  getNormal2x2Scramble,
  getEasy2x2Scramble,
  // Skewb simulation
  SKEWB_CORNER_VECS,
  SKEWB_FACE_CORNER_MAP,
  SKEWB_DIAGONAL_PAIRS,
  SKEWB_ALLOWED_MOVES,
  Skewb,
  getSkewbStickerColor,
  getSkewbColors,
  getSkewbStickerColorOnFace,
  // Skewb state recognition
  isCornerSolved,
  isSkewbDiagonalPairSolved,
  checkSkewbEasyState,
  hasEasySkewb,
  // Skewb scramble generators
  generateEasySkewbState,
  getNormalSkewbScramble,
  getEasySkewbScramble,
  // Anki hint
  getAnkiCaseForSkewb,
} = require('./puzzle_utils.js');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function section(name) {
  console.log(`\n── ${name} ──`);
}


// ==========================================
// SHARED UTILITIES
// ==========================================

section('invMove');

test("U  → U'", () => assert.strictEqual(invMove("U"), "U'"));
test("U' → U",  () => assert.strictEqual(invMove("U'"), "U"));
test("U2 → U2", () => assert.strictEqual(invMove("U2"), "U2"));
test("R  → R'", () => assert.strictEqual(invMove("R"), "R'"));
test("B' → B",  () => assert.strictEqual(invMove("B'"), "B"));
test("F2 → F2", () => assert.strictEqual(invMove("F2"), "F2"));


section('areOppositeColors');

test('white ↔ yellow',   () => { assert.ok(areOppositeColors('white', 'yellow')); assert.ok(areOppositeColors('yellow', 'white')); });
test('green ↔ blue',     () => { assert.ok(areOppositeColors('green', 'blue')); assert.ok(areOppositeColors('blue', 'green')); });
test('red ↔ orange',     () => { assert.ok(areOppositeColors('red', 'orange')); assert.ok(areOppositeColors('orange', 'red')); });
test('non-opposite → false', () => {
  assert.ok(!areOppositeColors('white', 'green'));
  assert.ok(!areOppositeColors('red', 'blue'));
  assert.ok(!areOppositeColors('white', 'white'));
});


section('cleanupPath (2x2 / order-4 moves)');

test("R R' → []",    () => assert.deepStrictEqual(cleanupPath(["R", "R'"]), []));
test("R R  → R2",   () => assert.deepStrictEqual(cleanupPath(["R", "R"]), ["R2"]));
test("R2 R2 → []",  () => assert.deepStrictEqual(cleanupPath(["R2", "R2"]), []));
test("R R R → R'",  () => assert.deepStrictEqual(cleanupPath(["R", "R", "R"]), ["R'"]));
test("R R R R → []", () => assert.deepStrictEqual(cleanupPath(["R", "R", "R", "R"]), []));
test('different faces not merged', () => assert.deepStrictEqual(cleanupPath(["R", "U"]), ["R", "U"]));
test('cascading: R R\' U U → U2', () => assert.deepStrictEqual(cleanupPath(["R", "R'", "U", "U"]), ["U2"]));


section('cleanupSkewbPath (Skewb / order-3 moves)');

test("R R' → []",   () => assert.deepStrictEqual(cleanupSkewbPath(["R", "R'"]), []));
test("R R  → R'",  () => assert.deepStrictEqual(cleanupSkewbPath(["R", "R"]), ["R'"]));
test("R R R → []", () => assert.deepStrictEqual(cleanupSkewbPath(["R", "R", "R"]), []));
test("R' R' → R",  () => assert.deepStrictEqual(cleanupSkewbPath(["R'", "R'"]), ["R"]));
test('different faces not merged', () => assert.deepStrictEqual(cleanupSkewbPath(["R", "U"]), ["R", "U"]));
test('cascading: R R\' U U → U\'', () => assert.deepStrictEqual(cleanupSkewbPath(["R", "R'", "U", "U"]), ["U'"]));


section('solve — generic BFS (tested with both puzzles)');

test('Cube2x2: already solved returns []', () => {
  const result = solve(new Cube2x2(), new Cube2x2(), CUBE2X2_ALLOWED_MOVES);
  assert.deepStrictEqual(result, []);
});

test('Cube2x2: 3-move scramble solved in ≤3 moves', () => {
  const allowed = CUBE2X2_ALLOWED_MOVES;
  const target = new Cube2x2().move("R").move("U'").move("F");
  const sol = solve(new Cube2x2(), target, allowed);
  assert.ok(sol !== null && sol.length <= 3, `Expected ≤3, got ${sol && sol.length}`);
  const check = new Cube2x2();
  for (const m of sol) check.move(m);
  assert.strictEqual(check.getKey(), target.getKey());
});

test('Skewb: already solved returns []', () => {
  const result = solve(new Skewb(), new Skewb(), SKEWB_ALLOWED_MOVES);
  assert.deepStrictEqual(result, []);
});

test('Skewb: 3-move scramble solved in ≤3 moves', () => {
  const target = new Skewb().move("R").move("U'").move("L");
  const sol = solve(new Skewb(), target, SKEWB_ALLOWED_MOVES);
  assert.ok(sol !== null && sol.length <= 3, `Expected ≤3, got ${sol && sol.length}`);
  const check = new Skewb();
  for (const m of sol) check.move(m);
  assert.strictEqual(check.getKey(), target.getKey());
});


// ==========================================
// 2×2 CUBE
// ==========================================

section('Cube2x2 — basic state');

test('new Cube2x2() is solved', () => assert.ok(new Cube2x2().isSolved()));
test('getKey() stable on solved', () => assert.strictEqual(new Cube2x2().getKey(), new Cube2x2().getKey()));
test('clone() is independent', () => {
  const orig = new Cube2x2();
  orig.clone().move("R");
  assert.ok(orig.isSolved(), 'Original must not be affected by clone mutation');
});
test('getKey() changes after move', () => {
  const s = new Cube2x2();
  const before = s.getKey();
  s.move("U");
  assert.notStrictEqual(s.getKey(), before);
});


section('Cube2x2 — move inversibility');

for (const face of ["U", "R", "F"]) {
  for (const suf of ["", "'", "2"]) {
    const m = face + suf;
    const inv = invMove(m);
    test(`${m} then ${inv} = solved`, () => {
      const s = new Cube2x2().move(m).move(inv);
      assert.ok(s.isSolved());
    });
  }
}


section('Cube2x2 — move order 4');

for (const m of CUBE2X2_ALLOWED_MOVES) {
  test(`${m}×4 = identity`, () => {
    const s = new Cube2x2().move(m).move(m).move(m).move(m);
    assert.ok(s.isSolved(), `${m}×4 should be identity`);
  });
}


section('getCube2x2Colors (solved)');

test('U face is all white',  () => { const c = getCube2x2Colors(new Cube2x2()); assert.ok(c.U.every(x => x === 'white')); });
test('D face is all yellow', () => { const c = getCube2x2Colors(new Cube2x2()); assert.ok(c.D.every(x => x === 'yellow')); });
test('F face is all green',  () => { const c = getCube2x2Colors(new Cube2x2()); assert.ok(c.F.every(x => x === 'green')); });
test('B face is all blue',   () => { const c = getCube2x2Colors(new Cube2x2()); assert.ok(c.B.every(x => x === 'blue')); });
test('R face is all red',    () => { const c = getCube2x2Colors(new Cube2x2()); assert.ok(c.R.every(x => x === 'red')); });
test('L face is all orange', () => { const c = getCube2x2Colors(new Cube2x2()); assert.ok(c.L.every(x => x === 'orange')); });
test('Each face has 4 stickers', () => {
  const c = getCube2x2Colors(new Cube2x2());
  for (const f of ['U','D','F','B','L','R']) assert.strictEqual(c[f].length, 4);
});


section('2x2 sticker helpers');

test('get2x2StickerColor: UFR(1) y-sticker = white', () => assert.strictEqual(get2x2StickerColor(1, 0), 'white'));
test('get2x2StickerColor: UFR(1) z-sticker = green', () => assert.strictEqual(get2x2StickerColor(1, 1), 'green'));
test('get2x2StickerColor: UFR(1) x-sticker = red',   () => assert.strictEqual(get2x2StickerColor(1, 2), 'red'));
test('get2x2StickerColor: DBL(7) y-sticker = yellow', () => assert.strictEqual(get2x2StickerColor(7, 0), 'yellow'));
test('get2x2StickerColor: DBL(7) x-sticker = orange', () => assert.strictEqual(get2x2StickerColor(7, 2), 'orange'));

test('getStickerFace: [0,1,0] → U',  () => assert.strictEqual(getStickerFace([0, 1, 0]),  'U'));
test('getStickerFace: [0,-1,0] → D', () => assert.strictEqual(getStickerFace([0,-1, 0]),  'D'));
test('getStickerFace: [1,0,0] → R',  () => assert.strictEqual(getStickerFace([1,  0, 0]),  'R'));
test('getStickerFace: [-1,0,0] → L', () => assert.strictEqual(getStickerFace([-1, 0, 0]),  'L'));

test('getStickerColorOnFace: UFR(1) U-face = white', () => assert.strictEqual(getStickerColorOnFace(new Cube2x2(), 1, 'U'), 'white'));
test('getStickerColorOnFace: UFR(1) F-face = green', () => assert.strictEqual(getStickerColorOnFace(new Cube2x2(), 1, 'F'), 'green'));
test('getStickerColorOnFace: DBL(7) D-face = yellow', () => assert.strictEqual(getStickerColorOnFace(new Cube2x2(), 7, 'D'), 'yellow'));


section('isCorner2x2Solved');

test('All 8 corners solved in new Cube2x2', () => {
  const c = new Cube2x2();
  for (let p = 0; p < 8; p++) assert.ok(isCorner2x2Solved(c, p), `Pos ${p} should be solved`);
});
test('After R, at least one corner unsolved', () => {
  const c = new Cube2x2().move("R");
  assert.ok(![0,1,2,3,4,5,6,7].every(p => isCorner2x2Solved(c, p)));
});


section('check2x2EasyState');

test('Result of generateEasy2x2State passes adjacent check', () => {
  assert.ok(check2x2EasyState(generateEasy2x2State('adjacent', 'white'), 'adjacent', 'white'));
});
test('Result of generateEasy2x2State passes diagonal check', () => {
  assert.ok(check2x2EasyState(generateEasy2x2State('diagonal', 'any'), 'diagonal', 'any'));
});


section('getNormal2x2Scramble');

const VALID_2X2 = new Set(CUBE2X2_ALLOWED_MOVES);

test('Returns string',            () => assert.strictEqual(typeof getNormal2x2Scramble(), 'string'));
test('Has 11 moves',              () => assert.strictEqual(getNormal2x2Scramble().split(' ').length, 11));
test('All moves valid',           () => {
  for (const m of getNormal2x2Scramble().split(' ')) assert.ok(VALID_2X2.has(m), `Bad move: ${m}`);
});
test('No consecutive same face',  () => {
  const moves = getNormal2x2Scramble().split(' ');
  for (let i = 0; i < moves.length - 1; i++) {
    assert.notStrictEqual(moves[i][0], moves[i+1][0], `Same-face at ${i}`);
  }
});


section('getEasy2x2Scramble');

test('Returns string',                  () => assert.strictEqual(typeof getEasy2x2Scramble(), 'string'));
test('Has 9–12 moves',                  () => {
  const len = getEasy2x2Scramble().split(' ').length;
  assert.ok(len >= 9 && len <= 12, `Length ${len} out of range`);
});
test('All moves valid',                 () => {
  for (const m of getEasy2x2Scramble().split(' ')) assert.ok(VALID_2X2.has(m));
});
test('Applying scramble yields easy state', () => {
  const scr = getEasy2x2Scramble('adjacent', 'white');
  const cube = new Cube2x2();
  for (const m of scr.split(' ')) cube.move(m);
  assert.ok(check2x2EasyState(cube, 'adjacent', 'white'));
});


// ==========================================
// SKEWB
// ==========================================

section('Skewb — basic state');

test('new Skewb() is solved',         () => assert.ok(new Skewb().isSolved()));
test('getKey() stable on solved',      () => assert.strictEqual(new Skewb().getKey(), new Skewb().getKey()));
test('clone() is independent',         () => {
  const orig = new Skewb();
  orig.clone().move("R");
  assert.ok(orig.isSolved());
});
test('getKey() changes after move',    () => {
  const s = new Skewb();
  const before = s.getKey();
  s.move("U");
  assert.notStrictEqual(s.getKey(), before);
});


section('Skewb — move inversibility');

for (const base of ["U", "R", "L", "B"]) {
  test(`${base} then ${base}' = solved`, () => assert.ok(new Skewb().move(base).move(base + "'").isSolved()));
  test(`${base}' then ${base} = solved`, () => assert.ok(new Skewb().move(base + "'").move(base).isSolved()));
}


section('Skewb — move order 3');

for (const m of SKEWB_ALLOWED_MOVES) {
  test(`${m}×3 = identity`, () => {
    assert.ok(new Skewb().move(m).move(m).move(m).isSolved(), `${m}×3 should be identity`);
  });
}


section('getSkewbStickerColor');

test('URF(0) sticker 0 = white',  () => assert.strictEqual(getSkewbStickerColor(0, 0), 'white'));
test('URF(0) sticker 1 = green',  () => assert.strictEqual(getSkewbStickerColor(0, 1), 'green'));
test('URF(0) sticker 2 = red',    () => assert.strictEqual(getSkewbStickerColor(0, 2), 'red'));
test('DFL(7) sticker 0 = yellow', () => assert.strictEqual(getSkewbStickerColor(7, 0), 'yellow'));
test('DFL(7) sticker 1 = green',  () => assert.strictEqual(getSkewbStickerColor(7, 1), 'green'));
test('DFL(7) sticker 2 = orange', () => assert.strictEqual(getSkewbStickerColor(7, 2), 'orange'));


section('getSkewbColors (solved)');

test('U center = white',       () => assert.strictEqual(getSkewbColors(new Skewb()).U.center, 'white'));
test('D center = yellow',      () => assert.strictEqual(getSkewbColors(new Skewb()).D.center, 'yellow'));
test('All U corners = white',  () => {
  const c = getSkewbColors(new Skewb()).U.corners;
  for (const [, col] of Object.entries(c)) assert.strictEqual(col, 'white');
});
test('All R corners = red',    () => {
  const c = getSkewbColors(new Skewb()).R.corners;
  for (const [, col] of Object.entries(c)) assert.strictEqual(col, 'red');
});


section('getSkewbStickerColorOnFace (solved)');

test('URF(0) U-face = white',  () => assert.strictEqual(getSkewbStickerColorOnFace(new Skewb(), 0, 'U'), 'white'));
test('URF(0) F-face = green',  () => assert.strictEqual(getSkewbStickerColorOnFace(new Skewb(), 0, 'F'), 'green'));
test('URF(0) R-face = red',    () => assert.strictEqual(getSkewbStickerColorOnFace(new Skewb(), 0, 'R'), 'red'));
test('DBL(6) D-face = yellow', () => assert.strictEqual(getSkewbStickerColorOnFace(new Skewb(), 6, 'D'), 'yellow'));


section('isCornerSolved (Skewb)');

test('All 8 corners solved in new Skewb', () => {
  const s = new Skewb();
  for (let p = 0; p < 8; p++) assert.ok(isCornerSolved(s, p), `Pos ${p} should be solved`);
});
test('After R, at least one corner unsolved', () => {
  const s = new Skewb().move("R");
  assert.ok(![0,1,2,3,4,5,6,7].every(p => isCornerSolved(s, p)));
});


section('checkSkewbEasyState');

test('Easy adjacent/white state passes check', () => {
  const s = generateEasySkewbState('adjacent', 'white');
  assert.ok(checkSkewbEasyState(s, 'adjacent', 'white'));
});
test('Easy diagonal/any state passes check', () => {
  const s = generateEasySkewbState('diagonal', 'any');
  assert.ok(checkSkewbEasyState(s, 'diagonal', 'any'));
});
test('hasEasySkewb matches checkSkewbEasyState(adjacent, white)', () => {
  const s = generateEasySkewbState('adjacent', 'white');
  assert.strictEqual(hasEasySkewb(s), checkSkewbEasyState(s, 'adjacent', 'white'));
});


section('getNormalSkewbScramble');

const VALID_SKEWB = new Set(SKEWB_ALLOWED_MOVES);

test('Returns string',            () => assert.strictEqual(typeof getNormalSkewbScramble(), 'string'));
test('Has 10 moves',              () => assert.strictEqual(getNormalSkewbScramble().split(' ').length, 10));
test('All moves valid',           () => {
  for (const m of getNormalSkewbScramble().split(' ')) assert.ok(VALID_SKEWB.has(m), `Bad move: ${m}`);
});
test('No consecutive same face',  () => {
  const moves = getNormalSkewbScramble().split(' ');
  for (let i = 0; i < moves.length - 1; i++) {
    assert.notStrictEqual(moves[i][0], moves[i+1][0], `Same-face at ${i}`);
  }
});


section('getEasySkewbScramble');

test('Returns { scramble, state }',            () => {
  const r = getEasySkewbScramble();
  assert.strictEqual(typeof r.scramble, 'string');
  assert.ok(r.state instanceof Skewb);
});
test('Scramble has ≥7 moves',                  () => {
  assert.ok(getEasySkewbScramble().scramble.split(' ').length >= 7);
});
test('All moves valid',                        () => {
  for (const m of getEasySkewbScramble().scramble.split(' ')) assert.ok(VALID_SKEWB.has(m));
});
test('Applying scramble to solved → state',    () => {
  const r = getEasySkewbScramble();
  const check = new Skewb();
  for (const m of r.scramble.split(' ')) check.move(m);
  assert.strictEqual(check.getKey(), r.state.getKey());
});
test('Returned state passes checkSkewbEasyState', () => {
  const r = getEasySkewbScramble('adjacent', 'white');
  assert.ok(checkSkewbEasyState(r.state, 'adjacent', 'white'));
});


section('getAnkiCaseForSkewb');

test('Returns null for fully solved Skewb', () => {
  assert.strictEqual(getAnkiCaseForSkewb(new Skewb()), null);
});
test('Returns valid case for easy state', () => {
  const r = getEasySkewbScramble('adjacent', 'white');
  const c = getAnkiCaseForSkewb(r.state);
  assert.ok(c !== null);
  assert.ok(c.caseType === '2_adjacent_solved' || c.caseType === '3_solved');
  assert.ok(typeof c.slotU === 'string' && c.slotU.length === 1);
  assert.ok(typeof c.whichFace === 'string');
  assert.ok(typeof c.pairFace === 'string');
});
test('3_solved has slotW=null', () => {
  let found = null;
  for (let i = 0; i < 50 && !found; i++) {
    const r = getEasySkewbScramble();
    const c = getAnkiCaseForSkewb(r.state);
    if (c && c.caseType === '3_solved') found = c;
  }
  if (!found) { console.log('    ⚠ Could not generate 3_solved in 50 tries — skipping'); return; }
  assert.strictEqual(found.slotW, null);
});
test('2_adjacent_solved has string slotW', () => {
  let found = null;
  for (let i = 0; i < 50 && !found; i++) {
    const r = getEasySkewbScramble();
    const c = getAnkiCaseForSkewb(r.state);
    if (c && c.caseType === '2_adjacent_solved') found = c;
  }
  if (!found) { console.log('    ⚠ Could not generate 2_adjacent in 50 tries — skipping'); return; }
  assert.ok(typeof found.slotW === 'string' && found.slotW.length === 1);
});


// ==========================================
// SUMMARY
// ==========================================

console.log(`\n${'═'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All puzzle utility tests passed!');
  process.exit(0);
}
