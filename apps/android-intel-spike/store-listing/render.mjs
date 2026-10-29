// Run from the repository root: node apps/android-intel-spike/store-listing/render.mjs
// Requires the existing dev dependencies and installed Google Chrome; no app build or network access.
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const output = new URL('./', import.meta.url);
const launcher = await readFile(new URL('../app/src/main/res/drawable/ic_launcher.xml', output), 'utf8');
const viewportWidth = launcher.match(/android:viewportWidth="([\d.]+)"/)?.[1];
const viewportHeight = launcher.match(/android:viewportHeight="([\d.]+)"/)?.[1];
const paths = [...launcher.matchAll(/<path\b([^>]+)\/>/g)].map(([, attributes]) => {
  const fill = attributes.match(/android:fillColor="(#[\da-f]+)"/i)?.[1];
  const path = attributes.match(/android:pathData="([^"]+)"/)?.[1];
  if (!fill || !path) throw new Error('Unsupported launcher path; update the store export.');
  return `<path fill="${fill}" d="${path}"/>`;
});
if (!viewportWidth || !viewportHeight || paths.length === 0) throw new Error('Missing launcher artwork.');
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${viewportWidth} ${viewportHeight}">${paths.join('')}</svg>`;

const browser = await chromium.launch({channel: 'chrome'});
try {
  for (const asset of [
    {name: 'app-icon-512.png', width: 512, height: 512, svg: icon, alpha: true, limit: 1024 * 1024},
    {name: 'feature-graphic-1024x500.png', width: 1024, height: 500,
      svg: await readFile(new URL('feature-graphic.svg', output), 'utf8'), alpha: false, limit: 15 * 1024 * 1024},
  ]) {
    const page = await browser.newPage({deviceScaleFactor: 1, viewport: {width: asset.width, height: asset.height}});
    await page.route('**/*', (route) => route.abort());
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;overflow:hidden}svg{display:block}</style>${asset.svg}`);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    let png;
    if (asset.alpha) {
      // Canvas PNG export explicitly retains the 8-bit alpha channel required for the store icon.
      const data = await page.evaluate(async ({svg, width, height}) => {
        const img = new Image();
        img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        return canvas.toDataURL('image/png').split(',')[1];
      }, {svg: asset.svg, width: asset.width, height: asset.height});
      png = Buffer.from(data, 'base64');
    } else {
      png = await page.screenshot({type: 'png', animations: 'disabled', omitBackground: false});
    }
    const expectedColorType = asset.alpha ? 6 : 2;
    if (png.readUInt32BE(16) !== asset.width || png.readUInt32BE(20) !== asset.height
      || png[24] !== 8 || png[25] !== expectedColorType || png.length > asset.limit) {
      throw new Error(`Invalid dimensions, PNG color format or file size: ${asset.name}`);
    }
    await writeFile(new URL(asset.name, output), png);
    console.log(`${fileURLToPath(new URL(asset.name, output))}: ${asset.width}×${asset.height}, ${asset.alpha ? 'RGBA' : 'RGB'}, ${png.length} bytes`);
    await page.close();
  }
} finally {
  await browser.close();
}
