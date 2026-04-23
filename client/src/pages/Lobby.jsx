import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useSession } from "../context/SessionContext";
import { useVoice } from "../context/VoiceContext";
import { Copy, Check, Shield, Zap, Users, Telescope, ArrowRight, Play, Layout, Settings, AlertTriangle, LogOut, Share2, Crown, Bot, Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX, X } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import Toast from "../components/Toast";

const IPL_TEAMS = [
  { id: 'MI', name: 'Mumbai Indians', color: '#004BA0', logoUrl: '/logos/MI.png' },
  { id: 'CSK', name: 'Chennai Super Kings', color: '#FFFF3C', logoUrl: '/logos/CSK.png' },
  { id: 'RCB', name: 'Royal Challengers Bengaluru', color: '#EC1C24', logoUrl: '/logos/RCB.png' },
  { id: 'KKR', name: 'Kolkata Knight Riders', color: '#2E0854', logoUrl: '/logos/KKR.png' },
  { id: 'DC', name: 'Delhi Capitals', color: '#00008B', logoUrl: '/logos/DC.png' },
  { id: 'PBKS', name: 'Punjab Kings', color: '#ED1B24', logoUrl: '/logos/PBKS.png' },
  { id: 'RR', name: 'Rajasthan Royals', color: '#EA1A85', logoUrl: '/logos/RR.png' },
  { id: 'SRH', name: 'Sunrisers Hyderabad', color: '#FF822A', logoUrl: '/logos/SRH.png' },
  { id: 'LSG', name: 'Lucknow Super Giants', color: '#00D1FF', logoUrl: '/logos/LSG.png' },
  { id: 'GT', name: 'Gujarat Titans', color: '#1B2133', logoUrl: '/logos/GT.png' },
  { id: 'DCG', name: 'Deccan Chargers', color: '#D1E1EF', logoUrl: '/logos/DCG.png' },
  { id: 'KTK', name: 'Kochi Tuskers Kerala', color: '#F15A24', logoUrl: '/logos/KTK.png' },
  { id: 'PWI', name: 'Pune Warriors India', color: '#40E0D0', logoUrl: '/logos/PWI.png' },
  { id: 'RPS', name: 'Rising Pune Supergiant', color: '#D11D70', logoUrl: '/logos/RPS.png' },
  { id: 'GL', name: 'Gujarat Lions', color: '#E04F16', logoUrl: '/logos/GL.png' },
];

