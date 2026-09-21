/**
 * Minanam｜Tafalong國小附設幼兒園阿美族語學習網
 * 公開教材 API（Google Sheets → Google Apps Script → 靜態網站）
 *
 * 使用方式：
 * 1. 建立 Google 試算表。
 * 2. 擴充功能 → Apps Script，把本檔完整貼上。
 * 3. 執行 setupSheets()。
 * 4. 部署 → 新增部署作業 → 網頁應用程式。
 * 5. 執行身分：我；存取權：任何人。
 * 6. 將 /exec 網址貼到網站 js/config.js 的 gasApiUrl。
 *
 * 注意：此 API 只放「公開教材」。學生姓名、學號、帳號、學習歷程不可放在這裡。
 */

const SHEET_NAMES = Object.freeze({
  SETTINGS: 'SiteSettings',
  COURSES: 'ThemeCourses',
  COURSE_SENTENCES: 'ThemeSentences',
  COURSE_VOCAB: 'ThemeVocabulary',
  BOOKS: 'Storybooks',
  BOOK_SENTENCES: 'StorySentences',
  BOOK_VOCAB: 'StoryVocabulary'
});

const HEADERS = Object.freeze({
  SiteSettings: ['key', 'value', 'note'],
  ThemeCourses: ['course_id', 'school_year', 'semester', 'week_no', 'title', 'summary', 'youtube_id', 'game_url', 'worksheet_url', 'cover_image', 'keywords', 'status'],
  ThemeSentences: ['sentence_id', 'course_id', 'sentence_text', 'translation', 'audio_url', 'sort_order'],
  ThemeVocabulary: ['vocab_id', 'course_id', 'word', 'meaning', 'audio_url', 'image_url', 'sort_order'],
  Storybooks: ['book_id', 'school_year', 'semester', 'book_no', 'title', 'subtitle', 'summary', 'youtube_id', 'cover_image', 'keywords', 'status'],
  StorySentences: ['sentence_id', 'book_id', 'sentence_text', 'translation', 'explanation', 'example', 'audio_url', 'example_audio_url', 'sort_order'],
  StoryVocabulary: ['vocab_id', 'book_id', 'word', 'meaning', 'explanation', 'example', 'audio_url', 'example_audio_url', 'image_url', 'sort_order']
});

const API_CACHE_SECONDS = 300;
const CACHE_REVISION_PROPERTY = 'MINANAM_CACHE_REVISION';

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || 'library');
    const id = String(params.id || '').trim();
    let data;

    switch (action) {
      case 'library':
        data = getLibrary_();
        break;
      case 'course':
        if (!id) throw new Error('缺少課程 id');
        data = getCourse_(id);
        break;
      case 'book':
        if (!id) throw new Error('缺少繪本 id');
        data = getBook_(id);
        break;
      case 'settings':
        data = getSettings_();
        break;
      case 'search-index':
        data = getSearchIndex_();
        break;
      case 'health':
        data = { service: 'Minanam API', status: 'ok', time: new Date().toISOString() };
        break;
      default:
        throw new Error('不支援的 action：' + action);
    }

    return output_({ ok: true, data: data }, params.prefix);
  } catch (error) {
    console.error(error);
    return output_({ ok: false, error: error.message || String(error) }, e && e.parameter && e.parameter.prefix);
  }
}

