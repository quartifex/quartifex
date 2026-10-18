/// <reference lib="webworker" />
// The service worker for /app. It precaches the app shell, its code, fonts and icons
// on first visit, then serves them from the phone, so the app opens with no network.
// It never sends anything anywhere: there is no runtime caching of other origins.
import { type PrecacheEntry, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: Array<PrecacheEntry | string> };

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // /app?demo=1, /app?lang=hi and /app#/class/... are all the same shell.
    ignoreURLParametersMatching: [/.*/],
    cleanupOutdatedCaches: true,
    navigateFallback: "/app",
    navigateFallbackAllowlist: [/^\/app(?:$|[?#/])/],
  },
  // A new version waits until every open copy of the app is closed, so a session in
  // progress never loses the code it is running.
  skipWaiting: false,
  clientsClaim: false,
  navigationPreload: false,
});

serwist.addEventListeners();
