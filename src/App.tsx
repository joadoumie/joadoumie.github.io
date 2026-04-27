import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Monkeytype } from './components/Monkeytype';
import { Work } from './components/Work';
import { Contact } from './components/Contact';
import { useVimScroll } from './hooks/useVimScroll';

export default function App() {
  useVimScroll();
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Monkeytype />
        <Work />
        <Contact />
      </main>
    </>
  );
}
