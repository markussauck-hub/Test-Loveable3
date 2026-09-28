import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { PAD_COLORS, padColorVar, type SoundRecord } from "@/lib/soundboard/types";

type Props = {
  sound: SoundRecord | null;
  onClose: () => void;
  onSave: (sound: SoundRecord) => void;
  onDelete: (id: string) => void;
};

export function SoundEditDialog({ sound, onClose, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<SoundRecord | null>(sound);

  useEffect(() => setDraft(sound), [sound]);

  if (!draft) return null;

  return (
    <Dialog open={Boolean(sound)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="service-dialog max-w-md">
        <span className="service-clip" aria-hidden="true" />
        <DialogHeader>
          <p className="inspection-kicker">Prüfkarte · Tonkreis {String(draft.order + 1).padStart(2, "0")}</p>
          <DialogTitle>SERVICEKLAPPE</DialogTitle>
          <DialogDescription>Kenndaten des Tonkreises einstellen.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="sound-name">Bezeichnung</Label>
            <Input
              id="sound-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Signalfarbe</Label>
            <div className="flex flex-wrap gap-2">
              {PAD_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  onClick={() => setDraft({ ...draft, color: c.id })}
                  style={{ backgroundColor: padColorVar(c.id) }}
                  className={cn(
                    "signal-swatch size-10 rounded-full ring-2 ring-transparent transition",
                    draft.color === c.id && "is-selected ring-ring",
                  )}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Pegelsteller: {Math.round(draft.volume * 100)}%</Label>
            <Slider
              className="metal-fader"
              value={[draft.volume * 100]}
              max={100}
              step={1}
              onValueChange={([v]) => setDraft({ ...draft, volume: (v ?? 0) / 100 })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sound-key">Direktwahltaste</Label>
            <Input
              id="sound-key"
              placeholder="z. B. 1 oder A"
              value={draft.hotkey ?? ""}
              onChange={(e) => {
                const key = e.target.value.trim().slice(-1).toUpperCase();
                setDraft({ ...draft, hotkey: key || null });
              }}
            />
          </div>

          <div className="toggle-station flex items-center justify-between border border-border p-3">
            <div>
              <Label htmlFor="sound-active">KREIS AKTIV</Label>
              <p className="mt-1 text-xs text-muted-foreground">AUS / EIN</p>
            </div>
            <Switch
              id="sound-active"
              checked={draft.active}
              onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              className="bat-switch"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="destructive" onClick={() => onDelete(draft.id)}>
            <Trash2 className="size-4" /> Ausbauen
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              Schließen
            </Button>
            <Button onClick={() => onSave(draft)}>Eintragen</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
