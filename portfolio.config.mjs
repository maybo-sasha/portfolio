// Publishing is reversible: hidden project pages and assets stay in the repo.
export const publishedPages = [
    'index.html',
    'about.html',
    'ai-decisioning-studio.html',
    'streams.html',
    'optigenie.html',
    'ai-champion.html',
];

// Classic scripts and runtime media URLs are not bundled by Vite. Only these
// active-project assets need their original paths copied to the distribution.
export const runtimeAssets = [
    'assets/ai-decisioning-studio',
    'assets/streams',
    'assets/optigenie',
    'assets/ai-champion',
    // compose: the font and previews only; the v3 report bundles are shown as still images
    'assets/compose/caveat-700.ttf',
    'assets/compose/caveat-OFL.txt',
    'assets/compose/previews',
    'assets/icons/wall',
    'assets/Opimove/Ai studio/Brand Icons.png',
    'assets/Opimove/Ai studio/Brand Icons (1).png',
    'assets/Opimove/Ai studio/Brand Icons (2).png',
    'assets/Opimove/Ai studio/Brand Icons (3).png',
    'homePage/aboutVideo-framed.mp4',
    'assets/documents/Sasha-Maiboroda-CV.pdf',
];
