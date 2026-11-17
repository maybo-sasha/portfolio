// tighten_svgs.mjs — trims each full-width diagram's viewBox to its drawn content, so the drawing's edges sit exactly on the
// text column's edges (Sasha 2026-11-17: "always align the text and the images"). Re-run after regenerating any diagram.
// usage: node tools/tighten_svgs.mjs http://localhost:3000 page1.html page2.html ...
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os"; import { join } from "node:path";
const [base, ...pages] = process.argv.slice(2);
const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9300 + Math.floor(Math.random() * 300);
const chrome = spawn(CH, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "tsv-"))}`, "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let tab; for (let i = 0; i < 60 && !tab; i++) { await sleep(200); try { tab = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r));
let id = 0; const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, (m) => res(m.result ?? m.error)); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true }))?.result?.value;
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
const MEASURE = `(()=>{const st=document.createElement('style');st.textContent='.mg *,.og-navchart *{animation:none!important;transition:none!important;transform:none!important;clip-path:none!important}';document.head.appendChild(st);
const col=document.querySelector('.og-main');if(!col)return [];const cw=col.getBoundingClientRect().width;const out=[];
for(const s of col.querySelectorAll('svg[id]')){if(s.closest('.story-phases,.og-lessons,.og-decisions,.wireframe-grid,.og-flow,.og-dcard'))continue;if(s.getBoundingClientRect().width<cw*.55)continue;
const b=s.getBBox();const p=1;out.push([s.id,s.getAttribute('viewBox'),[b.x-p,b.y-p,b.width+2*p,b.height+2*p].map(v=>Math.round(v*10)/10).join(' ')])}return out})()`;
for (const page of pages) {
  await send("Page.navigate", { url: `${base}/${page}` }); await sleep(4000);
  const res = await ev(MEASURE);
  let html = readFileSync(page, "utf8"); let n = 0;
  for (const [sid, oldVB, newVB] of res || []) {
    const re = new RegExp(`(<svg[^>]*\\bid="${sid}"[^>]*\\bviewBox=")[^"]*(")|(<svg[^>]*\\bviewBox=")[^"]*("[^>]*\\bid="${sid}")`);
    const before = html; html = html.replace(re, (m, a, b, c, d) => (a ? a + newVB + b : c + newVB + d));
    if (html !== before) { n++; console.log(page, sid, oldVB, "->", newVB); }
  }
  writeFileSync(page, html); console.log(page, n, "tightened");
}
chrome.kill(); process.exit(0);
