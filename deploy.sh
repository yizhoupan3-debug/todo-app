#!/bin/bash
# ========================================
# 峡谷讨伐日记 — 阿里云一键部署脚本
# 在阿里云轻量应用服务器上运行此脚本
# ========================================

set -e

echo "⚔️  峡谷讨伐日记 — 开始部署..."
echo ""

# 1. 安装 Node.js 20
echo "[1/5] 安装 Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "  Node.js 已安装: $(node -v)"
fi

# 2. 安装 Git
echo "[2/5] 安装 Git..."
if ! command -v git &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y git
else
    echo "  Git 已安装: $(git --version)"
fi

# 3. 克隆代码
echo "[3/5] 拉取代码..."
APP_DIR="/opt/todo-app"
if [ -d "$APP_DIR" ]; then
    echo "  更新已有代码..."
    cd $APP_DIR && git pull
else
    sudo git clone https://github.com/yizhoupan3-debug/todo-app.git $APP_DIR
    sudo chown -R $USER:$USER $APP_DIR
fi
cd $APP_DIR

# 4. 安装依赖
echo "[4/5] 安装依赖..."
npm install --production

# 5. 配置 systemd 服务（开机自启 + 后台运行）
echo "[5/5] 配置系统服务..."
sudo tee /etc/systemd/system/todo-app.service > /dev/null << 'EOF'
[Unit]
Description=峡谷讨伐日记 Todo App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/todo-app
ExecStart=/usr/bin/node server/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=80

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable todo-app
sudo systemctl restart todo-app

echo ""
echo "========================================="
echo "⚔️  部署成功！"
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me)"
echo ""
echo "  管理命令:"
echo "    查看状态: sudo systemctl status todo-app"
echo "    查看日志: sudo journalctl -u todo-app -f"
echo "    重启服务: sudo systemctl restart todo-app"
echo "    更新代码: cd /opt/todo-app && git pull && npm install && sudo systemctl restart todo-app"
echo "========================================="
