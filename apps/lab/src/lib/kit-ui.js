import { iconSvg } from "./icons.js";

let booted = false;

/** The kit's sound engine, settings panel and custom cursor, ported as one unit. Call once after mount. */
export function initKitUi() {
  if (booted) return null;
  booted = true;
  const root = document.documentElement;
  let reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const svg = iconSvg;
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.prototype.slice.call((c || document).querySelectorAll(s));
  const hydrate = (c) => {
    for (const el of $$("[data-i]", c)) {
      el.classList.add("i-" + el.dataset.i);
      el.innerHTML = iconSvg(el.dataset.i);
      if (el.dataset.i === "spinner") el.classList.add("spin");
    }
  };
  // kit-only demo hooks this site does not use
  const logos = [];
  const setSeg = () => {};
  const nav = null;
  const BM = {};
  const bmRender = () => {};
  const ndPlay = () => {};
  const closeSearch = () => {};
  /* ---------- settings state ---------- */
  var mqR = matchMedia("(prefers-reduced-motion: reduce)");
  var S = {
    theme: "light",
    sfx: true,
    music: true,
    vSfx: 0.6,
    vMus: 0.4,
    cursor: true,
    motion: false,
    track: 0,
    auto: true,
    shuffle: false,
  };
  var KEYS = [
    "theme",
    "sfx",
    "music",
    "vSfx",
    "vMus",
    "cursor",
    "motion",
    "track",
    "auto",
    "shuffle",
  ];
  /* settings are also kept in a cookie on .quartifex.com so the site and the Lab share them */
  function readCk() {
    try {
      var m = document.cookie.match(/(?:^|; )qx-ui3=([^;]*)/);
      return m ? JSON.parse(decodeURIComponent(m[1])) : null;
    } catch (e) {
      return null;
    }
  }
  (() => {
    try {
      var j = readCk() || JSON.parse(localStorage.getItem("qx-ui3") || "null");
      if (j)
        KEYS.forEach((k) => {
          if (k in j) S[k] = j[k];
        });
    } catch (e) {}
  })();
  function store() {
    try {
      var v = JSON.stringify(S);
      localStorage.setItem("qx-ui3", v);
      if (/(^|\.)quartifex\.com$/.test(location.hostname)) document.cookie = "qx-ui3=" + encodeURIComponent(v) + ";domain=.quartifex.com;path=/;max-age=31536000;samesite=lax;secure";
    } catch (e) {}
  }

  /* ---------- sound: synthesised cues and an ambient loop ---------- */
  var AC = null,
    bus = {},
    noiseBuf = null,
    unlocked = false;
  function ac() {
    try {
      if (!AC) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        AC = new C();
        var comp = AC.createDynamicsCompressor();
        comp.connect(AC.destination);
        bus.sfx = AC.createGain();
        bus.mus = AC.createGain();
        bus.sfx.connect(comp);
        bus.mus.connect(comp);
        bus.sfx.gain.value = S.vSfx;
        bus.mus.gain.value = 0;
        bus.dl = AC.createDelay(1);
        bus.dl.delayTime.value = 0.43;
        var fb = AC.createGain();
        fb.gain.value = 0.38;
        bus.dl.connect(fb);
        fb.connect(bus.dl);
        bus.dl.connect(bus.mus);
        bus.an = AC.createAnalyser();
        bus.an.fftSize = 512;
        bus.an.smoothingTimeConstant = 0.82;
        bus.mus.connect(bus.an);
      }
      if (AC.state === "suspended") AC.resume();
      return AC;
    } catch (e) {
      return null;
    }
  }
  function withAC(fn) {
    var a = ac();
    if (!a) return;
    if (a.state === "running") fn();
    else
      a.resume().then(
        () => {
          if (a.state === "running") fn();
        },
        () => {},
      );
  }
  function tone(f, t, d, type, v, slide, dest, send) {
    var o = AC.createOscillator(),
      g = AC.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    g.connect(dest || bus.sfx);
    if (send) g.connect(bus.dl);
    o.start(t);
    o.stop(t + d + 0.03);
  }
  function noise(t, d, f0, f1, v) {
    if (!noiseBuf) {
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.6, AC.sampleRate);
      var a = noiseBuf.getChannelData(0);
      for (var i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    var s = AC.createBufferSource(),
      bp = AC.createBiquadFilter(),
      g = AC.createGain();
    s.buffer = noiseBuf;
    bp.type = "bandpass";
    bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + d * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(bp);
    bp.connect(g);
    g.connect(bus.sfx);
    s.start(t);
    s.stop(t + d + 0.02);
  }
  var PENT = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  var CUES = {
    hover: (t) => {
      tone(2300, t, 0.03, "sine", 0.03);
    },
    press: (t) => {
      tone(380, t, 0.09, "sine", 0.16, 250);
    },
    on: (t) => {
      tone(620, t, 0.1, "sine", 0.14);
      tone(930, t + 0.07, 0.15, "sine", 0.12);
    },
    off: (t) => {
      tone(900, t, 0.09, "sine", 0.12);
      tone(600, t + 0.07, 0.14, "sine", 0.1);
    },
    pop: (t) => {
      tone(520, t, 0.13, "sine", 0.14, 830);
    },
    open: (t) => {
      noise(t, 0.28, 500, 2400, 0.08);
    },
    close: (t) => {
      noise(t, 0.22, 2200, 450, 0.06);
    },
    ok: (t) => {
      [0, 2, 4].forEach((i, k) => {
        tone(PENT[i], t + k * 0.06, 0.24, "triangle", 0.1);
      });
    },
    like: (t) => {
      tone(784, t, 0.1, "sine", 0.12);
      tone(1175, t + 0.08, 0.22, "sine", 0.12);
    },
    tab: (t, i) => {
      tone(PENT[(i || 0) % PENT.length], t, 0.2, "triangle", 0.12);
    },
    error: (t) => {
      tone(200, t, 0.2, "sawtooth", 0.06, 150);
    },
  };
  var lastHover = 0;
  function sfx(name, arg, force) {
    if (!S.sfx && !force) return;
    if (name === "hover") {
      if (reduce || root.hasAttribute("data-touch") || !unlocked) return;
      var n = performance.now();
      if (n - lastHover < 70) return;
      lastHover = n;
      if (!AC || AC.state !== "running") return;
    }
    withAC(() => {
      try {
        CUES[name](AC.currentTime + 0.005, arg);
      } catch (e) {}
    });
  }

  /* ---------- music: four generative tracks, one player ---------- */
  var TRACKS = [
    {
      n: "Drift",
      d: "Slow pads and sparse plucks",
      ch: [
        [220, 261.63, 329.63, 392],
        [174.61, 220, 261.63, 329.63],
        [261.63, 329.63, 392, 493.88],
        [196, 246.94, 293.66, 392],
      ],
      step: 8000,
      len: 4,
      pl: 4,
      plv: 0.05,
      att: 3,
      dec: 8.6,
    },
    {
      n: "Glow",
      d: "Warm, a little brighter",
      ch: [
        [261.63, 329.63, 392, 523.25],
        [220, 277.18, 329.63, 440],
        [233.08, 293.66, 349.23, 466.16],
        [196, 261.63, 329.63, 392],
      ],
      step: 7000,
      len: 4,
      pl: 5,
      plv: 0.045,
      att: 2.4,
      dec: 7.6,
      wave: "triangle",
    },
    {
      n: "Tide",
      d: "Low and rolling",
      ch: [
        [130.81, 196, 261.63, 329.63],
        [116.54, 174.61, 233.08, 293.66],
        [155.56, 196, 233.08, 311.13],
        [146.83, 220, 293.66, 349.23],
      ],
      step: 9000,
      len: 4,
      pl: 3,
      plv: 0.05,
      att: 4,
      dec: 9.6,
      low: true,
    },
    {
      n: "Pulse",
      d: "Gentle arpeggios",
      ch: [
        [220, 261.63, 329.63, 440],
        [196, 246.94, 293.66, 392],
        [174.61, 220, 261.63, 349.23],
        [196, 246.94, 329.63, 392],
      ],
      step: 6400,
      len: 4,
      pl: 0,
      plv: 0.05,
      att: 1.4,
      dec: 6.4,
      arp: { ms: 400, n: 12 },
    },
  ];
  var mOn = false,
    run = null,
    viz = 0;
  function later(r, fn, ms) {
    r.timers.push(
      setTimeout(() => {
        if (r.alive) fn();
      }, ms),
    );
  }
  function chord(r, T, i, t) {
    T.ch[i % T.ch.length].forEach((f, k) => {
      [0.996, 1.004].forEach((dt) => {
        var o = AC.createOscillator(),
          g = AC.createGain(),
          lp = AC.createBiquadFilter();
        o.type = k % 2 ? "triangle" : "sine";
        o.frequency.value = f * dt;
        lp.type = "lowpass";
        lp.frequency.value = T.low ? 600 : 900;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.05, t + T.att);
        g.gain.linearRampToValueAtTime(0.0001, t + T.dec);
        o.connect(lp);
        lp.connect(g);
        g.connect(r.g);
        o.start(t);
        o.stop(t + T.dec + 0.4);
      });
    });
  }
  function startRun() {
    stopRun(true);
    var r = (run = {
        g: AC.createGain(),
        alive: true,
        timers: [],
        start: performance.now(),
        steps: 0,
      }),
      T = TRACKS[S.track],
      i = 0,
      n = AC.currentTime;
    r.g.gain.setValueAtTime(0.0001, n);
    r.g.gain.linearRampToValueAtTime(1, n + 1.2);
    r.g.connect(bus.mus);
    (function step() {
      if (!r.alive) return;
      chord(r, T, i, AC.currentTime + 0.05);
      for (var k = 0; k < T.pl; k++)
        later(
          r,
          () => {
            tone(
              PENT[Math.floor(Math.random() * PENT.length)] *
                (T.low ? 0.5 : Math.random() < 0.4 ? 0.5 : 1),
              AC.currentTime + 0.02,
              1.6,
              T.wave || "sine",
              T.plv,
              0,
              r.g,
              true,
            );
          },
          k * (T.step / T.pl) + Math.random() * 600,
        );
      if (T.arp)
        for (var j = 0; j < T.arp.n; j++)
          later(
            r,
            ((jj) => () => {
              var c = T.ch[i % T.ch.length];
              tone(
                c[jj % c.length] * 2,
                AC.currentTime + 0.02,
                0.9,
                "triangle",
                0.045,
                0,
                r.g,
                true,
              );
            })(j),
            j * T.arp.ms,
          );
      r.steps++;
      if (S.auto && r.steps >= T.len) {
        later(
          r,
          () => {
            nextTrack(1, false);
          },
          T.step,
        );
        return;
      }
      i++;
      later(r, step, T.step);
    })();
  }
  function stopRun(fast) {
    if (!run) return;
    var r = run;
    run = null;
    r.alive = false;
    r.timers.forEach(clearTimeout);
    if (AC) {
      var n = AC.currentTime;
      r.g.gain.cancelScheduledValues(n);
      r.g.gain.setValueAtTime(r.g.gain.value, n);
      r.g.gain.linearRampToValueAtTime(0.0001, n + (fast ? 0.7 : 1.5));
    }
    setTimeout(() => {
      try {
        r.g.disconnect();
      } catch (e) {}
    }, 9800);
  }
  function musicStart() {
    withAC(() => {
      if (mOn) return;
      mOn = true;
      var n = AC.currentTime;
      bus.mus.gain.cancelScheduledValues(n);
      bus.mus.gain.setValueAtTime(bus.mus.gain.value, n);
      bus.mus.gain.linearRampToValueAtTime(S.vMus * 1.6, n + 2);
      startRun();
      renderPlayers();
      vizLoop();
    });
  }
  function musicStop() {
    mOn = false;
    stopRun(false);
    if (AC) {
      var n = AC.currentTime;
      bus.mus.gain.cancelScheduledValues(n);
      bus.mus.gain.setValueAtTime(bus.mus.gain.value, n);
      bus.mus.gain.linearRampToValueAtTime(0, n + 1.5);
    }
    renderPlayers();
  }
  function setTrack(k, andPlay) {
    var N = TRACKS.length;
    S.track = ((k % N) + N) % N;
    store();
    if (mOn) startRun();
    else if (andPlay) {
      applySetting("music", true);
      return;
    }
    renderPlayers(true);
  }
  function nextTrack(d, user) {
    if (S.shuffle && d > 0) {
      var k;
      do {
        k = Math.floor(Math.random() * TRACKS.length);
      } while (k === S.track && TRACKS.length > 1);
      setTrack(k, user);
    } else setTrack(S.track + d, user);
  }
  var eqBins = [1, 2, 4, 7, 11];
  function vizLoop() {
    if (viz) return;
    viz = 1;
    var data = null;
    (function f() {
      var bars = $$(".eq i");
      if (!mOn || !bus.an) {
        bars.forEach((b) => {
          b.style.removeProperty("--h");
        });
        $$(".mp-prog i").forEach((b) => {
          b.style.removeProperty("--pr");
        });
        viz = 0;
        return;
      }
      if (!document.hidden) {
        if (!data) data = new Uint8Array(bus.an.frequencyBinCount);
        bus.an.getByteFrequencyData(data);
        $$(".eq").forEach((eq, ei) => {
          $$("i", eq).forEach((b, k) => {
            var v = data[eqBins[k % eqBins.length]] / 150;
            b.style.setProperty("--h", Math.max(14, Math.min(100, 14 + v * 86)).toFixed(0) + "%");
          });
        });
        if (run) {
          var T = TRACKS[S.track],
            pr = Math.min(1, (performance.now() - run.start) / (T.len * T.step + T.step));
          $$(".mp-prog i").forEach((b) => {
            b.style.setProperty("--pr", (pr * 100).toFixed(1) + "%");
          });
        }
      }
      requestAnimationFrame(f);
    })();
  }
  function renderPlayers(pick) {
    var T = TRACKS[S.track];
    $$("[data-player]").forEach((p) => {
      if (mOn) p.setAttribute("data-on", "");
      else p.removeAttribute("data-on");
      var t = $(".mp-title", p),
        s = $(".mp-sub", p);
      if (t && t.textContent !== T.n) {
        t.textContent = T.n;
        s.textContent = T.d;
        [t, s].forEach((x) => {
          x.classList.remove("mp-pick");
          void x.offsetWidth;
          x.classList.add("mp-pick");
        });
      }
      var pb = $('[data-act="play"]', p);
      if (pb) {
        pb.setAttribute("aria-label", mOn ? "Pause music" : "Play music");
        pb.setAttribute("aria-pressed", String(mOn));
        var ic = $(".ico", pb),
          want = mOn ? "pause" : "play";
        if (ic.dataset.now !== want) {
          ic.dataset.now = want;
          ic.className = "ico i-" + want + " swapin";
          ic.innerHTML = svg(want);
        }
      }
      $$('[data-act="track"]', p).forEach((c) => {
        c.setAttribute("aria-pressed", String(+c.dataset.k === S.track));
      });
      var sh = $('[data-act="shuffle"]', p);
      if (sh) sh.setAttribute("aria-pressed", String(!!S.shuffle));
    });
    $$(".cogbtn").forEach((b) => {
      if (mOn) b.setAttribute("data-playing", "");
      else b.removeAttribute("data-playing");
    });
    var st = $("#plstat");
    if (st)
      st.textContent =
        !window.AudioContext && !window.webkitAudioContext
          ? "Audio is not available here"
          : mOn
            ? "Playing"
            : S.music
              ? "Starts on your first tap"
              : "Paused";
  }
  /* settings cog: a mini visualiser while music plays. The bars are rendered by React; heights are written straight from the analyser. */
  (() => {
    var BINS = [1, 4, 9, 16],
      ma = [0, 0, 0, 0],
      sd = [10, 10, 10, 10],
      cur = [30, 30, 30, 30],
      data = null,
      was = false,
      t0 = performance.now(),
      lastT = t0;
    (function f(now) {
      requestAnimationFrame(f);
      if (document.hidden) return;
      var bars = $$(".cogviz i");
      if (!mOn || !bus.an) {
        if (was) {
          was = false;
          bars.forEach((b) => {
            b.style.height = "";
          });
        }
        return;
      }
      was = true;
      if (!data) data = new Uint8Array(bus.an.frequencyBinCount);
      bus.an.getByteFrequencyData(data);
      var tt = (now - t0) / 1000,
        dt = Math.min(64, now - lastT) / 16.7;
      lastT = now;
      for (var k = 0; k < 4; k++) {
        var v = (data[BINS[k]] + data[BINS[k] + 1]) / 2,
          dev = v - ma[k];
        ma[k] += dev * 0.025 * dt;
        sd[k] += (Math.max(6, Math.abs(dev)) - sd[k]) * 0.02 * dt;
        var n = 0.42 + dev / (sd[k] * 2.5) + 0.14 * Math.sin(tt * (2.6 + k * 1.9) + k * 2.3);
        n = Math.max(0, Math.min(1, n));
        var target = 14 + n ** 1.15 * 86;
        cur[k] += (target - cur[k]) * (1 - Math.exp(-dt * (target > cur[k] ? 0.55 : 0.2)));
        for (var q = k; q < bars.length; q += 4) bars[q].style.height = cur[k].toFixed(1) + "%";
      }
    })(t0);
  })();
  document.addEventListener("click", (e) => {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var a = b.dataset.act;
    if (a === "play") applySetting("music", !mOn);
    else if (a === "prev") nextTrack(-1, true);
    else if (a === "next") nextTrack(1, true);
    else if (a === "shuffle") {
      S.shuffle = !S.shuffle;
      store();
      renderPlayers();
    } else if (a === "track") setTrack(+b.dataset.k, true);
  });
  document.addEventListener("visibilitychange", () => {
    if (!AC || !mOn) return;
    if (document.hidden) AC.suspend();
    else AC.resume();
  });
  /* sound and music are on by default; the browser only allows audio after a first tap or key press */
  var armed = false;
  function unlock() {
    unlocked = true;
  }
  function arm(e) {
    unlock();
    if (armed) return;
    armed = true;
    ["click", "keydown"].forEach((t) => {
      document.removeEventListener(t, arm, true);
    });
    if (
      e &&
      e.target &&
      e.target.closest &&
      e.target.closest(
        '[data-set="music"],[data-act="play"],[data-act="track"],[data-act="next"],[data-act="prev"]',
      )
    )
      return;
    if (S.sfx || S.music) ac();
    if (S.music && !mOn) musicStart();
  }
  ["click", "keydown"].forEach((t) => {
    document.addEventListener(t, arm, true);
  });
  document.addEventListener("pointerdown", unlock, true);

  /* ---------- settings panel ---------- */
  function srow(ic, title, sub, key) {
    return (
      '<div class="setrow" data-row="' +
      key +
      '"><span class="ico i-' +
      ic +
      '" data-i="' +
      ic +
      '"></span><div><b>' +
      title +
      "</b><small>" +
      sub +
      '</small></div><button class="sw" type="button" role="switch" aria-checked="' +
      !!S[key] +
      '" aria-label="' +
      title +
      '" data-set="' +
      key +
      '"><span class="th"></span></button></div>'
    );
  }
  function vrow(key, label) {
    return (
      '<div class="setrow vol" data-vrow="' +
      key +
      '"><span></span><input class="rng" type="range" min="0" max="100" value="' +
      Math.round(S[key] * 100) +
      '" data-set="' +
      key +
      '" aria-label="' +
      label +
      '"></div>'
    );
  }
  var MINI =
    '<div class="mplayer mini" data-player><div class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><div class="mp-meta"><b class="mp-title">Drift</b><small class="mp-sub">Slow pads and sparse plucks</small></div><div class="mp-ctl">' +
    '<button class="btn icon sm ghost" data-fx data-act="prev" type="button" aria-label="Previous track"><span class="ico" data-i="prev"></span></button>' +
    '<button class="btn icon sm" data-fx data-depth data-act="play" type="button" aria-label="Play music" aria-pressed="false"><span class="ico" data-i="play"></span></button>' +
    '<button class="btn icon sm ghost" data-fx data-act="next" type="button" aria-label="Next track"><span class="ico" data-i="next"></span></button></div></div>';
  var THEMEROW =
    '<div class="setrow" data-row="theme"><span class="ico tmorph"><span class="ico sunI" data-i="sun"></span><span class="ico moonI" data-i="moon"></span></span><div><b>Theme</b><small>Light by default</small></div><button class="sw theme" type="button" role="switch" aria-checked="false" aria-label="Dark theme" data-set="themeSw"><span class="st"></span><span class="st b"></span><span class="st c"></span><span class="th"><span class="ico sunI" data-i="sun"></span><span class="ico moonI" data-i="moon"></span></span></button></div>';
  var PANEL =
    "<h4>Display</h4>" +
    THEMEROW +
    srow("motion", "Reduce motion", "Calmer, no wave or tilt", "motion") +
    srow("cursor", "Custom cursor", "Mouse and trackpad only", "cursor") +
    "<h4>Sound</h4>" +
    srow("vol", "Sound effects", "Soft clicks and toggles", "sfx") +
    vrow("vSfx", "Effects volume") +
    srow("music", "Music", "Four ambient tracks", "music") +
    MINI +
    vrow("vMus", "Music volume") +
    '<div class="setfoot">Saved on this device. Audio starts after your first tap.</div>';
  function cascade(el) {
    Array.prototype.forEach.call(el.children, (c, i) => {
      c.setAttribute("data-c", "");
      c.style.setProperty("--i", i);
    });
  }
  $$("[data-settings]").forEach((el) => {
    el.innerHTML = PANEL;
    hydrate(el);
    cascade(el);
  });
  function applyRanges() {
    $$(".rng").forEach((r) => {
      r.style.setProperty("--p", r.value + "%");
    });
    $$("[data-vrow]").forEach((r) => {
      r.classList.toggle("off", !S[r.dataset.vrow === "vSfx" ? "sfx" : "music"]);
    });
  }

  function syncSeg(k, v) {
    $$('[data-seg="' + k + '"]').forEach((seg) => {
      setSeg(seg, v);
    });
  }
  function syncThemeSw() {
    var dk = root.getAttribute("data-theme") === "dark";
    $$('.sw[data-set="themeSw"]').forEach((s) => {
      s.setAttribute("aria-checked", String(dk));
    });
  }
  var inputForced = null;
  function applySetting(k, v) {
    if (k === "theme") {
      S.theme = v;
      root.setAttribute("data-theme", v);
      syncSeg(k, v);
      syncThemeSw();
      logos.forEach((l) => {
        l.refresh();
      });
      store();
      return;
    }
    if (k === "themeSw") {
      applySetting("theme", v ? "dark" : "light");
      return;
    }
    if (k === "brand") {
      if (v === "lab" || v === "nd") root.setAttribute("data-brand", v);
      else root.removeAttribute("data-brand");
      syncSeg(k, v);
      if (v === "nd") ndPlay();
      logos.forEach((l) => {
        l.refresh();
      });
      return;
    }
    if (k === "input") {
      inputForced = v;
      if (v === "touch") root.setAttribute("data-touch", "");
      else root.removeAttribute("data-touch");
      syncSeg(k, v);
      curStatus();
      return;
    }
    if (k === "surface") {
      if (v === "depth") root.setAttribute("data-surface", "depth");
      else root.removeAttribute("data-surface");
      syncSeg(k, v);
      return;
    }
    if (k === "pw") {
      $("#phone").style.setProperty("--pw", v + "px");
      syncSeg(k, v);
      return;
    }
    if (k === "media") {
      syncSeg(k, v);
      return;
    }
    if (k === "bmstyle" || k === "bmicon") {
      BM[k === "bmstyle" ? "style" : "icon"] = v;
      syncSeg(k, v);
      bmRender();
      return;
    }
    S[k] = v;
    $$('.sw[data-set="' + k + '"]').forEach((el) => {
      el.setAttribute("aria-checked", String(!!v));
    });
    $$('.rng[data-set="' + k + '"]').forEach((el) => {
      el.value = Math.round(v * 100);
    });
    if (k === "cursor") {
      root.setAttribute("data-cursor", v ? "on" : "off");
      curStatus();
    }
    if (k === "motion") {
      if (v) root.setAttribute("data-motion", "reduce");
      else root.removeAttribute("data-motion");
      reduce = mqR.matches || !!v;
    }
    if (k === "sfx") {
      if (v) {
        unlocked = true;
        sfx("on");
      }
    }
    if (k === "music") {
      if (v) musicStart();
      else musicStop();
    }
    if (k === "vSfx" && bus.sfx) bus.sfx.gain.value = v;
    if (k === "vMus" && bus.mus && mOn) bus.mus.gain.value = v * 1.6;
    applyRanges();
    store();
    if (k === "music" || k === "auto" || k === "shuffle") renderPlayers();
  }
  root.setAttribute("data-cursor", S.cursor ? "on" : "off");
  if (S.motion) {
    root.setAttribute("data-motion", "reduce");
    reduce = true;
  }
  $$(".rng").forEach((r) => {
    r.addEventListener("input", () => {
      applySetting(r.dataset.set, r.value / 100);
    });
    r.addEventListener("change", () => {
      sfx("hover", 0, true);
    });
  });
  applyRanges();
  /* switches: tap or drag the knob (delegated, ported from the kit) */
  function setSw(sw, on) {
    var was = sw.getAttribute("aria-checked");
    sw.setAttribute("aria-checked", String(on));
    if (was !== String(on)) {
      sfx(on ? "on" : "off", 0, true);
      if (sw.dataset.set) applySetting(sw.dataset.set, on);
    }
  }
  document.addEventListener("pointerdown", (e) => {
    var sw = e.target.closest && e.target.closest(".sw");
    if (!sw || e.button > 0) return;
    var sx = e.clientX,
      moved = false,
      on0 = sw.getAttribute("aria-checked") === "true";
    try {
      sw.setPointerCapture(e.pointerId);
    } catch (_) {}
    sw.setAttribute("data-down", "");
    function mv(ev) {
      var dx = ev.clientX - sx;
      if (Math.abs(dx) > 5) moved = true;
      if (moved) setSw(sw, on0 ? dx > -12 : dx > 12);
    }
    function up() {
      sw.removeEventListener("pointermove", mv);
      sw.removeEventListener("pointerup", up);
      sw.removeEventListener("pointercancel", up);
      sw.removeAttribute("data-down");
      if (!moved) setSw(sw, !on0);
      sw.__ptr = Date.now();
    }
    sw.addEventListener("pointermove", mv);
    sw.addEventListener("pointerup", up);
    sw.addEventListener("pointercancel", up);
  });
  document.addEventListener("click", (e) => {
    var sw = e.target.closest && e.target.closest(".sw");
    if (sw && e.detail === 0) setSw(sw, sw.getAttribute("aria-checked") !== "true");
  });
  root.setAttribute("data-surface", "depth");
  var openPanel = null;
  function panelFor(btn) {
    return btn.closest("[data-pop]").dataset.pop === "phone"
      ? $("#phone .settings")
      : btn.parentNode.querySelector(".settings");
  }
  function setPanel(btn, open) {
    var p = panelFor(btn);
    if (open && openPanel && openPanel.p !== p) setPanel(openPanel.b, false);
    if (open && nav && nav.getAttribute("data-search") === "open") closeSearch();
    p.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    openPanel = open ? { p: p, b: btn } : null;
    sfx(open ? "open" : "close");
  }
  document.addEventListener("click", (e) => {
    var b = e.target.closest("[data-cog]");
    if (b) {
      setPanel(b, b.getAttribute("aria-expanded") !== "true");
      return;
    }
    if (openPanel && !openPanel.p.contains(e.target)) setPanel(openPanel.b, false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && openPanel) {
      var b = openPanel.b;
      setPanel(b, false);
      b.focus();
    }
  });

  /* ---------- cue sounds on hover and press ---------- */
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    var t = e.target.closest(
      "[data-fx],.tab,.chip,.seg button,.links a,.results a,.moremenu button,.menu button,.sw",
    );
    if (t && !t.contains(e.relatedTarget) && !t.closest("[data-nosfx]")) sfx("hover");
  });
  document.addEventListener("pointerdown", (e) => {
    var t = e.target.closest(".btn,.chip,.menu button,.moremenu button,.results a");
    if (t && !t.closest("[data-nosfx]")) sfx("press");
  });

  /* ---------- custom cursor and tooltip ---------- */
  var HAND = (open, fist) => {
    var F = fist
      ? [
          [6.5, 11.5, 4.4, 7],
          [11.3, 10.5, 4.4, 8],
          [16, 11, 4.2, 7.5],
          [20.5, 12.5, 3.8, 6.5],
        ]
      : open
        ? [
            [6.5, 4, 4.4, 15],
            [11.4, 2.5, 4.4, 16.5],
            [16.2, 3.5, 4.2, 15.5],
            [20.8, 6, 3.8, 13],
          ]
        : [
            [6.5, 2, 4.6, 16],
            [11.6, 9.5, 4.4, 10],
            [16.4, 10.8, 4.2, 9],
            [21, 12.8, 3.8, 8],
          ];
    var palm = fist
      ? '<rect x="5.5" y="15" width="19.5" height="12.5" rx="6"/>'
      : open
        ? '<rect x="5.5" y="14" width="19.5" height="13" rx="6"/>'
        : '<rect x="6.5" y="15" width="18.3" height="12.5" rx="5.5"/>';
    var layer = (cls) =>
      '<g class="' +
      cls +
      '">' +
      palm +
      '<rect x="2.4" y="15.8" width="8" height="4.2" rx="2.1" transform="rotate(28 6 18)"/>' +
      F.map(
        (f, i) =>
          '<rect class="f" data-i="' +
          i +
          '" x="' +
          f[0] +
          '" y="' +
          f[1] +
          '" width="' +
          f[2] +
          '" height="' +
          f[3] +
          '" rx="' +
          f[2] / 2 +
          '"/>',
      ).join("") +
      "</g>";
    return (
      '<svg width="30" height="30" viewBox="0 0 30 30">' + layer("ol") + layer("ik") + "</svg>"
    );
  };
  var ARROW =
    '<svg viewBox="0 0 186.24 186.06"><path class="ol" d="M186.24 153.91L186.24 185.61L154.78 186.06L116.1 148.07L116.1 148.06L70.23 174.34L22.68 56.31L1.79 4.45L0 0L50 20.09L174.35 70.05L147.73 116.09L147.74 116.09Z"/><path class="ik" d="M186.24 153.91L186.24 185.61L154.78 186.06L116.1 148.07L116.1 148.06L70.23 174.34L22.68 56.31L1.79 4.45L0 0L50 20.09L174.35 70.05L147.73 116.09L147.74 116.09Z"/></svg>';
  var TEXTC =
    '<svg width="16" height="26" viewBox="0 0 16 26"><path class="halo" d="M4 3h8M4 23h8M8 3v20"/><path class="line" d="M4 3h8M4 23h8M8 3v20"/></svg>';
  var WAITC =
    '<svg width="26" height="26" viewBox="0 0 26 26"><path class="halo" d="M13 5a8 8 0 1 1 0 16 8 8 0 1 1 0-16"/><path class="track" d="M13 5a8 8 0 1 1 0 16 8 8 0 1 1 0-16"/><path class="arc" d="M13 5a8 8 0 0 1 8 8"/></svg>';
  var NOC =
    '<svg width="26" height="26" viewBox="0 0 26 26"><circle class="halo" cx="13" cy="13" r="8.5"/><path class="halo" d="M7 7l12 12"/><circle class="ring" cx="13" cy="13" r="8.5"/><path class="ring" d="M7 7l12 12"/></svg>';
  var curIn = $("#curIn");
  curIn.innerHTML =
    '<div class="cs cs-arrow">' +
    ARROW +
    '</div><div class="cs cs-hand">' +
    HAND() +
    '</div><div class="cs cs-text">' +
    TEXTC +
    '</div><div class="cs cs-grab">' +
    HAND(true) +
    '</div><div class="cs cs-grabbing">' +
    HAND(false, true) +
    '</div><div class="cs cs-wait">' +
    WAITC +
    '</div><div class="cs cs-no">' +
    NOC +
    '</div><div class="cs cs-bubble"><div class="bub" id="bubLbl">View</div></div><div class="cs cs-sym"><div class="bub"><svg class="sy-play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg><svg class="sy-pause" viewBox="0 0 24 24"><path d="M7.5 5h3.2v14H7.5zM13.3 5h3.2v14h-3.2z"/></svg></div></div>';
  var cur = $("#cur"),
    tipEl = $("#curtip"),
    tipTxt = $("#curTipText"),
    fingers = $$(".cs-hand .f", curIn);
  var mx = -100,
    my = -100,
    pmx = -100,
    pmy = -100,
    tx = -100,
    ty = -100,
    spd = 0,
    amp = 0,
    ph = 0,
    tilt = 0,
    seen = false,
    lastT = null,
    isDown = false,
    tipT = 0,
    tipShown = false,
    tipSrc = null;
  function stateOf(el) {
    if (!el || !el.closest) return { s: "arrow" };
    var c = el.closest("[data-cursor]:not(html)");
    if (c && (c.dataset.cursor === "play" || c.dataset.cursor === "pause")) {
      var it = el.closest("button,a[href],input,label,[role=slider],[role=button],.ccp,.fs-tools");
      if (it && it !== c && c.contains(it)) c = null;
    }
    if (c) return { s: c.dataset.cursor, label: c.dataset.cursorLabel };
    if (el.closest('[aria-busy="true"]')) return { s: "wait" };
    if (el.closest('[aria-disabled="true"],:disabled')) return { s: "no" };
    if (
      el.closest(
        "input:not([type=range]):not([type=checkbox]):not([type=submit]),textarea,[contenteditable]",
      )
    )
      return { s: "text" };
    if (el.closest("input[type=range]")) return { s: "grab" };
    if (
      el.closest(
        "a[href],button,[role=button],[role=tab],[role=switch],[role=menuitem],[role=option],summary,label,select,.chip",
      )
    )
      return { s: "hand" };
    return { s: "arrow" };
  }
  function setState(o) {
    var s = o.s;
    if (isDown && s === "grab") s = "grabbing";
    cur.dataset.s = s;
    if (o.label) $("#bubLbl").textContent = o.label;
  }
  function curRefresh() {
    if (lastT) onTarget(lastT);
  }
  var TIPS = [
    [".sw.theme", "Light or dark. Tap it or drag the knob."],
    ["#srchx", "Close search.<small>Esc</small>"],
    ["[data-act=play]", "Play or pause the music."],
    ["[data-act=shuffle]", "Shuffle on or off."],
    ["#bmAdd", "Keeps this badge in the list."],
    ["#callbtn", "Opens a scheduler. Nothing is booked from this page."],
    ["#sharebtn", "Copy the link or post it."],
    ["#likebtn", "Like it. The count will live on a small counter service."],
    ["#copybtn", "Copies the command to your clipboard."],
    ["#srchgo", "Search the site. Ctrl or Cmd + K.<small>Shortcut</small>"],
    ["canvas.hv", "That is us. Hover for the full name."],
    ["#pwtgl", "Show or hide what you typed."],
    [".sw", "Tap it or drag the knob."],
    ["[data-cog]", "Settings: sound, music, cursor, motion, theme."],
    ["#sfx,.sfxgrid .btn", "Plays this cue once."],
  ];
  TIPS.push(
    ["[data-book]", "Pick a time to talk. Nothing is booked until you confirm."],
    ["[data-theme-btn]", "Light or dark."],
  );
  function tipText(el) {
    if (!el || !el.closest) return null;
    if (el.closest(".settings.open")) return null;
    var cg = el.closest("[data-cog]");
    if (cg && cg.getAttribute("aria-expanded") === "true") return null;
    var t = el.closest("[data-tip]");
    if (t) return t.dataset.tip;
    for (var i = 0; i < TIPS.length; i++) if (el.closest(TIPS[i][0])) return TIPS[i][1];
    return null;
  }
  function showTip(txt) {
    tipTxt.innerHTML = txt;
    tipEl.classList.add("show");
    tipShown = true;
  }
  function hideTip() {
    clearTimeout(tipT);
    tipEl.classList.remove("show");
    tipShown = false;
  }
  function onTarget(el) {
    var o = stateOf(el);
    setState(o);
    var t = tipText(el);
    if (t === tipSrc) return;
    tipSrc = t;
    clearTimeout(tipT);
    if (!t) {
      hideTip();
      return;
    }
    if (tipShown) {
      tipEl.classList.remove("show");
      tipT = setTimeout(() => {
        showTip(t);
      }, 140);
    } else
      tipT = setTimeout(() => {
        showTip(t);
      }, 380);
  }
  var gotPointer = false,
    lastTouchAt = 0,
    curTxt = $("#curstatus"),
    curBox = $("#curstatusbox");
  function setTouch(on) {
    if (on) root.setAttribute("data-touch", "");
    else root.removeAttribute("data-touch");
    syncSeg("input", on ? "touch" : "mouse");
    curStatus();
  }
  function curStatus() {
    if (!curTxt) return;
    var ok = false,
      msg;
    if (root.getAttribute("data-cursor") !== "on")
      msg = "The custom cursor is switched off in Settings.";
    else if (root.hasAttribute("data-touch"))
      msg =
        inputForced === "touch"
          ? "Input is set to Touch above, so the system cursor stays. Switch it to Pointer."
          : "Touch input detected, so the system cursor stays. Move a mouse to switch.";
    else if (!seen) msg = "Waiting for the pointer. Move the mouse over this page.";
    else {
      ok = true;
      msg =
        "Custom cursor active (" +
        (cur.dataset.s || "arrow") +
        "). The system cursor is hidden on this page.";
    }
    curTxt.textContent = msg;
    if (curBox) {
      if (ok) curBox.setAttribute("data-ok", "");
      else curBox.removeAttribute("data-ok");
    }
  }
  function note(e) {
    if (e.pointerType === "touch") {
      lastTouchAt = performance.now();
      if (!inputForced && !root.hasAttribute("data-touch")) setTouch(true);
      return;
    }
    if (!inputForced && root.hasAttribute("data-touch")) setTouch(false);
    if (root.hasAttribute("data-touch")) return;
    mx = e.clientX;
    my = e.clientY;
    if (!seen) {
      seen = true;
      pmx = tx = mx;
      pmy = ty = my;
    }
    cur.style.opacity = 1;
    if (!root.hasAttribute("data-cursor-live")) root.setAttribute("data-cursor-live", "");
    if (e.target !== lastT) {
      lastT = e.target;
      onTarget(e.target);
      curStatus();
    }
  }
  document.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType === "mouse" || e.pointerType === "pen") gotPointer = true;
      note(e);
    },
    { passive: true },
  );
  document.addEventListener(
    "mousemove",
    (e) => {
      if (gotPointer || performance.now() - lastTouchAt < 1200) return;
      note(e);
    },
    { passive: true },
  );
  document.addEventListener(
    "touchstart",
    () => {
      lastTouchAt = performance.now();
    },
    { passive: true },
  );
  document.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") {
      if (!inputForced && !root.hasAttribute("data-touch")) setTouch(true);
      return;
    }
    if (root.hasAttribute("data-touch")) return;
    isDown = true;
    cur.setAttribute("data-down", "");
    onTarget(e.target);
    var r = $("#curRip");
    r.classList.remove("go");
    void r.offsetWidth;
    r.classList.add("go");
    hideTip();
  });
  function up() {
    if (!isDown) return;
    isDown = false;
    cur.removeAttribute("data-down");
    tipSrc = null;
    if (lastT) onTarget(lastT);
  }
  document.addEventListener("pointerup", up);
  document.addEventListener("pointercancel", up);
  document.documentElement.addEventListener("mouseleave", () => {
    cur.style.opacity = 0;
    hideTip();
    tipSrc = null;
  });
  document.documentElement.addEventListener("mouseenter", () => {
    if (seen) cur.style.opacity = 1;
  });
  (function frame() {
    requestAnimationFrame(frame);
    if (!seen || root.getAttribute("data-cursor") !== "on") return;
    var sp = Math.hypot(mx - pmx, my - pmy),
      dx = mx - pmx;
    pmx = mx;
    pmy = my;
    spd += (sp - spd) * 0.2;
    amp += ((reduce ? 0 : Math.min(1, spd / 16) * 9) - amp) * 0.2;
    ph += 0.5;
    tilt += ((reduce ? 0 : Math.max(-12, Math.min(12, dx * 0.9))) - tilt) * 0.15;
    cur.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    curIn.style.transform = "rotate(" + tilt.toFixed(2) + "deg)";
    if (cur.dataset.s === "hand")
      fingers.forEach((f) => {
        f.style.transform =
          "rotate(" + (amp * Math.sin(ph + +f.dataset.i * 0.9)).toFixed(2) + "deg)";
      });
    tx += (mx - tx) * (reduce ? 1 : 0.22);
    ty += (my - ty) * (reduce ? 1 : 0.22);
    tipEl.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
    tipEl.classList.toggle("flip", mx > innerWidth - 270);
  })();
  return { applySetting, sfx, S };
}
