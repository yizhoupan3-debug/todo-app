---
description: 峡谷讨伐日记 — 部署与更新流程
---

# 部署策略

## 项目信息
- **GitHub 仓库**: https://github.com/yizhoupan3-debug/todo-app.git
- **阿里云服务器**: 43.99.80.200
- **服务器应用根目录**: /opt/todo-app
- **当前线上目录链接**: /opt/todo-app/current
- **服务名称**: todo-app (systemd)
- **线上端口**: 80

## 推荐流程：本地一键 release 到阿里云

### 发版前
```bash
cd /Users/joe/Documents/todo_list_app
npm run release:check
```

### 正式发版
```bash
cd /Users/joe/Documents/todo_list_app
npm run release:aliyun
```

### 当前基线测试已知为红时，强制发版
```bash
cd /Users/joe/Documents/todo_list_app
ALLOW_TEST_FAILURE=1 npm run release:aliyun
```

## 回滚

### 回滚到上一版
```bash
cd /Users/joe/Documents/todo_list_app
npm run release:rollback
```

### 回滚到指定 release 目录名
```bash
cd /Users/joe/Documents/todo_list_app
bash scripts/release-rollback.sh v1.0.0-20260328T000000Z-abcdef1
```

## 兼容入口
旧命令仍可用，但现在等价于正式 release：
```bash
cd /Users/joe/Documents/todo_list_app
bash scripts/deploy.sh
```

## 首次部署
在全新服务器上执行仓库根目录的一键初始化脚本：
```bash
bash deploy.sh
```

## 服务器管理命令
- 查看状态: `systemctl status todo-app`
- 查看日志: `journalctl -u todo-app -f`
- 查看当前线上版本: `cat /opt/todo-app/current/RELEASE_INFO.json`
- 查看 release 列表: `ls -1 /opt/todo-app/releases`
