const { test, expect, PAGE } = require('./fixtures');

const stats = (sb) => sb.run(() => sandbox.state().sound);

test.describe('sound', () => {
  test('audio starts only after a user gesture', async ({ sb }) => {
    expect((await stats(sb)).running).toBe(false);
    await sb.page.keyboard.press('Shift');
    expect((await stats(sb)).running).toBe(true);
  });

  test('explosions, fizzing, sizzling, meteors and fire make sounds', async ({ sb }) => {
    await sb.page.keyboard.press('Shift');
    await sb.run(() => {
      const { E } = sandbox, { H } = sandbox.size();
      sandbox.explode(100, 100, 8, 6);
      sandbox.meteor(200);
      T.box(20, 60, H - 30, H - 1, E.GLASS);
      sandbox.fill(21, H - 6, 59, H - 2, E.STONE);
      sandbox.fill(21, H - 16, 59, H - 7, E.ACID);
      sandbox.fill(150, H - 6, 200, H - 1, E.WATER);
      sandbox.fill(160, H - 9, 190, H - 7, E.LAVA);
      sandbox.fill(250, 150, 280, 170, E.FIRE);
      sandbox.pause(false);
    });
    await expect.poll(async () => {
      const s = (await stats(sb)).stats;
      return [s.explosions > 0, s.fizz > 0, s.sizzle > 0, s.whoosh > 0, s.crackle > 0];
    }, { timeout: 5000 }).toEqual([true, true, true, true, true]);
  });

  test('N mutes, the mute is remembered, and muted worlds stay silent', async ({ sb, context }) => {
    const { page } = sb;
    await page.keyboard.press('n');
    let s = await stats(sb);
    expect(s.enabled).toBe(false);
    await expect(page.locator('#bSound')).not.toHaveClass(/on/);
    await sb.run(() => { sandbox.explode(100, 100, 8, 6); sandbox.explode(150, 100, 8, 6); });
    await page.waitForTimeout(300);
    s = await stats(sb);
    expect(s.stats.explosions).toBe(0);

    const p2 = await context.newPage();
    await p2.goto(PAGE);
    await p2.waitForFunction(() => !!window.sandbox);
    expect(await p2.evaluate(() => sandbox.state().sound.enabled)).toBe(false);
    await expect(p2.locator('#bSound')).not.toHaveClass(/on/);
    await p2.locator('#bSound').click();
    expect(await p2.evaluate(() => sandbox.state().sound.enabled)).toBe(true);
    await p2.close();
  });
});
