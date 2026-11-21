const path = require('path');
const { pathToFileURL } = require('url');
const { test: base, expect } = require('@playwright/test');

const PAGE = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href + '?test';
const HELPERS = path.resolve(__dirname, 'page-helpers.js');

const test = base.extend({
  sb: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript({ path: HELPERS });
    await page.goto(PAGE);
    await page.waitForFunction(() => !!window.sandbox);
    await page.evaluate(() => sandbox.seed(1337));
    await use({
      page,
      errors,
      run: (fn, arg) => page.evaluate(fn, arg),
    });
    expect(errors, 'errors raised by the page').toEqual([]);
  },
});

module.exports = { test, expect, PAGE };
