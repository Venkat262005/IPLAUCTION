require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

/**
 * AI Status Checker
 * Pings all configured providers to verify connectivity and quota status.
 */
async function checkStatus() {
    console.log('\n🔍 --- AI PROVIDER STATUS CHECK ---\n');

    // 1. Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    if (geminiKey) {
        try {
            console.log(`[Gemini] Testing ${geminiModel}...`);
            const genAI = new GoogleGenerativeAI(geminiKey);
            // v1 is newer and more stable for 1.5-flash
            const model = genAI.getGenerativeModel({ model: geminiModel }, { apiVersion: 'v1' });
            const result = await model.generateContent("Say 'Gemini Online'");
            console.log(`✅ Gemini: OK ("${result.response.text().trim()}")`);
        } catch (err) {
            if (err.message?.includes('429')) {
                console.warn(`🛑 Gemini: RATE LIMITED (Quota Exceeded)`);
            } else if (err.message?.includes('404')) {
                console.error(`❌ Gemini: MODEL NOT FOUND (Check if '${geminiModel}' is correct for your region)`);
            } else {
                console.error(`❌ Gemini: FAILED (${err.message})`);
            }
        }
    } else {
        console.log(`⚪ Gemini: SKIPPED (No API Key)`);
    }

    console.log('');

    // 2. Groq
    const groqKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    if (groqKey) {
        try {
            console.log(`[Groq] Testing ${groqModel}...`);
            const groq = new Groq({ apiKey: groqKey });
            const chatCompletion = await groq.chat.completions.create({
                messages: [{ role: 'user', content: "Say 'Groq Online'" }],
                model: groqModel,
            });
            console.log(`✅ Groq: OK ("${chatCompletion.choices[0]?.message?.content.trim()}")`);
        } catch (err) {
            console.error(`❌ Groq: FAILED (${err.message})`);
        }
    } else {
        console.log(`⚪ Groq: SKIPPED (No API Key)`);
    }

    console.log('');

    // 3. Grok (xAI)
    const xaiKey = process.env.XAI_API_KEY;
    const xaiModel = process.env.XAI_MODEL || 'grok-beta';
    if (xaiKey && xaiKey !== 'your_xai_api_key_here') {
        try {
            console.log(`[Grok] Testing ${xaiModel}...`);
            const response = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${xaiKey}`
                },
                body: JSON.stringify({
                    messages: [{ role: 'user', content: "Say 'Grok Online'" }],
                    model: xaiModel,
                    max_tokens: 10
                })
            });
            const data = await response.json();
            if (data.choices?.[0]?.message?.content) {
                console.log(`✅ Grok (xAI): OK ("${data.choices[0].message.content.trim()}")`);
            } else {
                throw new Error(data.error?.message || 'Empty response');
            }
        } catch (err) {
            console.error(`❌ Grok (xAI): FAILED (${err.message})`);
        }
    } else {
        console.log(`⚪ Grok (xAI): SKIPPED (No API Key)`);
    }

    console.log('\n--- CHECK COMPLETE ---\n');
}

checkStatus();
