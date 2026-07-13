// test_puzzles.js
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

function test2x2Colors() {
  const cube = new Cube2x2();
  console.log("Solved U face colors (expected all white):", getCube2x2Colors(cube).U);
  console.log("Solved F face colors (expected all green):", getCube2x2Colors(cube).F);
  console.log("Solved R face colors (expected all red):", getCube2x2Colors(cube).R);
  console.log("Solved B face colors (expected all blue):", getCube2x2Colors(cube).B);
  console.log("Solved L face colors (expected all orange):", getCube2x2Colors(cube).L);
  console.log("Solved D face colors (expected all yellow):", getCube2x2Colors(cube).D);
}

test2x2Colors();
