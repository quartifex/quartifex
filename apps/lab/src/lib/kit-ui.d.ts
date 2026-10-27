export type CueName =
  | "hover"
  | "press"
  | "on"
  | "off"
  | "pop"
  | "open"
  | "close"
  | "ok"
  | "like"
  | "tab"
  | "error";

export type KitUi = {
  applySetting: (key: string, value: boolean | number | string) => void;
  sfx: (name: CueName, arg?: number, force?: boolean) => void;
};

/** Sound engine, settings panel and custom cursor. Needs `[data-settings]`, `#cur` and `#curtip` in the DOM. */
export function initKitUi(): KitUi | null;
