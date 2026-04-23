class AIQueue {
    constructor() {
        this.queue = [];
        this.processing = {};
        this.batchWindow = 150;
        this.cooldown = {
            huggingface: 0
        };
    }

    enqueue({ type, data, providers }) {
        return new Promise((resolve) => {
            this.queue.push({ type, data, resolve });

            if (!this.processing[type]) {
                if (this.batchTimer?.[type]) return;
                this.batchTimer = this.batchTimer || {};
                this.batchTimer[type] = setTimeout(() => {
                    this.batchTimer[type] = null;
                    this._process(type, providers);
                }, this.batchWindow);
            }
        });
    }

    async _process(type, providers) {
        if (this.processing[type]) return;
        this.processing[type] = true;

        try {
            const batch = this.queue.filter(q => q.type === type);
            if (!batch.length) {
                this.processing[type] = false;
                return;
            }

            // Mark these as "in-flight"
            this.queue = this.queue.filter(q => q.type !== type);
            console.log(`[AIQueue] Processing ${type} batch | size: ${batch.length}`);

            const batchData = batch.flatMap(b => b.data);
            const order = ["huggingface"];

            let result = null;
            let success = false;

            for (const provider of order) {
                const adapter = providers[provider];
                if (!adapter || this.cooldown[provider] > Date.now()) continue;

                try {
                    console.log(`[AIQueue] Attempting ${provider}...`);
                    
                    // Unified Retry Logic
                    const attempt = async () => {
                        return await Promise.race([
                            adapter(batchData),
                            new Promise((_, rej) => setTimeout(() => rej(new Error("TIMEOUT")), 60000))
                        ]);
                    };

                    try {
                        result = await attempt();
                    } catch (err) {
                        if (err.message === "HF_EMPTY" || err.message === "NO_JSON" || err.message === "TIMEOUT") {
                            console.log(`[AIQueue] ${provider} failed (${err.message}). Retrying once...`);
                            await new Promise(r => setTimeout(r, 1000));
                            result = await attempt();
                        } else {
                            throw err;
                        }
                    }

                    if (result && result.results) {
                        success = true;
                        break;
                    }
                } catch (err) {
                    console.log(`[AIQueue] ${provider} final failure:`, err.message);
                    this.cooldown[provider] = Date.now() + 30000; // 30s cooldown
                }
            }

            if (success && result) {
                // Resolve all items in the batch
                batch.forEach(item => {
                    const ids = item.data.map(t => t.id || t.teamName);
                    const matched = result.results.filter(r => ids.includes(r.teamId));
                    item.resolve({ results: matched });
                });
            } else {
                console.warn(`[AIQueue] All providers failed for ${type}. Triggering individual fallbacks.`);
                batch.forEach(item => {
                    item.resolve({
                        results: item.data.map(t => ({ teamId: t.id || t.teamName, fallback: true }))
                    });
                });
            }
        } catch (err) {
            console.error("[AIQueue] Fatal process error:", err);
        } finally {
            this.processing[type] = false;
            // Immediate check for new items
            if (this.queue.some(q => q.type === type)) {
                this._process(type, providers);
            }
        }
    }
}

module.exports = new AIQueue();