export function StatsCard() {
  return (
    <div className="mt-card">
      <div className="mt-stats">
        <div className="mt-stat">
          <div className="label">wpm <span className="crown">♛</span></div>
          <div className="value">129</div>
        </div>
        <div className="mt-stat">
          <div className="label">acc</div>
          <div className="value">99<span className="unit">%</span></div>
        </div>
      </div>
      <div className="mt-meta">
        <div className="row"><span className="k">test type</span><span className="v">time 30 · english</span></div>
        <div className="row"><span className="k">consistency</span><span className="v">99%</span></div>
        <div className="row"><span className="k">raw</span><span className="v">131</span></div>
        <div className="row"><span className="k">characters</span><span className="v">325 / 3 / 0 / 0</span></div>
        <div className="row"><span className="k">date</span><span className="v">personal best</span></div>
        <div className="row"><span className="k">handle</span><span className="v" style={{ color: 'var(--accent)' }}>joadoumie</span></div>
      </div>
    </div>
  );
}
