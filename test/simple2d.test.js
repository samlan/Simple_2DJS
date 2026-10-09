const test = require('node:test');
const assert = require('node:assert/strict');
const { makeCanvas } = require('./helpers');
const S = require('../src/simple2d.js');
const { niceStep, formatTick } = S._internals;

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);
const make = (opts) => {
  const c = makeCanvas();
  const g = S.create(c, Object.assign({ interactive: false, padding: { top: 0, right: 0, bottom: 0, left: 0 } }, opts));
  return { c, g, calls: c.calls };
};
const count = (calls, name) => calls.filter((x) => x[0] === name).length;

test('niceStep rounds to 1, 2, 5 x 10^n', () => {
  assert.equal(niceStep(0.9), 1);
  assert.equal(niceStep(1.5), 2);
  assert.equal(niceStep(3), 5);
  assert.equal(niceStep(7), 10);
  assert.equal(niceStep(0.013), 0.02);
  assert.equal(niceStep(130), 200);
});

test('formatTick', () => {
  assert.equal(formatTick(0, 1), '0');
  assert.equal(formatTick(2, 1), '2');
  assert.equal(formatTick(0.5, 0.5), '0.5');
  assert.equal(formatTick(0.25, 0.05), '0.25');
  assert.equal(formatTick(2e6, 1e6), '2.0e+6');
});

test('create accepts canvas, rejects non-canvas', () => {
  assert.ok(make().g);
  assert.throws(() => S.create({ tagName: 'DIV' }), /canvas/);
});

test('toPixel / toData map the corners and round-trip', () => {
  const { g } = make({ xMin: -10, xMax: 10, yMin: -5, yMax: 5 });
  assert.deepEqual(g.toPixel(-10, 5), { x: 0, y: 0 });
  assert.deepEqual(g.toPixel(10, -5), { x: 600, y: 400 });
  assert.deepEqual(g.toPixel(0, 0), { x: 300, y: 200 });
  const d = g.toData(450, 100);
  near(d.x, 5); near(d.y, 2.5);
  const p = g.toPixel(d.x, d.y);
  near(p.x, 450); near(p.y, 100);
});

test('setRange and resetView', () => {
  const { g } = make();
  g.setRange({ xMin: 0, xMax: 1 });
  assert.equal(g.opts.xMin, 0);
  g.opts.xMin = -3;               // simulate a pan
  g.resetView();
  assert.equal(g.opts.xMin, 0);
  assert.equal(g.opts.xMax, 1);
});

test('equalAspect makes x and y scales identical', () => {
  const { g } = make({ equalAspect: true, xMin: -1, xMax: 1, yMin: -1, yMax: 1 });
  const a = g.toPixel(0, 0), b = g.toPixel(1, 1);
  near(b.x - a.x, a.y - b.y, 1e-6);
});

test('plotFunction draws a path; NaN breaks the line', () => {
  const { g, calls } = make({ xMin: -1, xMax: 1, yMin: -1, yMax: 1 });
  g.clear(); calls.length = 0;
  g.plotFunction((x) => (x < 0 ? NaN : x));
  const moves = count(calls, 'moveTo');
  assert.ok(count(calls, 'lineTo') > 100);
  calls.length = 0;
  g.clear().plotFunction((x) => x);
  assert.ok(count(calls, 'lineTo') > count(calls, 'moveTo'));
  assert.ok(moves > 0);
});

test('function that throws does not crash rendering', () => {
  const { g } = make();
  assert.doesNotThrow(() => g.plotFunction(() => { throw new Error('x'); }));
});

test('pen lifts at asymptotes (tan): extra strokes vs a continuous curve', () => {
  const moves = (fn) => {
    const { g, calls } = make({ xMin: -3, xMax: 3, yMin: -2, yMax: 2 });
    g.clear(); calls.length = 0;
    g.plotFunction(fn);
    return count(calls, 'moveTo');
  };
  // tan has two asymptotes in [-3,3] (±pi/2): at least one pen lift each
  // (samples hugging a pole can add a few more, all off-screen)
  assert.ok(moves(Math.tan) - moves(Math.sin) >= 2);
});

