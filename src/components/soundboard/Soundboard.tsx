import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Layers, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { SoundPad } from "./SoundPad";
import { SoundEditDialog } from "./SoundEditDialog";
import * as db from "@/lib/soundboard/db";
import { createBackup, parseBackup } from "@/lib/soundboard/backup";
import { saveTextFile } from "@/lib/soundboard/save-file";
import {
  DEFAULT_SETTINGS,
  PAD_COLORS,
  type BoardSettings,
  type SoundRecord,
} from "@/lib/soundboard/types";

const ACCEPT = "audio/*,.mp3,.wav,.ogg,.m4a";

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function baseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

export function Soundboard() {
  const [sounds, setSounds] = useState<SoundRecord[]>([]);
  const [settings, setSettings] = useState<BoardSettings>(DEFAULT_SETTINGS);
  const [query, setQuery] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [playingIds, setPlayingIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<SoundRecord | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const audiosRef = useRef<Map<string, HTMLAudioElement[]>>(new Map());
  const urlsRef = useRef<Map<string, string>>(new Map());
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rows, saved] = await Promise.all([db.getAllSounds(), db.getSettings()]);
        if (cancelled) return;
        setSounds(rows);
        setSettings(saved);
      } catch {
        toast.error("Gespeicherte Sounds konnten nicht geladen werden.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const urlFor = useCallback((sound: SoundRecord) => {
    let url = urlsRef.current.get(sound.id);
    if (!url) {
      url = URL.createObjectURL(sound.blob);
      urlsRef.current.set(sound.id, url);
    }
    return url;
  }, []);

  const stopSound = useCallback((id: string) => {
    const list = audiosRef.current.get(id);
    list?.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    audiosRef.current.delete(id);
    setPlayingIds((prev) => prev.filter((x) => x !== id));
    setProgress((p) => ({ ...p, [id]: 0 }));
  }, []);

  const stopAll = useCallback(() => {
    for (const id of Array.from(audiosRef.current.keys())) stopSound(id);
  }, [stopSound]);

  const play = useCallback(
    (sound: SoundRecord) => {
      const current = settingsRef.current;
      if (current.allowOverlap) stopSound(sound.id);
      else stopAll();

      const audio = new Audio(urlFor(sound));
      audio.volume = Math.min(1, Math.max(0, sound.volume * current.masterVolume));
      audio.ontimeupdate = () => {
        if (audio.duration) {
          setProgress((p) => ({ ...p, [sound.id]: audio.currentTime / audio.duration }));
        }
      };
      const finish = () => {
        const list = (audiosRef.current.get(sound.id) ?? []).filter((a) => a !== audio);
        if (list.length) {
          audiosRef.current.set(sound.id, list);
        } else {
          audiosRef.current.delete(sound.id);
          setPlayingIds((prev) => prev.filter((x) => x !== sound.id));
          setProgress((p) => ({ ...p, [sound.id]: 0 }));
        }
      };
      audio.onended = finish;
      audio.onerror = finish;
      audiosRef.current.set(sound.id, [...(audiosRef.current.get(sound.id) ?? []), audio]);
      setPlayingIds((prev) => (prev.includes(sound.id) ? prev : [...prev, sound.id]));
      void audio.play().catch(() => {
        finish();
        toast.error("Sound konnte nicht abgespielt werden.");
      });
    },
    [stopAll, stopSound, urlFor],
  );

  const persistSettings = useCallback((next: BoardSettings) => {
    setSettings(next);
    void db.saveSettings(next);
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter(
        (f) => f.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name),
      );
      if (!files.length) {
        toast.error("Keine unterstützten Audiodateien gefunden.");
        return;
      }
      const startOrder = sounds.length;
      const created: SoundRecord[] = files.map((file, i) => ({
        id: newId(),
        name: baseName(file.name),
        color: PAD_COLORS[(startOrder + i) % PAD_COLORS.length]!.id,
        volume: 1,
        active: true,
        hotkey: null,
        order: startOrder + i,
        mime: file.type || "audio/mpeg",
        blob: file,
      }));
      await db.putSounds(created);
      setSounds((prev) => [...prev, ...created]);
      toast.success(`${created.length} Sound(s) hinzugefügt`);
    },
    [sounds.length],
  );

  const updateSound = useCallback((sound: SoundRecord) => {
    setSounds((prev) => prev.map((s) => (s.id === sound.id ? sound : s)));
    void db.putSound(sound);
  }, []);

  const removeSound = useCallback(
    (id: string) => {
      stopSound(id);
      const url = urlsRef.current.get(id);
      if (url) {
        URL.revokeObjectURL(url);
        urlsRef.current.delete(id);
      }
      setSounds((prev) => prev.filter((s) => s.id !== id));
      void db.deleteSound(id);
      setEditing(null);
      toast.success("Sound gelöscht");
    },
    [stopSound],
  );

  const reorder = useCallback((fromId: string, toId: string) => {
    setSounds((prev) => {
      const from = prev.findIndex((s) => s.id === fromId);
      const to = prev.findIndex((s) => s.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      const reindexed = next.map((s, i) => ({ ...s, order: i }));
      void db.putSounds(reindexed);
      return reindexed;
    });
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sounds.filter(
      (s) => (!settings.onlySelected || s.active) && (!q || s.name.toLowerCase().includes(q)),
    );
  }, [sounds, query, settings.onlySelected]);

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea|select/i.test(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (key === "ESCAPE") {
        stopAll();
        return;
      }
      const match = sounds.find((s) => s.hotkey && s.hotkey.toUpperCase() === key && s.active);
      if (match) {
        e.preventDefault();
        play(match);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sounds, play, stopAll]);

  useEffect(() => {
    const urls = urlsRef.current;
    const audios = audiosRef.current;
    return () => {
      audios.forEach((list) => list.forEach((a) => a.pause()));
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const exportBoard = useCallback(async () => {
    try {
      const backup = await createBackup(sounds, settings);
      const saved = await saveTextFile(
        `schalttafel-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(backup),
      );
      if (saved) toast.success("Sicherung exportiert");
    } catch {
      toast.error("Export fehlgeschlagen");
    }
  }, [sounds, settings]);

  const importBoard = useCallback(
    async (file: File) => {
      try {
        const parsed = parseBackup(JSON.parse(await file.text()));
        stopAll();
        urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        urlsRef.current.clear();
        await db.clearSounds();
        await db.putSounds(parsed.sounds);
        const nextSettings = { ...DEFAULT_SETTINGS, ...parsed.settings };
        await db.saveSettings(nextSettings);
        setSounds([...parsed.sounds].sort((a, b) => a.order - b.order));
        setSettings(nextSettings);
        toast.success("Sicherung importiert");
      } catch {
        toast.error("Import fehlgeschlagen – ungültige Datei");
      }
    },
    [stopAll],
  );

  return (
    <div
      className="control-room min-h-screen bg-background"
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files")) {
          e.preventDefault();
          setIsDropTarget(true);
        }
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setIsDropTarget(false);
      }}
      onDrop={(e) => {
        if (e.dataTransfer.files?.length) {
          e.preventDefault();
          setIsDropTarget(false);
          void addFiles(e.dataTransfer.files);
        }
      }}
    >
      <header className="control-header relative z-20 border-b border-border">
        <span className="panel-screw panel-screw-nw" aria-hidden="true" />
        <span className="panel-screw panel-screw-ne" aria-hidden="true" />
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="title-plate">
              <span className="plate-screw plate-screw-left" aria-hidden="true" />
              <div>
                <p className="title-kicker">TONSTEUERUNG · WERK III</p>
                <h1>SCHALTTAFEL</h1>
              </div>
              <div className="serial-block">
                <span>NR. 54-0815</span>
                <span>BAUJAHR 1954</span>
              </div>
              <span className="plate-screw plate-screw-right" aria-hidden="true" />
            </div>

            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <Button className="panel-button" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" /> Tonträger einlegen
              </Button>
              <Button className="emergency-stop" variant="destructive" onClick={stopAll}>
                <span className="emergency-cap" aria-hidden="true" />
                <span>NOT-AUS</span>
              </Button>
              <Button className="panel-button" variant="secondary" onClick={exportBoard}>
                <Download className="size-4" /> Sicherung
              </Button>
              <Button className="panel-button" variant="secondary" onClick={() => importInputRef.current?.click()}>
                <Layers className="size-4" /> Einlesen
              </Button>
            </div>
          </div>

          <div className="instrument-grid grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_minmax(260px,1fr)_minmax(330px,1.35fr)]">
            <div className="search-console relative">
              <span className="instrument-label">KANAL-SUCHE</span>
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Bezeichnung eingeben …"
                className="console-input h-11 pl-9"
              />
            </div>
            <div className="master-console">
              <div className="knob-scale" style={{ ["--level" as string]: `${settings.masterVolume * 270 - 135}deg` }}>
                <span className="tick tick-1" /><span className="tick tick-2" /><span className="tick tick-3" />
                <span className="tick tick-4" /><span className="tick tick-5" /><span className="tick tick-6" />
                <span className="rotary-knob"><span /></span>
              </div>
              <div className="master-readout">
                <span className="instrument-label">HAUPTPEGEL</span>
                <strong>{Math.round(settings.masterVolume * 100)}</strong><small>%</small>
              </div>
              <Slider
                className="master-slider"
                aria-label="Hauptlautstärke"
                value={[settings.masterVolume * 100]}
                max={100}
                step={1}
                onValueChange={([v]) => persistSettings({ ...settings, masterVolume: (v ?? 0) / 100 })}
              />
            </div>
            <div className="switch-bank">
              <div className="toggle-station">
                <Switch
                  id="overlap"
                  checked={settings.allowOverlap}
                  onCheckedChange={(v) => persistSettings({ ...settings, allowOverlap: v })}
                  className="bat-switch"
                />
                <Label htmlFor="overlap">
                  <span className="switch-state">AUS · EIN</span>
                  {settings.allowOverlap ? "MEHRFACHBETRIEB" : "EINZELBETRIEB"}
                </Label>
              </div>
              <div className="toggle-station">
                <Switch
                  id="only-selected"
                  checked={settings.onlySelected}
                  onCheckedChange={(v) => persistSettings({ ...settings, onlySelected: v })}
                  className="bat-switch"
                />
                <Label htmlFor="only-selected">
                  <span className="switch-state">ALLE · WAHL</span>
                  NUR AKTIVE KANÄLE
                </Label>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {loading ? (
          <p className="status-plate py-20 text-center text-muted-foreground">SCHALTTAFEL WIRD GEPRÜFT …</p>
        ) : sounds.length === 0 ? (
          <Button
            variant="ghost"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "patch-panel flex h-auto min-h-80 w-full flex-col items-center justify-center gap-5 whitespace-normal px-6 py-16 text-center",
              isDropTarget && "is-drop-target",
            )}
          >
            <span className="reel-port">
              <Upload className="size-10" />
            </span>
            <span className="patch-title">TONTRÄGER EINLEGEN</span>
            <span className="max-w-lg text-sm text-muted-foreground">
              MP3-, WAV-, OGG- oder M4A-Dateien hier ablegen oder zur Auswahl drücken.
              Die Aufnahmen verbleiben in diesem Gerät.
            </span>
            <span className="slot-label">
              DATEIEN AUSWÄHLEN
            </span>
            <span className="panel-screw panel-screw-sw" aria-hidden="true" />
            <span className="panel-screw panel-screw-se" aria-hidden="true" />
          </Button>
        ) : (
          <>
            {isDropTarget ? (
              <p className="drop-notice mb-4 px-4 py-6 text-center text-sm text-primary">
                TONTRÄGER JETZT ABLEGEN
              </p>
            ) : null}
            {visible.length === 0 ? (
              <p className="py-20 text-center text-muted-foreground">
                Keine Sounds gefunden. Suche oder Filter anpassen.
              </p>
            ) : (
              <div className="pad-grid grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visible.map((sound) => (
                  <SoundPad
                    key={sound.id}
                    sound={sound}
                    playing={playingIds.includes(sound.id)}
                    progress={progress[sound.id] ?? 0}
                    onPlay={() => play(sound)}
                    onStop={() => stopSound(sound.id)}
                    onEdit={() => setEditing(sound)}
                    onToggleActive={(v) => updateSound({ ...sound, active: v })}
                    onDragStart={() => setDragId(sound.id)}
                    onDragOver={(e) => {
                      if (dragId) e.preventDefault();
                    }}
                    onDrop={() => {
                      if (dragId) reorder(dragId, sound.id);
                      setDragId(null);
                    }}
                    dragging={dragId === sound.id}
                  />
                ))}
              </div>
            )}
            <p className="instruction-strip mt-8 text-center text-xs text-muted-foreground">
              BEDIENHINWEIS · DIREKTWAHLTASTEN MÖGLICH · ESC = NOT-AUS · KANÄLE ZUM SORTIEREN ZIEHEN
            </p>
          </>
        )}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) void addFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importBoard(file);
          e.target.value = "";
        }}
      />

      <SoundEditDialog
        sound={editing}
        onClose={() => setEditing(null)}
        onSave={(s) => {
          updateSound(s);
          setEditing(null);
        }}
        onDelete={removeSound}
      />
    </div>
  );
}
