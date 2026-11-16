// scrollProgress.js — reading progress in the home page's language (Sasha 2026-11-16).
// Home already has a scroll rail (.scroll-rail): its label shows the percentage instead of a second meter.
// Other pages get the same rail: mono label, 1px track, fill. Colour adapts to light or dark pages (difference blend).
(function () {
    try {
        var doc = document, win = window;
        var label, fill, own = false;
        var homeLabel = doc.querySelector('.scroll-rail-label');
        if (homeLabel) {
            label = homeLabel;
        } else {
            own = true;
            var el = doc.createElement('div');
            el.className = 'scroll-progress';
            el.setAttribute('aria-hidden', 'true');
            el.innerHTML = '<span class="scroll-progress__pct">0%</span><span class="scroll-progress__track"><span class="scroll-progress__fill"></span></span>';
            var css = doc.createElement('style');
            css.textContent =
                '.scroll-progress{position:fixed;right:28px;bottom:32px;z-index:80;display:flex;flex-direction:column;align-items:center;gap:14px;pointer-events:none;opacity:0;transition:opacity .4s ease;color:#fff;mix-blend-mode:difference}' +
                '.scroll-progress.is-on{opacity:.75}' +
                '.scroll-progress__pct{writing-mode:vertical-rl;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px;letter-spacing:.2em;font-variant-numeric:tabular-nums}' +
                '.scroll-progress__track{position:relative;width:1px;height:96px;background:rgba(255,255,255,.3)}' +
                '.scroll-progress__fill{position:absolute;left:0;top:0;width:1px;height:100%;background:#fff;transform-origin:top;transform:scaleY(0)}' +
                '@media (max-width:900px){.scroll-progress{display:none}}' +
                '@media (prefers-reduced-motion:reduce){.scroll-progress{transition:none}}';
            doc.head.appendChild(css);
            doc.body.appendChild(el);
            label = el.querySelector('.scroll-progress__pct');
            fill = el.querySelector('.scroll-progress__fill');
        }
        var last = -1, ticking = false, base = label.textContent;
        function update() {
            ticking = false;
            var max = Math.max(0, doc.documentElement.scrollHeight - win.innerHeight);
            if (own) label.parentNode.classList.toggle('is-on', max > 40);
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
    } catch (e) { /* never break a page */ }
})();
