const { test, expect } = require('./fixtures');

test.describe('liquids', () => {
  test('water levels out across a container and is conserved', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 80, H - 60, H - 1, E.STONE);
      sandbox.fill(21, H - 41, 30, H - 2, E.WATER);
      const before = sandbox.count(E.WATER);
      sandbox.step(2000);
      const h = T.columnHeights(E.WATER, 21, 79);
      return { before, after: sandbox.count(E.WATER), spread: Math.max(...h) - Math.min(...h) };
    });
    expect(r.after).toBe(r.before);
    expect(r.spread).toBeLessThanOrEqual(2);
  });

  test('oil floats on top of water', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 41, H - 50, H - 1, E.STONE);
      sandbox.fill(21, H - 11, 40, H - 2, E.OIL);
      sandbox.fill(21, H - 21, 40, H - 12, E.WATER);
      sandbox.step(2500);
      return { oil: T.meanY(E.OIL), water: T.meanY(E.WATER) };
    });
    expect(r.oil).toBeLessThan(r.water);
  });

  test('acid dissolves stone but leaves glass intact', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 40, H - 30, H - 2, E.GLASS);
      sandbox.fill(21, H - 20, 39, H - 3, E.ACID);
      sandbox.fill(60, H - 6, 100, H - 1, E.STONE);
      sandbox.fill(65, H - 26, 95, H - 7, E.ACID);
      const glass = sandbox.count(E.GLASS), stone = sandbox.count(E.STONE);
      sandbox.step(1500);
      return { glass, stone, glassAfter: sandbox.count(E.GLASS), stoneAfter: sandbox.count(E.STONE) };
    });
    expect(r.glassAfter).toBe(r.glass);
    expect(r.stoneAfter).toBeLessThan(r.stone * 0.8);
  });

  test('acid also dissolves wood, sand and metal', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      const out = {};
      for (const [name, el, x] of [['wood', E.WOOD, 20], ['sand', E.SAND, 80], ['metal', E.METAL, 140]]) {
        T.box(x, x + 40, H - 40, H - 1, E.GLASS);
        sandbox.fill(x + 1, H - 8, x + 39, H - 2, el);
        sandbox.fill(x + 1, H - 28, x + 39, H - 9, E.ACID);
        out[name] = { before: sandbox.count(el) };
      }
      sandbox.step(2500);
      out.wood.after = sandbox.count(E.WOOD);
      out.sand.after = sandbox.count(E.SAND);
      out.metal.after = sandbox.count(E.METAL);
      return out;
    });
    for (const k of ['wood', 'sand', 'metal']) expect(r[k].after, k).toBeLessThan(r[k].before);
  });

  test('water neutralises acid', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 80, H - 50, H - 1, E.GLASS);
      sandbox.fill(21, H - 16, 79, H - 2, E.ACID);
      sandbox.fill(21, H - 32, 79, H - 17, E.WATER);
      const acid = sandbox.count(E.ACID), water = sandbox.count(E.WATER);
      sandbox.step(2000);
      return { acid, water, acidAfter: sandbox.count(E.ACID), waterAfter: sandbox.count(E.WATER) };
    });
    expect(r.acidAfter).toBeLessThan(r.acid);
    expect(r.waterAfter).toBeGreaterThan(r.water);
  });

  test('lava meeting water turns into stone and steam', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 60, H - 40, H - 1, E.GLASS);
      sandbox.fill(21, H - 10, 59, H - 2, E.WATER);
      sandbox.fill(30, H - 20, 50, H - 15, E.LAVA);
      let steamSeen = 0;
      for (let k = 0; k < 40; k++) { sandbox.step(5); steamSeen = Math.max(steamSeen, sandbox.count(E.STEAM)); }
      return { stone: sandbox.count(E.STONE), steamSeen };
    });
    expect(r.stone).toBeGreaterThan(0);
    expect(r.steamSeen).toBeGreaterThan(0);
  });

  test('lava melts sand into glass', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 60, H - 40, H - 1, E.METAL);
      sandbox.fill(21, H - 12, 59, H - 2, E.LAVA);
      sandbox.fill(21, H - 18, 59, H - 13, E.SAND);
      sandbox.step(1500);
      return sandbox.count(E.GLASS);
    });
    expect(r).toBeGreaterThan(0);
  });
});
