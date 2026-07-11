// End-to-end click-through against the built demo: student completes the
// seeded quiz in the real UI; the teacher's view must show the new result.
import { chromium } from 'playwright-core';

const SHOT = '/tmp/claude-0/-home-user-my-first-project/1adb32e2-068b-58be-b655-ed8fa8f926f1/scratchpad';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
const fails = [];
const expect = (cond, label) => { if (!cond) fails.push(label); console.log((cond ? '✓ ' : '✗ ') + label); };
page.on('pageerror', (e) => fails.push('pageerror: ' + e.message));

// --- Student: log in with a code that has no submissions yet (Khôi) ---
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
await page.getByPlaceholder('UP1482').fill('UP1482');
await page.getByRole('button', { name: /Vào lớp/ }).click();
await page.waitForTimeout(1200);
expect(await page.getByText('Chào Bảo').isVisible(), 'student greeted by name');

// Open the seeded quiz
await page.getByRole('button', { name: /Unit 1 — Ôn tập/ }).click();
await page.waitForTimeout(1200);
expect(await page.getByText(/I ___ a student/).first().isVisible(), 'player shows the MC question');

// Answer all 4 questions (MC options, listen options, reorder words)
await page.getByRole('button', { name: 'am', exact: true }).click();
await page.getByRole('button', { name: 'Under the table', exact: true }).click();
await page.getByRole('button', { name: 'Good morning, teacher!', exact: true }).click();
for (const w of ['My', 'name', 'is', 'Mai']) {
  await page.getByRole('button', { name: w, exact: true }).last().click();
}
await page.waitForTimeout(800); // autosave debounce
await page.getByRole('button', { name: /Nộp bài|submit/i }).click();
await page.waitForTimeout(1500);
const celebrateText = await page.textContent('body');
expect(/100/.test(celebrateText), 'celebrate screen shows 100');
await page.screenshot({ path: `${SHOT}/e2e-celebrate.png` });

// --- Teacher: Ms. Ha must now see 3/3 submitted ---
await page.evaluate(() => localStorage.removeItem('etop-token'));
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
await page.getByPlaceholder('UP1482').fill('GV0004');
await page.getByRole('button', { name: /Vào lớp/ }).click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /Lớp Up 1/ }).last().click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /Bài tập \(/ }).click();
await page.waitForTimeout(600);
const teacherBody = await page.textContent('body');
expect(/3\/3 đã nộp/.test(teacherBody), "teacher sees 3/3 đã nộp for the quiz");
await page.screenshot({ path: `${SHOT}/e2e-teacher.png`, fullPage: true });

await browser.close();
if (fails.length) { console.log('\nFAILURES:\n' + fails.join('\n')); process.exit(1); }
console.log('\nE2E PASS');
