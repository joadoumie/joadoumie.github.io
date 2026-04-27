import { useRef } from 'react';
import { useReveal } from '../hooks/useReveal';
import { StatsCard } from './StatsCard';
import { TypingTest } from './TypingTest';

export function Monkeytype() {
  const ref = useRef<HTMLDivElement>(null);
  useReveal(ref);
  return (
    <section id="type" className="shell">
      <div className="section-label">
        <span className="num">02</span><span>/ type</span><span className="dash"></span>
        <span style={{ color: 'var(--fg-mute)' }}>monkeytype.com/profile/joadoumie</span>
      </div>
      <div className="fade-in" ref={ref}>
        <StatsCard />
        <TypingTest duration={15} />
      </div>
    </section>
  );
}
