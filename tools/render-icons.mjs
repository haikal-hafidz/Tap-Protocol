import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import playwright from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ICONS_DIR = path.join(ROOT, 'icons');
const svgPath = path.join(ICONS_DIR, 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf8');

// For maskable icon: safe zone is 80%, so we pad inside the viewBox or add a solid background
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#354B3B"/>
  <g transform="translate(51.2, 51.2) scale(0.8)">
    ${svgContent.replace(/^<svg[^>]*>|<\/svg>$/gi, '')}
  </g>
</svg>`;

async function renderIcons() {
  const browser = await playwright.chromium.launch();
  const page = await browser.newPage();

  const targets = [
    { name: 'icon-512.png', size: 512, svg: svgContent },
    { name: 'icon-192.png', size: 192, svg: svgContent },
    { name: 'apple-touch-icon.png', size: 180, svg: svgContent },
    { name: 'favicon-32.png', size: 32, svg: svgContent },
    { name: 'icon-maskable-512.png', size: 512, svg: maskableSvg }
  ];

  for (const t of targets) {
    const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:transparent;">
      <div style="width:${t.size}px;height:${t.size}px;display:flex;">
        ${t.svg.replace(/width="512"/g, `width="${t.size}"`).replace(/height="512"/g, `height="${t.size}"`)}
      </div>
    </body></html>`;
    await page.setViewportSize({ width: t.size, height: t.size });
    await page.setContent(html);
    const buf = await page.screenshot({ type: 'png', omitBackground: false });
    fs.writeFileSync(path.join(ICONS_DIR, t.name), buf);
    console.log(`Rendered ${t.name} (${t.size}x${t.size}, ${buf.length} bytes)`);
  }

  await browser.close();
}

renderIcons().catch(err => {
  console.error(err);
  process.exit(1);
});
