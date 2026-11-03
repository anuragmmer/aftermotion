(() => {
  "use strict";

  // Each scene: the two products in the sentence, a hue for the accent/glow, and a small label.
  const SCENES = [
    { a: "Darjeeling tea",          b: "Nilgiri tea",           hue: 38,  tag: "Teas of the hills" },
    { a: "Banarasi saree",          b: "Chikankari kurta",      hue: 340, tag: "Handloom & thread" },
    { a: "Bidriware",               b: "Moradabad brassware",   hue: 48,  tag: "Metal & inlay" },
    { a: "single-origin coffee",    b: "artisanal chocolate",   hue: 22,  tag: "Roast & cacao" },
    { a: "vintage chronograph",     b: "mechanical typewriter", hue: 205, tag: "Gears & springs" },
    { a: "Madhubani painting",      b: "Gond artwork",          hue: 12,  tag: "Folk art" },
    { a: "Kashmiri saffron",        b: "Malabar pepper",        hue: 28,  tag: "Spice route" },
    { a: "Jaipur blue pottery",     b: "Khurja ceramics",       hue: 222, tag: "Clay & glaze" },
  ];

  const HOLD = 3800;                     // ms each scene stays
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const slots = [$("#slotA"), $("#slotB")];
  const tagEl = $("#tag");
  const ticksEl = $("#ticks");
  let idx = 0, timer = null, busy = false, paused = false, remaining = HOLD, startedAt = 0;

  /* ---------- word slot: only the changed word moves ---------- */
  const makeWord = (text, extra = "") => {
    const w = document.createElement("span");
    w.className = "word " + extra;
    for (const c of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      w.appendChild(s);
    }
    return w;
  };
  const measure = (slot, text) => {
    const m = makeWord(text, "measure");
    slot.appendChild(m);
    const w = m.getBoundingClientRect().width;
    m.remove();
    return Math.ceil(w) + 2;
  };
  const padEm = () => parseFloat(getComputedStyle(slots[0]).fontSize) * 0.16;
  const setWidth = (slot, text) => { slot.style.width = (measure(slot, text) + padEm()) + "px"; };

  const swap = (slot, text, delay = 0) => {
    const old = slot.querySelector(".word:not(.leaving)");
    const next = makeWord(text);
    slot.appendChild(next);
    const nextW = measure(slot, text) + padEm();
    const fromW = slot.getBoundingClientRect().width;
    const done = [];

    // width glides so the punctuation / "too." after the slot slides smoothly
    const wAnim = slot.animate([{ width: fromW + "px" }, { width: nextW + "px" }],
      { duration: 900, delay, easing: "cubic-bezier(.65,0,.2,1)", fill: "both" });
    slot.style.width = nextW + "px";
    done.push(wAnim.finished.then(() => wAnim.cancel()));

    if (reduce.matches) {
      next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay, fill: "backwards" });
      if (old) { old.classList.add("leaving"); done.push(old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay, fill: "forwards" }).finished.then(() => old.remove())); }
      return Promise.all(done);
    }

    if (old) {
      old.classList.add("leaving");
      const oc = [...old.children];
      const step = Math.min(22, 320 / Math.max(oc.length, 1));
      const outs = oc.map((c, i) => c.animate(
        [{ transform: "translateY(0)", opacity: 1, filter: "blur(0)" },
         { transform: "translateY(-105%)", opacity: 0, filter: "blur(7px)" }],
        { duration: 560, delay: delay + i * step, easing: "cubic-bezier(.55,0,.8,.3)", fill: "forwards" }).finished);
      done.push(Promise.all(outs).then(() => old.remove()));
    }
    const nc = [...next.children];
    const step = Math.min(26, 380 / Math.max(nc.length, 1));
    nc.forEach((c, i) => c.animate(
      [{ transform: "translateY(105%)", opacity: 0, filter: "blur(8px)" },
       { transform: "translateY(0)", opacity: 1, filter: "blur(0)" }],
      { duration: 820, delay: delay + 200 + i * step, easing: "cubic-bezier(.16,1,.3,1)", fill: "backwards" }));
    done.push(new Promise(r => setTimeout(r, delay + 200 + nc.length * step + 820)));
    return Promise.all(done);
  };

  const swapTag = text => {
    tagEl.classList.add("out");
    setTimeout(() => { tagEl.textContent = text; tagEl.classList.remove("out"); }, 380);
  };

  /* ---------- scene driver ---------- */
  const ticks = SCENES.map((s, i) => {
    const b = document.createElement("button");
    b.className = "tick"; b.setAttribute("aria-label", `Scene ${i + 1}: ${s.a} and ${s.b}`);
    b.innerHTML = "<i></i>";
    b.addEventListener("click", () => go(i));
    ticksEl.appendChild(b);
    return b;
  });
  const markTicks = () => ticks.forEach((t, i) => {
    t.classList.toggle("done", i < idx);
    t.classList.remove("on");
    if (i === idx) { void t.offsetWidth; t.style.setProperty("--dur", HOLD + "ms"); t.classList.add("on"); }
  });

  const schedule = ms => {
    clearTimeout(timer);
    remaining = ms; startedAt = performance.now();
    timer = setTimeout(() => go((idx + 1) % SCENES.length), ms);
  };

  async function go(n) {
    if (busy) return;
    busy = true; clearTimeout(timer);
    idx = n;
    const s = SCENES[n];
    root.style.setProperty("--hue", s.hue);
    markTicks();
    swapTag(s.tag);
    document.querySelectorAll(".shelf").forEach((el, i) => el.classList.toggle("live", i === n));
    await Promise.all([swap(slots[0], s.a, 0), swap(slots[1], s.b, 220)]);
    busy = false;
    if (!paused) schedule(HOLD);
  }

  const pause = () => { if (paused) return; paused = true; document.body.classList.add("paused"); clearTimeout(timer); remaining = Math.max(400, remaining - (performance.now() - startedAt)); };
  const resume = () => { if (!paused) return; paused = false; document.body.classList.remove("paused"); if (!busy) schedule(remaining); };

  const hero = $(".hero");
  hero.addEventListener("pointerenter", e => e.pointerType === "mouse" && pause());
  hero.addEventListener("pointerleave", () => resume());
  document.addEventListener("visibilitychange", () => document.hidden ? pause() : resume());

  /* ---------- static sections ---------- */
  const marquee = $("#marquee");
  const names = SCENES.flatMap(s => [s.a, s.b]);
  marquee.innerHTML = [...names, ...names].map(n => `<span>${n}</span>`).join("");

  $("#shelves").innerHTML = SCENES.map((s, i) => `
    <li class="shelf" style="--h:${s.hue}">
      <small>${String(i + 1).padStart(2, "0")} · ${s.tag}</small>
      <p><span>${s.a[0].toUpperCase() + s.a.slice(1)}</span><span>${s.b}</span></p>
    </li>`).join("");

  $("#yr").textContent = new Date().getFullYear();

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: .15 });
  document.querySelectorAll(".reveal").forEach((el, i) => {
    el.style.transitionDelay = (i % 4) * 90 + "ms";
    io.observe(el);
  });

  /* ---------- boot ---------- */
  const boot = () => {
    const s = SCENES[0];
    root.style.setProperty("--hue", s.hue);
    slots.forEach((slot, i) => {
      const t = i ? s.b : s.a;
      slot.appendChild(makeWord(t));
      setWidth(slot, t);
    });
    document.querySelectorAll(".shelf")[0]?.classList.add("live");
    markTicks();
    schedule(HOLD + 600);
  };
  const remeasure = () => slots.forEach((slot, i) => {
    if (busy) return;
    setWidth(slot, SCENES[idx][i ? "b" : "a"]);
  });
  addEventListener("resize", remeasure);

  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
})();
