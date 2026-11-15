/* =========================================================
   WS案内画面：config/workshop.json の内容を表示する
   ========================================================= */
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var BM = window.BM;
  var $ = function (id) { return document.getElementById(id); };

  // 「マップに戻る」：このサイトの中から来たときは、もとの画面（作品詳細など）に戻す
  try {
    var ref = document.referrer ? new URL(document.referrer) : null;
    var base = location.pathname.replace(/[^/]*$/, "");
    if (ref && ref.origin === location.origin && ref.pathname.indexOf(base) === 0 && !/workshop\.html$/.test(ref.pathname)) {
      $("back-link").href = ref.pathname + ref.search;
      $("back-link").textContent = /detail\.html$/.test(ref.pathname) ? "＜ 作品に戻る" : "＜ マップに戻る";
      $("close-link").href = ref.pathname + ref.search;
    }
  } catch (e) {}

  function fmtDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || "");
    if (!m) return s || "";
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return (+m[2]) + "月" + (+m[3]) + "日（" + "日月火水木金土"[d.getUTCDay()] + "）";
  }
  function addFact(dl, label, value) {
    if (!value) return;
    var dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = label; dd.textContent = value;
    dl.appendChild(dt); dl.appendChild(dd);
  }
  function setText(id, v) { var el = $(id); if (v) el.textContent = v; else el.hidden = true; }

  BM.loadWorkshop().then(function (ws) {
    if (!ws.active) {
      $("ws-msg").innerHTML = "このワークショップの申し込みは終了しました。<br>ご関心をお寄せいただき、ありがとうございました。" +
        '<br><br><a class="btn btn-secondary" href="index.html">マップに戻る</a>';
      document.title = "矢上小 防災行動マップ";
      return;
    }
    var c = ws.cfg;
    $("ws-msg").hidden = true;
    $("ws").hidden = false;

    setText("ws-title", c.title);
    setText("ws-summary", c.summary);
    setText("ws-date", c.date);
    setText("ws-session-note", c.sessionNote);

    var ol = $("ws-sessions");
    (c.sessions || []).forEach(function (s) {
      var li = document.createElement("li");
      var head = document.createElement("span"); head.className = "ws-s-head";
      head.textContent = [s.name, s.time].filter(Boolean).join("　");
      var place = document.createElement("span"); place.className = "ws-s-place";
      place.textContent = s.place || "";
      li.appendChild(head); li.appendChild(place);
      ol.appendChild(li);
    });
    if (!ol.children.length) ol.hidden = true;

    var period = (c.applyStart ? fmtDate(c.applyStart) : "") + "〜" + fmtDate(c.applyEnd);
    var dl = $("ws-facts");
    addFact(dl, "対象", c.target);
    addFact(dl, "定員", c.capacity);
    addFact(dl, "保育", c.childcare);
    addFact(dl, "申込期間", period);
    addFact(dl, "持ち物", c.bring);

    var form = $("ws-form");
    if (ws.beforeStart) {
      form.hidden = true;
      $("ws-apply-note").textContent = fmtDate(c.applyStart) + "から申し込めます。";
    } else if (c.formUrl) {
      form.href = c.formUrl;
      $("ws-apply-note").textContent = "申込締切 " + fmtDate(c.applyEnd) + "（Googleフォームが開きます）";
    } else {
      $("ws-apply").hidden = true;
    }

    if (c.flyerImage) {
      $("ws-flyer-img").src = c.flyerImage;
      $("ws-flyer-link").href = c.flyerImage;
      $("ws-flyer-img").onerror = function () { $("ws-flyer").hidden = true; };
      $("ws-flyer").hidden = false;
    }
  });
});
