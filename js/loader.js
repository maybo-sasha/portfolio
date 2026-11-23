// Original percentage loader, with a 2026 label and a post-loader text reveal.
(function () {
    'use strict';
    var replay = false;
    try {
        replay = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) && new URLSearchParams(location.search).get('loader') === '1';
        if (!replay && sessionStorage.getItem('siteLoaded')) {
            // Loader runs once per visit; the intro rise plays on every arrival at home (Sasha 11-23: "I don't see the intro animation")
            if (/(^|\/)(index\.html)?$/.test(location.pathname) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                var r = document.documentElement; r.classList.add('intro-enter');
                setTimeout(function () { r.classList.remove('intro-enter'); }, 1450);
            }
            return;
        }
        if (replay) ['returnSlide', 'returnFrame', 'returnTime', 'heroZoom'].forEach(function (key) { sessionStorage.removeItem(key); });
    } catch (e) {}

    var root = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    root.classList.add('loading');
    root.classList.add('intro-pending');
    var el = document.createElement('div');
    el.className = 'site-loader';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-label', 'Loading selected works, 2026');
    el.innerHTML =
        '<div class="sl-stack" aria-hidden="true"><p class="sl-caption">Selected works © 2026</p><div class="sl-num"><span>0</span></div></div>' +
        '<div class="sl-bar" aria-hidden="true"><i></i></div>';
    root.appendChild(el);
    var num = el.querySelector('.sl-num span');
    var bar = el.querySelector('.sl-bar > i');
    var pct = 0, target = 0, done = false, finished = false, removed = false, frame = 0;

    function markDone() { done = true; }
    // Preserve the old counter and readiness timing without waiting on media.
    if (document.readyState === 'complete') markDone();
    else {
        window.addEventListener('load', markDone, { once: true });
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { setTimeout(markDone, 700); }, { once: true });
        } else setTimeout(markDone, 700);
    }
    var readyCap = setTimeout(markDone, 4000);
    var safety = setTimeout(remove, 6500);

    function remove() {
        if (removed) return;
        removed = true;
        clearTimeout(readyCap);
        clearTimeout(safety);
        cancelAnimationFrame(frame);
        root.classList.remove('loading');
        if (el.parentNode) el.parentNode.removeChild(el);
        root.classList.remove('intro-pending');
        if (!reduce.matches) {
            root.classList.add('intro-enter');
            // Release animation/filter layers once the final text has settled.
            setTimeout(function () { root.classList.remove('intro-enter'); }, 1450);
        }
        try { sessionStorage.setItem('siteLoaded', '1'); } catch (e) {}
        window.dispatchEvent(new Event('resize'));
        if (window.lenisInstance && window.lenisInstance.resize) {
            try { window.lenisInstance.resize(); } catch (e) {}
        }
    }
    function finish() {
        if (finished || removed) return;
        finished = true;
        setTimeout(function () {
            if (removed) return;
            root.classList.remove('loading');
            el.classList.add('is-done');
            setTimeout(remove, reduce.matches ? 0 : 750);
        }, reduce.matches ? 0 : 250);
    }
    function tick() {
        if (removed || finished) return;
        target = done ? 100 : Math.min(92, target + Math.random() * 5);
        pct += (target - pct) * (reduce.matches ? 1 : 0.12);
        var shown = Math.min(100, Math.round(pct));
        num.textContent = shown;
        bar.style.transform = 'scaleX(' + (pct / 100) + ')';
        if (done && shown >= 100) {
            num.textContent = 100;
            bar.style.transform = 'scaleX(1)';
            finish();
            return;
        }
        frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
})();
