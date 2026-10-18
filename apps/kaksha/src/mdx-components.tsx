import type { MDXComponents } from "mdx/types";

// Docs are plain MDX. External links open normally; nothing here adds scripts.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // Code can scroll sideways, so it takes keyboard focus.
    // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable
    pre: (props) => <pre tabIndex={0} {...props} />,
    table: (props) => (
      // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be focusable
      <div className="docs__table" tabIndex={0}>
        <table {...props} />
      </div>
    ),
    ...components,
  };
}
