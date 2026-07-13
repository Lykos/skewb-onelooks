/* puzzle_utils.js */
// Self-contained puzzle utilities for 2x2 and Skewb.
// Covers: generic BFS solver, both puzzle simulations, state recognition,
// scramble generation, and Skewb Anki hint analysis.
// No external dependencies — safe to require without loading app.js.

'use strict';

// ==========================================
// 1. SHARED UTILITIES
// ==========================================

function invMove(m) {
  if (m.endsWith("'")) return m[0];
  if (m.endsWith("2")) return m;
  return m + "'";
}

/**
 * Generic bidirectional BFS solver.
 * Works with any puzzle that implements .clone(), .move(m), and .getKey().
 * Returns an array of move strings from startCube to endCube, or null if unreachable.
 */
function solve(startCube, endCube, allowedMoves) {
  const startKey = startCube.getKey();
  const endKey = endCube.getKey();
  if (startKey === endKey) return [];

  let frontS = new Map();
  let frontT = new Map();

  frontS.set(startKey, { cube: startCube, path: [] });
  frontT.set(endKey, { cube: endCube, path: [] });

  let queueS = [startKey];
  let queueT = [endKey];

  while (queueS.length > 0 && queueT.length > 0) {
    if (queueS.length <= queueT.length) {
      let nextQueueS = [];
      for (const key of queueS) {
        const { cube, path } = frontS.get(key);
        for (const m of allowedMoves) {
          const nextCube = cube.clone().move(m);
          const nextKey = nextCube.getKey();
          if (frontT.has(nextKey)) {
            const pathT = frontT.get(nextKey).path;
            const pathS = [...path, m];
            const revPathT = pathT.slice().reverse().map(invMove);
            return [...pathS, ...revPathT];
          }
          if (!frontS.has(nextKey)) {
            frontS.set(nextKey, { cube: nextCube, path: [...path, m] });
            nextQueueS.push(nextKey);
          }
        }
      }
      queueS = nextQueueS;
    } else {
      let nextQueueT = [];
      for (const key of queueT) {
        const { cube, path } = frontT.get(key);
        for (const m of allowedMoves) {
          const nextCube = cube.clone().move(m);
          const nextKey = nextCube.getKey();
          if (frontS.has(nextKey)) {
            const pathS = frontS.get(nextKey).path;
            const pathT = [...path, m];
            const revPathT = pathT.slice().reverse().map(invMove);
            return [...pathS, ...revPathT];
          }
          if (!frontT.has(nextKey)) {
            frontT.set(nextKey, { cube: nextCube, path: [...path, m] });
            nextQueueT.push(nextKey);
          }
        }
      }
      queueT = nextQueueT;
    }
  }
  return null;
}

/**
 * Returns true if c1 and c2 are opposite face colors on the standard color scheme.
 */
function areOppositeColors(c1, c2) {
  if (c1 === 'white'  && c2 === 'yellow') return true;
  if (c1 === 'yellow' && c2 === 'white')  return true;
  if (c1 === 'green'  && c2 === 'blue')   return true;
  if (c1 === 'blue'   && c2 === 'green')  return true;
  if (c1 === 'red'    && c2 === 'orange') return true;
  if (c1 === 'orange' && c2 === 'red')    return true;
  return false;
}

/**
 * Simplifies a sequence of 2x2/NxN moves by cancelling adjacent same-face moves.
 * Cube moves have order 4 (R R R R = identity).
 */
function cleanupPath(moves) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < moves.length - 1; i++) {
      const m1 = moves[i];
      const m2 = moves[i + 1];
      if (m1[0] === m2[0]) {
        let t1 = 1;
        if (m1.endsWith("'")) t1 = 3;
        else if (m1.endsWith("2")) t1 = 2;

        let t2 = 1;
        if (m2.endsWith("'")) t2 = 3;
        else if (m2.endsWith("2")) t2 = 2;

        const total = (t1 + t2) % 4;
        if (total === 0) {
          moves.splice(i, 2);
          changed = true;
          break;
        } else {
          let combined = m1[0];
          if (total === 2) combined += "2";
          else if (total === 3) combined += "'";
          moves.splice(i, 2, combined);
          changed = true;
          break;
        }
      }
    }
  }
  return moves;
}

/**
 * Simplifies a sequence of Skewb moves by cancelling adjacent same-face moves.
 * Skewb moves have order 3 (R R R = identity).
 */
function cleanupSkewbPath(moves) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < moves.length - 1; i++) {
      const m1 = moves[i];
      const m2 = moves[i + 1];
      if (m1[0] === m2[0]) {
        const t1 = m1.endsWith("'") ? 2 : 1;
        const t2 = m2.endsWith("'") ? 2 : 1;
        const total = (t1 + t2) % 3;
        if (total === 0) {
          moves.splice(i, 2);
          changed = true;
          break;
        } else {
          let combined = m1[0];
          if (total === 2) combined += "'";
          moves.splice(i, 2, combined);
          changed = true;
          break;
        }
      }
    }
  }
  return moves;
}


// ==========================================
// 2. 2×2 CUBE SIMULATION (3D Vector Model)
// ==========================================

// Corner position vectors. Index = position slot (0=UFL, 1=UFR, 2=UBR, 3=UBL,
//                                                   4=DFL, 5=DFR, 6=DBR, 7=DBL)
const CORNER_VECS = [
  [-1,  1,  1], // 0: UFL
  [ 1,  1,  1], // 1: UFR
  [ 1,  1, -1], // 2: UBR
  [-1,  1, -1], // 3: UBL
  [-1, -1,  1], // 4: DFL
  [ 1, -1,  1], // 5: DFR
  [ 1, -1, -1], // 6: DBR
  [-1, -1, -1]  // 7: DBL
];

