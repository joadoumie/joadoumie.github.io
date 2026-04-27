import type { Score } from '../lib/leaderboard';
import { PINNED } from '../lib/leaderboard';

type Props = {
  board: Score[];
  onClear: () => void;
};

export function Leaderboard({ board, onClear }: Props) {
  const others = [...board].sort((a, b) => b.wpm - a.wpm);
  const rows: Score[] = [
    PINNED,
    ...others.filter((e) => !(e.name === PINNED.name && e.wpm === PINNED.wpm)),
  ];

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
            <div className="lb-empty">∅ no challengers yet — finish a test to claim a spot</div>
          </>
        )}
        {rows.length > 1 && rows.slice(0, 10).map((e, i) => renderRow(e, i, !!e.pinned))}
      </div>
    </div>
  );
}

function renderRow(e: Score, i: number, pinned: boolean) {
  return (
    <div key={i + e.name + e.wpm} className={'lb-row' + (pinned ? ' pinned' : '')}>
      <span className="lb-c rank">{pinned ? '★' : String(i + 1).padStart(2, '0')}</span>
      <span className="lb-c name">
        {e.name}
        {pinned && <span className="lb-pin"> · host</span>}
      </span>
      <span className="lb-c wpm">{e.wpm}</span>
      <span className="lb-c acc">{e.acc}%</span>
      <span className="lb-c when">{e.when}</span>
    </div>
  );
}
