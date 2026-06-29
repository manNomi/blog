import type { CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

export const isNotePost = (post: BlogEntry) => post.data.notes === true;

export const isArticlePost = (post: BlogEntry) => !isNotePost(post);

export const comparePostsByMainThenPubDateDesc = <T extends BlogEntry>(a: T, b: T) => {
  const mainDiff = Number(b.data.main === true) - Number(a.data.main === true);
  if (mainDiff !== 0) return mainDiff;

  const dateDiff = b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  if (dateDiff !== 0) return dateDiff;

  const titleDiff = a.data.title.localeCompare(b.data.title, 'ko-KR');
  if (titleDiff !== 0) return titleDiff;

  return a.slug.localeCompare(b.slug, 'ko-KR');
};

export const sortPostsByPubDateDesc = <T extends BlogEntry>(posts: T[]) =>
  [...posts].sort(comparePostsByMainThenPubDateDesc);

export const getArticlePosts = <T extends BlogEntry>(posts: T[]) =>
  sortPostsByPubDateDesc(posts).filter(isArticlePost);

export const getNotePosts = <T extends BlogEntry>(posts: T[]) =>
  sortPostsByPubDateDesc(posts).filter(isNotePost);
