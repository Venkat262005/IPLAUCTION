const { GoogleGenerativeAI } = require('@google/generative-ai');
const AIQueue = require('./AIQueue');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const validateSquad = (team) => {
    const players = team.playersAcquired || [];
    const squadSize = players.length;

    if (squadSize < 18) return { valid: false, reason: `Squad has only ${squadSize} players. Minimum 18 required.` };

    let overseas = 0;
    players.forEach(p => {
        let playerDoc = null;
        if (p.player && typeof p.player === 'object') playerDoc = p.player;
        else if (p.role || p.nationality) playerDoc = p;

        if (playerDoc) {
            const nation = (playerDoc.nationality || '').toLowerCase().trim();
            if (nation && !['india', 'indian', 'ind'].includes(nation)) {
                overseas++;
            }
        }
    });

    if (overseas > 8) return { valid: false, reason: `Squad has ${overseas} Overseas players. Maximum 8 allowed.` };

    return { valid: true };
};

const evaluateTeam = async (team) => {
    const validation = validateSquad(team);
    let validationWarning = null;
    
    if (!validation.valid) {
        console.log(`--- [AI-VALIDATION] Squad for ${team.teamName} is technically disqualified: ${validation.reason} ---`);
        validationWarning = validation.reason;
        // We will proceed with evaluation but with a heavy penalty flag
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-flash-latest';
    const model = genAI.getGenerativeModel({ model: modelName });

    // We always calculate the "Ideal" AI recommendation for display in the Team Profile
    console.log(`--- [AI] Generating Strategic Recommendation for ${team.teamName} ---`);
    let aiRecommendation = { homePlaying11: [], awayPlaying11: [], impactPlayers: [] };
    try {
        aiRecommendation = await selectPlaying11AndImpact(team.teamName, team.playersAcquired);
    } catch (selErr) {
        console.error('AI recommendation failed:', selErr.message);
        const ids = team.playersAcquired.map(p => String(p.id || p._id));
        aiRecommendation.homePlaying11 = ids.slice(0, 11);
        aiRecommendation.awayPlaying11 = ids.slice(0, 11);
        aiRecommendation.impactPlayers = ids.slice(11, 15);
    }

    // Lineups for the evaluation: We prioritize the USER'S selection for the Verdict/Rating
    const userXI = team.playing11 || [];
    const userImpact = team.impactPlayers || [];

    // AI's recommendation for the Team Profile display
    const homePlaying11 = aiRecommendation.homePlaying11;
    const awayPlaying11 = aiRecommendation.awayPlaying11;
    const recImpact = aiRecommendation.impactPlayers;

    const bench = team.playersAcquired.filter(
        p => !userXI.concat(userImpact).includes(String(p.id || p._id))
    );

    const prompt = `
You are an IPL Historian, Auction Analyst, and T20 Strategy Expert.

Evaluate the drafted squad. The user has locked in their Starting XI and Impact Subs (USER'S SELECTION). Your job is to judge their choices while also providing your own recommendations.

${validationWarning ? `WARNING: This squad is technically DISQUALIFIED because: ${validationWarning}. Please take this into account and provide a significantly lower score.` : ''}

USER'S SELECTED STARTING XI:
${userXI.map(id => {
        const p = team.playersAcquired.find(pa => String(pa.id || pa._id) === id);
        if (!p) return `Unknown Player (ID:${id})`;
        const s = p.stats || {};
        return `${p.name} (${p.role}) | SR ${s.strikeRate} Avg ${s.average} Wkts ${s.wickets} Econ ${s.economy}`;
    }).join('\n')}

USER'S SELECTED IMPACT SUBS:
${userImpact.map(id => {
        const p = team.playersAcquired.find(pa => String(pa.id || pa._id) === id);
        if (!p) return `Unknown Player (ID:${id})`;
        const s = p.stats || {};
        return `${p.name} (${p.role}) | SR ${s.strikeRate} Econ ${s.economy}`;
    }).join('\n')}

SQUAD DEPTH (BENCH):
${bench.map(p => `${p.name} (${p.role}) | SR ${p.stats?.strikeRate || 0} Econ ${p.stats?.economy || 0}`).join('\n')}

AI COACH'S RECOMMENDED HOME XI:
${homePlaying11.map(id => team.playersAcquired.find(pa => String(pa.id || pa._id) === id)?.name || id).join(', ')}

AI COACH'S RECOMMENDED AWAY XI:
${awayPlaying11.map(id => team.playersAcquired.find(pa => String(pa.id || pa._id) === id)?.name || id).join(', ')}

STRATEGIC ANALYSIS DATA:
For evaluation, treat every player as their IPL PRIME version.

EVALUATION CRITERIA:
1. Rate the USER'S SELECTED STARTING XI (11 players) and IMPACT SUBS (4 players) strictly.
2. Check for Role Balance in the USER'S SELECTION:
   - Does it have a specialist Wicketkeeper? (Note: MS Dhoni, Sanju Samson, Rishabh Pant, etc. are keepers even if listed as Batsmen-Keeper).
   - Are there 5+ bowling options?
   - Is there a proper balance of Anchor vs Aggressor?
3. Judge the Auction Strategy: Did they buy too many similar legends without a plan?
4. Use the SQUAD DEPTH to suggest if better players were left on the bench.

Respond ONLY with JSON:

{
  "battingScore": 1-10,
  "bowlingScore": 1-10,
  "balanceScore": 1-10,
  "impactScore": 1-10,
  "overallScore": 1-100,
  "starPlayer": "Name",
  "hiddenGem": "Name",
  "homePlaying11": ["Name"],
  "awayPlaying11": ["Name"],
  "homeImpactPlayers": ["Name"],
  "awayImpactPlayers": ["Name"],
  "tacticalVerdict": "Detailed analysis of the USER'S SELECTION",
  "weakness": "Biggest structural weakness in the USER'S SELECTION",
  "benchAnalysis": "How the bench could improve the starting XI",
  "historicalContext": "Comparison to famous IPL team"
}

Return ONLY JSON.
`;

    try {
        const text = await AIQueue.enqueue(async () => {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        });

        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanedText);
        if (validationWarning) {
            result.tacticalVerdict = `[RULES VIOLATION] ${validationWarning}. ${result.tacticalVerdict}`;
        }
        return result;

    } catch (err) {
        console.error(`AI evaluation failed for ${team.teamName}`, err);
        return {
            overallScore: validationWarning ? 20 : 50,
            tacticalVerdict: `AI service unavailable. ${validationWarning ? `Disqualification noted: ${validationWarning}` : 'Fallback score applied.'}`,
            battingScore: 5, bowlingScore: 5, balanceScore: 5, impactScore: 5,
            homePlaying11: aiRecommendation?.homePlaying11 || [],
            awayPlaying11: aiRecommendation?.awayPlaying11 || [],
            homeImpactPlayers: aiRecommendation?.homeImpactPlayers || [],
            awayImpactPlayers: aiRecommendation?.awayImpactPlayers || []
        };
    }
};

