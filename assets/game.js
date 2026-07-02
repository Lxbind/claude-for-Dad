// Gamification layer: XP, levels, streaks, badges, HUD, confetti, sound, toasts.
//
// Persists to localStorage["dadsClaudeCurriculum.game"] as:
//   { xp, level, streak, longestStreak, badges: [], completedLessons: [],
//     lessonQuizStats: { <lessonSlug>: { correctFirstTry: n, wrong: n } },
//     visitedLessons: [], lessonStartTs: { <slug>: ts }, soundOn: bool }
//
// Integrates with quiz.js WITHOUT rewriting it: we listen for clicks on
// .quiz-opts > li elements and re-derive the correct/incorrect state from
// the CSS classes quiz.js applies. Cleanest hook that doesn't touch the
// existing component.

(function () {
  'use strict';

  const STORAGE_KEY = 'dadsClaudeCurriculum.game';

  const LEVELS = [
    { min: 0,    name: 'Curious' },
    { min: 100,  name: 'Apprentice' },
    { min: 300,  name: 'Practitioner' },
    { min: 600,  name: 'Fluent' },
    { min: 1000, name: 'Claude Whisperer' }
  ];

  const LESSON_SLUGS = [
    '00-start-here', '01-map-your-workflow', '02-ai-in-your-workflow',
    '03-where-things-live', '04-ai-tool-zoo', '05-match-tools-to-work',
    '06-try-claude', '07-build-a-skill'
  ];

  const BADGES = {
    'first-steps':    { name: 'First Steps',    desc: 'Answered your first quiz' },
    'perfect-lesson': { name: 'Perfect Lesson', desc: 'Got every quiz in a lesson right on the first try' },
    'streak-master':  { name: 'Streak Master',  desc: '5 correct in a row' },
    'unstoppable':    { name: 'Unstoppable',    desc: '10 correct in a row' },
    'explorer':       { name: 'Explorer',       desc: 'Visited every lesson' },
    'graduate':       { name: 'Graduate',       desc: 'Completed every lesson' },
    'speedrunner':    { name: 'Speedrunner',    desc: 'Finished a lesson in under 10 minutes' },
    'comeback':       { name: 'Comeback',       desc: 'Got a question wrong, then right on retry' }
  };

  // --------- state ---------

  function defaultState() {
    return {
      xp: 0,
      level: 0,
      streak: 0,
      longestStreak: 0,
      badges: [],
      completedLessons: [],
      lessonQuizStats: {},
      visitedLessons: [],
      lessonStartTs: {},
      soundOn: false
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return Object.assign(defaultState(), parsed);
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  let state = loadState();

  function levelIndexFor(xp) {
    let idx = 0;
    for (let i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i].min) idx = i;
    }
    return idx;
  }

  function recomputeLevel() {
    const newLevel = levelIndexFor(state.xp);
    if (newLevel > state.level) {
      state.level = newLevel;
      showToast('Level up: ' + LEVELS[newLevel].name + '!', 'level');
    } else {
      state.level = newLevel;
    }
  }

  // --------- XP + streaks ---------

  function awardXp(amount, reason) {
    state.xp += amount;
    recomputeLevel();
    saveState(state);
    renderHud();
    if (reason) showToast('+' + amount + ' XP · ' + reason, 'xp');
  }

  function bumpStreak() {
    state.streak += 1;
    if (state.streak > state.longestStreak) state.longestStreak = state.streak;
    if (state.streak === 5)  unlockBadge('streak-master');
    if (state.streak === 10) unlockBadge('unstoppable');
    saveState(state);
    renderHud();
  }

  function resetStreak() {
    if (state.streak > 0) {
      state.streak = 0;
      saveState(state);
      renderHud();
    }
  }

  // --------- badges ---------

  function unlockBadge(id) {
    if (state.badges.indexOf(id) !== -1) return;
    state.badges.push(id);
    saveState(state);
    renderHud();
    const b = BADGES[id];
    if (b) showToast('Badge unlocked: ' + b.name, 'badge');
  }

  // --------- confetti ---------

  function fireConfetti(anchorEl) {
    const container = document.createElement('div');
    container.className = 'dcc-confetti-layer';
    document.body.appendChild(container);

    const rect = anchorEl && anchorEl.getBoundingClientRect
      ? anchorEl.getBoundingClientRect()
      : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const originX = rect.left + rect.width / 2;
    const originY = rect.top + rect.height / 2;
    const colors = ['#4caf50', '#ffb300', '#3f51b5', '#e91e63', '#00bcd4', '#ff5722'];

    const N = 22;
    for (let i = 0; i < N; i++) {
      const piece = document.createElement('div');
      piece.className = 'dcc-confetti';
      const angle = Math.random() * Math.PI * 2;
      const dist = 80 + Math.random() * 140;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist + 120; // pulled down by gravity
      piece.style.left = originX + 'px';
      piece.style.top = originY + 'px';
      piece.style.background = colors[i % colors.length];
      piece.style.setProperty('--dx', dx + 'px');
      piece.style.setProperty('--dy', dy + 'px');
      piece.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      piece.style.animationDelay = (Math.random() * 0.15) + 's';
      container.appendChild(piece);
    }

    setTimeout(() => { container.remove(); }, 1800);
  }

  // --------- sound (Web Audio API oscillator) ---------

  let audioCtx = null;
  function ding() {
    if (!state.soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  // --------- toasts ---------

  function ensureToastLayer() {
    let el = document.querySelector('.dcc-toast-layer');
    if (!el) {
      el = document.createElement('div');
      el.className = 'dcc-toast-layer';
      document.body.appendChild(el);
    }
    return el;
  }

  function showToast(msg, kind) {
    const layer = ensureToastLayer();
    const t = document.createElement('div');
    t.className = 'dcc-toast dcc-toast-' + (kind || 'info');
    t.textContent = msg;
    layer.appendChild(t);
    // Force reflow then add visible class for fade-in
    void t.offsetWidth;
    t.classList.add('dcc-toast-in');
    setTimeout(() => {
      t.classList.remove('dcc-toast-in');
      t.classList.add('dcc-toast-out');
      setTimeout(() => t.remove(), 400);
    }, 2600);
  }

  // --------- HUD ---------

  function renderHud() {
    let hud = document.querySelector('.dcc-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.className = 'dcc-hud';
      document.body.appendChild(hud);
    }

    const levelObj = LEVELS[state.level] || LEVELS[0];
    const nextLevel = LEVELS[state.level + 1];
    let pct = 100;
    let toNext = '';
    if (nextLevel) {
      const span = nextLevel.min - levelObj.min;
      const into = state.xp - levelObj.min;
      pct = Math.max(0, Math.min(100, (into / span) * 100));
      toNext = (nextLevel.min - state.xp) + ' XP to ' + nextLevel.name;
    } else {
      toNext = 'Max level';
    }

    hud.innerHTML =
      '<div class="dcc-hud-top">' +
        '<div class="dcc-hud-level">' + escapeHtml(levelObj.name) + '</div>' +
        '<button class="dcc-hud-toggle" title="Toggle HUD" aria-label="Toggle HUD">' + (hudCollapsed ? '▸' : '▾') + '</button>' +
      '</div>' +
      (hudCollapsed ? '' :
      '<div class="dcc-hud-body">' +
        '<div class="dcc-hud-row"><span>XP</span><strong>' + state.xp + '</strong></div>' +
        '<div class="dcc-hud-bar"><div class="dcc-hud-bar-fill" style="width:' + pct.toFixed(1) + '%"></div></div>' +
        '<div class="dcc-hud-sub">' + escapeHtml(toNext) + '</div>' +
        '<div class="dcc-hud-row"><span>Streak</span><strong>' + state.streak + '</strong> <span class="dcc-hud-dim">(best ' + state.longestStreak + ')</span></div>' +
        '<div class="dcc-hud-row"><span>Badges</span><strong>' + state.badges.length + ' / ' + Object.keys(BADGES).length + '</strong></div>' +
        '<div class="dcc-hud-badges">' + renderBadgeChips() + '</div>' +
        '<label class="dcc-hud-sound"><input type="checkbox" ' + (state.soundOn ? 'checked' : '') + '> sound on correct</label>' +
      '</div>');

    // Wire up controls
    const toggle = hud.querySelector('.dcc-hud-toggle');
    if (toggle) toggle.addEventListener('click', () => {
      hudCollapsed = !hudCollapsed;
      renderHud();
    });
    const soundBox = hud.querySelector('.dcc-hud-sound input');
    if (soundBox) soundBox.addEventListener('change', (e) => {
      state.soundOn = e.target.checked;
      saveState(state);
      if (state.soundOn) ding();
    });
  }

  let hudCollapsed = false;

  function renderBadgeChips() {
    return Object.keys(BADGES).map((id) => {
      const owned = state.badges.indexOf(id) !== -1;
      const b = BADGES[id];
      const cls = 'dcc-badge-chip' + (owned ? ' owned' : '');
      return '<span class="' + cls + '" title="' + escapeAttr(b.name + ' — ' + b.desc) + '">' +
        (owned ? '★' : '☆') + '</span>';
    }).join('');
  }

  // --------- lesson detection ---------

  function currentLessonSlug() {
    // Path looks like /.../lessons/03-where-things-live/ under mkdocs.
    const path = window.location.pathname
      .replace(/index\.html?$/i, '')
      .replace(/\/+$/, '');
    const parts = path.split('/');
    const last = (parts[parts.length - 1] || '').replace(/\.html?$/i, '');
    if (LESSON_SLUGS.indexOf(last) !== -1) return last;
    return null;
  }

  function markLessonVisited(slug) {
    if (!slug) return;
    if (state.visitedLessons.indexOf(slug) === -1) {
      state.visitedLessons.push(slug);
      saveState(state);
    }
    if (!state.lessonStartTs[slug]) {
      state.lessonStartTs[slug] = Date.now();
      saveState(state);
    }
    if (state.visitedLessons.length >= LESSON_SLUGS.length) {
      unlockBadge('explorer');
    }
  }

  function markLessonComplete(slug, allCorrectFirstTry) {
    if (!slug) return;
    if (state.completedLessons.indexOf(slug) === -1) {
      state.completedLessons.push(slug);
      awardXp(100, 'Lesson finished');
      // Speedrun check
      const started = state.lessonStartTs[slug];
      if (started && (Date.now() - started) < 10 * 60 * 1000) {
        unlockBadge('speedrunner');
      }
      if (allCorrectFirstTry) {
        unlockBadge('perfect-lesson');
      }
      if (state.completedLessons.length >= LESSON_SLUGS.length) {
        unlockBadge('graduate');
        awardXp(200, 'All lessons complete!');
      }
      saveState(state);
    }
  }

  // --------- quiz integration ---------

  function trackQuizAnswer(quizEl, isCorrect, wasRetry) {
    const slug = currentLessonSlug();
    if (slug) {
      if (!state.lessonQuizStats[slug]) state.lessonQuizStats[slug] = { correctFirstTry: 0, wrong: 0, seen: 0 };
      const stats = state.lessonQuizStats[slug];
      stats.seen += 1;
      if (isCorrect && !wasRetry) stats.correctFirstTry += 1;
      if (!isCorrect) stats.wrong += 1;
    }

    unlockBadge('first-steps');

    if (isCorrect) {
      awardXp(wasRetry ? 5 : 10, wasRetry ? 'Correct on retry' : 'Correct answer');
      if (wasRetry) unlockBadge('comeback');
      bumpStreak();
      fireConfetti(quizEl);
      ding();
    } else {
      resetStreak();
    }

    // Check for "perfect lesson" and "lesson finished" conditions.
    checkLessonProgress(quizEl);
    saveState(state);
  }

  function checkLessonProgress(quizEl) {
    const slug = currentLessonSlug();
    if (!slug) return;

    // Count total quizzes on this page vs. answered-correctly quizzes.
    const allQuizzes = Array.from(document.querySelectorAll('.quiz'));
    if (!allQuizzes.length) return;
    const answered = allQuizzes.filter((q) => q.dataset.answered === 'true');
    // We treat "lesson complete" as: every quiz on the page has been answered
    // (any answer — quiz.js marks answered=true on any pick), AND at least one
    // was correct (so we don't complete a lesson by clicking all-wrong).
    const allAnsweredCorrectly = allQuizzes.every((q) => {
      if (q.dataset.answered !== 'true') return false;
      // A quiz is "correct" if it has an option with class 'correct' picked
      return !!q.querySelector('.quiz-opts > li.correct');
    });

    if (allAnsweredCorrectly) {
      const stats = state.lessonQuizStats[slug] || { correctFirstTry: 0, wrong: 0 };
      const perfect = stats.wrong === 0;
      markLessonComplete(slug, perfect);
    }
  }

  // Hook: watch clicks on quiz options. Quiz.js applies .correct/.incorrect
  // synchronously in its click handler, so a microtask later we can read state.
  function wireQuizzes() {
    document.querySelectorAll('.quiz .quiz-opts > li').forEach((li) => {
      if (li.dataset.gameHooked === 'true') return;
      li.dataset.gameHooked = 'true';
      li.addEventListener('click', () => {
        const quizEl = li.closest('.quiz');
        if (!quizEl) return;
        // Wait for quiz.js to apply classes.
        setTimeout(() => {
          const wasRetry = quizEl.dataset.gameSeen === 'true';
          quizEl.dataset.gameSeen = 'true';
          const isCorrect = li.classList.contains('correct');
          trackQuizAnswer(quizEl, isCorrect, wasRetry);
        }, 30);
      });
    });
  }

  // --------- workflow builder integration (Lesson 1) ---------

  function checkWorkflowBonus() {
    try {
      const raw = localStorage.getItem('dadsClaudeCurriculum.workflow');
      if (!raw) return;
      const data = JSON.parse(raw);
      const rows = Array.isArray(data) ? data : (data.rows || []);
      const filled = rows.filter((r) =>
        r && (r.task || r.recipient || r.frequency) &&
        String(r.task || '').trim().length > 3
      );
      if (filled.length >= 3 && !state._workflowBonusAwarded) {
        state._workflowBonusAwarded = true;
        saveState(state);
        awardXp(50, 'Workflow chart started (3+ rows)');
      }
      if (filled.length >= 8 && !state._workflowFullBonus) {
        state._workflowFullBonus = true;
        saveState(state);
        awardXp(75, 'Workflow chart filled out');
      }
    } catch (e) {}
  }

  // --------- skill builder integration (Lesson 7) ---------

  function watchSkillBuilder() {
    document.querySelectorAll('.sb-controls button').forEach((btn) => {
      const txt = (btn.textContent || '').toLowerCase();
      if (txt.indexOf('download') !== -1 || txt.indexOf('copy') !== -1) {
        if (btn.dataset.gameHooked === 'true') return;
        btn.dataset.gameHooked = 'true';
        btn.addEventListener('click', () => {
          if (!state._skillBuiltBonus) {
            state._skillBuiltBonus = true;
            saveState(state);
            awardXp(150, 'First skill built!');
            unlockBadge('graduate'); // implicitly finished the arc
          }
        });
      }
    });
  }

  // --------- helpers ---------

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // --------- init ---------

  function init() {
    state = loadState();
    renderHud();
    markLessonVisited(currentLessonSlug());
    wireQuizzes();
    checkWorkflowBonus();
    watchSkillBuilder();

    // Periodically re-check for dynamically-added quizzes and workflow updates.
    setInterval(() => {
      wireQuizzes();
      checkWorkflowBonus();
      watchSkillBuilder();
    }, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('DOMContentSwitch', init);
  if (typeof document$ !== 'undefined' && document$.subscribe) {
    document$.subscribe(init);
  }

  // Expose a tiny API for playgrounds/askbot to award XP for their own events.
  window.DadsClaudeGame = {
    awardXp,
    unlockBadge,
    fireConfetti,
    showToast,
    getState: () => Object.assign({}, state)
  };
})();
