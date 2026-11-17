/* ============================================================
   charts.js — grafik SVG sederhana tanpa library eksternal
   ============================================================ */
(function () {
  "use strict";

  var PALETTE = ["#0f8a7c", "#2563eb", "#c98a2b", "#7c5cd6", "#c0392b", "#0e9f6e",
    "#e0663f", "#4b9bb5", "#a9791c", "#5b7c99", "#8f4d8f", "#2f855a",
    "#b23b6b", "#3d6f5b", "#8a6d3b", "#5470c6", "#d48265", "#91cc75"];

  var NS = "http://www.w3.org/2000/svg";

  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function txt(node, s) { node.textContent = s == null ? "" : String(s); return node; }

  function widthOf(host, fallback) {
    var w = host.clientWidth || (host.parentNode && host.parentNode.clientWidth) || 0;
    return Math.max(280, Math.round(w || fallback || 720));
  }

  /* ------------------------- tooltip ------------------------- */
  var tipEl = null;
  function tip() {
    if (!tipEl) tipEl = document.getElementById("chartTooltip");
    return tipEl;
  }

  function showTip(evt, html) {
    var t = tip();
    if (!t) return;
    t.innerHTML = html;
    t.classList.add("show");
    moveTip(evt);
  }

  function moveTip(evt) {
    var t = tip();
    if (!t) return;
    var x = evt.clientX + 14, y = evt.clientY - 12;
    var r = t.getBoundingClientRect();
    if (x + r.width > window.innerWidth - 10) x = evt.clientX - r.width - 14;
    if (y + r.height > window.innerHeight - 10) y = evt.clientY - r.height - 12;
    t.style.left = x + "px";
    t.style.top = Math.max(8, y) + "px";
  }

  function hideTip() {
    var t = tip();
    if (t) t.classList.remove("show");
  }

  function bindTip(node, htmlFn) {
    node.style.cursor = "default";
    node.addEventListener("mouseenter", function (e) { showTip(e, htmlFn()); });
    node.addEventListener("mousemove", moveTip);
    node.addEventListener("mouseleave", hideTip);
  }

  /* ------------------------- legend ------------------------- */
  function legend(host, items) {
    if (!host) return;
    host.innerHTML = items.map(function (it) {
      return '<span class="lg"><i style="background:' + it.color + '"></i>' + esc(it.name) + "</span>";
    }).join("");
  }

  /* ------------------------- horizontal grouped bars ------------------------- */
  function hBars(host, opt) {
    if (!host) return;
    host.innerHTML = "";
    var rows = opt.rows || [];
    if (!rows.length) {
      host.innerHTML = '<div class="empty">Belum ada data untuk ditampilkan.</div>';
      return;
    }
    var fmt = opt.format || function (v) { return String(v); };
    var series = opt.series || [{ name: "Realisasi", color: PALETTE[0], key: "actual" }];
    var W = widthOf(host, 700);
    var labelW = Math.min(190, Math.max(96, Math.round(W * 0.26)));
    var top = 10, axisH = 24, rowH = opt.rowHeight || 34;
    var H = top + rows.length * rowH + axisH;
    var barH = series.length > 1 ? 9 : 12;
    var gap = 3;
    var max = 0;
    rows.forEach(function (r) {
      series.forEach(function (s) { max = Math.max(max, Math.abs(r[s.key] || 0)); });
    });
    if (!max) max = 1;
    var plotW = W - labelW - 56;
    var plotX = labelW + 6;

    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H, role: "img" }, host);
    svg.style.height = H + "px";

    // grid
    var steps = 4;
    for (var g = 0; g <= steps; g++) {
      var gx = plotX + (plotW * g) / steps;
      el("line", { x1: gx, x2: gx, y1: top, y2: top + rows.length * rowH, stroke: g === 0 ? "#d8e0e8" : "#eef2f6", "stroke-width": 1 }, svg);
      var lbl = el("text", { x: gx, y: H - 8, "text-anchor": "middle", "font-size": 10, fill: "#8494a5" }, svg);
      txt(lbl, opt.axisFormat ? opt.axisFormat((max * g) / steps) : fmt((max * g) / steps));
    }

    rows.forEach(function (r, i) {
      var y = top + i * rowH;
      if (i % 2 === 0) el("rect", { x: 0, y: y, width: W, height: rowH, fill: "#fafbfc", rx: 6 }, svg);

      var label = el("text", { x: 2, y: y + rowH / 2 + 4, "font-size": 11.5, fill: "#334155" }, svg);
      var name = String(r.name || "");
      if (name.length > 24) name = name.slice(0, 22) + "…";
      txt(label, name);
      bindTip(label, function () { return rowTip(r, series, fmt); });
      if (opt.onClick) {
        label.style.cursor = "pointer";
        label.setAttribute("fill", "#0e6f64");
        label.addEventListener("click", function () { opt.onClick(r); });
      }

      var groupH = series.length * barH + (series.length - 1) * gap;
      var y0 = y + (rowH - groupH) / 2;
      series.forEach(function (s, si) {
        var v = r[s.key] || 0;
        var w = Math.max(1, (Math.abs(v) / max) * plotW);
        var rect = el("rect", {
          x: plotX, y: y0 + si * (barH + gap),
          width: w, height: barH, rx: 3,
          fill: s.color || PALETTE[si]
        }, svg);
        bindTip(rect, function () { return rowTip(r, series, fmt); });
        if (opt.onClick) {
          rect.style.cursor = "pointer";
          rect.addEventListener("click", function () { opt.onClick(r); });
        }
      });
    });
    if (opt.legendEl) legend(opt.legendEl, series.map(function (s, i) { return { name: s.name, color: s.color || PALETTE[i] }; }));
  }

  function rowTip(r, series, fmt) {
    var html = "<b>" + esc(r.name) + "</b>";
    series.forEach(function (s) {
      html += '<div class="row"><span>' + esc(s.name) + "</span><span>" + fmt(r[s.key] || 0) + "</span></div>";
    });
    if (r.pct != null && isFinite(r.pct)) {
      html += '<div class="row"><span>% budget</span><span>' + (r.pct * 100).toFixed(1).replace(".", ",") + "%</span></div>";
    }
    return html;
  }

  /* ------------------------- vertical bars ------------------------- */
  function vBars(host, opt) {
    if (!host) return;
    host.innerHTML = "";
    var labels = opt.labels || [];
    var series = opt.series || [];
    if (!labels.length) { host.innerHTML = '<div class="empty">Belum ada data.</div>'; return; }
    var fmt = opt.format || function (v) { return String(v); };
    var W = widthOf(host, 700), H = opt.height || 220;
    var padL = 4, padR = 4, padT = 10, padB = 26;
    var max = 0;
    series.forEach(function (s) { (s.values || []).forEach(function (v) { max = Math.max(max, v); }); });
    if (!max) max = 1;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H }, host);
    svg.style.height = H + "px";
    for (var g = 0; g <= 3; g++) {
      var gy = padT + plotH - (plotH * g) / 3;
      el("line", { x1: padL, x2: W - padR, y1: gy, y2: gy, stroke: g === 0 ? "#d8e0e8" : "#eef2f6" }, svg);
    }
    var step = plotW / labels.length;
    var groupW = Math.min(step * 0.72, 44);
    var barW = groupW / (series.length || 1);
    labels.forEach(function (lb, i) {
      var x0 = padL + i * step + (step - groupW) / 2;
      series.forEach(function (s, si) {
        var v = (s.values || [])[i] || 0;
        var h = Math.max(1, (v / max) * plotH);
        var rect = el("rect", {
          x: x0 + si * barW, y: padT + plotH - h,
          width: Math.max(2, barW - 2), height: h, rx: 2,
          fill: s.color || PALETTE[si]
        }, svg);
        bindTip(rect, function () {
          return "<b>" + esc(lb) + "</b>" + series.map(function (ss) {
            return '<div class="row"><span>' + esc(ss.name) + "</span><span>" + fmt((ss.values || [])[i] || 0) + "</span></div>";
          }).join("");
        });
      });
      var t = el("text", { x: padL + i * step + step / 2, y: H - 8, "text-anchor": "middle", "font-size": 10, fill: "#8494a5" }, svg);
      txt(t, lb);
    });
    if (opt.legendEl) legend(opt.legendEl, series.map(function (s, i) { return { name: s.name, color: s.color || PALETTE[i] }; }));
  }

  /* ------------------------- donut ------------------------- */
  function donut(host, opt) {
    if (!host) return;
    host.innerHTML = "";
    var items = (opt.items || []).filter(function (i) { return (i.value || 0) > 0; });
    var fmt = opt.format || function (v) { return String(v); };
    if (!items.length) { host.innerHTML = '<div class="empty" style="padding:34px 0">Belum ada realisasi.</div>'; return; }
    var total = items.reduce(function (a, b) { return a + b.value; }, 0);
    var W = 200, H = 200, R = 74, C = 2 * Math.PI * R, SW = 26;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H }, host);
    svg.style.height = "auto";
    el("circle", { cx: W / 2, cy: H / 2, r: R, fill: "none", stroke: "#eef2f6", "stroke-width": SW }, svg);
    var off = 0;
    items.forEach(function (it, i) {
      var len = (it.value / total) * C;
      var c = el("circle", {
        cx: W / 2, cy: H / 2, r: R, fill: "none",
        stroke: it.color || PALETTE[i % PALETTE.length],
        "stroke-width": SW, "stroke-dasharray": Math.max(0, len - 1.5) + " " + (C - len + 1.5),
        "stroke-dashoffset": -off,
        transform: "rotate(-90 " + (W / 2) + " " + (H / 2) + ")"
      }, svg);
      c.style.transition = "stroke-width .15s";
      bindTip(c, function () {
        return "<b>" + esc(it.name) + "</b>" +
          '<div class="row"><span>Realisasi</span><span>' + fmt(it.value) + "</span></div>" +
          '<div class="row"><span>Porsi</span><span>' + (total ? (it.value / total * 100).toFixed(1).replace(".", ",") : "0") + "%</span></div>";
      });
      c.addEventListener("mouseenter", function () { c.setAttribute("stroke-width", SW + 5); });
      c.addEventListener("mouseleave", function () { c.setAttribute("stroke-width", SW); });
      if (opt.onClick) {
        c.style.cursor = "pointer";
        c.addEventListener("click", function () { opt.onClick(it); });
      }
      off += len;
    });
    var t1 = el("text", { x: W / 2, y: H / 2 - 4, "text-anchor": "middle", "font-size": 10, fill: "#8494a5", "text-transform": "uppercase" }, svg);
    txt(t1, opt.centerLabel || "TOTAL");
    var t2 = el("text", { x: W / 2, y: H / 2 + 16, "text-anchor": "middle", "font-size": 14, "font-weight": 700, fill: "#0f1f2e" }, svg);
    txt(t2, opt.centerValue || fmt(total));
    if (opt.legendEl) {
      opt.legendEl.innerHTML = items.map(function (it, i) {
        return '<div class="dl"><i style="background:' + (it.color || PALETTE[i % PALETTE.length]) + '"></i>' +
          '<span class="n" title="' + esc(it.name) + '">' + esc(it.name) + "</span>" +
          '<span class="v">' + fmt(it.value) + " · " + (it.value / total * 100).toFixed(1).replace(".", ",") + "%</span></div>";
      }).join("");
    }
  }

  /* ------------------------- line / area ------------------------- */
  function line(host, opt) {
    if (!host) return;
    host.innerHTML = "";
    var labels = opt.labels || [];
    var series = opt.series || [];
    if (!labels.length) { host.innerHTML = '<div class="empty">Belum ada data.</div>'; return; }
    var fmt = opt.format || function (v) { return String(v); };
    var W = widthOf(host, 760), H = opt.height || 240;
    var padL = 8, padR = 12, padT = 12, padB = 26;
    var max = 0;
    series.forEach(function (s) { (s.values || []).forEach(function (v) { max = Math.max(max, v); }); });
    if (!max) max = 1;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, width: "100%", height: H }, host);
    svg.style.height = H + "px";

    for (var g = 0; g <= 4; g++) {
      var gy = padT + plotH - (plotH * g) / 4;
      el("line", { x1: padL, x2: W - padR, y1: gy, y2: gy, stroke: g === 0 ? "#d8e0e8" : "#eef2f6" }, svg);
      var gl = el("text", { x: W - padR, y: gy - 4, "text-anchor": "end", "font-size": 9.5, fill: "#9aa8b6" }, svg);
      txt(gl, opt.axisFormat ? opt.axisFormat((max * g) / 4) : fmt((max * g) / 4));
    }

    function X(i) { return padL + (labels.length === 1 ? plotW / 2 : (plotW * i) / (labels.length - 1)); }
    function Y(v) { return padT + plotH - (Math.min(v, max) / max) * plotH; }

    var defs = el("defs", {}, svg);
    series.forEach(function (s, si) {
      if (!s.area) return;
      var gid = "grad-" + Math.random().toString(36).slice(2, 8);
      var lg = el("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      el("stop", { offset: "0%", "stop-color": s.color || PALETTE[si], "stop-opacity": 0.22 }, lg);
      el("stop", { offset: "100%", "stop-color": s.color || PALETTE[si], "stop-opacity": 0.02 }, lg);
      s._grad = gid;
    });

    series.forEach(function (s, si) {
      var color = s.color || PALETTE[si];
      var vals = s.values || [];
      if (s.area) {
        var dArea = "M" + X(0) + " " + (padT + plotH);
        vals.forEach(function (v, i) { dArea += " L" + X(i).toFixed(1) + " " + Y(v).toFixed(1); });
        dArea += " L" + X(vals.length - 1) + " " + (padT + plotH) + " Z";
        el("path", { d: dArea, fill: "url(#" + s._grad + ")", stroke: "none" }, svg);
      }
      var d = "";
      vals.forEach(function (v, i) { d += (i ? " L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1); });
      el("path", {
        d: d, fill: "none", stroke: color, "stroke-width": s.width || 2.2,
        "stroke-linejoin": "round", "stroke-linecap": "round",
        "stroke-dasharray": s.dashed ? "5 4" : null
      }, svg);
    });

    // x labels
    var every = Math.ceil(labels.length / 10);
    labels.forEach(function (lb, i) {
      if (i % every !== 0 && i !== labels.length - 1) return;
      var t = el("text", { x: X(i), y: H - 8, "text-anchor": "middle", "font-size": 9.5, fill: "#9aa8b6" }, svg);
      txt(t, lb);
    });

    // hover columns
    var colW = labels.length > 1 ? plotW / (labels.length - 1) : plotW;
    labels.forEach(function (lb, i) {
      var rect = el("rect", {
        x: Math.max(0, X(i) - colW / 2), y: padT, width: colW, height: plotH, fill: "transparent"
      }, svg);
      bindTip(rect, function () {
        var html = "<b>" + esc(opt.tipTitle ? opt.tipTitle(lb, i) : lb) + "</b>";
        series.forEach(function (ss) {
          html += '<div class="row"><span>' + esc(ss.name) + "</span><span>" + fmt((ss.values || [])[i] || 0) + "</span></div>";
        });
        return html;
      });
      rect.addEventListener("mouseenter", function () {
        var hl = el("line", { x1: X(i), x2: X(i), y1: padT, y2: padT + plotH, stroke: "#94a3b8", "stroke-dasharray": "3 3" }, svg);
        rect._hl = hl;
      });
      rect.addEventListener("mouseleave", function () { if (rect._hl) { rect._hl.remove(); rect._hl = null; } });
    });

    if (opt.legendEl) legend(opt.legendEl, series.map(function (s, i) { return { name: s.name, color: s.color || PALETTE[i] }; }));
  }

  window.CCCharts = {
    palette: PALETTE,
    hBars: hBars,
    vBars: vBars,
    donut: donut,
    line: line,
    legend: legend,
    hideTip: hideTip,
    esc: esc
  };
})();
