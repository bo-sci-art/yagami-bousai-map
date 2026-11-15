/* =========================================================
   マップ画面：上に地図（3か所のピン）、下に作品の一覧
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var BM = window.BM, esc = BM.esc;
  var $ = function (id) { return document.getElementById(id); };

  BM.revealWorkshopLinks();
  setupSheets();
  setupIntro();

  if (typeof L === "undefined") {
    $("map").innerHTML = '<p class="list-msg">地図を読み込めませんでした。ページを読み込み直してください。</p>';
    return;
  }

  /* ---------- 地図 ---------- */
  var bases = {
    white: L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "地理院タイル" }),
    sat: L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg", { maxZoom: 18, attribution: "地理院タイル" })
  };
  var map = L.map("map", { center: [35.5505, 139.6565], zoom: 15, layers: [bases.white], zoomControl: true, tap: true });
  L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);
  var curBase = bases.white;
  document.querySelectorAll("[data-base]").forEach(function (b) {
    b.onclick = function () {
      map.removeLayer(curBase);
      curBase = bases[b.dataset.base];
      curBase.addTo(map); curBase.bringToBack();
      document.querySelectorAll("[data-base]").forEach(function (x) { x.classList.toggle("active", x === b); });
    };
  });
  function fitAll() {
    map.fitBounds(BM.PLACES.map(function (p) { return [p.lat, p.lon]; }), { padding: [40, 40], maxZoom: 16 });
  }
  fitAll();
  // 画面の向きや大きさが変わったら地図を合わせる
  window.addEventListener("resize", function () { map.invalidateSize(); });

  /* ---------- ハザードマップ ---------- */
  var hzLayers = {};
  Object.keys(BM.HAZARD_TILES).forEach(function (k) {
    hzLayers[k] = L.tileLayer(BM.HAZARD_TILES[k].url, { maxZoom: 17, opacity: 0.7, attribution: "重ねるハザードマップ（国土地理院）" });
  });
  document.querySelectorAll("[data-hz]").forEach(function (cb) {
    cb.onchange = function () {
      var l = hzLayers[cb.dataset.hz];
      if (cb.checked) { l.addTo(map); l.bringToFront(); } else map.removeLayer(l);
      refreshLegend();
    };
  });
  $("link-naisui").href = BM.WAIWAI_NAISUI;
  $("link-jishin").href = BM.WAIWAI_JISHIN;
  $("hazard-btn").onclick = function () { openSheet("hazard-sheet"); };

  function refreshLegend() {
    var on = Object.keys(hzLayers).filter(function (k) { return map.hasLayer(hzLayers[k]); });
    $("hazard-btn").classList.toggle("on", on.length > 0);
    $("hazard-btn").textContent = on.length ? "ハザードマップ（" + on.length + "）" : "ハザードマップ";
    var box = $("legend");
    if (!on.length) { box.innerHTML = ""; return; }
    var kinds = {};
    on.forEach(function (k) { kinds[BM.HAZARD_TILES[k].legend] = true; });
    var h = '<p class="legend-note">色がついていない場所も、安全とはかぎりません。</p>';
    if (kinds.shinsui) h += '<div class="legend-block"><p class="legend-title">浸水の深さ（洪水・高潮）</p>' +
      '<div class="legend-shinsui"><img src="https://disaportal.gsi.go.jp/hazardmap/copyright/img/shinsui_legend3.png" alt="浸水の深さの色の見かた" loading="lazy">' + depthGuideSVG() + '</div>' +
      '<p class="legend-small">右の図は高さの目安です（大人 1.7m・子ども 1.2m・2階建ての家 約7m）</p></div>';
    if (kinds.dosha) h += '<div class="legend-block"><p class="legend-title">土砂災害（がけ崩れ）</p>' +
      '<p class="legend-row"><span class="swatch" style="background:#fae600"></span>警戒区域（イエローゾーン）</p>' +
      '<p class="legend-row"><span class="swatch" style="background:#fa2800"></span>特別警戒区域（レッドゾーン）</p></div>';
    box.innerHTML = h;
  }
  // 浸水の深さの目安（人と家の高さ）
  function depthGuideSVG() {
    var maxM = 8, W = 116, H = 210, top = 22, ground = H - 14, ppm = (ground - top) / maxM;
    var y = function (m) { return ground - m * ppm; }, ink = "#4A4A4A";
    var bands = [[0, .3, "#FFFFB3"], [.3, .5, "#F7F5A9"], [.5, 1, "#F8E1A6"], [1, 3, "#FFD8C0"], [3, 5, "#FFB7B7"], [5, maxM, "#FF9191"]];
    var s = '<svg class="depth-guide" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="浸水の深さの目安" font-family="sans-serif">';
    bands.forEach(function (b) { s += '<rect x="22" y="' + y(b[1]) + '" width="' + (W - 22) + '" height="' + (y(b[0]) - y(b[1])) + '" fill="' + b[2] + '"/>'; });
    [[.5, "0.5m"], [3, "3m"], [5, "5m"]].forEach(function (t) {
      s += '<line x1="20" x2="' + W + '" y1="' + y(t[0]) + '" y2="' + y(t[0]) + '" stroke="#999" stroke-width=".6" stroke-dasharray="2 2"/>';
      s += '<text x="19" y="' + (y(t[0]) + 3) + '" font-size="8" text-anchor="end" fill="#666">' + t[1] + '</text>';
    });
    s += '<text x="19" y="' + (ground + 3) + '" font-size="8" text-anchor="end" fill="#666">0m</text>';
    var person = function (cx, hM) {
      var h = hM * ppm, r = h * .11, hy = ground - h + r, bt = hy + r + 1, w = h * .30, legTop = ground - h * .45;
      return '<circle cx="' + cx + '" cy="' + hy + '" r="' + r + '" fill="' + ink + '"/>' +
        '<rect x="' + (cx - w / 2) + '" y="' + bt + '" width="' + w + '" height="' + (legTop - bt) + '" rx="' + (w * .3) + '" fill="' + ink + '"/>' +
        '<rect x="' + (cx - w / 2) + '" y="' + (legTop - 1) + '" width="' + (w * .44) + '" height="' + (ground - legTop + 1) + '" fill="' + ink + '"/>' +
        '<rect x="' + (cx + w * .06) + '" y="' + (legTop - 1) + '" width="' + (w * .44) + '" height="' + (ground - legTop + 1) + '" fill="' + ink + '"/>';
    };
    s += person(30, 1.7) + person(41, 1.2);
    var hx1 = 52, hx2 = W - 4, ey = y(5), ry = y(7), fy = y(3);
    s += '<polygon points="' + (hx1 - 3) + ',' + ey + ' ' + ((hx1 + hx2) / 2) + ',' + ry + ' ' + (hx2 + 3) + ',' + ey + '" fill="' + ink + '"/>';
    s += '<rect x="' + hx1 + '" y="' + ey + '" width="' + (hx2 - hx1) + '" height="' + (ground - ey) + '" fill="none" stroke="' + ink + '" stroke-width="2"/>';
    s += '<line x1="' + hx1 + '" x2="' + hx2 + '" y1="' + fy + '" y2="' + fy + '" stroke="' + ink + '" stroke-width="1.2"/>';
    s += '<line x1="20" x2="' + W + '" y1="' + ground + '" y2="' + ground + '" stroke="' + ink + '" stroke-width="1.2"/>';
    return s + '</svg>';
  }

  /* ---------- 絞り込み ---------- */
  var CAT_RULES = [{ cat: "mizu", re: /洪水|内水|高潮/ }, { cat: "jiban", re: /土砂|急傾斜/ }, { cat: "jishin", re: /震度|揺れ/ }];
  var PHASE_KEY = {}; BM.PHASES.forEach(function (p) { PHASE_KEY[p.value] = p.key; });
  var state = { place: "all", cat: "all", phase: "all", q: "" };
  var ALL = [], loaded = false;

  function cats(p) { return CAT_RULES.filter(function (r) { return r.re.test(p.field_24 || ""); }).map(function (r) { return r.cat; }); }
  function phases(p) { return BM.splitList(p.field_23).map(function (v) { return PHASE_KEY[v]; }).filter(Boolean); }
  function normalize(s) { return String(s || "").replace(/[０-９Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); }).toLowerCase(); }

  function pass(f, ignorePlace) {
    var p = f.properties;
    if (!ignorePlace && state.place !== "all") { var pl = BM.placeOf(f); if (!pl || pl.id !== state.place) return false; }
    if (state.cat !== "all" && cats(p).indexOf(state.cat) < 0) return false;
    if (state.phase !== "all" && phases(p).indexOf(state.phase) < 0) return false;
    if (state.q) {
      var hay = normalize((p.field_25 || "") + " " + (p.Message || ""));
      if (hay.indexOf(normalize(state.q)) < 0) return false;
    }
    return true;
  }
  function countAt(id) {
    return ALL.filter(function (f) {
      if (!pass(f, true)) return false;
      if (id === "all") return true;
      var q = BM.placeOf(f); return q && q.id === id;
    }).length;
  }

  function bindChips(boxId, key) {
    $(boxId).querySelectorAll(".chip").forEach(function (c) {
      c.onclick = function () {
        state[key] = c.dataset[key];
        $(boxId).querySelectorAll(".chip").forEach(function (x) { x.classList.toggle("active", x === c); });
        render();
      };
    });
  }
  bindChips("cat-chips", "cat");
  bindChips("phase-chips", "phase");
  $("filter-btn").onclick = function () { openSheet("filter-sheet"); };
  $("filter-reset").onclick = function () {
    state.cat = "all"; state.phase = "all";
    document.querySelectorAll("#cat-chips .chip, #phase-chips .chip").forEach(function (x) {
      x.classList.toggle("active", x.dataset.cat === "all" || x.dataset.phase === "all");
    });
    render();
  };
  $("search").addEventListener("input", function () { state.q = this.value.trim(); render(); });

  /* ---------- 場所 ---------- */
  var pinLayer = L.layerGroup().addTo(map);
  function selectPlace(id, move) {
    state.place = id;
    try { history.replaceState(null, "", id === "all" ? location.pathname : location.pathname + "?place=" + id); } catch (e) {}
    render();
    if (move) {
      var pl = BM.place(id);
      if (pl) map.setView([pl.lat, pl.lon], 17); else fitAll();
    }
    $("list-pane").scrollTop = 0;
  }
  function renderPins() {
    pinLayer.clearLayers();
    BM.PLACES.forEach(function (pl) {
      var sel = state.place === pl.id;
      L.marker([pl.lat, pl.lon], {
        icon: L.divIcon({
          className: "place-pin" + (sel ? " sel" : ""),
          html: '<div class="pp-box" style="--pc:' + pl.color + '"><span>' + esc(pl.short) + '</span><b>' + countAt(pl.id) + '</b></div><div class="pp-tip" style="--pc:' + pl.color + '"></div>',
          iconSize: [0, 0], iconAnchor: [0, 0]
        }),
        zIndexOffset: sel ? 1000 : 0, keyboard: true, title: pl.name
      }).on("click", function () { selectPlace(sel ? "all" : pl.id, !sel); }).addTo(pinLayer);
    });
  }
  function renderChips() {
    var items = [{ id: "all", short: "すべて", color: "#4f8b80" }].concat(BM.PLACES);
    $("place-chips").innerHTML = items.map(function (pl) {
      return '<button type="button" class="place-chip' + (state.place === pl.id ? " active" : "") + '" data-place="' + pl.id + '" style="--pc:' + pl.color + '">' +
        esc(pl.short) + '<b>' + countAt(pl.id) + '</b></button>';
    }).join("");
    $("place-chips").querySelectorAll(".place-chip").forEach(function (b) {
      b.onclick = function () { selectPlace(b.dataset.place, true); };
    });
  }

  /* ---------- 一覧 ---------- */
  function renderList() {
    var items = ALL.filter(function (f) { return pass(f); });
    var cur = BM.place(state.place);
    $("list-title").textContent = cur ? cur.name : "すべての場所";
    $("list-count").textContent = items.length + "作品";
    var grid = $("art-grid");
    if (!items.length) {
      grid.innerHTML = '<p class="list-msg">' + (!loaded ? "作品を読み込んでいます…" : ALL.length ? "条件に合う作品はありません。" : "まだ作品はありません。") + '</p>';
      if (!loaded) $("list-count").textContent = "";
      return;
    }
    grid.innerHTML = items.map(function (f) {
      var p = f.properties, q = BM.placeOf(f), img = BM.imageUrl(p);
      var href = "detail.html?id=" + encodeURIComponent(p.id) + (state.place !== "all" ? "&place=" + state.place : "");
      return '<a class="art-card" href="' + href + '">' +
        '<span class="art-thumb">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.remove()">' : "") + '</span>' +
        '<span class="art-title">' + esc(p.Message || "（タイトルなし）") + '</span>' +
        '<span class="art-meta"><span class="art-num">' + esc(p.field_25 || "") + '</span>' +
        (q ? '<span class="art-place" style="--pc:' + q.color + '">' + esc(q.short) + '</span>' : "") + '</span></a>';
    }).join("");
  }
  function render() {
    var n = (state.cat !== "all" ? 1 : 0) + (state.phase !== "all" ? 1 : 0);
    $("filter-count").hidden = !n; $("filter-count").textContent = n;
    renderPins(); renderChips(); renderList();
  }

  render();
  BM.fetchArtworks().then(function (list) {
    ALL = list; loaded = true;
    var qp = new URLSearchParams(location.search).get("place");
    if (qp && BM.place(qp)) selectPlace(qp, true); else render();
  }).catch(function (err) {
    console.error("作品データを読み込めませんでした", err);
    $("art-grid").innerHTML = '<p class="list-msg error">作品を読み込めませんでした。<br>インターネットにつながっているか確かめて、ページを読み込み直してください。</p>';
  });

  /* ---------- パネル（絞り込み・ハザード・最初の画面） ---------- */
  function openSheet(id) {
    var s = $(id); s.hidden = false;
    var f = s.querySelector("[data-close], button, a"); if (f) f.focus({ preventScroll: true });
  }
  function setupSheets() {
    document.querySelectorAll(".sheet").forEach(function (s) {
      s.addEventListener("click", function (e) {
        if (e.target === s || e.target.closest("[data-close]")) s.hidden = true;
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") document.querySelectorAll(".sheet").forEach(function (s) { if (s.id !== "intro") s.hidden = true; });
    });
  }
  function setupIntro() {
    var KEY = "bousaiMap.introSeen.v1";
    if (BM.store.get(KEY)) return;
    var intro = $("intro");
    intro.hidden = false;
    var done = function () { BM.store.set(KEY, "1"); intro.hidden = true; };
    $("intro-close").onclick = done;
    intro.addEventListener("click", function (e) { if (e.target === intro) done(); });
    $("intro-ws").addEventListener("click", function () { BM.store.set(KEY, "1"); });
    $("intro-close").focus({ preventScroll: true });
  }
});
