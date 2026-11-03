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

      await page.getByRole('button', { name: 'Reset route' }).click();
      for (const label of [
        'The unemployment office',
        'Take the flyer and find somewhere to sleep',
        'The park bench (free)',
        'Skip it',
      ]) {
        await page.locator('.simulator-choice button').filter({ hasText: label }).click();
      }
      await page.getByText('Canonical state after 4 choices').waitFor();
      const locked = page.locator('.simulator-choice').filter({ hasText: 'Diner dishwasher, nights' });
      assert.equal(await locked.locator('button').isDisabled(), true);
      assert.match(await locked.textContent(), /Needs Energy 40\+/);
      await page.getByRole('button', { name: '← Undo choice' }).click();
      await page.getByText('Canonical state after 3 choices').waitFor();
      await page.getByRole('button', { name: 'Edit draft' }).click();
      await page.locator('#draft-text').fill('');
      assert.equal(await page.getByRole('button', { name: 'Apply valid draft to map' }).isDisabled(), true);
      await page.locator('.draft-issues button').filter({ hasText: 'Scene text is required' }).click();
      assert.equal(await page.evaluate(() => document.activeElement?.id), 'draft-text');
      await page.locator('#draft-text').fill('A revised opening passage.');
      await page.locator('#draft-title').fill('Revised opening');
      await page.getByRole('button', { name: 'Apply valid draft to map' }).click();
      assert((await page.locator('.map-node').filter({ hasText: 'Revised opening' }).count()) > 0);
      await page.locator('.draft-choice-row').first().locator('summary').click();
      await page.getByRole('button', { name: 'Explore valid draft' }).click();
      await page.locator('.explorer-report').getByText(/4 reachable endings/).waitFor();
      await page.locator('.definitions-editor summary').click();
      await page.getByRole('textbox', { name: 'New stat ID' }).fill('courage');
      await page.getByRole('button', { name: 'Add stat', exact: true }).click();
      const courage = page.locator('#definition-stat-courage');
      await courage.getByLabel('Label').fill('Courage');
      await courage.getByLabel('Initial').fill('12');
      await courage.getByLabel('Maximum').fill('10');
      assert.equal(await page.getByRole('button', { name: 'Apply valid draft to map' }).isDisabled(), true);
      await page.locator('.draft-issues button').filter({ hasText: 'Initial value is above max' }).click();
      assert.equal(await page.evaluate(() => document.activeElement?.closest('.definition-row')?.id), 'definition-stat-courage');
      await courage.getByLabel('Maximum').fill('20');
      await page.getByRole('textbox', { name: 'New item ID' }).fill('key');
      await page.getByRole('button', { name: 'Add item', exact: true }).click();
      const key = page.locator('#definition-item-key');
      await key.getByLabel('Label').fill('Front door key');
      await key.getByLabel('Initial').fill('1');
      assert.equal(await page.getByRole('button', { name: 'Apply valid draft to map' }).isDisabled(), false);
      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download JSON' }).click();
      const download = await downloadPromise;
      const exported = JSON.parse(await (await import('node:fs/promises')).readFile(await download.path(), 'utf8'));
      assert.equal(exported.stats.courage.initial, 12);
      assert.equal(exported.items.key.initial, 1);
      const editorOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.equal(editorOverflow, 0, `${review.name} editor overflows horizontally by ${editorOverflow}px`);
      const editorScreenshot = join(tmpdir(), `rpg-editor-${review.name}.png`);
      await page.screenshot({ path: editorScreenshot, fullPage: true });
      console.log(`${review.name}: ending route, simulation, and draft editor passed; screenshots ${screenshot}, ${editorScreenshot}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
} finally {
  await server.close();
}
