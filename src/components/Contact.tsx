import { useRef } from 'react';
import { useReveal } from '../hooks/useReveal';

export function Contact() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <section id="contact" className="shell contact">
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
