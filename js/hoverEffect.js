// WebGL hover effect — fullscreen canvas, one plane per image card.
// Uses globals: THREE, gsap (loaded via CDN)
//
// The planes stay flat rectangles, square to the camera: nothing bends, skews
// or tilts them. What moves is the picture inside. It streaks along the
// direction of travel while the page is scrolling (motion blur), and it goes
// soft and dim as its slide leaves the centre of the screen, coming back to
// sharp as the slide arrives (a blur in and out).

function initHoverEffects() {
    if (typeof THREE === 'undefined') return;

    const cards = document.querySelectorAll('.project-card');
    if (!cards.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Renderer ────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2;border-radius:0;';
    document.body.appendChild(renderer.domElement);

    // ── Scene + perspective camera ──────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    const camDist = 600;
    camera.position.z = camDist;

    // ── Render target for post-processing pass ──────────────────────────
    // Sized in device pixels, like the canvas: at CSS size a 125% or 150%
    // display gets the cards stretched up from a smaller picture, and soft.
    const rt = new THREE.WebGLRenderTarget(window.innerWidth * renderer.getPixelRatio(), window.innerHeight * renderer.getPixelRatio());

    // ── Post-process: chromatic aberration effect ───────────────────────
    const postUniforms = {
        tDiffuse:   { value: rt.texture },
        uMouse:     { value: new THREE.Vector2(-10, -10) },
        uVelo:      { value: 0.0 },
        resolution: { value: new THREE.Vector2(1, window.innerHeight / window.innerWidth) },
    };
    const postScene  = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postScene.add(new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
            uniforms: postUniforms,
            vertexShader: `
                varying vec2 vUv;
                void main() { vUv = uv; gl_Position = vec4(position, 1.0); }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform vec2 uMouse;
                uniform float uVelo;
                uniform vec2 resolution;
                varying vec2 vUv;

                float circle(vec2 uv, vec2 disc_center, float disc_radius, float border_size) {
                    uv -= disc_center;
                    uv *= resolution;
                    float dist = sqrt(dot(uv, uv));
                    return smoothstep(disc_radius + border_size, disc_radius - border_size, dist);
                }

                void main() {
                    vec2 newUV = vUv;
                    float c = circle(newUV, uMouse, 0.0, 0.2);
                    float r = texture2D(tDiffuse, newUV.xy += c * (uVelo * 0.5  )).x;
                    float g = texture2D(tDiffuse, newUV.xy += c * (uVelo * 0.525)).y;
                    float b = texture2D(tDiffuse, newUV.xy += c * (uVelo * 0.55 )).z;
                    // Preserve RT alpha so DOM titles/particles show through empty areas
                    float a = texture2D(tDiffuse, vUv).w;
                    gl_FragColor = vec4(r, g, b, a);
                }
            `,
        })
    ));

    // The plane samples the whole video, so a CSS crop on the element has to
    // be repeated here. This is the same window `[data-crop="bottom"]` cuts in
    // style.css, scale(1.1) translateY(-3.6%), as a UV offset + scale.
    const CROP_NONE   = new THREE.Vector4(0, 0, 1, 1);
    const CROP_BOTTOM = new THREE.Vector4(0.5 - 0.5 / 1.1, 0.5 - 0.5 / 1.1 - 0.036, 1 / 1.1, 1 / 1.1);

    // ── Per-card image planes ───────────────────────────────────────────
    // Each uses a ShaderMaterial with uReveal for the bottom-to-top mask animation.
    const items = [];

    cards.forEach(card => {
        const wrap   = card.querySelector('.project-img-wrap');
        const mediaEl = card.querySelector('.project-img-wrap img, .project-img-wrap video');
        if (!wrap || !mediaEl) return;
        const isVideo = mediaEl.tagName === 'VIDEO';

        // Hide the DOM media immediately — WebGL takes over
        mediaEl.style.opacity = '0';

        const mat = new THREE.ShaderMaterial({
            uniforms: {
                tMap:         { value: null },
                uReveal:      { value: 0.0 }, // 0 = hidden, 1 = fully revealed
                uDir:         { value: 1.0 }, // 1 = bottom-to-top, -1 = top-to-bottom
                uStreak:      { value: 0.0 }, // motion blur length, as a fraction of the card's height (signed)
                uAspect:      { value: 1.0 }, // card height / width, so the focus blur stays round
                uFocus:       { value: 1.0 }, // 1 = slide centred in the viewport, 0 = a slide away
                uHover:       { value: 0.0 }, // 0..1, eased on pointer enter/leave (a slight push-in)
                uCrop:        { value: (mediaEl.dataset.crop === 'bottom' ? CROP_BOTTOM : CROP_NONE).clone() },
            },
            transparent: true,
            vertexShader: `
                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tMap;
                uniform float uReveal;
                uniform float uDir;
                uniform float uStreak;
                uniform float uAspect;
                uniform float uFocus;
                uniform float uHover;
                uniform vec4 uCrop;
                varying vec2 vUv;

                const int TAPS = 24;

                void main() {
                    // Push-in: the picture sits a little zoomed while its slide
                    // is out of frame and settles to full frame as it arrives;
                    // hovering nudges it in again.
                    float zoom = 1.0 + (1.0 - uFocus) * 0.1 + uHover * 0.03;
                    vec2 uv = (vUv - 0.5) / zoom + 0.5;

                    // Two blurs, one set of taps:
                    //   soft   a disc that widens as the slide leaves the centre
                    //          of the frame, so a project blurs out and blurs in
                    //   streak a line along the direction of travel, as long as
                    //          the page is fast: motion blur
                    float soft = (1.0 - uFocus) * 0.011;

                    vec3 rgb;
                    if (soft + abs(uStreak) < 0.0008) {
                        rgb = texture2D(tMap, uCrop.xy + uv * uCrop.zw).rgb;   // at rest: the picture, untouched
                    } else {
                        // The tap pattern is shifted by a different amount at every
                        // pixel, so its repeats read as fine grain, not ghost copies.
                        float jit = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
                        vec3 acc = vec3(0.0);
                        for (int i = 0; i < TAPS; i++) {
                            float f = (float(i) + 0.5) / float(TAPS);
                            float ang = float(i) * 2.39996323 + jit * 6.2831853;   // golden angle: an even spread over the disc
                            vec2 off = vec2(cos(ang) * uAspect, sin(ang)) * sqrt(f) * soft;
                            off.y += ((float(i) + jit) / float(TAPS) - 0.5) * uStreak;
                            // kept just inside the frame: a video's outermost rows
                            // are encoder padding, and smear in as a coloured line
                            vec2 p = clamp(uv + off, 0.004, 0.996);
                            acc += texture2D(tMap, uCrop.xy + p * uCrop.zw).rgb;
                        }
                        rgb = acc / float(TAPS);
                    }

                    // Focus pull: slides out of frame sit darker and a little drained
                    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
                    rgb = mix(vec3(luma), rgb, mix(0.55, 1.0, uFocus));
                    rgb *= mix(0.42, 1.0, uFocus);

                    float rev = clamp(uReveal, 0.0, 1.0);
                    // uDir = 1: bottom-to-top (scroll down), vUv.y=0 is bottom
                    // uDir =-1: top-to-bottom (scroll up),   flip the UV
                    float uvY = uDir > 0.0 ? vUv.y : 1.0 - vUv.y;
                    float mask = step(uvY, rev);
                    gl_FragColor = vec4(rgb, mask);
                }
            `,
        });

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
        scene.add(mesh);

        const item = { wrap, mediaEl, mesh, mat, loaded: false, pendingReveal: false, isVideo };
        items.push(item);

        if (isVideo) {
            // VideoTexture updates every frame from <video>
            const vtex = new THREE.VideoTexture(mediaEl);
            vtex.minFilter = THREE.LinearFilter;
            vtex.magFilter = THREE.LinearFilter;
            vtex.format    = THREE.RGBAFormat;
            mat.uniforms.tMap.value = vtex;

            const markReady = () => {
                if (item.loaded) return;
                item.loaded = true;
                if (item.pendingReveal) playReveal(item);
            };
            if (mediaEl.readyState >= 2) markReady();
            else mediaEl.addEventListener('loadeddata', markReady, { once: true });

            // Start the card that is on screen; the others start as they arrive (js/lazyVideo.js, appearOnScroll.js),
            // so a visit doesn't download all three project videos up front
            const r = mediaEl.getBoundingClientRect();
            if (r.bottom > 0 && r.top < window.innerHeight) mediaEl.play().catch(() => {});
        } else {
            // Load texture — if a reveal was already requested, play it now
            new THREE.TextureLoader().load(mediaEl.src, tex => {
                tex.minFilter = THREE.LinearFilter;
                mat.uniforms.tMap.value = tex;
                item.loaded = true;
                if (item.pendingReveal) playReveal(item);
            });
        }

        // Hover: the picture pushes in a touch. Flat: the plane itself does not move.
        if (!reduceMotion) {
            const setHover = on => {
                gsap.to(mat.uniforms.uHover, {
                    value: on ? 1 : 0,
                    duration: on ? 0.6 : 0.45,
                    ease: 'power3.out',
                    overwrite: true,
                });
            };
            card.addEventListener('mouseenter', () => setHover(true));
            card.addEventListener('mouseleave', () => setHover(false));
        }

        // Re-trigger on every scroll into view; direction from entry position
        const io = new IntersectionObserver(entries => {
            const entry = entries[0];
            gsap.killTweensOf(item.mat.uniforms.uReveal);
            if (entry.isIntersecting) {
                // Element entered from below → scrolling down → bottom-to-top
                // Element entered from above → scrolling up  → top-to-bottom
                item.mat.uniforms.uDir.value = entry.boundingClientRect.top >= 0 ? 1.0 : -1.0;
                item.mat.uniforms.uReveal.value = 0;
                if (item.loaded) playReveal(item);
                else item.pendingReveal = true;
            } else {
                item.mat.uniforms.uReveal.value = 0;
                item.pendingReveal = false;
            }
        }, { threshold: 0.1 });
        io.observe(wrap);
    });

    function playReveal(item) {
        item.pendingReveal = false;
        // A card that a returning picture is shrinking into (transition.js sets
        // data-instant on its wrap) has to be whole the moment that picture is
        // handed over, so it skips the wipe and is simply there.
        if (item.wrap.dataset.instant) {
            item.mat.uniforms.uReveal.value = 1;
            return;
        }
        gsap.to(item.mat.uniforms.uReveal, {
            value: 1,
            duration: 0.9,
            ease: 'expo.out',
        });
    }

    // ── First image reveal on load ──────────────────────────────────────
    // Fires after a short settle delay so the canvas is ready
    function triggerFirstReveal() {
        const first = items[0];
        if (!first) return;
        first.mat.uniforms.uDir.value = 1.0; // bottom-to-top on load
        first.mat.uniforms.uReveal.value = 0;
        if (first.loaded) playReveal(first);
        else first.pendingReveal = true;
    }
    setTimeout(triggerFirstReveal, 400);

    // ── Mouse / speed tracking ──────────────────────────────────────────
    const mouse       = new THREE.Vector2(-10, -10);
    const followMouse = new THREE.Vector2(-10, -10);
    const prevMouse   = new THREE.Vector2(-10, -10);
    let   targetSpeed = 0;
    let   mouseSeen   = false;   // the vectors above start off-screen as placeholders

    window.addEventListener('mousemove', e => {
        mouse.x =       e.clientX / window.innerWidth;
        mouse.y = 1.0 - e.clientY / window.innerHeight;
        if (!mouseSeen) {
            // First sighting: start the followers here rather than easing in
            // from the off-screen placeholder, which reads as a lurch.
            mouseSeen = true;
            followMouse.copy(mouse);
            prevMouse.copy(mouse);
        }
    });

    // ── Scroll velocity tracking ────────────────────────────────────────
    let prevScrollY = window.scrollY;
    let scrollVelo  = 0;   // px per 60 Hz frame, lightly smoothed

    // ── Position meshes to match wrap bounds ────────────────────────────
    const smoothstep = (a, b, x) => {
        const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
        return t * t * (3 - 2 * t);
    };

    // `frames` is the time since the last render in 60 Hz frames, so the easing
    // below runs at the same speed on a 144 Hz display as on a 60 Hz one.
    const ease = (rate, frames) => 1 - Math.pow(1 - rate, frames);

    // The plane fills its card the way object-fit: cover would: a card taller than the video (the phone layout)
    // shows its centre, at full height. On a 16:9 card the window is the whole frame, as before.
    function coverCrop(item, W, H) {
        const el = item.mediaEl;
        if (!item.isVideo || !W || !H) return;
        const base = el.dataset.crop === 'bottom' ? CROP_BOTTOM : CROP_NONE;
        const media = (el.videoWidth || 16) / (el.videoHeight || 9), box = W / H;
        const sx = box < media ? box / media : 1, sy = box > media ? media / box : 1;
        item.mat.uniforms.uCrop.value.set(base.x + base.z * (1 - sx) / 2, base.y + base.w * (1 - sy) / 2, base.z * sx, base.w * sy);
    }

    function updateMeshes() {
        const vFOV = camera.fov * Math.PI / 180;
        const visH = 2 * Math.tan(vFOV / 2) * camDist;
        const visW = visH * camera.aspect;
        const vw = window.innerWidth, vh = window.innerHeight;

        items.forEach(item => {
            const { wrap, mesh, mat } = item;
            const rect = wrap.getBoundingClientRect();
            const W = rect.width, H = rect.height;
            const cx = (rect.left + W / 2) / vw;   // card centre, 0..1 across the viewport
            const cy = (rect.top  + H / 2) / vh;
            // A slide on its way in sits at 95% and grows to full size as it reaches the
            // centre; the scroll is already eased, so the size follows it smoothly.
            const grow = reduceMotion ? 1 : 1 - 0.05 * smoothstep(0.02, 0.6, Math.abs(cy - 0.5));
            mesh.scale.set((W / vw) * visW * grow, (H / vh) * visH * grow, 1);
            mesh.position.x = (cx - 0.5) * visW;
            mesh.position.y = (0.5 - cy) * visH;
            coverCrop(item, W, H);

            if (reduceMotion) return;
            // how close this slide is to the centre of the frame
            mat.uniforms.uFocus.value  = 1 - smoothstep(0.1, 0.8, Math.abs(cy - 0.5));
            mat.uniforms.uAspect.value = W > 0 ? H / W : 1;
            // The streak is the distance the card travels in a frame and a bit,
            // which is what a camera shutter would smear, measured against the
            // card's own height. Capped so a fling stays a blur and not a wash.
            mat.uniforms.uStreak.value = H > 0 ? Math.max(-0.09, Math.min(0.09, scrollVelo * 1.4 / H)) : 0;
        });
    }

    // ── Resize ──────────────────────────────────────────────────────────
    window.addEventListener('resize', () => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h);
        rt.setSize(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        postUniforms.resolution.value.set(1, h / w);
    });

    // ── Render loop ─────────────────────────────────────────────────────
    let lastTime = performance.now();

    function render(now) {
        const frames = Math.max(0.25, Math.min(4, (now - lastTime) / (1000 / 60)));
        lastTime = now;

        const speed = Math.sqrt(
            Math.pow(prevMouse.x - mouse.x, 2) +
            Math.pow(prevMouse.y - mouse.y, 2)
        ) / frames;
        const follow = ease(0.1, frames);
        targetSpeed -= follow * (targetSpeed - speed);
        followMouse.x -= follow * (followMouse.x - mouse.x);
        followMouse.y -= follow * (followMouse.y - mouse.y);
        prevMouse.copy(mouse);

        postUniforms.uMouse.value.copy(followMouse);
        postUniforms.uVelo.value = Math.min(targetSpeed, 0.05);
        targetSpeed *= Math.pow(0.999, frames);

        // Scroll velocity → motion blur. Smoothed only enough to hide frame
        // jitter: it has to follow the real speed closely, so the streak is
        // there while the card moves and gone the moment it stops.
        const curScrollY = window.scrollY;
        scrollVelo += ((curScrollY - prevScrollY) / frames - scrollVelo) * ease(0.35, frames);
        prevScrollY = curScrollY;
        if (Math.abs(scrollVelo) < 0.05) scrollVelo = 0;

        updateMeshes(); // sync with Lenis CSS transform every frame

        renderer.setRenderTarget(rt);
        renderer.render(scene, camera);

        renderer.setRenderTarget(null);
        renderer.render(postScene, postCamera);

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
