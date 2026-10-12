/*
 * MD File Viewer
 * Author:     Amiran Kimadze (itsarmen)
 * GitHub:     https://github.com/itsarmen
 * Email:      amoswaper@gmail.com
 * Web:        https://xrow.asia
 *
 * The custom editor provider that powers the UI inside VS Code: a header with
 * a View / Edit switcher and a Save button, a WYSIWYG editor, a GitHub-styled
 * preview and a status bar.
 */

import * as vscode from 'vscode';
import type MarkdownIt from 'markdown-it';
import { renderMarkdown, type RenderEnv } from './markdown';
import { escapeHtml } from './markdown';

interface EditorConfig {
  lineBreaks: boolean;
  githubStyle: boolean;
  contentWidth: number;
}

function readConfig(): EditorConfig {
  const config = vscode.workspace.getConfiguration('mdFileViewer');
  return {
    lineBreaks: config.get<boolean>('preview.lineBreaks', false),
    githubStyle: config.get<boolean>('preview.githubStyle', true),
    contentWidth: config.get<number>('preview.contentWidth', 980),
  };
}

const MODE_KEY = 'mdFileViewer.viewMode';

function basename(document: vscode.TextDocument): string {
  const parts = document.uri.path.split('/');
  return parts[parts.length - 1] || document.uri.path;
}

