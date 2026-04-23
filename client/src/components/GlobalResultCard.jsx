import React from 'react';

const GlobalResultCard = ({ results }) => {
    if (!results || results.length === 0) return null;

    // Sort results by overall score descending
    const sortedResults = [...results].sort((a, b) => {
        const scoreA = a.evaluation?.overallScore || 0;
        const scoreB = b.evaluation?.overallScore || 0;
        return scoreB - scoreA;
    });

    return (
        <div
            id="global-result-card"
            className="w-full min-h-screen xl:h-[1080px] relative flex flex-col font-sans overflow-hidden bg-[#0d1117] text-white"
        >
            {/* Ambient Animated Gradients Context */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600 rounded-full blur-[150px] opacity-30 animate-pulse"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[900px] h-[900px] bg-purple-600 rounded-full blur-[180px] opacity-20"></div>
                <div className="absolute top-[40%] left-[60%] w-[600px] h-[600px] bg-emerald-500 rounded-full blur-[130px] opacity-20"></div>
            </div>

            {/* Header */}
            <header className="text-center pt-8 md:pt-16 pb-6 md:pb-10 relative z-10 w-full px-4">
                <h1 className="text-4xl md:text-6xl font-black uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-[#fbbf24] via-[#f59e0b] to-[#fbbf24] drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                    Ultimate Squad Leaderboard
                </h1>
                <p className="tracking-[0.2em] md:tracking-[0.4em] text-white/50 text-sm md:text-xl mt-4 font-semibold">
                    MATHEMATICAL EVALUATION INDEX
                </p>
            </header>

            {/* Leaderboard Table Container */}
            <div className="flex-1 w-full px-4 md:px-24 py-4 relative z-10 overflow-hidden flex flex-col items-center">
                <div className="w-full max-w-[1600px] bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-2xl rounded-3xl overflow-x-auto flex flex-col">
                    
                    <div className="min-w-[1000px] flex flex-col">
                    {/* Table Headers */}
                    <div className="grid grid-cols-[100px_350px_1fr_1fr_1fr] gap-6 px-12 py-6 bg-black/40 border-b border-white/10 text-sm font-bold uppercase tracking-[0.25em] text-white/60">
                        <div className="text-center">Rank</div>
                        <div>Franchise</div>
                        <div className="text-center text-blue-400">Batting Rating</div>
                        <div className="text-center text-emerald-400">Bowling Rating</div>
                        <div className="text-center text-amber-400">Final Rating</div>
                    </div>

                    {/* Table Rows Container - Scrollable if needed, but optimally sized for 1920x1080 */}
                    <div className="flex flex-col overflow-y-auto custom-scrollbar">
                        {sortedResults.map((team, idx) => {
                            const isTop3 = idx < 3;
                            const overallScore = team.evaluation?.overallScore || 0;
                            const batScore = team.evaluation?.battingScore || 0;
                            const bowlScore = team.evaluation?.bowlingScore || 0;
                            const logoPath = team.logoUrl || team.franchiseId?.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(team.teamName)}`;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className={`
                                        grid grid-cols-[100px_350px_1fr_1fr_1fr] gap-6 px-12 py-5 items-center
                                        border-b border-white/5 hover:bg-white/[0.05] transition-colors duration-300
                                        ${idx % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'}
                                    `}
                                >
                                    {/* Rank */}
                                    <div className="flex justify-center">
                                        <div className={`
                                            w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg
                                            ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-amber-600 text-black shadow-amber-500/50' : 
                                              idx === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black shadow-slate-400/50' : 
                                              idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-700 text-black shadow-orange-700/50' : 
                                              'bg-white/10 text-white/80'}
                                        `}>
                                            #{idx + 1}
                                        </div>
                                    </div>

                                    {/* Franchise Logo & Name */}
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-full bg-white/5 p-2 flex items-center justify-center border border-white/10 shadow-inner">
                                            <img src={logoPath} alt={team.teamName} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="font-extrabold text-2xl tracking-wide w-full truncate">
                                            {team.teamName}
                                        </div>
                                    </div>

                                    {/* Batting Rating */}
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <span className="text-3xl font-bold text-blue-100">{batScore}</span>
                                        <div className="w-3/4 h-2 bg-black/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${batScore}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Bowling Rating */}
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <span className="text-3xl font-bold text-emerald-100">{bowlScore}</span>
                                        <div className="w-3/4 h-2 bg-black/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${bowlScore}%` }}></div>
                                        </div>
                                    </div>

                                    {/* Final Rating */}
                                    <div className="flex items-center justify-center">
                                        <div className={`
                                            px-8 py-3 rounded-full text-2xl font-black border-2 shadow-[0_0_20px_rgba(0,0,0,0.2)]
                                            ${isTop3 ? 'bg-gradient-to-r from-amber-400 to-orange-500 border-amber-300 text-black' : 'bg-white/10 border-white/20 text-white'}
                                        `}>
                                            {overallScore} PTS
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                </div>
            </div>

            {/* Minimalist Footer */}
            <footer className="mt-auto px-4 md:px-16 py-8 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10 w-full bg-black/30 border-t border-white/10 backdrop-blur-md">
                <div className="text-sm font-bold uppercase text-white/40 tracking-[0.2em]">
                    CALCULATED VIA RAW METRICS
                </div>
                <div className="text-sm font-bold uppercase text-[#fbbf24] tracking-[0.2em] animate-pulse">
                    #IPLAUCTIONRESULT2026
                </div>
            </footer>
        </div>
    );
};

export default GlobalResultCard;
