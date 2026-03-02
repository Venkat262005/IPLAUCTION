const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const validateSquad = (team) => {
    const players = team.playersAcquired;
    const squadSize = players.length;

    // Minimum 15 players (11 starters + 4 impact)
    if (squadSize < 15) return { valid: false, reason: `Squad has only ${squadSize} players. Minimum 15 required for evaluation.` };
    if (squadSize > 25) return { valid: false, reason: `Squad has ${squadSize} players. Maximum 25 allowed.` };

    let wks = 0;
    let bowlersOrAR = 0;
    let overseas = 0;

    players.forEach(p => {
        // Handle both embedded player doc and flattened structure
        const playerDoc = p.player || p;
        const role = (playerDoc.role || '').toLowerCase().trim();
        const nation = (playerDoc.nationality || '').toLowerCase().trim();

        if (role.includes('keep') || role.includes('wk')) wks++;
        if (role.includes('bowl') || role.includes('all')) bowlersOrAR++;
        if (nation && nation !== 'india') overseas++;
    });

    if (wks < 1) return { valid: false, reason: `Squad has no Wicketkeeper. Minimum 1 required.` };
    if (bowlersOrAR < 5) return { valid: false, reason: `Squad has only ${bowlersOrAR} Bowler(s)/All-rounder(s). Minimum 5 required.` };
    if (overseas > 8) return { valid: false, reason: `Squad has ${overseas} Overseas players. Maximum 8 allowed.` };

    return { valid: true };
};

