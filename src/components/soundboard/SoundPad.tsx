import { GripVertical, Pencil, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { padColorVar, type SoundRecord } from "@/lib/soundboard/types";

type Props = {
  sound: SoundRecord;
  playing: boolean;
  progress: number;
  onPlay: () => void;
  onStop: () => void;
  onEdit: () => void;
  onToggleActive: (value: boolean) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  dragging: boolean;
};

export function SoundPad({
  sound,
  playing,
  progress,
  onPlay,
  onStop,
  onEdit,
  onToggleActive,
  onDragStart,
  onDragOver,
  onDrop,
  dragging,
}: Props) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ ["--pad" as string]: padColorVar(sound.color) }}
      className={cn(
        "sound-module group relative flex aspect-square min-h-52 select-none flex-col items-center justify-between p-3 text-center",
        playing && "is-playing",
        dragging && "opacity-40",
        !sound.active && "is-inactive",
      )}
    >
      <span className="module-screw module-screw-nw" aria-hidden="true" />
      <span className="module-screw module-screw-ne" aria-hidden="true" />

      <div className="relative z-10 flex w-full items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Checkbox
            checked={sound.active}
            aria-label="Sound aktiv"
            onCheckedChange={(v) => onToggleActive(Boolean(v))}
            className="panel-checkbox"
          />
          <GripVertical className="size-4 cursor-grab text-muted-foreground" aria-label="Zum Sortieren ziehen" />
        </div>
        <div className="flex items-center gap-1">
          {sound.hotkey ? (
            <span className="key-cap" title="Tastenkürzel">
              {sound.hotkey}
            </span>
          ) : null}
          <button
            type="button"
            aria-label="Bearbeiten"
            onClick={onEdit}
            className="service-button"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      <div className="lamp-housing" aria-hidden="true">
        <span className="jewel-lamp" />
        <span className="lamp-caption">BETRIEB</span>
      </div>

      <button
        type="button"
        aria-label={`${sound.name} abspielen`}
        onClick={onPlay}
        className="push-button focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring"
      >
        <span className="push-button-face" />
      </button>

      <div className="nameplate w-full">
        <p className="line-clamp-2">{sound.name}</p>
      </div>

      <div className="vu-bank" aria-label={`Fortschritt ${Math.round(progress * 100)} Prozent`}>
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={index}
            className={cn("vu-lamp", progress * 10 > index && "is-lit")}
          />
        ))}
      </div>

      {playing ? (
        <button type="button" onClick={onStop} className="pad-stop-button">
          <Square className="size-3" /> STOP
        </button>
      ) : (
        <span className="pad-stop-placeholder">KANAL {String(sound.order + 1).padStart(2, "0")}</span>
      )}
    </div>
  );
}
