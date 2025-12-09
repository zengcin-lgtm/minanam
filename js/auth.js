/**
 * 阿美族語學習網 - 會員與成績系統 (含證書功能)
 */

const AuthSystem = {
    // ★★★ 請填入您的 Google Apps Script 網址 ★★★
    API_URL: "https://script.google.com/macros/s/AKfycbzFjVMXS3U9FYOu4h8QdZXw4NeeAIrNXoAmowBBYb5DR17cAiPyMnwF9FrASgromhu9vQ/exec",

    currentUser: null,

    init: function() {
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
            this.currentUser = JSON.parse(savedUser);
        }
    },

    login: async function(userID, password) {
        this.showLoading("登入中...");
        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                redirect: "follow",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "login", userID: userID, password: password })
            });

            const data = await response.json();
            
            // ★★★ Debug: 在控制台顯示伺服器回傳的內容 ★★★
            console.log("GAS Response:", data);

            if (data.status === "success") {
                this.currentUser = { userID: data.userID, name: data.name };
                localStorage.setItem('amis_user', JSON.stringify(this.currentUser));
                alert(`登入成功！歡迎 ${data.name} 同學`);
                this.closeModal();
                this.renderUI();
                // 如果在首頁，重新整理以顯示成就區塊
                if(location.pathname.endsWith('index.html') || location.pathname.endsWith('/')) {
                    location.reload();
                }
                return true;
            } else {
                // ★★★ 修改：如果沒有 message，顯示完整資料以便除錯 ★★★
                const errorMsg = data.message || ("系統未回傳錯誤訊息 (可能是 GAS 未更新版本): " + JSON.stringify(data));
                alert("登入失敗：" + errorMsg);
                return false;
            }
        } catch (error) {
            console.error(error);
            alert("連線錯誤：請確認 Google Apps Script 部署權限是否為「所有人 (Anyone)」。");
        } finally {
            this.hideLoading();
        }
    },

    logout: function() {
        if(confirm("確定要登出嗎？")) {
            localStorage.removeItem('amis_user');
            this.currentUser = null;
            this.renderUI();
            location.reload(); // 登出後重新整理
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
            const data = await response.json();
            if(data.status === "success") this.showToast(`成績已上傳！(${score}分)`);
            else {
                 console.error("上傳失敗:", data);
                 this.showToast("成績上傳失敗：" + (data.message || "未知錯誤"));
            }
        } catch (e) {
            console.error(e);
            this.showToast("成績上傳失敗 (連線錯誤)");
        } finally {
            this.hideLoading();
        }
    },

    // ===========================================
    // ★★★ 新增：檢查資格與下載證書 ★★★
    // ===========================================
    checkAndDownloadCertificate: async function() {
        if (!this.currentUser) {
            alert("請先登入！");
            return;
        }

        this.showLoading("正在向學校主機確認成績...");

        try {
            // 1. 呼叫 GAS 檢查成績
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

            const data = await response.json();

            // 2. 判斷結果
            if (data.status === "success") {
                if (data.allPassed) {
                    // 資格符合，開始製作證書
                    this.hideLoading(); // 先關掉讀取畫面
                    if(confirm("恭喜你！所有關卡都通過了！\n是否要現在下載證書？")) {
                        this.generatePDF();
                    }
                } else {
                    // 計算還差幾個
                    let failList = [];
                    // 簡單檢查機制
                    if (data.scores) {
                        for(const [game, score] of Object.entries(data.scores)) {
                            if(score < 60) failList.push(game);
                        }
                    }
                    alert(`很可惜，還有遊戲未完成或未達 60 分喔！\n請繼續加油！`);
                }
            } else {
                alert("查詢失敗：" + (data.message || JSON.stringify(data)));
            }

        } catch (e) {
            console.error(e);
            alert("系統連線錯誤，無法查詢成績。");
        } finally {
            this.hideLoading();
        }
    },

    // 製作 PDF 的核心函式
    generatePDF: function() {
        this.showLoading("正在印製證書 (PDF製作中)...");

        // 1. 填入資料到隱藏模板
        const template = document.getElementById('certificate-template');
        if (!template) {
            alert("找不到證書模板 (請確認你在首頁)");
            this.hideLoading();
            return;
        }

        document.getElementById('cert-student-name').innerText = this.currentUser.name;
        const today = new Date();
        document.getElementById('cert-date').innerText = `${today.getFullYear()} 年 ${today.getMonth()+1} 月 ${today.getDate()} 日`;

        // 2. 使用 html2canvas 截圖
        // 為了讓截圖正確，我們暫時把模板顯示出來 (但在螢幕外)
        template.style.display = 'flex';

        html2canvas(template, {
            scale: 2, // 提高解析度
            useCORS: true // 允許跨域圖片
        }).then(canvas => {
            // 3. 轉成 PDF
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
            console.error(err);
            alert("證書製作失敗，請使用電腦版瀏覽器嘗試。");
            this.hideLoading();
        });
    },

    // ===========================================
    // UI 相關程式碼
    // ===========================================
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

    showLoginModal: function() {
        if (document.getElementById('amis-login-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'amis-login-modal';
        modal.className = "fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] backdrop-blur-sm";
        modal.innerHTML = `
            <div class="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all scale-100 relative">
                <button onclick="AuthSystem.closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><i class="fa-solid fa-xmark text-xl"></i></button>
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600"><i class="fa-solid fa-user-graduate text-3xl"></i></div>
                    <h3 class="text-2xl font-bold text-gray-800">學生登入</h3>
                    <p class="text-gray-500 text-sm">請輸入老師給你的座號密碼</p>
                </div>
                <div class="space-y-4">
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">座號 / 帳號</label><input type="text" id="login-id" class="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" placeholder="例如: s01"></div>
                    <div><label class="block text-sm font-medium text-gray-700 mb-1">密碼</label><input type="password" id="login-pwd" class="w-full px-4 py-3 rounded-lg border border-gray-300 outline-none" placeholder="輸入密碼"></div>
                    <button onclick="AuthSystem.handleLoginClick()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow">登入系統</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    },

    closeModal: function() {
        const modal = document.getElementById('amis-login-modal');
        if (modal) modal.remove();
    },

    handleLoginClick: function() {
        const id = document.getElementById('login-id').value;
        const pwd = document.getElementById('login-pwd').value;
        if (!id || !pwd) { alert("請輸入完整的帳號密碼"); return; }
        this.login(id, pwd);
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
