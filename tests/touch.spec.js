const { test, expect } = require('./fixtures');

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

// Dispatch synthetic touch pointer events on the canvas.
async function touch(sb, events) {
  await sb.run((evs) => {
    const c = document.getElementById('c');
    for (const [type, id, x, y] of evs) {
      c.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, isPrimary: id === 1, button: 0 }));
    }
  }, events);
}

test.describe('touch & small screens', () => {
  test('a single finger paints', async ({ sb }) => {
    await sb.page.touchscreen.tap(195, 300);
    expect(await sb.run(() => sandbox.count(sandbox.E.SAND))).toBeGreaterThan(0);
  });

  test('a finger drag paints a continuous stroke', async ({ sb }) => {
    const { S } = await sb.run(() => sandbox.size());
    await sb.page.keyboard.press('3');
    await sb.run(() => document.getElementById('brush').value = '1');
    await sb.page.locator('#brush').dispatchEvent('input');
    await touch(sb, [['pointerdown', 1, 20 * S + 1, 100 * S + 1], ['pointermove', 1, 150 * S + 1, 100 * S + 1], ['pointerup', 1, 150 * S + 1, 100 * S + 1]]);
    const row = await sb.run(() => { const o = []; for (let x = 20; x <= 150; x++) o.push(sandbox.get(x, 100)); return o; });
    expect(row.every((v) => v === 3)).toBe(true);
  });

  test('pinching with two fingers resizes the brush without painting', async ({ sb }) => {
    await touch(sb, [
      ['pointerdown', 1, 150, 400],
      ['pointerdown', 2, 200, 400],
      ['pointermove', 2, 250, 400],
      ['pointermove', 2, 300, 400],
    ]);
    expect(await sb.run(() => sandbox.state().brush)).toBe(15);
    await touch(sb, [['pointermove', 2, 160, 400]]);
    expect(await sb.run(() => sandbox.state().brush)).toBe(1);
    await touch(sb, [['pointerup', 2, 160, 400], ['pointerup', 1, 150, 400]]);
    // the first finger's pointerdown painted at most one brush dab before the pinch began
    expect(await sb.run(() => sandbox.count(sandbox.E.SAND))).toBeLessThan(80);
    await expect(sb.page.locator('#brushOut')).toHaveText('1');
  });

  test('the element menu is collapsed and opens from the menu button', async ({ sb }) => {
    const { page } = sb;
    await expect(page.locator('#palette')).toBeHidden();
    await page.locator('#menuBtn').tap();
    await expect(page.locator('#palette')).toBeVisible();
    await page.locator('.sw', { hasText: 'Water' }).tap();
    expect(await sb.run(() => sandbox.state().tool)).toBe(2);
    await expect(page.locator('#palette')).toBeHidden();
  });

  test('the HUD fits the phone screen', async ({ sb }) => {
    const { page } = sb;
    const r = await page.evaluate(() => {
      const box = (id) => document.getElementById(id).getBoundingClientRect();
      const m = box('menuBtn'), s = box('stats'), d = box('dock');
      const overlap = !(m.right <= s.left || s.right <= m.left || m.bottom <= s.top || s.bottom <= m.top);
      return { scroll: document.documentElement.scrollWidth, vw: innerWidth, overlap, dockL: d.left, dockR: d.right, dockB: d.bottom, vh: innerHeight };
    });
    expect(r.scroll).toBeLessThanOrEqual(r.vw);
    expect(r.overlap).toBe(false);
    expect(r.dockL).toBeGreaterThanOrEqual(0);
    expect(r.dockR).toBeLessThanOrEqual(r.vw);
    expect(r.dockB).toBeLessThanOrEqual(r.vh);
  });
});
