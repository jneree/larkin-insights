import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const script = readFileSync(new URL('../connect/connect.js', import.meta.url), 'utf8');
async function approval(redirect) {
  let poll, returned;
  const nodes = new Map();
  const node = (id) => { if (!nodes.has(id)) nodes.set(id, { hidden: false, addEventListener() {} }); return nodes.get(id); };
  let calls = 0;
  const context = { URL, URLSearchParams, navigator: { userAgent: 'iPhone' },
    location: { hash: '#request=synthetic-request', replace(url) { returned = url; } },
    document: { getElementById: node, querySelector: node, addEventListener() {} },
    setInterval(callback) { poll = callback; return 1; }, clearInterval() {}, setTimeout() {},
    fetch: async () => Response.json(calls++ === 0 ? { client: { name: 'MORI' }, appLink: 'larkin://connect-chatgpt?request=synthetic-request', status: 'pending' }
      : { status: 'approved', redirect }),
  };
  vm.runInNewContext(script, context);
  await new Promise(setImmediate);
  assert.equal(node('h1').textContent, 'Connect MORI to Larkin.');
  poll(); await new Promise(setImmediate);
  return returned;
}
test('approval returns to the exact MORI callback with the authorization parameters', async () => {
  const url = 'https://mori-time-map.jul-neree.chatgpt.site/api/larkin/callback?code=synthetic-code&state=synthetic-state';
  assert.equal(await approval(url), url);
  const chatgpt = 'https://chatgpt.com/connector_platform_oauth_redirect?code=synthetic';
  assert.equal(await approval(chatgpt), chatgpt);
});
test('approval never sends a code to another site or another MORI path', async () => {
  for (const url of ['https://evil.example/cb?code=x', 'https://mori-time-map.jul-neree.chatgpt.site/other?code=x',
    'https://mori-time-map.jul-neree.chatgpt.site.evil.example/api/larkin/callback?code=x',
    'https://user@mori-time-map.jul-neree.chatgpt.site/api/larkin/callback?code=x',
    'http://mori-time-map.jul-neree.chatgpt.site/api/larkin/callback?code=x']) assert.equal(await approval(url), undefined, url);
});
