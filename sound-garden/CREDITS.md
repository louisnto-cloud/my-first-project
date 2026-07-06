# Sound Garden — audio credits

All built-in speech in `assets/` comes from **one voice**: the CMU ARCTIC
"SLT" American English speaker (a real recorded voice from Carnegie Mellon's
free ARCTIC corpus), synthesized at 32 kHz with the
[Festival](https://www.cstr.ed.ac.uk/projects/festival/) HTS voice
`festvox-us-slt-hts` (free festvox licence).

- Sentences and words are spoken naturally by the voice.
- Held letter sounds (sss, aaa, mmm, and the rest of the holdable alphabet)
  are carved out of that same speaker's recorded words using Festival's
  phoneme timings, then extended seamlessly so a child can hear them stretch.
- Short sounds (stops like t/p/k/d/b/g, the sh/ch/th/ck digraphs, and blends
  like x and qu) are similarly carved from her own words, trimmed to a
  natural burst rather than stretched.
- Every word in the game — all 95 of them, across the full alphabet — is
  this same speaker saying the real word, with the same final-consonant
  clean-up applied throughout so words like "cap" or "sock" end audibly
  instead of trailing off silently.

All other art and sound effects are original to this project (inline SVG and
Web Audio synthesis).
