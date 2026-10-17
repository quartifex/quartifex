// Components available to every MDX file in content/docs, by name. Nitesh edits the prose;
// the blocks render from the product's own sources.
import type { MDXComponents } from "mdx/types";
import { DOC_BLOCKS } from "@/docs/blocks";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...DOC_BLOCKS, ...components };
}
