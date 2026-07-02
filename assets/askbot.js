// "Ask me anything about Claude" — floating chat bot.
//
// Vanilla JS. FAQ corpus is inline. Persists chat history to localStorage.
// Optional stretch: if Dad pastes an Anthropic API key, unmatched questions
// route through api.anthropic.com/v1/messages. Key is stored in localStorage
// only, never sent anywhere else.

(function () {
  'use strict';

  const HISTORY_KEY = 'dadsClaudeCurriculum.askbot.history';
  const KEY_KEY = 'dadsClaudeCurriculum.askbot.apikey';

  // ------------------------------------------------------------------
  // FAQ corpus
  // ------------------------------------------------------------------

  const FAQ = [
    // What is Claude / how it works
    { k: ['what','is','llm','large','language','model'], q: 'What is an LLM?', a: 'A large language model — a program trained to predict the next word in a sequence. It doesn\'t "look things up." It generates text one token at a time based on patterns it learned during training. That\'s why it\'s great at drafting and synthesis, and weaker at recalling specific facts.' },
    { k: ['how','does','claude','think','work','reason'], q: 'How does Claude "think"?', a: 'Claude is generating text one token at a time. What looks like reasoning is really the model predicting the next likely word given everything before it. Give it more structure in the prompt and the "reasoning" gets sharper — that\'s the whole trick behind good prompting.' },
    { k: ['hallucinate','hallucination','make','up','wrong','confident','lie'], q: 'What is a hallucination?', a: 'When Claude confidently makes something up — a fake citation, a wrong date, an invented URL. It happens because Claude generates plausible-sounding text, not verified facts. Countermeasure: verify anything numeric, factual, or citation-shaped before you use it.' },
    { k: ['context','window','tokens','limit','how','much','remember'], q: 'What is a context window?', a: 'The chunk of text Claude "sees" at once — your messages, its replies, any files. Modern Claude has a huge window (200k+ tokens ≈ a small book), but it\'s finite. When you hit the limit, Claude forgets the start of the conversation. Fix: start a fresh chat, or use a Project to carry context forward.' },
    { k: ['rate','limit','message','how','many','usage'], q: 'What are rate limits?', a: 'Caps on how many messages / tokens you can send per hour or day. Free plans are more limited; paid plans (Pro, Team) get higher caps. If you hit one, Claude tells you and you wait, or upgrade. Not a bug — a throttle.' },
    { k: ['model','sonnet','opus','haiku','claude','version','difference'], q: 'What\'s the difference between Sonnet, Opus, and Haiku?', a: 'They\'re three tiers of the same Claude family:\n · **Haiku** — fastest, cheapest, lighter reasoning. Good for simple sorting/formatting.\n · **Sonnet** — the balanced default. Handles almost everything a procurement consultant needs.\n · **Opus** — most powerful, slower, pricier. Reach for it on genuinely hard analytical work.\nFor day-to-day procurement, Sonnet is the right default.' },
    { k: ['newest','latest','current','best','which'], q: 'Which Claude should I use?', a: 'For everyday work: Claude Sonnet 4.5. It\'s the balanced default — fast enough, sharp enough. Reach for Opus only when you\'re doing genuinely hard analytical reasoning.' },

    // Surfaces
    { k: ['claude','ai','web','browser','online'], q: 'What is claude.ai?', a: 'The web version. Sign in at claude.ai, chat in the browser. Free tier is enough to start. Best for drafting, summarizing pasted text, one-off questions. Can\'t read files on your computer or touch your other apps.' },
    { k: ['claude','code','terminal','cli','command'], q: 'What is Claude Code?', a: 'Claude in a terminal, with hands on your files. You launch it inside a folder (~/Documents/procurement/ for example), and it can read, write, and edit files there directly. Best for "process these 12 PDFs" tasks. Requires an install.' },
    { k: ['claude','desktop','app','mac','windows'], q: 'What is Claude Desktop?', a: 'The desktop app for Mac and Windows. Same chat as claude.ai, but supports MCP — meaning Claude can connect to Gmail, Calendar, Slack, and other apps. Best when you want Claude to touch your apps directly.' },
    { k: ['project','projects','custom','instructions','persistent'], q: 'What is a claude.ai Project?', a: 'A folder inside claude.ai that carries context across chats. You set Custom Instructions once ("I\'m a procurement consultant at Sanofi...") plus upload reference files, and every chat inside the project inherits both. Best when you keep re-pasting the same setup paragraph.' },
    { k: ['skill','skills','markdown','trigger','reusable'], q: 'What is a skill?', a: 'A markdown file that tells Claude "when X happens, do Y." Lives in ~/.claude/skills/<name>/SKILL.md (global) or <project>/.claude/skills/<name>/SKILL.md (project-only). Claude reads it automatically when the trigger matches. Best for tasks you repeat.' },
    { k: ['mcp','model','context','protocol','connect','app','integration','tool'], q: 'What is MCP?', a: 'Model Context Protocol — the standard for connecting Claude to external apps. Install an MCP server for Gmail, Calendar, GitHub, your internal system, and Claude Desktop can call it. Without MCP, Claude can\'t reach your apps.' },

    // Picking the right surface
    { k: ['which','tool','pick','choose','right','surface'], q: 'How do I pick the right tool?', a: 'Ask three questions in order:\n 1. Do I need Claude to read files on my computer? → Claude Code.\n 2. Do I need Claude to touch my apps (Gmail, Calendar)? → Claude Desktop + MCP.\n 3. Otherwise → claude.ai (web).\n Then two bonus questions:\n 4. Do I repeat this task with the same shape? → wrap it in a skill.\n 5. Do I keep re-pasting the same setup? → put it in a Project.' },
    { k: ['when','use','claude','ai','web'], q: 'When should I use claude.ai?', a: 'The default. Any thinking, drafting, summarizing, or Q&A that doesn\'t need file access or app access. Most procurement work lives here — memos, briefs, tough emails, contract-clause questions when you can paste the clause in.' },
    { k: ['when','use','claude','code'], q: 'When should I use Claude Code?', a: 'When the task is "read/process these files." Reading 12 PDFs, comparing spreadsheets, refactoring your notes across a folder. It has hands on the disk, claude.ai doesn\'t.' },
    { k: ['when','use','desktop','mcp'], q: 'When should I use Claude Desktop + MCP?', a: 'When the task touches an external app. Reading your Gmail, scheduling on your Calendar, pulling a file from Google Drive, posting to Slack. Without MCP, Claude can\'t reach these.' },

    // Prompting / recipe
    { k: ['prompt','write','good','four','part','recipe','structure'], q: 'What\'s the 4-part recipe?', a: 'Every effective prompt has:\n 1. **Role** — one sentence: who you are.\n 2. **Task** — what you want done, and in what format.\n 3. **Context** — everything Claude can\'t know unless you tell it (background, constraints, prior decisions).\n 4. **Constraints** — what NOT to do (tone, length, forbidden words).\nBuild your prompt with all four and the first draft is usually 80% there.' },
    { k: ['context','give','claude','background','information'], q: 'How do I give Claude context?', a: 'Three ways:\n 1. **Paste it into the chat** — one-off, works anywhere.\n 2. **Put it in a Project (claude.ai)** — persistent across chats in that project.\n 3. **Put it in a CLAUDE.md (Claude Code)** — auto-loaded every session in that folder.\nAlways pick the least effort that gets the job done.' },
    { k: ['iterate','feedback','improve','refine','back','forth'], q: 'How do I iterate on a response?', a: 'Reply with specific corrections, not vague ones. "Second paragraph is too apologetic — rewrite without \'unfortunately.\'" beats "make it sharper." The back-and-forth IS the skill. Rarely accept the first draft.' },
    { k: ['what','claude','good','at','bad','at','capabilities','limitations'], q: 'What is Claude good at vs bad at?', a: 'Good at: synthesis, structure, drafting, summarizing, reformatting, explaining, asking clarifying questions.\nBad at (needs verification): specific numbers, dates, citations, URLs, recent events, anything requiring perfect recall. Bad at: reading your mind. Give it context.' },

    // Local vs cloud
    { k: ['local','cloud','difference','disk','server','where','files'], q: 'Local vs cloud — what\'s the difference?', a: 'Local Claude (Claude Code, Claude Desktop, skills) works with files on your computer. Cloud Claude (claude.ai, Projects, chat history) lives on Anthropic\'s servers. Files you upload to a claude.ai Project are NOT on your disk — they\'re in the cloud. Files in ~/Documents/procurement/ are NOT in the cloud — they\'re on your computer.' },
    { k: ['where','store','files','pdf','document','upload'], q: 'Where do my files live?', a: 'Depends where you put them:\n · Uploaded to claude.ai / Projects → cloud (Anthropic servers)\n · In ~/.claude/ or ~/Documents/ → your disk\n · Chat history from claude.ai → cloud\n · Chat history from Claude Code → your disk (~/.claude/projects/)' },
    { k: ['sync','across','devices','computers','laptop','desktop'], q: 'Does Claude sync across my devices?', a: 'claude.ai (cloud) — yes. Sign in from any browser, your chats and Projects are there.\nClaude Code / skills / CLAUDE.md — no. They live on the machine you installed them on. Copy them yourself if you switch computers.' },

    // Skills detail
    { k: ['build','create','make','skill','how'], q: 'How do I build a skill?', a: 'Use the skill builder in Lesson 7 — fill out the four fields (name, description, when it activates, what it does) and download the SKILL.md. Then drop it in ~/.claude/skills/<your-skill-name>/. Restart Claude Code and it\'ll be available.' },
    { k: ['skill','install','where','put','folder'], q: 'Where do I install a skill?', a: 'Global (available everywhere): ~/.claude/skills/<name>/SKILL.md\nProject-only (only in one folder): <project-folder>/.claude/skills/<name>/SKILL.md\nGlobal is fine to start. Move to project-only when the skill uses company-specific info you don\'t want firing elsewhere.' },
    { k: ['skill','trigger','when','activate','fire'], q: 'How does Claude decide to activate a skill?', a: 'It reads the skill\'s description and matches against what you just said. If the description is specific ("Drafts a memo to an internal department lead when the user says \'memo to [dept] lead\'"), it activates cleanly. If it\'s vague, Claude might miss it. Sharpen the description if a skill isn\'t firing.' },
    { k: ['skill','not','activating','wont','work','broken'], q: 'My skill isn\'t activating — what\'s wrong?', a: 'Usually the description is too vague. Rewrite the description to name specific trigger phrases: "when the user says X" or "when notes mention Y." Also make sure the file lives at .claude/skills/<name>/SKILL.md exactly — not just SKILL.md loose in the folder.' },

    // Confidentiality / Sanofi warnings
    { k: ['sanofi','confidential','internal','data','share','privacy','secret'], q: 'Can I paste Sanofi internal data into Claude?', a: 'Pause on that one. Anthropic\'s Enterprise and Team plans have data-handling guarantees the consumer plans don\'t. For Sanofi-internal stuff (unreleased pricing, personnel matters, IP-adjacent info), check with Sanofi IT first. If you have to be safe: swap real names for placeholders ("Supplier A") and real numbers for round examples. Claude works fine on the pattern; it doesn\'t need the specifics to help.' },
    { k: ['safe','ok','share','confidential','company'], q: 'Is it safe to share confidential info with Claude?', a: 'Depends on which plan you\'re on and your company\'s policy. Consumer claude.ai plans (Free/Pro): your chats may be used to improve models unless you opt out. Team/Enterprise plans: contractual protections. When in doubt, sanitize (placeholders for names, rounded numbers) before pasting. Your Sanofi-internal work needs the IT/legal answer before you paste real data.' },
    { k: ['data','training','used','model','improve'], q: 'Is my data used to train Claude?', a: 'Consumer plans (Free, Pro): may be — check the settings for an opt-out toggle.\nTeam / Enterprise plans: no, per contract.\nWhen in doubt, sanitize before pasting. Placeholders and round numbers are safer.' },

    // Install
    { k: ['install','claude','code','how','setup','windows'], q: 'How do I install Claude Code on Windows?', a: 'Open PowerShell and run:\n  irm https://claude.ai/install.ps1 | iex\n(That\'s the current install command as of 2026 — check docs.anthropic.com/claude-code for the latest.) After install, open a folder in Terminal and type `claude` to start.' },
    { k: ['install','claude','code','how','setup','mac','linux'], q: 'How do I install Claude Code on Mac?', a: 'Open Terminal and run:\n  curl -fsSL https://claude.ai/install.sh | sh\n(Check docs.anthropic.com/claude-code for the current command.) After install, cd into a folder and type `claude`.' },
    { k: ['sign','up','signup','account','register','claude','ai'], q: 'How do I sign up for claude.ai?', a: 'Go to claude.ai, click "Sign up," use Google/Apple/email. Free tier is enough for the first few lessons. No credit card required.' },
    { k: ['install','mcp','server','setup','how'], q: 'How do I install an MCP server?', a: 'Open Claude Desktop\'s config file:\n · Mac: ~/Library/Application Support/Claude/claude_desktop_config.json\n · Windows: %AppData%\\Claude\\claude_desktop_config.json\nAdd the server\'s configuration to the mcpServers section (each server publishes its own snippet). Restart Claude Desktop. The server\'s tools become available in chat.' },
    { k: ['obsidian','need','install'], q: 'Do I need Obsidian?', a: 'No. This course is 100% browser + Claude — no Obsidian required. Obsidian is Leyti\'s note-taking app; it\'s not needed for anything you\'re learning here.' },

    // Chat management
    { k: ['start','new','chat','old','continue','when'], q: 'When should I start a new chat vs continue an old one?', a: 'Start new when:\n · Topic changes\n · You\'re about to hit the context window (long conversation)\n · The old chat got stuck / off-track\n · You\'d rather not carry old context.\nContinue when: you\'re iterating on the same task, and the prior back-and-forth is still useful.' },
    { k: ['save','export','download','chat','conversation'], q: 'Can I save/export a chat?', a: 'claude.ai — yes, in the chat menu (three dots). Exports as Markdown or JSON.\nClaude Code — sessions auto-save under ~/.claude/projects/. Don\'t hand-edit those; use the built-in commands to browse history.' },
    { k: ['history','past','chats','find'], q: 'How do I find a past chat?', a: 'claude.ai — sidebar has your chat history, searchable by title.\nClaude Code — past sessions live under ~/.claude/projects/ as JSONL files. Search or resume through the CLI.' },

    // Files / PDFs
    { k: ['pdf','document','file','upload','attach'], q: 'Can Claude read PDFs?', a: 'Yes. In claude.ai and Claude Desktop, click the paperclip / attach button and drop a PDF in. In Claude Code, just tell it to read the file — "read ./contract.pdf and pull out the termination clause."' },
    { k: ['image','picture','photo','screenshot'], q: 'Can Claude read images?', a: 'Yes. Drop an image into a claude.ai chat and Claude can describe it, extract text (OCR), or answer questions about it. Same in Claude Desktop. Claude Code can also read image files if you point it at one.' },
    { k: ['spreadsheet','excel','csv','xlsx'], q: 'Can Claude read spreadsheets?', a: 'Yes. Upload an Excel/CSV to claude.ai and ask questions. For big files, Claude Code is often smoother — it can process the file with proper tools instead of just eyeballing the cells.' },
    { k: ['email','draft','write','tough'], q: 'How do I get Claude to draft a good email?', a: 'Use the 4-part recipe. Role (who you are), Task ("draft a 3-sentence email to X"), Context (the situation), Constraints (tone / what NOT to say). The first draft will be 80% there. Iterate specifically to close the last 20%.' },

    // Claude vs Google etc
    { k: ['claude','vs','google','chatgpt','when','which'], q: 'When should I use Claude vs Google?', a: 'Google: looking up something specific and factual — a price, a person\'s title, a definition, a recent event. Fast, reliable, checkable.\nClaude: thinking, drafting, synthesizing, comparing, organizing what you already know. Not a search engine.\nRule of thumb: if the answer is "look it up," use Google. If the answer is "figure it out," use Claude.' },
    { k: ['claude','vs','chatgpt','openai','difference'], q: 'Claude vs ChatGPT — what\'s the difference?', a: 'Both are LLM chatbots. Claude (Anthropic) tends to be more careful about nuance and less likely to bluff on things it\'s unsure about. ChatGPT (OpenAI) has a bigger plugin ecosystem. For serious work-drafting and analysis, most people find Claude\'s style easier to work with. Try both if you want — you\'ll form your own preference.' },

    // Cost / plans
    { k: ['cost','price','plan','free','pro','how','much'], q: 'How much does Claude cost?', a: 'Free tier — limited messages per day, no attachments beyond a small quota. Enough to try.\nPro (~$20/mo) — much higher limits, longer context, priority access.\nTeam / Enterprise — for organizations, with data-handling contracts.\nClaude Code — separate billing (pay-as-you-go tokens, or included in Max plan).\nStart free, upgrade when you hit limits.' },
    { k: ['free','worth','pro','upgrade','pay'], q: 'Should I pay for Pro?', a: 'If you\'re doing serious work with Claude 3+ hours a week, yes. Free tier limits force context resets that break flow. Pro is the difference between "I\'ll try Claude when I remember" and "Claude is part of my workflow."' },

    // Getting unstuck
    { k: ['unstuck','stuck','not','working','error','help'], q: 'Claude isn\'t giving me what I want — what do I do?', a: 'Almost always: your prompt needs more context or sharper constraints. Try:\n 1. Add a Role sentence.\n 2. Add 2-3 concrete context bullets.\n 3. Add constraints — length, tone, what NOT to include.\n 4. Show an example of good output if you have one.\nIf still stuck, start a new chat — the current one may have gotten pulled off-track early.' },
    { k: ['refuses','refuse','wont','decline'], q: 'Claude refused to answer — why?', a: 'Usually Claude will decline if it thinks the request could cause real harm, or if it\'s asked to impersonate a specific real person doing sensitive things. For normal procurement work this basically never comes up. If it does, rephrase — "help me draft a firm but professional escalation email" beats "write an angry email."' },
    { k: ['too','long','wordy','verbose','shorter'], q: 'Claude\'s answer is too long — how do I get it shorter?', a: 'Add a constraint: "Under 150 words." Or: "Give me only the three-bullet summary — no intro, no closing." Claude respects specific length targets. If it still overshoots, reply: "Cut this in half."' },

    // Sanofi-flavored specifics
    { k: ['procurement','rfp','supplier','contract','vendor'], q: 'What can Claude actually do for procurement work?', a: 'A lot:\n · Draft memos, tough emails, and briefs (claude.ai)\n · Compare N contract PDFs in one pass (Claude Code)\n · Read your Gmail and group supplier messages (Desktop + MCP)\n · Schedule cross-functional meetings (Desktop + Calendar MCP)\n · Summarize a week of supplier calls into a one-pager (claude.ai + skill)\n · Score RFP responses against your rubric (skill with your rubric baked in)' },
    { k: ['rfp','score','evaluate','compare','bids'], q: 'Can Claude help me score RFPs?', a: 'Yes — best done as a skill. Bake your scoring rubric into a SKILL.md, then when you paste in a bid or point Claude Code at a folder of bids, the skill activates and applies the rubric consistently. First time you\'d set this up: use the skill builder in Lesson 7.' },
    { k: ['weekly','summary','brief','recurring','monday'], q: 'Weekly summary I do every Monday — best approach?', a: 'This is textbook skill territory. Define the format once (\'one-page brief: status by supplier, decisions, open risks, next actions, under 400 words\'), save as a skill, and every Monday paste your notes and trigger it. First Monday takes 10 min. Fifth Monday takes 2.' },

    // Meta
    { k: ['this','course','who','made','why'], q: 'Who made this course?', a: 'Leyti — Amet\'s son. Built as a self-serve way to teach the Claude landscape without needing to sit next to you. Every scenario is procurement-flavored on purpose.' },
    { k: ['course','next','after','done','finished'], q: 'What comes after this course?', a: 'You use what you learned. When you find yourself repeating a prompt, wrap it in a skill. When claude.ai isn\'t enough, reach for Claude Code or Desktop+MCP. The point isn\'t to use every tool — it\'s to know which one fits when.' }
  ];

  // ------------------------------------------------------------------
  // Widget
  // ------------------------------------------------------------------

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveHistory(h) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-100))); } catch (e) {}
  }

  let widgetMounted = false;

  function mountWidget() {
    if (widgetMounted) return;
    widgetMounted = true;

    const wrap = document.createElement('div');
    wrap.className = 'askbot-wrap';
    wrap.innerHTML = `
      <button class="askbot-launch" aria-label="Open the Ask Anything bot">
        <span class="askbot-launch-icon">💬</span>
        <span class="askbot-launch-text">Ask me anything about Claude</span>
      </button>
      <div class="askbot-panel" hidden>
        <div class="askbot-header">
          <div class="askbot-header-title">Ask about Claude</div>
          <div class="askbot-header-actions">
            <button class="askbot-gear" title="Settings" aria-label="Settings">⚙</button>
            <button class="askbot-close" title="Close" aria-label="Close">✕</button>
          </div>
        </div>
        <div class="askbot-body" role="log" aria-live="polite"></div>
        <div class="askbot-settings" hidden>
          <div class="askbot-settings-note">
            Optional — paste your Anthropic API key to route unknown questions through the real Claude.
            <strong>The key stays in your browser (localStorage). It\'s not sent anywhere except api.anthropic.com when you ask a question.</strong>
          </div>
          <input type="password" class="askbot-key" placeholder="sk-ant-..." />
          <div class="askbot-settings-row">
            <button class="pg-btn pg-btn-primary askbot-key-save">Save key</button>
            <button class="pg-btn pg-btn-ghost askbot-key-clear">Clear</button>
          </div>
          <div class="askbot-settings-status"></div>
        </div>
        <div class="askbot-input-wrap">
          <input type="text" class="askbot-input" placeholder="What is MCP? / How do I install Claude Code?" />
          <button class="askbot-send" aria-label="Send">Send</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    const launch = wrap.querySelector('.askbot-launch');
    const panel = wrap.querySelector('.askbot-panel');
    const closeBtn = wrap.querySelector('.askbot-close');
    const gear = wrap.querySelector('.askbot-gear');
    const settings = wrap.querySelector('.askbot-settings');
    const body = wrap.querySelector('.askbot-body');
    const input = wrap.querySelector('.askbot-input');
    const sendBtn = wrap.querySelector('.askbot-send');
    const keyInput = wrap.querySelector('.askbot-key');
    const keySave = wrap.querySelector('.askbot-key-save');
    const keyClear = wrap.querySelector('.askbot-key-clear');
    const keyStatus = wrap.querySelector('.askbot-settings-status');

    function open() {
      panel.hidden = false;
      launch.classList.add('open');
      renderHistory();
      setTimeout(() => input.focus(), 100);
    }
    function close() {
      panel.hidden = true;
      launch.classList.remove('open');
      settings.hidden = true;
    }
    launch.addEventListener('click', () => (panel.hidden ? open() : close()));
    closeBtn.addEventListener('click', close);
    gear.addEventListener('click', () => {
      settings.hidden = !settings.hidden;
      if (!settings.hidden) {
        const k = localStorage.getItem(KEY_KEY);
        if (k) keyInput.value = '••••••••••••';
      }
    });

    keySave.addEventListener('click', () => {
      const v = (keyInput.value || '').trim();
      if (v && v.indexOf('•') === -1) {
        localStorage.setItem(KEY_KEY, v);
        keyStatus.textContent = 'Saved. Unknown questions will now try the Anthropic API.';
        keyInput.value = '••••••••••••';
      } else {
        keyStatus.textContent = 'Paste a real key (starts with sk-ant-).';
      }
    });
    keyClear.addEventListener('click', () => {
      localStorage.removeItem(KEY_KEY);
      keyInput.value = '';
      keyStatus.textContent = 'Cleared.';
    });

    function renderHistory() {
      body.innerHTML = '';
      const hist = loadHistory();
      if (hist.length === 0) {
        pushMsg('bot', 'Hey — I\'m the course helper. Ask me anything about Claude, MCP, skills, or how to pick the right tool. I know the whole course by heart.\n\nOr just start with: "What is a skill?" · "How do I install Claude Code?" · "When should I use Claude Code vs claude.ai?"', true);
        return;
      }
      hist.forEach((m) => pushMsg(m.role, m.text, true));
    }

    function pushMsg(role, text, silent) {
      const msg = document.createElement('div');
      msg.className = 'askbot-msg askbot-msg-' + role;
      const content = document.createElement('div');
      content.className = 'askbot-bubble';
      content.textContent = text;
      msg.appendChild(content);
      body.appendChild(msg);
      body.scrollTop = body.scrollHeight;
      if (!silent) {
        const hist = loadHistory();
        hist.push({ role, text, ts: Date.now() });
        saveHistory(hist);
      }
    }

    async function handleAsk() {
      const q = (input.value || '').trim();
      if (!q) return;
      input.value = '';
      pushMsg('user', q);

      // Context-aware: bias to the current lesson
      const lessonSlug = currentLessonSlug();
      const best = findBest(q, lessonSlug);

      if (best.match) {
        pushMsg('bot', best.answer);
        return;
      }

      // No match — check API key
      const apiKey = localStorage.getItem(KEY_KEY);
      if (apiKey) {
        pushMsg('bot', 'Thinking (via Anthropic API)...');
        const last = body.lastChild;
        try {
          const reply = await callAnthropic(apiKey, q);
          if (last) last.remove();
          pushMsg('bot', reply);
        } catch (e) {
          if (last) last.remove();
          pushMsg('bot', 'The API call failed: ' + (e.message || 'unknown error') + '. Falling back to the built-in help — for that specific question, try asking real Claude at claude.ai.');
        }
      } else {
        pushMsg('bot', 'I don\'t have a great answer for that specific one — but you can ask this in real Claude at claude.ai. Paste your question there and hit send.\n\n(If you have an Anthropic API key you can paste it into the ⚙ settings above, and this bot will route unknown questions through the real Claude.)');
      }
    }

    sendBtn.addEventListener('click', handleAsk);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); handleAsk(); }
    });
  }

  // ------------------------------------------------------------------
  // FAQ matching
  // ------------------------------------------------------------------

  function tokenize(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  }

  function findBest(query, lessonSlug) {
    const q = tokenize(query);
    if (q.length === 0) return { match: false };

    let bestScore = 0;
    let bestEntry = null;

    for (const entry of FAQ) {
      let score = 0;
      for (const kw of entry.k) {
        for (const qword of q) {
          if (qword === kw) score += 3;
          else if (qword.indexOf(kw) !== -1 || kw.indexOf(qword) !== -1) score += 1;
        }
      }
      // Lesson bias: nudge entries whose keywords match current lesson topic.
      if (lessonSlug) {
        const lessonHints = LESSON_HINTS[lessonSlug] || [];
        for (const hint of lessonHints) {
          if (entry.k.indexOf(hint) !== -1) score += 0.5;
        }
      }

      if (score > bestScore) { bestScore = score; bestEntry = entry; }
    }

    // Require a minimum match strength
    const threshold = Math.max(3, q.length * 1.2);
    if (bestEntry && bestScore >= threshold) {
      return { match: true, answer: bestEntry.a, score: bestScore };
    }
    // Weaker match — still useful, offer it
    if (bestEntry && bestScore >= 2) {
      return { match: true, answer: bestEntry.a + '\n\n(That might not be exactly what you asked — rephrase if I missed the mark.)', score: bestScore };
    }
    return { match: false };
  }

  const LESSON_HINTS = {
    '00-start-here':          ['llm','context','window','claude','ai'],
    '01-map-your-workflow':   ['procurement','tool','pick'],
    '02-ai-in-your-workflow': ['claude','code','mcp','email','draft'],
    '03-where-things-live':   ['local','cloud','skill','install','folder'],
    '04-ai-tool-zoo':         ['claude','code','desktop','mcp','skill','project'],
    '05-match-tools-to-work': ['pick','choose','which','tool'],
    '06-try-claude':          ['recipe','prompt','draft','iterate'],
    '07-build-a-skill':       ['skill','trigger','install','build']
  };

  function currentLessonSlug() {
    const path = window.location.pathname
      .replace(/index\.html?$/i, '')
      .replace(/\/+$/, '');
    const parts = path.split('/');
    const last = (parts[parts.length - 1] || '').replace(/\.html?$/i, '');
    return last || null;
  }

  // ------------------------------------------------------------------
  // Anthropic API (stretch)
  // ------------------------------------------------------------------

  async function callAnthropic(apiKey, question) {
    const systemPrompt = 'You are a helper embedded in a course teaching a procurement consultant how to use Claude. Answer in 3-6 sentences, plain English, procurement-flavored when relevant. Never make up features that don\'t exist. If the question is about Sanofi-internal data or confidentiality, be conservative — recommend sanitizing before pasting real data.';
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error('HTTP ' + resp.status + ': ' + t.slice(0, 200));
    }
    const data = await resp.json();
    const content = (data.content || []).map((c) => c.text || '').join('\n').trim();
    return content || 'Empty reply.';
  }

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------

  function init() {
    mountWidget();
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
})();
