// avenue (S20): avenue.quartifex.com. One page, three jobs: a playable demo of AVENUE in a 3D
// cabin, a product page for partners, and the system's documentation.
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Journey } from "@/components/Journey";
import { Preloader } from "@/components/Preloader";
import { Providers } from "@/components/Providers";
import { Demo } from "@/demo/Demo";
import { Docs } from "@/docs/Docs";
import { Collaborate } from "@/sections/Collaborate";
import { Process } from "@/sections/Process";
import { Cabin, Hero, Problem } from "@/sections/Story";
import { posterSvg } from "@/stage/poster";
import { Stage } from "@/stage/Stage";

export default function Home() {
  // Drawn on the server from the car's geometry: the first paint, before any script.
  const poster = posterSvg({ width: 1600, height: 900, id: "hero" }).replace(
    'preserveAspectRatio="xMidYMid slice"',
    'preserveAspectRatio="xMidYMid meet"',
  );
  return (
    <Providers>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <noscript>
        <style>{"[data-preloader]{display:none}"}</style>
      </noscript>
      <div data-preloader>
        <Preloader />
      </div>
      <Header />
      <main id="main">
        <span id="top" />
        <Journey>
          <Stage poster={poster} />
          <Hero />
          <Problem />
          <Cabin />
          <Demo />
        </Journey>
        <Process />
        <Docs />
        <Collaborate />
      </main>
      <Footer />
    </Providers>
  );
}
