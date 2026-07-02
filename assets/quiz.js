// Interactive quiz component.
//
// Usage in markdown — drop this HTML block anywhere:
//
// <div class="quiz" data-quiz-id="what-is-a-skill" data-next="../lessons/05-build-a-skill.md">
//   <p class="quiz-q">What is a Claude skill?</p>
//   <ul class="quiz-opts">
//     <li data-correct="true"  data-explain="Right — skills are reusable instruction packs...">A reusable instruction pack with a trigger phrase</li>
//     <li data-correct="false" data-explain="No — that's a 'system prompt'.">A persistent system prompt for every chat</li>
//     <li data-correct="false" data-explain="Close — extensions are different.">A browser extension for Claude</li>
//     <li data-correct="false" data-explain="No — that's an MCP server.">A way to connect Claude to external apps</li>
//   </ul>
//   <p class="quiz-next-cta">Now go build one →</p>
// </div>
//
// data-quiz-id: optional, used to remember the user's answer in localStorage
// data-next: optional, shows a "Next" button linking to that path when answered correctly

(function () {
  'use strict';

  const STORAGE_KEY = 'dadsClaudeCurriculum.quizAnswers';

  function loadAnswers() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveAnswer(quizId, answerIndex, correct) {
    if (!quizId) return;
    const answers = loadAnswers();
    answers[quizId] = { answerIndex, correct, ts: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }

  function initQuiz(quizEl) {
    if (quizEl.dataset.quizInitialized === 'true') return;
    quizEl.dataset.quizInitialized = 'true';

    const quizId = quizEl.dataset.quizId || '';
    const nextHref = resolveNextHref(quizEl.dataset.next || '');
    const nextCtaEl = quizEl.querySelector('.quiz-next-cta');
    const nextCtaText = nextCtaEl ? nextCtaEl.textContent : 'Continue →';
    if (nextCtaEl) nextCtaEl.style.display = 'none';

    const opts = Array.from(quizEl.querySelectorAll('.quiz-opts > li'));
    const feedbackEl = document.createElement('div');
    feedbackEl.className = 'quiz-feedback';
    feedbackEl.setAttribute('aria-live', 'polite');
    quizEl.appendChild(feedbackEl);

    const nextEl = document.createElement('div');
    nextEl.className = 'quiz-next';
    nextEl.style.display = 'none';
    quizEl.appendChild(nextEl);

    // Restore prior answer state if the user already answered this quiz before
    if (quizId) {
      const prior = loadAnswers()[quizId];
      if (prior && typeof prior.answerIndex === 'number' && opts[prior.answerIndex]) {
        // Defer to next tick so all setup is complete before we replay the pick
        setTimeout(() => handlePick(opts[prior.answerIndex], prior.answerIndex, true), 0);
      }
    }

    function handlePick(opt, index, fromRestore) {
      if (quizEl.dataset.answered === 'true') return;
      quizEl.dataset.answered = 'true';

      const isCorrect = opt.dataset.correct === 'true';
      const explain = opt.dataset.explain || '';

      opts.forEach((o) => o.classList.add('disabled'));
      opt.classList.add(isCorrect ? 'correct' : 'incorrect');

      // Reveal the right answer if user got it wrong
      if (!isCorrect) {
        opts.forEach((o) => {
          if (o.dataset.correct === 'true') o.classList.add('reveal-correct');
        });
      }

      const restoredPrefix = fromRestore
        ? '<em class="quiz-restored">Your previous answer:</em> '
        : '';
      feedbackEl.innerHTML =
        restoredPrefix +
        '<strong>' +
        (isCorrect ? '✓ Right.' : '✗ Not quite.') +
        '</strong> ' +
        escapeHtml(explain);
      feedbackEl.classList.add(isCorrect ? 'correct' : 'incorrect');

      if (!fromRestore) saveAnswer(quizId, index, isCorrect);

      if (isCorrect && nextHref) {
        nextEl.innerHTML =
          '<a class="quiz-next-link" href="' +
          escapeAttr(nextHref) +
          '">' +
          escapeHtml(nextCtaText) +
          '</a>';
        nextEl.style.display = '';
      }

      // Always allow a retry on incorrect answers
      if (!isCorrect) {
        const retry = document.createElement('button');
        retry.className = 'quiz-retry';
        retry.textContent = 'Try again';
        retry.addEventListener('click', () => resetQuiz(quizEl));
        nextEl.innerHTML = '';
        nextEl.appendChild(retry);
        nextEl.style.display = '';
      }
    }

    opts.forEach((opt, index) => {
      opt.setAttribute('role', 'button');
      opt.setAttribute('tabindex', '0');
      opt.addEventListener('click', () => handlePick(opt, index));
      opt.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          handlePick(opt, index);
        }
      });
    });
  }

  function resetQuiz(quizEl) {
    quizEl.dataset.answered = 'false';
    const opts = Array.from(quizEl.querySelectorAll('.quiz-opts > li'));
    opts.forEach((o) => {
      o.classList.remove('disabled', 'correct', 'incorrect', 'reveal-correct');
    });
    const feedback = quizEl.querySelector('.quiz-feedback');
    if (feedback) {
      feedback.textContent = '';
      feedback.classList.remove('correct', 'incorrect');
    }
    const next = quizEl.querySelector('.quiz-next');
    if (next) {
      next.style.display = 'none';
      next.innerHTML = '';
    }
    // Clear the saved answer so the quiz starts fresh
    const quizId = quizEl.dataset.quizId || '';
    if (quizId) {
      const answers = loadAnswers();
      delete answers[quizId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  // Resolve a markdown-style sibling link (e.g. "01-map-your-workflow.md")
  // into the directory-URL form mkdocs serves (e.g. "../01-map-your-workflow/").
  // Absolute URLs and already-resolved paths pass through unchanged.
  function resolveNextHref(raw) {
    if (!raw) return raw;
    if (/^(https?:)?\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    if (!raw.toLowerCase().endsWith('.md')) return raw;
    const stripped = raw.slice(0, -3);
    // Sibling page in same directory — current page URL ends in a slash,
    // so we need to step up one level before targeting the sibling directory.
    if (!stripped.includes('/')) {
      return '../' + stripped + '/index.html';
    }
    return stripped + '/index.html';
  }

  function initAll() {
    document.querySelectorAll('.quiz').forEach(initQuiz);
  }

  // Run on initial load and on Material's instant-navigation events
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('DOMContentSwitch', initAll);
  if (typeof document$ !== 'undefined' && document$.subscribe) document$.subscribe(initAll);
})();
