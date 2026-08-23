import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8000);
const DATA_PATH = path.resolve(process.env.DB_PATH || './ranking-data.json');
// TOKEN_TTL defined below with stateless auth

function initialState() { return { nextUserId: 1, nextRunId: 1, users: [], runs: [] }; }
function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    return { ...initialState(), ...parsed };
  } catch { return initialState(); }
}
let state = loadState();
function persist() {
  const tmp = DATA_PATH + '.tmp';
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, DATA_PATH);
}
const sha256 = s => crypto.createHash('sha256').update(String(s)).digest('hex');
function json(res, code, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(code, { 'content-type':'application/json; charset=utf-8', 'content-length':data.length });
  res.end(data);
}
async function readJson(req) {
  const chunks=[]; let size=0;
  for await (const chunk of req) { size += chunk.length; if (size > 65536) throw new Error('payload too large'); chunks.push(chunk); }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
// 无状态 token：payload.expire.signature，不依赖服务端 session
const TOKEN_TTL = 30 * 24 * 3600 * 1000;
const tokenSecret = () => process.env.DOUYIN_APP_SECRET || 'dev-secret';
function issueToken(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_TTL })).toString('base64url');
  const sig = crypto.createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  return payload + '.' + sig;
}
function authUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i,'');
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', tokenSecret()).update(payload).digest('base64url');
  if (sig !== expected) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp < Date.now()) return null;
    return state.users.find(u => u.id === data.uid) || null;
  } catch { return null; }
}
async function exchangeDouyinCode(code) {
  const appid = process.env.DOUYIN_APP_ID;
  const secret = process.env.DOUYIN_APP_SECRET;
  const endpoint = process.env.DOUYIN_CODE2SESSION_URL;
  if (!appid || !secret || !endpoint) throw new Error('Douyin credentials/code exchange endpoint not configured');
  const url = new URL(endpoint);
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('code', code);
  const resp = await fetch(url, { method:'GET' });
  if (!resp.ok) throw new Error('Douyin auth HTTP ' + resp.status);
  const data = await resp.json();
  const platformId = data.openid || data.open_id || data.user_id;
  if (!platformId) throw new Error('No stable user id in Douyin auth response');
  return String(platformId);
}
function leaderboard(mode, limit=100000) {
  const bestByUser = new Map();
  for (const r of state.runs) {
    if (r.mode !== mode) continue;
    const old = bestByUser.get(r.userId);
    if (!old || r.score > old.score || (r.score === old.score && (r.durationMs < old.durationMs || (r.durationMs === old.durationMs && r.achievedAt < old.achievedAt)))) bestByUser.set(r.userId, r);
  }
  const sorted = [...bestByUser.values()].sort((a,b) => b.score-a.score || a.durationMs-b.durationMs || a.achievedAt.localeCompare(b.achievedAt));
  return sorted.slice(0,limit).map((r,i) => {
    const u = state.users.find(x=>x.id===r.userId);
    return { rank:i+1, userId:r.userId, displayName:u?.displayName || '玩家', score:r.score, maxTile:r.maxTile, durationMs:r.durationMs, achievedAt:r.achievedAt };
  });
}

const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (req.method === 'GET' && url.pathname === '/health') return json(res,200,{ok:true,storage:'json'});

    if (req.method === 'POST' && url.pathname === '/auth/douyin') {
      const body = await readJson(req); const code = String(body.code || '');
      if (!code) return json(res,400,{error:'code required'});
      const platformId = await exchangeDouyinCode(code);
      let user = state.users.find(u=>u.platformId===platformId);
      if (!user) { user={id:state.nextUserId++,platformId,displayName:'玩家',createdAt:new Date().toISOString()}; state.users.push(user); persist(); }
      return json(res,200,{token:issueToken(user.id)});
    }

    const user = authUser(req);
    if (!user) return json(res,401,{error:'unauthorized'});

    if (req.method === 'POST' && url.pathname === '/runs') {
      const body = await readJson(req);
      const score=Number(body.score), maxTile=Number(body.maxTile), durationMs=Number(body.durationMs), mode=String(body.mode || 'CLASSIC');
      if (!Number.isSafeInteger(score)||score<0||score>1e9) return json(res,400,{error:'invalid score'});
      if (!Number.isSafeInteger(maxTile)||maxTile<2||maxTile>1048576) return json(res,400,{error:'invalid maxTile'});
      if (!Number.isSafeInteger(durationMs)||durationMs<0||durationMs>86400000) return json(res,400,{error:'invalid durationMs'});
      if (!['CLASSIC','ZEN','DAILY'].includes(mode)) return json(res,400,{error:'invalid mode'});
      const displayName = String(body.displayName || '').trim().slice(0, 32);
      if (displayName) { user.displayName = displayName; persist(); }
      const run={id:state.nextRunId++,userId:user.id,score,maxTile,durationMs,mode,achievedAt:new Date().toISOString(),version:'1'};
      state.runs.push(run); persist(); return json(res,200,{ok:true,runId:run.id});
    }

    if (req.method === 'GET' && url.pathname === '/leaderboard') {
      const mode=['CLASSIC','ZEN','DAILY'].includes(url.searchParams.get('mode'))?url.searchParams.get('mode'):'CLASSIC';
      const limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||100));
      return json(res,200,{entries:leaderboard(mode,limit).map(({userId,...x})=>x)});
    }
    if (req.method === 'GET' && url.pathname === '/me/rank') {
      const mode=['CLASSIC','ZEN','DAILY'].includes(url.searchParams.get('mode'))?url.searchParams.get('mode'):'CLASSIC';
      const rows=leaderboard(mode); const mine=rows.find(x=>x.userId===user.id); const total=rows.length;
      return json(res,200,mine?{rank:mine.rank,total,score:mine.score,percentile:total?Math.max(0,Math.round((1-(mine.rank-1)/total)*10000)/100):100}:{rank:null,total,score:0,percentile:null});
    }
    if (req.method === 'POST' && url.pathname === '/me/displayName') {
      const body = await readJson(req);
      const name = String(body.displayName || '').trim().slice(0, 32);
      if (name) { user.displayName = name; persist(); }
      return json(res,200,{ok:true,displayName:user.displayName});
    }
    if (req.method === 'GET' && url.pathname === '/me/history') {
      const mode=url.searchParams.get('mode');
      const rows=state.runs.filter(r=>r.userId===user.id && (!mode||r.mode===mode)).sort((a,b)=>b.achievedAt.localeCompare(a.achievedAt)).slice(0,100).map(r=>({score:r.score,maxTile:r.maxTile,durationMs:r.durationMs,mode:r.mode,achievedAt:r.achievedAt}));
      return json(res,200,{entries:rows});
    }
    return json(res,404,{error:'not found'});
  } catch (err) { return json(res,500,{error:String(err?.message || err)}); }
});
server.listen(PORT,()=>console.log('2048 ranking server listening on', PORT));
