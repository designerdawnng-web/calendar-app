# Calendar App — Task Checklist

## How to use
Check each box as you complete the task. All acceptance criteria must pass before the box is checked.

---

## Task 1 — Project Scaffold
- [x] Create index.html with doctype, charset, viewport meta, CSS/JS links
- [x] Create css/styles.css with CSS reset and custom property definitions
- [x] Create js/app.js with IIFE wrapper and smoke test
- [x] Open index.html in browser — no console errors

**Acceptance criteria:**
- [x] Page loads without console errors or 404s
- [x] All three files linked and loading (verify in Network tab)
- [x] CSS custom properties visible in DevTools :root

---

## Task 2 — Calendar Header & Navigation
- [x] Render month/year label in #current-month-label
- [x] Implement handlePrevMonth, handleNextMonth, handleTodayBtn
- [x] Attach click listeners to #prev-month, #next-month, #today-btn

**Acceptance criteria:**
- [x] Clicking ‹ decrements the displayed month; rolls Dec→Nov across years
- [x] Clicking › increments the displayed month; rolls Dec→Jan across years
- [x] Clicking Today resets view to the current real-world month and year
- [x] Month label always shows the correct month name and year

---

## Task 3 — Calendar Grid Rendering
- [x] Implement getMonthMatrix(year, month) returning a 6×7 date matrix
- [x] Implement renderGrid() that creates .day-cell elements and appends to #calendar-grid
- [x] Apply .today class to today's date cell
- [x] Apply .other-month class to cells outside the current month

**Acceptance criteria:**
- [x] Grid always shows exactly 42 cells (6 rows × 7 columns)
- [x] First column is always Sunday
- [x] The 1st of the month falls in the correct weekday column
- [x] Today's date cell is visually distinct
- [x] Days from prior/next month are visually muted
- [x] Navigating months updates the grid correctly with no leftover cells

---

## Task 4 — localStorage Persistence
- [x] Implement loadEvents() reading from localStorage key "calendarEvents"
- [x] Implement saveEvents() writing state.events as JSON
- [x] Call loadEvents() inside init() before first render
- [x] Wrap both functions in try/catch with fallback to empty array

**Acceptance criteria:**
- [x] Events survive a full page refresh
- [x] Corrupt/missing localStorage data does not throw — app loads with empty events
- [x] After adding an event, DevTools Application tab shows correct JSON
- [x] Deleting an event removes it from localStorage immediately

---

## Task 5 — Add Event Modal
- [x] Build modal HTML (overlay, form, all fields, error container, action buttons)
- [x] Implement openAddModal(dateStr) — pre-fills date, resets other fields
- [x] Implement closeModal() — hides overlay, resets form, clears editingEventId
- [x] Clicking a day cell opens the modal with that date pre-filled
- [x] Clicking outside the modal (overlay) closes it
- [x] Pressing Escape closes the modal

**Acceptance criteria:**
- [x] Modal appears centered on screen when a day cell is clicked
- [x] #event-date field shows the clicked cell's date and is read-only
- [x] All other fields are empty/reset when opening for a new event
- [x] Clicking the overlay background dismisses the modal without saving
- [x] Escape key dismisses the modal without saving
- [x] ✕ button dismisses the modal without saving
- [x] Focus is placed on #event-title when modal opens

---

## Task 6 — Save & Display Events
- [x] Implement handleFormSubmit — reads form, creates event object, pushes to state.events
- [x] Call saveEvents() and renderGrid() after successful save
- [x] Render .event-chip elements inside .day-cell for matching events
- [x] Sort chips by startTime within each cell
- [x] Show "+N more" indicator when a cell has more than 3 events

**Acceptance criteria:**
- [x] Saving a new event immediately shows a chip on the correct date cell
- [x] Event chip displays the title (and start time if provided)
- [x] Events are sorted earliest-first within a day
- [x] Cells with 4+ events show the first 3 chips plus a "+N more" label
- [x] Event persists after page reload

---

## Task 7 — Edit & Delete Events
- [x] Clicking an event chip opens the modal in edit mode (fields pre-populated)
- [x] Implement openEditModal(eventId) — sets state.editingEventId
- [x] handleFormSubmit updates existing event when editingEventId is set
- [x] Show #delete-btn only in edit mode
- [x] Implement handleDeleteEvent — removes event, saves, re-renders

**Acceptance criteria:**
- [x] Clicking a chip opens the modal with all fields populated from that event
- [x] Modal title reads "Edit Event" (not "Add Event")
- [x] Saving edits updates the chip in-place with new data
- [x] Delete button is hidden when creating a new event
- [x] Clicking Delete removes the event from the grid and localStorage immediately
- [x] After deletion the modal closes automatically

---

## Task 8 — Form Validation
- [x] Implement validateForm(fields) returning array of error strings
- [x] Rule: title is required
- [x] Rule: if both times provided, endTime >= startTime
- [x] Rule: date must be present
- [x] Display errors in #form-errors; clear on next modal open

**Acceptance criteria:**
- [x] Submitting with empty title shows "Event title is required." and does not save
- [x] Submitting with end time before start time shows time validation error and does not save
- [x] Multiple errors can appear simultaneously
- [x] Fixing errors and resubmitting succeeds without stale error messages
- [x] Valid form with only a title (no times) saves without error

---

## Task 9 — Responsive UI & Polish
- [x] Implement mobile breakpoint styles at max-width: 640px
- [x] Reduce cell min-height on small screens
- [x] Ensure modal width uses min(480px, 92vw)
- [x] Add hover/focus styles to all interactive elements

