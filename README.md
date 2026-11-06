# StudyQuest

A single-page student study planner: subjects, tasks, daily/weekly progress and a Pomodoro focus timer, stored in the browser's LocalStorage.

## Run

Double-click `index.html`. No build step, server or dependencies (HTML5, CSS3, vanilla JS).

## Features

- Dashboard: today and this-week progress, focus time, overview, due and overdue list
- Subjects: add, edit, delete (deleting also removes its tasks, after confirmation)
- Tasks: add, edit, delete, complete, filter by subject and status, overdue badge
- Focus timer: 25-minute focus and 5-minute break, timestamp based
- Responsive layout (320px to desktop) and keyboard accessible

## Files

```
index.html          markup for all views
css/style.css       tokens, components, layout
js/utils.js         constants and date/id helpers (pure)
js/ui.js            DOM helpers, toast, confirm dialog
js/storage.js       LocalStorage load/save/recovery
js/progress.js      progress calculations (pure)
js/subjects.js      subject CRUD and list
js/tasks.js         task CRUD, filters, list
js/timer.js         Pomodoro timer
js/app.js           routing, dashboard, startup
```

## Data

Data lives under the LocalStorage key `studyquest.v1`. Unreadable data is copied to `studyquest.v1.backup` and the app starts empty. To reset: DevTools > Application > Local Storage > delete both keys.

## Known limitations

- Reloading the page mid-countdown resets the timer (completed sessions are kept).
- Two open tabs overwrite each other (last write wins).
- A task completed after its due date does not count toward that day's progress.
- `js/tasks.js` is about 350 lines, above the roughly 250-line guideline, because no extra files are allowed.
