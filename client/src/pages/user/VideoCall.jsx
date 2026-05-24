import React, { useEffect, useRef, useState } from "react";
import { MessageSquare, Mic, MicOff, PhoneOff, Video, VideoOff, X } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../hooks/useAuth";
import { createSocket } from "../../lib/socket";
import guestUserImage from "../../assets/guest-user.svg";
import AppointmentChat from "../../components/appointment/AppointmentChat";
import { getSafeErrorMessage } from "../../utils/errorMessages";

const buildIceServers = () => {
  const servers = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
  const { VITE_TURN_URL: url, VITE_TURN_USERNAME: username, VITE_TURN_CREDENTIAL: credential } = import.meta.env;
  if (url && username && credential) servers.push({ urls: [url], username, credential });
  return servers;
};

const VideoCall = () => {
  const { accessToken, user } = useAuth();
  const isDoctor = user?.role === "doctor";
  const { appointmentId: rawId } = useParams();
  const [searchParams] = useSearchParams();
  const appointmentId = Number(rawId);

  // Resolve participant details dynamically
  const participantName = isDoctor
    ? (searchParams.get("patient"))
    : (searchParams.get("participant"));
  const participantImage = isDoctor
    ? (searchParams.get("patientImage") || "")
    : (searchParams.get("participantImage") || "");

  const [status, setStatus] = useState("waiting");
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [remoteIsCameraOff, setRemoteIsCameraOff] = useState(false);
  const [remoteIsMuted, setRemoteIsMuted] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const roomIdRef = useRef("");
  const tokenRef = useRef(accessToken);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  const iceCandidateQueueRef = useRef([]);

  const isMutedRef = useRef(false);
  const isCameraOffRef = useRef(false);

  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);
  useEffect(() => { document.title = `${isDoctor ? "Video Chat" : "Video Call"} – ${participantName}`; }, [isDoctor, participantName]);

  const cleanup = () => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (remoteStreamRef.current) { remoteStreamRef.current.getTracks().forEach(t => t.stop()); remoteStreamRef.current = null; }
    iceCandidateQueueRef.current = [];
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setHasRemoteVideo(false);
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const getPeerConnection = () => {
    if (pcRef.current) return pcRef.current;
    pcRef.current = new RTCPeerConnection({ iceServers: buildIceServers() });

    pcRef.current.onicecandidate = (e) => {
      if (e.candidate && socketRef.current && roomIdRef.current) {
        socketRef.current.emit("ice-candidate", { roomId: roomIdRef.current, candidate: e.candidate });
      }
    };

    pcRef.current.ontrack = (e) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      remoteStreamRef.current.addTrack(e.track);
      setHasRemoteVideo(true);
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };

    return pcRef.current;
  };

  const getLocalStream = async () => {
    if (!localStreamRef.current) {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    return localStreamRef.current;
  };

  const setupPeerWithMedia = async () => {
    const stream = await getLocalStream();
    const conn = getPeerConnection();
    const existing = new Set(conn.getSenders().map(s => s.track?.id).filter(Boolean));
    stream.getTracks().forEach(t => { if (!existing.has(t.id)) conn.addTrack(t, stream); });
    return conn;
  };

  const sendOffer = async () => {
    if (!pcRef.current || !socketRef.current || !roomIdRef.current) return;
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current.emit("offer", { roomId: roomIdRef.current, offer });
  };

  const flushIceCandidateQueue = async () => {
    const queue = iceCandidateQueueRef.current.splice(0);
    for (const c of queue) {
      if (pcRef.current) {
        try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch { }
      }
    }
  };

  const handleCallEnd = () => {
    if (isDoctor && socketRef.current && roomIdRef.current) {
      socketRef.current.emit("leave-room", { roomId: roomIdRef.current });
    }
    cleanup();
    setStatus("ended");
    setTimeout(() => window.close(), 1200);
  };

  const endCall = async () => {
    if (!isDoctor && socketRef.current && roomIdRef.current) {
      socketRef.current.emit("leave-room", { roomId: roomIdRef.current });
    }
    if (Number.isInteger(appointmentId)) {
      try { await api.post(`/video-call/end/${appointmentId}`); } catch { }
    }
    handleCallEnd();
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const next = !isMutedRef.current;
    isMutedRef.current = next;

    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !next; });

    if (pcRef.current) {
      pcRef.current.getSenders()
        .filter(s => s.track?.kind === "audio")
        .forEach(s => { if (s.track) s.track.enabled = !next; });
    }
    setIsMuted(next);
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit("toggle-media", {
        roomId: roomIdRef.current,
        isCameraOff: isCameraOffRef.current,
        isMuted: next,
      });
    }
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const next = !isCameraOffRef.current;
    isCameraOffRef.current = next;
    localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !next; });
    setIsCameraOff(next);
    if (socketRef.current && roomIdRef.current) {
      socketRef.current.emit("toggle-media", {
        roomId: roomIdRef.current,
        isCameraOff: next,
        isMuted: isMutedRef.current,
      });
    }
  };

  useEffect(() => {
    if (!Number.isInteger(appointmentId) || !accessToken) return;

    let active = true;
    let socket = null;
    let roomId = "";

    const init = async () => {
      setLoading(true);
      setError("");

      try {
        await getLocalStream();
      } catch {
        setError("Camera/mic permission denied. Allow access and reopen.");
        setLoading(false);
        return;
      }

      try {
        const roomRes = await api.get(`/video-call/room/${appointmentId}`);
        roomId = roomRes?.data?.room_id || "";

        if (isDoctor) {
          if (!roomId) throw new Error("Room not found.");
          const callStatus = String(roomRes?.data?.call_status || "").toLowerCase();
          if (callStatus !== "ongoing" && callStatus !== "call-started") {
            const startRes = await api.post(`/video-call/start/${appointmentId}`);
            roomId = startRes?.data?.room_id || roomId;
          }
        } else {
          if (!roomId) throw new Error("Room not found. The doctor may not have started the call yet.");
          const callStatus = String(roomRes?.data?.call_status || "waiting").toLowerCase();
          if (callStatus === "call-ended") {
            if (active) setStatus("ended");
            setLoading(false);
            return;
          }
          if (callStatus === "call-started" || callStatus === "ongoing") setStatus("ongoing");
        }

        roomIdRef.current = roomId;
        await setupPeerWithMedia();
      } catch (err) {
        if (active) setError(getSafeErrorMessage(err, "Failed to initialize call."));
        setLoading(false);
        return;
      }

      socket = createSocket();
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join-room", { roomId, token: tokenRef.current });
      });

      socket.on("join-success", ({ participants } = {}) => {
        if (!active) return;
        if (Number(participants) >= 2) {
          if (isDoctor) {
            setStatus("ongoing");
          } else {
            socket.emit("offer-request", { roomId });
          }
        }
      });

      socket.on("peer-present", async () => {
        if (!active) return;
        if (isDoctor) {
          await setupPeerWithMedia();
          await sendOffer();
        } else {
          socket.emit("offer-request", { roomId });
        }
      });

      socket.on("peer-joined", () => {
        if (!active) return;
        setStatus("ongoing");
        if (!isDoctor) {
          socket.emit("offer-request", { roomId });
        }
      });

      socket.on("offer-request", async () => {
        if (!active) return;
        await setupPeerWithMedia();
        await sendOffer();
      });

      socket.on("offer", async (offer) => {
        if (!active) return;
        const conn = await setupPeerWithMedia();
        await conn.setRemoteDescription(new RTCSessionDescription(offer));
        await flushIceCandidateQueue();
        const answer = await conn.createAnswer();
        await conn.setLocalDescription(answer);
        socket.emit("answer", { roomId, answer });
        setStatus("ongoing");
      });

      socket.on("answer", async (answer) => {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          await flushIceCandidateQueue();
        }
        setStatus("ongoing");
      });

      socket.on("ice-candidate", async (candidate) => {
        if (!candidate) return;
        if (pcRef.current?.remoteDescription) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch { }
        } else {
          iceCandidateQueueRef.current.push(candidate);
        }
      });

      socket.on("media-state", ({ isCameraOff: remoteCamera, isMuted: remoteMuted } = {}) => {
        if (!active) return;
        setRemoteIsCameraOff(!!remoteCamera);
        setRemoteIsMuted(!!remoteMuted);
      });

      socket.on("peer-left", () => { if (active) handleCallEnd(); });
      socket.on("call-ended", () => { if (active) handleCallEnd(); });
      socket.on("join-error", (payload) => { if (active) setError(getSafeErrorMessage(payload, "Failed to join room.")); });

      if (active) setLoading(false);
    };

    init();

    return () => {
      active = false;
      if (socket) {
        if (roomId) socket.emit("leave-room", { roomId });
        socket.disconnect();
      }
      socketRef.current = null;
      roomIdRef.current = "";
      cleanup();
    };
  }, [accessToken, appointmentId]);

  if (!Number.isInteger(appointmentId)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <p className="text-sm font-semibold text-rose-300">Invalid appointment ID.</p>
      </main>
    );
  }

  if (status === "ended") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg font-semibold text-slate-100">Call has ended</p>
          <p className="text-sm text-slate-400">This window will close automatically.</p>
          <button
            type="button"
            onClick={() => window.close()}
            className="mt-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            Close Window
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* Remote video (full screen) */}
      <div className="relative flex-1">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-screen w-full object-cover" />

        {!hasRemoteVideo && !remoteIsCameraOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
            <div className="flex flex-col items-center">
              <img
                src={participantImage || guestUserImage}
                alt={participantName}
                className="h-28 w-28 rounded-full border border-white/20 object-cover"
              />
              <p className="mt-5 text-base font-semibold text-slate-100">{participantName}</p>
              <p className="mt-1 text-sm text-slate-300">
                {loading
                  ? (isDoctor ? "Starting call..." : "Connecting...")
                  : status === "ongoing"
                    ? "Connecting video..."
                    : isDoctor
                      ? `Waiting for ${participantName} to join...`
                      : `Waiting for ${participantName} to start the call...`}
              </p>
            </div>
          </div>
        )}

        {/* Remote camera-off overlay — fully opaque so no video bleeds through */}
        {remoteIsCameraOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-800">
                <VideoOff className="h-9 w-9 text-slate-400" />
              </div>
              <p className="text-base font-semibold text-slate-200">{participantName} turned off their video</p>
            </div>
          </div>
        )}

        {/* Remote muted badge */}
        {remoteIsMuted && !remoteIsCameraOff && (
          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5">
            <MicOff className="h-4 w-4 text-rose-400" />
            <span className="text-xs font-semibold text-rose-300">{participantName} is muted</span>
          </div>
        )}

        {error && (
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md bg-rose-600/90 px-3 py-2 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Local preview (PiP) */}
        <div className={`absolute right-5 overflow-hidden rounded-xl border border-white/25 bg-black shadow-lg transition-all ${chatOpen ? "bottom-24 h-32 w-48" : "bottom-5 h-44 w-64"}`}>
          {/* Always keep video mounted so srcObject ref is never lost */}
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full -scale-x-100 object-cover"
          />
          {/* Camera-off overlay sits on top of the video element */}
          {isCameraOff && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black">
              <VideoOff className="h-7 w-7 text-slate-500" />
              <span className="px-2 text-center text-[11px] font-medium text-slate-400">You turned off your video</span>
            </div>
          )}
          <span className="absolute left-2 top-2 rounded bg-black/55 px-2 py-0.5 text-[11px] font-semibold">You</span>
        </div>

        {/* Controls */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/55 px-4 py-2 backdrop-blur-sm">
          <button type="button" onClick={toggleMute}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${isMuted ? "bg-rose-500/80 text-white" : "bg-white/10 hover:bg-white/20"}`}
            title={isMuted ? "Unmute" : "Mute"}>
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          <button type="button" onClick={toggleCamera}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${isCameraOff ? "bg-rose-500/80 text-white" : "bg-white/10 hover:bg-white/20"}`}
            title={isCameraOff ? "Turn on camera" : "Turn off camera"}>
            {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </button>

          <button type="button" onClick={endCall}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-600"
            title={isDoctor ? "End call" : "Leave call"}>
            <PhoneOff className="h-5 w-5" />
          </button>

          <div className="mx-1 h-6 w-px bg-white/20" />

          <button type="button" onClick={() => setChatOpen(!chatOpen)}
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full ${chatOpen ? "bg-white text-slate-900" : "bg-white/10 hover:bg-white/20"}`}
            title="Toggle chat">
            <MessageSquare className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Chat sidebar */}
      {chatOpen && (
        <aside className="flex h-screen w-80 shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white text-slate-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Chat with {participantName}</p>
            <button type="button" onClick={() => setChatOpen(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <AppointmentChat
              appointmentId={appointmentId}
              participantName={participantName}
              canSend={status !== "ended"}
              heightClassName="h-full"
              className="rounded-none border-0"
              emptyMessage="No messages yet. Send the first one!"
            />
          </div>
        </aside>
      )}
    </main>
  );
};

export default VideoCall;
