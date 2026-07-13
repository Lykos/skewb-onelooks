// test_suite.js
const assert = require('assert');
const { spawn } = require('child_process');
const http = require('http');
const {
  Cube2x2,
  Skewb,
  solve,
  getCube2x2Colors,
  getSkewbColors,
  calculateAverage,
  formatTime,
  hasEasySkewb,
  generateEasy2x2State,
  generateEasySkewbState,
  cleanupPath,
  cleanupSkewbPath,
  check2x2EasyState,
  checkSkewbEasyState
} = require('./app.js');

const failures = [];
function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failures.push({ name, error: err });
  }
}

// ==========================================
// 1. UNIT TESTS: CUBE 2X2
// ==========================================

test("2x2: Solved cube is solved", () => {
  const cube = new Cube2x2();
  assert.strictEqual(cube.isSolved(), true, "Solved cube should report isSolved() === true");
});

test("2x2: Basic move R can be inverted", () => {
  const cube = new Cube2x2();
  cube.move("R");
  assert.strictEqual(cube.isSolved(), false, "Cube should not be solved after R move");
  cube.move("R'");
  assert.strictEqual(cube.isSolved(), true, "Cube should be solved after R R'");
});

test("2x2: Colors of solved U face are all white", () => {
  const cube = new Cube2x2();
  const colors = getCube2x2Colors(cube);
  assert.deepStrictEqual(colors.U, ["white", "white", "white", "white"], "Solved U face should be all white");
  assert.deepStrictEqual(colors.F, ["green", "green", "green", "green"], "Solved F face should be all green");
  assert.deepStrictEqual(colors.R, ["red", "red", "red", "red"], "Solved R face should be all red");
  assert.deepStrictEqual(colors.B, ["blue", "blue", "blue", "blue"], "Solved B face should be all blue");
  assert.deepStrictEqual(colors.L, ["orange", "orange", "orange", "orange"], "Solved L face should be all orange");
  assert.deepStrictEqual(colors.D, ["yellow", "yellow", "yellow", "yellow"], "Solved D face should be all yellow");
});

test("2x2: Move U does not change U face colors, only permutes them", () => {
  const cube = new Cube2x2();
  cube.move("U");
  const colors = getCube2x2Colors(cube);
  assert.deepStrictEqual(colors.U, ["white", "white", "white", "white"], "U move should preserve white U face");
  // Check L, F, R, B are cycled on the top layer
  assert.deepStrictEqual(colors.F.slice(0, 2), ["red", "red"], "Top of F face should cycle to Red under U");
});


// ==========================================
// 2. UNIT TESTS: SKEWB
// ==========================================

test("Skewb: Solved skewb is solved", () => {
  const skewb = new Skewb();
  assert.strictEqual(skewb.isSolved(), true, "Solved skewb should report isSolved() === true");
});

test("Skewb: Basic move R can be inverted", () => {
  const skewb = new Skewb();
  skewb.move("R");
  assert.strictEqual(skewb.isSolved(), false, "Skewb should not be solved after R move");
  skewb.move("R'");
  assert.strictEqual(skewb.isSolved(), true, "Skewb should be solved after R R'");
});

test("Skewb: Solved colors are correct", () => {
  const skewb = new Skewb();
  const colors = getSkewbColors(skewb);
  
  assert.strictEqual(colors.U.center, "white");
  assert.deepStrictEqual(Object.values(colors.U.corners), ["white", "white", "white", "white"]);

  assert.strictEqual(colors.F.center, "green");
  assert.deepStrictEqual(Object.values(colors.F.corners), ["green", "green", "green", "green"]);

  assert.strictEqual(colors.R.center, "red");
  assert.deepStrictEqual(Object.values(colors.R.corners), ["red", "red", "red", "red"]);
});


// ==========================================
// 3. UNIT TESTS: SOLVER
// ==========================================

test("Solver: Solves 2x2 optimal scramble", () => {
  const solved = new Cube2x2();
  const target = solved.clone().move("R").move("U'").move("F2");
  
  const allowed = ["U", "U'", "U2", "R", "R'", "R2", "F", "F'", "F2"];
  const solution = solve(solved, target, allowed);
  
  assert.ok(solution, "Solver should return a path");
  assert.ok(solution.length <= 3, "Optimal solution should be <= 3 moves");
  
  const testCube = solved.clone();
  for (const m of solution) {
    testCube.move(m);
  }
  assert.strictEqual(testCube.getKey(), target.getKey(), "Solution should lead to the target state");
});

