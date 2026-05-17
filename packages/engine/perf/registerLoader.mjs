// ─── Loader registration entry point ───
//
// Wires `workspaceLoader.mjs` into Node's module-resolution pipeline via
// the modern `module.register()` API (Node 20.6+). Avoids the
// `--experimental-loader` deprecation warning that the older
// `--loader=...` flag still emits in Node 24+.
//
// Wire-up: `node --import ./perf/registerLoader.mjs ...`

import { register } from 'node:module';

register('./workspaceLoader.mjs', import.meta.url);
