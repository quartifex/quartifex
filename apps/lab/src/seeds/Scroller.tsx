import type { ReactNode, Ref } from "react";
import styles from "./seed.module.css";

/**
 * The page inside a seed's stage that scrolls on its own. It takes focus so the arrow keys,
 * Page Down and Space scroll it as well as a wheel or a finger.
 */
export function Scroller({
  ref,
  label,
  testid,
  children,
}: {
  ref: Ref<HTMLDivElement>;
  label: string;
  testid?: string;
  children: ReactNode;
}) {
  return (
    <section
      ref={ref}
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable to be scrolled by keyboard
      tabIndex={0}
      className={styles.scroller}
      data-testid={testid}
    >
      {children}
    </section>
  );
}
