// introGalaxy.js — the home intro's golden galaxy, drawn live (Sasha 2026-11-15: "it looks pixelated, I want high quality").
// The same piece as the HyperFrames composition in personal-os/work/portfolio-intro-order (that file stays the source and
// can still render video), run in the page instead of shipped as video: it draws at the screen's own resolution, weighs a
// few kilobytes instead of megabytes, and the canvas is truly transparent, so the site's particles show through.
//   order: the dust gathers → the golden rectangle's squares draw as lines, largest first → the golden spiral draws as one
//   curve while ~13,000 stars glide onto two galaxy arms that follow it, and the stars gather into one bright lime point at the spiral's eye (many signals, one clear decision; Sasha chose this over the black hole, 2026-11-15)
//   → then it lives: stars stream inward, the disk orbits (inner faster), a lime light glides the spiral.
// Uses the global THREE the home page already loads. Pauses off screen and in a background tab; reduced motion gets the
// finished picture, still. Every frame is a function of t alone, so the 12 s life after the build loops seamlessly.
(function () {
    'use strict';
    var host = document.querySelector('.intro-art');
    if (!host || !window.THREE) return;
    var THREE = window.THREE;

    var NS = 'http://www.w3.org/2000/svg', TAU = Math.PI * 2, PHI = (1 + Math.sqrt(5)) / 2;
    var A_END = 6.5, LOOP = 12, S = 1400;                               // the composition's own space: 1400 × 1400
    function mulberry32(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    var rng = mulberry32(1123581321), span = function (a, b) { return a + (b - a) * rng(); };
    var clamp01 = function (x) { return Math.max(0, Math.min(1, x)); };
    var smooth = function (x) { x = clamp01(x); return x * x * x * (x * (x * 6 - 15) + 10); };
    var easeInOut = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    var fract = function (x) { return x - Math.floor(x); };
    var wrap = function (x) { return ((x % TAU) + TAU) % TAU; };
    function set(el, a) { for (var k in a) el.setAttribute(k, a[k]); }
    function mk(tag, parent, a) { var el = document.createElementNS(NS, tag); set(el, a || {}); parent.appendChild(el); return el; }

    // ── the stage: a transparent WebGL canvas, and an SVG for the lines on top ──────────────────────────────────
    var canvas = document.createElement('canvas'); canvas.className = 'intro-gl'; host.appendChild(canvas);
    var svg = mk('svg', host, { class: 'intro-svg', viewBox: '0 0 1400 1400', 'aria-hidden': 'true' });
    var defs = mk('defs', svg);
    var lg = mk('radialGradient', defs, { id: 'ig-lime' });
    mk('stop', lg, { offset: '0', 'stop-color': '#c6e92b', 'stop-opacity': '0.8' }); mk('stop', lg, { offset: '1', 'stop-color': '#c6e92b', 'stop-opacity': '0' });
    var gSq = mk('g', svg), gArc = mk('g', svg, { fill: 'none', stroke: 'rgba(255,255,255,0.72)', 'stroke-width': 2.2, 'stroke-linecap': 'round' });
    var trail = mk('path', svg, { fill: 'none', stroke: '#c6e92b', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0 });
    var focal = mk('g', svg, { opacity: 0 }); mk('circle', focal, { r: 46, fill: 'url(#ig-lime)' }); var focalDot = mk('circle', focal, { r: 7, fill: '#e9ff8a' });   // the clear point the signals converge into
    var comet = mk('g', svg, { opacity: 0 }); mk('circle', comet, { r: 26, fill: 'url(#ig-lime)' }); mk('circle', comet, { r: 5.5, fill: '#efffa8' });

    // ── the golden rectangle, centred, cut into its squares ────────────────────────────────────────────────────
    var H = 580, W = H * PHI, X0 = S / 2 - W / 2, Y0 = S / 2 - H / 2;
    var r = { x: X0, y: Y0, w: W, h: H }, sq = [], cuts = ['left', 'top', 'right', 'bottom'];
    for (var i = 0; i < 10; i++) {
        var c = cuts[i % 4], s, box, from, to;
        if (c === 'left')   { s = r.h; box = [r.x, r.y, s]; from = [r.x, r.y + s]; to = [r.x + s, r.y]; r = { x: r.x + s, y: r.y, w: r.w - s, h: r.h }; }
        if (c === 'top')    { s = r.w; box = [r.x, r.y, s]; from = [r.x, r.y]; to = [r.x + s, r.y + s]; r = { x: r.x, y: r.y + s, w: r.w, h: r.h - s }; }
        if (c === 'right')  { s = r.h; box = [r.x + r.w - s, r.y, s]; from = [r.x + r.w, r.y]; to = [r.x + r.w - s, r.y + s]; r = { x: r.x, y: r.y, w: r.w - s, h: r.h }; }
        if (c === 'bottom') { s = r.w; box = [r.x, r.y + r.h - s, s]; from = [r.x + r.w, r.y + r.h]; to = [r.x, r.y + r.h - s]; r = { x: r.x, y: r.y, w: r.w, h: r.h - s }; }
        sq.push({ x: box[0], y: box[1], s: box[2], from: from, to: to });
    }
    var EYE = [r.x + r.w / 2, r.y + r.h / 2], FIB = [55, 34, 21, 13, 8, 5, 3, 2, 1, 1];
    var ARC_TOTAL = 0;
    sq.forEach(function (q, i) {
        q.rect = mk('rect', gSq, { x: q.x, y: q.y, width: q.s, height: q.s, fill: 'none', stroke: 'rgba(255,255,255,0.34)', 'stroke-width': 1.4, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 });
        if (q.s > 34) { q.label = mk('text', gSq, { x: q.x + 12, y: q.y + 24, class: 'intro-fib', opacity: 0 }); q.label.textContent = FIB[i]; }
        q.arc = mk('path', gArc, { d: 'M' + q.from[0] + ' ' + q.from[1] + ' A' + q.s + ' ' + q.s + ' 0 0 1 ' + q.to[0] + ' ' + q.to[1], pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, opacity: 0 });
        q.len = q.arc.getTotalLength(); q.cum = ARC_TOTAL; ARC_TOTAL += q.len;
    });
    trail.setAttribute('d', sq.map(function (q, i) { return (i ? '' : 'M' + q.from[0] + ' ' + q.from[1] + ' ') + 'A' + q.s + ' ' + q.s + ' 0 0 1 ' + q.to[0] + ' ' + q.to[1]; }).join(' '));
    var LEN = trail.getTotalLength(), along = [];
    for (i = 0; i <= 800; i++) { var pp = trail.getPointAtLength((LEN * i) / 800); along.push([pp.x, pp.y]); }
    var spiralAt = function (u) { return along[Math.round(clamp01(u) * 800)]; };
    // fit log r = A + B·θ to the drawn spiral, so the arms follow it exactly
    var prev = null, unwrapped = 0, fit = [];
    for (i = 0; i <= 760; i += 4) {
        var th = Math.atan2(along[i][1] - EYE[1], along[i][0] - EYE[0]);
        if (prev !== null) { var dd = th - prev; if (dd > Math.PI) dd -= TAU; if (dd < -Math.PI) dd += TAU; unwrapped += dd; } else unwrapped = th;
        prev = th; fit.push([unwrapped, Math.log(Math.hypot(along[i][0] - EYE[0], along[i][1] - EYE[1]))]);
    }
    var n = fit.length, mx = 0, my = 0; fit.forEach(function (p) { mx += p[0] / n; my += p[1] / n; });
    var num = 0, den = 0; fit.forEach(function (p) { num += (p[0] - mx) * (p[1] - my); den += (p[0] - mx) * (p[0] - mx); });
    var B = num / den, A = my - B * mx;

    // ── the stars ──────────────────────────────────────────────────────────────────────────────────────────────
    var field = function (t) { return 0.06 * t + 0.03 * Math.sin(0.5 * t); };
    var ARM = 10000, CORE = 3200, STARS = ARM + CORE, R_H = 46, R_OUT = 780, R_IN = R_H * 0.9;
    var swirl = function (rr) { return 0.9 * Math.max(0, 240 / rr - 1); };
    var armTheta = function (u0, arm, t) { var s = fract(u0 + (t - A_END) / LOOP), rr = R_OUT + (R_IN - R_OUT) * s; return (Math.log(rr) - A) / B + swirl(rr) + arm * Math.PI; };
    var aA = new Float32Array(STARS * 4), aB = new Float32Array(STARS * 4), aC = new Float32Array(STARS * 4), aD = new Float32Array(STARS * 2);
    var jit = function () { var m = Math.pow(rng(), 3); return rng() < 0.5 ? -m : m; };
    for (i = 0; i < STARS; i++) {
        var core = i >= ARM, k = core ? i - ARM : 0, u0 = rng(), arm = core ? 0 : (i % 2), jr = jit(), jt = jit();
        var lx = span(-140, 1540), ly = span(-140, 1540), cr = Math.hypot(lx - EYE[0], ly - EYE[1]), ca = Math.atan2(ly - EYE[1], lx - EYE[0]);
        var ring = core && k >= CORE - 800;
        var dr = ring ? R_H * (1.02 + 0.07 * rng()) : R_H * 1.18 + R_H * 3.4 * Math.pow(rng(), 1.9);
        var turns = ring ? 12 : Math.max(1, Math.round(10 * Math.pow((R_H * 1.18) / dr, 1.5)));
        if (core) { u0 = span(0, TAU); arm = turns; }
        var start = core ? 3.4 + (k / CORE) * 1.4 + span(0, 0.2) : 1.3 + rng() * 3.3, dur = span(1.3, 1.6);
        var sz = core ? (ring ? 1.4 + 1.6 * rng() : 1.6 + 3.0 * Math.pow(rng(), 2)) : 2.0 + 4.2 * Math.pow(rng(), 2.2);
        var th0 = core ? u0 + TAU * turns * (start - A_END) / LOOP : armTheta(u0, arm, start), x0 = th0 - (ca + field(start)), K = wrap(x0) - x0;
        aA.set([core ? 1 : 0, u0, arm, core ? dr : 0], i * 4); aB.set([jr, jt, cr, ca], i * 4); aC.set([K, start, dur, sz], i * 4); aD.set([span(0, TAU), rng()], i * 2);
    }

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    var uniforms = { uT: { value: 0 }, uField: { value: 0 }, uLoopT: { value: 0 }, uA: { value: A }, uB: { value: B },
        uEye: { value: new THREE.Vector2(EYE[0], EYE[1]) }, uRes: { value: S }, uScale: { value: 1 } };
    var VERT = [
        'attribute vec4 aA, aB, aC; attribute vec2 aD;',
        'uniform float uT, uField, uLoopT, uA, uB, uRes, uScale; uniform vec2 uEye;',
        'varying vec3 vCol; varying float vAlpha;',
        'float smoother(float x) { x = clamp(x, 0.0, 1.0); return x * x * x * (x * (x * 6.0 - 15.0) + 10.0); }',
        'void main() {',
        '  float mode = aA.x, u0 = aA.y, arm = aA.z, dr = aA.w, jr = aB.x, jt = aB.y, cr = aB.z, ca0 = aB.w;',
        '  float K = aC.x, start = aC.y, dur = aC.z, size = aC.w, tw0 = aD.x, hue = aD.y;',
        '  float e = smoother((uT - start) / dur), th, rad, a;',
        '  if (mode < 0.5) {',                                                        // an arm star: on the golden spiral, streaming in
        '    float s = fract(u0 + uLoopT);',
        '    rad = mix(780.0, 3.0, s);',
        '    th = (log(rad) - uA) / uB + 0.9 * max(0.0, 240.0 / rad - 1.0) + arm * 3.14159265 + jt * 0.16 * clamp(rad / 240.0, 0.15, 1.0);',
        '    rad *= 1.0 + jr * 0.22 * clamp(rad / 240.0, 0.2, 1.0);',
        '    a = smoothstep(0.0, 0.06, s) * (0.8 + 0.9 * smoothstep(120.0, 10.0, rad)) * smoothstep(2.0, 9.0, rad);',
        '  } else {',                                                                 // a disk star: orbiting the dark, inner faster
        '    rad = (dr - 46.0) * 0.2; th = u0 + 6.2831853 * arm * uLoopT;',
        '    a = 0.5 + 1.2 * smoothstep(34.0, 2.0, rad);',
        '  }',
        '  float ca = ca0 + uField, ang = ca + (th - ca + K) * e, r = mix(cr, rad, e);',
        '  vec2 p = uEye + vec2(cos(ang), sin(ang)) * r;',
        '  gl_Position = vec4(p.x / uRes * 2.0 - 1.0, 1.0 - p.y / uRes * 2.0, 0.0, 1.0);',
        '  float tw = 0.7 + 0.3 * sin(6.2831853 * uLoopT * 3.0 + tw0);',
        '  gl_PointSize = max(1.5, size * (0.42 + 0.58 * e) * uScale * 0.85);',
        '  float edge = min(min(p.x, p.y), min(uRes - p.x, uRes - p.y));',
        '  vAlpha = mix(0.2 + 0.1 * tw, a * (0.75 + 0.35 * tw), e) * smoothstep(0.0, 170.0, edge) * (e < 0.5 ? 0.85 : 1.0);',
        '  vec3 lav = vec3(0.70, 0.64, 1.0), lime = vec3(0.78, 0.91, 0.17);',
        '  vCol = hue > 0.985 ? lime : mix(vec3(1.0), lav, smoothstep(0.35, 0.95, hue) * (mode < 0.5 ? 1.0 : 0.35));',
        '  vCol = mix(vec3(0.8), vCol, e);',
        '}'].join('\n');
    var FRAG = [
        'varying vec3 vCol; varying float vAlpha;',
        'void main() { float d = length(gl_PointCoord - vec2(0.5)); float core = 1.0 - smoothstep(0.26, 0.36, d); float halo = 0.18 * (1.0 - smoothstep(0.0, 0.5, d)); float k = min(1.0, vAlpha * (core + halo)); gl_FragColor = vec4(vCol * k, k); }'].join('\n');
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(STARS * 3), 3));
    geo.setAttribute('aA', new THREE.BufferAttribute(aA, 4)); geo.setAttribute('aB', new THREE.BufferAttribute(aB, 4));
    geo.setAttribute('aC', new THREE.BufferAttribute(aC, 4)); geo.setAttribute('aD', new THREE.BufferAttribute(aD, 2));
    var material = new THREE.ShaderMaterial({ uniforms: uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthTest: false, depthWrite: false,
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
    var pts = new THREE.Points(geo, material); pts.frustumCulled = false; scene.add(pts);

    function fitCanvas() {
        var w = host.clientWidth, h = host.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
        renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
        uniforms.uScale.value = (Math.min(w, h) * dpr) / S;
    }
    fitCanvas();
    if (window.ResizeObserver) new ResizeObserver(function () { fitCanvas(); draw(clock); }).observe(host);

    var built = false;
    function draw(t) {
        var lt = t <= A_END ? t : A_END + ((t - A_END) % LOOP);                     // the build once, then the loop
        uniforms.uT.value = lt; uniforms.uField.value = field(lt); uniforms.uLoopT.value = (lt - A_END) / LOOP;
        renderer.render(scene, camera);
        if (!built) {                                                              // the lines only change during the build
            sq.forEach(function (q, i) {
                var sd = smooth((lt - (1.2 + i * 0.25)) / 0.75);
                set(q.rect, { 'stroke-dashoffset': 1 - sd, opacity: sd > 0 ? 1 : 0 });
                if (q.label) q.label.setAttribute('opacity', smooth((lt - (1.75 + i * 0.25)) / 0.4));
                var g = smooth((lt - 3.4) / 2.2) * ARC_TOTAL, local = clamp01((g - q.cum) / q.len);
                set(q.arc, { 'stroke-dashoffset': 1 - local, opacity: local > 0 ? 1 : 0 });
            });
            if (t > A_END) built = true;
        }
        var fo = smooth((lt - 4.6) / 1.4), pulse = 1 + 0.12 * Math.sin(TAU * (lt - A_END) / 3);   // breathes four times a loop
        set(focal, { transform: 'translate(' + EYE[0] + ' ' + EYE[1] + ') scale(' + (fo * pulse) + ')', opacity: fo });
        var amp = smooth((lt - 5.4) / 1.0), u = easeInOut(fract((lt - A_END) / 6)), p = spiralAt(u), vis = amp * Math.sin(Math.PI * u);
        set(comet, { transform: 'translate(' + p[0] + ' ' + p[1] + ')', opacity: vis });
        var head = u * LEN, tail = Math.min(head, 220);
        set(trail, { 'stroke-dasharray': tail + ' ' + LEN * 2, 'stroke-dashoffset': -(head - tail), opacity: vis * 0.85 });
    }

    // ── time: runs only while the intro is on screen and the tab is visible ────────────────────────────────────
    var clock = 0, last = 0, running = false, onScreen = true, raf = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { clock = A_END; draw(clock); return; }
    function frame(now) {
        if (!running) return;
        if (last) clock += Math.min(0.1, (now - last) / 1000);                    // a long pause does not jump the picture
        last = now; draw(clock); raf = requestAnimationFrame(frame);
    }
    function update() {
        var go = onScreen && document.visibilityState !== 'hidden';
        if (go && !running) { running = true; last = 0; raf = requestAnimationFrame(frame); }
        if (!go && running) { running = false; cancelAnimationFrame(raf); }
    }
    new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; update(); }, { threshold: 0.05 }).observe(host);
    document.addEventListener('visibilitychange', update);
    draw(0); update();
})();
