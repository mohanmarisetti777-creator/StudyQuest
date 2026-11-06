(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};
  const { Constants, Utils } = root;

  const STATE_VERSION = 1;
  let state = createDefaultState();
  let storageAvailable = true;

  function createDefaultState() {
    return { version: STATE_VERSION, subjects: [], tasks: [], sessions: [] };
  }

  function isText(value) {
    return typeof value === 'string' && value !== '';
  }

  function isValidSubject(item) {
    return Boolean(item) && isText(item.id) && isText(item.createdAt) && Utils.isValidHexColor(item.color)
      && typeof item.name === 'string' && item.name.trim() !== '' && item.name.length <= Constants.SUBJECT_NAME_MAX;
  }

  function isValidTask(item, subjectIds) {
    if (!item || !isText(item.id) || !isText(item.createdAt) || !subjectIds.has(item.subjectId)) {
      return false;
    }
    const titleOk = typeof item.title === 'string' && item.title.trim() !== '' && item.title.length <= Constants.TASK_TITLE_MAX;
    const dueOk = item.dueDate === '' || Utils.isValidDateKey(item.dueDate);
    const completionOk = typeof item.completed === 'boolean' && (item.completed ? isText(item.completedAt) : item.completedAt === null);
    return titleOk && dueOk && completionOk && Constants.PRIORITIES.includes(item.priority);
  }

  // Fractional minutes are allowed so test runs with FOCUS_MINUTES = 0.1 survive a reload.
  function isValidSession(item) {
    return Boolean(item) && isText(item.id) && typeof item.minutes === 'number' && Number.isFinite(item.minutes)
      && item.minutes > 0 && isText(item.completedAt) && !Number.isNaN(Date.parse(item.completedAt));
  }

  /** Returns a sanitized state, or null when the parsed value has the wrong shape. */
  function sanitize(parsed) {
    if (!parsed || typeof parsed !== 'object' || parsed.version !== STATE_VERSION
      || !Array.isArray(parsed.subjects) || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.sessions)) {
      return null;
    }
    const subjects = parsed.subjects.filter(isValidSubject);
    const subjectIds = new Set(subjects.map((subject) => subject.id));
    const tasks = parsed.tasks.filter((task) => isValidTask(task, subjectIds));
    const sessions = parsed.sessions.filter(isValidSession);
    const dropped = (parsed.subjects.length - subjects.length) + (parsed.tasks.length - tasks.length)
      + (parsed.sessions.length - sessions.length);
    if (dropped > 0) {
      console.warn('StudyQuest: dropped ' + dropped + ' invalid stored item(s).');
    }
    return { version: STATE_VERSION, subjects, tasks, sessions };
  }

  function recover(raw) {
    state = createDefaultState();
    try {
      window.localStorage.setItem(Constants.BACKUP_KEY, raw);
      window.localStorage.setItem(Constants.STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('StudyQuest: could not write the backup.');
    }
    return 'recovered';
  }

  /** Loads and validates stored data; returns 'ok', 'recovered' or 'unavailable'. */
  function load() {
    state = createDefaultState();
    let raw = null;
    try {
      raw = window.localStorage.getItem(Constants.STORAGE_KEY);
    } catch (error) {
      storageAvailable = false;
      return 'unavailable';
    }
    storageAvailable = true;
    if (raw === null) {
      return 'ok';
    }
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return recover(raw);
    }
    const clean = sanitize(parsed);
    if (clean === null) {
      return recover(raw);
    }
    state = clean;
    return 'ok';
  }

  /** Returns the live in-memory state. */
  function getState() {
    return state;
  }

  /** Writes the state to LocalStorage; returns false on failure and never throws. */
  function save() {
    if (!storageAvailable) {
      // Already announced by the storage banner; running in memory only.
      return true;
    }
    try {
      window.localStorage.setItem(Constants.STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  root.Storage = { load, getState, save };
})();