class Cube2x2 {
  constructor() {
    this.corners = [];
    for (let i = 0; i < 8; i++) {
      const v = CORNER_VECS[i];
      this.corners.push({
        id: i,
        stickers: [
          [0, v[1], 0], // y-face sticker
          [0, 0, v[2]], // z-face sticker
          [v[0], 0, 0]  // x-face sticker
        ]
      });
    }
  }

  clone() {
    const next = new Cube2x2();
    next.corners = this.corners.map(c => ({
      id: c.id,
      stickers: c.stickers.map(s => [...s])
    }));
    return next;
  }

  isSolved() {
    for (let i = 0; i < 8; i++) {
      const c = this.corners[i];
      if (c.id !== i) return false;
      const v = CORNER_VECS[i];
      if (c.stickers[0][1] !== v[1]) return false;
      if (c.stickers[1][2] !== v[2]) return false;
      if (c.stickers[2][0] !== v[0]) return false;
    }
    return true;
  }

  getKey() {
    let s = "";
    for (let i = 0; i < 8; i++) {
      const c = this.corners[i];
      let ori = 0;
      if (c.stickers[1][1] !== 0) ori = 1;
      else if (c.stickers[2][1] !== 0) ori = 2;
      s += c.id.toString() + ori;
    }
    return s;
  }

  move(m) {
    const rotateVec = (p, axis, turns) => {
      let [x, y, z] = p;
      for (let t = 0; t < turns; t++) {
        if (axis === 'y') { const tmp = x; x = -z; z = tmp; }
        else if (axis === 'x') { const tmp = y; y = z; z = -tmp; }
        else if (axis === 'z') { const tmp = x; x = y; y = -tmp; }
      }
      return [x, y, z];
    };

    let axis;
    if (m[0] === 'U') axis = 'y';
    else if (m[0] === 'R') axis = 'x';
    else if (m[0] === 'F') axis = 'z';

    let turns = 1;
    if (m.endsWith("'")) turns = 3;
    else if (m.endsWith("2")) turns = 2;

    const affectedIndices = [];
    for (let i = 0; i < 8; i++) {
      const v = CORNER_VECS[i];
      if (axis === 'y' && v[1] === 1) affectedIndices.push(i);
      if (axis === 'x' && v[0] === 1) affectedIndices.push(i);
      if (axis === 'z' && v[2] === 1) affectedIndices.push(i);
    }

    const nextCorners = [...this.corners];
    const targetPositions = [];
    for (const idx of affectedIndices) {
      const newPos = rotateVec(CORNER_VECS[idx], axis, turns);
      const nextIdx = CORNER_VECS.findIndex(p => p[0]===newPos[0] && p[1]===newPos[1] && p[2]===newPos[2]);
      targetPositions.push(nextIdx);
    }

    const rotatedPieces = affectedIndices.map(idx => {
      const piece = this.corners[idx];
      return { id: piece.id, stickers: piece.stickers.map(s => rotateVec(s, axis, turns)) };
    });

    for (let k = 0; k < 4; k++) {
      nextCorners[targetPositions[k]] = rotatedPieces[k];
    }
    this.corners = nextCorners;
    return this;
  }
}

/**
 * Returns an object with keys U/D/F/B/L/R, each an array of 4 corner sticker colors
 * in reading order (TL, TR, BL, BR).
 */
function getCube2x2Colors(cube) {
  const getFaceLetter = (v) => {
    if (v[1] === 1) return 'U';
    if (v[1] === -1) return 'D';
    if (v[2] === 1) return 'F';
    if (v[2] === -1) return 'B';
    if (v[0] === -1) return 'L';
    if (v[0] === 1) return 'R';
  };

  const getStickerColor = (pieceId, stickerIdx) => {
    const v = CORNER_VECS[pieceId];
    if (stickerIdx === 0) return v[1] === 1 ? 'white' : 'yellow';
    if (stickerIdx === 1) return v[2] === 1 ? 'green' : 'blue';
    return v[0] === 1 ? 'red' : 'orange';
  };

  const colors = { U: [], D: [], F: [], B: [], L: [], R: [] };
  const FACE_POSITIONS = {
    U: [3, 2, 0, 1], // UBL, UBR, UFL, UFR
    D: [4, 5, 7, 6], // DFL, DFR, DBL, DBR
    F: [0, 1, 4, 5], // UFL, UFR, DFL, DFR
    B: [2, 3, 6, 7], // UBR, UBL, DBR, DBL
    L: [3, 0, 7, 4], // UBL, UFL, DBL, DFL
    R: [1, 2, 5, 6]  // UFR, UBR, DFR, DBR
  };

  for (const face of ['U', 'D', 'F', 'B', 'L', 'R']) {
    for (const pos of FACE_POSITIONS[face]) {
      const piece = cube.corners[pos];
      let color = '';
      for (let s = 0; s < 3; s++) {
        const dir = piece.stickers[s];
        if (getFaceLetter(dir) === face) {
          color = getStickerColor(piece.id, s);
          break;
        }
      }
      colors[face].push(color);
    }
  }
  return colors;
}


// ==========================================
// 3. 2×2 STATE RECOGNITION
// ==========================================

// Fixed face center colors for the 2x2 (fixed by convention, no physical centers)
const FACE_CENTER_COLORS_2X2 = { U:'white', D:'yellow', F:'green', B:'blue', R:'red', L:'orange' };

/** Returns the face name (U/D/F/B/L/R) that a sticker vector is pointing toward. */
function getStickerFace(sticker) {
  if (sticker[1] === 1) return 'U';
  if (sticker[1] === -1) return 'D';
  if (sticker[2] === 1) return 'F';
  if (sticker[2] === -1) return 'B';
  if (sticker[0] === 1) return 'R';
  if (sticker[0] === -1) return 'L';
  return null;
}

