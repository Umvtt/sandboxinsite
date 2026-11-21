const { test, expect } = require('./fixtures');

// battery at x0, metal wire to x1, lamp just past the end; returns the lamp position
const circuit = (x0, x1, y) => {
  const { E } = sandbox;
  sandbox.fill(x0, y - 2, x0 + 1, y, E.BATTERY);
  sandbox.fill(x0 + 2, y, x1, y, E.METAL);
  sandbox.fill(x1 + 1, y, x1 + 2, y, E.LAMP);
  return [x1 + 1, y];
};

test.describe('electricity', () => {
  test('a battery powers a lamp through a metal wire', async ({ sb }) => {
    const r = await sb.run((src) => {
      const circuit = eval(src);
      const [lx, ly] = circuit(40, 140, 100);
      let seenPulse = 0;
      for (let k = 0; k < 200; k++) { sandbox.step(1); if (sandbox.zapAt(90, 100) === 3) seenPulse++; }
      return { lit: sandbox.lifeAt(lx, ly), seenPulse };
    }, circuit.toString());
    expect(r.lit).toBeGreaterThan(0);
    expect(r.seenPulse).toBeGreaterThan(20); // a steady train of pulses, not one
  });

  test('a gap, glass or stone breaks the circuit', async ({ sb }) => {
    const r = await sb.run((src) => {
      const circuit = eval(src);
      const { E } = sandbox;
      const lamps = [circuit(40, 120, 40), circuit(40, 120, 80), circuit(40, 120, 120)];
      sandbox.set(80, 40, E.EMPTY);
      sandbox.set(80, 80, E.GLASS);
      sandbox.set(80, 120, E.STONE);
      sandbox.step(300);
      return { lit: lamps.map(([x, y]) => sandbox.lifeAt(x, y)), beyond: [40, 80, 120].map((y) => sandbox.zapAt(100, y)) };
    }, circuit.toString());
    expect(r.lit).toEqual([0, 0, 0]);
    expect(r.beyond).toEqual([0, 0, 0]);
  });

  test('a pulse reaching gunpowder sets it off', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(0, 150, 333, 152, E.STONE);
      sandbox.fill(40, 147, 41, 149, E.BATTERY);
      sandbox.fill(42, 149, 120, 149, E.METAL);
      sandbox.fill(121, 145, 130, 149, E.POWDER);
      const before = sandbox.count(E.POWDER);
      sandbox.step(200);
      return { before, after: sandbox.count(E.POWDER) };
    });
    expect(r.after).toBeLessThan(r.before / 2);
  });

  test('brine carries current, oil does not', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      const pool = (y, liquid) => {
        T.box(59, 81, y - 8, y + 1, E.GLASS);
        sandbox.fill(60, y - 6, 80, y, liquid);
        sandbox.set(60, y, E.BATTERY);
        sandbox.set(80, y, E.LAMP);
      };
      pool(60, E.BRINE); pool(120, E.OIL);
      sandbox.step(300);
      return { brine: sandbox.lifeAt(80, 60), oil: sandbox.lifeAt(80, 120) };
    });
    expect(r.brine).toBeGreaterThan(0);
    expect(r.oil).toBe(0);
  });

  test('the spark tool sends a single pulse that dies out', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(50, 100, 150, 100, E.METAL);
      sandbox.fill(151, 100, 152, 100, E.LAMP);
      sandbox.spark(50, 100, 1);
      let litAt = -1;
      for (let k = 0; k < 160 && litAt < 0; k++) { sandbox.step(1); if (sandbox.lifeAt(151, 100)) litAt = k; }
      sandbox.step(300);
      let zaps = 0; for (let x = 50; x <= 152; x++) zaps += sandbox.zapAt(x, 100);
      return { litAt, zaps, after: sandbox.lifeAt(151, 100) };
    });
    expect(r.litAt).toBeGreaterThan(80); // travels one cell per tick
    expect(r.zaps).toBe(0);              // no echoes bouncing back
    expect(r.after).toBe(0);             // and the lamp goes dark again
  });

  test('the spark tool works from the mouse', async ({ sb }) => {
    const { page } = sb;
    const { S } = await sb.run(() => sandbox.size());
    await sb.run(() => { sandbox.fill(100, 100, 200, 100, sandbox.E.METAL); sandbox.fill(201, 100, 202, 100, sandbox.E.LAMP); });
    await page.keyboard.press('q');
    expect(await sb.run(() => sandbox.state().tool)).toBe(await sb.run(() => sandbox.TOOL_SPARK));
    await page.mouse.move(100 * S + 1, 100 * S + 1);
    await page.mouse.down();
    await sb.run(() => sandbox.pause(false));
    await expect.poll(() => sb.run(() => { let z = 0; for (let x = 100; x <= 200; x++) z += sandbox.zapAt(x, 100); return z; })).toBeGreaterThan(0);
    await page.mouse.up();
    await sb.run(() => sandbox.pause(true));
    const lit = await sb.run(() => { for (let k = 0; k < 300; k++) { sandbox.step(1); if (sandbox.lifeAt(201, 100)) return true; } return false; });
    expect(lit).toBe(true);
  });

  test('wires warm a little under steady current but never run away', async ({ sb }) => {
    const r = await sb.run((src) => {
      const circuit = eval(src);
      circuit(40, 140, 100);
      sandbox.step(3000);
      let max = -Infinity; for (let x = 42; x <= 140; x++) max = Math.max(max, sandbox.tempAt(x, 100));
      return max;
    }, circuit.toString());
    expect(r).toBeGreaterThan(25);
    expect(r).toBeLessThan(150);
  });

  test('a lit lamp is drawn brighter than a dark one', async ({ sb }) => {
    const r = await sb.run(() => {
      const { E } = sandbox;
      sandbox.fill(50, 50, 52, 50, E.LAMP);
      sandbox.fill(60, 50, 62, 50, E.LAMP);
      sandbox.spark(60, 50, 1);
      sandbox.step(2);
      sandbox.render();
      const lum = (c) => (c & 255) + ((c >>> 8) & 255) + ((c >>> 16) & 255);
      return { dark: lum(sandbox.pixel(51, 50)), lit: lum(sandbox.pixel(61, 50)) };
    });
    expect(r.lit).toBeGreaterThan(r.dark + 200);
  });
});
