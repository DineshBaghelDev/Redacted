"use client";

import { useState } from "react";
import { isMuted, play, setMuted } from "../../../lib/sound";
import { VolumeSliders } from "../volume-sliders";
import { isLargeText, setLargeText } from "../../../lib/text-size";
import { input, menuButton, panel } from "../constants";
import { CharacterPortrait } from "../character-portrait";
import { ControlIcon } from "../control-icon";

type SettingsPanelProps = {
  detectiveName: string;
  onChange: (value: string) => void;
  canSave: boolean;
  onBack: () => void;
  onSave: () => void;
};

export function SettingsPanel({
  detectiveName,
  onChange,
  canSave,
  onBack,
  onSave,
}: SettingsPanelProps) {
  const [muted, setMutedState] = useState(() => typeof window !== "undefined" && isMuted());
  const [largeText, setLargeTextState] = useState(() => typeof window !== "undefined" && isLargeText());
  return (
    <form
      className={`${panel} w-full max-w-md`}
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <h2 className="mb-5 text-3xl uppercase text-[#e4e6d8]">Detective profile</h2>
      <div className="mb-4 flex items-center gap-4">
        <CharacterPortrait className="w-16" id={detectiveName.trim() || "Detective"} />
        <label className="text-xl uppercase text-[#c8d8d2]" htmlFor="profile-name">Detective name</label>
      </div>
      <input
        className={`${input} w-full`}
        id="profile-name"
        onChange={(event) => onChange(event.target.value)}
        value={detectiveName}
      />
      <section aria-label="Audio" className="mt-5 border-t border-[#6f9f98]/35 pt-4 text-[#e4e6d8]">
        <button className="game-control-button flex min-h-11 w-full items-center justify-center gap-2 text-sm uppercase" onClick={() => { const next = !muted; setMuted(next); setMutedState(next); if (!next) play("ping"); }} type="button"><ControlIcon name="speaker" />Music &amp; effects · {muted ? "Off" : "On"}</button>
        {!muted ? <VolumeSliders className="mt-3" /> : null}
      </section>
      <section aria-label="Reading" className="mt-5 border-t border-[#6f9f98]/35 pt-4 text-[#e4e6d8]">
        <button aria-pressed={largeText} className="game-control-button flex min-h-11 w-full items-center justify-center gap-2 text-sm uppercase" onClick={() => { setLargeText(!largeText); setLargeTextState(!largeText); }} type="button">Large text · {largeText ? "On" : "Off"}</button>
      </section>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button className={menuButton} onClick={onBack} type="button">Back to menu</button>
        <button className={`${menuButton} text-[#e8ac51]`} disabled={!canSave} type="submit">Save</button>
      </div>
    </form>
  );
}
