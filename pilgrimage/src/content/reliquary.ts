import type { ArtKind, L } from './types';

// ─── The Daily Reliquary ─────────────────────────────────────────────────────
// Once a day, a small golden reliquary opens: one surprise, ten seconds long.
// An artwork explained in two lines, a one-sentence saint, a tiny blessing.

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export interface ReliquaryItem {
  kind: 'art' | 'saint' | 'blessing' | 'verse';
  art?: ArtKind;
  title: L;
  text: L;
}

export const RELIQUARY: ReliquaryItem[] = [
  {
    kind: 'blessing',
    title: u('A blessing for travelers', 'Lời chúc lành cho người lữ hành'),
    text: u('May the road rise to meet you, and may God hold you in the palm of his hand.', 'Nguyện con đường nâng bước chân bạn, và nguyện Thiên Chúa gìn giữ bạn trong lòng bàn tay Ngài.'),
  },
  {
    kind: 'saint',
    title: u('St. Thérèse of Lisieux', 'Thánh Têrêsa thành Lisieux'),
    text: u('A young French nun who taught that doing small things with great love is a whole spirituality. She is a patron of missionaries — and of people who feel ordinary.', 'Một nữ tu trẻ người Pháp dạy rằng làm những việc nhỏ với tình yêu lớn cũng là cả một con đường thiêng liêng. Ngài là bổn mạng các nhà truyền giáo — và của những ai thấy mình bình thường.'),
  },
  {
    kind: 'art',
    art: 'creation-light',
    title: u('Gold on lapis', 'Vàng trên nền xanh thẳm'),
    text: u('Medieval painters ground real lapis lazuli stone for this blue — more expensive than gold. They saved it for heaven and for Mary’s cloak.', 'Các họa sĩ trung cổ nghiền đá lapis lazuli thật để có màu xanh này — đắt hơn cả vàng. Họ dành nó cho thiên đàng và cho áo choàng Đức Mẹ.'),
  },
  {
    kind: 'verse',
    title: u('Psalm 139', 'Thánh vịnh 139'),
    text: u('“If I fly to the far side of the sea, even there your hand will guide me.” — written for sailors, true for every traveler.', '“Dù con bay đến chân trời góc bể, tại đó tay Ngài vẫn dẫn dắt con.” — viết cho người đi biển, vẫn đúng cho tiếp viên hàng không.'),
  },
  {
    kind: 'saint',
    title: u('St. Anrê Dũng Lạc', 'Thánh Anrê Dũng Lạc'),
    text: u('From a poor family in northern Việt Nam, he changed his name to escape arrest, kept serving his people in secret, and gave his life in Hà Nội in 1839.', 'Sinh trong một gia đình nghèo miền Bắc Việt Nam, ngài đổi tên để tránh bị bắt, vẫn âm thầm phục vụ dân Chúa, và hiến mạng sống tại Hà Nội năm 1839.'),
  },
  {
    kind: 'blessing',
    title: u('Before sleep', 'Trước khi ngủ'),
    text: u('Tonight, name three small good things from today. Gratitude is the simplest prayer there is.', 'Tối nay, hãy kể tên ba điều tốt lành nhỏ bé của ngày hôm nay. Lòng biết ơn là lời cầu nguyện đơn sơ nhất.'),
  },
  {
    kind: 'art',
    art: 'symbol-light',
    title: u('Why candles?', 'Vì sao là nến?'),
    text: u('A candle gives light by giving itself away. That is the whole sermon. Christians have lit them beside prayers for two thousand years.', 'Ngọn nến cho ánh sáng bằng cách tự tiêu hao chính mình. Cả bài giảng nằm ở đó. Hai ngàn năm qua, người Kitô hữu vẫn thắp nến bên lời cầu nguyện.'),
  },
  {
    kind: 'verse',
    title: u('John 8:12', 'Gioan 8:12'),
    text: u('“I am the light of the world. Whoever follows me will never walk in darkness.” — like harbour lights guiding boats home at night.', '“Ta là ánh sáng thế gian. Ai theo Ta sẽ không phải đi trong bóng tối.” — như dãy đèn đường băng dẫn máy bay về nhà trong đêm.'),
  },
  {
    kind: 'saint',
    title: u('St. Joseph', 'Thánh Giuse'),
    text: u('The quiet carpenter who raised Jesus. Not one word of his is recorded — only his faithfulness. Thousands of churches around the world carry his name.', 'Bác thợ mộc thầm lặng đã nuôi dưỡng Chúa Giêsu. Không một lời nào của ngài được ghi lại — chỉ có lòng trung tín. Nhà thờ Lớn Hà Nội của bạn mang tên ngài.'),
  },
  {
    kind: 'blessing',
    title: u('For the people you love', 'Cho những người bạn thương'),
    text: u('Hold their faces in your mind for ten seconds. That is a prayer. He was listening before you finished.', 'Hãy giữ gương mặt họ trong tâm trí mười giây. Đó là một lời cầu nguyện. Ngài đã lắng nghe trước cả khi bạn kết thúc.'),
  },
  {
    kind: 'art',
    art: 'martyrs-palm',
    title: u('The palm branch', 'Cành lá vạn tuế'),
    text: u('In sacred art, a palm marks victory through love. 117 of them belong to Việt Nam.', 'Trong nghệ thuật thánh, cành vạn tuế là dấu chiến thắng bằng tình yêu. 117 cành thuộc về Việt Nam.'),
  },
  {
    kind: 'verse',
    title: u('Matthew 11:28', 'Mátthêu 11:28'),
    text: u('“Come to me, all you who are weary, and I will give you rest.” — for the weariness of the body, and of the soul.', '“Hãy đến với Ta, hỡi những ai mệt mỏi, Ta sẽ cho nghỉ ngơi.” — cho sự mệt mỏi của thân xác, và của tâm hồn.'),
  },
  {
    kind: 'saint',
    title: u('St. Cecilia', 'Thánh Cêcilia'),
    text: u('Patron saint of music — of every organ you have ever heard fill a cathedral. Musicians have honored her since the year 500.', 'Bổn mạng của âm nhạc — của mọi cây đàn organ bạn từng nghe vang trong nhà thờ. Giới nhạc sĩ tôn kính ngài từ năm 500.'),
  },
  {
    kind: 'blessing',
    title: u('A blessing for today', 'Lời chúc lành cho hôm nay'),
    text: u('May you notice one beautiful thing today, and may it remind you who made beauty possible.', 'Nguyện hôm nay bạn nhận ra một điều đẹp đẽ, và nguyện điều ấy nhắc bạn nhớ Đấng đã làm cho cái đẹp hiện hữu.'),
  },
];
