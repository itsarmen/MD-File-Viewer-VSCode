/*
 * MD File Viewer
 * Author:     Amiran Kimadze (itsarmen)
 * GitHub:     https://github.com/itsarmen
 * Email:      amoswaper@gmail.com
 * Web:        https://xrow.asia
 *
 * Editing commands (bold, italic, headings, lists, …), ported from the
 * Flutter app's `home_page.dart` formatting helpers.
 */

import * as vscode from 'vscode';

type EditorAction = (editor: vscode.TextEditor) => Promise<void>;

function activeEditor(): vscode.TextEditor | undefined {
  return vscode.window.activeTextEditor;
}

/** Replaces the whole document and restores a selection (offsets-based). */
async function applyChange(
  editor: vscode.TextEditor,
  newText: string,
  selectionStart: number,
  selectionEnd: number,
): Promise<void> {
  const document = editor.document;
  const fullRange = new vscode.Range(
    document.positionAt(0),
    document.positionAt(document.getText().length),
  );
  const applied = await editor.edit((builder) => builder.replace(fullRange, newText));
  if (!applied) {
    return;
  }
  const start = document.positionAt(selectionStart);
  const end = document.positionAt(selectionEnd);
  editor.selection = new vscode.Selection(start, end);
  editor.revealRange(new vscode.Range(start, end));
}

function offsets(editor: vscode.TextEditor): { start: number; end: number } {
  const document = editor.document;
  return {
    start: document.offsetAt(editor.selection.start),
    end: document.offsetAt(editor.selection.end),
  };
}

function lineBounds(editor: vscode.TextEditor): { start: number; end: number } {
  const text = editor.document.getText();
  const { start, end } = offsets(editor);
  const searchFrom = start - 1;
  const lineStart = searchFrom < 0 ? 0 : text.lastIndexOf('\n', searchFrom) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd === -1) {
    lineEnd = text.length;
  }
  return { start: lineStart, end: lineEnd };
}

async function wrapSelection(
  editor: vscode.TextEditor,
  left: string,
  right: string,
): Promise<void> {
  const text = editor.document.getText();
  const { start, end } = offsets(editor);
  const selected = text.substring(start, end);

  if (selected === '') {
    const marker = `${left}${right}`;
    const updated = text.slice(0, start) + marker + text.slice(end);
    await applyChange(editor, updated, start + left.length, start + left.length);
    return;
  }

  if (
    selected.length >= left.length + right.length &&
    selected.startsWith(left) &&
    selected.endsWith(right)
  ) {
    const inner = selected.substring(left.length, selected.length - right.length);
    const updated = text.slice(0, start) + inner + text.slice(end);
    await applyChange(editor, updated, start, start + inner.length);
    return;
  }

  const wrapped = `${left}${selected}${right}`;
  const updated = text.slice(0, start) + wrapped + text.slice(end);
  await applyChange(editor, updated, start + left.length, start + left.length + selected.length);
}

async function toggleLinePrefix(editor: vscode.TextEditor, prefix: string): Promise<void> {
  const text = editor.document.getText();
  const bounds = lineBounds(editor);
  const lines = text.substring(bounds.start, bounds.end).split('\n');
  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const updatedLines = lines.map((line) => {
    if (allPrefixed) {
      return line.substring(prefix.length);
    }
    if (line.startsWith(prefix)) {
      return line;
    }
    return `${prefix}${line}`;
  });
  const updated = updatedLines.join('\n');
  const next = text.slice(0, bounds.start) + updated + text.slice(bounds.end);
  await applyChange(editor, next, bounds.start, bounds.start + updated.length);
}

async function toggleOrderedList(editor: vscode.TextEditor): Promise<void> {
  const text = editor.document.getText();
  const bounds = lineBounds(editor);
  const lines = text.substring(bounds.start, bounds.end).split('\n');
  const numbered = /^\d+\.\s/;
  const allNumbered = lines.every((line) => numbered.test(line));
  const updated = lines
    .map((line, index) => {
      if (allNumbered) {
        return line.replace(numbered, '');
      }
      if (numbered.test(line)) {
        return line;
      }
      return `${index + 1}. ${line}`;
    })
    .join('\n');
  const next = text.slice(0, bounds.start) + updated + text.slice(bounds.end);
  await applyChange(editor, next, bounds.start, bounds.start + updated.length);
}

