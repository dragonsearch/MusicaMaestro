import { describe, expect, it } from "vitest";
import { makeQueue } from "../helpers.js";

/**
 * enqueue() is a thin pass-through: it hands URLs to the extractor and does
 * NOT touch `items` itself. Items only appear once the extractor emits
 * "resolve" (covered in queue.basics.test.ts).
 *
 * Why these tests: the pass-through is easy to break by "helpfully" pushing
 * items here, which would double-add them once the resolve event fires. The
 * rejection test guards the `await` — without it, extraction errors become
 * unhandled rejections instead of reaching the command handler.
 */
describe("Queue.enqueue", () => {
  it("forwards the url to the extractor", async () => {
    const { queue, extractor } = makeQueue();

    await queue.enqueue("https://youtu.be/x");

    expect(extractor.requested).toEqual(["https://youtu.be/x"]);
  });

  it("forwards a list of urls unchanged", async () => {
    const { queue, extractor } = makeQueue();
    const urls = ["https://youtu.be/x", "https://youtu.be/y"];

    await queue.enqueue(urls);

    expect(extractor.requested).toEqual([urls]);
  });

  it("propagates extractor failures to the caller", async () => {
    const { queue, extractor } = makeQueue();
    extractor.requestItems = () => Promise.reject(new Error("nope"));

    await expect(queue.enqueue("https://youtu.be/x")).rejects.toThrow("nope");
  });
});
