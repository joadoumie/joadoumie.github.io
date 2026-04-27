import { useEffect, useRef, useState } from 'react';

// Ambient ASCII basketball scene — clearly a hoop + backboard + ball.
// - cursor moves the ball horizontally along the floor (dribble bounce)
// - press + release to charge a shot; ball arcs toward the rim
// - swishes / bricks tracked in a small counter

const COLS = 44;
const ROWS = 22;
const RIM_COL = COLS - 9;
const RIM_ROW = 6;
const FLOOR_ROW = ROWS - 3;
const PLAYER_COL = 6;

type Mode = 'dribble' | 'charging' | 'shooting' | 'made' | 'missed';

type CourtState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mode: Mode;
  shotT: number;
  targetX: number;
  bouncePhase: number;
  lastShotResult: 'made' | 'missed' | null;
  flashUntil: number;
  rimShakeUntil: number;
  chargeStart: number;
  chargePower: number;
  _lastPlayerX: number;
  _ballOffsetFromPlayer: number;
  _startX?: number;
  _startY?: number;
  _endX?: number;
  _endY?: number;
  _willMake?: boolean;
  _arcPeak?: number;
  _duration?: number;
};

type Score = { made: number; attempts: number; streak: number };

export function AsciiCourt() {
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLPreElement>(null);

  const [score, setScore] = useState<Score>({ made: 0, attempts: 0, streak: 0 });
  const [chargePct, setChargePct] = useState(0);

  const stateRef = useRef<CourtState>({
    x: PLAYER_COL,
    y: FLOOR_ROW - 1,
    vx: 0,
    vy: 0,
    mode: 'dribble',
    shotT: 0,
    targetX: PLAYER_COL,
    bouncePhase: 0,
    lastShotResult: null,
    flashUntil: 0,
    rimShakeUntil: 0,
    chargeStart: 0,
    chargePower: 0,
    _lastPlayerX: PLAYER_COL,
    _ballOffsetFromPlayer: 1,
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const colsToPx = () => {
      const r = stage.getBoundingClientRect();
      return { w: r.width, h: r.height, charW: r.width / COLS, charH: r.height / ROWS };
    };

    const onMove = (e: PointerEvent) => {
      const { charW } = colsToPx();
      const r = stage.getBoundingClientRect();
      const xChar = (e.clientX - r.left) / charW;
      stateRef.current.targetX = Math.max(3, Math.min(RIM_COL - 8, xChar));
    };

    const onDown = () => {
      const s = stateRef.current;
      if (s.mode !== 'dribble') return;
      s.mode = 'charging';
      s.chargeStart = performance.now();
      s.chargePower = 0;
    };

    const releaseShot = () => {
      const s = stateRef.current;
      if (s.mode !== 'charging') return;
      const held = performance.now() - s.chargeStart;
      const power = Math.min(1, held / 1200);
      s.chargePower = power;
      setChargePct(0);

      let makeProb: number;
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
      let missOffsetX = 0;
      let missOffsetY = 0;
      if (!willMake) {
        if (power < 0.3) {
          missOffsetX = -1.4;
          missOffsetY = 1.2;
        } else if (power > 0.85) {
          missOffsetX = 2.2;
          missOffsetY = -0.4;
        } else {
          missOffsetX = Math.random() < 0.5 ? -1.6 : 1.6;
          missOffsetY = -0.2;
        }
      }
      s._endX = RIM_COL + missOffsetX;
      s._endY = willMake ? RIM_ROW : RIM_ROW + missOffsetY;
      s._willMake = willMake;
      s._arcPeak = 4 + power * 6;
      s._duration = Math.max(34, Math.round(70 - power * 30));
    };

    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', releaseShot);

    let raf = 0;
    const render = () => {
      const s = stateRef.current;

      if (s.mode === 'dribble') {
        s.x += (s.targetX - s.x) * 0.12;
        s.bouncePhase += 0.18;
        const bounceHeight = 2.4;
        const bounce = Math.abs(Math.sin(s.bouncePhase)) * bounceHeight;
        s.y = FLOOR_ROW - 1 - bounce;
      } else if (s.mode === 'charging') {
        const held = performance.now() - s.chargeStart;
        const power = Math.min(1, held / 1200);
        s.chargePower = power;
        setChargePct(Math.round(power * 100));
        s.x += (s.targetX - s.x) * 0.06;
        const targetY = FLOOR_ROW - 4 - power * 2.5;
        s.y += (targetY - s.y) * 0.25;
      } else if (s.mode === 'shooting') {
        s.shotT += 1;
        const t = Math.min(1, s.shotT / (s._duration ?? 70));
        const peakY = Math.min(s._startY ?? 0, s._endY ?? 0) - (s._arcPeak ?? 6);
        s.x = (s._startX ?? 0) + ((s._endX ?? 0) - (s._startX ?? 0)) * t;
        s.y =
          (1 - t) ** 2 * (s._startY ?? 0) +
          2 * (1 - t) * t * peakY +
          t ** 2 * (s._endY ?? 0);

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
          window.setTimeout(() => {
            s.x = s._endX ?? s.x;
            s.y = FLOOR_ROW - 1;
            const rollFrames = 30;
            let i = 0;
            const startX = s.x;
            const endX = s._lastPlayerX != null ? s._lastPlayerX : PLAYER_COL;
            const id = window.setInterval(() => {
              i++;
              const tt = i / rollFrames;
              s.x = startX + (endX - startX) * tt;
              s.y = FLOOR_ROW - 1 - Math.abs(Math.sin(tt * Math.PI * 3)) * 1;
              if (i >= rollFrames) {
                window.clearInterval(id);
                s.mode = 'dribble';
                s.targetX = endX;
                s.bouncePhase = 0;
              }
            }, 16);
          }, 350);
        }
      }

      const grid = buildGrid(s);
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

type Cell = { ch: string; cls: string };

function buildGrid(s: CourtState): string {
  const cells: Cell[][] = [];
  for (let r = 0; r < ROWS; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < COLS; c++) row.push({ ch: ' ', cls: '' });
    cells.push(row);
  }

  // backboard (right side, vertical bar)
  const backboardCol = RIM_COL + 4;
  for (let r = RIM_ROW - 3; r <= RIM_ROW + 1; r++) {
    if (cells[r]) cells[r][backboardCol] = { ch: '|', cls: 'mute' };
  }
  if (cells[RIM_ROW - 3]) cells[RIM_ROW - 3][backboardCol] = { ch: '+', cls: 'mute' };
  if (cells[RIM_ROW + 1]) cells[RIM_ROW + 1][backboardCol] = { ch: '+', cls: 'mute' };
  if (cells[RIM_ROW - 1]) {
    cells[RIM_ROW - 1][backboardCol - 1] = { ch: '[', cls: 'mute' };
    cells[RIM_ROW][backboardCol - 1] = { ch: ']', cls: 'mute' };
  }

  // rim
  const rimRowEff = RIM_ROW;
  if (cells[rimRowEff]) {
    cells[rimRowEff][RIM_COL - 1] = { ch: 'o', cls: 'rim' };
    cells[rimRowEff][RIM_COL] = { ch: '=', cls: 'rim' };
    cells[rimRowEff][RIM_COL + 1] = { ch: '=', cls: 'rim' };
    cells[rimRowEff][RIM_COL + 2] = { ch: 'o', cls: 'rim' };
  }

  // net
  const netChars: string[][] = [
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

  // pole supporting backboard from the right edge
  for (let r = RIM_ROW - 1; r <= FLOOR_ROW; r++) {
    if (cells[r]) cells[r][COLS - 2] = { ch: '|', cls: 'mute' };
  }
  if (cells[FLOOR_ROW]) {
    cells[FLOOR_ROW][COLS - 3] = { ch: '_', cls: 'mute' };
    cells[FLOOR_ROW][COLS - 2] = { ch: '_', cls: 'mute' };
  }
  if (cells[RIM_ROW - 1]) {
    for (let c = backboardCol + 1; c < COLS - 2; c++) {
      cells[RIM_ROW - 1][c] = { ch: '-', cls: 'mute' };
    }
  }

  // floor
  for (let c = 0; c < COLS; c++) {
    if (cells[FLOOR_ROW + 1]) cells[FLOOR_ROW + 1][c] = { ch: '_', cls: 'floor' };
  }
  // free-throw line markings (dashed)
  for (let c = 2; c < COLS - 4; c += 2) {
    if (cells[FLOOR_ROW + 2]) cells[FLOOR_ROW + 2][c] = { ch: '·', cls: 'floor' };
  }

  // player + ball alignment
  let playerCol: number;
  if (s.mode === 'dribble' || s.mode === 'charging') {
    playerCol = Math.round(s.x) - 1;
    s._lastPlayerX = playerCol;
  } else {
    playerCol = s._lastPlayerX != null ? s._lastPlayerX : PLAYER_COL - 1;
  }
  playerCol = Math.max(2, Math.min(RIM_COL - 6, playerCol));

  if (s.mode !== 'shooting' || s.shotT < 8) {
    const px = playerCol;
    const headRow = FLOOR_ROW - 4;
    const bob = s.mode === 'dribble' ? Math.round(Math.abs(Math.sin(s.bouncePhase)) * 0.4) : 0;

    if (cells[headRow + bob]) cells[headRow + bob][px] = { ch: 'o', cls: 'player' };

    if (s.mode === 'shooting' || s.mode === 'charging') {
      if (cells[headRow + 1 + bob]) {
        cells[headRow + 1 + bob][px - 1] = { ch: '\\', cls: 'player' };
        cells[headRow + 1 + bob][px] = { ch: '|', cls: 'player' };
        cells[headRow + 1 + bob][px + 1] = { ch: '/', cls: 'player' };
      }
    } else {
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

  // ball
  const bx = Math.round(s.x);
  const by = Math.round(s.y);
  if (cells[by] && cells[by][bx]) {
    cells[by][bx] = { ch: '@', cls: 'ball' };
  }
  // ball trail when shooting
  if (s.mode === 'shooting' && s._startX !== undefined) {
    const trailSteps = 5;
    for (let i = 1; i <= trailSteps; i++) {
      const tt = Math.max(0, (s.shotT - i * 2) / (s._duration ?? 70));
      if (tt <= 0) continue;
      const peakY = Math.min(s._startY ?? 0, s._endY ?? 0) - 6;
      const tx = Math.round((s._startX ?? 0) + ((s._endX ?? 0) - (s._startX ?? 0)) * tt);
      const ty = Math.round(
        (1 - tt) ** 2 * (s._startY ?? 0) +
          2 * (1 - tt) * tt * peakY +
          tt ** 2 * (s._endY ?? 0)
      );
      if (cells[ty] && cells[ty][tx] && cells[ty][tx].ch === ' ') {
        cells[ty][tx] = { ch: '·', cls: 'trail' };
      }
    }
  }

  // result flash above the rim
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
      if (cell.ch === ' ') {
        out += ' ';
        continue;
      }
      const ch = escapeHtml(cell.ch);
      out += cell.cls ? `<span class="c-${cell.cls}">${ch}</span>` : ch;
    }
    out += '\n';
  }
  return out;
}

function escapeHtml(c: string): string {
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  if (c === '&') return '&amp;';
  return c;
}
