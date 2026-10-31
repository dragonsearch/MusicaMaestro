import { describe, expect, it } from "vitest";
import { makeQueue, makeItem } from "../helpers.js";

/**
 * replay() retries the current track after a player error, up to a budget.
 *
 * Why these tests: without a budget a broken track loops forever; with a
 * budget that never resets, a second broken track gets no retries at all.
 * The three properties are therefore: retry, give up, and reset per song.
 *
 * The budget is keyed on `last_replayed` (the index the tries belong to), so
 * moving to a different song starts a fresh count.
 *
 * IMPORTANT: the last test pins CURRENT behavior, not desired behavior. See
 * "Known pinned behavior" in tests/README.md — the queue does not actually
 * advance when the budget runs out.
 */
describe("Queue.replay", () => {
  // One failure = one retry. `last_replayed` records which song the count
  // belongs to, which is what makes the reset-per-song test below possible.
  it("retries the current song and increments tries", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";
    queue.currentIndex = 1;
    queue._pointer = 1;

    queue.replay();

    expect(queue.queueState.replay.tries).toBe(1);
    expect(queue.queueState.replay.replaying).toBe(true);
    expect(queue.queueState.replay.last_replayed).toBe(1);
  });

  // The budget exists so a permanently broken track cannot loop forever.
  //
  // WARNING: this test is weaker than it looks. The give-up cycle is exactly
  // 5 calls long (4 retries, then a reset), so 10 calls lands on the "false"
  // frame by parity. It would also pass if the budget were 1 or 9. The
  // deterministic version is the next test, which sets `tries` directly.
  it("gives up after repeated failures instead of retrying forever", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";
    queue.currentIndex = 1;
    queue._pointer = 1;

    // Each replay() call represents one failed attempt.
    for (let i = 0; i < 10; i++) {
      queue.replay();
    }

    // Once the retry budget is exhausted, replaying must be false so the
    // queue can move on rather than looping on a broken song.
    expect(queue.queueState.replay.replaying).toBe(false);
  });

  // Deterministic version of the test above: start one call away from the
  // limit instead of looping and relying on parity.
  //
  // The pointer assertion pins CURRENT behavior, which is a defect: replay()
  // calls skip() with no argument, skip() defaults to the current pointer, so
  // the queue does not advance and the track is retried forever. See
  // "Known pinned behavior" in tests/README.md.
  it("clears the retry budget once it is exhausted", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"));
    queue.queueState.status = "playing";
    queue.currentIndex = 0;
    queue._pointer = 0;
    queue.queueState.replay = {
      replaying: true,
      last_replayed: 0,
      tries: 4,
    };

    queue.replay();

    expect(queue.queueState.replay.tries).toBe(0);
    expect(queue.queueState.replay.replaying).toBe(false);
    // replay() calls skip() without an argument, and skip() defaults to the
    // current pointer, so the pointer stays put. Pinned here so a future
    // change to that default is a visible test failure.
    expect(queue.pointer).toBe(0);
  });

  // Without this reset, a second broken track would inherit the first one's
  // spent budget and get no retries at all.
  it("resets tries when replaying a different song", () => {
    const { queue } = makeQueue();
    queue.items.push(makeItem("a"), makeItem("b"), makeItem("c"));
    queue.queueState.status = "playing";

    queue.currentIndex = 0;
    queue._pointer = 0;
    queue.replay();
    queue.replay();
    expect(queue.queueState.replay.tries).toBe(2);

    queue.currentIndex = 2;
    queue._pointer = 2;
    queue.replay();

    expect(queue.queueState.replay.tries).toBe(1);
    expect(queue.queueState.replay.last_replayed).toBe(2);
  });
});