/** Returns the intrinsic color of a 2x2 piece sticker by piece id and sticker index. */
function get2x2StickerColor(pieceId, stickerIdx) {
  const v = CORNER_VECS[pieceId];
  if (stickerIdx === 0) return v[1] === 1 ? 'white' : 'yellow';
  if (stickerIdx === 1) return v[2] === 1 ? 'green' : 'blue';
  return v[0] === 1 ? 'red' : 'orange';
}

/**
 * Returns the color of the 2x2 sticker at corner position `pos` that faces `face`.
 */
function getStickerColorOnFace(cube, pos, face) {
  const piece = cube.corners[pos];
  const getFaceLetter = (v) => {
    if (v[1] === 1) return 'U';
    if (v[1] === -1) return 'D';
    if (v[2] === 1) return 'F';
    if (v[2] === -1) return 'B';
    if (v[0] === -1) return 'L';
    if (v[0] === 1) return 'R';
  };
  for (let s = 0; s < 3; s++) {
    if (getFaceLetter(piece.stickers[s]) === face) {
      return get2x2StickerColor(piece.id, s);
    }
  }
  return null;
}

/** Returns true if the 2x2 corner at position `pos` is fully solved (all 3 stickers match). */
function isCorner2x2Solved(cube, pos) {
  const piece = cube.corners[pos];
  for (let s = 0; s < 3; s++) {
    const face = getStickerFace(piece.stickers[s]);
    if (!face) return false;
    if (get2x2StickerColor(piece.id, s) !== FACE_CENTER_COLORS_2X2[face]) return false;
  }
  return true;
}

// All adjacent pairs of corners sharing a face edge.
const ADJACENT_PAIRS_2X2 = [
  { p1: 0, p2: 1, f1: 'U', f2: 'F' },
  { p1: 1, p2: 2, f1: 'U', f2: 'R' },
  { p1: 2, p2: 3, f1: 'U', f2: 'B' },
  { p1: 3, p2: 0, f1: 'U', f2: 'L' },
  { p1: 4, p2: 5, f1: 'D', f2: 'F' },
  { p1: 5, p2: 6, f1: 'D', f2: 'R' },
  { p1: 6, p2: 7, f1: 'D', f2: 'B' },
  { p1: 7, p2: 4, f1: 'D', f2: 'L' },
  { p1: 0, p2: 4, f1: 'F', f2: 'L' },
  { p1: 1, p2: 5, f1: 'F', f2: 'R' },
  { p1: 2, p2: 6, f1: 'B', f2: 'R' },
  { p1: 3, p2: 7, f1: 'B', f2: 'L' }
];

// All diagonal pairs of corners sharing a face but no edge.
const DIAGONAL_PAIRS_2X2 = [
  { p1: 3, p2: 1, face: 'U', side1_a: 'L', side1_b: 'R', side2_a: 'B', side2_b: 'F' },
  { p1: 2, p2: 0, face: 'U', side1_a: 'R', side1_b: 'L', side2_a: 'B', side2_b: 'F' },
  { p1: 4, p2: 6, face: 'D', side1_a: 'L', side1_b: 'R', side2_a: 'F', side2_b: 'B' },
  { p1: 5, p2: 7, face: 'D', side1_a: 'R', side1_b: 'L', side2_a: 'F', side2_b: 'B' },
  { p1: 0, p2: 5, face: 'F', side1_a: 'U', side1_b: 'D', side2_a: 'L', side2_b: 'R' },
  { p1: 1, p2: 4, face: 'F', side1_a: 'U', side1_b: 'D', side2_a: 'R', side2_b: 'L' },
  { p1: 2, p2: 7, face: 'B', side1_a: 'U', side1_b: 'D', side2_a: 'R', side2_b: 'L' },
  { p1: 3, p2: 6, face: 'B', side1_a: 'U', side1_b: 'D', side2_a: 'L', side2_b: 'R' },
  { p1: 3, p2: 4, face: 'L', side1_a: 'U', side1_b: 'D', side2_a: 'B', side2_b: 'F' },
  { p1: 0, p2: 7, face: 'L', side1_a: 'U', side1_b: 'D', side2_a: 'F', side2_b: 'B' },
  { p1: 1, p2: 6, face: 'R', side1_a: 'U', side1_b: 'D', side2_a: 'F', side2_b: 'B' },
  { p1: 2, p2: 5, face: 'R', side1_a: 'U', side1_b: 'D', side2_a: 'B', side2_b: 'F' }
];

/**
 * Returns the shared face color if a 2x2 diagonal pair is "diagonally solved"
 * (face stickers match, side stickers are opposite colors), otherwise false.
 */
function isDiagonalPairSolved(cube, d) {
  const c1 = getStickerColorOnFace(cube, d.p1, d.face);
  const c2 = getStickerColorOnFace(cube, d.p2, d.face);
  if (c1 !== c2) return false;

  const s1_a = getStickerColorOnFace(cube, d.p1, d.side1_a);
  const s1_b = getStickerColorOnFace(cube, d.p2, d.side1_b);
  if (!areOppositeColors(s1_a, s1_b)) return false;

  const s2_a = getStickerColorOnFace(cube, d.p1, d.side2_a);
  const s2_b = getStickerColorOnFace(cube, d.p2, d.side2_b);
  if (!areOppositeColors(s2_a, s2_b)) return false;

  return c1;
}

/**
 * Returns true if the 2x2 cube state qualifies as "easy" under the given criteria.
 */
function check2x2EasyState(cube, easyType, colorRestriction) {
  if (easyType === 'adjacent') {
    for (const d of ADJACENT_PAIRS_2X2) {
      if (!isCorner2x2Solved(cube, d.p1)) continue;
      if (!isCorner2x2Solved(cube, d.p2)) continue;
      if (colorRestriction === 'white') {
        if (FACE_CENTER_COLORS_2X2[d.f1] !== 'white') continue;
      }
      return true;
    }
  } else if (easyType === 'diagonal') {
    for (const d of DIAGONAL_PAIRS_2X2) {
      const color = isDiagonalPairSolved(cube, d);
      if (color) {
        if (colorRestriction === 'white') {
          if (color === 'white') return true;
        } else {
          return true;
        }
      }
    }
  }
  return false;
}


