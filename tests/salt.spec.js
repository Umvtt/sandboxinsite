const { test, expect } = require('./fixtures');

test.describe('salt & brine', () => {
  test('salt dissolves in water and makes brine', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      T.box(80, 140, 120, 181, E.GLASS);
      sandbox.fill(81, 160, 139, 180, E.WATER);
      sandbox.fill(100, 140, 120, 145, E.SALT);
      const salt0 = sandbox.count(E.SALT), water0 = sandbox.count(E.WATER);
      sandbox.step(600);
      return { salt0, water0, salt: sandbox.count(E.SALT), water: sandbox.count(E.WATER), brine: sandbox.count(E.BRINE) };
    });
    expect(r.brine).toBeGreaterThan(50);
    expect(r.salt).toBeLessThan(r.salt0);
    expect(r.water + r.brine).toBe(r.water0); // each grain turns one water cell into brine
  });

  test('salt melts ice', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(60, 150, 100, 160, E.ICE);
      sandbox.fill(120, 150, 160, 160, E.ICE);
      sandbox.fill(60, 140, 100, 149, E.SALT);
      const before = sandbox.count(E.ICE) / 2;
      sandbox.step(500);
      let salted = 0, plain = 0;
      for (const [x] of sandbox.cells(E.ICE)) (x < 110 ? salted++ : plain++);
      return { before, salted, plain };
    });
    expect(r.plain).toBe(r.before);
    expect(r.salted).toBeLessThan(r.before * 0.9);
  });

  test('brine stays liquid where fresh water freezes', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      T.box(40, 80, 140, 171, E.GLASS); sandbox.fill(41, 160, 79, 170, E.WATER);
      T.box(120, 160, 140, 171, E.GLASS); sandbox.fill(121, 160, 159, 170, E.BRINE);
      for (let k = 0; k < 300; k++) {
        for (let y = 155; y <= 170; y++) for (let x = 41; x <= 159; x++) if (sandbox.get(x, y) !== E.GLASS && sandbox.get(x, y)) sandbox.setTemp(x, y, -10);
        sandbox.step(1);
      }
      let iceL = 0, iceR = 0;
      for (const [x] of sandbox.cells(E.ICE)) (x < 100 ? iceL++ : iceR++);
      return { iceL, iceR, brine: sandbox.count(E.BRINE) };
    });
    expect(r.iceL).toBeGreaterThan(300);
    expect(r.iceR).toBe(0);
    expect(r.brine).toBeGreaterThan(400);
  });

  test('boiling brine leaves salt behind', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      T.box(80, 140, 150, 181, E.GLASS);
      sandbox.fill(81, 170, 139, 180, E.BRINE);
      for (let k = 0; k < 200; k++) { sandbox.heat(110, 176, 25, 30); sandbox.step(1); }
      return { salt: sandbox.count(E.SALT), steam: sandbox.count(E.STEAM), brine: sandbox.count(E.BRINE) };
    });
    expect(r.salt).toBeGreaterThan(50);
    expect(r.steam).toBeGreaterThan(20);
  });
});
