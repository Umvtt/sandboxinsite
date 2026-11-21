const { test, expect } = require('./fixtures');

// Canvas pixel position for the centre of a grid cell.
const px = (S, x, y) => [x * S + S / 2, y * S + S / 2];

test.describe('controls', () => {
  test('number and letter shortcuts select elements and tools', async ({ sb }) => {
    const { page } = sb;
    const E = await sb.run(() => ({ ...sandbox.E, METEORT: sandbox.TOOL_METEOR, VORTEXT: sandbox.TOOL_VORTEX, HEATT: sandbox.TOOL_HEAT, COOLT: sandbox.TOOL_COOL, SPARKT: sandbox.TOOL_SPARK, WINDT: sandbox.TOOL_WIND }));
    const map = { 1: E.SAND, 2: E.WATER, 3: E.STONE, 4: E.WOOD, 5: E.FIRE, 6: E.OIL, 7: E.ACID, 8: E.POWDER, 9: E.LAVA, 0: E.GLASS,
      e: E.EMPTY, m: E.METEORT, v: E.VORTEXT, x: E.METAL, i: E.ICE, p: E.PLANT, a: E.SPOUT, u: E.HEATT, o: E.COOLT,
      j: E.BATTERY, l: E.LAMP, q: E.SPARKT, w: E.WINDT, f: E.SALT, k: E.SMOKE, t: E.STEAM };
    for (const [key, id] of Object.entries(map)) {
      await page.keyboard.press(key);
      expect(await sb.run(() => sandbox.state().tool), `key ${key}`).toBe(id);
    }
    await expect(page.locator('.sw.on')).toHaveCount(1);
    await expect(page.locator('.sw.on em')).toHaveText('Steam');
  });

  test('clicking a swatch selects it', async ({ sb }) => {
    await sb.page.locator('.sw', { hasText: 'Lava' }).click();
    expect(await sb.run(() => sandbox.state().tool)).toBe(11);
    await expect(sb.page.locator('.sw.on em')).toHaveText('Lava');
  });

  test('Space toggles pause and S steps a single tick', async ({ sb }) => {
    const { page } = sb;
    await sb.run(() => sandbox.set(70, 10, sandbox.E.SAND));
    await page.keyboard.press('s');
    await expect.poll(() => sb.run(() => sandbox.get(70, 11))).toBe(1);
    await page.waitForTimeout(200);
    expect(await sb.run(() => sandbox.get(70, 11))).toBe(1); // still paused: only one tick happened
    await page.keyboard.press(' ');
    expect(await sb.run(() => sandbox.state().paused)).toBe(false);
    await expect(page.locator('#playTxt')).toHaveText('Pause');
    await expect.poll(() => sb.run(() => sandbox.get(70, 11))).toBe(0);
    await page.keyboard.press(' ');
    expect(await sb.run(() => sandbox.state().paused)).toBe(true);
  });

  test('C and the Clear button empty the world', async ({ sb }) => {
    const total = () => sb.run(() => sandbox.names().reduce((s, _, e) => s + (e ? sandbox.count(e) : 0), 0));
    await sb.run(() => sandbox.scene('Acid Vat'));
    expect(await total()).toBeGreaterThan(0);
    await sb.page.keyboard.press('c');
    expect(await total()).toBe(0);
    await sb.run(() => sandbox.scene('Acid Vat'));
    await sb.page.locator('#bClear').click();
    expect(await total()).toBe(0);
  });

  test('G and the Gravity button flip gravity', async ({ sb }) => {
    await sb.page.keyboard.press('g');
    expect(await sb.run(() => sandbox.gravity())).toBe(-1);
    await expect(sb.page.locator('#bGrav')).toHaveClass(/on/);
    await sb.page.locator('#bGrav').click();
    expect(await sb.run(() => sandbox.gravity())).toBe(1);
  });

  test('brush size follows the wheel, slider and bracket keys, clamped to 1-25', async ({ sb }) => {
    const { page } = sb;
    const brush = () => sb.run(() => sandbox.state().brush);
    await page.mouse.move(500, 350);
    await page.mouse.wheel(0, -100);
    await expect.poll(brush).toBe(6);
    await page.mouse.wheel(0, 100);
    await expect.poll(brush).toBe(5);
    await page.keyboard.press(']');
    expect(await brush()).toBe(6);
    for (let k = 0; k < 40; k++) await page.keyboard.press(']');
    expect(await brush()).toBe(25);
    for (let k = 0; k < 40; k++) await page.keyboard.press('[');
    expect(await brush()).toBe(1);
    await page.locator('#brush').fill('12');
    expect(await brush()).toBe(12);
    await expect(page.locator('#sBrush')).toHaveText('12px');
  });

  test('cursor ring matches the brush radius', async ({ sb }) => {
    const { page } = sb;
    const { S } = await sb.run(() => sandbox.size());
    await page.mouse.move(500, 350);
    await page.locator('#brush').fill('10');
    await page.mouse.move(510, 350);
    const w = await page.locator('#cursor').evaluate((el) => parseFloat(el.style.width));
    expect(w).toBeCloseTo((10 - 0.5) * 2 * S, 3);
  });

  test('fast drags paint a continuous line (no gaps)', async ({ sb }) => {
    const { page } = sb;
    const { S } = await sb.run(() => sandbox.size());
    await page.keyboard.press('3'); // stone always fills
    await page.locator('#brush').fill('1');
    const y = 100;
    const [ax, ay] = px(S, 90, y), [bx, by] = px(S, 240, y);
    await page.mouse.move(ax, ay);
    await page.mouse.down();
    await page.mouse.move(bx, by, { steps: 1 });
    await page.mouse.up();
    const row = await sb.run((yy) => { const out = []; for (let x = 90; x <= 240; x++) out.push(sandbox.get(x, yy)); return out; }, y);
    expect(row.every((v) => v === 3)).toBe(true);

    // diagonal stroke
    const [cx, cy] = px(S, 100, 120), [dx, dy] = px(S, 160, 170);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(dx, dy, { steps: 1 });
    await page.mouse.up();
    const gaps = await sb.run(() => {
      let gaps = 0;
      for (let x = 100; x <= 160; x++) { let hit = false; for (let y = 115; y <= 175; y++) if (sandbox.get(x, y) === 3) hit = true; if (!hit) gaps++; }
      return gaps;
    });
    expect(gaps).toBe(0);
  });

  test('right-drag erases', async ({ sb }) => {
    const { page } = sb;
    const { S } = await sb.run(() => sandbox.size());
    await sb.run(() => sandbox.fill(100, 80, 200, 120, sandbox.E.STONE));
    const before = await sb.run(() => sandbox.count(sandbox.E.STONE));
    await page.locator('#brush').fill('6');
    const [ax, ay] = px(S, 100, 100), [bx, by] = px(S, 200, 100);
    await page.mouse.move(ax, ay);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(bx, by, { steps: 2 });
    await page.mouse.up({ button: 'right' });
    const r = await sb.run(() => ({ n: sandbox.count(sandbox.E.STONE), mid: sandbox.get(150, 100) }));
    expect(r.mid).toBe(0);
    expect(r.n).toBeLessThan(before - 400);
  });

  test('loose elements keep pouring while the button is held', async ({ sb }) => {
    const { page } = sb;
    await page.keyboard.press('2');
    await page.mouse.move(500, 200);
    await page.mouse.down();
    const a = await sb.run(() => sandbox.count(sandbox.E.WATER));
    await page.waitForTimeout(400);
    const b = await sb.run(() => sandbox.count(sandbox.E.WATER));
    await page.mouse.up();
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThanOrEqual(a);
  });

  test('meteor tool spawns a meteor on click', async ({ sb }) => {
    const { page } = sb;
    await page.keyboard.press('m');
    await page.mouse.click(500, 350);
    expect(await sb.run(() => sandbox.count(sandbox.E.METEOR))).toBe(1);
  });

  test('scene buttons load scenes', async ({ sb }) => {
    await sb.page.locator('#scenes button', { hasText: 'Hourglass' }).click();
    expect(await sb.run(() => sandbox.count(sandbox.E.GLASS))).toBeGreaterThan(100);
    await expect(sb.page.locator('#toast')).toHaveClass(/show/);
  });

  test('H hides and shows the HUD; B toggles bloom', async ({ sb }) => {
    const { page } = sb;
    await page.keyboard.press('h');
    await expect(page.locator('body')).toHaveClass(/hide-ui/);
    await page.keyboard.press('h');
    await expect(page.locator('body')).not.toHaveClass(/hide-ui/);
    const b0 = await sb.run(() => sandbox.state().bloom);
    await page.keyboard.press('b');
    expect(await sb.run(() => sandbox.state().bloom)).toBe(!b0);
    await expect(page.locator('#glow')).toHaveClass(b0 ? /off/ : /^$/);
  });

  test('speed buttons change the simulation speed', async ({ sb }) => {
    await sb.page.locator('#speedSeg button', { hasText: '2×' }).click();
    expect(await sb.run(() => sandbox.state().speed)).toBe(2);
    await sb.page.locator('#speedSeg button', { hasText: '½×' }).click();
    expect(await sb.run(() => sandbox.state().speed)).toBe(0.5);
  });

  test('the test hook is absent in normal mode', async ({ page }) => {
    const path = require('path');
    const { pathToFileURL } = require('url');
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => typeof window.sandbox)).toBe('undefined');
  });
});
