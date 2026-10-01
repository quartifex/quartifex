// Next.js App Router glue for @quartifex/spine, published as `@quartifex/spine/next`.
// next is an optional peer, needed only for this entry point.
import { usePathname, useSearchParams } from "next/navigation";
import { createElement, Suspense, useEffect } from "react";
import { useSpine } from "./react.js";

function Sync({ search }: { search: boolean }) {
  const spine = useSpine();
  const pathname = usePathname();
  const params = useSearchParams();
  const key = search ? `${pathname}?${params.toString()}` : pathname;
  useEffect(() => {
    spine?.route(key);
  }, [spine, key]);
  return null;
}

/**
 * Tell spine about App Router navigations. Put it inside <SpineProvider>, once. With
 * `search`, a change of query string counts as a new route too.
 */
export function SpineRouteSync({ search = false }: { search?: boolean }) {
  // useSearchParams needs a Suspense boundary in statically rendered routes.
  return createElement(Suspense, null, createElement(Sync, { search }));
}
