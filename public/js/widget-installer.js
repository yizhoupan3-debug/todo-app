function installWidget(widgetType) {
    const platform = document.querySelector('.platform-btn.active')?.dataset.platform || 'mac';
    const baseUrl = location.origin;
    const widgetUrl = `${baseUrl}/widget/${widgetType}.html`;

    const widgetMeta = {
        todo: { name: '今日待办', icon: '📋', desc: '紧凑任务列表 · 独立窗口运行' },
        calendar: { name: '月历视图', icon: '📅', desc: '日历 + 任务详情 · 宽屏视图' }
    };
    const sizes = { todo: '360,520', calendar: '920,640' };
    const meta = widgetMeta[widgetType] || { name: widgetType, icon: '🖥️', desc: '桌面小组件' };
    const size = sizes[widgetType] || '600,500';

    let cmd, step1Text, tipText, termTitle, prompt;

    if (platform === 'mac') {
        step1Text = '打开「终端」(按 ⌘+空格 搜索 Terminal)';
        cmd = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --app="${widgetUrl}" --window-size=${size}`;
        tipText = '✨ 用 Chrome App 模式打开，无地址栏，像原生小组件一样';
        termTitle = 'Terminal';
        prompt = '$';
    } else {
        step1Text = '打开「命令提示符」(按 Win+R 输入 cmd)';
        cmd = `start "" "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --app="${widgetUrl}" --window-size=${size}`;
        tipText = '✨ 用 Chrome App 模式打开，无地址栏，像原生小组件一样';
        termTitle = 'CMD';
        prompt = '>';
    }

    document.getElementById('widget-hero-icon').textContent = meta.icon;
    document.getElementById('widget-modal-title').textContent = `安装「${meta.name}」小组件`;
    document.getElementById('widget-hero-sub').textContent = meta.desc;

    document.getElementById('widget-step1-text').textContent = step1Text;
    document.getElementById('widget-cmd-code').textContent = cmd;
    document.getElementById('widget-terminal-title').textContent = termTitle;
    document.getElementById('widget-terminal-prompt').textContent = prompt;
    document.getElementById('widget-tip').textContent = tipText;
    document.getElementById('widget-tab-cmd-icon').textContent = platform === 'mac' ? '⌨️' : '💻';

    document.getElementById('widget-url-code').textContent = widgetUrl;

    const overlay = document.getElementById('widget-modal-overlay');
    overlay.classList.remove('hidden');

    const tabCmd = document.getElementById('widget-tab-cmd');
    const tabBrowser = document.getElementById('widget-tab-browser');
    const panelCmd = document.getElementById('widget-panel-cmd');
    const panelBrowser = document.getElementById('widget-panel-browser');

    tabCmd.className = 'widget-method-tab active';
    tabBrowser.className = 'widget-method-tab';
    panelCmd.classList.remove('hidden');
    panelBrowser.classList.add('hidden');

    tabCmd.onclick = () => {
        tabCmd.classList.add('active');
        tabBrowser.classList.remove('active');
        panelCmd.classList.remove('hidden');
        panelBrowser.classList.add('hidden');
    };
    tabBrowser.onclick = () => {
        tabBrowser.classList.add('active');
        tabCmd.classList.remove('active');
        panelBrowser.classList.remove('hidden');
        panelCmd.classList.add('hidden');
    };

    const copyBtn = document.getElementById('widget-copy-btn');
    copyBtn.innerHTML = '<span class="widget-action-icon">📋</span> 复制命令';
    copyBtn.classList.remove('copied');
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(cmd).then(() => {
            copyBtn.innerHTML = '<span class="widget-action-icon">✅</span> 已复制!';
            copyBtn.classList.add('copied');
            App.showToast('命令已复制到剪贴板 ✨', 'success');
            setTimeout(() => {
                copyBtn.innerHTML = '<span class="widget-action-icon">📋</span> 复制命令';
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = cmd;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            copyBtn.innerHTML = '<span class="widget-action-icon">✅</span> 已复制!';
            copyBtn.classList.add('copied');
            App.showToast('命令已复制到剪贴板 ✨', 'success');
            setTimeout(() => {
                copyBtn.innerHTML = '<span class="widget-action-icon">📋</span> 复制命令';
                copyBtn.classList.remove('copied');
            }, 2000);
        });
    };

    document.getElementById('widget-open-btn').onclick = () => {
        window.open(widgetUrl, '_blank');
        App.showToast(`已在新标签页打开「${meta.name}」✨`, 'success');
    };

    document.getElementById('widget-modal-close').onclick = () => Utils.closeModalAnimated(overlay);
    overlay.onclick = (e) => { if (e.target === overlay) Utils.closeModalAnimated(overlay); };
}