async function applyHeading(editor: vscode.TextEditor, level: number): Promise<void> {
  const text = editor.document.getText();
  const { start } = offsets(editor);
  const searchFrom = start - 1;
  const lineStart = searchFrom < 0 ? 0 : text.lastIndexOf('\n', searchFrom) + 1;
  let lineEnd = text.indexOf('\n', start);
  if (lineEnd === -1) {
    lineEnd = text.length;
  }
  const stripped = text.substring(lineStart, lineEnd).replace(/^#{1,6}\s*/, '');
  const prefix = level <= 0 ? '' : `${'#'.repeat(level)} `;
  const updated = `${prefix}${stripped}`;
  const next = text.slice(0, lineStart) + updated + text.slice(lineEnd);
  await applyChange(editor, next, lineStart + updated.length, lineStart + updated.length);
}

async function toggleCodeBlock(editor: vscode.TextEditor): Promise<void> {
  const text = editor.document.getText();
  const { start, end } = offsets(editor);
  const selected = text.substring(start, end);

  if (selected.startsWith('```') && selected.endsWith('```')) {
    const inner = selected
      .replace(/^```[^\n]*\n?/, '')
      .replace(/\n?```$/, '');
    const next = text.slice(0, start) + inner + text.slice(end);
    await applyChange(editor, next, start, start + inner.length);
    return;
  }

  if (selected === '') {
    const fence = '```\n\n```';
    const next = text.slice(0, start) + fence + text.slice(end);
    await applyChange(editor, next, start + 4, start + 4);
    return;
  }

  const fenced = `\`\`\`\n${selected}\n\`\`\``;
  const next = text.slice(0, start) + fenced + text.slice(end);
  await applyChange(editor, next, start + 4, start + 4 + selected.length);
}

async function insertLink(editor: vscode.TextEditor, image: boolean): Promise<void> {
  const text = editor.document.getText();
  const { start, end } = offsets(editor);
  const selected = text.substring(start, end);
  const bang = image ? '!' : '';

  if (selected === '') {
    const label = image ? 'alt text' : 'link text';
    const snippet = `${bang}[${label}](url)`;
    const labelStart = start + bang.length + 1;
    const next = text.slice(0, start) + snippet + text.slice(end);
    await applyChange(editor, next, labelStart, labelStart + label.length);
    return;
  }

  const snippet = `${bang}[${selected}](url)`;
  const urlStart = start + bang.length + 1 + selected.length + 2;
  const next = text.slice(0, start) + snippet + text.slice(end);
  await applyChange(editor, next, urlStart, urlStart + 3);
}

async function insertHorizontalRule(editor: vscode.TextEditor): Promise<void> {
  const text = editor.document.getText();
  const { start, end } = offsets(editor);
  const needsLeading = start > 0 && text[start - 1] !== '\n';
  const rule = `${needsLeading ? '\n' : ''}---\n`;
  const next = text.slice(0, start) + rule + text.slice(end);
  const position = start + rule.length;
  await applyChange(editor, next, position, position);
}

function run(action: EditorAction): () => Promise<void> {
  return async () => {
    const editor = activeEditor();
    if (!editor) {
      return;
    }
    await action(editor);
  };
}

export function registerFormattingCommands(context: vscode.ExtensionContext): void {
  const commands: Array<[string, () => Promise<void>]> = [
    ['mdFileViewer.bold', run((editor) => wrapSelection(editor, '**', '**'))],
    ['mdFileViewer.italic', run((editor) => wrapSelection(editor, '*', '*'))],
    ['mdFileViewer.strikethrough', run((editor) => wrapSelection(editor, '~~', '~~'))],
    ['mdFileViewer.inlineCode', run((editor) => wrapSelection(editor, '`', '`'))],
    ['mdFileViewer.codeBlock', run(toggleCodeBlock)],
    ['mdFileViewer.heading1', run((editor) => applyHeading(editor, 1))],
    ['mdFileViewer.heading2', run((editor) => applyHeading(editor, 2))],
    ['mdFileViewer.heading3', run((editor) => applyHeading(editor, 3))],
    ['mdFileViewer.normalText', run((editor) => applyHeading(editor, 0))],
    ['mdFileViewer.quote', run((editor) => toggleLinePrefix(editor, '> '))],
    ['mdFileViewer.bulletedList', run((editor) => toggleLinePrefix(editor, '- '))],
    ['mdFileViewer.numberedList', run(toggleOrderedList)],
    ['mdFileViewer.taskList', run((editor) => toggleLinePrefix(editor, '- [ ] '))],
    ['mdFileViewer.link', run((editor) => insertLink(editor, false))],
    ['mdFileViewer.image', run((editor) => insertLink(editor, true))],
    ['mdFileViewer.horizontalRule', run(insertHorizontalRule)],
  ];

  for (const [id, handler] of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));
  }
}
