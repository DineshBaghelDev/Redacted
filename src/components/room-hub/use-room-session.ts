import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Screen } from "./constants";

export function useRoomSession(nickname: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const createRoom = useMutation(api.sessions.create);
  const joinRoom = useMutation(api.sessions.join);
  const setReady = useMutation(api.sessions.setReady);
  const startRoom = useMutation(api.sessions.start);

  const [screen, setScreen] = useState<Screen>("menu");
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoomCode, setJoinedRoomCode] = useState("");
  const [showRoom, setShowRoom] = useState(false);
  const [freshStartCase, setFreshStartCase] = useState("");
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const room = useQuery(
    api.sessions.get,
    joinedRoomCode ? { roomCode: joinedRoomCode } : "skip",
  );

  async function createOrJoin(action: "create" | "join") {
    if (!isLoaded || !isSignedIn) {
      setError("Still signing in. Try again in a moment.");
      return;
    }

    setIsWorking(true);
    setError("");

    try {
      const result =
        action === "create"
          ? await createRoom({ nickname })
          : await joinRoom({ roomCode, nickname });
      if (!result.roomCode) {
        setError(
          "message" in result
            ? result.message
            : "No room found with that code. Check it and try again.",
        );
        return;
      }
      setJoinedRoomCode(result.roomCode);
      setRoomCode(result.roomCode);
      setShowRoom(true);
      setScreen("menu");
    } catch (caught) {
      setError(
        action === "join"
          ? "No room found with that code. Check it and try again."
          : caught instanceof Error
            ? caught.message
            : "Something went wrong.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function toggleReady() {
    if (!joinedRoomCode) return;
    await setReady({ roomCode: joinedRoomCode, isReady: !room?.meReady });
  }

  async function startInvestigation() {
    if (!joinedRoomCode || !room?.allReady) return;
    await startRoom({ roomCode: joinedRoomCode });
    openBrief();
  }

  async function copyRoomCode() {
    await navigator.clipboard.writeText(joinedRoomCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1200);
  }

  function closeJoin() {
    setScreen("menu");
    setRoomCode("");
    setError("");
  }

  function leaveRoom() {
    setShowRoom(false);
    setJoinedRoomCode("");
    setRoomCode("");
  }

  function openBrief() {
    setShowRoom(false);
    setScreen("loading");
    window.setTimeout(() => setScreen("brief"), 1200);
  }

  return {
    screen,
    setScreen,
    roomCode,
    setRoomCode,
    joinedRoomCode,
    room,
    showRoom,
    freshStartCase,
    setFreshStartCase,
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
  };
}