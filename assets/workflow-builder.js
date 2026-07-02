// Workflow builder — interactive form for Lesson 1.
//
// Usage: drop this somewhere in a markdown file:
//
//   <div class="workflow-builder"></div>
//
// Dad fills in his procurement tasks. Rows save automatically to localStorage.
// "Export" copies a markdown table to clipboard.

(function () {
  'use strict';

  const STORAGE_KEY = 'dadsClaudeCurriculum.workflow';

  const DEFAULT_ROW = {
    task: '',
    frequency: 'Weekly',
    output: '',
    recipient: '',
  };

  const FREQUENCIES = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Ad-hoc'];

  function loadWorkflow() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (!data.rows || !Array.isArray(data.rows) || data.rows.length === 0) {
        return { rows: [emptyRow(), emptyRow(), emptyRow()] };
      }
      return data;
    } catch (e) {
      return { rows: [emptyRow(), emptyRow(), emptyRow()] };
    }
  }

  function saveWorkflow(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function emptyRow() {
    return Object.assign({}, DEFAULT_ROW);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildRow(row, idx, onChange, onRemove) {
    const tr = document.createElement('tr');
    tr.className = 'wfb-row';

    // Task
    const tdTask = document.createElement('td');
    const taskInput = document.createElement('textarea');
    taskInput.rows = 2;
    taskInput.placeholder = 'e.g. Run RFP for new analytics vendor';
    taskInput.value = row.task;
    taskInput.addEventListener('input', () => {
      row.task = taskInput.value;
      onChange();
    });
    tdTask.appendChild(taskInput);
    tr.appendChild(tdTask);

    // Frequency
    const tdFreq = document.createElement('td');
    const freqSelect = document.createElement('select');
    FREQUENCIES.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f;
      opt.textContent = f;
      if (f === row.frequency) opt.selected = true;
      freqSelect.appendChild(opt);
    });
    freqSelect.addEventListener('change', () => {
      row.frequency = freqSelect.value;
      onChange();
    });
    tdFreq.appendChild(freqSelect);
    tr.appendChild(tdFreq);

    // Output
    const tdOut = document.createElement('td');
    const outInput = document.createElement('textarea');
    outInput.rows = 2;
    outInput.placeholder = 'e.g. Scorecard, recommendation memo';
    outInput.value = row.output;
    outInput.addEventListener('input', () => {
      row.output = outInput.value;
      onChange();
    });
    tdOut.appendChild(outInput);
    tr.appendChild(tdOut);

    // Recipient
    const tdRec = document.createElement('td');
    const recInput = document.createElement('textarea');
    recInput.rows = 2;
    recInput.placeholder = 'e.g. R&D dept lead, Finance';
    recInput.value = row.recipient;
    recInput.addEventListener('input', () => {
      row.recipient = recInput.value;
      onChange();
    });
    tdRec.appendChild(recInput);
    tr.appendChild(tdRec);

    // Remove button
    const tdRemove = document.createElement('td');
    tdRemove.className = 'wfb-remove-cell';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'wfb-remove';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove this row';
    removeBtn.addEventListener('click', () => onRemove(idx));
    tdRemove.appendChild(removeBtn);
    tr.appendChild(tdRemove);

    return tr;
  }

  function toMarkdown(data) {
    const lines = [];
    lines.push('# My Workflow');
    lines.push('');
    lines.push('| Task | How often | What I produce | Who receives it |');
    lines.push('|------|-----------|----------------|-----------------|');
    data.rows.forEach((r) => {
      if (!r.task && !r.output && !r.recipient) return;
      lines.push(
        '| ' +
          mdCell(r.task) +
          ' | ' +
          mdCell(r.frequency) +
          ' | ' +
          mdCell(r.output) +
          ' | ' +
          mdCell(r.recipient) +
          ' |'
      );
    });
    return lines.join('\n');
  }

  function mdCell(s) {
    return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // Fallback for older browsers
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

  function initBuilder(rootEl) {
    if (rootEl.dataset.wfbInitialized === 'true') return;
    rootEl.dataset.wfbInitialized = 'true';

    const data = loadWorkflow();

    const tableWrap = document.createElement('div');
    tableWrap.className = 'wfb-table-wrap';
    const table = document.createElement('table');
    table.className = 'wfb-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Task', 'How often', 'What I produce', 'Who receives it', ''].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    rootEl.appendChild(tableWrap);

    const controls = document.createElement('div');
    controls.className = 'wfb-controls';
    rootEl.appendChild(controls);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'wfb-btn wfb-btn-secondary';
    addBtn.textContent = '+ Add row';
    controls.appendChild(addBtn);

    const exportBtn = document.createElement('button');
    exportBtn.type = 'button';
    exportBtn.className = 'wfb-btn wfb-btn-primary';
    exportBtn.textContent = 'Copy as markdown';
    controls.appendChild(exportBtn);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'wfb-btn wfb-btn-ghost';
    clearBtn.textContent = 'Clear all';
    controls.appendChild(clearBtn);

    const status = document.createElement('div');
    status.className = 'wfb-status';
    rootEl.appendChild(status);

    const previewWrap = document.createElement('details');
    previewWrap.className = 'wfb-preview';
    const previewSummary = document.createElement('summary');
    previewSummary.textContent = 'Preview as markdown';
    previewWrap.appendChild(previewSummary);
    const previewPre = document.createElement('pre');
    previewPre.className = 'wfb-preview-pre';
    previewWrap.appendChild(previewPre);
    rootEl.appendChild(previewWrap);

    function render() {
      tbody.innerHTML = '';
      data.rows.forEach((row, idx) => {
        tbody.appendChild(buildRow(row, idx, onAnyChange, removeRow));
      });
      previewPre.textContent = toMarkdown(data);
      const filled = data.rows.filter((r) => r.task && r.task.trim()).length;
      status.textContent =
        filled === 0
          ? 'Start typing. Saves automatically.'
          : filled + ' row' + (filled === 1 ? '' : 's') + ' filled. Saved.';
    }

    function onAnyChange() {
      saveWorkflow(data);
      previewPre.textContent = toMarkdown(data);
      const filled = data.rows.filter((r) => r.task && r.task.trim()).length;
      status.textContent =
        filled + ' row' + (filled === 1 ? '' : 's') + ' filled. Saved.';
    }

    function removeRow(idx) {
      data.rows.splice(idx, 1);
      if (data.rows.length === 0) data.rows.push(emptyRow());
      saveWorkflow(data);
      render();
    }

    addBtn.addEventListener('click', () => {
      data.rows.push(emptyRow());
      saveWorkflow(data);
      render();
    });

    exportBtn.addEventListener('click', async () => {
      const md = toMarkdown(data);
      const ok = await copyToClipboard(md);
      status.textContent = ok
        ? 'Copied to clipboard. Paste it anywhere — text editor, claude.ai, anywhere.'
        : 'Copy failed. Open the preview below and copy manually.';
    });

    clearBtn.addEventListener('click', () => {
      if (!confirm('Clear all rows? This cannot be undone.')) return;
      data.rows = [emptyRow(), emptyRow(), emptyRow()];
      saveWorkflow(data);
      render();
    });

    render();
  }

  function initAll() {
    document.querySelectorAll('.workflow-builder').forEach(initBuilder);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('DOMContentSwitch', initAll);
  if (typeof document$ !== 'undefined' && document$.subscribe) document$.subscribe(initAll);
})();
