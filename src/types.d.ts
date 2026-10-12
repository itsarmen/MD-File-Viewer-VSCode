declare module 'markdown-it-task-lists';
declare module '*.css';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): Record<string, unknown> | undefined;
  setState(state: Record<string, unknown>): void;
}

declare function acquireVsCodeApi(): VsCodeApi;
