
import { apiRequest } from "./client";

// ============================================================
// TYPES
// ============================================================

export type PostSort =
  | "newest"
  | "oldest"
  | "most_liked"
  | "most_discussed";

export interface PostOwner {
  id: number;
  username: string;
}

export interface PublicPost {
  id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  owner: PostOwner | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export interface PostPagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
}

export interface PublicPostsResponse {
  items: PublicPost[];
  pagination: PostPagination;
}

export interface PostSocial {
  deck_id: number;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export interface PostComment {
  id: number;
  user_id: number;
  username: string;
  content: string;
  created_at: string;
  updated_at: string | null;
}

export interface PostLikeResponse {
  deck_id: number;
  liked_by_me: boolean;
  likes_count: number;
}

export interface GetPublicPostsOptions {
  q?: string;
  page?: number;
  page_size?: number;
  sort?: PostSort;
}

// ============================================================
// PUBLIC POST DISCOVERY
// ============================================================

export async function getPublicPosts(
  options: GetPublicPostsOptions = {}
): Promise<PublicPostsResponse> {
  const params = new URLSearchParams();

  if (options.q?.trim()) {
    params.set("q", options.q.trim());
  }

  params.set("page", String(options.page ?? 1));
  params.set("page_size", String(options.page_size ?? 20));
  params.set("sort", options.sort ?? "newest");

  return apiRequest<PublicPostsResponse>(
    `/api/v1/decks/public?${params.toString()}`
  );
}

// ============================================================
// SOCIAL STATISTICS
// ============================================================

export async function getPostSocial(
  deckId: number
): Promise<PostSocial> {
  return apiRequest<PostSocial>(
    `/api/v1/decks/${deckId}/social`
  );
}

// ============================================================
// LIKES
// ============================================================

export async function likePost(
  deckId: number
): Promise<PostLikeResponse> {
  return apiRequest<PostLikeResponse>(
    `/api/v1/decks/${deckId}/like`,
    {
      method: "POST",
    }
  );
}

export async function unlikePost(
  deckId: number
): Promise<PostLikeResponse> {
  return apiRequest<PostLikeResponse>(
    `/api/v1/decks/${deckId}/like`,
    {
      method: "DELETE",
    }
  );
}

// ============================================================
// COMMENTS
// ============================================================

export async function getPostComments(
  deckId: number
): Promise<PostComment[]> {
  return apiRequest<PostComment[]>(
    `/api/v1/decks/${deckId}/comments`
  );
}

export async function createPostComment(
  deckId: number,
  content: string
): Promise<PostComment> {
  return apiRequest<PostComment>(
    `/api/v1/decks/${deckId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
}

export async function updatePostComment(
  deckId: number,
  commentId: number,
  content: string
): Promise<PostComment> {
  return apiRequest<PostComment>(
    `/api/v1/decks/${deckId}/comments/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }
  );
}

export async function deletePostComment(
  deckId: number,
  commentId: number
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/decks/${deckId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
}


/* ============================================================
   SCENES — UNIFIED POST ROOM FEED
   ============================================================ */

export interface FeedAuthor {
  id: number;
  username: string;
}

export interface FeedTextPost {
  type: "post";
  id: number;
  content: string;
  created_at: string;
  updated_at: string | null;
  author: FeedAuthor;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export interface FeedDeckPost {
  type: "deck";
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  author: FeedAuthor;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export type FeedItem = FeedTextPost | FeedDeckPost;

export interface UnifiedFeedResponse {
  items: FeedItem[];
  pagination: PostPagination;
}

export interface GetUnifiedFeedOptions {
  page?: number;
  page_size?: number;
}

export async function getUnifiedFeed(
  options: GetUnifiedFeedOptions = {}
): Promise<UnifiedFeedResponse> {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    page_size: String(options.page_size ?? 20),
  });

  return apiRequest<UnifiedFeedResponse>(
    `/api/v1/feed?${params.toString()}`
  );
}


/* ============================================================
   STANDALONE TEXT POSTS — TYPES
   ============================================================ */

export interface TextPost {
  id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string | null;
  author: FeedAuthor;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
}

export interface TextPostLikeResponse {
  post_id: number;
  likes_count: number;
  liked_by_me: boolean;
}


/* ============================================================
   STANDALONE TEXT POSTS — CRUD
   ============================================================ */

export async function createTextPost(
  content: string
): Promise<TextPost> {
  return apiRequest<TextPost>("/api/v1/posts", {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function getTextPost(
  postId: number
): Promise<TextPost> {
  return apiRequest<TextPost>(
    `/api/v1/posts/${postId}`
  );
}

export async function getTextPosts(
  limit = 20,
  offset = 0
): Promise<TextPost[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiRequest<TextPost[]>(
    `/api/v1/posts?${params.toString()}`
  );
}

export async function updateTextPost(
  postId: number,
  content: string
): Promise<TextPost> {
  return apiRequest<TextPost>(
    `/api/v1/posts/${postId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }
  );
}

export async function deleteTextPost(
  postId: number
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/posts/${postId}`,
    {
      method: "DELETE",
    }
  );
}


/* ============================================================
   STANDALONE TEXT POSTS — LIKES
   ============================================================ */

export async function likeTextPost(
  postId: number
): Promise<TextPostLikeResponse> {
  return apiRequest<TextPostLikeResponse>(
    `/api/v1/posts/${postId}/like`,
    {
      method: "POST",
    }
  );
}

export async function unlikeTextPost(
  postId: number
): Promise<TextPostLikeResponse> {
  return apiRequest<TextPostLikeResponse>(
    `/api/v1/posts/${postId}/like`,
    {
      method: "DELETE",
    }
  );
}


/* ============================================================
   STANDALONE TEXT POSTS — COMMENTS
   ============================================================ */

export async function getTextPostComments(
  postId: number
): Promise<PostComment[]> {
  return apiRequest<PostComment[]>(
    `/api/v1/posts/${postId}/comments`
  );
}

export async function createTextPostComment(
  postId: number,
  content: string
): Promise<PostComment> {
  return apiRequest<PostComment>(
    `/api/v1/posts/${postId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    }
  );
}

export async function updateTextPostComment(
  postId: number,
  commentId: number,
  content: string
): Promise<PostComment> {
  return apiRequest<PostComment>(
    `/api/v1/posts/${postId}/comments/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }
  );
}

export async function deleteTextPostComment(
  postId: number,
  commentId: number
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/posts/${postId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
}
