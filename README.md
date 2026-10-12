<!--
  MD File Viewer
  Author:     Amiran Kimadze (itsarmen)
  GitHub:     https://github.com/itsarmen
  Email:      amoswaper@gmail.com
  Web:        https://xrow.asia
-->

<p align="center">
  <img src="media/icon.png" alt="MD File Viewer icon" width="128" height="128">
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=ITSARMEN.md-file-viewer">
    <img src="https://vsmarketplacebadges.dev/version-short/ITSARMEN.md-file-viewer.svg" alt="Marketplace version">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ITSARMEN.md-file-viewer">
    <img src="https://vsmarketplacebadges.dev/installs-short/ITSARMEN.md-file-viewer.svg" alt="Marketplace installs">
  </a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ITSARMEN.md-file-viewer">
    <img src="https://vsmarketplacebadges.dev/rating-short/ITSARMEN.md-file-viewer.svg" alt="Marketplace rating">
  </a>
</p>

# MD File Viewer for VS Code

[**Install from the VS Code Marketplace →**](https://marketplace.visualstudio.com/items?itemName=ITSARMEN.md-file-viewer)

A **full custom editor** for Markdown — the VS Code edition of the
[MD File Viewer](https://github.com/itsarmen/MD-File-Viewer-Software) desktop app.
Double-click any `.md` file and it opens directly in a GitHub-style (GFM) viewer
with a **WYSIWYG editor**, a **Preview / Split / Edit** switcher, a **documentsidebar**, and a live **word / line counter** — all styled with GitHub's Primer
light/dark palette.

## Features

* **Opens automatically** — `.md`, `.markdown`, `.mdx`, `.mdown` and `.mkd`
    files open in MD File Viewer by default. Switch back to the plain text editor
    any time with **Reopen Editor With…**.
* **Three view modes** — **Preview**, **Split** and **Edit**, chosen from the
    header, remembering your last choice.
* **WYSIWYG editing** — a true rich-text surface (Toast UI Editor) with a
    formatting toolbar, plus GitHub-accurate rendering in preview mode.
* **GitHub preview** — headings, tables, task lists, blockquotes, fenced code
    blocks with syntax highlighting and images rendered the way GitHub does.
* **Document sidebar** — the folder's Markdown files, with quick open/create.
* **Copy button on code blocks** — one click copies a fenced code block.
* **Smart links** — external links open in your browser; links to local
    Markdown files open right in the viewer.
* **Formatting commands** — bold, italic, strikethrough, inline code, code
    block, headings, quote, lists, task list, links, images and horizontal rules
    from the Command Palette (for the plain text editor).
* **Keyboard shortcuts** — `Ctrl+B` (bold), `Ctrl+I` (italic) in Markdown files.
* **Status bar** — word, line and character counts for the active Markdown file.

## Usage

1. Open any `.md`, `.markdown`, `.mdx`, `.mdown` or `.mkd` file — it opens in
    MD File Viewer automatically.
2. Switch between **Preview**, **Split** and **Edit** in the header.
3. Use **Reopen Editor With…** to fall back to the plain text editor, or run
    **MD File Viewer: Open with MD File Viewer** to force it.

## Commands

| Command | Description |
| ------- | ----------- |
| `MD File Viewer: Open with MD File Viewer` | Open the file in the custom editor. |
| `MD File Viewer: Open Preview to the Side` | Open the custom editor in a split column. |
| Formatting commands | Bold, Italic, Strikethrough, Inline Code, Code Block, Heading 1–3, Normal Text, Quote, Bulleted/Numbered/Task lists, Link, Image, Horizontal Rule. |

## Settings

| Setting | Default | Description |
| ------- | ------- | ----------- |
| `mdFileViewer.preview.lineBreaks` | `false` | Render single line breaks as `<br>`. |
| `mdFileViewer.preview.githubStyle` | `true` | Use GitHub's Primer palette. |
| `mdFileViewer.preview.contentWidth` | `980` | Maximum content width in pixels. |
| `mdFileViewer.statusBar.enabled` | `true` | Show the word/line counter. |

## Development

```bash
npm install
npm run compile     # bundle dist/extension.js + dist/webview.js
npm run watch       # rebuild on change
npm run check-types # tsc --noEmit
npm test            # run the integration smoke tests
```

Press `F5` in VS Code to launch an Extension Development Host, then open a
Markdown file.

## Build a VSIX

```bash
npm run package   # production bundle
npm run vsix      # produces md-file-viewer-1.0.0.vsix
```

Install it with **Extensions: Install from VSIX…** or
`code --install-extension md-file-viewer-1.0.0.vsix`.


<img width="1560" height="756" alt="image" src="https://github.com/user-attachments/assets/6afcd031-b743-463c-8d8f-da897fcfbdc1" />


## Author

**Amiran Kimadze** (*itsarmen*)

* GitHub: [@itsarmen](https://github.com/itsarmen)
* Email: [amoswaper@gmail.com](mailto:amoswaper@gmail.com)
* Web: [https://xrow.asia](https://xrow.asia)

## License

MIT © Amiran Kimadze (itsarmen). See [LICENSE](LICENSE).
