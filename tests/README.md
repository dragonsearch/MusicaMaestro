# Tests

Vitest suite for the bot. This document explains **what each test file covers,
why it exists, and how the fakes work**, so a failing test tells you which
behavior broke without reading the implementation.

## Running

```bash
npm test              # single run
npm run test:watch    # re-run on change
npm run test:coverage # coverage report (v8)
npm run typecheck     # type-check src + tests
npm run check         # typecheck, then test
```

Config lives in `vitest.config.mts`; it includes `tests/**/*.test.ts` and runs
in the `node` environment.

### Type-checking the tests

`tsconfig.json` only includes `./src/**/*`, so `npm run build` **does not check
the test files**. Vitest transpiles without type-checking, so without a separate
pass a type error in a test shows up only in the editor.

`tsconfig.test.json` extends the main config, adds `./tests/**/*`, and sets
`noEmit`. Run it with `npm run typecheck` (or `npm run check` to also run the
suite).

`checkJs` is deliberately off in that config: the `.mjs` sources are not
type-checked by the build, so enabling it would bury real test errors under
pre-existing ones. JSDoc is still used for inference, which means **a wrong
`@param` in a `.mjs` file surfaces as an error in the test that calls it**. Fix
the JSDoc, not the test.

## Layout

```
tests/
  helpers.ts                          fakes + factories shared by every test
  queue/
    item.test.ts                      Item data holder
    queue.basics.test.ts              isEmpty/size/peek, resolve listener, construction, loop flags
    queue.enqueue.test.ts             enqueue() pass-through to the extractor
    queue.pointer.test.ts             the pointer setter state machine
    queue.playNext.test.ts            turning an item into audio + the 3 error paths
    queue.player-events.test.ts       AudioPlayer "stateChange"/"error" handlers, _restartPlaying
    queue.replay.test.ts              retry budget for a failing track
    queue.stop.test.ts                hard reset of all queue state
  extractor/
    yt-dlp-extractor.audio-resource.test.ts  real extractor -> real AudioPlayer seam
```

One file per concern. If you are looking for "why did the bot skip a song",
start at `queue.pointer.test.ts` and `queue.playNext.test.ts`.

### Why the integration test lives under `extractor/`, not `queue/`

It used to be `queue/queue.audio-player.integration.test.ts`, but it built the
`AudioResource` itself and handed it to the extractor fake. That only proved
Queue passes a resource through — which the unit tests already cover — and it
never touched the code that can actually break: `probeAndCreateResource` in
`Yt-dlp_Extractor`.

The test now stubs only `createStream` (the network call) and lets the real
`demuxProbe` + `createAudioResource` run, then feeds the result to a real
`AudioPlayer`. That is the seam no fake can verify, and it is the extractor's
contract, so it belongs in `tests/extractor/`.

## The fakes (`helpers.ts`)

Queue depends on two collaborators, declared as ports in `src/queue/queue.ts`:
`QueuePlayer` and `QueueExtractor`. The fakes implement those interfaces, so if
Queue starts using a new method the test files stop compiling instead of
silently passing.

| Fake            | Records                                      | Knobs                                           |
| --------------- | -------------------------------------------- | ----------------------------------------------- |
| `FakePlayer`    | `played` — every resource handed to `play()` | `state`, `playable`                             |
| `FakeExtractor` | `requested`, `resolvedItems`, `stopped`      | `failWith` — makes `createAudioResource` reject |

`makeQueue()` returns `{ queue, player, extractor }` already wired together.
`makeItem(url, streamUrl = "s")` builds a queue item; pass `null` as the second
argument to simulate an expired playlist entry.

### `Item.stream_url` is `string | null`

`Item` is a `.mjs` file, so its types come from JSDoc. `stream_url` is
annotated `string|null` because playlist items are queued before their stream
URL is resolved (`getPlaylistItems` passes `null`). `playNext()` treats a null
`stream_url` as an expired URL and re-resolves the tail.

If that annotation regresses to `string`, `item.test.ts` fails to compile —
which is the intended signal, not a reason to cast in the test.

### Gotcha: `FakePlayer.stop()` does not emit `stateChange`

The real `AudioPlayer` emits `stateChange` when it stops. The fake only mutates
`state`. This keeps tests deterministic, but it means **re-entrancy through the
idle handler is not exercised by the fake**. If a test needs that, emit the
event explicitly (see `emitIdle` in `queue.player-events.test.ts`).

## Queue state model

Understanding these four fields makes every test readable.

| Field               | Meaning                                                           |
| ------------------- | ----------------------------------------------------------------- |
| `items`             | The queue. Items are appended when the extractor emits `resolve`. |
| `pointer`           | Index of the **next** item to play.                               |
| `currentIndex`      | Index of the item **currently** playing.                          |
| `queueState.status` | `"idle"` or `"playing"`. There is no paused state.                |

`pointer` and `currentIndex` differ by one during normal playback: `playNext()`
sets `currentIndex = pointer` and then increments `pointer`.

`queueState` also carries the flags that the pointer setter reads:

| Flag                   | Set by               | Read by                                                     |
| ---------------------- | -------------------- | ----------------------------------------------------------- |
| `skipped`              | `skip()`             | pointer setter (distinguishes a skip from a normal advance) |
| `replay.replaying`     | `replay()`           | pointer setter (pins pointer to `currentIndex`)             |
| `replay.tries`         | `replay()`           | `replay()` (retry budget)                                   |
| `replay.last_replayed` | `replay()`           | `replay()` (resets tries when the song changes)             |
| `errored`              | player error handler | reset on replay/stop                                        |

Because several methods read this object, `stop()` rebuilds it wholesale rather
than mutating fields. `queue.stop.test.ts` guards that.

## How audio actually starts

This flow is not obvious from any single file:

1. `enqueue(urls)` asks the extractor for items. It does **not** add anything to
   `items` itself.
2. The extractor emits `"resolve"` per item. The listener in the Queue
   constructor pushes the item into `items`.
3. If the queue was `idle`, that listener flips it to `playing` and calls
   `_onPlayerIdle()`.
4. `_onPlayerIdle()` runs a guard chain, then calls `playNext()`.
5. `playNext()` reads `items[pointer]`, builds an `AudioResource`, plays it, and
   advances the pointer.

Steps 3–5 are fire-and-forget, so tests that trigger them must await a
macrotask (`await new Promise((r) => setTimeout(r, 0))`) before asserting.

## Conventions

- **Test names describe behavior**, not method names: "wraps to 0 at the end in
  playlist loop mode", not "test pointer setter 2".
- **Comments explain why the assertion matters**, especially when it pins
  surprising behavior.
- **Assert observable outcomes** (`played`, `pointer`, `items`) over internal
  flags where possible. Flags can be self-consistent while the queue is stuck.
- Import TS sources with a `.js` extension (`../src/queue/queue.js`) and JS
  modules with `.mjs`.

## Known pinned behavior (not desired behavior)

`queue.replay.test.ts` → "clears the retry budget once it is exhausted" pins
the **current** behavior: when the retry budget runs out, `replay()` calls
`skip()` with no argument, and `skip()` defaults to the current pointer, so the
queue does **not** advance. The track is retried forever.

This is a defect. The test exists so that fixing it produces a visible,
intentional failure rather than a silent change. When the fix lands, update
that test to assert the queue moves to the next item.
