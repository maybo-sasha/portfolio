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
  plugins: [copyStaticToDist(...runtimeScripts, ...runtimeAssets)],
  build: {
    rollupOptions: {
      input: Object.fromEntries(publishedPages.map(page => [page.replace(/\.html$/, ''), resolve(__dirname, page)])),
    },
  },
});
