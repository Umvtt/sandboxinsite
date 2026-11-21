const { test, expect } = require('./fixtures');

test.describe('sleeping chunks', () => {
  test('a settled world goes to sleep and costs almost nothing to step', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      const { W } = sandbox.size();
      sandbox.fill(0, 200, W - 1, 203, E.STONE);
      sandbox.fill(20, 120, 150, 199, E.SAND);
      T.box(170, 300, 150, 199, E.GLASS);
      sandbox.fill(171, 160, 299, 198, E.WATER);
      sandbox.step(1);
      const busy = sandbox.awake();
      sandbox.step(600);
      const t0 = performance.now();
      sandbox.step(200);
      return { busy, idle: sandbox.awake(), ms: (performance.now() - t0) / 200 };
    });
    expect(r.busy.move).toBeGreaterThan(r.busy.total / 3);
    expect(r.idle.move).toBe(0);
    expect(r.idle.heat).toBe(0);
    expect(r.ms).toBeLessThan(1);
  });

  test('digging under a sleeping pile wakes it and it falls', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(60, 150, 120, 152, E.STONE);
      sandbox.fill(60, 120, 120, 149, E.SAND);
      sandbox.step(300);
      const asleep = sandbox.awake().move;
      for (let x = 85; x <= 95; x++) for (let y = 150; y <= 152; y++) sandbox.set(x, y, E.EMPTY);
      const before = T.meanY(E.SAND);
      sandbox.step(200);
      return { asleep, before, after: T.meanY(E.SAND) };
    });
    expect(r.asleep).toBe(0);
    expect(r.after).toBeGreaterThan(r.before + 5);
  });

  test('slow, random reactions still finish in a quiet world', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      // water poured on top of oil must still sink through it
      T.box(40, 70, 120, 181, E.GLASS);
      sandbox.fill(41, 150, 69, 180, E.OIL);
      sandbox.fill(41, 135, 69, 149, E.WATER);
      // plants keep growing into still water
      T.box(120, 180, 150, 181, E.GLASS);
      sandbox.fill(121, 160, 179, 180, E.WATER);
      sandbox.set(150, 159, E.PLANT);
      sandbox.step(2500);
      return { water: T.meanY(E.WATER), oil: T.meanY(E.OIL), plants: sandbox.count(E.PLANT) };
    });
    expect(r.water).toBeGreaterThan(r.oil);
    expect(r.plants).toBeGreaterThan(30);
  });

  test('a single drop sinks through a sleeping pool of oil', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      T.box(100, 130, 100, 181, E.GLASS);
      sandbox.fill(101, 140, 129, 180, E.OIL);
      sandbox.step(300);
      const asleep = sandbox.awake().move;
      sandbox.set(115, 120, E.WATER);
      sandbox.step(600);
      const [x, y] = sandbox.cells(E.WATER)[0];
      return { asleep, y };
    });
    expect(r.asleep).toBe(0);
    expect(r.y).toBe(180);
  });

  test('a particle thrown against a wall comes to rest before its chunk sleeps', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(90, 151, 110, 152, E.STONE);
      sandbox.fill(101, 140, 102, 150, E.STONE);
      sandbox.set(100, 150, E.SAND);
      sandbox.step(20);
      sandbox.wind(100, 150, 3, 1, 0);
      const pushed = sandbox.velAt(100, 150)[0];
      sandbox.step(60);
      return { pushed, v: sandbox.velAt(100, 150), awake: sandbox.awake().move };
    });
    expect(r.pushed).toBeGreaterThan(1);
    expect(r.v).toEqual([0, 0]);
    expect(r.awake).toBe(0);
  });

  test('heat keeps spreading after everything has stopped moving', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(40, 100, 200, 101, E.METAL);
      sandbox.step(50);
      const quiet = sandbox.awake();
      sandbox.step(1); // nothing is moving any more
      const still = sandbox.awake();
      for (let k = 0; k < 400; k++) { sandbox.setTemp(40, 100, 900); sandbox.setTemp(40, 101, 900); sandbox.step(1); }
      return { quiet, still, far: sandbox.tempAt(70, 100) };
    });
    expect(r.quiet.heat).toBe(0);
    expect(r.still.move).toBe(0);
    expect(r.far).toBeGreaterThan(80);
  });
});
