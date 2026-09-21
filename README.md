# Minanam v1.2｜Tafalong國小附設幼兒園阿美族語學習網

## v1.2 效能修正版（不改資料表結構與既有網址）

這份檔案仍屬於 v1.2，只修正載入效能：

- 課程／繪本詳細頁由原本 2 次 GAS 請求降為 1 次；前後筆導覽由同一次回應帶回。
- `sessionStorage` 暫存 library、course、book，並合併同時間的重複請求；最長 5 分鐘更新。
- GAS 對首頁清單、搜尋索引、課程與繪本詳細資料分層快取 5 分鐘；教師在 Google Sheets 編輯時，`onEdit()` 以版本號讓所有快取立即失效。
- 首頁初次載入只讀網站設定、課程清單與繪本清單；句型／單字全文搜尋索引改成「真正輸入關鍵字時」才延遲載入。
- 圖片維持 lazy loading，另加 `decoding=async`；音檔維持 `preload=none`。
- Sites 版透過同源快取層連接原本的 Apps Script `/exec`，可相容尚未換上新版 `Code.gs` 的既有部署；瀏覽器仍只發出 1 次教材詳細頁請求。
- API 診斷頁會顯示每項請求耗時（ms）。

### 套用效能補丁

1. 在原本綁定試算表的 Apps Script，將 `gas/Code.gs` **整份取代**舊版。
2. 儲存後，進入「部署 → 管理部署作業 → 編輯」。
3. 版本選擇「新版本」，再按「部署」。原本 `/exec` 網址可以繼續使用，不必更換。
4. Sites 已部署版不必修改 `js/config.js`；若部署到其他靜態主機，再將 `gasApiUrl` 改回原本的 `/exec` 網址即可。
5. 開 `api-test.html?refresh=1` 檢查，畫面會顯示實際毫秒數。

> 若剛修改教材想立即略過瀏覽器暫存，可在網址後加 `?refresh=1`；一般家長瀏覽不需要。


這是第一階段可部署版本。核心目標是：**教師只維護 Google Sheets，網站自動呈現教材**。

## 已完成

- 首頁：本學期標示、兩大專區、最近閱讀、學年／學期／關鍵字搜尋
- 主題課程：YouTube、句型＋音檔、單字＋圖片＋音檔、遊戲、學習單、上一週／下一週、獨立分享網址
- 親子共讀：YouTube、句型音檔／說明／例句、單字音檔／圖片／說明／例句、上一本／下一本、獨立分享網址
- Google Sheets：7 張資料表（含 SiteSettings）
- Google Apps Script：公開唯讀教材 API、5 分鐘分層快取（編輯時自動失效）、延遲載入句型／單字全文搜尋索引
- 學習紀錄 v1：瀏覽次數、音檔播放、遊戲開啟、學習單開啟、完成狀態（目前存在瀏覽器 localStorage）
- 響應式版面：手機、平板、桌機
- 會員系統：已保留入口；第二階段接 Firebase Authentication / Firestore

## 網址規則

主題課程：

```text
course.html?id=115-1-W01
```

親子共讀：

```text
reading.html?id=115-1-B01
```

發布後 `course_id` / `book_id` 不要更改。

## 第一步：建立教材 Google Sheets

1. 建立一份新的 Google 試算表，例如「Minanam 教材資料庫」。
2. 開啟「擴充功能 → Apps Script」。
3. 將 `gas/Code.gs` 全部貼入並儲存。
4. 選擇函式 `setupSheets` → 執行 → 完成 Google 授權。
5. 程式會自動建立：

```text
SiteSettings
ThemeCourses
ThemeSentences
ThemeVocabulary
Storybooks
StorySentences
StoryVocabulary
```

如果不想執行初始化程式，也可參考 `sheet-templates/` 內的 CSV 欄位。

## 第二步：部署 GAS API

1. Apps Script 右上角「部署 → 新增部署作業」。
2. 類型選「網頁應用程式」。
3. 執行身分：我。
4. 存取權：任何人。
5. 複製 `/exec` 結尾網址。
6. 先測試：`你的網址?action=health`。

正常會回傳 `status: ok`。

## 第三步：網站接上 Google Sheets

打開 `js/config.js`：

```js
window.MINANAM_CONFIG = {
  siteName: 'Tafalong國小附設幼兒園｜阿美族語學習網',
  shortName: 'Minanam',
  gasApiUrl: 'https://script.google.com/macros/s/你的部署ID/exec',
  useDemoData: false,
  firebase: null
};
```

儲存後網站就會改讀 Google Sheets。

## Google Sheets 更新後

首頁教材清單有 5 分鐘快取。若要立即刷新，可在 Apps Script 手動執行：

```text
clearApiCache
```

單一課程與繪本內容不走這個清單快取。

## 媒體欄位

- `youtube_id`：只放影片 ID，不放整條 YouTube 網址。
- `audio_url` / `image_url`：必須是瀏覽器可以公開直接讀取的 HTTPS 網址。
- `worksheet_url`：可放公開 PDF 或 Google Drive 分享網址。
- `game_url`：放遊戲完整網址。

## 本機預覽

```bash
cd minanam-v1.1
python3 -m http.server 8080
```

再開 `http://localhost:8080`。

預設 `useDemoData: true`，所以還沒接 Google Sheets 也能看版面。

## 下一階段：會員與跨裝置學習歷程

預計接：

- Firebase Authentication：註冊、登入、登出
- 班級邀請碼／預先匯入學生名冊
- Firestore：瀏覽、音檔、遊戲、學習單、完成紀錄跨裝置同步
- 登入後首頁：只優先顯示該生本學期內容與個人進度
- 教師端：班級整體閱讀概況（不公開個人資料）

## 安全原則

目前 GAS API 只提供公開教材。不要在這 7 張公開教材表放學生姓名、學號、密碼、家長聯絡資料或學習歷程。會員資料會在第二階段放到 Firebase 並設定 Security Rules。

## 已接上的正式 Apps Script API（v1.2）

本版本的 `js/config.js` 已設定為：

`https://script.google.com/macros/s/AKfycbxWvUhMGansVw43XmadBtDJdNS4grdePLbN9fXW9VZ158tqmGZGC_9ggxLRX830W4A2MA/exec`

並已將 `useDemoData` 設為 `false`，網站會直接讀取 Google Sheets 資料。

### 先用 api-test.html 檢查

發布網站後，開啟 `api-test.html`。它會依序測試：

1. `health`：確認 Apps Script Web App 可公開讀取。
2. `settings`：確認 SiteSettings 工作表可讀取。
3. `library`：確認課程與繪本清單可讀取。
4. 第一筆教材：確認 course 或 book 詳細內容可讀取。

若剛修改 Apps Script 程式碼，請記得「管理部署作業 → 編輯 → 建立新版本 → 部署」。只修改 Google Sheets 教材內容則不需要重新部署；首頁 library 清單最多可能因快取延遲約 5 分鐘。
