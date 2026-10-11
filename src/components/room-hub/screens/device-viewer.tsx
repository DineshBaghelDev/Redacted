"use client";

import { useState } from "react";
import { InvestigationIcon } from "../investigation-icon";
import { ControlIcon } from "../control-icon";
import { PinButton } from "../pin-button";
import { play } from "../../../lib/sound";

export type DeviceData = {
  type: "phone" | "laptop";
  files: Array<{ id: string; title: string; body: string }>;
  calls: Array<{ id: string; time: number; direction: "incoming" | "outgoing"; durationSeconds: number; otherParty: string }>;
  messages: Array<{ id: string; time: number; direction: "incoming" | "outgoing"; body: string; otherParty: string }>;
};

type App = "home" | "messages" | "calls" | "files";

function timeLabel(minutes: number) {
  const withinDay = ((minutes % 1440) + 1440) % 1440;
  return `Day ${Math.floor(minutes / 1440) + 1} · ${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(withinDay % 60).padStart(2, "0")}`;
}

export function DeviceViewer({ title, data, onBack, onPin, isPinned, busy, error }: {
  title: string;
  data: DeviceData;
  onBack: () => void;
  onPin: (type: "device_file" | "call" | "message", id: string) => void;
  isPinned: (type: "device_file" | "call" | "message", id: string) => boolean;
  busy: boolean;
  error?: string;
}) {
  const [app, setApp] = useState<App>("home");
  const [openId, setOpenId] = useState<string | null>(null);
  const files = app === "files" ? data.files : [];
  const calls = app === "calls" ? data.calls : [];
  const messages = app === "messages" ? data.messages : [];
  const file = files.find((row) => row.id === openId);
  const call = calls.find((row) => row.id === openId);
  const message = messages.find((row) => row.id === openId);

  function openApp(next: App) {
    play("open");
    setApp(next);
    setOpenId(null);
  }

  return <section aria-label={`${title} records`} className="game-records-scene absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
    <header className="game-station-header flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6">
      <InvestigationIcon className="size-10" name={data.type === "laptop" ? "file" : "device"} />
      <div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-widest text-[#a5c6bb]">Recovered {data.type}</p><h2 className="break-words text-lg uppercase sm:text-2xl">{title}</h2></div>
      <button aria-label="Put it down" className="game-control-button flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs uppercase" onClick={() => { play("close"); onBack(); }} title="Put it down" type="button"><ControlIcon name="back" /><span className="hidden sm:inline">Put it down</span></button>
    </header>
    {error ? <p className="mx-3 mt-3 border border-red-400 bg-red-950 p-3 text-sm text-red-50" role="alert">{error}</p> : null}
    {data.type === "laptop" ? <Laptop busy={busy} files={data.files} isPinned={(id) => isPinned("device_file", id)} onPin={(id) => onPin("device_file", id)} title={title} /> : (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
      <div className={`mx-auto flex min-h-[30rem] flex-col border-[10px] border-[#20383a] bg-[#09191b] shadow-[8px_10px_0_#0008] ${data.type === "phone" ? "max-w-[25rem] rounded-[1.5rem]" : "max-w-4xl"}`}>
        {data.type === "phone" ? <div aria-hidden="true" className="mx-auto mt-2 h-1 w-14 rounded-full bg-[#446269]" /> : null}
        <div className="flex items-center justify-between border-b border-[#45635d] px-4 py-3 text-xs uppercase text-[#a5c6bb]"><span>{data.type === "phone" ? "Phone" : "Laptop"}</span><span>Case records</span></div>
        <div className="flex-1 p-4 sm:p-6">
          {app === "home" ? <>
            <p className="text-xs uppercase tracking-[0.2em] text-[#a5c6bb]">Open an app</p>
            <div className="mt-6 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-3">
              {(data.type === "phone" ? ["messages", "calls"] : ["files"]).map((name) => <button className="flex min-h-28 flex-col items-center justify-center gap-2 text-sm uppercase text-[#e4e6d8] hover:text-[#e8ac51]" key={name} onClick={() => openApp(name as App)} type="button"><span aria-hidden="true" className={`device-app-icon device-app-icon--${name}`} /><span>{name}</span></button>)}
            </div>
          </> : <>
            <div className="flex items-center gap-3 border-b border-[#45635d] pb-3"><button className="min-h-10 px-1 text-xs uppercase text-[#e8ac51]" onClick={() => openId ? setOpenId(null) : openApp("home")} type="button">← {openId ? "List" : "Apps"}</button><h3 className="text-lg uppercase">{app}</h3></div>
            {file || call || message ? <article className="py-5">
              <p className="text-xs uppercase tracking-widest text-[#a5c6bb]">{file ? "File" : call ? "Call log" : "Message"}</p>
              <h4 className="mt-2 break-words text-lg uppercase text-[#e8ac51]">{file?.title ?? call?.otherParty ?? message?.otherParty}</h4>
              {call ? <p className="mt-3 text-sm">{call.direction === "incoming" ? "Incoming" : "Outgoing"} · {timeLabel(call.time)} · {Math.ceil(call.durationSeconds / 60)} min</p> : null}
              {message ? <><p className="mt-3 text-xs uppercase text-[#a5c6bb]">{message.direction === "incoming" ? "Received" : "Sent"} · {timeLabel(message.time)}</p><p className="mt-5 whitespace-pre-wrap break-words border-l-2 border-[#e8ac51] pl-4 text-base leading-relaxed">{message.body}</p></> : null}
              {file ? <p className="mt-5 whitespace-pre-wrap break-words border-l-2 border-[#e8ac51] pl-4 text-base leading-relaxed">{file.body}</p> : null}
              <PinButton busy={busy} className="mt-6" onClick={() => onPin(file ? "device_file" : call ? "call" : "message", openId!)} pinned={isPinned(file ? "device_file" : call ? "call" : "message", openId!)} />
            </article> : <div className="mt-3 divide-y divide-[#45635d]/60">
              {files.map((row) => <button className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left text-sm" key={row.id} onClick={() => setOpenId(row.id)} type="button"><span className="min-w-0 break-words">{row.title}</span><span className="text-[#e8ac51]">Open →</span></button>)}
              {calls.map((row) => <button className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left text-sm" key={row.id} onClick={() => setOpenId(row.id)} type="button"><span className="min-w-0"><span className="block break-words">{row.direction === "incoming" ? "From" : "To"} {row.otherParty}</span><span className="block text-xs text-[#a5c6bb]">{timeLabel(row.time)}</span></span><span className="text-[#e8ac51]">Open →</span></button>)}
              {messages.map((row) => <button className="flex min-h-16 w-full items-center justify-between gap-3 py-3 text-left text-sm" key={row.id} onClick={() => setOpenId(row.id)} type="button"><span className="min-w-0"><span className="block break-words">{row.direction === "incoming" ? "From" : "To"} {row.otherParty}</span><span className="block text-xs text-[#a5c6bb]">{timeLabel(row.time)}</span></span><span className="text-[#e8ac51]">Open →</span></button>)}
              {!files.length && !calls.length && !messages.length ? <p className="py-6 text-sm text-[#a5c6bb]">No {app} on this {data.type}.</p> : null}
            </div>}
          </>}
        </div>
        {data.type === "phone" ? <div aria-hidden="true" className="mx-auto mb-3 h-1 w-20 bg-[#446269]" /> : null}
      </div>
    </div>
    )}
  </section>;
}

/** A recovered laptop: bezel and webcam, a file window with the list beside the open document, and a keyboard deck. */
function Laptop({ title, files, busy, isPinned, onPin }: { title: string; files: DeviceData["files"]; busy: boolean; isPinned: (id: string) => boolean; onPin: (id: string) => void }) {
  const [openId, setOpenId] = useState(files[0]?.id ?? null);
  const file = files.find((row) => row.id === openId);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="relative rounded-t-xl border-[14px] border-b-[18px] border-[#1a2729] bg-[#0b1a1c] shadow-[8px_10px_0_#0008] sm:border-[18px] sm:border-b-[22px]">
          <span aria-hidden="true" className="absolute -top-[11px] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-[#3c5a5c] sm:-top-[13px]" />
          <div className="laptop-desktop flex min-h-[26rem] flex-col">
            <div className="flex items-center gap-2 border-b border-[#2c4446] bg-[#13282a] px-3 py-2 text-xs">
              <span aria-hidden="true" className="flex gap-1.5"><i className="size-2.5 rounded-full bg-[#b85c4c]" /><i className="size-2.5 rounded-full bg-[#d0a35a]" /><i className="size-2.5 rounded-full bg-[#5f9a7c]" /></span>
              <span className="ml-2 truncate font-mono text-[#a5c6bb]">Files — {title}</span>
              <span className="ml-auto font-mono text-[#a5c6bb]/60">{files.length} {files.length === 1 ? "item" : "items"}</span>
            </div>
            <div className="grid min-h-0 flex-1 sm:grid-cols-[14rem_minmax(0,1fr)]">
              <ul className="border-b border-[#2c4446] bg-[#0e2022] p-2 sm:border-b-0 sm:border-r" aria-label="Files">
                {files.map((row) => (
                  <li key={row.id}>
                    <button aria-pressed={row.id === openId} className="flex min-h-10 w-full items-center gap-2 px-2 text-left font-mono text-xs text-[#c8d8d2] hover:bg-[#1c3436] aria-pressed:bg-[#e8ac51]/15 aria-pressed:text-[#f1c987]" onClick={() => setOpenId(row.id)} type="button">
                      <span aria-hidden="true" className="h-4 w-3 shrink-0 border border-current [clip-path:polygon(0_0,70%_0,100%_25%,100%_100%,0_100%)]" />
                      <span className="min-w-0 break-words">{row.title}</span>
                    </button>
                  </li>
                ))}
                {!files.length ? <li className="p-2 font-mono text-xs text-[#a5c6bb]/70">This folder is empty.</li> : null}
              </ul>
              <article className="min-w-0 p-4 sm:p-6">
                {file ? (
                  <>
                    <h3 className="break-words font-mono text-sm uppercase tracking-wide text-[#f1c987]">{file.title}</h3>
                    <p className="mt-4 whitespace-pre-wrap break-words bg-[#e9e2cf] p-4 font-mono text-sm leading-relaxed text-[#211d17] shadow-[3px_3px_0_#0006]">{file.body}</p>
                    <PinButton busy={busy} className="mt-5" onClick={() => onPin(file.id)} pinned={isPinned(file.id)} />
                  </>
                ) : <p className="font-mono text-sm text-[#a5c6bb]/70">Open a file from the list.</p>}
              </article>
            </div>
          </div>
        </div>
        <div aria-hidden="true" className="mx-auto h-5 w-[calc(100%+3rem)] -translate-x-6 bg-[#2a3b3d] [clip-path:polygon(2%_0,98%_0,100%_100%,0_100%)]">
          <span className="mx-auto block h-1.5 w-24 translate-y-1 rounded-b bg-[#1a2729]" />
        </div>
      </div>
    </div>
  );
}
