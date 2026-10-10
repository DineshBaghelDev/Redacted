"use client";

import { usePathname } from "next/navigation";
import { go } from "../../../lib/game-nav";
import { useState } from "react";
import { InvestigationIcon } from "../investigation-icon";

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
  const roomCode = usePathname().split("/")[2] ?? "";
  const [app, setApp] = useState<App>("home");
  const [openId, setOpenId] = useState<string | null>(null);
  const files = app === "files" ? data.files : [];
  const calls = app === "calls" ? data.calls : [];
  const messages = app === "messages" ? data.messages : [];
  const file = files.find((row) => row.id === openId);
  const call = calls.find((row) => row.id === openId);
  const message = messages.find((row) => row.id === openId);

  function openApp(next: App) {
    setApp(next);
    setOpenId(null);
  }

  return <section aria-label={`${title} records`} className="game-records-scene absolute inset-0 z-40 flex flex-col overflow-hidden bg-[#071014] text-[#e4e6d8]">
    <header className="game-station-header flex shrink-0 items-center gap-3 px-4 py-3 sm:px-6">
      <InvestigationIcon className="size-10" name="device" />
      <div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-widest text-[#a5c6bb]">Recovered {data.type}</p><h2 className="break-words text-lg uppercase sm:text-2xl">{title}</h2></div>
      <button className="min-h-11 shrink-0 border border-[#6f9f98] px-3 text-xs uppercase" onClick={onBack} type="button">Put it down</button>
    </header>
    {error ? <p className="mx-3 mt-3 border border-red-400 bg-red-950 p-3 text-sm text-red-50" role="alert">{error}</p> : null}
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
              {call || message ? <button className="mt-4 inline-flex min-h-10 items-center gap-2 border-b border-[#6f9f98] text-xs uppercase text-[#a5c6bb] hover:text-[#e8ac51]" onClick={() => go(`/lobby/${roomCode}/bureau/cctv?t=${(call ?? message)!.time}`)} type="button">Check street cameras at this time →</button> : null}
              {file ? <p className="mt-5 whitespace-pre-wrap break-words border-l-2 border-[#e8ac51] pl-4 text-base leading-relaxed">{file.body}</p> : null}
              <button className="mt-6 min-h-11 border border-[#e8ac51] px-4 text-xs uppercase text-[#e8ac51] disabled:opacity-50" disabled={busy || isPinned(file ? "device_file" : call ? "call" : "message", openId!)} onClick={() => onPin(file ? "device_file" : call ? "call" : "message", openId!)} type="button">{isPinned(file ? "device_file" : call ? "call" : "message", openId!) ? "Pinned to clueboard" : "Pin to clueboard"}</button>
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
      {data.type === "laptop" ? <div aria-hidden="true" className="mx-auto h-3 max-w-[calc(56rem+4rem)] border-x-[2rem] border-t-8 border-[#446269] bg-[#16292c]" /> : null}
    </div>
  </section>;
}
