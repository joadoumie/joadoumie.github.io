import { useCallback, useEffect, useRef, useState } from 'react';
import { Leaderboard } from './Leaderboard';
import { TerminalTakeover } from './TerminalTakeover';
import { type Score, loadBoard, saveBoard } from '../lib/leaderboard';
import { computeConsistency, countCorrect, makeWords } from '../lib/typing';

type Props = { duration?: number };

export function TypingTest({ duration = 15 }: Props) {
  const [text, setText] = useState(() => makeWords(80));
  const [typed, setTyped] = useState('');
  const [started, setStarted] = useState(false);
  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState(false);
  const [wpmHistory, setWpmHistory] = useState<number[]>([]);
  const [submitName, setSubmitName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showBoard, setShowBoard] = useState(false);
  const [board, setBoard] = useState<Score[]>(() => loadBoard());
  const promptRef = useRef<HTMLDivElement>(null);
  const startedAt = useRef(0);

  // timer
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          setActive(false);
          setDone(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  // wpm sample once a second
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt.current) / 1000;
      if (elapsed > 0) {
        const correct = countCorrect(text, typed);
        const wpm = Math.round(correct / 5 / (elapsed / 60));
        setWpmHistory((h) => [...h, wpm]);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [active, typed, text]);

  const onKey: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
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
  const liveWpm = started ? Math.round(correctSoFar / 5 / (elapsed / 60)) : 0;
  const liveAcc = typed.length ? Math.round((correctSoFar / typed.length) * 100) : 100;

  // final results
  const finalWpm = liveWpm;
  const finalAcc = liveAcc;
  const finalRaw = typed.length ? Math.round(typed.length / 5 / (elapsed / 60)) : 0;
  const consistency = wpmHistory.length > 1 ? computeConsistency(wpmHistory) : 0;

  const submitScore = useCallback(() => {
    const name = submitName.trim().slice(0, 16) || 'anonymous';
    const entry: Score = {
      name,
      wpm: finalWpm,
      acc: finalAcc,
      when: new Date().toISOString().slice(0, 10),
    };
    const next = [...board, entry].sort((a, b) => b.wpm - a.wpm).slice(0, 50);
    setBoard(next);
    saveBoard(next);
    setSubmitted(true);
  }, [submitName, finalWpm, finalAcc, board]);

  const clearBoard = () => {
    if (!confirm('Clear local leaderboard? (your scores only — joadoumie stays pinned)')) return;
    setBoard([]);
    saveBoard([]);
  };

  const reset = useCallback(() => {
    setText(makeWords(80));
    setTyped('');
    setStarted(false);
    setActive(false);
    setTimeLeft(duration);
    setDone(false);
    setWpmHistory([]);
    setSubmitted(false);
    setSubmitName('');
    startedAt.current = 0;
    window.setTimeout(() => promptRef.current?.focus(), 0);
  }, [duration]);

  if (done) {
    return (
      <TerminalTakeover
        finalWpm={finalWpm}
        finalAcc={finalAcc}
        finalRaw={finalRaw}
        consistency={consistency}
        chars={typed.length}
        elapsed={Math.round(elapsed)}
        board={board}
        submitted={submitted}
        setSubmitName={setSubmitName}
        submitScore={submitScore}
        onRestart={reset}
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
        <button onClick={reset}>↻ restart</button>
        <button onClick={() => { setText(makeWords(80)); setTyped(''); setStarted(false); setActive(false); setTimeLeft(duration); setWpmHistory([]); setSubmitted(false); setSubmitName(''); }}>
          ⤳ new words
        </button>
        <button onClick={() => setShowBoard((v) => !v)}>
          {showBoard ? '× close board' : '☰ leaderboard'}
        </button>
        <span className="spacer"></span>
        <span style={{ color: 'var(--fg-mute)' }}>pb to beat · <span style={{ color: 'var(--accent)' }}>129 wpm / 99%</span></span>
      </div>

      {showBoard && <Leaderboard board={board} onClear={clearBoard} />}
    </div>
  );
}

function renderPrompt(text: string, typed: string, showCursor: boolean) {
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

