/**
 * AIQueue.js
 * Global rate-limiter for all Gemini API calls.
 *
 * Key rules for the free tier (gemini-*-flash):
 *   - 5 requests/minute (RPM)
 *   - 20 requests/day (RPD)
 *
 * Strategy:
 *   - Concurrency = 1 (serial queue)
 *   - 13 second gap between tasks => ~4.6 RPM, safely under the 5 RPM cap
 *   - On 429, parse retryDelay from the error and wait that long before retrying
 *   - Max 3 retries per task; after that, reject so the caller uses its fallback
 */

const INTER_TASK_DELAY_MS = 13000; // 13 s → ~4.6 RPM, safely under the 5 RPM cap
const MAX_RETRIES = 3;

class AIQueue {
    constructor() {
        this.running = 0;
        this.queue = [];
    }

    /**
     * enqueue – wrap a Gemini call and get a Promise back.
     * @param {Function} task - async () => result
     */
    enqueue(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject, retries: 0 });
            this._process();
        });
    }

    async _process() {
        if (this.running >= 1 || this.queue.length === 0) return;

        this.running = 1;
        const item = this.queue.shift();

        try {
            const result = await this._runWithRetry(item);
            item.resolve(result);
        } catch (err) {
            item.reject(err);
        } finally {
            // Mandatory cooldown between tasks to stay under RPM cap
            await this._sleep(INTER_TASK_DELAY_MS);
            this.running = 0;
            this._process();
        }
    }

    async _runWithRetry(item) {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                return await item.task();
            } catch (err) {
                const is429 = err?.status === 429 || err?.message?.includes('429') || err?.message?.includes('Too Many Requests');

                if (!is429 || attempt === MAX_RETRIES) {
                    throw err;
                }

                // Parse the retryDelay from the Gemini error payload
                let waitMs = 60000; // default: wait 60s
                try {
                    const retryInfo = err?.errorDetails?.find(d => d['@type']?.includes('RetryInfo'));
                    if (retryInfo?.retryDelay) {
                        const seconds = parseFloat(retryInfo.retryDelay.replace('s', ''));
                        if (!isNaN(seconds) && seconds > 0) {
                            waitMs = Math.ceil(seconds * 1000) + 2000; // add 2s buffer
                        }
                    }
                } catch (_) { /* use default */ }

                console.warn(`[AIQueue] 429 on attempt ${attempt + 1}. Waiting ${Math.round(waitMs / 1000)}s before retry...`);
                await this._sleep(waitMs);
            }
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = new AIQueue();
