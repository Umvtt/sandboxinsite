// Injected into the page before load; helpers built on top of window.sandbox.
window.T = {
  meanY(e) {
    const c = sandbox.cells(e);
    return c.length ? c.reduce((s, p) => s + p[1], 0) / c.length : NaN;
  },
  meanX(e) {
    const c = sandbox.cells(e);
    return c.length ? c.reduce((s, p) => s + p[0], 0) / c.length : NaN;
  },
  // Open-topped container: walls at x0 and x1 from `top` to `bottom`, floor along `bottom`.
  box(x0, x1, top, bottom, el) {
    sandbox.fill(x0, top, x0, bottom, el);
    sandbox.fill(x1, top, x1, bottom, el);
    sandbox.fill(x0, bottom, x1, bottom, el);
  },
  burning() {
    const { E } = sandbox;
    return sandbox.cells(E.WOOD).filter(([x, y]) => sandbox.lifeAt(x, y) > 0).length;
  },
  columnHeights(e, x0, x1) {
    const { H } = sandbox.size();
    const out = [];
    for (let x = x0; x <= x1; x++) {
      let n = 0;
      for (let y = 0; y < H; y++) if (sandbox.get(x, y) === e) n++;
      out.push(n);
    }
    return out;
  },
  snapshot(e) {
    return JSON.stringify(sandbox.cells(e));
  },
};
