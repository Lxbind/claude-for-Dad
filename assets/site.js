// Site shell: header/dot-rail/pager injection, theme toggle, scroll progress,
// reveal-on-scroll, completion state, and a few easter eggs from L. to Amet.
(function () {
  'use strict';

  const THEME_KEY = 'dadsClaudeCurriculum.theme';
  const GAME_KEY = 'dadsClaudeCurriculum.game';

  const LESSONS = [
    { slug: '00-start-here',          num: '00', title: 'Start here',               time: '10 min' },
    { slug: '01-map-your-workflow',   num: '01', title: 'Map your workflow',        time: '15 min' },
    { slug: '02-ai-in-your-workflow', num: '02', title: 'AI in your workflow',      time: '20 min' },
    { slug: '03-where-things-live',   num: '03', title: 'Where everything lives',   time: '20 min' },
    { slug: '04-ai-tool-zoo',         num: '04', title: 'The AI tool zoo',          time: '20 min' },
    { slug: '05-match-tools-to-work', num: '05', title: 'Match tools to your work', time: '15 min' },
    { slug: '06-try-claude',          num: '06', title: 'Try Claude on a real task',time: '25 min' },
    { slug: '07-build-a-skill',       num: '07', title: 'Build your first skill',   time: '30 min' }
  ];

  const depth = parseInt(document.body.dataset.depth || '0', 10);
  const root = depth === 0 ? '' : new Array(depth + 1).join('../');
  const slug = document.body.dataset.slug || '';
  const lessonIndex = LESSONS.findIndex((l) => l.slug === slug);

  function lessonHref(l) { return root + 'lessons/' + l.slug + '/index.html'; }

  function gameState() {
    try { return JSON.parse(localStorage.getItem(GAME_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function completed() { return (gameState().completedLessons) || []; }

  // ---------- theme ----------
  function applyTheme(t) {
    document.body.setAttribute('data-md-color-scheme', t);
    document.documentElement.setAttribute('data-md-color-scheme', t);
    const btn = document.querySelector('.pw-theme-btn');
    if (btn) btn.textContent = t === 'slate' ? '☀' : '☾';
  }
  function initTheme() {
    let t = localStorage.getItem(THEME_KEY);
    if (!t) t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'slate' : 'default';
    applyTheme(t);
  }
  function toggleTheme() {
    const cur = document.body.getAttribute('data-md-color-scheme') === 'slate' ? 'default' : 'slate';
    localStorage.setItem(THEME_KEY, cur);
    applyTheme(cur);
  }

  // ---------- header ----------
  function buildHeader() {
    const header = document.querySelector('.pw-header');
    if (!header) return;
    const done = completed();
    const dots = LESSONS.map((l, i) => {
      const cls = ['pw-dot'];
      if (done.indexOf(l.slug) !== -1) cls.push('done');
      if (i === lessonIndex) cls.push('current');
      return '<a class="' + cls.join(' ') + '" href="' + lessonHref(l) + '" aria-label="Lesson ' + l.num + '">' +
        '<span class="pw-dot-tip">' + l.num + ' · ' + l.title + '</span></a>';
    }).join('');
    header.innerHTML =
      '<a class="pw-wordmark" href="' + root + 'index.html">Claude<em>, for Amet</em></a>' +
      '<nav class="pw-dots" aria-label="Lessons">' + dots + '</nav>' +
      '<div class="pw-header-right">' +
        '<a class="pw-navlink" href="' + root + 'curriculum/index.html">Curriculum</a>' +
        '<button class="pw-theme-btn" aria-label="Toggle dark mode">☾</button>' +
      '</div>';
    header.querySelector('.pw-theme-btn').addEventListener('click', toggleTheme);
    applyTheme(document.body.getAttribute('data-md-color-scheme') || 'default');
  }

  // ---------- pager ----------
  function buildPager() {
    const el = document.querySelector('.pw-pager');
    if (!el || lessonIndex === -1) return;
    const prev = LESSONS[lessonIndex - 1];
    const next = LESSONS[lessonIndex + 1];
    const prevHtml = prev
      ? '<a class="pw-pager-card prev" href="' + lessonHref(prev) + '">' +
          '<span class="pw-pager-label"><span class="pw-arrow">←</span> Previous · ' + prev.num + '</span>' +
          '<span class="pw-pager-title">' + prev.title + '</span></a>'
      : '<span class="pw-pager-card pw-empty"></span>';
    const nextHtml = next
      ? '<a class="pw-pager-card next" href="' + lessonHref(next) + '">' +
          '<span class="pw-pager-label">Next · ' + next.num + ' <span class="pw-arrow">→</span></span>' +
          '<span class="pw-pager-title">' + next.title + '</span></a>'
      : '<a class="pw-pager-card next" href="' + root + 'index.html">' +
          '<span class="pw-pager-label">Course complete <span class="pw-arrow">→</span></span>' +
          '<span class="pw-pager-title">Back to the start. There you go.</span></a>';
    el.innerHTML = prevHtml + nextHtml;
  }

  // ---------- lesson cards on landing ----------
  function markLandingCards() {
    const done = completed();
    document.querySelectorAll('.pw-lesson-card[data-slug]').forEach((card) => {
      if (done.indexOf(card.dataset.slug) !== -1) card.classList.add('done');
    });
  }

  // ---------- scroll progress ----------
  function initProgress() {
    const fill = document.querySelector('.pw-progress-fill');
    if (!fill) return;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      fill.style.width = Math.min(100, Math.max(0, pct)).toFixed(2) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  // ---------- reveal on scroll ----------
  function initReveal() {
    const main = document.querySelector('.pw-main');
    if (!main) return;
    const targets = [];
    Array.from(main.children).forEach((el) => {
      if (el.classList.contains('pw-hero') || el.classList.contains('pw-cover')) return;
      el.classList.add('pw-reveal');
      targets.push(el);
    });
    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('pw-in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('pw-in');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    targets.forEach((el) => io.observe(el));
    // Anything already in view on load pops in staggered
    targets.slice(0, 6).forEach((el, i) => {
      setTimeout(() => el.classList.add('pw-in'), 60 + i * 90);
    });
  }

  // ---------- easter eggs ----------
  function toast(msg) {
    if (window.DadsClaudeGame && window.DadsClaudeGame.showToast) {
      window.DadsClaudeGame.showToast(msg, 'info');
    } else {
      console.log(msg);
    }
  }
  function confettiAt(el) {
    if (window.DadsClaudeGame && window.DadsClaudeGame.fireConfetti) {
      window.DadsClaudeGame.fireConfetti(el || document.body);
    }
  }

  function initEggs() {
    console.log('%cDad — you found the console. Of course you did.\nYou\u2019re the best dad. I love you. \u2014 L.',
      'font-family: Georgia, serif; font-style: italic; font-size: 14px; color: #4b5cf7;');

    // Click "Amet" three times → am I getting punked
    let punk = 0;
    document.querySelectorAll('.pw-name').forEach((el) => {
      el.addEventListener('click', () => {
        punk += 1;
        if (punk === 3) {
          toast('am I getting punked ?');
          confettiAt(el);
          punk = 0;
        }
      });
    });

    // Type "affectivement" anywhere → confetti + note
    let buffer = '';
    document.addEventListener('keydown', (e) => {
      if (e.key.length !== 1) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-20);
      if (buffer.indexOf('affectivement') !== -1) {
        buffer = '';
        confettiAt(document.body);
        toast('Affectivement \u2764 \u2014 L.');
      }
    });

    // All quizzes on the page answered correctly → "There you go."
    const quizzes = document.querySelectorAll('.quiz');
    if (quizzes.length) {
      let said = false;
      setInterval(() => {
        if (said) return;
        const all = Array.from(document.querySelectorAll('.quiz'));
        const ok = all.length && all.every((q) =>
          q.dataset.answered === 'true' && q.querySelector('.quiz-opts > li.correct'));
        if (ok) {
          said = true;
          setTimeout(() => toast('There you go.'), 900);
        }
      }, 1200);
    }
  }

  // ---------- init ----------
  function init() {
    initTheme();
    buildHeader();
    buildPager();
    markLandingCards();
    initProgress();
    initReveal();
    initEggs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
