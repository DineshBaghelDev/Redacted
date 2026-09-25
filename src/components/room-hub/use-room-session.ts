import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Screen } from "./constants";

function screenForPath(pathname: string): Screen {
  if (pathname === "/join") return "join";
  if (pathname === "/previous") return "previous";
  if (pathname === "/settings") return "settings";
  if (pathname === "/brief") return "brief";
  if (pathname === "/game/loading") return "loading";
  if (pathname === "/game" || pathname.startsWith("/game/")) return "bureau";
  if (/^\/lobby\/[^/]+\/(?:bureau(?:\/.*)?|map|case)$/.test(pathname)) return "bureau";
  if (/^\/lobby\/[^/]+\/game-loading$/.test(pathname)) return "loading";
  if (/^\/lobby\/[^/]+\/brief$/.test(pathname)) return "brief";
  return "menu";
}

function pathForScreen(screen: Screen, roomCode: string) {
  if (screen === "join") return "/join";
  if (screen === "previous") return "/previous";
  if (screen === "settings") return "/settings";
  if (screen === "loading") return roomCode ? `/lobby/${roomCode}/game-loading` : "/game/loading";
  if (screen === "brief") return roomCode ? `/lobby/${roomCode}/brief` : "/brief";
  if (screen === "bureau") return roomCode ? `/lobby/${roomCode}/bureau` : "/game";
  return "/";
}

function roomCodeForPath(pathname: string) {
  const match = pathname.match(/^\/lobby\/([^/]+)(?:\/|$)/);
  return match ? decodeURIComponent(match[1]).toUpperCase() : "";
}

function isLobbyPath(pathname: string) {
  return /^\/lobby\/[^/]+$/.test(pathname);
}

export function useRoomSession(nickname: string) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const createRoom = useMutation(api.sessions.create);
  const joinRoom = useMutation(api.sessions.join);
  const setReady = useMutation(api.sessions.setReady);
  const startRoom = useMutation(api.sessions.start);
  const leaveSession = useMutation(api.sessions.leave);

  const [screen, setScreen] = useState<Screen>(() => screenForPath(pathname));
  const initialRoomCode = roomCodeForPath(pathname);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [joinedRoomCode, setJoinedRoomCode] = useState(initialRoomCode);
  const [showRoom, setShowRoom] = useState(() => Boolean(initialRoomCode) && isLobbyPath(pathname));
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const room = useQuery(
    api.sessions.get,
    joinedRoomCode && isLoaded && isSignedIn ? { roomCode: joinedRoomCode } : "skip",
  );

  function navigateTo(nextScreen: Screen) {
    setScreen(nextScreen);
    router.push(pathForScreen(nextScreen, joinedRoomCode));
  }

  async function createOrJoin(action: "create" | "join", generationJobId?: Id<"generationJobs">) {
    if (!isLoaded || !isSignedIn) {
      setError("Still signing in. Try again in a moment.");
      return;
    }
    setIsWorking(true);
    setError("");

    try {
      const result = action === "create"
        ? generationJobId
          ? await createRoom({ nickname, generationJobId })
          : { roomCode: "", message: "Choose a case first." }
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
      router.push(`/lobby/${result.roomCode}`);
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
    setError("");
    try {
      await setReady({ roomCode: joinedRoomCode, isReady: !room?.meReady });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your ready status.");
    }
  }

  async function startInvestigation() {
    if (!joinedRoomCode || !room?.allReady) return;
    setError("");
    try {
      await startRoom({ roomCode: joinedRoomCode });
      openBrief();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the investigation.");
    }
  }

  async function copyRoomCode() {
    await navigator.clipboard.writeText(joinedRoomCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1200);
  }

  function closeJoin() {
    navigateTo("menu");
    setRoomCode("");
    setError("");
  }

  async function leaveRoom() {
    if (!joinedRoomCode) return;
    setError("");
    try {
      await leaveSession({ roomCode: joinedRoomCode });
      setShowRoom(false);
      setJoinedRoomCode("");
      setRoomCode("");
      navigateTo("menu");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not leave the room.");
    }
  }

  function openBrief() {
    setShowRoom(false);
    navigateTo("loading");
    window.setTimeout(() => navigateTo("bureau"), 1200);
  }

  return {
    screen,
    setScreen: navigateTo,
    roomCode,
    setRoomCode,
    joinedRoomCode,
    room,
    showRoom,
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
