/*! Simple2D v0.1.0 | MIT */
/*!
 * Simple2D — a tiny vanilla-JS library for plotting 2D graphs on the Cartesian plane.
 * No dependencies. Renders to a <canvas>. MIT licensed.
 */
(function(root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Simple2D = factory();
})(typeof self !== "undefined" ? self : this, function() {
  "use strict";
  var PALETTE = ["#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2"];
  var DEFAULTS = {
    xMin: -10,
    xMax: 10,
    yMin: -10,
    yMax: 10,
    padding: { top: 20, right: 20, bottom: 36, left: 48 },
    grid: true,
    axes: true,
    ticks: true,
    labels: true,
    // numeric tick labels
    xLabel: "",
    yLabel: "",
    title: "",
    legend: true,
    interactive: true,
    // drag to pan, wheel to zoom, double-click to reset
    equalAspect: false,
    // keep 1 unit on x equal to 1 unit on y
    background: "#ffffff",
    gridColor: "#e5e7eb",
    axisColor: "#111827",
    textColor: "#374151",
    font: "12px system-ui, sans-serif"
  };
  function extend(target) {
    for (var i = 1; i < arguments.length; i++) {
      var src = arguments[i];
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }
  function niceStep(raw) {
    var exp = Math.floor(Math.log10(raw));
    var f = raw / Math.pow(10, exp);
    var nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nice * Math.pow(10, exp);
  }
  function formatTick(v, step) {
    if (Math.abs(v) < step * 1e-9) return "0";
    var decimals = Math.max(0, -Math.floor(Math.log10(step)));
    if (Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4 && v !== 0) return v.toExponential(1);
    return v.toFixed(Math.min(decimals, 10));
  }
  function Graph(target, options) {
    var canvas = typeof target === "string" ? document.querySelector(target) : target;
    if (!canvas || canvas.tagName !== "CANVAS") throw new Error("Simple2D: target must be a <canvas> element or selector");
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.opts = extend({}, DEFAULTS, options);
    this.opts.padding = extend({}, DEFAULTS.padding, (options || {}).padding);
    this.series = [];
    this._home = null;
    this._home = this._view();
    this.resize();
    if (this.opts.interactive) this._bindEvents();
  }
  Graph.prototype._view = function() {
    var o = this.opts;
    return { xMin: o.xMin, xMax: o.xMax, yMin: o.yMin, yMax: o.yMax };
  };
  Graph.prototype._setView = function(v) {
    this.opts.xMin = v.xMin;
    this.opts.xMax = v.xMax;
    this.opts.yMin = v.yMin;
    this.opts.yMax = v.yMax;
  };
  Graph.prototype.resize = function() {
    var dpr = window.devicePixelRatio || 1;
    var rect = this.canvas.getBoundingClientRect();
    var w = rect.width || this.canvas.width / dpr;
    var h = rect.height || this.canvas.height / dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = w;
    this.height = h;
    return this.render();
  };
  Graph.prototype._area = function() {
    var p = this.opts.padding;
    return { x: p.left, y: p.top, w: this.width - p.left - p.right, h: this.height - p.top - p.bottom };
  };
  Graph.prototype.toPixel = function(x, y) {
    var o = this.opts, a = this._area();
    return {
      x: a.x + (x - o.xMin) / (o.xMax - o.xMin) * a.w,
      y: a.y + (o.yMax - y) / (o.yMax - o.yMin) * a.h
    };
  };
  Graph.prototype.toData = function(px, py) {
    var o = this.opts, a = this._area();
    return {
      x: o.xMin + (px - a.x) / a.w * (o.xMax - o.xMin),
      y: o.yMax - (py - a.y) / a.h * (o.yMax - o.yMin)
    };
  };
  Graph.prototype._add = function(s) {
    s.color = s.color || PALETTE[this.series.length % PALETTE.length];
    s.width = s.width || 2;
    this.series.push(s);
    this.render();
    return this;
  };
  Graph.prototype.plotFunction = function(fn, options) {
    return this._add(extend({ type: "function", fn }, options));
  };
  Graph.prototype.plotParametric = function(xf, yf, options) {
    return this._add(extend({ type: "parametric", xf, yf, tMin: 0, tMax: 2 * Math.PI, samples: 500 }, options));
  };
  Graph.prototype.plotPoints = function(points, options) {
    var pts = points.map(function(p) {
      return Array.isArray(p) ? { x: p[0], y: p[1] } : p;
    });
    return this._add(extend({ type: "points", points: pts, mode: "line", radius: 3.5 }, options));
  };
  Graph.prototype.plotBars = function(data, options) {
    var pts = data.map(function(d, i) {
      if (typeof d === "number") return { x: i, y: d };
      return Array.isArray(d) ? { x: d[0], y: d[1] } : d;
    });
    return this._add(extend({ type: "bars", points: pts, barWidth: 0.8, base: 0 }, options));
  };
  Graph.prototype.fit = function(margin) {
    var m = margin == null ? 0.08 : margin;
    var xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    this.series.forEach(function(s) {
      if (!s.points) return;
      var half = s.type === "bars" ? s.barWidth / 2 : 0;
      if (s.type === "bars") {
        yMin = Math.min(yMin, s.base);
        yMax = Math.max(yMax, s.base);
      }
      s.points.forEach(function(p) {
        xMin = Math.min(xMin, p.x - half);
        xMax = Math.max(xMax, p.x + half);
        yMin = Math.min(yMin, p.y);
        yMax = Math.max(yMax, p.y);
      });
    });
    if (xMin === Infinity) return this;
    var dx = xMax - xMin || 1, dy = yMax - yMin || 1;
    return this.setRange({ xMin: xMin - dx * m, xMax: xMax + dx * m, yMin: yMin - dy * m, yMax: yMax + dy * m });
  };
  Graph.prototype.clear = function() {
    this.series = [];
    return this.render();
  };
  Graph.prototype.setRange = function(r) {
    extend(this.opts, r);
    this._home = this._view();
    return this.render();
  };
  Graph.prototype.resetView = function() {
    this._setView(this._home);
    return this.render();
  };
  Graph.prototype.render = function() {
    var ctx = this.ctx, o = this.opts, a = this._area();
    if (!this.width) return this;
    if (o.equalAspect) this._applyEqualAspect();
    ctx.save();
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.font = o.font;
    var xStep = niceStep((o.xMax - o.xMin) / Math.max(2, a.w / 80));
    var yStep = niceStep((o.yMax - o.yMin) / Math.max(2, a.h / 60));
    if (o.grid) this._drawGrid(xStep, yStep);
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, a.w, a.h);
    ctx.clip();
    for (var i = 0; i < this.series.length; i++) this._drawSeries(this.series[i]);
    ctx.restore();
    if (o.axes) this._drawAxes(xStep, yStep);
    this._drawFrameText();
    if (o.legend) this._drawLegend();
    ctx.restore();
    return this;
  };
  Graph.prototype._applyEqualAspect = function() {
    var o = this.opts, a = this._area();
    var ppuX = a.w / (o.xMax - o.xMin);
    var ppuY = a.h / (o.yMax - o.yMin);
    var ppu = Math.min(ppuX, ppuY);
    var cx = (o.xMin + o.xMax) / 2, cy = (o.yMin + o.yMax) / 2;
    o.xMin = cx - a.w / ppu / 2;
    o.xMax = cx + a.w / ppu / 2;
    o.yMin = cy - a.h / ppu / 2;
    o.yMax = cy + a.h / ppu / 2;
  };
  Graph.prototype._drawGrid = function(xStep, yStep) {
    var ctx = this.ctx, o = this.opts, a = this._area(), v, p;
    ctx.strokeStyle = o.gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (v = Math.ceil(o.xMin / xStep) * xStep; v <= o.xMax; v += xStep) {
      p = Math.round(this.toPixel(v, 0).x) + 0.5;
      ctx.moveTo(p, a.y);
      ctx.lineTo(p, a.y + a.h);
    }
    for (v = Math.ceil(o.yMin / yStep) * yStep; v <= o.yMax; v += yStep) {
      p = Math.round(this.toPixel(0, v).y) + 0.5;
      ctx.moveTo(a.x, p);
      ctx.lineTo(a.x + a.w, p);
    }
    ctx.stroke();
  };
  Graph.prototype._drawAxes = function(xStep, yStep) {
    var ctx = this.ctx, o = this.opts, a = this._area(), v, p, label;
    var origin = this.toPixel(0, 0);
    var axisY = Math.min(Math.max(origin.y, a.y), a.y + a.h);
    var cats = this._categories();
    var axisX = cats ? a.x : Math.min(Math.max(origin.x, a.x), a.x + a.w);
    ctx.strokeStyle = o.axisColor;
    ctx.fillStyle = o.textColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, axisY);
    ctx.lineTo(a.x + a.w, axisY);
    ctx.moveTo(axisX, a.y);
    ctx.lineTo(axisX, a.y + a.h);
    ctx.stroke();
    if (!o.ticks && !o.labels) return;
    ctx.lineWidth = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var labelY = Math.min(axisY + 6, a.y + a.h + 6);
    var xAxisAtBottom = axisY >= a.y + a.h - 1;
    if (cats) {
      for (var ci = 0; ci < cats.length; ci++) {
        if (ci < o.xMin || ci > o.xMax) continue;
        p = this.toPixel(ci, 0).x;
        if (o.ticks) {
          ctx.beginPath();
          ctx.moveTo(p, axisY - 4);
          ctx.lineTo(p, axisY + 4);
          ctx.stroke();
        }
        if (o.labels) ctx.fillText(String(cats[ci]), p, xAxisAtBottom ? a.y + a.h + 6 : labelY);
      }
    } else {
      for (v = Math.ceil(o.xMin / xStep) * xStep; v <= o.xMax; v += xStep) {
        if (Math.abs(v) < xStep * 1e-9) continue;
        p = this.toPixel(v, 0).x;
        if (o.ticks) {
          ctx.beginPath();
          ctx.moveTo(p, axisY - 4);
          ctx.lineTo(p, axisY + 4);
          ctx.stroke();
        }
        if (o.labels) ctx.fillText(formatTick(v, xStep), p, xAxisAtBottom ? a.y + a.h + 6 : labelY);
      }
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    var yAxisAtLeft = axisX <= a.x + 1;
    for (v = Math.ceil(o.yMin / yStep) * yStep; v <= o.yMax; v += yStep) {
      if (Math.abs(v) < yStep * 1e-9) continue;
      p = this.toPixel(0, v).y;
      if (o.ticks) {
        ctx.beginPath();
        ctx.moveTo(axisX - 4, p);
        ctx.lineTo(axisX + 4, p);
        ctx.stroke();
      }
      if (o.labels) ctx.fillText(formatTick(v, yStep), yAxisAtLeft ? a.x - 6 : axisX - 6, p);
    }
    if (o.labels && !cats && origin.x >= a.x && origin.x <= a.x + a.w && origin.y >= a.y && origin.y <= a.y + a.h) {
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("0", origin.x - 5, origin.y + 5);
    }
  };
  Graph.prototype._drawFrameText = function() {
    var ctx = this.ctx, o = this.opts, a = this._area();
    ctx.fillStyle = o.textColor;
    if (o.title) {
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(o.title, a.x + a.w / 2, 3);
    }
    ctx.font = o.font;
    if (o.xLabel) {
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(o.xLabel, a.x + a.w / 2, this.height - 2);
    }
    if (o.yLabel) {
      ctx.save();
      ctx.translate(12, a.y + a.h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(o.yLabel, 0, 0);
      ctx.restore();
    }
  };
  Graph.prototype._drawLegend = function() {
    var labelled = this.series.filter(function(s2) {
      return s2.label;
    });
    if (!labelled.length) return;
    var ctx = this.ctx, a = this._area(), o = this.opts;
    ctx.font = o.font;
    var w = 0, i;
    for (i = 0; i < labelled.length; i++) w = Math.max(w, ctx.measureText(labelled[i].label).width);
    var boxW = w + 40, boxH = labelled.length * 18 + 10;
    var x = a.x + a.w - boxW - 8, y = a.y + 8;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.strokeStyle = o.gridColor;
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, boxW, boxH);
    ctx.strokeRect(x + 0.5, y + 0.5, boxW, boxH);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (i = 0; i < labelled.length; i++) {
      var s = labelled[i], cy = y + 14 + i * 18;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.setLineDash(s.dash || []);
      if (s.type === "bars") {
        ctx.fillStyle = s.color;
        ctx.fillRect(x + 10, cy - 5, 14, 10);
      } else {
        ctx.beginPath();
        ctx.moveTo(x + 8, cy);
        ctx.lineTo(x + 26, cy);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = o.textColor;
      ctx.fillText(s.label, x + 32, cy);
    }
  };
  Graph.prototype._drawSeries = function(s) {
    var ctx = this.ctx;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineJoin = "round";
    ctx.setLineDash(s.dash || []);
    if (s.type === "function") this._drawFunction(s);
    else if (s.type === "parametric") this._drawParametric(s);
    else if (s.type === "points") this._drawPoints(s);
    else if (s.type === "bars") this._drawBars(s);
    ctx.setLineDash([]);
  };
  Graph.prototype._drawBars = function(s) {
    var ctx = this.ctx;
    for (var i = 0; i < s.points.length; i++) {
      var p = s.points[i];
      var a = this.toPixel(p.x - s.barWidth / 2, p.y);
      var b = this.toPixel(p.x + s.barWidth / 2, s.base);
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    }
  };
  Graph.prototype._categories = function() {
    for (var i = 0; i < this.series.length; i++) {
      if (this.series[i].categories) return this.series[i].categories;
    }
    return null;
  };
  Graph.prototype._strokePath = function(pts) {
    var ctx = this.ctx, a = this._area();
    var limit = a.h * 4, pen = false, prev = null;
    ctx.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      if (!p || !isFinite(p.x) || !isFinite(p.y)) {
        pen = false;
        prev = null;
        continue;
      }
      if (pen && prev && Math.abs(p.y - prev.y) > limit) pen = false;
      if (pen) ctx.lineTo(p.x, p.y);
      else ctx.moveTo(p.x, p.y);
      pen = true;
      prev = p;
    }
    ctx.stroke();
  };
  Graph.prototype._drawFunction = function(s) {
    var o = this.opts, a = this._area();
    var n = s.samples || Math.ceil(a.w * 1.5);
    var pts = [];
    for (var i = 0; i <= n; i++) {
      var x = o.xMin + (o.xMax - o.xMin) * i / n, y;
      try {
        y = s.fn(x);
      } catch (e) {
        y = NaN;
      }
      pts.push(typeof y === "number" ? this.toPixel(x, y) : null);
    }
    this._strokePath(pts);
  };
  Graph.prototype._drawParametric = function(s) {
    var pts = [];
    for (var i = 0; i <= s.samples; i++) {
      var t = s.tMin + (s.tMax - s.tMin) * i / s.samples;
      var x, y;
      try {
        x = s.xf(t);
        y = s.yf(t);
      } catch (e) {
        x = y = NaN;
      }
      pts.push(this.toPixel(x, y));
    }
    this._strokePath(pts);
  };
  Graph.prototype._drawPoints = function(s) {
    var ctx = this.ctx, pts = s.points.map(function(p) {
      return this.toPixel(p.x, p.y);
    }, this);
    if (s.mode === "line" || s.mode === "both") this._strokePath(pts);
    if (s.mode === "scatter" || s.mode === "both") {
      for (var i = 0; i < pts.length; i++) {
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, s.radius, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
  };
  Graph.prototype._bindEvents = function() {
    var self2 = this, canvas = this.canvas, drag = null;
    canvas.style.touchAction = "none";
    canvas.style.cursor = "grab";
    function local(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    canvas.addEventListener("pointerdown", function(e) {
      var p = local(e);
      drag = { x: p.x, y: p.y, view: self2._view() };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = "grabbing";
    });
    canvas.addEventListener("pointermove", function(e) {
      if (!drag) return;
      var p = local(e), a = self2._area(), v = drag.view;
      var dx = (p.x - drag.x) / a.w * (v.xMax - v.xMin);
      var dy = (p.y - drag.y) / a.h * (v.yMax - v.yMin);
      self2._setView({ xMin: v.xMin - dx, xMax: v.xMax - dx, yMin: v.yMin + dy, yMax: v.yMax + dy });
      self2.render();
    });
    function end() {
      drag = null;
      canvas.style.cursor = "grab";
    }
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", end);
    canvas.addEventListener("wheel", function(e) {
      e.preventDefault();
      var p = local(e), c = self2.toData(p.x, p.y), o = self2.opts;
      var k = Math.exp(e.deltaY * 15e-4);
      self2._setView({
        xMin: c.x + (o.xMin - c.x) * k,
        xMax: c.x + (o.xMax - c.x) * k,
        yMin: c.y + (o.yMin - c.y) * k,
        yMax: c.y + (o.yMax - c.y) * k
      });
      self2.render();
    }, { passive: false });
    canvas.addEventListener("dblclick", function() {
      self2.resetView();
    });
  };
  return {
    Graph,
    create: function(target, options) {
      return new Graph(target, options);
    },
    _internals: { niceStep, formatTick }
  };
});
