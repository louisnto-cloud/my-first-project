/*
 * data.js — Structured curriculum + content data (JSON-shaped).
 *
 * This is the single source of truth for WHAT the app teaches. It is pure,
 * declarative data: no logic lives here. The engine (engine.js) reads these
 * declarations and turns each `template` into an errorless match-to-sample
 * question with randomised values.
 *
 * DESIGN RULES ENCODED HERE:
 *  - Every step is one link in a strictly linear chain (unlocks in order).
 *  - Every step names a `template` (the question type) + `params` (the range
 *    of content). New content, never new structure.
 *  - Instruction phrases are NOT stored per-step. They live in ENGINE, keyed
 *    by template, so the wording for a task type is byte-for-byte identical
 *    every single time. Autistic children rely on identical phrasing.
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};

  /* ------------------------------------------------------------------ *
   * Content pools — the raw items templates draw from.                  *
   * ------------------------------------------------------------------ */

  // Concrete, one-subject pictures for matching / counting / word cues.
  var PICTURES = ['tao', 'ca', 'meo', 'cho', 'hoa', 'xe', 'sao', 'bong', 'la', 'vit', 'chim', 'buom', 'ga', 'bo'];

  // Objects safe to arrange in a neat counting line (small, uniform).
  var COUNTABLES = ['tao', 'ca', 'hoa', 'sao', 'bong', 'la', 'buom', 'vit'];

  // Flat shapes (each has a filled form and an outline form via CSS).
  var SHAPES = ['tron', 'vuong', 'tamgiac', 'ngoisao', 'chunhat'];

  // Vietnamese letters, grouped so matching starts visually-distinct and
  // widens gradually to include the diacritic vowels and Đ.
  var LETTERS_BASIC = ['A', 'O', 'M', 'T'];
  var LETTERS_MORE = ['B', 'C', 'E', 'H', 'I', 'K', 'L', 'N', 'U', 'V', 'X'];
  var LETTERS_DIACRITIC = ['Ă', 'Â', 'Đ', 'Ê', 'Ô', 'Ơ', 'Ư'];

  // Letter → picture cue (a Vietnamese word beginning with that letter that
  // we have an illustration for). Used so letter-sound work stays doable in
  // total silence: the letter itself is always shown to match.
  var LETTER_CUE = { C: 'ca', M: 'meo', H: 'hoa', X: 'xe', B: 'bong', G: 'ga', V: 'vit', L: 'la' };

  // High-frequency simple syllables. Those with a `icon` also carry a picture.
  var SYLLABLES = [
    { text: 'ba' }, { text: 'mẹ' }, { text: 'bà' }, { text: 'bé' },
    { text: 'cá', icon: 'ca' }, { text: 'gà', icon: 'ga' },
    { text: 'bò', icon: 'bo' }, { text: 'mèo', icon: 'meo' }
  ];

  // Concrete nouns the child can see, for first words.
  var WORDS = [
    { text: 'mèo', icon: 'meo' }, { text: 'chó', icon: 'cho' },
    { text: 'cá', icon: 'ca' }, { text: 'hoa', icon: 'hoa' },
    { text: 'xe', icon: 'xe' }, { text: 'gà', icon: 'ga' }
  ];

  /* ------------------------------------------------------------------ *
   * The two skill chains. Each entry is one linear, unlockable step.    *
   * `template` is interpreted by the engine. `icon` is shown in the      *
   * First→Then strip as the "task now" picture.                          *
   * ------------------------------------------------------------------ */

  var NUMBERS = [
    // Phase 1 — matching foundations
    { id: 'n-match-pic', title: 'Ghép hình', icon: 'tao', template: 'match-picture', params: { pool: PICTURES } },
    { id: 'n-match-num-3', title: 'Ghép số 1–3', icon: 'num3', template: 'match-numeral', params: { min: 1, max: 3 } },
    { id: 'n-match-num-5', title: 'Ghép số 1–5', icon: 'num5', template: 'match-numeral', params: { min: 1, max: 5 } },
    // Phase 2 — counting
    { id: 'n-count-3', title: 'Đếm đến 3', icon: 'num3', template: 'count-objects', params: { min: 1, max: 3, pool: COUNTABLES } },
    { id: 'n-count-5', title: 'Đếm đến 5', icon: 'num5', template: 'count-objects', params: { min: 1, max: 5, pool: COUNTABLES } },
    { id: 'n-count-10', title: 'Đếm đến 10', icon: 'num10', template: 'count-objects', params: { min: 1, max: 10, pool: COUNTABLES } },
    // Phase 3 — quantity
    { id: 'n-more', title: 'Nhiều hơn', icon: 'more', template: 'compare-quantity', params: { mode: 'more', pool: COUNTABLES } },
    { id: 'n-fewer', title: 'Ít hơn', icon: 'fewer', template: 'compare-quantity', params: { mode: 'fewer', pool: COUNTABLES } },
    // Phase 4 — shapes
    { id: 'n-match-shape', title: 'Ghép hình khối', icon: 'tron', template: 'match-shape', params: { pool: SHAPES } },
    { id: 'n-shape-outline', title: 'Hình và bóng', icon: 'vuong', template: 'shape-to-outline', params: { pool: SHAPES } },
    // Phase 5 — early operations
    { id: 'n-one-more', title: 'Thêm một', icon: 'plus1', template: 'one-more', params: { max: 5, pool: COUNTABLES } },
    { id: 'n-combine', title: 'Gộp lại', icon: 'plus1', template: 'combine-groups', params: { max: 5, pool: COUNTABLES } },
    // Phase 6 — ordering
    { id: 'n-next-5', title: 'Số tiếp theo 1–5', icon: 'num5', template: 'next-number', params: { min: 1, max: 5 } },
    { id: 'n-next-10', title: 'Số tiếp theo 1–10', icon: 'num10', template: 'next-number', params: { min: 1, max: 10 } },
    { id: 'n-missing', title: 'Số còn thiếu', icon: 'num10', template: 'missing-number', params: { min: 1, max: 10 } }
  ];

  var LETTERS = [
    // Phase 1 — matching foundations
    { id: 'l-match-pic', title: 'Ghép hình', icon: 'meo', template: 'match-picture', params: { pool: PICTURES } },
    { id: 'l-match-basic', title: 'Ghép chữ A O M T', icon: 'letterA', template: 'match-letter', params: { set: LETTERS_BASIC } },
    { id: 'l-match-more', title: 'Ghép nhiều chữ', icon: 'letterA', template: 'match-letter', params: { set: LETTERS_BASIC.concat(LETTERS_MORE) } },
    { id: 'l-match-dia', title: 'Chữ có dấu', icon: 'letterA', template: 'match-letter', params: { set: LETTERS_BASIC.concat(LETTERS_MORE, LETTERS_DIACRITIC) } },
    // Phase 2 — discrimination
    { id: 'l-find-named', title: 'Tìm chữ', icon: 'ear', template: 'find-named-letter', params: { set: LETTERS_BASIC.concat(LETTERS_MORE) } },
    { id: 'l-case', title: 'Chữ hoa – chữ thường', icon: 'letterA', template: 'match-case', params: { set: LETTERS_BASIC.concat(LETTERS_MORE) } },
    // Phase 3 — letter to sound (audio-supported, picture-cued)
    { id: 'l-sound', title: 'Nghe và ghép chữ', icon: 'ear', template: 'letter-sound', params: { set: Object.keys(LETTER_CUE), cues: LETTER_CUE } },
    // Phase 4 — syllables
    { id: 'l-match-syllable', title: 'Ghép tiếng', icon: 'letterA', template: 'match-syllable', params: { pool: SYLLABLES } },
    { id: 'l-syllable-pic', title: 'Tiếng và hình', icon: 'meo', template: 'word-to-picture', params: { pool: SYLLABLES.filter(function (s) { return s.icon; }) } },
    // Phase 5 — first words
    { id: 'l-match-word', title: 'Ghép từ', icon: 'letterA', template: 'match-word', params: { pool: WORDS } },
    { id: 'l-word-pic', title: 'Từ và hình', icon: 'meo', template: 'word-to-picture', params: { pool: WORDS } }
  ];

  /* ------------------------------------------------------------------ *
   * Sticker animals — the calm reward collection.                       *
   * ------------------------------------------------------------------ */
  var STICKERS = [
    { key: 'meo', name: 'Mèo' }, { key: 'cho', name: 'Chó' },
    { key: 'ca', name: 'Cá' }, { key: 'vit', name: 'Vịt' },
    { key: 'chim', name: 'Chim' }, { key: 'buom', name: 'Bướm' },
    { key: 'rua', name: 'Rùa' }, { key: 'ga', name: 'Gà' },
    { key: 'bo', name: 'Bò' }, { key: 'tho', name: 'Thỏ' },
    { key: 'gau', name: 'Gấu' }, { key: 'cao', name: 'Cáo' }
  ];

  VLA.data = {
    paths: {
      numbers: { id: 'numbers', label: 'Số', icon: 'num5', steps: NUMBERS },
      letters: { id: 'letters', label: 'Chữ cái', icon: 'letterA', steps: LETTERS }
    },
    pathOrder: ['numbers', 'letters'],
    stickers: STICKERS
  };
})();
