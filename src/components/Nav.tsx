import { useEffect, useState } from 'react';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={'nav' + (scrolled ? ' scrolled' : '')}>
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
