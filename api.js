(function () {
  const config = window.MINANAM_CONFIG;
  const demo = window.MINANAM_DEMO_DATA;
  const CACHE_PREFIX = 'minanam-api-v1.2-perf2:';
  const inFlight = new Map();
  const CACHE_TTL = {
    settings: 5 * 60 * 1000,
    library: 5 * 60 * 1000,
    searchIndex: 5 * 60 * 1000,
    course: 5 * 60 * 1000,
    book: 5 * 60 * 1000
  };

  function shouldUseDemo() {
    return config.useDemoData || !config.gasApiUrl;
  }

  function forceRefresh() {
    return new URLSearchParams(window.location.search).get('refresh') === '1';
  }

  function readCache(key) {
    if (forceRefresh()) return null;
    try {
      const raw = sessionStorage.getItem(CACHE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw);
      if (!entry || Date.now() > Number(entry.expiresAt || 0)) {
        sessionStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return entry.data;
    } catch {
      return null;
    }
  }

  function writeCache(key, data, ttl) {
    try {
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
        expiresAt: Date.now() + ttl,
        data
      }));
    } catch {
      // Safari 私密模式或儲存空間不足時，略過快取即可。
    }
    return data;
  }

  function clearCache() {
    try {
      Object.keys(sessionStorage)
        .filter((key) => key.startsWith(CACHE_PREFIX))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {}
    inFlight.clear();
  }

  function jsonp(params) {
    return new Promise((resolve, reject) => {
      const callbackName = `__minanamCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const url = new URL(config.gasApiUrl);
      Object.entries({ ...params, prefix: callbackName }).forEach(([key, value]) => url.searchParams.set(key, value));

      const script = document.createElement('script');
      const timer = window.setTimeout(() => cleanup(new Error('API 連線逾時')), 12000);

      function cleanup(error, payload) {
        window.clearTimeout(timer);
        script.remove();
        try { delete window[callbackName]; } catch { window[callbackName] = undefined; }
        if (error) reject(error); else resolve(payload);
      }

      window[callbackName] = (payload) => {
        if (!payload || !payload.ok) {
          cleanup(new Error(payload?.error || 'API 回傳錯誤'));
          return;
        }
        cleanup(null, payload.data);
      };
      script.onerror = () => cleanup(new Error('無法載入 Google Apps Script API'));
      script.src = url.toString();
      script.async = true;
      document.head.appendChild(script);
    });
  }

  async function sameOriginRequest(params) {
    const url = new URL(config.gasApiUrl, window.location.href);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    if (forceRefresh()) url.searchParams.set('refresh', '1');

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error(`API 回應錯誤（${response.status}）`);
      const payload = await response.json();
      if (!payload || payload.ok !== true) throw new Error(payload?.error || 'API 回應格式不正確');
      return payload.data;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('API 連線逾時');
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function request(params) {
    const url = new URL(config.gasApiUrl, window.location.href);
    return url.origin === window.location.origin ? sameOriginRequest(params) : jsonp(params);
  }

  async function cached(key, ttl, loader) {
    const hit = readCache(key);
    if (hit !== null) return hit;
    if (inFlight.has(key)) return inFlight.get(key);
    const pending = loader()
      .then((data) => writeCache(key, data, ttl))
      .finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
    return pending;
  }

  async function getHealth() {
    if (shouldUseDemo()) return { service: 'Minanam API', status: 'demo', time: new Date().toISOString() };
    return request({ action: 'health' });
  }

  async function getSettings() {
    if (shouldUseDemo()) return structuredClone(demo.settings || {});
    return cached('settings', CACHE_TTL.settings, () => request({ action: 'settings' }));
  }

  async function getLibrary() {
    if (shouldUseDemo()) return structuredClone(demo);
    return cached('library', CACHE_TTL.library, () => request({ action: 'library' }));
  }

  async function getSearchIndex() {
    if (shouldUseDemo()) {
      return {
        courses: Object.fromEntries((demo.courses || []).map((item) => [item.course_id, item.search_text || ''])),
        books: Object.fromEntries((demo.books || []).map((item) => [item.book_id, item.search_text || '']))
      };
    }
    return cached('search-index', CACHE_TTL.searchIndex, () => request({ action: 'search-index' }));
  }

  async function getCourse(id) {
    if (shouldUseDemo()) {
      const items = (demo.courses || []).slice().sort((a, b) => a.school_year - b.school_year || a.semester - b.semester || a.week_no - b.week_no);
      const index = items.findIndex((item) => item.course_id === id);
      const item = structuredClone(items[index] || null);
      if (item) item.navigation = {
        previous: items[index - 1] ? { course_id: items[index - 1].course_id, title: items[index - 1].title } : null,
        next: items[index + 1] ? { course_id: items[index + 1].course_id, title: items[index + 1].title } : null
      };
      return item;
    }
    return cached(`course:${id}`, CACHE_TTL.course, () => request({ action: 'course', id }));
  }

  async function getBook(id) {
    if (shouldUseDemo()) {
      const items = (demo.books || []).slice().sort((a, b) => a.school_year - b.school_year || a.semester - b.semester || a.book_no - b.book_no);
      const index = items.findIndex((item) => item.book_id === id);
      const item = structuredClone(items[index] || null);
      if (item) item.navigation = {
        previous: items[index - 1] ? { book_id: items[index - 1].book_id, title: items[index - 1].title } : null,
        next: items[index + 1] ? { book_id: items[index + 1].book_id, title: items[index + 1].title } : null
      };
      return item;
    }
    return cached(`book:${id}`, CACHE_TTL.book, () => request({ action: 'book', id }));
  }

  window.MinanamAPI = { getHealth, getSettings, getLibrary, getSearchIndex, getCourse, getBook, clearCache };
})();
