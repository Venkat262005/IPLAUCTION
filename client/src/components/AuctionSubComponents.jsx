import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { getFlagUrl } from "../utils/playerUtils";

export const TeamList = memo(
  ({
    teams,
    currentBidTeamId,
    expandedTeamId,
    setExpandedTeamId,
    allPlayersMap,
    onlineMap = {},
    isHost = false,
    mySocketId = null,
    onKick = null,
  }) => (
    <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-3 custom-scrollbar">
      {teams.map((t, i) => (
        <motion.div
          key={i}
          onClick={() =>
            setExpandedTeamId(
              expandedTeamId === t.franchiseId ? null : t.franchiseId,
            )
          }
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className={`
                    rounded-2xl p-4 flex flex-col relative overflow-hidden transition-all duration-300 cursor-pointer
                    ${currentBidTeamId === t.franchiseId ? "bg-white/10 border-white/20" : "bg-slate-900/40 border border-white/5 hover:bg-slate-800/60"}
                `}
        >
          <div
            className="absolute top-0 left-0 w-1 h-full"
            style={{ backgroundColor: t.teamThemeColor }}
          ></div>

          <div className="flex justify-between items-center z-10 mb-2">
            <div className="flex items-center gap-3">
              {t.teamLogo && (
                <div className="relative w-8 h-8">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center p-1 border border-white/10">
                    <img
                      src={t.teamLogo}
                      alt={t.teamName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Online status dot */}
                  <span
                    className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${onlineMap[t.ownerUserId] === false
                      ? "bg-red-500 shadow-[0_0_6px_#ef4444]"
                      : "bg-green-500 shadow-[0_0_6px_#22c55e]"
                      }`}
                    title={
                      onlineMap[t.ownerUserId] === false ? "Offline" : "Online"
                    }
                  />
                </div>
              )}
              <span
                className="font-black text-xs lg:text-[13px] tracking-tight uppercase"
                style={{ color: t.teamThemeColor }}
              >
                {t.teamName}
              </span>
            </div>
            <span className="font-mono font-black text-base lg:text-lg text-white">
              ₹{t.currentPurse}L
            </span>
          </div>

          <div className="flex justify-between items-start text-[10px] text-slate-500 mt-1 z-10 font-bold ml-11">
            <div className="flex flex-col gap-1.5 min-w-0">
              <span className="uppercase tracking-widest truncate max-w-[150px] block">{t.ownerName}</span>
              {/* Composition Stats aligned in a neat row */}
              {t.playersAcquired?.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400">
                  {(() => {
                    const counts = t.playersAcquired.reduce((acc, p) => {
                      const playerRecord = allPlayersMap[p.player] || allPlayersMap[p._id] || {};
                      const role = (p.role || playerRecord.role || "").toLowerCase();

                      if (role.includes("wk") || role.includes("wicket") || role.includes("keeper")) acc.wk++;
                      else if (role.includes("all") || role.includes("ar")) acc.ar++;
                      else if (role.includes("bowl") || role.includes("bw")) acc.bowl++;
                      else acc.bat++;

                      const nationality = p.nationality || playerRecord.nationality || "";
                      const isOverseas = p.isOverseas || p.overseas || playerRecord.isOverseas ||
                        (nationality && !["india", "ind"].includes(nationality.toLowerCase().trim()));
                      if (isOverseas) acc.fr++;

                      return acc;
                    }, { bat: 0, bowl: 0, ar: 0, wk: 0, fr: 0 });

                    return (
                      <>
                        {counts.bat > 0 && <span className="bg-white/5 px-1.5 py-0.5 rounded text-blue-400">BAT:{counts.bat}</span>}
                        {counts.bowl > 0 && <span className="bg-white/5 px-1.5 py-0.5 rounded text-red-400">BOWL:{counts.bowl}</span>}
                        {counts.ar > 0 && <span className="bg-white/5 px-1.5 py-0.5 rounded text-green-400">AR:{counts.ar}</span>}
                        {counts.wk > 0 && <span className="bg-white/5 px-1.5 py-0.5 rounded text-yellow-400">WK:{counts.wk}</span>}
                        {counts.fr > 0 && <span className="bg-white/10 px-1.5 py-0.5 rounded text-white shadow-[0_0_5px_rgba(255,255,255,0.1)]">FR:{counts.fr}</span>}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${t.playersAcquired?.length >= 25 ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-white/50'}`}>
                {t.playersAcquired?.length || 0} / 25
              </span>
            </div>
          </div>

          <AnimatePresence>
            {expandedTeamId === t.franchiseId &&
              t.playersAcquired?.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 border-t border-white/10 pt-3 flex flex-col gap-2 z-10 overflow-hidden"
                >
                  <div className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">
                    Acquired Players
                  </div>
                  {t.playersAcquired.map((p, idx) => {
                    // Try to recover full player object from allPlayersMap
                    const playerRecord = allPlayersMap[p.player] || allPlayersMap[p._id] || {};

                    let displayName = p.name;
                    if (
                      !displayName ||
                      String(displayName).match(/^[0-9a-fA-F]{24}$/)
                    ) {
                      displayName =
                        playerRecord.name ||
                        playerRecord.player ||
                        p.player ||
                        "Unknown";
                    }

                    // Determine role icon - fallback to playerRecord if missing in p
                    const role = (p.role || playerRecord.role || "").toLowerCase();
                    let roleIcon = "🏏"; // default bat
                    if (role.includes("wk") || role.includes("wicket") || role.includes("keeper")) {
                      roleIcon = "🧤";
                    } else if (role.includes("all") || role.includes("ar")) {
                      roleIcon = "🏏⚾";
                    } else if (role.includes("bowl") || role.includes("bw")) {
                      roleIcon = "⚾";
                    }

                    const nationality = p.nationality || playerRecord.nationality || "";
                    const isOverseas = p.isOverseas || p.overseas || playerRecord.isOverseas ||
                      (nationality && !["india", "ind"].includes(nationality.toLowerCase().trim()));

                    return (
                      <div
                        key={idx}
                        className="flex justify-between items-center text-[10px] font-bold bg-black/20 p-2 rounded border border-white/5"
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                          {/* Flight symbol for overseas players at the front */}
                          {isOverseas && (
                            <span className="shrink-0 text-[11px]" title="Overseas Player">✈️</span>
                          )}

                          <span className="truncate">{displayName}</span>

                          {/* Role icon after the name */}
                          <span className="shrink-0 text-[11px] ml-1" title={role || "Batsman"}>{roleIcon}</span>
                        </div>
                        <span className="text-blue-400 shrink-0 ml-1">
                          ₹{p.boughtFor}L
                        </span>
                      </div>
                    );
                  })}
                  {/* Host kick button */}
                  {isHost && t.ownerSocketId !== mySocketId && onKick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onKick(t.ownerSocketId, t.ownerName);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all z-20 border border-red-500/20"
                      title={`Kick ${t.ownerName}`}
                    >
                      <svg
                        width="8"
                        height="8"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  )}

                </motion.div>
              )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  ),
);

export const BidHistory = memo(({ bidHistory }) => (
  <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col-reverse gap-3 custom-scrollbar">
    <div className="flex flex-col-reverse gap-3">
      {bidHistory.map((bid) => (
        <div key={bid.id} className="relative group ml-4 mr-2">
          <div className="bg-slate-900/60 border border-white/10 p-2 transform skew-x-[-15deg] shadow-[0_5px_15px_rgba(0,0,0,0.3)] relative overflow-hidden flex items-center gap-3">
            <div className="transform skew-x-[15deg] flex items-center w-full min-w-0">
              <div className="w-8 h-8 shrink-0 bg-black/40 rounded-full flex items-center justify-center p-1 border border-white/10 mr-3 shadow-inner">
                {bid.teamLogo ? (
                  <img
                    src={bid.teamLogo}
                    alt={bid.teamName}
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                ) : (
                  <span className="text-[10px] font-black text-white">
                    {bid.teamName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex justify-between items-start mb-0.5">
                  <div
                    className="text-[9px] font-black uppercase tracking-widest truncate max-w-[100px]"
                    style={{ color: bid.teamColor }}
                  >
                    {bid.teamName}
                  </div>
                  <div className="text-[8px] text-slate-500 font-bold bg-black/40 px-1 rounded ml-1 shrink-0">
                    {bid.time}
                  </div>
                </div>
                <div className="flex justify-between items-end">
                  <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[80px]">
                    {bid.ownerName}
                  </div>
                  <div className="text-sm font-black font-mono text-white tracking-tighter">
                    ₹{bid.amount}L
                  </div>
                </div>
              </div>
            </div>
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: bid.teamColor }}
            ></div>
          </div>
        </div>
      ))}
    </div>
    {bidHistory.length === 0 && (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-700">
        <div className="text-[10px] font-black uppercase tracking-widest">
          Awaiting Bids
        </div>
      </div>
    )}
  </div>
));

export const ChatSection = memo(
  ({
    chatMessages,
    myTeam,
    chatEndRef,
    chatInput,
    setChatInput,
    handleSendMessage,
    isSpectator,
    onClose,
  }) => (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/50 w-full">
      <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/20">
        <div>
          <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            War Room Chat
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 text-[10px] font-bold uppercase tracking-widest text-center px-4">
            Send a message to the room
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe =
              msg.senderName === (myTeam?.ownerName || "Host") &&
              msg.senderTeam === (myTeam?.teamName || "System");
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div className="flex items-baseline gap-2 mb-1 px-1">
                  {msg.senderLogo && (
                    <img src={msg.senderLogo} alt="" className="w-3 h-3 object-contain shrink-0" />
                  )}
                  <span
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{ color: msg.senderColor || "#ffffff" }}
                  >
                    {msg.senderName}
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold">
                    {msg.timestamp}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm
                                    ${isMe ? "bg-blue-600 text-white rounded-tr-sm shadow-blue-900/20" : "bg-slate-800/80 text-slate-200 rounded-tl-sm border border-white/5"}
                                `}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="p-3 border-t border-white/5 bg-black/40">
        {isSpectator ? (
          <div className="flex items-center justify-center py-2 px-3 bg-red-500/5 border border-red-500/10 rounded-xl text-center">
            <span className="text-[10px] font-black text-red-500/70 uppercase tracking-widest">
              Chat is restricted to Franchise Owners
            </span>
          </div>
        ) : (
          <form
            onSubmit={handleSendMessage}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center transition-colors shrink-0"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4 text-white ml-0.5"
              >
                <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  ),
);
