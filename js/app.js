(function () {
  'use strict';

  // ===== Constants =====
  const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];

  const DEFAULT_COLOR = '#7C3AED';

  // Seed events for March 2026 (shown when localStorage is empty)
  const SEED_EVENTS = [
    { id: 'seed-1', date: '2026-03-02', title: 'Team standup', startTime: '09:00', endTime: '09:15', notes: '', color: '#7C3AED' },
    { id: 'seed-2', date: '2026-03-04', title: 'Design review', startTime: '14:00', endTime: '15:00', notes: 'Q1 dashboard designs', color: '#0EA5E9' },
    { id: 'seed-3', date: '2026-03-09', title: 'Investor call', startTime: '11:00', endTime: '12:00', notes: '', color: '#EF4444' },
    { id: 'seed-4', date: '2026-03-11', title: 'Sprint planning', startTime: '10:00', endTime: '11:30', notes: '', color: '#7C3AED' },
    { id: 'seed-5', date: '2026-03-13', title: 'Product demo', startTime: '16:00', endTime: '17:00', notes: 'External stakeholders', color: '#10B981' },
    { id: 'seed-6', date: '2026-03-16', title: 'All-hands meeting', startTime: '12:00', endTime: '13:00', notes: '', color: '#F59E0B' },
    { id: 'seed-7', date: '2026-03-18', title: 'UX workshop', startTime: '09:30', endTime: '12:30', notes: '', color: '#0EA5E9' },
    { id: 'seed-8', date: '2026-03-23', title: 'Board sync', startTime: '15:00', endTime: '16:00', notes: '', color: '#EF4444' },
    { id: 'seed-9', date: '2026-03-25', title: 'Retrospective', startTime: '14:00', endTime: '15:00', notes: '', color: '#7C3AED' },
    { id: 'seed-10', date: '2026-03-28', title: 'Quarterly review', startTime: '10:00', endTime: '12:00', notes: 'Prep slides beforehand', color: '#10B981' },
  ];

  // ===== State =====
  const state = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-indexed
    events: [],
    editingEventId: null,
    selectedColor: DEFAULT_COLOR,
    lastFocusedElement: null,
  };

  // ===== DOM References =====
  const $ = (id) => document.getElementById(id);

  const monthLabel    = $('current-month-label');
  const monthBadge    = $('month-badge');
  const dateRangeLabel= $('date-range-label');
  const calendarGrid  = $('calendar-grid');
  const prevBtn       = $('prev-month');
  const nextBtn       = $('next-month');
  const todayBtn      = $('today-btn');
  const addEventBtn   = $('add-event-btn');
  const overlay       = $('modal-overlay');
  const modalEl       = $('modal');
  const modalTitle    = $('modal-title');
  const modalClose    = $('modal-close');
  const eventForm     = $('event-form');
  const titleInput    = $('event-title');
  const dateInput     = $('event-date');
  const startInput    = $('event-start');
  const endInput      = $('event-end');
  const notesInput    = $('event-notes');
  const formErrors    = $('form-errors');
  const saveBtn       = $('save-btn');
  const deleteBtn     = $('delete-btn');
  const colorPicker   = $('color-picker');

  // ===== localStorage =====
  const LS_KEY = 'calendarEvents';

  function loadEvents() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw === null) {
        // First visit — inject seed data
        state.events = SEED_EVENTS.map((e) => Object.assign({}, e));
        saveEvents();
      } else {
        state.events = JSON.parse(raw);
        if (!Array.isArray(state.events)) state.events = [];
      }
    } catch {
      state.events = [];
    }
  }

  function saveEvents() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state.events));
    } catch {
      // Storage quota or security error — silently ignore
    }
  }

  // ===== Date Utilities =====

  // Returns "YYYY-MM-DD" in local time
  function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function todayString() {
    return toDateString(new Date());
  }

  // Formats "HH:MM" → "9:30 AM"
  function formatTime(t) {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${mStr} ${ampm}`;
  }

  // Generates the date-range label, e.g. "Mar 1 – Mar 31, 2026"
  function formatDateRange(year, month) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const fmt = (d) => d.toLocaleString('default', { month: 'short', day: 'numeric' });
    return `${fmt(first)} – ${fmt(last)}, ${year}`;
  }

  // Monday-first: generates a 6×7 matrix of date objects
  // Week starts on Monday (1), so offset 0 = Mon, 6 = Sun
  function getMonthMatrix(year, month) {
    const firstDay = new Date(year, month, 1);
    // getDay() returns 0=Sun…6=Sat; convert to Mon-first (0=Mon…6=Sun)
    const dayOfWeek = (firstDay.getDay() + 6) % 7; // Mon=0, Sun=6
    const matrix = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(year, month, 1 - dayOfWeek + i);
      matrix.push(date);
    }
    return matrix;
  }

  // ===== Validation =====
  function validateForm(fields) {
    const errors = [];
    if (!fields.title.trim()) {
      errors.push('Event title is required.');
    }
    if (!fields.date) {
      errors.push('A valid date is required.');
    }
    if (fields.startTime && fields.endTime && fields.endTime < fields.startTime) {
      errors.push('End time must be equal to or later than start time.');
    }
    return errors;
  }

  // ===== Color Picker =====
  function setSelectedColor(color) {
    state.selectedColor = color;
    const swatches = colorPicker.querySelectorAll('.color-swatch');
    swatches.forEach((s) => {
      if (s.dataset.color === color) {
        s.classList.add('selected');
        s.style.setProperty('--swatch-color', color);
        s.setAttribute('aria-pressed', 'true');
      } else {
        s.classList.remove('selected');
        s.setAttribute('aria-pressed', 'false');
      }
    });
  }

  function initColorPicker() {
    const swatches = colorPicker.querySelectorAll('.color-swatch');
    swatches.forEach((s) => {
      s.addEventListener('click', () => setSelectedColor(s.dataset.color));
      s.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setSelectedColor(s.dataset.color);
        }
      });
    });
    setSelectedColor(DEFAULT_COLOR);
  }

  // ===== Render =====
  function renderCalendar() {
    const month = state.currentMonth;
    const year = state.currentYear;

    // Update labels
    monthLabel.textContent = `${MONTHS[month]} ${year}`;
    monthBadge.textContent = MONTHS[month].slice(0, 3).toUpperCase();
    dateRangeLabel.textContent = formatDateRange(year, month);
    calendarGrid.setAttribute('aria-label', `Calendar, ${MONTHS[month]} ${year}`);

    renderGrid();
  }

  function renderGrid() {
    calendarGrid.innerHTML = '';
    const matrix = getMonthMatrix(state.currentYear, state.currentMonth);
    const today = todayString();

    matrix.forEach((date) => {
      const dateStr = toDateString(date);
      const isCurrentMonth = date.getMonth() === state.currentMonth;
      const isToday = dateStr === today;

      // Cell
      const cell = document.createElement('div');
      cell.className = 'day-cell';
      cell.dataset.date = dateStr;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('tabindex', '0');
      if (!isCurrentMonth) cell.classList.add('other-month');
      if (isToday) cell.classList.add('today');

      // Day number
      const dayNum = document.createElement('span');
      dayNum.className = 'day-number';
      dayNum.textContent = date.getDate();
      cell.appendChild(dayNum);

      // Events for this day, sorted by startTime
      const dayEvents = state.events
        .filter((e) => e.date === dateStr)
        .sort((a, b) => {
          if (!a.startTime) return 1;
          if (!b.startTime) return -1;
          return a.startTime < b.startTime ? -1 : 1;
        });

      const eventsList = document.createElement('div');
      eventsList.className = 'events-list';

      const maxVisible = 3;
      dayEvents.slice(0, maxVisible).forEach((ev) => {
        const chip = document.createElement('div');
        chip.className = 'event-chip';
        chip.tabIndex = 0;

        // Colored dot
        const dot = document.createElement('span');
        dot.className = 'event-dot';
        dot.style.background = ev.color || DEFAULT_COLOR;
        chip.appendChild(dot);

        // Title
        const titleSpan = document.createElement('span');
        titleSpan.className = 'event-chip-title';
        titleSpan.textContent = ev.title;
        chip.appendChild(titleSpan);

        // Time (if present)
        if (ev.startTime) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'event-chip-time';
          timeSpan.textContent = formatTime(ev.startTime);
          chip.appendChild(timeSpan);
        }

        chip.title = ev.title + (ev.startTime ? ` · ${formatTime(ev.startTime)}` : '');

        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditModal(ev.id);
        });
        chip.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            openEditModal(ev.id);
          }
        });

        eventsList.appendChild(chip);
      });

      if (dayEvents.length > maxVisible) {
        const more = document.createElement('button');
        more.type = 'button';
        more.className = 'more-events';
        more.textContent = `+ ${dayEvents.length - maxVisible} more`;
        more.setAttribute('aria-label', `${dayEvents.length - maxVisible} more events on ${date.toLocaleDateString('default', { month: 'long', day: 'numeric' })}`);
        more.addEventListener('click', (e) => e.stopPropagation());
        more.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
        });
        eventsList.appendChild(more);
      }

      cell.appendChild(eventsList);

      const cellLabel = date.toLocaleDateString('default', { month: 'long', day: 'numeric', year: 'numeric' });
      cell.setAttribute('aria-label', cellLabel);

      cell.addEventListener('click', () => openAddModal(dateStr));
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openAddModal(dateStr);
        }
      });
      calendarGrid.appendChild(cell);
    });
  }

  // ===== Modal =====
  function playModalAnimation() {
    modalEl.classList.remove('animate');
    void modalEl.offsetWidth; // force reflow
    modalEl.classList.add('animate');
  }

  function clearErrors() {
    formErrors.textContent = '';
    formErrors.classList.remove('has-errors');
  }

  function showErrors(errors) {
    formErrors.innerHTML = errors.join('<br>');
    formErrors.classList.add('has-errors');
  }

  function openAddModal(dateStr) {
    state.editingEventId = null;
    state.lastFocusedElement = document.activeElement;
    modalTitle.textContent = 'Add Event';
    eventForm.reset();
    dateInput.value = dateStr;
    setSelectedColor(DEFAULT_COLOR);
    deleteBtn.classList.add('hidden');
    clearErrors();
    overlay.classList.remove('hidden');
    playModalAnimation();
    titleInput.focus();
  }

  function openEditModal(eventId) {
    const ev = state.events.find((e) => e.id === eventId);
    if (!ev) return;

    state.editingEventId = eventId;
    state.lastFocusedElement = document.activeElement;
    modalTitle.textContent = 'Edit Event';
    titleInput.value = ev.title;
    dateInput.value = ev.date;
    startInput.value = ev.startTime || '';
    endInput.value = ev.endTime || '';
    notesInput.value = ev.notes || '';
    setSelectedColor(ev.color || DEFAULT_COLOR);
    deleteBtn.classList.remove('hidden');
    clearErrors();
    overlay.classList.remove('hidden');
    playModalAnimation();
    titleInput.focus();
  }

  function closeModal() {
    overlay.classList.add('hidden');
    state.editingEventId = null;
    eventForm.reset();
    clearErrors();
    if (state.lastFocusedElement) {
      state.lastFocusedElement.focus();
      state.lastFocusedElement = null;
    }
  }

  // ===== Event Handlers =====
  function handleFormSubmit(e) {
    e.preventDefault();

    const fields = {
      title: titleInput.value,
      date: dateInput.value,
      startTime: startInput.value,
      endTime: endInput.value,
      notes: notesInput.value,
      color: state.selectedColor,
    };

    const errors = validateForm(fields);
    if (errors.length) {
      showErrors(errors);
      return;
    }

    if (state.editingEventId === null) {
      // Create new event
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      state.events.push({
        id,
        date: fields.date,
        title: fields.title.trim(),
        startTime: fields.startTime,
        endTime: fields.endTime,
        notes: fields.notes.trim(),
        color: fields.color,
      });
    } else {
      // Update existing event
      const ev = state.events.find((e) => e.id === state.editingEventId);
      if (ev) {
        ev.title = fields.title.trim();
        ev.date = fields.date;
        ev.startTime = fields.startTime;
        ev.endTime = fields.endTime;
        ev.notes = fields.notes.trim();
        ev.color = fields.color;
      }
    }

    saveEvents();
    closeModal();
    renderGrid();
  }

  function handleDeleteEvent() {
    if (!state.editingEventId) return;
    state.events = state.events.filter((e) => e.id !== state.editingEventId);
    saveEvents();
    closeModal();
    renderGrid();
  }

  function handlePrevMonth() {
    state.currentMonth -= 1;
    if (state.currentMonth < 0) {
      state.currentMonth = 11;
      state.currentYear -= 1;
    }
    renderCalendar();
  }

  function handleNextMonth() {
    state.currentMonth += 1;
    if (state.currentMonth > 11) {
      state.currentMonth = 0;
      state.currentYear += 1;
    }
    renderCalendar();
  }

  function handleTodayBtn() {
    const now = new Date();
    state.currentYear = now.getFullYear();
    state.currentMonth = now.getMonth();
    renderCalendar();
  }

  // ===== Init =====
  function init() {
    loadEvents();
    initColorPicker();

    prevBtn.addEventListener('click', handlePrevMonth);
    nextBtn.addEventListener('click', handleNextMonth);
    todayBtn.addEventListener('click', handleTodayBtn);
    modalClose.addEventListener('click', closeModal);
    eventForm.addEventListener('submit', handleFormSubmit);
    deleteBtn.addEventListener('click', handleDeleteEvent);

    // "Add event" button in subheader — open modal for today's date
    addEventBtn.addEventListener('click', () => {
      openAddModal(todayString());
    });

    // Tab switching (UI only — no filtering logic needed for this milestone)
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach((t) => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
      });
    });

    // Close on overlay background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Close on Escape key + focus trap
    document.addEventListener('keydown', (e) => {
      if (overlay.classList.contains('hidden')) return;

      if (e.key === 'Escape') {
        closeModal();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = Array.from(modalEl.querySelectorAll(
          'button:not([disabled]):not(.hidden), input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
        )).filter((el) => el.offsetParent !== null);

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    });

    renderCalendar();
  }

  init();
})();
