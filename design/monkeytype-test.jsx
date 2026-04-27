// Mini inline monkeytype-style typing test.
// 15s, computes wpm/acc/raw/consistency on completion.
// Posts results to a leaderboard kept in localStorage.

const LEADERBOARD_KEY = 'jordi.leaderboard.v1';
// jordi's PB always pinned at top, can't be displaced
const PINNED = { name: 'joadoumie', wpm: 129, acc: 99, when: 'personal best', pinned: true };

function loadBoard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveBoard(entries) {
  try { localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries)); } catch {}
}

const WORD_BANK = (
  "the quick brown fox jumps over a lazy dog while the keyboard hums " +
  "code is poetry compiled into reality and ships to production at midnight " +
  "basketball is a quiet conversation between five players moving in rhythm " +
  "open source is the closest thing software has to a public library " +
  "shoot dribble pass cut screen rebound iterate refactor commit deploy " +
  "every keystroke is a small bet that the next idea is worth catching"
).split(/\s+/);

function makeWords(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)]);
  return out.join(' ');
}

function MonkeytypeTest({ duration = 15 }) {
  const [text, setText] = React.useState(() => makeWords(80));
  const [typed, setTyped] = React.useState('');
  const [started, setStarted] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(duration);
  const [done, setDone] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [wpmHistory, setWpmHistory] = React.useState([]);
  const [showSubmit, setShowSubmit] = React.useState(false);
  const [submitName, setSubmitName] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [showBoard, setShowBoard] = React.useState(false);
  const [board, setBoard] = React.useState(() => loadBoard());
  const promptRef = React.useRef(null);
  const startedAt = React.useRef(0);

  const reset = React.useCallback(() => {
    setText(makeWords(80));
    setTyped('');
    setStarted(false);
    setActive(false);
    setTimeLeft(duration);
    setDone(false);
    setWpmHistory([]);
    startedAt.current = 0;
    setTimeout(() => promptRef.current?.focus(), 0);
  }, [duration]);

  // timer
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          setActive(false);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  // wpm sample once a second
  React.useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const elapsed = (performance.now() - startedAt.current) / 1000;
      if (elapsed > 0) {
        const correct = countCorrect(text, typed);
        const wpm = Math.round((correct / 5) / (elapsed / 60));
        setWpmHistory((h) => [...h, wpm]);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [active, typed, text]);

  const onKey = (e) => {
    if (done) return;
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ') {
      e.preventDefault();
    }
    if (!started && e.key.length === 1) {
      setStarted(true);
      setActive(true);
      startedAt.current = performance.now();
    }
    if (e.key === 'Backspace') {
      setTyped((t) => t.slice(0, -1));
    } else if (e.key.length === 1) {
      setTyped((t) => (t.length < text.length ? t + e.key : t));
    }
  };

  // live stats
  const elapsed = started ? Math.max(0.001, (performance.now() - startedAt.current) / 1000) : 0;
  const correctSoFar = countCorrect(text, typed);
  const liveWpm = started ? Math.round((correctSoFar / 5) / (elapsed / 60)) : 0;
  const liveAcc = typed.length ? Math.round((correctSoFar / typed.length) * 100) : 100;

  // final results
  const finalWpm = liveWpm;
  const finalAcc = liveAcc;
  const finalRaw = typed.length ? Math.round(((typed.length / 5) / (elapsed / 60))) : 0;
  const consistency = wpmHistory.length > 1 ? computeConsistency(wpmHistory) : 0;

  // when test completes, surface submit prompt
  React.useEffect(() => {
    if (done && !submitted) setShowSubmit(true);
  }, [done, submitted]);

  const submitScore = () => {
    const name = submitName.trim().slice(0, 16) || 'anonymous';
    const entry = {
      name,
      wpm: finalWpm,
      acc: finalAcc,
      when: new Date().toISOString().slice(0, 10),
    };
    const next = [...board, entry].sort((a, b) => b.wpm - a.wpm).slice(0, 50);
    setBoard(next);
    saveBoard(next);
    setSubmitted(true);
    setShowSubmit(false);
    setShowBoard(true);
  };

  const clearBoard = () => {
    if (!confirm('Clear local leaderboard? (your scores only — joadoumie stays pinned)')) return;
    setBoard([]);
    saveBoard([]);
  };

  const reset2 = () => {
    setText(makeWords(80));
    setTyped('');
    setStarted(false);
    setActive(false);
    setTimeLeft(duration);
    setDone(false);
    setWpmHistory([]);
    setSubmitted(false);
    setShowSubmit(false);
    setSubmitName('');
    startedAt.current = 0;
    setTimeout(() => promptRef.current?.focus(), 0);
  };

  if (done) {
    return (
      <TerminalSession
        finalWpm={finalWpm}
        finalAcc={finalAcc}
        finalRaw={finalRaw}
        consistency={consistency}
        chars={typed.length}
        elapsed={Math.round(elapsed)}
        board={board}
        submitted={submitted}
        submitName={submitName}
        setSubmitName={setSubmitName}
        submitScore={submitScore}
        skipSubmit={() => setSubmitted(true)}
        onRestart={reset2}
      />
    );
  }

  return (
    <div className="mt-test">
      <div className="mt-test-head">
        <div>15s · english · live</div>
        <div className="live-stats">
          <span>wpm <b>{started ? liveWpm : '—'}</b></span>
          <span>acc <b>{started ? liveAcc + '%' : '—'}</b></span>
          <span>time <b>{timeLeft}s</b></span>
        </div>
      </div>

      <div className="mt-stage">
        <div
          className="mt-prompt"
          tabIndex={0}
          ref={promptRef}
          onKeyDown={onKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        >
          {renderPrompt(text, typed, !done && focused)}
          {!focused && (
            <div className="mt-prompt-hint">
              click or press <span className="key">Tab</span> to type
            </div>
          )}
        </div>
      </div>

      <div className="mt-controls">
        <button onClick={reset2}>↻ restart</button>
        <button onClick={() => { setText(makeWords(80)); setTyped(''); setDone(false); setStarted(false); setActive(false); setTimeLeft(duration); setWpmHistory([]); setSubmitted(false); setShowSubmit(false); setSubmitName(''); }}>
          ⤳ new words
        </button>
        <button onClick={() => setShowBoard((v) => !v)}>
          {showBoard ? '× close board' : '☰ leaderboard'}
        </button>
        <span className="spacer"></span>
        <span style={{ color: 'var(--fg-mute)' }}>pb to beat · <span style={{ color: 'var(--accent)' }}>129 wpm / 99%</span></span>
      </div>

      {showBoard && (
        <Leaderboard board={board} onClear={clearBoard} />
      )}
    </div>
  );
}

