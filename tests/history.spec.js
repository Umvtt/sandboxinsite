const { test, expect } = require('./fixtures');

const total = () => sandbox.names().reduce((s, _, e) => s + (e ? sandbox.count(e) : 0), 0);

test.describe('undo & redo', () => {
  test('Ctrl+Z undoes a brush stroke and Ctrl+Shift+Z / Ctrl+Y redo it', async ({ sb }) => {
    const { page } = sb;
    await expect(page.locator('#bUndo')).toBeDisabled();
    await page.keyboard.press('3');
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(600, 300, { steps: 4 });
    await page.mouse.up();
    const painted = await sb.run(() => sandbox.hash());
    expect(await sb.run(() => sandbox.count(sandbox.E.STONE))).toBeGreaterThan(100);
    await expect(page.locator('#bUndo')).toBeEnabled();

    await page.keyboard.press('Control+z');
    expect(await sb.run(() => sandbox.count(sandbox.E.STONE))).toBe(0);
    await expect(page.locator('#bRedo')).toBeEnabled();

    await page.keyboard.press('Control+Shift+z');
    expect(await sb.run(() => sandbox.hash())).toBe(painted);
    await page.keyboard.press('Control+z');
    await page.keyboard.press('Control+y');
    expect(await sb.run(() => sandbox.hash())).toBe(painted);
  });

  test('the dock buttons undo and redo', async ({ sb }) => {
    const { page } = sb;
    await sb.run(() => { sandbox.checkpoint(); sandbox.fill(10, 10, 20, 20, sandbox.E.METAL); });
    await page.locator('#bUndo').click();
    expect(await sb.run(() => sandbox.count(sandbox.E.METAL))).toBe(0);
    await page.locator('#bRedo').click();
    expect(await sb.run(() => sandbox.count(sandbox.E.METAL))).toBe(121);
  });

  test('clearing and loading a scene can be undone', async ({ sb }) => {
    const { page } = sb;
    await sb.run(() => sandbox.scene('Hourglass'));
    const h = await sb.run(() => sandbox.hash());
    await page.keyboard.press('c');
    expect(await sb.run(total)).toBe(0);
    await page.keyboard.press('Control+z');
    expect(await sb.run(() => sandbox.hash())).toBe(h);
    await sb.run(() => sandbox.scene('Acid Vat'));
    await page.keyboard.press('Control+z');
    expect(await sb.run(() => sandbox.hash())).toBe(h);
  });

  test('undo restores temperature and gravity too', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.set(50, 50, E.METAL); sandbox.setTemp(50, 50, 400);
      sandbox.checkpoint();
      sandbox.setTemp(50, 50, 20); sandbox.gravity(-1);
      sandbox.undo();
      return { t: sandbox.tempAt(50, 50), g: sandbox.gravity() };
    });
    expect(r).toEqual({ t: 400, g: 1 });
  });

  test('a new change clears the redo stack, and history is capped', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.checkpoint(); sandbox.set(5, 5, E.STONE);
      sandbox.undo();
      const afterUndo = sandbox.history().redo;
      sandbox.checkpoint(); sandbox.set(6, 6, E.STONE);
      const afterNew = sandbox.history().redo;
      for (let k = 0; k < 50; k++) { sandbox.checkpoint(); sandbox.set(k, 100, E.STONE); }
      return { afterUndo, afterNew, ...sandbox.history() };
    });
    expect(r.afterUndo).toBe(1);
    expect(r.afterNew).toBe(0);
    expect(r.undo).toBe(r.max);
  });

  test('undo with nothing to undo is harmless', async ({ sb }) => {
    expect(await sb.run(() => sandbox.undo())).toBe(false);
    await expect(sb.page.locator('#toast')).toHaveText('Nothing to undo');
  });
});