// ==========================================
// 4. 2×2 SCRAMBLE GENERATORS
// ==========================================

const CUBE2X2_ALLOWED_MOVES = ["U", "U'", "U2", "R", "R'", "R2", "F", "F'", "F2"];

/**
 * Generates a uniformly random (reachable) 2x2 state by random permutation + valid orientation.
 * Piece at position 7 (DBL) is kept fixed to remove rotational equivalence.
 */
function generateRandom2x2State() {
  const cube = new Cube2x2();
  // Shuffle positions 0-6 (position 7 fixed)
  const freePositions = [0, 1, 2, 3, 4, 5, 6];
  for (let i = freePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = freePositions[i]; freePositions[i] = freePositions[j]; freePositions[j] = tmp;
  }

  const nextCorners = [];
  for (let i = 0; i < 8; i++) {
    const pieceId = i === 7 ? 7 : freePositions[i];
    const v = CORNER_VECS[pieceId];
    nextCorners.push({
      id: pieceId,
      stickers: [[0, v[1], 0], [0, 0, v[2]], [v[0], 0, 0]]
    });
  }
  cube.corners = nextCorners;

  // Apply random valid orientations (sum must be 0 mod 3)
  let sumO = 0;
  for (let i = 0; i < 6; i++) {
    const turns = Math.floor(Math.random() * 3);
    sumO += turns;
    const piece = cube.corners[i];
    for (let t = 0; t < turns; t++) {
      const temp = piece.stickers[0];
      piece.stickers[0] = piece.stickers[2];
      piece.stickers[2] = piece.stickers[1];
      piece.stickers[1] = temp;
    }
  }
  const lastTurns = (3 - (sumO % 3)) % 3;
  const piece = cube.corners[6];
  for (let t = 0; t < lastTurns; t++) {
    const temp = piece.stickers[0];
    piece.stickers[0] = piece.stickers[2];
    piece.stickers[2] = piece.stickers[1];
    piece.stickers[1] = temp;
  }
  return cube;
}

/** Returns a uniformly random 2x2 state satisfying the given easy criteria. */
function generateEasy2x2State(easyType = 'adjacent', colorRestriction = 'white') {
  while (true) {
    const target = generateRandom2x2State();
    if (check2x2EasyState(target, easyType, colorRestriction)) return target;
  }
}

/** Returns a random 11-move 2x2 scramble string with no consecutive same-face moves. */
function getNormal2x2Scramble() {
  const scramble = [];
  let last = "";
  for (let i = 0; i < 11; i++) {
    let m;
    do {
      m = CUBE2X2_ALLOWED_MOVES[Math.floor(Math.random() * CUBE2X2_ALLOWED_MOVES.length)];
    } while (m[0] === last);
    scramble.push(m);
    last = m[0];
  }
  return scramble.join(" ");
}

/**
 * Returns a 9–12 move scramble string for the 2x2 that results in an easy state.
 */
function getEasy2x2Scramble(easyType = 'adjacent', colorRestriction = 'white') {
  while (true) {
    const len = 9 + Math.floor(Math.random() * 4);
    const scramble = [];
    let last = "";
    for (let i = 0; i < len; i++) {
      let m;
      do { m = CUBE2X2_ALLOWED_MOVES[Math.floor(Math.random() * CUBE2X2_ALLOWED_MOVES.length)]; } while (m[0] === last);
      scramble.push(m);
      last = m[0];
    }
    const cube = new Cube2x2();
    for (const m of scramble) cube.move(m);
    if (check2x2EasyState(cube, easyType, colorRestriction)) return scramble.join(" ");
  }
}


// ==========================================
// 5. SKEWB SIMULATION (3D Vector Model)
// ==========================================

// Corner position vectors. Index = position slot:
//   0=URF, 1=URB, 2=ULB, 3=ULF, 4=DFR, 5=DBR, 6=DBL, 7=DFL
const SKEWB_CORNER_VECS = [
  [ 1,  1,  1], // 0: URF
  [ 1,  1, -1], // 1: URB
  [-1,  1, -1], // 2: ULB
  [-1,  1,  1], // 3: ULF
  [ 1, -1,  1], // 4: DFR
  [ 1, -1, -1], // 5: DBR
  [-1, -1, -1], // 6: DBL
  [-1, -1,  1]  // 7: DFL
];

class Skewb {
  constructor() {
    // centers[i] = which face color id is currently at face slot i
    // Face slots: 0=U, 1=D, 2=F, 3=B, 4=L, 5=R
    this.centers = [0, 1, 2, 3, 4, 5];
    this.corners = [];
    for (let i = 0; i < 8; i++) {
      const v = SKEWB_CORNER_VECS[i];
      this.corners.push({
        id: i,
        stickers: [
          [0, v[1], 0], // y-face sticker
          [0, 0, v[2]], // z-face sticker
          [v[0], 0, 0]  // x-face sticker
        ]
      });
    }
  }

  clone() {
    const next = new Skewb();
    next.centers = [...this.centers];
    next.corners = this.corners.map(c => ({
      id: c.id,
      stickers: c.stickers.map(s => [...s])
    }));
    return next;
  }

  isSolved() {
    for (let i = 0; i < 6; i++) {
      if (this.centers[i] !== i) return false;
    }
    for (let i = 0; i < 8; i++) {
      const c = this.corners[i];
      if (c.id !== i) return false;
      const v = SKEWB_CORNER_VECS[i];
      if (c.stickers[0][1] !== v[1]) return false;
      if (c.stickers[1][2] !== v[2]) return false;
      if (c.stickers[2][0] !== v[0]) return false;
    }
    return true;
  }

