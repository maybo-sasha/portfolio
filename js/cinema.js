// cinema.js: light and movement for the home deck.
//
//   • ambient light: the page stays black, and the project in frame lends it
//     one soft glow in its own brand colour, read off the card's poster
//   • one gesture, one slide: a turn of the wheel carries the deck to the next
//     project in a single eased move, and the arrow / page keys do the same
//
// Uses globals: gsap, window.lenisInstance (created in appearOnScroll.js).
// Listens for 'slidechange', which appearOnScroll.js dispatches.
(function () {
    const slides = Array.from(document.querySelectorAll('.slide'));
    if (!slides.length) return;

    const lenis  = window.lenisInstance;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let active = Math.max(0, slides.findIndex(s => s.classList.contains('is-active')));

    // ── Ambient light ──────────────────────────────────────────────────
    const layers = Array.from(document.querySelectorAll('.ambient > canvas'));
    const colors = slides.map(() => null);   // [r, g, b] per slide, once known
    let shownLayer = -1;
    let shownSlide = -1;

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        const d = max - min;
        if (!d) return [0, 0, l];
        const s = d / (1 - Math.abs(2 * l - 1));
        let h;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        return [(h * 60 + 360) % 360, s, l];
    }

    function hslToRgb(h, s, l) {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
                        : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
        return [r, g, b].map(v => Math.round((v + m) * 255));
    }

    // The brand colour of a picture: its strongest hue, not its average. An
    // average of a white product screen is grey, and of a busy illustration
    // mud; what reads as "the colour of this project" is whichever hue carries
    // the most saturated area. So pixels vote for their hue, weighted by how
    // colourful they are, and the winning band is averaged.
    function brandColor(img) {
        const w = 48, h = 27;
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const cx = c.getContext('2d', { willReadFrequently: true });
        let data;
        try {
            cx.drawImage(img, 0, 0, w, h);
            data = cx.getImageData(0, 0, w, h).data;
        } catch (e) { return null; }

        const BANDS = 24;                       // 15° of hue each
        const votes = new Float32Array(BANDS);
        const sums  = Array.from({ length: BANDS }, () => [0, 0, 0, 0]);   // r, g, b, weight
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const [hue, sat, lum] = rgbToHsl(r, g, b);
            // chroma, so near-white and near-black pixels barely count
            const weight = Math.pow(sat * (1 - Math.abs(2 * lum - 1)), 1.5);
            if (weight < 0.01) continue;
            const band = Math.floor(hue / (360 / BANDS)) % BANDS;
            votes[band] += weight;
            const s = sums[band];
            s[0] += r * weight; s[1] += g * weight; s[2] += b * weight; s[3] += weight;
        }

        // a hue rarely sits inside one band, so each is scored with its neighbours
        let best = -1, bestScore = 0;
        for (let i = 0; i < BANDS; i++) {
            const score = votes[i] + 0.6 * (votes[(i + 1) % BANDS] + votes[(i + BANDS - 1) % BANDS]);
            if (score > bestScore) { bestScore = score; best = i; }
        }
        if (best < 0) return null;              // a picture with no colour in it

        const s = sums[best];
        const [hue, sat] = rgbToHsl(s[0] / s[3], s[1] / s[3], s[2] / s[3]);
        // Keep the hue; set it to a strength and brightness that glows well on black.
        return hslToRgb(hue, Math.max(0.6, Math.min(0.9, sat)), 0.56);
    }

    // The shape of the light, worked out once and reused for every colour.
    //
    // A CSS radial gradient gives itself away: its straight segments meet at
    // visible rings, it stops at an edge, and on a near-black page its few
    // dark steps band. So the falloff is computed per pixel instead. It is a
    // sum of bell curves, which have no edge at all (they only ever get
    // fainter), slightly off-centre from each other so the result is not a
    // tidy ellipse. A little noise in the alpha dithers the dark steps away.
    const FIELD_W = 640, FIELD_H = 400;   // stretched over the viewport; the light has no detail to lose
    let field = null;

    function lightField() {
        if (field) return field;
        field = document.createElement('canvas');
        field.width = FIELD_W;
        field.height = FIELD_H;
        const ctx = field.getContext('2d');
        const image = ctx.createImageData(FIELD_W, FIELD_H);
        const px = image.data;

        // centre x, centre y, spread x, spread y, weight (all as fractions of the screen)
        const bells = [
            [0.50, 0.54, 0.26, 0.32, 0.80],   // the body of the light, behind the card
            [0.38, 0.40, 0.30, 0.36, 0.15],   // two wide, faint lobes that pull it
            [0.64, 0.68, 0.30, 0.36, 0.15],   // out of round
        ];
        // Strength at the brightest point, which is hidden behind the card. What
        // shows is the skirt: about half of this at the card's edge, a fifth at
        // the sides of the screen, and next to nothing in the corners, so the
        // page still reads as black.
        const PEAK = 0.36;

        let i = 0;
        for (let y = 0; y < FIELD_H; y++) {
            const v = (y + 0.5) / FIELD_H;
            for (let x = 0; x < FIELD_W; x++) {
                const u = (x + 0.5) / FIELD_W;
                let a = 0;
                for (let b = 0; b < bells.length; b++) {
                    const dx = (u - bells[b][0]) / bells[b][2];
                    const dy = (v - bells[b][1]) / bells[b][3];
                    a += bells[b][4] * Math.exp(-0.5 * (dx * dx + dy * dy));
                }
                const grain = Math.random() + Math.random() - 1;   // triangular, so it averages out
                px[i] = px[i + 1] = px[i + 2] = 255;
                px[i + 3] = Math.max(0, Math.min(255, Math.round(a * PEAK * 255 + grain * 1.5)));
                i += 4;
            }
        }
        ctx.putImageData(image, 0, 0);
        return field;
    }

    // Tint the shape with a project's colour: the field supplies the alpha.
    function paint(layer, rgb) {
        const shape = lightField();
        if (layer.width !== shape.width) { layer.width = shape.width; layer.height = shape.height; }
        const ctx = layer.getContext('2d');
        ctx.globalCompositeOperation = 'copy';
        ctx.drawImage(shape, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
        ctx.fillRect(0, 0, shape.width, shape.height);
    }

    function showAmbient() {
        if (layers.length < 2 || shownSlide === active) return;
        // a slide with no colour (the intro) has no glow: put out the last one, so it does not hang behind
        if (!colors[active]) {
            if (shownLayer >= 0) layers[shownLayer].classList.remove('is-on');
            shownLayer = -1; shownSlide = -1;
            return;
        }
        shownSlide = active;
        // paint the idle layer, then swap which one is lit
        const next = shownLayer === 0 ? 1 : 0;
        paint(layers[next], colors[active]);
        layers[next].classList.add('is-on');
        if (shownLayer >= 0) layers[shownLayer].classList.remove('is-on');
        shownLayer = next;
    }

    slides.forEach((slide, i) => {
        // data-ambient="#rrggbb" on a slide overrides what the poster suggests
        const fixed = /^#?([0-9a-f]{6})$/i.exec(slide.dataset.ambient || '');
        if (fixed) {
            const n = parseInt(fixed[1], 16);
            colors[i] = [n >> 16, (n >> 8) & 255, n & 255];
            return;
        }
        const video = slide.querySelector('video.project-video');
        if (!video || !video.poster) return;
        const img = new Image();
        img.onload = () => {
            colors[i] = brandColor(img);
            if (i === active) showAmbient();
        };
        img.src = video.poster;
    });
    showAmbient();

    window.addEventListener('slidechange', e => {
        if (e.detail.index < 0) return;
        active = e.detail.index;
        showAmbient();
    });

    // ── One gesture, one slide ─────────────────────────────────────────
    if (!lenis) return;

    const slideTops   = () => slides.map(s => s.getBoundingClientRect().top + window.scrollY);
    const overlayOpen = () => !!document.querySelector('.about-overlay.is-open');
    // transition.js holds the deck while a returning picture shrinks into its card
    const held = () => document.documentElement.classList.contains('deck-held');
    // slow out, slow in: the whole trip is one curve, with no hand-off in it
    const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    let moving = false;   // a move we started is in flight

    function goTo(i, duration) {
        i = Math.max(0, Math.min(slides.length - 1, i));
        const y = slideTops()[i];
        if (reduce) { lenis.scrollTo(y, { immediate: true }); return; }
        if (Math.abs(y - lenis.scroll) < 1) return;
        moving = true;
        lenis.scrollTo(y, {
            duration: duration,
            easing: easeInOut,
            lock: true,       // nothing interrupts it half-way
            onComplete: () => { moving = false; },
        });
    }

    window.addEventListener('keydown', e => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        const t = e.target;
        if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
        // Space belongs to whatever link or button has focus
        const onControl = t && t.closest && t.closest('a, button, [role="button"]');

        let to = null;
        switch (e.key) {
            case 'ArrowDown': case 'PageDown': to = active + 1; break;
            case 'ArrowUp':   case 'PageUp':   to = active - 1; break;
            case ' ':         if (!onControl)  to = active + (e.shiftKey ? -1 : 1); break;
            case 'Home':      to = 0; break;
            case 'End':       to = slides.length - 1; break;
        }
        if (to === null) return;
        e.preventDefault();
        // Home / End cross several slides, so they get a little longer
        // (with About open the key is still swallowed, so the deck cannot creep under it)
        if (!moving && !held() && !overlayOpen()) goTo(to, 1.15 + 0.12 * Math.max(0, Math.abs(to - active) - 1));
    });

    // The rest is for a mouse or trackpad. A touch screen keeps its native
    // scroll, and reduced motion means no movement the visitor didn't make.
    if (reduce || !window.matchMedia('(pointer: fine)').matches) return;

    // The wheel is taken before Lenis sees it (capture phase, and stopped
    // there). Left to free-scroll, the deck coasted to a halt wherever the
    // wheel left it and then had to be pulled onto a slide: two motions with
    // a visible join. Stepping makes it one.
    let lastWheel = 0;
    let lastSize  = 0;

    window.addEventListener('wheel', e => {
        if (e.ctrlKey) return;                         // pinch-zoom
        if (overlayOpen()) return;
        if (e.target.closest && e.target.closest('[data-lenis-prevent]')) return;
        e.preventDefault();
        e.stopPropagation();

        const now  = performance.now();
        const size = Math.abs(e.deltaY);
        // A trackpad keeps sending smaller and smaller deltas after the fingers
        // lift. Those are the tail of a gesture already acted on, not a new
        // one: a new gesture arrives after a pause, or bigger than the last.
        const fresh = now - lastWheel > 160 || size > lastSize + 6;
        lastWheel = now;
        lastSize  = size;

        if (moving || held() || size < 2) return;
        // a wheel's notches are all the same size, so let those through as well
        if (!fresh && size < 40) return;

        const to = active + (e.deltaY > 0 ? 1 : -1);
        if (to < 0 || to >= slides.length) return;
        goTo(to, 1.15);
    }, { passive: false, capture: true });

    // Dragging the deck (index.js) still moves it freely; when the hand comes
    // off, ease onto the nearest slide.
    let idleTimer;
    function settle() {
        if (moving || overlayOpen() || held()) return;
        if (document.body.classList.contains('is-dragging')) return;
        // still coasting from the throw, so wait for it
        if (Math.abs(lenis.velocity || 0) >= 1.5) { settleSoon(); return; }
        const tops = slideTops();
        const y = lenis.scroll;
        let nearest = 0;
        tops.forEach((top, i) => { if (Math.abs(top - y) < Math.abs(tops[nearest] - y)) nearest = i; });
        if (Math.abs(tops[nearest] - y) < 1) return;
        goTo(nearest, 0.8);
    }
    function settleSoon() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(settle, 160);
    }
    window.addEventListener('pointerup', settleSoon, { passive: true });
    window.addEventListener('pointercancel', settleSoon, { passive: true });
})();
