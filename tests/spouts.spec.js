const { test, expect } = require('./fixtures');

test.describe('spouts', () => {
  test('a spout keeps emitting its element and stays in place', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.spout(100, 50, E.WATER);
      sandbox.step(300);
      return { water: sandbox.count(E.WATER), spout: sandbox.get(100, 50), emits: sandbox.spoutOf(100, 50) };
    });
    expect(r.water).toBeGreaterThan(30);
    expect(r.spout).toBe(17);
    expect(r.emits).toBe(2);
  });

  test('works for powders, liquids and gases', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, out = {};
      const list = { sand: E.SAND, oil: E.OIL, lava: E.LAVA, acid: E.ACID, smoke: E.SMOKE, steam: E.STEAM, fire: E.FIRE, powder: E.POWDER };
      let x = 30;
      for (const k in list) { sandbox.spout(x, 100, list[k]); x += 35; }
      sandbox.step(40);
      for (const k in list) out[k] = sandbox.count(list[k]);
      return out;
    });
    for (const [k, n] of Object.entries(r)) expect(n, k).toBeGreaterThan(0);
  });

  test('gas spouts emit upward', async ({ sb }) => {
    const y = await sb.run(() => {
      const { E } = sandbox;
      sandbox.spout(100, 150, E.SMOKE);
      sandbox.step(60);
      return T.meanY(E.SMOKE);
    });
    expect(y).toBeLessThan(150);
  });

  test('a painted spout emits the last liquid/powder/gas selected', async ({ sb }) => {
    const { page } = sb;
    const { S } = await sb.run(() => sandbox.size());
    await page.keyboard.press('6'); // oil
    await page.keyboard.press('3'); // stone: a solid, must not change the spout element
    await page.keyboard.press('a');
    await expect(page.locator('.sw.on em')).toHaveText('Spout · Oil');
    await page.locator('#brush').fill('1');
    await page.mouse.click(100 * S + 1, 80 * S + 1);
    const r = await sb.run(() => { sandbox.step(100); return { spout: sandbox.get(100, 80), emits: sandbox.spoutOf(100, 80), oil: sandbox.count(sandbox.E.OIL), el: sandbox.state().spoutEl }; });
    expect(r).toMatchObject({ spout: 17, emits: 8, el: 8 });
    expect(r.oil).toBeGreaterThan(5);
  });

  test('spouts resist acid and are hard to blow up', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(40, H - 6, 60, H - 1, E.SPOUT);
      sandbox.fill(40, H - 26, 60, H - 7, E.ACID);
      const n = sandbox.count(E.SPOUT);
      sandbox.step(800);
      const afterAcid = sandbox.count(E.SPOUT);
      sandbox.explode(50, H - 3, 6, 5);
      return { n, afterAcid, afterBoom: sandbox.count(E.SPOUT) };
    });
    expect(r.afterAcid).toBe(r.n);
    expect(r.afterBoom).toBeGreaterThan(r.n * 0.8);
  });

  test('the volcano keeps erupting', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.scene('Volcano & Ocean');
      const spouts = sandbox.count(E.SPOUT);
      sandbox.step(3000);
      return { spouts, lava: sandbox.count(E.LAVA) };
    });
    expect(r.spouts).toBeGreaterThanOrEqual(3);
    expect(r.lava).toBeGreaterThan(20);
  });
});