const Lobby = () => {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  // playerName, userId, and initSession come from the secure session context
  const { playerName, userId, initSession } = useSession();
  const { isJoined: isVoiceJoined, isMuted: isVoiceMuted, joinVoice, leaveVoice, toggleMute, voiceParticipants } = useVoice();
  const [localNameInput, setLocalNameInput] = useState(playerName || "");
  useEffect(() => {
    if (playerName && !localNameInput) {
      setLocalNameInput(playerName);
    }
  }, [playerName]);

  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [timerDuration, setTimerDuration] = useState(10);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  // New state for dynamic team selection during join flow
  const [joinMode, setJoinMode] = useState(false);
  const [availableTeamsForRoom, setAvailableTeamsForRoom] = useState(null);
  // True if the user joined as a spectator intentionally
  const [isSpectatorMode, setIsSpectatorMode] = useState(false);

  // Spectator & Approval states
  const [spectators, setSpectators] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  // Online status map: { [ownerSocketId]: boolean }
  const [onlineMap, setOnlineMap] = useState({});
  const [coHostUserIds, setCoHostUserIds] = useState([]);

  // Confirmation state for leaving room
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Kick confirmation: { socketId, name } or null
  const [kickTarget, setKickTarget] = useState(null);

  const [creatingRoomType, setCreatingRoomType] = useState("private"); // 'private' or 'public'
  const [isDirectJoining, setIsDirectJoining] = useState(false);
  const [isAutoJoining, setIsAutoJoining] = useState(false);

  // New states for Lobby Enhancements
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [localLobbySettings, setLocalLobbySettings] = useState({
    allowSpectators: true,
    maxSpectators: 10,
    teamCount: 15
  });
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const { socket, reconnectWithToken } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const { roomCode: urlRoomCode } = useParams();

  const [copied, setCopied] = useState(false);

  // Action Handlers
  const handleCreate = async () => {
    if (!localNameInput.trim()) return setToast({ message: "Enter your name first", type: "warning" });
    try {
      setIsAutoJoining(true);
      const data = await initSession(localNameInput.trim());
      // Await the new connected socket to avoid the race condition
      const freshSocket = await reconnectWithToken(data.token);
      freshSocket.emit("create_room", { roomType: creatingRoomType });
    } catch (e) {
      setError(e.message || 'Failed to start session');
      setIsAutoJoining(false);
    }
  };

  const handleJoin = async (codeToJoin = roomCodeInput, nameOverride = null) => {
    const finalName = nameOverride || localNameInput;
    if (!finalName.trim() || !codeToJoin)
      return setToast({ message: "Name and Room Code required", type: "warning" });
    try {
      setIsAutoJoining(true);
      const data = await initSession(finalName.trim());
      const freshSocket = await reconnectWithToken(data.token);
      freshSocket.emit("join_room", { roomCode: codeToJoin });
    } catch (e) {
      setError(e.message || 'Failed to start session');
      setIsAutoJoining(false);
    }
  };

  const handleSpectate = async (codeToJoin = roomCodeInput) => {
    if (!localNameInput.trim() || !codeToJoin)
      return setError("Name and Room Code required");
    try {
      setIsAutoJoining(true);
      const data = await initSession(localNameInput.trim());
      const freshSocket = await reconnectWithToken(data.token);
      freshSocket.emit("join_room", { roomCode: codeToJoin, asSpectator: true });
    } catch (e) {
      setError(e.message || 'Failed to start session');
      setIsAutoJoining(false);
    }
  };

  const handleClaimTeam = () => {
    if (!selectedTeamId) return setToast({ message: "Select a franchise first", type: "warning" });
    socket.emit("claim_team", {
      roomCode: roomState?.roomCode,
      teamId: selectedTeamId
    });
  };

  const handleStart = () => {
    socket.emit("start_auction", { roomCode: roomState.roomCode });
  };

  const handleRequestAccess = () => {
    if (!roomCodeInput) return;
    socket.emit("request_participation", { roomCode: roomCodeInput });
    setIsPendingApproval(true);
    setError(""); // Clear error while pending
  };


  // Auto-fill room code if joined via standard link
  useEffect(() => {
    if (urlRoomCode) {
      const code = urlRoomCode.toUpperCase();
      setRoomCodeInput(code);
      setIsDirectJoining(true);
    } else {
      setIsDirectJoining(false);
    }
  }, [urlRoomCode]);

  const handleCopyLink = () => {
    if (!roomState?.roomCode) return;
    const protocol = window.location.protocol;
    const host = window.location.host;
    const link = `${protocol}//${host}/join/${roomState.roomCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsapp = () => {
    if (!roomState?.roomCode) return;
    const protocol = window.location.protocol;
    const host = window.location.host;
    const link = `${protocol}//${host}/join/${roomState.roomCode}`;
    const text = `Join my IPL Auction room!\n\nClick the link to enter: ${link}\n\n(If the link doesn't work locally, open ${protocol}//${host} and join with Room Code: ${roomState.roomCode})`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Auto-join hook when redirecting from /public-rooms
  useEffect(() => {
    if (location.state?.autoJoinRoomCode && playerName && socket) {
      socket.emit("join_room", { roomCode: location.state.autoJoinRoomCode });
      navigate("/", { replace: true, state: {} });
    }
    if (location.state?.autoSpectateRoomCode && playerName && socket) {
      socket.emit("join_room", {
        roomCode: location.state.autoSpectateRoomCode,
        asSpectator: true,
      });
      navigate("/", { replace: true, state: {} });
    }
  }, [location.state, playerName, socket, navigate]);

  // Auto-join for returning users (e.g. reopened tab / direct join link with session)
  useEffect(() => {
    if (urlRoomCode && playerName && socket && !isJoined && !isAutoJoining) {
      // Direct join for re-hydration (refresh)
      // We check playerName/socket existence to ensure we are initialized
      console.log("[AUTO-JOIN] Re-identifying for room:", urlRoomCode);
      handleJoin(urlRoomCode.toUpperCase(), playerName);
    }
  }, [urlRoomCode, playerName, socket, isJoined, isAutoJoining, handleJoin]);

  useEffect(() => {
    if (!socket) return;

    socket.on("room_created", ({ roomCode, state }) => {
      setRoomState(state);
      setIsJoined(true);
      setError("");
      // Sync URL for persistence on refresh
      if (location.pathname !== `/join/${roomCode}`) {
        navigate(`/join/${roomCode}`, { replace: true });
      }
    });

    socket.on("room_joined", ({ state }) => {
      const roomCode = state.roomCode;
      setRoomState(state);
      setIsJoined(true);
      setError("");
      setIsAutoJoining(false); 
      setCoHostUserIds(state.coHostUserIds || []);

      // Detect if the current user is a spectator (not a team owner)
      const amSpectator = state.spectators?.some((s) => s.socketId === socket.id);
      setIsSpectatorMode(amSpectator || false);

      // Sync URL for persistence on refresh (if in Lobby state)
      if (state.status === "Lobby" && location.pathname !== `/join/${roomCode}`) {
        navigate(`/join/${roomCode}`, { replace: true });
      }

      // If joining a room where the auction is ALREADY live, go straight to the podium
      if (state.status === "Auctioning" || state.status === "Paused") {
        navigate(`/auction/${roomCode}`, {
          state: { roomState: state, isSpectator: amSpectator || false },
        });
      }
    });

    socket.on("lobby_update", ({ teams }) => {
      setRoomState((prev) => (prev ? { ...prev, teams } : null));
    });

    socket.on("available_teams", ({ teams }) => {
      setAvailableTeamsForRoom(teams);
      setError("");
    });

    socket.on("spectator_update", ({ spectators }) => {
      setSpectators(spectators);
    });

    socket.on("join_requests_update", ({ roomCode: updatedRoomCode, requests }) => {
      // Ignore updates for other rooms (prevents cross-room contamination)
      const currentRoomCode = roomState?.roomCode;
      if (updatedRoomCode && currentRoomCode && updatedRoomCode !== currentRoomCode) return;
      setJoinRequests(requests);
    });

    socket.on("cohosts_updated", ({ coHostUserIds }) => {
      setCoHostUserIds(coHostUserIds);
      setRoomState(prev => prev ? { ...prev, coHostUserIds } : null);
    });

    socket.on("player_status_update", ({ onlineMap }) => {
      setOnlineMap((prev) => ({ ...prev, ...onlineMap }));
    });

    socket.on("room_disbanded", () => {
      setIsJoined(false);
      setRoomState(null);
      setSelectedTeamId("");
      setShowLeaveConfirm(false);
      setError("The Host has disbanded the room.");
    });

    socket.on("error", (msg) => {
      setError(msg);
      setIsAutoJoining(false); // Reset auto-join state on error
    });

    socket.on("name_taken", ({ message }) => {
      setError(message || 'Name already taken in this room. Please use a different name.');
      setIsAutoJoining(false); // Let the user change their name and retry
    });

    socket.on("auction_started", ({ state }) => {
      navigate(`/auction/${state.roomCode}`, {
        state: { roomState: state, isSpectator: isSpectatorMode },
      });
    });

    socket.on("kicked_from_room", () => {
      setIsJoined(false);
      setRoomState(null);
      setError("You have been removed from the room by the host.");
    });

    socket.on("settings_updated", ({ timerDuration }) => {
      setTimerDuration(timerDuration);
    });

    socket.on("lobby_settings_updated", (settings) => {
      setLocalLobbySettings(settings);
      setRoomState(prev => prev ? { ...prev, ...settings } : null);
    });

    socket.on("participation_approved", () => {
      setIsPendingApproval(false);
      handleSpectate(roomCodeInput);
    });

    socket.on("participation_rejected", () => {
      setIsPendingApproval(false);
      setError("Your request to spectate was declined by the host.");
    });

    return () => {
      socket.off("room_created");
      socket.off("room_joined");
      socket.off("lobby_update");
      socket.off("available_teams");
      socket.off("error");
      socket.off("kicked_from_room");
      socket.off("public_rooms_update");
      socket.off("room_disbanded");
      socket.off("spectator_update");
      socket.off("join_requests_update");
      socket.off("player_status_update");
      socket.off("cohosts_updated");
      socket.off("name_taken");
      socket.off("connect"); // [STABILITY-UPGRADE]
    };
  }, [socket, navigate]);

  // Ensure socket reconnects properly attach back to the room if disconnected while in Lobby
  useEffect(() => {
    if (!socket || !roomState?.roomCode) return;
    const onReconnect = () => {
      console.log("[Lobby] Socket reconnected. Re-joining room:", roomState.roomCode);
      socket.emit("join_room", { roomCode: roomState.roomCode, asSpectator: isSpectatorMode });
    };
    socket.on("connect", onReconnect);
    return () => socket.off("connect", onReconnect);
  }, [socket, roomState?.roomCode, isSpectatorMode]);


  const handleToggleCoHost = (targetUserId) => {
    socket.emit("toggle_cohost", { roomCode: roomState.roomCode, userId: targetUserId });
  };

  const handleLeaveRoom = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeaveRoom = () => {
    if (isVoiceJoined && roomState?.roomCode) {
      leaveVoice(roomState.roomCode);
    }
    if (roomState?.roomCode) {
      socket.emit("leave_room", { roomCode: roomState.roomCode });
    }

    // Reset local UI state
    setIsJoined(false);
    setRoomState(null);
    setSelectedTeamId("");
    setError("");
    setShowLeaveConfirm(false);
    setIsSpectatorMode(false);
    setIsEditingName(false);
    setShowSettings(false);
  };

  const handleChangeName = () => {
    if (!tempName.trim()) return;
    socket.emit("change_owner_name", { roomCode: roomState.roomCode, newName: tempName.trim() });
    setIsEditingName(false);
  };

  const handleUpdateLobbySettings = () => {
    socket.emit("update_lobby_settings", {
      roomCode: roomState.roomCode,
      ...localLobbySettings
    });
    setShowSettings(false);
  };

  const myTeam = roomState?.teams?.find((t) =>
    (socket?.id && t.ownerSocketId === socket.id) ||
    (userId && t.ownerUserId === userId)
  );
  const hasClaimedTeam = !!myTeam;
  const isPrimaryHost = (userId && roomState?.hostUserId === userId) || roomState?.host === socket?.id;
  const isCoHost = userId && coHostUserIds.includes(userId);
  const isModerator = isPrimaryHost || isCoHost;
  const isHost = isPrimaryHost; // Keep variable name for older UI components if needed

  // Use available teams from state if present, otherwise fallback to IPL_TEAMS
  // Dynamic Filtering: If teamCount <= 10, only show the first 10 teams (Modern IPL)
  const currentTeamLimit = roomState?.teamCount || 15;
  const filteredTeams = currentTeamLimit <= 10 ? IPL_TEAMS.slice(0, 10) : IPL_TEAMS.slice(0, currentTeamLimit);
  const displayTeams = availableTeamsForRoom || filteredTeams;

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start p-4 sm:p-6 relative overflow-x-hidden overflow-y-auto custom-scrollbar">

      {/* Full-screen video background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
        src="/Auction-bg.mp4"
      />
      {/* Dark overlay so text stays legible */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />


      <div className="w-full max-w-6xl relative z-10 px-0 sm:px-6 lg:px-0 py-4 lg:py-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isJoined ? (
            <motion.div
              key="entry-arena"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-3xl lg:rounded-[40px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] bg-black/40 backdrop-blur-3xl"
            >
              {/* Sidebar / Info Panel */}
              <div className="lg:col-span-5 p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-[#D4AF37]/10 via-transparent to-transparent border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col justify-between">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <motion.div
                      initial={{ rotate: -10, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      className="w-16 h-16 bg-gradient-to-br from-[#FFE58F] to-[#D4AF37] rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.3)]"
                    >
                      <Zap className="w-8 h-8 text-[#1a1205] fill-[#1a1205]" />
                    </motion.div>
                    <div>
                      <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter text-white leading-none uppercase">
                        IPL <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFE58F] via-[#D4AF37] to-[#FFE58F] animate-gradient-x">AUCTION</span>
                      </h1>
                      <div className="h-1 w-20 bg-[#D4AF37] mt-2 rounded-full"></div>
                    </div>
                    <p className="text-slate-400 text-sm font-bold leading-relaxed max-w-xs uppercase tracking-tight">
                      Command the auction floor. Build your dynasty. Outbid the rest.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all cursor-default">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-[#D4AF37]">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-white uppercase tracking-widest">Ultra-Low Latency</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Real-time Bid Sync</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 group hover:bg-white/10 transition-all cursor-default">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 text-[#00d2ff]">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-white uppercase tracking-widest">Multiplayer Arena</div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Up to 10 Global Owners</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5">
                  <div className="flex items-center justify-between text-[9px] font-black text-[#D4AF37]/40 uppercase tracking-[0.2em]">
                    <span>Secure Arena v2.4</span>
                    <Shield className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Interaction Panel */}
              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
                <div className="space-y-8">
                  {/* Name Input Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.2em]">Franchise Owner Name</label>
                      {playerName && (
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black text-emerald-400 uppercase bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Session Active</span>
                          <button onClick={() => { sessionStorage.removeItem('ipl_session_token'); window.location.reload(); }} className="text-[8px] font-black text-slate-500 hover:text-white uppercase transition-colors underline underline-offset-2">Logout</button>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Victorious Gaffer"
                        className="w-full bg-white/5 border-2 border-white/10 rounded-2xl px-6 py-5 focus:outline-none focus:border-[#D4AF37]/50 text-white font-black text-lg transition-all placeholder:text-white/10"
                        value={localNameInput}
                        onChange={(e) => setLocalNameInput(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Action Tabs */}
                  <div className="space-y-6">
                    {!isDirectJoining ? (
                      <div className="space-y-6">
                        <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10">
                          <button onClick={() => setCreatingRoomType("private")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${creatingRoomType === "private" ? "bg-[#D4AF37] text-[#1a1205] shadow-[0_0_20px_rgba(212,175,55,0.3)]" : "text-slate-500 hover:text-white"}`}>
                            <Shield className="w-3.5 h-3.5" /> Private
                          </button>
                          <button onClick={() => setCreatingRoomType("public")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${creatingRoomType === "public" ? "bg-[#D4AF37] text-[#1a1205] shadow-[0_0_20px_rgba(212,175,55,0.3)]" : "text-slate-500 hover:text-white"}`}>
                            <Users className="w-3.5 h-3.5" /> Public
                          </button>
                          <button onClick={() => setCreatingRoomType("ai")} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${creatingRoomType === "ai" ? "bg-[#D4AF37] text-[#1a1205] shadow-[0_0_20px_rgba(212,175,55,0.3)]" : "text-slate-500 hover:text-white"}`}>
                            🤖 VS AI
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <button onClick={handleCreate} className="group relative overflow-hidden bg-white/10 hover:bg-white text-white hover:text-black font-black py-5 rounded-3xl transition-all duration-500 flex items-center justify-center gap-3">
                            <span className="relative z-10 text-xs tracking-[0.2em] uppercase">Commission Round</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] to-[#FFE58F] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          </button>

                          <div className="relative group">
                            <input
                              type="text"
                              placeholder="ROOM CODE"
                              className="w-full bg-transparent border-2 border-white/10 rounded-3xl px-6 py-5 text-center text-white font-black tracking-[0.4em] focus:outline-none focus:border-[#D4AF37]/50 uppercase transition-all"
                              value={roomCodeInput}
                              onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                            />
                            {roomCodeInput.length >= 6 && (
                              <motion.button
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                onClick={() => handleJoin(roomCodeInput)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#D4AF37] text-[#1a1205] p-3 rounded-2xl hover:scale-105 transition-transform"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </motion.button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <button onClick={() => navigate("/public-rooms")} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-3xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 hover:text-[#D4AF37] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all uppercase tracking-widest">
                            <Telescope className="w-4 h-4" /> Explore Public Arenas
                          </button>
                          <button onClick={() => handleSpectate(roomCodeInput)} className="px-6 py-4 rounded-3xl bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest">
                            Spectate
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="text-center p-8 rounded-[32px] bg-[#D4AF37]/5 border border-[#D4AF37]/20 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-[#D4AF37]/20 transition-all"></div>
                          <h2 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-[0.4em] mb-2">Direct Invitation</h2>
                          <div className="text-4xl sm:text-6xl font-black text-white tracking-widest mb-6 drop-shadow-2xl">{roomCodeInput}</div>
                          <div className="flex flex-col gap-3">
                            <button onClick={() => handleJoin(roomCodeInput)} className="w-full bg-[#D4AF37] hover:bg-[#FFE58F] text-[#1a1205] font-black py-5 rounded-2xl transition-all uppercase text-[12px] tracking-widest shadow-[0_0_30px_rgba(212,175,55,0.3)]">Enter Arena</button>
                            <button onClick={() => handleSpectate(roomCodeInput)} className="w-full bg-white/5 hover:bg-white/10 text-white font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-widest border border-white/10">Observe Only</button>
                          </div>
                        </div>
                        <button onClick={() => { setIsDirectJoining(false); navigate("/", { replace: true }); }} className="w-full text-center text-[10px] font-black text-slate-500 hover:text-[#D4AF37] uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to Terminal
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 rounded-[32px] bg-red-500/10 border border-red-500/20 space-y-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">
                        {error === 'SPECTATOR_APPROVAL_REQUIRED' ? "Auction in Progress: Host Approval Required" : 
                         error === 'PLAYER_JOIN_DISABLED' ? "Auction has already started. New participants cannot join." : error}
                      </p>
                    </div>
                    {error === 'SPECTATOR_APPROVAL_REQUIRED' && !isPendingApproval && (
                      <button 
                        onClick={handleRequestAccess}
                        className="w-full py-4 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
                      >
                        Send Spectator Request
                      </button>
                    )}
                  </motion.div>
                )}

                {isPendingApproval && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-6 rounded-[32px] bg-[#D4AF37]/5 border border-[#D4AF37]/20 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-[#D4AF37]/30 border-t-[#D4AF37] animate-spin" />
                    <div>
                      <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest">Awaiting Host Clearance</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Your request to spectate is currently pending...</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="arena-dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Left Column: Rules & Status */}
              <div className="lg:col-span-4 space-y-6">
                <div className="glass-panel p-6 sm:p-8 rounded-3xl lg:rounded-[40px] border-white/10 bg-black/40 backdrop-blur-3xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#FFE58F] to-[#D4AF37]"></div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                        <Shield className="w-5 h-5 text-[#D4AF37]" />
                      </div>
                      <div>
                        <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none">Auction Directives</h2>
                        <span className="text-[8px] font-bold text-[#D4AF37]/60 uppercase tracking-tighter">System Version 4.0.1</span>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4">
                      {[
                        { label: 'Squad Size', value: '18 — 25 Players', icon: Users },
                        { label: 'Overseas', value: 'Max 8 Players', icon: Telescope },
                        { label: 'Bowling', value: 'Min 6 Options', icon: Zap },
                        { label: 'Keeping', value: 'Min 2 Options', icon: Shield },
                      ].map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_8px_#D4AF37]"></div>
                          <div className="flex-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block leading-none mb-1">{rule.label}</span>
                            <span className="text-[11px] font-bold text-[#FFE58F] uppercase tracking-tighter">{rule.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                      <p className="text-[9px] text-red-400 font-black leading-tight uppercase tracking-tight">
                        <span className="text-red-500">Warning:</span> Violation results in immediate disqualification.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Host Controls Section */}
                {isModerator && (
                  <div className="glass-panel p-6 rounded-[32px] border-white/10 bg-black/20 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Host Controls</span>
                      <button 
                        onClick={() => {
                          setLocalLobbySettings({
                            allowSpectators: roomState?.allowSpectators !== false,
                            maxSpectators: roomState?.maxSpectators || 10,
                            teamCount: roomState?.teamCount || 15
                          });
                          setShowSettings(true);
                        }}
                        className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-white/40 hover:text-[#D4AF37]"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                    <button onClick={handleStart} className="w-full group relative overflow-hidden bg-[#D4AF37] text-[#1a1205] font-black py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)] hover:shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                      <span className="relative z-10 text-[10px] tracking-[0.2em] uppercase">Initialize Auction</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Arena Controls */}
              <div className="lg:col-span-8 space-y-6">
                {/* Room Status Header */}
                <div className="glass-panel p-4 sm:p-6 rounded-[32px] border-white/10 bg-black/40 backdrop-blur-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-6">
                    <div>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-1">Assigned Terminal</span>
                      <div className="text-3xl font-black text-white tracking-[0.2em]">{roomState?.roomCode}</div>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="flex gap-2">
                      <button onClick={handleCopyLink} className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[#D4AF37] transition-all" title="Copy Arena Link">
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={handleShareWhatsapp} className="p-3 bg-white/5 hover:bg-emerald-500/20 border border-white/10 rounded-xl text-emerald-400 transition-all" title="Dispatch to Squad">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button onClick={handleLeaveRoom} className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5" /> Abort
                  </button>
                </div>
                
                {/* Lobby Voice Controls */}
                <div className="flex items-center gap-2 mb-6">
                  {!isVoiceJoined ? (
                    <button
                      onClick={() => joinVoice(roomState?.roomCode)}
                      className="p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-xl hover:bg-[#D4AF37]/20 transition-all flex items-center justify-center shadow-lg"
                      title="Join Voice Chat"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                      <button
                        onClick={toggleMute}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-center ${isVoiceMuted ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-sky-500 border-sky-400 text-[#080400] animate-pulse shadow-[0_0_20px_rgba(14,165,233,0.5)]'}`}
                        title={isVoiceMuted ? "Unmute Microphone" : "Mute Microphone"}
                      >
                        {isVoiceMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => leaveVoice(roomState?.roomCode)}
                        className="p-3 rounded-xl bg-red-500 border border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all flex items-center justify-center"
                        title="Exit Voice Chat"
                      >
                        <Phone className="w-5 h-5" />
                      </button>
                      <div className="px-3 py-1.5 bg-sky-500/5 rounded-xl border border-sky-500/10 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse shadow-[0_0_8px_#38bdf8]"></div>
                        <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Voice Active</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Content Area */}
                {isSpectatorMode ? (
                  <div className="glass-panel p-12 rounded-[40px] border-white/10 bg-black/40 backdrop-blur-3xl text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto border border-[#D4AF37]/20">
                      <Telescope className="w-10 h-10 text-[#D4AF37]" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-black text-white uppercase tracking-widest">Observer Status</h3>
                      <p className="text-slate-500 text-sm font-bold uppercase tracking-tight">You are currently monitoring the auction terminal.</p>
                    </div>
                    <div className="pt-4">
                      <span className="inline-block px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-[#D4AF37] uppercase tracking-widest animate-pulse">Waiting for host to initiate loop...</span>
                    </div>
                  </div>
                ) : !hasClaimedTeam ? (
                  <div className="glass-panel p-6 sm:p-8 rounded-3xl lg:rounded-[40px] border-white/10 bg-black/40 backdrop-blur-3xl space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">Franchise Acquisition</h3>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Step 02 / 03</span>
                    </div>

                    <div className="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                      {displayTeams.map((team) => {
                        const isClaimed = roomState?.teams?.some((t) => t.teamName === team.name);
                        const isSelected = selectedTeamId === team.id;

                        return (
                          <motion.button
                            key={team.id}
                            whileHover={!isClaimed ? { scale: 1.05, y: -5 } : {}}
                            whileTap={!isClaimed ? { scale: 0.95 } : {}}
                            onClick={() => !isClaimed && setSelectedTeamId(team.id)}
                            className={`relative aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center p-4 overflow-hidden group ${isClaimed ? 'bg-black/40 border-white/5 opacity-40 grayscale cursor-not-allowed' : isSelected ? 'bg-white/10 border-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                          >
                            {!isClaimed && isSelected && (
                              <motion.div layoutId="selection-glow" className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/20 to-transparent"></motion.div>
                            )}
                            <img src={team.logoUrl} alt={team.id} className="w-12 h-12 object-contain relative z-10 drop-shadow-2xl transition-transform duration-500 group-hover:scale-110" />
                            <span className={`text-[9px] font-black uppercase tracking-widest mt-3 relative z-10 ${isSelected ? 'text-[#D4AF37]' : 'text-slate-500'}`}>{team.id}</span>
                            {isClaimed && <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] z-20"><span className="text-[8px] font-black text-[#D4AF37] uppercase tracking-tighter border border-[#D4AF37]/50 px-2 py-0.5 rounded -rotate-12">Claimed</span></div>}
                          </motion.button>
                        );
                      })}
                    </div>

                    <button onClick={handleClaimTeam} className="w-full bg-[#D4AF37] hover:bg-[#FFE58F] text-[#1a1205] font-black py-5 rounded-[24px] transition-all uppercase text-[12px] tracking-widest shadow-[0_0_30px_rgba(212,175,55,0.2)]">Confirm Acquisition</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Participant List */}
                    <div className="glass-panel p-6 sm:p-8 rounded-3xl lg:rounded-[40px] border-white/10 bg-black/40 backdrop-blur-3xl space-y-6 flex flex-col lg:h-[500px] h-auto min-h-[300px]">
                      <h3 className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.3em]">Committed Owners</h3>
                      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {roomState?.teams?.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all relative group">
                            <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
                              {t.teamLogo ? <img src={t.teamLogo} alt="" className="w-full h-full object-contain" /> : <div className="text-xs font-black text-[#D4AF37]">{(t.teamName || '?').charAt(0)}</div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black text-white uppercase truncate">{t.teamName}</div>
                              <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${onlineMap[t.ownerUserId] === false ? 'bg-red-500' : 'bg-[#D4AF37] animate-pulse'}`}></span>
                                {isEditingName && t.ownerUserId === userId ? (
                                  <div className="flex items-center gap-1">
                                    <input 
                                      autoFocus
                                      type="text"
                                      value={tempName}
                                      onChange={(e) => setTempName(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleChangeName()}
                                      className="bg-white/10 border-b border-[#D4AF37] text-[10px] font-bold text-white uppercase focus:outline-none w-24"
                                    />
                                    <button onClick={handleChangeName} className="text-emerald-400 hover:text-emerald-300"><Check className="w-3 h-3"/></button>
                                    <button onClick={() => setIsEditingName(false)} className="text-red-400 hover:text-red-300"><X className="w-3 h-3"/></button>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{t.ownerName}</span>
                                    {t.ownerUserId === userId && (
                                      <button 
                                        onClick={() => { setTempName(t.ownerName); setIsEditingName(true); }}
                                        className="p-1 hover:text-[#D4AF37] text-slate-600 transition-colors"
                                      >
                                        <Layout className="w-3 h-3" />
                                      </button>
                                    )}
                                  </>
                                )}
                                {t.isBot && <Bot className="w-3 h-3 text-sky-400" />}
                                {t.ownerSocketId && voiceParticipants?.has(t.ownerSocketId) && (
                                  <span className="text-emerald-500 animate-pulse" title="In Voice Chat">
                                    <Mic className="w-3 h-3" />
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isPrimaryHost && t.ownerUserId !== userId && (
                                <button onClick={() => handleToggleCoHost(t.ownerUserId)} className={`p-2 rounded-lg transition-all ${coHostUserIds.includes(t.ownerUserId) ? 'text-[#D4AF37] bg-[#D4AF37]/10' : 'text-slate-600 hover:text-white'}`} title="Toggle Co-Host">
                                  <Crown className="w-4 h-4" />
                                </button>
                              )}
                              {isModerator && t.ownerUserId !== userId && (
                                <button onClick={() => setKickTarget({ socketId: t.ownerSocketId, name: t.ownerName })} className="p-2 text-slate-600 hover:text-red-400 transition-all" title="Expel Owner">
                                  <LogOut className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Secondary List: Spectators & Requests */}
                    <div className="space-y-6 lg:h-[500px] h-auto flex flex-col">
                      {/* Requests Block */}
                      {isHost && joinRequests.length > 0 && (
                        <div className="glass-panel p-6 rounded-[32px] border-[#D4AF37]/30 bg-[#D4AF37]/5 space-y-4">
                          <h3 className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-2 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> Entry Requests ({joinRequests.length})
                          </h3>
                          <div className="space-y-2">
                            {joinRequests.map((req) => (
                              <div key={req.socketId} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/10">
                                <span className="text-xs font-black text-white px-2 truncate">{req.name}</span>
                                <div className="flex gap-1">
                                  <button onClick={() => socket.emit("approve_participation", { roomCode: roomState.roomCode, targetSocketId: req.socketId })} className="p-2 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all">
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => socket.emit("reject_participation", { roomCode: roomState.roomCode, targetSocketId: req.socketId })} className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all">
                                    <LogOut className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Spectators Block */}
                      <div className="glass-panel p-8 rounded-[40px] border-white/10 bg-black/40 backdrop-blur-3xl flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Observers ({spectators.length})</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                          {spectators.map((s) => (
                            <div key={s.socketId} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 group">
                              <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-500">{s.name?.charAt(0)}</div>
                              <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">{s.name}</span>
                              {s.socketId === socket.id && <span className="text-[8px] font-black text-[#1a1205] bg-[#D4AF37] px-2 py-0.5 rounded-full uppercase ml-auto">You</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {/* Host Settings Modal */}
        {showSettings && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-md bg-[#1a1205] border border-[#D4AF37]/30 rounded-[32px] overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.2)]">
              <div className="p-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center border border-[#D4AF37]/20">
                    <Settings className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-widest leading-none">Arena Config</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">Host Privilege Access Only</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Spectator Toggle */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3">
                      <Telescope className="w-4 h-4 text-sky-400" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Allow Spectators</span>
                    </div>
                    <button 
                      onClick={() => setLocalLobbySettings(prev => ({ ...prev, allowSpectators: !prev.allowSpectators }))}
                      className={`w-12 h-6 rounded-full transition-all relative ${localLobbySettings.allowSpectators ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <motion.div 
                        animate={{ x: localLobbySettings.allowSpectators ? 24 : 4 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>

                  {/* Spectator Limit */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Observer Limit (Max 10)</label>
                      <span className="text-xs font-black text-[#D4AF37]">{localLobbySettings.maxSpectators}</span>
                    </div>
                    <input 
                      type="range" min="1" max="10" 
                      value={localLobbySettings.maxSpectators}
                      onChange={(e) => setLocalLobbySettings(prev => ({ ...prev, maxSpectators: parseInt(e.target.value) }))}
                      disabled={!localLobbySettings.allowSpectators}
                      className="w-full accent-[#D4AF37] opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20"
                    />
                  </div>

                   {/* Team Count */}
                   <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Total Franchises</label>
                     <div className="flex gap-3">
                       <button 
                         onClick={() => setLocalLobbySettings(prev => ({ ...prev, teamCount: 10 }))}
                         className={`flex-1 py-4 rounded-2xl border transition-all flex flex-col items-center gap-1 ${localLobbySettings.teamCount === 10 ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                       >
                         <span className="text-sm font-black italic tracking-tighter">10</span>
                         <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Modern</span>
                       </button>
                       <button 
                         onClick={() => setLocalLobbySettings(prev => ({ ...prev, teamCount: 15 }))}
                         className={`flex-1 py-4 rounded-2xl border transition-all flex flex-col items-center gap-1 ${localLobbySettings.teamCount === 15 ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                       >
                         <span className="text-sm font-black italic tracking-tighter">15</span>
                         <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Legacy</span>
                       </button>
                     </div>
                     <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tight text-center italic">
                       {localLobbySettings.teamCount === 10 ? "Modern 10 Teams Only — No Legacy Franchises allowed." : "All 15 Franchises enabled including Legacy teams."}
                     </p>
                   </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setShowSettings(false)} className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                  <button onClick={handleUpdateLobbySettings} className="flex-2 px-8 py-4 rounded-2xl bg-[#D4AF37] text-[#1a1205] text-[10px] font-black uppercase tracking-widest hover:bg-[#FFE58F] transition-all shadow-[0_0_20px_rgba(212,175,55,0.2)]">Global Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Kick Confirmation */}
        {kickTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-[40px] border-red-500/20 max-w-sm w-full space-y-8 bg-black/60">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                  <LogOut className="w-8 h-8 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">Expel Owner?</h3>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-tight mt-2">Remove <span className="text-red-400">{kickTarget.name}</span> from the terminal?</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setKickTarget(null)} className="py-4 rounded-2xl bg-white/5 text-white font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all">Cancel</button>
                <button onClick={() => { socket.emit("kick_player", { roomCode: roomState.roomCode, targetSocketId: kickTarget.socketId }); setKickTarget(null); }} className="py-4 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all">Expel</button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Leave Confirmation */}
        {showLeaveConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-panel p-8 rounded-[40px] border-[#D4AF37]/20 max-w-sm w-full space-y-8 bg-black/60">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto border border-[#D4AF37]/20">
                  <AlertTriangle className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">Abort Mission?</h3>
                  <p className="text-slate-500 text-sm font-bold uppercase tracking-tight mt-2">{isHost ? "This will disband the terminal for all owners." : "You will be disconnected from the auction floor."}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowLeaveConfirm(false)} className="py-4 rounded-2xl bg-white/5 text-white font-black text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all">Stay</button>
                <button onClick={confirmLeaveRoom} className="py-4 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase tracking-widest shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-all">Abort</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Toast 
        message={toast?.message} 
        type={toast?.type} 
        onClose={() => setToast(null)} 
      />
    </div>
  );
};

export default Lobby;
