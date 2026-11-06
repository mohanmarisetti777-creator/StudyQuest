(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};
  const { Utils, UI, Storage, Progress, Subjects, Tasks, Timer } = root;

  const DUE_LIST_MAX = 5;
  const MINUTES_DECIMALS = 1;
  const VIEWS = ['dashboard', 'subjects', 'tasks', 'timer'];
  const DEFAULT_VIEW = 'dashboard';
  const MSG = {
    recovered: 'Saved data was unreadable and has been reset. A backup was kept.',
    saveFailed: 'Could not save data. Changes will be lost when you close this tab.'
  };

  function viewFromHash() {
    const name = window.location.hash.replace(/^#/, '');
    return VIEWS.includes(name) ? name : DEFAULT_VIEW;
  }

  /** Shows one view and marks its nav link as current. */
  function showView(name) {
    VIEWS.forEach((view) => { UI.byId('view-' + view).hidden = view !== name; });
    UI.byId('main-nav').querySelectorAll('a[data-view]').forEach((link) => {
      if (link.dataset.view === name) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function createProgressPanel(title, progress, emptyText, rangeLabel) {
    const children = [UI.el('h2', { className: 'section-label', text: title })];
    if (rangeLabel) {
      children.push(UI.el('p', { className: 'panel__meta', text: rangeLabel }));
    }
    if (progress.total === 0) {
      children.push(UI.el('p', { className: 'muted', text: emptyText }));
    } else {
      children.push(
        UI.el('div', { className: 'panel__row' }, [
          UI.el('p', { className: 'panel__figure', text: progress.done + ' / ' + progress.total + ' tasks done' }),
          UI.el('p', { className: 'panel__percent', text: progress.percent + '%' })
        ]),
        UI.createProgressBar(progress.percent, title + ' progress')
      );
    }
    return UI.el('section', { className: 'panel' }, children);
  }

  function formatMinutes(minutes) {
    return String(Number(minutes.toFixed(MINUTES_DECIMALS)));
  }

  function createFocusPanel(state, today, week) {
    const todayMinutes = Progress.getFocusMinutes(state.sessions, today, today);
    const weekMinutes = Progress.getFocusMinutes(state.sessions, week.start, week.end);
    return UI.el('section', { className: 'panel rule-list' }, [
      UI.el('h2', { className: 'section-label', text: 'Focus time' }),
      UI.el('p', { text: 'Today: ' + formatMinutes(todayMinutes) + ' min · This week: ' + formatMinutes(weekMinutes) + ' min' }),
      UI.el('p', { text: 'Sessions today: ' + Progress.countSessions(state.sessions, today, today) })
    ]);
  }

  function createOverviewPanel(state, today) {
    const overall = Progress.getOverallProgress(state.tasks);
    const overdue = state.tasks.filter((task) => Progress.isOverdue(task, today)).length;
    return UI.el('section', { className: 'panel rule-list' }, [
      UI.el('h2', { className: 'section-label', text: 'Overview' }),
      UI.el('p', { text: 'Subjects: ' + state.subjects.length }),
      UI.el('p', { text: 'Overall: ' + overall.done + '/' + overall.total + ' tasks done' }),
      UI.el('p', { text: 'Overdue: ' + overdue })
    ]);
  }

  function createDuePanel(state, today) {
    const children = [UI.el('h2', { className: 'section-label', text: 'Due today & overdue' })];
    if (state.subjects.length === 0) {
      children.push(
        UI.el('p', { text: 'Get started: create your first subject.' }),
        UI.el('a', { className: 'link', text: 'Go to Subjects', attrs: { href: '#subjects' } })
      );
      return UI.el('section', { className: 'panel' }, children);
    }
    const due = Progress.getDueTodayAndOverdue(state.tasks, today).slice(0, DUE_LIST_MAX);
    if (due.length === 0) {
      children.push(UI.el('p', { className: 'muted', text: 'Nothing due today.' }));
    } else {
      children.push(UI.el('ul', { className: 'list' }, due.map((task) => Tasks.createTaskRow(task, { showControls: false }))));
    }
    children.push(UI.el('a', { className: 'link', text: 'View all tasks', attrs: { href: '#tasks' } }));
    return UI.el('section', { className: 'panel' }, children);
  }

  function createStat(figure, label) {
    return UI.el('div', { className: 'stat' }, [
      UI.el('span', { className: 'stat__figure', text: String(figure) }),
      UI.el('span', { className: 'stat__label', text: label })
    ]);
  }

  function createIntro(state, today) {
    const dueToday = state.tasks.filter((task) => !task.completed && task.dueDate === today).length;
    const overdue = state.tasks.filter((task) => Progress.isOverdue(task, today)).length;
    const lede = state.subjects.length === 0
      ? 'Create a subject, then add the tasks you need to finish.'
      : dueToday + ' task(s) due today and ' + overdue + ' overdue.';
    const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return UI.el('div', { className: 'dashboard__intro' }, [
      UI.el('p', { className: 'dashboard__date', text: dateLabel }),
      UI.el('p', { className: 'dashboard__lede', text: lede })
    ]);
  }

  function createStats(state, today) {
    const overall = Progress.getOverallProgress(state.tasks);
    // With no tasks a percentage would be meaningless, so show a dash instead.
    const completion = overall.total === 0 ? '—' : overall.percent + '%';
    return UI.el('div', { className: 'stats' }, [
      createStat(overall.done, 'Tasks completed'),
      createStat(overall.total - overall.done, 'Tasks remaining'),
      createStat(completion, 'Completion'),
      createStat(Progress.countSessions(state.sessions, today, today), 'Focus sessions today')
    ]);
  }

  /** Rebuilds the dashboard from state. */
  function renderDashboard() {
    const state = Storage.getState();
    const today = Utils.todayKey();
    const weekly = Progress.getWeeklyProgress(state.tasks, today);
    const rangeLabel = Utils.formatDateLabel(weekly.start) + ' – ' + Utils.formatDateLabel(weekly.end);
    const progress = UI.el('div', { className: 'dashboard__progress' }, [
      createProgressPanel('Today', Progress.getDailyProgress(state.tasks, today), 'No tasks due today.'),
      createProgressPanel('This week', weekly, 'No tasks due this week.', rangeLabel)
    ]);
    UI.replaceContent(UI.byId('dashboard-content'), [
      createIntro(state, today),
      createStats(state, today),
      UI.el('div', { className: 'dashboard__main' }, [progress, createDuePanel(state, today)]),
      UI.el('div', { className: 'dashboard__side' }, [createFocusPanel(state, today, weekly), createOverviewPanel(state, today)])
    ]);
  }

  /** Rebuilds every view from state. */
  function renderAll() {
    renderDashboard();
    Subjects.render();
    Tasks.render();
    Timer.render();
  }

  function handleChange(info) {
    if (info && info.saved === false) {
      UI.showToast(MSG.saveFailed, 'error');
    }
    renderAll();
  }

  /** Loads data, wires modules, shows the current view. */
  function init() {
    const status = Storage.load();
    if (status === 'unavailable') {
      UI.byId('storage-warning').hidden = false;
    }
    Subjects.init({ onChange: handleChange });
    Tasks.init({ onChange: handleChange });
    Timer.init({ onSessionComplete: handleChange });
    window.addEventListener('hashchange', () => showView(viewFromHash()));
    showView(viewFromHash());
    renderAll();
    if (status === 'recovered') {
      UI.showToast(MSG.recovered, 'error');
    }
  }

  root.App = { init, renderAll, renderDashboard, showView };
  root.App.init();
})();
