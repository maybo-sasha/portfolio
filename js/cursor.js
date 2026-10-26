// Shared custom cursor for inner pages.
// A circle that follows the mouse and expands ONLY over the back button and
// the nav menu (About / Work). No hover effect on page content.
// Pointer-fine devices only; uses the global GSAP loaded on each page.
(function () {
    if (window.__cursorInit) return;
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    window.__cursorInit = true;

    let cursor = document.querySelector('.cursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'cursor';
        const t = document.createElement('span');
        t.className = 'cursor-text';
        cursor.appendChild(t);
        document.body.appendChild(cursor);
    }
    cursor.style.display = '';

    const g = window.gsap;
    let rawX = window.innerWidth / 2, rawY = window.innerHeight / 2;
    let locked = false, unlockT;

    window.addEventListener('mousemove', e => { rawX = e.clientX; rawY = e.clientY; });

    if (g) {
        const setL = g.quickSetter(cursor, 'left', 'px');
        const setT = g.quickSetter(cursor, 'top', 'px');
        g.ticker.add(() => { if (!locked) { setL(rawX); setT(rawY); } });
    } else {
        const loop = () => {
            if (!locked) { cursor.style.left = rawX + 'px'; cursor.style.top = rawY + 'px'; }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    // Read off the cursor itself, not :root — the value still inherits from
    // :root, but a class on the cursor can now override it locally.
    const ring = () => getComputedStyle(cursor)
        .getPropertyValue('--cursor-ring').trim() || 'rgba(255,255,255,0.85)';

    function reset() {
        locked = false;
        cursor.classList.remove('has-ripple');
        // width first, then height (js/ringShrink.js); a plain tween is the fallback if that script is missing
        if (window.ringShrink) window.ringShrink(cursor, { backgroundColor: 'transparent', borderColor: ring() });
        else if (g) g.to(cursor, {
            width: '2rem', height: '2rem', borderRadius: '50%',
            backgroundColor: 'transparent', borderColor: ring(),
            duration: 0.25, ease: 'power2.out', overwrite: 'auto',
        });
    }

    // Only the back button and the menu links get the expand effect.
    const SEL = '.nav-link, .inner-back, .about-back, .about-social a, .about-block-text a, [data-menu="work"], .work-item';

    document.addEventListener('mouseover', e => {
        const el = e.target.closest && e.target.closest(SEL);
        if (!el) return;
        clearTimeout(unlockT);
        locked = true;
        cursor.classList.add('has-ripple');
        const r = el.getBoundingClientRect();
        if (g) g.to(cursor, {
            left: r.left + r.width / 2, top: r.top + r.height / 2,
            width: r.width + 28, height: r.height + 16, borderRadius: '999px',
            backgroundColor: 'rgba(127,127,127,0.10)', borderColor: ring(),
            duration: 0.35, ease: 'expo.out', overwrite: 'auto',
        });
    });
    document.addEventListener('mouseout', e => {
        if (!(e.target.closest && e.target.closest(SEL))) return;
        unlockT = setTimeout(reset, 40);
    });

    // ── Light surfaces ────────────────────────────────────────────────
    // A white ring vanishes over a light panel, so anything marked
    // data-cursor="dark" flips the ring (and its ripples) to ink.
    const LIGHT = '[data-cursor="dark"]';
    let overLight = null;

    function setLight(on) {
        cursor.classList.toggle('on-light', on);
        // GSAP writes border-color inline, so only an inline tween can undo it
        if (g) g.to(cursor, {
            borderColor: ring(), duration: 0.25, ease: 'power2.out', overwrite: 'auto',
        });
    }

    document.addEventListener('mouseover', e => {
        const el = e.target.closest && e.target.closest(LIGHT);
        if (el === overLight) return;   // moving between children — same surface
        overLight = el;
        setLight(!!el);
    });
    document.addEventListener('mouseleave', () => {
        if (!overLight) return;
        overLight = null;
        setLight(false);
    });

    reset();
})();
