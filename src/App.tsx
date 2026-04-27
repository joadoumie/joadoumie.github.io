import { Nav } from './components/Nav';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Monkeytype } from './components/Monkeytype';
import { Work } from './components/Work';
import { Contact } from './components/Contact';

export default function App() {
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
