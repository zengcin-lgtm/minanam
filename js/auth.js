/**
 * 阿美族語學習網 - 會員與成績系統
 * * 使用方式：
 * 1. 在每個網頁的 </body> 前面加入 <script src="../js/auth.js"></script>
 * (注意路徑：如果在根目錄用 ./js/auth.js，在子目錄用 ../js/auth.js)
 * 2. 在 auth.js 第 11 行填入您的 Google Apps Script 網址
 */

const AuthSystem = {
    // ★★★ 請將這裡換成您剛剛部署拿到的網址 ★★★
    API_URL: "https://script.google.com/macros/s/AKfycbzihyxv1NyH1IgBF8kWBVXLNE1-FVETTYxy-6Y49te7DTULQj5cZeDe6BLtBadEvk44/exec",

    // 當前使用者資料
    currentUser: null,

    // 初始化
    init: function() {
        this.checkLoginStatus();
        this.injectStyles();
        // 等待網頁載入完成後再繪製介面，避免找不到元素
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.renderUI());
        } else {
            this.renderUI();
        }
    },

    // 檢查是否已登入 (讀取瀏覽器記憶體)
    checkLoginStatus: function() {
        const savedUser = localStorage.getItem('amis_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            console.log("歡迎回來:", this.currentUser.name);
        }
    },

    // 登入功能
    login: async function(userID, password) {
        this.showLoading("登入中...");
        
        try {
            // 使用特殊的 fetch 設定來配合 Google Apps Script
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors", // 跨網域請求
                redirect: "follow",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8" // GAS 比較喜歡 text/plain
                },
                body: JSON.stringify({
                    action: "login",
                    userID: userID,
                    password: password
                })
            });

            const data = await response.json();

            if (data.status === "success") {
                // 登入成功，儲存資料
                this.currentUser = {
                    userID: data.userID,
                    name: data.name
                };
                localStorage.setItem('amis_user', JSON.stringify(this.currentUser));
                
                alert(`登入成功！歡迎 ${data.name} 同學`);
                this.closeModal();
                this.renderUI(); // 更新介面
                return true;
            } else {
                alert("登入失敗：" + data.message);
                return false;
            }
        } catch (error) {
            console.error(error);
            alert("連線錯誤，請檢查網路或網址是否正確");
        } finally {
            this.hideLoading();
        }
    },

    // 登出功能
    logout: function() {
        if(confirm("確定要登出嗎？")) {
            localStorage.removeItem('amis_user');
            this.currentUser = null;
            this.renderUI();
            alert("已登出");
        }
    },

    // 上傳分數 (遊戲結束時呼叫此函式)
    // gameId 例如: "game1", "game14"
    submitScore: async function(gameId, score) {
        if (!this.currentUser) {
            alert("請先登入才能儲存成績喔！");
            this.showLoginModal();
            return;
        }

        // 簡單的防呆，分數需大於 0
        if (score <= 0) return;

        this.showLoading("正在儲存成績...");

        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "updateScore",
                    userID: this.currentUser.userID,
                    gameId: gameId,
                    score: score
                })
            });
            
            const data = await response.json();
            if(data.status === "success") {
                // 使用 toast 提示比較不干擾
                this.showToast(`成績已上傳！(${score}分)`);
            } else {
                console.error("上傳失敗", data);
            }

        } catch (e) {
            console.error("上傳成績錯誤", e);
            this.showToast("網路不穩，成績暫時無法上傳");
        } finally {
            this.hideLoading();
        }
    },

    // ===========================================
    // 下面是處理畫面 (UI) 的程式碼，不用修改
    // ===========================================

    // 1. 自動在網頁右上角加入按鈕
    renderUI: function() {
        // 移除舊的按鈕 (避免重複)
        const oldBtn = document.getElementById('amis-auth-btn');
        if (oldBtn) oldBtn.remove();

        // 建立容器
        const container = document.createElement('div');
        container.id = 'amis-auth-btn';
        container.style.cssText = "position: fixed; top: 15px; right: 15px; z-index: 9999;";

        if (this.currentUser) {
            // 已登入狀態
            container.innerHTML = `
                <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-yellow-400">
                    <div class="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
                        ${this.currentUser.name[0]}
                    </div>
                    <span class="font-bold text-gray-700 hidden md:inline">${this.currentUser.name}</span>
                    <button onclick="AuthSystem.logout()" class="text-xs text-red-500 hover:underline ml-2">登出</button>
                </div>
            `;
        } else {
            // 未登入狀態
            container.innerHTML = `
                <button onclick="AuthSystem.showLoginModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg font-bold transition flex items-center gap-2">
                    <i class="fa-solid fa-user"></i> 學生登入
                </button>
            `;
        }

        document.body.appendChild(container);
    },

    // 2. 顯示登入視窗
    showLoginModal: function() {
        // 如果已經有視窗就不要再開
        if (document.getElementById('amis-login-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'amis-login-modal';
        modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] backdrop-blur-sm";
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all scale-100 relative">
                <button onclick="AuthSystem.closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <i class="fa-solid fa-xmark text-xl"></i>
                </button>
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                        <i class="fa-solid fa-user-graduate text-3xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-800">學生登入</h3>
                    <p class="text-gray-500 text-sm">請輸入老師給你的座號密碼</p>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">座號 / 帳號</label>
                        <input type="text" id="login-id" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="例如: s01">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">密碼</label>
                        <input type="password" id="login-pwd" class="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" placeholder="輸入密碼">
                    </div>
                    <button onclick="AuthSystem.handleLoginClick()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow transition transform active:scale-95">
                        登入系統
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeModal: function() {
        const modal = document.getElementById('amis-login-modal');
        if (modal) modal.remove();
    },

    handleLoginClick: function() {
        const id = document.getElementById('login-id').value;
        const pwd = document.getElementById('login-pwd').value;
        if (!id || !pwd) {
            alert("請輸入完整的帳號密碼");
            return;
        }
        this.login(id, pwd);
    },

    // 3. 載入中提示
    showLoading: function(msg) {
        const loader = document.createElement('div');
        loader.id = 'amis-loader';
        loader.className = "fixed inset-0 bg-black/30 z-[10001] flex items-center justify-center text-white font-bold flex-col";
        loader.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i>
            <div>${msg}</div>
        `;
        document.body.appendChild(loader);
    },

    hideLoading: function() {
        const loader = document.getElementById('amis-loader');
        if (loader) loader.remove();
    },
    
    // 4. 小提示 Toast
    showToast: function(msg) {
        const toast = document.createElement('div');
        toast.className = "fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-[10002] transition-opacity duration-500 flex items-center gap-2";
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-green-400"></i> ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    },

    // 5. 注入必要的 CSS (如果網頁沒引用 Tailwind 或 FontAwesome，這裡可以補救一點)
    injectStyles: function() {
        // 這裡可以動態加入一些共用的 CSS，目前依賴 Tailwind
    }
};

// 啟動系統
AuthSystem.init();
