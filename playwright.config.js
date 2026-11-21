const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  timeout: 60000,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    viewport: { width: 1000, height: 700 },
    trace: 'off',
  },
});
