import type { ApiEstudio } from '../shared/contracts/ipc';

declare global {
  interface Window {
    api: ApiEstudio;
    bootstrap: {
      Modal: new (
        elemento: Element,
        opcoes?: Record<string, unknown>,
      ) => {
        show(): void;
        hide(): void;
        dispose(): void;
      };
    };
  }
}

export {};
