/*
 * MD File Viewer
 * Author:     Amiran Kimadze (itsarmen)
 * GitHub:     https://github.com/itsarmen
 * Email:      amoswaper@gmail.com
 * Web:        https://xrow.asia
 *
 * Webview client for the custom editor: builds the app chrome, hosts the
 * WYSIWYG (Toast UI) editor, renders the GitHub preview and talks to the
 * extension host.
 */

import Editor from '@toast-ui/editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';
import './markdown.css';
import './app.css';

const vscode = acquireVsCodeApi();

type Mode = 'view' | 'edit';

interface InitMessage {
  type: 'init';
  text?: string;
  fileName?: string;
  path?: string;
  preview?: string;
  mode?: Mode;
  contentWidth?: number;
}

const TOOLBAR_ITEMS: string[][] = [
  ['heading', 'bold', 'italic', 'strike'],
  ['hr', 'quote'],
  ['ul', 'ol', 'task', 'indent', 'outdent'],
  ['table', 'image', 'link'],
  ['code', 'codeblock'],
];

const editorHost = document.getElementById('editor-host') as HTMLElement;
const previewEl = document.getElementById('preview') as HTMLElement;
const statusPathEl = document.getElementById('status-path') as HTMLElement;
const statusInfoEl = document.getElementById('status-info') as HTMLElement;
const docNameEl = document.getElementById('doc-name') as HTMLElement;
const dirtyEl = document.getElementById('dirty') as HTMLElement;

let editor: Editor | null = null;
let mode: Mode = 'view';
let markdown = '';
let editTimer: number | undefined;
let suppressEditorEvents = false;

function post(message: Record<string, unknown>): void {
  vscode.postMessage(message);
}

// ---- Editor --------------------------------------------------------------

function ensureEditor(): Editor {
  if (editor) {
    return editor;
  }
  editor = new Editor({
    el: editorHost,
    height: '100%',
    initialValue: markdown,
    initialEditType: 'wysiwyg',
    hideModeSwitch: true,
    usageStatistics: false,
    autofocus: false,
    previewStyle: 'vertical',
    placeholder: 'Write Markdown here…',
    toolbarItems: TOOLBAR_ITEMS,
    events: {
      change: () => handleEditorChange(),
    },
  });
  applyEditorTheme();
  observeResize();
  resizeEditor();
  return editor;
}

function handleEditorChange(): void {
  if (suppressEditorEvents || !editor) {
    return;
  }
  markdown = editor.getMarkdown();
  updateStatus();
  scheduleEdit();
}

function scheduleEdit(): void {
  if (editTimer) {
    window.clearTimeout(editTimer);
  }
  editTimer = window.setTimeout(() => {
    editTimer = undefined;
    post({ type: 'edit', text: markdown });
  }, 250);
}

function flushEdit(): void {
  if (editTimer) {
    window.clearTimeout(editTimer);
    editTimer = undefined;
  }
  post({ type: 'edit', text: markdown });
}

function resizeEditor(): void {
  if (!editor) {
    return;
  }
  const height = editorHost.clientHeight;
  if (height > 0) {
    editor.setHeight(`${height}px`);
  }
}

function observeResize(): void {
  if (typeof ResizeObserver === 'undefined') {
    window.addEventListener('resize', resizeEditor);
    return;
  }
  const observer = new ResizeObserver(() => resizeEditor());
  observer.observe(editorHost);
}

function applyEditorTheme(): void {
  const dark =
    document.body.classList.contains('vscode-dark') ||
    document.body.classList.contains('vscode-high-contrast');
  const ui = document.querySelector('.toastui-editor-defaultUI');
  if (ui) {
    ui.classList.toggle('toastui-editor-dark', dark);
  }
}

// ---- Modes ---------------------------------------------------------------

function setMode(next: Mode, notify = true): void {
  mode = next;
  document.body.dataset.viewMode = next;
  for (const button of Array.from(
    document.querySelectorAll<HTMLElement>('.segmented button'),
  )) {
    button.classList.toggle('active', button.dataset.mode === next);
  }
  if (next === 'edit') {
    ensureEditor();
    requestAnimationFrame(resizeEditor);
  }
  updateStatus();
  if (notify) {
    vscode.setState({ mode: next });
    post({ type: 'mode', mode: next });
  }
}

