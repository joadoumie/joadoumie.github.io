// Ambient ASCII basketball scene — clearly a hoop + backboard + ball.
// - cursor moves the ball horizontally along the floor (dribble bounce)
// - click anywhere to shoot: ball arcs toward the rim
// - swishes / bricks tracked in a small counter
// - idle: the ball dribbles in place at center

function AsciiCourt() {
  const stageRef = React.useRef(null);
  const sceneRef = React.useRef(null);

  const [score, setScore] = React.useState({ made: 0, attempts: 0, streak: 0 });
  const scoreRef = React.useRef(score);
  scoreRef.current = score;

  // grid dims (chars). Designed to render ~ 1:1 visually given line-height tweaks.
  const COLS = 44;
  const ROWS = 22;

  // fixed scenery: backboard + rim + net + floor
  // coords: rim center column ~ COLS - 8
  const RIM_COL = COLS - 9;
  const RIM_ROW = 6;       // rim at row 6
  const FLOOR_ROW = ROWS - 3;
  const PLAYER_COL = 6;    // where ball idles when not shooting

  // ball physics state
  const state = React.useRef({
    // ball position in CHAR coords (floats)
    x: PLAYER_COL,
    y: FLOOR_ROW - 1,
    vx: 0,
    vy: 0,
    mode: 'dribble',     // 'dribble' | 'charging' | 'shooting' | 'made' | 'missed'
    shotT: 0,
    targetX: PLAYER_COL,  // where dribble bounces toward (cursor-driven)
    bouncePhase: 0,
    lastShotResult: null, // 'made' | 'missed'
    flashUntil: 0,
    rimShakeUntil: 0,
    chargeStart: 0,
    chargePower: 0,       // 0..1
    _lastPlayerX: PLAYER_COL,
    _ballOffsetFromPlayer: 1, // ball sits 1 col right of player (front hand toward rim)
  });

  const [chargePct, setChargePct] = React.useState(0);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const colsToPx = () => {
      const r = stage.getBoundingClientRect();
      return { w: r.width, h: r.height, charW: r.width / COLS, charH: r.height / ROWS };
    };

    const onMove = (e) => {
      const { charW } = colsToPx();
      const r = stage.getBoundingClientRect();
      const xChar = (e.clientX - r.left) / charW;
      // clamp so the player+ball stay inside the court
      state.current.targetX = Math.max(3, Math.min(RIM_COL - 8, xChar));
    };

    const onDown = () => {
      const s = state.current;
      if (s.mode !== 'dribble') return;
      s.mode = 'charging';
      s.chargeStart = performance.now();
      s.chargePower = 0;
    };

    const releaseShot = () => {
      const s = state.current;
      if (s.mode !== 'charging') return;
      const held = performance.now() - s.chargeStart;
      // 0..1 over 0..1200ms
      const power = Math.min(1, held / 1200);
      s.chargePower = power;
      setChargePct(0);

      // Power affects accuracy curve:
      //   too soft (power < 0.2) → likely short / brick
      //   sweet spot (0.45..0.75) → high make rate
      //   too hard (power > 0.9) → long / off backboard
      let makeProb;
      if (power < 0.2) makeProb = 0.15;
      else if (power < 0.45) makeProb = 0.45;
      else if (power < 0.78) makeProb = 0.78;
      else if (power < 0.92) makeProb = 0.55;
      else makeProb = 0.25;

      const willMake = Math.random() < makeProb;
      s.mode = 'shooting';
      s.shotT = 0;
      s._startX = s.x;
      s._startY = s.y;
      // miss direction influenced by power
      let missOffsetX = 0, missOffsetY = 0;
      if (!willMake) {
        if (power < 0.3) { // short / front rim
          missOffsetX = -1.4;
          missOffsetY = 1.2;
        } else if (power > 0.85) { // long / off backboard
          missOffsetX = 2.2;
          missOffsetY = -0.4;
        } else { // side
          missOffsetX = Math.random() < 0.5 ? -1.6 : 1.6;
          missOffsetY = -0.2;
        }
      }
      s._endX = RIM_COL + missOffsetX;
      s._endY = (willMake ? RIM_ROW : RIM_ROW + missOffsetY);
      s._willMake = willMake;
      // arc height & duration scale with power
      s._arcPeak = 4 + power * 6;
      s._duration = Math.max(34, Math.round(70 - power * 30));
    };

    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', releaseShot);

    let raf;
    const render = () => {
      const s = state.current;

      if (s.mode === 'dribble') {
        // ease ball x toward target
        s.x += (s.targetX - s.x) * 0.12;
        // dribble bounce — sinusoidal off the floor
        s.bouncePhase += 0.18;
        const bounceHeight = 2.4; // chars
        const bounce = Math.abs(Math.sin(s.bouncePhase)) * bounceHeight;
        s.y = FLOOR_ROW - 1 - bounce;
      } else if (s.mode === 'charging') {
        // ball rises into shooting pocket as charge builds
        const held = performance.now() - s.chargeStart;
        const power = Math.min(1, held / 1200);
        s.chargePower = power;
        // drive UI
        setChargePct(Math.round(power * 100));
        // ball stays just in front of player but rises
        s.x += (s.targetX - s.x) * 0.06;
        const targetY = FLOOR_ROW - 4 - power * 2.5;
        s.y += (targetY - s.y) * 0.25;
      } else if (s.mode === 'shooting') {
        s.shotT += 1;
        const t = Math.min(1, s.shotT / s._duration);
        const peakY = Math.min(s._startY, s._endY) - s._arcPeak;
        s.x = s._startX + (s._endX - s._startX) * t;
        s.y = (1 - t) ** 2 * s._startY + 2 * (1 - t) * t * peakY + t ** 2 * s._endY;

        if (t >= 1) {
          if (s._willMake) {
            s.mode = 'made';
            s.lastShotResult = 'made';
            s.flashUntil = performance.now() + 700;
            s.rimShakeUntil = performance.now() + 250;
            setScore((p) => ({ made: p.made + 1, attempts: p.attempts + 1, streak: p.streak + 1 }));
          } else {
            s.mode = 'missed';
            s.lastShotResult = 'missed';
            s.flashUntil = performance.now() + 700;
            s.rimShakeUntil = performance.now() + 180;
            setScore((p) => ({ made: p.made, attempts: p.attempts + 1, streak: 0 }));
          }
          // brief delay then ball returns to player's current position
          setTimeout(() => {
            s.x = s._endX;
            s.y = FLOOR_ROW - 1;
            const rollFrames = 30;
            let i = 0;
            const startX = s.x;
            const endX = s._lastPlayerX != null ? s._lastPlayerX : PLAYER_COL;
            const id = setInterval(() => {
              i++;
              const tt = i / rollFrames;
              s.x = startX + (endX - startX) * tt;
              s.y = FLOOR_ROW - 1 - Math.abs(Math.sin(tt * Math.PI * 3)) * 1;
              if (i >= rollFrames) {
                clearInterval(id);
                s.mode = 'dribble';
                s.targetX = endX;
                s.bouncePhase = 0;
              }
            }, 16);
          }, 350);
        }
      }

      // build the ASCII grid
      const grid = buildGrid(COLS, ROWS, s, RIM_COL, RIM_ROW, FLOOR_ROW, PLAYER_COL);
      if (sceneRef.current) sceneRef.current.innerHTML = grid;

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', releaseShot);
    };
  }, []);

  const fg = score.attempts ? Math.round((score.made / score.attempts) * 100) : 0;
  const fgStr = score.attempts ? String(fg).padStart(3, ' ') + '%' : ' ──%';
  const made = String(score.made).padStart(2, '0');
  const att = String(score.attempts).padStart(2, '0');
  const streakStr = score.streak > 0 ? String(score.streak).padStart(2, ' ') : ' 0';

  return (
    <div className="court-wrap">
      <div className="court-hud">
        <div className="hud-bar">
          <span className="hud-dot hud-r"></span>
          <span className="hud-dot hud-y"></span>
          <span className="hud-dot hud-g"></span>
          <span className="hud-title">box-score.sh</span>
        </div>
        <div className="hud-body">
          <div className="hud-line">
            <span className="hud-prompt">$</span>
            <span className="hud-cmd">box-score</span>
            <span className="hud-flag">--live</span>
          </div>
          <div className="hud-line hud-out">
            <span className="hud-k">FGM/FGA</span>
            <span className="hud-eq">=</span>
            <span className="hud-v">{made}/{att}</span>
            <span className="hud-sep">│</span>
            <span className="hud-k">FG%</span>
            <span className="hud-eq">=</span>
            <span className="hud-v">{fgStr.trim()}</span>
            <span className="hud-sep">│</span>
            <span className="hud-k">STREAK</span>
            <span className="hud-eq">=</span>
            <span className={'hud-v' + (score.streak >= 3 ? ' hot' : '')}>
              {streakStr.trim()}{score.streak >= 3 ? ' 🔥' : ''}
            </span>
          </div>
        </div>
      </div>
      <div className="court-stage" ref={stageRef}>
        <pre className="court-scene" ref={sceneRef}></pre>
        {chargePct > 0 && (
          <div className="charge-bar">
            <div className="charge-fill" style={{ width: chargePct + '%' }}></div>
            <div className="charge-label">{chargePct < 20 ? 'soft' : chargePct < 78 ? 'good' : 'overcooked'}</div>
          </div>
        )}
      </div>
      <div className="court-caption">
        <span className="kbd">move</span> to dribble · <span className="kbd">hold + release</span> to shoot
      </div>
    </div>
  );
}

