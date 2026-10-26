const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
const active = ['ai-decisioning-studio.html', 'streams.html', 'ai-champion.html'];
const hidden = ['tetris-block-party.html', 'lucky-buddies.html', 'player-journey.html', 'playground.html', 'design-system.html', '28-days.html', 'project.html'];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('homepage, Work menu and Next sequence contain exactly the active projects', () => {
    const cards = [...read('index.html').matchAll(/class="project-card" href="([^"]+)"/g)].map(m => m[1]);
    const menu = [...read('js/workMenu.js').matchAll(/href: '([^']+)'/g)].map(m => m[1]);
    const order = [...read('js/projectNav.js').matchAll(/file: '([^']+)'/g)].map(m => m[1]);
    assert.deepEqual(cards, active); assert.deepEqual(menu, active); assert.deepEqual(order, active);
    for (const page of active) {
        const html = read(page);
        for (const archived of hidden) assert.ok(!html.includes('href="' + archived + '"'), page + ' links to ' + archived);
    }
});
// The hidden projects live on the hidden-projects-backup branch, not in this tree.
test('hidden project pages and their asset folders are removed from the live tree', () => {
    for (const page of hidden) {
        assert.ok(!fs.existsSync(path.join(root, page)), page + ' is still here');
        assert.ok(!read('index.html').includes(page));
    }
    for (const dir of ['assets/personal', 'assets/tetrisblockparty', 'assets/lucky-buddies', 'assets/playerjoueney', '28-days']) {
        assert.ok(!fs.existsSync(path.join(root, dir)) || !require('node:child_process').execSync('git ls-files ' + dir, { cwd: root }).toString().trim(), dir + ' is still tracked');
    }
    assert.ok(!read('index.html').includes('assets/personal/'));
    assert.ok(!read('index.html').includes('assets/tetrisblockparty/'));
});
test('publication configuration excludes hidden project pages and asset collections', async () => {
    const config = await import(pathToFileURL(path.join(root, 'portfolio.config.mjs')).href);
    assert.deepEqual(config.publishedPages, ['index.html', 'about.html', ...active]);
    for (const page of hidden) assert.ok(!config.publishedPages.includes(page));
    for (const asset of config.runtimeAssets) {
        assert.ok(!/assets\/(personal|tetrisblockparty|lucky-buddies|playerjoueney|skills)(\/|$)/.test(asset), asset);
    }
});
test('a stale return from a hidden project cannot load its cached poster', () => {
    const script = [...read('index.html').matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
    const entries = new Map([
        ['returnSlide', 'playground.html'], ['returnFrame', '/assets/personal/hidden.jpg'], ['returnTime', '8'],
        ['siteLoaded', '1'], ['homeCards', JSON.stringify({ 'playground.html': { zoom: true, poster: '/assets/personal/hidden.jpg' } })],
    ]);
    const window = {};
    const document = { documentElement: { classList: { add() { assert.fail('Applied a hidden-project overlay'); } }, style: { setProperty() { assert.fail('Loaded a hidden poster'); } } } };
    const sessionStorage = { getItem: key => entries.get(key) || null, removeItem: key => entries.delete(key) };
    vm.runInNewContext(script, { window, document, sessionStorage, matchMedia: () => ({ matches: false }) });
    assert.equal(window.__returnTo, undefined);
    assert.equal(entries.has('returnSlide'), false);
    assert.equal(entries.has('returnFrame'), false);
});
