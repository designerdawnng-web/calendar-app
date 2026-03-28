(function () {
  'use strict';

  // ===== State =====
  const state = {
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-indexed
    events: [],
    editingEventId: null,
  };

  // ===== DOM References =====
  const $ = (id) => document.getElementById(id);
  const monthLabel   = $('current-month-label');
  const calendarGrid = $('calendar-grid');
  const prevBtn      = $('prev-month');
  const nextBtn      = $('next-month');
  const todayBtn     = $('today-btn');
  const overlay      = $('modal-overlay');
  const modalTitle   = $('modal-title');
  const modalClose   = $('modal-close');
  const eventForm    = $('event-form');
  const titleInput   = $('event-title');
  const dateInput    = $('event-date');
  const startInput   = $('event-start');
  const endInput     = $('event-end');
  const notesInput   = $('event-notes');
  const formErrors   = $('form-errors');
  const saveBtn      = $('save-btn');
  const deleteBtn    = $('delete-btn');
  const modal        = $('modal');

  // ===== localStorage =====
  const LS_KEY = 'calendarEvents';

  function loadEvents() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      state.events = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(state.events)) state.events = [];
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

  // Returns "YYYY-MM-DD" in local time (avoids UTC midnight offset issues)
  function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function todayString() {
    return toDateString(new Date());
  }

  // Returns month name + year, e.g. "March 2026"
  function formatMonthLabel(year, month) {
    return new Date(year, month, 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }

  // Formats "HH:MM" → "9:30 AM"
  function formatTime(t) {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr, 10);
    const m = mStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  // Generates a 6×7 matrix of date objects for the given month
  function getMonthMatrix(year, month) {
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 = Sunday
    const matrix = [];

    for (let i = 0; i < 42; i++) {
      const date = new Date(year, month, 1 - startOffset + i);
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

  // ===== Render =====
  function renderCalendar() {
    monthLabel.textContent = formatMonthLabel(state.currentYear, state.currentMonth);
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
      if (!isCurrentMonth) cell.classList.add('other-month');
      if (isToday) cell.classList.add('today');

      // Day number
      const dayNum = document.createElement('span');
      dayNum.className = 'day-number';
      dayNum.textContent = date.getDate();
      cell.appendChild(dayNum);

      // Events for this day
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
        chip.textContent = ev.startTime
          ? `${formatTime(ev.startTime)} ${ev.title}`
          : ev.title;
        chip.title = ev.title;

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
        const more = document.createElement('span');
        more.className = 'more-events';
        more.textContent = `+${dayEvents.length - maxVisible} more`;
        more.addEventListener('click', (e) => e.stopPropagation());
        eventsList.appendChild(more);
      }

      cell.appendChild(eventsList);

      cell.addEventListener('click', () => openAddModal(dateStr));

      calendarGrid.appendChild(cell);
    });
  }

  // ===== Modal =====
  function playModalAnimation() {
    modal.classList.remove('animate');
    // Force reflow so removing and re-adding the class triggers the animation
    void modal.offsetWidth;
    modal.classList.add('animate');
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
    modalTitle.textContent = 'Add Event';
    eventForm.reset();
    dateInput.value = dateStr;
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
    modalTitle.textContent = 'Edit Event';
    titleInput.value = ev.title;
    dateInput.value = ev.date;
    startInput.value = ev.startTime || '';
    endInput.value = ev.endTime || '';
    notesInput.value = ev.notes || '';
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

    prevBtn.addEventListener('click', handlePrevMonth);
    nextBtn.addEventListener('click', handleNextMonth);
    todayBtn.addEventListener('click', handleTodayBtn);
    modalClose.addEventListener('click', closeModal);
    eventForm.addEventListener('submit', handleFormSubmit);
    deleteBtn.addEventListener('click', handleDeleteEvent);

    // Close on overlay background click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlay.classList.contains('hidden')) {
        closeModal();
      }
    });

    renderCalendar();
  }

  init();
})();
