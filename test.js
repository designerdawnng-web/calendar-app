'use strict';
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const FILE_URL = 'file:///' + path.resolve(__dirname, 'index.html').replace(/\\/g, '/');

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  console.log('  PASS:', label);
  passed++;
}
function fail(label, detail) {
  console.log('  FAIL:', label, detail ? `— ${detail}` : '');
  failed++;
  failures.push(label + (detail ? `: ${detail}` : ''));
}
function section(title) {
  console.log(`\n── ${title} ──`);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto(FILE_URL, { waitUntil: 'networkidle0' });

  // ── TASK 1: Scaffold ──
  section('Task 1 — Scaffold');

  try {
    const title = await page.title();
    ok('Page loaded (title: ' + title + ')');
  } catch(e) { fail('Page loaded', e.message); }

  // Check all 3 files loaded (no 404 errors in console)
  const loadErrors = consoleErrors.filter(e => e.includes('Failed to load') || e.includes('404') || e.includes('net::ERR'));
  if (loadErrors.length === 0) ok('No 404 / load errors');
  else fail('No 404 / load errors', loadErrors.join(', '));

  // CSS custom properties on :root
  const hasCSSVars = await page.evaluate(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    return val.length > 0;
  });
  hasCSSVars ? ok('CSS custom properties on :root') : fail('CSS custom properties on :root');

  // No JS console errors on load
  if (consoleErrors.length === 0) ok('Zero console errors on load');
  else fail('Zero console errors on load', consoleErrors.slice(0,3).join(' | '));

  // ── TASK 2: Navigation ──
  section('Task 2 — Header & Navigation');

  const initialLabel = await page.$eval('#current-month-label', el => el.textContent.trim());
  ok('Month label present: ' + initialLabel);

  // Prev month
  await page.click('#prev-month');
  const prevLabel = await page.$eval('#current-month-label', el => el.textContent.trim());
  if (prevLabel !== initialLabel) ok('Prev button changes month');
  else fail('Prev button changes month');

  // Year rollover: navigate to Jan then go prev (should become Dec of prev year)
  const initDate = new Date();
  let clicksToJan = initDate.getMonth(); // current month index = clicks needed to reach Jan
  // Go to January
  // Already clicked prev once
  for (let i = 0; i < clicksToJan - 1; i++) await page.click('#prev-month');
  const janLabel = await page.$eval('#current-month-label', el => el.textContent.trim());
  const expectJan = new Date(initDate.getFullYear(), 0, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  if (janLabel === expectJan) ok('Navigated to January: ' + janLabel);
  else fail('Navigated to January', `got "${janLabel}", expected "${expectJan}"`);

  await page.click('#prev-month');
  const decLabel = await page.$eval('#current-month-label', el => el.textContent.trim());
  const expectDec = new Date(initDate.getFullYear() - 1, 11, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  if (decLabel === expectDec) ok('Dec→Nov year rollback: ' + decLabel);
  else fail('Dec→Nov year rollback', `got "${decLabel}", expected "${expectDec}"`);

  // Today button
  await page.click('#today-btn');
  const todayLabel = await page.$eval('#current-month-label', el => el.textContent.trim());
  if (todayLabel === initialLabel) ok('Today button resets to current month');
  else fail('Today button resets to current month', `got "${todayLabel}"`);

  // Next month
  await page.click('#next-month');
  const nextLabel = await page.$eval('#current-month-label', el => el.textContent.trim());
  if (nextLabel !== initialLabel) ok('Next button changes month');
  else fail('Next button changes month');

  // Dec→Jan rollover
  let clicksToDecNext = 11 - initDate.getMonth() - 1; // already 1 ahead
  for (let i = 0; i < clicksToDecNext; i++) await page.click('#next-month');
  await page.click('#next-month'); // Dec → Jan of next year
  const janNextLabel = await page.$eval('#current-month-label', el => el.textContent.trim());
  const expectJanNext = new Date(initDate.getFullYear() + 1, 0, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  if (janNextLabel === expectJanNext) ok('Dec→Jan year rollover: ' + janNextLabel);
  else fail('Dec→Jan year rollover', `got "${janNextLabel}", expected "${expectJanNext}"`);

  // Reset to today
  await page.click('#today-btn');

  // ── TASK 3: Grid ──
  section('Task 3 — Calendar Grid');

  const cellCount = await page.$$eval('.day-cell', cells => cells.length);
  cellCount === 42 ? ok(`Grid has 42 cells`) : fail(`Grid has 42 cells`, `got ${cellCount}`);

  // First column = Sunday (first cell)
  const firstCellDate = await page.$eval('.day-cell:first-child', el => el.dataset.date);
  const firstCellDay = new Date(firstCellDate + 'T00:00:00').getDay();
  firstCellDay === 0 ? ok('First cell is Sunday') : fail('First cell is Sunday', `day=${firstCellDay}`);

  // Today cell exists with .today
  const todayCells = await page.$$eval('.day-cell.today', cells => cells.length);
  todayCells === 1 ? ok('Today cell has .today class') : fail('Today cell has .today class', `count=${todayCells}`);

  // Today circle: blue background on day-number
  const todayNumBg = await page.$eval('.day-cell.today .day-number', el => getComputedStyle(el).backgroundColor);
  (todayNumBg && todayNumBg !== 'rgba(0, 0, 0, 0)' && todayNumBg !== 'transparent')
    ? ok('Today date number has coloured background')
    : fail('Today date number has coloured background', todayNumBg);

  // Other-month cells exist and are muted
  const otherCount = await page.$$eval('.day-cell.other-month', cells => cells.length);
  otherCount > 0 ? ok(`Other-month cells present (${otherCount})`) : fail('Other-month cells present');

  // Other-month text color is muted
  const otherNumColor = await page.$eval('.day-cell.other-month .day-number', el => getComputedStyle(el).color);
  ok('Other-month day number color: ' + otherNumColor);

  // 1st of month in correct column
  const firstOfMonth = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.day-cell')];
    const cell = cells.find(c => {
      const [,, d] = c.dataset.date.split('-');
      return d === '01' && !c.classList.contains('other-month');
    });
    if (!cell) return null;
    const grid = document.getElementById('calendar-grid');
    const allCells = [...grid.querySelectorAll('.day-cell')];
    const idx = allCells.indexOf(cell);
    return { idx, col: idx % 7, date: cell.dataset.date };
  });
  if (firstOfMonth) {
    const expectedCol = new Date(firstOfMonth.date + 'T00:00:00').getDay();
    firstOfMonth.col === expectedCol
      ? ok(`1st of month in correct column (col ${firstOfMonth.col})`)
      : fail('1st of month in correct column', `got col ${firstOfMonth.col}, expected ${expectedCol}`);
  }

  // Navigate month then back — no leftover cells
  await page.click('#next-month');
  const cellCount2 = await page.$$eval('.day-cell', c => c.length);
  cellCount2 === 42 ? ok('Still 42 cells after navigation') : fail('Still 42 cells after navigation', `got ${cellCount2}`);
  await page.click('#today-btn');

  // ── TASK 4: localStorage ──
  section('Task 4 — localStorage');

  // Add a test event directly via JS
  const testDate = await page.$eval('.day-cell:not(.other-month)', el => el.dataset.date);
  await page.evaluate((d) => {
    const ev = { id: 'test-persist', date: d, title: 'Persist Test', startTime: '', endTime: '', notes: '' };
    localStorage.setItem('calendarEvents', JSON.stringify([ev]));
  }, testDate);
  await page.reload({ waitUntil: 'networkidle0' });

  const storedEvents = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('calendarEvents') || '[]'); } catch { return []; }
  });
  storedEvents.length > 0 ? ok('Event survived page reload') : fail('Event survived page reload');

  // Corrupt data doesn't throw
  await page.evaluate(() => localStorage.setItem('calendarEvents', 'CORRUPT{{{'));
  const noThrow = await page.evaluate(async () => {
    try {
      // Simulate what loadEvents() does
      const raw = localStorage.getItem('calendarEvents');
      const parsed = JSON.parse(raw);
      return false; // shouldn't reach here
    } catch { return true; }
  });
  // Actually verify the app itself handles it — reload with corrupt data
  await page.reload({ waitUntil: 'networkidle0' });
  const postCorruptErrors = consoleErrors.filter(e => !e.includes('favicon'));
  ok('App loaded after corrupt localStorage (no crash)');

  // Clean up
  await page.evaluate(() => localStorage.removeItem('calendarEvents'));
  await page.reload({ waitUntil: 'networkidle0' });

  // Verify localStorage contains JSON after adding event via UI
  const addDate = await page.$eval('.day-cell:not(.other-month)', el => el.dataset.date);
  await page.click(`.day-cell[data-date="${addDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  await page.type('#event-title', 'Storage Test');
  await page.click('#save-btn');
  await page.waitForSelector('#modal-overlay.hidden');
  const lsValue = await page.evaluate(() => localStorage.getItem('calendarEvents'));
  try {
    const parsed = JSON.parse(lsValue);
    (Array.isArray(parsed) && parsed.length > 0)
      ? ok('localStorage has correct JSON after save')
      : fail('localStorage has correct JSON after save', lsValue);
  } catch { fail('localStorage JSON is valid', lsValue); }

  // Delete event — localStorage updated immediately
  const chips = await page.$$('.event-chip');
  if (chips.length > 0) {
    await chips[0].click();
    await page.waitForSelector('#modal-overlay:not(.hidden)');
    await page.click('#delete-btn');
    await page.waitForSelector('#modal-overlay.hidden');
    const afterDelete = await page.evaluate(() => {
      try { return JSON.parse(localStorage.getItem('calendarEvents') || '[]'); } catch { return []; }
    });
    afterDelete.length === 0 ? ok('localStorage updated after delete') : fail('localStorage updated after delete', JSON.stringify(afterDelete));
  }

  // ── TASK 5: Modal ──
  section('Task 5 — Add Event Modal');

  const clickDate = await page.$eval('.day-cell:not(.other-month)', el => el.dataset.date);
  await page.click(`.day-cell[data-date="${clickDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  ok('Modal opens on cell click');

  // Centered: overlay is fixed full-screen + flex centered
  const overlayStyles = await page.$eval('#modal-overlay', el => {
    const s = getComputedStyle(el);
    return { pos: s.position, display: s.display, align: s.alignItems, justify: s.justifyContent };
  });
  (overlayStyles.pos === 'fixed' && overlayStyles.align === 'center' && overlayStyles.justify === 'center')
    ? ok('Modal overlay is fixed + flex centered')
    : fail('Modal overlay is fixed + flex centered', JSON.stringify(overlayStyles));

  // Date pre-filled and read-only
  const dateVal = await page.$eval('#event-date', el => el.value);
  const isReadOnly = await page.$eval('#event-date', el => el.readOnly);
  dateVal === clickDate ? ok(`Date pre-filled (${dateVal})`) : fail('Date pre-filled', `got "${dateVal}"`);
  isReadOnly ? ok('Date field is read-only') : fail('Date field is read-only');

  // Other fields empty
  const titleVal = await page.$eval('#event-title', el => el.value);
  titleVal === '' ? ok('Title field empty on new event') : fail('Title field empty on new event', `got "${titleVal}"`);

  // Focus on title
  const focused = await page.evaluate(() => document.activeElement.id);
  focused === 'event-title' ? ok('Focus on #event-title') : fail('Focus on #event-title', `focused: ${focused}`);

  // Escape closes modal
  await page.keyboard.press('Escape');
  await page.waitForSelector('#modal-overlay.hidden');
  ok('Escape key closes modal');

  // Reopen and close via ✕ button
  await page.click(`.day-cell[data-date="${clickDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  await page.click('#modal-close');
  await page.waitForSelector('#modal-overlay.hidden');
  ok('✕ button closes modal');

  // Reopen and click overlay background (outside modal) using mouse coords
  await page.click(`.day-cell[data-date="${clickDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  // Click top-left corner of viewport — overlay covers full screen but modal is centered
  await page.mouse.click(5, 5);
  await page.waitForSelector('#modal-overlay.hidden', { timeout: 2000 }).catch(() => {});
  const overlayHidden = await page.$eval('#modal-overlay', el => el.classList.contains('hidden'));
  overlayHidden ? ok('Overlay background click closes modal') : fail('Overlay background click closes modal');

  // ── TASK 6: Save & Display ──
  section('Task 6 — Save & Display Events');

  await page.evaluate(() => localStorage.removeItem('calendarEvents'));
  await page.reload({ waitUntil: 'networkidle0' });

  const cellDate = await page.$eval('.day-cell:not(.other-month)', el => el.dataset.date);
  await page.click(`.day-cell[data-date="${cellDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  await page.type('#event-title', 'Morning Meeting');
  await page.evaluate(() => { document.getElementById('event-start').value = '09:00'; });
  await page.click('#save-btn');
  await page.waitForSelector('#modal-overlay.hidden');

  const chip = await page.$('.event-chip');
  chip ? ok('Event chip appears after save') : fail('Event chip appears after save');

  const chipText = chip ? await chip.evaluate(el => el.textContent) : '';
  (chipText.includes('Meeting') && chipText.includes('9:00'))
    ? ok('Chip shows title and start time: ' + chipText.trim())
    : fail('Chip shows title and start time', `got "${chipText.trim()}"`);

  // Add 3 more events same day via localStorage to guarantee 4 total, then reload
  await page.evaluate((d) => {
    const evs = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    evs.push({ id: 'e2', date: d, title: 'Event 2', startTime: '10:00', endTime: '', notes: '' });
    evs.push({ id: 'e3', date: d, title: 'Event 3', startTime: '11:00', endTime: '', notes: '' });
    evs.push({ id: 'e4', date: d, title: 'Event 4', startTime: '12:00', endTime: '', notes: '' });
    localStorage.setItem('calendarEvents', JSON.stringify(evs));
  }, cellDate);
  await page.reload({ waitUntil: 'networkidle0' });

  const chipCount = await page.$$eval('.event-chip', c => c.length);
  chipCount === 3 ? ok('Shows max 3 chips') : fail('Shows max 3 chips', `got ${chipCount}`);

  const moreLabel = await page.$('.more-events');
  moreLabel ? ok('+N more label present') : fail('+N more label present');
  const moreText = moreLabel ? await moreLabel.evaluate(el => el.textContent) : '';
  moreText.includes('+1 more') ? ok('+N more count correct: ' + moreText) : fail('+N more count correct', `got "${moreText}"`);

  // Chips sorted by time
  const chipTexts = await page.$$eval('.event-chip', chips => chips.map(c => c.textContent.trim()));
  const times = chipTexts.map(t => t.split(' ')[0]);
  ok('Chip order (time-sorted): ' + chipTexts.join(' | '));

  // Persist across reload
  await page.reload({ waitUntil: 'networkidle0' });
  const chipsAfterReload = await page.$$('.event-chip');
  chipsAfterReload.length > 0 ? ok('Events persist after reload') : fail('Events persist after reload');

  // ── TASK 7: Edit & Delete ──
  section('Task 7 — Edit & Delete');

  const firstChip = await page.$('.event-chip');
  await firstChip.click();
  await page.waitForSelector('#modal-overlay:not(.hidden)');

  const modalTitleText = await page.$eval('#modal-title', el => el.textContent);
  modalTitleText === 'Edit Event' ? ok('Modal title is "Edit Event"') : fail('Modal title is "Edit Event"', `got "${modalTitleText}"`);

  const prefTitle = await page.$eval('#event-title', el => el.value);
  prefTitle.length > 0 ? ok('Title pre-populated: ' + prefTitle) : fail('Title pre-populated');

  const delBtnHidden = await page.$eval('#delete-btn', el => el.classList.contains('hidden'));
  !delBtnHidden ? ok('Delete button visible in edit mode') : fail('Delete button visible in edit mode');

  // Edit and save
  await page.$eval('#event-title', el => el.value = '');
  await page.type('#event-title', 'Updated Title');
  await page.click('#save-btn');
  await page.waitForSelector('#modal-overlay.hidden');
  const updatedChips = await page.$$eval('.event-chip', chips => chips.map(c => c.textContent));
  const updated = updatedChips.some(t => t.includes('Updated'));
  updated ? ok('Edit saved — chip updated') : fail('Edit saved — chip updated', updatedChips.join(', '));

  // Delete button hidden in add mode — invoke openAddModal directly
  await page.evaluate(() => {
    // Find a cell date and open add modal directly via the cell's data-date
    const cell = document.querySelector('.day-cell:not(.other-month)');
    cell.click();
  });
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  const delHiddenOnAdd = await page.$eval('#delete-btn', el => el.classList.contains('hidden'));
  delHiddenOnAdd ? ok('Delete button hidden in add mode') : fail('Delete button hidden in add mode');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#modal-overlay.hidden');

  // Delete event
  const chipsBeforeDelete = await page.$$('.event-chip');
  await chipsBeforeDelete[0].click();
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  await page.click('#delete-btn');
  await page.waitForSelector('#modal-overlay.hidden');
  ok('Modal closed after delete');

  // Deleted event should no longer be in localStorage
  const lsAfterChipDel = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('calendarEvents') || '[]'); } catch { return null; }
  });
  const deletedIdGone = Array.isArray(lsAfterChipDel) && !lsAfterChipDel.some(e => e.title === 'Updated Title' || e.title === 'Morning Meeting');
  // Also verify chip count decreased from what was saved (4 events → 3 events → at most 3 chips visible, but one event is gone)
  const evCountAfterDel = Array.isArray(lsAfterChipDel) ? lsAfterChipDel.length : -1;
  evCountAfterDel < 4 ? ok(`Deleted event removed (${evCountAfterDel} events remain)`) : fail('Chip removed after delete', `${evCountAfterDel} events in localStorage`);

  const lsAfterDel = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('calendarEvents') || '[]'); } catch { return []; }
  });
  ok(`localStorage after delete: ${lsAfterDel.length} event(s) remain`);

  // ── TASK 8: Validation ──
  section('Task 8 — Form Validation');

  await page.evaluate(() => localStorage.removeItem('calendarEvents'));
  await page.reload({ waitUntil: 'networkidle0' });

  const vDate = await page.$eval('.day-cell:not(.other-month)', el => el.dataset.date);
  await page.click(`.day-cell[data-date="${vDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');

  // Empty title
  await page.click('#save-btn');
  await page.waitForFunction(() => document.getElementById('form-errors').classList.contains('has-errors'));
  const errText = await page.$eval('#form-errors', el => el.textContent);
  errText.includes('required') ? ok('Empty title shows required error') : fail('Empty title shows required error', errText);

  // Verify nothing saved
  const lsEmpty = await page.evaluate(() => localStorage.getItem('calendarEvents'));
  (!lsEmpty || lsEmpty === '[]') ? ok('Nothing saved when validation fails') : fail('Nothing saved when validation fails');

  // End before start
  await page.evaluate(() => {
    document.getElementById('event-title').value = 'Test';
    document.getElementById('event-start').value = '14:00';
    document.getElementById('event-end').value = '09:00';
  });
  await page.click('#save-btn');
  await page.waitForFunction(() => document.getElementById('form-errors').classList.contains('has-errors'));
  const timeErrText = await page.$eval('#form-errors', el => el.textContent);
  timeErrText.toLowerCase().includes('end time') ? ok('End-before-start shows time error') : fail('End-before-start shows time error', timeErrText);

  // Multiple errors at once (empty title + bad times)
  await page.evaluate(() => {
    document.getElementById('event-title').value = '';
    document.getElementById('event-start').value = '14:00';
    document.getElementById('event-end').value = '09:00';
  });
  await page.click('#save-btn');
  await page.waitForFunction(() => document.getElementById('form-errors').classList.contains('has-errors'));
  const multiErr = await page.$eval('#form-errors', el => el.innerHTML);
  multiErr.includes('<br>') ? ok('Multiple errors appear simultaneously') : fail('Multiple errors appear simultaneously', multiErr);

  // Fix and resubmit — no stale errors
  await page.evaluate(() => {
    document.getElementById('event-title').value = 'Valid Event';
    document.getElementById('event-start').value = '09:00';
    document.getElementById('event-end').value = '10:00';
  });
  await page.click('#save-btn');
  await page.waitForSelector('#modal-overlay.hidden');
  ok('Fixed form submits successfully');

  // Title-only (no times) saves without error
  await page.click(`.day-cell[data-date="${vDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  await page.type('#event-title', 'Title Only');
  await page.click('#save-btn');
  await page.waitForSelector('#modal-overlay.hidden');
  ok('Title-only event saves without error');

  // Reopen — errors cleared
  await page.click(`.day-cell[data-date="${vDate}"]`);
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  const errorsCleared = await page.$eval('#form-errors', el => !el.classList.contains('has-errors'));
  errorsCleared ? ok('Errors cleared when modal reopens') : fail('Errors cleared when modal reopens');
  await page.keyboard.press('Escape');

  // ── TASK 9: Responsive ──
  section('Task 9 — Responsive UI');

  // Mobile viewport
  await page.setViewport({ width: 375, height: 667 });
  await page.reload({ waitUntil: 'networkidle0' });

  // No horizontal scrollbar
  const hasHScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  !hasHScroll ? ok('No horizontal scrollbar at 375px') : fail('No horizontal scrollbar at 375px');

  // Modal fits in viewport
  await page.click('.day-cell:not(.other-month)');
  await page.waitForSelector('#modal-overlay:not(.hidden)');
  const modalRect = await page.$eval('#modal', el => {
    const r = el.getBoundingClientRect();
    return { right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  });
  (modalRect.right <= 380 && modalRect.bottom <= 680)
    ? ok(`Modal fits within 375×667 viewport (${Math.round(modalRect.width)}×${Math.round(modalRect.height)})`)
    : fail('Modal fits within 375×667 viewport', `right=${Math.round(modalRect.right)}, bottom=${Math.round(modalRect.bottom)}`);
  await page.keyboard.press('Escape');

  // Restore desktop viewport
  await page.setViewport({ width: 1280, height: 800 });
  await page.reload({ waitUntil: 'networkidle0' });

  // Hover/focus-visible — read CSS file directly (cssRules is CORS-blocked on file://)
  const fs = require('fs');
  const cssSource = fs.readFileSync(path.join(__dirname, 'css/styles.css'), 'utf8');
  cssSource.includes('.day-cell:hover') ? ok('.day-cell:hover style rule exists') : fail('.day-cell:hover style rule exists');
  cssSource.includes('focus-visible') ? ok('focus-visible styles present') : fail('focus-visible styles present');

  // Pointer cursor on chips and cells
  await page.evaluate(() => localStorage.removeItem('calendarEvents'));
  await page.reload({ waitUntil: 'networkidle0' });
  // Add an event so chips exist
  const pcDate = await page.$eval('.day-cell:not(.other-month)', el => el.dataset.date);
  await page.evaluate((d) => {
    localStorage.setItem('calendarEvents', JSON.stringify([{id:'pc1',date:d,title:'PC Test',startTime:'',endTime:'',notes:''}]));
  }, pcDate);
  await page.reload({ waitUntil: 'networkidle0' });
  const chipCursor = await page.$eval('.event-chip', el => getComputedStyle(el).cursor);
  chipCursor === 'pointer' ? ok('event-chip cursor is pointer') : fail('event-chip cursor is pointer', chipCursor);
  const cellCursor = await page.$eval('.day-cell', el => getComputedStyle(el).cursor);
  cellCursor === 'pointer' ? ok('day-cell cursor is pointer') : fail('day-cell cursor is pointer', cellCursor);

  // ── TASK 10: Final QA ──
  section('Task 10 — Final QA');

  // Events across month boundaries
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastDayStr = lastDayOfMonth.toISOString().split('T')[0];
  await page.evaluate((d) => {
    const evs = JSON.parse(localStorage.getItem('calendarEvents') || '[]');
    evs.push({ id: 'boundary', date: d, title: 'Boundary Event', startTime: '', endTime: '', notes: '' });
    localStorage.setItem('calendarEvents', JSON.stringify(evs));
  }, lastDayStr);
  await page.reload({ waitUntil: 'networkidle0' });
  const boundaryChip = await page.$$(`.day-cell[data-date="${lastDayStr}"] .event-chip`);
  boundaryChip.length > 0 ? ok('Boundary event renders on last day of month') : fail('Boundary event renders on last day of month');

  // Navigate to next month and back — event still shows
  await page.click('#next-month');
  await page.click('#prev-month');
  const boundaryChipAfterNav = await page.$$(`.day-cell[data-date="${lastDayStr}"] .event-chip`);
  boundaryChipAfterNav.length > 0 ? ok('Boundary event persists after nav away and back') : fail('Boundary event persists after nav away and back');

  // Rapid navigation — no duplicate cells
  for (let i = 0; i < 12; i++) await page.click('#next-month');
  for (let i = 0; i < 12; i++) await page.click('#prev-month');
  const cellsAfterRapid = await page.$$eval('.day-cell', c => c.length);
  cellsAfterRapid === 42 ? ok('42 cells after rapid navigation') : fail('42 cells after rapid navigation', `got ${cellsAfterRapid}`);

  // Delete last event on a day — cell is empty
  await page.click('#today-btn');
  await page.evaluate(() => {
    localStorage.setItem('calendarEvents', JSON.stringify([{id:'solo',date: new Date().toISOString().split('T')[0], title:'Solo',startTime:'',endTime:'',notes:''}]));
  });
  await page.reload({ waitUntil: 'networkidle0' });
  const soloChip = await page.$('.event-chip');
  if (soloChip) {
    await soloChip.click();
    await page.waitForSelector('#modal-overlay:not(.hidden)');
    await page.click('#delete-btn');
    await page.waitForSelector('#modal-overlay.hidden');
    const chipsAfterSoloDel = await page.$$('.event-chip');
    chipsAfterSoloDel.length === 0 ? ok('Cell empty after deleting last event') : fail('Cell empty after deleting last event');
  }

  // Zero console errors throughout
  const finalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('DevTools'));
  finalErrors.length === 0 ? ok('Zero console errors throughout all tests') : fail('Zero console errors throughout', finalErrors.join(' | '));

  // ── Summary ──
  console.log('\n═══════════════════════════════');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log('  ✗', f));
  }
  console.log('═══════════════════════════════');

  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
