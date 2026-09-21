const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  await page.goto('http://localhost:8765/index.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const defaultCount = await page.locator('#countBadge').textContent();
  console.log('default filter (6人で遊べる) count badge:', defaultCount);

  // switch to all
  await page.click('button[data-players="all"]');
  await page.waitForTimeout(150);
  const allCount = await page.locator('#countBadge').textContent();
  console.log('all count badge:', allCount);

  // switch to "その他の人数"
  await page.click('button[data-players="any"]');
  await page.waitForTimeout(150);
  const otherCount = await page.locator('#countBadge').textContent();
  console.log('other count badge:', otherCount);

  // click a star rating on first card and reload to check persistence
  await page.click('button[data-players="all"]');
  await page.waitForTimeout(150);
  const firstCardTitle = await page.locator('.card .title').first().textContent();
  await page.locator('.card .stars .star').first().click({ position: { x: 5, y: 5 } });
  // click the 3rd star of first card instead for a clearer test
  await page.locator('.card').first().locator('.star').nth(2).click();
  await page.waitForTimeout(150);
  const filledBefore = await page.locator('.card').first().locator('.star.filled').count();
  console.log('filled stars after clicking 3rd star:', filledBefore, 'on card:', firstCardTitle);

  await page.reload({ waitUntil: 'networkidle' });
  await page.click('button[data-players="all"]');
  await page.waitForTimeout(150);
  const filledAfterReload = await page.locator('.card').first().locator('.star.filled').count();
  console.log('filled stars after reload (persistence check):', filledAfterReload);

  // search box test
  await page.fill('#searchBox', '殺人');
  await page.waitForTimeout(150);
  const searchCount = await page.locator('#countBadge').textContent();
  console.log('search "殺人" count:', searchCount);

  // sold out toggle test
  await page.fill('#searchBox', '');
  await page.uncheck('#hideSoldOut');
  await page.waitForTimeout(150);
  const withSoldOut = await page.locator('#countBadge').textContent();
  console.log('with sold out shown, all filter count:', withSoldOut);

  console.log('console/page errors:', errors);

  await browser.close();
})();