// Full terminal takeover when a typing session ends. Plays back a scripted
// sequence of commands, then drops the user into a live shell that accepts
// typed commands (play-again, submit <name>, leaderboard, clear, help).
function TerminalSession({ finalWpm, finalAcc, finalRaw, consistency, chars, elapsed, board, submitted, submitName, setSubmitName, submitScore, skipSubmit, onRestart }) {
  const others = [...board].sort((a, b) => b.wpm - a.wpm)
    .filter((e) => !(e.name === PINNED.name && e.wpm === PINNED.wpm));
  const rows = [PINNED, ...others].slice(0, 8);

  const verdict = finalWpm >= 129 ? 'NEW_PB' : finalWpm >= 100 ? 'FAST' : finalWpm >= 70 ? 'OK' : 'SLOW';
  const verdictClass = finalWpm >= 129 ? 'ok' : finalWpm >= 100 ? 'ok' : finalWpm >= 70 ? 'warn' : 'dim';

  // intro script: types commands automatically, streams output
  const script = React.useMemo(() => {
    const out = [];
    out.push({ kind: 'cmd', text: 'session --end --summary' });
    out.push({ kind: 'kv', lines: [
      ['session', 'closed'],
      ['duration', `${elapsed}s`],
      ['exit_code', '0'],
    ]});
    out.push({ kind: 'cmd', text: 'cat results.json' });
    out.push({ kind: 'json', data: [
      ['wpm', finalWpm, 'num'],
      ['accuracy', `${finalAcc}%`, 'str'],
      ['raw', finalRaw, 'num'],
      ['consistency', `${consistency}%`, 'str'],
      ['chars', chars, 'num'],
      ['verdict', verdict, 'verdict'],
    ], verdictClass });
    out.push({ kind: 'cmd', text: 'leaderboard --top 8' });
    out.push({ kind: 'lb', rows });
    out.push({ kind: 'hint' });
    return out;
  }, [finalWpm, finalAcc, finalRaw, consistency, chars, elapsed, board.length, verdict, verdictClass]);

  const [step, setStep] = React.useState(0);
  const [typing, setTyping] = React.useState('');
  // user-history: log of commands & outputs the user has triggered
  const [userLog, setUserLog] = React.useState([]);
  // current command being typed at the live prompt
  const [cmdBuf, setCmdBuf] = React.useState('');
  const [shellActive, setShellActive] = React.useState(false);
  const wrapRef = React.useRef(null);

  // play through scripted intro
  React.useEffect(() => {
    if (step >= script.length) {
      setShellActive(true);
      return;
    }
    const cur = script[step];
    if (cur.kind === 'cmd') {
      let i = 0;
      setTyping('');
      const id = setInterval(() => {
        i++;
        setTyping(cur.text.slice(0, i));
        if (i >= cur.text.length) {
          clearInterval(id);
          setTimeout(() => setStep((s) => s + 1), 200);
        }
      }, 26);
      return () => clearInterval(id);
    } else {
      const t = setTimeout(() => setStep((s) => s + 1), 280);
      return () => clearTimeout(t);
    }
  }, [step, script]);

  // global keyboard handler for the live shell
  React.useEffect(() => {
    if (!shellActive) return;
    const handler = (e) => {
      // only when the typing test isn't visible — we are now the only thing on screen
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        runCommand(cmdBuf.trim());
        setCmdBuf('');
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setCmdBuf((b) => b.slice(0, -1));
      } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCmdBuf((b) => (b.length < 60 ? b + e.key : b));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shellActive, cmdBuf]);

  // autoscroll to bottom as new content arrives
  React.useEffect(() => {
    if (wrapRef.current) wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
  }, [step, userLog, cmdBuf]);

  const runCommand = (raw) => {
    if (!raw) {
      setUserLog((l) => [...l, { kind: 'cmd', text: '' }]);
      return;
    }
    const [cmd, ...args] = raw.split(/\s+/);
    const next = [{ kind: 'cmd', text: raw }];
    if (cmd === 'play-again' || cmd === 'play_again' || cmd === 'restart') {
      next.push({ kind: 'out', text: 'starting new session...' });
      setUserLog((l) => [...l, ...next]);
      setTimeout(() => onRestart(), 400);
      return;
    }
    if (cmd === 'submit') {
      const name = (args.join(' ') || '').trim().slice(0, 16);
      if (!name) {
        next.push({ kind: 'err', text: 'usage: submit <handle>' });
      } else if (submitted) {
        next.push({ kind: 'err', text: 'already submitted this session' });
      } else {
        setSubmitName(name);
        setTimeout(() => submitScore(), 0);
        next.push({ kind: 'ok', text: `✓ ${name} → leaderboard.txt` });
      }
    } else if (cmd === 'leaderboard' || cmd === 'lb') {
      next.push({ kind: 'lb', rows });
    } else if (cmd === 'results' || cmd === 'stats') {
      next.push({ kind: 'json', data: [
        ['wpm', finalWpm, 'num'],
        ['accuracy', `${finalAcc}%`, 'str'],
        ['raw', finalRaw, 'num'],
        ['consistency', `${consistency}%`, 'str'],
        ['verdict', verdict, 'verdict'],
      ], verdictClass });
    } else if (cmd === 'clear' || cmd === 'cls') {
      setUserLog([]);
      return;
    } else if (cmd === 'help' || cmd === '?') {
      next.push({ kind: 'help' });
    } else if (cmd === 'whoami') {
      next.push({ kind: 'out', text: 'jordi.adoumie · pm/builder · ny' });
    } else {
      next.push({ kind: 'err', text: `command not found: ${cmd} — try 'help'` });
    }
    setUserLog((l) => [...l, ...next]);
  };

  const intro = script.slice(0, step);
  const current = script[step];
  const showingTypingCmd = current && current.kind === 'cmd';

  return (
    <div className="term-takeover" onClick={() => wrapRef.current?.focus?.()}>
      <div className="term-bar">
        <div className="term-dots">
          <span className="td td-r"></span>
          <span className="td td-y"></span>
          <span className="td td-g"></span>
        </div>
        <div className="term-title">jordi@portfolio: ~/typing-session</div>
        <div className="term-meta">
          <span>{finalWpm} wpm</span>
          <span className="sep">·</span>
          <span>{finalAcc}% acc</span>
        </div>
      </div>
      <div className="term-body" ref={wrapRef}>
        <div className="term-line term-out term-banner">
          <span className="dim">$ session restored ·</span> <span className="val">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        {intro.map((entry, idx) => (
          <TermEntry key={'i' + idx} entry={entry} />
        ))}
        {showingTypingCmd && (
          <div className="term-line term-cmd">
            <Prompt />
            <span className="term-text">{typing}<span className="term-cursor">█</span></span>
          </div>
        )}
        {userLog.map((entry, idx) => (
          <TermEntry key={'u' + idx} entry={entry} />
        ))}
        {shellActive && (
          <div className="term-line term-cmd term-live">
            <Prompt />
            <span className="term-text">{cmdBuf}<span className="term-cursor">█</span></span>
          </div>
        )}
      </div>
    </div>
  );
}

