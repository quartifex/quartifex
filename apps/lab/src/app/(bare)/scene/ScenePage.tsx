"use client";

import { usePlumb } from "@quartifex/plumb/react";
import { useSearchParams } from "next/navigation";
import { SceneView } from "@/scene/SceneView";
import styles from "./scene.module.css";

export function ScenePage() {
  const params = useSearchParams();
  const viewport = usePlumb();
  const mode = params.get("mode") === "center" ? "center" : "safeframe";
  const prop = params.get("prop") === "watch" ? "watch" : "jar";
  const t = Number(params.get("t") ?? 0.1);
  const dprParam = Number(params.get("dpr"));

  return (
    <main className={styles.page}>
      <section data-chapter="hero" className={styles.hero}>
        {viewport && (
          <SceneView
            prop={prop}
            width={viewport.width}
            height={viewport.height}
            dpr={dprParam > 0 ? dprParam : viewport.dpr}
            mode={mode}
            progress={Number.isFinite(t) ? t : 0.1}
            interactive
          />
        )}
      </section>
      <section data-chapter="specs" className={styles.specs}>
        <p className={styles.kicker}>Concept visual · invented product</p>
        <h1>Specs</h1>
        <p>
          A procedural test scene. The {prop} and its ground are drawn in code; nothing here is a
          real product.
        </p>
        <a href="/safeframe" className={styles.link}>
          How it is staged
        </a>
      </section>
    </main>
  );
}
