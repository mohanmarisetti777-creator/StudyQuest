(function () {
  'use strict';

  const root = window.StudyQuest = window.StudyQuest || {};

  const TOAST_MS = 3500;

  /** Returns the element with this id or throws. */
  function byId(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error('Missing element #' + id);
    }
    return element;
  }

  /** Builds an element; user text only ever enters through textContent or text nodes. */
  function el(tag, options, children) {
    const opts = options || {};
    const element = document.createElement(tag);
    if (opts.className) {
      element.className = opts.className;
    }
    if (opts.text !== undefined) {
      element.textContent = opts.text;
    }
    Object.keys(opts.attrs || {}).forEach((name) => element.setAttribute(name, opts.attrs[name]));
    Object.keys(opts.dataset || {}).forEach((name) => { element.dataset[name] = opts.dataset[name]; });
    (children || []).forEach((child) => {
      element.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return element;
  }

  /** Replaces all children of a container. */
  function replaceContent(container, nodes) {
    container.replaceChildren(...nodes);
  }

  /** Shows or clears the inline error under an input. */
  function setFieldError(inputId, message) {
    const input = byId(inputId);
    const errorElement = byId(inputId + '-error');
    errorElement.textContent = message || '';
    errorElement.hidden = !message;
    if (message) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  /** Clears every inline error in a form. */
  function clearFieldErrors(form) {
    form.querySelectorAll('.field__error').forEach((errorElement) => {
      errorElement.textContent = '';
      errorElement.hidden = true;
    });
    form.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
  }

  /** Shows a toast that removes itself; type is 'info' or 'error'. */
  function showToast(message, type) {
    const toast = el('div', {
      className: type === 'error' ? 'toast toast--error' : 'toast',
      text: message
    });
    byId('toast-region').appendChild(toast);
    window.setTimeout(() => toast.remove(), TOAST_MS);
  }

  /** Opens the confirm dialog; resolves true for Yes, false for No or Escape. */
  function askConfirmation(message) {
    const dialog = byId('confirm-dialog');
    const yesButton = byId('confirm-yes');
    const noButton = byId('confirm-no');
    const opener = document.activeElement;
    byId('confirm-message').textContent = message;

    return new Promise((resolve) => {
      let answer = false;
      const onYes = () => { answer = true; dialog.close(); };
      const onNo = () => dialog.close();
      const onClose = () => {
        yesButton.removeEventListener('click', onYes);
        noButton.removeEventListener('click', onNo);
        if (opener && typeof opener.focus === 'function') {
          opener.focus();
        }
        resolve(answer);
      };
      yesButton.addEventListener('click', onYes);
      noButton.addEventListener('click', onNo);
      dialog.addEventListener('close', onClose, { once: true });
      dialog.showModal();
      noButton.focus();
    });
  }

  /** Builds a progressbar element for a 0-100 percent. */
  function createProgressBar(percent, label) {
    const fill = el('div', { className: 'progress__fill' });
    fill.style.width = percent + '%';
    return el('div', {
      className: 'progress',
      attrs: {
        role: 'progressbar',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': String(percent),
        'aria-label': label
      }
    }, [fill]);
  }

  /** Finds a list row (or a control inside it) by its data-id. */
  function findByDataId(container, id, selector) {
    const rows = Array.from(container.querySelectorAll('[data-id]'));
    const row = rows.find((candidate) => candidate.dataset.id === id);
    if (!row) {
      return null;
    }
    return selector ? row.querySelector(selector) : row;
  }

  root.UI = {
    byId,
    el,
    replaceContent,
    setFieldError,
    clearFieldErrors,
    showToast,
    askConfirmation,
    createProgressBar,
    findByDataId
  };
})();
