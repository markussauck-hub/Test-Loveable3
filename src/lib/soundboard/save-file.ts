/**
 * Speichert eine Textdatei.
 * - In der Desktop-App (Tauri): nativer "Speichern unter"-Dialog + Schreiben über plugin-fs.
 * - Im Browser: klassischer Download über <a download>.
 * Gibt false zurück, wenn der Nutzer den Dialog abgebrochen hat.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function saveTextFile(fileName: string, content: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({
      defaultPath: fileName,
      filters: [{ name: "Schalttafel-Sicherung", extensions: ["json"] }],
    });
    if (!path) return false;
    await writeTextFile(path, content);
    return true;
  }

  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