function output_(payload, prefix) {
  const json = JSON.stringify(payload);
  if (prefix && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(prefix)) {
    return ContentService.createTextOutput(prefix + '(' + json + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function cacheRevision_() {
  return PropertiesService.getScriptProperties().getProperty(CACHE_REVISION_PROPERTY) || '1';
}

function cacheKey_(name) {
  return name + ':' + cacheRevision_();
}

function cachedJson_(name) {
  const cached = CacheService.getScriptCache().get(cacheKey_(name));
  return cached ? JSON.parse(cached) : null;
}

function putCachedJson_(name, value) {
  try {
    CacheService.getScriptCache().put(cacheKey_(name), JSON.stringify(value), API_CACHE_SECONDS);
  } catch (_) {
    // 單筆資料若超過 CacheService 限制，直接回傳即可，不影響教材顯示。
  }
  return value;
}

function getSettings_() {
  const cached = cachedJson_('settings-v2-fast');
  if (cached) return cached;

  const result = rows_(SHEET_NAMES.SETTINGS).reduce(function (output, row) {
    const key = String(row.key || '').trim();
    if (!key) return output;
    output[key] = row.value;
    return output;
  }, {});

  return putCachedJson_('settings-v2-fast', result);
}

function getLibrary_() {
  const cached = cachedJson_('library-v2-fast');
  if (cached) return cached;

  // 首頁只載入「清單需要的資料」。句型/單字全文搜尋索引改成使用者搜尋時才載入。
  const courses = rows_(SHEET_NAMES.COURSES)
    .filter(isPublished_)
    .map(function (course) {
      course.search_text = searchText_([course.title, course.summary, course.keywords]);
      return course;
    });

  const books = rows_(SHEET_NAMES.BOOKS)
    .filter(isPublished_)
    .map(function (book) {
      book.search_text = searchText_([book.title, book.subtitle, book.summary, book.keywords]);
      return book;
    });

  const result = { settings: getSettings_(), courses: courses, books: books };
  return putCachedJson_('library-v2-fast', result);
}

function getSearchIndex_() {
  const cached = cachedJson_('search-index-v2-fast');
  if (cached) return cached;

  const courseIndex = {};
  rows_(SHEET_NAMES.COURSE_SENTENCES).forEach(function (x) {
    const id = String(x.course_id || '');
    if (!id) return;
    courseIndex[id] = searchText_([courseIndex[id], x.sentence_text, x.translation]);
  });
  rows_(SHEET_NAMES.COURSE_VOCAB).forEach(function (x) {
    const id = String(x.course_id || '');
    if (!id) return;
    courseIndex[id] = searchText_([courseIndex[id], x.word, x.meaning]);
  });

  const bookIndex = {};
  rows_(SHEET_NAMES.BOOK_SENTENCES).forEach(function (x) {
    const id = String(x.book_id || '');
    if (!id) return;
    bookIndex[id] = searchText_([bookIndex[id], x.sentence_text, x.translation, x.explanation, x.example]);
  });
  rows_(SHEET_NAMES.BOOK_VOCAB).forEach(function (x) {
    const id = String(x.book_id || '');
    if (!id) return;
    bookIndex[id] = searchText_([bookIndex[id], x.word, x.meaning, x.explanation, x.example]);
  });

  const result = { courses: courseIndex, books: bookIndex };
  return putCachedJson_('search-index-v2-fast', result);
}

function contentNeighbor_(items, idField, currentId, numberField) {
  const sorted = items.slice().sort(function (a, b) {
    return Number(a.school_year || 0) - Number(b.school_year || 0) ||
      Number(a.semester || 0) - Number(b.semester || 0) ||
      Number(a[numberField] || 0) - Number(b[numberField] || 0);
  });
  const index = sorted.findIndex(function (item) { return String(item[idField]) === String(currentId); });
  if (index < 0) return { previous: null, next: null };
  return {
    previous: sorted[index - 1] || null,
    next: sorted[index + 1] || null
  };
}

function compactCourseNav_(item) {
  return item ? { course_id: item.course_id, title: item.title } : null;
}

function compactBookNav_(item) {
  return item ? { book_id: item.book_id, title: item.title } : null;
}

function getCourse_(courseId) {
  const cacheName = 'course-v2-fast:' + courseId;
  const cached = cachedJson_(cacheName);
  if (cached) return cached;

  const courses = rows_(SHEET_NAMES.COURSES).filter(isPublished_);
  const course = courses.find(function (row) {
    return String(row.course_id) === courseId;
  });
  if (!course) return null;

  course.sentences = rows_(SHEET_NAMES.COURSE_SENTENCES)
    .filter(function (row) { return String(row.course_id) === courseId; })
    .sort(sortOrder_);
  course.vocabulary = rows_(SHEET_NAMES.COURSE_VOCAB)
    .filter(function (row) { return String(row.course_id) === courseId; })
    .sort(sortOrder_);

  const neighbors = contentNeighbor_(courses, 'course_id', courseId, 'week_no');
  course.navigation = {
    previous: compactCourseNav_(neighbors.previous),
    next: compactCourseNav_(neighbors.next)
  };
  return putCachedJson_(cacheName, course);
}

function getBook_(bookId) {
  const cacheName = 'book-v2-fast:' + bookId;
  const cached = cachedJson_(cacheName);
  if (cached) return cached;

  const books = rows_(SHEET_NAMES.BOOKS).filter(isPublished_);
  const book = books.find(function (row) {
    return String(row.book_id) === bookId;
  });
  if (!book) return null;

  book.sentences = rows_(SHEET_NAMES.BOOK_SENTENCES)
    .filter(function (row) { return String(row.book_id) === bookId; })
    .sort(sortOrder_);
  book.vocabulary = rows_(SHEET_NAMES.BOOK_VOCAB)
    .filter(function (row) { return String(row.book_id) === bookId; })
    .sort(sortOrder_);

  const neighbors = contentNeighbor_(books, 'book_id', bookId, 'book_no');
  book.navigation = {
    previous: compactBookNav_(neighbors.previous),
    next: compactBookNav_(neighbors.next)
  };
  return putCachedJson_(cacheName, book);
}

function searchText_(parts) {
  return parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function rows_(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('請將 Apps Script 綁定到教材試算表。');
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) throw new Error('找不到工作表：' + sheetName);
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values.shift().map(function (value) { return String(value).trim(); });
  return values
    .filter(function (row) { return row.some(function (cell) { return String(cell).trim() !== ''; }); })
    .map(function (row) {
      return headers.reduce(function (record, header, index) {
        record[header] = normalize_(header, row[index]);
        return record;
      }, {});
    });
}

function normalize_(header, value) {
  const text = String(value == null ? '' : value).trim();
  const numericFields = ['school_year', 'semester', 'week_no', 'book_no', 'sort_order'];
  if (numericFields.indexOf(header) !== -1) return text === '' ? 0 : Number(text);
  return text;
}

function isPublished_(row) {
  return String(row.status || 'published').toLowerCase() === 'published';
}

function sortOrder_(a, b) {
  return Number(a.sort_order || 0) - Number(b.sort_order || 0);
}

function setupSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('請先建立並開啟 Google 試算表。');

  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    Object.keys(HEADERS).forEach(function (sheetName) {
      let sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
      const headers = HEADERS[sheetName];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#315f4b')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
      sheet.autoResizeColumns(1, headers.length);
    });

    addDemoRows_();
    SpreadsheetApp.flush();
    clearApiCache();
  } finally {
    lock.releaseLock();
  }
}

function addDemoRows_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const settings = spreadsheet.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settings.getLastRow() === 1) {
    settings.getRange(2, 1, 6, 3).setValues([
      ['school_name', 'Tafalong國小附設幼兒園', '首頁顯示學校名稱'],
      ['site_title', 'Minanam｜太巴塱阿美族語學習網', '網站標題'],
      ['current_school_year', '115', '目前學年度'],
      ['current_semester', '1', '目前學期：1或2'],
      ['hero_title', '一起聽、一起說，在生活裡學阿美語。', '首頁主標題'],
      ['hero_text', '跟著每週主題課程學習，也和家人一起閱讀族語繪本。', '首頁簡介']
    ]);
  }

  const courseSheet = spreadsheet.getSheetByName(SHEET_NAMES.COURSES);
  if (courseSheet.getLastRow() === 1) {
    courseSheet.appendRow(['115-1-W01', 115, 1, 1, '第一週｜認識我們的幼兒園', '第一筆示範資料，可直接改成正式課程內容。', '', '', '', '', '幼兒園 第一週', 'published']);
  }
  const courseSentenceSheet = spreadsheet.getSheetByName(SHEET_NAMES.COURSE_SENTENCES);
  if (courseSentenceSheet.getLastRow() === 1) {
    courseSentenceSheet.appendRow(['S-115-1-W01-01', '115-1-W01', 'Cima ko ngangan no miso?', '你叫什麼名字？', '', 1]);
  }
  const courseVocabSheet = spreadsheet.getSheetByName(SHEET_NAMES.COURSE_VOCAB);
  if (courseVocabSheet.getLastRow() === 1) {
    courseVocabSheet.appendRow(['V-115-1-W01-01', '115-1-W01', 'ngangan', '名字', '', '', 1]);
  }
  const bookSheet = spreadsheet.getSheetByName(SHEET_NAMES.BOOKS);
  if (bookSheet.getLastRow() === 1) {
    bookSheet.appendRow(['115-1-B01', 115, 1, 1, '第一本族語繪本', '示範繪本', '這是一筆版面示範資料，之後可換成正式共讀繪本。', '', '', '親子共讀 名字', 'published']);
  }
  const bookSentenceSheet = spreadsheet.getSheetByName(SHEET_NAMES.BOOK_SENTENCES);
  if (bookSentenceSheet.getLastRow() === 1) {
    bookSentenceSheet.appendRow(['BS-115-1-B01-01', '115-1-B01', 'Cima ko ngangan no miso?', '你叫什麼名字？', '示範欄位：可在此填句型教學說明。', '示範欄位：可填親子練習例句。', '', '', 1]);
  }
  const bookVocabSheet = spreadsheet.getSheetByName(SHEET_NAMES.BOOK_VOCAB);
  if (bookVocabSheet.getLastRow() === 1) {
    bookVocabSheet.appendRow(['BV-115-1-B01-01', '115-1-B01', 'ngangan', '名字', '示範欄位：可填單字說明。', '示範欄位：可填單字例句。', '', '', '', 1]);
  }
}

function clearApiCache() {
  PropertiesService.getScriptProperties().setProperty(CACHE_REVISION_PROPERTY, String(Date.now()));
  CacheService.getScriptCache().removeAll(['library-v2', 'library-v2-fast', 'settings-v2-fast', 'search-index-v2-fast']);
}

// 教師直接修改綁定的 Google Sheets 時，更新快取版本。
// 首頁、全文索引與教材詳細頁會在下一次請求重建，無須知道每一筆教材 ID。
function onEdit(e) {
  clearApiCache();
}
