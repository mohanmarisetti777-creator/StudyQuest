(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};
  const { Constants, Utils, UI, Storage, Progress } = root;

  const MSG = {
    nameRequired: 'Subject name is required.',
    nameTooLong: 'Subject name must be ' + Constants.SUBJECT_NAME_MAX + ' characters or fewer.',
    nameDuplicate: 'A subject with this name already exists.',
    colorInvalid: 'Choose a valid color.',
    added: 'Subject added.',
    updated: 'Subject updated.',
    deleted: 'Subject deleted.'
  };
  const FIELD_ORDER = ['name', 'color'];

  let onChange = function () {};
  let editingId = null;
  let form = null;

  /** Returns all subjects in creation order. */
  function getAll() {
    return Storage.getState().subjects.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  }

  /** Returns one subject or undefined. */
  function getById(id) {
    return Storage.getState().subjects.find((subject) => subject.id === id);
  }

  /** Validates subject fields; ignoreId is the subject being edited. */
  function validate(fields, ignoreId) {
    const errors = {};
    const name = String(fields.name === undefined || fields.name === null ? '' : fields.name).trim();
    const lowerName = name.toLowerCase();
    if (name === '') {
      errors.name = MSG.nameRequired;
    } else if (name.length > Constants.SUBJECT_NAME_MAX) {
      errors.name = MSG.nameTooLong;
    } else if (getAll().some((subject) => subject.id !== ignoreId && subject.name.toLowerCase() === lowerName)) {
      errors.name = MSG.nameDuplicate;
    }
    if (!Utils.isValidHexColor(fields.color)) {
      errors.color = MSG.colorInvalid;
    }
    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }
    return { ok: true, value: { name, color: fields.color } };
  }

  /** Adds a subject and saves. */
  function add(fields) {
    const result = validate(fields, null);
    if (!result.ok) {
      return result;
    }
    const subject = { id: Utils.generateId(), name: result.value.name, color: result.value.color, createdAt: Utils.nowISO() };
    Storage.getState().subjects.push(subject);
    return { ok: true, value: subject, saved: Storage.save() };
  }

  /** Updates a subject and saves. */
  function update(id, fields) {
    const subject = getById(id);
    if (!subject) {
      return { ok: false, errors: {} };
    }
    const result = validate(fields, id);
    if (!result.ok) {
      return result;
    }
    subject.name = result.value.name;
    subject.color = result.value.color;
    return { ok: true, value: subject, saved: Storage.save() };
  }

  /** Removes a subject and, as the one allowed exception, all of its tasks. */
  function remove(id) {
    const state = Storage.getState();
    const index = state.subjects.findIndex((subject) => subject.id === id);
    if (index === -1) {
      return { ok: false, errors: {} };
    }
    const before = state.tasks.length;
    state.subjects.splice(index, 1);
    state.tasks = state.tasks.filter((task) => task.subjectId !== id);
    return { ok: true, value: { removedTasks: before - state.tasks.length }, saved: Storage.save() };
  }

  /** Builds the shared subject badge (color dot + name). */
  function createBadge(subject) {
    const dot = UI.el('span', { className: 'dot' });
    dot.style.backgroundColor = subject.color;
    return UI.el('span', { className: 'badge' }, [dot, UI.el('span', { text: subject.name })]);
  }

  function createRow(subject) {
    const dot = UI.el('span', { className: 'dot' });
    dot.style.backgroundColor = subject.color;
    const progress = Progress.getSubjectProgress(Storage.getState().tasks, subject.id);
    const counts = UI.el('span', { className: 'muted', text: progress.done + '/' + progress.total + ' tasks' });
    return UI.el('li', { className: 'list__item', dataset: { id: subject.id } }, [
      UI.el('div', { className: 'row-main' }, [
        dot,
        UI.el('span', { className: 'row-name', text: subject.name }),
        counts,
        UI.createProgressBar(progress.percent, subject.name + ' progress')
      ]),
      UI.el('div', { className: 'row-actions' }, [
        UI.el('button', { className: 'btn', text: 'Edit', attrs: { type: 'button', 'data-action': 'edit' } }),
        UI.el('button', { className: 'btn btn--danger', text: 'Delete', attrs: { type: 'button', 'data-action': 'delete' } })
      ])
    ]);
  }

  /** Rebuilds the subject list. */
  function render() {
    const subjects = getAll();
    UI.byId('subject-empty').hidden = subjects.length > 0;
    UI.replaceContent(UI.byId('subject-list'), subjects.map(createRow));
  }

  function resetForm() {
    editingId = null;
    form.reset();
    UI.byId('subject-color').value = Constants.DEFAULT_SUBJECT_COLOR;
    UI.clearFieldErrors(form);
    UI.byId('subject-submit').textContent = 'Add subject';
    UI.byId('subject-cancel').hidden = true;
  }

  function focusAfterEdit(id) {
    const button = id ? UI.findByDataId(UI.byId('subject-list'), id, '[data-action="edit"]') : null;
    (button || UI.byId('subject-name')).focus();
  }

  function showErrors(errors) {
    FIELD_ORDER.forEach((field) => UI.setFieldError('subject-' + field, errors[field] || ''));
    const first = FIELD_ORDER.find((field) => errors[field]);
    if (first) {
      UI.byId('subject-' + first).focus();
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    UI.clearFieldErrors(form);
    const fields = { name: UI.byId('subject-name').value, color: UI.byId('subject-color').value };
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
    const subject = getById(id);
    if (!subject) {
      onChange({ saved: true });
      return;
    }
    editingId = id;
    UI.clearFieldErrors(form);
    UI.byId('subject-name').value = subject.name;
    UI.byId('subject-color').value = subject.color;
    UI.byId('subject-submit').textContent = 'Save changes';
    UI.byId('subject-cancel').hidden = false;
    UI.byId('subject-name').focus();
  }

  function handleCancel() {
    const id = editingId;
    resetForm();
    focusAfterEdit(id);
  }

  function buildDeleteMessage(subject) {
    const count = Storage.getState().tasks.filter((task) => task.subjectId === subject.id).length;
    if (count === 0) {
      return 'Delete "' + subject.name + '"?';
    }
    return 'Delete "' + subject.name + '" and its ' + count + ' task(s)? This cannot be undone.';
  }

  async function confirmDelete(id) {
    const subject = getById(id);
    if (!subject) {
      onChange({ saved: true });
      return;
    }
    const confirmed = await UI.askConfirmation(buildDeleteMessage(subject));
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

  /** Binds the subject form and list events. */
  function init(options) {
    onChange = options.onChange;
    form = UI.byId('subject-form');
    form.addEventListener('submit', handleSubmit);
    form.addEventListener('input', (event) => {
      if (event.target.id) {
        UI.setFieldError(event.target.id, '');
      }
    });
    UI.byId('subject-cancel').addEventListener('click', handleCancel);
    UI.byId('subject-list').addEventListener('click', handleListClick);
  }

  root.Subjects = { init, render, getAll, getById, validate, add, update, remove, createBadge };
})();
