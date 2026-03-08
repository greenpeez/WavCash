const puppeteer = require('puppeteer');
const pptxgen = require('pptxgenjs');
const JSZip = require('jszip');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;
const WP_FILE = 'file://' + path.join(DIR, 'WavCash-WhitePaper.html');
const PD_FILE = 'file://' + path.join(DIR, 'WavCash-PitchDeck.html');

const SLIDE_W = 1920;
const SLIDE_H = 1080;

// Whitepaper page dimensions (A4 portrait at 2x for crisp text)
const WP_W = 1588;  // 794 * 2
const WP_H = 2246;  // 1123 * 2


// =========================================================================
//  TOC HTML — block layout only (no flexbox)
// =========================================================================

function buildTocHtml() {
  const items = [
    { num: '', label: 'Executive Summary' },
    { num: '01', label: 'The Problem' },
    { num: '02', label: 'The Market' },
    { num: '03', label: 'The Solution' },
    { num: '04', label: 'Phase 2 and Beyond' },
    { num: '05', label: 'Technical Architecture' },
    { num: '06', label: 'Business Model' },
    { num: '07', label: 'Go-to-Market' },
    { num: '', label: 'Conclusion' },
  ];

  const rows = items.map(item => {
    const numColor = item.num ? 'var(--accent)' : 'var(--text-tertiary)';
    const numOpacity = item.num ? '1' : '0.5';
    return `<div style="padding:12px 0;border-bottom:1px solid var(--border-subtle);overflow:hidden;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${numColor};opacity:${numOpacity};display:inline-block;width:28px;vertical-align:baseline;">${item.num}</span>
      <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:600;vertical-align:baseline;">${item.label}</span>
    </div>`;
  }).join('\n');

  return `<div id="pdf-toc" style="display:block;padding:140px 0 80px 0;">
  <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--text-tertiary);opacity:0.5;margin-bottom:16px;">Contents</div>
  <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:36px;font-weight:700;letter-spacing:-1.5px;margin-bottom:48px;color:var(--text-primary);">Table of Contents</h2>
  <div style="display:block;">
${rows}
  </div>
  <div style="margin-top:80px;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text-tertiary);opacity:0.35;">
    <span>wav.cash</span>
    <span style="margin-left:32px;">February 2026</span>
  </div>
</div>`;
}


// =========================================================================
//  Strip notesSlides from a PPTX buffer
// =========================================================================

async function stripNotesFromPptx(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const removed = [];
  zip.forEach((relativePath) => {
    if (
      relativePath.startsWith('ppt/notesSlides/') ||
      relativePath.startsWith('ppt/notesMasters/')
    ) {
      removed.push(relativePath);
    }
  });
  for (const f of removed) zip.remove(f);
  console.log(`    Stripped ${removed.length} notes files`);

  for (const [filePath, file] of Object.entries(zip.files)) {
    if (/^ppt\/slides\/_rels\/slide\d+\.xml\.rels$/.test(filePath)) {
      let xml = await file.async('string');
      xml = xml.replace(/<Relationship[^>]*Target="[^"]*notesSlide[^"]*"[^>]*\/>/g, '');
      zip.file(filePath, xml);
    }
  }

  if (zip.files['[Content_Types].xml']) {
    let ct = await zip.files['[Content_Types].xml'].async('string');
    ct = ct.replace(/<Override[^>]*PartName="\/ppt\/notesSlides\/[^"]*"[^>]*\/>/g, '');
    ct = ct.replace(/<Override[^>]*PartName="\/ppt\/notesMasters\/[^"]*"[^>]*\/>/g, '');
    zip.file('[Content_Types].xml', ct);
  }

  if (zip.files['ppt/presentation.xml']) {
    let pres = await zip.files['ppt/presentation.xml'].async('string');
    pres = pres.replace(/<p:notesMasterIdLst>[\s\S]*?<\/p:notesMasterIdLst>/g, '');
    zip.file('ppt/presentation.xml', pres);
  }

  if (zip.files['ppt/_rels/presentation.xml.rels']) {
    let rels = await zip.files['ppt/_rels/presentation.xml.rels'].async('string');
    rels = rels.replace(/<Relationship[^>]*Target="notesMasters\/[^"]*"[^>]*\/>/g, '');
    zip.file('ppt/_rels/presentation.xml.rels', rels);
  }

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}


// =========================================================================
//  Verify PPTX slide count
// =========================================================================

