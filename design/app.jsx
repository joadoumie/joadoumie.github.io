// Main app — composes hero / about / monkeytype / work / contact

const TWEAKS_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showCourtAnimation": true,
  "heroBioMode": "typewriter",
  "monkeytypeMode": "both",
  "accent": "#e2b714"
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAKS_DEFAULTS);

  // apply accent color live
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
  }, [tweaks.accent]);

  return (
    <>
      <Nav />
      <main>
        <Hero
          showCourt={tweaks.showCourtAnimation}
          bioMode={tweaks.heroBioMode}
        />
        <About />
        <Monkeytype mode={tweaks.monkeytypeMode} />
        <Work />
        <Contact />
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Hero">
          <TweakToggle
            label="Ambient ASCII court"
            value={tweaks.showCourtAnimation}
            onChange={(v) => setTweak('showCourtAnimation', v)}
          />
          <TweakRadio
            label="Bio reveal"
            value={tweaks.heroBioMode}
            options={[
              { value: 'typewriter', label: 'typewriter' },
              { value: 'fade', label: 'fade' },
              { value: 'instant', label: 'instant' },
            ]}
            onChange={(v) => setTweak('heroBioMode', v)}
          />
        </TweakSection>

        <TweakSection title="Monkeytype section">
          <TweakRadio
            label="Show"
            value={tweaks.monkeytypeMode}
            options={[
              { value: 'both', label: 'stats + test' },
              { value: 'stats', label: 'stats only' },
              { value: 'test', label: 'test only' },
            ]}
            onChange={(v) => setTweak('monkeytypeMode', v)}
          />
        </TweakSection>

        <TweakSection title="Color">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            onChange={(v) => setTweak('accent', v)}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {['#e2b714', '#ee6c2a', '#7c5cff', '#3ddc97', '#ff4d6d', '#e8e8e8'].map((c) => (
              <button
                key={c}
                onClick={() => setTweak('accent', c)}
                style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: c, border: tweaks.accent === c ? '2px solid #fff' : '1px solid #444',
                  cursor: 'pointer', padding: 0,
                }}
                aria-label={c}
              />
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function Nav() {
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={'nav' + (scrolled ? ' scrolled' : '')} data-screen-label="Nav">
      <div className="shell nav-inner">
        <div className="nav-mark">
          <span>jordi.adoumie</span>
          <span className="caret blink">_</span>
        </div>
        <div className="nav-links">
          <a href="#about"><span className="num">01</span>about</a>
          <a href="#type"><span className="num">02</span>type</a>
          <a href="#work"><span className="num">03</span>work</a>
          <a href="#contact"><span className="num">04</span>contact</a>
        </div>
      </div>
    </nav>
  );
}

/* ---- HERO ---- */

const HERO_BIO = `i build software, ship side projects, and write about \
both. currently a pm at bloomberg working on bquant — coding agents, \
devex, and the messy seam between humans and llms. previously @microsoft.`;

const HERO_META_LINES = [
  { k: 'now playing', v: 'oh-my-posh nba integration' },
  { k: 'open source', v: 'github.com/joadoumie' },
  { k: 'top speed', v: '129 wpm · 99% acc' },
];

function Hero({ showCourt, bioMode }) {
  const nameRef = React.useRef(null);
  const eyebrowRef = React.useRef(null);
  const roleRef = React.useRef(null);
  const bioRef = React.useRef(null);
  const hintRef = React.useRef(null);

  // animate name characters in on mount
  React.useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const chars = el.querySelectorAll('.char');
    chars.forEach((c, i) => {
      setTimeout(() => {
        c.style.transition = 'opacity 600ms ease, transform 600ms cubic-bezier(.2,.7,.3,1)';
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      }, 200 + i * 32);
    });
    setTimeout(() => {
      if (eyebrowRef.current) {
        eyebrowRef.current.style.transition = 'opacity 600ms ease, transform 600ms ease';
        eyebrowRef.current.style.opacity = '1';
        eyebrowRef.current.style.transform = 'translateY(0)';
      }
    }, 80);
    setTimeout(() => {
      if (roleRef.current) {
        roleRef.current.style.transition = 'opacity 600ms ease, transform 600ms ease';
        roleRef.current.style.opacity = '1';
        roleRef.current.style.transform = 'translateY(0)';
      }
    }, 200 + chars.length * 32 + 200);
    setTimeout(() => {
      if (hintRef.current) {
        hintRef.current.style.transition = 'opacity 800ms ease';
        hintRef.current.style.opacity = '1';
      }
    }, 1800);
  }, []);

  // bio: typewriter / fade / instant
  const [bioTyped, setBioTyped] = React.useState(bioMode === 'typewriter' ? '' : HERO_BIO);
  const [bioDone, setBioDone] = React.useState(bioMode !== 'typewriter');
  React.useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    el.style.transition = 'opacity 700ms ease';
    if (bioMode === 'instant') {
      setBioTyped(HERO_BIO); setBioDone(true);
      el.style.opacity = '1';
      return;
    }
    if (bioMode === 'fade') {
      setBioTyped(HERO_BIO); setBioDone(true);
      setTimeout(() => { el.style.opacity = '1'; }, 1200);
      return;
    }
    // typewriter at ~129 wpm → ~645 cpm → ~93ms per char... too slow
    // monkeytype 129wpm = 645 chars/min = ~10.75 cps → 93ms/char.
    // we'll use 50ms for snappiness, but show "typed at 129 wpm" caption.
    setBioTyped(''); setBioDone(false);
    setTimeout(() => { el.style.opacity = '1'; }, 1100);
    let i = 0;
    const start = setTimeout(function tick() {
      i++;
      setBioTyped(HERO_BIO.slice(0, i));
      if (i < HERO_BIO.length) {
        const next = setTimeout(tick, 38 + Math.random() * 30);
        return next;
      } else {
        setBioDone(true);
      }
    }, 1300);
    return () => clearTimeout(start);
  }, [bioMode]);

  const nameChars = 'jordi adoumie'.split('');

  return (
    <section className="hero shell" data-screen-label="Hero">
      <div className="hero-grid">
        <div>
          <div className="hero-eyebrow" ref={eyebrowRef}>
            <span className="dot"></span>
            <span>~/jordi $ whoami</span>
          </div>
          <h1 className="hero-name" ref={nameRef}>
            {nameChars.map((c, i) => (
              <span key={i} className="char">{c === ' ' ? '\u00A0' : c}</span>
            ))}
            <span className="char accent">.</span>
          </h1>
          <div className="hero-role" ref={roleRef}>
            product manager <span className="sep">/</span> open-source builder <span className="sep">/</span>
            <span className="at"> @bloomberg · bquant</span>
          </div>
          <div className="hero-bio" ref={bioRef}>
            {bioTyped}
            {!bioDone && <span className="cursor"></span>}
            {bioDone && (
              <span className="typed-meta">
                ↑ typed at <b>129 wpm</b> · this is what that feels like
              </span>
            )}
          </div>
        </div>
        {showCourt && <AsciiCourt />}
      </div>
      <div className="scroll-hint" ref={hintRef}>
        <span className="arrow">↓</span> scroll · or press <kbd style={{ color: 'var(--fg)' }}>j</kbd>
      </div>
    </section>
  );
}

