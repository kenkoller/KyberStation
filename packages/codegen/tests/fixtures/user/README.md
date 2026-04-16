# User-Provided Fixtures

Drop real ProffieOS configs or style snippets here to exercise the round-trip
suite against your actual files.

## How it works

- Any `.cpp` file in this folder is picked up by the round-trip tests (wiring
  added in a later phase of the sprint).
- A sibling `.json` is optional — if present, it is the "expected"
  `BladeConfig` the reconstructor should recover.
- A `.cpp` without a `.json` only asserts that parsing succeeds and the
  emitted round-trip produces identical-or-equivalent code; it cannot verify
  the reconstructed config fields.

## Privacy

Files here are local to your checkout. Because this folder is tracked only
via its README + `.gitkeep`, you can safely paste in anything you want to
test without worrying about committing it — but **do your own sanity check
before `git add`** so nothing sensitive lands in a commit.
