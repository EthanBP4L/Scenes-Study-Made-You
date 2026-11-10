
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ZimmerCanvas from "../../components/ZimmerCanvas";
import RequireAuth from "../../components/RequireAuth";

import {
  createDefaultZimmer,
  type ZimmerDraft,
} from "../../lib/zimmerTypes";

import {
  type FeedItem,
  type PostComment,
  createTextPost,
  getUnifiedFeed,
  likeTextPost,
  unlikeTextPost,
  likePost,
  unlikePost,
  getTextPostComments,
  getPostComments,
  createTextPostComment,
  createPostComment,
} from "../../lib/api/postRoom";

// ============================================================
// ZIMMER BACKGROUND
// ============================================================

const postsRoom: ZimmerDraft = {
  ...createDefaultZimmer(),
  name: "Posts",
  background: {
    type: "gradient",
    color: "#0b1025",
    gradient:
      "radial-gradient(ellipse at 72% 18%, #6b4d8d 0%, #3a2959 38%, #18152f 72%, #0b1025 100%)",
    mediaUrl: null,
  },
  studySets: {
    mode: "hidden",
    trayIcon: "✧",
    trayLabel: "Community",
    trayObjectId: null,
  },
};

const PAGE_SIZE = 20;

// Text posts and decks can share numeric IDs.
// Always include the type in the React/state key.
function itemKey(
  item: Pick<FeedItem, "type" | "id">
): string {
  return `${item.type}:${item.id}`;
}

