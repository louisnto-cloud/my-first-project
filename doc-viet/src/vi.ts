// Vietnamese text utilities: diacritics, tone marks, and answer comparison.

/** The five tone marks (plus ngang = no mark). Index 0 = ngang. */
export const TONES = [
  { id: 'ngang', mark: '', label: 'ngang', example: 'ma' },
  { id: 'huyen', mark: '̀', label: 'huyền ( ` )', example: 'mà' },
  { id: 'sac', mark: '́', label: 'sắc ( ´ )', example: 'má' },
  { id: 'hoi', mark: '̉', label: 'hỏi ( ̉ )', example: 'mả' },
  { id: 'nga', mark: '̃', label: 'ngã ( ~ )', example: 'mã' },
  { id: 'nang', mark: '̣', label: 'nặng ( . )', example: 'mạ' },
] as const;

// Precomposed tone table: base vowel → [ngang, huyền, sắc, hỏi, ngã, nặng]
const TONE_TABLE: Record<string, string[]> = {
  a: ['a', 'à', 'á', 'ả', 'ã', 'ạ'],
  ă: ['ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ'],
  â: ['â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ'],
  e: ['e', 'è', 'é', 'ẻ', 'ẽ', 'ẹ'],
  ê: ['ê', 'ề', 'ế', 'ể', 'ễ', 'ệ'],
  i: ['i', 'ì', 'í', 'ỉ', 'ĩ', 'ị'],
  o: ['o', 'ò', 'ó', 'ỏ', 'õ', 'ọ'],
  ô: ['ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ'],
  ơ: ['ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ'],
  u: ['u', 'ù', 'ú', 'ủ', 'ũ', 'ụ'],
  ư: ['ư', 'ừ', 'ứ', 'ử', 'ữ', 'ự'],
  y: ['y', 'ỳ', 'ý', 'ỷ', 'ỹ', 'ỵ'],
};

// toned character → { base vowel, tone index }
const TONED_LOOKUP: Record<string, { base: string; tone: number }> = {};
for (const [base, forms] of Object.entries(TONE_TABLE)) {
  forms.forEach((ch, tone) => {
    TONED_LOOKUP[ch] = { base, tone };
    TONED_LOOKUP[ch.toUpperCase()] = { base, tone };
  });
}

/** Letters the learner can't type on an English keyboard (besides tone marks). */
export const SPECIAL_LETTERS = ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư'] as const;

/**
 * Apply a tone mark (0 = remove) to the LAST vowel of the text.
 * "ma" + sắc → "má" · "mắ" + huyền → "mằ" (tone replaced, hat kept).
 */
export function applyToneToLastVowel(text: string, toneIndex: number): string {
  const chars = [...text.normalize('NFC')];
  for (let i = chars.length - 1; i >= 0; i--) {
    const info = TONED_LOOKUP[chars[i]];
    if (!info) continue;
    const upper = chars[i] !== chars[i].toLowerCase();
    const next = TONE_TABLE[info.base][toneIndex];
    chars[i] = upper ? next.toUpperCase() : next;
    return chars.join('');
  }
  return text; // no vowel to mark
}

/** Strip all Vietnamese diacritics (tones AND letter hats; đ → d). */
export function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/** Case-insensitive exact comparison, diacritics required. */
export function viEquals(a: string, b: string): boolean {
  return a.trim().normalize('NFC').toLowerCase() === b.trim().normalize('NFC').toLowerCase();
}

/** True when the answer would match if diacritics were ignored — "close! check your tone marks". */
export function viCloseMatch(typed: string, answer: string): boolean {
  if (viEquals(typed, answer)) return false;
  return stripDiacritics(typed.trim().toLowerCase()) === stripDiacritics(answer.trim().toLowerCase());
}

/** Does the text contain any Vietnamese diacritic (tone mark, hat, or đ)? */
export function hasDiacritics(text: string): boolean {
  return text.normalize('NFC') !== stripDiacritics(text.normalize('NFC'));
}