  getKey() {
    let s = this.centers.join('');
    for (let i = 0; i < 8; i++) {
      const c = this.corners[i];
      let ori = 0;
      if (c.stickers[1][1] !== 0) ori = 1;
      else if (c.stickers[2][1] !== 0) ori = 2;
      s += c.id.toString() + ori;
    }
    return s;
  }

  move(moveName) {
    // Move axes are the far-corner diagonals:
    //   U → axisIdx 2 (ULB), R → 5 (DBR), L → 7 (DFL), B → 6 (DBL)
    let axisIdx;
    const m = moveName[0];
    if (m === 'U') axisIdx = 2;
    else if (m === 'R') axisIdx = 5;
    else if (m === 'L') axisIdx = 7;
    else if (m === 'B') axisIdx = 6;

    const isCCW = moveName.endsWith("'");
    const A = SKEWB_CORNER_VECS[axisIdx];

    // Rodrigues' rotation formula for 120° around axis A (normalized diagonal)
    const rotateVec = (p, ccw) => {
      const dot = p[0]*A[0] + p[1]*A[1] + p[2]*A[2];
      const cross = [
        A[1]*p[2] - A[2]*p[1],
        A[2]*p[0] - A[0]*p[2],
        A[0]*p[1] - A[1]*p[0]
      ];
      const sign = ccw ? 1 : -1;
      return [
        Math.round(-0.5 * p[0] + 0.5 * sign * cross[0] + 0.5 * A[0] * dot),
        Math.round(-0.5 * p[1] + 0.5 * sign * cross[1] + 0.5 * A[1] * dot),
        Math.round(-0.5 * p[2] + 0.5 * sign * cross[2] + 0.5 * A[2] * dot)
      ];
    };

    // Rotate the three face centers on the same side as the axis
    const CENTER_POS = [
      [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [-1, 0, 0], [1, 0, 0]
    ];
    const rotatedCenterIndices = [];
    for (let i = 0; i < 6; i++) {
      const dot = CENTER_POS[i][0]*A[0] + CENTER_POS[i][1]*A[1] + CENTER_POS[i][2]*A[2];
      if (dot > 0) rotatedCenterIndices.push(i);
    }
    const nextCenters = [...this.centers];
    const targetPositions = [];
    for (const idx of rotatedCenterIndices) {
      const newPos = rotateVec(CENTER_POS[idx], isCCW);
      const nextIdx = CENTER_POS.findIndex(p => p[0]===newPos[0] && p[1]===newPos[1] && p[2]===newPos[2]);
      targetPositions.push(nextIdx);
    }
    for (let k = 0; k < 3; k++) {
      nextCenters[targetPositions[k]] = this.centers[rotatedCenterIndices[k]];
    }
    this.centers = nextCenters;

    // Rotate the four corners on the same side as the axis
    const rotatedCornerIndices = [];
    for (let i = 0; i < 8; i++) {
      const dot = SKEWB_CORNER_VECS[i][0]*A[0] + SKEWB_CORNER_VECS[i][1]*A[1] + SKEWB_CORNER_VECS[i][2]*A[2];
      if (dot > 0) rotatedCornerIndices.push(i);
    }
    const nextCorners = [...this.corners];
    const targetCornerPositions = [];
    for (const idx of rotatedCornerIndices) {
      const newPos = rotateVec(SKEWB_CORNER_VECS[idx], isCCW);
      const nextIdx = SKEWB_CORNER_VECS.findIndex(p => p[0]===newPos[0] && p[1]===newPos[1] && p[2]===newPos[2]);
      targetCornerPositions.push(nextIdx);
    }
    const rotatedPieces = rotatedCornerIndices.map(idx => {
      const piece = this.corners[idx];
      return { id: piece.id, stickers: piece.stickers.map(s => rotateVec(s, isCCW)) };
    });
    for (let k = 0; k < 4; k++) {
      nextCorners[targetCornerPositions[k]] = rotatedPieces[k];
    }
    this.corners = nextCorners;
    return this;
  }
}

/** Returns the intrinsic color of a Skewb corner sticker by piece id and sticker index. */
function getSkewbStickerColor(pieceId, stickerIdx) {
  const v = SKEWB_CORNER_VECS[pieceId];
  if (stickerIdx === 0) return v[1] === 1 ? 'white' : 'yellow';
  if (stickerIdx === 1) return v[2] === 1 ? 'green' : 'blue';
  return v[0] === 1 ? 'red' : 'orange';
}

/**
 * Returns an object describing the current color of every sticker on the Skewb,
 * organized by face (U/D/F/B/L/R), with a `center` color and a `corners` map.
 */
function getSkewbColors(skewb) {
  const faceColors = ['white', 'yellow', 'green', 'blue', 'orange', 'red'];
  const colors = {
    U: { center: faceColors[skewb.centers[0]], corners: {} },
    D: { center: faceColors[skewb.centers[1]], corners: {} },
    F: { center: faceColors[skewb.centers[2]], corners: {} },
    B: { center: faceColors[skewb.centers[3]], corners: {} },
    L: { center: faceColors[skewb.centers[4]], corners: {} },
    R: { center: faceColors[skewb.centers[5]], corners: {} }
  };

  const getFaceLetter = (v) => {
    if (v[0] === 1)  return 'R';
    if (v[0] === -1) return 'L';
    if (v[1] === 1)  return 'U';
    if (v[1] === -1) return 'D';
    if (v[2] === 1)  return 'F';
    if (v[2] === -1) return 'B';
  };

  for (let pos = 0; pos < 8; pos++) {
    const piece = skewb.corners[pos];
    for (let s = 0; s < 3; s++) {
      const dir = piece.stickers[s];
      const face = getFaceLetter(dir);
      if (face) colors[face].corners[pos] = getSkewbStickerColor(piece.id, s);
    }
  }
  return colors;
}

// Maps each face to the corner position indices for its TL/TR/BL/BR display slots
const SKEWB_FACE_CORNER_MAP = {
  U: { TL: 2, TR: 1, BL: 3, BR: 0 },
  D: { TL: 7, TR: 4, BL: 6, BR: 5 },
  F: { TL: 3, TR: 0, BL: 7, BR: 4 },
  B: { TL: 1, TR: 2, BL: 5, BR: 6 },
  L: { TL: 2, TR: 3, BL: 6, BR: 7 },
  R: { TL: 0, TR: 1, BL: 4, BR: 5 }
};


// ==========================================
// 6. SKEWB STATE RECOGNITION
// ==========================================

/** Returns the color of the Skewb sticker at position `pos` that faces `face`. */
function getSkewbStickerColorOnFace(skewb, pos, face) {
  const piece = skewb.corners[pos];
  const getFaceLetter = (v) => {
    if (v[0] === 1)  return 'R';
    if (v[0] === -1) return 'L';
    if (v[1] === 1)  return 'U';
    if (v[1] === -1) return 'D';
    if (v[2] === 1)  return 'F';
    if (v[2] === -1) return 'B';
  };
  for (let s = 0; s < 3; s++) {
    if (getFaceLetter(piece.stickers[s]) === face) return getSkewbStickerColor(piece.id, s);
  }
  return null;
}

/**
 * Returns true if the Skewb corner at position `p` is fully solved
 * (correct piece, correct orientation relative to current centers).
 */
function isCornerSolved(skewb, p) {
  const v = SKEWB_CORNER_VECS[p];
  const faces = [];
  if (v[1] === 1) faces.push('U'); else faces.push('D');
  if (v[2] === 1) faces.push('F'); else faces.push('B');
  if (v[0] === 1) faces.push('R'); else faces.push('L');

  const faceColors = ['white', 'yellow', 'green', 'blue', 'orange', 'red'];
  const faceIdx = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 };
  for (const f of faces) {
    const centerColor = faceColors[skewb.centers[faceIdx[f]]];
    if (getSkewbStickerColorOnFace(skewb, p, f) !== centerColor) return false;
  }
  return true;
}

