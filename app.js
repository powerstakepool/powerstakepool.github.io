(function () {
  var POOL_ID = "pool1uk2f28awascuhrhuwrp7x6y87x8ch33vwx8jtmrysp7l5ngq78j";

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var done = function () {
        copyBtn.textContent = "Copied";
        setTimeout(function () { copyBtn.textContent = "Copy ID"; }, 1800);
      };
      if (navigator.clipboard) {
        navigator.clipboard.writeText(POOL_ID).then(done, function () {});
      }
    });
  }

  var stats = document.getElementById("stats");
  if (!stats) return;

  function ada(lovelace) {
    var n = Number(lovelace) / 1e6;
    if (n >= 1e6) return "₳" + (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return "₳" + Math.round(n / 1e3) + "K";
    return "₳" + Math.round(n);
  }

  function set(key, value) {
    var el = stats.querySelector('[data-stat="' + key + '"]');
    if (el) el.textContent = value;
  }

  // stats.json is refreshed from Koios by .github/workflows/update-stats.yml
  // (Koios doesn't allow direct browser requests from other sites).
  fetch("stats.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (p) {
      if (!p || p.live_stake == null) return;
      set("stake", ada(p.live_stake));
      set("delegators", Number(p.live_delegators).toLocaleString());
      set("saturation", Number(p.live_saturation).toFixed(1) + "%");
      set("fee", (Number(p.margin) * 100).toFixed(2).replace(/\.?0+$/, "") + "%");
      set("fixed", "+ " + ada(p.fixed_cost) + " per epoch");
      set("blocks", Number(p.block_count).toLocaleString());
      stats.hidden = false;
      window.dispatchEvent(new Event("resize")); // card grew; re-place the hero animation
    })
    .catch(function () { /* Stats stay hidden; the explorer link still works. */ });
})();

// Highlight @mentions, $tickers and #tags in testimonial cards.
(function () {
  var quotes = document.querySelectorAll(".tweet blockquote");
  for (var i = 0; i < quotes.length; i++) {
    quotes[i].innerHTML = quotes[i].innerHTML.replace(/([@#$][A-Za-z_][A-Za-z0-9_]*)/g, '<span class="tag">$1</span>');
  }
})();

// Hero animation: rows of linked blocks drift left; each new block is "minted"
// on the right with a soft glow while its transaction lines fill in.
(function () {
  var canvas = document.getElementById("chain");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var hero = canvas.parentElement;
  var card = hero.querySelector(".pool-card");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var w = 0, h = 0, rgb = "127,167,255", rows = [];
  var SIZE = 30, GAP = 34, STEP = SIZE + GAP, MINT_MS = 1400;

  function readColor() {
    rgb = getComputedStyle(document.documentElement).getPropertyValue("--anim").trim() || rgb;
  }

  function makeRow(y, speed, alpha) {
    var blocks = [], n = Math.ceil(w / STEP) + 2;
    for (var i = 0; i < n; i++) {
      blocks.push({ x: i * STEP, txs: 1 + ((Math.random() * 3) | 0), born: -1e9 });
    }
    return { y: y, speed: speed, alpha: alpha, blocks: blocks };
  }

  function resize() {
    var r = hero.getBoundingClientRect();
    w = r.width; h = r.height;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var c = card && card.getBoundingClientRect();
    var cardMid = c ? c.top - r.top + c.height * 0.55 : h * 0.7;
    rows = [makeRow(34, 0.22, 1), makeRow(cardMid, 0.14, 0.7)];
  }

  function rr(x, y, s, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, s, s, r); else ctx.rect(x, y, s, s);
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r], a = row.alpha, top = row.y - SIZE / 2;
      ctx.lineWidth = 1;
      for (var i = 0; i < row.blocks.length; i++) {
        var b = row.blocks[i];
        var age = (now - b.born) / MINT_MS;
        var glow = age < 1 ? 1 - age : 0;
        var fill = age < 1 ? Math.min(1, age * 1.6) : 1;

        // Link to the next block.
        ctx.strokeStyle = "rgba(" + rgb + "," + (0.22 * a).toFixed(3) + ")";
        ctx.beginPath(); ctx.moveTo(b.x + SIZE, row.y); ctx.lineTo(b.x + STEP, row.y); ctx.stroke();
        ctx.fillStyle = "rgba(" + rgb + "," + (0.35 * a).toFixed(3) + ")";
        ctx.beginPath(); ctx.arc(b.x + SIZE + GAP / 2, row.y, 1.6, 0, Math.PI * 2); ctx.fill();

        // Glow halo for a freshly minted block.
        if (glow > 0) {
          ctx.fillStyle = "rgba(" + rgb + "," + (0.18 * glow * a).toFixed(3) + ")";
          rr(b.x - 6, top - 6, SIZE + 12, 9); ctx.fill();
        }

        // The block itself.
        ctx.fillStyle = "rgba(" + rgb + "," + ((0.06 + glow * 0.2) * a).toFixed(3) + ")";
        ctx.strokeStyle = "rgba(" + rgb + "," + ((0.32 + glow * 0.5) * a).toFixed(3) + ")";
        rr(b.x, top, SIZE, 6); ctx.fill(); ctx.stroke();

        // Transaction lines inside the block.
        ctx.fillStyle = "rgba(" + rgb + "," + ((0.3 + glow * 0.4) * a).toFixed(3) + ")";
        var shown = Math.ceil(b.txs * fill);
        for (var t = 0; t < shown; t++) {
          var lw = (t === b.txs - 1 ? 0.45 : 0.7) * (SIZE - 14);
          ctx.fillRect(b.x + 7, top + 8 + t * 6, lw, 2);
        }
      }
    }
  }

  var last = 0;
  function tick(now) {
    var dt = Math.min(50, now - (last || now)) / 16.7; last = now;
    for (var r = 0; r < rows.length; r++) {
      var row = rows[r], bl = row.blocks;
      for (var i = 0; i < bl.length; i++) bl[i].x -= row.speed * dt;
      if (bl[0].x < -STEP) {
        var b = bl.shift();
        b.x = bl[bl.length - 1].x + STEP;
        b.txs = 1 + ((Math.random() * 3) | 0);
        b.born = now;
        bl.push(b);
      }
    }
    draw(now);
    requestAnimationFrame(tick);
  }

  readColor();
  resize();
  window.addEventListener("resize", function () { resize(); if (reduce) draw(0); });
  document.addEventListener("themechange", function () { readColor(); if (reduce) draw(0); });
  if (reduce) draw(0); else requestAnimationFrame(tick);
})();

// Light / dark mode toggle (initial theme is set by the inline script in <head>).
(function () {
  var btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("theme", next); } catch (e) {}
    document.dispatchEvent(new CustomEvent("themechange", { detail: next }));
  });
})();
