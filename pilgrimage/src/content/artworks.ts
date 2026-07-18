import type { Artwork } from './types';

// ─── Artwork registry ────────────────────────────────────────────────────────
// Each in-app scene is an original illuminated-style SVG drawn from the five
// palette tokens (see SacredArt). When network policy allows, real public-
// domain images from Wikimedia Commons can be dropped into /public/art and
// referenced via `src` — the credit lines below are ready for them.

export const ARTWORKS: Artwork[] = [
  {
    id: 'cathedral-hanoi',
    title: { en: "St. Joseph's Cathedral, Hanoi", vi: 'Nhà thờ Lớn Hà Nội', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, St. Joseph’s Cathedral, Hanoi.',
  },
  {
    id: 'cathedral-door',
    title: { en: 'The open door', vi: 'Cánh cửa mở', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'creation-light',
    title: { en: 'Let there be light', vi: 'Phải có ánh sáng', viStatus: 'unverified' },
    credit: 'Original scene. Future image: Wikimedia Commons, mosaic of Creation, Monreale.',
  },
  {
    id: 'creation-world',
    title: { en: 'The world, newly made', vi: 'Thế giới vừa được dựng nên', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'creation-people',
    title: { en: 'In his image', vi: 'Theo hình ảnh Ngài', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'prayer-night',
    title: { en: 'A prayer at night', vi: 'Lời cầu nguyện trong đêm', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'sky-flight',
    title: { en: 'Above the clouds', vi: 'Trên những tầng mây', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'teacher-hill',
    title: { en: 'The Teacher on the hillside', vi: 'Vị Thầy trên sườn đồi', viStatus: 'unverified' },
    credit: 'Original scene. Future image: Wikimedia Commons, Fra Angelico, Sermon on the Mount.',
  },
  {
    id: 'incense-altar',
    title: { en: 'Incense rising', vi: 'Khói hương bay lên', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'martyrs-palm',
    title: { en: 'The martyrs of Việt Nam', vi: 'Các Thánh tử đạo Việt Nam', viStatus: 'verified' },
    credit: 'Original scene. Future image: Wikimedia Commons, Vietnamese Martyrs icon.',
  },
  {
    id: 'candle-single',
    title: { en: 'One small flame', vi: 'Một ngọn nến nhỏ', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'lake-evening',
    title: { en: 'Evening by the lake', vi: 'Chiều bên hồ', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'cross-dawn',
    title: { en: 'The cross at dawn', vi: 'Thánh giá lúc bình minh', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'basilica-bruges',
    title: { en: 'Basilica of the Holy Blood, Bruges', vi: 'Vương cung thánh đường Máu Thánh, Bruges', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, Basilica of the Holy Blood.',
  },
  {
    id: 'eden-tree',
    title: { en: 'The garden and the tree', vi: 'Khu vườn và cái cây', viStatus: 'unverified' },
    credit: 'Original scene. Future image: Wikimedia Commons, mosaic of Eden.',
  },
  {
    id: 'prophet-night',
    title: { en: 'The long waiting', vi: 'Sự chờ đợi dài lâu', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'annunciation',
    title: { en: 'The Annunciation', vi: 'Truyền Tin', viStatus: 'verified' },
    credit: 'Original scene. Future image: Fra Angelico, The Annunciation (Wikimedia Commons).',
  },
  {
    id: 'nativity',
    title: { en: 'The Nativity', vi: 'Chúa Giáng Sinh', viStatus: 'verified' },
    credit: 'Original scene. Future image: Giotto, Nativity (Wikimedia Commons).',
  },
  {
    id: 'cana-jars',
    title: { en: 'The wedding at Cana', vi: 'Tiệc cưới Cana', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'prodigal-embrace',
    title: { en: 'The return of the prodigal son', vi: 'Người con hoang đàng trở về', viStatus: 'unverified' },
    credit: 'Original scene. Future image: Rembrandt, Return of the Prodigal Son (Wikimedia Commons).',
  },
  {
    id: 'samaritan-road',
    title: { en: 'The good Samaritan', vi: 'Người Samari nhân hậu', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'loaves-fishes',
    title: { en: 'Five loaves and two fish', vi: 'Năm chiếc bánh và hai con cá', viStatus: 'unverified' },
    credit: 'Original scene. Future image: early Christian mosaic, Tabgha (Wikimedia Commons).',
  },
  {
    id: 'storm-sea',
    title: { en: 'Walking on the water', vi: 'Đi trên mặt nước', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'palm-gate',
    title: { en: 'Palm Sunday', vi: 'Chúa nhật Lễ Lá', viStatus: 'verified' },
    credit: 'Original scene. Future image: Giotto, Entry into Jerusalem (Wikimedia Commons).',
  },
  {
    id: 'last-supper',
    title: { en: 'The Last Supper', vi: 'Bữa Tiệc Ly', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'gethsemane',
    title: { en: 'The garden of Gethsemane', vi: 'Vườn Cây Dầu', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'cross-passion',
    title: { en: 'The Cross', vi: 'Thánh giá', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'tomb-morning',
    title: { en: 'Easter morning', vi: 'Sáng Phục Sinh', viStatus: 'verified' },
    credit: 'Original scene. Future image: Fra Angelico, Resurrection fresco (Wikimedia Commons).',
  },
  {
    id: 'relic-blood',
    title: { en: 'The relic of the Holy Blood', vi: 'Thánh tích Máu Thánh', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'emmaus-road',
    title: { en: 'The road to Emmaus', vi: 'Đường Emmau', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'ascension',
    title: { en: 'The Ascension', vi: 'Chúa Lên Trời', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'notre-dame',
    title: { en: 'Notre-Dame de Paris', vi: 'Nhà thờ Đức Bà Paris', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, Notre-Dame de Paris west façade.',
  },
  {
    id: 'pentecost-fire',
    title: { en: 'Pentecost', vi: 'Lễ Chúa Thánh Thần Hiện Xuống', viStatus: 'verified' },
    credit: 'Original scene. Future image: Giotto, Pentecost (Wikimedia Commons).',
  },
  {
    id: 'keys-shepherd',
    title: { en: 'The keys and the crook', vi: 'Chìa khóa và gậy mục tử', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'bible-open',
    title: { en: 'The open book', vi: 'Cuốn sách mở', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'mass-altar',
    title: { en: 'The altar', vi: 'Bàn thờ', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'monstrance',
    title: { en: 'The Blessed Sacrament', vi: 'Thánh Thể Chúa', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'organ-pipes',
    title: { en: 'The great organ', vi: 'Đại phong cầm', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'visitation',
    title: { en: 'The Visitation', vi: 'Đức Mẹ thăm viếng', viStatus: 'verified' },
    credit: 'Original scene. Future image: Giotto, Visitation (Wikimedia Commons).',
  },
  {
    id: 'presentation-temple',
    title: { en: 'The Presentation in the Temple', vi: 'Dâng Chúa trong Đền Thánh', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'finding-temple',
    title: { en: 'The Finding in the Temple', vi: 'Tìm thấy Chúa trong Đền Thánh', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'brussels-cathedral',
    title: { en: 'Brussels Cathedral', vi: 'Nhà thờ chính tòa Brussels', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, Cathedral of St. Michael and St. Gudula.',
  },
  {
    id: 'font-water',
    title: { en: 'The baptismal font', vi: 'Giếng Rửa tội', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'white-garment',
    title: { en: 'The white garment and the candle', vi: 'Áo trắng và cây nến', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'confession-light',
    title: { en: 'The room of mercy', vi: 'Tòa giải tội', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'oil-hands',
    title: { en: 'Oil and hands', vi: 'Dầu thánh và đôi tay', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'wedding-rings',
    title: { en: 'The wedding', vi: 'Hôn lễ', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'parish-home',
    title: { en: 'Your parish', vi: 'Giáo xứ của bạn', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'commandments-tablets',
    title: { en: 'The ten words', vi: 'Mười điều răn', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'liturgical-wheel',
    title: { en: 'The living calendar', vi: 'Năm phụng vụ', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'heaven-light',
    title: { en: 'The hope of heaven', vi: 'Niềm hy vọng Thiên đàng', viStatus: 'unverified' },
    credit: 'Original scene.',
  },
  {
    id: 'asia-lanterns',
    title: { en: 'Saints of Asia', vi: 'Các Thánh Á châu', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'st-peters',
    title: { en: 'St. Peter’s Basilica', vi: 'Vương cung thánh đường Thánh Phêrô', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, St. Peter’s Basilica and square.',
  },
  {
    id: 'pieta',
    title: { en: 'The Pietà', vi: 'Tượng Đức Mẹ Sầu Bi', viStatus: 'verified' },
    credit: 'Original scene, after Michelangelo’s Pietà (1499).',
  },
  {
    id: 'sinai-bush',
    title: { en: 'The burning bush', vi: 'Bụi gai bốc cháy', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'sinai-mountain',
    title: { en: 'Mount Sinai', vi: 'Núi Sinai', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, St. Catherine’s Monastery, Sinai.',
  },
  {
    id: 'jerusalem-city',
    title: { en: 'Jerusalem', vi: 'Giêrusalem', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, the Old City of Jerusalem.',
  },
  {
    id: 'lourdes-grotto',
    title: { en: 'The grotto of Lourdes', vi: 'Hang đá Lộ Đức', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, the Grotto of Massabielle, Lourdes.',
  },
  {
    id: 'camino-way',
    title: { en: 'The Way', vi: 'Con đường Camino', viStatus: 'verified' },
    credit: 'Original scene.',
  },
  {
    id: 'santiago',
    title: { en: 'Santiago de Compostela', vi: 'Santiago de Compostela', viStatus: 'verified' },
    credit: 'Original scene. Future photo: Wikimedia Commons, Cathedral of Santiago de Compostela.',
  },
  { id: 'symbol-water', title: { en: 'Water', vi: 'Nước', viStatus: 'verified' }, credit: 'Original symbol.' },
  { id: 'symbol-light', title: { en: 'Light', vi: 'Ánh sáng', viStatus: 'verified' }, credit: 'Original symbol.' },
  { id: 'symbol-bread', title: { en: 'Bread', vi: 'Bánh', viStatus: 'verified' }, credit: 'Original symbol.' },
  { id: 'symbol-cross', title: { en: 'The Cross', vi: 'Thánh giá', viStatus: 'verified' }, credit: 'Original symbol.' },
  { id: 'symbol-incense', title: { en: 'Incense', vi: 'Hương', viStatus: 'verified' }, credit: 'Original symbol.' },
];

export const artworkById = (id: string) => ARTWORKS.find((a) => a.id === id);
