import { defineConfig } from 'vite';
import { resolve, join } from 'path';
import { cpSync, existsSync, readFileSync } from 'fs';
import { publishedPages, runtimeAssets } from './portfolio.config.mjs';

// Relative asset URLs work at the domain root and under renamed GitHub Pages repositories.
const base = './';

// Discover the classic scripts actually used by published pages. Module scripts
// are bundled by Vite; archived pages do not add scripts or assets to the build.
const runtimeScripts = [...new Set(publishedPages.flatMap(page =>
  [...readFileSync(resolve(__dirname, page), 'utf8').matchAll(/<script\s+src=["']\.\/(js\/[^"']+)["']/g)]
    .map(match => match[1])
))];

// Vite bundles CSS and module scripts but leaves classic <script src="./js/...">
// tags and runtime asset paths (inline scripts, workMenu.js) untouched — copy them into dist.
// Never ship raw source drops: the AI-skill folder holds a nested git repo and
// zip archives (~4.7MB) that the site never references — it uses the curated
// copies in assets/ai-champion/ instead.
const COPY_EXCLUDE = [/[\\/]assets[\\/]skills([\\/]|$)/, /[\\/]\.git([\\/]|$)/, /\.zip$/i];

// Performance pass (Sasha 2026-11-09): browsers fetch every <video poster> at parse and every preload="metadata" video at
// once, even off screen. Only the page's first film (the hero, or the home page's first slide) keeps its poster and preload;
// every other video gets preload="none" and data-poster, which js/lazyVideo.js turns back into a poster one screen ahead.
function lazyMedia() {
  return {
    name: 'lazy-media',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let first = true;
        return html.replace(/<video\b[^>]*>/g, tag => {
          if (/class="about-video"/.test(tag)) return tag;
          if (first) { first = false; return tag; }
          // autoplay would start the download at parse whatever preload says; js/lazyVideo.js plays it once it shows
          let t = tag.replace(/\sautoplay(?=[\s>])/, '').replace(/\spreload="[a-z]*"/, '').replace(/<video\b/, '<video preload="none"');
          return t.replace(/\sposter="/, ' data-poster="');
        });
      },
    },
  };
}

function copyStaticToDist(...paths) {
  return {
    name: 'copy-static-to-dist',
    closeBundle() {
      const outDir = resolve(__dirname, 'dist');
      for (const rel of paths) {
        const src = resolve(__dirname, rel);
        if (!existsSync(src)) continue;
        cpSync(src, join(outDir, rel), {
          recursive: true,
          filter: (from) => !COPY_EXCLUDE.some((re) => re.test(from)),
        });
      }
    },
  };
}

export default defineConfig({
  base,
  resolve: { dedupe: ['three'] },
  plugins: [lazyMedia(), copyStaticToDist(...runtimeScripts, ...runtimeAssets)],
  build: {
    rollupOptions: {
      input: Object.fromEntries(publishedPages.map(page => [page.replace(/\.html$/, ''), resolve(__dirname, page)])),
    },
  },
});
