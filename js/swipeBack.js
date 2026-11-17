// swipeBack.js — on touch screens, a swipe to the right goes back to the home page (Sasha 2026-11-17).
// A small "Home" chip slides in from the left edge as the finger travels, so the gesture shows what it will do before it does it.
// Ignored when the swipe starts inside something that scrolls sideways (wide figures, carousels) or is mostly vertical.
(function () {
    try {
        if (!('ontouchstart' in window) || !(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)) return;
        var back = document.querySelector('.inner-back, .about-back-link');
        var href = back ? back.getAttribute('href') : 'index.html';
        var chip = document.createElement('div');
        chip.setAttribute('aria-hidden', 'true');
        chip.style.cssText = 'position:fixed;left:0;top:50%;z-index:9500;display:flex;align-items:center;gap:6px;padding:10px 14px 10px 12px;border-radius:0 999px 999px 0;' +
            'background:#16151f;color:#fff;font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;text-transform:uppercase;' +
            'transform:translate(-110%,-50%);opacity:0;pointer-events:none;transition:transform .25s cubic-bezier(.2,.8,.2,1),opacity .2s ease';
        chip.innerHTML = '<span style="font-size:14px">&larr;</span>Home';
        document.body.appendChild(chip);
        var NEED = 90, sx = 0, sy = 0, dx = 0, on = false, dir = null;
        function sideScroller(el) {
            for (; el && el !== document.body; el = el.parentElement) {
                var o = getComputedStyle(el).overflowX;
                if ((o === 'auto' || o === 'scroll') && el.scrollWidth > el.clientWidth + 2) return true;
            }
            return false;
        }
        addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1 || sideScroller(e.target)) { on = false; return; }
            on = true; dir = null; dx = 0; sx = e.touches[0].clientX; sy = e.touches[0].clientY;
            chip.style.transition = 'none';
        }, { passive: true });
        addEventListener('touchmove', function (e) {
            if (!on) return;
            var x = e.touches[0].clientX - sx, y = e.touches[0].clientY - sy;
            if (!dir && (Math.abs(x) > 10 || Math.abs(y) > 10)) dir = Math.abs(x) > Math.abs(y) * 1.4 && x > 0 ? 'x' : 'y';
            if (dir !== 'x') return;
            dx = Math.max(0, x);
            var f = Math.min(1, dx / NEED);
            chip.style.opacity = String(f);
            chip.style.transform = 'translate(' + (-110 + f * 110) + '%,-50%)';
        }, { passive: true });
        addEventListener('touchend', function () {
            if (!on) return; on = false;
            chip.style.transition = '';
            if (dir === 'x' && dx >= NEED) {
                chip.style.transform = 'translate(0,-50%)'; chip.style.opacity = '1';
                if (window.__leaveTo) window.__leaveTo(href); else location.href = href;
            } else { chip.style.transform = 'translate(-110%,-50%)'; chip.style.opacity = '0'; }
        }, { passive: true });
    } catch (e) { /* never break a page */ }
})();
