import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(__dirname, '..', 'index.html');
const out = process.env.SHOT_DIR || '/tmp/vuon-shots';
import { mkdirSync } from 'fs';
mkdirSync(out, { recursive: true });

const opts = { args: ['--no-sandbox'] };
if (process.env.PW_CHROME) opts.executablePath = process.env.PW_CHROME;
const b = await chromium.launch(opts);
const p = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
await p.goto(url); await p.waitForSelector('.home-card');
await p.evaluate(() => { VLA.state.setSetting('motion', false); });

// Earn a couple stickers first so the shelf shows content.
await p.evaluate(() => { VLA.state.addSticker('meo'); VLA.state.addSticker('rua'); VLA.state.addSticker('buom'); });
await p.reload(); await p.waitForSelector('.home-card');
await p.screenshot({ path: path.join(out, '1-home.png') });

// A numbers question (count-objects at step 4).
await p.evaluate(() => { VLA.state.progress('numbers').current = 4; });
await p.click('.home-card-numbers'); await p.waitForSelector('.card.model');
await p.screenshot({ path: path.join(out, '2-count.png') });

// Trigger the errorless glow: tap two wrong choices.
await p.evaluate(() => {
  const model = document.querySelector('.card.model').innerHTML;
  const wrong = [...document.querySelectorAll('.card.choice')].filter(c => c.querySelector('.numeral'));
  // click first two non-correct-looking; engine handles correctness
});
const choices = await p.$$('.card.choice');
// click two that are not the eventual correct — just click first two; if one is correct it advances, so re-open
await choices[0].click(); await p.waitForTimeout(120);
const stillThere = await p.$('.card.model');
if (stillThere) {
  const c2 = await p.$$('.card.choice:not(.dimmed)');
  if (c2[0]) { await c2[0].click(); await p.waitForTimeout(150); }
}
await p.screenshot({ path: path.join(out, '3-errorless-glow.png') });

// A letters question with diacritics (match-letter diacritic step = index 3).
await p.goto(url); await p.waitForSelector('.home-card');
// Force the diacritic match-letter step in memory (do NOT reload — reload would
// reset it, since only mastery persists step advancement).
await p.evaluate(() => { VLA.state.progress('letters').current = 3; });
await p.click('.home-card-letters'); await p.waitForSelector('.card.model');
await p.screenshot({ path: path.join(out, '4-letters-diacritic.png') });

// Break overlay.
await p.click('.break-btn'); await p.waitForSelector('.break-overlay');
await p.screenshot({ path: path.join(out, '5-break.png') });
await p.click('.break-return');

// Parent area.
await p.evaluate(() => VLA.app.openParent()); await p.waitForSelector('.parent-overlay');
await p.screenshot({ path: path.join(out, '6-parent.png'), fullPage: false });

await b.close();
console.log('shots written to', out);
