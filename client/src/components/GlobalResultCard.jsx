import React from 'react';

const GlobalResultCard = ({ results, allPlayersMap }) => {
    if (!results || results.length === 0) return null;

    return (
        <div
            id="global-result-card"
            className="w-[1280px] h-[920px] text-white relative flex flex-col font-sans overflow-hidden p-10"
            style={{
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
        >
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 blur-[150px] rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 blur-[150px] rounded-full"></div>

            {/* Header */}
            <header className="text-center mb-10 relative z-10">
                <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mb-2">Final Season Review</div>
                <h1 className="text-5xl font-black uppercase tracking-tighter italic text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-white drop-shadow-2xl">
                    IPL 2026 OFFICIAL SQUAD VERDICTS
                </h1>
                <div className="h-1 w-32 bg-blue-500 mx-auto mt-4 rounded-full"></div>
            </header>

            {/* Teams Grid - 3 rows of 5 teams to accommodate all 15 teams */}
            <div className="grid grid-cols-5 gap-x-6 gap-y-8 flex-1 relative z-10">
                {results.map((team, idx) => {
                    const score = team.evaluation?.overallScore || 0;
                    const lineup = team.evaluation?.homePlaying11 || team.evaluation?.playing11 || [];
                    const impact = team.evaluation?.homeImpactPlayers || team.evaluation?.impactPlayers || [];
                    const rank = team.rank || (idx + 1);

                    return (
                        <div key={idx} className="flex flex-col items-center bg-white/5 rounded-[24px] border border-white/10 p-4 backdrop-blur-md">
                            {/* Rank Badge */}
                            <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-xl border-2 border-blue-500 z-20">
                                {rank === 1 ? <span className="text-2xl">🥇</span> : 
                                 rank === 2 ? <span className="text-2xl">🥈</span> : 
                                 rank === 3 ? <span className="text-2xl">🥉</span> : 
                                 <span className="text-sm font-black text-blue-900">#{rank}</span>}
                            </div>

                            {/* Logo and Score Container */}
                            <div className="relative mb-3 flex flex-col items-center">
                                <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center p-2 border border-white/20">
                                    <img
                                        src={team.logoUrl || team.franchiseId?.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(team.teamName)}`}
                                        alt={team.teamName}
                                        className="w-full h-full object-contain filter drop-shadow-lg"
                                    />
                                </div>
                                <div className="mt-3 bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-1 rounded-full shadow-lg">
                                    <span className="text-white text-[10px] font-black uppercase tracking-widest">Score: {score}</span>
                                </div>
                            </div>

                            <div className="text-[12px] font-black text-white uppercase tracking-tight mb-2 truncate w-full text-center">
                                {team.teamName}
                            </div>

                            {/* Players List */}
                            <div className="w-full space-y-0.5 text-[9px] font-bold text-blue-200/80 leading-tight">
                                {lineup.slice(0, 11).map((entry, pIdx) => {
                                    // Handle both ID and Name
                                    const isId = /^[0-9a-fA-F]{24}$/.test(entry);
                                    const name = isId ? (allPlayersMap[entry]?.name || "Unknown") : entry;
                                    return (
                                        <div key={pIdx} className="truncate px-2 py-0.5 rounded bg-white/5 border border-white/5">
                                            <span className="text-blue-400 mr-1">{pIdx + 1}.</span> {name}
                                        </div>
                                    );
                                })}
                                
                                {impact.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-white/10">
                                        <div className="text-[7px] font-black uppercase text-purple-400 mb-1">Impact Subs</div>
                                        <div className="flex flex-wrap gap-1">
                                            {impact.slice(0, 4).map((entry, pIdx) => {
                                                const isId = /^[0-9a-fA-F]{24}$/.test(entry);
                                                const name = isId ? (allPlayersMap[entry]?.name || "?") : entry;
                                                return (
                                                    <span key={pIdx} className="px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[7px] text-purple-300">
                                                        {name}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <footer className="mt-8 border-t border-white/10 pt-6 flex justify-between items-center px-4 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-black text-xs">AI</div>
                    <div className="text-[10px] font-black uppercase text-white/40 tracking-widest">Verified by IPL Auction Engine Premium AI</div>
                </div>
                <div className="text-[12px] font-black uppercase text-blue-400 tracking-[0.2em] italic">#IPLAuctionVerdict2026</div>
            </footer>
        </div>
    );
};

export default GlobalResultCard;

