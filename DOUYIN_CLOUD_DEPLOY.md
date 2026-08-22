# Douyin Cloud deployment for 2048 ranking backend

## Current status

- Mini-game AppID: `ttbbdccd6125a6baaa02`.
- The client already uses `tt.login` and the existing HTTP API contract: `/auth/douyin`, `/runs`, `/leaderboard`, `/me/rank`, `/me/history`.
- The backend already exposes `/health` and reads `PORT` from the environment.
- `DOUYIN_APP_SECRET` must be configured only in Douyin Cloud secret/environment settings; never commit it.

## Container deployment

Use this directory as the Douyin Cloud container-service source directory. The included `Dockerfile` runs Node 22 and starts `server.mjs`. Configure the cloud service port to the same value as `PORT` (default `8000`) and set the health check path to `/health`.

Required environment/secret values in the Douyin Cloud service:

```text
DOUYIN_APP_ID=ttbbdccd6125a6baaa02
DOUYIN_APP_SECRET=<configure in cloud secret settings>
DOUYIN_CODE2SESSION_URL=<current official mini-game code2Session endpoint>
PORT=8000
```

Do not put the AppSecret in Cocos, `.env.example`, Git, screenshots, or chat.

## Important storage limitation

The current backend writes rankings to `ranking-data.json` via `DB_PATH`. That is acceptable only for local/smoke testing. Container local files are not a safe production database for global ranking and user history. Before public release, migrate `users`, `sessions`, and `runs` to Douyin Cloud Database and add the required indexes.

Until that migration is complete, do not treat the global leaderboard as production durable.

## Manual console values still required

After creating the Douyin Cloud environment/service, record these two values for the client integration step:

1. Douyin Cloud environment ID.
2. Cloud hosting/container service ID or service name used by the official cloud-hosting SDK.

These identifiers are not secrets. Do not send AppSecret.

## Release gate

Before publishing, verify with at least two real Douyin accounts/devices:

- account A and B resolve to different server-side users;
- A cannot read B's personal history;
- both see the same global leaderboard;
- score submission survives app restart and cloud-service restart;
- session expiry/relogin works;
- cloud database persistence survives container replacement;
- health check and cloud-hosting invocation both work on a real device.

## Verified code2Session endpoint

`DOUYIN_CODE2SESSION_URL` must be the official code2Session endpoint (new domain recommended by the platform): `https://minigame.zijieapi.com/mgplatform/api/apps/jscode2session` (GET, query params: `appid`, `secret`, `code`). The legacy domain `https://developer.toutiao.com/api/apps/jscode2session` still works but the platform recommends migrating to the new one.

