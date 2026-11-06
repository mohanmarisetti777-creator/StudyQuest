(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};
  const { Constants, Utils, UI, Storage, Subjects, Progress } = root;

  const MSG = {
    titleRequired: 'Task title is required.',
    titleTooLong: 'Task title must be ' + Constants.TASK_TITLE_MAX + ' characters or fewer.',
    subjectInvalid: 'Select a subject.',
    dueInvalid: 'Enter a valid date.',
    priorityInvalid: 'Select a priority.',
    added: 'Task added.',
    updated: 'Task updated.',
    deleted: 'Task deleted.',
    noDueDate: 'No due date',
    emptyAll: 'No tasks yet. Add your first task above.',
    emptyFiltered: 'No tasks match the current filters.'
  };
  const FIELD_IDS = { title: 'task-title', subjectId: 'task-subject', dueDate: 'task-due', priority: 'task-priority' };
  const FIELD_ORDER = ['title', 'subjectId', 'dueDate', 'priority'];
  const ALL = 'all';

  let onChange = function () {};
  let editingId = null;
  let form = null;
  const filters = { subjectId: ALL, status: ALL };

  function getAll() {
    return Storage.getState().tasks;
  }

  function getById(id) {
    return getAll().find((task) => task.id === id);
  }

  /** Validates task fields. */
  function validate(fields) {
    const errors = {};
    const title = String(fields.title === undefined || fields.title === null ? '' : fields.title).trim();
    const dueDate = fields.dueDate === undefined || fields.dueDate === null ? '' : fields.dueDate;
    if (title === '') {
      errors.title = MSG.titleRequired;
    } else if (title.length > Constants.TASK_TITLE_MAX) {
      errors.title = MSG.titleTooLong;
    }
    if (!fields.subjectId || !Subjects.getById(fields.subjectId)) {
      errors.subjectId = MSG.subjectInvalid;
    }
    if (dueDate !== '' && !Utils.isValidDateKey(dueDate)) {
      errors.dueDate = MSG.dueInvalid;
    }
    if (!Constants.PRIORITIES.includes(fields.priority)) {
      errors.priority = MSG.priorityInvalid;
    }
    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }
    return { ok: true, value: { title, subjectId: fields.subjectId, dueDate, priority: fields.priority } };
  }

  /** Adds a task and saves. */
  function add(fields) {
    const result = validate(fields);
    if (!result.ok) {
      return result;
    }
    const task = Object.assign({ id: Utils.generateId(), completed: false, completedAt: null, createdAt: Utils.nowISO() }, result.value);
    getAll().push(task);
    return { ok: true, value: task, saved: Storage.save() };
  }

  /** Updates a task and saves. */
  function update(id, fields) {
    const task = getById(id);
    if (!task) {
      return { ok: false, errors: {} };
    }
    const result = validate(fields);
    if (!result.ok) {
      return result;
    }
    Object.assign(task, result.value);
    return { ok: true, value: task, saved: Storage.save() };
  }

  /** Removes a task and saves. */
  function remove(id) {
    const state = Storage.getState();
    const index = state.tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return { ok: false, errors: {} };
    }
    state.tasks.splice(index, 1);
    return { ok: true, value: id, saved: Storage.save() };
  }

  /** Flips completion and saves. */
  function toggleComplete(id) {
    const task = getById(id);
    if (!task) {
      return { ok: false, errors: {} };
    }
    task.completed = !task.completed;
    task.completedAt = task.completed ? Utils.nowISO() : null;
    return { ok: true, value: task, saved: Storage.save() };
  }

  function compareStrings(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  /** Sort comparator: incomplete by due date (undated last) then creation; completed by completion time, newest first. */
  function compareTasks(a, b) {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    if (a.completed) {
      return compareStrings(b.completedAt, a.completedAt);
    }
    if (a.dueDate !== b.dueDate) {
      if (a.dueDate === '') {
        return 1;
      }
      return b.dueDate === '' ? -1 : compareStrings(a.dueDate, b.dueDate);
    }
    return compareStrings(a.createdAt, b.createdAt);
  }

  /** Builds one task row; showControls false omits the checkbox and buttons (dashboard). */
  function createTaskRow(task, options) {
    const showControls = !options || options.showControls !== false;
    const subject = Subjects.getById(task.subjectId);
    const title = UI.el('span', { className: 'task-row__title', text: task.title });
    const heading = showControls
      ? UI.el('label', { className: 'task-row__check' }, [UI.el('input', { attrs: { type: 'checkbox' } }), title])
      : title;
    if (showControls) {
      heading.querySelector('input').checked = task.completed;
    }
    const meta = [
      subject ? Subjects.createBadge(subject) : UI.el('span', { className: 'badge', text: 'Unknown subject' }),
      UI.el('span', { text: task.dueDate === '' ? MSG.noDueDate : Utils.formatDateLabel(task.dueDate) }),
      UI.el('span', { className: 'badge badge--' + task.priority, text: task.priority.charAt(0).toUpperCase() + task.priority.slice(1) + ' priority' })
    ];
    if (Progress.isOverdue(task, Utils.todayKey())) {
      meta.push(UI.el('span', { className: 'badge badge--overdue', text: 'Overdue' }));
    }
    const children = [UI.el('div', { className: 'task-row__body' }, [heading, UI.el('div', { className: 'task-row__meta' }, meta)])];
    if (showControls) {
      children.push(UI.el('div', { className: 'row-actions' }, [
        UI.el('button', { className: 'btn', text: 'Edit', attrs: { type: 'button', 'data-action': 'edit' } }),
        UI.el('button', { className: 'btn btn--danger', text: 'Delete', attrs: { type: 'button', 'data-action': 'delete' } })
      ]));
    }
    return UI.el('li', {
      className: 'list__item task-row' + (task.completed ? ' task-row--done' : ''),
      dataset: { id: task.id }
    }, children);
  }

  function fillSelect(select, firstOption, subjects, wanted) {
    const options = [UI.el('option', { text: firstOption.text, attrs: { value: firstOption.value } })];
    subjects.forEach((subject) => options.push(UI.el('option', { text: subject.name, attrs: { value: subject.id } })));
    UI.replaceContent(select, options);
    select.value = subjects.some((subject) => subject.id === wanted) || wanted === firstOption.value ? wanted : firstOption.value;
  }

  function renderSelects(subjects) {
    const formSelect = UI.byId('task-subject');
    fillSelect(formSelect, { value: '', text: 'Select a subject' }, subjects, formSelect.value);
    if (filters.subjectId !== ALL && !Subjects.getById(filters.subjectId)) {
      filters.subjectId = ALL;
    }
    fillSelect(UI.byId('filter-subject'), { value: ALL, text: 'All subjects' }, subjects, filters.subjectId);
  }

  function setFormDisabled(disabled) {
    Array.from(form.elements).forEach((control) => { control.disabled = disabled; });
    UI.byId('task-needs-subject').hidden = !disabled;
  }

  function matchesFilters(task) {
    const subjectOk = filters.subjectId === ALL || task.subjectId === filters.subjectId;
    const statusOk = filters.status === ALL || (filters.status === 'completed') === task.completed;
    return subjectOk && statusOk;
  }

  function renderList() {
    const all = getAll();
    const visible = all.filter(matchesFilters).sort(compareTasks);
    const empty = UI.byId('task-empty');
    empty.hidden = visible.length > 0;
    empty.textContent = all.length === 0 ? MSG.emptyAll : MSG.emptyFiltered;
    UI.replaceContent(UI.byId('task-list'), visible.map((task) => createTaskRow(task, { showControls: true })));
  }

  /** Rebuilds selects, filters and the task list. */
  function render() {
    const subjects = Subjects.getAll();
    if (editingId && !getById(editingId)) {
      resetForm();
    }
    renderSelects(subjects);
    setFormDisabled(subjects.length === 0);
    renderList();
  }

  function resetForm() {
    editingId = null;
    form.reset();
    UI.clearFieldErrors(form);
    UI.byId('task-submit').textContent = 'Add task';
    UI.byId('task-cancel').hidden = true;
  }

  function showErrors(errors) {
    FIELD_ORDER.forEach((field) => UI.setFieldError(FIELD_IDS[field], errors[field] || ''));
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) {
      UI.byId(FIELD_IDS[first]).focus();
    }
  }

  function focusAfterEdit(id) {
    const button = id ? UI.findByDataId(UI.byId('task-list'), id, '[data-action="edit"]') : null;
    (button || UI.byId('task-title')).focus();
  }

  function handleSubmit(event) {
    event.preventDefault();
    UI.clearFieldErrors(form);
    const fields = {
      title: UI.byId('task-title').value,
      subjectId: UI.byId('task-subject').value,
      dueDate: UI.byId('task-due').value,
      priority: UI.byId('task-priority').value
    };
    const wasEditing = editingId;
    const result = wasEditing ? update(wasEditing, fields) : add(fields);
    if (!result.ok) {
      if (Object.keys(result.errors).length > 0) {
        showErrors(result.errors);
        return;
      }
      resetForm();
      onChange({ saved: true });
      return;
    }
    UI.showToast(wasEditing ? MSG.updated : MSG.added);
    resetForm();
    onChange({ saved: result.saved });
    if (wasEditing) {
      focusAfterEdit(wasEditing);
    }
  }

  function startEdit(id) {
    const task = getById(id);
    if (!task) {
      onChange({ saved: true });
      return;
    }
    editingId = id;
    UI.clearFieldErrors(form);
    UI.byId('task-title').value = task.title;
    UI.byId('task-subject').value = task.subjectId;
    UI.byId('task-due').value = task.dueDate;
    UI.byId('task-priority').value = task.priority;
    UI.byId('task-submit').textContent = 'Save changes';
    UI.byId('task-cancel').hidden = false;
    UI.byId('task-title').focus();
  }

  function handleCancel() {
    const id = editingId;
    resetForm();
    focusAfterEdit(id);
  }

  async function confirmDelete(id) {
    const task = getById(id);
    if (!task) {
      onChange({ saved: true });
      return;
    }
    const confirmed = await UI.askConfirmation('Delete task "' + task.title + '"?');
    if (!confirmed) {
      return;
    }
    const result = remove(id);
    if (editingId === id) {
      resetForm();
    }
    UI.showToast(MSG.deleted);
    onChange({ saved: result.ok ? result.saved : true });
  }

  function handleListClick(event) {
    const button = event.target.closest('[data-action]');
    const row = event.target.closest('[data-id]');
    if (!button || !row) {
      return;
    }
    if (button.dataset.action === 'edit') {
      startEdit(row.dataset.id);
    } else if (button.dataset.action === 'delete') {
      confirmDelete(row.dataset.id);
    }
  }

  function handleListChange(event) {
    const row = event.target.closest('[data-id]');
    if (!row || event.target.type !== 'checkbox') {
      return;
    }
    const id = row.dataset.id;
    const result = toggleComplete(id);
    onChange({ saved: result.ok ? result.saved : true });
    const checkbox = UI.findByDataId(UI.byId('task-list'), id, 'input[type="checkbox"]');
    if (checkbox) {
      checkbox.focus();
    }
  }

  function handleFilterChange() {
    filters.subjectId = UI.byId('filter-subject').value;
    filters.status = UI.byId('filter-status').value;
    onChange({ saved: true });
  }

  /** Binds the task form, filters and list events. */
  function init(options) {
    onChange = options.onChange;
    form = UI.byId('task-form');
    form.addEventListener('submit', handleSubmit);
    ['input', 'change'].forEach((type) => form.addEventListener(type, (event) => {
      if (event.target.id) {
        UI.setFieldError(event.target.id, '');
      }
    }));
    UI.byId('task-cancel').addEventListener('click', handleCancel);
    UI.byId('filter-subject').addEventListener('change', handleFilterChange);
    UI.byId('filter-status').addEventListener('change', handleFilterChange);
    const list = UI.byId('task-list');
    list.addEventListener('click', handleListClick);
    list.addEventListener('change', handleListChange);
  }

  root.Tasks = { init, render, validate, add, update, remove, toggleComplete, compareTasks, createTaskRow };
})();
