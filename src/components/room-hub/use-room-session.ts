import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Screen } from "./constants";

type WorkingAction = "create" | "join" | "ready" | "start" | "copy" | "leave" | null;

function screenForPath(pathname: string): Screen {
  if (pathname === "/join") return "join";
  if (pathname === "/previous") return "previous";
  if (pathname === "/settings") return "settings";
  if (pathname === "/game" || pathname.startsWith("/game/")) return "bureau";
  if (/^\/lobby\/[^/]+\/(?:bureau(?:\/.*)?|map|case)$/.test(pathname)) return "bureau";
  if (/^\/lobby\/[^/]+\/brief$/.test(pathname)) return "brief";
  return "menu";
}

function pathForScreen(screen: Screen, roomCode: string) {
  if (screen === "join") return "/join";
  if (screen === "previous") return "/previous";
  if (screen === "settings") return "/settings";
  if (screen === "brief") return roomCode ? `/lobby/${roomCode}/brief` : "/";
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
  const createReplay = useMutation(api.sessions.createReplay);
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
  const [workingAction, setWorkingAction] = useState<WorkingAction>(null);
  const isWorking = workingAction !== null;

  const room = useQuery(
    api.sessions.get,
    joinedRoomCode && isLoaded && isSignedIn ? { roomCode: joinedRoomCode } : "skip",
  );
  const activeRooms = useQuery(
    api.sessions.listMine,
    isLoaded && isSignedIn ? {} : "skip",
  );
  const roomStarted = showRoom && room?.status === "playing";

  useEffect(() => {
    if (!roomStarted || !joinedRoomCode) return;
    router.replace(`/lobby/${joinedRoomCode}/brief`);
  }, [joinedRoomCode, roomStarted, router]);

  function navigateTo(nextScreen: Screen) {
    if (nextScreen === "brief" || nextScreen === "bureau") setShowRoom(false);
    setScreen(nextScreen);
    router.push(pathForScreen(nextScreen, joinedRoomCode));
  }

  async function createOrJoin(action: "create" | "join", selection?: { generationJobId: Id<"generationJobs">; caseId?: Id<"cases"> }) {
    if (!isLoaded || !isSignedIn) {
      setError("Still signing in. Try again in a moment.");
      return;
    }
    setWorkingAction(action);
    setError("");

    try {
      const result = action === "create"
        ? selection?.caseId
          ? await createReplay({ nickname, caseId: selection.caseId })
          : selection?.generationJobId
            ? await createRoom({ nickname, generationJobId: selection.generationJobId })
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
      setWorkingAction(null);
    }
  }

  async function toggleReady() {
    if (!joinedRoomCode || workingAction) return;
    setWorkingAction("ready");
    setError("");
    try {
      await setReady({ roomCode: joinedRoomCode, isReady: !room?.meReady });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update your ready status.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function startInvestigation() {
    if (!joinedRoomCode || !room?.allReady || workingAction) return;
    setWorkingAction("start");
    setError("");
    try {
      await startRoom({ roomCode: joinedRoomCode });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the investigation.");
    } finally {
      setWorkingAction(null);
    }
  }

  async function copyRoomCode() {
    if (!joinedRoomCode || workingAction) return;
    setWorkingAction("copy");
    setError("");
    try {
      await navigator.clipboard.writeText(joinedRoomCode);
      setCopiedCode(true);
      window.setTimeout(() => setCopiedCode(false), 1200);
    } catch {
      setError("Could not copy the room code. Select it from the room heading instead.");
    } finally {
      setWorkingAction(null);
    }
  }

  function closeJoin() {
    navigateTo("menu");
    setRoomCode("");
    setError("");
  }

  async function leaveRoom() {
    if (!joinedRoomCode || workingAction) return;
    setWorkingAction("leave");
    setError("");
    try {
      await leaveSession({ roomCode: joinedRoomCode });
      setShowRoom(false);
      setJoinedRoomCode("");
      setRoomCode("");
      navigateTo("menu");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not leave the room.");
    } finally {
      setWorkingAction(null);
    }
  }

  function continueRoom(roomCode: string, status: "waiting" | "playing") {
    setJoinedRoomCode(roomCode);
    setRoomCode(roomCode);
    setShowRoom(status === "waiting");
    if (status === "waiting") {
      setScreen("menu");
      router.push(`/lobby/${roomCode}`);
    } else {
      setScreen("bureau");
      router.push(`/lobby/${roomCode}/bureau`);
    }
  }

  return {
    screen: roomStarted ? "brief" : screen,
    setScreen: navigateTo,
    roomCode,
    setRoomCode,
    joinedRoomCode,
    room,
    activeRooms,
    showRoom: showRoom && !roomStarted,
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
  };
}
