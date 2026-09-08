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

    page.on('dialog', async dialog => {
      console.log('Dialog:', dialog.message());
      await dialog.dismiss();
    });

    console.log('Navigating to script generator...');
    await page.goto('https://www.capitalismlab.com/script-generator-v12.html', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    const jsonPath = path.join(process.cwd(), 'Realistic_Difficulty_settings.json');
    const settings = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log('Injecting settings into form...');
    await page.evaluate((s) => {
      const setValue = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
      };
      const setChecked = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!val;
      };

      if (s.header) {
        setValue('scriptTitle', s.header.title);
        setValue('scriptDescription', s.header.description);
        setValue('scriptMod', s.header.mod);
        setValue('initialGameSpeed', s.header.initialGameSpeed);
        setValue('goalSet', s.header.goalSet);
        setValue('regionalMap', s.header.regionalMap);
        setChecked('survivalMode', s.header.survivalMode);
        setChecked('resetSettings', s.header.resetSettings);
      }

      if (s.environment) {
        Object.keys(s.environment).forEach(key => {
          const el = document.getElementById(key);
          if (el) el.value = s.environment[key] || '';
        });
      }

      if (s.competitors) {
        Object.keys(s.competitors).forEach(key => {
          if (key === 'aiProductExpertise') return;
          const el = document.getElementById(key);
          if (el) el.value = s.competitors[key] || '';
        });
      }

      if (s.products) {
        Object.keys(s.products).forEach(key => {
          const el = document.getElementById(key);
          if (el) el.value = s.products[key] || '';
        });
      }

      if (s.specialRules) {
        Object.keys(s.specialRules).forEach(key => {
          const el = document.getElementById(key);
          if (el) el.value = s.specialRules[key] || '';
        });
      }

      if (s.dlc) {
        Object.keys(s.dlc).forEach(key => {
          const el = document.getElementById(key);
          if (el) {
            if (el.type === 'checkbox') el.checked = !!s.dlc[key];
            else el.value = s.dlc[key] || '';
          }
        });
      }

      if (s.expertise) {
        setValue('expertiseType', s.expertise.type);
        if (s.expertise.general) {
          Object.keys(s.expertise.general).forEach(key => {
            const el = document.getElementById(key);
            if (el) el.value = s.expertise.general[key] || '';
          });
        }
      }

      if (s.locks) {
        Object.keys(s.locks).forEach(key => {
          if (key === 'lockedProducts' || key === 'unlockedProducts') return;
          const el = document.getElementById(key);
          if (el && el.type === 'checkbox') el.checked = !!s.locks[key];
        });
      }

      if (s.goalRewards) {
        Object.keys(s.goalRewards).forEach(key => {
          const el = document.getElementById(key);
          if (el) el.value = s.goalRewards[key] || '';
        });
      }
    }, settings);

    console.log('Clicking Generate Script...');
    await page.click('#generateScript');
    await page.waitForSelector('#outputSection', { timeout: 15000 });

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