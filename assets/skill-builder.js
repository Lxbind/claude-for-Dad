// Skill builder — interactive form for Lesson 5 (build your first skill).
//
// Usage in markdown:
//
//   <div class="skill-builder"></div>
//
// Produces a downloadable / copyable SKILL.md based on dad's inputs.

(function () {
  'use strict';

  const STORAGE_KEY = 'dadsClaudeCurriculum.skill';

  const TEMPLATE = (data) =>
    `---
name: ${data.name || 'my-skill'}
description: ${data.description || 'TODO: describe what this skill does and when it triggers.'}
---

# ${data.title || data.name || 'My Skill'}

## When this skill activates

${data.when || 'TODO: list the trigger phrases or situations.'}

## What it does

${data.body || 'TODO: write the instructions Claude should follow when this skill activates.'}

## Example

${data.example || 'TODO (optional): paste a worked example of the skill in action.'}
`;

  function loadDraft() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveDraft(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch (_) {}
      document.body.removeChild(ta);
      return ok;
    }
  }

  function downloadAsFile(filename, content) {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function field(label, key, placeholder, multiline, data, onChange) {
    const wrap = document.createElement('div');
    wrap.className = 'sb-field';

    const lab = document.createElement('label');
    lab.textContent = label;
    wrap.appendChild(lab);

    const input = multiline
      ? document.createElement('textarea')
      : document.createElement('input');
    if (multiline) input.rows = 4;
    else input.type = 'text';
    input.placeholder = placeholder;
    input.value = data[key] || '';
    input.addEventListener('input', () => {
      data[key] = input.value;
      onChange();
    });
    wrap.appendChild(input);

    return wrap;
  }

  function initBuilder(rootEl) {
    if (rootEl.dataset.sbInitialized === 'true') return;
    rootEl.dataset.sbInitialized = 'true';

    const data = loadDraft();

    const formWrap = document.createElement('div');
    formWrap.className = 'sb-form';
    rootEl.appendChild(formWrap);

    const previewWrap = document.createElement('div');
    previewWrap.className = 'sb-preview';
    const previewLabel = document.createElement('div');
    previewLabel.className = 'sb-preview-label';
    previewLabel.textContent = 'Live preview — SKILL.md';
    previewWrap.appendChild(previewLabel);
    const previewPre = document.createElement('pre');
    previewPre.className = 'sb-preview-pre';
    previewWrap.appendChild(previewPre);
    rootEl.appendChild(previewWrap);

    const controls = document.createElement('div');
    controls.className = 'sb-controls';
    rootEl.appendChild(controls);

    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'sb-btn sb-btn-primary';
    copyBtn.textContent = 'Copy SKILL.md';
    controls.appendChild(copyBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.type = 'button';
    downloadBtn.className = 'sb-btn sb-btn-secondary';
    downloadBtn.textContent = 'Download SKILL.md';
    controls.appendChild(downloadBtn);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'sb-btn sb-btn-ghost';
    clearBtn.textContent = 'Clear';
    controls.appendChild(clearBtn);

    const status = document.createElement('div');
    status.className = 'sb-status';
    rootEl.appendChild(status);

    function refresh() {
      previewPre.textContent = TEMPLATE(data);
    }

    function onChange() {
      saveDraft(data);
      refresh();
    }

    formWrap.appendChild(
      field(
        'Skill name (lowercase, dashes-only — this becomes the folder name)',
        'name',
        'e.g. weekly-supplier-summary',
        false,
        data,
        onChange
      )
    );
    formWrap.appendChild(
      field(
        'Title (human-readable)',
        'title',
        'e.g. Weekly supplier summary',
        false,
        data,
        onChange
      )
    );
    formWrap.appendChild(
      field(
        'Description — one sentence Claude reads to decide whether to activate',
        'description',
        'e.g. Summarizes this week\'s supplier interactions into a one-page brief for the department lead.',
        true,
        data,
        onChange
      )
    );
    formWrap.appendChild(
      field(
        'When it activates — trigger phrases or situations',
        'when',
        'e.g. When I say "weekly supplier summary" or paste raw notes from supplier meetings.',
        true,
        data,
        onChange
      )
    );
    formWrap.appendChild(
      field(
        'What it does — the actual instructions Claude follows',
        'body',
        'e.g. Read the supplier notes below. Produce a one-page brief with: 1) status by supplier 2) decisions made 3) open risks 4) recommended next actions. Keep it under 400 words. No fluff.',
        true,
        data,
        onChange
      )
    );
    formWrap.appendChild(
      field(
        'Example (optional but recommended)',
        'example',
        'Paste a worked example here — Claude uses examples heavily.',
        true,
        data,
        onChange
      )
    );

    copyBtn.addEventListener('click', async () => {
      const ok = await copyToClipboard(TEMPLATE(data));
      status.textContent = ok
        ? 'Copied. Paste into ~/.claude/skills/' + (data.name || 'my-skill') + '/SKILL.md'
        : 'Copy failed. Use the Download button instead.';
    });

    downloadBtn.addEventListener('click', () => {
      downloadAsFile('SKILL.md', TEMPLATE(data));
      status.textContent =
        'Downloaded SKILL.md. Move it to ~/.claude/skills/' +
        (data.name || 'my-skill') +
        '/SKILL.md';
    });

    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear the form?')) return;
      Object.keys(data).forEach((k) => delete data[k]);
      saveDraft(data);
      // Re-render by reloading the inputs
      formWrap.querySelectorAll('input, textarea').forEach((el) => (el.value = ''));
      refresh();
      status.textContent = 'Cleared.';
    });

    refresh();
  }

  function initAll() {
    document.querySelectorAll('.skill-builder').forEach(initBuilder);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('DOMContentSwitch', initAll);
  if (typeof document$ !== 'undefined' && document$.subscribe) document$.subscribe(initAll);
})();