/* ---- ABOUT ---- */

function About() {
  const ref = React.useRef(null);
  useReveal(ref);
  return (
    <section id="about" className="shell" data-screen-label="About">
      <div className="section-label">
        <span className="num">01</span><span>/ about</span><span className="dash"></span>
      </div>
      <div className="about-grid fade-in" ref={ref}>
        <div className="about-prose">
          <p>
            i'm a <span className="accent">product manager</span> at bloomberg, working on
            <span className="accent"> bquant</span> — coding agents, developer experience, and the
            place where llms meet real engineering work. before that i was a pm at microsoft.
          </p>
          <p>
            outside of work i write <span className="accent">open-source software</span>, post
            videos about tooling and tech, and write a blog called <span className="accent">jordi rants</span>.
            i think the best products feel like instruments — quiet, fast, predictable, with
            depth that rewards practice.
          </p>
          <p className="mute">
            also: a basketball obsessive. there are worse personality traits.
          </p>
        </div>
        <div className="statline">
          <div className="row"><span className="k">role</span><span className="v">pm · <span className="accent">bquant @ bloomberg</span></span></div>
          <div className="row"><span className="k">prev</span><span className="v">pm · microsoft</span></div>
          <div className="row"><span className="k">focus</span><span className="v">devex · agentic ai</span></div>
          <div className="row"><span className="k">writes</span><span className="v">jordi rants</span></div>
          <div className="row"><span className="k">ships</span><span className="v">side projects, weekly-ish</span></div>
          <div className="row"><span className="k">team</span><span className="v">warriors · til the end</span></div>
        </div>
      </div>
    </section>
  );
}

/* ---- MONKEYTYPE ---- */

function Monkeytype({ mode }) {
  const ref = React.useRef(null);
  useReveal(ref);
  return (
    <section id="type" className="shell" data-screen-label="Type">
      <div className="section-label">
        <span className="num">02</span><span>/ type</span><span className="dash"></span>
        <span style={{ color: 'var(--fg-mute)' }}>monkeytype.com/profile/joadoumie</span>
      </div>
      <div className="fade-in" ref={ref}>
        {(mode === 'stats' || mode === 'both') && <StatsCard />}
        {(mode === 'test' || mode === 'both') && <MonkeytypeTest duration={15} />}
      </div>
    </section>
  );
}

