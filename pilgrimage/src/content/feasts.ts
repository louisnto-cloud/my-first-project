import type { L } from './types';

// ─── Feasts and saints of the day ────────────────────────────────────────────
// A small calendar of the great feasts and the most-loved saints. Not the full
// Roman Martyrology — just the days a beginner will actually meet, each with a
// one-line note in the app's voice. Keyed "M-D" (month 1–12, day 1–31).

const u = (en: string, vi: string): L => ({ en, vi, viStatus: 'unverified' });

export interface Feast {
  name: L;
  note: L;
}

export const FEASTS: Record<string, Feast> = {
  '1-1': {
    name: u('Mary, Mother of God', 'Đức Maria, Mẹ Thiên Chúa'),
    note: u('The year opens under her mantle.', 'Năm mới mở ra dưới tà áo Mẹ.'),
  },
  '1-25': {
    name: u('The Conversion of St. Paul', 'Thánh Phaolô trở lại'),
    note: u('A persecutor knocked to the ground becomes the apostle of the world.', 'Kẻ bách hại bị quật ngã trở thành tông đồ của muôn dân.'),
  },
  '2-2': {
    name: u('The Presentation of the Lord', 'Dâng Chúa Giêsu trong Đền Thánh'),
    note: u('Candles are blessed today — the Light is carried into the temple.', 'Hôm nay làm phép nến — Ánh Sáng được đưa vào đền thờ.'),
  },
  '2-11': {
    name: u('Our Lady of Lourdes', 'Đức Mẹ Lộ Đức'),
    note: u('A spring in a grotto, and the sick made welcome.', 'Dòng suối nơi hang đá, và người bệnh được chào đón.'),
  },
  '3-19': {
    name: u('St. Joseph', 'Thánh Giuse'),
    note: u('The quiet man who kept the Holy Family safe. Patron of Vietnam.', 'Người thầm lặng gìn giữ Thánh Gia. Bổn mạng Giáo hội Việt Nam.'),
  },
  '3-25': {
    name: u('The Annunciation', 'Lễ Truyền Tin'),
    note: u('Nine months before Christmas, Mary says yes.', 'Chín tháng trước Giáng Sinh, Mẹ Maria thưa xin vâng.'),
  },
  '4-29': {
    name: u('St. Catherine of Siena', 'Thánh Catarina Siêna'),
    note: u('"Be who God meant you to be and you will set the world on fire."', '"Hãy là người Thiên Chúa muốn bạn trở thành, và bạn sẽ đốt cháy cả thế giới."'),
  },
  '5-1': {
    name: u('St. Joseph the Worker', 'Thánh Giuse Thợ'),
    note: u('Ordinary work, done with love, is holy.', 'Công việc bình thường, làm với tình yêu, là thánh thiện.'),
  },
  '5-13': {
    name: u('Our Lady of Fatima', 'Đức Mẹ Fatima'),
    note: u('She asked three shepherd children for prayer and penance.', 'Mẹ xin ba trẻ mục đồng cầu nguyện và hy sinh.'),
  },
  '5-31': {
    name: u('The Visitation', 'Đức Mẹ thăm viếng'),
    note: u('Mary hurries through the hills — joy travels.', 'Mẹ Maria vội vã băng đồi — niềm vui biết lên đường.'),
  },
  '6-13': {
    name: u('St. Anthony of Padua', 'Thánh Antôn Pađua'),
    note: u('Finder of the lost — things, and people.', 'Vị thánh tìm lại những gì đã mất — đồ vật, và cả con người.'),
  },
  '6-24': {
    name: u('The Nativity of St. John the Baptist', 'Sinh nhật Thánh Gioan Tẩy Giả'),
    note: u('The voice crying in the wilderness is born.', 'Tiếng hô trong hoang địa chào đời.'),
  },
  '6-29': {
    name: u('Sts. Peter and Paul', 'Thánh Phêrô và Thánh Phaolô'),
    note: u('The fisherman and the scholar, pillars of the same Church.', 'Người đánh cá và nhà thông thái, hai cột trụ của cùng một Hội Thánh.'),
  },
  '7-11': {
    name: u('St. Benedict', 'Thánh Biển Đức'),
    note: u('Father of Western monasticism: ora et labora — pray and work.', 'Tổ phụ đan tu Tây phương: ora et labora — cầu nguyện và lao động.'),
  },
  '7-16': {
    name: u('Our Lady of Mount Carmel', 'Đức Mẹ Núi Cát Minh'),
    note: u('The mountain of the prophets, and the brown scapular.', 'Ngọn núi của các ngôn sứ, và áo Đức Bà màu nâu.'),
  },
  '7-22': {
    name: u('St. Mary Magdalene', 'Thánh Maria Mađalêna'),
    note: u('First witness of the Resurrection — apostle to the apostles.', 'Chứng nhân đầu tiên của Phục Sinh — tông đồ của các tông đồ.'),
  },
  '7-26': {
    name: u('Sts. Joachim and Anne', 'Thánh Gioakim và Thánh Anna'),
    note: u('The grandparents of Jesus. Grandparents matter.', 'Ông bà ngoại của Chúa Giêsu. Ông bà thật quý giá.'),
  },
  '8-6': {
    name: u('The Transfiguration', 'Chúa Hiển Dung'),
    note: u('On the mountain, for a moment, the veil lifts.', 'Trên núi, trong một khoảnh khắc, bức màn được vén lên.'),
  },
  '8-15': {
    name: u('The Assumption of Mary', 'Đức Mẹ Hồn Xác Lên Trời'),
    note: u('Where she has gone, we hope to follow.', 'Nơi Mẹ đã đến, chúng ta hy vọng sẽ theo sau.'),
  },
  '8-28': {
    name: u('St. Augustine', 'Thánh Âutinh'),
    note: u('"Our hearts are restless until they rest in you."', '"Tâm hồn chúng con khắc khoải cho đến khi được nghỉ yên trong Chúa."'),
  },
  '9-8': {
    name: u('The Nativity of Mary', 'Sinh nhật Đức Mẹ'),
    note: u('The birthday of the mother of the Redeemer.', 'Ngày sinh của Mẹ Đấng Cứu Thế.'),
  },
  '9-29': {
    name: u('Sts. Michael, Gabriel, and Raphael', 'Các Tổng lãnh Thiên thần Micae, Gáprien, Raphaen'),
    note: u('The archangels: defender, messenger, healer.', 'Các Tổng lãnh Thiên thần: đấng bảo vệ, sứ giả, đấng chữa lành.'),
  },
  '10-1': {
    name: u('St. Thérèse of Lisieux', 'Thánh Têrêsa Hài Đồng Giêsu'),
    note: u('The little way: small things, done with great love.', 'Con đường thơ ấu: những việc nhỏ, làm với tình yêu lớn.'),
  },
  '10-4': {
    name: u('St. Francis of Assisi', 'Thánh Phanxicô Assisi'),
    note: u('He owned nothing and called the sun his brother.', 'Người không có gì và gọi mặt trời là anh.'),
  },
  '10-7': {
    name: u('Our Lady of the Rosary', 'Đức Mẹ Mân Côi'),
    note: u('A good day to pray one decade, slowly.', 'Một ngày đẹp để lần một chục kinh, thật chậm rãi.'),
  },
  '11-1': {
    name: u('All Saints', 'Lễ Các Thánh'),
    note: u('The whole family of heaven, known and unknown.', 'Cả gia đình thiên quốc, hữu danh và vô danh.'),
  },
  '11-2': {
    name: u('All Souls', 'Lễ Các Đẳng Linh Hồn'),
    note: u('We remember our dead, and pray them home.', 'Chúng ta tưởng nhớ người đã khuất, và cầu nguyện cho họ về quê trời.'),
  },
  '11-24': {
    name: u('The Vietnamese Martyrs', 'Các Thánh Tử đạo Việt Nam'),
    note: u('117 canonized martyrs of Vietnam — and the hundred thousand beside them.', '117 vị thánh tử đạo Việt Nam — và hàng trăm ngàn chứng nhân bên cạnh các ngài.'),
  },
  '12-8': {
    name: u('The Immaculate Conception', 'Đức Mẹ Vô Nhiễm Nguyên Tội'),
    note: u('Mary, preserved from sin from the first moment, full of grace.', 'Mẹ Maria, được gìn giữ khỏi tội từ giây phút đầu tiên, đầy ơn phúc.'),
  },
  '12-25': {
    name: u('The Nativity of the Lord', 'Chúa Giáng Sinh'),
    note: u('The light has come. Merry Christmas.', 'Ánh sáng đã đến. Mừng Chúa Giáng Sinh.'),
  },
};

/** The feast for a given date, if the small calendar has one. */
export function feastOf(today = new Date()): Feast | null {
  return FEASTS[`${today.getMonth() + 1}-${today.getDate()}`] ?? null;
}
