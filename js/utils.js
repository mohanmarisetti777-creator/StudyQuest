(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};

  // Not frozen on purpose: the timer reads durations at reset time, so testers can shorten them.
  const Constants = {
    STORAGE_KEY: 'studyquest.v1',
    BACKUP_KEY: 'studyquest.v1.backup',
    FOCUS_MINUTES: 25,
    BREAK_MINUTES: 5,
    SUBJECT_NAME_MAX: 40,
    TASK_TITLE_MAX: 100,
    DEFAULT_SUBJECT_COLOR: '#4f46e5',
    PRIORITIES: ['low', 'medium', 'high']
  };

  const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
  const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
  const DAYS_IN_WEEK = 7;
  let idCounter = 0;

  function pad2(number) {
    return String(number).padStart(2, '0');
  }

  /** Returns a unique id string. */
  function generateId() {
    const cryptoApi = window.crypto;
    if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
      return cryptoApi.randomUUID();
    }
    idCounter += 1;
    return Date.now().toString(36) + '-' + idCounter.toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /** Returns the current time as an ISO timestamp. */
  function nowISO() {
    return new Date().toISOString();
  }

  /** Returns the local YYYY-MM-DD key of a Date. */
  function toDateKey(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  /** Returns today's local date key. */
  function todayKey() {
    return toDateKey(new Date());
  }

  /** Returns the local date key of an ISO timestamp. */
  function timestampToDateKey(iso) {
    return toDateKey(new Date(iso));
  }

  /** Builds a Date at local midnight from a date key (never parses the string as UTC). */
  function parseDateKey(key) {
    const parts = key.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  /** True only for real calendar dates written as YYYY-MM-DD. */
  function isValidDateKey(value) {
    if (typeof value !== 'string' || !DATE_KEY_PATTERN.test(value)) {
      return false;
    }
    // Round trip catches impossible dates such as 2026-02-30.
    return toDateKey(parseDateKey(value)) === value;
  }

  /** True for #rrggbb colors. */
  function isValidHexColor(value) {
    return typeof value === 'string' && HEX_COLOR_PATTERN.test(value);
  }

  /** Returns the Monday-Sunday range containing the date key. */
  function getWeekRange(dateKey) {
    const date = parseDateKey(dateKey);
    // getDay() is 0 for Sunday; shift so Monday is 0. Built from parts so month/year rollover and DST are safe.
    const daysSinceMonday = (date.getDay() + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysSinceMonday);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + DAYS_IN_WEEK - 1);
    return { start: toDateKey(start), end: toDateKey(end) };
  }

  /** Formats a date key like "Thu, 5 Nov". */
  function formatDateLabel(dateKey) {
    return parseDateKey(dateKey).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  root.Constants = Constants;
  root.Utils = {
    generateId,
    nowISO,
    toDateKey,
    todayKey,
    timestampToDateKey,
    parseDateKey,
    isValidDateKey,
    isValidHexColor,
    getWeekRange,
    formatDateLabel
  };
})();