const evaluateTeam = async (team) => {
    const validation = validateSquad(team);
    if (!validation.valid) {
        console.log(`--- Evaluation Disqualified for ${team.teamName}: ${validation.reason} ---`);
        return {
            battingScore: 0, bowlingScore: 0, balanceScore: 0, impactScore: 0, overallScore: 0,
            starPlayer: "N/A", hiddenGem: "N/A", playing11: [], impactPlayers: [],
            tacticalVerdict: `DISQUALIFIED: ${validation.reason}`,
            weakness: validation.reason,
            historicalContext: "Failed to meet mandatory squad composition requirements."
        };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Preparation for evaluation: Identify slow batsmen, bowling variety, etc.
    const playing11 = team.playing11 || [];
    const impactPlayers = team.impactPlayers || [];
    const bench = team.playersAcquired.filter(p => !playing11.concat(impactPlayers).includes(p.id));

    const prompt = `
You are an IPL Historian & Analytics Expert. Your goal is to evaluate the drafted squad based on their HISTORICAL IPL IMPACT and performance trends. 

IMPORTANT: 
1. Ignore the actual age or current physical state of the players. Treat them as the "Prime" or "Peak" versions of themselves based on their best IPL contributions.
2. Focus on their past impacts, match-winning performances, and legacy in the IPL.
3. Evaluate how their styles complement each other in a modern T20 context.

Team Name: ${team.teamName}
Total Budget: ₹12000L
Budget Remaining: ₹${team.currentPurse || team.budgetRemaining}L

SELECTED PLAYING 11:
${playing11.map(id => {
        const p = team.playersAcquired.find(pa => pa.id === id);
        if (!p) return `- [Unknown ID: ${id}]`;
        const s = p.stats || {};
        return `- ${p.name} (${p.role}, ${p.nationality}) | Matches: ${s.matches}, Runs: ${s.runs}, SR: ${s.strikeRate}, Avg: ${s.average}, Wickets: ${s.wickets}, Econ: ${s.economy}`;
    }).join('\n')}

IMPACT PLAYERS (4):
${impactPlayers.map(id => {
        const p = team.playersAcquired.find(pa => pa.id === id);
        if (!p) return `- [Unknown ID: ${id}]`;
        const s = p.stats || {};
        return `- ${p.name} (${p.role}, ${p.nationality}) | SR: ${s.strikeRate}, Econ: ${s.economy}`;
    }).join('\n')}

BENCH STRENGTH (${bench.length} players):
${bench.map(p => `- ${p.name} (${p.role}) | SR: ${p.stats?.strikeRate || 0}, Econ: ${p.stats?.economy || 0}`).join('\n')}

CRITICAL EVALUATION METRICS:
1. **Historical Dominance**: Do the core players have a history of winning matches?
2. **Phase Mastery**: How well do they control Powerplay, Middle Overs, and Death?
3. **Synergy**: Do the playing styles of the $11+4$ combine for a complete T20 unit?
4. **Impact Factor**: How much did these players influence IPL games in their peak seasons?

DIRECTIONS:
1. **Judgment**: Use the provided stats AND your knowledge of their peak IPL performance. 
2. **No Ageism**: Do NOT call out players for being "old" or "retired". Focus on their historical impact.
3. **JSON Structure**: You MUST respond with ONLY a JSON object matching the exact structure below.

RESPOND ONLY WITH A VALID JSON OBJECT matching this EXACT structure:
{
  "battingScore": <1-10>,
  "bowlingScore": <1-10>,
  "balanceScore": <1-10>,
  "impactScore": <1-10>,
  "overallScore": <1-100 (Be extremely precise)>,
  "starPlayer": "<Name of biggest historical match-winner>",
  "hiddenGem": "<Name of a high-value steal based on historical data>",
  "playing11": ["Name1", "Name2", ... (The 11 starters)],
  "impactPlayers": ["Name1", "Name2", "Name3", "Name4"],
  "tacticalVerdict": "Analysis of the team's balance/impact based on historical IPL performances.",
  "weakness": "Gap in the team's historical composition.",
  "benchAnalysis": "How reliable the backups were in their prime.",
  "historicalContext": "A comparison to a legendary IPL season or team."
}
No other text. Be an expert, be accurate, focus on legacy and impact.
`;

    try {
        console.log(`--- AI Evaluation Starting for ${team.teamName} ---`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Error in AI evaluation:', error);
        return {
            battingScore: 0, bowlingScore: 0, balanceScore: 0, impactScore: 0, overallScore: 0,
            starPlayer: "N/A", hiddenGem: "N/A", playing11: [], impactPlayers: [],
            tacticalVerdict: "Evaluation failed.",
            weakness: "No data available.",
            historicalContext: "N/A"
        };
    }
};

const selectPlaying11AndImpact = async (teamName, players) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `
You are an elite T20 Franchise Cricket Head Coach. Your team "${teamName}" has drafted ${players.length} players.
You must select the BEST "Playing 11" and "4 Impact Players".

Drafted Players with Stats:
${players.map((p, i) => `ID: [${p.player?._id || p.player || p.id}] | Name: ${p.player?.player || p.name} | Role: ${p.player?.role} | SR: ${p.player?.stats?.strikeRate || 0}, Econ: ${p.player?.stats?.economy || 0}`).join('\n')}

Tactical requirements:
1. Balanced Playing 11 (Openers, Middle Order, Finisher, Wicket-keeper, Diverse Bowlers).
2. Exactly 4 Impact Players who provide strategic depth or tactical substitutions.

RESPOND ONLY WITH A VALID JSON OBJECT:
{
  "playing11": ["id1", "id2", ..., "id11"],
  "impactPlayers": ["id12", "id13", "id14", "id15"]
}
No other text. IDs must be the bracketed strings from above.
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const selection = JSON.parse(cleanedText);

        if (selection.playing11 && selection.impactPlayers) {
            return selection;
        }
        return {
            playing11: players.slice(0, 11).map(p => String(p.player?._id || p.player || p.id)),
            impactPlayers: players.slice(11, 15).map(p => String(p.player?._id || p.player || p.id))
        };
    } catch (error) {
        console.error('Error in AI squad selection:', error);
        return {
            playing11: players.slice(0, 11).map(p => String(p.player?._id || p.player || p.id)),
            impactPlayers: players.slice(11, 15).map(p => String(p.player?._id || p.player || p.id))
        };
    }
};

const evaluateAllTeams = async (teamsData) => {
    const evaluations = await Promise.all(
        teamsData.map(async (team) => {
            // Check if we already have a background evaluation
            if (team.evaluation && team.evaluation.overallScore > 0) {
                return team;
            }

            const validation = validateSquad(team);

            if (!validation.valid) {
                return {
                    ...team,
                    evaluation: {
                        overallScore: 0,
                        tacticalVerdict: `DISQUALIFIED: ${validation.reason}`,
                    }
                };
            }

            let evaluation;
            try {
                console.log(`--- EVALUATING SQUAD FOR ${team.teamName} ---`);
                evaluation = await evaluateTeam(team);
            } catch (e) {
                console.error(`Evaluation Error for ${team.teamName}:`, e);
                evaluation = { overallScore: 50, tacticalVerdict: "AI failed, fallback score." };
            }
            return { ...team, evaluation };
        })
    );

    return await MasterRanker(evaluations);
};

const MasterRanker = async (evaluations) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `
Final Ranking of IPL Teams.
Evaluations:
${evaluations.map(e => `- ${e.teamName}: Score ${e.evaluation.overallScore} | Verdict: ${e.evaluation.tacticalVerdict}`).join('\n')}

CRITICAL: Rank 1 to ${evaluations.length}. No ties.
RESPOND ONLY AS JSON: [{"teamName": "Name", "rank": 1}, ...]
`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const rankings = JSON.parse(cleanedText);

        return evaluations.map(team => {
            const rankData = rankings.find(r => r.teamName === team.teamName);
            return {
                ...team,
                rank: rankData ? rankData.rank : 99
            };
        }).sort((a, b) => a.rank - b.rank);
    } catch (error) {
        return evaluations.sort((a, b) => b.evaluation.overallScore - a.evaluation.overallScore).map((t, i) => ({ ...t, rank: i + 1 }));
    }
};

module.exports = { evaluateAllTeams, selectPlaying11AndImpact, evaluateTeam };