// All diagonal corner pairs per face, used for the "diagonal easy" scramble type
const SKEWB_DIAGONAL_PAIRS = [
  { p1: 2, p2: 0, face: 'U', side1_a: 'L', side1_b: 'R', side2_a: 'B', side2_b: 'F' },
  { p1: 1, p2: 3, face: 'U', side1_a: 'R', side1_b: 'L', side2_a: 'B', side2_b: 'F' },
  { p1: 7, p2: 5, face: 'D', side1_a: 'L', side1_b: 'R', side2_a: 'F', side2_b: 'B' },
  { p1: 4, p2: 6, face: 'D', side1_a: 'R', side1_b: 'L', side2_a: 'F', side2_b: 'B' },
  { p1: 3, p2: 4, face: 'F', side1_a: 'U', side1_b: 'D', side2_a: 'L', side2_b: 'R' },
  { p1: 0, p2: 7, face: 'F', side1_a: 'U', side1_b: 'D', side2_a: 'R', side2_b: 'L' },
  { p1: 1, p2: 6, face: 'B', side1_a: 'U', side1_b: 'D', side2_a: 'R', side2_b: 'L' },
  { p1: 2, p2: 5, face: 'B', side1_a: 'U', side1_b: 'D', side2_a: 'L', side2_b: 'R' },
  { p1: 2, p2: 7, face: 'L', side1_a: 'U', side1_b: 'D', side2_a: 'B', side2_b: 'F' },
  { p1: 3, p2: 6, face: 'L', side1_a: 'U', side1_b: 'D', side2_a: 'F', side2_b: 'B' },
  { p1: 0, p2: 5, face: 'R', side1_a: 'U', side1_b: 'D', side2_a: 'F', side2_b: 'B' },
  { p1: 1, p2: 4, face: 'R', side1_a: 'U', side1_b: 'D', side2_a: 'B', side2_b: 'F' }
];

/**
 * Returns the shared face color if a Skewb diagonal pair is "diagonally solved",
 * otherwise false.
 */
function isSkewbDiagonalPairSolved(skewb, d) {
  const c1 = getSkewbStickerColorOnFace(skewb, d.p1, d.face);
  const c2 = getSkewbStickerColorOnFace(skewb, d.p2, d.face);
  if (c1 !== c2) return false;

  const s1_a = getSkewbStickerColorOnFace(skewb, d.p1, d.side1_a);
  const s1_b = getSkewbStickerColorOnFace(skewb, d.p2, d.side1_b);
  if (!areOppositeColors(s1_a, s1_b)) return false;

  const s2_a = getSkewbStickerColorOnFace(skewb, d.p1, d.side2_a);
  const s2_b = getSkewbStickerColorOnFace(skewb, d.p2, d.side2_b);
  if (!areOppositeColors(s2_a, s2_b)) return false;

  return c1;
}

