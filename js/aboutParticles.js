// aboutParticles.js — the About stage, drawn live (Sasha 2026-11-15: "the particles make UI elements and charts: they
// come together into a shape, break apart, then form a new shape"). The home galaxy's companion: the same particles, the
// same lime accent, building the things a product designer builds. ~2,200 particles cycle through a bar chart, a donut
// chart, a line chart, an interface card and the golden spiral; each holds, then bursts into a swirl and lands as the next.
// Canvas 2D at the screen's resolution, transparent. Runs only while visible (and, in the About overlay, only while it
// is open); reduced motion gets the first shape, still.
(function () {
    'use strict';
    var hosts = document.querySelectorAll('.about-particles');
    if (!hosts.length) return;

    var LW = 1312, LH = 1000, CX = 656, CY = 500, N = 3000, TAU = Math.PI * 2, PHI = (1 + Math.sqrt(5)) / 2;
    var HOLD = 2.4, MOVE = 1.8, STEP = HOLD + MOVE;
    function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    var rng = mulberry32(31415926), span = function (a, b) { return a + (b - a) * rng(); };
    var smooth = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * x * (x * (x * 6 - 15) + 10); };

    // ── shape builders: each returns points [x, y, accent] ──────────────────────────────────────────────────────
    function line(out, x0, y0, x1, y1, gap, acc) { var L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / gap));
        for (var i = 0; i <= n; i++) out.push([x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, acc || 0]); }
    function fillRect(out, x, y, w, h, gap, acc) { for (var yy = y; yy <= y + h; yy += gap) for (var xx = x; xx <= x + w; xx += gap) out.push([xx, yy, acc || 0]); }
    function ring(out, cx, cy, r0, r1, a0, a1, gap, acc) {
        for (var r = r0; r <= r1; r += gap) { var n = Math.max(2, Math.round((r * (a1 - a0)) / gap));
            for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, acc || 0]); } } }
    function pill(out, x, y, w, h, gap, acc) { var r = h / 2; line(out, x + r, y, x + w - r, y, gap, acc); line(out, x + r, y + h, x + w - r, y + h, gap, acc);
        ring(out, x + r, y + r, r, r, Math.PI / 2, Math.PI * 1.5, gap, acc); ring(out, x + w - r, y + r, r, r, -Math.PI / 2, Math.PI / 2, gap, acc); }

    var shapes = [];
    (function bars() {                                      // a bar chart; the tallest bar lime
        var o = [], hs = [0.38, 0.62, 0.5, 0.82, 0.68, 1], base = 770, x = 318, bw = 76, gap = 44, top = 470;
        hs.forEach(function (h, i) { fillRect(o, x + i * (bw + gap), base - h * top, bw, h * top, 11, i === 5 ? 1 : 0); });
        line(o, 290, base + 26, 1022, base + 26, 9, 0); shapes.push(o); })();
    (function donut() {                                     // a donut; the largest share lime
        var o = [], parts = [0.382, 0.236, 0.236, 0.146], a = -Math.PI / 2;
        parts.forEach(function (p, i) { var a1 = a + p * TAU; ring(o, CX, CY + 20, 170, 245, a + 0.05, a1 - 0.05, 10, i === 0 ? 1 : 0); a = a1; });
        shapes.push(o); })();
    (function lineChart() {                                 // a line chart with its area; the latest point lime
        var o = [], ys = [0.2, 0.38, 0.3, 0.55, 0.48, 0.72, 0.66, 0.9], x0 = 290, x1 = 1022, base = 780, top = 460, pts = [];
        ys.forEach(function (v, i) { pts.push([x0 + (x1 - x0) * i / (ys.length - 1), base - v * top]); });
        for (var i = 1; i < pts.length; i++) line(o, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], 4.5, 0);
        for (i = 1; i < pts.length; i++) for (var xx = pts[i - 1][0]; xx < pts[i][0]; xx += 15) {
            var f = (xx - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]), yl = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f;
            for (var yy = yl + 16; yy <= base; yy += 15) o.push([xx, yy, 0]); }
        ring(o, pts[7][0], pts[7][1], 0, 22, 0, TAU, 5, 1); line(o, x0, base + 22, x1, base + 22, 9, 0); shapes.push(o); })();
    (function card() {                                      // an interface card: avatar, text, a toggle, a lime button
        var o = [], x = 376, y = 270, w = 560, h = 470, rr = 34;
        line(o, x + rr, y, x + w - rr, y, 7); line(o, x + rr, y + h, x + w - rr, y + h, 7); line(o, x, y + rr, x, y + h - rr, 7); line(o, x + w, y + rr, x + w, y + h - rr, 7);
        ring(o, x + rr, y + rr, rr, rr, Math.PI, Math.PI * 1.5, 7); ring(o, x + w - rr, y + rr, rr, rr, -Math.PI / 2, 0, 7);
        ring(o, x + w - rr, y + h - rr, rr, rr, 0, Math.PI / 2, 7); ring(o, x + rr, y + h - rr, rr, rr, Math.PI / 2, Math.PI, 7);
        ring(o, x + 86, y + 92, 0, 40, 0, TAU, 8); line(o, x + 150, y + 76, x + 440, y + 76, 7); line(o, x + 150, y + 108, x + 360, y + 108, 9);
        line(o, x + 50, y + 190, x + w - 50, y + 190, 9); line(o, x + 50, y + 236, x + w - 120, y + 236, 9); line(o, x + 50, y + 282, x + w - 190, y + 282, 9);
        pill(o, x + 50, y + 352, 120, 56, 7); ring(o, x + 142, y + 380, 0, 20, 0, TAU, 6, 1);
        fillRect(o, x + w - 230, y + 352, 180, 56, 9, 1); shapes.push(o); })();
    (function golden() {                                    // the golden rectangle and its spiral: back to the home page's idea
        var o = [], H = 470, W = H * PHI, r = { x: CX - W / 2, y: CY - H / 2 + 20, w: W, h: H }, cuts = ['left', 'top', 'right', 'bottom'];
        line(o, r.x, r.y, r.x + W, r.y, 9); line(o, r.x, r.y + H, r.x + W, r.y + H, 9); line(o, r.x, r.y, r.x, r.y + H, 9); line(o, r.x + W, r.y, r.x + W, r.y + H, 9);
        for (var i = 0; i < 8; i++) { var c = cuts[i % 4], s, ctr, a0;
            if (c === 'left')   { s = r.h; ctr = [r.x + s, r.y + s]; a0 = Math.PI; line(o, r.x + s, r.y, r.x + s, r.y + r.h, 11); r = { x: r.x + s, y: r.y, w: r.w - s, h: r.h }; }
            else if (c === 'top')    { s = r.w; ctr = [r.x, r.y + s]; a0 = -Math.PI / 2; line(o, r.x, r.y + s, r.x + r.w, r.y + s, 11); r = { x: r.x, y: r.y + s, w: r.w, h: r.h - s }; }
            else if (c === 'right')  { s = r.h; ctr = [r.x + r.w - s, r.y]; a0 = 0; line(o, r.x + r.w - s, r.y, r.x + r.w - s, r.y + r.h, 11); r = { x: r.x, y: r.y, w: r.w - s, h: r.h }; }
            else { s = r.w; ctr = [r.x + r.w, r.y + r.h - s]; a0 = Math.PI / 2; line(o, r.x, r.y + r.h - s, r.x + r.w, r.y + r.h - s, 11); r = { x: r.x, y: r.y, w: r.w, h: r.h - s }; }
            ring(o, ctr[0], ctr[1], s, s, a0, a0 + Math.PI / 2, 4.5, 0); }
        ring(o, r.x + r.w / 2, r.y + r.h / 2, 0, 9, 0, TAU, 4, 1); shapes.push(o); })();

    // every shape becomes exactly N points, ordered by angle about the centre so each particle travels a short way
    shapes = shapes.map(function (o) {
        var out = [], k;
        if (o.length >= N) { for (k = 0; k < N; k++) out.push(o[Math.floor(k * o.length / N)]); }
        else { for (k = 0; k < N; k++) { var p = o[k % o.length]; out.push(k < o.length ? p : [p[0] + span(-2.5, 2.5), p[1] + span(-2.5, 2.5), p[2]]); } }
        out.sort(function (a, b) { return Math.atan2(a[1] - CY, a[0] - CX) - Math.atan2(b[1] - CY, b[0] - CX); });
        return out;
    });
    var P = []; for (var i = 0; i < N; i++) { var a = span(0, TAU); P.push({ dx: Math.cos(a), dy: Math.sin(a), burst: span(70, 260), ph: span(0, TAU), sz: span(0.75, 1.3) }); }

    function sprite(rgb, px) { var c = document.createElement('canvas'); c.width = c.height = px; var x = c.getContext('2d');
        var g = x.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px / 2); g.addColorStop(0, 'rgba(' + rgb + ',1)'); g.addColorStop(0.42, 'rgba(' + rgb + ',1)'); g.addColorStop(0.55, 'rgba(' + rgb + ',0.22)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');   // a crisp dot, faint halo
        x.fillStyle = g; x.fillRect(0, 0, px, px); return c; }
    var WHITE = sprite('255,255,255', 64), LIME = sprite('198,233,43', 64);

    Array.prototype.forEach.call(hosts, function (host) {
        var canvas = document.createElement('canvas'); canvas.className = 'about-particles-canvas'; host.appendChild(canvas);
        var ctx = canvas.getContext('2d'), scale = 1, ox = 0, oy = 0, dpr = 1;
        function fit() { var w = host.clientWidth, h = host.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
            scale = Math.min(canvas.width / LW, canvas.height / LH); ox = (canvas.width - LW * scale) / 2; oy = (canvas.height - LH * scale) / 2; }
        fit(); if (window.ResizeObserver) new ResizeObserver(function () { fit(); draw(clock); }).observe(host);

        function draw(t) {
            var cyc = t / STEP, idx = Math.floor(cyc) % shapes.length, nxt = (idx + 1) % shapes.length, local = (cyc - Math.floor(cyc)) * STEP;
            var p = local <= HOLD ? 0 : (local - HOLD) / MOVE, e = smooth(p), b = Math.sin(Math.PI * Math.min(1, p)), sw = 0.55 * b;
            var A = shapes[idx], Bs = shapes[nxt], cs = Math.cos(sw), sn = Math.sin(sw);
            ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(scale, 0, 0, scale, ox, oy); ctx.globalCompositeOperation = 'lighter';
            for (var i = 0; i < N; i++) {
                var a = A[i], c = Bs[i], q = P[i];
                var x = a[0] + (c[0] - a[0]) * e - CX + q.dx * q.burst * b, y = a[1] + (c[1] - a[1]) * e - CY + q.dy * q.burst * b;
                var rx = CX + x * cs - y * sn + Math.sin(t * 1.3 + q.ph) * 1.4, ry = CY + x * sn + y * cs + Math.cos(t * 1.1 + q.ph) * 1.4;
                var acc = e < 0.5 ? a[2] : c[2], s = 7.5 * q.sz * (1 - 0.25 * b);
                ctx.globalAlpha = (acc ? 0.95 : 0.78) * (0.8 + 0.2 * Math.sin(t * 2 + q.ph));
                ctx.drawImage(acc ? LIME : WHITE, rx - s / 2, ry - s / 2, s, s);
            }
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        }

        var clock = 0, last = 0, onScreen = true;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(0); return; }
        var overlay = host.closest('.about-overlay');
        function visible() { return onScreen && document.visibilityState !== 'hidden' && (!overlay || overlay.classList.contains('is-open')); }
        new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; }, { threshold: 0.05 }).observe(host);
        function frame(now) {
            if (visible()) { if (last) clock += Math.min(0.1, (now - last) / 1000); last = now; draw(clock); } else last = 0;
            requestAnimationFrame(frame);
        }
        draw(0); requestAnimationFrame(frame);
    });
})();
