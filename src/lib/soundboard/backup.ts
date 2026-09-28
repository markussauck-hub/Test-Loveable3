import type { BoardSettings, SoundRecord } from "./types";

export type BackupFile = {
  format: "soundboard-backup";
  version: 1;
  settings: BoardSettings;
  sounds: Array<Omit<SoundRecord, "blob"> & { data: string }>;
};

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(data: string, mime: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function createBackup(
  sounds: SoundRecord[],
  settings: BoardSettings,
): Promise<BackupFile> {
  const items = await Promise.all(
    sounds.map(async ({ blob, ...rest }) => ({ ...rest, data: await blobToBase64(blob) })),
  );
  return { format: "soundboard-backup", version: 1, settings, sounds: items };
}

export function parseBackup(json: unknown): { sounds: SoundRecord[]; settings: BoardSettings } {
  const file = json as BackupFile;
  if (!file || file.format !== "soundboard-backup" || !Array.isArray(file.sounds)) {
    throw new Error("Ungültige Sicherungsdatei");
  }
  const sounds = file.sounds.map((s) => {
    const { data, ...rest } = s;
    return { ...rest, blob: base64ToBlob(data, rest.mime || "audio/mpeg") } as SoundRecord;
  });
  return { sounds, settings: file.settings };
}
