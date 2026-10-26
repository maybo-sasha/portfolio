// Work mega-menu — injects a "Work" nav link + hover dropdown listing every
// project with a live video/image preview. Self-contained: include this script
// on any page that has a .nav-links-inline nav and it wires itself up.
(function () {
    const PROJECTS = [
        { name: 'AI Decisioning Studio', cat: 'Optimove · Current', href: 'ai-decisioning-studio.html', type: 'video', media: './assets/ai-decisioning-studio/hub.mp4?v=3008' },
        { name: 'Streams', cat: 'Optimove · Journey orchestration', href: 'streams.html', type: 'video', media: './assets/streams/streams-hero.mp4?v=35956b769e55' },
        { name: 'AI skills for product design', cat: 'Optimove · AI Skills', href: 'ai-champion.html', type: 'video', media: './assets/ai-champion/generate-ds-ui-1440.mp4?v=1024' },
    ];

    function init() {
        const nav = document.querySelector('.nav-links-inline');
        if (!nav || nav.querySelector('[data-menu="work"]')) return;

        // ── Inject the "Work" link before "About" ──────────────────────────
        const aboutLink = nav.querySelector('.nav-link[data-page="about"]');
        const workLink = document.createElement('a');
        workLink.className = 'nav-link';
        workLink.href = 'index.html';
        workLink.dataset.menu = 'work';
        workLink.textContent = 'Work';
        nav.insertBefore(workLink, aboutLink || null);

        // ── Build the dropdown ─────────────────────────────────────────────
        const menu = document.createElement('div');
        menu.className = 'work-menu';
        menu.setAttribute('aria-hidden', 'true');

        const inner = document.createElement('div');
        inner.className = 'work-menu-inner';
        const list = document.createElement('div');
        list.className = 'work-list';
        const preview = document.createElement('div');
        preview.className = 'work-preview';

        const items = [];
        const medias = [];

        PROJECTS.forEach((p, i) => {
            const item = document.createElement('a');
            item.className = 'work-item';
            item.href = p.href;
            item.innerHTML =
                '<span class="work-index">' + String(i + 1).padStart(2, '0') + '</span>' +
                '<span class="work-name">' + p.name + '</span>' +
                '<span class="work-cat">' + p.cat + '</span>';
            list.appendChild(item);
            items.push(item);

            let media;
            if (p.type === 'video') {
                media = document.createElement('video');
                media.muted = true;
                media.loop = true;
                media.playsInline = true;
                media.preload = 'metadata';
                media.src = p.media;
                // a silent preview loop, not a player: no browser viewer, PiP, AirPlay or fullscreen extras over it
                media.disablePictureInPicture = true;
                media.setAttribute('disablepictureinpicture', '');
                media.setAttribute('disableremoteplayback', '');
                media.setAttribute('x-webkit-airplay', 'deny');
                media.setAttribute('controlslist', 'nofullscreen nodownload noremoteplayback noplaybackrate');
            } else {
                media = document.createElement('img');
                media.src = p.media;
                media.alt = p.name;
            }
            media.className = 'work-media';
            if (p.crop) media.dataset.crop = p.crop;   // crop a generated-clip watermark
            preview.appendChild(media);
            medias.push(media);

            item.addEventListener('mouseenter', () => activate(i));
        });

        inner.appendChild(list);
        inner.appendChild(preview);
        menu.appendChild(inner);
        document.body.appendChild(menu);

        // ── Preview switching ──────────────────────────────────────────────
        let active = -1;
        function activate(i) {
            if (i === active) return;
            active = i;
            items.forEach((el, k) => el.classList.toggle('is-active', k === i));
            medias.forEach((el, k) => {
                const on = k === i;
                el.classList.toggle('is-shown', on);
                if (el.tagName === 'VIDEO') {
                    if (on) { try { el.currentTime = 0; } catch (e) {} el.play().catch(() => {}); }
                    else el.pause();
                }
            });
        }

        // ── Open / close with a grace delay so the gap under the nav is OK ──
        let closeT;
        function open() {
            clearTimeout(closeT);
            menu.classList.add('is-open');
            menu.setAttribute('aria-hidden', 'false');
            workLink.classList.add('active');
            if (active < 0) activate(0);
        }
        function close() {
            menu.classList.remove('is-open');
            menu.setAttribute('aria-hidden', 'true');
            workLink.classList.remove('active');
            medias.forEach(el => { if (el.tagName === 'VIDEO') el.pause(); });
        }
        function scheduleClose() { clearTimeout(closeT); closeT = setTimeout(close, 200); }

        workLink.addEventListener('mouseenter', open);
        workLink.addEventListener('mouseleave', scheduleClose);
        menu.addEventListener('mouseenter', () => clearTimeout(closeT));
        menu.addEventListener('mouseleave', scheduleClose);
        window.addEventListener('scroll', close, { passive: true });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

        // ── Custom-cursor flourish (matches the site's other nav links) ────
        const cursorEl = document.querySelector('.cursor');
        if (cursorEl && window.gsap) {
            const expand = el => {
                const r = el.getBoundingClientRect();
                gsap.to(cursorEl, {
                    width: r.width + 30, height: r.height + 16, borderRadius: '999px',
                    backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,1)',
                    duration: 0.35, ease: 'expo.out', overwrite: 'auto',
                });
            };
            const ring = getComputedStyle(document.documentElement)
                .getPropertyValue('--cursor-ring').trim() || 'rgba(255,255,255,0.75)';
            // width first, then height (js/ringShrink.js), so the pill never stretches on the way back
            const shrink = () => window.ringShrink
                ? window.ringShrink(cursorEl, { backgroundColor: 'transparent', borderColor: ring })
                : gsap.to(cursorEl, {
                    width: '2rem', height: '2rem', borderRadius: '50%',
                    backgroundColor: 'transparent', borderColor: ring,
                    duration: 0.25, ease: 'power2.out', overwrite: 'auto',
                });
            workLink.addEventListener('mouseenter', () => expand(workLink));
            workLink.addEventListener('mouseleave', shrink);
            items.forEach(it => {
                it.addEventListener('mouseenter', () => expand(it));
                it.addEventListener('mouseleave', shrink);
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
