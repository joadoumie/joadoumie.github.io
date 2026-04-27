import { useEffect, useMemo, useRef, useState } from 'react';
import type { Score } from '../lib/leaderboard';
import { PINNED } from '../lib/leaderboard';

type Verdict = 'NEW_PB' | 'FAST' | 'OK' | 'SLOW';
type VerdictClass = 'ok' | 'warn' | 'dim';

type ScriptEntry =
  | { kind: 'cmd'; text: string }
  | { kind: 'kv'; lines: Array<[string, string]> }
  | { kind: 'json'; data: Array<[string, string | number, 'num' | 'str' | 'verdict']>; verdictClass: VerdictClass }
  | { kind: 'lb'; rows: Score[] }
  | { kind: 'hint' }
  | { kind: 'out'; text: string }
  | { kind: 'ok'; text: string }
  | { kind: 'err'; text: string }
  | { kind: 'help' };

type Props = {
  finalWpm: number;
  finalAcc: number;
  finalRaw: number;
  consistency: number;
  chars: number;
  elapsed: number;
  board: Score[];
  submitted: boolean;
  setSubmitName: (name: string) => void;
  submitScore: () => void;
  onRestart: () => void;
};

export function TerminalTakeover({
  finalWpm,
  finalAcc,
  finalRaw,
  consistency,
  chars,
  elapsed,
  board,
  submitted,
  setSubmitName,
  submitScore,
  onRestart,
}: Props) {
  const others = [...board]
    .sort((a, b) => b.wpm - a.wpm)
    .filter((e) => !(e.name === PINNED.name && e.wpm === PINNED.wpm));
  const rows = [PINNED, ...others].slice(0, 8);

  const verdict: Verdict =
    finalWpm >= 129 ? 'NEW_PB' : finalWpm >= 100 ? 'FAST' : finalWpm >= 70 ? 'OK' : 'SLOW';
  const verdictClass: VerdictClass =
    finalWpm >= 100 ? 'ok' : finalWpm >= 70 ? 'warn' : 'dim';

  const script: ScriptEntry[] = useMemo(() => {
    const out: ScriptEntry[] = [];
    out.push({ kind: 'cmd', text: 'session --end --summary' });
    out.push({
      kind: 'kv',
      lines: [
        ['session', 'closed'],
        ['duration', `${elapsed}s`],
        ['exit_code', '0'],
      ],
    });
    out.push({ kind: 'cmd', text: 'cat results.json' });
    out.push({
      kind: 'json',
      data: [
        ['wpm', finalWpm, 'num'],
        ['accuracy', `${finalAcc}%`, 'str'],
        ['raw', finalRaw, 'num'],
        ['consistency', `${consistency}%`, 'str'],
        ['chars', chars, 'num'],
        ['verdict', verdict, 'verdict'],
      ],
      verdictClass,
    });
    out.push({ kind: 'cmd', text: 'leaderboard --top 8' });
    out.push({ kind: 'lb', rows });
    out.push({ kind: 'hint' });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalWpm, finalAcc, finalRaw, consistency, chars, elapsed, board.length, verdict, verdictClass]);

  const [step, setStep] = useState(0);
  const [typing, setTyping] = useState('');
  const [userLog, setUserLog] = useState<ScriptEntry[]>([]);
  const [cmdBuf, setCmdBuf] = useState('');
  const [shellActive, setShellActive] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // play through scripted intro
  useEffect(() => {
    if (step >= script.length) {
      setShellActive(true);
      return;
    }
    const cur = script[step];
    if (cur.kind === 'cmd') {
      let i = 0;
      setTyping('');
      const id = window.setInterval(() => {
        i++;
        setTyping(cur.text.slice(0, i));
        if (i >= cur.text.length) {
          window.clearInterval(id);
          window.setTimeout(() => setStep((s) => s + 1), 200);
        }
      }, 26);
      return () => window.clearInterval(id);
    } else {
      const t = window.setTimeout(() => setStep((s) => s + 1), 280);
      return () => window.clearTimeout(t);
    }
  }, [step, script]);

  // global keyboard handler for the live shell
  useEffect(() => {
    if (!shellActive) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shellActive, cmdBuf]);

  // autoscroll to bottom as content arrives
  useEffect(() => {
    if (wrapRef.current) wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
  }, [step, userLog, cmdBuf]);

  const runCommand = (raw: string) => {
    if (!raw) {
      setUserLog((l) => [...l, { kind: 'cmd', text: '' }]);
      return;
    }
    const [cmd, ...args] = raw.split(/\s+/);
    const next: ScriptEntry[] = [{ kind: 'cmd', text: raw }];
    if (cmd === 'play-again' || cmd === 'play_again' || cmd === 'restart') {
      next.push({ kind: 'out', text: 'starting new session...' });
      setUserLog((l) => [...l, ...next]);
      window.setTimeout(() => onRestart(), 400);
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
        window.setTimeout(() => submitScore(), 0);
        next.push({ kind: 'ok', text: `✓ ${name} → leaderboard.txt` });
      }
    } else if (cmd === 'leaderboard' || cmd === 'lb') {
      next.push({ kind: 'lb', rows });
    } else if (cmd === 'results' || cmd === 'stats') {
      next.push({
        kind: 'json',
        data: [
          ['wpm', finalWpm, 'num'],
          ['accuracy', `${finalAcc}%`, 'str'],
          ['raw', finalRaw, 'num'],
          ['consistency', `${consistency}%`, 'str'],
          ['verdict', verdict, 'verdict'],
        ],
        verdictClass,
      });
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
          <span className="dim">$ session restored ·</span>{' '}
          <span className="val">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        {intro.map((entry, idx) => (
          <TermEntry key={'i' + idx} entry={entry} />
        ))}
        {showingTypingCmd && (
          <div className="term-line term-cmd">
            <Prompt />
            <span className="term-text">
              {typing}
              <span className="term-cursor">█</span>
            </span>
          </div>
        )}
        {userLog.map((entry, idx) => (
          <TermEntry key={'u' + idx} entry={entry} />
        ))}
        {shellActive && (
          <div className="term-line term-cmd term-live">
            <Prompt />
            <span className="term-text">
              {cmdBuf}
              <span className="term-cursor">█</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function Prompt() {
  return (
    <span className="term-prompt-full">
      <span className="p-user">jordi</span>
      <span className="p-at">@</span>
      <span className="p-host">portfolio</span>
      <span className="p-colon">:</span>
      <span className="p-path">~</span>
      <span className="p-sigil">$</span>
    </span>
  );
}

function TermEntry({ entry }: { entry: ScriptEntry }) {
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
    return (
      <div className="term-line term-out">
        <span className="ok">{entry.text}</span>
      </div>
    );
  }
  if (entry.kind === 'err') {
    return (
      <div className="term-line term-out">
        <span className="err">{entry.text}</span>
      </div>
    );
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
        <div className="term-line term-out indent">
          <span className="key">play-again</span>
          <span className="eq">·</span>
          <span className="dim">start a new typing run</span>
        </div>
        <div className="term-line term-out indent">
          <span className="key">submit &lt;handle&gt;</span>
          <span className="eq">·</span>
          <span className="dim">save your score to leaderboard.txt</span>
        </div>
        <div className="term-line term-out indent">
          <span className="key">leaderboard</span>
          <span className="eq">·</span>
          <span className="dim">print top 8</span>
        </div>
        <div className="term-line term-out indent">
          <span className="key">results</span>
          <span className="eq">·</span>
          <span className="dim">re-print results.json</span>
        </div>
        <div className="term-line term-out indent">
          <span className="key">clear</span>
          <span className="eq">·</span>
          <span className="dim">clear the buffer</span>
        </div>
        <div className="term-line term-out indent">
          <span className="key">whoami</span>
          <span className="eq">·</span>
          <span className="dim">about the host</span>
        </div>
      </div>
    );
  }
  if (entry.kind === 'hint') {
    return (
      <div className="term-block term-hint-block">
        <div className="term-line term-out dim">─────────────────────────────────────</div>
        <div className="term-line term-out">
          type <span className="val">play-again</span> to run a new session,{' '}
          <span className="val">submit &lt;handle&gt;</span> to save, or{' '}
          <span className="val">help</span> for more
        </div>
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
            <span className="lbc name">
              {e.name}
              {e.pinned && <span className="dim"> ·host</span>}
            </span>
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
