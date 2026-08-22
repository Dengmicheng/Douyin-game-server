# Douyin Game Server

抖音小游戏后端服务集合仓库。每个子目录对应一个小游戏的后端服务，用于部署到抖音云（FaaS / 云托管）。

## 目录结构

```
Douyin-game-server/
├── README.md      # 本文件：仓库说明与游戏后端清单
├── 2048-game/     # 2048 小游戏后端
└── game2/         # （预留）未来新游戏后端
```

## 已包含的游戏后端

### 1. 2048-game（2048 小游戏）

- 目录：`2048-game/`
- 技术栈：Node.js（原生 http，零依赖）+ Dockerfile
- 小游戏 AppID：`ttbbdccd6125a6baaa02`

#### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | `/health` | 健康检查 |
| POST | `/auth/douyin` | 用 `tt.login` 返回的 code 换取会话 token |
| POST | `/runs` | 提交一局分数（需鉴权）|
| GET  | `/leaderboard` | 全局排行榜（需鉴权）|
| GET  | `/me/rank` | 个人排名（需鉴权）|
| GET  | `/me/history` | 个人历史成绩（需鉴权）|

#### 环境变量

```
DOUYIN_APP_ID=ttbbdccd6125a6baaa02
DOUYIN_APP_SECRET=<你的 AppSecret，仅配置在云端，勿提交>
DOUYIN_CODE2SESSION_URL=https://minigame.zijieapi.com/mgplatform/api/apps/jscode2session
PORT=8000
DB_PATH=./ranking-data.json
```

#### 部署（抖音云 Git 部署）

- 部署目录：`2048-game`（内含 Dockerfile）
- 健康检查：路径 `/health`，端口 `8000`
- 详细说明见 `2048-game/DOUYIN_CLOUD_DEPLOY.md`

## 如何添加新游戏后端

1. 在仓库根目录新建目录，命名 `游戏名`（如 `game2`）。
2. 把该游戏的后端代码（`server.mjs`、`Dockerfile`、`package.json`、`.env.example` 等）放进去。
3. 在抖音云为该游戏创建独立服务，部署目录指向该子目录。
4. 更新本 README 的游戏清单。

## 注意事项

- AppSecret 等敏感信息只配置在抖音云环境变量中，不要提交到 Git。
- 当前 2048 后端使用本地 JSON 文件（`DB_PATH`）持久化，仅用于开发联调；正式上线前需迁移到云数据库（MySQL / 云数据库）。