// Per-face adjacency data used by checkSkewbEasyState
const SKEWB_FACES_DATA = [
  { face: 'U', centerIdx: 0, adj: [{ p1: 2, p2: 1, side: 'B' }, { p1: 1, p2: 0, side: 'R' }, { p1: 0, p2: 3, side: 'F' }, { p1: 3, p2: 2, side: 'L' }] },
  { face: 'D', centerIdx: 1, adj: [{ p1: 7, p2: 4, side: 'F' }, { p1: 4, p2: 5, side: 'R' }, { p1: 5, p2: 6, side: 'B' }, { p1: 6, p2: 7, side: 'L' }] },
  { face: 'F', centerIdx: 2, adj: [{ p1: 3, p2: 0, side: 'U' }, { p1: 0, p2: 4, side: 'R' }, { p1: 4, p2: 7, side: 'D' }, { p1: 7, p2: 3, side: 'L' }] },
  { face: 'B', centerIdx: 3, adj: [{ p1: 1, p2: 2, side: 'U' }, { p1: 2, p2: 6, side: 'L' }, { p1: 6, p2: 5, side: 'D' }, { p1: 5, p2: 1, side: 'R' }] },
  { face: 'L', centerIdx: 4, adj: [{ p1: 2, p2: 3, side: 'U' }, { p1: 3, p2: 7, side: 'F' }, { p1: 7, p2: 6, side: 'D' }, { p1: 6, p2: 2, side: 'B' }] },
  { face: 'R', centerIdx: 5, adj: [{ p1: 0, p2: 1, side: 'U' }, { p1: 1, p2: 5, side: 'B' }, { p1: 5, p2: 4, side: 'D' }, { p1: 4, p2: 0, side: 'F' }] }
];

/**
 * Returns true if the Skewb state qualifies as "easy" under the specified criteria.
 */
function checkSkewbEasyState(skewb, easyType, colorRestriction) {
  const faceColors = ['white', 'yellow', 'green', 'blue', 'orange', 'red'];
  const faceNameToIdx = { U: 0, D: 1, F: 2, B: 3, L: 4, R: 5 };

  if (easyType === 'adjacent') {
    for (const f of SKEWB_FACES_DATA) {
      const centerColor = faceColors[skewb.centers[f.centerIdx]];
      if (colorRestriction === 'white' && centerColor !== 'white') continue;

      for (const pair of f.adj) {
        const c1 = getSkewbStickerColorOnFace(skewb, pair.p1, f.face);
        const c2 = getSkewbStickerColorOnFace(skewb, pair.p2, f.face);
        if (c1 === centerColor && c2 === centerColor) {
          const s1 = getSkewbStickerColorOnFace(skewb, pair.p1, pair.side);
          const s2 = getSkewbStickerColorOnFace(skewb, pair.p2, pair.side);
          if (s1 === s2) return true;
        }
      }
    }
  } else if (easyType === 'diagonal') {
    for (const d of SKEWB_DIAGONAL_PAIRS) {
      const centerColor = faceColors[skewb.centers[faceNameToIdx[d.face]]];
      if (colorRestriction === 'white' && centerColor !== 'white') continue;

      const color = isSkewbDiagonalPairSolved(skewb, d);
      if (color && color === centerColor) return true;
    }
  }
  return false;
}

/** Convenience wrapper: checks for adjacent white-layer easy state. */
function hasEasySkewb(skewb) {
  return checkSkewbEasyState(skewb, 'adjacent', 'white');
}


// ==========================================
// 7. SKEWB SCRAMBLE GENERATORS
// ==========================================

const SKEWB_ALLOWED_MOVES = ["U", "U'", "R", "R'", "L", "L'", "B", "B'"];

/** Returns a random Skewb state satisfying the given easy criteria. */
function generateEasySkewbState(easyType = 'adjacent', colorRestriction = 'white') {
  while (true) {
    const s = new Skewb();
    let last = "";
    for (let i = 0; i < 30; i++) {
      let m;
      do {
        m = SKEWB_ALLOWED_MOVES[Math.floor(Math.random() * SKEWB_ALLOWED_MOVES.length)];
      } while (m[0] === last);
      s.move(m);
      last = m[0];
    }
    if (checkSkewbEasyState(s, easyType, colorRestriction)) return s;
  }
}

/** Returns a random 10-move Skewb scramble string with no consecutive same-face moves. */
function getNormalSkewbScramble() {
  const scramble = [];
  let last = "";
  for (let i = 0; i < 10; i++) {
    let m;
    do {
      m = SKEWB_ALLOWED_MOVES[Math.floor(Math.random() * SKEWB_ALLOWED_MOVES.length)];
    } while (m[0] === last);
    scramble.push(m);
    last = m[0];
  }
  return scramble.join(" ");
}

/**
 * Returns `{ scramble: string, state: Skewb }` for an easy scramble of at least 7 moves.
 * Uses the BFS solver to find the shortest path from solved to an easy target state.
 */
function getEasySkewbScramble(easyType = 'adjacent', colorRestriction = 'white') {
  const solved = new Skewb();
  while (true) {
    const target = generateEasySkewbState(easyType, colorRestriction);
    let scramble = solve(solved, target, SKEWB_ALLOWED_MOVES);
    if (scramble) {
      scramble = cleanupSkewbPath(scramble);
      if (scramble.length >= 7) return { scramble: scramble.join(" "), state: target };
    }
  }
}


// ==========================================
// 8. SKEWB ANKI HINT ANALYSIS
// ==========================================

// Sticker letter map: ANKI_SLM[pieceId] = [y-sticker, z-sticker, x-sticker]
// UFR:B/E/J, URB:D/R/I, ULB:C/Q/O, ULF:A/G/M, DFR:U/F/L, DBR:V/T/K, DBL:X/S/P, DFL:W/H/N
const ANKI_SLM = [
  ['B', 'E', 'J'], // 0: UFR
  ['D', 'R', 'I'], // 1: URB
  ['C', 'Q', 'O'], // 2: ULB
  ['A', 'G', 'M'], // 3: ULF
  ['U', 'F', 'L'], // 4: DFR
  ['V', 'T', 'K'], // 5: DBR
  ['X', 'S', 'P'], // 6: DBL
  ['W', 'H', 'N'], // 7: DFL
];

// Center position vectors indexed 0-5: U, D, F, B, L, R
const ANKI_CENTER_POS = [[0,1,0],[0,-1,0],[0,0,1],[0,0,-1],[-1,0,0],[1,0,0]];

