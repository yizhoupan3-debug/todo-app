
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (!window.GardenView) return;

        window.GardenView.open = async function() {
            const el = document.getElementById('view-garden');
            if (!el) return;

            el.innerHTML = '<div class="garden-header" style="background: var(--color-bg); padding-bottom: 0;"><div class="garden-coin-display"><img src="/img/meow-coin.png?v=__ASSET_VERSION__" alt="喵喵币" class="coin-icon"><span id="garden-balance">0</span></div></div><div id="bloomify-container" style="padding: 20px; overflow-y: auto; height: calc(100% - 60px);"></div>';

            const coins = await API.getCoins(this.assignee);
            this.balance = coins.balance || 0;
            const balEl = document.getElementById('garden-balance');
            if (balEl) balEl.textContent = this.balance;

            const startStr = Utils.formatDate(new Date());
            const data = await API.getTasks({ date: startStr, assignee: this.assignee });
            
            const tasks = (Array.isArray(data) ? data : (data.tasks || [])).map(t => {
                let streak = t.streak || (t.status === 'done' ? 1 : 0);
                let plantType = t.plant_type || 'classic';
                let tTitle = t.title || t.text || '';
                // Try applying user's shop categories based on text semantics
                if (tTitle.includes('运动') || tTitle.includes('健身')) plantType = 'sunflower';
                else if (tTitle.includes('学习') || tTitle.includes('工作')) plantType = 'succulent';
                else if (tTitle.includes('早起') || tTitle.includes('睡觉')) plantType = 'cherry';
                else plantType = 'classic';


                return {
                    id: t.id,
                    text: tTitle,
                    completed: t.status === 'done',
                    streak: streak,
                    plantType: plantType,
                    icon: t.status === 'done' ? '🌸' : '🌱'
                };
            });

            if (window.BloomifyGarden && window.BloomifyGarden.render) {
                const container = document.getElementById('bloomify-container');
                window.BloomifyGarden.render(
                    container, 
                    tasks,
                    (task) => {
                        const currentEl = document.getElementById('plant-card-' + task.id);
                        if (currentEl) {
                           const imgEl = currentEl.querySelector('.bloomify-plantImage');
                           const btn = currentEl.querySelector('.bloomify-toggleBtn');
                           const face = currentEl.querySelector('.bloomify-cardFront');
                           if (imgEl && btn && face) {
                               const willComplete = !task.completed;
                               if (willComplete) {
                                  imgEl.classList.add('bloomify-bounce');
                                  face.classList.add('bloomify-completed');
                                  btn.innerHTML = 'Done! ✔';
                                  const emoji = document.createElement('div');
                                  emoji.textContent = '✨';
                                  emoji.style.position = 'absolute';
                                  emoji.style.left = '50%';
                                  emoji.style.top = '30%';
                                  emoji.style.fontSize = '2rem';
                                  emoji.style.transition = 'all 1s ease-out';
                                  emoji.style.pointerEvents = 'none';
                                  currentEl.querySelector('.bloomify-cardInner').appendChild(emoji);
                                  setTimeout(() => {
                                      emoji.style.transform = 'translate(-50%, -100px) scale(1.5)';
                                      emoji.style.opacity = '0';
                                  }, 50);
                                  setTimeout(() => emoji.remove(), 1050);
                               } else {
                                  imgEl.classList.remove('bloomify-bounce');
                                  face.classList.remove('bloomify-completed');
                                  btn.innerHTML = 'Water 💧';
                               }
                               task.completed = willComplete;
                           }
                        }
                        
                        API.updateTask(task.id, { status: task.completed ? 'done' : 'todo' }).then(() => {
                            // Optionally refresh
                        });
                    },
                    (task) => {
                        if(confirm('Are you sure you want to remove this habit?')) {
                            API.deleteTask(task.id).then(() => {
                                this.open();
                            });
                        }
                    },
                    (task) => {
                        alert('You harvested ' + task.text + '!');
                    }
                );
            }
        };

        window.GardenView.refreshData = window.GardenView.open;

    }, 500);
});
