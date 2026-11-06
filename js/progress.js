(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};
  const { Utils } = root;

  const PERCENT_SCALE = 100;

  function toPercent(done, total) {
    return total === 0 ? 0 : Math.round(done / total * PERCENT_SCALE);
  }

  function summarize(tasks) {
    const total = tasks.length;
    const done = tasks.filter((task) => task.completed === true).length;
    return { done, total, percent: toPercent(done, total) };
  }

  function inRange(key, startKey, endKey) {
    return key >= startKey && key <= endKey;
  }

  /** Progress of tasks due on todayKey. */
  function getDailyProgress(tasks, todayKey) {
    return summarize(tasks.filter((task) => task.dueDate === todayKey));
  }

  /** Progress of tasks due in the Monday-Sunday week containing todayKey. */
  function getWeeklyProgress(tasks, todayKey) {
    const range = Utils.getWeekRange(todayKey);
    const inWeek = tasks.filter((task) => task.dueDate !== '' && inRange(task.dueDate, range.start, range.end));
    return Object.assign(summarize(inWeek), { start: range.start, end: range.end });
  }

  /** Progress of all tasks. */
  function getOverallProgress(tasks) {
    return summarize(tasks);
  }

  /** Progress of one subject's tasks. */
  function getSubjectProgress(tasks, subjectId) {
    return summarize(tasks.filter((task) => task.subjectId === subjectId));
  }

  function sessionsInRange(sessions, startKey, endKey) {
    return sessions.filter((session) => inRange(Utils.timestampToDateKey(session.completedAt), startKey, endKey));
  }

  /** Sum of focus minutes for sessions completed (local date) within the range. */
  function getFocusMinutes(sessions, startKey, endKey) {
    return sessionsInRange(sessions, startKey, endKey).reduce((sum, session) => sum + session.minutes, 0);
  }

  /** Number of sessions completed (local date) within the range. */
  function countSessions(sessions, startKey, endKey) {
    return sessionsInRange(sessions, startKey, endKey).length;
  }

  /** True for an incomplete task whose due date is before today. */
  function isOverdue(task, todayKey) {
    return task.completed === false && task.dueDate !== '' && task.dueDate < todayKey;
  }

  /** Incomplete tasks due today or earlier, oldest due date first. */
  function getDueTodayAndOverdue(tasks, todayKey) {
    return tasks
      .filter((task) => task.completed === false && task.dueDate !== '' && task.dueDate <= todayKey)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0));
  }

  root.Progress = {
    getDailyProgress,
    getWeeklyProgress,
    getOverallProgress,
    getSubjectProgress,
    getFocusMinutes,
    countSessions,
    isOverdue,
    getDueTodayAndOverdue
  };
})();
