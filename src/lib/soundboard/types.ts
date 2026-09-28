export type SoundRecord = {
  id: string;
  name: string;
  color: string;
  volume: number; // 0..1
  active: boolean;
  hotkey: string | null;
  order: number;
  mime: string;
  blob: Blob;
};

export type BoardSettings = {
  masterVolume: number;
  allowOverlap: boolean;
  onlySelected: boolean;
};

export const DEFAULT_SETTINGS: BoardSettings = {
  masterVolume: 0.9,
  allowOverlap: true,
  onlySelected: false,
};

export const PAD_COLORS = [
  { id: "violet", label: "Schwarz" },
  { id: "blue", label: "Kobaltblau" },
  { id: "teal", label: "Patinagrün" },
  { id: "green", label: "Flaschengrün" },
  { id: "amber", label: "Bernstein" },
  { id: "orange", label: "Creme" },
  { id: "rose", label: "Signalrot" },
  { id: "slate", label: "Stahlgrau" },
] as const;

export function padColorVar(color: string) {
  return `var(--pad-${color}, var(--pad-violet))`;
}
