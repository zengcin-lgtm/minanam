(function () {
  const state = { settings: {}, courses: [], books: [], searchIndexLoaded: false, searchIndexLoading: null, filters: { year: '', semester: '', keyword: '' } };

  async function ensureSearchIndex() {
    if (state.searchIndexLoaded) return;
    if (state.searchIndexLoading) return state.searchIndexLoading;
    state.searchIndexLoading = MinanamAPI.getSearchIndex()
      .then((index) => {
        const courseIndex = index?.courses || {};
        const bookIndex = index?.books || {};
        state.courses.forEach((item) => {
          const extra = courseIndex[item.course_id] || '';
          if (extra) item.search_text = [item.search_text, extra].filter(Boolean).join(' ');
        });
        state.books.forEach((item) => {
          const extra = bookIndex[item.book_id] || '';
          if (extra) item.search_text = [item.search_text, extra].filter(Boolean).join(' ');
        });
        state.searchIndexLoaded = true;
      })
      .catch((error) => { console.warn('全文搜尋索引載入失敗，改用標題與關鍵字搜尋。', error); })
      .finally(() => { state.searchIndexLoading = null; });
    return state.searchIndexLoading;
  }

  function matches(item, type) {
    const { year, semester, keyword } = state.filters;
    if (year && String(item.school_year) !== year) return false;
    if (semester && String(item.semester) !== semester) return false;
    if (!keyword) return true;
    const meta = type === 'course' ? Minanam.courseMeta(item) : Minanam.bookMeta(item);
    const haystack = [item.search_text, item.title, item.subtitle, item.summary, item.keywords, meta].filter(Boolean).join(' ').toLocaleLowerCase('zh-Hant');
    return haystack.includes(keyword.toLocaleLowerCase('zh-Hant'));
  }

  function isCurrent(item) {
    return String(item.school_year) === String(state.settings.current_school_year || '') && String(item.semester) === String(state.settings.current_semester || '');
  }

  function card(item, type) {
    const isCourse = type === 'course';
    const href = isCourse ? `course.html?id=${encodeURIComponent(item.course_id)}` : `reading.html?id=${encodeURIComponent(item.book_id)}`;
    const meta = isCourse ? Minanam.courseMeta(item) : Minanam.bookMeta(item);
    return `<article class="content-card ${isCurrent(item) ? 'current-card' : ''}">
      <a class="card-image" href="${href}" aria-label="閱讀${Minanam.escapeHtml(item.title)}">
        <img src="${Minanam.escapeHtml(item.cover_image || 'assets/images/default.svg')}" alt="" loading="lazy" decoding="async">
        <span class="card-tag">${isCourse ? '主題課程' : '親子共讀'}</span>
        ${isCurrent(item) ? '<span class="current-tag">本學期</span>' : ''}
      </a>
      <div class="card-body">
        <p class="eyebrow">${Minanam.escapeHtml(meta)}</p>
        <h3><a href="${href}">${Minanam.escapeHtml(item.title)}</a></h3>
        ${item.subtitle ? `<p class="subtitle">${Minanam.escapeHtml(item.subtitle)}</p>` : ''}
        <p>${Minanam.escapeHtml(item.summary || '')}</p>
        <a class="text-link" href="${href}">開始學習 <span aria-hidden="true">→</span></a>
      </div></article>`;
  }

  function sortContent(a, b, type) {
    const currentA = isCurrent(a) ? 1 : 0; const currentB = isCurrent(b) ? 1 : 0;
    if (currentA !== currentB) return currentB - currentA;
    if (a.school_year !== b.school_year) return b.school_year - a.school_year;
    if (a.semester !== b.semester) return b.semester - a.semester;
    return type === 'course' ? b.week_no - a.week_no : b.book_no - a.book_no;
  }

  function renderCollection(items, type, containerId, emptyText) {
    const filtered = items.filter((item) => matches(item, type)).sort((a, b) => sortContent(a, b, type));
    const container = document.getElementById(containerId);
    container.innerHTML = filtered.length ? filtered.map((item) => card(item, type)).join('') : `<div class="empty-state"><strong>找不到符合的內容</strong><p>${Minanam.escapeHtml(emptyText)}</p></div>`;
    Minanam.bindImageFallbacks(container);
    return filtered.length;
  }

  function render() {
    const courseCount = renderCollection(state.courses, 'course', 'course-list', '請更換學年、學期或關鍵字。');
    const bookCount = renderCollection(state.books, 'book', 'book-list', '請更換學年、學期或關鍵字。');
    document.getElementById('result-count').textContent = `找到 ${courseCount} 個主題課程、${bookCount} 本繪本`;
  }

  function populateYears() {
    const years = [...new Set([...state.courses, ...state.books].map((item) => Number(item.school_year)))].sort((a, b) => b - a);
    const select = document.getElementById('year-filter');
    select.innerHTML = '<option value="">全部學年度</option>' + years.map((year) => `<option value="${year}">${year}學年度</option>`).join('');
  }

  function renderRecent() {
    const recent = Minanam.recentItems(); const section = document.getElementById('recent-section'); const list = document.getElementById('recent-list');
    if (!recent.length) { section.hidden = true; return; }
    section.hidden = false;
    list.innerHTML = recent.map((item) => {
      const href = item.type === 'course' ? `course.html?id=${encodeURIComponent(item.id)}` : `reading.html?id=${encodeURIComponent(item.id)}`;
      return `<a class="recent-item" href="${href}"><span>${item.type === 'course' ? '主題課程' : '親子共讀'}</span><strong>${Minanam.escapeHtml(item.title)}</strong><small>瀏覽 ${item.viewCount} 次${item.completed ? '・已完成' : ''}</small></a>`;
    }).join('');
  }

  function applySettings() {
    const s = state.settings || {};
    if (s.school_name) document.querySelectorAll('[data-school-name]').forEach((el) => { el.textContent = s.school_name; });
    if (s.hero_title) document.getElementById('hero-title').textContent = s.hero_title;
    if (s.hero_text) document.getElementById('hero-text').textContent = s.hero_text;
    if (s.site_title) document.title = s.site_title;
    const current = document.getElementById('current-term');
    if (current && s.current_school_year && s.current_semester) current.textContent = `${s.current_school_year}學年度・第${s.current_semester}學期`;
  }

  function setupFilters() {
    const year = document.getElementById('year-filter'); const semester = document.getElementById('semester-filter'); const keyword = document.getElementById('keyword-filter'); const clear = document.getElementById('clear-filter');
    year.addEventListener('change', () => { state.filters.year = year.value; render(); });
    semester.addEventListener('change', () => { state.filters.semester = semester.value; render(); });
    let keywordTimer;
    keyword.addEventListener('input', () => {
      window.clearTimeout(keywordTimer);
      keywordTimer = window.setTimeout(async () => {
        state.filters.keyword = keyword.value.trim();
        render();
        if (state.filters.keyword && !state.searchIndexLoaded) {
          await ensureSearchIndex();
          render();
        }
      }, 180);
    });
    clear.addEventListener('click', () => { year.value = ''; semester.value = ''; keyword.value = ''; state.filters = { year: '', semester: '', keyword: '' }; render(); keyword.focus(); });
  }

  async function init() {
    try {
      const data = await MinanamAPI.getLibrary();
      state.settings = data.settings || {};
      state.courses = (data.courses || []).filter((item) => item.status !== 'draft');
      state.books = (data.books || []).filter((item) => item.status !== 'draft');
      applySettings(); populateYears(); setupFilters(); renderRecent(); render(); document.body.classList.add('loaded');
    } catch (error) { console.error(error); document.getElementById('library-error').hidden = false; }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
