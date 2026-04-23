const AIQueue = require("./AIQueue");

const HF_KEY = process.env.HUGGINGFACE_API_KEY;
const HF_MODEL = process.env.HUGGINGFACE_MODEL || "openai/gpt-oss-20b";

// ───────── SAFE PARSER ─────────
function safeParse(text) {
    if (!text || typeof text !== "string") throw new Error("INVALID_INPUT");

    // Remove <think> or Harmony-style <reasoning> blocks if they exist
    let cleaned = text.replace(/<(think|reasoning|thought)>[\s\S]*?<\/(think|reasoning|thought)>/g, "").trim();

    const start = cleaned.search(/[\[\{]/);
    if (start === -1) throw new Error("NO_JSON");

    cleaned = cleaned.substring(start);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (end !== -1) cleaned = cleaned.substring(0, end + 1);

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        throw new Error("JSON_PARSE_ERR");
    }
}

// ───────── HUGGING FACE ─────────
async function huggingfaceAdapterBatch(teamsData) {
    if (!teamsData || !teamsData.length) return { results: [] };
    
    if (!HF_KEY || HF_KEY === "hf_your_token_here") {
        throw new Error("MISSING_HF_KEY");
    }
    
    console.log(`[HF BATCH] Launching unified batched evaluation for ${teamsData.length} teams...`);
    
    const prompt = batchedPrompt(teamsData);
    const systemPrompt = "Reasoning: high\nYou are an ELITE IPL Analyst. You process ALL teams in the batch and output an array of precise results. ONLY output valid JSON following the schema perfectly. Do NOT truncate the JSON output.";

    try {
        const baseUrl = process.env.AI_BASE_URL || "https://router.huggingface.co/v1/chat/completions";
        const res = await fetch(baseUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${HF_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: HF_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: prompt }
                ],
                max_tokens: 3000,
                temperature: 0.1
            })
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(`HF_STATUS_${res.status}: ${JSON.stringify(errBody)}`);
        }

        const data = await res.json();
        const msg = data.choices ? data.choices[0].message : null;
        
        if (!msg) throw new Error("HF_EMPTY");
        
        let text = msg.content || "";
        if (msg.reasoning && msg.reasoning.trim() !== "") {
            text += "\n" + msg.reasoning;
        }
        
        if (!text || text.trim() === "") throw new Error("HF_EMPTY");
        
        const parsed = safeParse(text);
        if (!parsed.results || !Array.isArray(parsed.results)) throw new Error("INVALID_BATCH_SCHEMA");
        
        return parsed;
    } catch (err) {
        console.error(`[HF BATCH ERROR]`, err.message);
        throw err;
    }
}

// ───────── PROMPT TEMPLATE ─────────
const batchedPrompt = (teams) => {
    // Minify the prompt (no extra spacing) and strip redundant fields to minimize token usage!
    return JSON.stringify({
        task: "analyze_all_teams",
        rules: [
            "select best balanced XI from squad",
            "select exactly 4 impact players",
            "evaluate players at IPL peak performance",
            "provide dynamic insights",
            "RETURN EXACTLY ONE UNIFIED JSON OBJECT CONTAINING THE RESULTS ARRAY"
        ],
        input: teams.map(team => ({
            teamId: team.teamId || team.id || team.teamName,
            teamName: team.teamName || team.name,
            home_pitch: team.home_pitch || "Flat",
            squad: (team.playersAcquired || []).map(p => ({
                name: p.name,
                role: p.role,
                isOverseas: !!p.isOverseas
            }))
        })),
        output_format: {
            results: [
                {
                    teamId: "string (must match input teamId)",
                    bestXI: { playing11: ["names"], impactPlayers: ["names"] },
                    homeXI: { playing11: ["names"], impactPlayers: ["names"] },
                    awayXI: { playing11: ["names"], impactPlayers: ["names"] },
                    evaluation: {
                        overallScore: 0,
                        battingScore: 0,
                        bowlingScore: 0,
                        balanceScore: 0,
                        impactScore: 0,
                        starPlayer: "string",
                        bestValuePick: "string",
                        tacticalVerdict: "string (max 60 words)",
                        historicalContext: "string (max 30 words)",
                        homeGroundVerdict: "string (max 30 words)",
                        weakness: "string (max 40 words)",
                        benchAnalysis: "string (max 30 words)",
                        playing11: ["names"],
                        impactPlayers: ["names"]
                    }
                }
            ]
        }
    }); // No indentation to drastically compress tokens
};

