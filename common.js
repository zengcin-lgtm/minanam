(function () {
  const STORAGE_KEY = 'minanam-learning-progress-v2';

  function escapeHtml(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getQuery(name) { return new URLSearchParams(window.location.search).get(name); }
  function semesterLabel(value) { return Number(value) === 1 ? '第1學期' : '第2學期'; }
  function courseMeta(item) { return `${item.school_year}學年度｜${semesterLabel(item.semester)}｜第${item.week_no}週`; }
  function bookMeta(item) { return `${item.school_year}學年度｜${semesterLabel(item.semester)}｜第${item.book_no}號繪本`; }

  function youtubeEmbed(id, title) {
    if (!id) return `<div class="media-placeholder"><span>影片尚未設定</span><small>在 Google Sheets 填入 YouTube ID 後就會顯示</small></div>`;
    const safeId = encodeURIComponent(String(id).trim());
    return `<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/${safeId}" title="${escapeHtml(title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }

  function audioButton(url, label) {
    if (!url) return `<button class="audio-btn" type="button" disabled aria-label="${escapeHtml(label)}音檔尚未上傳">🔇 音檔待上傳</button>`;
    return `<audio class="audio-player" controls preload="none" src="${escapeHtml(url)}" data-track-audio="1">您的瀏覽器不支援音訊播放。</audio>`;
  }

  function bindImageFallbacks(root = document) {
    root.querySelectorAll('img').forEach((image) => {
      if (image.dataset.minanamFallbackBound === '1') return;
      image.dataset.minanamFallbackBound = '1';
      image.addEventListener('error', () => {
        if (image.dataset.minanamFallbackApplied === '1') return;
        image.dataset.minanamFallbackApplied = '1';
        image.src = 'assets/images/default.svg';
      });
    });
  }

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch (error) { console.warn('無法讀取學習紀錄', error); return {}; }
  }
  function saveProgress(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  function ensureEntry(type, id, title) {
    const progress = readProgress();
    const key = `${type}:${id}`;
    const previous = progress[key] || {};
    progress[key] = {
      type, id, title,
      viewCount: Number(previous.viewCount || 0),
      firstViewedAt: previous.firstViewedAt || new Date().toISOString(),
      lastViewedAt: new Date().toISOString(),
      completed: Boolean(previous.completed),
      audioPlayCount: Number(previous.audioPlayCount || 0),
      gameOpenCount: Number(previous.gameOpenCount || 0),
      worksheetOpenCount: Number(previous.worksheetOpenCount || 0)
    };
    return { progress, key };
  }

  function recordView(type, id, title) {
    const state = ensureEntry(type, id, title);
    state.progress[state.key].viewCount += 1;
    saveProgress(state.progress);
    return state.progress[state.key];
  }

  function recordEvent(type, id, title, eventName) {
    const state = ensureEntry(type, id, title);
    if (eventName === 'audio') state.progress[state.key].audioPlayCount += 1;
    if (eventName === 'game') state.progress[state.key].gameOpenCount += 1;
    if (eventName === 'worksheet') state.progress[state.key].worksheetOpenCount += 1;
    state.progress[state.key].lastViewedAt = new Date().toISOString();
    saveProgress(state.progress);
    return state.progress[state.key];
  }

  function toggleCompleted(type, id, title) {
    const state = ensureEntry(type, id, title);
    state.progress[state.key].completed = !state.progress[state.key].completed;
    saveProgress(state.progress);
    return state.progress[state.key].completed;
  }

  function getProgress(type, id) { return readProgress()[`${type}:${id}`] || null; }
  function recentItems(limit = 4) {
    return Object.values(readProgress()).sort((a, b) => new Date(b.lastViewedAt) - new Date(a.lastViewedAt)).slice(0, limit);
  }

  function bindLearningEvents(type, id, title) {
    document.querySelectorAll('[data-track-audio="1"]').forEach((audio) => {
      let counted = false;
      audio.addEventListener('play', () => {
        if (counted) return;
        counted = true;
        recordEvent(type, id, title, 'audio');
      });
    });
    document.querySelector('[data-track-game]')?.addEventListener('click', () => recordEvent(type, id, title, 'game'));
    document.querySelector('[data-track-worksheet]')?.addEventListener('click', () => recordEvent(type, id, title, 'worksheet'));
  }

  function toast(message) {
    let element = document.querySelector('.toast');
    if (!element) { element = document.createElement('div'); element.className = 'toast'; document.body.appendChild(element); }
    element.textContent = message; element.classList.add('show');
    window.clearTimeout(window.__minanamToast);
    window.__minanamToast = window.setTimeout(() => element.classList.remove('show'), 2200);
  }

  async function sharePage(title) {
    const data = { title, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(window.location.href); toast('網址已複製'); }
    } catch (error) { if (error.name !== 'AbortError') toast('無法分享，請手動複製網址'); }
  }

  function setYear() { document.querySelectorAll('[data-current-year]').forEach((node) => { node.textContent = new Date().getFullYear(); }); }
  function setupMenu() {
    const button = document.querySelector('[data-menu-button]'); const menu = document.querySelector('[data-menu]');
    if (!button || !menu) return;
    button.addEventListener('click', () => { const open = menu.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); });
  }

  document.addEventListener('DOMContentLoaded', () => { setYear(); setupMenu(); bindImageFallbacks(); });

  window.Minanam = { escapeHtml, getQuery, semesterLabel, courseMeta, bookMeta, youtubeEmbed, audioButton, bindImageFallbacks, recordView, recordEvent, toggleCompleted, getProgress, recentItems, bindLearningEvents, sharePage, toast };
})();