function formatTime(date: string): string {
  const time = new Date(date).getTime();

  if (!Number.isFinite(time)) {
    return "Recently";
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - time) / 1000)
  );

  if (seconds < 60) return "Just now";

  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ago`;
  }

  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h ago`;
  }

  if (seconds < 604800) {
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  return new Date(date).toLocaleDateString();
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

// ============================================================
// POSTS PAGE
// ============================================================

export default function PostsPage() {
  const router = useRouter();

  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [draft, setDraft] = useState("");

  const [activeTab, setActiveTab] = useState<
    "for-you" | "following"
  >("for-you");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const [busyLikes, setBusyLikes] = useState<string[]>([]);

  const [openComments, setOpenComments] = useState<
    string | null
  >(null);

  const [comments, setComments] = useState<
    Record<string, PostComment[]>
  >({});

  const [commentDrafts, setCommentDrafts] = useState<
    Record<string, string>
  >({});

  const [commentsLoading, setCommentsLoading] = useState<
    string[]
  >([]);

  const [sendingComments, setSendingComments] = useState<
    string[]
  >([]);

  // ==========================================================
  // LOAD FEED
  // ==========================================================

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getUnifiedFeed({
        page: 1,
        page_size: PAGE_SIZE,
      });

      setPosts(response.items);
      setPage(1);
      setHasNext(response.pagination.has_next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  // ==========================================================
  // PUBLISH
  // ==========================================================

  async function publishPost() {
    const content = draft.trim();

    if (!content || publishing) return;

    setPublishing(true);
    setError(null);

    try {
      await createTextPost(content);
      setDraft("");
      await refreshFeed();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPublishing(false);
    }
  }

  // ==========================================================
  // PAGINATION
  // ==========================================================

  async function loadMore() {
    if (loadingMore || !hasNext) return;

    setLoadingMore(true);
    setError(null);

    try {
      const response = await getUnifiedFeed({
        page: page + 1,
        page_size: PAGE_SIZE,
      });

      setPosts((current) => {
        const seen = new Set(current.map(itemKey));

        return [
          ...current,
          ...response.items.filter(
            (item) => !seen.has(itemKey(item))
          ),
        ];
      });

      setPage(response.pagination.page);
      setHasNext(response.pagination.has_next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  // ==========================================================
  // LIKE / UNLIKE
  // ==========================================================

  async function toggleLike(item: FeedItem) {
    const key = itemKey(item);

    if (busyLikes.includes(key)) return;

    setBusyLikes((current) => [...current, key]);
    setError(null);

    try {
      const result =
        item.type === "post"
          ? item.liked_by_me
            ? await unlikeTextPost(item.id)
            : await likeTextPost(item.id)
          : item.liked_by_me
            ? await unlikePost(item.id)
            : await likePost(item.id);

      setPosts((current) =>
        current.map((entry) =>
          itemKey(entry) === key
            ? {
                ...entry,
                likes_count: result.likes_count,
                liked_by_me: result.liked_by_me,
              }
            : entry
        )
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyLikes((current) =>
        current.filter((value) => value !== key)
      );
    }
  }

  // ==========================================================
  // COMMENTS
  // ==========================================================

  async function toggleComments(item: FeedItem) {
    const key = itemKey(item);

    if (openComments === key) {
      setOpenComments(null);
      return;
    }

    setOpenComments(key);

    if (comments[key]) return;

    setCommentsLoading((current) => [...current, key]);
    setError(null);

    try {
      const result =
        item.type === "post"
          ? await getTextPostComments(item.id)
          : await getPostComments(item.id);

      setComments((current) => ({
        ...current,
        [key]: result,
      }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCommentsLoading((current) =>
        current.filter((value) => value !== key)
      );
    }
  }

  async function submitComment(item: FeedItem) {
    const key = itemKey(item);
    const content = (commentDrafts[key] ?? "").trim();

    if (!content || sendingComments.includes(key)) {
      return;
    }

    setSendingComments((current) => [...current, key]);
    setError(null);

    try {
      const comment =
        item.type === "post"
          ? await createTextPostComment(item.id, content)
          : await createPostComment(item.id, content);

      setComments((current) => ({
        ...current,
        [key]: [...(current[key] ?? []), comment],
      }));

      setCommentDrafts((current) => ({
        ...current,
        [key]: "",
      }));

      setPosts((current) =>
        current.map((entry) =>
          itemKey(entry) === key
            ? {
                ...entry,
                comments_count: entry.comments_count + 1,
              }
            : entry
        )
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSendingComments((current) =>
        current.filter((value) => value !== key)
      );
    }
  }

  // ==========================================================
  // OPEN PUBLIC STUDY DECK
  // ==========================================================

  function openStudyDeck(deckId: number) {
    router.push(`/flashcards?deckId=${deckId}`);
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <RequireAuth>
      {/*
        The outer container stays at viewport height.

        ZimmerCanvas remains the background.

        The foreground overlay gets its own scrollable area,
        preventing posts from extending beyond the viewport.
      */}

      <div className="relative h-screen overflow-hidden bg-[#0b1025]">
        <ZimmerCanvas
          pageName="Posts"
          initialRoom={postsRoom}
          showNavigation={true}
        />

        {/* SCROLLABLE POSTS OVERLAY */}

        <div className="pointer-events-none absolute inset-0 z-10 overflow-y-auto overscroll-contain">
          <div className="pointer-events-auto mx-auto max-w-[1200px] px-5 pb-20 pt-16 sm:px-10">
            <div className="mx-auto max-w-[760px]">

              {/* HEADER */}

              <header className="mb-9">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-pink-200/75">
                  SCENES · COMMUNITY
                </p>

                <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                  Posts{" "}
                  <span className="text-[#efb4e8]">
                    ✦
                  </span>
                </h1>

                <p className="mt-3 max-w-lg text-sm leading-7 text-purple-100/65">
                  Thoughts, little moments, and stories from
                  your corner of the universe.
                </p>
              </header>

              <div className="space-y-6">

                {/* POST COMPOSER */}

                <section className="rounded-[28px] border border-purple-200/25 bg-[#251936]/65 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.18)] backdrop-blur-2xl sm:p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-pink-200/30 bg-gradient-to-br from-[#9d72cf]/50 to-[#d28ec7]/30 text-xl text-white">
                      ✧
                    </div>

                    <div>
                      <p className="text-sm font-bold text-white">
                        Create a post
                      </p>

                      <p className="text-xs text-purple-100/50">
                        Share a little something
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={draft}
                    onChange={(event) =>
                      setDraft(event.target.value)
                    }
                    placeholder="What's on your mind?"
                    maxLength={1000}
                    rows={4}
                    className="w-full resize-y rounded-2xl border border-purple-200/20 bg-[#140e29]/55 p-4 text-sm leading-7 text-white outline-none placeholder:text-purple-200/40 focus:border-pink-200/50"
                  />

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-xs text-purple-100/40">
                      {draft.length} / 1000
                    </p>

                    <button
                      type="button"
                      onClick={() => void publishPost()}
                      disabled={!draft.trim() || publishing}
                      className="rounded-2xl border border-pink-200/25 bg-gradient-to-r from-[#8552bf] to-[#c779bc] px-7 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {publishing
                        ? "Publishing…"
                        : "Publish ✦"}
                    </button>
                  </div>
                </section>

                {/* FEED TABS */}

                <div className="flex gap-2 rounded-2xl border border-purple-200/15 bg-[#20162f]/60 p-2 backdrop-blur-xl">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("for-you")
                    }
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      activeTab === "for-you"
                        ? "bg-purple-300/20 text-white"
                        : "text-purple-100/55 hover:bg-white/5"
                    }`}
                  >
                    For You
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab("following")
                    }
                    className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      activeTab === "following"
                        ? "bg-purple-300/20 text-white"
                        : "text-purple-100/55 hover:bg-white/5"
                    }`}
                  >
                    Following
                  </button>
                </div>

                {/* ERROR */}

                {error && (
                  <div
                    role="alert"
                    className="rounded-2xl border border-pink-200/25 bg-[#321c39]/85 px-5 py-4 text-sm text-pink-100"
                  >
                    {error}

                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="ml-3 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* FOLLOWING PLACEHOLDER */}

                {activeTab === "following" ? (
                  <div className="rounded-[28px] border border-purple-200/20 bg-white/[0.06] px-6 py-16 text-center backdrop-blur-2xl">
                    <div className="text-4xl">☁</div>

                    <h2 className="mt-4 text-lg font-bold text-white">
                      Your following feed
                    </h2>

                    <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-purple-100/55">
                      Posts from people you follow will appear
                      here once connected to your account.
                    </p>
                  </div>
                ) : (

                  /* UNIFIED FEED */

                  <div className="space-y-4">

                    {loading ? (
                      <div className="py-12 text-center text-sm text-purple-100/65">
                        Loading the universe…
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="rounded-[28px] border border-purple-200/20 bg-[#211735]/65 px-6 py-16 text-center text-sm text-purple-100/65 backdrop-blur-2xl">
                        No posts yet. Be the first to share
                        something ✦
                      </div>
                    ) : (
                      posts.map((post) => {
                        const key = itemKey(post);
                        const expanded =
                          openComments === key;

                        return (
                          <article
                            key={key}
                            className="rounded-[28px] border border-purple-200/20 bg-[#211735]/65 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-2xl sm:p-6"
                          >
                            <div className="flex items-start gap-3">

                              {/* AVATAR */}

                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-purple-200/25 bg-gradient-to-br from-[#9d72cf]/45 to-[#d28ec7]/25 text-xl text-white">
                                {post.type === "deck"
                                  ? "✦"
                                  : "☾"}
                              </div>

                              <div className="min-w-0 flex-1">

                                {/* AUTHOR */}

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="font-bold text-white">
                                    {post.author.username}
                                  </span>

                                  <span className="text-xs text-purple-100/50">
                                    @{post.author.username}
                                  </span>

                                  <span className="text-xs text-purple-100/35">
                                    ·{" "}
                                    {formatTime(
                                      post.created_at
                                    )}
                                  </span>
                                </div>

                                {/* TEXT POST OR STUDY DECK */}

                                {post.type === "post" ? (
                                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-purple-50/90">
                                    {post.content}
                                  </p>
                                ) : (

                                  /* CLICKABLE STUDY DECK */

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openStudyDeck(post.id)
                                    }
                                    aria-label={`Study deck: ${post.name}`}
                                    className="group mt-4 block w-full rounded-2xl border border-pink-200/20 bg-[#140e29]/50 p-4 text-left transition duration-200 hover:border-pink-200/55 hover:bg-[#2d1d48]/75 hover:shadow-[0_8px_35px_rgba(180,108,179,0.15)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-200"
                                  >
                                    <div className="flex items-start justify-between gap-3">

                                      <div className="min-w-0">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-pink-200/75">
                                          ✧ Public study deck
                                        </p>

                                        <h2 className="break-words text-lg font-bold text-white">
                                          {post.name}
                                        </h2>

                                        {post.description && (
                                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-purple-100/70">
                                            {post.description}
                                          </p>
                                        )}
                                      </div>

                                      <span
                                        aria-hidden="true"
                                        className="shrink-0 text-xl text-pink-200/65 transition group-hover:translate-x-1 group-hover:text-pink-100"
                                      >
                                        ↗
                                      </span>
                                    </div>

                                    {/* STUDY ACTION */}

                                    <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs font-semibold text-pink-200/80 transition group-hover:text-pink-100">
                                      <span>Study flashcards</span>
                                      <span aria-hidden="true">
                                        →
                                      </span>
                                    </div>
                                  </button>
                                )}

                                {/* SOCIAL ACTIONS */}

                                <div className="mt-6 flex items-center gap-5 border-t border-white/10 pt-4">

                                  {/* LIKE */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void toggleLike(post)
                                    }
                                    disabled={busyLikes.includes(
                                      key
                                    )}
                                    aria-label={
                                      post.liked_by_me
                                        ? "Unlike post"
                                        : "Like post"
                                    }
                                    aria-pressed={
                                      post.liked_by_me
                                    }
                                    className={`flex items-center gap-2 text-xs transition disabled:opacity-40 ${
                                      post.liked_by_me
                                        ? "text-pink-200"
                                        : "text-purple-100/55 hover:text-pink-200"
                                    }`}
                                  >
                                    <span className="text-lg">
                                      {post.liked_by_me
                                        ? "♥"
                                        : "♡"}
                                    </span>

                                    {post.likes_count}
                                  </button>

                                  {/* COMMENTS */}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      void toggleComments(post)
                                    }
                                    aria-expanded={expanded}
                                    className="flex items-center gap-2 text-xs text-purple-100/55 transition hover:text-pink-200"
                                  >
                                    <span className="text-lg">
                                      ◇
                                    </span>

                                    {post.comments_count}
                                  </button>

                                  <span className="ml-auto text-xs text-purple-100/35">
                                    SCENES ✦
                                  </span>
                                </div>

                                {/* COMMENTS PANEL */}

                                {expanded && (
                                  <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-pink-200/75">
                                      Comments
                                    </p>

                                    {commentsLoading.includes(
                                      key
                                    ) ? (
                                      <p className="text-xs text-purple-100/55">
                                        Loading comments…
                                      </p>
                                    ) : (
                                      (comments[key] ?? [])
                                        .length === 0 ? (
                                        <p className="text-xs text-purple-100/55">
                                          No comments yet.
                                          Start the conversation.
                                        </p>
                                      ) : (
                                        (comments[key] ?? []).map(
                                          (comment) => (
                                            <div
                                              key={comment.id}
                                              className="rounded-xl bg-white/[0.05] p-3"
                                            >
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-bold text-white">
                                                  {comment.username}
                                                </span>

                                                <span className="text-xs text-purple-100/35">
                                                  {formatTime(
                                                    comment.created_at
                                                  )}
                                                </span>
                                              </div>

                                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-purple-50/85">
                                                {comment.content}
                                              </p>
                                            </div>
                                          )
                                        )
                                      )
                                    )}

                                    {/* COMMENT INPUT */}

                                    <form
                                      onSubmit={(event) => {
                                        event.preventDefault();
                                        void submitComment(post);
                                      }}
                                      className="flex flex-col gap-2 sm:flex-row"
                                    >
                                      <input
                                        type="text"
                                        value={
                                          commentDrafts[key] ?? ""
                                        }
                                        onChange={(event) =>
                                          setCommentDrafts(
                                            (current) => ({
                                              ...current,
                                              [key]:
                                                event.target.value,
                                            })
                                          )
                                        }
                                        maxLength={2000}
                                        placeholder="Write a comment…"
                                        aria-label="Write a comment"
                                        className="min-w-0 flex-1 rounded-xl border border-purple-200/20 bg-[#140e29]/55 px-4 py-3 text-sm text-white outline-none placeholder:text-purple-200/40 focus:border-pink-200/50"
                                      />

                                      <button
                                        type="submit"
                                        disabled={
                                          !commentDrafts[
                                            key
                                          ]?.trim() ||
                                          sendingComments.includes(
                                            key
                                          )
                                        }
                                        className="rounded-xl bg-purple-300/20 px-4 py-3 text-xs font-bold text-white transition hover:bg-purple-300/30 disabled:opacity-40"
                                      >
                                        {sendingComments.includes(
                                          key
                                        )
                                          ? "Sending…"
                                          : "Reply ✦"}
                                      </button>
                                    </form>
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}

                    {/* LOAD MORE */}

                    {!loading && hasNext && (
                      <div className="pt-4 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            void loadMore()
                          }
                          disabled={loadingMore}
                          className="rounded-2xl border border-purple-200/25 bg-[#251936]/75 px-8 py-3 text-sm font-semibold text-white transition hover:bg-purple-300/20 disabled:opacity-40"
                        >
                          {loadingMore
                            ? "Loading…"
                            : "Load more ✦"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FOOTER */}

              <footer className="mt-12 text-center text-xs tracking-[0.25em] text-purple-100/35">
                SCENES · study made you ✦
              </footer>

            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