function Prompt() {
  return (
    <span className="term-prompt-full">
      <span className="p-user">jordi</span><span className="p-at">@</span><span className="p-host">portfolio</span><span className="p-colon">:</span><span className="p-path">~</span><span className="p-sigil">$</span>
    </span>
  );
}

function TermEntry({ entry }) {
  if (entry.kind === 'cmd') {
    return (
      <div className="term-line term-cmd">
        <Prompt />
        <span className="term-text">{entry.text}</span>
      </div>
    );
  }
  if (entry.kind === 'out') {
    return <div className="term-line term-out">{entry.text}</div>;
  }
  if (entry.kind === 'ok') {
    return <div className="term-line term-out"><span className="ok">{entry.text}</span></div>;
  }
  if (entry.kind === 'err') {
    return <div className="term-line term-out"><span className="err">{entry.text}</span></div>;
  }
  if (entry.kind === 'kv') {
    return (
      <div className="term-block">
        {entry.lines.map((parts, i) => (
          <div key={i} className="term-line term-out">
            <span className="key">{parts[0]}</span>
            <span className="eq">=</span>
            <span className="val">{parts[1]}</span>
          </div>
        ))}
      </div>
    );
  }
  if (entry.kind === 'help') {
    return (
      <div className="term-block">
        <div className="term-line term-out dim">commands:</div>
        <div className="term-line term-out indent"><span className="key">play-again</span><span className="eq">·</span><span className="dim">start a new typing run</span></div>
        <div className="term-line term-out indent"><span className="key">submit &lt;handle&gt;</span><span className="eq">·</span><span className="dim">save your score to leaderboard.txt</span></div>
        <div className="term-line term-out indent"><span className="key">leaderboard</span><span className="eq">·</span><span className="dim">print top 8</span></div>
        <div className="term-line term-out indent"><span className="key">results</span><span className="eq">·</span><span className="dim">re-print results.json</span></div>
        <div className="term-line term-out indent"><span className="key">clear</span><span className="eq">·</span><span className="dim">clear the buffer</span></div>
        <div className="term-line term-out indent"><span className="key">whoami</span><span className="eq">·</span><span className="dim">about the host</span></div>
      </div>
    );
  }
  if (entry.kind === 'hint') {
    return (
      <div className="term-block term-hint-block">
        <div className="term-line term-out dim">─────────────────────────────────────</div>
        <div className="term-line term-out">type <span className="val">play-again</span> to run a new session, <span className="val">submit &lt;handle&gt;</span> to save, or <span className="val">help</span> for more</div>
        <div className="term-line term-out dim">─────────────────────────────────────</div>
      </div>
    );
  }
  if (entry.kind === 'json') {
    const { data, verdictClass } = entry;
    return (
      <div className="term-block term-json">
        <div className="term-line term-out punct">{'{'}</div>
        {data.map(([k, v, type], i) => (
          <div key={k} className="term-line term-out indent">
            <span className="json-k">"{k}"</span>
            <span className="punct">:</span>
            <span className={'json-v ' + (type === 'verdict' ? 'verdict ' + verdictClass : type)}>
              {type === 'num' ? v : `"${v}"`}
            </span>
            {i < data.length - 1 && <span className="punct">,</span>}
          </div>
        ))}
        <div className="term-line term-out punct">{'}'}</div>
      </div>
    );
  }
  if (entry.kind === 'lb') {
    return (
      <div className="term-block term-lb">
        <div className="term-line term-out term-lb-head">
          <span className="lbc rank">#</span>
          <span className="lbc name">handle</span>
          <span className="lbc wpm">wpm</span>
          <span className="lbc acc">acc</span>
          <span className="lbc when">when</span>
        </div>
        {entry.rows.map((e, i) => (
          <div key={i} className={'term-line term-out term-lb-row' + (e.pinned ? ' pinned' : '')}>
            <span className="lbc rank">{e.pinned ? '★' : String(i + 1).padStart(2, '0')}</span>
            <span className="lbc name">{e.name}{e.pinned && <span className="dim"> ·host</span>}</span>
            <span className="lbc wpm">{e.wpm}</span>
            <span className="lbc acc">{e.acc}%</span>
            <span className="lbc when">{e.when}</span>
          </div>
        ))}
        {entry.rows.length === 1 && (
          <div className="term-line term-out dim">∅ no challengers yet</div>
        )}
      </div>
    );
  }
  return null;
}