function StatsCard() {
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
        <div className="row"><span className="k">consistency</span><span className="v">83%</span></div>
        <div className="row"><span className="k">raw</span><span className="v">129</span></div>
        <div className="row"><span className="k">characters</span><span className="v">323 / 0 / 0 / 0</span></div>
        <div className="row"><span className="k">date</span><span className="v">personal best</span></div>
        <div className="row"><span className="k">handle</span><span className="v" style={{ color: 'var(--accent)' }}>joadoumie</span></div>
      </div>
    </div>
  );
}

/* ---- WORK / git log ---- */

const PROJECTS = [
  {
    glyph: '●',
    hash: 'a4f1c20',
    title: 'oh-my-posh · nba integration',
    desc: 'live nba scores in your terminal prompt. a small custom segment for the oh-my-posh prompt engine that pulls the current/most recent game for your team and renders it inline.',
    tags: ['go', 'oss', 'cli'],
    href: 'https://github.com/joadoumie',
  },
  {
    glyph: '●',
    hash: '7e2b9af',
    title: 'nba cmdpal · windows command palette',
    desc: 'an extension for the windows command palette that surfaces nba scores, schedules, and standings without leaving your keyboard. shipped on the microsoft store.',
    tags: ['c#', 'windows', 'shipped'],
    href: 'https://apps.microsoft.com/detail/9p7xvwkzs7s2',
  },
  {
    glyph: '●',
    hash: '3c8d5e1',
    title: 'jordi rants · the blog',
    desc: 'long-form notes on tools, workflows, agentic ai, and the occasional basketball metaphor. no newsletter, no popups, just words on a page.',
    tags: ['writing'],
    href: 'https://joadoumie.github.io/jordi-rants/',
  },
  {
    glyph: '●',
    hash: '0b9e44d',
    title: 'youtube · jordi adoumie',
    desc: 'videos about software engineering, devex, and the tools i use to work. less tutorial, more shop talk.',
    tags: ['video'],
    href: 'https://www.youtube.com/@jordiadoumie1919',
  },
];

function Work() {
  const ref = React.useRef(null);
  useReveal(ref);
  return (
    <section id="work" className="shell" data-screen-label="Work">
      <div className="section-label">
        <span className="num">03</span><span>/ work</span><span className="dash"></span>
        <span style={{ color: 'var(--fg-mute)' }}>git log --oneline --no-merges</span>
      </div>
      <div className="gitlog fade-in" ref={ref}>
        {PROJECTS.map((p) => (
          <a className="commit" key={p.hash} href={p.href} target="_blank" rel="noreferrer">
            <span className="glyph">{p.glyph}</span>
            <span className="hash">{p.hash}</span>
            <div className="body">
              <div className="title">{p.title}</div>
              <div className="desc">{p.desc}</div>
            </div>
            <div className="meta">
              {p.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
              <span className="arrow">→</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ---- CONTACT ---- */

function Contact() {
  const ref = React.useRef(null);
  useReveal(ref);
  return (
    <section id="contact" className="shell contact" data-screen-label="Contact">
      <div className="contact-grid fade-in" ref={ref}>
        <div>
          <h2>let's <span className="accent">talk shop.</span></h2>
          <div className="sub">
            i like talking about devex, agents, side projects, basketball, and where the
            three intersect. inbox is always open.
          </div>
        </div>
        <div className="contact-links">
          <a href="https://github.com/joadoumie" target="_blank" rel="noreferrer">
            <span className="lbl">github</span><span>joadoumie</span><span className="arr">↗</span>
          </a>
          <a href="https://www.youtube.com/@jordiadoumie1919" target="_blank" rel="noreferrer">
            <span className="lbl">youtube</span><span>@jordiadoumie1919</span><span className="arr">↗</span>
          </a>
          <a href="https://joadoumie.github.io/jordi-rants/" target="_blank" rel="noreferrer">
            <span className="lbl">blog</span><span>jordi rants</span><span className="arr">↗</span>
          </a>
          <a href="https://apps.microsoft.com/detail/9p7xvwkzs7s2" target="_blank" rel="noreferrer">
            <span className="lbl">ms store</span><span>nba cmdpal</span><span className="arr">↗</span>
          </a>
        </div>
      </div>
      <div className="colophon">
        <span>© {new Date().getFullYear()} jordi adoumie</span>
        <span>built with care · jetbrains mono · monkeytype amber</span>
      </div>
    </section>
  );
}

/* ---- helpers ---- */

function useReveal(ref, threshold = 0.15) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          el.classList.add('in');
          io.unobserve(el);
        }
      });
    }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
