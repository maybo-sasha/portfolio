// "Next" end-screen on each project page, in the home page's black language.
// Reaching the bottom (on scroll) smoothly fades out and goes to the next
// project; the next page fades in via the body opacity transition.
(function () {
    const order = [
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
        '<span class="np-name">' + next.name + '</span>';
    document.body.appendChild(a);

    // 1px sentinel at the very bottom — reaching it triggers the transition.
    const sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'height:1px;width:100%;';
    document.body.appendChild(sentinel);

    // Navigation + fade-out is handled globally by transitionFade.js; fall back
    // to a plain fade here in case it is not present.
    function leaveTo(href) {
        if (window.__leaveTo) { window.__leaveTo(href); return; }
        document.body.style.opacity = '0';
        setTimeout(() => { location.href = href; }, 450);
    }

    // Only arm the scroll trigger once the user has actually scrolled, so a
    // short page never auto-advances on load.
    let scrolled = false;
    addEventListener('scroll', () => { scrolled = true; }, { passive: true });
    if (window.lenis) window.lenis.on && window.lenis.on('scroll', () => { scrolled = true; });

    let dwell;
    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting && scrolled) {
                clearTimeout(dwell);
                a.classList.add('is-near');
                dwell = setTimeout(() => leaveTo(a.href), 750);
            } else {
                clearTimeout(dwell);
                a.classList.remove('is-near');
            }
        });
    }, { threshold: 0 });
    io.observe(sentinel);
})();
