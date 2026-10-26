// lazyVideo.js — play videos only when they're actually needed.
//   • .about-video inside .about-overlay → plays ONLY while the overlay is open
//     (and is never even fetched until then: preload="none")
//   • every other video → plays when scrolled into view, pauses when out of view
// Skips data-playlist videos and .pg-reel crossfades (those manage themselves).
// Fully defensive: never throws / never breaks a page.
(function () {
    try {
        // ── About-overlay videos: gate on the overlay being open ──────────────
        var overlayVids = [];
        document.querySelectorAll('.about-overlay').forEach(function (ov) {
            var v = ov.querySelector('video');
            if (!v) return;
            overlayVids.push(v);
            v.removeAttribute('autoplay');
            v.muted = true;
            v.preload = 'none';
            v.__overlay = ov;
            var sync = function () {
                if (ov.classList.contains('is-open')) {
                    var p = v.play(); if (p && p.catch) p.catch(function () {});
                } else {
                    v.pause();
                }
            };
            new MutationObserver(sync).observe(ov, { attributes: true, attributeFilter: ['class'] });
        });

        // ── All other videos ──────────────────────────────────────────────────
        var all = Array.prototype.slice.call(document.querySelectorAll('video')).filter(function (v) {
            return !v.hasAttribute('data-playlist') && !(v.closest && v.closest('.pg-reel'));
        });

        // No browser chrome over the page's videos (Sasha 2026-10-22: "Zoom to Fill" showed over the about video):
        // these are silent loops, not players, so the browser's viewer, PiP, AirPlay and fullscreen extras stay off
        document.querySelectorAll('video').forEach(window.bareVideo = function (v) {
            v.disablePictureInPicture = true;
            v.disableRemotePlayback = true;
            v.setAttribute('disablepictureinpicture', '');
            v.setAttribute('disableremoteplayback', '');
            v.setAttribute('x-webkit-airplay', 'deny');
            v.setAttribute('controlslist', 'nofullscreen nodownload noremoteplayback noplaybackrate');
        });

        all.forEach(function (v) {
            v.muted = true;
            if (overlayVids.indexOf(v) !== -1) return;        // handled above
            var r = v.getBoundingClientRect();
            var inView = r.top < (window.innerHeight || 0) && r.bottom > 0;
            // Off-screen at load: don't autoplay/fetch — let the observers start it later.
            // preload="none", not "metadata": Chrome reads metadata as "fetch a first chunk" (~4 MB at 3008 px),
            // which made Streams and ADS pull ~50 MB for videos nobody had reached (2026-10-22 audit).
            if (!inView) {
                v.removeAttribute('autoplay');
                v.preload = 'none';
                v.__deferred = true;
                try { v.pause(); } catch (e) {}
            }
        });
        if (!('IntersectionObserver' in window)) {
            all.forEach(function (v) { if (v.__deferred) v.preload = 'metadata'; });
            return;
        }
        // About one screen ahead of the viewport, a deferred video starts buffering so it can play on arrival
        var near = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                var v = e.target;
                near.unobserve(v);
                if (v.__overlay) return;                           // the overlay gate owns those
                v.preload = 'auto';
            });
        }, { rootMargin: '100% 0px' });
        all.forEach(function (v) { if (v.__deferred) near.observe(v); });
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                var v = e.target;
                if (!e.isIntersecting) { v.pause(); return; }
                if (v.__overlay && !v.__overlay.classList.contains('is-open')) return; // overlay closed
                var p = v.play(); if (p && p.catch) p.catch(function () {});
            });
        }, { threshold: 0.2 });
        all.forEach(function (v) { io.observe(v); });
    } catch (e) { /* never break the page over video lazy-loading */ }
})();