const selectPlaying11AndImpact = async (teamName, players) => {
    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
You are a T20 head coach.

Team: ${teamName}

Select the absolute best lineups from the available squad:
1. Best Home Playing 11 (Optimized for spin/slow tracks)
2. 4 Home Impact Players (Must NOT be in the Home Playing 11)
3. Best Away Playing 11 (Optimized for pace/bounce)
4. 4 Away Impact Players (Must NOT be in the Away Playing 11)

MANDATORY RULES:
1. Each Playing 11 MUST include exactly ONE specialist Wicketkeeper.
2. Ensure a balance of at least 5 bowling options.
3. NO OVERLAP: A player in the Playing 11 cannot be an Impact Sub for the SAME mode.
4. Maximum 4 Overseas players in any Playing 11.

Players:
${players.map(p =>
        `ID:${p.id} Name:${p.name} Role:${p.role} SR:${p.stats?.strikeRate} Econ:${p.stats?.economy}`
    ).join('\n')}

Return JSON:
{
"homePlaying11":["id"],
"homeImpactPlayers":["id"],
"awayPlaying11":["id"],
"awayImpactPlayers":["id"]
}
`;

    try {
        // Route through AIQueue to avoid 429s (this was previously an unqueued direct call)
        const text = await AIQueue.enqueue(async () => {
            const result = await model.generateContent(prompt);
            return result.response.text();
        });

        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned);

    } catch {
        return {
            homePlaying11: players.slice(0, 11).map(p => String(p.id)),
            homeImpactPlayers: players.slice(11, 15).map(p => String(p.id)),
            awayPlaying11: players.slice(0, 11).map(p => String(p.id)),
            awayImpactPlayers: players.slice(11, 15).map(p => String(p.id))
        };
    }
};

const evaluateAllTeams = async (teamsData) => {

    const evaluations = await Promise.all(
        teamsData.map(async team => {

            if (team.evaluation && team.evaluation.overallScore > 0) {
                return team;
            }

            let evaluation;

            try {
                evaluation = await evaluateTeam(team);
            } catch {
                evaluation = { overallScore: 50 };
            }

            return { ...team, evaluation };

        })
    );

    // Sort descending by score then assign rank (1 = highest score)
    const sorted = evaluations.sort((a, b) => b.evaluation.overallScore - a.evaluation.overallScore);
    sorted.forEach((team, i) => { team.rank = i + 1; });
    return sorted;

};

module.exports = {
    evaluateAllTeams,
    selectPlaying11AndImpact,
    evaluateTeam,
    validateSquad
};
