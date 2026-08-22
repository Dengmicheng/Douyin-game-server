# Douyin Game Server

抖音小游戏后端服务集合仓库。每个小游戏的后端代码放在独立分支中，当前 main 分支为 2048 小游戏后端。

## 当前分支：main（2048 小游戏后端）

- 小游戏 AppID：ttbbdccd6125a6baaa02
- 技术栈：Node.js（原生 http，零依赖）+ Dockerfile

### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | /health | 健康检查 |
| POST | /auth/douyin | 用 tt.login 返回的 code 换取会话 token |
| POST | /runs | 提交一局分数（需鉴权）|
| GET  | /leaderboard | 全局排行榜（需鉴权）|
| GET  | /me/rank | 个人排名（需鉴权）|
| GET  | /me/history | 个人历史成绩（需鉴权）|

### 环境变量

DOUYIN_APP_ID=ttbbdccd6125a6baaa02
DOUYIN_APP_SECRET=<你的 AppSecret，仅配置在云端，勿提交>
DOUYIN_CODE2SESSION_URL=https://minigame.zijieapi.com/mgplatform/api/apps/jscode2session
PORT=8000
DB_PATH=./ranking-data.json

### 部署（抖音云 Git 部署）

- 仓库：Dengmicheng/Douyin-game-server
- 分支：main
- 部署目录：仓库根目录（Dockerfile 在根目录下）
- 健康检查：路径 /health，端口 8000
- 详细说明见 DOUYIN_CLOUD_DEPLOY.md

## 如何添加新游戏后端

1. 为每个新游戏创建独立分支（如 game2），在分支根目录放下该游戏的后端代码。
2. 在抖音云为该游戏创建独立服务，绑定对应分支，部署目录指向根目录。
3. 更新本 README 的游戏清单。

## 注意事项

- AppSecret 等敏感信息只配置在抖音云环境变量中，不要提交到 Git。
- 当前 2048 后端使用本地 JSON 文件持久化，仅用于开发联调；正式上线前需迁移到云数据库。
