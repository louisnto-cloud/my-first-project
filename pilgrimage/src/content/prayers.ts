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
    id: 'hail-mary',
    name: { en: 'The Hail Mary', vi: 'Kinh Kính Mừng', viStatus: 'verified' },
    en: [
      'Hail Mary, full of grace,',
      'the Lord is with thee.',
      'Blessed art thou among women,',
      'and blessed is the fruit of thy womb, Jesus.',
      'Holy Mary, Mother of God,',
      'pray for us sinners,',
      'now and at the hour of our death.',
      'Amen.',
    ],
    vi: [
      'Kính mừng Maria đầy ơn phúc,',
      'Đức Chúa Trời ở cùng Bà,',
      'Bà có phúc lạ hơn mọi người nữ,',
      'và Giêsu con lòng Bà gồm phúc lạ.',
      'Thánh Maria Đức Mẹ Chúa Trời,',
      'cầu cho chúng con là kẻ có tội,',
      'khi nay và trong giờ lâm tử.',
      'Amen.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'The first half is the angel’s own greeting to Mary, and her cousin Elizabeth’s. The second half simply asks her to pray for us — the way you might ask your mother. This is the prayer of the rosary you own.',
      vi: 'Nửa đầu là chính lời thiên thần chào Đức Mẹ Maria, và lời bà Êlisabét. Nửa sau chỉ đơn giản xin Mẹ cầu nguyện cho chúng ta — như con xin mẹ mình. Đây là lời kinh của chuỗi Mân Côi bạn đang có.',
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

PRAYERS.push(
  {
    id: 'apostles-creed',
    name: { en: 'The Apostles’ Creed', vi: 'Kinh Tin Kính', viStatus: 'verified' },
    en: [
      'I believe in God, the Father almighty, Creator of heaven and earth,',
      'and in Jesus Christ, his only Son, our Lord,',
      'who was conceived by the Holy Spirit, born of the Virgin Mary,',
      'suffered under Pontius Pilate, was crucified, died and was buried;',
      'he descended into hell; on the third day he rose again from the dead;',
      'he ascended into heaven, and is seated at the right hand of God the Father almighty;',
      'from there he will come to judge the living and the dead.',
      'I believe in the Holy Spirit, the holy catholic Church, the communion of saints,',
      'the forgiveness of sins, the resurrection of the body, and life everlasting.',
      'Amen.',
    ],
    vi: [
      'Tôi tin kính Đức Chúa Trời là Cha phép tắc vô cùng dựng nên trời đất.',
      'Tôi tin kính Đức Chúa Giêsu Kitô là Con Một Đức Chúa Cha cùng là Chúa chúng tôi;',
      'bởi phép Đức Chúa Thánh Thần mà Người xuống thai, sinh bởi Bà Maria đồng trinh:',
      'chịu nạn đời quan Phongxiô Philatô, chịu đóng đanh trên cây Thánh giá, chết và táng xác;',
      'xuống ngục tổ tông, ngày thứ ba bởi trong kẻ chết mà sống lại;',
      'lên trời ngự bên hữu Đức Chúa Cha phép tắc vô cùng;',
      'ngày sau bởi trời lại xuống phán xét kẻ sống và kẻ chết.',
      'Tôi tin kính Đức Chúa Thánh Thần. Tôi tin có Hội Thánh hằng có ở khắp thế này, các Thánh thông công.',
      'Tôi tin phép tha tội. Tôi tin xác loài người ngày sau sống lại. Tôi tin hằng sống vậy.',
      'Amen.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'The Church’s oldest summary of the whole faith, prayed at the start of the rosary. You have now met almost every line of it on this road.',
      vi: 'Bản tóm lược đức tin cổ xưa nhất của Giáo hội, được đọc ở đầu chuỗi Mân Côi. Trên con đường này, bạn đã gặp gần như từng dòng của kinh ấy.',
      viStatus: 'unverified',
    },
  },
  {
    id: 'hail-holy-queen',
    name: { en: 'Hail, Holy Queen', vi: 'Kinh Lạy Nữ Vương', viStatus: 'verified' },
    en: [
      'Hail, holy Queen, mother of mercy;',
      'our life, our sweetness, and our hope.',
      'To thee do we cry, poor banished children of Eve.',
      'To thee do we send up our sighs, mourning and weeping in this valley of tears.',
      'Turn then, most gracious advocate, thine eyes of mercy toward us,',
      'and after this our exile show unto us the blessed fruit of thy womb, Jesus.',
      'O clement, O loving, O sweet Virgin Mary.',
      'Amen.',
    ],
    vi: [
      'Lạy Nữ Vương, Mẹ nhân lành, làm cho chúng con được sống, được vui, được cậy.',
      'Thân lạy Mẹ, chúng con, con cháu Evà ở chốn khách đày, kêu đến cùng Bà;',
      'chúng con ở nơi khóc lóc than thở kêu khẩn Bà thương.',
      'Hỡi ôi! Bà là Chúa bầu chúng con, xin ghé mắt thương xem chúng con.',
      'Đến sau khỏi đày, xin cho chúng con được thấy Đức Chúa Giêsu, con lòng Bà gồm phúc lạ.',
      'Ôi khoan thay! Nhân thay! Dịu thay! Thánh Maria trọn đời đồng trinh.',
      'Amen.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'The prayer that closes the rosary — the Church saying goodnight to its mother, as it has for nine hundred years.',
      vi: 'Lời kinh khép lại chuỗi Mân Côi — Giáo hội chúc mẹ mình ngủ ngon, như đã làm suốt chín trăm năm.',
      viStatus: 'unverified',
    },
  },
);

PRAYERS.push({
  id: 'act-of-contrition',
  name: { en: 'An Act of Contrition', vi: 'Kinh Ăn Năn Tội', viStatus: 'verified' },
  en: [
    'My God, I am sorry for my sins with all my heart.',
    'In choosing to do wrong and failing to do good,',
    'I have sinned against you, whom I should love above all things.',
    'I firmly intend, with your help, to do penance,',
    'to sin no more, and to avoid whatever leads me to sin.',
    'Our Savior Jesus Christ suffered and died for us.',
    'In his name, my God, have mercy.',
    'Amen.',
  ],
  vi: [
    'Lạy Chúa con, Chúa là Đấng trọn tốt trọn lành vô cùng.',
    'Chúa đã dựng nên con, và cho Con Chúa ra đời chịu nạn chịu chết vì con,',
    'mà con đã cả lòng phản nghịch lỗi nghĩa cùng Chúa,',
    'thì con lo buồn đau đớn, cùng chê ghét mọi tội con trên hết mọi sự;',
    'con dốc lòng chừa cải, và nhờ ơn Chúa thì con sẽ lánh xa dịp tội,',
    'cùng làm việc đền tội cho xứng. Amen.',
  ],
  viStatus: 'unverified',
  about: {
    en: 'The prayer said at the end of confession. In plain words: I am sorry, I want to change, and I am asking for help. That is the whole of it.',
    vi: 'Lời kinh đọc cuối tòa giải tội. Nói đơn giản: con xin lỗi, con muốn đổi thay, và con xin Chúa giúp. Trọn vẹn chỉ có vậy.',
    viStatus: 'unverified',
  },
});

// ── The Divine Mercy chaplet's own prayers ───────────────────────────────────

PRAYERS.push(
  {
    id: 'eternal-father',
    name: { en: 'Eternal Father', vi: 'Kinh Lạy Cha Hằng Hữu', viStatus: 'verified' },
    en: [
      'Eternal Father, I offer you the Body and Blood,',
      'Soul and Divinity of your dearly beloved Son,',
      'our Lord Jesus Christ,',
      'in atonement for our sins and those of the whole world.',
    ],
    vi: [
      'Lạy Cha Hằng Hữu, con xin dâng lên Cha Mình và Máu,',
      'linh hồn và thần tính của Con rất yêu dấu Cha',
      'là Đức Giêsu Kitô, Chúa chúng con,',
      'để đền vì tội lỗi chúng con và toàn thế giới.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'Prayed on the large beads of the Divine Mercy chaplet, once before each decade.',
      vi: 'Đọc trên các hạt lớn của Chuỗi Lòng Chúa Thương Xót, một lần trước mỗi chục kinh.',
      viStatus: 'unverified',
    },
  },
  {
    id: 'sorrowful-passion',
    name: { en: 'For the Sake of His Sorrowful Passion', vi: 'Vì Cuộc Khổ Nạn Đau Thương', viStatus: 'verified' },
    en: [
      'For the sake of His sorrowful Passion,',
      'have mercy on us and on the whole world.',
    ],
    vi: [
      'Vì cuộc khổ nạn đau thương của Chúa Giêsu Kitô,',
      'xin Cha thương xót chúng con và toàn thế giới.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'The small-bead prayer of the Divine Mercy chaplet, repeated ten times in each decade — mercy asked, over and over, like waves.',
      vi: 'Lời kinh hạt nhỏ của Chuỗi Lòng Chúa Thương Xót, lặp lại mười lần mỗi chục — xin thương xót, lặp đi lặp lại, như những đợt sóng.',
      viStatus: 'unverified',
    },
  },
  {
    id: 'holy-god',
    name: { en: 'Holy God, Holy Mighty One', vi: 'Kinh Lạy Đấng Chí Thánh', viStatus: 'verified' },
    en: [
      'Holy God, Holy Mighty One, Holy Immortal One,',
      'have mercy on us and on the whole world.',
    ],
    vi: [
      'Lạy Đấng Chí Thánh, là Thiên Chúa Toàn Năng Hằng Hữu,',
      'xin thương xót chúng con và toàn thế giới.',
    ],
    viStatus: 'unverified',
    about: {
      en: 'The ancient Trisagion, prayed three times to close the Divine Mercy chaplet.',
      vi: 'Kinh Trisagion cổ kính, đọc ba lần để kết thúc Chuỗi Lòng Chúa Thương Xót.',
      viStatus: 'unverified',
    },
  },
);

export const prayerById = (id: string) => PRAYERS.find((p) => p.id === id);
