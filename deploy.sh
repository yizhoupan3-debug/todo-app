#!/bin/bash
# ========================================
# 峡谷讨伐日记 — 阿里云一键部署脚本
# 支持 AlibabaCloudLinux / CentOS / Ubuntu
# ========================================

set -e

echo "⚔️  峡谷讨伐日记 — 开始部署..."
echo ""

# 检测包管理器
if command -v dnf &> /dev/null; then
    PKG="dnf"
elif command -v yum &> /dev/null; then
    PKG="yum"
elif command -v apt-get &> /dev/null; then
    PKG="apt-get"
else
    echo "❌ 无法识别包管理器"; exit 1
fi
echo "  使用包管理器: $PKG"

# 1. 安装 Node.js 20
echo "[1/5] 安装 Node.js..."
if ! command -v node &> /dev/null; then
    if [ "$PKG" = "apt-get" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    else
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $PKG install -y nodejs
    fi
else
    echo "  Node.js 已安装: $(node -v)"
fi

# 2. 安装 Git & gcc (better-sqlite3 需要编译)
echo "[2/5] 安装 Git 和编译工具..."
if [ "$PKG" = "apt-get" ]; then
    apt-get update && apt-get install -y git build-essential python3
else
    $PKG install -y git gcc gcc-c++ make python3
fi

# 3. 克隆代码
echo "[3/5] 拉取代码..."
APP_DIR="/opt/todo-app"
APP_DATA_DIR="/var/lib/todo-app"
if [ -d "$APP_DIR" ]; then
    echo "  更新已有代码..."
    cd $APP_DIR && git pull
else
    git clone https://github.com/yizhoupan3-debug/todo-app.git $APP_DIR
fi
cd $APP_DIR

# 4. 安装依赖
echo "[4/5] 安装依赖..."
npm install --production
mkdir -p "$APP_DATA_DIR"
if [ -f "$APP_DIR/data/todo.db" ] && [ ! -f "$APP_DATA_DIR/todo.db" ]; then
    cp "$APP_DIR"/data/todo.db* "$APP_DATA_DIR"/ 2>/dev/null || true
fi
if [ -d "$APP_DIR/data/journal" ]; then
    mkdir -p "$APP_DATA_DIR/journal"
    cp -a "$APP_DIR/data/journal/." "$APP_DATA_DIR/journal/" 2>/dev/null || true
fi
rm -rf "$APP_DIR/data"
ln -sfn "$APP_DATA_DIR" "$APP_DIR/data"

# 5. 配置 systemd 服务（开机自启 + 后台运行）
echo "[5/5] 配置系统服务..."
cat > /etc/systemd/system/todo-app.service << 'EOF'
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
Environment=TODO_APP_DATA_DIR=/var/lib/todo-app

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable todo-app
systemctl restart todo-app

# 等待服务启动
sleep 2

# 检查状态
if systemctl is-active --quiet todo-app; then
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "你的公网IP")
    echo ""
    echo "========================================="
    echo "⚔️  部署成功！"
    echo ""
    echo "  访问地址: http://$PUBLIC_IP"
    echo ""
    echo "  管理命令:"
    echo "    查看状态: systemctl status todo-app"
    echo "    查看日志: journalctl -u todo-app -f"
    echo "    重启服务: systemctl restart todo-app"
    echo "    更新代码: cd /opt/todo-app && git pull && npm install && systemctl restart todo-app"
    echo "========================================="
else
    echo "❌ 服务启动失败，查看日志: journalctl -u todo-app -n 20"
fi
