import http from 'node:http';

import { AgentHistory } from './history.js';
import { CodexAgentReader } from './reader.js';

const reader = new CodexAgentReader();
const history = new AgentHistory();
const server = http.createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  const reply = (status: number, body: unknown) => { response.writeHead(status); response.end(JSON.stringify(body)); };
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    const accountHeader = request.headers['x-plugin-user-id'];
    const account = typeof accountHeader === 'string' ? accountHeader : '';
    if (request.method === 'POST' && url.pathname === '/agents/clear') {
      if (!account) { reply(503, { error: '请更新后端以启用记录清除' }); return; }
      let body = '';
      for await (const chunk of request) {
        body += chunk;
        if (Buffer.byteLength(body) > 32_768) { reply(413, { error: '请求过大' }); return; }
      }
      let input;
      try { input = JSON.parse(body); } catch { reply(400, { error: '清除参数无效' }); return; }
      if (!Array.isArray(input?.records) || input.records.length < 1 || input.records.length > 100) { reply(400, { error: '清除参数无效' }); return; }
      const agents = [];
      for (const record of input.records) {
        const detail = reader.detail(typeof record?.id === 'string' ? record.id : '');
        if (!detail || !['completed', 'stopped', 'failed'].includes(detail.agent.status) || detail.agent.revision !== record.revision) {
          reply(409, { error: '任务状态已变化，请刷新后重试' }); return;
        }
        agents.push(detail.agent);
      }
      history.clear(account, agents);
      reply(200, { cleared: agents.map((agent) => agent.id), nativeHistoryDeleted: false, resourcesReleased: false });
      return;
    }
    if (request.method !== 'GET') { reply(405, { error: '不支持此操作' }); return; }
    if (url.pathname === '/agents') {
      const offset = Number(url.searchParams.get('offset') || 0);
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100_000) { reply(400, { error: '分页参数无效' }); return; }
      const snapshot = reader.list(url.searchParams.get('project') || '', offset);
      if (account) snapshot.items = history.visible(account, snapshot.items);
      const selectedId = url.searchParams.get('selected');
      if (selectedId) {
        const detail = reader.detail(selectedId);
        snapshot.selectedDetail = detail?.revision === url.searchParams.get('revision') ? { notModified: true } : detail;
      }
      reply(200, snapshot);
    } else if (url.pathname.startsWith('/agents/')) {
      const detail = reader.detail(decodeURIComponent(url.pathname.slice('/agents/'.length)));
      if (!detail) { reply(404, { error: '未找到该子 Agent' }); return; }
      reply(200, detail);
    } else reply(404, { error: 'Not found' });
  } catch {
    reply(503, { error: '暂时无法读取 Codex 原生记录，请稍后重试' });
  }
});
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  if (address && typeof address !== 'string') console.log(JSON.stringify({ ready: true, port: address.port }));
});
