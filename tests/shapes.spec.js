const { test, expect } = require('./fixtures');

const at = (S, x, y) => [x * S + S / 2, y * S + S / 2];

async function drag(sb, mode, [x0, y0], [x1, y1], opts = {}) {
  const { page } = sb;
  const { S } = await sb.run(() => sandbox.size());
  await sb.run((m) => sandbox.drawMode(m), mode);
  if (opts.shift) await page.keyboard.down('Shift');
  await page.mouse.move(...at(S, x0, y0));
  await page.mouse.down({ button: opts.button || 'left' });
  await page.mouse.move(...at(S, x1, y1), { steps: 3 });
  if (opts.during) await opts.during();
  await page.mouse.up({ button: opts.button || 'left' });
  if (opts.shift) await page.keyboard.up('Shift');
}

test.describe('shape tools', () => {
  test.beforeEach(async ({ sb }) => { await sb.page.keyboard.press('3'); });

  test('line mode draws a straight line only when released', async ({ sb }) => {
    await sb.page.locator('#brush').fill('1');
    let during = -1;
    await drag(sb, 'line', [100, 100], [200, 150], {
      during: async () => { during = await sb.run(() => sandbox.count(sandbox.E.STONE)); },
    });
    expect(during).toBe(0);
    const r = await sb.run(() => {
      let miss = 0;
      for (let x = 100; x <= 200; x++) { const y = Math.round(100 + (x - 100) * 0.5); if (sandbox.get(x, y) !== 3) miss++; }
      return { miss, n: sandbox.count(3) };
    });
    expect(r.miss).toBe(0);
    expect(r.n).toBeLessThan(150);
  });

  test('rectangle mode fills the dragged box, Shift draws just the outline', async ({ sb }) => {
    await sb.page.locator('#brush').fill('3');
    await drag(sb, 'rect', [100, 60], [140, 80]);
    expect(await sb.run(() => sandbox.count(3))).toBe(41 * 21);
    await sb.run(() => sandbox.clear());
    await drag(sb, 'rect', [100, 60], [140, 80], { shift: true });
    const r = await sb.run(() => ({ n: sandbox.count(3), inside: sandbox.get(120, 70), edge: sandbox.get(100, 70) }));
    expect(r.inside).toBe(0);
    expect(r.edge).toBe(3);
    expect(r.n).toBe(41 * 2 + 19 * 2);
  });

  test('circle mode fills a disc around the press point', async ({ sb }) => {
    await drag(sb, 'circle', [150, 100], [170, 100]);
    const r = await sb.run(() => ({ n: sandbox.count(3), centre: sandbox.get(150, 100), out: sandbox.get(150, 122) }));
    expect(r.centre).toBe(3);
    expect(r.out).toBe(0);
    expect(r.n).toBeGreaterThan(Math.PI * 20 * 20 * 0.95);
    expect(r.n).toBeLessThan(Math.PI * 21 * 21 * 1.05);
  });

  test('right-dragging a shape erases it', async ({ sb }) => {
    await sb.run(() => sandbox.fill(80, 50, 200, 120, sandbox.E.STONE));
    await drag(sb, 'rect', [100, 60], [140, 80], { button: 'right' });
    const r = await sb.run(() => ({ hole: sandbox.get(120, 70), kept: sandbox.get(90, 70) }));
    expect(r).toEqual({ hole: 0, kept: 3 });
  });

  test('a dashed preview follows the drag and disappears on release', async ({ sb }) => {
    const prev = sb.page.locator('#shape');
    await drag(sb, 'circle', [150, 100], [170, 100], {
      during: async () => {
        await expect(prev).toBeVisible();
        await expect(prev.locator('circle')).toHaveCount(1);
      },
    });
    await expect(prev).toBeHidden();
  });

  test('D cycles draw modes and the buttons follow', async ({ sb }) => {
    const { page } = sb;
    const mode = () => sb.run(() => sandbox.state().drawMode);
    expect(await mode()).toBe('free');
    for (const m of ['line', 'rect', 'circle', 'free']) {
      await page.keyboard.press('d');
      expect(await mode()).toBe(m);
      await expect(page.locator('#drawSeg button.on')).toHaveAttribute('data-m', m);
    }
    await page.locator('#drawSeg button[data-m="rect"]').click();
    expect(await mode()).toBe('rect');
  });

  test('a shape is one undo step', async ({ sb }) => {
    await drag(sb, 'rect', [100, 60], [140, 80]);
    await sb.page.keyboard.press('Control+z');
    expect(await sb.run(() => sandbox.count(3))).toBe(0);
  });
});
