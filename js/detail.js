/* =========================================================
   作品詳細：画像 → タイトル → 伝えたいこと → 情報 → 地図 → 前／次 → WS案内
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var BM = window.BM, esc = BM.esc;
  var $ = function (id) { return document.getElementById(id); };

  BM.revealWorkshopLinks();

  var params = new URLSearchParams(location.search);
  var artId = params.get("id");
  var listPlace = BM.place(params.get("place")) ? params.get("place") : null;
  var mapUrl = "index.html" + (listPlace ? "?place=" + listPlace : "");
  $("back-link").href = mapUrl;

  function fail(msg) {
    $("detail-msg").innerHTML = esc(msg) + '<br><a href="' + mapUrl + '">マップに戻る</a>';
  }
  if (!artId) { fail("作品が見つかりませんでした。"); return; }

  BM.fetchArtworks().then(function (all) {
    var f = all.find(function (x) { return String(x.properties.id) === String(artId); });
    if (!f) { fail("作品が見つかりませんでした。取り下げられた可能性があります。"); return; }
    $("detail-msg").hidden = true;
    $("art").hidden = false;
    render(f);
    renderMap(f);
    setupPager(all, f);
  }).catch(function (err) {
    console.error("作品データを読み込めませんでした", err);
    fail("作品を読み込めませんでした。インターネットにつながっているか確かめてください。");
  });

  function tags(list, label) {
    return list.length ? list.map(function (v) { return '<span class="tag">' + esc(label(v)) + "</span>"; }).join("") : "—";
  }

  function render(f) {
    var p = f.properties, pl = BM.placeOf(f);
    var img = $("art-image"), src = BM.imageUrl(p);
    if (src) { img.src = src; img.alt = "作品「" + (p.Message || "") + "」"; img.onerror = function () { img.closest("figure").hidden = true; }; }
    else img.closest("figure").hidden = true;
    $("art-title").textContent = p.Message || "（タイトルなし）";
    document.title = (p.Message || "作品") + " | 矢上小 防災行動マップ";
    var body = p.Body || [p.Mabling, p.collage].filter(Boolean).join("\n");
    if (body) $("art-body").textContent = body; else $("body-card").hidden = true;
    $("art-place").textContent = pl ? pl.name : "—";
    $("art-hazards").innerHTML = tags(BM.splitList(p.field_24), BM.hazardLabel);
    $("art-phase").innerHTML = tags(BM.splitList(p.field_23), BM.phaseLabel);
    $("art-number").textContent = p.field_25 || "—";
  }

  function renderMap(f) {
    var pl = BM.placeOf(f), c = f.geometry.coordinates;
    var center = pl ? [pl.lat, pl.lon] : [c[1], c[0]];
    if (typeof L === "undefined") { $("detail-map").hidden = true; return; }
    var map = L.map("detail-map", { center: center, zoom: 16, zoomControl: true, scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false });
    L.tileLayer("https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "地理院タイル" }).addTo(map);
    L.marker(center, { icon: L.divIcon({ className: "dv-pin", html: '<span style="background:' + (pl ? pl.color : "#4f8b80") + '"></span>', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(map);

    var box = $("hz-tools"), p = f.properties;
    var defs = Object.keys(BM.HAZARD_TILES).map(function (k) { return BM.HAZARD_TILES[k]; })
      .filter(function (d) { return d.re.test(p.field_24 || ""); });
    if (defs.length) {
      var layers = defs.map(function (d) { return L.tileLayer(d.url, { maxZoom: 17, opacity: defs.length > 1 ? 0.55 : 0.7 }); });
      var names = defs.map(function (d) { return d.label; }).join("・");
      var b = document.createElement("button");
      b.type = "button"; b.className = "hz-toggle";
      var on = false;
      var label = function () { b.textContent = on ? "✓ " + names + "のハザードマップを重ねています" : names + "のハザードマップを重ねる"; };
      label();
      b.onclick = function () {
        on = !on;
        layers.forEach(function (l) { if (on) l.addTo(map); else map.removeLayer(l); });
        b.classList.toggle("on", on); label();
      };
      box.appendChild(b);
    }
    if (/内水/.test(p.field_24 || "")) {
      var n = document.createElement("p");
      n.className = "hz-note";
      n.innerHTML = "内水氾濫（水が街からあふれる）は、" +
        '<a href="' + BM.WAIWAI_NAISUI + '" target="_blank" rel="noopener">横浜市「わいわい防災マップ」</a>で確かめられます。';
      box.appendChild(n);
    }
    if (/震度|揺れ/.test(p.field_24 || "")) {
      var j = document.createElement("p");
      j.className = "hz-note";
      j.innerHTML = "地震の揺れは、" +
        '<a href="' + BM.WAIWAI_JISHIN + '" target="_blank" rel="noopener">横浜市「わいわい防災マップ」</a>で確かめられます。';
      box.appendChild(j);
    }
    if (L.Browser.mobile) {
      var t = document.createElement("p");
      t.className = "hz-note muted";
      t.textContent = "地図は ＋／− ボタンで拡大・縮小できます。";
      box.appendChild(t);
    }
    setTimeout(function () { map.invalidateSize(); }, 200);
  }

  // 前の作品・次の作品（マップで場所を選んでいたときは、その場所の中で番号の順に）
  function setupPager(all, f) {
    var list = all.filter(function (x) {
      if (!listPlace) return true;
      var q = BM.placeOf(x); return q && q.id === listPlace;
    });
    var i = list.findIndex(function (x) { return String(x.properties.id) === String(artId); });
    var prev = $("prev-btn"), next = $("next-btn");
    var href = function (x) { return "detail.html?id=" + encodeURIComponent(x.properties.id) + (listPlace ? "&place=" + listPlace : ""); };
    if (i < 0 || list.length < 2) { document.querySelector(".pager").hidden = true; return; }
    $("nav-pos").textContent = (i + 1) + " / " + list.length;
    if (i > 0) prev.href = href(list[i - 1]); else prev.classList.add("disabled");
    if (i < list.length - 1) next.href = href(list[i + 1]); else next.classList.add("disabled");
  }
});