// ---- Status bar ----------------------------------------------------------

function updateStatus(path?: string): void {
  const trimmed = markdown.trim();
  const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
  const lines = markdown === '' ? 0 : markdown.split('\n').length;
  statusInfoEl.textContent = `${words} words · ${lines} lines · ${mode}`;
  if (path) {
    statusPathEl.textContent = path;
  }
}

// ---- Link / copy handling ------------------------------------------------

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const copyButton = target.closest('.code-block-copy');
  if (copyButton) {
    event.preventDefault();
    const block = copyButton.closest('.code-block');
    const code = block ? block.querySelector('pre code') : null;
    if (code) {
      post({ type: 'copy', text: code.textContent ?? '' });
      copyButton.textContent = 'Copied!';
      copyButton.classList.add('copied');
      window.setTimeout(() => {
        copyButton.textContent = 'Copy';
        copyButton.classList.remove('copied');
      }, 1200);
    }
    return;
  }

  const anchor = target.closest('a');
  if (anchor instanceof HTMLAnchorElement) {
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#')) {
      return;
    }
    event.preventDefault();
    if (/^(https?:|mailto:)/i.test(href)) {
      post({ type: 'openExternal', href });
    } else {
      post({ type: 'openLocal', href });
    }
  }
});

// ---- Header actions ------------------------------------------------------

const saveButton = document.getElementById('save') as HTMLButtonElement | null;
const saveIcon = saveButton?.innerHTML ?? '';
const checkIcon =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
let savedTimer: number | undefined;

function flashSaved(): void {
  if (!saveButton) {
    return;
  }
  saveButton.innerHTML = checkIcon;
  saveButton.classList.add('saved');
  if (savedTimer) {
    window.clearTimeout(savedTimer);
  }
  savedTimer = window.setTimeout(() => {
    saveButton.innerHTML = saveIcon;
    saveButton.classList.remove('saved');
  }, 1200);
}

function requestSave(): void {
  flushEdit();
  flashSaved();
  post({ type: 'save', text: markdown });
}

saveButton?.addEventListener('click', requestSave);

for (const button of Array.from(
  document.querySelectorAll<HTMLElement>('.segmented button'),
)) {
  button.addEventListener('click', () => {
    setMode((button.dataset.mode as Mode) ?? 'view');
  });
}

window.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    requestSave();
  }
});

// ---- Messages from the host ----------------------------------------------

window.addEventListener('message', (event) => {
  const message = event.data as (InitMessage | Record<string, unknown>) | undefined;
  if (!message || typeof message !== 'object') {
    return;
  }
  switch ((message as { type?: string }).type) {
    case 'init': {
      const init = message as InitMessage;
      markdown = init.text ?? '';
      if (init.fileName) {
        docNameEl.textContent = init.fileName;
      }
      if (typeof init.contentWidth === 'number') {
        previewEl.style.setProperty('--content-width', `${init.contentWidth}px`);
      }
      previewEl.innerHTML = init.preview ?? '';
      setMode(init.mode ?? 'view', false);
      if (mode === 'edit') {
        resizeEditor();
      }
      updateStatus(init.path);
      break;
    }
    case 'update': {
      const data = message as { text?: string; preview?: string };
      markdown = data.text ?? '';
      if (editor) {
        suppressEditorEvents = true;
        editor.setMarkdown(markdown, false);
        suppressEditorEvents = false;
      }
      if (typeof data.preview === 'string') {
        previewEl.innerHTML = data.preview;
      }
      updateStatus();
      break;
    }
    case 'preview': {
      const data = message as { html?: string };
      if (typeof data.html === 'string') {
        previewEl.innerHTML = data.html;
      }
      break;
    }
    case 'dirty': {
      dirtyEl.hidden = !(message as { dirty?: boolean }).dirty;
      break;
    }
    case 'path': {
      const data = message as { path?: string };
      if (data.path) {
        statusPathEl.textContent = data.path;
      }
      break;
    }
    default:
      break;
  }
});

post({ type: 'ready' });
