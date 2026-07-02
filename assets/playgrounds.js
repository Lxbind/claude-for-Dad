// Interactive playground components for the curriculum.
//
// Mount points in markdown look like:
//   <div data-playground="claude-code-terminal" data-script="rfp-summary"></div>
//   <div data-playground="claude-ai-chat" data-mode="recipe"></div>
//   <div data-playground="folder-tree"></div>
//   <div data-playground="mcp-demo"></div>
//   <div data-playground="mock" data-mock="claude-code"></div>
//   <div data-playground="mock" data-mock="claude-ai"></div>
//   <div data-playground="mock" data-mock="claude-desktop"></div>
//   <div data-playground="mock" data-mock="claude-projects"></div>
//   <div data-playground="tool-tour"></div>   (all four mocks in a click-through)
//
// Everything is client-side, no deps.

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // A) Claude Code terminal
  // ------------------------------------------------------------------

  const CC_SCRIPTS = {
    'rfp-summary': [
      { who: 'sys', text: '$ claude' },
      { who: 'sys', text: 'Claude Code v1.0  ·  ~/Documents/procurement' },
      { who: 'sys', text: 'Type your request. Ctrl+D to exit.' },
      { who: 'user', text: 'Read every PDF in ./rfp-Q3/. Summarize each supplier\'s bid in 3 bullets: price, delivery timeline, one differentiator. Save as rfp-summary.md.' },
      { who: 'claude-thinking', text: 'Scanning ./rfp-Q3/ ...' },
      { who: 'claude-thinking', text: 'Found 8 PDFs. Reading supplier-a.pdf ...' },
      { who: 'claude-thinking', text: 'Reading supplier-b.pdf ...' },
      { who: 'claude-thinking', text: 'Reading supplier-c.pdf ... (6 more)' },
      { who: 'claude', text: 'Done. Wrote rfp-summary.md — 8 suppliers, 3 bullets each.\n\nHeadline flags:\n  · Supplier C: cheapest by 12% but 8-week delivery (2× the others)\n  · Supplier F: $50k above median, but 2-week delivery + on-site QA\n  · Supplier B: only one offering a shared-risk pricing model\n\nWant me to build a comparison table too?' },
      { who: 'user', text: 'Yes — same 8 suppliers, side-by-side, and flag any auto-renew clauses.' },
      { who: 'claude-thinking', text: 'Re-reading contracts for termination clauses ...' },
      { who: 'claude', text: 'Table saved to comparison.md.\n\nAuto-renew flags: Supplier C and Supplier F both renew silently with 60-day notice. Everyone else needs an affirmative sign-off. Want me to draft the 60-day notice reminders as calendar entries?' }
    ],
    'contract-review': [
      { who: 'sys', text: '$ claude' },
      { who: 'sys', text: 'Claude Code v1.0  ·  ~/Documents/procurement/contracts' },
      { who: 'user', text: 'Read all 12 supplier contracts in this folder. Build a comparison table: supplier, monthly fee, termination clause, auto-renew yes/no, notice period. Flag anything unusual.' },
      { who: 'claude-thinking', text: 'Reading 12 PDFs...' },
      { who: 'claude', text: 'Comparison table saved to ./comparison.md.\n\nUnusual clauses found:\n  · Supplier D — 3-year auto-renew, 90-day cancellation window\n  · Supplier G — price escalator tied to unnamed index\n  · Supplier K — indemnity clause is broader than the others\n\nSupplier D is the biggest surprise — that\'s $180k locked in without your sign-off.' }
    ]
  };

  const CC_CANNED = [
    { keys: ['procurement','supplier','contract','rfp','bid'], text: 'Sure — point me at the folder with your contracts and tell me what columns you want in the comparison table. I\'ll read every PDF and pull the terms out.' },
    { keys: ['email','draft','memo','write'], text: 'For pure drafting, you\'d be better off in claude.ai — I mainly earn my keep when there are files on disk to read. But paste the context here and I\'ll draft it.' },
    { keys: ['summarize','summary','brief'], text: 'Give me the file (or paste the notes) and tell me the output format — length, audience, sections. I\'ll produce it.' },
    { keys: ['calendar','schedule','meeting'], text: 'Calendar access lives in Claude Desktop + MCP, not Claude Code. I can\'t reach your calendar from a terminal — but I can draft the invite text once you have the slot.' },
    { keys: ['skill','install'], text: 'Skills go in ~/.claude/skills/<name>/SKILL.md for global, or <project>/.claude/skills/<name>/SKILL.md for project-scoped. Want me to scaffold one?' },
    { keys: ['file','folder','directory','pdf','docx'], text: 'Sure — I can read any file in this folder or below. Just tell me what to do with them.' }
  ];

  function mountClaudeCodeTerminal(host) {
    const scriptId = host.dataset.script || 'rfp-summary';
    const script = CC_SCRIPTS[scriptId] || CC_SCRIPTS['rfp-summary'];

    host.innerHTML = `
      <div class="mock mock-claude-code">
        <div class="mock-label">Example view — Claude Code (terminal)</div>
        <div class="mock-chrome">
          <span class="mock-dot red"></span>
          <span class="mock-dot yellow"></span>
          <span class="mock-dot green"></span>
          <span class="mock-title">claude — ~/Documents/procurement</span>
        </div>
        <div class="mock-body cc-body" role="log" aria-live="polite"></div>
        <div class="cc-controls">
          <button class="pg-btn pg-btn-primary cc-play">Play</button>
          <button class="pg-btn pg-btn-ghost cc-skip">Skip to end</button>
          <button class="pg-btn pg-btn-ghost cc-restart">Restart</button>
        </div>
        <div class="cc-try">
          <label class="cc-try-label">Try it yourself — type a request:</label>
          <div class="cc-try-row">
            <span class="cc-prompt">❯</span>
            <input type="text" class="cc-input" placeholder="e.g. summarize the contracts in this folder" />
            <button class="pg-btn pg-btn-primary cc-send">Ask</button>
          </div>
        </div>
      </div>
    `;

    const body = host.querySelector('.cc-body');
    let cancelled = false;
    let running = false;

    function appendLine(entry, instant) {
      const line = document.createElement('div');
      line.className = 'cc-line cc-line-' + entry.who;
      const label = document.createElement('span');
      label.className = 'cc-label';
      label.textContent = labelFor(entry.who);
      const content = document.createElement('span');
      content.className = 'cc-text';
      line.appendChild(label);
      line.appendChild(content);
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;

      if (instant) {
        content.textContent = entry.text;
        return Promise.resolve();
      }

      return typewrite(content, entry.text, entry.who === 'claude-thinking' ? 8 : 15);
    }

    function labelFor(who) {
      switch (who) {
        case 'sys': return '';
        case 'user': return '❯ ';
        case 'claude': return 'Claude: ';
        case 'claude-thinking': return '· ';
        default: return '';
      }
    }

    function typewrite(el, text, msPer) {
      return new Promise((resolve) => {
        let i = 0;
        function step() {
          if (cancelled) { el.textContent = text; return resolve(); }
          el.textContent = text.slice(0, i);
          if (i >= text.length) return resolve();
          i += Math.max(1, Math.floor(1 + Math.random() * 3));
          body.scrollTop = body.scrollHeight;
          setTimeout(step, msPer);
        }
        step();
      });
    }

    async function play() {
      if (running) return;
      running = true;
      cancelled = false;
      body.innerHTML = '';
      for (const entry of script) {
        if (cancelled) break;
        await appendLine(entry, false);
        if (!cancelled) await sleep(400);
      }
      running = false;
    }

    function skipToEnd() {
      cancelled = true;
      body.innerHTML = '';
      script.forEach((e) => appendLine(e, true));
    }

    function restart() {
      cancelled = true;
      setTimeout(() => { play(); }, 100);
    }

    host.querySelector('.cc-play').addEventListener('click', play);
    host.querySelector('.cc-skip').addEventListener('click', skipToEnd);
    host.querySelector('.cc-restart').addEventListener('click', restart);

    const input = host.querySelector('.cc-input');
    const send = host.querySelector('.cc-send');
    function handleUserAsk() {
      const q = (input.value || '').trim();
      if (!q) return;
      input.value = '';
      cancelled = true;
      // Wait for any running playback to bail
      setTimeout(async () => {
        cancelled = false;
        await appendLine({ who: 'user', text: q }, true);
        await appendLine({ who: 'claude-thinking', text: 'Thinking...' }, false);
        await sleep(300);
        const reply = pickCanned(q, CC_CANNED);
        await appendLine({ who: 'claude', text: reply }, false);
        awardXpOnce(host, 'cc-tried', 15, 'Tried the Claude Code playground');
      }, 120);
    }
    send.addEventListener('click', handleUserAsk);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleUserAsk(); }
    });

    // Autoplay a small preview so it's not blank on load
    script.slice(0, 3).forEach((e) => appendLine(e, true));
  }

  // ------------------------------------------------------------------
  // B) claude.ai chat UI
  // ------------------------------------------------------------------

  const CHAT_CANNED = [
    { keys: ['memo','draft','email','supplier','pause','renewal'], text: 'Draft memo:\n\nSubject: Pausing the Supplier A renewal\n\nWe\'re pausing the Supplier A contract renewal pending a delivery-reliability review. Over the last quarter, three committed delivery windows slipped past the confirmed dates, and the corrective-action responses we received didn\'t address the underlying capacity constraint.\n\nI want to acknowledge R&D\'s sponsorship of this vendor and the work that went into onboarding them. This pause isn\'t a foreclosure — it\'s a hold while we confirm the fix is real. If their next two deliveries land on time and their capacity plan checks out, I\'ll bring the renewal back to your team with a recommendation.' },
    { keys: ['summarize','brief','notes','meeting'], text: 'One-page brief:\n\n**Status by supplier**\n · Supplier A — on hold pending delivery review\n · Supplier B — renewed, no issues\n · Supplier C — quality escalation open, follow-up Fri\n\n**Decisions made**\n · Pausing Supplier A pending 2 clean deliveries\n · Approving Supplier B for auto-renew\n\n**Open risks**\n · Supplier C could impact Q4 launch if unresolved by 10/15\n\n**Next actions**\n · Review Supplier A capacity plan (this week)\n · Close Supplier C escalation (this week)' },
    { keys: ['rfp','compare','contract','table'], text: 'Comparison table:\n\n| Supplier | Price | Delivery | Terms |\n|---|---|---|---|\n| A | $$$ | 4 wk | Standard |\n| B | $$ | 6 wk | Shared risk |\n| C | $ | 8 wk | Auto-renew (silent) |\n\nRecommendation: B for the primary award, C for a secondary if we can renegotiate the auto-renew clause.' },
    { keys: ['project','instructions','role'], text: 'For persistent context across chats, use claude.ai\'s Projects feature. Create a Project, drop your role paragraph in the Custom Instructions field, and every new chat inside the Project starts with that context loaded. No more re-pasting.' },
    { keys: ['skill'], text: 'Skills are a Claude Code feature — a markdown file in ~/.claude/skills/<name>/SKILL.md. They auto-activate on a trigger phrase. In claude.ai (web) the closest thing is a Project\'s Custom Instructions.' }
  ];

  const CHAT_RECIPE_STEPS = [
    { label: 'Role', placeholder: 'e.g. I\'m a procurement consultant at a pharma company advising R&D and manufacturing.' },
    { label: 'Task', placeholder: 'e.g. Draft a 2-paragraph memo to my R&D lead pausing the Supplier A renewal.' },
    { label: 'Context', placeholder: 'e.g. Supplier A missed 3 deadlines this quarter. R&D was the original sponsor.' },
    { label: 'Constraints', placeholder: 'e.g. Firm-but-collegial tone. Don\'t list deadlines as bullets. Two paragraphs max.' }
  ];

  function mountClaudeAiChat(host) {
    const mode = host.dataset.mode || 'free';

    host.innerHTML = `
      <div class="mock mock-claude-ai">
        <div class="mock-label">Example view — claude.ai (web chat)</div>
        <div class="mock-chrome-lite">
          <span class="mock-brand">Claude</span>
          <span class="mock-model">Sonnet 4.5</span>
        </div>
        <div class="mock-body chat-body"></div>
        <div class="chat-input-wrap">
          ${mode === 'recipe' ? renderRecipeUi() : renderFreeUi()}
        </div>
      </div>
    `;

    const body = host.querySelector('.chat-body');

    if (mode === 'recipe') {
      wireRecipeMode(host, body);
    } else {
      wireFreeMode(host, body);
    }
  }

  function renderFreeUi() {
    return `
      <textarea class="chat-input" rows="2" placeholder="Message Claude..."></textarea>
      <button class="pg-btn pg-btn-primary chat-send">Send</button>
    `;
  }

  function renderRecipeUi() {
    return `
      <div class="chat-recipe">
        <div class="chat-recipe-hint">Build your prompt in four parts. Each one fills a slot below — send when all four are filled.</div>
        ${CHAT_RECIPE_STEPS.map((s, i) => `
          <div class="chat-recipe-field">
            <label>${i + 1}. ${s.label}</label>
            <textarea rows="2" data-slot="${s.label.toLowerCase()}" placeholder="${escapeAttr(s.placeholder)}"></textarea>
          </div>
        `).join('')}
        <button class="pg-btn pg-btn-primary chat-recipe-send">Send full prompt</button>
      </div>
    `;
  }

  function wireFreeMode(host, body) {
    const input = host.querySelector('.chat-input');
    const send = host.querySelector('.chat-send');

    function push(role, text) {
      const bubble = document.createElement('div');
      bubble.className = 'chat-msg chat-msg-' + role;
      bubble.innerHTML = '<div class="chat-avatar">' + (role === 'user' ? 'You' : 'C') + '</div>' +
                         '<div class="chat-bubble"></div>';
      body.appendChild(bubble);
      const bubbleText = bubble.querySelector('.chat-bubble');
      if (role === 'user') {
        bubbleText.textContent = text;
      } else {
        streamText(bubbleText, text);
      }
      body.scrollTop = body.scrollHeight;
    }

    function handleSend() {
      const q = (input.value || '').trim();
      if (!q) return;
      input.value = '';
      push('user', q);
      setTimeout(() => {
        const reply = pickCanned(q, CHAT_CANNED);
        push('claude', reply);
        awardXpOnce(host, 'chat-tried', 15, 'Tried the claude.ai playground');
      }, 350);
    }

    send.addEventListener('click', handleSend);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSend(); }
    });

    // Seed with a friendly greeting
    setTimeout(() => {
      const bubble = document.createElement('div');
      bubble.className = 'chat-msg chat-msg-claude';
      bubble.innerHTML = '<div class="chat-avatar">C</div><div class="chat-bubble">Hey — try asking me to draft a memo, summarize meeting notes, or compare supplier RFPs. (This is a canned demo — no data leaves your browser.)</div>';
      body.appendChild(bubble);
    }, 50);
  }

  function wireRecipeMode(host, body) {
    const btn = host.querySelector('.chat-recipe-send');
    btn.addEventListener('click', () => {
      const slots = {};
      host.querySelectorAll('.chat-recipe-field textarea').forEach((ta) => {
        slots[ta.dataset.slot] = (ta.value || '').trim();
      });
      const filled = Object.values(slots).filter(Boolean).length;
      if (filled < 3) {
        alert('Fill in at least 3 of the 4 parts (role / task / context / constraints) — the recipe only works when Claude has all of them.');
        return;
      }
      const compiled = 'Role: ' + (slots.role || '(not given)') + '\n\n' +
                       'Task: ' + (slots.task || '(not given)') + '\n\n' +
                       'Context:\n' + (slots.context || '(not given)') + '\n\n' +
                       'Constraints:\n' + (slots.constraints || '(not given)');

      const userBubble = document.createElement('div');
      userBubble.className = 'chat-msg chat-msg-user';
      userBubble.innerHTML = '<div class="chat-avatar">You</div><div class="chat-bubble"></div>';
      userBubble.querySelector('.chat-bubble').textContent = compiled;
      body.appendChild(userBubble);
      body.scrollTop = body.scrollHeight;

      setTimeout(() => {
        const reply = pickCanned((slots.task || '') + ' ' + (slots.context || ''), CHAT_CANNED);
        const claudeBubble = document.createElement('div');
        claudeBubble.className = 'chat-msg chat-msg-claude';
        claudeBubble.innerHTML = '<div class="chat-avatar">C</div><div class="chat-bubble"></div>';
        body.appendChild(claudeBubble);
        streamText(claudeBubble.querySelector('.chat-bubble'), reply);
        awardXpOnce(host, 'recipe-tried', 25, 'Practiced the 4-part recipe');
      }, 500);
    });
  }

  function streamText(el, text) {
    el.textContent = '';
    const words = text.split(/(\s+)/);
    let i = 0;
    function step() {
      if (i >= words.length) return;
      el.textContent += words[i];
      i++;
      const p = el.closest('.chat-body');
      if (p) p.scrollTop = p.scrollHeight;
      setTimeout(step, 25 + Math.random() * 40);
    }
    step();
  }

  // ------------------------------------------------------------------
  // C) Folder tree (Lesson 3)
  // ------------------------------------------------------------------

  const FOLDER_TREE = {
    label: 'Two worlds — click any folder to see what lives there',
    children: [
      {
        label: 'Local — on your computer',
        world: 'local',
        tip: 'Anything under here you can see in File Explorer or Finder. Claude Code and Claude Desktop live in this world.',
        children: [
          {
            label: '~/.claude/  (Claude Code\'s global home)',
            tip: 'Everything global to Claude Code. Skills that work everywhere, your settings.json, your global CLAUDE.md.',
            children: [
              { label: 'CLAUDE.md', tip: 'Global instructions Claude reads every session, everywhere.' },
              { label: 'settings.json', tip: 'Global settings — MCP server list, permissions, defaults.' },
              { label: 'skills/', tip: 'Global skills — available in every project. Each skill is a folder with a SKILL.md inside.', children: [
                { label: 'weekly-supplier-summary/', tip: 'A skill folder. Contains SKILL.md with instructions Claude follows on trigger.' },
                { label: 'dept-lead-memo/', tip: 'A skill folder. Same structure — one markdown file, activates on a trigger phrase.' }
              ] },
              { label: 'projects/  (auto-managed session history)', tip: 'Claude Code saves your past sessions here. Don\'t edit these by hand.' }
            ]
          },
          {
            label: '~/Documents/procurement/  (YOUR work folder)',
            tip: 'This is where your actual work files live. Any folder you keep work in is a "project" as far as Claude Code is concerned.',
            children: [
              { label: 'contracts/', tip: 'Your PDFs, spreadsheets, whatever. Claude Code can read them all when you\'re working inside this folder.' },
              { label: 'meeting-notes/', tip: 'Raw notes. Claude Code can turn these into briefs on demand.' },
              { label: '.claude/  (procurement-only Claude config)', tip: 'Project-scoped Claude config. Overrides the global ~/.claude/ when working in this folder.', children: [
                { label: 'CLAUDE.md', tip: 'Procurement-only instructions. Claude reads both this AND the global CLAUDE.md when you\'re in this folder.' },
                { label: 'skills/', tip: 'Project-scoped skills. Only activate when you\'re working in this folder.', children: [
                  { label: 'rfp-scorecard/', tip: 'A project-scoped skill. Uses your company\'s specific scoring rubric — doesn\'t activate outside this folder.' }
                ] }
              ] }
            ]
          },
          {
            label: 'Claude Desktop config',
            tip: 'Mac: ~/Library/Application Support/Claude/  ·  Windows: %AppData%\\Claude\\',
            children: [
              { label: 'claude_desktop_config.json', tip: 'Where MCP server connections are declared. Edit this once during MCP setup.' }
            ]
          }
        ]
      },
      {
        label: 'Cloud — on Anthropic\'s servers',
        world: 'cloud',
        tip: 'You can\'t see this in File Explorer. This lives on Anthropic\'s servers, tied to your account. Access via claude.ai in a browser.',
        children: [
          { label: 'Chats (all your conversations)', tip: 'Every chat you\'ve ever had with claude.ai. Browsable in the left sidebar.' },
          { label: 'Projects', tip: 'claude.ai\'s Projects feature — different from Claude Code project folders. Cloud-only.', children: [
            { label: '"Procurement work" project', tip: 'A cloud Project. Has Custom Instructions + Knowledge files that apply to every chat inside it.', children: [
              { label: 'Custom instructions', tip: 'A paragraph like "I\'m a procurement consultant at Sanofi..." — prepended to every chat in this project.' },
              { label: 'Knowledge files (PDFs, docs)', tip: 'Files you upload here. Stored in the cloud, not on your disk. Claude can reference them in every chat inside the project.' }
            ] }
          ] }
        ]
      }
    ]
  };

  function mountFolderTree(host) {
    host.innerHTML = `
      <div class="folder-tree-wrap">
        <div class="folder-tree-title">${escapeHtml(FOLDER_TREE.label)}</div>
        <div class="folder-tree"></div>
        <div class="folder-tree-tip" role="status" aria-live="polite">Click a folder to see what lives there.</div>
      </div>
    `;
    const treeEl = host.querySelector('.folder-tree');
    const tipEl = host.querySelector('.folder-tree-tip');

    function renderNode(node, depth) {
      const wrap = document.createElement('div');
      wrap.className = 'ft-node ft-depth-' + depth + (node.world ? ' ft-world-' + node.world : '');
      const hasKids = node.children && node.children.length > 0;

      const row = document.createElement('div');
      row.className = 'ft-row';
      row.tabIndex = 0;
      row.setAttribute('role', 'button');

      const twist = document.createElement('span');
      twist.className = 'ft-twist';
      twist.textContent = hasKids ? '▸' : '·';

      const icon = document.createElement('span');
      icon.className = 'ft-icon';
      icon.textContent = hasKids ? '📁' : '📄';

      const label = document.createElement('span');
      label.className = 'ft-label';
      label.textContent = node.label;

      row.appendChild(twist);
      row.appendChild(icon);
      row.appendChild(label);
      wrap.appendChild(row);

      let kidsEl = null;
      if (hasKids) {
        kidsEl = document.createElement('div');
        kidsEl.className = 'ft-kids';
        kidsEl.style.display = 'none';
        node.children.forEach((c) => kidsEl.appendChild(renderNode(c, depth + 1)));
        wrap.appendChild(kidsEl);
      }

      function activate() {
        if (kidsEl) {
          const open = kidsEl.style.display !== 'none';
          kidsEl.style.display = open ? 'none' : 'block';
          twist.textContent = open ? '▸' : '▾';
        }
        tipEl.textContent = node.tip || node.label;
        // XP for exploring
        awardXpOnce(host, 'ft-' + node.label, 2, null);
      }

      row.addEventListener('click', activate);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });

      return wrap;
    }

    FOLDER_TREE.children.forEach((c) => treeEl.appendChild(renderNode(c, 0)));
  }

  // ------------------------------------------------------------------
  // D) MCP click-demo
  // ------------------------------------------------------------------

  const MCP_TOOLS = [
    { id: 'gmail',    label: 'Gmail',           example: 'Ask: "Summarize this morning\'s unread emails and group them by supplier."', flow: 'Claude → Gmail MCP server → reads your inbox → returns messages → Claude summarizes → you see the digest.' },
    { id: 'calendar', label: 'Google Calendar', example: 'Ask: "Find a 45-min slot next week that works for me and 3 suppliers."',      flow: 'Claude → Calendar MCP server → checks 4 calendars → finds the slot → drafts the invite → asks you to confirm.' },
    { id: 'drive',    label: 'Google Drive',    example: 'Ask: "Pull the Q3 supplier tracker and summarize the top 3 risks."',           flow: 'Claude → Drive MCP server → opens the file → reads it → Claude synthesizes → you see the risk brief.' },
    { id: 'slack',    label: 'Slack',           example: 'Ask: "What did procurement channel decide about Supplier D this week?"',        flow: 'Claude → Slack MCP server → reads the channel history → filters to Supplier D → Claude summarizes decisions.' }
  ];

  function mountMcpDemo(host) {
    host.innerHTML = `
      <div class="mcp-demo">
        <div class="mcp-demo-title">MCP — click any tool to see the request/response flow</div>
        <div class="mcp-stage">
          <div class="mcp-claude">
            <div class="mcp-claude-inner">Claude</div>
          </div>
          <div class="mcp-tools">
            ${MCP_TOOLS.map((t) => `
              <button class="mcp-tool" data-tool="${t.id}">
                <div class="mcp-tool-label">${escapeHtml(t.label)}</div>
              </button>
            `).join('')}
          </div>
          <svg class="mcp-lines" width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 400 300" aria-hidden="true">
            <!-- Lines are drawn dynamically -->
          </svg>
        </div>
        <div class="mcp-explain" role="status" aria-live="polite">
          <div class="mcp-explain-example">Pick a tool above to see how it works.</div>
        </div>
      </div>
    `;

    const buttons = host.querySelectorAll('.mcp-tool');
    const explain = host.querySelector('.mcp-explain');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('active', 'flow'));
        btn.classList.add('active');
        const tool = MCP_TOOLS.find((t) => t.id === btn.dataset.tool);
        if (!tool) return;

        explain.innerHTML =
          '<div class="mcp-explain-example"><strong>' + escapeHtml(tool.label) + ':</strong> ' + escapeHtml(tool.example) + '</div>' +
          '<div class="mcp-explain-flow">' + escapeHtml(tool.flow) + '</div>';

        // Animate a "packet" from Claude to the tool and back
        animatePacket(host, btn);
        awardXpOnce(host, 'mcp-' + tool.id, 5, null);
      });
    });
  }

  function animatePacket(host, toolBtn) {
    const claude = host.querySelector('.mcp-claude');
    const stage = host.querySelector('.mcp-stage');
    if (!claude || !stage || !toolBtn) return;
    const stageRect = stage.getBoundingClientRect();
    const cRect = claude.getBoundingClientRect();
    const tRect = toolBtn.getBoundingClientRect();

    // Outbound
    const out = document.createElement('div');
    out.className = 'mcp-packet mcp-packet-out';
    out.style.left = (cRect.left - stageRect.left + cRect.width/2 - 6) + 'px';
    out.style.top = (cRect.top - stageRect.top + cRect.height/2 - 6) + 'px';
    out.style.setProperty('--tx', (tRect.left - cRect.left + (tRect.width - cRect.width)/2) + 'px');
    out.style.setProperty('--ty', (tRect.top - cRect.top + (tRect.height - cRect.height)/2) + 'px');
    stage.appendChild(out);
    setTimeout(() => out.remove(), 900);

    // Inbound (reply)
    setTimeout(() => {
      const inn = document.createElement('div');
      inn.className = 'mcp-packet mcp-packet-in';
      inn.style.left = (tRect.left - stageRect.left + tRect.width/2 - 6) + 'px';
      inn.style.top = (tRect.top - stageRect.top + tRect.height/2 - 6) + 'px';
      inn.style.setProperty('--tx', (cRect.left - tRect.left + (cRect.width - tRect.width)/2) + 'px');
      inn.style.setProperty('--ty', (cRect.top - tRect.top + (cRect.height - tRect.height)/2) + 'px');
      stage.appendChild(inn);
      setTimeout(() => inn.remove(), 900);
    }, 700);
  }

  // ------------------------------------------------------------------
  // E) Standalone mocks (CSS "screenshots")
  // ------------------------------------------------------------------

  function mountMock(host) {
    const kind = host.dataset.mock || 'claude-ai';
    if (kind === 'claude-code') {
      host.innerHTML = mockClaudeCode();
    } else if (kind === 'claude-ai') {
      host.innerHTML = mockClaudeAi();
    } else if (kind === 'claude-desktop') {
      host.innerHTML = mockClaudeDesktop();
    } else if (kind === 'claude-projects') {
      host.innerHTML = mockClaudeProjects();
    }
  }

  function mockClaudeCode() {
    return `
      <div class="mock mock-claude-code static">
        <div class="mock-label">Example view — Claude Code (terminal). This is what it looks like when you run <code>claude</code> in a folder.</div>
        <div class="mock-chrome">
          <span class="mock-dot red"></span><span class="mock-dot yellow"></span><span class="mock-dot green"></span>
          <span class="mock-title">claude — ~/Documents/procurement</span>
        </div>
        <div class="mock-body cc-body">
          <div class="cc-line cc-line-sys"><span class="cc-text">Claude Code v1.0  ·  ~/Documents/procurement</span></div>
          <div class="cc-line cc-line-user"><span class="cc-label">❯ </span><span class="cc-text">read comparison.md and flag any suppliers that auto-renew</span></div>
          <div class="cc-line cc-line-claude"><span class="cc-label">Claude: </span><span class="cc-text">Two auto-renew flags: Supplier C (60-day silent renew) and Supplier F (annual). Want the notice reminders on your calendar?</span></div>
          <div class="cc-line cc-line-user"><span class="cc-label">❯ </span><span class="cc-text">_</span></div>
        </div>
      </div>
    `;
  }

  function mockClaudeAi() {
    return `
      <div class="mock mock-claude-ai static">
        <div class="mock-label">Example view — claude.ai (web chat). Free signup, no install.</div>
        <div class="mock-chrome-lite">
          <span class="mock-brand">Claude</span>
          <span class="mock-model">Sonnet 4.5</span>
        </div>
        <div class="mock-body chat-body">
          <div class="chat-msg chat-msg-user"><div class="chat-avatar">You</div><div class="chat-bubble">Draft a two-paragraph memo pausing the Supplier A renewal, firm-but-collegial tone.</div></div>
          <div class="chat-msg chat-msg-claude"><div class="chat-avatar">C</div><div class="chat-bubble">Here\'s a draft — firm on the decision, collegial on the relationship. I flagged one line you may want to soften. Let me know what to iterate on.</div></div>
        </div>
      </div>
    `;
  }

  function mockClaudeDesktop() {
    return `
      <div class="mock mock-claude-desktop static">
        <div class="mock-label">Example view — Claude Desktop (Mac/Windows app). Same chat interface as claude.ai, plus MCP.</div>
        <div class="desktop-shell">
          <div class="desktop-sidebar">
            <div class="desktop-side-title">Chats</div>
            <div class="desktop-side-item active">Supplier D risk brief</div>
            <div class="desktop-side-item">RFP Q3 comparison</div>
            <div class="desktop-side-item">Weekly summary</div>
            <div class="desktop-side-title">Connected apps</div>
            <div class="desktop-side-chip">✓ Gmail</div>
            <div class="desktop-side-chip">✓ Calendar</div>
            <div class="desktop-side-chip">✓ Drive</div>
          </div>
          <div class="desktop-main">
            <div class="chat-msg chat-msg-user"><div class="chat-avatar">You</div><div class="chat-bubble">Pull this morning\'s unread emails and group them by supplier.</div></div>
            <div class="chat-msg chat-msg-claude"><div class="chat-avatar">C</div><div class="chat-bubble">Via Gmail MCP — 14 unread. Supplier A: 3 (delivery slip). Supplier D: 5 (contract Q). FYI: 6. Drafts ready.</div></div>
          </div>
        </div>
      </div>
    `;
  }

  function mockClaudeProjects() {
    return `
      <div class="mock mock-claude-projects static">
        <div class="mock-label">Example view — claude.ai Projects. Reusable context for a topic (cloud-only).</div>
        <div class="proj-shell">
          <div class="proj-header">📁 Procurement work</div>
          <div class="proj-panel">
            <div class="proj-panel-title">Custom instructions</div>
            <div class="proj-panel-body">"I\'m a procurement consultant at Sanofi advising R&D, manufacturing, and commercial. Prefer direct, structured answers."</div>
          </div>
          <div class="proj-panel">
            <div class="proj-panel-title">Knowledge files</div>
            <div class="proj-panel-body">
              <div class="proj-file">📄 supplier-scorecard-template.pdf</div>
              <div class="proj-file">📄 sanofi-procurement-glossary.md</div>
              <div class="proj-file">📄 Q3-priorities.docx</div>
            </div>
          </div>
          <div class="proj-panel">
            <div class="proj-panel-title">Chats in this project (3)</div>
            <div class="proj-panel-body">
              <div class="proj-chat">· Weekly brief · yesterday</div>
              <div class="proj-chat">· Supplier D escalation · 2 days ago</div>
              <div class="proj-chat">· RFP Q3 comparison · last week</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function mountTour(host) {
    const stops = [
      { key: 'claude-ai',      label: 'claude.ai',      html: mockClaudeAi(),      blurb: '<strong>claude.ai</strong> — the web chat. Free signup, no install. Best for drafting, thinking, summarizing anything you paste in.' },
      { key: 'claude-code',    label: 'Claude Code',    html: mockClaudeCode(),    blurb: '<strong>Claude Code</strong> — runs in a terminal. Has hands on the files in whatever folder you launch it from. Best for "read/process these files."' },
      { key: 'claude-desktop', label: 'Claude Desktop', html: mockClaudeDesktop(), blurb: '<strong>Claude Desktop</strong> — the Mac/Windows app. Same chat as claude.ai plus MCP connections (Gmail, Calendar, etc.). Best for "touch my apps."' },
      { key: 'claude-projects',label: 'Projects',       html: mockClaudeProjects(),blurb: '<strong>Projects</strong> — cloud-only, inside claude.ai. Reusable context + files that apply to every chat in the project. Best for "I keep re-pasting the same setup paragraph."' }
    ];

    host.innerHTML = `
      <div class="tool-tour">
        <div class="tour-nav">
          ${stops.map((s, i) => `<button class="tour-btn ${i===0?'active':''}" data-i="${i}">${escapeHtml(s.label)}</button>`).join('')}
        </div>
        <div class="tour-stage"></div>
        <div class="tour-blurb"></div>
        <div class="tour-controls">
          <button class="pg-btn pg-btn-ghost tour-prev">← Prev</button>
          <button class="pg-btn pg-btn-primary tour-next">Next →</button>
        </div>
      </div>
    `;

    const stage = host.querySelector('.tour-stage');
    const blurb = host.querySelector('.tour-blurb');
    const buttons = host.querySelectorAll('.tour-btn');
    let i = 0;

    function show(idx) {
      i = ((idx % stops.length) + stops.length) % stops.length;
      stage.innerHTML = stops[i].html;
      blurb.innerHTML = stops[i].blurb;
      buttons.forEach((b, bi) => b.classList.toggle('active', bi === i));
      awardXpOnce(host, 'tour-' + stops[i].key, 5, null);
    }

    buttons.forEach((b) => b.addEventListener('click', () => show(parseInt(b.dataset.i, 10))));
    host.querySelector('.tour-prev').addEventListener('click', () => show(i - 1));
    host.querySelector('.tour-next').addEventListener('click', () => show(i + 1));
    show(0);
  }

  // ------------------------------------------------------------------
  // Shared helpers
  // ------------------------------------------------------------------

  function pickCanned(query, corpus) {
    const q = (query || '').toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const entry of corpus) {
      let score = 0;
      for (const kw of entry.keys) {
        if (q.indexOf(kw) !== -1) score += kw.length;
      }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    if (best && bestScore > 0) return best.text;
    return 'Good question — that\'s the kind of thing you\'d ask in real Claude at claude.ai. Paste it there and hit send. (This playground only knows a handful of canned procurement scenarios.)';
  }

  function awardXpOnce(host, key, amount, reason) {
    host.dataset.xpMap = host.dataset.xpMap || '';
    const seen = new Set(host.dataset.xpMap.split('|').filter(Boolean));
    if (seen.has(key)) return;
    seen.add(key);
    host.dataset.xpMap = Array.from(seen).join('|');
    if (window.DadsClaudeGame && amount > 0) {
      window.DadsClaudeGame.awardXp(amount, reason);
    }
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // ------------------------------------------------------------------
  // Mount dispatcher
  // ------------------------------------------------------------------

  function mountAll() {
    document.querySelectorAll('[data-playground]').forEach((host) => {
      if (host.dataset.mounted === 'true') return;
      host.dataset.mounted = 'true';
      const kind = host.dataset.playground;
      try {
        if (kind === 'claude-code-terminal') mountClaudeCodeTerminal(host);
        else if (kind === 'claude-ai-chat')  mountClaudeAiChat(host);
        else if (kind === 'folder-tree')     mountFolderTree(host);
        else if (kind === 'mcp-demo')        mountMcpDemo(host);
        else if (kind === 'mock')            mountMock(host);
        else if (kind === 'tool-tour')       mountTour(host);
      } catch (e) {
        console.error('Playground mount error', kind, e);
        host.innerHTML = '<div class="pg-error">Playground failed to load — the underlying lesson content is still readable above/below.</div>';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAll);
  } else {
    mountAll();
  }
  document.addEventListener('DOMContentSwitch', mountAll);
  if (typeof document$ !== 'undefined' && document$.subscribe) {
    document$.subscribe(mountAll);
  }
})();
