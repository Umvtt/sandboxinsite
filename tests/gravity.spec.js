const { test, expect } = require('./fixtures');

test.describe('gravity flip', () => {
  test('powders fall toward the ceiling', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.gravity(-1);
      sandbox.set(70, H - 10, E.SAND);
      sandbox.step(400);
      return { g: sandbox.gravity(), at: sandbox.get(70, 0) };
    });
    expect(r.g).toBe(-1);
    expect(r.at).toBe(1);
  });

  test('liquids pool on the ceiling', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.gravity(-1);
      sandbox.fill(60, H - 30, 80, H - 20, E.WATER);
      sandbox.step(800);
      return { y: T.meanY(E.WATER) };
    });
    expect(r.y).toBeLessThan(10);
  });

  test('gases rise the other way', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.gravity(-1);
      sandbox.fill(100, 20, 110, 25, E.SMOKE);
      const y0 = T.meanY(E.SMOKE);
      sandbox.step(30);
      return { y0, y1: T.meanY(E.SMOKE) };
    });
    expect(r.y1).toBeGreaterThan(r.y0);
  });

  test('flipping back restores normal gravity', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.gravity(-1);
      sandbox.gravity(1);
      sandbox.set(70, 10, E.SAND);
      sandbox.step(400);
      return sandbox.get(70, H - 1);
    });
    expect(r).toBe(1);
  });
});
