const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 3840, height: 2160 } });
  let errors = 0;

  page.on('console', msg => { if (msg.type() === 'error') { errors++; console.log(`[ERROR]`, msg.text()); } });
  page.on('pageerror', err => { errors++; console.error('PAGE:', err.message); });

  await page.goto('http://localhost:8765/index.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: 'verify.png' });
  console.log('Errors:', errors);

  await browser.close();
})();
