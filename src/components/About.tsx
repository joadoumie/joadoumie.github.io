import { useRef } from 'react';
import { useReveal } from '../hooks/useReveal';

export function About() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <section id="about" className="shell">
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
