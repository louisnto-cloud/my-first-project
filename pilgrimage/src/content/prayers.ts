import type { Prayer } from './types';

// ─── Prayers ─────────────────────────────────────────────────────────────────
// Vietnamese texts are the actual traditional Vietnamese Catholic prayers as
// prayed in Vietnamese parishes — never fresh translations. They are marked
// 'unverified' so they appear in the native-review export until a native
// speaker confirms them word for word.

export const PRAYERS: Prayer[] = [
  {
    id: 'sign-of-the-cross',
    name: { en: 'The Sign of the Cross', vi: 'Dấu Thánh Giá', viStatus: 'verified' },
    en: ['In the name of the Father,', 'and of the Son,', 'and of the Holy Spirit.', 'Amen.'],
    vi: ['Nhân danh Cha,', 'và Con,', 'và Thánh Thần.', 'Amen.'],
    viStatus: 'unverified',
    about: {
      en: 'The smallest prayer and the first one. Catholics trace a cross over themselves — forehead, heart, shoulders — to begin and end every prayer.',
      vi: 'Lời cầu nguyện ngắn nhất và đầu tiên. Người Công giáo làm Dấu Thánh Giá trên mình — trán, ngực, hai vai — để bắt đầu và kết thúc mọi lời cầu nguyện.',
      viStatus: 'unverified',
    },
  },
  {
    id: 'our-father',
    name: { en: 'The Our Father', vi: 'Kinh Lạy Cha', viStatus: 'verified' },
    en: [
      'Our Father, who art in heaven,',
      'hallowed be thy name.',
      'Thy kingdom come,',
      'thy will be done on earth as it is in heaven.',
      'Give us this day our daily bread,',
      'and forgive us our trespasses,',
      'as we forgive those who trespass against us.',
      'And lead us not into temptation,',
      'but deliver us from evil.',
      'Amen.',
    ],
    vi: [
      'Lạy Cha chúng con ở trên trời,',
      'chúng con nguyện danh Cha cả sáng,',
      'nước Cha trị đến,',
      'ý Cha thể hiện dưới đất cũng như trên trời.',
      'Xin Cha cho chúng con hôm nay lương thực hằng ngày,',
      'và tha nợ chúng con',
      'như chúng con cũng tha kẻ có nợ chúng con.',
      'Xin chớ để chúng con sa chước cám dỗ,',
      'nhưng cứu chúng con cho khỏi sự dữ.',
      'Amen.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'The prayer Jesus himself taught his friends. Catholics everywhere pray it at every Mass. These exact words are prayed aloud together, so they are kept in their traditional form.',
      vi: 'Lời kinh chính Chúa Giêsu đã dạy các môn đệ. Người Công giáo khắp nơi đọc kinh này trong mỗi Thánh lễ.',
      viStatus: 'unverified',
    },
  },
  {
    id: 'glory-be',
    name: { en: 'The Glory Be', vi: 'Kinh Sáng Danh', viStatus: 'verified' },
    en: [
      'Glory be to the Father,',
      'and to the Son,',
      'and to the Holy Spirit.',
      'As it was in the beginning, is now,',
      'and ever shall be, world without end.',
      'Amen.',
    ],
    vi: [
      'Sáng danh Đức Chúa Cha,',
      'và Đức Chúa Con,',
      'và Đức Chúa Thánh Thần.',
      'Như đã có trước vô cùng,',
      'và bây giờ, và hằng có,',
      'và đời đời chẳng cùng. Amen.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'A short prayer of praise, like a deep bow in words. It is prayed at the end of each part of the Rosary.',
      vi: 'Một lời kinh ngợi khen ngắn, như một cái cúi đầu thật sâu bằng lời. Kinh này được đọc cuối mỗi chục Kinh Mân Côi.',
      viStatus: 'unverified',
    },
  },
];

export const prayerById = (id: string) => PRAYERS.find((p) => p.id === id);
