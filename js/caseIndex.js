// caseIndex.js — the case-study chapter index: highlights the chapter in view (Sasha 2026-11-16).
// Works with the .og-index__list built into each case-study page. Never throws.
(function () {
    try {
        var links = [].slice.call(document.querySelectorAll('.og-index__list a'));
        if (!links.length || !('IntersectionObserver' in window)) return;
        var by = {};
        links.forEach(function (a) { by[a.getAttribute('data-target')] = a; });
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) {
                if (!e.isIntersecting) return;
                links.forEach(function (a) { a.classList.remove('is-active'); });
                var a = by[e.target.id];
                if (a) a.classList.add('is-active');
            });
        }, { rootMargin: '-35% 0px -60% 0px' });
        Object.keys(by).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
    } catch (e) { /* never break a page */ }
})();

// Click a chapter: glide to it (Sasha 2026-11-17). Uses the page's Lenis when present, else an eased scroll.
(function () {
    try {
        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('.og-index__list a');
            if (!a) return;
            var el = document.getElementById(a.getAttribute('data-target'));
            if (!el) return;
            e.preventDefault();
            var top = el.getBoundingClientRect().top + window.scrollY - 24;
            if (history.replaceState) history.replaceState(null, '', '#' + el.id);
            if (reduce) { window.scrollTo(0, top); return; }
            if (window.__lenis && window.__lenis.scrollTo) { window.__lenis.scrollTo(top, { duration: 1.1, easing: ease }); return; }
            var from = window.scrollY, d = top - from, t0 = null, dur = 900;
            requestAnimationFrame(function step(ts) { if (t0 === null) t0 = ts; var p = Math.min(1, (ts - t0) / dur); window.scrollTo(0, from + d * ease(p)); if (p < 1) requestAnimationFrame(step); });
        });
    } catch (e) { /* never break a page */ }
})();
