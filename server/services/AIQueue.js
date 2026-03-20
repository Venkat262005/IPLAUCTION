/**
 * AIQueue.js
 * Smart Multi-Provider Scheduler.
 * 
 * Logic:
 * 1. Priority: Gemini (5 RPM) > Groq (High) > Grok (High).
 * 2. Gemini Tracker: Counts requests in the last 60s. 
 *    If Gemini is at 5/min, it "overflows" to secondary providers immediately.
 * 3. Health Tracker: If a provider hits 429, it goes on a "cooldown" (60s).
 */

class AIQueue {
    constructor() {
        this.running = 0;
        this.queue = [];
        this.history = {
            gemini: { requests: [], cooldownUntil: 0, priority: 1 },
            groq: { requests: [], cooldownUntil: 0, priority: 2 },
            xai: { requests: [], cooldownUntil: 0, priority: 3 }
        };
    }

    /**
     * enqueue – Add a task to the smart router.
     */
    enqueue(taskData) {
        return new Promise((resolve, reject) => {
            this.queue.push({ ...taskData, resolve, reject });
            this._process();
        });
    }

    async _process() {
        if (this.queue.length === 0) return;

        const item = this.queue[0]; // Peek at the first item
        
        // Find the best available provider for this specific item
        const providerName = this._getBestProvider(item);
        
        if (!providerName) {
            // No providers available for this item (either all on cooldown or all exhausted for this item)
            // If we've truly tried every single task in item.tasks, we must reject.
            const allTasksTried = Object.keys(item.tasks).every(p => (item.triedProviders || []).includes(p));
            if (allTasksTried) {
                console.error(`[AIQueue-FATAL] All possible providers exhausted for task '${item.label}'`);
                this.queue.shift(); // Remove it
                item.reject(new Error(`All AI providers (${Object.keys(item.tasks).join(', ')}) failed or are unavailable.`));
                this._process(); // Move to next item immediately
                return;
            }

            // Otherwise, they are just on cooldown. Wait 5s and try again.
            setTimeout(() => this._process(), 5000);
            return;
        }

        // Remove the item we are about to execute
        this.queue.shift();
        this._execute(item, providerName);
    }

    _getBestProvider(item) {
        const now = Date.now();
        const itemTried = item.triedProviders || [];

        const status = ['gemini', 'groq', 'xai'].filter(p => {
            // 1. Does the task even support this provider?
            if (!item.tasks[p]) return false;

            // 2. Has this specific item already tried this provider?
            if (itemTried.includes(p)) return false;

            // 3. Is the provider globally on cooldown (429)?
            if (this.history[p].cooldownUntil > now) return false;
            
            // 4. Rate Limit tracking for Gemini
            if (p === 'gemini') {
                const oneMinAgo = now - 60000;
                this.history.gemini.requests = this.history.gemini.requests.filter(t => t > oneMinAgo);
                if (this.history.gemini.requests.length >= 5) return false;
            }
            return true;
        });

        if (status.length === 0) return null;

        // Pick by priority among available
        return status.sort((a,b) => this.history[a].priority - this.history[b].priority)[0];
    }

    async _execute(item, provider) {
        if (!item.triedProviders) item.triedProviders = [];
        
        try {
            this.history[provider].requests.push(Date.now());
            console.log(`[AIQueue] Routing task '${item.label}' to ${provider}... (Attempt ${item.triedProviders.length + 1})`);
            
            const result = await item.tasks[provider]();
            item.resolve(result);
        } catch (err) {
            console.warn(`[AIQueue] ${provider} failed for '${item.label}':`, err.message);
            
            // Mark this provider as tried for this item
            item.triedProviders.push(provider);

            const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('403');
            if (is429) {
                console.warn(`[AIQueue] ${provider} hit rate limit. Cooling down for 60s.`);
                this.history[provider].cooldownUntil = Date.now() + 60000;
            }

            // Re-enqueue (unshift) to try with another provider in the next process tick
            this.queue.unshift(item);
        } finally {
            setTimeout(() => this._process(), 200);
        }
    }
}

module.exports = new AIQueue();
