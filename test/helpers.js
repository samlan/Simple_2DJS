// A recording fake canvas so the library can run under plain Node (no browser needed).
function makeCanvas(w = 600, h = 400) {
  const calls = [];
  const ctx = new Proxy({}, {
    get(t, k) {
      if (k === 'calls') return calls;
      if (k === 'measureText') return (s) => ({ width: String(s).length * 6 });
      if (k in t) return t[k];
      return (...args) => { calls.push([k, ...args]); };
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  return {
    tagName: 'CANVAS', style: {}, width: w, height: h, calls,
    getContext: () => ctx,
    getBoundingClientRect: () => ({ width: w, height: h, left: 0, top: 0 }),
    addEventListener() {}, setPointerCapture() {}
  };
}
global.window = { devicePixelRatio: 1 };
module.exports = { makeCanvas };
