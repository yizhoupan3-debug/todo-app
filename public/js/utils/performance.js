// Modern task yielding and DOM batching utilities for UI interaction fluidity

const yieldToMain = async () => {
    if (globalThis.scheduler && globalThis.scheduler.yield) {
        await globalThis.scheduler.yield();
        return;
    }
    // Fallback using MessageChannel which is faster than setTimeout
    return new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = resolve;
        channel.port2.postMessage(null);
    });
};

const domBatcher = (() => {
    let reads = [];
    let writes = [];
    let scheduled = false;

    const flush = () => {
        const currentReads = reads;
        const currentWrites = writes;
        
        reads = [];
        writes = [];
        scheduled = false;

        currentReads.forEach(fn => fn());
        currentWrites.forEach(fn => fn());
    };

    return {
        measure: (fn) => {
            reads.push(fn);
            if (!scheduled) {
                scheduled = true;
                requestAnimationFrame(flush);
            }
        },
        mutate: (fn) => {
            writes.push(fn);
            if (!scheduled) {
                scheduled = true;
                requestAnimationFrame(flush);
            }
        }
    };
})();

window.PerfUtils = {
    yieldToMain,
    domBatcher,
    
    // Spring physics helper for animations
    spring(t, stiffness = 100, damping = 10) {
        const c = 2 * Math.sqrt(stiffness); // critical damping
        const w0 = Math.sqrt(stiffness); // natural frequency
        const zeta = damping / c; // damping ratio
        
        if (zeta < 1) { // under-damped
            const wd = w0 * Math.sqrt(1 - zeta * zeta);
            return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t));
        } else { // critically damped or over-damped
            return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
        }
    }
};
