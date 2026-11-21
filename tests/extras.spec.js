const { test, expect } = require('./fixtures');

test.describe('wind, tooltips, recording & polish', () => {
  test('wind pushes loose particles the way it blows', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(0, 180, 333, 182, E.STONE);
      sandbox.fill(140, 150, 160, 179, E.SAND);
      sandbox.fill(140, 60, 160, 80, E.SMOKE);
      const sand0 = T.meanX(E.SAND), smoke0 = T.meanX(E.SMOKE);
      for (let k = 0; k < 20; k++) { sandbox.wind(150, 165, 30, 1, 0); sandbox.wind(150, 70, 30, -1, 0); sandbox.step(1); }
      sandbox.step(40);
      return { sand: T.meanX(E.SAND) - sand0, smoke: T.meanX(E.SMOKE) - smoke0, stone: sandbox.count(E.STONE) };
    });
    expect(r.sand).toBeGreaterThan(8);
    expect(r.smoke).toBeLessThan(-8);
    expect(r.stone).toBe(334 * 3); // solids are not blown away
  });

  test('the wind tool follows the mouse drag direction', async ({ sb }) => {
    const { page } = sb;
    const { S } = await sb.run(() => sandbox.size());
    await sb.run(() => { const { E } = sandbox; sandbox.fill(0, 180, 333, 182, E.STONE); sandbox.fill(140, 160, 160, 179, E.SAND); sandbox.pause(false); });
    const x0 = await sb.run(() => T.meanX(sandbox.E.SAND));
    await page.keyboard.press('w');
    await page.mouse.move(120 * S, 170 * S);
    await page.mouse.down();
    for (let k = 0; k < 12; k++) { await page.mouse.move((120 + k * 4) * S, 170 * S); await page.waitForTimeout(30); }
    await page.mouse.up();
    await sb.run(() => sandbox.pause(true));
    expect(await sb.run(() => T.meanX(sandbox.E.SAND))).toBeGreaterThan(x0 + 3);
  });

  test('hovering a swatch shows what the element does', async ({ sb }) => {
    const { page } = sb;
    const tip = page.locator('#tip');
    await page.locator('.sw', { hasText: 'Salt' }).hover();
    await expect(tip).toHaveClass(/show/);
    await expect(tip).toContainText('Salt');
    await expect(tip).toContainText('brine');
    await expect(tip.locator('kbd')).toHaveText('F');
    await page.mouse.move(600, 400);
    await expect(tip).not.toHaveClass(/show/);
    const missing = await sb.run(() => {
      const ids = [...Object.values(sandbox.E), sandbox.TOOL_METEOR, sandbox.TOOL_VORTEX, sandbox.TOOL_HEAT, sandbox.TOOL_COOL, sandbox.TOOL_SPARK, sandbox.TOOL_WIND];
      return ids.filter((t) => !sandbox.info(t));
    });
    expect(missing).toEqual([]);
  });

  test('R records the canvas and saves a video file', async ({ sb }) => {
    const { page } = sb;
    await sb.run(() => { sandbox.scene('Volcano & Ocean'); sandbox.pause(false); });
    await page.keyboard.press('r');
    expect(await sb.run(() => sandbox.recording())).toBe(true);
    await expect(page.locator('#bRec')).toHaveClass(/rec/);
    await page.waitForTimeout(1200);
    const dl = page.waitForEvent('download');
    await page.keyboard.press('r');
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/^sandbox\.(webm|mp4)$/);
    const fs = require('fs');
    expect(fs.statSync(await file.path()).size).toBeGreaterThan(1000);
    expect(await sb.run(() => sandbox.recording())).toBe(false);
    await expect(page.locator('#bRec')).not.toHaveClass(/rec/);
  });

  test('quarter and quadruple speed are available', async ({ sb }) => {
    for (const [label, v] of [['¼×', 0.25], ['4×', 4]]) {
      await sb.page.locator('#speedSeg button', { hasText: label }).click();
      expect(await sb.run(() => sandbox.state().speed)).toBe(v);
    }
  });

  test('deep water is drawn darker than the surface', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(100, 100, 130, 180, E.WATER);
      sandbox.render();
      const lum = (c) => (c & 255) + ((c >>> 8) & 255) + ((c >>> 16) & 255);
      let top = 0, deep = 0;
      for (let x = 100; x <= 130; x++) { top += lum(sandbox.pixel(x, 100)); deep += lum(sandbox.pixel(x, 175)); }
      return { top, deep };
    });
    expect(r.deep).toBeLessThan(r.top * 0.7);
  });

  test('the Circuit Lab lights its lamps on its own', async ({ sb }) => {
    const r = await sb.run(() => {
      sandbox.scene('Circuit Lab');
      sandbox.step(200);
      return sandbox.cells(sandbox.E.LAMP).filter(([x, y]) => sandbox.lifeAt(x, y) > 0).length;
    });
    expect(r).toBeGreaterThan(20);
  });
});
