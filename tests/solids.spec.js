const { test, expect } = require('./fixtures');

test.describe('solids', () => {
  test('stone, glass, metal and unlit wood stay exactly where they are', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      const els = [E.STONE, E.GLASS, E.METAL, E.WOOD];
      els.forEach((el, k) => sandbox.fill(30 + k * 40, 40, 50 + k * 40, 60, el));
      const before = els.map((el) => T.snapshot(el));
      sandbox.step(300);
      return els.map((el, k) => before[k] === T.snapshot(el));
    });
    expect(r).toEqual([true, true, true, true]);
  });

  test('ice stays frozen in open air and in room-temperature water', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(150, 40, 160, 50, E.ICE);
      T.box(20, 60, H - 30, H - 1, E.STONE);
      sandbox.fill(21, H - 15, 59, H - 2, E.WATER);
      sandbox.fill(38, H - 10, 42, H - 6, E.ICE);
      sandbox.step(2000);
      return { air: sandbox.count(E.ICE), airTemp: sandbox.tempAt(155, 45) };
    });
    expect(r.air).toBe(121 + 25);
    expect(r.airTemp).toBeLessThan(0);
  });

  test('cold water touching ice freezes', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 60, H - 30, H - 1, E.STONE);
      sandbox.fill(21, H - 15, 59, H - 2, E.WATER);
      sandbox.fill(38, H - 10, 42, H - 6, E.ICE);
      const ice = sandbox.count(E.ICE);
      for (let k = 0; k < 300; k++) { sandbox.heat(40, H - 8, 14, -25); sandbox.step(1); }
      return { ice, after: sandbox.count(E.ICE) };
    });
    expect(r.after).toBeGreaterThan(r.ice + 50);
  });

  test('heat melts ice', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 60, H - 30, H - 1, E.METAL);
      sandbox.fill(21, H - 6, 59, H - 2, E.ICE);
      const ice = sandbox.count(E.ICE);
      sandbox.fill(21, H - 9, 59, H - 7, E.LAVA);
      sandbox.step(400);
      return { ice, after: sandbox.count(E.ICE) };
    });
    expect(r.after).toBeLessThan(r.ice);
  });

  test('plants grow into water', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 60, H - 30, H - 1, E.STONE);
      sandbox.fill(21, H - 15, 59, H - 2, E.WATER);
      sandbox.set(40, H - 2, E.PLANT);
      sandbox.step(2000);
      return sandbox.count(E.PLANT);
    });
    expect(r).toBeGreaterThan(5);
  });

  test('plants burn', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(60, H - 10, 80, H - 1, E.PLANT);
      const plant = sandbox.count(E.PLANT);
      sandbox.fill(60, H - 12, 80, H - 11, E.FIRE);
      sandbox.step(1500);
      return { plant, after: sandbox.count(E.PLANT) };
    });
    expect(r.after).toBeLessThan(r.plant);
  });
});
