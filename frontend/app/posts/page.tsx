
"use client";

import { useState } from "react";
import ZimmerCanvas from "../../components/ZimmerCanvas";
import RequireAuth from "../../components/RequireAuth";
import {
  createDefaultZimmer,
  type ZimmerDraft,
} from "../../lib/zimmerTypes";

type Post = {
  id: string;
  author: string;
  handle: string;
  avatar: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  liked: boolean;
};

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

const starterPosts: Post[] = [
  {
    id: "sample-1",
    author: "SCENES",
    handle: "@scenes",
    avatar: "✦",
    time: "Welcome",
    content:
      "Welcome to your little corner of the universe. Share your thoughts, study moments, and everything in between. ☁️",
    likes: 24,
    comments: 0,
    liked: false,
  },
  {
    id: "sample-2",
    author: "Study Friend",
    handle: "@studyfriend",
    avatar: "☾",
    time: "Example post",
    content:
      "A cozy playlist, a warm drink, and a stack of notes. Sometimes that's all you need for a good study session. 💜",
    likes: 12,
    comments: 0,
    liked: false,
  },
];

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>(starterPosts);
  const [draft, setDraft] = useState("");
  const [activeTab, setActiveTab] = useState<
    "for-you" | "following"
  >("for-you");

  function publishPost() {
    const content = draft.trim();
    if (!content) return;

    const newPost: Post = {
      id: crypto.randomUUID(),
      author: "You",
      handle: "@you",
      avatar: "✧",
      time: "Just now",
      content,
      likes: 0,
      comments: 0,
      liked: false,
    };

    setPosts((current) => [newPost, ...current]);
    setDraft("");
  }

  function toggleLike(id: string) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              liked: !post.liked,
              likes: post.likes + (post.liked ? -1 : 1),
            }
          : post
      )
    );
  }

  return (
    <RequireAuth>
      <div className="relative min-h-screen bg-[#0b1025]">
        <ZimmerCanvas
          pageName="Posts"
          initialRoom={postsRoom}
          showNavigation={true}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto max-w-[1200px] px-5 pb-20 pt-16 sm:px-10">
          <div className="pointer-events-auto mx-auto max-w-[760px]">
            {/* Header */}
            <header className="mb-9">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-pink-200/75">
                SCENES · COMMUNITY
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Posts <span className="text-[#efb4e8]">✦</span>
              </h1>

              <p className="mt-3 max-w-lg text-sm leading-7 text-purple-100/65">
                Thoughts, little moments, and stories from your
                corner of the universe.
              </p>
            </header>

            {/* Main feed */}
            <div className="space-y-6">
              {/* Composer */}
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
                  onChange={(event) => setDraft(event.target.value)}
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
                    onClick={publishPost}
                    disabled={!draft.trim()}
                    className="rounded-2xl border border-pink-200/25 bg-gradient-to-r from-[#8552bf] to-[#c779bc] px-7 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Publish ✦
                  </button>
                </div>
              </section>

              {/* Feed tabs */}
              <div className="flex gap-2 rounded-2xl border border-purple-200/15 bg-[#20162f]/60 p-2 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab("for-you")}
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
                  onClick={() => setActiveTab("following")}
                  className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    activeTab === "following"
                      ? "bg-purple-300/20 text-white"
                      : "text-purple-100/55 hover:bg-white/5"
                  }`}
                >
                  Following
                </button>
              </div>

              {/* Feed */}
              {activeTab === "following" ? (
                <div className="rounded-[28px] border border-purple-200/20 bg-white/[0.06] px-6 py-16 text-center backdrop-blur-2xl">
                  <div className="text-4xl">☁</div>

                  <h2 className="mt-4 text-lg font-bold text-white">
                    Your following feed
                  </h2>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-purple-100/55">
                    Posts from people you follow will appear here
                    once connected to your account.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-[28px] border border-purple-200/20 bg-[#211735]/65 p-5 shadow-[0_12px_40px_rgba(0,0,0,0.14)] backdrop-blur-2xl sm:p-6"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-purple-200/25 bg-gradient-to-br from-[#9d72cf]/45 to-[#d28ec7]/25 text-xl text-white">
                          {post.avatar}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-bold text-white">
                              {post.author}
                            </span>

                            <span className="text-xs text-purple-100/50">
                              {post.handle}
                            </span>

                            <span className="text-xs text-purple-100/35">
                              · {post.time}
                            </span>
                          </div>

                          <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-purple-50/90">
                            {post.content}
                          </p>

                          <div className="mt-6 flex items-center gap-5 border-t border-white/10 pt-4">
                            <button
                              type="button"
                              onClick={() => toggleLike(post.id)}
                              aria-label={
                                post.liked
                                  ? "Unlike post"
                                  : "Like post"
                              }
                              className={`flex items-center gap-2 text-xs transition ${
                                post.liked
                                  ? "text-pink-200"
                                  : "text-purple-100/55 hover:text-pink-200"
                              }`}
                            >
                              <span className="text-lg">
                                {post.liked ? "♥" : "♡"}
                              </span>
                              {post.likes}
                            </button>

                            <span className="flex items-center gap-2 text-xs text-purple-100/45">
                              <span className="text-lg">◇</span>
                              {post.comments}
                            </span>

                            <span className="ml-auto text-xs text-purple-100/35">
                              SCENES ✦
                            </span>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <footer className="mt-12 text-center text-xs tracking-[0.25em] text-purple-100/35">
              SCENES · study made you ✦
            </footer>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
