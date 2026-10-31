import { describe, expect, it } from "vitest";
import { makeQueue, makeItem } from "../helpers.js";

/**
 * The pointer setter is the single place where loop, replay, skip and
 * end-of-queue are resolved. Every other method just assigns `pointer` and
 * lets this setter decide what that means.
 *
 * Why one file for it: the branches interact (replay beats loop, skip beats
 * current-loop, empty beats everything), so they are easier to reason about
 * side by side than scattered across the methods that trigger them.
 *
 * Branch order in the setter, which these tests follow:
 *   1. replaying        -> pin to currentIndex
 *   2. current loop     -> ignore the write unless skipped
 *   3. empty queue      -> 0
 *   4. negative         -> 0
 *   5. past the end     -> wrap to 0 (playlist loop / skipped current loop)
 *                          or clamp to items.length (stop at the end)
 */
describe("Queue pointer", () => {
  // Baseline: a plain skip with no loop and no replay just moves the pointer.
  it("advances on skip", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"), makeItem("c"));

    queue.skip(2);

    expect(queue.pointer).toBe(2);
  });

  // Playlist loop means "after the last song, start over". Skipping past the
  // end is the same as finishing the last song, so it wraps.
  it("wraps to 0 at the end in playlist loop mode", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.setLoopMode("playlist");
    queue.toggleLoop();

    queue.skip(2);

    expect(queue.pointer).toBe(0);
  });

  // Without a loop, the pointer parks at items.length. That is the signal
  // _reachedEnd() looks for, so clamping is what ends the queue cleanly.
  it("clamps to the end when not looping", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));

    queue.skip(5);

    expect(queue.pointer).toBe(2);
  });

  // The skip command accepts a user-supplied number, so a negative index is
  // reachable input. Clamping keeps items[-1] from becoming undefined.
  it("clamps negative values to 0", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));

    queue.skip(-3);

    expect(queue.pointer).toBe(0);
  });

  // An empty queue has no valid index, so any write collapses to 0. This is
  // what keeps a stale pointer from surviving stop() and crashing playNext.
  it("resets to 0 when the queue is empty", () => {
    const { queue } = makeQueue();
    queue._pointer = 4;

    queue.pointer = 2;

    expect(queue.pointer).toBe(0);
  });

  // Current loop means "stay on this song". playNext() increments the pointer
  // after starting a track, and that increment must be undone here, otherwise
  // the loop would drift to the next song. A user skip is the exception.
  it("ignores writes in current loop mode unless the song was skipped", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"), makeItem("c"));
    queue.setLoopMode("current");
    queue.toggleLoop();
    queue._pointer = 1;

    queue.pointer = 2;

    expect(queue.pointer).toBe(1);
  });

  // The exception to the rule above: skip() sets queueState.skipped, so the
  // setter lets the write through. Skipping past the end still wraps.
  it("wraps to 0 in current loop mode when the song was skipped", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.setLoopMode("current");
    queue.toggleLoop();

    queue.skip(2);

    expect(queue.pointer).toBe(0);
  });

  // replay() decrements the pointer to rewind to the failed song. The setter
  // ignores that value and pins to currentIndex instead, so the retry always
  // targets the song that actually failed.
  it("pins the pointer to currentIndex while replaying", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"), makeItem("c"));
    queue.currentIndex = 1;
    queue.queueState.replay.replaying = true;

    queue.pointer = 2;

    expect(queue.pointer).toBe(1);
  });
});
