/* MD File Viewer
 * Author:     Amiran Kimadze (itsarmen)
 * GitHub:     https://github.com/itsarmen
 * Email:      amoswaper@gmail.com
 * Web:        https://xrow.asia
 */

const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** Shared logging so both builds report errors clearly. */
function logger(name) {
  return {
    name: `logger-${name}`,
    setup(build) {
      build.onStart(() => console.log(`[esbuild:${name}] build started`));
      build.onEnd((result) => {
        const errors = result.errors ?? [];
        if (errors.length > 0) {
          console.error(`[esbuild:${name}] build failed`);
          for (const error of errors) {
            console.error(
              `  ${error.text}${
                error.location ? ` (${error.location.file}:${error.location.line})` : ''
              }`,
            );
          }
          return;
        }
        console.log(`[esbuild:${name}] build finished`);
      });
    },
  };
}

/** The extension host bundle (Node.js, VS Code API is external). */
const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'node',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  logLevel: 'silent',
  plugins: [logger('extension')],
};

/** The webview client bundle (browser, includes the WYSIWYG editor + CSS). */
const webviewConfig = {
  entryPoints: ['src/webview/main.ts'],
  bundle: true,
  format: 'iife',
  minify: production,
  sourcemap: !production,
  sourcesContent: false,
  platform: 'browser',
  target: ['es2021'],
  outfile: 'dist/webview.js',
  logLevel: 'silent',
  loader: {
    '.svg': 'dataurl',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.gif': 'dataurl',
    '.woff': 'dataurl',
    '.woff2': 'dataurl',
    '.ttf': 'dataurl',
    '.eot': 'dataurl',
  },
  plugins: [logger('webview')],
};

async function main() {
  const contexts = await Promise.all([
    esbuild.context(extensionConfig),
    esbuild.context(webviewConfig),
  ]);

  if (watch) {
    await Promise.all(contexts.map((context) => context.watch()));
  } else {
    await Promise.all(contexts.map((context) => context.rebuild()));
    await Promise.all(contexts.map((context) => context.dispose()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
