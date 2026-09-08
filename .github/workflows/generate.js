const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const versionTag = process.env.VERSION_TAG || 'v1';

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  await page.goto('https://www.capitalismlab.com/script-generator-v12.html', {
    waitUntil: 'networkidle0'
  });

  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(path.join(process.cwd(), 'Realistic_Difficulty_settings.json'));
  }

  await page.click('#generateScript');

  await page.waitForTimeout(2000);

  const downloadPath = path.join(process.cwd(), 'output');
  if (!fs.existsSync(downloadPath)) {
    fs.mkdirSync(downloadPath);
  }

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  await page.click('#downloadScript');

  await page.waitForTimeout(3000);

  await browser.close();

  const files = fs.readdirSync(downloadPath);
  const txtFile = files.find(f => f.endsWith('.txt'));
  if (txtFile) {
    const src = path.join(downloadPath, txtFile);
    const dest = path.join(process.cwd(), `realistic_difficulty_${versionTag}.txt`);
    fs.copyFileSync(src, dest);
  }

  fs.rmSync(downloadPath, { recursive: true, force: true });
})();