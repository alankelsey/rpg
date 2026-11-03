import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const chrome = process.env.CHROME_PATH ?? [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find(existsSync);
assert(chrome, 'Chrome/Chromium was not found; set CHROME_PATH to its executable');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });

try {
  await server.listen();
  const address = server.httpServer?.address();
  assert(address && typeof address === 'object', 'Vite did not expose a local address');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const browser = await chromium.launch({ executablePath: chrome, headless: true });

  try {
    for (const review of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      const page = await browser.newPage({ viewport: { width: review.width, height: review.height } });
      await page.goto(`${baseUrl}/#/story/new-town/map`);
      await page.getByRole('heading', { name: 'New Town map' }).waitFor();

      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.equal(
        overflow.document,
        overflow.viewport,
        `${review.name} document overflows horizontally: ${overflow.document}px > ${overflow.viewport}px`,
      );

      const ending = page.locator('.map-node.ending-node').first();
      await ending.click();
      await page.getByRole('button', { name: /Trace one route/ }).click();
      await page.getByText(/Canonical state after \d+ choices/).waitFor();
      assert((await page.locator('.map-node.route-preview').count()) > 1, `${review.name} route nodes were not highlighted`);
      assert((await page.locator('.map-edge.route-preview').count()) > 0, `${review.name} route edges were not highlighted`);

      const screenshot = join(tmpdir(), `rpg-map-${review.name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      console.log(`${review.name}: route preview passed; screenshot ${screenshot}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