// ───────── CONFIG & MAPPING ─────────
const PITCH_MAPPING = {
    "Mumbai Indians": "Pace",
    "Chennai Super Kings": "Spin",
    "Royal Challengers Bangalore": "Flat",
    "Kolkata Knight Riders": "Spin",
    "Rajasthan Royals": "Pace",
    "Sunrisers Hyderabad": "Flat",
    "Delhi Capitals": "Pace",
    "Punjab Kings": "Flat",
    "Gujarat Titans": "Pace",
    "Lucknow Super Giants": "Spin"
};

function getHomePitch(teamName) {
    return PITCH_MAPPING[teamName] || "Flat";
}

// ───────── FALLBACKS ─────────
function selectionFallback(team) {
    const players = team.playersAcquired || [];
    
    const batPool = [];
    const arPool = [];
    const bowlPool = [];
    
    players.forEach(p => {
        const role = (p.role || "").toLowerCase();
        if (role.includes("all") || role.includes("ar") || role.includes("allrounder")) {
            arPool.push(p);
        } else if (role.includes("bowl") || role.includes("bowler")) {
            bowlPool.push(p);
        } else {
            batPool.push(p);
        }
    });

    const sortByPoints = (a, b) => (parseFloat(b.points) || 0) - (parseFloat(a.points) || 0);
    batPool.sort(sortByPoints);
    arPool.sort(sortByPoints);
    bowlPool.sort(sortByPoints);

    const selectedBatsmen = batPool.slice(0, 5);
    const selectedArs = arPool.slice(0, 3);
    const selectedBowlers = bowlPool.slice(0, 4);

    const corePlayers = [...selectedBatsmen, ...selectedArs, ...selectedBowlers];
    const coreNames = corePlayers.map(p => p.name);
    
    const playing11 = coreNames.slice(0, 11);
    
    const remainingPlayers = players
        .filter(p => !coreNames.includes(p.name))
        .sort(sortByPoints);
        
    const impactPlayers = [
        ...coreNames.slice(11), 
        ...remainingPlayers.map(p => p.name)
    ].slice(0, 4);

    const xi = {
        playing11: playing11,
        impactPlayers: impactPlayers
    };
    
    return {
        teamId: team.id || team.teamName,
        bestXI: xi,
        homeXI: xi,
        awayXI: xi
    };
}

function evaluationFallback(team, errorMsg = "") {
    const players = team.playersAcquired || [];
    
    const batPool = [];
    const arPool = [];
    const wkPool = [];
    const bowlPool = [];
    
    players.forEach(p => {
        const role = (p.role || "").toLowerCase();
        const score = parseFloat(p.points || 0);
        
        if (role.includes("wk") || role.includes("wicket") || role.includes("keeper")) {
            wkPool.push(score);
        } else if (role.includes("all") || role.includes("ar") || role.includes("allrounder")) {
            arPool.push(score);
        } else if (role.includes("bowl") || role.includes("bowler")) {
            bowlPool.push(score);
        } else {
            // Default to batter
            batPool.push(score);
        }
    });

    batPool.sort((a, b) => b - a);
    arPool.sort((a, b) => b - a);
    wkPool.sort((a, b) => b - a);
    bowlPool.sort((a, b) => b - a);

    const getSum = (arr, count) => {
        let sum = 0;
        for (let i = 0; i < count; i++) {
            sum += arr[i] || 0; // 0 for missing slots
        }
        return sum;
    };

    const batSum = getSum(batPool, 6);
    const arSum = getSum(arPool, 4);
    const wkSum = getSum(wkPool, 2);
    const bowlSum = getSum(bowlPool, 6);

    // Pure Mathematical Averages
    const batAvg = Math.round((batSum + arSum + wkSum) / 12);
    const bowlAvg = Math.round((bowlSum + arSum) / 10);
    const finalOverall = Math.round((batSum + arSum + wkSum + bowlSum) / 18);

    const sortedPlayers = [...players].sort((a, b) => (parseFloat(b.points) || 0) - (parseFloat(a.points) || 0));
    const starPlayer = sortedPlayers.length > 0 ? sortedPlayers[0].name : "Unknown";

    return {
        overallScore: finalOverall,
        battingScore: batAvg,
        bowlingScore: bowlAvg,
        balanceScore: Math.round(((batAvg + bowlAvg) / 2)),
        impactScore: finalOverall,
        starPlayer: starPlayer,
        bestValuePick: "Calculated",
        tacticalVerdict: errorMsg ? `AI OFFLINE (Math Fallback): ${errorMsg}` : "Advanced Math Fallback Applied",
        historicalContext: "",
        homeGroundVerdict: "",
        weakness: "",
        benchAnalysis: "",
        playing11: players.slice(0, 11).map(p => p.name),
        impactPlayers: players.slice(11, 15).map(p => p.name)
    };
}

