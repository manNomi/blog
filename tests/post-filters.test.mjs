import assert from 'node:assert/strict';
import test from 'node:test';
import { getArticlePosts, getNotePosts, sortPostsByPubDateDesc } from '../src/utils/postFilters.ts';

const post = ({ slug, title, pubDate, main = false, notes = false }) => ({
  slug,
  data: {
    title,
    pubDate: new Date(pubDate),
    main,
    notes
  }
});

test('sortPostsByPubDateDesc orders posts by newest publication date first', () => {
  const sorted = sortPostsByPubDateDesc([
    post({ slug: 'old', title: 'Old', pubDate: '2024-01-01' }),
    post({ slug: 'new', title: 'New', pubDate: '2026-01-01' }),
    post({ slug: 'middle', title: 'Middle', pubDate: '2025-01-01' })
  ]);

  assert.deepEqual(
    sorted.map((item) => item.slug),
    ['new', 'middle', 'old']
  );
});

test('sortPostsByPubDateDesc keeps same-date posts deterministic', () => {
  const sorted = sortPostsByPubDateDesc([
    post({ slug: 'z-slug', title: '같은 날 C', pubDate: '2026-06-09' }),
    post({ slug: 'a-slug', title: '같은 날 A', pubDate: '2026-06-09' }),
    post({ slug: 'b-slug', title: '같은 날 A', pubDate: '2026-06-09' })
  ]);

  assert.deepEqual(
    sorted.map((item) => item.slug),
    ['a-slug', 'b-slug', 'z-slug']
  );
});

test('sortPostsByPubDateDesc places Main checked posts before regular latest posts', () => {
  const sorted = sortPostsByPubDateDesc([
    post({ slug: 'regular-new', title: 'Regular New', pubDate: '2026-06-29' }),
    post({ slug: 'main-old', title: 'Main Old', pubDate: '2024-01-01', main: true }),
    post({ slug: 'main-new', title: 'Main New', pubDate: '2025-01-01', main: true })
  ]);

  assert.deepEqual(
    sorted.map((item) => item.slug),
    ['main-new', 'main-old', 'regular-new']
  );
});

test('article and note helpers preserve newest-first order after filtering', () => {
  const entries = [
    post({ slug: 'article-old', title: 'Article Old', pubDate: '2024-01-01' }),
    post({ slug: 'note-new', title: 'Note New', pubDate: '2026-01-01', notes: true }),
    post({ slug: 'article-new', title: 'Article New', pubDate: '2025-01-01' }),
    post({ slug: 'note-old', title: 'Note Old', pubDate: '2023-01-01', notes: true })
  ];

  assert.deepEqual(
    getArticlePosts(entries).map((item) => item.slug),
    ['article-new', 'article-old']
  );
  assert.deepEqual(
    getNotePosts(entries).map((item) => item.slug),
    ['note-new', 'note-old']
  );
});
