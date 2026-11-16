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
