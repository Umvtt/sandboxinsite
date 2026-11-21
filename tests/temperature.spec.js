const { test, expect } = require('./fixtures');

test.describe('temperature', () => {
  test('cells start at their resting temperature', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      const at = (e) => { sandbox.set(10, 10, e); return Math.round(sandbox.tempAt(10, 10)); };
      return { water: at(E.WATER), ice: at(E.ICE), lava: at(E.LAVA), fire: at(E.FIRE), stone: at(E.STONE) };
    });
    expect(r).toEqual({ water: 20, ice: -20, lava: 1100, fire: 800, stone: 20 });
  });

  test('metal conducts heat far better than stone', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(40, 60, 100, 61, E.METAL);
      sandbox.fill(40, 90, 100, 91, E.STONE);
      for (let k = 0; k < 400; k++) {
        for (const y of [60, 61, 90, 91]) sandbox.setTemp(40, y, 1000);
        sandbox.step(1);
      }
      return { metal: sandbox.tempAt(60, 60), stone: sandbox.tempAt(60, 90) };
    });
    expect(r.metal).toBeGreaterThan(r.stone + 150);
  });

  test('heat travels with moving particles', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.set(70, 10, E.SAND);
      sandbox.setTemp(70, 10, 500);
      sandbox.step(30);
      const [x, y] = sandbox.cells(E.SAND)[0];
      return { y, t: sandbox.tempAt(x, y), left: sandbox.tempAt(70, 10) };
    });
    expect(r.y).toBe(40);
    expect(r.t).toBeGreaterThan(200);
    expect(r.left).toBe(20);
  });

  test('ice melts from nearby warmth without touching any flame', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(40, 60, 85, 61, E.METAL);
      sandbox.fill(70, 50, 85, 59, E.ICE);
      const ice = sandbox.count(E.ICE);
      for (let k = 0; k < 600; k++) { sandbox.setTemp(40, 60, 900); sandbox.setTemp(40, 61, 900); sandbox.step(1); }
      return { ice, after: sandbox.count(E.ICE), fire: sandbox.count(E.FIRE), lava: sandbox.count(E.LAVA) };
    });
    expect(r.fire + r.lava).toBe(0);
    expect(r.after).toBeLessThan(r.ice);
  });

  test('lava slowly cools into stone in open air', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { W, H } = sandbox.size();
      sandbox.fill(0, H - 20, W - 1, H - 1, E.STONE);
      sandbox.fill(100, H - 30, 160, H - 21, E.LAVA);
      const stone = sandbox.count(E.STONE), lava = sandbox.count(E.LAVA);
      sandbox.step(300);
      const early = sandbox.count(E.LAVA);
      sandbox.step(3000);
      return { lava, early, late: sandbox.count(E.LAVA), stoneGain: sandbox.count(E.STONE) - stone };
    });
    expect(r.early).toBeGreaterThan(r.lava * 0.8); // not instant
    expect(r.late).toBe(0);
    expect(r.stoneGain).toBeGreaterThan(r.lava * 0.8);
  });

  test('heating water boils it; cooling water freezes it', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      T.box(20, 50, H - 20, H - 1, E.GLASS);
      sandbox.fill(21, H - 8, 49, H - 2, E.WATER);
      T.box(80, 110, H - 20, H - 1, E.GLASS);
      sandbox.fill(81, H - 8, 109, H - 2, E.WATER);
      let steam = 0;
      for (let k = 0; k < 120; k++) {
        sandbox.heat(35, H - 5, 10, 25);
        sandbox.heat(95, H - 5, 10, -25);
        sandbox.step(1);
        steam = Math.max(steam, sandbox.count(E.STEAM));
      }
      return { steam, ice: sandbox.count(E.ICE) };
    });
    expect(r.steam).toBeGreaterThan(20);
    expect(r.ice).toBeGreaterThan(50);
  });

  test('extreme heat melts stone into lava and sand into glass', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(30, H - 10, 50, H - 1, E.STONE);
      sandbox.fill(90, H - 10, 110, H - 1, E.METAL);
      sandbox.fill(91, H - 14, 109, H - 11, E.SAND);
      for (let k = 0; k < 70; k++) { sandbox.heat(40, H - 5, 6, 25); sandbox.heat(100, H - 12, 6, 25); sandbox.step(1); }
      return { lava: sandbox.count(E.LAVA), glass: sandbox.count(E.GLASS) };
    });
    expect(r.lava).toBeGreaterThan(10);
    expect(r.glass).toBeGreaterThan(5);
  });

  test('a hot plate ignites wood and detonates gunpowder without any flame', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.fill(40, H - 10, 140, H - 9, E.METAL);
      sandbox.fill(50, H - 18, 60, H - 11, E.WOOD);
      sandbox.fill(110, H - 14, 125, H - 11, E.POWDER);
      const powder = sandbox.count(E.POWDER);
      let burning = 0;
      for (let k = 0; k < 400; k++) {
        for (let x = 40; x <= 140; x++) { sandbox.setTemp(x, H - 10, 600); sandbox.setTemp(x, H - 9, 600); }
        sandbox.step(1);
        burning = Math.max(burning, T.burning());
      }
      return { burning, powder, after: sandbox.count(E.POWDER) };
    });
    expect(r.burning).toBeGreaterThan(0);
    expect(r.after).toBeLessThan(r.powder * 0.2);
  });

  test('hot metal glows', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(40, 40, 60, 60, E.METAL);
      sandbox.fill(80, 40, 100, 60, E.METAL);
      for (let y = 40; y <= 60; y++) for (let x = 80; x <= 100; x++) sandbox.setTemp(x, y, 900);
      sandbox.render();
      const red = (c) => c & 255, blue = (c) => (c >>> 16) & 255;
      let cold = 0, hot = 0;
      for (let y = 45; y <= 55; y++) for (let x = 0; x < 10; x++) {
        const a = sandbox.pixel(45 + x, y), b = sandbox.pixel(85 + x, y);
        cold += red(a) - blue(a); hot += red(b) - blue(b);
      }
      return { cold, hot };
    });
    expect(r.hot).toBeGreaterThan(r.cold + 3000);
  });

  test('thermal view colours cells by temperature (Y key)', async ({ sb }) => {
    await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(40, 40, 50, 50, E.STONE);
      sandbox.fill(60, 40, 70, 50, E.STONE);
      for (let y = 40; y <= 50; y++) for (let x = 60; x <= 70; x++) sandbox.setTemp(x, y, 700);
    });
    const normal = await sb.run(() => { sandbox.render(); return [sandbox.pixel(45, 45), sandbox.pixel(65, 45)]; });
    await sb.page.keyboard.press('y');
    const thermal = await sb.run(() => { sandbox.render(); return [sandbox.pixel(45, 45), sandbox.pixel(65, 45), sandbox.state().heatView]; });
    expect(thermal[2]).toBe(true);
    await expect(sb.page.locator('#bHeat')).toHaveClass(/on/);
    expect(thermal[0]).not.toBe(normal[0]);
    expect(thermal[1]).not.toBe(thermal[0]);
    expect(thermal[1] & 255).toBeGreaterThan(200); // hot = bright red/orange
    await sb.page.keyboard.press('y');
    expect(await sb.run(() => sandbox.state().heatView)).toBe(false);
  });

  test('heat tool warms and right-click cools; hover shows the temperature', async ({ sb }) => {
    const { page } = sb;
    const { S } = await sb.run(() => sandbox.size());
    await sb.run(() => { sandbox.fill(100, 100, 120, 120, sandbox.E.METAL); sandbox.pause(false); });
    await page.keyboard.press('u');
    await page.mouse.move(110 * S + 1, 110 * S + 1);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.mouse.up();
    const hot = await sb.run(() => sandbox.tempAt(110, 110));
    expect(hot).toBeGreaterThan(150);
    await expect(page.locator('#sTemp')).toHaveText(/°C$/);
    await expect(page.locator('#sHover')).toHaveText('Metal');
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(800);
    await page.mouse.up({ button: 'right' });
    expect(await sb.run(() => sandbox.tempAt(110, 110))).toBeLessThan(hot - 100);
    expect(await sb.run(() => sandbox.count(sandbox.E.METAL))).toBe(441); // right-click did not erase
  });
});
