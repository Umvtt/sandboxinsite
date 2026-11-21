const { test, expect } = require('./fixtures');

test.describe('fire, gases and explosions', () => {
  test('fire with no fuel burns out', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(100, 100, 104, 104, E.FIRE);
      sandbox.step(300);
      return sandbox.count(E.FIRE);
    });
    expect(r).toBe(0);
  });

  test('fire ignites wood, which burns slowly and is consumed', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(50, H - 20, 70, H - 1, E.WOOD);
      const wood = sandbox.count(E.WOOD);
      sandbox.fill(55, H - 23, 65, H - 21, E.FIRE);
      sandbox.step(150);
      const burning = T.burning();
      let smoke = 0;
      for (let k = 0; k < 30; k++) { sandbox.step(100); smoke = Math.max(smoke, sandbox.count(E.SMOKE)); }
      return { wood, burning, woodAfter: sandbox.count(E.WOOD), smoke };
    });
    expect(r.burning).toBeGreaterThan(0);
    expect(r.woodAfter).toBeLessThan(r.wood);
    expect(r.smoke).toBeGreaterThan(0);
  });

  test('water puts out fire and makes steam', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(40, H - 10, 80, H - 1, E.WATER);
      sandbox.set(60, H - 11, E.FIRE);
      sandbox.step(1);
      return { fire: sandbox.count(E.FIRE), steam: sandbox.count(E.STEAM) };
    });
    expect(r.fire).toBe(0);
    expect(r.steam).toBeGreaterThanOrEqual(1);
  });

  test('burning wood is extinguished by water', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.set(60, H - 1, E.WOOD);
      sandbox.ignite(60, H - 1);
      const lit = sandbox.lifeAt(60, H - 1);
      sandbox.fill(52, H - 9, 68, H - 2, E.WATER);
      sandbox.fill(52, H - 1, 59, H - 1, E.WATER);
      sandbox.fill(61, H - 1, 68, H - 1, E.WATER);
      sandbox.step(200);
      return { lit, stillWood: sandbox.get(60, H - 1) === E.WOOD, life: sandbox.lifeAt(60, H - 1) };
    });
    expect(r.lit).toBeGreaterThan(0);
    expect(r.stillWood).toBe(true);
    expect(r.life).toBe(0);
  });

  test('oil ignites and burns away quickly', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 60, H - 20, H - 1, E.STONE);
      sandbox.fill(21, H - 8, 59, H - 2, E.OIL);
      const oil = sandbox.count(E.OIL);
      sandbox.ignite(40, H - 8);
      sandbox.step(600);
      return { oil, after: sandbox.count(E.OIL) };
    });
    expect(r.after).toBeLessThan(r.oil * 0.5);
  });

  test('lit gunpowder explodes and chains through the pile', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(100, H - 12, 130, H - 1, E.POWDER);
      const powder = sandbox.count(E.POWDER);
      sandbox.set(99, H - 1, E.FIRE);
      let flung = 0;
      for (let k = 0; k < 40; k++) {
        sandbox.step(5);
        flung = Math.max(flung, sandbox.cells(E.FIRE).filter(([x, y]) => { const v = sandbox.velAt(x, y); return v[0] || v[1]; }).length);
      }
      return { powder, after: sandbox.count(E.POWDER), flung };
    });
    expect(r.after).toBeLessThan(r.powder * 0.05);
    expect(r.flung).toBeGreaterThan(0);
  });

  test('explosions carve stone, while metal mostly resists', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(60, 60, 100, 100, E.STONE);
      sandbox.fill(160, 60, 200, 100, E.METAL);
      const s0 = sandbox.count(E.STONE), m0 = sandbox.count(E.METAL);
      sandbox.explode(80, 80, 9, 6);
      sandbox.explode(180, 80, 9, 6);
      return { stoneLost: s0 - sandbox.count(E.STONE), metalLost: m0 - sandbox.count(E.METAL), centre: sandbox.get(80, 80) };
    });
    expect(r.centre).not.toBe(3);
    expect(r.stoneLost).toBeGreaterThan(50);
    expect(r.metalLost).toBeLessThan(r.stoneLost / 2);
  });

  test('explosions shatter glass and fling loose particles outward', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(90, 90, 110, 110, E.GLASS);
      sandbox.fill(130, H - 10, 150, H - 1, E.SAND);
      sandbox.explode(100, 100, 6, 5);
      sandbox.explode(125, H - 5, 4, 8);
      const moving = sandbox.cells(E.SAND).filter(([x, y]) => { const v = sandbox.velAt(x, y); return v[0] > 0; }).length;
      return { glassCentre: sandbox.get(100, 100), moving };
    });
    expect(r.glassCentre).toBe(1); // shattered into sand
    expect(r.moving).toBeGreaterThan(0);
  });

  test('smoke rises one cell per tick at most, then fades away', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.set(120, H - 5, E.SMOKE);
      let prev = sandbox.cells(E.SMOKE)[0], maxJump = 0;
      for (let k = 0; k < 40; k++) {
        sandbox.step(1);
        const c = sandbox.cells(E.SMOKE)[0];
        if (!c) break;
        maxJump = Math.max(maxJump, Math.abs(c[0] - prev[0]), Math.abs(c[1] - prev[1]));
        prev = c;
      }
      const yAfter = prev[1];
      sandbox.step(1200);
      return { maxJump, yAfter, start: H - 5, left: sandbox.count(E.SMOKE) };
    });
    expect(r.maxJump).toBeLessThanOrEqual(1);
    expect(r.yAfter).toBeLessThan(r.start);
    expect(r.left).toBe(0);
  });

  test('steam rises and condenses back into water', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(100, H - 20, 140, H - 11, E.STEAM);
      const y0 = T.meanY(E.STEAM);
      sandbox.step(20);
      const y1 = T.meanY(E.STEAM);
      sandbox.step(1500);
      return { y0, y1, water: sandbox.count(E.WATER) };
    });
    expect(r.y1).toBeLessThan(r.y0);
    expect(r.water).toBeGreaterThan(0);
  });

  test('a meteor falls and detonates on impact', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { W, H } = sandbox.size();
      sandbox.fill(0, H - 15, W - 1, H - 1, E.STONE);
      const stone = sandbox.count(E.STONE);
      sandbox.meteor(150);
      const spawned = sandbox.count(E.METEOR);
      sandbox.step(10);
      const midY = (sandbox.cells(E.METEOR)[0] || [0, -1])[1];
      sandbox.step(300);
      return { spawned, midY, meteors: sandbox.count(E.METEOR), stone, after: sandbox.count(E.STONE) };
    });
    expect(r.spawned).toBe(1);
    expect(r.midY).toBeGreaterThan(20); // travels ~3 cells per tick
    expect(r.meteors).toBe(0);
    expect(r.after).toBeLessThan(r.stone);
  });
});
