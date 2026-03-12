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
            } catch (e) { /* silent */ }
            App.showToast('🎉 专注时间结束！开始休息', 'success');
            // Earn coins
            GardenView.earnFromPomodoro(
                (this.currentTask && this.currentTask.assignee) || '潘潘',
                this.focusMin
            );
            this.startRest();
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
        } catch (e) { /* silent fail */ }
    }
};
