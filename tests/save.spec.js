const fs = require('fs');
const { test, expect, PAGE } = require('./fixtures');

async function openPage(context, url, viewport) {
  const p = await context.newPage();
  if (viewport) await p.setViewportSize(viewport);
  await p.goto(url);
  await p.waitForFunction(() => !!window.sandbox);
  return p;
}

test.describe('save, load and share', () => {
  test('pack/unpack round-trips a world exactly, including spouts and gravity', async ({ sb }) => {
    const r = await sb.run(async () => {
      const { E } = sandbox;
      sandbox.scene('Volcano & Ocean');
      sandbox.spout(150, 20, E.OIL);
      sandbox.gravity(-1);
      const h = sandbox.hash(), packed = await sandbox.pack();
      sandbox.gravity(1); sandbox.clear();
      await sandbox.unpack(packed);
      return { same: sandbox.hash() === h, emits: sandbox.spoutOf(150, 20), g: sandbox.gravity(), size: packed.length };
    });
    expect(r).toMatchObject({ same: true, emits: 8, g: -1 });
    expect(r.size).toBeLessThan(12000);
  });

  test('compression beats the raw run-length encoding', async ({ sb }) => {
    const r = await sb.run(async () => {
      sandbox.scene('Acid Vat');
      return { raw: sandbox.encode().length, packed: (await sandbox.pack()).length * 3 / 4 };
    });
    expect(r.packed).toBeLessThan(r.raw);
  });

  test('Save and Load buttons use browser storage', async ({ sb }) => {
    const { page } = sb;
    await sb.run(() => sandbox.scene('Hourglass'));
    const h = await sb.run(() => sandbox.hash());
    await page.locator('#wSave').click();
    await expect(page.locator('#toast')).toHaveText('World saved');
    await page.keyboard.press('c');
    expect(await sb.run(() => sandbox.hash())).not.toBe(h);
    await page.locator('#wLoad').click();
    await expect.poll(() => sb.run(() => sandbox.hash())).toBe(h);
    await expect(page.locator('#toast')).toHaveText('World loaded');
  });

  test('Load with nothing saved leaves the world alone', async ({ sb }) => {
    await sb.run(() => { localStorage.clear(); sandbox.set(5, 5, sandbox.E.STONE); });
    await sb.page.locator('#wLoad').click();
    await expect(sb.page.locator('#toast')).toHaveText('No saved world yet');
    expect(await sb.run(() => sandbox.get(5, 5))).toBe(3);
  });

  test('Copy link puts the world in the URL and the link reopens it', async ({ sb, context }) => {
    const { page } = sb;
    await sb.run(() => sandbox.scene('Powder Keg'));
    const h = await sb.run(() => sandbox.hash());
    await page.locator('#wLink').click();
    await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#w=[A-Za-z0-9_-]+$/);
    const url = await page.evaluate(() => location.href);
    expect(url.startsWith(PAGE)).toBe(true);
    const p2 = await openPage(context, url);
    await expect.poll(() => p2.evaluate(() => sandbox.hash())).toBe(h);
    await p2.close();
  });

  test('Download and Open file round-trip a world', async ({ sb }, testInfo) => {
    const { page } = sb;
    await sb.run(() => sandbox.scene('Acid Vat'));
    const h = await sb.run(() => sandbox.hash());
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#wDown').click()]);
    expect(download.suggestedFilename()).toBe('world.sandbox');
    const file = testInfo.outputPath('world.sandbox');
    await download.saveAs(file);
    expect(fs.statSync(file).size).toBeGreaterThan(10);
    await page.keyboard.press('c');
    await page.locator('#fileIn').setInputFiles(file);
    await expect.poll(() => sb.run(() => sandbox.hash())).toBe(h);
  });

  test('corrupt data is rejected without touching the world', async ({ sb }) => {
    const r = await sb.run(async () => {
      sandbox.scene('Hourglass');
      const h = sandbox.hash(), errors = [];
      for (const bad of [[0, 1, 2, 3], [0, 83, 66, 2, 10, 0, 10, 0, 1, 5, 200], [1, 255, 255, 255]]) {
        try { await sandbox.unpackRaw(bad); errors.push(null); } catch (e) { errors.push(e.message); }
      }
      return { errors, same: sandbox.hash() === h };
    });
    expect(r.errors.every(Boolean)).toBe(true);
    expect(r.same).toBe(true);
  });

  test('a broken link shows a message instead of crashing', async ({ context }) => {
    const p = await context.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(PAGE + '#w=AAAAAAAA');
    await expect(p.locator('#toast')).toHaveText(/Link is broken/);
    expect(errors).toEqual([]);
    await p.close();
  });

  test('a world saved on a larger screen loads anchored to the bottom-left of a smaller one', async ({ sb, context }) => {
    const r1 = await sb.run(async () => {
      const { E } = sandbox, { W, H } = sandbox.size();
      sandbox.set(0, H - 1, E.STONE);
      sandbox.set(3, H - 2, E.METAL);
      sandbox.set(W - 1, 0, E.GLASS); // falls outside the smaller grid
      return { b64: await sandbox.pack(), W, H };
    });
    const p2 = await openPage(context, PAGE, { width: 640, height: 480 });
    const r2 = await p2.evaluate(async (b64) => {
      await sandbox.unpack(b64);
      const { W, H } = sandbox.size();
      return { W, H, a: sandbox.get(0, H - 1), b: sandbox.get(3, H - 2), glass: sandbox.count(sandbox.E.GLASS) };
    }, r1.b64);
    expect(r2.W).toBeLessThan(r1.W);
    expect(r2).toMatchObject({ a: 3, b: 13, glass: 0 });
    await p2.close();
  });
});