test("Solver: Solves Skewb optimal scramble", () => {
  const solved = new Skewb();
  const target = solved.clone().move("R").move("U'").move("L");
  
  const allowed = ["U", "U'", "R", "R'", "L", "L'", "B", "B'"];
  const solution = solve(solved, target, allowed);
  
  assert.ok(solution, "Solver should return a path");
  assert.ok(solution.length <= 3, "Optimal solution should be <= 3 moves");
  
  const testSkewb = solved.clone();
  for (const m of solution) {
    testSkewb.move(m);
  }
  assert.strictEqual(testSkewb.getKey(), target.getKey(), "Solution should lead to the target state");
});


// ==========================================
// 4. UNIT TESTS: STATS CALCULATIONS
// ==========================================

test("Stats: calculateAverage correctly computes ao5", () => {
  const solves = [
    { time: 10000, penalty: 0 },
    { time: 12000, penalty: 0 },
    { time: 8000, penalty: 0 },
    { time: 11000, penalty: 0 },
    { time: 9500, penalty: 0 }
  ];
  // Sorted: 8000, 9500, 10000, 11000, 12000
  // Remove best (8000) and worst (12000)
  // Average: (9500 + 10000 + 11000) / 3 = 10166.67 ms = 10.17 seconds
  const avg = calculateAverage(solves, 5);
  assert.strictEqual(avg, "10.17", "ao5 calculation is wrong");
});

test("Stats: calculateAverage handles +2 penalty", () => {
  const solves = [
    { time: 10000, penalty: 0 },
    { time: 12000, penalty: 0 },
    { time: 8000, penalty: 0 },
    { time: 11000, penalty: '+2' }, // becomes 13000
    { time: 9500, penalty: 0 }
  ];
  // Sorted: 8000, 9500, 10000, 12000, 13000
  // Average of: 9500, 10000, 12000 = 10500 ms = 10.50 seconds
  const avg = calculateAverage(solves, 5);
  assert.strictEqual(avg, "10.50", "ao5 with +2 is wrong");
});

test("Stats: calculateAverage handles single DNF", () => {
  const solves = [
    { time: 10000, penalty: 0 },
    { time: 12000, penalty: 'DNF' }, // treated as Infinity (worst)
    { time: 8000, penalty: 0 },
    { time: 11000, penalty: 0 },
    { time: 9500, penalty: 0 }
  ];
  // Sorted: 8000, 9500, 10000, 11000, Infinity
  // Average of: 9500, 10000, 11000 = 10166.67 ms = 10.17 seconds
  const avg = calculateAverage(solves, 5);
  assert.strictEqual(avg, "10.17", "ao5 with single DNF is wrong");
});

test("Stats: calculateAverage handles double DNF", () => {
  const solves = [
    { time: 10000, penalty: 0 },
    { time: 12000, penalty: 'DNF' },
    { time: 8000, penalty: 0 },
    { time: 11000, penalty: 'DNF' },
    { time: 9500, penalty: 0 }
  ];
  const avg = calculateAverage(solves, 5);
  assert.strictEqual(avg, "DNF", "ao5 with double DNF should return DNF");
});

test("Stats: formatTime formatting", () => {
  assert.strictEqual(formatTime(12340, 0), "12.34");
  assert.strictEqual(formatTime(12340, "+2"), "14.34+");
  assert.strictEqual(formatTime(12340, "DNF"), "DNF");
});


// ==========================================
// 5. UNIT TESTS: EASY STATE GENERATORS
// ==========================================

test("Generators: generateEasy2x2State all combinations", () => {
  const allowed = ["U", "U'", "U2", "R", "R'", "R2", "F", "F'", "F2"];
  const solved = new Cube2x2();

  for (const easyType of ['adjacent', 'diagonal']) {
    for (const colorRestriction of ['white', 'any']) {
      const target = generateEasy2x2State(easyType, colorRestriction);
      assert.ok(target instanceof Cube2x2);
      assert.ok(check2x2EasyState(target, easyType, colorRestriction), `Failed check for ${easyType} ${colorRestriction}`);
      
      const solution = solve(solved, target, allowed);
      assert.ok(solution, `Easy 2x2 state (${easyType}, ${colorRestriction}) must be solvable`);
    }
  }
});

