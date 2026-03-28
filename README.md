# Calendar App

A lightweight, browser-based calendar app built with vanilla HTML, CSS, and JavaScript — no frameworks required.

## Features

- Monthly calendar view with navigation (previous/next month)
- **Today** button to jump back to the current month
- Click any day to add a new event
- Click an existing event to edit or delete it
- Event details: title, date, start/end time, and optional notes
- Events persist across sessions using `localStorage`
- Up to 3 events shown per day, with a "+N more" indicator for overflow
- Keyboard accessible (Enter/Space to open events, Escape to close modal)

## Getting Started

No build step needed. Just open `index.html` in any modern browser.

```bash
# Clone the repo
git clone https://github.com/designerdawnng-web/calendar-app.git
cd calendar-app

# Open in browser
open index.html
```

## Project Structure

```
calendar-app/
├── index.html        # App markup and modal
├── css/
│   └── styles.css    # All styles
├── js/
│   └── app.js        # Calendar logic, event handling, localStorage
├── test.js           # Tests
└── package.json
```

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript (ES6+)
- `localStorage` for data persistence
