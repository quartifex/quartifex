/** Where a chosen theme is remembered (shared with quartifex.com). */
export const THEME_KEY = "qx-theme";

/**
 * Runs in <head> before anything is painted.
 * - Theme: the Lab is dark on a first visit; only a saved "light" choice makes it light.
 * - Surface: depth is the shipped look. Brand: the Lab's teal accent and LAB lockup.
 * - Touch: set when the device cannot hover, so hover-only effects stay off.
 */
export const BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var q=new URLSearchParams(location.search);if(q.get("from")==="qx"){sessionStorage.setItem("qx-pl","1");var tq=q.get("t");if(tq==="dark"||tq==="light")localStorage.setItem("${THEME_KEY}",tq);d.classList.add("qx-in");q.delete("from");q.delete("t");var qs=q.toString();history.replaceState(null,"",location.pathname+(qs?"?"+qs:"")+location.hash)}}catch(e){}d.dataset.surface="depth";d.dataset.brand="lab";var t="dark";try{if(localStorage.getItem("${THEME_KEY}")==="light")t="light"}catch(e){}d.dataset.theme=t;try{if(matchMedia("(hover:none)").matches)d.dataset.touch=""}catch(e){}try{if(sessionStorage.getItem("qx-pl")||/[?&#]nopre/.test(location.href))d.dataset.pl="off"}catch(e){}})();`;
