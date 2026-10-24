/* Area analysis worker (module worker): runs analyseWithMasks() from analyze-score.js off the main thread.
   Message in: { id, input } (see analyse). Out: { id, res } with the score arrays transferred, or { id, err }. */
import { analyseWithMasks } from './analyze-score.js';

self.onmessage = (ev) => {
  const { id, input } = ev.data, t0 = performance.now();
  try {
    const res = analyseWithMasks(input);
    res.ms = performance.now() - t0;
    self.postMessage({ id, res }, Object.values(res.blocks).map((b) => b.pct.buffer));
  } catch (err) { self.postMessage({ id, err: String((err && err.stack) || err) }); }
};
