import type { GlossaryEntry } from './types';

// ─── Glossary: hard words, plain meanings, Vietnamese hints ─────────────────
// Any difficult word in story text can be wrapped as {{id}} and becomes a
// soft-underlined term: tap for one plain sentence plus the Vietnamese.

export const GLOSSARY: GlossaryEntry[] = [
  {
    id: 'creator',
    term: 'Creator',
    plain: {
      en: 'The one who made everything that exists.',
      vi: 'Đấng đã dựng nên mọi sự đang hiện hữu.',
      viStatus: 'unverified',
    },
    vi: 'Đấng Tạo Hóa',
    viStatus: 'verified',
  },
  {
    id: 'prayer',
    term: 'prayer',
    plain: {
      en: 'Talking with God, the way you talk with someone who loves you.',
      vi: 'Trò chuyện với Thiên Chúa, như trò chuyện với người thương mình.',
      viStatus: 'unverified',
    },
    vi: 'cầu nguyện',
    viStatus: 'verified',
  },
  {
    id: 'grace',
    term: 'grace',
    plain: {
      en: "God's own life and help, given to us as a free gift.",
      vi: 'Sự sống và sự trợ giúp của Thiên Chúa, được ban cho chúng ta như một món quà.',
      viStatus: 'unverified',
    },
    vi: 'Ơn Chúa',
    viStatus: 'verified',
  },
  {
    id: 'saints',
    term: 'saints',
    plain: {
      en: 'People who lived close to God and are now alive with him in heaven.',
      vi: 'Những người đã sống gần Thiên Chúa và nay đang sống với Ngài trên Thiên đàng.',
      viStatus: 'unverified',
    },
    vi: 'Các Thánh',
    viStatus: 'verified',
  },
  {
    id: 'communion-of-saints',
    term: 'communion of saints',
    plain: {
      en: 'The living family of all who belong to God — on earth and in heaven — still connected, still caring for one another.',
      vi: 'Gia đình của tất cả những ai thuộc về Thiên Chúa — ở trần gian và trên Thiên đàng — vẫn liên kết và yêu thương nhau.',
      viStatus: 'unverified',
    },
    vi: 'Các Thánh thông công',
    viStatus: 'verified',
  },
  {
    id: 'venerate',
    term: 'venerate',
    plain: {
      en: 'To honor someone deeply — the way you bow before your ancestors. It is honor, not worship.',
      vi: 'Tôn kính một người cách sâu xa — như khi ta cúi mình trước tổ tiên. Là tôn kính, không phải thờ phượng.',
      viStatus: 'unverified',
    },
    vi: 'tôn kính',
    viStatus: 'verified',
  },
  {
    id: 'martyr',
    term: 'martyr',
    plain: {
      en: 'Someone who loved God so much they gave their life rather than give him up.',
      vi: 'Người yêu mến Thiên Chúa đến nỗi thà hy sinh mạng sống chứ không chối bỏ Ngài.',
      viStatus: 'unverified',
    },
    vi: 'thánh tử đạo',
    viStatus: 'verified',
  },
  {
    id: 'gospel',
    term: 'Gospel',
    plain: {
      en: 'The good news of Jesus — the story of his life, told in the Bible.',
      vi: 'Tin vui về Chúa Giêsu — câu chuyện cuộc đời Ngài trong Kinh Thánh.',
      viStatus: 'unverified',
    },
    vi: 'Tin Mừng',
    viStatus: 'verified',
  },
  {
    id: 'cathedral',
    term: 'cathedral',
    plain: {
      en: "The mother church of a whole region, where the bishop's chair stands.",
      vi: 'Nhà thờ mẹ của cả một vùng, nơi đặt ngai tòa của giám mục.',
      viStatus: 'unverified',
    },
    vi: 'nhà thờ chính tòa',
    viStatus: 'verified',
  },
];

export const glossaryById = (id: string) => GLOSSARY.find((g) => g.id === id);
