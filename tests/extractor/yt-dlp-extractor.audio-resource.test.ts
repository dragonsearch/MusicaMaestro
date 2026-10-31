import { PassThrough } from "stream";
import {
  AudioPlayerStatus,
  NoSubscriberBehavior,
  createAudioPlayer,
} from "@discordjs/voice";
import { afterEach, describe, expect, it } from "vitest";
import Yt_dlp_Extractor, {
  InvalidStreamUrl,
} from "../../src/extractor/Yt-dlp_Extractor.mjs";

/**
 * Integration test for the extractor -> AudioPlayer seam.
 *
 * Why it exists: `createAudioResource` is the only place where our code hands
 * a stream to @discordjs/voice. Everything downstream (Queue, the player, the
 * voice connection) assumes the result is a real AudioResource. A fake cannot
 * verify that, because the fake is the thing being trusted.
 *
 * What is real here: `createAudioResource`, `createStream`'s error handling,
 * `demuxProbe`, and the AudioPlayer. What is stubbed: only `createStream`,
 * which would otherwise open a network connection to a YouTube CDN URL.
 *
 * This is deliberately NOT a Queue test. Queue's own contract is covered by
 * the unit tests in tests/queue/; this file covers the extractor's.
 */
describe("Yt_dlp_Extractor.createAudioResource", () => {
  const players: ReturnType<typeof createAudioPlayer>[] = [];
  const streams: PassThrough[] = [];

  afterEach(() => {
    for (const player of players.splice(0)) {
      player.stop(true);
    }
    for (const stream of streams.splice(0)) {
      stream.destroy();
    }
  });

  // Builds an extractor whose network fetch is replaced by an in-memory
  // stream. demuxProbe sniffs the first bytes, so data is written before the
  // call; without it the probe would wait forever.
  function makeExtractor() {
    const stream = new PassThrough();
    streams.push(stream);
    stream.write(Buffer.alloc(3840));

    const extractor = new Yt_dlp_Extractor();
    extractor.createStream = async () => stream;
    return { extractor, stream };
  }

  it("produces a resource the real AudioPlayer accepts", async () => {
    const { extractor } = makeExtractor();

    const resource = await extractor.createAudioResource(
      "https://example.test/track",
    );

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    players.push(player);

    player.play(resource);

    // The player stores the resource it accepted. If the extractor returned
    // something malformed, play() would leave the player Idle instead.
    const state = player.state;
    // `resource` only exists on the non-idle variants of the state union, so
    // this guard both narrows the type and fails loudly if the player rejected
    // the resource.
    if (state.status === AudioPlayerStatus.Idle) {
      throw new Error("player stayed idle: it rejected the resource");
    }
    expect(state.resource).toBe(resource);
  });

  it("rejects an empty stream url before touching the network", async () => {
    const extractor = new Yt_dlp_Extractor();
    let fetched = false;
    extractor.createStream = async () => {
      fetched = true;
      return new PassThrough();
    };

    await expect(extractor.createAudioResource("")).rejects.toBeInstanceOf(
      InvalidStreamUrl,
    );
    expect(fetched).toBe(false);
  });

  it("propagates a failed fetch as InvalidStreamUrl", async () => {
    const extractor = new Yt_dlp_Extractor();
    extractor.createStream = async () => {
      throw new InvalidStreamUrl("Failed to fetch stream url", "https://x");
    };

    await expect(
      extractor.createAudioResource("https://example.test/track"),
    ).rejects.toBeInstanceOf(InvalidStreamUrl);
  });
});