// Build an ASCII grid as an HTML string with semantic spans for color.
function buildGrid(COLS, ROWS, s, RIM_COL, RIM_ROW, FLOOR_ROW, PLAYER_COL) {
  // make a 2d array of {char, cls}
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push({ ch: ' ', cls: '' });
    cells.push(row);
  }

  // ── BACKBOARD (right side, vertical bar) ────────────────────────────────
  const backboardCol = RIM_COL + 4;
  for (let r = RIM_ROW - 3; r <= RIM_ROW + 1; r++) {
    if (cells[r]) cells[r][backboardCol] = { ch: '|', cls: 'mute' };
  }
  // backboard top/bottom caps
  if (cells[RIM_ROW - 3]) cells[RIM_ROW - 3][backboardCol] = { ch: '+', cls: 'mute' };
  if (cells[RIM_ROW + 1]) cells[RIM_ROW + 1][backboardCol] = { ch: '+', cls: 'mute' };
  // square on backboard
  if (cells[RIM_ROW - 1]) {
    cells[RIM_ROW - 1][backboardCol - 1] = { ch: '[', cls: 'mute' };
    cells[RIM_ROW][backboardCol - 1] = { ch: ']', cls: 'mute' };
  }

  // ── RIM ─────────────────────────────────────────────────────────────────
  const rimShake = performance.now() < s.rimShakeUntil ? Math.round(Math.sin(performance.now() / 30) * 0.5) : 0;
  const rimRowEff = RIM_ROW + (Math.abs(rimShake) > 0 ? 0 : 0);
  if (cells[rimRowEff]) {
    cells[rimRowEff][RIM_COL - 1] = { ch: 'o', cls: 'rim' };
    cells[rimRowEff][RIM_COL] = { ch: '=', cls: 'rim' };
    cells[rimRowEff][RIM_COL + 1] = { ch: '=', cls: 'rim' };
    cells[rimRowEff][RIM_COL + 2] = { ch: 'o', cls: 'rim' };
  }

  // ── NET (3 rows of \/) ───────────────────────────────────────────────────
  const netChars = [
    ['|', '\\', '/', '|'],
    [' ', '\\', '/', ' '],
    [' ', ' ', 'V', ' '],
  ];
  for (let nr = 0; nr < netChars.length; nr++) {
    const row = rimRowEff + 1 + nr;
    if (!cells[row]) continue;
    for (let nc = 0; nc < netChars[nr].length; nc++) {
      const ch = netChars[nr][nc];
      if (ch !== ' ') cells[row][RIM_COL - 1 + nc] = { ch, cls: 'net' };
    }
  }

  // ── POLE supporting backboard from the right edge ────────────────────────
  for (let r = RIM_ROW - 1; r <= FLOOR_ROW; r++) {
    if (cells[r]) cells[r][COLS - 2] = { ch: '|', cls: 'mute' };
  }
  // base
  if (cells[FLOOR_ROW]) {
    cells[FLOOR_ROW][COLS - 3] = { ch: '_', cls: 'mute' };
    cells[FLOOR_ROW][COLS - 2] = { ch: '_', cls: 'mute' };
  }
  // arm from pole to backboard
  if (cells[RIM_ROW - 1]) {
    for (let c = backboardCol + 1; c < COLS - 2; c++) {
      cells[RIM_ROW - 1][c] = { ch: '-', cls: 'mute' };
    }
  }

  // ── FLOOR ────────────────────────────────────────────────────────────────
  for (let c = 0; c < COLS; c++) {
    if (cells[FLOOR_ROW + 1]) cells[FLOOR_ROW + 1][c] = { ch: '_', cls: 'floor' };
  }
  // free-throw line markings (dashed)
  for (let c = 2; c < COLS - 4; c += 2) {
    if (cells[FLOOR_ROW + 2]) cells[FLOOR_ROW + 2][c] = { ch: '·', cls: 'floor' };
  }

  // ── PLAYER + BALL alignment ──────────────────────────────────────────────
  // Player tracks the ball horizontally so it always looks like THEY are
  // dribbling. The ball is drawn at the FRONT HAND (one column toward the
  // rim from the player's body) instead of through the body.
  let playerCol;
  if (s.mode === 'dribble' || s.mode === 'charging') {
    // anchor player so their front hand sits where the ball is
    playerCol = Math.round(s.x) - 1;
    s._lastPlayerX = playerCol;
  } else {
    playerCol = s._lastPlayerX != null ? s._lastPlayerX : PLAYER_COL - 1;
  }
  // clamp inside court
  playerCol = Math.max(2, Math.min(RIM_COL - 6, playerCol));

  if (s.mode !== 'shooting' || s.shotT < 8) {
    const px = playerCol;
    const headRow = FLOOR_ROW - 4;
    const bob = s.mode === 'dribble' ? Math.round(Math.abs(Math.sin(s.bouncePhase)) * 0.4) : 0;

    if (cells[headRow + bob]) cells[headRow + bob][px] = { ch: 'o', cls: 'player' };

    if (s.mode === 'shooting' || s.mode === 'charging') {
      // shooting/loading pose: front arm extended toward rim
      if (cells[headRow + 1 + bob]) {
        cells[headRow + 1 + bob][px - 1] = { ch: '\\', cls: 'player' };
        cells[headRow + 1 + bob][px] = { ch: '|', cls: 'player' };
        cells[headRow + 1 + bob][px + 1] = { ch: '/', cls: 'player' };
      }
    } else {
      // dribbling pose: front arm down toward ball (which is at px+1)
      if (cells[headRow + 1 + bob]) {
        cells[headRow + 1 + bob][px - 1] = { ch: '/', cls: 'player' };
        cells[headRow + 1 + bob][px] = { ch: '|', cls: 'player' };
        cells[headRow + 1 + bob][px + 1] = { ch: '\\', cls: 'player' };
      }
    }
    if (cells[headRow + 2 + bob]) cells[headRow + 2 + bob][px] = { ch: '|', cls: 'player' };
    if (cells[headRow + 3 + bob]) {
      cells[headRow + 3 + bob][px - 1] = { ch: '/', cls: 'player' };
      cells[headRow + 3 + bob][px + 1] = { ch: '\\', cls: 'player' };
    }
  }

  // ── BALL ─────────────────────────────────────────────────────────────────
  const bx = Math.round(s.x);
  const by = Math.round(s.y);
  if (cells[by] && cells[by][bx]) {
    cells[by][bx] = { ch: '@', cls: 'ball' };
  }
  // ball trail when shooting
  if (s.mode === 'shooting' && s._startX !== undefined) {
    const trailSteps = 5;
    for (let i = 1; i <= trailSteps; i++) {
      const tt = Math.max(0, (s.shotT - i * 2) / s._duration);
      if (tt <= 0) continue;
      const peakY = Math.min(s._startY, s._endY) - 6;
      const tx = Math.round(s._startX + (s._endX - s._startX) * tt);
      const ty = Math.round((1 - tt) ** 2 * s._startY + 2 * (1 - tt) * tt * peakY + tt ** 2 * s._endY);
      if (cells[ty] && cells[ty][tx] && cells[ty][tx].ch === ' ') {
        cells[ty][tx] = { ch: '·', cls: 'trail' };
      }
    }
  }

  // ── RESULT FLASH (SWISH! / BRICK) above the rim ─────────────────────────
  if (performance.now() < s.flashUntil && s.lastShotResult) {
    const label = s.lastShotResult === 'made' ? 'SWISH!' : 'BRICK ';
    const cls = s.lastShotResult === 'made' ? 'flash-made' : 'flash-miss';
    const startCol = RIM_COL - 2;
    const labelRow = RIM_ROW - 4;
    if (cells[labelRow]) {
      for (let i = 0; i < label.length; i++) {
        if (cells[labelRow][startCol + i]) {
          cells[labelRow][startCol + i] = { ch: label[i], cls };
        }
      }
    }
  }

  // serialize → html string
  let out = '';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cells[r][c];
      if (cell.ch === ' ') { out += ' '; continue; }
      const ch = escapeHtml(cell.ch);
      out += cell.cls ? `<span class="c-${cell.cls}">${ch}</span>` : ch;
    }
    out += '\n';
  }
  return out;
}

function escapeHtml(c) {
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  if (c === '&') return '&amp;';
  return c;
}

window.AsciiCourt = AsciiCourt;
