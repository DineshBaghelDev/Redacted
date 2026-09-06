"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRoomSession } from "./use-room-session";
import { FreshStartModal } from "./screens/fresh-start-modal";
import { JoinModal } from "./screens/join-modal";
import { MainMenuScreen } from "./screens/main-menu";
import { NameEntryScreen } from "./screens/name-entry";
import { PreviousGamesScreen } from "./screens/previous-games";
import { RoomLobbyModal } from "./screens/room-lobby-modal";
import { SettingsPanel } from "./screens/settings-panel";
import { CaseBriefScreen, LoadingScreen } from "./screens/status-screens";

const DETECTIVE_NAME_KEY = "redacted.detectiveName";

export function RoomHub() {
  const { user } = useUser();
  // localStorage is not available during server rendering, so the saved
  // detective name is only known after the client mounts. Render nothing until
  // then so the name dialog never flashes on reload.
  const [detectiveName, setDetectiveName] = useState("");
  const [hasDetectiveName, setHasDetectiveName] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const savedName = window.localStorage.getItem(DETECTIVE_NAME_KEY) ?? "";
    setDetectiveName(savedName);
    setHasDetectiveName(Boolean(savedName.trim()));
    setIsMounted(true);
  }, []);

  const fallbackName = user?.firstName || user?.username || "Detective";
  const nickname = detectiveName.trim() || fallbackName;

  // All hooks must be called before any conditional return.
  const {
    screen,
    setScreen,
    roomCode,
    setRoomCode,
    joinedRoomCode,
    room,
    showRoom,
    freshStartCase,
    setFreshStartCase,
    activeCaseId,
    error,
    setError,
    copiedCode,
    isWorking,
    isLoaded,
    isSignedIn,
    createOrJoin,
    toggleReady,
    startInvestigation,
    copyRoomCode,
    closeJoin,
    leaveRoom,
    openBrief,
  } = useRoomSession(nickname);

  if (!isMounted) {
    return null;
  }

  function saveDetectiveName() {
    const savedName = nickname.trim() || "Detective";
    window.localStorage.setItem(DETECTIVE_NAME_KEY, savedName);
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

  if (screen === "loading") {
    return <LoadingScreen />;
  }

  if (screen === "brief") {
    return <CaseBriefScreen caseId={activeCaseId} />;
  }

  return (
    <div className="flex w-full flex-col gap-8 lg:flex-row lg:items-start">
      <MainMenuScreen
        error={screen === "menu" ? error : ""}
        isLoaded={isLoaded}
        isSignedIn={isSignedIn}
        isWorking={isWorking}
        onCreate={() => createOrJoin("create")}
        onJoin={() => {
          setError("");
          setRoomCode("");
          setScreen("join");
        }}
        onPrevious={() => setScreen("previous")}
        onSettings={() => setScreen("settings")}
      />

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
          onSave={saveDetectiveName}
        />
      ) : null}

      {screen === "previous" ? (
        <PreviousGamesScreen
          onContinue={openBrief}
          onFreshStart={setFreshStartCase}
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
        />
      ) : null}

      {freshStartCase ? (
        <FreshStartModal
          onCancel={() => setFreshStartCase("")}
          onConfirm={() => {
            openBrief(freshStartCase);
            setFreshStartCase("");
          }}
        />
      ) : null}
    </div>
  );
}
