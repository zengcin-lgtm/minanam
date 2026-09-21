window.MINANAM_DEMO_DATA = {
  settings: {
    school_name: 'Tafalong國小附設幼兒園',
    site_title: 'Minanam｜太巴塱阿美族語學習網',
    current_school_year: '115',
    current_semester: '1',
    hero_title: '一起聽、一起說，在生活裡學阿美語。',
    hero_text: '跟著每週主題課程學習，也和家人一起閱讀族語繪本，把幼兒園的族語帶回生活。'
  },
  courses: [
    {
      course_id: '115-1-W01', school_year: 115, semester: 1, week_no: 1,
      title: '第一週｜認識我們的幼兒園',
      summary: '第一筆示範課程，用來測試影片、句型、單字、遊戲與學習單的版面。',
      cover_image: 'assets/images/school.svg', youtube_id: '', game_url: '', worksheet_url: '',
      keywords: '幼兒園 第一週 名字 自我介紹', status: 'published',
      search_text: '幼兒園 第一週 名字 自我介紹 Cima ko ngangan no miso 你叫什麼名字 ngangan 名字',
      sentences: [
        { sentence_id: 'S-115-1-W01-01', sentence_text: 'Cima ko ngangan no miso?', translation: '你叫什麼名字？', audio_url: '', sort_order: 1 }
      ],
      vocabulary: [
        { vocab_id: 'V-115-1-W01-01', word: 'ngangan', meaning: '名字', audio_url: '', image_url: 'assets/images/name-card.svg', sort_order: 1 }
      ]
    },
    {
      course_id: '115-1-W02', school_year: 115, semester: 1, week_no: 2,
      title: '第二週｜我的身體',
      summary: '示範如何呈現圖卡與單字音檔，正式資料可直接在 Google Sheets 更換。',
      cover_image: 'assets/images/face.svg', youtube_id: '', game_url: '', worksheet_url: '',
      keywords: '身體 臉 眼睛 鼻子', status: 'published',
      search_text: '身體 臉 眼睛 鼻子 mata 眼睛 ngoso 鼻子',
      sentences: [
        { sentence_id: 'S-115-1-W02-01', sentence_text: 'O mata kinian.', translation: '這是眼睛。', audio_url: '', sort_order: 1 }
      ],
      vocabulary: [
        { vocab_id: 'V-115-1-W02-01', word: 'mata', meaning: '眼睛', audio_url: '', image_url: 'assets/images/eye.svg', sort_order: 1 },
        { vocab_id: 'V-115-1-W02-02', word: "ngoso'", meaning: '鼻子', audio_url: '', image_url: 'assets/images/nose.svg', sort_order: 2 }
      ]
    },
    {
      course_id: '114-2-W08', school_year: 114, semester: 2, week_no: 8,
      title: '歷年課程示範｜我的臉',
      summary: '用來確認首頁可以跨學年、學期搜尋舊教材。',
      cover_image: 'assets/images/face.svg', youtube_id: '', game_url: '', worksheet_url: '',
      keywords: '歷年 臉 身體', status: 'published',
      search_text: '歷年 臉 身體 pising 臉 mata 眼睛',
      sentences: [
        { sentence_id: 'S-114-2-W08-01', sentence_text: 'O pising kinian.', translation: '這是臉。', audio_url: '', sort_order: 1 }
      ],
      vocabulary: [
        { vocab_id: 'V-114-2-W08-01', word: 'pising', meaning: '臉', audio_url: '', image_url: 'assets/images/face.svg', sort_order: 1 }
      ]
    }
  ],
  books: [
    {
      book_id: '115-1-B01', school_year: 115, semester: 1, book_no: 1,
      title: '第一本族語繪本', subtitle: '示範：我的名字',
      summary: '展示親子共讀頁面的影片、句型說明、例句、單字說明與例句欄位。',
      cover_image: 'assets/images/book-name.svg', youtube_id: '', keywords: '名字 自我介紹 親子共讀', status: 'published',
      search_text: '名字 自我介紹 親子共讀 Cima ko ngangan no miso ngangan',
      sentences: [
        {
          sentence_id: 'BS-115-1-B01-01', sentence_text: 'Cima ko ngangan no miso?', translation: '你叫什麼名字？',
          explanation: '示範欄位：正式上線時可放教師確認後的句型說明。',
          example: 'Ci Panay ko ngangan no mako.', audio_url: '', example_audio_url: '', sort_order: 1
        }
      ],
      vocabulary: [
        {
          vocab_id: 'BV-115-1-B01-01', word: 'ngangan', meaning: '名字',
          explanation: '示範欄位：可補充單字用法或親子引導方式。',
          example: '請親子一起指著名字卡練習。', audio_url: '', example_audio_url: '',
          image_url: 'assets/images/name-card.svg', sort_order: 1
        }
      ]
    },
    {
      book_id: '114-2-B05', school_year: 114, semester: 2, book_no: 5,
      title: '歷年繪本示範｜我的臉', subtitle: '認識臉部',
      summary: '用來測試歷年親子共讀內容的搜尋與分享網址。',
      cover_image: 'assets/images/book-face.svg', youtube_id: '', keywords: '臉 身體 親子共讀', status: 'published',
      search_text: '臉 身體 親子共讀 pising mata ngoso',
      sentences: [
        { sentence_id: 'BS-114-2-B05-01', sentence_text: 'O mata kinian.', translation: '這是眼睛。', explanation: '示範句型說明。', example: '親子可以指著眼睛一起說。', audio_url: '', example_audio_url: '', sort_order: 1 }
      ],
      vocabulary: [
        { vocab_id: 'BV-114-2-B05-01', word: 'pising', meaning: '臉', explanation: '示範單字說明。', example: '照鏡子找找自己的臉。', audio_url: '', example_audio_url: '', image_url: 'assets/images/face.svg', sort_order: 1 }
      ]
    }
  ]
};