test("Generators: generateEasySkewbState all combinations", () => {
  const allowed = ["U", "U'", "R", "R'", "L", "L'", "B", "B'"];
  const solved = new Skewb();

  for (const easyType of ['adjacent', 'diagonal']) {
    for (const colorRestriction of ['white', 'any']) {
      const target = generateEasySkewbState(easyType, colorRestriction);
      assert.ok(target instanceof Skewb);
      assert.ok(checkSkewbEasyState(target, easyType, colorRestriction), `Failed check for ${easyType} ${colorRestriction}`);
      
      const solution = solve(solved, target, allowed);
      assert.ok(solution, `Easy Skewb state (${easyType}, ${colorRestriction}) must be solvable`);
    }
  }
});

test("Cleanup: cleanupPath simplifies 2x2 redundant and canceling moves", () => {
  assert.deepStrictEqual(cleanupPath(["R", "R'"]), [], "R R' should cancel out");
  assert.deepStrictEqual(cleanupPath(["R", "R"]), ["R2"], "R R should simplify to R2");
  assert.deepStrictEqual(cleanupPath(["R'", "R'"]), ["R2"], "R' R' should simplify to R2");
  assert.deepStrictEqual(
    cleanupPath(["U", "R", "U'", "R", "R'", "U2", "F'", "U2"]),
    ["U", "R", "U", "F'", "U2"],
    "Cascading cancellation is wrong"
  );
});

test("Cleanup: cleanupSkewbPath simplifies Skewb redundant moves", () => {
  assert.deepStrictEqual(cleanupSkewbPath(["R", "R'"]), [], "R R' should cancel out");
  assert.deepStrictEqual(cleanupSkewbPath(["R", "R"]), ["R'"], "R R should simplify to R'");
  assert.deepStrictEqual(cleanupSkewbPath(["R'", "R'"]), ["R"], "R' R' should simplify to R");
});

// ==========================================
// 6. E2E WEBPAGE SERVER HOSTING TEST
// ==========================================

function runE2ETests(callback) {
  console.log("Starting E2E Server hosting test...");
  
  // Spawn server on a test port 8081
  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: '8081' }
  });

  const startRequests = () => {
    const testUrl = (urlPath, expectedContentType, expectedSnippet, cb) => {
      http.get(`http://localhost:8081${urlPath}`, (res) => {
        assert.strictEqual(res.statusCode, 200, `${urlPath} should return status 200`);
        assert.ok(res.headers['content-type'].includes(expectedContentType), `${urlPath} content-type should be ${expectedContentType}`);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          assert.ok(data.includes(expectedSnippet), `${urlPath} should contain expected content snippet`);
          cb();
        });
      }).on('error', (err) => {
        assert.fail(`Could not connect to server on localhost:8081: ${err.message}`);
        cb();
      });
    };

    testUrl('/', 'text/html', 'One-Look Speedcubing Trainer', () => {
      console.log("✅ PASS: E2E - Fetch index.html OK");
      testUrl('/style.css', 'text/css', '--bg-app', () => {
        console.log("✅ PASS: E2E - Fetch style.css OK");
        testUrl('/app.js', 'text/javascript', 'class Cube2x2', () => {
          console.log("✅ PASS: E2E - Fetch app.js OK");
          
          serverProc.kill();
          callback();
        });
      });
    });
  };

  // Give the spawned server process 300ms to bind to port 8081
  setTimeout(startRequests, 300);
}

// Run tests
console.log("==========================================");
console.log("        RUNNING UNIT TEST SUITE           ");
console.log("==========================================");

// Run all synchronous unit tests first
// E2E test runs asynchronously at the end
setTimeout(() => {
  runE2ETests(() => {
    console.log("==========================================");
    if (failures.length === 0) {
      console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
      process.exit(0);
    } else {
      console.error(`❌ ${failures.length} TEST(S) FAILED.`);
      process.exit(1);
    }
  });
}, 100);
