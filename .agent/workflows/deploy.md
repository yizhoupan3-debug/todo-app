---
description: 峡谷讨伐日记 — 部署与更新流程
---

# 部署策略

## 项目信息
- **GitHub 仓库**: https://github.com/yizhoupan3-debug/todo-app.git
- **阿里云服务器**: 43.99.80.200
- **服务器应用路径**: /opt/todo-app
- **服务名称**: todo-app (systemd)
- **线上端口**: 80

## 每次修改后必须执行

### 1. 本地 Git 提交推送
// turbo
```bash
cd /Users/joe/Documents/todo_list_app && git add -A && git commit -m "<简明描述改动>" && git push
```

### 2. 给用户阿里云更新指令
修改完成后，提供以下命令让用户在服务器上执行：
```bash
sudo bash -c 'cd /opt/todo-app && git pull && systemctl restart todo-app'
```

> **注意**: 每次代码修改完成后必须立刻执行 Git 提交推送，不要等用户提醒。

## 服务器管理命令
- 查看状态: `systemctl status todo-app`
- 查看日志: `journalctl -u todo-app -f`
- 重启服务: `systemctl restart todo-app`

## 首次部署
在全新服务器上执行一键部署脚本:
```bash
bash deploy.sh
```
