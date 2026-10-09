# Simple2D

A tiny, dependency-free vanilla-JS library for plotting 2D graphs on the Cartesian plane, drawn on a `<canvas>`.

```html
<canvas id="g" style="width:600px;height:400px"></canvas>
<script src="src/simple2d.js"></script>
<script>
  Simple2D.create('#g', { xMin: -10, xMax: 10, yMin: -2, yMax: 2, title: 'Waves' })
    .plotFunction(Math.sin, { label: 'sin(x)' })
    .plotFunction(Math.cos, { label: 'cos(x)', dash: [6, 4] });
</script>
```

Open `index.html` for a live demo. Drag to pan, scroll to zoom, double-click to reset.

## API

### `Simple2D.create(canvasOrSelector, options)` → `Graph`

Size the canvas with CSS (`width`/`height`); the library handles HiDPI scaling. Call `graph.resize()` when its size changes.

| Option | Default | Description |
|---|---|---|
| `xMin, xMax, yMin, yMax` | `-10, 10` | Visible data range |
| `grid`, `axes`, `ticks`, `labels` | `true` | Toggle grid, axes, tick marks, tick numbers |
| `title`, `xLabel`, `yLabel` | `''` | Text annotations |
| `legend` | `true` | Shows series that have a `label` |
| `interactive` | `true` | Drag-pan, wheel-zoom, double-click reset |
| `equalAspect` | `false` | 1 x-unit = 1 y-unit on screen |
| `padding` | `{top:20,right:20,bottom:36,left:48}` | Space around plot area (px) |
| `background`, `gridColor`, `axisColor`, `textColor`, `font` | | Styling |

### Plotting (all chainable)

- `plotFunction(fn, {color, width, label, dash, samples})`: `y = fn(x)`; re-sampled on pan/zoom; gaps at `NaN`/asymptotes.
- `plotParametric(xf, yf, {tMin, tMax, samples, ...})`: `(x(t), y(t))`.
- `plotPoints([[x,y],…] | [{x,y},…], {mode: 'line'|'scatter'|'both', radius, ...})`.
- `clear()`: remove all series.
- `setRange({xMin,xMax,yMin,yMax})`, `resetView()`, `render()`, `resize()`.
- `toPixel(x, y)` / `toData(px, py)`: coordinate conversion.
