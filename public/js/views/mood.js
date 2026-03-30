class MoodView {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('mood-container');
        this.records = [];
        this.today = new Date().toISOString().split('T')[0];
        this.moods = [
            { id: 'happy', icon: '😄', label: '开心' },
            { id: 'calm', icon: '😌', label: '平静' },
            { id: 'tired', icon: '😫', label: '疲惫' },
            { id: 'sad', icon: '😢', label: '难过' },
            { id: 'angry', icon: '😡', label: '生气' },
            { id: 'excited', icon: '🤩', label: '激动' }
        ];
    }

    init() {
        if (!this.container) return;
        this.load();

        // Listen for user change if needed, but usually we just use app.state.assignee
        document.addEventListener('assignee-changed', () => this.render());
    }

    async load() {
        try {
            const res = await fetch(`/api/mood?date=${this.today}`);
            if (res.ok) {
                this.records = await res.json();
                this.render();
            }
        } catch (e) {
            console.error('Failed to load mood:', e);
        }
    }

    getRecord(assignee) {
        return this.records.find(r => r.assignee === assignee);
    }

    async saveMood(moodId, note = '') {
        const payload = {
            date: this.today,
            assignee: this.app.currentAssignee,
            mood: moodId,
            note
        };
        try {
            const res = await fetch('/api/mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                
                // Update local records
                const index = this.records.findIndex(r => r.assignee === this.app.currentAssignee);
                if (index > -1) {
                    this.records[index] = data;
                } else {
                    this.records.push(data);
                }
                
                if (data.coinsEarned) {
                    this.app.showToast(`心情打卡成功！获得 ${data.coinsEarned} 喵喵币 🐱`, 'success');
                    if (this.app.loadCoins) this.app.loadCoins();
                } else {
                    this.app.showToast('心情已更新');
                }
                
                this.render();
            }
        } catch (e) {
            console.error('Save mood error:', e);
            this.app.showToast('保存心情失败', 'error');
        }
    }

    async revealPartnerMood(partnerName) {
        try {
            const res = await fetch('/api/mood/reveal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: this.today, assignee: partnerName })
            });
            if (res.ok) {
                const record = this.getRecord(partnerName);
                if (record) record.revealed = 1;
                this.render();
                
                // Show a little animation or toast
                this.app.showToast('拆开心情盲盒啦！', 'success');
            }
        } catch (e) {
            console.error('Reveal mood error:', e);
        }
    }

    render() {
        if (!this.container) return;
        
        const currentUser = this.app.currentAssignee;
        const partnerUser = currentUser === '潘潘' ? '蒲蒲' : '潘潘';
        
        const myRecord = this.getRecord(currentUser);
        const partnerRecord = this.getRecord(partnerUser);
        
        let html = `<div class="mood-cards-wrapper">`;
        
        // My Card
        html += `<div class="mood-card mine">
            <div class="mood-card-header">
                <img src="/img/${currentUser === '潘潘' ? 'panpan.png' : 'pupu.png'}" class="mood-avatar">
                <span>我的心情</span>
            </div>
            <div class="mood-card-body">`;
            
        if (myRecord) {
            const moodDef = this.moods.find(m => m.id === myRecord.mood) || this.moods[0];
            html += `<div class="mood-selected" onclick="window.MoodViewInstance.showSelector()">
                        <span class="mood-emoji">${moodDef.icon}</span>
                        <span class="mood-label">${moodDef.label}</span>
                     </div>`;
        } else {
            html += `<button class="btn-primary btn-sm" onclick="window.MoodViewInstance.showSelector()">打卡领币</button>`;
        }
        
        html += `</div></div>`;
        
        // Partner Card (Blind Box)
        html += `<div class="mood-card partner">
            <div class="mood-card-header">
                <img src="/img/${partnerUser === '潘潘' ? 'panpan.png' : 'pupu.png'}" class="mood-avatar">
                <span>TA的盲盒</span>
            </div>
            <div class="mood-card-body">`;
            
        if (!partnerRecord) {
            html += `<div class="mood-waiting">TA还没打卡哦</div>`;
        } else if (!partnerRecord.revealed) {
            if (!myRecord) {
                html += `<div class="mood-locked" title="你需要先打卡才能拆盲盒哦"><i data-lucide="lock"></i> 待解锁</div>`;
            } else {
                html += `<button class="btn-primary btn-sm btn-reveal" onclick="window.MoodViewInstance.revealPartnerMood('${partnerUser}')">拆盲盒 🎁</button>`;
            }
        } else {
            const partnerMoodDef = this.moods.find(m => m.id === partnerRecord.mood) || this.moods[0];
            html += `<div class="mood-selected partner-revealed">
                        <span class="mood-emoji">${partnerMoodDef.icon}</span>
                        <span class="mood-label">${partnerMoodDef.label}</span>
                     </div>`;
        }
        
        html += `</div></div>`;
        html += `</div>`; // .mood-cards-wrapper
        
        this.container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();
    }
    
    showSelector() {
        const myRecord = this.getRecord(this.app.currentAssignee);
        const currentMood = myRecord ? myRecord.mood : null;
        
        let html = `<div class="mood-selector-modal">
            <div class="mood-selector-content">
                <h3>今天心情怎么样？</h3>
                <div class="mood-grid">`;
                
        this.moods.forEach(m => {
            const active = currentMood === m.id ? 'active' : '';
            html += `<div class="mood-option ${active}" onclick="window.MoodViewInstance.saveMood('${m.id}'); document.getElementById('mood-modal-overlay').remove();">
                        <div class="mood-option-emoji">${m.icon}</div>
                        <div class="mood-option-label">${m.label}</div>
                     </div>`;
        });
        
        html += `</div>
                 <button class="btn-secondary" onclick="document.getElementById('mood-modal-overlay').remove()">取消</button>
            </div>
        </div>`;
        
        const overlay = document.createElement('div');
        overlay.id = 'mood-modal-overlay';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
    }
}

// Will be initialized in app.js
window.MoodView = MoodView;
