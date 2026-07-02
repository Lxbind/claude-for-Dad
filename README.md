# Claude, for Dad — redesigned site

Static site. No build step, no MkDocs, no dependencies.

## Deploy

**Netlify (easiest):** drag this whole `redesign/` folder onto https://app.netlify.com/drop — done.

**GitHub Pages:** push the contents of this folder to a repo, then Settings → Pages → deploy from branch (root).

## Structure

- `index.html` — landing page
- `curriculum/` — full curriculum overview
- `lessons/<slug>/index.html` — the 8 lessons
- `assets/` — original interactive components (quiz, workflow builder, skill builder, playgrounds, XP game, ask-bot) + `learning.css`, re-skinned by `site.css`, with shell/nav/easter eggs in `site.js`

All progress (quiz answers, workflow chart, skill drafts, XP) persists in localStorage, same keys as the old site — nothing lost.
