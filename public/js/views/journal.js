/**
 * JournalView — 手帐 Scrapbook Canvas v2
 * Rich text styling, canvas backgrounds, card presets, polished interactions.
 */
const JournalView = {
    currentDate: null,
    elements: [],
    _selectedId: null,
    _saveTimers: new Map(),
    _canvasBg: 'dots',
    _boundDocClick: null,
    _boundDocKeydown: null,

    FONTS: [
        { label: '默认', value: 'inherit' },
        { label: '圆体', value: '"Noto Sans SC", sans-serif' },
        { label: '手写', value: '"ZCOOL XiaoWei", "Ma Shan Zheng", serif' },
        { label: '衬线', value: '"Noto Serif SC", "Songti SC", serif' },
        { label: '等宽', value: '"JetBrains Mono", "Fira Code", monospace' },
    ],
    SIZES: ['12', '14', '16', '18', '22', '28', '36'],
    COLORS: ['#1e293b','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#fff'],
    CARD_STYLES: [
        { key: 'default', label: '卡片' },
        { key: 'sticky-yellow', label: '黄贴' },
        { key: 'sticky-pink', label: '粉贴' },
        { key: 'sticky-blue', label: '蓝贴' },
        { key: 'sticky-green', label: '绿贴' },
        { key: 'tape', label: '胶带' },
        { key: 'tag', label: '标签' },
        { key: 'transparent', label: '透明' },
    ],
    BG_THEMES: ['dots','grid','lines','kraft','pink','sky','dark','plain'],

    init() {
        this.currentDate = this._todayStr();
        this._canvasBg = localStorage.getItem('journal-bg') || 'dots';
        // Load Google fonts
        if (!document.getElementById('journal-fonts')) {
            const link = document.createElement('link');
            link.id = 'journal-fonts';
            link.rel = 'stylesheet';
            link.href = 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;700&display=swap';
            document.head.appendChild(link);
        }
        // Bind document-level listeners ONCE (P1 #6 fix)
        if (!this._boundDocClick) {
            this._boundDocClick = () => {
                document.getElementById('j-bg-picker')?.classList.remove('open');
                document.getElementById('jtb-style-picker')?.classList.remove('open');
            };
            document.addEventListener('click', this._boundDocClick);
        }
        if (!this._boundDocKeydown) {
            this._boundDocKeydown = (e) => {
                if (App.currentView !== 'journal') return;
                if ((e.key === 'Delete' || e.key === 'Backspace') && this._selectedId) {
                    const active = document.activeElement;
                    if (active && (active.isContentEditable || active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
                    e.preventDefault();
                    this._deleteElement(this._selectedId);
                }
            };
            document.addEventListener('keydown', this._boundDocKeydown);
        }
    },

    /* ═══ Helpers ═══ */
    _todayStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    },
    _dateParts(s) {
        const d = new Date(s + 'T00:00:00');
        const wd = ['日','一','二','三','四','五','六'];
        return `${d.getMonth()+1}月${d.getDate()}日 周${wd[d.getDay()]}`;
    },
    _author() {
        return App.activePersona === 'all' ? App.lastPersona : App.activePersona;
    },
    _getStyle(el) {
        if (!el.style_data) return {};
        try { return typeof el.style_data === 'string' ? JSON.parse(el.style_data) : el.style_data; }
        catch (_) { return {}; }
    },

    /* ═══ Open / Load ═══ */
    async open() {
        const container = document.getElementById('view-journal');
        if (!container) return;
        container.innerHTML = this._shell();
        this._bindToolbar();
        this._bindCanvas();
        await this._loadDate(this.currentDate);
    },

    async _loadDate(dateStr) {
        this.currentDate = dateStr;
        const disp = document.getElementById('j-date-display');
        if (disp) {
            const today = this._todayStr();
            let label = this._dateParts(dateStr);
            if (dateStr === today) label += ' · 今天';
            disp.textContent = label;
        }
        try {
            const data = await API.getJournal(dateStr);
            this.elements = data.elements || [];
        } catch (_) {
            this.elements = [];
        }
        this._renderCanvas();
    },

    /* ═══ Shell HTML ═══ */
    _shell() {
        const bgSwatches = this.BG_THEMES.map(bg =>
            `<div class="journal-bg-swatch${bg === this._canvasBg ? ' active' : ''}" data-bg="${bg}"></div>`
        ).join('');

        return `
        <div class="journal-container">
          <div class="journal-toolbar">
            <button class="journal-date-btn" id="j-prev">‹</button>
            <span class="journal-date-display" id="j-date-display"></span>
            <button class="journal-date-btn" id="j-next">›</button>
            <button class="journal-today-btn" id="j-today">今天</button>
            <span class="journal-toolbar-spacer"></span>
            <button class="journal-tool-btn" id="j-add-text"><span class="icon">📝</span> 文字</button>
            <button class="journal-tool-btn" id="j-add-photo"><span class="icon">📷</span> 照片</button>
            <button class="journal-tool-btn bg-picker-btn" id="j-bg-btn">
              <span class="icon">🎨</span> 底布
            </button>
            <button class="journal-tool-btn" id="j-export-btn">
              <span class="icon">📥</span> 导出
            </button>
            <input type="file" id="j-file-input" accept="image/*" multiple hidden>
          </div>
          <div class="journal-bg-picker" id="j-bg-picker">${bgSwatches}</div>
          
          <div class="journal-canvas-wrap" id="j-canvas-wrap" data-bg="plain">
            <div class="journal-canvas" id="j-canvas" data-bg="${this._canvasBg}"></div>
          </div>
        </div>
        ${this._textToolbarHTML()}
        <div class="journal-lightbox" id="j-lightbox">
          <button class="journal-lightbox-close" id="j-lb-close">✕</button>
          <img id="j-lb-img" src="" alt="">
        </div>`;
    },

    _textToolbarHTML() {
        const fontOpts = this.FONTS.map(f => `<option value="${f.value}">${f.label}</option>`).join('');
        const sizeOpts = this.SIZES.map(s => `<option value="${s}">${s}</option>`).join('');
        const colorBtns = this.COLORS.map(c =>
            `<button class="jtb-color" data-color="${c}" style="background:${c}" title="${c}"></button>`
        ).join('');
        const stylePicker = this.CARD_STYLES.map(s =>
            `<div class="jtb-style-swatch" data-style="${s.key}">${s.label}</div>`
        ).join('');

        return `
        <div class="journal-text-toolbar" id="j-text-toolbar">
          <select class="jtb-select" id="jtb-font" title="字体">${fontOpts}</select>
          <select class="jtb-select" id="jtb-size" title="字号">${sizeOpts}</select>
          <div class="jtb-sep"></div>
          <button class="jtb-btn" id="jtb-bold" title="加粗"><b>B</b></button>
          <button class="jtb-btn" id="jtb-italic" title="斜体"><i>I</i></button>
          <div class="jtb-sep"></div>
          ${colorBtns}
          <div class="jtb-sep"></div>
          <button class="jtb-btn" id="jtb-card-style" title="卡片样式">🎴</button>
          <div class="jtb-style-picker" id="jtb-style-picker">${stylePicker}</div>
        </div>`;
    },

    /* ═══ Render canvas ═══ */
    _renderCanvas() {
        const canvas = document.getElementById('j-canvas');
        if (!canvas) return;

        let maxBottom = 900;
        this.elements.forEach(el => {
            const bottom = el.pos_y + el.height + 60;
            if (bottom > maxBottom) maxBottom = bottom;
        });
        canvas.style.minHeight = maxBottom + 'px';

        if (this.elements.length === 0) {
            canvas.innerHTML = `
                <div class="journal-empty">
                    <div class="journal-empty-icon">📖✨</div>
                    <div class="journal-empty-title">今天的手帐还是空白的</div>
                    <div class="journal-empty-hint">点击上方「文字」或「照片」<br>开始记录今天的故事吧 💕</div>
                </div>
            `;
            return;
        }

        canvas.innerHTML = this.elements.map(el => this._elementHTML(el)).join('');
        canvas.querySelectorAll('.journal-el').forEach(dom => this._bindElement(dom));
    },

    _elementHTML(el) {
        const sty = this._getStyle(el);
        const rot = `rotate(${el.rotation}deg)`;
        const style = `left:${el.pos_x}px;top:${el.pos_y}px;width:${el.width}px;height:${el.height}px;transform:${rot};z-index:${el.z_index};`;
        const sel = el.id === this._selectedId ? ' selected' : '';

        const handles = `
          <div class="resize-handle se" data-dir="se"></div>
          <div class="resize-handle sw" data-dir="sw"></div>
          <div class="resize-handle ne" data-dir="ne"></div>
          <div class="resize-handle nw" data-dir="nw"></div>
          <div class="rotate-stem"></div>
          <div class="rotate-handle" title="旋转">↻</div>
          <div class="journal-el-actions">
            <button class="el-action-btn" data-act="top" title="置顶">⬆ 置顶</button>
            <button class="el-action-btn" data-act="dup" title="复制">📋 复制</button>
            <button class="el-action-btn danger" data-act="del" title="删除">🗑 删除</button>
          </div>`;

        if (el.element_type === 'photo') {
            const src = `/uploads/journal/${el.photo_path}`;
            return `
            <div class="journal-el photo-el${sel}" data-id="${el.id}" style="${style}">
              <div class="photo-inner"><img src="${src}" alt="" draggable="false"></div>
              <div class="photo-caption">${this._esc(sty.caption || '')}</div>
              ${handles}
            </div>`;
        } else {
            const cardStyle = sty.cardStyle || 'default';
            const authorImg = Utils.personaAvatarUrl(el.author);
            const textStyle = this._buildTextCSS(sty);
            return `
            <div class="journal-el text-el style-${cardStyle}${sel}" data-id="${el.id}" style="${style}">
              <div class="text-content" contenteditable="true" data-id="${el.id}" style="${textStyle}">${this._esc(el.content)}</div>
              <div class="text-author"><img src="${authorImg}" alt="">${el.author}</div>
              ${handles}
            </div>`;
        }
    },

    _buildTextCSS(sty) {
        let css = '';
        if (sty.font && sty.font !== 'inherit') css += `font-family:${sty.font};`;
        if (sty.size) css += `font-size:${sty.size}px;`;
        if (sty.color) css += `color:${sty.color};`;
        if (sty.bold) css += 'font-weight:700;';
        if (sty.italic) css += 'font-style:italic;';
        return css;
    },

    _esc(t) {
        const d = document.createElement('div');
        d.textContent = t || '';
        return d.innerHTML;
    },

    /* ═══ Toolbar events ═══ */
    _bindToolbar() {
        document.getElementById('j-prev')?.addEventListener('click', () => this._changeDate(-1));
        document.getElementById('j-next')?.addEventListener('click', () => this._changeDate(1));
        document.getElementById('j-today')?.addEventListener('click', () => this._loadDate(this._todayStr()));
        document.getElementById('j-add-text')?.addEventListener('click', () => this._addText());

        const fileInput = document.getElementById('j-file-input');
        document.getElementById('j-add-photo')?.addEventListener('click', () => fileInput?.click());
        fileInput?.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach((f, i) => this._uploadPhoto(f, i));
            fileInput.value = '';
        });

        document.getElementById('j-export-btn')?.addEventListener('click', () => this._exportToImage());

        // Background picker
        document.getElementById('j-bg-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('j-bg-picker')?.classList.toggle('open');
        });
        document.querySelectorAll('.journal-bg-swatch').forEach(s => {
            s.addEventListener('click', (e) => {
                e.stopPropagation();
                const bg = s.dataset.bg;
                this._canvasBg = bg;
                localStorage.setItem('journal-bg', bg);
                document.getElementById('j-canvas')?.setAttribute('data-bg', bg);
                document.querySelectorAll('.journal-bg-swatch').forEach(x => x.classList.toggle('active', x.dataset.bg === bg));
                document.getElementById('j-bg-picker')?.classList.remove('open');
            });
        });
        // Close pickers on outside click — handled in init(), not here

        // Text style toolbar
        this._bindTextToolbar();

        // Lightbox
        document.getElementById('j-lb-close')?.addEventListener('click', () => this._closeLightbox());
        document.getElementById('j-lightbox')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._closeLightbox();
        });
    },

    _bindTextToolbar() {
        document.getElementById('jtb-font')?.addEventListener('change', (e) => this._applyTextStyle({ font: e.target.value }));
        document.getElementById('jtb-size')?.addEventListener('change', (e) => this._applyTextStyle({ size: e.target.value }));
        document.getElementById('jtb-bold')?.addEventListener('click', () => {
            const el = this._selectedElement();
            if (!el) return;
            const sty = this._getStyle(el);
            this._applyTextStyle({ bold: !sty.bold });
        });
        document.getElementById('jtb-italic')?.addEventListener('click', () => {
            const el = this._selectedElement();
            if (!el) return;
            const sty = this._getStyle(el);
            this._applyTextStyle({ italic: !sty.italic });
        });
        document.querySelectorAll('.jtb-color').forEach(btn => {
            btn.addEventListener('click', () => this._applyTextStyle({ color: btn.dataset.color }));
        });
        // Card style picker
        document.getElementById('jtb-card-style')?.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('jtb-style-picker')?.classList.toggle('open');
        });
        document.querySelectorAll('.jtb-style-swatch').forEach(s => {
            s.addEventListener('click', (e) => {
                e.stopPropagation();
                this._applyTextStyle({ cardStyle: s.dataset.style });
                document.querySelectorAll('.jtb-style-swatch').forEach(x => x.classList.toggle('active', x.dataset.style === s.dataset.style));
                document.getElementById('jtb-style-picker')?.classList.remove('open');
            });
        });
    },

    _applyTextStyle(updates) {
        const el = this._selectedElement();
        if (!el || el.element_type !== 'text') return;
        const sty = { ...this._getStyle(el), ...updates };
        el.style_data = JSON.stringify(sty);

        // Apply visually
        const dom = document.querySelector(`.journal-el[data-id="${el.id}"]`);
        if (dom) {
            const textContent = dom.querySelector('.text-content');
            if (textContent) textContent.style.cssText = this._buildTextCSS(sty);
            // Card style
            if (updates.cardStyle) {
                this.CARD_STYLES.forEach(s => dom.classList.remove('style-' + s.key));
                dom.classList.add('style-' + updates.cardStyle);
            }
        }
        // Update toolbar state
        this._syncToolbarState(el);
        // Save
        this._debounceSave(el.id, { style_data: JSON.stringify(sty) });
    },

    _syncToolbarState(el) {
        const sty = this._getStyle(el);
        const fontSel = document.getElementById('jtb-font');
        const sizeSel = document.getElementById('jtb-size');
        if (fontSel) fontSel.value = sty.font || 'inherit';
        if (sizeSel) sizeSel.value = sty.size || '16';
        document.getElementById('jtb-bold')?.classList.toggle('active', !!sty.bold);
        document.getElementById('jtb-italic')?.classList.toggle('active', !!sty.italic);
        document.querySelectorAll('.jtb-style-swatch').forEach(s =>
            s.classList.toggle('active', s.dataset.style === (sty.cardStyle || 'default'))
        );
    },

    _selectedElement() {
        return this.elements.find(el => el.id === this._selectedId) || null;
    },

    /* ═══ Export ═══ */
    async _exportToImage() {
        if (typeof html2canvas === 'undefined') {
            App.showToast('导出组件加载中，请稍后再试...', 'warning');
            return;
        }
        
        // Deselect any active element before capturing
        this._select(null);
        
        const canvasEl = document.getElementById('j-canvas');
        if (!canvasEl) return;
        
        try {
            App.showToast('导出中...', 'info');
            // Adding a small delay to ensure UI selection state clears visually
            await new Promise(r => setTimeout(r, 100));
            
            const renderCanvas = await html2canvas(canvasEl, {
                useCORS: true,
                backgroundColor: null, // preserve background transparency/pattern if any
                scale: 2 // High res export
            });
            
            const imgData = renderCanvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = imgData;
            a.download = `共同日记_${this.currentDate}.png`;
            a.click();
            
            App.showToast('导出成功', 'success');
        } catch (err) {
            console.error('Export error:', err);
            App.showToast('导出失败，请重试', 'error');
        }
    },

    /* ═══ Canvas-level events ═══ */
    _bindCanvas() {
        const wrap = document.getElementById('j-canvas-wrap');
        if (!wrap) return;

        wrap.addEventListener('pointerdown', (e) => {
            if (e.target === wrap || e.target.id === 'j-canvas' || e.target.closest('.journal-empty')) {
                this._select(null);
            }
        });
        // keydown handler bound once in init() — no longer here (P1 #6 fix)
    },

    /* ═══ Per-element interactions ═══ */
    _bindElement(dom) {
        const id = parseInt(dom.dataset.id);

        // Drag
        dom.addEventListener('pointerdown', (e) => {
            if (e.target.classList.contains('resize-handle') || e.target.classList.contains('rotate-handle') ||
                e.target.closest('.journal-el-actions') || e.target.isContentEditable) return;
            e.preventDefault();
            this._select(id);
            this._startDrag(dom, id, e);
        });

        // Resize
        dom.querySelectorAll('.resize-handle').forEach(h => {
            h.addEventListener('pointerdown', (e) => {
                e.stopPropagation(); e.preventDefault();
                this._startResize(dom, id, h.dataset.dir, e);
            });
        });

        // Rotate
        dom.querySelector('.rotate-handle')?.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); e.preventDefault();
            this._startRotate(dom, id, e);
        });

        // Action bar buttons
        dom.querySelectorAll('.el-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const act = btn.dataset.act;
                if (act === 'del') this._deleteElement(id);
                else if (act === 'top') this._bringToTop(id);
                else if (act === 'dup') this._duplicateElement(id);
            });
        });

        // Double-click photo → lightbox
        if (dom.classList.contains('photo-el')) {
            dom.addEventListener('dblclick', () => {
                const img = dom.querySelector('img');
                if (img) this._openLightbox(img.src);
            });
        }

        // Text: save on blur, prevent drag while editing
        const textContent = dom.querySelector('.text-content');
        if (textContent) {
            textContent.addEventListener('blur', () => {
                this._saveField(id, { content: textContent.textContent });
            });
            textContent.addEventListener('pointerdown', (e) => {
                e.stopPropagation();
                this._select(id);
            });
        }
    },

    /* ═══ Selection ═══ */
    _select(id) {
        this._selectedId = id;
        document.querySelectorAll('.journal-el').forEach(el => {
            el.classList.toggle('selected', parseInt(el.dataset.id) === id);
        });
        // Show/hide text toolbar
        const toolbar = document.getElementById('j-text-toolbar');
        const el = this._selectedElement();
        if (toolbar) {
            if (el && el.element_type === 'text') {
                toolbar.classList.add('visible');
                this._syncToolbarState(el);
            } else {
                toolbar.classList.remove('visible');
            }
        }
    },

    /* ═══ Drag ═══ */
    _startDrag(dom, id, e) {
        const el = this.elements.find(x => x.id === id);
        if (!el) return;
        const startX = e.clientX, startY = e.clientY;
        const origX = el.pos_x, origY = el.pos_y;
        dom.classList.add('dragging');
        dom.setPointerCapture(e.pointerId);

        const onMove = (ev) => {
            el.pos_x = Math.max(0, origX + ev.clientX - startX);
            el.pos_y = Math.max(0, origY + ev.clientY - startY);
            dom.style.left = el.pos_x + 'px';
            dom.style.top = el.pos_y + 'px';
        };
        const onUp = () => {
            dom.classList.remove('dragging');
            dom.removeEventListener('pointermove', onMove);
            dom.removeEventListener('pointerup', onUp);
            this._debounceSave(id, { pos_x: el.pos_x, pos_y: el.pos_y });
        };
        dom.addEventListener('pointermove', onMove);
        dom.addEventListener('pointerup', onUp);
    },

    /* ═══ Resize ═══ */
    _startResize(dom, id, dir, e) {
        const el = this.elements.find(x => x.id === id);
        if (!el) return;
        const startX = e.clientX, startY = e.clientY;
        const origW = el.width, origH = el.height, origX = el.pos_x, origY = el.pos_y;

        const onMove = (ev) => {
            let dx = ev.clientX - startX, dy = ev.clientY - startY;
            let nw = origW, nh = origH, nx = origX, ny = origY;
            if (dir.includes('e')) nw = Math.max(60, origW + dx);
            if (dir.includes('w')) { nw = Math.max(60, origW - dx); nx = origX + (origW - nw); }
            if (dir.includes('s')) nh = Math.max(40, origH + dy);
            if (dir.includes('n')) { nh = Math.max(40, origH - dy); ny = origY + (origH - nh); }
            dom.style.width = nw + 'px'; dom.style.height = nh + 'px';
            dom.style.left = nx + 'px'; dom.style.top = ny + 'px';
            el.width = nw; el.height = nh; el.pos_x = nx; el.pos_y = ny;
        };
        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            this._debounceSave(id, { width: el.width, height: el.height, pos_x: el.pos_x, pos_y: el.pos_y });
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    },

    /* ═══ Rotate ═══ */
    _startRotate(dom, id, e) {
        const el = this.elements.find(x => x.id === id);
        if (!el) return;
        const rect = dom.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx);
        const origRot = el.rotation;

        const onMove = (ev) => {
            const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx);
            let deg = origRot + (angle - startAngle) * (180 / Math.PI);
            for (const sa of [0, 45, 90, 135, 180, 225, 270, 315, -45, -90, -135, -180, 360]) {
                if (Math.abs(deg - sa) < 4) { deg = sa; break; }
            }
            dom.style.transform = `rotate(${deg}deg)`;
            el.rotation = deg;
        };
        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            this._debounceSave(id, { rotation: el.rotation });
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    },

    /* ═══ Save ═══ */
    _debounceSave(id, fields) {
        // Per-element debounce so editing element B doesn't cancel A's save
        const existing = this._saveTimers.get(id);
        if (existing) clearTimeout(existing);
        this._saveTimers.set(id, setTimeout(() => {
            this._saveTimers.delete(id);
            this._saveField(id, fields);
        }, 250));
    },
    async _saveField(id, fields) {
        try {
            await API.updateElement(id, fields);
            App.socket?.emit('journal:updated', { date: this.currentDate });
        } catch (err) { console.error('Journal save:', err); }
    },

    /* ═══ Add text ═══ */
    async _addText() {
        const wrap = document.getElementById('j-canvas-wrap');
        const r = wrap?.getBoundingClientRect();
        const cx = (wrap?.scrollLeft || 0) + (r ? r.width / 2 : 200) - 100;
        const cy = (wrap?.scrollTop || 0) + (r ? r.height / 2 : 200) - 40;

        const fd = new FormData();
        fd.append('date', this.currentDate);
        fd.append('author', this._author());
        fd.append('element_type', 'text');
        fd.append('content', '');
        fd.append('pos_x', Math.max(20, cx));
        fd.append('pos_y', Math.max(20, cy));
        fd.append('width', 200); fd.append('height', 80);
        fd.append('style_data', JSON.stringify({ cardStyle: 'default', size: '16' }));

        try {
            const data = await API.addElement(fd);
            App.socket?.emit('journal:updated', { date: this.currentDate });
            this._selectedId = data.element?.id || null;
            await this._loadDate(this.currentDate);
            if (this._selectedId) {
                const textEl = document.querySelector(`.journal-el[data-id="${this._selectedId}"] .text-content`);
                if (textEl) textEl.focus();
            }
        } catch (err) { App.showToast('添加失败: ' + err.message, 'error'); }
    },

    /* ═══ Upload photo ═══ */
    async _uploadPhoto(file, idx = 0) {
        const wrap = document.getElementById('j-canvas-wrap');
        const r = wrap?.getBoundingClientRect();
        const bx = (wrap?.scrollLeft || 0) + (r ? r.width / 2 : 200) - 120;
        const by = (wrap?.scrollTop || 0) + (r ? r.height / 2 : 200) - 90;

        const fd = new FormData();
        fd.append('date', this.currentDate);
        fd.append('author', this._author());
        fd.append('element_type', 'photo');
        fd.append('photo', file);
        fd.append('pos_x', Math.max(20, bx + idx * 35));
        fd.append('pos_y', Math.max(20, by + idx * 35));
        fd.append('width', 240); fd.append('height', 200);
        // Random slight rotation for organic feel
        fd.append('rotation', (Math.random() * 8 - 4).toFixed(1));

        try {
            await API.addElement(fd);
            App.socket?.emit('journal:updated', { date: this.currentDate });
            await this._loadDate(this.currentDate);
        } catch (err) { App.showToast('上传失败: ' + err.message, 'error'); }
    },

    /* ═══ Element actions ═══ */
    async _deleteElement(id) {
        try {
            await API.deleteElement(id);
            App.socket?.emit('journal:updated', { date: this.currentDate });
            if (this._selectedId === id) this._select(null);
            await this._loadDate(this.currentDate);
        } catch (err) { App.showToast('删除失败', 'error'); }
    },

    async _bringToTop(id) {
        const maxZ = Math.max(...this.elements.map(e => e.z_index), 0);
        try {
            await API.updateElement(id, { z_index: maxZ + 1 });
            App.socket?.emit('journal:updated', { date: this.currentDate });
            await this._loadDate(this.currentDate);
        } catch (_) {}
    },

    async _duplicateElement(id) {
        const el = this.elements.find(x => x.id === id);
        if (!el) return;
        const fd = new FormData();
        fd.append('date', this.currentDate);
        fd.append('author', el.author);
        fd.append('element_type', el.element_type);
        fd.append('content', el.content || '');
        fd.append('pos_x', el.pos_x + 20);
        fd.append('pos_y', el.pos_y + 20);
        fd.append('width', el.width); fd.append('height', el.height);
        fd.append('rotation', el.rotation);
        if (el.style_data) fd.append('style_data', typeof el.style_data === 'object' ? JSON.stringify(el.style_data) : el.style_data);
        // Can't duplicate photo file, so for photo elements just copy metadata (photo will reference same file)
        if (el.photo_path) {
            // Need server-side logic to handle — for now just create a text copy notice
            fd.set('element_type', 'text');
            fd.set('content', '(照片副本)');
        }
        try {
            await API.addElement(fd);
            App.socket?.emit('journal:updated', { date: this.currentDate });
            await this._loadDate(this.currentDate);
        } catch (err) { App.showToast('复制失败', 'error'); }
    },

    /* ═══ Date nav ═══ */
    _changeDate(delta) {
        const d = new Date(this.currentDate + 'T00:00:00');
        d.setDate(d.getDate() + delta);
        this._loadDate(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
    },

    /* ═══ Lightbox ═══ */
    _openLightbox(src) {
        const lb = document.getElementById('j-lightbox'), img = document.getElementById('j-lb-img');
        if (lb && img) { img.src = src; lb.classList.add('open'); }
    },
    _closeLightbox() { document.getElementById('j-lightbox')?.classList.remove('open'); },

    /* ═══ Real-time ═══ */
    refresh() { if (this.currentDate) this._loadDate(this.currentDate); },
};
