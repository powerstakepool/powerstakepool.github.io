// Hero background animations. Each one is a small factory that returns
// { mask, init(env), draw(ctx, env, now, dt) }; PowerAnim.start() runs it on a
// canvas and takes care of sizing, theme colour, reduced motion and pausing
// when the canvas is off screen.
(function () {
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function roundRect(ctx, x, y, s, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, s, s, r); else ctx.rect(x, y, s, s);
  }

  function col(env, a) { return "rgba(" + env.rgb + "," + Math.max(0, a).toFixed(3) + ")"; }

  var anims = {};

  // 1. Network: blocks drift and link up; pulses travel between neighbours.
  anims.network = function () {
    var nodes = [], pulses = [], LINK = 170;
    return {
      mask: function (e) { return "radial-gradient(ellipse 55% 50% at 50% " + e.cyPct + "%, transparent 20%, #000 80%)"; },
      init: function (env) {
        var count = Math.round(Math.min(46, Math.max(14, (env.w * env.h) / 22000)));
        nodes = []; pulses = [];
        for (var i = 0; i < count; i++) {
          nodes.push({ x: rnd(0, env.w), y: rnd(0, env.h), vx: rnd(-0.09, 0.09), vy: rnd(-0.09, 0.09), s: rnd(5, 10), glow: 0 });
        }
      },
      draw: function (ctx, env, now, dt) {
        var i, j, a, b, d;
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          a.x += a.vx * dt; a.y += a.vy * dt;
          if (a.x < -20) a.x = env.w + 20; else if (a.x > env.w + 20) a.x = -20;
          if (a.y < -20) a.y = env.h + 20; else if (a.y > env.h + 20) a.y = -20;
          a.glow = Math.max(0, a.glow - 0.012 * dt);
        }
        if (Math.random() < 0.025 * dt && pulses.length < 4) {
          a = nodes[(Math.random() * nodes.length) | 0];
          var best = null, bd = LINK;
          for (i = 0; i < nodes.length; i++) {
            b = nodes[i]; if (b === a) continue;
            d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < bd) { bd = d; best = b; }
          }
          if (best) pulses.push({ a: a, b: best, t: 0 });
        }
        ctx.lineWidth = 1;
        for (i = 0; i < nodes.length; i++) {
          for (j = i + 1; j < nodes.length; j++) {
            a = nodes[i]; b = nodes[j];
            d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < LINK) {
              ctx.strokeStyle = col(env, 0.16 * (1 - d / LINK));
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
        for (i = pulses.length - 1; i >= 0; i--) {
          var p = pulses[i]; p.t += 0.012 * dt;
          if (p.t >= 1) { p.b.glow = 1; pulses.splice(i, 1); continue; }
          ctx.fillStyle = col(env, 0.6);
          ctx.beginPath(); ctx.arc(p.a.x + (p.b.x - p.a.x) * p.t, p.a.y + (p.b.y - p.a.y) * p.t, 2, 0, Math.PI * 2); ctx.fill();
        }
        for (i = 0; i < nodes.length; i++) {
          a = nodes[i];
          ctx.fillStyle = col(env, 0.06 + a.glow * 0.25);
          ctx.strokeStyle = col(env, 0.24 + a.glow * 0.4);
          roundRect(ctx, a.x - a.s / 2, a.y - a.s / 2, a.s, 2); ctx.fill(); ctx.stroke();
        }
      }
    };
  };

  // 2. Minting chain: rows of linked blocks slide left; new blocks glow in.
  anims.chain = function () {
    var rows = [], SIZE = 30, GAP = 34, STEP = SIZE + GAP, MINT = 1400;
    function row(env, y, speed, alpha) {
      var blocks = [], n = Math.ceil(env.w / STEP) + 2;
      for (var i = 0; i < n; i++) blocks.push({ x: i * STEP, txs: 1 + ((Math.random() * 3) | 0), born: -1e9 });
      return { y: y, speed: speed, alpha: alpha, blocks: blocks };
    }
    return {
      mask: "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)",
      init: function (env) { rows = [row(env, 34, 0.22, 1), row(env, env.bandY, 0.14, 0.7)]; },
      draw: function (ctx, env, now, dt) {
        ctx.lineWidth = 1;
        for (var r = 0; r < rows.length; r++) {
          var R = rows[r], bl = R.blocks, a = R.alpha, top = R.y - SIZE / 2, i;
          for (i = 0; i < bl.length; i++) bl[i].x -= R.speed * dt;
          if (bl[0].x < -STEP) {
            var nb = bl.shift();
            nb.x = bl[bl.length - 1].x + STEP; nb.txs = 1 + ((Math.random() * 3) | 0); nb.born = now;
            bl.push(nb);
          }
          for (i = 0; i < bl.length; i++) {
            var b = bl[i], age = (now - b.born) / MINT;
            var glow = age < 1 ? 1 - age : 0, fill = age < 1 ? Math.min(1, age * 1.6) : 1;
            ctx.strokeStyle = col(env, 0.22 * a);
            ctx.beginPath(); ctx.moveTo(b.x + SIZE, R.y); ctx.lineTo(b.x + STEP, R.y); ctx.stroke();
            ctx.fillStyle = col(env, 0.35 * a);
            ctx.beginPath(); ctx.arc(b.x + SIZE + GAP / 2, R.y, 1.6, 0, Math.PI * 2); ctx.fill();
            if (glow > 0) { ctx.fillStyle = col(env, 0.18 * glow * a); roundRect(ctx, b.x - 6, top - 6, SIZE + 12, 9); ctx.fill(); }
            ctx.fillStyle = col(env, (0.06 + glow * 0.2) * a);
            ctx.strokeStyle = col(env, (0.32 + glow * 0.5) * a);
            roundRect(ctx, b.x, top, SIZE, 6); ctx.fill(); ctx.stroke();
            ctx.fillStyle = col(env, (0.3 + glow * 0.4) * a);
            var shown = Math.ceil(b.txs * fill);
            for (var t = 0; t < shown; t++) ctx.fillRect(b.x + 7, top + 8 + t * 6, (t === b.txs - 1 ? 0.45 : 0.7) * (SIZE - 14), 2);
          }
        }
      }
    };
  };

  // 3. Cardano rings: dotted rings turn slowly; ripples spread from the centre.
  anims.rings = function () {
    var rings = [], ripples = [], last = -1e9, FIRST = 70, GAP = 48, SPACING = 20, EVERY = 3600, SPEED = 0.16;
    return {
      mask: function (e) { return "radial-gradient(ellipse 50% 50% at 50% " + e.cyPct + "%, rgba(0,0,0,0.1) 12%, #000 90%)"; },
      init: function (env) {
        var maxR = Math.hypot(Math.max(env.cx, env.w - env.cx), Math.max(env.cy, env.h - env.cy)) + GAP;
        rings = []; ripples = []; last = -1e9;
        for (var k = 0, rad = FIRST; rad < maxR; k++, rad += GAP) {
          rings.push({
            r: rad, n: Math.max(8, Math.round((2 * Math.PI * rad) / SPACING)),
            offset: rnd(0, Math.PI * 2),
            speed: (k % 2 ? -1 : 1) * rnd(0.000045, 0.000065),
            size: Math.max(1.1, 2.6 - k * 0.09)
          });
        }
      },
      draw: function (ctx, env, now) {
        if (now - last > EVERY) { ripples.push(now); last = now; }
        var maxAge = (Math.hypot(env.w, env.h) + 100) / SPEED;
        while (ripples.length && now - ripples[0] > maxAge) ripples.shift();
        for (var i = 0; i < rings.length; i++) {
          var ring = rings[i], lit = 0;
          for (var j = 0; j < ripples.length; j++) {
            var d = Math.abs((now - ripples[j]) * SPEED - ring.r);
            if (d < 60) lit = Math.max(lit, 1 - d / 60);
          }
          var ang = ring.offset + now * ring.speed, size = ring.size * (1 + lit * 0.6);
          ctx.fillStyle = col(env, 0.2 + lit * 0.55);
          ctx.beginPath();
          for (var k = 0; k < ring.n; k++) {
            var th = ang + (k / ring.n) * Math.PI * 2;
            var x = env.cx + Math.cos(th) * ring.r, y = env.cy + Math.sin(th) * ring.r;
            if (x < -10 || x > env.w + 10 || y < -10 || y > env.h + 10) continue;
            ctx.moveTo(x + size, y); ctx.arc(x, y, size, 0, Math.PI * 2);
          }
          ctx.fill();
        }
      }
    };
  };

  // 4. Stake flow: ADA particles stream in from the edges towards the pool card;
  //    every few seconds the pool sends a burst of rewards back out.
  anims.flow = function () {
    var inbound = [], rewards = [], lastBurst = -1e9, EVERY = 4200;
    function spawn(env) {
      var side = (Math.random() * 4) | 0, x, y;
      if (side === 0) { x = -10; y = rnd(0, env.h); }
      else if (side === 1) { x = env.w + 10; y = rnd(0, env.h); }
      else if (side === 2) { x = rnd(0, env.w); y = -10; }
      else { x = rnd(0, env.w); y = env.h + 10; }
      return { x0: x, y0: y, bend: rnd(-0.35, 0.35), t: 0, speed: rnd(0.0016, 0.0028), s: rnd(1.5, 2.8) };
    }
    return {
      mask: function (e) { return "radial-gradient(ellipse 45% 30% at 50% " + e.cyPct + "%, rgba(0,0,0,0.15) 35%, #000 100%)"; },
      init: function (env) { inbound = []; rewards = []; for (var i = 0; i < 80; i++) { var p = spawn(env); p.t = Math.random(); inbound.push(p); } },
      draw: function (ctx, env, now, dt) {
        var tx = env.cx, ty = env.bandY, i, p;
        ctx.lineCap = "round";
        for (i = 0; i < inbound.length; i++) {
          p = inbound[i]; p.t += p.speed * dt;
          if (p.t >= 1) { inbound[i] = spawn(env); continue; }
          var mx = (p.x0 + tx) / 2 - (ty - p.y0) * p.bend, my = (p.y0 + ty) / 2 + (tx - p.x0) * p.bend;
          var at = function (t) {
            var e = t * t * (3 - 2 * t);
            return [(1 - e) * (1 - e) * p.x0 + 2 * (1 - e) * e * mx + e * e * tx,
                    (1 - e) * (1 - e) * p.y0 + 2 * (1 - e) * e * my + e * e * ty];
          };
          var head = at(p.t), tail = at(Math.max(0, p.t - 0.06));
          var fade = Math.sin(Math.PI * p.t);
          ctx.strokeStyle = col(env, 0.28 * fade);
          ctx.lineWidth = p.s * 0.8;
          ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();
          ctx.fillStyle = col(env, 0.65 * fade);
          ctx.beginPath(); ctx.arc(head[0], head[1], p.s, 0, Math.PI * 2); ctx.fill();
        }
        if (now - lastBurst > EVERY) {
          lastBurst = now;
          for (i = 0; i < 48; i++) {
            var th = (i / 48) * Math.PI * 2 + rnd(-0.05, 0.05);
            rewards.push({ x: tx, y: ty, vx: Math.cos(th) * rnd(0.9, 1.4), vy: Math.sin(th) * rnd(0.9, 1.4), life: 1 });
          }
        }
        for (i = rewards.length - 1; i >= 0; i--) {
          p = rewards[i];
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.006 * dt;
          if (p.life <= 0) { rewards.splice(i, 1); continue; }
          ctx.fillStyle = col(env, 0.7 * p.life);
          roundRect(ctx, p.x - 2.5, p.y - 2.5, 5, 1.2); ctx.fill();
        }
      }
    };
  };

  // 5. Ledger grid: a faint grid of cells; a few "chains" walk from cell to
  //    cell, lighting each new block and leaving a fading trail.
  anims.grid = function () {
    var CELL = 26, cols = 0, rws = 0, heat = null, walkers = [], acc = 0, STEP_MS = 140;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    return {
      mask: function (e) { return "radial-gradient(ellipse 50% 40% at 50% " + e.cyPct + "%, transparent 30%, #000 95%)"; },
      init: function (env) {
        cols = Math.ceil(env.w / CELL) + 1; rws = Math.ceil(env.h / CELL) + 1;
        heat = new Float32Array(cols * rws); walkers = []; acc = 0;
        var count = Math.max(3, Math.min(7, Math.round((env.w * env.h) / 250000)));
        for (var i = 0; i < count; i++) walkers.push({ c: (Math.random() * cols) | 0, r: (Math.random() * rws) | 0, d: (Math.random() * 4) | 0 });
      },
      draw: function (ctx, env, now, dt) {
        acc += dt * 16.7;
        while (acc > STEP_MS) {
          acc -= STEP_MS;
          for (var k = 0; k < walkers.length; k++) {
            var wk = walkers[k];
            if (Math.random() < 0.3) wk.d = (Math.random() * 4) | 0;
            wk.c = (wk.c + dirs[wk.d][0] + cols) % cols;
            wk.r = (wk.r + dirs[wk.d][1] + rws) % rws;
            heat[wk.r * cols + wk.c] = 1;
          }
        }
        var decay = 0.006 * dt;
        for (var r = 0; r < rws; r++) {
          for (var c = 0; c < cols; c++) {
            var idx = r * cols + c, hval = heat[idx];
            if (hval > 0) heat[idx] = Math.max(0, hval - decay);
            var x = c * CELL + 4, y = r * CELL + 4, s = CELL - 8;
            if (hval > 0.02) {
              ctx.fillStyle = col(env, 0.04 + hval * 0.2);
              ctx.strokeStyle = col(env, 0.1 + hval * 0.32);
              roundRect(ctx, x, y, s, 3); ctx.fill(); ctx.stroke();
            } else {
              ctx.fillStyle = col(env, 0.13);
              ctx.fillRect(x + s / 2 - 1, y + s / 2 - 1, 2, 2);
            }
          }
        }
      }
    };
  };

  function start(canvas, name, opts) {
    var make = anims[name];
    if (!canvas || !canvas.getContext || !make) return;
    opts = opts || {};
    var anim = make(), ctx = canvas.getContext("2d"), host = opts.host || canvas.parentElement;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var env = { w: 0, h: 0, cx: 0, cy: 0, bandY: 0, rgb: "127,167,255" };
    var visible = true, running = false, last = 0;


    function readColor() {
      env.rgb = getComputedStyle(document.documentElement).getPropertyValue("--anim").trim() || env.rgb;
    }
    function size() {
      var r = host.getBoundingClientRect();
      env.w = r.width; env.h = r.height;
      canvas.width = env.w * dpr; canvas.height = env.h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var c = opts.center && opts.center.getBoundingClientRect();
      env.cx = c ? c.left - r.left + c.width / 2 : env.w / 2;
      env.cy = c ? c.top - r.top + c.height / 2 : env.h * 0.3;
      var b = opts.band && opts.band.getBoundingClientRect();
      env.bandY = b ? b.top - r.top + b.height * 0.55 : env.h * 0.7;
      env.cyPct = env.h ? Math.round((env.cy / env.h) * 100) : 30;
      var m = typeof anim.mask === "function" ? anim.mask(env) : anim.mask;
      canvas.style.webkitMaskImage = m;
      canvas.style.maskImage = m;
      anim.init(env);
    }
    function still() { ctx.clearRect(0, 0, env.w, env.h); anim.draw(ctx, env, 0, 0); }
    function tick(now) {
      if (!visible) { running = false; return; }
      var dt = Math.min(50, now - (last || now)) / 16.7; last = now;
      ctx.clearRect(0, 0, env.w, env.h);
      anim.draw(ctx, env, now, dt);
      requestAnimationFrame(tick);
    }
    function go() { if (!running && !reduce) { running = true; last = 0; requestAnimationFrame(tick); } }

    readColor(); size();
    if (reduce) still(); else go();
    window.addEventListener("resize", function () { size(); if (reduce) still(); });
    document.addEventListener("themechange", function () { readColor(); if (reduce) still(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) go(); }).observe(canvas);
    }
  }

  window.PowerAnim = { start: start, names: Object.keys(anims) };
})();
