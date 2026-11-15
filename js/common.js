/* =========================================================
   矢上小 防災行動マップ（公開版）— 全ページ共通
   - 作品データの読み込み先（読み込みのみ。書き込みの処理はない）
   - 3か所の場所・災害・いつの行動か
   - WS（ワークショップ）案内の表示・非表示（config/workshop.json）
   ========================================================= */
(function () {
  "use strict";

  // 作品データ（読み込みのみ）：GET /artworks と GET /images/<key>
  var DATA_BASE = "https://yagami-submit.kazuki131214.workers.dev";

  var PLACES = [
    { id: "hiyoshi5", name: "日吉五丁目公園", short: "日吉五丁目公園", lat: 35.55112, lon: 139.65574, color: "#2f80ed" },
    { id: "kagami", name: "日吉六丁目鏡ヶ淵公園", short: "鏡ヶ淵公園", lat: 35.54543, lon: 139.65512, color: "#16a34a" },
    { id: "yagami", name: "矢上小学校", short: "矢上小学校", lat: 35.55400, lon: 139.65763, color: "#e8590c" }
  ];

  var PHASES = [
    { value: "事前", label: "災害の前", key: "prior" },
    { value: "災害時", label: "災害のとき", key: "during" },
    { value: "復旧時", label: "災害のあと", key: "recovery" }
  ];

  // 保存されている災害名 → 画面の言葉
  var HAZARD_LABELS = {
    "洪水（外水氾濫）": "洪水（川があふれる）",
    "高潮": "高潮",
    "内水氾濫": "内水氾濫（水が街からあふれる）",
    "土砂災害（急傾斜地の崩壊）": "土砂災害（がけ崩れ）",
    "地震の揺れ（震度）": "地震の揺れ"
  };

  // 国土地理院「重ねるハザードマップ」のタイル
  var HZ = "https://disaportaldata.gsi.go.jp/raster/";
  var HAZARD_TILES = {
    flood_l2: { re: /洪水/, label: "洪水", url: HZ + "01_flood_l2_shinsuishin_data/{z}/{x}/{y}.png", legend: "shinsui" },
    hightide: { re: /高潮/, label: "高潮", url: HZ + "03_hightide_l2_shinsuishin_data/{z}/{x}/{y}.png", legend: "shinsui" },
    kyukei: { re: /土砂|急傾斜/, label: "土砂災害", url: HZ + "05_kyukeishakeikaikuiki/{z}/{x}/{y}.png", legend: "dosha" }
  };

  var WAIWAI_NAISUI = "https://wwwm.city.yokohama.lg.jp/yokohama/Map?mid=65&mpx=139.65512&mpy=35.54543&mps=10000&mtp=dm&gprj=3";
  var WAIWAI_JISHIN = "https://wwwm.city.yokohama.lg.jp/yokohama/Map?mid=6&mpx=139.62630111702703&mpy=35.536158445033394&mps=10000&mtp=dm&gprj=3";

  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function place(id) {
    for (var i = 0; i < PLACES.length; i++) if (PLACES[i].id === id) return PLACES[i];
    return null;
  }
  // place が空の古いデータは、座標がいちばん近い場所（200m 以内）にまとめる
  function placeOf(f) {
    var p = place(f.properties.place);
    if (p) return p;
    var c = f.geometry && f.geometry.coordinates;
    if (!c || !isFinite(c[0]) || !isFinite(c[1])) return null;
    var best = null, bd = 1e9;
    PLACES.forEach(function (q) {
      var dy = (q.lat - c[1]) * 111000, dx = (q.lon - c[0]) * 91000, d = Math.sqrt(dx * dx + dy * dy);
      if (d < bd) { bd = d; best = q; }
    });
    return bd <= 200 ? best : null;
  }
  function splitList(s) {
    return String(s || "").split(/[,、]\s*/).map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function phaseLabel(v) {
    for (var i = 0; i < PHASES.length; i++) if (PHASES[i].value === v) return PHASES[i].label;
    return v || "";
  }
  function hazardLabel(v) { return HAZARD_LABELS[v] || v; }
  function imageUrl(p) {
    return p.images && p.images[0] ? DATA_BASE + "/" + p.images[0] : "";
  }
  function sortByNumber(a, b) {
    return String(a.properties.field_25 || "9999").localeCompare(String(b.properties.field_25 || "9999")) ||
      (Number(a.properties.id) - Number(b.properties.id));
  }

  var artworksPromise = null;
  function fetchArtworks() {
    if (!artworksPromise) {
      artworksPromise = fetch(DATA_BASE + "/artworks", { cache: "no-store" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (gj) {
          return (gj.features || []).filter(function (f) { return f.properties && f.properties.id; }).sort(sortByNumber);
        });
    }
    return artworksPromise;
  }

  // localStorage が使えない環境（プライベートモードなど）でも止まらないように
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  };

  /* ---------- WS案内（config/workshop.json） ---------- */
  // 日本時間の今日（YYYY-MM-DD）
  function todayJST() {
    return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  }
  // テスト用：URL に ?today=2026-12-07 をつけると、その日として判定する
  function today() {
    var q = new URLSearchParams(location.search).get("today");
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : todayJST();
  }
  var wsPromise = null;
  function loadWorkshop() {
    if (!wsPromise) {
      wsPromise = fetch("config/workshop.json", { cache: "no-cache" })
        .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
        .then(function (cfg) {
          var d = today();
          var active = cfg.enabled === true && !!cfg.applyEnd && d <= cfg.applyEnd;
          return { cfg: cfg, active: active, beforeStart: !!cfg.applyStart && d < cfg.applyStart };
        })
        .catch(function (e) {
          console.warn("WSの設定を読み込めませんでした", e);
          return { cfg: null, active: false, beforeStart: false };
        });
    }
    return wsPromise;
  }
  // data-ws のついた要素は、WS案内が有効なときだけ出す（最初は hidden）
  function revealWorkshopLinks() {
    return loadWorkshop().then(function (ws) {
      if (ws.active) {
        document.querySelectorAll("[data-ws-field]").forEach(function (el) { el.textContent = ws.cfg[el.dataset.wsField] || ""; });
      }
      document.querySelectorAll("[data-ws]").forEach(function (el) { el.hidden = !ws.active; });
      return ws;
    });
  }

  window.BM = {
    DATA_BASE: DATA_BASE, PLACES: PLACES, PHASES: PHASES, HAZARD_TILES: HAZARD_TILES,
    WAIWAI_NAISUI: WAIWAI_NAISUI, WAIWAI_JISHIN: WAIWAI_JISHIN,
    esc: esc, place: place, placeOf: placeOf, splitList: splitList, phaseLabel: phaseLabel, hazardLabel: hazardLabel,
    imageUrl: imageUrl, sortByNumber: sortByNumber, fetchArtworks: fetchArtworks, store: store,
    loadWorkshop: loadWorkshop, revealWorkshopLinks: revealWorkshopLinks, today: today
  };
})();
