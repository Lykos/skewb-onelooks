/* app.js */

// ==========================================
// 1. PUZZLE SIMULATION: 3D VECTOR COORDINATES
// ==========================================

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

// ==========================================
// 2. PUZZLE SIMULATION LOGIC: 2X2 CUBE (3D Vector Model)
// ==========================================

class Cube2x2 {
  constructor() {
    this.corners = [];
    for (let i = 0; i < 8; i++) {
      const v = CORNER_VECS[i];
      this.corners.push({
        id: i,
        stickers: [
          [0, v[1], 0], // y
          [0, 0, v[2]], // z
          [v[0], 0, 0]  // x
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
        if (axis === 'y') {
          const tmp = x;
          x = -z;
          z = tmp;
        } else if (axis === 'x') {
          const tmp = y;
          y = z;
          z = -tmp;
        } else if (axis === 'z') {
          const tmp = x;
          x = y;
          y = -tmp;
        }
      }
      return [x, y, z];
    };

    let axis, turns;
    if (m[0] === 'U') axis = 'y';
    else if (m[0] === 'R') axis = 'x';
    else if (m[0] === 'F') axis = 'z';

    if (m.endsWith("'")) turns = 3;
    else if (m.endsWith("2")) turns = 2;
    else turns = 1;

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
      return {
        id: piece.id,
        stickers: piece.stickers.map(s => rotateVec(s, axis, turns))
      };
    });

    for (let k = 0; k < 4; k++) {
      nextCorners[targetPositions[k]] = rotatedPieces[k];
    }
    this.corners = nextCorners;
    return this;
  }
}

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

  const colors = {
    U: [], D: [], F: [], B: [], L: [], R: []
  };

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
// 3. PUZZLE SIMULATION LOGIC: SKEWB
//    → Moved to skewb_utils.js
// ==========================================



// ==========================================
// 4. PATH CLEANUP UTILITIES
// ==========================================

// invMove, solve, cleanupSkewbPath → moved to skewb_utils.js


function cleanupPath(moves) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < moves.length - 1; i++) {
      const m1 = moves[i];
      const m2 = moves[i+1];
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



// ==========================================
// 5. STATE AND SCRAMBLE GENERATORS
// ==========================================

// --- 2x2 Generators ---

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
  const getStickerColor = (pieceId, stickerIdx) => {
    const v = CORNER_VECS[pieceId];
    if (stickerIdx === 0) return v[1] === 1 ? 'white' : 'yellow';
    if (stickerIdx === 1) return v[2] === 1 ? 'green' : 'blue';
    return v[0] === 1 ? 'red' : 'orange';
  };
  for (let s = 0; s < 3; s++) {
    if (getFaceLetter(piece.stickers[s]) === face) {
      return getStickerColor(piece.id, s);
    }
  }
  return null;
}

function areOppositeColors(c1, c2) {
  if (c1 === 'white' && c2 === 'yellow') return true;
  if (c1 === 'yellow' && c2 === 'white') return true;
  if (c1 === 'green' && c2 === 'blue') return true;
  if (c1 === 'blue' && c2 === 'green') return true;
  if (c1 === 'red' && c2 === 'orange') return true;
  if (c1 === 'orange' && c2 === 'red') return true;
  return false;
}

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

// Fixed face center colors for the 2x2 (no centers, but fixed by convention)
const FACE_CENTER_COLORS_2X2 = { U:'white', D:'yellow', F:'green', B:'blue', R:'red', L:'orange' };

// Returns the face name that a sticker vector is pointing toward
function getStickerFace(sticker) {
  if (sticker[1] === 1) return 'U';
  if (sticker[1] === -1) return 'D';
  if (sticker[2] === 1) return 'F';
  if (sticker[2] === -1) return 'B';
  if (sticker[0] === 1) return 'R';
  if (sticker[0] === -1) return 'L';
  return null;
}

// Returns the intrinsic color of a piece sticker by sticker index
function getPieceStickerColor(pieceId, stickerIdx) {
  const v = CORNER_VECS[pieceId];
  if (stickerIdx === 0) return v[1] === 1 ? 'white' : 'yellow';
  if (stickerIdx === 1) return v[2] === 1 ? 'green' : 'blue';
  return v[0] === 1 ? 'red' : 'orange';
}

// Returns true if the corner at position pos has all 3 stickers matching their face centers
function isCorner2x2Solved(cube, pos) {
  const piece = cube.corners[pos];
  for (let s = 0; s < 3; s++) {
    const face = getStickerFace(piece.stickers[s]);
    if (!face) return false;
    const centerColor = FACE_CENTER_COLORS_2X2[face];
    const stickerColor = getPieceStickerColor(piece.id, s);
    if (stickerColor !== centerColor) return false;
  }
  return true;
}

