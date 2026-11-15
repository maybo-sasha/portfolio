// "Next" end-screen on each project page, in the home page's black language.
// Sasha 2026-11-15: reaching the bottom used to fade to the next project after a short pause, with no warning. Now the
// visitor drives it and can see it: at the bottom, a progress bar under the next project's name fills as they keep
// scrolling (wheel, trackpad, swipe or the arrow / space / page keys). When it is full the next project opens; if they
// stop, it drains back; scrolling up cancels it. The next page is prefetched the moment the bottom is reached, so it
// opens at once. The title is still a plain link, so a click, tap or Enter goes straight there.
(function () {
    const order = [
        { file: 'optigenie.html',            name: 'OptiGenie' },
        { file: 'ai-decisioning-studio.html', name: 'AI Decisioning Studio' },
        { file: 'streams.html',              name: 'Streams' },
        { file: 'ai-champion.html',           name: 'AI skills for product design' },
    ];

    const file = (location.pathname.split('/').pop() || '').toLowerCase();
    const idx = order.findIndex(p => p.file === file);
    if (idx === -1) return;
    const next = order[(idx + 1) % order.length];

    const a = document.createElement('a');
    a.className = 'next-project';
    a.href = next.file;
    a.innerHTML =
        '<span class="np-label">Next</span>' +
        '<span class="np-name">' + next.name + '</span>' +
        '<span class="np-progress" role="progressbar" aria-label="Keep scrolling to open ' + next.name + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">' +
            '<span class="np-bar"><span class="np-fill"></span></span>' +
            '<span class="np-hint">Keep scrolling to continue</span>' +
        '</span>';
    document.body.appendChild(a);
    const prog = a.querySelector('.np-progress'), fill = a.querySelector('.np-fill'), hint = a.querySelector('.np-hint');

    // 1px sentinel at the very bottom: reaching it arms the progress bar.
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'height:1px;width:100%;';
    document.body.appendChild(sentinel);

    // Navigation + fade-out is handled globally by transitionFade.js; fall back to a plain fade here in case it is not present.
    function leaveTo(href) {
        if (window.__leaveTo) { window.__leaveTo(href); return; }
        document.body.style.opacity = '0';
        setTimeout(() => { location.href = href; }, 450);
    }

    // Only arm after the visitor has actually scrolled, so a short page never advances on load.
    let scrolled = false;
    addEventListener('scroll', () => { scrolled = true; }, { passive: true });
    if (window.lenis && window.lenis.on) window.lenis.on('scroll', () => { scrolled = true; });

    const NEED = 900;            // px of further scrolling, in total, to open the next project
    const GRACE = 450;           // ms after arriving at the bottom to ignore input, so a flick's momentum cannot open it
    let armed = false, armedAt = 0, p = 0, lastInput = 0, raf = 0, leaving = false, prefetched = false, last = 0;

    function show() {
        fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        prog.setAttribute('aria-valuenow', String(Math.round(p * 100)));
        hint.textContent = leaving ? 'Opening ' + next.name : p > 0.02 ? 'Loading ' + next.name + '…' : 'Keep scrolling to continue';
        a.classList.toggle('is-loading', p > 0.02);
    }
    function loop(now) {
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
        if (!leaving && now - lastInput > 650 && p > 0) p = Math.max(0, p - dt * 0.55);   // stopped scrolling: it drains back
        show();
        if (p > 0 || armed) raf = requestAnimationFrame(loop); else { raf = 0; last = 0; }
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
    function push(px) {
        if (!armed || leaving || performance.now() - armedAt < GRACE) return;
        lastInput = performance.now();
        p = Math.max(0, Math.min(1, p + px / NEED));
        if (p >= 1) { leaving = true; show(); leaveTo(a.href); }
        kick();
    }

    // wheel / trackpad: the page is already at the bottom, so any further downward scroll is progress
    addEventListener('wheel', e => { if (e.ctrlKey) return; push(Math.max(-120, Math.min(60, e.deltaY))); }, { passive: true });
    // touch: a swipe up
    let ty = null;
    addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchmove', e => { if (ty == null) return; const y = e.touches[0].clientY; push((ty - y) * 1.4); ty = y; }, { passive: true });
    addEventListener('touchend', () => { ty = null; }, { passive: true });
    // keys: each press is a step
    addEventListener('keydown', e => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        if (e.key === 'ArrowDown') push(NEED * 0.12);
        else if (e.key === 'PageDown' || e.key === ' ' && !e.shiftKey || e.key === 'End') push(NEED * 0.3);
        else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Home') push(-NEED * 0.5);
    });

    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting && scrolled) {
                armed = true; armedAt = performance.now(); a.classList.add('is-near'); kick();
                if (!prefetched) { prefetched = true; const l = document.createElement('link'); l.rel = 'prefetch'; l.href = next.file; document.head.appendChild(l); }
            } else {
                armed = false; a.classList.remove('is-near');
                if (!leaving) { p = 0; show(); }
            }
        });
    }, { threshold: 0 });
    io.observe(sentinel);
})();
