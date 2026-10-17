// avenue.quartifex.com. One page, three jobs: a playable demo of AVENUE in a 3D cabin, a product
// page for partners, and the system's documentation. The journey (hero, chapters, demo) runs
// over a sticky 3D stage at night; research and documentation follow in the Day theme.
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Journey } from "@/components/Journey";
import { Preloader } from "@/components/Preloader";
import { Providers } from "@/components/Providers";
import { Demo } from "@/demo/Demo";
import { Docs } from "@/docs/Docs";
import { Collaborate } from "@/sections/Collaborate";
import { Features } from "@/sections/Features";
import { Process } from "@/sections/Process";
import { Cabin, Hero, Problem } from "@/sections/Story";
import { Stage } from "@/stage/Stage";

export default function Home() {
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
          <Stage />
          <Hero />
          <Problem />
          <Cabin />
          <Features />
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
