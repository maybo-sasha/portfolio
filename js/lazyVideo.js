// lazyVideo.js — play videos only when they're actually needed.
//   • .about-video inside .about-overlay → plays ONLY while the overlay is open
//     (and is never even fetched until then: preload="none")
//   • every other video → plays when scrolled into view, pauses when out of view,
//     and lets go of its decoder once it has left (picking up where it was on return)
//   • phones, data saver and slow connections get the lighter data-m file where a page offers one
//   • a background tab pauses everything; refused autoplay shows controls and retries on the next gesture
// Skips data-playlist videos, Work-menu previews and .pg-reel crossfades (those manage themselves).
// Fully defensive: never throws / never breaks a page.
(function () {
    try {
        var doc = document, win = window;
        var nav = typeof navigator !== 'undefined' ? navigator : {};
        var conn = nav.connection || {};
        // Phones and constrained connections take the 1280px encode (Sasha 2026-10-27: performance pass)
        var light = !!(conn.saveData || /(^|-)2g$|^3g$/.test(conn.effectiveType || '') ||
            (win.matchMedia && win.matchMedia('(max-width: 900px)').matches));

        function viewH() { return win.innerHeight || (doc.documentElement && doc.documentElement.clientHeight) || 0; }
        // In view = a fifth of the video, or a fifth of the screen for recordings taller than it, is showing
        function inView(v) {
            if (v.getClientRects && !v.getClientRects().length) return false;
            var r = v.getBoundingClientRect(), vh = viewH();
            var seen = Math.min(r.bottom, vh) - Math.max(r.top, 0);
            return seen > 0 && seen >= Math.min((r.height || r.bottom - r.top) * 0.2, vh * 0.2);
        }
        function shouldPlay(v) {
            if (doc.visibilityState === 'hidden') return false;
            if (v.__overlay) return v.__overlay.classList.contains('is-open');
            return inView(v);
        }

        var blocked = [];
        function play(v) {
            if (!shouldPlay(v)) return;
            if (v.__released) { v.__released = false; v.preload = 'auto'; }
            var p;
            try { p = v.play(); } catch (e) { return; }
            v.__started = true;
            if (!p || !p.then) return;
            p.then(function () {
                // the promise can settle after the video has left the screen: it must not keep playing
                if (!shouldPlay(v)) { v.pause(); return; }
                if (v.__blocked) { v.__blocked = false; v.controls = false; }
                v.dataset.videoState = 'playing';
            }, function (err) {
                if (!err || err.name !== 'NotAllowedError' || v.__blocked) return;
                // Low Power Mode and some browsers refuse muted autoplay: give the viewer a way to start it
                v.__blocked = true; v.controls = true; v.dataset.videoState = 'blocked';
                blocked.push(v);
            });
        }
        // Off screen: stop decoding and drop the buffer; the time is restored when it comes back
        function release(v) {
            if (!v.__started || v.__released) return;
            v.__resumeAt = v.currentTime || 0;
            v.__released = true;
            v.preload = 'none';
            try { v.load(); } catch (e) {}
        }
        function update(v) {
            if (shouldPlay(v)) play(v);
            else { try { v.pause(); } catch (e) {} if (!v.__overlay && doc.visibilityState !== 'hidden') release(v); }
        }

        // No browser chrome over the page's videos (Sasha 2026-10-22: "Zoom to Fill" showed over the about video):
        // these are silent loops, not players, so the browser's viewer, PiP, AirPlay and fullscreen extras stay off
        var bare = window.bareVideo = function (v) {
            v.disablePictureInPicture = true;
            v.disableRemotePlayback = true;
            if (!v.setAttribute) return;
            v.setAttribute('disablepictureinpicture', '');
            v.setAttribute('disableremoteplayback', '');
            v.setAttribute('x-webkit-airplay', 'deny');
            v.setAttribute('controlslist', 'nofullscreen nodownload noremoteplayback noplaybackrate');
        };
        var everyVideo = Array.prototype.slice.call(doc.querySelectorAll('video'));
        everyVideo.forEach(bare);

        var all = everyVideo.filter(function (v) {
            return !v.hasAttribute('data-playlist') && !(v.closest && v.closest('.work-menu, .pg-reel'));
        });

        all.forEach(function (v) {
            v.muted = true;
            v.playsInline = true;
            if (light && v.dataset && v.dataset.m) v.src = v.dataset.m;
            if (v.addEventListener) v.addEventListener('loadedmetadata', function () {
                if (!v.__resumeAt) return;
                try { v.currentTime = v.__resumeAt; } catch (e) {}
                v.__resumeAt = 0;
            });
            var ov = v.closest && v.closest('.about-overlay');
            if (ov) {
                v.__overlay = ov;
                v.removeAttribute('autoplay');
                v.preload = 'none';
                new MutationObserver(function () { update(v); }).observe(ov, { attributes: true, attributeFilter: ['class'] });
                return;
            }
            // Off-screen at load: don't autoplay/fetch — let the observers start it later.
            // preload="none", not "metadata": Chrome reads metadata as "fetch a first chunk" (~4 MB at 3008 px),
            // which made Streams and ADS pull ~50 MB for videos nobody had reached (2026-10-22 audit).
            if (!inView(v)) {
                v.removeAttribute('autoplay');
                v.preload = 'none';
                v.__deferred = true;
                try { v.pause(); } catch (e) {}
            }
        });

        doc.addEventListener('visibilitychange', function () { all.forEach(update); });
        ['pointerdown', 'keydown', 'touchend'].forEach(function (name) {
            doc.addEventListener(name, function () {
                blocked.splice(0).forEach(function (v) { if (shouldPlay(v)) play(v); });
            });
        });

        // Don't rely on the observer alone to start playback: start whatever is already showing
        all.forEach(function (v) { if (!v.__overlay && shouldPlay(v)) play(v); });

        if (!('IntersectionObserver' in window)) {
            all.forEach(function (v) { if (v.__deferred) v.preload = 'metadata'; });
            return;
        }
        // About one screen ahead of the viewport, a deferred video starts buffering so it can play on arrival
        var near = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (!e.isIntersecting) return;
                near.unobserve(e.target);
                if (!e.target.__started) e.target.preload = 'auto';
            });
        }, { rootMargin: '100% 0px' });
        all.forEach(function (v) { if (v.__deferred) near.observe(v); });
        // Visibility is read from the layout, not the entry, so a tall recording counts as showing at a fifth of the screen
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { if (!e.target.__overlay) update(e.target); });
        }, { threshold: [0, 0.05, 0.1, 0.2, 0.4] });
        all.forEach(function (v) { if (!v.__overlay) io.observe(v); });
    } catch (e) { /* never break the page over video lazy-loading */ }
})();
