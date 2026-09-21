(function () {
  function vocabCard(item) {
    return `
      <article class="vocab-card">
        <img src="${Minanam.escapeHtml(item.image_url || 'assets/images/default.svg')}" alt="${Minanam.escapeHtml(item.meaning || item.word)}" loading="lazy" decoding="async">
        <div>
          <p class="vocab-word">${Minanam.escapeHtml(item.word)}</p>
          <p class="vocab-meaning">${Minanam.escapeHtml(item.meaning || '')}</p>
          ${Minanam.audioButton(item.audio_url, item.word)}
        </div>
      </article>`;
  }

  function sentenceCard(item) {
    return `
      <article class="sentence-card">
        <div>
          <p class="sentence-main">${Minanam.escapeHtml(item.sentence_text)}</p>
          <p class="sentence-translation">${Minanam.escapeHtml(item.translation || '')}</p>
        </div>
        ${Minanam.audioButton(item.audio_url, item.sentence_text)}
      </article>`;
  }

  function renderNeighbors(current) {
    const previous = current.navigation?.previous || null;
    const next = current.navigation?.next || null;
    const nav = document.getElementById('content-nav');
    nav.innerHTML = `
      ${previous ? `<a class="nav-card" href="course.html?id=${encodeURIComponent(previous.course_id)}"><span>← 上一週</span><strong>${Minanam.escapeHtml(previous.title)}</strong></a>` : '<span></span>'}
      ${next ? `<a class="nav-card align-right" href="course.html?id=${encodeURIComponent(next.course_id)}"><span>下一週 →</span><strong>${Minanam.escapeHtml(next.title)}</strong></a>` : '<span></span>'}`;
  }

  function setupActions(item) {
    const share = document.getElementById('share-button');
    const complete = document.getElementById('complete-button');
    const updateComplete = () => {
      const progress = Minanam.getProgress('course', item.course_id);
      const completed = Boolean(progress?.completed);
      complete.classList.toggle('completed', completed);
      complete.textContent = completed ? '✓ 已完成本週學習' : '標記為完成';
    };
    share.addEventListener('click', () => Minanam.sharePage(`${item.title}｜太巴塱阿美族語學習網`));
    complete.addEventListener('click', () => {
      const completed = Minanam.toggleCompleted('course', item.course_id, item.title);
      updateComplete();
      Minanam.toast(completed ? '已記錄完成' : '已取消完成標記');
    });
    updateComplete();
  }

  async function init() {
    const id = Minanam.getQuery('id');
    if (!id) return showError('網址缺少課程編號。');
    try {
      const item = await MinanamAPI.getCourse(id);
      if (!item || item.status === 'draft') return showError('找不到這一週的課程。');

      document.title = `${item.title}｜太巴塱阿美族語學習網`;
      document.getElementById('course-meta').textContent = Minanam.courseMeta(item);
      document.getElementById('course-title').textContent = item.title;
      document.getElementById('course-summary').textContent = item.summary || '';
      document.getElementById('week-badge-number').textContent = `第${item.week_no}週`;
      document.getElementById('course-video').innerHTML = Minanam.youtubeEmbed(item.youtube_id, item.title);
      document.getElementById('sentence-list').innerHTML = (item.sentences || []).length
        ? item.sentences.sort((a, b) => a.sort_order - b.sort_order).map(sentenceCard).join('')
        : '<div class="empty-state">本週句型尚未設定。</div>';
      document.getElementById('vocab-list').innerHTML = (item.vocabulary || []).length
        ? item.vocabulary.sort((a, b) => a.sort_order - b.sort_order).map(vocabCard).join('')
        : '<div class="empty-state">本週單字尚未設定。</div>';
      Minanam.bindImageFallbacks(document.getElementById('vocab-list'));

      const game = document.getElementById('game-link');
      const worksheet = document.getElementById('worksheet-link');
      if (item.game_url) { game.href = item.game_url; game.dataset.trackGame = '1'; } else game.classList.add('disabled');
      if (item.worksheet_url) { worksheet.href = item.worksheet_url; worksheet.dataset.trackWorksheet = '1'; } else worksheet.classList.add('disabled');

      Minanam.recordView('course', item.course_id, item.title);
      setupActions(item);
      Minanam.bindLearningEvents('course', item.course_id, item.title);
      renderNeighbors(item);
      document.getElementById('course-content').hidden = false;
    } catch (error) {
      console.error(error);
      showError('讀取課程時發生錯誤，請稍後再試。');
    }
  }

  function showError(message) {
    const error = document.getElementById('page-error');
    error.querySelector('p').textContent = message;
    error.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
