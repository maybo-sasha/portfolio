// scrollProgress.js — reading progress in the home page's language (Sasha 2026-11-16).
// Home already has a scroll rail (.scroll-rail): its label shows the percentage instead of a second meter.
// Other pages get the same rail: mono label, 1px track, fill. Colour adapts to light or dark pages (difference blend).
//
// Hover turns it into a scrollbar (Sasha 2026-11-17: "when I'm hovering on the scroll progress it becomes a scroll bar, a cool one"):
// the rail stretches tall, a pill thumb sized to the viewport rides on it, chapter ticks mark each section, and a label shows
// which chapter the pointer is over. Click jumps (eased), drag scrubs. Fine pointers only; it collapses when the pointer leaves.
(function () {
    try {
        var doc = document, win = window;
        var label, fill, rail, track, own = false;
        var homeLabel = doc.querySelector('.scroll-rail-label');
        var EASE = 'cubic-bezier(.2,.8,.2,1)';
        var css = doc.createElement('style');
        css.textContent =
            '.scroll-progress{position:fixed;right:28px;bottom:32px;z-index:80;display:flex;flex-direction:column;align-items:center;gap:14px;pointer-events:none;opacity:0;transition:opacity .4s ease;color:#fff;mix-blend-mode:difference}' +
            '.scroll-progress.is-on{opacity:.75}' +
            '.scroll-progress__pct{writing-mode:vertical-rl;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.2em;font-variant-numeric:tabular-nums}' +
            '.scroll-progress__track{position:relative;width:1px;height:96px;background:rgba(255,255,255,.3)}' +
            '.scroll-progress__fill{position:absolute;left:0;top:0;width:1px;height:100%;background:#fff;transform-origin:top;transform:scaleY(0)}' +
            '.sp-x{pointer-events:auto !important;padding:18px 22px 0 34px;margin:-18px -22px 0 -34px;touch-action:none;user-select:none}' +
            '.sp-x,.sp-x *{cursor:none !important}.sp-x .sp-track{transition:height .5s ' + EASE + ',width .35s ' + EASE + ',background .35s ease !important;overflow:visible !important;cursor:pointer;touch-action:none}' +
            '.sp-x .sp-thumb{position:absolute;left:50%;top:0;width:8px;margin-left:-4px;border-radius:8px;background:#fff;opacity:0;transform:scaleX(.3);transition:opacity .3s ease,transform .35s ' + EASE + ';pointer-events:none}' +
            '.sp-x .sp-tick{position:absolute;left:50%;width:5px;height:1px;background:#fff;opacity:.35;transform:translateX(-50%);transition:width .4s ' + EASE + ',opacity .3s ease;pointer-events:none}'+'.sp-x .sp-tick.is-past{opacity:1;width:7px}' +
            '.sp-x .sp-tip{position:absolute;right:calc(100% + 14px);top:0;white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#fff;opacity:0;transform:translate(6px,-50%);transition:opacity .2s ease,transform .3s ' + EASE + ';pointer-events:none;writing-mode:horizontal-tb}' +
            '.sp-x .sp-tip b{font-weight:600;opacity:.5;margin-right:.5em}' +
            '.sp-x.is-scrub{opacity:1 !important}' +
            '.sp-x.is-scrub .sp-track{height:min(52vh,460px) !important;width:2px !important;background:rgba(255,255,255,.22) !important}' +
            '.sp-x.is-scrub .sp-thumb{opacity:1;transform:scaleX(1)}' +
            '.sp-x.is-scrub .sp-tick{width:12px}' +
            '.sp-x.is-scrub .sp-fill{opacity:.35}' +
            '.sp-x.is-scrub.is-point .sp-tip{opacity:1;transform:translate(0,-50%)}' +
            '.sp-x.is-peek{opacity:1 !important}.sp-x.is-peek .sp-track{width:3px !important;animation:sp-peek 1.3s ease-in-out 2}'+'.sp-x.is-peek .sp-tip{opacity:1;transform:translate(0,-50%)}'+'@keyframes sp-peek{50%{transform:scaleX(2.2)}}'+'.sp-x.is-drag{}.sp-x.is-drag .sp-thumb{transform:scaleX(1.25)}' +
            '@media (max-width:900px){.scroll-progress{display:none}}' +
            '@media (prefers-reduced-motion:reduce){.sp-x.is-peek .sp-track{animation:none !important}.scroll-progress,.sp-x .sp-track,.sp-x .sp-thumb,.sp-x .sp-tick,.sp-x .sp-tip{transition:none !important}}';
        doc.head.appendChild(css);
        if (homeLabel) {
            label = homeLabel;
            rail = doc.querySelector('.scroll-rail');
            track = rail && rail.querySelector('.scroll-rail-track');
        } else {
            own = true;
            var el = doc.createElement('div');
            el.className = 'scroll-progress';
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = '<span class="scroll-progress__pct">0%</span><span class="scroll-progress__track"><span class="scroll-progress__fill"></span></span>';
            doc.body.appendChild(el);
            label = el.querySelector('.scroll-progress__pct');
            fill = el.querySelector('.scroll-progress__fill');
            rail = el; track = el.querySelector('.scroll-progress__track');
        }
        var last = -1, ticking = false, base = label.textContent;
        var thumb = null, scrubOn = false;
        function maxScroll() { return Math.max(0, doc.documentElement.scrollHeight - win.innerHeight); }
        function litTicks() {
            if (!ticks || !ticks.length || !chs) return;
            var y = (win.scrollY || 0) + win.innerHeight * 0.35;
            chs.forEach(function (c, i) { if (ticks[i]) ticks[i].classList.toggle('is-past', c.y <= y); });
        }
        function placeThumb() {
            if (!thumb || !scrubOn) return;
            var max = maxScroll(), h = track.getBoundingClientRect().height;
            var th = Math.max(26, Math.min(h * .5, h * win.innerHeight / (max + win.innerHeight)));
            var f = max ? (win.scrollY || 0) / max : 0;
            thumb.style.height = th + 'px';
            thumb.style.top = (f * (h - th)) + 'px';
        }
        function update() {
            ticking = false;
            var max = maxScroll();
            if (own) rail.classList.toggle('is-on', max > 40);
            placeThumb(); litTicks();
            if (max <= 40) return;
            var p = Math.min(100, Math.max(0, Math.round((win.scrollY || win.pageYOffset || 0) / max * 100)));
            if (p === last) return;
            last = p;
            label.textContent = (!own && p === 0) ? base : p + '%';
            if (fill) fill.style.transform = 'scaleY(' + p / 100 + ')';
        }
        function onScroll() { if (!ticking) { ticking = true; win.requestAnimationFrame(update); } }
        win.addEventListener('scroll', onScroll, { passive: true });
        win.addEventListener('resize', onScroll);
        win.addEventListener('load', onScroll);
        update();

        // ── the scrubber: fine pointers only ────────────────────────────────
        if (!rail || !track || !(win.matchMedia && win.matchMedia('(hover: hover) and (pointer: fine)').matches)) return;
        rail.classList.add('sp-x');
        rail.addEventListener('mousedown', function (e) { e.stopPropagation(); });
        track.classList.add('sp-track');
        var f0 = track.querySelector('.scroll-progress__fill, .scroll-rail-fill');
        if (f0) f0.classList.add('sp-fill');
        thumb = doc.createElement('span'); thumb.className = 'sp-thumb'; track.appendChild(thumb);
        var tip = doc.createElement('span'); tip.className = 'sp-tip'; track.appendChild(tip);

        function chapters() {
            var out = [];
            doc.querySelectorAll('.og-index__list a[data-target]').forEach(function (a, i) {
                var s = doc.getElementById(a.dataset.target); if (!s) return;
                var n = a.querySelector('.og-index__n'), num = n ? n.textContent : String(i + 1);
                out.push({ el: s, num: num, name: (a.textContent || '').replace(num, '').trim() });
            });
            if (!out.length) {   // home: one tick per project slide
                doc.querySelectorAll('.project-card').forEach(function (c, i) {
                    var sl = c.closest('.slide') || c, t = sl.querySelector('h1,h2,h3,[class*=title]');
                    var name = t ? t.textContent.trim() : '';
                    var h = name.length / 2;
                    if (name.length % 2 === 0 && name.slice(0, h) === name.slice(h)) name = name.slice(0, h);   // split-letter titles repeat
                    out.push({ el: sl, num: String(i + 1).padStart(2, '0'), name: name });
                });
            }
            return out;
        }
        var chs = [], ticks = [];
        function layoutTicks() {
            ticks.forEach(function (t) { t.remove(); }); ticks = [];
            chs = chapters();
            var max = maxScroll();
            if (!max) return;
            chs.forEach(function (c) {
                c.y = Math.min(max, Math.max(0, c.el.getBoundingClientRect().top + win.scrollY - 1));
                var t = doc.createElement('span'); t.className = 'sp-tick';
                t.style.top = (c.y / max * 100) + '%';
                track.appendChild(t); ticks.push(t);
            });
        }
        // Smooth everywhere (Sasha 11-17: "we need smooth scroll"): a click glides, a drag follows the pointer with a soft lag.
        var glideY = null, glideRaf = 0;
        function glide() {
            var cur = win.scrollY || 0, d = glideY - cur;
            if (Math.abs(d) < 0.5) { win.scrollTo(0, glideY); glideY = null; glideRaf = 0; return; }
            win.scrollTo(0, cur + d * 0.14);
            glideRaf = win.requestAnimationFrame(glide);
        }
        function scrollToY(y, smooth) {
            var L = win.__lenis || win.lenisInstance;
            if (L && L.scrollTo) { L.scrollTo(y, smooth ? { duration: 1.0, easing: function (t) { return 1 - Math.pow(1 - t, 3); } } : { lerp: 0.12 }); return; }
            glideY = y; if (!glideRaf) glideRaf = win.requestAnimationFrame(glide);
        }
        function fracAt(clientY) {
            var r = track.getBoundingClientRect();
            return Math.min(1, Math.max(0, (clientY - r.top) / r.height));
        }
        function showTip(clientY) {
            var f = fracAt(clientY), y = f * maxScroll(), cur = null;
            chs.forEach(function (c) { if (c.y <= y + 2) cur = c; });
            if (!cur && chs.length) cur = chs[0];
            tip.innerHTML = cur ? '<b>' + cur.num + '</b>' + cur.name : Math.round(f * 100) + '%';
            tip.style.top = (f * 100) + '%';
            rail.classList.add('is-point');
        }
        var leaveT = null, drag = false, hintT = null;
        function magnet() {
            win.__cursorMagnet = function () {
                var r = thumb.getBoundingClientRect();
                return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width + 16, h: r.height + 16 };
            };
        }
        function hint() {   // shown on the thumb until the pointer moves along the track
            tip.innerHTML = 'scroll';
            tip.style.top = (parseFloat(thumb.style.top || 0) + thumb.offsetHeight / 2) + 'px';
            rail.classList.add('is-point');
        }
        function open() {
            clearTimeout(leaveT);
            magnet();   // also when the pointer comes back before the rail has closed
            if (scrubOn) return;
            scrubOn = true; rail.classList.add('is-scrub');
            layoutTicks();
            placeThumb(); setTimeout(placeThumb, 260);
            setTimeout(function () { placeThumb(); if (!drag) { hint(); clearTimeout(hintT); hintT = setTimeout(function () { rail.classList.remove('is-point'); }, 1600); } }, 520);
        }
        function close() {
            if (drag) return;
            win.__cursorMagnet = null;
            leaveT = setTimeout(function () { scrubOn = false; rail.classList.remove('is-scrub', 'is-point'); }, 420);
        }
        rail.addEventListener('pointerenter', open);
        rail.addEventListener('pointerleave', close);
        rail.addEventListener('pointerleave', function () { if (!drag) rail.classList.remove('is-point'); });
        rail.addEventListener('pointerdown', function (e) {
            if (e.button !== 0) return;
            e.stopPropagation();
            if (!scrubOn) open();
            e.preventDefault();
            var r = thumb.getBoundingClientRect();
            var onThumb = e.clientY >= r.top - 4 && e.clientY <= r.bottom + 4;
            drag = true; rail.classList.add('is-drag'); rail.classList.remove('is-point');
            try { rail.setPointerCapture(e.pointerId); } catch (x) {}
            var grab = onThumb ? (e.clientY - r.top) : r.height / 2;
            function to(clientY, smooth) {
                var tr = track.getBoundingClientRect(), th = thumb.getBoundingClientRect().height;
                var f = Math.min(1, Math.max(0, (clientY - grab - tr.top) / Math.max(1, tr.height - th)));
                scrollToY(f * maxScroll(), smooth);
            }
            if (!onThumb) to(e.clientY, true);
            function move(ev) { to(ev.clientY, false); }
            function up() {
                drag = false; rail.classList.remove('is-drag');
                rail.removeEventListener('pointermove', move); rail.removeEventListener('pointerup', up); rail.removeEventListener('pointercancel', up);
                if (!rail.matches(':hover')) close();
            }
            rail.addEventListener('pointermove', move);
            rail.addEventListener('pointerup', up);
            rail.addEventListener('pointercancel', up);
        });
        win.addEventListener('resize', function () { if (scrubOn) layoutTicks(); });
        win.addEventListener('load', function () { setTimeout(function () { layoutTicks(); litTicks(); }, 600); });
        setTimeout(function () { layoutTicks(); litTicks(); }, 1200);
    } catch (e) { /* never break a page */ }
})();