async function verifyPptx(filePath) {
  const buf = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(buf);
  let slideCount = 0;
  let hasNotes = false;
  zip.forEach((p) => {
    if (/^ppt\/slides\/slide\d+\.xml$/.test(p)) slideCount++;
    if (p.startsWith('ppt/notesSlides/')) hasNotes = true;
  });
  console.log(`    Verified: ${slideCount} slides, notesSlides: ${hasNotes ? 'YES (problem!)' : 'none (clean)'}`);
  return { slideCount, hasNotes };
}


// =========================================================================
//  WHITEPAPER PPTX — screenshot-based, portrait A4 pages
//  Captures full document height then slices into page-sized chunks
// =========================================================================

async function generateWhitepaperPPTX(browser, lightMode) {
  const suffix = lightMode ? 'Light' : 'Dark';
  const outPath = path.join(DIR, `WavCash-WhitePaper-${suffix}.pptx`);
  console.log(`\nGenerating ${path.basename(outPath)}...`);

  const page = await browser.newPage();
  // Use 794px viewport (A4 width at 96dpi) with 2x device scale for crisp text
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.goto(WP_FILE, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.emulateMediaType('screen');

  if (lightMode) {
    await page.evaluate(() => document.documentElement.classList.add('light-mode'));
  }

  // Prepare DOM
  await page.evaluate(() => {
    // Remove interactive chrome
    ['.top-nav', '.sidebar', '.sidebar-toggle', '.scroll-indicator'].forEach(sel => {
      document.querySelectorAll(sel).forEach(el => el.remove());
    });

    // Reset layout
    const main = document.querySelector('.main');
    if (main) {
      main.style.marginLeft = '0';
      main.style.maxWidth = 'none';
      main.style.padding = '0';
    }
    const content = document.querySelector('.content');
    if (content) content.style.maxWidth = 'none';

    // Convert cover from flex to block
    const cover = document.querySelector('.cover');
    if (cover) {
      cover.style.display = 'block';
      cover.style.minHeight = 'auto';
      cover.style.height = 'auto';
      cover.style.paddingTop = '200px';
      cover.style.paddingBottom = '80px';
    }

    // Root background
    const bgColor = getComputedStyle(document.body).backgroundColor;
    document.documentElement.style.backgroundColor = bgColor;

    // Kill transitions/animations
    const s = document.createElement('style');
    s.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
    document.head.appendChild(s);
  });

  // Inject TOC before the cover
  const tocHtml = buildTocHtml();
  await page.evaluate((html) => {
    const cover = document.querySelector('.cover');
    if (cover) cover.insertAdjacentHTML('beforebegin', html);
  }, tocHtml);

  // Wait for fonts
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 2000));

  // Get total document height
  const totalHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const viewportH = 1123; // matches viewport height
  const pageCount = Math.ceil(totalHeight / viewportH);
  console.log(`  Document height: ${totalHeight}px, pages: ${pageCount}`);

  // A4 portrait: 7.5 x 10 inches (standard)
  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'A4', width: 7.5, height: 10 });
  pptx.layout = 'A4';

  // Capture each page by scrolling
  for (let i = 0; i < pageCount; i++) {
    const scrollY = i * viewportH;
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await new Promise(r => setTimeout(r, 200));

    const imgBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 794, height: viewportH },
    });
    const base64 = imgBuffer.toString('base64');

    const slide = pptx.addSlide();
    slide.background = { data: 'image/png;base64,' + base64 };
    console.log(`    Page ${i + 1}/${pageCount} (${(imgBuffer.length / 1024).toFixed(0)} KB)`);
  }

  await page.close();

  console.log('  Writing PPTX buffer...');
  const rawBuffer = await pptx.write({ outputType: 'nodebuffer' });

  console.log('  Post-processing: stripping notesSlides...');
  const cleanBuffer = await stripNotesFromPptx(rawBuffer);

  fs.writeFileSync(outPath, cleanBuffer);

  if (!fs.existsSync(outPath)) {
    throw new Error(`Failed to write ${path.basename(outPath)}`);
  }
  const mb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(1);
  console.log(`  -> ${path.basename(outPath)} (${mb} MB)`);
  await verifyPptx(outPath);
}


// =========================================================================
//  PITCH DECK PPTX — per-slide isolation + post-process
// =========================================================================