/**
 * Given a Skewb state, identify the Anki case for the hint system.
 *
 * Returns { caseType, slotU, slotW, whichFace, pairFace } or null.
 *   caseType: '2_adjacent_solved' or '3_solved'
 *   slotU: sticker letter at the "front-right" unsolved slot in canonical hold
 *   slotW: sticker letter at the "front-left" unsolved slot (null for 3_solved)
 *   whichFace: face name of the white-layer center
 *   pairFace: face name of the shared side of the solved pair
 *
 * Canonical hold: white face at D, solved pair at back (sharing B face).
 */
function getAnkiCaseForSkewb(skewb, colorRestriction = 'white') {
  const faceColors = ['white', 'yellow', 'green', 'blue', 'orange', 'red'];
  const SLM = ANKI_SLM;
  const SVECS = SKEWB_CORNER_VECS;
  const FACE_DIRS = { U:[0,1,0], D:[0,-1,0], F:[0,0,1], B:[0,0,-1], L:[-1,0,0], R:[1,0,0] };

  function cross(a, b) {
    return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  }

  function getCanonSlotPos(d, b, sign) {
    const r = cross(d, b);
    const gx = sign*r[0] + d[0] - b[0];
    const gy = sign*r[1] + d[1] - b[1];
    const gz = sign*r[2] + d[2] - b[2];
    return SVECS.findIndex(v => v[0]===gx && v[1]===gy && v[2]===gz);
  }

  function getFaceColorAt(sk, pos, face) {
    const piece = sk.corners[pos];
    const fd = FACE_DIRS[face];
    for (let s = 0; s < 3; s++) {
      const st = piece.stickers[s];
      if (st[0]===fd[0] && st[1]===fd[1] && st[2]===fd[2]) return getSkewbStickerColor(piece.id, s);
    }
    return null;
  }

  function getWhiteFaceLetter(sk, pos, d) {
    const piece = sk.corners[pos];
    for (let s = 0; s < 3; s++) {
      const st = piece.stickers[s];
      if (st[0]===d[0] && st[1]===d[1] && st[2]===d[2]) return SLM[piece.id][s];
    }
    return null;
  }

  const FACE_DATA = [
    { face:'U', cIdx:0, adj:[{p1:2,p2:1,side:'B'},{p1:1,p2:0,side:'R'},{p1:0,p2:3,side:'F'},{p1:3,p2:2,side:'L'}] },
    { face:'D', cIdx:1, adj:[{p1:7,p2:4,side:'F'},{p1:4,p2:5,side:'R'},{p1:5,p2:6,side:'B'},{p1:6,p2:7,side:'L'}] },
    { face:'F', cIdx:2, adj:[{p1:3,p2:0,side:'U'},{p1:0,p2:4,side:'R'},{p1:4,p2:7,side:'D'},{p1:7,p2:3,side:'L'}] },
    { face:'B', cIdx:3, adj:[{p1:1,p2:2,side:'U'},{p1:2,p2:6,side:'L'},{p1:6,p2:5,side:'D'},{p1:5,p2:1,side:'R'}] },
    { face:'L', cIdx:4, adj:[{p1:2,p2:3,side:'U'},{p1:3,p2:7,side:'F'},{p1:7,p2:6,side:'D'},{p1:6,p2:2,side:'B'}] },
    { face:'R', cIdx:5, adj:[{p1:0,p2:1,side:'U'},{p1:1,p2:5,side:'B'},{p1:5,p2:4,side:'D'},{p1:4,p2:0,side:'F'}] },
  ];

  for (const fd of FACE_DATA) {
    const centerColor = faceColors[skewb.centers[fd.cIdx]];
    if (colorRestriction === 'white' && centerColor !== 'white') continue;

    const d = FACE_DIRS[fd.face];

    for (const pair of fd.adj) {
      const c1 = getFaceColorAt(skewb, pair.p1, fd.face);
      const c2 = getFaceColorAt(skewb, pair.p2, fd.face);
      if (c1 !== centerColor || c2 !== centerColor) continue;
      const s1 = getFaceColorAt(skewb, pair.p1, pair.side);
      const s2 = getFaceColorAt(skewb, pair.p2, pair.side);
      if (s1 !== s2) continue;

      const b = FACE_DIRS[pair.side];

      let posU = getCanonSlotPos(d, b, +1);
      let posW = getCanonSlotPos(d, b, -1);
      if (posU < 0 || posW < 0) continue;

      const vU = SVECS[posU];
      if (vU[0]*vU[1]*vU[2] > 0) {
        [posU, posW] = [posW, posU];
      }

      const lU = getWhiteFaceLetter(skewb, posU, d);
      const lW = getWhiteFaceLetter(skewb, posW, d);
      if (!lU || !lW) continue;

      const uUc = getFaceColorAt(skewb, posU, fd.face);
      const uWc = getFaceColorAt(skewb, posW, fd.face);

      if (uUc === centerColor && uWc === centerColor) {
        continue; // all 4 corners match → trivially solved
      } else if (uUc === centerColor) {
        return { caseType: '3_solved', slotU: lW, slotW: null, whichFace: fd.face, pairFace: pair.side };
      } else if (uWc === centerColor) {
        return { caseType: '3_solved', slotU: lU, slotW: null, whichFace: fd.face, pairFace: pair.side };
      } else {
        return { caseType: '2_adjacent_solved', slotU: lU, slotW: lW, whichFace: fd.face, pairFace: pair.side };
      }
    }
  }
  return null;
}


// ==========================================
// EXPORTS (Node / CommonJS)
// ==========================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Shared utilities
    invMove,
    solve,
    areOppositeColors,
    cleanupPath,
    cleanupSkewbPath,
    // 2x2 simulation
    CORNER_VECS,
    ADJACENT_PAIRS_2X2,
    DIAGONAL_PAIRS_2X2,
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
    // Anki hint analysis
    ANKI_SLM,
    ANKI_CENTER_POS,
    getAnkiCaseForSkewb,
  };
}
