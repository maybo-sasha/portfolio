const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/lazyVideo.js'), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function eventTarget(target = {}) {
    const listeners = new Map();
    target.addEventListener = (name, callback) => {
        const callbacks = listeners.get(name) || [];
        callbacks.push(callback); listeners.set(name, callbacks);
    };
    target.emit = name => (listeners.get(name) || []).forEach(callback => callback());
    return target;
}
function fixture(options = {}) {
    let open = false;
    const overlay = { classList: { contains: () => open } };
    const video = eventTarget({
        isConnected: true, dataset: {}, paused: true, ended: false, preload: 'auto',
        controls: false, calls: 0, loads: 0, currentTime: 0, duration: 30,
        rect: { top: 40, bottom: 340, left: 0, right: 600, width: 600, height: 300 },
        closest(selector) {
            if (selector === '.about-overlay') return options.overlay ? overlay : null;
            if (selector === '.work-menu, .pg-reel') return options.menu ? {} : null;
            return null;
        },
        getClientRects() { return this.hidden ? [] : [this.rect]; },
        getBoundingClientRect() { return this.rect; },
        hasAttribute() { return false; }, removeAttribute() {},
        pause() { this.paused = true; },
        load() { this.loads++; this.currentTime = 0; this.paused = true; },
        play() {
            this.calls++;
            if (options.blocked && this.calls === 1) return Promise.reject(Object.assign(new Error('Blocked'), { name: 'NotAllowedError' }));
            if (options.pending) return new Promise(resolve => { this.finish = () => { this.paused = false; resolve(); }; });
            this.paused = false; return Promise.resolve();
        },
    });
    const document = eventTarget({
        visibilityState: 'visible', body: {}, documentElement: { clientHeight: 800 },
        querySelectorAll(selector) { return selector === 'video' ? [video] : options.overlay ? [overlay] : []; },
    });
    let intersection;
    const mutations = [];
    class IntersectionObserver {
        constructor(callback) { intersection = callback; }
        observe() {} unobserve() {}
    }
    class MutationObserver {
        constructor(callback) { this.callback = callback; }
        observe(target) { mutations.push({ target, callback: this.callback }); }
    }
    const window = eventTarget({ innerWidth: 1200, innerHeight: 800, IntersectionObserver });
    vm.runInNewContext(source, { window, document, IntersectionObserver, MutationObserver, setTimeout, clearTimeout });
    return { video, document, window,
        intersect() { intersection([{ target: video }]); },
        openOverlay() { open = true; mutations.filter(m => m.target === overlay).forEach(m => m.callback([])); },
    };
}
test('visible videos play muted and resume after scrolling back into view', async () => {
    const f = fixture(); await flush();
    assert.equal(f.video.paused, false); assert.equal(f.video.muted, true); assert.equal(f.video.playsInline, true);
    f.video.rect.top = 900; f.video.rect.bottom = 1200; f.intersect();
    assert.equal(f.video.paused, true);
    f.video.rect.top = 40; f.video.rect.bottom = 340; f.intersect(); await flush();
    assert.equal(f.video.paused, false); assert.equal(f.video.calls, 2);
});
test('background tabs pause and resume on return', async () => {
    const f = fixture(); await flush();
    f.document.visibilityState = 'hidden'; f.document.emit('visibilitychange'); assert.equal(f.video.paused, true);
    f.document.visibilityState = 'visible'; f.document.emit('visibilitychange'); await flush();
    assert.equal(f.video.paused, false);
});
test('offscreen videos release their decoder and restore their playback position', async () => {
    const f = fixture(); await flush(); f.video.currentTime = 12;
    f.video.rect.top = 900; f.video.rect.bottom = 1200; f.intersect();
    assert.equal(f.video.preload, 'none'); assert.equal(f.video.loads, 1);
    f.intersect(); assert.equal(f.video.loads, 1);
    f.video.rect.top = 40; f.video.rect.bottom = 340; f.intersect();
    f.video.emit('loadedmetadata'); await flush();
    assert.equal(f.video.currentTime, 12); assert.equal(f.video.paused, false);
});
test('the closed About overlay does not play its video', async () => {
    const f = fixture({ overlay: true }); await flush(); assert.equal(f.video.calls, 0);
    f.openOverlay(); await flush(); assert.equal(f.video.paused, false);
});
test('autoplay denial exposes controls and retries after a user gesture', async () => {
    const f = fixture({ blocked: true }); await flush();
    assert.equal(f.video.controls, true); assert.equal(f.video.dataset.videoState, 'blocked');
    f.document.emit('pointerdown'); await flush(); assert.equal(f.video.paused, false);
});
test('a play promise finishing after leaving the viewport cannot keep playing', async () => {
    const f = fixture({ pending: true });
    f.video.rect.top = 900; f.video.rect.bottom = 1200; f.intersect(); f.video.finish(); await flush();
    assert.equal(f.video.paused, true);
});
test('large, partially visible recordings still play', async () => {
    const f = fixture(); await flush(); f.video.pause();
    f.video.rect.top = -1500; f.video.rect.bottom = 500; f.video.rect.height = 2000;
    f.intersect(); await flush(); assert.equal(f.video.paused, false);
});
test('Work-menu previews retain their hover playback owner', async () => {
    const f = fixture({ menu: true }); await flush(); assert.equal(f.video.calls, 0);
});
test('every homepage video matches its project video, including the hero where present', () => {
    const home = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const menu = fs.readFileSync(path.join(root, 'js/workMenu.js'), 'utf8');
    const menuClips = new Map([...menu.matchAll(/href: '([^']+)'[^\n]+media: '([^']+)'/g)].map(m => [m[1], m[2]]));
    const cards = [...home.matchAll(/<a class="project-card" href="([^"]+)">([\s\S]*?)<\/a>/g)];
    assert.equal(cards.length, 3);
    for (const [, page, markup] of cards) {
        const homeSrc = markup.match(/<video[^>]*\ssrc="([^"]+)"/)[1];
        assert.equal(menuClips.get(page), homeSrc, page + ' menu preview differs');
        const inner = fs.readFileSync(path.join(root, page), 'utf8');
        const videos = [...inner.matchAll(/<video\b([^>]+)>/g)].filter(m => !m[1].includes('about-video'));
        const innerSources = videos.map(m => m[1].match(/\ssrc="([^"]+)"/)?.[1]).filter(Boolean);
        assert.equal(homeSrc, innerSources[0], page + ' hero differs');
        assert.ok(fs.existsSync(path.join(root, decodeURIComponent(homeSrc.split('?')[0]))), homeSrc);
    }
});
