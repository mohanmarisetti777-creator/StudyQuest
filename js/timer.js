(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};
  const { Constants, Utils, UI, Storage, Progress } = root;

  const TICK_MS = 250;
  const MS_PER_MINUTE = 60000;
  const MS_PER_SECOND = 1000;
  const SECONDS_PER_MINUTE = 60;
  const PERCENT_SCALE = 100;
  const MODES = { focus: 'focus', break: 'break' };
  const MSG = {
    focusDone: 'Focus session complete. Time for a 5-minute break.',
    breakDone: 'Break over. Ready for the next focus session.'
  };

  let onSessionComplete = function () {};
  let mode = MODES.focus;
  let status = 'idle';
  let remainingMs = 0;
  let endTimestamp = 0;
  let intervalId = null;
  let statusText = '';

  // Durations are read from Constants every time so they can be changed from the console.
  function durationMs(forMode) {
    const minutes = forMode === MODES.focus ? Constants.FOCUS_MINUTES : Constants.BREAK_MINUTES;
    return minutes * MS_PER_MINUTE;
  }

  function currentRemainingMs() {
    return status === 'running' ? Math.max(0, endTimestamp - Date.now()) : remainingMs;
  }

  function formatTime(ms) {
    const totalSeconds = Math.ceil(ms / MS_PER_SECOND);
    const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }

  // Presentation only: share of the current mode's duration that has elapsed.
  function renderElapsed() {
    const total = durationMs(mode);
    const elapsed = total > 0 ? Math.round((1 - currentRemainingMs() / total) * PERCENT_SCALE) : 0;
    const percent = Math.min(PERCENT_SCALE, Math.max(0, elapsed));
    const bar = UI.byId('timer-progress');
    bar.setAttribute('aria-valuenow', String(percent));
    bar.firstElementChild.style.width = percent + '%';
  }

  /** Refreshes the display, buttons and sessions-today text; safe to call at any time. */
  function render() {
    const labels = { idle: 'Start', running: 'Pause', paused: 'Resume' };
    UI.byId('timer-display').textContent = formatTime(currentRemainingMs());
    renderElapsed();
    UI.byId('timer-toggle').textContent = labels[status];
    UI.byId('timer-status').textContent = statusText;
    [MODES.focus, MODES.break].forEach((name) => {
      const button = UI.byId('timer-mode-' + name);
      button.disabled = status === 'running';
      button.setAttribute('aria-pressed', String(mode === name));
    });
    const today = Utils.todayKey();
    const count = Progress.countSessions(Storage.getState().sessions, today, today);
    UI.byId('timer-sessions-today').textContent = 'Sessions today: ' + count;
  }

  function stopInterval() {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  }

  function resetToMode(nextMode) {
    stopInterval();
    mode = nextMode;
    status = 'idle';
    remainingMs = durationMs(mode);
  }

  function recordSession() {
    const session = { id: Utils.generateId(), minutes: Constants.FOCUS_MINUTES, completedAt: new Date(endTimestamp).toISOString() };
    Storage.getState().sessions.push(session);
    return Storage.save();
  }

  function complete() {
    const wasFocus = mode === MODES.focus;
    const saved = wasFocus ? recordSession() : true;
    resetToMode(wasFocus ? MODES.break : MODES.focus);
    statusText = wasFocus ? MSG.focusDone : MSG.breakDone;
    render();
    if (wasFocus) {
      onSessionComplete({ saved });
    }
  }

  function tick() {
    if (endTimestamp - Date.now() <= 0) {
      complete();
      return;
    }
    render();
  }

  function start() {
    status = 'running';
    statusText = '';
    endTimestamp = Date.now() + remainingMs;
    stopInterval();
    intervalId = window.setInterval(tick, TICK_MS);
    render();
  }

  function pause() {
    remainingMs = currentRemainingMs();
    stopInterval();
    status = 'paused';
    render();
  }

  function handleToggle() {
    if (status === 'running') {
      pause();
    } else {
      start();
    }
  }

  function handleReset() {
    resetToMode(mode);
    statusText = '';
    render();
  }

  function handleMode(nextMode) {
    if (status === 'running') {
      return;
    }
    resetToMode(nextMode);
    statusText = '';
    render();
  }

  /** Binds timer buttons and renders the initial display. */
  function init(options) {
    onSessionComplete = options.onSessionComplete;
    UI.byId('timer-toggle').addEventListener('click', handleToggle);
    UI.byId('timer-reset').addEventListener('click', handleReset);
    UI.byId('timer-mode-focus').addEventListener('click', () => handleMode(MODES.focus));
    UI.byId('timer-mode-break').addEventListener('click', () => handleMode(MODES.break));
    resetToMode(MODES.focus);
    render();
  }

  root.Timer = { init, render };
})();