// ───────── MAIN SERVICE ─────────
async function evaluateAllTeams(teams) {
    if (!teams || teams.length === 0) return [];
    console.log(`[AI-BATCH] Unified analysis for ${teams.length} teams...`);

    // Enrich with pitch and budget context
    const enrichedInput = teams.map(t => ({
        ...t,
        home_pitch: getHomePitch(t.name || t.teamName),
        budget: {
            total: t.currentPurse || 0,
            player_costs: (t.playersAcquired || []).reduce((acc, p) => ({ ...acc, [p.name]: p.boughtFor }), {})
        }
    }));

    try {
        const batchSize = 5;
        let allResults = [];
        let anyError = null;
        const evaluationId = Date.now() + "_" + Math.floor(Math.random() * 1000);

        for (let i = 0; i < enrichedInput.length; i += batchSize) {
            const chunk = enrichedInput.slice(i, i + batchSize);
            console.log(`[AI-CHUNK] Processing chunk of ${chunk.length} teams to respect context token limits.`);
            
            const res = await AIQueue.enqueue({
                type: `unified_analyze_${evaluationId}_chunk_${i}`,
                data: chunk,
                providers: {
                    huggingface: (data) => huggingfaceAdapterBatch(data)
                }
            });

            if (res.results && Array.isArray(res.results)) {
                allResults.push(...res.results);
            }
            if (res.error) {
                anyError = res.error;
            }
        }

        return teams.map(t => {
            const teamId = t.id || t.teamName;
            const evalResult = allResults.find(r => r.teamId === teamId);
            
            if (!evalResult || evalResult.fallback) {
                const fallbackSelection = selectionFallback(t);
                return {
                    teamId,
                    teamName: t.teamName,
                    bestXI: fallbackSelection.bestXI,
                    homeXI: fallbackSelection.homeXI,
                    awayXI: fallbackSelection.awayXI,
                    evaluation: evaluationFallback(t, anyError || "AI generation fallback triggered.")
                };
            }

            // Ensure Home/Away XI exist if AI missed them
            const fallbackSelection = selectionFallback(t);
            const defaultXI = fallbackSelection.bestXI;
            const safeSelect = (s) => (s && Array.isArray(s.playing11)) ? s : (evalResult.bestXI && Array.isArray(evalResult.bestXI.playing11) ? evalResult.bestXI : defaultXI);

            const fallbackEval = evaluationFallback(t, "Missing AI properties merged with math fallback");

            return {
                ...evalResult,
                teamName: t.teamName,
                bestXI: safeSelect(evalResult.bestXI),
                homeXI: safeSelect(evalResult.homeXI),
                awayXI: safeSelect(evalResult.awayXI),
                evaluation: {
                    ...fallbackEval,
                    ...(evalResult.evaluation || {})
                }
            };
        });
    } catch (err) {
        console.error("[BATCH ERROR]", err.message);
        return teams.map(t => ({
            teamId: t.id || t.teamName,
            teamName: t.name || t.teamName,
            bestXI: selectionFallback(t),
            evaluation: evaluationFallback(t, err.message)
        }));
    }
}

module.exports = {
    evaluateAllTeams,
    getHomePitch
};