/*
 * MD File Viewer
 * Author:     Amiran Kimadze (itsarmen)
 * GitHub:     https://github.com/itsarmen
 * Email:      amoswaper@gmail.com
 * Web:        https://xrow.asia
 *
 * Visual Studio Code extension entry point.
 */

import * as vscode from 'vscode';
import { createRenderer } from './markdown';
import { MarkdownEditorProvider } from './editor';
import { registerFormattingCommands } from './formatting';
import { StatusBar } from './statusbar';

export function activate(context: vscode.ExtensionContext): void {
  const renderer = createRenderer();
  const provider = new MarkdownEditorProvider(context, renderer);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      MarkdownEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    ),
    new StatusBar(),
    vscode.commands.registerCommand('mdFileViewer.openEditor', (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!target) {
        void vscode.window.showInformationMessage(
          'MD File Viewer: open a Markdown file first.',
        );
        return;
      }
      return vscode.commands.executeCommand(
        'vscode.openWith',
        target,
        MarkdownEditorProvider.viewType,
      );
    }),
    vscode.commands.registerCommand('mdFileViewer.openPreviewToSide', (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!target) {
        void vscode.window.showInformationMessage(
          'MD File Viewer: open a Markdown file first.',
        );
        return;
      }
      return vscode.commands.executeCommand(
        'vscode.openWith',
        target,
        MarkdownEditorProvider.viewType,
        vscode.ViewColumn.Beside,
      );
    }),
  );

  registerFormattingCommands(context);
}

export function deactivate(): void {
  /* Disposables are torn down by VS Code. */
}
