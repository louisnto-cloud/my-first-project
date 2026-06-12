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
    id: 'sin',
    term: 'sin',
    plain: {
      en: 'Choosing against love — turning away from God and from what is good.',
      vi: 'Chọn điều nghịch lại tình yêu — quay lưng với Thiên Chúa và với điều thiện.',
      viStatus: 'unverified',
    },
    vi: 'tội lỗi',
    viStatus: 'verified',
  },
  {
    id: 'mercy',
    term: 'mercy',
    plain: {
      en: 'Love that does not give up on you, even when you have done wrong.',
      vi: 'Tình yêu không bỏ rơi bạn, ngay cả khi bạn đã lầm lỗi.',
      viStatus: 'unverified',
    },
    vi: 'lòng thương xót',
    viStatus: 'verified',
  },
  {
    id: 'prophet',
    term: 'prophet',
    plain: {
      en: 'Someone God sent to speak for him, and to keep hope alive while the world waited.',
      vi: 'Người được Thiên Chúa sai đến để nói thay Ngài, và giữ cho niềm hy vọng sống mãi trong khi thế giới chờ đợi.',
      viStatus: 'unverified',
    },
    vi: 'ngôn sứ',
    viStatus: 'verified',
  },
  {
    id: 'parable',
    term: 'parable',
    plain: {
      en: 'A short story Jesus told that carries a deep truth inside it, like a seed.',
      vi: 'Một câu chuyện ngắn Chúa Giêsu kể, mang trong mình một sự thật sâu xa, như một hạt giống.',
      viStatus: 'unverified',
    },
    vi: 'dụ ngôn',
    viStatus: 'verified',
  },
  {
    id: 'miracle',
    term: 'miracle',
    plain: {
      en: 'A sign of God’s power and love that goes beyond what nature can do on its own.',
      vi: 'Dấu chỉ quyền năng và tình yêu của Thiên Chúa, vượt quá những gì tự nhiên có thể làm.',
      viStatus: 'unverified',
    },
    vi: 'phép lạ',
    viStatus: 'verified',
  },
  {
    id: 'relic',
    term: 'relic',
    plain: {
      en: 'Something physical kept from a saint or from the life of Jesus — held with honor, because love keeps what belonged to the beloved.',
      vi: 'Một vật thể được lưu giữ từ một vị thánh hoặc từ cuộc đời Chúa Giêsu — được tôn kính, vì tình yêu luôn giữ lại những gì thuộc về người mình yêu.',
      viStatus: 'unverified',
    },
    vi: 'thánh tích',
    viStatus: 'verified',
  },
  {
    id: 'resurrection',
    term: 'Resurrection',
    plain: {
      en: 'Jesus truly rising from death to a new life that can never die again — the center of all Christian hope.',
      vi: 'Chúa Giêsu thật sự sống lại từ cõi chết, bước vào sự sống mới không bao giờ chết nữa — trung tâm của mọi niềm hy vọng Kitô giáo.',
      viStatus: 'unverified',
    },
    vi: 'sự Phục Sinh',
    viStatus: 'verified',
  },
  {
    id: 'eucharist',
    term: 'Eucharist',
    plain: {
      en: 'The bread and wine that truly become the Body and Blood of Jesus at Mass — his closest gift.',
      vi: 'Bánh và rượu thật sự trở nên Mình và Máu Chúa Giêsu trong Thánh lễ — món quà gần gũi nhất của Ngài.',
      viStatus: 'unverified',
    },
    vi: 'Thánh Thể',
    viStatus: 'verified',
  },
  {
    id: 'catholic',
    term: 'catholic',
    plain: {
      en: 'A Greek word meaning “universal” — for everyone, everywhere, in every language.',
      vi: 'Một từ gốc Hy Lạp nghĩa là “phổ quát” — cho mọi người, mọi nơi, trong mọi ngôn ngữ.',
      viStatus: 'unverified',
    },
    vi: 'công giáo',
    viStatus: 'verified',
  },
  {
    id: 'liturgy',
    term: 'liturgy',
    plain: {
      en: 'The Church’s public prayer together — the Mass above all — with its words, music, and movements.',
      vi: 'Lời cầu nguyện chung và công khai của Giáo hội — trên hết là Thánh lễ — với lời kinh, âm nhạc và cử chỉ.',
      viStatus: 'unverified',
    },
    vi: 'phụng vụ',
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
