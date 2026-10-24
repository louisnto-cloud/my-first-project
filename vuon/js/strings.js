/*
 * strings.js — Every word of Vietnamese interface text, in one place.
 *
 * Instruction strings live under INSTRUCTIONS keyed by template. Each task
 * type has EXACTLY ONE phrase. It is never paraphrased. Autistic learners
 * depend on identical wording, so changing any of these strings should be a
 * deliberate act, not a style choice.
 */
(function () {
  'use strict';
  window.VLA = window.VLA || {};

  VLA.strings = {
    // App
    appName: 'Khu Vườn Nhỏ',

    // Fixed task instructions, one per template — never varied.
    instructions: {
      'match-picture': 'Chạm vào hình giống nhau',
      'match-numeral': 'Chạm vào số giống nhau',
      'count-objects': 'Đếm rồi chạm vào số đúng',
      'compare-quantity-more': 'Chạm vào nhóm nhiều hơn',
      'compare-quantity-fewer': 'Chạm vào nhóm ít hơn',
      'match-shape': 'Chạm vào hình giống nhau',
      'shape-to-outline': 'Chạm vào hình vừa khít',
      'one-more': 'Thêm một. Có bao nhiêu?',
      'combine-groups': 'Có bao nhiêu tất cả?',
      'next-number': 'Chạm vào số tiếp theo',
      'missing-number': 'Chạm vào số còn thiếu',
      'match-letter': 'Chạm vào chữ giống nhau',
      'find-named-letter': 'Chạm vào chữ giống nhau',
      'match-case': 'Chạm vào chữ giống nhau',
      'letter-sound': 'Chạm vào chữ giống nhau',
      'match-syllable': 'Chạm vào tiếng giống nhau',
      'match-word': 'Chạm vào từ giống nhau',
      'word-to-picture': 'Chạm vào tên đúng'
    },

    // Praise — one line, identical every time.
    praise: 'Đúng rồi 🌱',

    // First → Then strip
    firstLabel: 'BÂY GIỜ',
    thenLabel: 'SAU ĐÓ',

    // Buttons / common
    breakButton: 'Nghỉ',
    breakReturn: 'Quay lại',
    breatheIn: 'Hít vào',
    breatheOut: 'Thở ra',
    stickerTitle: 'Bộ sưu tập',
    stickerPick: 'Chọn một hình dán',
    home: 'Trang chính',

    // Parent area
    parent: {
      title: 'Dành cho phụ huynh',
      close: 'Đóng',
      settingsTitle: 'Cài đặt',
      progressTitle: 'Tiến trình',
      sound: 'Âm thanh',
      motion: 'Chuyển động',
      choices: 'Số lựa chọn mỗi câu',
      praise: 'Lời khen bằng chữ',
      sessionLength: 'Số ngôi sao mỗi lượt',
      on: 'Bật',
      off: 'Tắt',
      currentStep: 'Bước hiện tại',
      stepsDone: 'Số bước đã xong',
      stickersEarned: 'Hình dán đã nhận',
      daysThisWeek: 'Số ngày dùng tuần này',
      pathNumbers: 'Số',
      pathLetters: 'Chữ cái',
      explainTitle: 'Vì sao ứng dụng không bao giờ nói "sai"',
      explainBody:
        'Ứng dụng này dạy theo cách "học không lỗi". Khi bé chạm vào lựa chọn ' +
        'chưa đúng, lựa chọn đó chỉ nhẹ nhàng mờ đi, không có màu đỏ, không có ' +
        'dấu X, không có âm thanh báo lỗi. Sau hai lần, đáp án đúng sẽ sáng dịu ' +
        'lên và chờ bé chạm vào. Nhờ vậy mỗi câu đều kết thúc bằng thành công. ' +
        'Bé luôn thấy an toàn, không bao giờ bị chê, và học tốt hơn khi không lo sợ mắc lỗi.',
      resetHint: 'Nhấn giữ 3 giây ở góc để mở phần này.'
    }
  };
})();
