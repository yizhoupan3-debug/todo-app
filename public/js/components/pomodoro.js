/**
 * Pomodoro Timer — focus timer with rounds.
 */
const Pomodoro = {
    isOpen: false,
    currentTask: null,
    focusMin: 25,
    restMin: 5,
    round: 1,
    phase: 'setup', // 'setup' | 'focus' | 'rest' | 'complete'
    timeLeft: 0,
    totalTime: 0,
    timerId: null,
    isPaused: false,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('pomodoro-close').addEventListener('click', () => this.close());
        document.getElementById('pomodoro-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget && this.phase === 'setup') this.close();
        });

        // Time picks
        document.getElementById('focus-picks').addEventListener('click', (e) => {
            const btn = e.target.closest('.time-pick-btn');
            if (!btn) return;
            document.querySelectorAll('#focus-picks .time-pick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.focusMin = parseInt(btn.dataset.min);
        });

        document.getElementById('rest-picks').addEventListener('click', (e) => {
            const btn = e.target.closest('.time-pick-btn');
            if (!btn) return;
            document.querySelectorAll('#rest-picks .time-pick-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.restMin = parseInt(btn.dataset.min);
        });

        document.getElementById('pomodoro-start').addEventListener('click', () => this.startFocus());
        document.getElementById('pomodoro-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('pomodoro-stop').addEventListener('click', () => this.stop());
        document.getElementById('pomodoro-next').addEventListener('click', () => this.nextRound());
        document.getElementById('pomodoro-finish').addEventListener('click', () => this.close());

        // Ambient sound toggle in timer screen
        document.getElementById('pomodoro-ambient-toggle').addEventListener('click', () => {
            const panel = document.getElementById('pomodoro-timer-sounds');
            const isHidden = panel.classList.toggle('hidden');
            if (!isHidden) {
                AmbientSound.buildSoundGrid('pomodoro-timer-sounds');
            }
        });
    },

    open() {
        this.currentTask = null;
        this.round = 1;
        this.phase = 'setup';
        document.getElementById('pomodoro-task-label').textContent = '';
        this.showScreen('setup');
        document.getElementById('pomodoro-overlay').classList.remove('hidden');
        this.isOpen = true;
    },

    openForTask(task) {
        this.currentTask = task;
        this.round = 1;
        this.phase = 'setup';
        document.getElementById('pomodoro-task-label').innerHTML =
            `<span class="pomodoro-task-name">📌 ${task.title}</span>`;
        this.showScreen('setup');
        document.getElementById('pomodoro-overlay').classList.remove('hidden');
        this.isOpen = true;
    },

    close() {
        if (this.timerId) {
            if (this.phase === 'focus' || this.phase === 'rest') {
                if (!confirm('番茄钟正在运行，确定退出吗？')) return;
            }
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.phase = 'setup';
        this.isPaused = false;
        document.getElementById('pomodoro-overlay').classList.add('hidden');
        this.isOpen = false;
    },

    showScreen(screen) {
        document.getElementById('pomodoro-setup').classList.toggle('hidden', screen !== 'setup');
        document.getElementById('pomodoro-timer').classList.toggle('hidden', screen !== 'timer');
        document.getElementById('pomodoro-complete').classList.toggle('hidden', screen !== 'complete');
    },

    startFocus() {
        this.phase = 'focus';
        this.timeLeft = this.focusMin * 60;
        this.totalTime = this.timeLeft;
        this.isPaused = false;
        document.getElementById('pomodoro-status').textContent = '🎯 专注中';
        document.getElementById('pomodoro-status').className = 'pomodoro-status focus';
        document.getElementById('pomodoro-round').textContent = `第 ${this.round} 轮`;
        document.getElementById('pomodoro-pause').textContent = '暂停';
        this.showScreen('timer');
        this.updateDisplay();
        this.startTimer();
    },

    startRest() {
        this.phase = 'rest';
        this.timeLeft = this.restMin * 60;
        this.totalTime = this.timeLeft;
        this.isPaused = false;
        document.getElementById('pomodoro-status').textContent = '☕ 休息中';
        document.getElementById('pomodoro-status').className = 'pomodoro-status rest';
        document.getElementById('pomodoro-pause').textContent = '暂停';
        this.updateDisplay();
        this.startTimer();
    },

    startTimer() {
        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => {
            if (this.isPaused) return;
            this.timeLeft--;
            this.updateDisplay();

            if (this.timeLeft <= 0) {
                clearInterval(this.timerId);
                this.timerId = null;
                this.onPhaseComplete();
            }
        }, 1000);
    },

    togglePause() {
        this.isPaused = !this.isPaused;
        document.getElementById('pomodoro-pause').textContent = this.isPaused ? '继续' : '暂停';
    },

    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
        this.phase = 'setup';
        this.isPaused = false;
        App.showToast(`🍅 番茄钟结束，完成了 ${this.round - 1} 轮`, 'info');
        this.showScreen('setup');
    },

    onPhaseComplete() {
        if (this.phase === 'focus') {
            // Play notification sound
            this.playNotification();
            // Persist this focus round to DB
            try {
                const assignee = (this.currentTask && this.currentTask.assignee) || '潘潘';
                API.addPomodoroSession({
                    assignee,
                    focus_minutes: this.focusMin,
                    rounds: 1,
                    task_title: this.currentTask ? this.currentTask.title : null
                });
            } catch (e) {
                console.error('Pomodoro save error:', e);
            }
            // Earn base coins
            GardenView.earnFromPomodoro(
                (this.currentTask && this.currentTask.assignee) || '潘潘',
                this.focusMin
            );
            // Show focus self-rating dialog
            this.showFocusRating();
        } else if (this.phase === 'rest') {
            this.playNotification();
            this.phase = 'complete';
            document.getElementById('pomodoro-complete-text').textContent = '休息结束！';
            document.getElementById('pomodoro-complete-summary').textContent =
                `已完成 ${this.round} 轮（共 ${this.round * this.focusMin} 分钟专注）`;
            this.round++;
            this.showScreen('complete');
        }
    },

    nextRound() {
        this.phase = 'setup';
        document.getElementById('pomodoro-round').textContent = `第 ${this.round} 轮`;
        this.showScreen('setup');
    },

    updateDisplay() {
        const min = Math.floor(this.timeLeft / 60);
        const sec = this.timeLeft % 60;
        document.getElementById('pomodoro-time').textContent =
            `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

        // Update progress ring
        const circumference = 2 * Math.PI * 90;
        const progress = this.totalTime > 0 ? (this.totalTime - this.timeLeft) / this.totalTime : 0;
        const offset = circumference * (1 - progress);
        const circle = document.getElementById('pomodoro-progress');
        circle.style.strokeDasharray = circumference;
        circle.style.strokeDashoffset = offset;

        // Color based on phase
        circle.style.stroke = this.phase === 'focus' ? '#6366f1' : '#22c55e';
    },

    playNotification() {
        // Simple beep via Web Audio API
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.3;
            osc.start();
            setTimeout(() => { osc.stop(); ctx.close(); }, 300);
            // Also try browser notification
            if (Notification.permission === 'granted') {
                new Notification('🍅 番茄钟', { body: this.phase === 'focus' ? '专注时间结束！' : '休息结束！' });
            }
        } catch (e) {
            console.error('Pomodoro session save error:', e);
        }
    },

    showFocusRating() {
        // Create rating overlay
        const overlay = document.createElement('div');
        overlay.className = 'focus-rating-overlay';
        overlay.innerHTML = `
            <div class="focus-rating-card">
                <h3>🎯 专注完成！</h3>
                <p>你觉得这次的专注度如何？</p>
                <div class="focus-rating-stars">
                    ${[1, 2, 3, 4, 5].map(s => `<button class="focus-star" data-stars="${s}">${'★'.repeat(s)}${'☆'.repeat(5 - s)}</button>`).join('')}
                </div>
                <div class="focus-rating-labels">
                    <span>走神了</span>
                    <span>非常专注</span>
                </div>
                <div class="focus-rating-hint">评分可获得 0.2~1.0 额外喵喵币</div>
                <button class="focus-skip-btn" id="focus-skip-btn" style="margin-top:10px;padding:6px 16px;border:none;border-radius:8px;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);cursor:pointer;font-size:12px">跳过评分</button>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('active'));

        const dismissAndStartRest = () => {
            if (!overlay.parentNode) return; // already removed
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
            this.startRest();
        };

        // Star rating clicks
        overlay.querySelectorAll('.focus-star').forEach(btn => {
            btn.addEventListener('click', async () => {
                const stars = parseInt(btn.dataset.stars);
                const bonus = stars * 0.2;
                const assignee = (this.currentTask && this.currentTask.assignee) || '潘潘';

                try {
                    await API.earnCoins({
                        assignee,
                        amount: bonus,
                        reason: 'focus_rating',
                        detail: `专注自评 ${stars}★`
                    });
                } catch (e) { /* ignore */ }

                overlay.classList.remove('active');
                setTimeout(() => overlay.remove(), 300);

                App.showToast(`⭐ 专注评分 ${stars}★ · +${bonus.toFixed(1)} 喵喵币`, 'success');
                this.startRest();
            });
        });

        // Skip button fallback
        overlay.querySelector('#focus-skip-btn')?.addEventListener('click', dismissAndStartRest);

        // Click outside card fallback
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) dismissAndStartRest();
        });
    }
};
