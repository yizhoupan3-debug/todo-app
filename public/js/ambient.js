// ===== Ambient Sound Module =====
// Pure Web Audio API — zero files, infinite non-repeating loops
// Supports mixing multiple sounds with independent volume control

const AmbientSound = (() => {
    let ctx = null;
    const active = {};     // soundId -> { gain, source/nodes, volume }
    let masterGain = null;
    let masterVol = 0.5;

    function getCtx() {
        if (!ctx || ctx.state === 'closed') {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            masterGain = ctx.createGain();
            masterGain.gain.value = masterVol;
            masterGain.connect(ctx.destination);
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    // ── Sound Generators ──

    function createNoiseBuffer(type = 'white', seconds = 4) {
        const ac = getCtx();
        const sr = ac.sampleRate;
        const len = sr * seconds;
        const buf = ac.createBuffer(2, len, sr);
        for (let ch = 0; ch < 2; ch++) {
            const data = buf.getChannelData(ch);
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < len; i++) {
                const white = Math.random() * 2 - 1;
                if (type === 'white') {
                    data[i] = white * 0.3;
                } else if (type === 'pink') {
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
                    b6 = white * 0.115926;
                } else if (type === 'brown') {
                    data[i] = (b0 = (b0 + (0.02 * white)) / 1.02) * 3.5;
                }
            }
        }
        return buf;
    }

    function startNoise(id, type) {
        const ac = getCtx();
        const buf = createNoiseBuffer(type, 4);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(gain);
        gain.connect(masterGain);
        src.start();
        return { gain, source: src, type: 'noise' };
    }

    function startRain() {
        const ac = getCtx();
        const buf = createNoiseBuffer('white', 4);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        // Bandpass filter → rain character
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3000;
        bp.Q.value = 0.5;
        // Soft highpass to remove rumble
        const hp = ac.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 400;
        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(bp);
        bp.connect(hp);
        hp.connect(gain);
        gain.connect(masterGain);
        src.start();
        return { gain, source: src, nodes: [bp, hp], type: 'synth' };
    }

    function startThunder() {
        const ac = getCtx();
        // Low rumble base
        const buf = createNoiseBuffer('brown', 6);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 200;
        // Rain layer
        const rainBuf = createNoiseBuffer('white', 4);
        const rainSrc = ac.createBufferSource();
        rainSrc.buffer = rainBuf;
        rainSrc.loop = true;
        const rainBp = ac.createBiquadFilter();
        rainBp.type = 'bandpass';
        rainBp.frequency.value = 2500;
        rainBp.Q.value = 0.4;
        const rainGain = ac.createGain();
        rainGain.gain.value = 0.5;

        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(lp);
        lp.connect(gain);
        rainSrc.connect(rainBp);
        rainBp.connect(rainGain);
        rainGain.connect(gain);
        gain.connect(masterGain);
        src.start();
        rainSrc.start();

        // Periodic thunder cracks
        let thunderInterval;
        function crack() {
            const crackBuf = createNoiseBuffer('brown', 2);
            const crackSrc = ac.createBufferSource();
            crackSrc.buffer = crackBuf;
            const crackLp = ac.createBiquadFilter();
            crackLp.type = 'lowpass';
            crackLp.frequency.value = 150;
            const crackGain = ac.createGain();
            crackGain.gain.value = 0.7;
            crackGain.gain.setValueAtTime(0.7, ac.currentTime);
            crackGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 2.5);
            crackSrc.connect(crackLp);
            crackLp.connect(crackGain);
            crackGain.connect(gain);
            crackSrc.start();
            crackSrc.stop(ac.currentTime + 3);
        }
        thunderInterval = setInterval(crack, 6000 + Math.random() * 12000);
        setTimeout(crack, 2000);

        return { gain, source: src, extras: [rainSrc], interval: thunderInterval, type: 'synth' };
    }

    function startOcean() {
        const ac = getCtx();
        const buf = createNoiseBuffer('pink', 4);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 800;
        // LFO for wave rhythm
        const lfo = ac.createOscillator();
        lfo.frequency.value = 0.12;
        const lfoGain = ac.createGain();
        lfoGain.gain.value = 300;
        lfo.connect(lfoGain);
        lfoGain.connect(lp.frequency);
        lfo.start();

        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(lp);
        lp.connect(gain);
        gain.connect(masterGain);
        src.start();
        return { gain, source: src, extras: [lfo], nodes: [lp, lfoGain], type: 'synth' };
    }

    function startStream() {
        const ac = getCtx();
        const buf = createNoiseBuffer('white', 4);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2200;
        bp.Q.value = 1.5;
        // Gentle modulation
        const lfo = ac.createOscillator();
        lfo.frequency.value = 0.4;
        const lfoG = ac.createGain();
        lfoG.gain.value = 400;
        lfo.connect(lfoG);
        lfoG.connect(bp.frequency);
        lfo.start();

        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(bp);
        bp.connect(gain);
        gain.connect(masterGain);
        src.start();
        return { gain, source: src, extras: [lfo], type: 'synth' };
    }

    function startBirds() {
        const ac = getCtx();
        const gain = ac.createGain();
        gain.gain.value = 0.5;
        gain.connect(masterGain);
        let birdInterval;

        function chirp() {
            const baseFreq = 2000 + Math.random() * 3000;
            const osc = ac.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(baseFreq, ac.currentTime);
            osc.frequency.linearRampToValueAtTime(baseFreq * (1.1 + Math.random() * 0.4), ac.currentTime + 0.05);
            osc.frequency.linearRampToValueAtTime(baseFreq * 0.95, ac.currentTime + 0.1);

            const chirpGain = ac.createGain();
            chirpGain.gain.setValueAtTime(0, ac.currentTime);
            chirpGain.gain.linearRampToValueAtTime(0.15, ac.currentTime + 0.01);
            chirpGain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);

            osc.connect(chirpGain);
            chirpGain.connect(gain);
            osc.start();
            osc.stop(ac.currentTime + 0.15);

            // Sometimes double chirp
            if (Math.random() > 0.5) {
                setTimeout(() => {
                    if (!active.birds) return;
                    const o2 = ac.createOscillator();
                    o2.type = 'sine';
                    o2.frequency.value = baseFreq * 1.2;
                    const g2 = ac.createGain();
                    g2.gain.setValueAtTime(0, ac.currentTime);
                    g2.gain.linearRampToValueAtTime(0.1, ac.currentTime + 0.01);
                    g2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
                    o2.connect(g2);
                    g2.connect(gain);
                    o2.start();
                    o2.stop(ac.currentTime + 0.12);
                }, 120 + Math.random() * 80);
            }
        }
        birdInterval = setInterval(chirp, 800 + Math.random() * 2000);
        chirp();

        return { gain, interval: birdInterval, type: 'interval' };
    }

    function startFireplace() {
        const ac = getCtx();
        const buf = createNoiseBuffer('brown', 4);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 600;
        bp.Q.value = 0.8;
        // Crackle layer
        const crackleBuf = createNoiseBuffer('white', 2);
        const crackleSrc = ac.createBufferSource();
        crackleSrc.buffer = crackleBuf;
        crackleSrc.loop = true;
        const crackleHp = ac.createBiquadFilter();
        crackleHp.type = 'highpass';
        crackleHp.frequency.value = 4000;
        const crackleGain = ac.createGain();
        crackleGain.gain.value = 0.08;

        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(bp);
        bp.connect(gain);
        crackleSrc.connect(crackleHp);
        crackleHp.connect(crackleGain);
        crackleGain.connect(gain);
        gain.connect(masterGain);
        src.start();
        crackleSrc.start();
        return { gain, source: src, extras: [crackleSrc], type: 'synth' };
    }

    function startFan() {
        const ac = getCtx();
        const buf = createNoiseBuffer('pink', 4);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const lp = ac.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 500;
        // Subtle hum
        const hum = ac.createOscillator();
        hum.type = 'sine';
        hum.frequency.value = 60;
        const humG = ac.createGain();
        humG.gain.value = 0.03;
        hum.connect(humG);

        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(lp);
        lp.connect(gain);
        humG.connect(gain);
        gain.connect(masterGain);
        src.start();
        hum.start();
        return { gain, source: src, extras: [hum], type: 'synth' };
    }

    function startCafe() {
        const ac = getCtx();
        // Background murmur
        const buf = createNoiseBuffer('pink', 4);
        const src = ac.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        const bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.Q.value = 0.3;
        // Occasional clink sounds
        const gain = ac.createGain();
        gain.gain.value = 0.5;
        src.connect(bp);
        bp.connect(gain);
        gain.connect(masterGain);
        src.start();

        let clinkInterval;
        function clink() {
            const freq = 3000 + Math.random() * 2000;
            const osc = ac.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;
            const g = ac.createGain();
            g.gain.setValueAtTime(0.08, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
            osc.connect(g);
            g.connect(gain);
            osc.start();
            osc.stop(ac.currentTime + 0.2);
        }
        clinkInterval = setInterval(clink, 3000 + Math.random() * 6000);

        return { gain, source: src, interval: clinkInterval, type: 'synth' };
    }

    function startKeyboard() {
        const ac = getCtx();
        const gain = ac.createGain();
        gain.gain.value = 0.5;
        gain.connect(masterGain);

        let keyInterval;
        function keyClick() {
            const freq = 4000 + Math.random() * 3000;
            const osc = ac.createOscillator();
            osc.type = 'square';
            osc.frequency.value = freq;
            const g = ac.createGain();
            g.gain.setValueAtTime(0.06, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.03);
            const hp = ac.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.value = 3000;
            osc.connect(hp);
            hp.connect(g);
            g.connect(gain);
            osc.start();
            osc.stop(ac.currentTime + 0.05);
        }
        // Typing burst pattern
        function burst() {
            const keys = 3 + Math.floor(Math.random() * 8);
            for (let i = 0; i < keys; i++) {
                setTimeout(keyClick, i * (50 + Math.random() * 80));
            }
        }
        keyInterval = setInterval(burst, 1200 + Math.random() * 3000);
        burst();

        return { gain, interval: keyInterval, type: 'interval' };
    }

    // ── Sound Registry ──
    const generators = {
        white: () => startNoise('white', 'white'),
        pink: () => startNoise('pink', 'pink'),
        brown: () => startNoise('brown', 'brown'),
        rain: startRain,
        thunder: startThunder,
        ocean: startOcean,
        stream: startStream,
        birds: startBirds,
        fireplace: startFireplace,
        fan: startFan,
        cafe: startCafe,
        keyboard: startKeyboard,
    };

    const soundMeta = [
        { id: 'white', icon: 'W', name: '白噪声', cat: 'noise', lucide: 'radio' },
        { id: 'pink', icon: 'P', name: '粉噪声', cat: 'noise', lucide: 'activity' },
        { id: 'brown', icon: 'B', name: '棕噪声', cat: 'noise', lucide: 'wave' },
        { id: 'rain', icon: '雨', name: '雨声', cat: 'weather', lucide: 'cloud-rain' },
        { id: 'thunder', icon: '雷', name: '雷雨', cat: 'weather', lucide: 'cloud-lightning' },
        { id: 'ocean', icon: '海', name: '海浪', cat: 'nature', lucide: 'waves' },
        { id: 'stream', icon: '溪', name: '溪流', cat: 'nature', lucide: 'droplets' },
        { id: 'birds', icon: '鸟', name: '鸟鸣', cat: 'nature', lucide: 'twitter' },
        { id: 'fireplace', icon: '炉', name: '壁炉', cat: 'indoor', lucide: 'flame' },
        { id: 'fan', icon: '扇', name: '风扇', cat: 'indoor', lucide: 'wind' },
        { id: 'cafe', icon: '咖', name: '咖啡馆', cat: 'social', lucide: 'coffee' },
        { id: 'keyboard', icon: '键', name: '键盘', cat: 'social', lucide: 'keyboard' },
    ];

    // ── Public API ──

    return {
        soundMeta,

        toggle(soundId) {
            if (active[soundId]) {
                this.stop(soundId);
            } else {
                this.play(soundId);
            }
            this.updateUI();
        },

        play(soundId) {
            if (active[soundId]) return;
            const gen = generators[soundId];
            if (!gen) return;
            const entry = gen();
            entry.volume = 0.5;
            // Smooth fade-in
            const ac = getCtx();
            entry.gain.gain.setValueAtTime(0.01, ac.currentTime);
            entry.gain.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 0.5);
            active[soundId] = entry;
        },

        stop(soundId) {
            const entry = active[soundId];
            if (!entry) return;
            // Smooth fade-out before cleanup
            const ac = getCtx();
            const fadeTime = 0.6;
            try {
                entry.gain.gain.setValueAtTime(entry.gain.gain.value, ac.currentTime);
                entry.gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + fadeTime);
            } catch (_) {}
            // Schedule actual cleanup after fade completes
            setTimeout(() => {
                try {
                    if (entry.source) entry.source.stop();
                    if (entry.extras) entry.extras.forEach(e => { try { e.stop(); } catch (x) { } });
                    if (entry.interval) clearInterval(entry.interval);
                    if (entry.gain) entry.gain.disconnect();
                } catch (e) { }
            }, fadeTime * 1000 + 50);
            delete active[soundId];
        },

        stopAll() {
            Object.keys(active).forEach(id => this.stop(id));
            this.updateUI();
        },

        isPlaying(soundId) {
            return !!active[soundId];
        },

        setVolume(soundId, vol) {
            const entry = active[soundId];
            if (entry) {
                entry.volume = vol;
                entry.gain.gain.setTargetAtTime(vol, getCtx().currentTime, 0.05);
            }
        },

        setMasterVolume(vol) {
            masterVol = vol;
            if (masterGain) masterGain.gain.setTargetAtTime(vol, getCtx().currentTime, 0.05);
        },

        getVolume(soundId) {
            return active[soundId]?.volume ?? 0.5;
        },

        getActiveCount() {
            return Object.keys(active).length;
        },

        getActiveSounds() {
            return Object.keys(active);
        },

        // ── UI ──
        updateUI() {
            // Update all toggle buttons
            document.querySelectorAll('.sound-toggle').forEach(btn => {
                const id = btn.dataset.sound;
                btn.classList.toggle('active', !!active[id]);
            });
            // Update header icon
            const headerIcon = document.getElementById('btn-ambient');
            if (headerIcon) {
                const count = this.getActiveCount();
                headerIcon.classList.toggle('playing', count > 0);
                const badge = headerIcon.querySelector('.ambient-badge');
                if (badge) badge.textContent = count > 0 ? count : '';
            }
        },

        // Build the sound grid HTML
        buildSoundGrid(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = `
                <div class="sound-grid">
                    ${soundMeta.map(s => `
                        <button class="sound-toggle ${active[s.id] ? 'active' : ''}" data-sound="${s.id}" title="${s.name}">
                            <span class="sound-icon"><i data-lucide="${s.lucide}"></i></span>
                            <span class="sound-name">${s.name}</span>
                        </button>
                    `).join('')}
                </div>
            `;
            container.querySelectorAll('.sound-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggle(btn.dataset.sound);
                });
            });
            if (window.lucide) window.lucide.createIcons({ attrs: {}, node: container });
        }
    };
})();
