"use server";

import {
  getFeedDb,
  postDaremasterMessageDb,
  postFeedCommentDb,
  reactDb,
  setFeedPostPinnedDb,
} from "@/server/world";
import type { DaremasterPost } from "@/agents/types";
import type { FeedPost, ReactionKind } from "@/lib/types";

export async function getFeed(challengeId?: string, cursor?: string) {
  void cursor;
  return getFeedDb(challengeId);
}

export async function postFeedComment(challengeId: string, content: string) {
  return postFeedCommentDb(challengeId, content);
}

export async function react(postId: string, kind: ReactionKind) {
  return reactDb(postId, kind);
}

export async function postDaremasterMessage(
  post: DaremasterPost,
  pinned: boolean = false,
  cta?: FeedPost["cta"]
) {
  return postDaremasterMessageDb(post, pinned, cta);
}

export async function setFeedPostPinned(postId: string, pinned: boolean) {
  return setFeedPostPinnedDb(postId, pinned);
}
