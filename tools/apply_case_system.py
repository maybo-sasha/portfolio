"""Apply the OptiGenie case-study system to the other project pages (Sasha 11-16: same graphical language everywhere).
1. style/case-system.css = the OptiGenie system block, scoped to main#case, chapter total from --cs-total.
2. Each ads-structured page: <main id="case">, chapters wrapped in index + reading column, tints off, CSS + scripts linked."""
import re, sys, html
import os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + '/'

src = open(R + 'optigenie.html', encoding='utf-8').read()
s = src.index('/* Body system (Sasha 11-16'); e = src.index('</style>', s)
block = src[s:e]
css = block.replace('#optigenie', '#case').replace('" / 11"', '" / " var(--cs-total, "")')
AC_BLOCK = '/* AI skills page (ac-* structure): same frame, its own components */\nmain#case#case#case#case .og-main > .ac-sec, main#case#case#case#case .og-main > .cvex { position: relative; background: none !important; padding: var(--sp-xxl) 0 var(--sp-xxl) var(--cs-pad) !important; }\nmain#case#case#case#case .og-main > .ac-sec { counter-increment: ogch; }\nmain#case#case#case#case .og-main > .ac-sec + *, main#case#case#case#case .og-main > .cvex + .ac-sec { border-top: 1px solid var(--line); }\nmain#case#case#case#case .og-main > .ac-sec::before { content: counter(ogch, decimal-leading-zero) " / " var(--cs-total, ""); position: absolute; top: 2.25rem; right: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; letter-spacing: .08em; color: var(--muted); opacity: .7; }\nmain#case#case#case#case .og-main .ac-wrap { padding: 0 !important; max-width: none !important; margin: 0 !important; }\nmain#case#case#case#case .og-main .ch-num { display: none !important; }\nmain#case#case#case#case .og-main .ch-open { display: block !important; }\nmain#case#case#case#case .og-main .ch-text { max-width: 68ch; }\n'
css += AC_BLOCK
open(R + 'style/case-system.css', 'w', encoding='utf-8').write(
    '/* Case-study system, shared by every project page. Generated from optigenie.html (apply_system.py); edit there, then regenerate. */\n' + css)

# OptiGenie itself: total from the same variable
if '" / 11"' in src:
    src = src.replace('" / 11"', '" / " var(--cs-total, "")')
    src = src.replace('<div class="og-main">', '<div class="og-main" style="--cs-total:\'11\'">', 1)
    open(R + 'optigenie.html', 'w', encoding='utf-8').write(src)


def apply(page):
    p = R + page; t = open(p, encoding='utf-8').read()
    if 'class="og-body"' in t:
        print(page, 'already done'); return
    m = re.search(r'<main class="([^"]*)">', t); assert m, page
    t = t.replace(m.group(0), f'<main class="{m.group(1)}" id="case">', 1)
    main_s = t.index('<main'); main_e = t.index('</main>')
    secs = [(mm.start(), mm.group(1), mm.group(2)) for mm in re.finditer(r'<section class="ads-sec[^"]*" id="([^"]+)" data-rail="([^"]*)"', t[main_s:main_e])]
    assert secs, page
    first = main_s + secs[0][0]
    last_id = secs[-1][1]
    last = t.index('</section>', t.index(f'id="{last_id}"')) + len('</section>')
    items = ''.join(f'<li><a href="#{sid}" data-target="{sid}"><i class="og-index__n">{k + 1:02d}</i>{name}</a></li>' for k, (_, sid, name) in enumerate(secs))
    index = f'<aside class="og-index" aria-label="Chapters"><ol class="og-index__list">{items}</ol></aside>'
    body = t[first:last]
    body = re.sub(r'(<section class=")([^"]*)(" id=")', lambda mm: mm.group(1) + ' '.join(c for c in mm.group(2).split() if c not in ('ads-sec--mist', 'og-light')) + mm.group(3), body)
    t = t[:first] + f'<div class="og-body">{index}<div class="og-main" style="--cs-total:\'{len(secs):02d}\'">' + body + '</div></div>' + t[last:]
    if 'case-system.css' not in t:
        t = t.replace('</head>', '    <link rel="stylesheet" href="./style/case-system.css">\n</head>', 1)
    for js in ('scrollProgress.js', 'caseIndex.js'):
        if js not in t:
            t = t.replace('</body>', f'    <script src="./js/{js}"></script>\n</body>', 1)
    open(p, 'w', encoding='utf-8').write(t)
    print(page, len(secs), 'chapters:', [n for _, _, n in secs])


for page in sys.argv[1:]:  # no pages: only regenerate style/case-system.css
    apply(page)
