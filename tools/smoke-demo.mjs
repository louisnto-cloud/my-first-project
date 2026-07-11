import { chromium } from 'playwright-core';

const SHOT = '/tmp/claude-0/-home-user-my-first-project/1adb32e2-068b-58be-b655-ed8fa8f926f1/scratchpad';
const errors = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

// 1. Landing
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${SHOT}/1-landing.png`, fullPage: true });

// 2. Student (quick-login chip "Học viên")
await page.getByRole('button', { name: /Học viên/ }).last().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOT}/2-student.png`, fullPage: true });

// 3. Practice tab + leaderboard
await page.getByRole('button', { name: /Tự luyện/ }).first().click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${SHOT}/3-practice.png`, fullPage: true });

// 4. Logout → teacher
await page.evaluate(() => localStorage.removeItem('etop-token'));
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Giáo viên/ }).last().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOT}/4-teacher.png`, fullPage: true });

// 5. Owner
await page.evaluate(() => localStorage.removeItem('etop-token'));
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Chủ TT/ }).click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOT}/5-owner.png`, fullPage: true });

// 6. Parent
await page.evaluate(() => localStorage.removeItem('etop-token'));
await page.goto('http://localhost:4173/index.html', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Phụ huynh/ }).last().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOT}/6-parent.png`, fullPage: true });

await browser.close();
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO CONSOLE/PAGE ERRORS');
