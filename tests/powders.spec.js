const { test, expect } = require('./fixtures');

test.describe('powders', () => {
  test('sand falls straight down to the floor', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.set(50, 10, E.SAND);
      sandbox.step(400);
      return { floor: sandbox.get(50, H - 1), count: sandbox.count(E.SAND) };
    });
    expect(r.floor).toBe(1);
    expect(r.count).toBe(1);
  });

  test('a falling grain moves exactly one cell per tick (no double updates)', async ({ sb }) => {
    const ys = await sb.run(() => {
      const { E } = sandbox;
      sandbox.set(80, 5, E.SAND);
      const out = [];
      // 600 ticks crosses the 8-bit visited-stamp wraparound twice
      for (let k = 0; k < 200; k++) { sandbox.step(1); out.push(sandbox.cells(E.SAND)[0]); }
      return out;
    });
    ys.forEach(([x, y], k) => {
      expect(x).toBe(80);
      expect(y).toBe(Math.min(6 + k, ys[ys.length - 1][1]));
    });
  });

  test('a column of sand collapses into a pile', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(100, H - 80, 100, H - 1, E.SAND);
      sandbox.step(800);
      const c = sandbox.cells(E.SAND);
      const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
      return { width: Math.max(...xs) - Math.min(...xs), top: Math.min(...ys), H, n: c.length };
    });
    expect(r.n).toBe(80);
    expect(r.width).toBeGreaterThanOrEqual(10);
    expect(r.H - r.top).toBeLessThan(40);
  });

  test('sand sinks through water', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(29, 71, H - 45, H - 1, E.STONE);
      sandbox.fill(30, H - 21, 70, H - 2, E.WATER);
      sandbox.fill(40, H - 27, 60, H - 23, E.SAND);
      sandbox.step(1200);
      return { sand: T.meanY(E.SAND), water: T.meanY(E.WATER), ns: sandbox.count(E.SAND) };
    });
    expect(r.ns).toBe(105);
    expect(r.sand).toBeGreaterThan(r.water);
  });

  test('gunpowder falls and piles like sand', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(150, 20, 150, 59, E.POWDER);
      sandbox.step(800);
      return { n: sandbox.count(E.POWDER), top: Math.min(...sandbox.cells(E.POWDER).map((p) => p[1])), H };
    });
    expect(r.n).toBe(40);
    expect(r.top).toBeGreaterThan(r.H - 30);
  });

  test('powder mass is conserved while moving', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { W, H } = sandbox.size();
      let placed = 0;
      for (let k = 0; k < 600; k++) {
        const x = 10 + ((k * 37) % (W - 20)), y = 10 + ((k * 53) % (H - 40));
        if (sandbox.get(x, y) === 0) { sandbox.set(x, y, E.SAND); placed++; }
      }
      sandbox.step(500);
      return { placed, now: sandbox.count(E.SAND) };
    });
    expect(r.now).toBe(r.placed);
  });
});
