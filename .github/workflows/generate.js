const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const versionTag = process.env.VERSION_TAG || 'v1';

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    console.log('Navigating to script generator...');
    await page.goto('https://www.capitalismlab.com/script-generator-v12.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const jsonPath = path.join(process.cwd(), 'Realistic_Difficulty_settings.json');
      console.log('Uploading settings file:', jsonPath);
      await fileInput.uploadFile(jsonPath);
    } else {
      throw new Error('File input not found on page');
    }

    console.log('Clicking Generate Script...');
    await page.click('#generateScript');
    await page.waitForSelector('#downloadScript', { timeout: 15000 });

    const downloadPath = path.join(process.cwd(), 'output');
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath);
    }

    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath,
    });

    console.log('Clicking Download Script...');
    await page.click('#downloadScript');
    await new Promise(resolve => setTimeout(resolve, 5000));

    await browser.close();

    const files = fs.readdirSync(downloadPath);
    const txtFile = files.find(f => f.endsWith('.txt'));
    if (txtFile) {
      const src = path.join(downloadPath, txtFile);
      const dest = path.join(process.cwd(), `realistic_difficulty_${versionTag}.txt`);
      fs.copyFileSync(src, dest);
      console.log(`Script saved to ${dest}`);
    } else {
      throw new Error('No .txt file found in download directory');
    }

    fs.rmSync(downloadPath, { recursive: true, force: true });
  } catch (err) {
    console.error('Script failed:', err.message);
    if (browser) await browser.close();
    process.exit(1);
  }
})();