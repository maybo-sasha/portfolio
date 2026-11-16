// scrollProgress.js — a quiet reading meter on the right edge: the percentage over a thin track that fills as you scroll.
// Sasha 2026-11-16. Hidden when the page doesn't scroll, and on small screens. Never throws.
(function () {
    try {
        var doc = document, win = window;
        var el = doc.createElement('div');
        el.className = 'scroll-progress';
        el.setAttribute('aria-hidden', 'true');
        el.innerHTML = '<span class="scroll-progress__pct">0%</span><span class="scroll-progress__track"><span class="scroll-progress__fill"></span></span>';
        var css = doc.createElement('style');
        css.textContent =
            '.scroll-progress{position:fixed;right:24px;top:50%;transform:translateY(-50%);z-index:80;display:flex;flex-direction:column;align-items:center;gap:10px;pointer-events:none;opacity:0;transition:opacity .4s ease;font:600 11px/1 inherit;letter-spacing:.04em;color:currentColor}' +
            '.scroll-progress.is-on{opacity:.85}' +
            '.scroll-progress__pct{font-variant-numeric:tabular-nums;min-width:3ch;text-align:center}' +
            '.scroll-progress__track{position:relative;width:1px;height:140px;background:currentColor;opacity:.25}' +
            '.scroll-progress__fill{position:absolute;left:-0.5px;top:0;width:2px;height:100%;background:currentColor;transform-origin:top;transform:scaleY(0)}' +
            '.scroll-progress__track{opacity:1;background:rgba(127,127,127,.3)}' +
            '@media (max-width:900px){.scroll-progress{display:none}}' +
            '@media (prefers-reduced-motion:reduce){.scroll-progress{transition:none}}';
        doc.head.appendChild(css);
        doc.body.appendChild(el);
        var pct = el.querySelector('.scroll-progress__pct');
        var fill = el.querySelector('.scroll-progress__fill');
        var last = -1, ticking = false;
        function update() {
            ticking = false;
            var max = Math.max(0, doc.documentElement.scrollHeight - win.innerHeight);
            var on = max > 40;
            el.classList.toggle('is-on', on);
            if (!on) return;
            var p = Math.min(100, Math.max(0, Math.round((win.scrollY || win.pageYOffset || 0) / max * 100)));
            if (p === last) return;
            last = p;
            pct.textContent = p + '%';
            fill.style.transform = 'scaleY(' + p / 100 + ')';
        }
        function onScroll() { if (!ticking) { ticking = true; win.requestAnimationFrame(update); } }
        win.addEventListener('scroll', onScroll, { passive: true });
        win.addEventListener('resize', onScroll);
        win.addEventListener('load', onScroll);
        update();
    } catch (e) { /* never break a page */ }
})();
