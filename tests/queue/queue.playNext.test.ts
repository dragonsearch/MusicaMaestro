import { describe, expect, it } from "vitest";
import {
  InvalidStreamUrl,
  YtDlpExtractError,
} from "../../src/extractor/Yt-dlp_Extractor.mjs";
import { makeQueue, makeItem } from "../helpers.js";

/**
 * playNext() turns `items[pointer]` into audio and advances the pointer.
 *
 * Why these tests: this is the only place that calls `player.play`, so a
 * regression here means silence. The three catch branches are the interesting
 * part — each one recovers differently:
 *
 *   YtDlpExtractError  -> skip forward one item (the URL is unusable)
 *   InvalidStreamUrl   -> drop the expired tail and re-resolve it (the URL
 *                         expired; the items are still valid)
 *   anything else      -> log and stay put (unknown failure, do not lose items)
 *
 * Note: `InvalidStreamUrl` is thrown by playNext itself when `stream_url` is
 * null, so the null-item test exercises the same branch as an expired URL.
 */
describe("Queue.playNext", () => {
  // The happy path, and the definition of the pointer/currentIndex split:
  // currentIndex records what is playing, pointer moves to what is next.
  it("plays the item at the pointer and advances", async () => {
    const { queue, player } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";

    await queue.playNext();

    expect(player.played).toHaveLength(1);
    expect(queue.currentIndex).toBe(0);
    expect(queue.pointer).toBe(1);
  });

  // An unknown error must not consume the item. Leaving the pointer alone
  // means the track is still queued and can be retried or skipped by the user.
  it("does not advance the pointer when resource creation fails", async () => {
    const { queue, extractor } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";
    extractor.failWith = new Error("boom");

    await queue.playNext();

    // The failed item is still at the pointer so it can be retried/skipped.
    expect(queue.pointer).toBe(0);
  });

  // YtDlpExtractError means the URL itself is unusable, so the item is
  // abandoned and the queue moves on. The player is marked Playing so skip()
  // takes the stop branch instead of re-entering playNext recursively.
  it("skips past an item the extractor cannot resolve", async () => {
    const { queue, player, extractor } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";
    // Keep the player busy so skip() does not re-enter playNext.
    player.state = { status: "playing" as never };
    extractor.failWith = new YtDlpExtractError("extract failed", "a");

    await queue.playNext();

    expect(queue.pointer).toBe(1);
    expect(player.played).toHaveLength(0);
  });

  // JavaScript lets anything be thrown. The catch block narrows with
  // `instanceof Error` before reading `.stack`, so a string must not crash the
  // handler. This test proves the narrowing works and the item is kept.
  it("swallows a non-Error rejection without advancing", async () => {
    const { queue, extractor } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";
    // A thrown string is not an Error, so it takes the generic log branch.
    extractor.createAudioResource = () => Promise.reject("plain string");

    await expect(queue.playNext()).resolves.toBeUndefined();

    expect(queue.pointer).toBe(0);
  });

  // Stream URLs expire after a few hours. When that happens the items are
  // still valid, only their URLs are stale, so the queue keeps the played
  // prefix, drops the stale tail, and asks the extractor to re-resolve it.
  // The queue goes idle because there is nothing playable until the new URLs
  // arrive; the resolve listener restarts playback.
  it("drops the expired tail and asks the extractor to resolve it again", async () => {
    const { queue, extractor } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"), makeItem("c"));
    queue.queueState.status = "playing";
    queue._pointer = 1;
    // A null stream_url is what an expired playlist item looks like.
    queue.items[1] = makeItem("b", null);

    await queue.playNext();

    expect(queue.queueState.status).toBe("idle");
    expect(queue.items.map((item) => item.original_url)).toEqual(["a"]);
    expect(extractor.resolvedItems).toHaveLength(1);
    expect(extractor.resolvedItems[0].map((item) => item.original_url)).toEqual(
      ["b", "c"],
    );
  });
});
