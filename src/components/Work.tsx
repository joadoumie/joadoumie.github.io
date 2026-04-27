import { useRef } from 'react';
import { useReveal } from '../hooks/useReveal';
import { PROJECTS } from '../data/projects';

export function Work() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <section id="work" className="shell">
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
