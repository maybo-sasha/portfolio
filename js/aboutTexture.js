// aboutTexture.js — the About background (Sasha 2026-11-15): a fine dot grid, joined by faint threads, that behaves like
// a cloth. The pointer pushes the dots aside like a lens, its movement leaves a wake, and the wake travels through the
// grid as a wave (each dot is tied to its neighbours) before everything springs back to rest.
// On the About page and in the About overlay on every page. Runs only while the pointer is near and the grid is moving,
// and only while the overlay is open; a touch screen or reduced motion gets the grid at rest, still.
(function () {
    'use strict';
    var hosts = document.querySelectorAll('.about-page, .about-overlay');
    if (!hosts.length) return;

    var GAP = 72;            // px between dots (bigger squares, Sasha 11-15)
    var R = 300;             // the pointer's reach
    var K = 0.055;           // spring back to rest
    var C = 0.09;            // pull from neighbours: carries the wave
    var DAMP = 0.88;         // how quickly it settles
    var PUSH = 2.6;          // lens strength
    var WAKE = 0.16;         // how much the pointer's movement drags the grid
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    Array.prototype.forEach.call(hosts, function (host) {
        var canvas = document.createElement('canvas');
        canvas.className = 'about-texture';
        canvas.setAttribute('aria-hidden', 'true');
        host.insertBefore(canvas, host.firstChild);
        var ctx = canvas.getContext('2d');
        var overlay = host.classList.contains('about-overlay') ? host : null;

        var cols = 0, rows = 0, ox = 0, oy = 0, dpr = 1, W = 0, H = 0;
        host.style.setProperty('--cell', GAP + 'px');
        var px, py, dx, dy, vx, vy;            // home positions, offsets, velocities (flat arrays)
        function build() {
            W = host.clientWidth; H = host.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
            cols = Math.ceil(W / GAP) + 3; rows = Math.ceil(H / GAP) + 3;
            var a = anchor(); ox = a[0] - GAP * 2; oy = a[1] - GAP * 2;   // a column line through the text column's left edge, a row line through the first row's top
            var n = cols * rows;
            px = new Float32Array(n); py = new Float32Array(n);
            dx = new Float32Array(n); dy = new Float32Array(n); vx = new Float32Array(n); vy = new Float32Array(n);
            for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) { var k = j * cols + i; px[k] = ox + i * GAP; py[k] = oy + j * GAP; }
        }

        // the About layout sits on the grid: size the list's column in whole cells, then anchor the grid to the text column
        function anchor() {
            var hr = host.getBoundingClientRect(), info = host.querySelector('.about-info'), skills = host.querySelector('.about-skills'), row = host.querySelector('.about-info .about-block:nth-child(2)');
            if (!info || !skills || window.innerWidth <= 1100 || !host.getBoundingClientRect().width) return [(W - (cols - 1) * GAP) / 2 + GAP * 2, (H - (rows - 1) * GAP) / 2 + GAP * 2];
            var w = 0, rg = document.createRange();
            skills.style.whiteSpace = 'nowrap';   // measure each item on one line, whatever the column was before
            Array.prototype.forEach.call(skills.children, function (li) { rg.selectNodeContents(li); w = Math.max(w, rg.getBoundingClientRect().width); });
            host.style.setProperty('--c1', String(Math.ceil((w + 8) / GAP)));
            var ir = info.getBoundingClientRect(), rr = (row || info).getBoundingClientRect();
            return [((ir.left - hr.left) % GAP + GAP) % GAP, ((rr.top - hr.top) % GAP + GAP) % GAP];
        }
        var mx = -9999, my = -9999, mvx = 0, mvy = 0, near = false, lastMove = 0;
        function step() {
            var n = cols * rows, R2 = R * R;
            for (var j = 0; j < rows; j++) {
                for (var i = 0; i < cols; i++) {
                    var k = j * cols + i;
                    // neighbours' average offset (edges hold still)
                    var ax = 0, ay = 0;
                    if (i > 0 && i < cols - 1 && j > 0 && j < rows - 1) {
                        ax = (dx[k - 1] + dx[k + 1] + dx[k - cols] + dx[k + cols]) * 0.25 - dx[k];
                        ay = (dy[k - 1] + dy[k + 1] + dy[k - cols] + dy[k + cols]) * 0.25 - dy[k];
                    }
                    var fx = -K * dx[k] + C * ax, fy = -K * dy[k] + C * ay;
                    if (near) {
                        var rx = px[k] + dx[k] - mx, ry = py[k] + dy[k] - my, d2 = rx * rx + ry * ry;
                        if (d2 < R2) {
                            var d = Math.sqrt(d2) || 1, f = 1 - d / R, f2 = f * f;
                            fx += (rx / d) * f2 * PUSH + mvx * f2 * WAKE;
                            fy += (ry / d) * f2 * PUSH + mvy * f2 * WAKE;
                        }
                    }
                    vx[k] = (vx[k] + fx) * DAMP; vy[k] = (vy[k] + fy) * DAMP;
                }
            }
            var energy = 0;
            for (var q = 0; q < n; q++) { dx[q] += vx[q]; dy[q] += vy[q]; energy += Math.abs(vx[q]) + Math.abs(vy[q]); }
            mvx *= 0.6; mvy *= 0.6;
            return energy / n;
        }

        function draw() {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);
            // threads: rows and columns as faint polylines, so the warp reads as cloth
            ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.011)';
            ctx.beginPath();
            for (var j = 0; j < rows; j++) { var k0 = j * cols; ctx.moveTo(px[k0] + dx[k0], py[k0] + dy[k0]); for (var i = 1; i < cols; i++) { var k = k0 + i; ctx.lineTo(px[k] + dx[k], py[k] + dy[k]); } }
            for (var i2 = 0; i2 < cols; i2++) { ctx.moveTo(px[i2] + dx[i2], py[i2] + dy[i2]); for (var j2 = 1; j2 < rows; j2++) { var kk = j2 * cols + i2; ctx.lineTo(px[kk] + dx[kk], py[kk] + dy[kk]); } }
            ctx.stroke();
            // dots: brighter where the grid is stirred and near the pointer
            var R2 = R * R;
            for (var q = 0; q < cols * rows; q++) {
                var x = px[q] + dx[q], y = py[q] + dy[q];
                var stir = Math.min(1, (Math.abs(dx[q]) + Math.abs(dy[q])) / 18), a = 0.035 + 0.1 * stir;   // faded (Sasha 11-15)
                if (near) { var rx = x - mx, ry = y - my, d2 = rx * rx + ry * ry; if (d2 < R2) a += 0.05 * (1 - Math.sqrt(d2) / R); }
                ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.18, a).toFixed(3) + ')';
                var s = 1.5 + 0.6 * stir; ctx.fillRect(x - s / 2, y - s / 2, s, s);
            }
        }

        function shown() { return !overlay || overlay.classList.contains('is-open'); }
        var running = false;
        function frame(now) {
            if (!shown()) { running = false; return; }
            if (near && now - lastMove > 120) { mvx = 0; mvy = 0; }
            var e = step(); draw();
            if (!near && e < 0.002) { running = false; return; }   // settled: stop until the pointer comes back
            requestAnimationFrame(frame);
        }
        function wake() { if (!running && !still && shown()) { running = true; requestAnimationFrame(frame); } }

        build(); draw();
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(); draw(); });
        if (window.ResizeObserver) new ResizeObserver(function () { build(); draw(); }).observe(host);
        if (still) return;

        window.addEventListener('pointermove', function (e) {
            if (e.pointerType && e.pointerType !== 'mouse') return;
            var r = host.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
            var inside = x > -R && y > -R && x < r.width + R && y < r.height + R && shown();
            if (inside) { if (near) { mvx = x - mx; mvy = y - my; } mx = x; my = y; lastMove = performance.now(); near = true; wake(); }
            else if (near) { near = false; wake(); }
        }, { passive: true });
        document.addEventListener('mouseleave', function () { near = false; });
        // the overlay: draw the resting grid as it opens
        if (overlay && window.MutationObserver) new MutationObserver(function () { if (shown()) { build(); draw(); } }).observe(overlay, { attributes: true, attributeFilter: ['class'] });
    });
})();
