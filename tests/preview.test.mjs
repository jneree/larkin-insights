import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { codeFromPath, cardDate, previewMeta, withPreview } from '../preview.js';

const code = 'HBdqSKxxTvSw5ZiB0PbtpQ';
const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('a /n/ link carries its code; anything else does not', () => {
  assert.equal(codeFromPath(`/n/${code}`), code);
  assert.equal(codeFromPath(`/n/${code}/`), code);
  assert.equal(codeFromPath('/n/short'), null);
  assert.equal(codeFromPath(`/x/${code}`), null);
});

test('the preview says the title, who shared it and the day, never the summary', () => {
  const meta = previewMeta({ title: 'Call about Shenzhen, AI hardware and plans', when: 'Oct 27, 2026 · 3:35 PM · 30 min', sharedBy: 'Julien',
    summary: 'Something private.' });
  assert.deepEqual(meta, { title: 'Call about Shenzhen, AI hardware and plans', description: 'Notes shared by Julien · Oct 27, 2026',
    date: 'Tue, October 27, 2026', with: 'With Julien' });
  assert.equal(previewMeta({ title: 'T', when: 'Oct 27, 2026' }).description, 'Notes shared from Larkin · Oct 27, 2026');
  assert.equal(previewMeta({}), null);
  assert.equal(cardDate('nonsense'), 'nonsense');
});

test('the page gets the link’s own tags, escaped; without notes it stays generic', () => {
  const html = withPreview(page, previewMeta({ title: 'Q&A <with> "Sam"', when: 'Oct 27, 2026 · 3 PM · 5 min', sharedBy: 'Julien' }), code);
  assert.match(html, /<meta property="og:title" content="Q&amp;A &lt;with&gt; &quot;Sam&quot;">/);
  assert.match(html, new RegExp(`<meta property="og:image" content="https://insights.getlarkin.com/og/${code}">`));
  assert.match(html, new RegExp(`<meta property="og:url" content="https://insights.getlarkin.com/n/${code}">`));
  assert.match(html, /<title>Q&amp;A &lt;with&gt; &quot;Sam&quot; · Larkin<\/title>/);
  assert.doesNotMatch(html, /Something private/);
  assert.equal(withPreview(page, null, code), page);
  assert.equal(withPreview(page, previewMeta({ title: 'T' }), 'bad'), page);
});
