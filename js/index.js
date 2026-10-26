// Uses globals: gsap, Lenis, barba (loaded via CDN)
// Particles and appearOnScroll are loaded as script tags before this file

const lastChild = document.querySelector('.slide:last-child');
const sliders   = document.querySelectorAll('.slide');
const nav       = document.querySelector('.nav-header');
const mouse     = document.querySelector('.cursor');
const overlay   = document.querySelector('.about-overlay');
const navLinks  = document.querySelectorAll('.nav-link');

// ── Nav entrance ───────────────────────────────────────────────────────────
gsap.fromTo(nav, { y: '-100%', opacity: 0 }, { y: '0%', opacity: 1, duration: 0.6, ease: 'power2.out' });

// ── Cursor ─────────────────────────────────────────────────────────────────
let rawX = 0, rawY = 0;

const resetCursor = () => {
    if (!mouse) return;
    // width first, then height (js/ringShrink.js), so the pill never stretches on the way back
    if (window.ringShrink) return window.ringShrink(mouse, { borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'transparent' });
    gsap.to(mouse, {
        width:  '2rem',
        height: '2rem',
        borderRadius: '50%',
        borderColor: 'rgba(255,255,255,0.75)',
        backgroundColor: 'transparent',
        duration: 0.25,
        ease: 'power2.out',
        overwrite: true,
    });
};

if (mouse) {
    // Drive position via left/top — CSS transform:translate(-50%,-50%) centres it.
    // GSAP never touches `transform`, so centering is always correct.
    const setLeft = gsap.quickSetter(mouse, 'left', 'px');
    const setTop  = gsap.quickSetter(mouse, 'top',  'px');

    window.addEventListener('mousemove', e => {
        rawX = e.clientX;
        rawY = e.clientY;
    });

    let isLocked   = false;
    let unlockTimer;

    gsap.ticker.add(() => {
        if (!isLocked) { setLeft(rawX); setTop(rawY); }
    });

    // ── Nav links + about-back: auto-lock & expand to cover the button ──
    document.querySelectorAll('.nav-link, .about-back, .about-social a, .about-block-text a').forEach(link => {
        link.addEventListener('mouseenter', () => {
            clearTimeout(unlockTimer);
            isLocked = true;
            mouse.classList.add('has-ripple');

            const r  = link.getBoundingClientRect();
            const cx = r.left + r.width  / 2;
            const cy = r.top  + r.height / 2;

            // left/top = button centre → translate(-50%,-50%) centres cursor on it
            // Keep height fixed at the resting size so ONLY the width animates —
            // the cursor stays a clean pill/circle and never passes through ovals.
            gsap.to(mouse, {
                left:  cx,
                top:   cy,
                width:  r.width  + 40,
                height: '2rem',
                borderRadius: '999px',
                borderColor: 'rgba(255,255,255,1)',
                backgroundColor: 'rgba(255,255,255,0.07)',
                duration: 0.35,
                ease: 'expo.out',
                overwrite: true,
            });
        });

        link.addEventListener('mouseleave', () => {
            // Small delay prevents flicker when moving between adjacent nav links
            unlockTimer = setTimeout(() => {
                isLocked = false;
                mouse.classList.remove('has-ripple');
                resetCursor();
            }, 40);
        });
    });

    // ── Project card hover: large "View" circle that follows the cursor ──
    // (No lock here — the cursor only snaps/locks onto nav elements.)
    const cursorText = mouse.querySelector('.cursor-text');
    document.querySelectorAll('.project-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            if (cursorText) cursorText.textContent = 'View';
            mouse.classList.add('show-label');
            gsap.to(mouse, {
                width:  '7rem',
                height: '7rem',
                borderColor: 'rgba(255,255,255,0.6)',
                backgroundColor: 'rgba(0,0,0,0.55)',
                duration: 0.5,
                ease: 'expo.out',
                overwrite: true,
            });
        });
        card.addEventListener('mouseleave', () => {
            mouse.classList.remove('show-label');
            resetCursor();
        });
    });

    // ── Click pulse ───────────────────────────────────────────────────
    document.addEventListener('mousedown', () => {
        gsap.to(mouse, {
            width:  '1.4rem',
            height: '1.4rem',
            duration: 0.09,
            ease: 'power3.in',
            overwrite: 'auto',
        });
    });
    document.addEventListener('mouseup', () => {
        gsap.to(mouse, {
            width:  '2rem',
            height: '2rem',
            duration: 0.2,
            ease: 'power2.out',
            overwrite: 'auto',
        });
    });
}

function cursorAnim() {}  // kept for call-site compat in appearOnScroll