function resolveImage(
  webview: vscode.Webview,
  document: vscode.TextDocument,
  src: string,
): string {
  if (!src) {
    return src;
  }
  if (/^(https?:|data:|mailto:|#)/i.test(src)) {
    return src;
  }
  let decoded = src;
  try {
    decoded = decodeURIComponent(src);
  } catch {
    /* keep the raw value */
  }
  const clean = decoded.split('#')[0].split('?')[0].replace(/\\/g, '/');
  const base = vscode.Uri.joinPath(document.uri, '..');
  const fileUri =
    clean.startsWith('/') || /^[a-zA-Z]:\//.test(clean)
      ? vscode.Uri.file(clean)
      : vscode.Uri.joinPath(base, clean);
  return webview.asWebviewUri(fileUri).toString();
}

export class MarkdownEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'mdFileViewer.editor';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly renderer: MarkdownIt,
  ) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const webview = panel.webview;
    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        this.context.extensionUri,
        vscode.Uri.joinPath(document.uri, '..'),
        ...(vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri),
      ],
    };
    webview.html = this.getHtml(webview, document);

    let lastFromWebview = document.getText();
    let previewTimer: NodeJS.Timeout | undefined;

    const post = (message: Record<string, unknown>) => {
      void webview.postMessage(message);
    };

    const renderPreview = (): string => {
      const config = readConfig();
      this.renderer.set({ breaks: config.lineBreaks });
      const env: RenderEnv = {
        resolveImage: (src) => resolveImage(webview, document, src),
      };
      return renderMarkdown(this.renderer, document.getText(), env);
    };

    const postPreview = () => {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }
      previewTimer = setTimeout(() => {
        post({ type: 'preview', html: renderPreview() });
      }, 120);
    };

    const sendInit = async () => {
      const config = readConfig();
      this.renderer.set({ breaks: config.lineBreaks });
      post({
        type: 'init',
        text: document.getText(),
        fileName: basename(document),
        path: vscode.workspace.asRelativePath(document.uri, false),
        preview: renderPreview(),
        mode: this.context.workspaceState.get<string>(MODE_KEY, 'view'),
        contentWidth: config.contentWidth,
      });
      post({ type: 'dirty', dirty: document.isDirty });
    };

    const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() !== document.uri.toString()) {
        return;
      }
      const text = document.getText();
      if (text === lastFromWebview) {
        return;
      }
      lastFromWebview = text;
      post({ type: 'update', text, preview: renderPreview() });
    });

    const configSubscription = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('mdFileViewer')) {
        postPreview();
      }
    });

    const saveSubscription = vscode.workspace.onDidSaveTextDocument((saved) => {
      if (saved.uri.toString() === document.uri.toString()) {
        post({ type: 'dirty', dirty: false });
      }
    });

    const messageSubscription = webview.onDidReceiveMessage(async (message) => {
      const data = message as { type?: string; [key: string]: unknown };
      switch (data.type) {
        case 'ready':
          await sendInit();
          break;
        case 'edit':
          await this.applyEdit(document, String(data.text ?? ''));
          lastFromWebview = document.getText();
          post({ type: 'dirty', dirty: true });
          postPreview();
          break;
        case 'save': {
          await this.applyEdit(document, String(data.text ?? ''));
          lastFromWebview = document.getText();
          let ok = false;
          try {
            ok = await document.save();
          } catch {
            ok = false;
          }
          post({ type: 'saved', ok });
          post({ type: 'dirty', dirty: document.isDirty });
          break;
        }
        case 'mode':
          await this.context.workspaceState.update(MODE_KEY, data.mode);
          break;
        case 'copy':
          await vscode.env.clipboard.writeText(String(data.text ?? ''));
          break;
        case 'openExternal':
          await vscode.env.openExternal(vscode.Uri.parse(String(data.href ?? '')));
          break;
        case 'openLocal':
          await this.openLocal(document, String(data.href ?? ''));
          break;
        default:
          break;
      }
    });

    panel.onDidDispose(() => {
      if (previewTimer) {
        clearTimeout(previewTimer);
      }
      changeSubscription.dispose();
      configSubscription.dispose();
      saveSubscription.dispose();
      messageSubscription.dispose();
    });
  }

  private async applyEdit(document: vscode.TextDocument, text: string): Promise<void> {
    if (text === document.getText()) {
      return;
    }
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length),
    );
    edit.replace(document.uri, fullRange, text);
    await vscode.workspace.applyEdit(edit);
  }

  private async openLocal(
    document: vscode.TextDocument,
    href: string,
  ): Promise<void> {
    const clean = href.split('#')[0].split('?')[0].replace(/\\/g, '/');
    const base = vscode.Uri.joinPath(document.uri, '..');
    const target = /^[a-zA-Z]:\//.test(clean)
      ? vscode.Uri.file(clean)
      : vscode.Uri.joinPath(base, clean);
    if (/\.(md|markdown|mdx|mdown|mkd)$/i.test(clean)) {
      await vscode.commands.executeCommand(
        'vscode.openWith',
        target,
        MarkdownEditorProvider.viewType,
      );
      return;
    }
    await vscode.env.openExternal(target);
  }

  private getHtml(
    webview: vscode.Webview,
    document: vscode.TextDocument,
  ): string {
    const nonce = createNonce();
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview.css'),
    );
    const config = readConfig();
    const bodyClass = config.githubStyle ? 'github' : 'plain';
    const csp = [
      "default-src 'none'",
      `img-src ${webview.cspSource} https: http: data:`,
      `media-src ${webview.cspSource} https:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} https: data:`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<link rel="stylesheet" href="${styleUri}" />
<title>${escapeHtml(basename(document))}</title>
</head>
<body class="${bodyClass}" data-view-mode="view">
<div class="app">
  <header class="app-bar">
    <div class="title">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <span class="doc-name" id="doc-name">${escapeHtml(basename(document))}</span>
      <span class="dirty" id="dirty" hidden>•</span>
    </div>
    <div class="spacer"></div>
    <div class="segmented" id="mode-switch" role="group" aria-label="View mode">
      <button type="button" data-mode="view" title="View" aria-label="View">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <button type="button" data-mode="edit" title="Edit" aria-label="Edit">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
      </button>
    </div>
    <button class="icon-btn" id="save" title="Save" aria-label="Save">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
    </button>
  </header>
  <div class="body">
    <main class="content">
      <section class="editor-pane">
        <div class="editor-host" id="editor-host"></div>
      </section>
      <section class="preview-pane">
        <article class="markdown-body" id="preview" style="--content-width: ${config.contentWidth}px"></article>
      </section>
    </main>
  </div>
  <footer class="status-bar">
    <span class="status-path" id="status-path"></span>
    <span class="status-info" id="status-info"></span>
  </footer>
</div>
<script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function createNonce(): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