function Leaderboard({ board, onClear }) {
  // build merged sorted list with PINNED at top
  const others = [...board].sort((a, b) => b.wpm - a.wpm);
  // include PINNED only if no entry beats it (it stays #1 always per request)
  const rows = [PINNED, ...others.filter((e) => !(e.name === PINNED.name && e.wpm === PINNED.wpm))];
  return (
    <div className="lb">
      <div className="lb-head">
        <span className="lb-prompt">$</span>
        <span className="lb-cmd">cat leaderboard.txt</span>
        <span className="lb-flag">| sort -k2 -n -r | head</span>
        <span className="lb-spacer"></span>
        <button className="lb-clear" onClick={onClear}>rm --local</button>
      </div>
      <div className="lb-table">
        <div className="lb-row lb-row-h">
          <span className="lb-c rank">#</span>
          <span className="lb-c name">handle</span>
          <span className="lb-c wpm">wpm</span>
          <span className="lb-c acc">acc</span>
          <span className="lb-c when">when</span>
        </div>
        {rows.length === 1 && (
          <>
            {renderRow(rows[0], 0, true)}
            <div className="lb-empty">
              ∅ no challengers yet — finish a test to claim a spot
            </div>
          </>
        )}
        {rows.length > 1 && rows.slice(0, 10).map((e, i) => renderRow(e, i, e.pinned))}
      </div>
    </div>
  );
}

