import { EventEmitter } from "events";
import { AudioPlayerStatus, AudioResource } from "@discordjs/voice";
import Queue from "../src/queue/queue.js";
import type {
  QueueExtractor,
  QueueItem,
  QueuePlayer,
} from "../src/queue/queue.js";

/**
 * Shared test doubles for the Queue suite.
 *
 * Queue talks to two collaborators, declared as ports in src/queue/queue.ts:
 * QueuePlayer and QueueExtractor. The fakes below implement those interfaces,
 * so if Queue starts using a method a fake lacks, the test files stop
 * compiling instead of silently passing.
 *
 * See tests/README.md for the state model and the audio-start flow.
 */

// Stands in for @discordjs/voice AudioPlayer.
// Records every resource passed to play() in `played`, which is how most
// tests assert "the bot tried to play this".
//
// Gotcha: stop() only mutates `state`; it does NOT emit "stateChange" the way
// the real player does. Tests that need the idle handler must emit it
// explicitly (see emitIdle in queue.player-events.test.ts).
export class FakePlayer extends EventEmitter implements QueuePlayer {
  state: { status: AudioPlayerStatus } = { status: AudioPlayerStatus.Idle };
  // One fake connection so the playable condition in _onPlayerIdle passes.
  playable: unknown[] = [{ connection: {} }];
  // Records what Queue handed to play, so tests can assert it played.
  played: AudioResource[] = [];

  play(resource: AudioResource) {
    this.played.push(resource);
    this.state = { status: AudioPlayerStatus.Playing };
    return Promise.resolve();
  }

  stop() {
    this.state = { status: AudioPlayerStatus.Idle };
  }
}

// Stands in for Yt_dlp_Extractor, which shells out to yt-dlp.
// Records what Queue asked for so tests can assert the request without
// spawning a process:
//   requested     - every argument passed to requestItems()
//   resolvedItems - every batch passed to _resolveItems()
//   stopped       - whether stopResolveRequests() was called
// Set `failWith` to make createAudioResource() reject and exercise the
// error branches in playNext().
export class FakeExtractor extends EventEmitter implements QueueExtractor {
  requested: (string | string[])[] = [];
  resolvedItems: QueueItem[][] = [];
  stopped = false;
  // Set this to make createAudioResource reject, to test the error paths.
  failWith: Error | null = null;

  stopResolveRequests() {
    this.stopped = true;
  }

  requestItems(urls: string | string[]) {
    this.requested.push(urls);
    return Promise.resolve();
  }

  createAudioResource(url: string): Promise<AudioResource> {
    if (this.failWith) {
      return Promise.reject(this.failWith);
    }
    // This only needs to be an object Queue can pass to play.
    // The cast is here because a real AudioResource has many more fields.
    return Promise.resolve({ url } as unknown as AudioResource);
  }

  _resolveItems(items: QueueItem[]) {
    this.resolvedItems.push(items);
    return Promise.resolve();
  }

  // Simulate the extractor resolving an item.
  resolveItem(item: QueueItem) {
    this.emit("resolve", item);
  }
}

// Builds the minimum item shape Queue needs.
// stream_url defaults to a value so playNext does not hit the null path;
// pass null explicitly to simulate an expired playlist item.
export function makeItem(
  original_url: string,
  stream_url: string | null = "s",
): QueueItem {
  return { original_url, stream_url, metadata: {} };
}

// Builds a Queue wired to the fakes.
// Every queue test needs the same three objects, so the factory lives here
// instead of being copied into each test file.
//
// The returned queue starts idle with no items. Tests set up the scenario they
// need by pushing items and setting queueState.status directly.
export function makeQueue() {
  const player = new FakePlayer();
  const extractor = new FakeExtractor();
  const queue = new Queue(player, extractor);
  return { queue, player, extractor };
}
