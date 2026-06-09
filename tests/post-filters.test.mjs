import assert from 'node:assert/strict';
import test from 'node:test';
import { getArticlePosts, getNotePosts, isNotePost } from '../src/utils/postFilters.ts';

const createPost = (slug, data = {}) => ({
  slug,
  data: {
    title: slug,
    pubDate: data.pubDate || new Date('2026-01-01'),
    ...data
  }
});

test('isNotePost supports both notes and note checkbox names', () => {
  assert.equal(isNotePost(createPost('notes', { notes: true })), true);
  assert.equal(isNotePost(createPost('note', { note: true })), true);
  assert.equal(isNotePost(createPost('article')), false);
});

test('getArticlePosts excludes note entries from the main post flow', () => {
  const posts = [
    createPost('article-new', { pubDate: new Date('2026-03-01') }),
    createPost('note-entry', { note: true, pubDate: new Date('2026-04-01') }),
    createPost('notes-entry', { notes: true, pubDate: new Date('2026-05-01') }),
    createPost('article-old', { pubDate: new Date('2026-02-01') })
  ];

  assert.deepEqual(
    getArticlePosts(posts).map((post) => post.slug),
    ['article-new', 'article-old']
  );
});

test('getNotePosts keeps note entries separated from articles', () => {
  const posts = [
    createPost('article', { pubDate: new Date('2026-03-01') }),
    createPost('note-entry', { note: true, pubDate: new Date('2026-04-01') }),
    createPost('notes-entry', { notes: true, pubDate: new Date('2026-05-01') })
  ];

  assert.deepEqual(
    getNotePosts(posts).map((post) => post.slug),
    ['notes-entry', 'note-entry']
  );
});
