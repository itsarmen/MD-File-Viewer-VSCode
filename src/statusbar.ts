/*
 * MD File Viewer
 * Author:     Amiran Kimadze (itsarmen)
 * GitHub:     https://github.com/itsarmen
 * Email:      amoswaper@gmail.com
 * Web:        https://xrow.asia
 *
 * Status bar word/line counter for the active Markdown editor.
 */

import * as vscode from 'vscode';

function isMarkdown(document: vscode.TextDocument): boolean {
  const path = document.uri.fsPath.toLowerCase();
  return (
    document.languageId === 'markdown' ||
    document.languageId === 'mdx' ||
    path.endsWith('.md') ||
    path.endsWith('.markdown') ||
    path.endsWith('.mdx')
  );
}

function enabled(): boolean {
  return vscode.workspace
    .getConfiguration('mdFileViewer')
    .get<boolean>('statusBar.enabled', true);
}

export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = 'mdFileViewer.openEditor';

    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(() => this.update()),
      vscode.window.onDidChangeTextEditorSelection(() => this.update()),
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === vscode.window.activeTextEditor?.document) {
          this.update();
        }
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('mdFileViewer.statusBar')) {
          this.update();
        }
      }),
    );

    this.update();
  }

  update(): void {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !isMarkdown(editor.document) || !enabled()) {
      this.item.hide();
      return;
    }

    const text = editor.document.getText();
    const trimmed = text.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const lines = text === '' ? 0 : text.split('\n').length;

    this.item.text = `$(book) ${words} words · ${lines} lines`;
    this.item.tooltip = new vscode.MarkdownString(
      `**MD File Viewer**\n\nWords: ${words}\nLines: ${lines}\nCharacters: ${text.length}\n\nClick to open the preview.`,
    );
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}
