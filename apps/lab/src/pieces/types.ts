/** One row in a piece's controls window. */
export type Control =
  | {
      type: "range";
      key: string;
      label: string;
      min: number;
      max: number;
      step: number;
      value: number;
    }
  | { type: "toggle"; key: string; label: string; value: boolean }
  | { type: "select"; key: string; label: string; options: string[]; value: string }
  | { type: "action"; key: string; label: string };

export type ControlValue = number | boolean | string;

export type PieceOptions = {
  reducedMotion: boolean;
  /** One or two short lines for the top-right corner; the piece calls it whenever they change. */
  onReadout(text: string): void;
};

export type PieceHandle = {
  controls: Control[];
  /** Ranges take a number, toggles a boolean, selects one of their options, actions `true`. */
  set(key: string, value: ControlValue): void;
  setSound(on: boolean): void;
  dispose(): void;
};
