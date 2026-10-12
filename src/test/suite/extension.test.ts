/*
 * MD File Viewer — integration smoke tests.
 *
 * Runs inside a real VS Code extension host (see runTest.ts) and verifies that
 * the extension activates, registers its commands, transforms Markdown and
 * opens the custom editor.
 */

import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

const EXTENSION_ID = 'itsarmen.md-file-viewer';
const VIEW_TYPE = 'mdFileViewer.editor';

const FORMATTING_COMMANDS = [
  'mdFileViewer.bold',
  'mdFileViewer.italic',
  'mdFileViewer.strikethrough',
  'mdFileViewer.inlineCode',
  'mdFileViewer.codeBlock',
  'mdFileViewer.heading1',
  'mdFileViewer.quote',
  'mdFileViewer.bulletedList',
  'mdFileViewer.numberedList',
  'mdFileViewer.taskList',
  'mdFileViewer.link',
  'mdFileViewer.image',
  'mdFileViewer.horizontalRule',
];

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createMarkdownFile(name: string, contents: string): Promise<vscode.Uri> {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'md-file-viewer-'));
  const file = path.join(directory, name);
  fs.writeFileSync(file, contents, 'utf8');
  return vscode.Uri.file(file);
}

async function openTextEditor(uri: vscode.Uri): Promise<vscode.TextEditor> {
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: false });
  await delay(200);
  return editor;
}

suite('MD File Viewer', () => {
  test('activates and registers its commands', async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, 'extension should be installed');
    await extension!.activate();
    assert.ok(extension!.isActive, 'extension should be active');

    const commands = await vscode.commands.getCommands(true);
    for (const id of [
      'mdFileViewer.openEditor',
      'mdFileViewer.openPreviewToSide',
      ...FORMATTING_COMMANDS,
    ]) {
      assert.ok(commands.includes(id), `command ${id} should be registered`);
    }
  });

  test('bold wraps the selected text', async () => {
    const uri = await createMarkdownFile('bold.md', 'hello world\n');
    const editor = await openTextEditor(uri);

    const text = editor.document.getText();
    const start = editor.document.positionAt(text.indexOf('hello'));
    const end = editor.document.positionAt(text.indexOf('hello') + 'hello'.length);
    editor.selection = new vscode.Selection(start, end);

    await vscode.commands.executeCommand('mdFileViewer.bold');

    assert.strictEqual(editor.document.getText(), '**hello** world\n');
  });

  test('heading command prefixes the current line', async () => {
    const uri = await createMarkdownFile('heading.md', 'Title\n');
    const editor = await openTextEditor(uri);
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );

    await vscode.commands.executeCommand('mdFileViewer.heading2');

    assert.strictEqual(editor.document.getText(), '## Title\n');
  });

  test('task list prefixes the current line', async () => {
    const uri = await createMarkdownFile('task.md', 'buy milk\n');
    const editor = await openTextEditor(uri);
    editor.selection = new vscode.Selection(
      new vscode.Position(0, 0),
      new vscode.Position(0, 0),
    );

    await vscode.commands.executeCommand('mdFileViewer.taskList');

    assert.strictEqual(editor.document.getText(), '- [ ] buy milk\n');
  });

  test('opens the custom editor', async () => {
    const uri = await createMarkdownFile('custom.md', '# Hello\n\nSome **text**.\n');

    await vscode.commands.executeCommand('vscode.openWith', uri, VIEW_TYPE);

    let found = false;
    for (let attempt = 0; attempt < 25 && !found; attempt++) {
      found = vscode.window.tabGroups.all.some((group) =>
        group.tabs.some(
          (tab) =>
            tab.input instanceof vscode.TabInputCustom &&
            tab.input.viewType === VIEW_TYPE,
        ),
      );
      if (!found) {
        await delay(200);
      }
    }

    assert.ok(found, 'the MD File Viewer custom editor tab should be open');
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  });
});