**Acceptance criteria:**
- [x] App is usable on a 375px wide viewport (iPhone SE size)
- [x] No horizontal scrollbar appears at any viewport width above 320px
- [x] Modal does not overflow the screen on mobile
- [x] All buttons and chips have visible hover and focus states
- [x] Tab key can reach every form field and both action buttons
- [x] Pointer cursor on all clickable elements

---

## Task 10 — Final QA Pass
- [x] Test adding events across month boundaries
- [x] Test editing an event and verifying changes persist after reload
- [x] Test deleting the only event on a day — cell reverts to empty cleanly
- [x] Check browser console for errors during all operations

**Acceptance criteria:**
- [x] Zero console errors during normal use
- [x] All localStorage operations fail gracefully (no unhandled exceptions)
- [x] Events on boundary dates (1st, last day of month) render in the correct cell
- [x] Rapid prev/next navigation produces no duplicate or missing cells
- [x] App works correctly in latest Chrome, Firefox, and Edge

---

## Task 11 — Redesign: New "Untitled UI" Layout
Plan for rewriting all three files to match the specified design.

### Sub-tasks
- [x] 11a. Rewrite index.html — full app card layout with sidebar, main content, calendar panel, and updated modal with color picker
- [x] 11b. Rewrite css/styles.css — scenic gradient body, white app card, sidebar styles, breadcrumb, page header, tabs, calendar subheader, weekday labels, day cells, event items, modal color picker
- [x] 11c. Rewrite js/app.js — Monday-first week, color+dot event fields, selectedColor state, updated DOM refs, new event chip rendering (dot + title + time), March 2026 seed data, "+ Add event" button handler

**Acceptance criteria:**
- [x] Body shows purple→blue→orange sunset gradient
- [x] App is contained in a centered white card (max 1200px, capped 860px height, border-radius 16px, large shadow)
- [x] Sidebar shows logo, all nav sections with icons, badges, team icons, user profile
- [x] Active "Calendar" nav item is highlighted
- [x] Breadcrumb bar: home icon › Untitled UI › Calendar
- [x] Page header shows "Calendar" h1 and search bar with ⌘K
- [x] Tabs row: All events | Shared | Public | Archived
- [x] Calendar subheader: month badge, month name, date range, search icon, ← Today → Month view ▼ + Add event
- [x] Weekday labels start Monday (Mon Tue Wed Thu Fri Sat Sun)
- [x] Calendar grid starts on Monday
- [x] Event items render as flex row: optional dot, title (truncated), time (gray)
- [x] Today's day number shown in black circle (white text)
- [x] "+ N more..." shown in muted gray for overflow events
- [x] Color picker in modal: 5 colored swatches, selected swatch highlighted
- [x] March 2026 seed events present when localStorage is empty
- [x] All existing functionality preserved (add/edit/delete, localStorage, validation, keyboard nav)

---

---

## Task 12 — Accessibility (a11y) Fixes

### Critical fixes
- [x] 12a. Replace `<div id="main-content">` with `<main id="main-content">` for landmark navigation
- [x] 12b. Add focus trap to modal (Tab/Shift+Tab cycle within focusable modal elements; restore focus on close)
- [x] 12c. Add `tabindex="0"` + `role="gridcell"` + Enter/Space keyboard handler to `.day-cell` elements
- [x] 12d. Convert `.more-events` span to `<button>` with keyboard support

### Serious fixes
- [x] 12e. Add `aria-pressed` to color swatches and update it when selection changes
- [x] 12f. Add `aria-required="true"` to `#event-title` input
- [x] 12g. Rewrite breadcrumb as `<ol>`/`<li>` list with `.sr-only` "Home" label
- [x] 12h. Add `aria-label` to `#calendar-grid`, updated dynamically per month
- [x] 12i. Convert `.team-item` divs to `<button>` elements for keyboard accessibility

### Moderate fixes
- [x] 12j. Fix search input focus: `:focus-within` ring on container instead of bare `outline: none`
- [x] 12k. Raise placeholder color from `#98A2B3` to `#667085` (~4.6:1 contrast)
- [x] 12l. Raise other-month day number color from `#D0D5DD` to `#98A2B3`
- [x] 12m. Add `:focus-visible` styles to `.nav-item`, `.user-logout`, `#cal-search-btn`, `#view-btn`

---

## Review — Task 12 (Accessibility)

13 fixes across 3 files:

**index.html:** `<div#main-content>` → `<main>`, breadcrumb rewritten as `<ol>`/`<li>` with `.sr-only` "Home" text, `aria-required="true"` on title input, `aria-pressed` on color swatches, team items converted from `<div>` to `<button>`, `role="region"` + `aria-label` on calendar panel, `role="grid"` on calendar grid.

**css/styles.css:** `.sr-only` utility class added, breadcrumb layout updated for `<ol>`/`<li>`, `.team-item` button reset (no border/background, full width), `.more-events` button reset, `day-cell:focus-visible` ring (inset), `#page-search:focus-within` ring replaces bare `outline: none`, placeholder color raised to `#667085`, other-month text raised to `#98A2B3`, `:focus-visible` added to `.nav-item`, `.user-logout`, `#cal-search-btn`, `#view-btn`, `.team-item`.

**js/app.js:** `setSelectedColor` syncs `aria-pressed`, `renderCalendar` updates `calendarGrid` aria-label, day cells get `role="gridcell"` + `tabindex="0"` + Enter/Space handler + descriptive `aria-label`, `.more-events` is now a `<button>` with `aria-label`, modal saves/restores focus on open/close, Tab/Shift+Tab focus trap implemented inside modal.
