import { useEffect, useRef, useState } from 'react';
import { HERO_BIO } from '../data/bio';
import { AsciiCourt } from './AsciiCourt';

const FIRST_NAME = 'jordi';
const LAST_NAME = 'adoumie';

export function Hero() {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);

  // animate name characters in on mount
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const chars = el.querySelectorAll<HTMLSpanElement>('.char');
    chars.forEach((c, i) => {
      window.setTimeout(() => {
        c.style.transition = 'opacity 600ms ease, transform 600ms cubic-bezier(.2,.7,.3,1)';
        c.style.opacity = '1';
        c.style.transform = 'translateY(0)';
      }, 200 + i * 32);
    });
    window.setTimeout(() => {
      if (eyebrowRef.current) {
        eyebrowRef.current.style.transition = 'opacity 600ms ease, transform 600ms ease';
        eyebrowRef.current.style.opacity = '1';
        eyebrowRef.current.style.transform = 'translateY(0)';
      }
    }, 80);
    window.setTimeout(() => {
      if (roleRef.current) {
        roleRef.current.style.transition = 'opacity 600ms ease, transform 600ms ease';
        roleRef.current.style.opacity = '1';
        roleRef.current.style.transform = 'translateY(0)';
      }
    }, 200 + chars.length * 32 + 200);
    window.setTimeout(() => {
      if (hintRef.current) {
        hintRef.current.style.transition = 'opacity 800ms ease';
        hintRef.current.style.opacity = '1';
      }
    }, 1800);
  }, []);

  // bio: typewriter
  const [bioTyped, setBioTyped] = useState('');
  const [bioDone, setBioDone] = useState(false);
  useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    el.style.transition = 'opacity 700ms ease';
    setBioTyped('');
    setBioDone(false);
    const fadeIn = window.setTimeout(() => {
      el.style.opacity = '1';
    }, 1100);
    let i = 0;
    let nextTimer: number | undefined;
    const start = window.setTimeout(function tick() {
      i++;
      setBioTyped(HERO_BIO.slice(0, i));
      if (i < HERO_BIO.length) {
        nextTimer = window.setTimeout(tick, 38 + Math.random() * 30);
      } else {
        setBioDone(true);
      }
    }, 1300);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(fadeIn);
      if (nextTimer) window.clearTimeout(nextTimer);
    };
  }, []);

  return (
    <section className="hero shell">
      <div className="hero-grid">
        <div>
          <div className="hero-eyebrow" ref={eyebrowRef}>
            <span className="dot"></span>
            <span>~/jordi $ whoami</span>
          </div>
          <h1 className="hero-name" ref={nameRef}>
            <span className="word">
              {FIRST_NAME.split('').map((c, i) => (
                <span key={`f${i}`} className="char">{c}</span>
              ))}
            </span>
            {' '}
            <span className="word">
              {LAST_NAME.split('').map((c, i) => (
                <span key={`l${i}`} className="char">{c}</span>
              ))}
              <span className="char accent">.</span>
            </span>
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
        <AsciiCourt />
      </div>
      <div className="scroll-hint" ref={hintRef}>
        <span className="arrow">↓</span> scroll · or press{' '}
        <kbd style={{ color: 'var(--fg)' }}>j</kbd>/<kbd style={{ color: 'var(--fg)' }}>k</kbd>
      </div>
    </section>
  );
}