test('plotParametric and plotPoints formats', () => {
  const { g } = make();
  g.plotParametric(Math.cos, Math.sin);
  g.plotPoints([[0, 0], [1, 1]]);
  g.plotPoints([{ x: 0, y: 0 }, { x: 2, y: 2 }], { mode: 'scatter' });
  assert.equal(g.series.length, 3);
  assert.deepEqual(g.series[1].points, [{ x: 0, y: 0 }, { x: 1, y: 1 }]);
});

test('scatter mode draws one arc per point', () => {
  const { g, calls } = make();
  calls.length = 0;
  g.plotPoints([[0, 0], [1, 1], [2, 2]], { mode: 'scatter' });
  assert.equal(count(calls, 'arc'), 3);
});

test('series get distinct default colours', () => {
  const { g } = make();
  g.plotFunction(Math.sin).plotFunction(Math.cos);
  assert.notEqual(g.series[0].color, g.series[1].color);
});

test('plotBars normalises number / pair / object data', () => {
  const { g } = make();
  g.plotBars([3, 5]);
  g.plotBars([[10, 1]]);
  g.plotBars([{ x: 4, y: 2 }]);
  assert.deepEqual(g.series[0].points, [{ x: 0, y: 3 }, { x: 1, y: 5 }]);
  assert.deepEqual(g.series[1].points, [{ x: 10, y: 1 }]);
  assert.deepEqual(g.series[2].points, [{ x: 4, y: 2 }]);
});

test('bars draw one rect each, with correct geometry', () => {
  const { g, calls } = make({ xMin: -1, xMax: 3, yMin: 0, yMax: 10, grid: false });
  calls.length = 0;
  g.plotBars([5, 10]);
  const rects = calls.filter((c) => c[0] === 'fillRect').slice(1); // [0] is the background
  assert.equal(rects.length, 2);
  // bar 0: x 0±0.4 -> pixels 0.6*150..1.4*150 ; height 5/10 of 400
  const [, x, y, w, h] = rects[0];
  near(x, 0.6 * 150); near(w, 0.8 * 150); near(h, 200); near(y, 200);
});

test('negative bars hang below the base', () => {
  const { g, calls } = make({ xMin: -1, xMax: 1, yMin: -10, yMax: 10, grid: false });
  calls.length = 0;
  g.plotBars([-5]);
  const [, , y, , h] = calls.filter((c) => c[0] === 'fillRect')[1];
  near(y, 200); near(h, 100);
});

test('fit() covers bars incl. base and half bar width', () => {
  const { g } = make();
  g.plotBars([2, 8, 5]);
  g.fit(0);
  near(g.opts.xMin, -0.4); near(g.opts.xMax, 2.4);
  near(g.opts.yMin, 0); near(g.opts.yMax, 8);
});

test('fit() with margin and with no data', () => {
  const { g } = make({ xMin: -5, xMax: 5 });
  g.fit();                       // nothing to fit: unchanged
  assert.equal(g.opts.xMin, -5);
  g.plotPoints([[0, 0], [10, 10]]);
  g.fit(0.1);
  near(g.opts.xMin, -1); near(g.opts.xMax, 11);
});

test('categories replace numeric x labels', () => {
  const { g, calls } = make({ xMin: -1, xMax: 3, yMin: 0, yMax: 10 });
  calls.length = 0;
  g.plotBars([1, 2], { categories: ['Apples', 'Pears'] });
  const texts = calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
  assert.ok(texts.includes('Apples') && texts.includes('Pears'));
  assert.ok(!texts.includes('1'));   // numeric x labels suppressed
});

test('legend draws labels', () => {
  const { g, calls } = make();
  calls.length = 0;
  g.plotFunction(Math.sin, { label: 'sine' });
  assert.ok(calls.some((c) => c[0] === 'fillText' && c[1] === 'sine'));
});