function renderRow(e, i, pinned) {
  return (
    <div key={i + e.name + e.wpm} className={'lb-row' + (pinned ? ' pinned' : '')}>
      <span className="lb-c rank">{pinned ? '★' : String(i + 1).padStart(2, '0')}</span>
      <span className="lb-c name">{e.name}{pinned && <span className="lb-pin"> · host</span>}</span>
      <span className="lb-c wpm">{e.wpm}</span>
      <span className="lb-c acc">{e.acc}%</span>
      <span className="lb-c when">{e.when}</span>
    </div>
  );
}

function countCorrect(text, typed) {
  let n = 0;
  for (let i = 0; i < typed.length; i++) {
    if (typed[i] === text[i]) n++;
  }
  return n;
}

function computeConsistency(history) {
  if (history.length < 2) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const variance = history.reduce((a, b) => a + (b - mean) ** 2, 0) / history.length;
  const stddev = Math.sqrt(variance);
  if (mean === 0) return 0;
  // monkeytype-ish: 100 - (stddev/mean)*100, floored at 0
  return Math.max(0, Math.round(100 - (stddev / mean) * 100));
}

function renderPrompt(text, typed, showCursor) {
  const chars = [];
  for (let i = 0; i < text.length; i++) {
    let cls = 'ch';
    if (i < typed.length) {
      cls += typed[i] === text[i] ? ' ok' : ' bad';
    }
    if (i === typed.length && showCursor) cls += ' cur';
    chars.push(<span key={i} className={cls}>{text[i]}</span>);
  }
  return chars;
}

window.MonkeytypeTest = MonkeytypeTest;
