// avenue.quartifex.com. One page, three jobs: a playable demo of AVENUE in a 3D cabin, a product
// page for partners, and the system's documentation. The journey (hero, chapters, demo) runs
// over a sticky 3D stage at blue hour; fleets, the platform, research and documentation follow.
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Journey } from "@/components/Journey";
import { Motion } from "@/components/Motion";
import { Preloader } from "@/components/Preloader";
import { Providers } from "@/components/Providers";
import { RadioDock } from "@/components/RadioDock";
import { Demo } from "@/demo/Demo";
import { Docs } from "@/docs/Docs";
import { Collaborate } from "@/sections/Collaborate";
import { Features } from "@/sections/Features";
import { Fleet } from "@/sections/Fleet";
import { Platform } from "@/sections/Platform";
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
        <Fleet />
        <Platform />
        <Process />
        <Docs />
        <Collaborate />
      </main>
      <Footer />
      <RadioDock />
      <Motion />
    </Providers>
  );
}
