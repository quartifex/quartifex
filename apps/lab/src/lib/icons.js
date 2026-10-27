/* Kit icon set (24 grid, 1.75 stroke). Raw copy; animation hooks are .i-<name> rules in kit.css. */
export const ICONS = {
  arrow: '<g class="mv"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></g>',
  arrowur: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
  calendar:
    '<rect x="3.5" y="5" width="17" height="15.5" rx="3.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path class="tick" d="M9 15.2l2 2 4-4"/>',
  message:
    '<path d="M4 20l1.2-4A8 8 0 1 1 8 18.8z"/><path class="dot" d="M9 12h.01"/><path class="dot" d="M12 12h.01"/><path class="dot" d="M15 12h.01"/>',
  share:
    '<g class="up"><path d="M12 15V4"/><path d="M8 7.5l4-4 4 4"/></g><path d="M5 12v5.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V12"/>',
  heart:
    '<path d="M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  copy: '<rect class="b" x="8.5" y="8.5" width="11" height="11" rx="3"/><path class="a" d="M15.5 8.5V7A3 3 0 0 0 12.5 4H7A3 3 0 0 0 4 7v5.5A3 3 0 0 0 7 15.5h1.5"/>',
  check: '<path class="ck" d="M5 12.5l4.5 4.5L19 7.5"/>',
  search: '<g class="h"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></g>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/><path class="sl" d="M4 4l16 16"/>',
  home: '<path class="roof" d="M3.5 11.5L12 4.5l8.5 7"/><path d="M5.5 10v8.5A1.5 1.5 0 0 0 7 20h3v-5h4v5h3a1.5 1.5 0 0 0 1.5-1.5V10"/>',
  work: '<rect x="3.5" y="8.5" width="17" height="11" rx="3"/><g class="lid"><path d="M9 8.5V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5"/></g><path d="M3.5 13.5h17"/>',
  sparkle:
    '<g class="sp"><path d="M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2L5 10.5l5.2-1.8z"/></g><path d="M18.5 16.5v3M17 18h3" opacity=".7"/>',
  flask:
    '<g class="flk"><path d="M9.5 3.5h5M10.5 3.5v6L5 18.5A1.8 1.8 0 0 0 6.6 21h10.8a1.8 1.8 0 0 0 1.6-2.5l-5.5-9v-6"/><path d="M7.6 15.5h8.8"/></g><circle class="bub" cx="11.5" cy="13" r=".9"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path class="flap" d="M4.5 8l7.5 5.5L19.5 8"/>',
  grid: '<rect class="g1" x="4" y="4" width="6.5" height="6.5" rx="2"/><rect class="g2" x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect class="g3" x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect class="g4" x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  more: '<path d="M12 5v14M5 12h14"/>',
  cog: '<g class="cg"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.4" stroke-dasharray="3.1 2.7"/></g>',
  vol: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path class="w1" d="M15.4 9.3a4 4 0 0 1 0 5.4"/><path class="w2" d="M18 6.8a7.5 7.5 0 0 1 0 10.4"/>',
  music:
    '<g class="nt"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></g>',
  cursor: '<path d="M5 4l13 5.6-5.4 1.9L10.5 17z"/>',
  motion: '<path d="M2.5 12c2-5 4-5 6 0s4 5 6 0 3-4 4.5-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><g class="rays"><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></g>',
  moon: '<path class="mn" d="M20 14.6A8.4 8.4 0 0 1 9.4 4 8.4 8.4 0 1 0 20 14.6z"/>',
  star: '<path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.2l-4.8 2.7 1-5.4-4-3.8 5.4-.7z"/>',
  bolt: '<path d="M13 3.5L6 13.5h5l-1 7 7-10h-5z"/>',
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
  prev: '<path d="M18 6v12l-8-6z"/><path d="M6 6v12"/>',
  next: '<path d="M6 6v12l8-6z"/><path d="M18 6v12"/>',
  shuffle:
    '<path d="M3.5 7.5h3c3.5 0 5 9 8.5 9h5"/><path d="M3.5 16.5h3c1.4 0 2.4-1.6 3.3-3.4"/><path d="M13.6 8.6c.6-.7 1.3-1.1 2.2-1.1h4.2"/><path d="M17.5 4.8l2.7 2.7-2.7 2.7"/><path d="M17.5 13.8l2.7 2.7-2.7 2.7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  spinner: '<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5"/>',
};
Object.assign(ICONS, {
  chevl: '<path d="M15 5l-7 7 7 7"/>',
  chevr: '<path d="M9 5l7 7-7 7"/>',
  chevu: '<path d="M5 15l7-7 7 7"/>',
  chevd: '<path d="M5 9l7 7 7-7"/>',
  arrowl: '<g class="mv"><path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/></g>',
  download: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  expand: '<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>',
  quote:
    '<path d="M9 7H5.5A1.5 1.5 0 004 8.5V13a1.5 1.5 0 001.5 1.5H8V16a3 3 0 01-3 3"/><path d="M20 7h-3.5A1.5 1.5 0 0015 8.5V13a1.5 1.5 0 001.5 1.5H19V16a3 3 0 01-3 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  compress:
    '<path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4.5v4h4"/>',
  cc: '<rect x="3" y="5.5" width="18" height="13" rx="3.5"/><path d="M10.2 10.2a2.4 2.4 0 1 0 0 3.6"/><path d="M17 10.2a2.4 2.4 0 1 0 0 3.6"/>',
  sliders:
    '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  upload: '<path d="M12 16V5"/><path d="M7 9l5-5 5 5"/><path d="M5 20h14"/>',
  sidebar: '<rect x="3.5" y="4.5" width="17" height="15" rx="3.5"/><path d="M9.5 4.5v15"/>',
});

export const iconSvg = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
