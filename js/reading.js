(function () {
  function sentenceCard(item) {
    return `
      <article class="detail-card">
        <div class="detail-card-head">
          <div>
            <p class="sentence-main">${Minanam.escapeHtml(item.sentence_text)}</p>
            <p class="sentence-translation">${Minanam.escapeHtml(item.translation || '')}</p>
          </div>
          ${Minanam.audioButton(item.audio_url, item.sentence_text)}
        </div>
        ${item.explanation ? `<div class="detail-row"><strong>句型說明</strong><p>${Minanam.escapeHtml(item.explanation)}</p></div>` : ''}
        ${item.example ? `<div class="detail-row"><strong>使用例句</strong><p>${Minanam.escapeHtml(item.example)}</p>${Minanam.audioButton(item.example_audio_url, '例句')}</div>` : ''}
      </article>`;
  }

  function vocabCard(item) {
    return `
      <article class="detail-card vocab-detail">
        <img src="${Minanam.escapeHtml(item.image_url || 'assets/images/default.svg')}" alt="${Minanam.escapeHtml(item.meaning || item.word)}" loading="lazy" decoding="async">
        <div class="vocab-detail-body">
          <div class="detail-card-head">
            <div>
              <p class="vocab-word">${Minanam.escapeHtml(item.word)}</p>
              <p class="vocab-meaning">${Minanam.escapeHtml(item.meaning || '')}</p>
            </div>
            ${Minanam.audioButton(item.audio_url, item.word)}
          </div>
          ${item.explanation ? `<div class="detail-row"><strong>單字說明</strong><p>${Minanam.escapeHtml(item.explanation)}</p></div>` : ''}
          ${item.example ? `<div class="detail-row"><strong>使用例句</strong><p>${Minanam.escapeHtml(item.example)}</p>${Minanam.audioButton(item.example_audio_url, '例句')}</div>` : ''}
        </div>
      </article>`;
  }

  function renderNeighbors(current) {
    const previous = current.navigation?.previous || null;
    const next = current.navigation?.next || null;
    document.getElementById('content-nav').innerHTML = `
      ${previous ? `<a class="nav-card" href="reading.html?id=${encodeURIComponent(previous.book_id)}"><span>← 上一本</span><strong>${Minanam.escapeHtml(previous.title)}</strong></a>` : '<span></span>'}
      ${next ? `<a class="nav-card align-right" href="reading.html?id=${encodeURIComponent(next.book_id)}"><span>下一本 →</span><strong>${Minanam.escapeHtml(next.title)}</strong></a>` : '<span></span>'}`;
  }

  function setupActions(item) {
    const share = document.getElementById('share-button');
    const complete = document.getElementById('complete-button');
    const updateComplete = () => {
      const completed = Boolean(Minanam.getProgress('book', item.book_id)?.completed);
      complete.classList.toggle('completed', completed);
      complete.textContent = completed ? '✓ 已完成親子共讀' : '標記為完成';
    };
    share.addEventListener('click', () => Minanam.sharePage(`${item.title}｜太巴塱阿美族語學習網`));
    complete.addEventListener('click', () => {
      const completed = Minanam.toggleCompleted('book', item.book_id, item.title);
      updateComplete();
      Minanam.toast(completed ? '已記錄完成' : '已取消完成標記');
    });
    updateComplete();
  }

  async function init() {
    const id = Minanam.getQuery('id');
    if (!id) return showError('網址缺少繪本編號。');
    try {
      const item = await MinanamAPI.getBook(id);
      if (!item || item.status === 'draft') return showError('找不到這一本繪本。');

      document.title = `${item.title}｜太巴塱阿美族語學習網`;
      document.getElementById('book-meta').textContent = Minanam.bookMeta(item);
      document.getElementById('book-title').textContent = item.title;
      document.getElementById('book-subtitle').textContent = item.subtitle || '';
      document.getElementById('book-summary').textContent = item.summary || '';
      document.getElementById('book-cover').src = item.cover_image || 'assets/images/default.svg';
      document.getElementById('book-cover').alt = `${item.title}封面`;
      document.getElementById('book-video').innerHTML = Minanam.youtubeEmbed(item.youtube_id, item.title);
      document.getElementById('sentence-list').innerHTML = (item.sentences || []).length
        ? item.sentences.sort((a, b) => a.sort_order - b.sort_order).map(sentenceCard).join('')
        : '<div class="empty-state">本書句型尚未設定。</div>';
      document.getElementById('vocab-list').innerHTML = (item.vocabulary || []).length
        ? item.vocabulary.sort((a, b) => a.sort_order - b.sort_order).map(vocabCard).join('')
        : '<div class="empty-state">本書單字尚未設定。</div>';
      Minanam.bindImageFallbacks(document.getElementById('reading-content'));

      Minanam.recordView('book', item.book_id, item.title);
      setupActions(item);
      Minanam.bindLearningEvents('book', item.book_id, item.title);
      renderNeighbors(item);
      document.getElementById('reading-content').hidden = false;
    } catch (error) {
      console.error(error);
      showError('讀取繪本時發生錯誤，請稍後再試。');
    }
  }

  function showError(message) {
    const error = document.getElementById('page-error');
    error.querySelector('p').textContent = message;
    error.hidden = false;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
