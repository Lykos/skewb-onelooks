#!/usr/bin/env node
/**
 * test_e2e.js — End-to-end HTTP server tests
 *
 * Role: Spins up server.js on a test port and fires real HTTP requests to verify
 * that the server correctly serves all static assets with the right status codes,
 * Content-Type headers, and content. Also checks security behaviour (404s for
 * missing files, 403 for directory-traversal attempts).
 *
 * Run with: node test_e2e.js
 * Requires: server.js to be in the same directory.
 */
'use strict';

const http = require('http');
const assert = require('assert');
const { spawn } = require('child_process');

const PORT = 8082; // dedicated test port, avoids collisions with dev server
const BASE = `http://localhost:${PORT}`;

let passed = 0, failed = 0;

function pass(msg) { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg, err) { console.error(`  ❌ ${msg}`); if (err) console.error(`     ${err.message}`); failed++; }

/**
 * Fetches a URL and resolves with { statusCode, contentType, body }.
 */
function fetch(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${urlPath}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({
        statusCode: res.statusCode,
        contentType: res.headers['content-type'] || '',
        body,
      }));
    }).on('error', reject);
  });
}

async function runTests(server) {
  // ── Static asset serving ──────────────────────────────────────────────────

  // GET / serves index.html
  try {
    const r = await fetch('/');
    assert.strictEqual(r.statusCode, 200, 'status');
    assert.ok(r.contentType.includes('text/html'), `content-type: ${r.contentType}`);
    assert.ok(r.body.includes('One-Look Speedcubing Trainer'), 'page title missing');
    assert.ok(r.body.includes('<script src="puzzle_utils.js">'), 'puzzle_utils.js script tag missing');
    assert.ok(r.body.includes('<script src="app.js">'), 'app.js script tag missing');
    pass('GET / — 200 HTML, correct title and script tags');
  } catch (e) { fail('GET / — 200 HTML, correct title and script tags', e); }

  // GET /index.html (explicit)
  try {
    const r = await fetch('/index.html');
    assert.strictEqual(r.statusCode, 200, 'status');
    assert.ok(r.contentType.includes('text/html'), `content-type: ${r.contentType}`);
    pass('GET /index.html — 200 HTML');
  } catch (e) { fail('GET /index.html — 200 HTML', e); }

  // GET /style.css
  try {
    const r = await fetch('/style.css');
    assert.strictEqual(r.statusCode, 200, 'status');
    assert.ok(r.contentType.includes('text/css'), `content-type: ${r.contentType}`);
    assert.ok(r.body.includes('--bg-app'), 'CSS variable --bg-app missing');
    pass('GET /style.css — 200 CSS, contains design tokens');
  } catch (e) { fail('GET /style.css — 200 CSS, contains design tokens', e); }

  // GET /puzzle_utils.js
  try {
    const r = await fetch('/puzzle_utils.js');
    assert.strictEqual(r.statusCode, 200, 'status');
    assert.ok(r.contentType.includes('text/javascript'), `content-type: ${r.contentType}`);
    assert.ok(r.body.includes('class Cube2x2'), 'Cube2x2 class missing');
    assert.ok(r.body.includes('class Skewb'), 'Skewb class missing');
    assert.ok(r.body.includes('function solve('), 'solve() missing');
    pass('GET /puzzle_utils.js — 200 JS, contains Cube2x2, Skewb, solve');
  } catch (e) { fail('GET /puzzle_utils.js — 200 JS, contains Cube2x2, Skewb, solve', e); }

  // GET /app.js
  try {
    const r = await fetch('/app.js');
    assert.strictEqual(r.statusCode, 200, 'status');
    assert.ok(r.contentType.includes('text/javascript'), `content-type: ${r.contentType}`);
    assert.ok(r.body.includes('formatTime'), 'formatTime missing');
    assert.ok(r.body.includes('calculateAverage'), 'calculateAverage missing');
    pass('GET /app.js — 200 JS, contains stats helpers');
  } catch (e) { fail('GET /app.js — 200 JS, contains stats helpers', e); }

  // GET /skewb_cases.json
  try {
    const r = await fetch('/skewb_cases.json');
    assert.strictEqual(r.statusCode, 200, 'status');
    assert.ok(r.contentType.includes('application/json'), `content-type: ${r.contentType}`);
    const data = JSON.parse(r.body); // throws if invalid JSON
    assert.ok(Array.isArray(data) || typeof data === 'object', 'expected JSON array or object');
    pass('GET /skewb_cases.json — 200, valid JSON');
  } catch (e) { fail('GET /skewb_cases.json — 200, valid JSON', e); }

  // ── Cache-Control header ──────────────────────────────────────────────────

  // Server should send no-cache headers (important for dev / trainer correctness)
  try {
    const r = await fetch('/');
    // Server sets Cache-Control: no-store, no-cache, ...
    const cc = r.contentType; // we need the raw headers; re-fetch for this
    const headers = await new Promise((resolve) => {
      http.get(`${BASE}/`, (res) => { res.resume(); resolve(res.headers); });
    });
    assert.ok(
      headers['cache-control'] && headers['cache-control'].includes('no-cache'),
      `Cache-Control should include no-cache, got: ${headers['cache-control']}`
    );
    pass('Cache-Control: no-cache set on responses');
  } catch (e) { fail('Cache-Control: no-cache set on responses', e); }

  // ── Error handling ────────────────────────────────────────────────────────

  // 404 for missing file
  try {
    const r = await fetch('/does-not-exist.txt');
    assert.strictEqual(r.statusCode, 404, `expected 404, got ${r.statusCode}`);
    pass('GET /does-not-exist.txt — 404 as expected');
  } catch (e) { fail('GET /does-not-exist.txt — 404 as expected', e); }

  // 403 for directory traversal attempt
  try {
    const r = await fetch('/../etc/passwd');
    assert.ok(
      r.statusCode === 403 || r.statusCode === 404,
      `expected 403 or 404 for traversal, got ${r.statusCode}`
    );
    pass('GET /../etc/passwd — blocked (403/404)');
  } catch (e) { fail('GET /../etc/passwd — blocked (403/404)', e); }

  // ── Query string stripping ────────────────────────────────────────────────

  // Server should strip query params and still serve the file
  try {
    const r = await fetch('/style.css?v=12345');
    assert.strictEqual(r.statusCode, 200, `expected 200, got ${r.statusCode}`);
    assert.ok(r.contentType.includes('text/css'));
    pass('GET /style.css?v=12345 — query string stripped, file served');
  } catch (e) { fail('GET /style.css?v=12345 — query string stripped, file served', e); }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

console.log('══════════════════════════════════════════════════');
console.log('  E2E Server Tests');
console.log('══════════════════════════════════════════════════');

const server = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: String(PORT) },
  cwd: __dirname,
});

server.stderr.on('data', d => process.stderr.write(d));

// Give server time to bind
setTimeout(async () => {
  try {
    await runTests(server);
  } catch (err) {
    console.error('Unexpected error during E2E tests:', err);
    failed++;
  } finally {
    server.kill();
    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
      process.exit(1);
    } else {
      console.log('🎉 All E2E tests passed!');
      process.exit(0);
    }
  }
}, 400);
