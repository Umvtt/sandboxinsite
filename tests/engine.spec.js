const { test, expect, PAGE } = require('./fixtures');

test.describe('engine', () => {
  test('grid fills the viewport at an integer scale', async ({ sb }) => {
    const r = await sb.run(() => {
      const c = document.getElementById('c');
      return { ...sandbox.size(), cw: c.width, ch: c.height, css: c.style.width, rendering: getComputedStyle(c).imageRendering };
    });
    expect(Number.isInteger(r.S)).toBe(true);
    expect(r.S).toBeGreaterThanOrEqual(2);
    expect(r.cw).toBe(r.W);
    expect(r.ch).toBe(r.H);
    expect(r.W * r.S).toBeGreaterThanOrEqual(1000);
    expect(r.H * r.S).toBeGreaterThanOrEqual(700);
    expect(r.css).toBe(r.W * r.S + 'px');
    expect(r.rendering).toMatch(/pixelated|crisp-edges/);
  });

  test('test mode starts paused with an empty world', async ({ sb }) => {
    const r = await sb.run(() => {
      let n = 0;
      for (let e = 1; e < sandbox.names().length; e++) n += sandbox.count(e);
      return { n, paused: sandbox.state().paused };
    });
    expect(r).toEqual({ n: 0, paused: true });
  });

  for (const scene of ['Volcano & Ocean', 'Acid Vat', 'Hourglass', 'Frozen Forge', 'Circuit Lab', 'Powder Keg']) {
    test(`scene "${scene}" loads and runs`, async ({ sb }) => {
      const r = await sb.run((name) => {
        sandbox.scene(name);
        const count = () => { let n = 0; for (let e = 1; e < sandbox.names().length; e++) n += sandbox.count(e); return n; };
        const before = count(), h0 = sandbox.hash();
        sandbox.step(300);
        return { before, after: count(), changed: sandbox.hash() !== h0, g: sandbox.gravity() };
      }, scene);
      expect(r.before).toBeGreaterThan(500);
      expect(r.after).toBeGreaterThan(0);
      expect(r.changed).toBe(true);
      expect(r.g).toBe(1);
    });
  }

  test('simulation is deterministic for a given seed', async ({ sb }) => {
    const run = () => sb.run(() => {
      sandbox.seed(42);
      sandbox.scene('Volcano & Ocean');
      sandbox.step(250);
      return sandbox.hash();
    });
    const a = await run();
    await sb.page.goto(PAGE);
    await sb.page.waitForFunction(() => !!window.sandbox);
    const b = await run();
    expect(a).toBe(b);
  });

  test('a busy world steps quickly', async ({ sb }) => {
    const ms = await sb.run(() => {
      sandbox.scene('Volcano & Ocean');
      sandbox.step(30);
      const t0 = performance.now();
      sandbox.step(120);
      return (performance.now() - t0) / 120;
    });
    console.log(`avg step: ${ms.toFixed(2)} ms`);
    expect(ms).toBeLessThan(16);
  });

  test('renderer draws background for empty cells and colour for particles', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.set(50, 50, E.STONE);
      sandbox.set(60, 50, E.WATER);
      sandbox.render();
      return {
        empty: sandbox.pixel(40, 50) === sandbox.background(40, 50),
        stone: sandbox.pixel(50, 50) !== sandbox.background(50, 50),
        water: sandbox.pixel(60, 50) !== sandbox.background(60, 50),
        opaque: (sandbox.pixel(50, 50) >>> 24) === 255,
        particles: sandbox.state().particles,
      };
    });
    expect(r).toEqual({ empty: true, stone: true, water: true, opaque: true, particles: 2 });
  });

  test('particles keep their colour variant as they move', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.set(70, 10, E.SAND);
      sandbox.render();
      const c0 = sandbox.pixel(70, 10);
      sandbox.step(400);
      sandbox.render();
      return { c0, c1: sandbox.pixel(70, H - 1) };
    });
    expect(r.c1).toBe(r.c0);
  });

  test('the real-time loop runs at a fixed rate when unpaused', async ({ sb }) => {
    await sb.run(() => { sandbox.scene('Hourglass'); sandbox.pause(false); });
    await sb.page.waitForTimeout(1600);
    const s = await sb.run(() => sandbox.state());
    expect(s.fps).toBeGreaterThan(0);
    expect(s.tps).toBeGreaterThan(20);
    expect(s.tps).toBeLessThanOrEqual(70);
    await expect(sb.page.locator('#sCount')).not.toHaveText('0');
  });

  test('vortex pulls loose particles off the ground toward the cursor', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(80, H - 10, 140, H - 1, E.SAND);
      const lifted = () => sandbox.cells(E.SAND).filter((p) => p[1] < H - 15).length;
      const before = lifted();
      let best = 0;
      for (let k = 0; k < 40; k++) { sandbox.vortex(110, H - 25, 30, false); sandbox.step(1); best = Math.max(best, lifted()); }
      return { before, best };
    });
    expect(r.before).toBe(0);
    expect(r.best).toBeGreaterThan(20);
  });

  test('vortex repel pushes particles away', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(100, 100, 120, 120, E.SMOKE);
      const spread = () => { const c = sandbox.cells(E.SMOKE); return c.reduce((s, [x, y]) => s + Math.hypot(x - 110, y - 110), 0) / c.length; };
      const d0 = spread();
      for (let k = 0; k < 5; k++) { sandbox.vortex(110, 110, 25, true); sandbox.step(1); }
      return { d0, d1: spread() };
    });
    expect(r.d1).toBeGreaterThan(r.d0);
  });
});
