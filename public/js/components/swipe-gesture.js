/**
 * SwipeGesture — Adds swipe-to-complete (right) / swipe-to-delete (left)
 * on task cards. Only active on touch devices (mobile).
 */
const SwipeGesture = {
    THRESHOLD: 80,       // px to trigger action
    MAX_DRAG: 140,       // max visual drag distance
    RESISTANCE: 0.55,    // drag resistance factor past threshold

    /**
     * Bind swipe gestures on all .task-card elements within a container.
     * Call this after rendering task cards.
     * Safe to call repeatedly — since render() replaces innerHTML,
     * old DOM nodes (and their listeners) are automatically GC'd.
     */
    bind(container, { onComplete, onDelete }) {
        if (!container) return;
        // Only enable on touch devices
        if (!('ontouchstart' in window)) return;

        container.querySelectorAll('.task-card').forEach(card => {
            // Guard against double-binding on the same node
            if (card._swipeBound) return;
            card._swipeBound = true;
            this._bindCard(card, { onComplete, onDelete });
        });
    },

    _bindCard(card, { onComplete, onDelete }) {
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let isDragging = false;
        let isHorizontal = null; // null = undecided

        const isDone = card.classList.contains('done');

        card.addEventListener('touchstart', (e) => {
            // Don't interfere with checkbox or buttons
            if (e.target.closest('.task-checkbox, .task-pomodoro-btn, button')) return;

            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            currentX = 0;
            isDragging = true;
            isHorizontal = null;

            card.style.transition = 'none';
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (!isDragging) return;

            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            // Decide direction on first significant movement
            if (isHorizontal === null) {
                if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                    isHorizontal = Math.abs(dx) > Math.abs(dy);
                    if (!isHorizontal) {
                        isDragging = false;
                        return;
                    }
                } else {
                    return;
                }
            }

            // Block vertical scroll while swiping
            e.preventDefault();

            // Apply resistance past threshold
            let visualX = dx;
            if (Math.abs(dx) > this.THRESHOLD) {
                const extra = Math.abs(dx) - this.THRESHOLD;
                visualX = Math.sign(dx) * (this.THRESHOLD + extra * this.RESISTANCE);
            }

            // Clamp
            visualX = Math.max(-this.MAX_DRAG, Math.min(this.MAX_DRAG, visualX));
            currentX = dx;

            card.style.transform = `translateX(${visualX}px)`;

            // Visual feedback
            const progress = Math.min(Math.abs(dx) / this.THRESHOLD, 1);
            if (dx > 20 && !isDone) {
                // Swiping right = complete
                card.style.background = `rgba(34, 197, 94, ${progress * 0.15})`;
            } else if (dx < -20) {
                // Swiping left = delete
                card.style.background = `rgba(239, 68, 68, ${progress * 0.15})`;
            } else {
                card.style.background = '';
            }
        }, { passive: false });

        card.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;

            // Animate back
            card.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), background 0.3s ease, opacity 0.3s ease';

            if (currentX > this.THRESHOLD && !isDone) {
                // ✅ Swipe right → complete
                card.style.transform = `translateX(${this.MAX_DRAG + 40}px)`;
                card.style.opacity = '0';
                const taskId = parseInt(card.dataset.taskId);
                setTimeout(() => {
                    card.style.transform = '';
                    card.style.opacity = '';
                    card.style.background = '';
                    card.style.transition = '';
                    if (onComplete) onComplete(taskId);
                }, 300);
            } else if (currentX < -this.THRESHOLD) {
                // 🗑️ Swipe left → delete (with confirm)
                card.style.transform = `translateX(${-this.MAX_DRAG - 40}px)`;
                card.style.opacity = '0';
                const taskId = parseInt(card.dataset.taskId);
                setTimeout(() => {
                    card.style.transform = '';
                    card.style.opacity = '';
                    card.style.background = '';
                    card.style.transition = '';
                    if (onDelete) onDelete(taskId);
                }, 300);
            } else {
                // Snap back
                card.style.transform = '';
                card.style.background = '';
            }
        }, { passive: true });

        card.addEventListener('touchcancel', () => {
            isDragging = false;
            card.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), background 0.3s ease';
            card.style.transform = '';
            card.style.background = '';
        }, { passive: true });
    }
};
