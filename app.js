(function () {
  var POOL_ID = "pool1uk2f28awascuhrhuwrp7x6y87x8ch33vwx8jtmrysp7l5ngq78j";

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  var copyBtn = document.getElementById("copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      var done = function () {
        copyBtn.textContent = "Copied";
        setTimeout(function () { copyBtn.textContent = "Copy"; }, 1800);
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
    if (n >= 1e6) return "₳" + (n / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
    if (n >= 1e3) return "₳" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return "₳" + Math.round(n);
  }

  function pct(x, digits) {
    return Number(x).toFixed(digits).replace(/\.?0+$/, "") + "%";
  }

  function set(key, value) {
    var el = stats.querySelector('[data-stat="' + key + '"]');
    if (el) el.textContent = value;
  }

  var age = document.getElementById("pool-age");
  if (age) {
    var years = Math.floor((Date.now() - Date.UTC(2020, 7, 4)) / (365.25 * 864e5));
    age.textContent = " · " + years + " years ago";
  }

  function ago(seconds) {
    var s = Math.max(0, Math.round(Date.now() / 1000 - seconds));
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) { var hrs = Math.round(s / 3600); return hrs + (hrs === 1 ? " hour ago" : " hours ago"); }
    var d = Math.round(s / 86400); return d + (d === 1 ? " day ago" : " days ago");
  }

  // Recent blocks timeline + current epoch progress.
  function renderBlocks(p) {
    var card = document.getElementById("blocks-card");
    var list = document.getElementById("timeline");
    if (!card || !list || !p.recent_blocks || !p.recent_blocks.length) return;
    var blocks = p.recent_blocks.slice().reverse(); // oldest on the left, newest on the right
    list.innerHTML = "";
    blocks.forEach(function (b, i) {
      var li = document.createElement("li");
      if (i === blocks.length - 1) li.className = "latest";
      var a = document.createElement("a");
      a.href = "https://cexplorer.io/block/" + encodeURIComponent(b.hash);
      a.target = "_blank"; a.rel = "noopener";
      a.title = new Date(b.time * 1000).toLocaleString();
      a.innerHTML = '<span class="block-icon" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="block-height"></span><span class="block-ago" data-time=""></span><span class="block-epoch"></span>';
      a.querySelector(".block-height").textContent = "#" + Number(b.height).toLocaleString();
      var agoEl = a.querySelector(".block-ago");
      agoEl.setAttribute("data-time", b.time);
      agoEl.textContent = (i === blocks.length - 1 ? "Latest · " : "") + ago(b.time);
      a.querySelector(".block-epoch").textContent = "Epoch " + b.epoch;
      li.appendChild(a);
      list.appendChild(li);
    });

    var e = p.epoch;
    if (e) {
      document.getElementById("epoch-no").textContent = e.no;
      document.getElementById("epoch-blocks").textContent = e.blocks;
    }
    function tickTimes() {
      var els = list.querySelectorAll(".block-ago");
      for (var i = 0; i < els.length; i++) {
        els[i].textContent = (i === els.length - 1 ? "Latest · " : "") + ago(Number(els[i].getAttribute("data-time")));
      }
      if (e) {
        var frac = Math.min(1, Math.max(0, (Date.now() / 1000 - e.start) / e.length));
        var left = Math.max(0, e.start + e.length - Date.now() / 1000);
        document.getElementById("epoch-fill").style.width = (frac * 100).toFixed(1) + "%";
        var d = Math.floor(left / 86400), h = Math.round((left % 86400) / 3600);
        if (h === 24) { d += 1; h = 0; }
        var parts = [];
        if (d) parts.push(d + (d === 1 ? " day" : " days"));
        if (h || !d) parts.push(Math.max(h, d ? 0 : 1) + (h === 1 ? " hour" : " hours"));
        document.getElementById("epoch-left").textContent = Math.round(frac * 100) + "% through · " + parts.join(", ") + " left";
      }
    }
    tickTimes();
    setInterval(tickTimes, 60000);
    card.hidden = false;
  }

  // stats.json is refreshed from Koios by .github/workflows/update-stats.yml
  // (Koios doesn't allow direct browser requests from other sites).
  fetch("stats.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (p) {
      if (!p || p.live_stake == null) return;
      set("stake", ada(p.live_stake));
      if (p.active_stake) set("active", "Active " + ada(p.active_stake));
      set("saturation", pct(p.live_saturation, 2));
      if (p.live_saturation > 0) set("cap", "of " + ada(Number(p.live_stake) / (p.live_saturation / 100)) + " cap");
      set("delegators", Number(p.live_delegators).toLocaleString());
      set("blocks", Number(p.block_count).toLocaleString());
      set("margin", pct(p.margin * 100, 2));
      set("fixed", ada(p.fixed_cost));
      stats.hidden = false;
      renderBlocks(p);
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

// Hero background animation (see animations.js). Pick one with data-anim on the canvas.
(function () {
  var canvas = document.getElementById("chain");
  if (!canvas || !window.PowerAnim) return;
  var hero = canvas.parentElement;
  window.PowerAnim.start(canvas, canvas.getAttribute("data-anim") || "rings", {
    center: hero.querySelector("h1"),
    band: hero.querySelector(".pool-card")
  });
})();

// FAQ: only one answer open at a time, and clicking anywhere outside the
// list closes it. (name="faq" on <details> does the first part natively in
// newer browsers; this covers older ones too.)
(function () {
  var faq = document.querySelector(".faq");
  if (!faq) return;
  var items = faq.querySelectorAll("details");
  for (var i = 0; i < items.length; i++) {
    items[i].addEventListener("toggle", function (e) {
      if (!e.target.open) return;
      for (var j = 0; j < items.length; j++) if (items[j] !== e.target) items[j].open = false;
    });
  }
  document.addEventListener("click", function (e) {
    if (faq.contains(e.target) || e.target.closest("#faq-toggle")) return;
    for (var j = 0; j < items.length; j++) items[j].open = false;
  });
})();

// FAQ: show the first five questions, reveal the rest on request.
(function () {
  var btn = document.getElementById("faq-toggle");
  var more = document.getElementById("faq-more");
  if (!btn || !more) return;
  btn.addEventListener("click", function () {
    var open = more.hidden;
    more.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    btn.textContent = open ? "Show fewer questions" : "Show all questions";
  });
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