async function generatePitchDeckPPTX(browser, lightMode) {
  const suffix = lightMode ? 'Light' : 'Dark';
  const outPath = path.join(DIR, `WavCash-PitchDeck-${suffix}.pptx`);
  console.log(`\nGenerating ${path.basename(outPath)}...`);

  const page = await browser.newPage();
  await page.setViewport({ width: SLIDE_W, height: SLIDE_H, deviceScaleFactor: 2 });
  await page.goto(PD_FILE, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.emulateMediaType('screen');

  if (lightMode) {
    await page.evaluate(() => document.documentElement.classList.add('light-mode'));
  }

  // Remove chrome, prepare slides
  await page.evaluate((sw, sh) => {
    ['.deck-nav', '.progress-bar', '.slide-counter'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.remove();
    });

    document.documentElement.style.scrollSnapType = 'none';
    document.documentElement.style.scrollBehavior = 'auto';
    document.documentElement.style.overflow = 'visible';
    document.body.style.overflow = 'visible';

    document.querySelectorAll('.slide').forEach(s => {
      s.classList.add('active');
      s.style.width = sw + 'px';
      s.style.height = sh + 'px';
      s.style.minHeight = sh + 'px';
      s.style.maxHeight = sh + 'px';
      s.style.overflow = 'hidden';
      s.style.scrollSnapAlign = 'none';
    });

    document.querySelectorAll('.slide .slide-content > *').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });

    const st = document.createElement('style');
    st.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }';
    document.head.appendChild(st);
  }, SLIDE_W, SLIDE_H);

  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 2000));

  const slideCount = await page.evaluate(() => document.querySelectorAll('.slide').length);
  console.log(`  Found ${slideCount} slides`);

  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'WIDE', width: 13.333, height: 7.5 });
  pptx.layout = 'WIDE';

  for (let i = 0; i < slideCount; i++) {
    await page.evaluate((idx) => {
      const slides = document.querySelectorAll('.slide');
      slides.forEach((s, j) => {
        if (j === idx) {
          s.style.display = 'flex';
          s.style.position = 'fixed';
          s.style.top = '0';
          s.style.left = '0';
          s.style.zIndex = '9999';
        } else {
          s.style.display = 'none';
        }
      });
    }, i);

    await new Promise(r => setTimeout(r, 300));

    const imgBuffer = await page.screenshot({ type: 'png' });
    const base64 = imgBuffer.toString('base64');

    const slide = pptx.addSlide();
    slide.background = { data: 'image/png;base64,' + base64 };
    console.log(`    Slide ${i + 1}/${slideCount} (${(imgBuffer.length / 1024).toFixed(0)} KB)`);
  }

  await page.close();

  console.log('  Writing PPTX buffer...');
  const rawBuffer = await pptx.write({ outputType: 'nodebuffer' });

  console.log('  Post-processing: stripping notesSlides...');
  const cleanBuffer = await stripNotesFromPptx(rawBuffer);

  fs.writeFileSync(outPath, cleanBuffer);

  if (!fs.existsSync(outPath)) {
    throw new Error(`Failed to write ${path.basename(outPath)}`);
  }
  const mb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(1);
  console.log(`  -> ${path.basename(outPath)} (${mb} MB)`);
  await verifyPptx(outPath);
}


// =========================================================================
//  MAIN — all 4 PPTX files
// =========================================================================

(async () => {
  console.log('=== WavCash Export Generator ===\n');
  console.log('Generating: 4 PPTX files (whitepaper + pitch deck, dark + light)\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--font-render-hinting=none',
      '--disable-gpu',
    ],
  });

  try {
    await generateWhitepaperPPTX(browser, false);
    await generateWhitepaperPPTX(browser, true);
    await generatePitchDeckPPTX(browser, false);
    await generatePitchDeckPPTX(browser, true);

    console.log('\n=== All 4 files generated ===\n');

    const expected = [
      'WavCash-WhitePaper-Dark.pptx',
      'WavCash-WhitePaper-Light.pptx',
      'WavCash-PitchDeck-Dark.pptx',
      'WavCash-PitchDeck-Light.pptx',
    ];
    let allOK = true;
    for (const f of expected) {
      const fp = path.join(DIR, f);
      if (fs.existsSync(fp)) {
        const size = fs.statSync(fp).size;
        const unit = size > 1024 * 1024
          ? (size / (1024 * 1024)).toFixed(1) + ' MB'
          : (size / 1024).toFixed(0) + ' KB';
        console.log(`  OK  ${f}  (${unit})`);
      } else {
        console.log(`  MISSING  ${f}`);
        allOK = false;
      }
    }

    if (!allOK) {
      console.error('\nSome files are missing!');
      process.exit(1);
    }
    console.log('\nDone!');
  } catch (err) {
    console.error('\nError:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
