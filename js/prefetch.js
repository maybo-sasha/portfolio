// prefetch.js: fetch the next page's HTML before the click (perf pass, Sasha 2026-11-23).
//   • any same-site page link: on hover, touch or keyboard focus
//   • home: each project card as it comes into view
//   • case pages: home, once the page has settled (Back is the most-used way out)
// HTML only: styles, scripts and fonts are shared and already cached. Skipped on data saver and 2G.
(function () {
    try {
        var conn = navigator.connection || {};
        if (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')) return;
        var done = {};
        function go(href) {
            if (!href) return;
            var u; try { u = new URL(href, location.href); } catch (e) { return; }
            if (u.origin !== location.origin || !/\.html$|\/$/.test(u.pathname) || u.pathname === location.pathname) return;
            if (done[u.pathname]) return; done[u.pathname] = 1;
            var l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.pathname; l.as = 'document';
            document.head.appendChild(l);
        }
        function fromEvent(e) { var a = e.target && e.target.closest && e.target.closest('a[href]'); if (a) go(a.getAttribute('href')); }
        ['pointerover', 'touchstart', 'focusin'].forEach(function (t) { document.addEventListener(t, fromEvent, { passive: true }); });
        var cards = document.querySelectorAll('a.project-card[href]');
        if (cards.length && 'IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (en) { if (en.isIntersecting) { go(en.target.getAttribute('href')); io.unobserve(en.target); } });
            }, { rootMargin: '0px 0px 50% 0px' });
            Array.prototype.forEach.call(cards, function (c) { io.observe(c); });
        } else if (!cards.length) {
            var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 2500); };
            window.addEventListener('load', function () { idle(function () { go('index.html'); }); }, { once: true });
        }
    } catch (e) {}
})();