// ── Drag to scroll ─────────────────────────────────────────────────────────
{
    let isDragging    = false;
    let dragStartY    = 0;
    let scrollAtDrag  = 0;

    const cursorText = mouse ? mouse.querySelector('.cursor-text') : null;

    const toDragCursor = () => {
        document.body.classList.add('is-dragging');
        if (!mouse) return;
        if (cursorText) { cursorText.textContent = '↕'; }
        mouse.classList.add('show-label');
        gsap.to(mouse, {
            width:        '4.5rem',
            height:       '2rem',
            borderRadius: '999px',
            borderColor:  'rgba(255,255,255,0.9)',
            duration: 0.2,
            ease: 'power2.out',
            overwrite: true,
        });
    };

    const fromDragCursor = () => {
        document.body.classList.remove('is-dragging');
        if (!mouse) return;
        mouse.classList.remove('show-label');
        if (cursorText) cursorText.textContent = '';
        resetCursor();
    };

    document.addEventListener('pointerdown', e => {
        if (e.target.closest('a, button, input')) return;
        isDragging   = true;
        dragStartY   = e.clientY;
        scrollAtDrag = window.lenisInstance ? window.lenisInstance.scroll : window.scrollY;
        toDragCursor();
    });

    document.addEventListener('pointermove', e => {
        if (!isDragging) return;
        const delta = dragStartY - e.clientY;
        const lenis = window.lenisInstance;
        if (lenis) {
            lenis.scrollTo(scrollAtDrag + delta * 1.8, { immediate: false });
        } else {
            window.scrollTo(0, scrollAtDrag + delta * 1.8);
        }
    });

    const endDrag = () => {
        if (!isDragging) return;
        isDragging = false;
        fromDragCursor();
    };

    document.addEventListener('pointerup',     endDrag);
    document.addEventListener('pointercancel', endDrag);
}

// ── About overlay — circle-mask from nav link position ─────────────────────
let aboutOpen = false;

function openAbout(triggerEl) {
    if (aboutOpen) return;
    aboutOpen = true;

    const rect = triggerEl.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top  + rect.height / 2;
    const origin = `${ox}px ${oy}px`;

    overlay.style.clipPath = `circle(0px at ${origin})`;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');

    navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === 'about'));

    gsap.to(overlay, {
        clipPath: `circle(150vmax at ${origin})`,
        duration: 0.9,
        ease: 'power3.inOut',
    });

    gsap.fromTo('.about-block',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power2.out', delay: 0.5 }
    );
}

function closeAbout() {
    if (!aboutOpen) return;

    const aboutLink = document.querySelector('.nav-link[data-page="about"]');
    let origin = '100% 0%';
    if (aboutLink) {
        const rect = aboutLink.getBoundingClientRect();
        origin = `${rect.left + rect.width / 2}px ${rect.top + rect.height / 2}px`;
    }

    gsap.to('.about-block', {
        opacity: 0, y: -20, duration: 0.25, ease: 'power2.in',
    });

    gsap.to(overlay, {
        clipPath: `circle(0px at ${origin})`,
        duration: 0.75,
        ease: 'power3.inOut',
        delay: 0.1,
        onComplete: () => {
            overlay.classList.remove('is-open');
            overlay.setAttribute('aria-hidden', 'true');
            aboutOpen = false;
        }
    });

    navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === 'work'));
}

// Event delegation — robust even if .about-back is later replaced
document.addEventListener('click', e => {
    const backBtn = e.target.closest('.about-back');
    if (!backBtn) return;
    e.preventDefault();
    e.stopPropagation();
    closeAbout();
});

navLinks.forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        if (link.dataset.page === 'about') {
            if (!aboutOpen) openAbout(link);
        } else {
            closeAbout();
        }
    });
});

window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && aboutOpen) closeAbout();
});

// ── Particles + scroll + hover effects ────────────────────────────────────
Particles();
let destroyScroll = appearOnScroll(sliders, lastChild, cursorAnim);
initHoverEffects();

// ── Minimal scroll-progress rail (bottom-right) ────────────────────────────
const railFill = document.querySelector('.scroll-rail-fill');
if (railFill) {
    const updateRail = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
        railFill.style.height = (p * 100) + '%';
    };
    if (window.lenisInstance) window.lenisInstance.on('scroll', updateRail);
    window.addEventListener('scroll', updateRail, { passive: true });
    window.addEventListener('resize', updateRail);
    updateRail();
}

// ── Where the deck starts ──────────────────────────────────────────────────
// At the top, unless we are coming back from a project (the head script in
// index.html leaves its name in __returnTo), in which case on that project's
// slide. This is the one place the starting position is decided, and it runs
// before the scripts below measure anything, so they all see the deck where
// it will actually be. The browser's own restore is switched off for the same
// reason: it arrives after load and would move the page a second time.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
{
    const back  = window.__returnTo;
    const card  = back && document.querySelector('.project-card[href="' + back.href + '"]');
    const slide = card && card.closest('.slide');
    const y     = slide ? Math.round(slide.getBoundingClientRect().top + window.scrollY) : 0;

    // The card on this slide is about to have its picture shrink into it, so
    // it has to be sitting in its final place rather than easing in.
    if (slide && back.zoom) slide.dataset.animated = '1';

    const land = () => {
        const lenis = window.lenisInstance;
        window.scrollTo(0, y);
        if (!lenis) return;
        lenis.resize();   // its limit may have been measured while the document could not scroll
        lenis.scrollTo(y, { immediate: true, force: true });
    };

    // Under the first-visit loader <html> is overflow:hidden. That makes
    // <body> the scroller (it carries overflow-x:hidden), the document has
    // nothing to scroll, and a jump made now is thrown away. So wait for the
    // loader to let go; it is still covering the screen at that moment.
    const root = document.documentElement;
    if (y > 0 && root.classList.contains('loading')) {
        const mo = new MutationObserver(() => {
            if (root.classList.contains('loading')) return;
            mo.disconnect();
            land();
        });
        mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    } else {
        land();
    }
}
