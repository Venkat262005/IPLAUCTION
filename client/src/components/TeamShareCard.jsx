import React from 'react';
import { ImAirplane } from 'react-icons/im';

const TeamShareCard = ({ team, allPlayersMap }) => {
    if (!team) return null;

    // Use the Star Player as the featured "Captain" for the card
    const featuredPlayerName = team.evaluation?.starPlayer;

    // Find the player entry for the featured player
    const featuredPlayerEntry = (team.playersAcquired || []).find(entry => {
        const pData = (entry.player && typeof entry.player === 'string') ? allPlayersMap[entry.player] : entry.player;
        const name = entry.name || pData?.player || pData?.name || pData?.playerName;
        return name === featuredPlayerName;
    });

    // Fallback to the first player if starPlayer is not found
    const displayPlayerEntry = featuredPlayerEntry || (team.playersAcquired || [])[0];
    const displayPlayerData = (displayPlayerEntry?.player && typeof displayPlayerEntry.player === 'string') ? allPlayersMap[displayPlayerEntry.player] : (displayPlayerEntry?.player || displayPlayerEntry);

    // Get display name
    const displayPlayerName = displayPlayerEntry?.name || displayPlayerData?.player || displayPlayerData?.name || "Captain";

    // Get image path from various possible fields
    const displayPlayerImage = displayPlayerEntry?.image_path || displayPlayerData?.image_path || displayPlayerData?.imagepath || displayPlayerData?.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayPlayerName}`;

    const themeColor = team.teamThemeColor || '#2d3401';

    // Adjust layout based on squad size
    const squadSize = (team.playersAcquired || []).length;
    const itemPadding = squadSize > 22 ? 'px-2 py-1' : (squadSize > 18 ? 'px-3 py-2' : (squadSize > 12 ? 'px-4 py-2.5' : 'px-8 py-5'));
    const textSize = squadSize > 22 ? 'text-xs' : (squadSize > 18 ? 'text-sm' : (squadSize > 12 ? 'text-xl' : 'text-3xl'));
    const iconSize = squadSize > 22 ? 'text-sm' : (squadSize > 18 ? 'text-base' : (squadSize > 12 ? 'text-lg' : 'text-3xl'));
    const gridGap = squadSize > 22 ? 'gap-y-1.5' : (squadSize > 18 ? 'gap-y-2' : 'gap-y-4');
    const gridCols = squadSize > 18 ? 'grid-cols-3' : 'grid-cols-2';
    const gridGapX = squadSize > 18 ? 'gap-x-4' : 'gap-x-12';
    const horizontalPadding = squadSize > 18 ? 'px-8' : 'px-20';

    return (
        <div
            id="team-share-card"
            className="w-[1000px] min-h-[1000px] h-fit text-white relative flex flex-col font-sans p-0 m-0 pb-20"
            style={{
                backgroundColor: themeColor,
                backgroundImage: `radial-gradient(circle at 20% 20%, rgba(255,255,255,0.15) 0%, transparent 40%), linear-gradient(135deg, ${themeColor} 0%, rgba(0,0,0,0.4) 100%)`,
            }}
        >
            {/* Decorative Dots Pattern (Top Left) */}
            <div className="absolute top-10 left-10 flex flex-col gap-4 opacity-30">
                <div className="flex gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                </div>
                <div className="flex gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                </div>
                <div className="flex gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                </div>
            </div>

            {/* Decorative Triangles (Bottom Left) */}
            <div className="absolute bottom-10 left-10 flex flex-col gap-6 opacity-40">
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-white"></div>
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-white"></div>
                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-b-[20px] border-b-white"></div>
            </div>

            {/* Header Content */}
            <div className="flex items-start justify-between px-20 pt-16 mb-6">
                {/* Featured Captain Circle */}
                <div className="relative group">
                    <div className="w-64 h-64 rounded-full border-[10px] border-white/90 overflow-hidden bg-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 text-center">
                        <img
                            src={displayPlayerImage}
                            alt={displayPlayerName}
                            className="w-full h-full object-cover object-top"
                            crossOrigin="anonymous"
                            onError={(e) => {
                                e.target.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayPlayerName}`;
                            }}
                        />
                    </div>
                    {/* Glow effect behind circle */}
                    <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-110 -z-10"></div>
                </div>

                {/* Team Branding */}
                <div className="text-right flex-1">
                    {(team.logoUrl || team.franchiseId?.logoUrl) && (
                        <div className="flex justify-end mb-4">
                            <img
                                src={team.logoUrl || team.franchiseId?.logoUrl}
                                alt="team logo"
                                className="h-28 w-auto object-contain brightness-0 invert"
                                crossOrigin="anonymous"
                            />
                        </div>
                    )}
                    <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mb-2 text-white">
                        {team.teamName}
                    </h1>
                    <h2 className="text-[120px] font-black uppercase tracking-tighter leading-[0.85] text-white/90">
                        SQUAD
                    </h2>
                </div>
            </div>

            {/* Squad Grid (Dynamic Columns) */}
            <div className={`grid ${gridCols} ${gridGapX} ${gridGap} ${horizontalPadding} mb-auto z-10 mt-8`}>
                {(team.playersAcquired || []).map((entry, idx) => {
                    const pData = (entry.player && typeof entry.player === 'string') ? allPlayersMap[entry.player] : (entry.player || entry);
                    const playerName = entry.name || pData?.player || pData?.name || "Unknown Player";

                    // Improved overseas logic with fallback to a global map
                    const nationality = (entry.nationality || pData?.nationality || '').toLowerCase().trim();
                    const isOverseas = entry.isOverseas || (nationality && !['india', 'indian', 'ind'].includes(nationality));

                    return (
                        <div
                            key={idx}
                            className={`bg-black/30 backdrop-blur-md border-[3px] border-white/20 rounded-[40px] ${itemPadding} flex items-center justify-between shadow-lg`}
                        >
                            <span className={`font-black ${textSize} uppercase italic tracking-tight text-white truncate pr-4`}>
                                {playerName}
                            </span>
                            {isOverseas && (
                                <ImAirplane className={`text-white ${iconSize} shrink-0 -rotate-45 opacity-90`} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="w-full px-20 py-8 flex justify-end items-center">
                <div className="text-sm font-black tracking-[0.3em] uppercase text-white/40 italic">
                    Generated by IPL Auction Verdict
                </div>
            </div>

            {/* Huge Watermark Background */}
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 text-[350px] font-black opacity-[0.03] pointer-events-none select-none italic text-white leading-none whitespace-nowrap -z-20 uppercase">
                {team.teamName.split(' ')[0]}
            </div>
        </div>
    );
};

export default TeamShareCard;

