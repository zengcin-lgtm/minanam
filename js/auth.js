/**
 * 阿美族語學習網 - 會員與成績系統 (v2.2 證書功能修復版)
 */

const AuthSystem = {
    // ★★★ 請填入您的 Google Apps Script 網址 ★★★
    API_URL: "https://script.google.com/macros/s/AKfycbzihyxv1NyH1IgBF8kWBVXLNE1-FVETTYxy-6Y49te7DTULQj5cZeDe6BLtBadEvk44/exec",

    currentUser: null,

    init: function() {
        console.log("AuthSystem v2.2 初始化中..."); 
        this.checkLoginStatus();
        this.injectStyles();
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.renderUI());
        } else {
            this.renderUI();
        }
    },

    checkLoginStatus: function() {
        const savedUser = localStorage.getItem('amis_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
            } catch (e) {
                console.error("使用者資料損毀，重置登入狀態");
                localStorage.removeItem('amis_user');
            }
        }
    },

    // ... (login, logout, submitScore, handleAuthSuccess 等功能保持不變，省略以節省篇幅，請保留原有的程式碼) ...
    // 若您需要完整的 auth.js，請告訴我，我再貼一次完整的。
    // 這裡我只列出有修改的 checkAndDownloadCertificate 函式。

    login: async function(userID, password) {
        this.showLoading("登入中...");
        try {
            console.log(`準備登入: ${userID}`);
            
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "login", userID: userID, password: password })
            });

            const text = await response.text();
            console.log("GAS 原始回傳:", text);

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                console.error("JSON 解析失敗", e);
                alert("伺服器錯誤：回傳格式不正確 (可能是 HTML 錯誤頁面)。\n請檢查 GAS 部署設定。");
                return false;
            }

            if (data.status === "success" || data.result === "success") {
                this.handleAuthSuccess(data);
                return true;
            } else {
                const msg = data.message ? data.message : "未知錯誤 (無錯誤訊息)";
                alert("登入失敗：" + msg);
                return false;
            }
        } catch (error) {
            console.error("連線過程發生錯誤:", error);
            alert("連線錯誤：無法連接到 Google 伺服器。\n請檢查網路，或確認 GAS 網址正確。");
        } finally {
            this.hideLoading();
        }
    },

    // ★★★ 新增：註冊功能 ★★★
    register: async function(userID, password, name) {
        this.showLoading("正在建立帳號...");
        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ 
                    action: "register", 
                    userID: userID, 
                    password: password,
                    name: name
                })
            });

            const text = await response.text();
            const data = JSON.parse(text);

            if (data.status === "success" || data.result === "success") {
                alert("註冊成功！自動為您登入。");
                this.handleAuthSuccess(data); // 註冊成功後直接登入
                return true;
            } else {
                alert("註冊失敗：" + (data.message || "帳號可能已重複"));
                return false;
            }
        } catch (error) {
            console.error(error);
            alert("連線錯誤，請檢查網路。");
        } finally {
            this.hideLoading();
        }
    },

    // 登入/註冊成功後的共用處理
    handleAuthSuccess: function(data) {
        this.currentUser = { userID: data.userID, name: data.name };
        localStorage.setItem('amis_user', JSON.stringify(this.currentUser));
        this.closeModal();
        this.renderUI();
        if(location.pathname.endsWith('index.html') || location.pathname.endsWith('/')) {
            setTimeout(() => location.reload(), 500);
        }
    },

    logout: function() {
        if(confirm("確定要登出嗎？")) {
            localStorage.removeItem('amis_user');
            this.currentUser = null;
            this.renderUI();
            location.reload();
        }
    },

    submitScore: async function(gameId, score) {
        if (!this.currentUser) {
            alert("請先登入才能儲存成績喔！");
            this.showLoginModal();
            return;
        }
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
            
            const text = await response.text();
            const data = JSON.parse(text);

            if(data.status === "success" || data.result === "success") {
                this.showToast(`成績已上傳！(${score}分)`);
            } else {
                 this.showToast("成績上傳失敗：" + (data.message || "未知錯誤"));
            }
        } catch (e) {
            this.showToast("成績上傳失敗 (連線錯誤)");
        } finally {
            this.hideLoading();
        }
    },

    // ★★★ 重點修改：檢查證書功能 ★★★
    checkAndDownloadCertificate: async function() {
        if (!this.currentUser) {
            alert("請先登入！");
            return;
        }

        // 更新 UI 顯示「檢查中」
        const progressText = document.getElementById('progress-text');
        if(progressText) progressText.innerText = "連線檢查中...";

        this.showLoading("正在向學校主機確認成績...");

        try {
            // 呼叫 GAS
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "getScores",
                    userID: this.currentUser.userID
                })
            });

            const text = await response.text();
            console.log("查詢成績回傳:", text); // Debug 用

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error("伺服器回傳格式錯誤: " + text);
            }

            // 處理結果
            if (data.status === "success" || data.result === "success") {
                if (data.allPassed) {
                    if(progressText) progressText.innerText = "已完成所有關卡！";
                    this.hideLoading(); // 關閉讀取畫面
                    if(confirm("恭喜你！所有關卡都通過了！\n是否要現在下載證書？")) {
                        this.generatePDF();
                    }
                } else {
                    if(progressText) progressText.innerText = "尚未完成所有關卡";
                    
                    // 顯示未完成的項目
                    let msg = "很可惜，還有遊戲未完成或未達 60 分喔！\n";
                    if (data.scores) {
                        const passedCount = Object.values(data.scores).filter(s => s >= 60).length;
                        const totalCount = Object.keys(data.scores).length; // 這是目前有紀錄的，不一定是全部
                        msg += `\n目前進度：已通過 ${passedCount} 關`;
                    }
                    msg += "\n\n請繼續加油！";
                    alert(msg);
                }
            } else {
                if(progressText) progressText.innerText = "查詢失敗";
                alert("查詢失敗：" + (data.message || JSON.stringify(data)));
            }

        } catch (e) {
            console.error(e);
            if(progressText) progressText.innerText = "連線錯誤";
            alert("系統連線錯誤，無法查詢成績。\n請檢查網路或稍後再試。");
        } finally {
            this.hideLoading();
        }
    },

    generatePDF: function() {
        this.showLoading("正在印製證書 (PDF製作中)...");

        const template = document.getElementById('certificate-template');
        if (!template) {
            alert("找不到證書模板 (請確認你在首頁)");
            this.hideLoading();
            return;
        }

        document.getElementById('cert-student-name').innerText = this.currentUser.name;
        const today = new Date();
        document.getElementById('cert-date').innerText = `${today.getFullYear()} 年 ${today.getMonth()+1} 月 ${today.getDate()} 日`;

        // 暫時顯示模板以便截圖
        template.style.display = 'flex';
        template.style.opacity = '1'; // 確保可見

        html2canvas(template, {
            scale: 2, // 提高解析度
            useCORS: true, // 允許跨域圖片
            logging: true, // 開啟除錯日誌
            windowWidth: 1200, // 設定虛擬視窗寬度，避免跑版
            windowHeight: 900
        }).then(canvas => {
            // 隱藏回去
            template.style.display = 'none';

            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            
            // A4 橫向 (landscape)
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`阿美族語結業證書_${this.currentUser.name}.pdf`);

            this.hideLoading();
            this.showToast("證書下載成功！");
        }).catch(err => {
            console.error("PDF 製作失敗:", err);
            // 發生錯誤也要隱藏回去
            template.style.display = 'none';
            
            alert("證書製作失敗，請使用電腦版瀏覽器嘗試。\n錯誤訊息: " + err.message);
            this.hideLoading();
        });
    },

    // ... (renderUI, showLoginModal, closeModal, handleLoginClick, showLoading, hideLoading, showToast, injectStyles, switchAuthView, handleRegisterClick 等函式保持不變，省略以節省篇幅) ...
    // 請務必補上後面這些函式，或者直接使用您原本 auth.js 的這部分代碼。
    
    // 為了完整性，我把剩下的 UI 相關代碼也補上，確保您複製貼上不會漏掉
    renderUI: function() {
        const oldBtn = document.getElementById('amis-auth-btn');
        if (oldBtn) oldBtn.remove();

        const container = document.createElement('div');
        container.id = 'amis-auth-btn';
        container.style.cssText = "position: fixed; top: 15px; right: 15px; z-index: 9999;";

        if (this.currentUser) {
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
            container.innerHTML = `
                <button onclick="AuthSystem.showLoginModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg font-bold transition flex items-center gap-2">
                    <i class="fa-solid fa-user"></i> 學生登入
                </button>
            `;
        }
        document.body.appendChild(container);
    },

    showLoginModal: function(view = 'login') {
        if (document.getElementById('amis-login-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'amis-login-modal';
        modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] backdrop-blur-sm";
        
        // 渲染登入表單
        const loginForm = `
            <div id="auth-login-view">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><i class="fa-solid fa-user-graduate text-3xl"></i></div>
                    <h3 class="text-2xl font-bold text-gray-800">學生登入</h3>
                    <p class="text-gray-500 text-sm">輸入帳號密碼開始學習</p>
                </div>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">帳號 / 學號</label><input type="text" id="login-id" class="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" placeholder="例如: s01"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">密碼</label><input type="password" id="login-pwd" class="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" placeholder="輸入密碼"></div>
                    <button onclick="AuthSystem.handleLoginClick()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow">登入系統</button>
                    <div class="text-center mt-4">
                        <button onclick="AuthSystem.switchAuthView('register')" class="text-sm text-blue-600 hover:underline">還沒有帳號？註冊一個</button>
                    </div>
                </div>
            </div>
        `;

        // 渲染註冊表單
        const registerForm = `
            <div id="auth-register-view" style="display:none">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><i class="fa-solid fa-user-plus text-3xl"></i></div>
                    <h3 class="text-2xl font-bold text-gray-800">建立新帳號</h3>
                    <p class="text-gray-500 text-sm">請填寫您的資料</p>
                </div>
                <div class="space-y-3">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">您的姓名</label><input type="text" id="reg-name" class="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" placeholder="例如: 王小明"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">設定帳號</label><input type="text" id="reg-id" class="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" placeholder="請設定帳號 (英文數字)"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">設定密碼</label><input type="password" id="reg-pwd" class="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" placeholder="請設定密碼"></div>
                    <button onclick="AuthSystem.handleRegisterClick()" class="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow mt-2">立即註冊</button>
                    <div class="text-center mt-4">
                        <button onclick="AuthSystem.switchAuthView('login')" class="text-sm text-gray-500 hover:underline">已經有帳號？返回登入</button>
                    </div>
                </div>
            </div>
        `;

        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all scale-100 relative">
                <button onclick="AuthSystem.closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark text-xl"></i></button>
                ${loginForm}
                ${registerForm}
            </div>`;
        
        document.body.appendChild(modal);

        if (view === 'register') this.switchAuthView('register');
    },

    switchAuthView: function(view) {
        const loginView = document.getElementById('auth-login-view');
        const regView = document.getElementById('auth-register-view');
        if (view === 'register') {
            loginView.style.display = 'none';
            regView.style.display = 'block';
        } else {
            loginView.style.display = 'block';
            regView.style.display = 'none';
        }
    },

    closeModal: function() {
        const modal = document.getElementById('amis-login-modal');
        if (modal) modal.remove();
    },

    handleLoginClick: function() {
        const id = document.getElementById('login-id').value.trim();
        const pwd = document.getElementById('login-pwd').value.trim();
        if (!id || !pwd) { alert("請輸入完整的帳號密碼"); return; }
        this.login(id, pwd);
    },

    handleRegisterClick: function() {
        const name = document.getElementById('reg-name').value.trim();
        const id = document.getElementById('reg-id').value.trim();
        const pwd = document.getElementById('reg-pwd').value.trim();
        
        if (!name || !id || !pwd) { alert("所有欄位都必須填寫喔！"); return; }
        if (id.length < 3) { alert("帳號至少要 3 個字"); return; }
        
        this.register(id, pwd, name);
    },

    showLoading: function(msg) {
        const loader = document.createElement('div');
        loader.id = 'amis-loader';
        loader.className = "fixed inset-0 bg-black/30 z-[10001] flex items-center justify-center text-white font-bold flex-col";
        loader.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-4xl mb-3"></i><div>${msg}</div>`;
        document.body.appendChild(loader);
    },

    hideLoading: function() {
        const loader = document.getElementById('amis-loader');
        if (loader) loader.remove();
    },
    
    showToast: function(msg) {
        const toast = document.createElement('div');
        toast.className = "fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg z-[10002] transition-opacity duration-500 flex items-center gap-2";
        toast.innerHTML = `<i class="fa-solid fa-circle-check text-green-400"></i> ${msg}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
    },

    injectStyles: function() {}
};

AuthSystem.init();
