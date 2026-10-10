"use client";

import { useUser } from "@clerk/nextjs";
import { go } from "../../lib/game-nav";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRoomSession } from "./use-room-session";
import { JoinModal } from "./screens/join-modal";
import { MainMenuScreen } from "./screens/main-menu";
import { NameEntryScreen } from "./screens/name-entry";
import { PreviousGamesScreen } from "./screens/previous-games";
import { RoomLobbyModal } from "./screens/room-lobby-modal";
import { SettingsPanel } from "./screens/settings-panel";
import { CaseBriefScreen } from "./screens/status-screens";
import { BureauScreen, preloadStations } from "./screens/bureau-screen";

const DETECTIVE_NAME_KEY = "redacted.detectiveName";
const subscribeToNothing = () => () => {};

export function RoomHub() {
  const { user } = useUser();
  // localStorage is not available during server rendering, so the saved
  // detective name is only known after the client mounts. Render nothing until
  // then so the name dialog never flashes on reload.
  const [detectiveName, setDetectiveName] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(DETECTIVE_NAME_KEY) ?? "",
  );
  const [savedDetectiveName, setSavedDetectiveName] = useState(() =>
    typeof window === "undefined" ? "" : window.localStorage.getItem(DETECTIVE_NAME_KEY) ?? "",
  );
  const [hasDetectiveName, setHasDetectiveName] = useState(() =>
    typeof window !== "undefined" && Boolean(window.localStorage.getItem(DETECTIVE_NAME_KEY)?.trim()),
  );
  const isMounted = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const fallbackName = user?.firstName || user?.username || "Detective";
  const nickname = (hasDetectiveName ? savedDetectiveName : detectiveName).trim() || fallbackName;

  // All hooks must be called before any conditional return.
  const {
    screen,
    setScreen,
    roomCode,
    setRoomCode,
    joinedRoomCode,
    room,
    activeRooms,
    showRoom,
    error,
    setError,
    copiedCode,
    isWorking,
    workingAction,
    isLoaded,
    isSignedIn,
    createOrJoin,
    toggleReady,
    startInvestigation,
    copyRoomCode,
    closeJoin,
    leaveRoom,
    continueRoom,
  } = useRoomSession(nickname);

  // While the detectives read the brief, fetch the game screens so "Begin investigation" opens instantly.
  useEffect(() => {
    if (screen === "brief") preloadStations();
  }, [screen]);

  if (!isMounted) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-[#071014]">
        <p className="game-title animate-pulse text-4xl">REDACTED</p>
        <p className="text-xs uppercase tracking-[0.3em] text-[#c8d8d2]/60">Opening the case files...</p>
      </div>
    );
  }

  function saveDetectiveName() {
    const savedName = detectiveName.trim() || fallbackName;
    window.localStorage.setItem(DETECTIVE_NAME_KEY, savedName);
    setSavedDetectiveName(savedName);
    setDetectiveName(savedName);
    setHasDetectiveName(true);
    setScreen("menu");
  }

  if (!hasDetectiveName) {
    return (
      <NameEntryScreen
        canSubmit={Boolean(nickname.trim())}
        detectiveName={detectiveName}
        fallbackName={fallbackName}
        onChange={setDetectiveName}
        onSubmit={saveDetectiveName}
      />
    );
  }

  if (screen === "brief") {
    return (
      <CaseBriefScreen
        error={error}
        // Cold open: the case starts at the crime scene, not at a menu of stations.
        onBegin={() => go(`/lobby/${joinedRoomCode}/place`)}
        onLeave={leaveRoom}
        roomCode={joinedRoomCode}
      />
    );
  }

  if (screen === "bureau") {
    return <BureauScreen error={error} onLeave={leaveRoom} />;
  }

  return (
    <div className={`relative z-10 flex h-full w-full flex-col gap-6 px-5 py-8 sm:px-12 lg:flex-row lg:items-start lg:gap-12 lg:py-12 ${screen === "previous" ? "game-archive-scene overflow-y-auto" : "overflow-hidden"}`}>
      {screen === "menu" || screen === "join" || showRoom ? (
        <MainMenuScreen
          activeRooms={screen === "menu" ? activeRooms : undefined}
          error={screen === "menu" ? error : ""}
          isLoaded={isLoaded}
          isSignedIn={isSignedIn}
          onJoin={() => {
            setError("");
            setRoomCode("");
            setScreen("join");
          }}
          onContinue={continueRoom}
          onPrevious={() => { setError(""); setScreen("previous"); }}
          onSettings={() => setScreen("settings")}
        />
      ) : null}

      {screen === "join" ? (
        <JoinModal
          error={error}
          isLoaded={isLoaded}
          isSignedIn={isSignedIn}
          isWorking={isWorking}
          onClose={closeJoin}
          onJoin={() => createOrJoin("join")}
          onRoomCodeChange={setRoomCode}
          roomCode={roomCode}
        />
      ) : null}

      {screen === "settings" ? (
        <SettingsPanel
          canSave={Boolean(nickname.trim())}
          detectiveName={detectiveName}
          onChange={setDetectiveName}
          onBack={() => { setDetectiveName(savedDetectiveName); setScreen("menu"); }}
          onSave={saveDetectiveName}
        />
      ) : null}

      {screen === "previous" ? (
        <PreviousGamesScreen
          error={error}
          isWorking={isWorking}
          onBack={() => { setError(""); setScreen("menu"); }}
          onPlay={(game, deadlineMinutes) => createOrJoin("create", { ...game, deadlineMinutes })}
        />
      ) : null}

      {showRoom ? (
        <RoomLobbyModal
          copiedCode={copiedCode}
          error={error}
          joinedRoomCode={joinedRoomCode}
          nickname={nickname}
          onCopyCode={copyRoomCode}
          onLeave={leaveRoom}
          onStart={startInvestigation}
          onToggleReady={toggleReady}
          room={room}
          workingAction={workingAction}
        />
      ) : null}

    </div>
  );
}
