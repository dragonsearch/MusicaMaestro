import { describe, expect, it } from "vitest";
import { Item } from "../../src/queue/Item.mjs";

/**
 * Item is a plain data holder: three fields, no logic.
 *
 * Why test it at all: the extractor builds Items and the Queue reads them, so
 * a renamed or dropped field would break playback with a confusing error far
 * from the cause. These tests pin the field names.
 *
 * The null case matters because playlist items are queued before their stream
 * URL is resolved, and `playNext` treats a null `stream_url` as "expired".
 *
 * Item is a .mjs file, so its types come from the JSDoc in src/queue/Item.mjs.
 * The `stream_url` annotation must stay `string|null`; if it regresses to
 * `string`, the null test below stops compiling. That is the intended signal —
 * fix the JSDoc, do not cast here.
 */
describe("Item", () => {
  it("stores the url, stream url and metadata", () => {
    const metadata = { title: "song" };

    const item = new Item(
      "https://youtu.be/x",
      "https://stream.test/x",
      metadata,
    );

    expect(item.original_url).toBe("https://youtu.be/x");
    expect(item.stream_url).toBe("https://stream.test/x");
    expect(item.metadata).toBe(metadata);
  });

  it("allows a null stream url for unresolved playlist items", () => {
    const item = new Item("https://youtu.be/x", null, {});

    expect(item.stream_url).toBeNull();
  });
});
