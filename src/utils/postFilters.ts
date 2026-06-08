import type { CollectionEntry } from 'astro:content';

export type BlogEntry = CollectionEntry<'blog'>;

export const isNotePost = (post: BlogEntry) => post.data.notes === true;

export const isArticlePost = (post: BlogEntry) => !isNotePost(post);

export const sortPostsByPubDateDesc = <T extends BlogEntry>(posts: T[]) =>
  [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

export const getArticlePosts = <T extends BlogEntry>(posts: T[]) =>
  sortPostsByPubDateDesc(posts).filter(isArticlePost);

export const getNotePosts = <T extends BlogEntry>(posts: T[]) =>
  sortPostsByPubDateDesc(posts).filter(isNotePost);
