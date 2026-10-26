import { gsap } from 'gsap';

const burger  = document.querySelector('.burger');
const navBar  = document.querySelector('.nav-bar');
const mouse   = document.querySelector('.cursor');
const nav     = document.querySelectorAll('.nav-header');

// Nav entrance
const navTl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.inOut' } });
navTl.fromTo(nav, { y: '-100%', opacity: 0 }, { y: '0%', opacity: 1 });

// ── Cursor — follow + ripple/lock on About / Work / Back links ───────────────
if (mouse) {
    let rawX = 0, rawY = 0;
    const setLeft = gsap.quickSetter(mouse, 'left', 'px');
    const setTop  = gsap.quickSetter(mouse, 'top',  'px');
    window.addEventListener('mousemove', e => { rawX = e.clientX; rawY = e.clientY; });

    let isLocked = false;
    let unlockTimer;
    gsap.ticker.add(() => { if (!isLocked) { setLeft(rawX); setTop(rawY); } });

    // width first, then height (js/ringShrink.js), so the pill never stretches on the way back
    const resetCursor = () => window.ringShrink
        ? window.ringShrink(mouse, { borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'transparent' }, gsap)
        : gsap.to(mouse, {
            width: '2rem', height: '2rem', borderRadius: '50%',
            borderColor: 'rgba(255,255,255,0.75)', backgroundColor: 'transparent',
            duration: 0.25, ease: 'power2.out', overwrite: true,
        });

    // Lock + expand to cover the link, with the pulsing ripple
    const lockLink = link => {
        link.addEventListener('mouseenter', () => {
            clearTimeout(unlockTimer);
            isLocked = true;
            mouse.classList.add('has-ripple');
            const r = link.getBoundingClientRect();
            gsap.to(mouse, {
                left:  r.left + r.width  / 2,
                top:   r.top  + r.height / 2,
                width:  r.width  + 40,
                height: r.height + 20,
                borderRadius: '999px',
                borderColor: 'rgba(255,255,255,1)',
                backgroundColor: 'rgba(255,255,255,0.08)',
                duration: 0.35, ease: 'expo.out', overwrite: true,
            });
        });
        link.addEventListener('mouseleave', () => {
            unlockTimer = setTimeout(() => {
                isLocked = false;
                mouse.classList.remove('has-ripple');
                resetCursor();
            }, 30);
        });
    };
    document.querySelectorAll('.about-back-link, .nav-links h3 a, .nav-about a, .about-social a, .about-block-text a').forEach(lockLink);

    // Click pulse
    document.addEventListener('mousedown', () => {
        gsap.to(mouse, { width: '1.4rem', height: '1.4rem', duration: 0.09, ease: 'power3.in', overwrite: 'auto' });
    });
    document.addEventListener('mouseup', () => {
        gsap.to(mouse, { width: '2rem', height: '2rem', duration: 0.2, ease: 'power2.out', overwrite: 'auto' });
    });
}

// ── Back to work — explicit handler so the click can't be silently swallowed ──
const backLink = document.querySelector('.about-back-link');
if (backLink) {
    backLink.addEventListener('click', e => {
        e.preventDefault();
        window.location.href = backLink.getAttribute('href') || 'index.html';
    });
}

// Circle-mask nav
const MASK_ORIGIN = 'calc(100% - 5%) 5vh';
const MASK_OPEN   = `circle(150vmax at ${MASK_ORIGIN})`;
const MASK_CLOSED = `circle(0px at ${MASK_ORIGIN})`;

function navToggle(e) {
    const btn    = e.currentTarget;
    const isOpen = btn.classList.contains('active');

    if (!isOpen) {
        btn.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
        btn.setAttribute('aria-label', 'Close menu');
        navBar.setAttribute('aria-hidden', 'false');
        navBar.classList.add('is-open');

        gsap.to('.line1', { duration: 0.25, rotate: 45,  y:  5 });
        gsap.to('.line2', { duration: 0.25, rotate: -45, y: -5 });
        gsap.to('.nav-bar', { duration: 0.9, clipPath: MASK_OPEN, ease: 'power3.inOut' });
        gsap.fromTo('.nav-links h3 a',
            { opacity: 0, y: 40 },
            { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out', delay: 0.35 }
        );
        gsap.fromTo('.nav-about',
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.6 }
        );

        if (!destroyCharacter) loadCharacter(activeChar);
    } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Open menu');

        gsap.to(['.nav-links h3 a', '.nav-about'], { opacity: 0, y: -20, duration: 0.3, ease: 'power2.in' });
        gsap.to('.nav-bar', {
            duration: 0.7, clipPath: MASK_CLOSED, ease: 'power3.inOut', delay: 0.2,
            onComplete: () => {
                navBar.setAttribute('aria-hidden', 'true');
                navBar.classList.remove('is-open');
            }
        });
        gsap.to('.line1', { duration: 0.25, rotate: 0, y: 0, delay: 0.2 });
        gsap.to('.line2', { duration: 0.25, rotate: 0, y: 0, delay: 0.2 });
    }
}

burger.addEventListener('click', navToggle);
burger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navToggle(e); }
});

// Character switcher (same logic as index.js)
const charBtns = document.querySelectorAll('.char-btn');
let destroyCharacter = null;
let activeChar = 'rocket';

const charModules = {
    rocket: () => import('./characterRocket').then(m => m.default),
};

function getCanvas() { return document.querySelector('.nav-char-canvas'); }

function loadCharacter(key) {
    if (destroyCharacter) { destroyCharacter(); destroyCharacter = null; }
    const oldCanvas = getCanvas();
    if (!oldCanvas) return;
    const newCanvas = document.createElement('canvas');
    newCanvas.className = 'nav-char-canvas';
    oldCanvas.replaceWith(newCanvas);
    charModules[key]()
        .then(init => { destroyCharacter = init(newCanvas); activeChar = key; })
        .catch(err => console.error('Character load error:', err));
}

charBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const key = btn.dataset.char;
        if (key === activeChar) return;
        charBtns.forEach(b => b.classList.toggle('active', b === btn));
        loadCharacter(key);
    });
});