function check2x2EasyState(cube, easyType, colorRestriction) {
  if (easyType === 'adjacent') {
    for (const d of ADJACENT_PAIRS_2X2) {
      // Both pieces must be fully solved (all 3 stickers match their face centers)
      if (!isCorner2x2Solved(cube, d.p1)) continue;
      if (!isCorner2x2Solved(cube, d.p2)) continue;
      // Apply color restriction: the shared layer face must be white
      if (colorRestriction === 'white') {
        const layerColor = FACE_CENTER_COLORS_2X2[d.f1];
        if (layerColor !== 'white') continue;
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

function generateRandom2x2State() {
  const cube = new Cube2x2();
  const freePositions = [0, 1, 2, 3, 4, 5, 6];
  for (let i = freePositions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = freePositions[i];
    freePositions[i] = freePositions[j];
    freePositions[j] = tmp;
  }
  
  const nextCorners = [];
  for (let i = 0; i < 8; i++) {
    let pieceId;
    if (i === 7) {
      pieceId = 7;
    } else {
      pieceId = freePositions[i];
    }
    // Stickers must reflect the PIECE's home orientation, not the position's.
    // A piece's stickers start pointing toward the faces of its home position.
    const v = CORNER_VECS[pieceId];
    nextCorners.push({
      id: pieceId,
      stickers: [
        [0, v[1], 0],
        [0, 0, v[2]],
        [v[0], 0, 0]
      ]
    });
  }
  cube.corners = nextCorners;

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

function generateEasy2x2State(easyType = 'adjacent', colorRestriction = 'white') {
  while (true) {
    const target = generateRandom2x2State();
    if (check2x2EasyState(target, easyType, colorRestriction)) {
      return target;
    }
  }
}

function getNormal2x2Scramble() {
  const allowed = ["U", "U'", "U2", "R", "R'", "R2", "F", "F'", "F2"];
  const scramble = [];
  let last = "";
  for (let i = 0; i < 11; i++) {
    let m;
    do {
      m = allowed[Math.floor(Math.random() * allowed.length)];
    } while (m[0] === last);
    scramble.push(m);
    last = m[0];
  }
  return scramble.join(" ");
}

function getEasy2x2Scramble(easyType = 'adjacent', colorRestriction = 'white') {
  const allowed = ["U", "U'", "U2", "R", "R'", "R2", "F", "F'", "F2"];
  while (true) {
    // Generate a random scramble of 9-12 moves
    const len = 9 + Math.floor(Math.random() * 4);
    const scramble = [];
    let last = "";
    for (let i = 0; i < len; i++) {
      let m;
      do { m = allowed[Math.floor(Math.random() * allowed.length)]; } while (m[0] === last);
      scramble.push(m);
      last = m[0];
    }
    // Apply to solved and check if easy
    const cube = new Cube2x2();
    for (const m of scramble) cube.move(m);
    if (check2x2EasyState(cube, easyType, colorRestriction)) {
      return scramble.join(" ");
    }
  }
}










// ==========================================
// 6. STATS & TIME FORMATTING HELPERS
// ==========================================

function formatTime(ms, penalty = 0) {
  if (penalty === 'DNF') return 'DNF';
  let s = (ms / 1000).toFixed(2);
  if (penalty === '+2') return `${((ms + 2000) / 1000).toFixed(2)}+`;
  return s;
}

function calculateAverage(solvesArray, length) {
  if (solvesArray.length < length) return "-";
  const slice = solvesArray.slice(-length);
  
  const dnfCount = slice.filter(s => s.penalty === 'DNF').length;
  if (dnfCount >= 2) return "DNF";
  
  const times = slice.map(s => {
    if (s.penalty === 'DNF') return Infinity;
    if (s.penalty === '+2') return s.time + 2000;
    return s.time;
  });
  
  times.sort((a, b) => a - b);
  times.pop();
  times.shift();
  
  const sum = times.reduce((acc, t) => acc + t, 0);
  return ((sum / times.length) / 1000).toFixed(2);
}

function getBestAverage(solvesArray, length) {
  if (solvesArray.length < length) return "-";
  let best = Infinity;
  for (let i = 0; i <= solvesArray.length - length; i++) {
    const slice = solvesArray.slice(i, i + length);
    const avg = calculateAverage(slice, length);
    if (avg !== "-" && avg !== "DNF") {
      const val = parseFloat(avg);
      if (val < best) {
        best = val;
      }
    }
  }
  return best === Infinity ? "-" : best.toFixed(2);
}



// ==========================================
// 7. CLIENT-SIDE BROWSER INITIALIZATION
// ==========================================

if (typeof document !== 'undefined') {
  const svgEl = document.getElementById("cube-net-svg");

  // Hint system state
  let currentAnkiCase = null;
  let hintState = 0; // 0=hidden, 1=show name, 2=show perm
  let skewbCasesData = null;

  // Load skewb_cases.json for hint lookup
  fetch('/skewb_cases.json').then(r => r.json()).then(data => {
    skewbCasesData = data;
  }).catch(() => {
    skewbCasesData = null;
  });

  function resetHint() {
    hintState = 0;
    const hintBtn = document.getElementById('hint-btn');
    const hintDisplay = document.getElementById('hint-display');
    if (hintBtn) {
      hintBtn.textContent = 'Hint';
      hintBtn.classList.remove('hint-active');
    }
    if (hintDisplay) {
      hintDisplay.textContent = '';
      hintDisplay.className = 'hint-display';
    }
  }

  function lookupAnkiCase(ankiCase) {
    if (!skewbCasesData || !ankiCase) return null;
    const { caseType, slotU, slotW } = ankiCase;

    // JSON is flat. Keys are:
    //   2_adjacent_solved: "slotU,slotW"
    //   3_solved: "3_solved:slotU"
    let key1, key2;
    if (caseType === '3_solved') {
      key1 = `3_solved:${slotU}`;
      key2 = null;
    } else {
      key1 = slotW ? `${slotU},${slotW}` : slotU;
      key2 = slotW ? `${slotW},${slotU}` : null;
    }

    // Direct lookup (including reversed ordering)
    let entry = skewbCasesData[key1] || (key2 ? skewbCasesData[key2] : null);

    // Reverse mirror lookup: find an entry whose mirrorKey matches the detected key
    if (!entry) {
      const candidates = [key1, ...(key2 ? [key2] : [])];
      for (const candidate of candidates) {
        for (const [dbKey, dbEntry] of Object.entries(skewbCasesData)) {
          if (dbEntry.mirrorKey === candidate) {
            entry = { ...dbEntry, _isMirror: true, _mirroredAs: candidate };
            break;
          }
        }
        if (entry) break;
      }
    }

    // If found and it has a mirrorKey pointing to another entry, annotate with primary info
    if (entry && entry.mirrorKey && !entry._isMirror) {
      const primaryKey = entry.mirrorKey;
      const primary = skewbCasesData[primaryKey];
      if (primary && primaryKey !== key1 && primaryKey !== key2) {
        entry = { ...entry, _isMirror: true, _primaryName: primary.name, _primaryAlg: primary.algorithm };
      }
    }

    return entry || null;
  }

  const render2x2Net = (scrambleStr) => {
    const cube = new Cube2x2();
    if (scrambleStr) {
      const moves = scrambleStr.split(" ");
      for (const m of moves) {
        if (m) cube.move(m);
      }
    }
    const f = getCube2x2Colors(cube);

    const draw2x2Face = (fx, fy, colors) => {
      return `
        <rect class="svg-facelet color-${colors[0]}" x="${fx}" y="${fy}" width="29" height="29" />
        <rect class="svg-facelet color-${colors[1]}" x="${fx+30}" y="${fy}" width="29" height="29" />
        <rect class="svg-facelet color-${colors[2]}" x="${fx}" y="${fy+30}" width="29" height="29" />
        <rect class="svg-facelet color-${colors[3]}" x="${fx+30}" y="${fy+30}" width="29" height="29" />
      `;
    };

    if (svgEl) {
      svgEl.innerHTML = `
        <!-- U Face -->
        <g>${draw2x2Face(60, 0, f.U)}</g>
        <!-- L Face -->
        <g>${draw2x2Face(0, 60, f.L)}</g>
        <!-- F Face -->
        <g>${draw2x2Face(60, 60, f.F)}</g>
        <!-- R Face -->
        <g>${draw2x2Face(120, 60, f.R)}</g>
        <!-- B Face -->
        <g>${draw2x2Face(180, 60, f.B)}</g>
        <!-- D Face -->
        <g>${draw2x2Face(60, 120, f.D)}</g>
      `;
    }
  };

  const renderSkewbNet = (scrambleStr) => {
    const skewb = new Skewb();
    if (scrambleStr) {
      const moves = scrambleStr.split(" ");
      for (const m of moves) {
        if (m) skewb.move(m);
      }
    }
    const f = getSkewbColors(skewb);

    const drawSkewbFace = (fx, fy, faceCode) => {
      const faceData = f[faceCode];
      const centerColor = faceData.center;
      const cornerIds = SKEWB_FACE_CORNER_MAP[faceCode];
      const cTL = faceData.corners[cornerIds.TL];
      const cTR = faceData.corners[cornerIds.TR];
      const cBL = faceData.corners[cornerIds.BL];
      const cBR = faceData.corners[cornerIds.BR];

      return `
        <!-- Center Diamond -->
        <path class="svg-skewb-center color-${centerColor}" d="M ${fx+30} ${fy} L ${fx+60} ${fy+30} L ${fx+30} ${fy+60} L ${fx} ${fy+30} Z" />
        <!-- Top-Left Corner -->
        <path class="svg-skewb-corner color-${cTL}" d="M ${fx} ${fy} L ${fx+30} ${fy} L ${fx} ${fy+30} Z" />
        <!-- Top-Right Corner -->
        <path class="svg-skewb-corner color-${cTR}" d="M ${fx+60} ${fy} L ${fx+30} ${fy} L ${fx+60} ${fy+30} Z" />
        <!-- Bottom-Left Corner -->
        <path class="svg-skewb-corner color-${cBL}" d="M ${fx} ${fy+60} L ${fx+30} ${fy+60} L ${fx} ${fy+30} Z" />
        <!-- Bottom-Right Corner -->
        <path class="svg-skewb-corner color-${cBR}" d="M ${fx+60} ${fy+60} L ${fx+30} ${fy+60} L ${fx+60} ${fy+30} Z" />
      `;
    };

    if (svgEl) {
      svgEl.innerHTML = `
        <!-- U Face -->
        <g>${drawSkewbFace(60, 0, 'U')}</g>
        <!-- L Face -->
        <g>${drawSkewbFace(0, 60, 'L')}</g>
        <!-- F Face -->
        <g>${drawSkewbFace(60, 60, 'F')}</g>
        <!-- R Face -->
        <g>${drawSkewbFace(120, 60, 'R')}</g>
        <!-- B Face -->
        <g>${drawSkewbFace(180, 60, 'B')}</g>
        <!-- D Face -->
        <g>${drawSkewbFace(60, 120, 'D')}</g>
      `;
    }
  };

  const renderNet = () => {
    const session = getCurrentSession();
    if (!session) return;
    if (session.puzzle === "2x2") {
      render2x2Net(currentScramble);
    } else {
      renderSkewbNet(currentScramble);
    }
  };

  let sessions = [];
  let currentSessionId = "";

  const loadSessions = () => {
    const data = localStorage.getItem('onelook_trainer_sessions');
    if (data) {
      sessions = JSON.parse(data);
      sessions.forEach(s => {
        if (!s.easyType) s.easyType = "adjacent";
        if (!s.colorRestriction) s.colorRestriction = "white";
      });
    } else {
      sessions = [
        { id: "s1", name: "2x2 Normal Practice", puzzle: "2x2", scrambleType: "normal", easyType: "adjacent", colorRestriction: "white", solves: [] },
        { id: "s2", name: "2x2 Easy Practice", puzzle: "2x2", scrambleType: "easy", easyType: "adjacent", colorRestriction: "white", solves: [] },
        { id: "s3", name: "Skewb Normal Practice", puzzle: "Skewb", scrambleType: "normal", easyType: "adjacent", colorRestriction: "white", solves: [] },
        { id: "s4", name: "Skewb Easy Practice", puzzle: "Skewb", scrambleType: "easy", easyType: "adjacent", colorRestriction: "white", solves: [] }
      ];
      saveSessions();
    }

    currentSessionId = localStorage.getItem('onelook_trainer_current_session');
    if (!currentSessionId || !sessions.some(s => s.id === currentSessionId)) {
      currentSessionId = sessions[0].id;
      localStorage.setItem('onelook_trainer_current_session', currentSessionId);
    }
  };

  const saveSessions = () => {
    localStorage.setItem('onelook_trainer_sessions', JSON.stringify(sessions));
  };

  const getCurrentSession = () => {
    return sessions.find(s => s.id === currentSessionId);
  };

  const updateStatsUI = () => {
    const session = getCurrentSession();
    if (!session) return;
    const solves = session.solves;
    const activeSolves = solves.filter(s => s);

    const elAo5 = document.getElementById("stat-ao5");
    const elAo12 = document.getElementById("stat-ao12");
    const elAo50 = document.getElementById("stat-ao50");
    const elAo100 = document.getElementById("stat-ao100");
    
    const elBestAo5 = document.getElementById("stat-best-ao5");
    const elBestAo12 = document.getElementById("stat-best-ao12");
    const elBestAo50 = document.getElementById("stat-best-ao50");
    const elBestAo100 = document.getElementById("stat-best-ao100");
    
    const elCount = document.getElementById("stat-count");

    if (!elAo5) return;

    if (activeSolves.length === 0) {
      elAo5.textContent = "-";
      elAo12.textContent = "-";
      elAo50.textContent = "-";
      elAo100.textContent = "-";
      if (elBestAo5) elBestAo5.textContent = "-";
      if (elBestAo12) elBestAo12.textContent = "-";
      if (elBestAo50) elBestAo50.textContent = "-";
      if (elBestAo100) elBestAo100.textContent = "-";
      elCount.textContent = "0";
      return;
    }

    elCount.textContent = activeSolves.length;

    elAo5.textContent = calculateAverage(activeSolves, 5);
    elAo12.textContent = calculateAverage(activeSolves, 12);
    elAo50.textContent = calculateAverage(activeSolves, 50);
    elAo100.textContent = calculateAverage(activeSolves, 100);

    if (elBestAo5) elBestAo5.textContent = getBestAverage(activeSolves, 5);
    if (elBestAo12) elBestAo12.textContent = getBestAverage(activeSolves, 12);
    if (elBestAo50) elBestAo50.textContent = getBestAverage(activeSolves, 50);
    if (elBestAo100) elBestAo100.textContent = getBestAverage(activeSolves, 100);
  };

  const generateScramble = () => {
    const session = getCurrentSession();
    if (!session) return;

    const button = document.getElementById("next-scramble-btn");
    if (button) {
      button.disabled = true;
      button.textContent = "Loading...";
    }

    setTimeout(() => {
      if (session.puzzle === "2x2") {
        if (session.scrambleType === "easy") {
          currentScramble = getEasy2x2Scramble(session.easyType, session.colorRestriction);
        } else {
          currentScramble = getNormal2x2Scramble();
        }
        currentAnkiCase = null;
      } else {
        if (session.scrambleType === "easy" && session.easyType === 'adjacent') {
          const result = getEasySkewbScramble(session.easyType, session.colorRestriction);
          currentScramble = result.scramble;
          // Look up the Anki case from the scramble state
          currentAnkiCase = getAnkiCaseForSkewb(result.state, session.colorRestriction);
        } else {
          currentScramble = getNormalSkewbScramble();
          currentAnkiCase = null;
        }
      }

      const textEl = document.getElementById("scramble-text");
      if (textEl) {
        textEl.textContent = currentScramble;
      }
      renderNet();
      resetHint();
      
      if (button) {
        button.disabled = false;
        button.textContent = "Next";
      }
    }, 10);
  };

  let timerState = 'idle'; 
  let timerStartTime = 0;
  let timerElapsedTime = 0;
  let timerHoldTimeout = null;
  let timerAnimationFrameId = null;

  const timerDisplay = document.getElementById("timer-display");
  const timerContainer = document.getElementById("timer-trigger");

  const updateTimerDisplay = () => {
    const diff = Date.now() - timerStartTime;
    if (timerDisplay) {
      timerDisplay.textContent = (diff / 1000).toFixed(2);
    }
    timerAnimationFrameId = requestAnimationFrame(updateTimerDisplay);
  };

  const onTimerPress = () => {
    if (timerState === 'idle') {
      timerState = 'ready';
      if (timerDisplay) {
        timerDisplay.className = "timer-display timer-ready";
      }
    } else if (timerState === 'running') {
      cancelAnimationFrame(timerAnimationFrameId);
      timerElapsedTime = Date.now() - timerStartTime;
      if (timerDisplay) {
        timerDisplay.textContent = (timerElapsedTime / 1000).toFixed(2);
        timerDisplay.className = "timer-display timer-idle";
      }
      timerState = 'idle';
      
      saveSolve(timerElapsedTime);
    }
  };

  const onTimerRelease = () => {
    if (timerState === 'ready') {
      timerState = 'running';
      if (timerDisplay) {
        timerDisplay.className = "timer-display timer-running";
      }
      timerStartTime = Date.now();
      updateTimerDisplay();
    }
  };

  let modalOpen = false;

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (addSessionModal && addSessionModal.classList.contains("active")) {
        addSessionModal.classList.remove("active");
        modalOpen = false;
      }
      if (detailModal && detailModal.classList.contains("active")) {
        closeSolveDetailModal();
      }
      return;
    }
    if (modalOpen) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      onTimerPress();
    }
  });

  document.addEventListener('keyup', (e) => {
    if (modalOpen) return;
    if (e.code === 'Space') {
      e.preventDefault();
      onTimerRelease();
    }
  });

  if (timerContainer) {
    timerContainer.addEventListener('mousedown', (e) => {
      if (e.button === 0) onTimerPress();
    });
    timerContainer.addEventListener('mouseup', (e) => {
      if (e.button === 0) onTimerRelease();
    });
    timerContainer.addEventListener('touchstart', (e) => {
      e.preventDefault();
      onTimerPress();
    });
    timerContainer.addEventListener('touchend', (e) => {
      e.preventDefault();
      onTimerRelease();
    });
  }

  const triggerPBEffects = (lengths) => {
    lengths.forEach(len => {
      const el = document.getElementById(`stat-best-ao${len}`);
      if (el) {
        const card = el.closest(".stat-box");
        if (card) {
          card.classList.remove("pb-record-flash");
          void card.offsetWidth; // Trigger reflow
          card.classList.add("pb-record-flash");
        }
      }
    });

    const popup = document.createElement("div");
    popup.className = "pb-popup";
    popup.innerHTML = `
      <span class="pb-popup-icon">🏆</span>
      <div class="pb-popup-body">
        <span class="pb-popup-label">Personal Record!</span>
        <span class="pb-popup-detail">New best ao${lengths.join(" & ao")}</span>
      </div>
    `;
    document.body.appendChild(popup);
    // Trigger show animation
    requestAnimationFrame(() => popup.classList.add("pb-popup-visible"));
    setTimeout(() => {
      popup.classList.add("pb-popup-hiding");
      setTimeout(() => popup.remove(), 400);
    }, 2800);
  };

  const saveSolve = (timeMs) => {
    const session = getCurrentSession();
    if (!session) return;
    
    const activeSolves = session.solves.filter(s => s);
    const prevBest = {
      5: getBestAverage(activeSolves, 5),
      12: getBestAverage(activeSolves, 12),
      50: getBestAverage(activeSolves, 50),
      100: getBestAverage(activeSolves, 100)
    };
    
    const solveObject = {
      id: 'solve_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      time: timeMs,
      scramble: currentScramble,
      date: Date.now(),
      penalty: 0
    };
    
    session.solves.push(solveObject);
    saveSessions();
    
    const newActiveSolves = session.solves.filter(s => s);
    const newBest = {
      5: getBestAverage(newActiveSolves, 5),
      12: getBestAverage(newActiveSolves, 12),
      50: getBestAverage(newActiveSolves, 50),
      100: getBestAverage(newActiveSolves, 100)
    };

    let recordBroken = [];
    [5, 12, 50, 100].forEach(len => {
      if (newBest[len] !== "-" && (prevBest[len] === "-" || parseFloat(newBest[len]) < parseFloat(prevBest[len]))) {
        recordBroken.push(len);
      }
    });

    renderTimesList();
    updateStatsUI();
    generateScramble();

    if (recordBroken.length > 0) {
      triggerPBEffects(recordBroken);
    }
  };

  const renderTimesList = () => {
    const session = getCurrentSession();
    if (!session) return;
    
    const listEl = document.getElementById("times-list");
    if (!listEl) return;
    listEl.innerHTML = "";
    
    const activeSolves = [...session.solves].reverse();
    
    activeSolves.forEach((s) => {
      const actualIdx = session.solves.indexOf(s);
      const li = document.createElement("li");
      li.addEventListener("click", () => openSolveDetailModal(actualIdx));
      
      let penaltyClass = "";
      if (s.penalty === '+2') penaltyClass = "plus2";
      if (s.penalty === 'DNF') penaltyClass = "dnf";
      
      li.innerHTML = `
        <span class="time-idx">#${actualIdx + 1}</span>
        <span class="time-val ${penaltyClass}">${formatTime(s.time, s.penalty)}</span>
      `;
      listEl.appendChild(li);
    });
  };

  let activeSolveIndex = null;
  const detailModal = document.getElementById("time-detail-modal");

  const openSolveDetailModal = (index) => {
    const session = getCurrentSession();
    if (!session) return;
    const s = session.solves[index];
    if (!s) return;
    
    activeSolveIndex = index;
    modalOpen = true;
    if (detailModal) {
      detailModal.classList.add("active");
    }
    
    const elTime = document.getElementById("detail-time-val");
    const elScramble = document.getElementById("detail-scramble-val");
    const elDate = document.getElementById("detail-date-val");
    
    if (elTime) elTime.textContent = formatTime(s.time, s.penalty);
    if (elScramble) elScramble.textContent = s.scramble;
    if (elDate) elDate.textContent = new Date(s.date).toLocaleString();

    const plus2Btn = document.getElementById("detail-plus2-btn");
    const dnfBtn = document.getElementById("detail-dnf-btn");

    if (plus2Btn) {
      plus2Btn.className = s.penalty === '+2' ? "action-btn-sm primary" : "action-btn-sm";
    }
    if (dnfBtn) {
      dnfBtn.className = s.penalty === 'DNF' ? "action-btn-sm danger" : "action-btn-sm danger-btn";
    }
  };

  const closeSolveDetailModal = () => {
    if (detailModal) {
      detailModal.classList.remove("active");
    }
    modalOpen = false;
    activeSolveIndex = null;
  };

  const detailCloseBtn = document.getElementById("detail-close-btn");
  if (detailCloseBtn) {
    detailCloseBtn.addEventListener("click", closeSolveDetailModal);
  }

  const detailPlus2Btn = document.getElementById("detail-plus2-btn");
  if (detailPlus2Btn) {
    detailPlus2Btn.addEventListener("click", () => {
      const session = getCurrentSession();
      if (activeSolveIndex !== null && session) {
        const s = session.solves[activeSolveIndex];
        s.penalty = s.penalty === '+2' ? 0 : '+2';
        saveSessions();
        renderTimesList();
        updateStatsUI();
        openSolveDetailModal(activeSolveIndex);
      }
    });
  }

  const detailDnfBtn = document.getElementById("detail-dnf-btn");
  if (detailDnfBtn) {
    detailDnfBtn.addEventListener("click", () => {
      const session = getCurrentSession();
      if (activeSolveIndex !== null && session) {
        const s = session.solves[activeSolveIndex];
        s.penalty = s.penalty === 'DNF' ? 0 : 'DNF';
        saveSessions();
        renderTimesList();
        updateStatsUI();
        openSolveDetailModal(activeSolveIndex);
      }
    });
  }

  const detailDeleteBtn = document.getElementById("detail-delete-btn");
  if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener("click", () => {
      const session = getCurrentSession();
      if (activeSolveIndex !== null && session) {
        if (confirm("Are you sure you want to delete this solve?")) {
          session.solves.splice(activeSolveIndex, 1);
          saveSessions();
          renderTimesList();
          updateStatsUI();
          closeSolveDetailModal();
        }
      }
    });
  }

  const sessionSelect = document.getElementById("session-select");
  const addSessionModal = document.getElementById("add-session-modal");
  const addSessionForm = document.getElementById("add-session-form");

  const renderSessionDropdown = () => {
    if (!sessionSelect) return;
    sessionSelect.innerHTML = "";
    sessions.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      opt.selected = s.id === currentSessionId;
      sessionSelect.appendChild(opt);
    });
  };

  const updateSessionUI = () => {
    const session = getCurrentSession();
    if (!session) return;

    const elPuzzlePill = document.getElementById("session-puzzle-pill");
    const elScramblePill = document.getElementById("session-scramble-pill");

    if (elPuzzlePill) elPuzzlePill.textContent = session.puzzle;
    
    if (elScramblePill) {
      if (session.scrambleType === "easy") {
        const typeLabel = session.easyType === "diagonal" ? "Diag" : "Adj";
        const colorLabel = session.colorRestriction === "any" ? "Neutral" : "White";
        elScramblePill.textContent = `Easy ${typeLabel} (${colorLabel})`;
        elScramblePill.className = "pill pill-accent";
      } else {
        elScramblePill.textContent = "Normal";
        elScramblePill.className = "pill";
      }
    }

    generateScramble();
    renderTimesList();
    updateStatsUI();

    // Show hint section only for Skewb easy adjacent sessions
    const hintSection = document.getElementById('hint-section');
    if (hintSection) {
      const showHint = session.puzzle === 'Skewb' && session.scrambleType === 'easy' && session.easyType === 'adjacent';
      hintSection.style.display = showHint ? 'flex' : 'none';
    }
  };

  if (sessionSelect) {
    sessionSelect.addEventListener("change", (e) => {
      currentSessionId = e.target.value;
      localStorage.setItem('onelook_trainer_current_session', currentSessionId);
      updateSessionUI();
    });
  }

  const addSessionBtn = document.getElementById("add-session-btn");
  const newSessionPuzzle = document.getElementById("new-session-puzzle");
  const newSessionScramble = document.getElementById("new-session-scramble");
  const easyTypeGroup = document.getElementById("easy-options-type-group");
  const easyColorGroup = document.getElementById("easy-options-color-group");

  const updateModalFieldsVisibility = () => {
    if (!newSessionScramble) return;
    if (newSessionScramble.value === "easy") {
      if (easyColorGroup) easyColorGroup.style.display = "block";
      if (newSessionPuzzle && newSessionPuzzle.value === "Skewb") {
        if (easyTypeGroup) easyTypeGroup.style.display = "block";
      } else {
        if (easyTypeGroup) easyTypeGroup.style.display = "none";
      }
    } else {
      if (easyTypeGroup) easyTypeGroup.style.display = "none";
      if (easyColorGroup) easyColorGroup.style.display = "none";
    }
  };

  if (newSessionScramble) {
    newSessionScramble.addEventListener("change", updateModalFieldsVisibility);
  }
  if (newSessionPuzzle) {
    newSessionPuzzle.addEventListener("change", updateModalFieldsVisibility);
  }

  if (addSessionBtn) {
    addSessionBtn.addEventListener("click", () => {
      modalOpen = true;
      if (addSessionModal) {
        addSessionModal.classList.add("active");
      }
      const nameInput = document.getElementById("new-session-name");
      if (nameInput) {
        nameInput.value = "";
        nameInput.focus();
      }
      if (newSessionPuzzle) {
        newSessionPuzzle.value = "2x2";
      }
      if (newSessionScramble) {
        newSessionScramble.value = "normal";
      }
      if (easyTypeGroup) easyTypeGroup.style.display = "none";
      if (easyColorGroup) easyColorGroup.style.display = "none";
    });
  }

  const modalCancelBtn = document.getElementById("modal-cancel-btn");
  if (modalCancelBtn) {
    modalCancelBtn.addEventListener("click", () => {
      if (addSessionModal) {
        addSessionModal.classList.remove("active");
      }
      modalOpen = false;
    });
  }

  if (addSessionForm) {
    addSessionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("new-session-name").value.trim();
      const puzzle = document.getElementById("new-session-puzzle").value;
      const scramble = document.getElementById("new-session-scramble").value;
      let easyType = document.getElementById("new-session-easy-type").value;
      const colorRestriction = document.getElementById("new-session-color-restriction").value;
      
      if (puzzle === "2x2") {
        easyType = "adjacent"; // Diagonal is not training-useful for 2x2
      }

      if (name) {
        const newId = 'session_' + Date.now();
        const newSession = {
          id: newId,
          name: name,
          puzzle: puzzle,
          scrambleType: scramble,
          easyType: easyType,
          colorRestriction: colorRestriction,
          solves: []
        };
        sessions.push(newSession);
        currentSessionId = newId;
        localStorage.setItem('onelook_trainer_current_session', newId);
        saveSessions();
        
        renderSessionDropdown();
        updateSessionUI();
        
        if (addSessionModal) {
          addSessionModal.classList.remove("active");
        }
        modalOpen = false;
      }
    });
  }

  const clearSessionBtn = document.getElementById("clear-session-btn");
  if (clearSessionBtn) {
    clearSessionBtn.addEventListener("click", () => {
      const session = getCurrentSession();
      if (session && session.solves.length > 0) {
        if (confirm("Delete ALL solves in the current session? This cannot be undone.")) {
          session.solves = [];
          saveSessions();
          renderTimesList();
          updateStatsUI();
        }
      }
    });
  }

  const nextScrambleBtn = document.getElementById("next-scramble-btn");
  if (nextScrambleBtn) {
    nextScrambleBtn.addEventListener("click", generateScramble);
  }

  const copyScrambleBtn = document.getElementById("copy-scramble-btn");
  if (copyScrambleBtn) {
    copyScrambleBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(currentScramble).then(() => {
        copyScrambleBtn.textContent = "Copied!";
        setTimeout(() => {
          copyScrambleBtn.textContent = "Copy";
        }, 1500);
      });
    });
  }

  const hintBtn = document.getElementById('hint-btn');
  if (hintBtn) {
    hintBtn.addEventListener('click', () => {
      const session = getCurrentSession();
      if (!session || session.puzzle !== 'Skewb' || session.scrambleType !== 'easy') return;
      if (!currentAnkiCase) return;

      const entry = lookupAnkiCase(currentAnkiCase);
      const hintDisplay = document.getElementById('hint-display');
      const slotLabel = currentAnkiCase.caseType === '3_solved'
        ? currentAnkiCase.slotU
        : `${currentAnkiCase.slotU},${currentAnkiCase.slotW}`;

      hintState = (hintState + 1) % 3;

      if (hintState === 0) {
        resetHint();
      } else if (hintState === 1) {
        // Show case name + slot letters
        let name;
        if (entry) {
          const caseName = entry.name || entry.key || slotLabel;
          if (entry._isMirror) {
            // Reverse-mirror: detected case IS the mirror of a named case
            const primaryName = entry._primaryName || entry.name;
            name = `${caseName} → mirror [${slotLabel}]`;
            if (entry._mirroredAs) {
              name = `${caseName} ← mirror [${slotLabel}]`;
            }
          } else {
            name = `${caseName} [${slotLabel}]`;
          }
        } else {
          name = `[${slotLabel}] — not in deck`;
        }
        if (hintDisplay) {
          hintDisplay.textContent = name;
          hintDisplay.className = 'hint-display hint-name';
        }
        hintBtn.textContent = 'Alg';
        hintBtn.classList.add('hint-active');
      } else if (hintState === 2) {
        // Show algorithm + full transformation (cornerPerm + centerPerm)
        if (hintDisplay) {
          if (entry) {
            const alg = entry.algorithm || entry._primaryAlg || '?';
            const mirrorNote = entry._isMirror ? ' <span class="hint-mirror-tag">mirror</span>' : '';
            const cp  = entry.cornerPerm  ? `<div class="hint-perm-line"><span class="hint-perm-label">corners</span>${entry.cornerPerm}</div>` : '';
            const cen = entry.centerPerm  ? `<div class="hint-perm-line"><span class="hint-perm-label">centers</span>${entry.centerPerm}</div>` : '';
            hintDisplay.innerHTML = `<div class="hint-alg-line">${alg}${mirrorNote}</div>${cp}${cen}`;
          } else {
            hintDisplay.textContent = `[${slotLabel}] — no algorithm in deck`;
          }
          hintDisplay.className = 'hint-display hint-perm';
        }
        hintBtn.textContent = 'Hide';
      }
    });
  }

  const init = () => {
    loadSessions();
    renderSessionDropdown();
    updateSessionUI();
  };

  window.addEventListener("DOMContentLoaded", init);
}

// Export classes and helpers for Node tests.
// Skewb symbols are re-exported from skewb_utils.js for backward compatibility.
if (typeof module !== 'undefined' && module.exports) {
  const skewbUtils = require('./skewb_utils.js');
  module.exports = {
    // 2x2 symbols
    Cube2x2,
    getCube2x2Colors,
    calculateAverage,
    formatTime,
    generateEasy2x2State,
    getEasy2x2Scramble,
    getNormal2x2Scramble,
    cleanupPath,
    check2x2EasyState,
    getBestAverage,
    // Skewb symbols (from skewb_utils.js)
    ...skewbUtils,
  };
}
