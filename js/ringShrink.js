// Shared return animation for the custom cursor ring (Sasha 2026-10-22: "width and after that height,
// i dont want that the shape stretched"). Tweening width, height and radius together squashed the
// hover pill into an oval on the way back. Instead the width comes in first, until the pill is a
// circle as tall as itself, then that circle shrinks evenly to the resting 2rem ring.
// Used by cursor.js, index.js, about.js and workMenu.js. `style` carries their colour props; `g` is the
// caller's GSAP (about.js imports its own as a module, so window.gsap isn't there).
(function () {
    window.ringShrink = function (el, style, g = window.gsap) {
        if (!g || !el) return;
        g.killTweensOf(el, 'width,height,borderRadius');
        g.to(el, { ...style, duration: 0.25, ease: 'power2.out', overwrite: false });
        const w = el.offsetWidth, h = el.offsetHeight;
        const tl = g.timeline();
        if (w > h + 1) {
            tl.to(el, { width: h, borderRadius: '999px', duration: 0.2, ease: 'power2.inOut' });
        }
        tl.to(el, { width: '2rem', height: '2rem', duration: 0.2, ease: 'power2.out' })
          .set(el, { borderRadius: '50%' });
    };
})();
