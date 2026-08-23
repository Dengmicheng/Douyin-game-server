# 2048 Ranking Server

Zero-native-dependency reference backend for account-isolated Douyin ranking/history.

- Uses Node built-ins only (http/crypto/fs/fetch).
- Local/test persistence uses atomic JSON-file replacement.
- Client never chooses user_id; /auth/douyin exchanges tt.login code using server-only credentials and issues a bearer token.
- Global ranking: best run per user/mode, score DESC, duration ASC, achieved time ASC.
- Personal history: authenticated last 100 runs.

## Production
JSON persistence is suitable only for local validation/single-instance low traffic. For production, keep the same API/security boundary but replace persistence with managed PostgreSQL/MySQL and transactional writes.

Required production settings: DOUYIN_APP_ID, DOUYIN_APP_SECRET, current official DOUYIN_CODE2SESSION_URL, HTTPS deployment, Douyin request-domain allowlist, and RankingService.setApiBase(httpsOrigin).

## Production ranking deployment

1. Copy .env.example to .env on the trusted server. Set DOUYIN_APP_ID=ttbbdccd6125a6baaa02. Set DOUYIN_APP_SECRET only in the server secret store/environment; never commit it.
2. Set DOUYIN_CODE2SESSION_URL to the current official Douyin mini-game code2Session endpoint from the Open Platform docs.
3. Deploy this server behind a public HTTPS origin such as https://api.example.com.
4. Add that HTTPS origin/domain to the Douyin mini-game request legal-domain allowlist.
5. In the game, configure RankingService.persistApiBase('https://api.example.com') for the production build/device, or wire the same value through your release configuration.
6. Before public launch, move ranking persistence to managed PostgreSQL/MySQL, then test at least two real Douyin accounts/devices for session isolation, personal history, global rank, session renewal and logout/re-login behavior.
7. Treat client score submissions as untrusted. Add server-side replay/run plausibility checks before using the global leaderboard competitively.

## Douyin Cloud

For the current Douyin Cloud deployment path, see `DOUYIN_CLOUD_DEPLOY.md`. The JSON file store is smoke-test only; migrate ranking state to Douyin Cloud Database before public release.
