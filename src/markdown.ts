/*
 * MD File Viewer
 * Author:     Amiran Kimadze (itsarmen)
 * GitHub:     https://github.com/itsarmen
 * Email:      amoswaper@gmail.com
 * Web:        https://xrow.asia
 *
 * GitHub-flavored Markdown rendering, ported from the Flutter app's
 * `github_markdown.dart`. Uses markdown-it for parsing and highlight.js for
 * fenced code blocks, wrapped with a language label and a copy button.
 */

import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/common';
import taskLists from 'markdown-it-task-lists';

export interface RenderEnv {
  /** Resolves a Markdown image/link source into a webview-usable URL. */
  resolveImage: (src: string) => string;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]);
}

/** Highlights a fenced code block, falling back to auto-detection. */
function highlightCode(code: string, language: string): string {
  if (language && hljs.getLanguage(language)) {
    try {
      return hljs.highlight(code, { language, ignoreIllegals: true }).value;
    } catch {
      /* fall through to auto-detection */
    }
  }
  try {
    return hljs.highlightAuto(code).value;
  } catch {
    return escapeHtml(code);
  }
}

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Assigns stable `id`s to headings and `data-line` source markers to
 * block-level tokens so the webview can build anchors and synchronize scroll.
 */
function sourceLinePlugin(md: MarkdownIt): void {
  md.core.ruler.push('md-file-viewer-source-lines', (state) => {
    const seen = new Map<string, number>();
    const tokens = state.tokens;
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      if (token.map && token.nesting !== -1) {
        token.attrSet('data-line', String(token.map[0]));
      }
      if (token.type === 'heading_open') {
        const inline = tokens[index + 1];
        const text = inline?.content ?? '';
        let slug = slugify(text);
        if (!slug) {
          slug = 'section';
        }
        const count = seen.get(slug) ?? 0;
        seen.set(slug, count + 1);
        if (count > 0) {
          slug = `${slug}-${count}`;
        }
        token.attrSet('id', slug);
      }
    }
    return true;
  });
}

export function createRenderer(): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: false,
    highlight: (code, language) => highlightCode(code, language),
  });

  md.use(taskLists, { enabled: false, label: true, labelAfter: true });
  sourceLinePlugin(md);

  // Fenced code blocks: language header + copy button, GitHub-style.
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const info = token.info ? md.utils.unescapeAll(token.info).trim() : '';
    const language = info.split(/\s+/g)[0] ?? '';
    const highlighted = highlightCode(token.content, language);
    const line = token.map ? ` data-line="${token.map[0]}"` : '';
    const label = escapeHtml(language || 'text');
    const languageClass = language ? ` language-${escapeHtml(language)}` : '';
    return (
      `<div class="code-block"${line}>` +
      '<div class="code-block-header">' +
      `<span class="code-block-language">${label}</span>` +
      '<button type="button" class="code-block-copy" aria-label="Copy code">Copy</button>' +
      '</div>' +
      `<pre class="hljs"><code class="hljs${languageClass}">${highlighted}</code></pre>` +
      '</div>\n'
    );
  };

  // Resolve image sources (relative paths, remote URLs) inside the webview.
  const defaultImage = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const attributeIndex = token.attrIndex('src');
    if (attributeIndex >= 0 && token.attrs) {
      const src = token.attrs[attributeIndex][1];
      const renderEnv = env as RenderEnv | undefined;
      if (renderEnv && typeof renderEnv.resolveImage === 'function') {
        token.attrs[attributeIndex][1] = renderEnv.resolveImage(src);
      }
    }
    if (defaultImage) {
      return defaultImage(tokens, index, options, env, self);
    }
    return self.renderToken(tokens, index, options);
  };

  return md;
}

/** Renders Markdown to an HTML fragment suitable for the preview webview. */
export function renderMarkdown(
  md: MarkdownIt,
  source: string,
  env: RenderEnv,
): string {
  return md.render(source, env);
}
