/**
 * 阿美族語學習網 - 會員與認證系統 (auth.js)
 * 包含：登入、註冊、成績上傳、讀取等功能
 */

class AuthSystemClass {
    constructor() {
        // ★★★ 請務必將這裡換成您剛剛重新發布的 Google Apps Script 網址 ★★★
        this.API_URL = "https://script.google.com/macros/s/AKfycbxxxx_Your_API_URL_xxxx/exec"; 
        
        this.currentUser = null;
        this.init();
    }

    init() {
        // 檢查 localStorage 中是否有登入紀錄
        const savedUser = localStorage.getItem('amis_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateUIAfterLogin();
        }

        // 確保 DOM 載入後建立 Modal
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createModal());
        } else {
            this.createModal();
        }
    }

    // 建立登入/註冊的 UI 畫面 (Modal)
    createModal() {
        if (document.getElementById('auth-modal')) return;

        const modalHtml = `
            <div id="auth-modal" class="fixed inset-0 bg-black/50 z-[100] hidden items-center justify-center backdrop-blur-sm px-4">
                <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
                    
                    <div class="bg-sky-500 text-white p-6 text-center relative">
                        <h2 class="text-2xl font-bold" id="auth-title">登入學習網</h2>
                        <button onclick="AuthSystem.closeModal()" class="absolute top-4 right-4 text-white/80 hover:text-white text-xl">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="p-6">
                        <div class="flex mb-6 border-b-2 border-gray-100">
                            <button onclick="AuthSystem.switchTab('login')" id="tab-login" class="flex-1 pb-2 font-bold text-sky-500 border-b-2 border-sky-500">登入</button>
                            <button onclick="AuthSystem.switchTab('register')" id="tab-register" class="flex-1 pb-2 font-bold text-gray-400 hover:text-gray-600">註冊新帳號</button>
                        </div>

                        <div id="form-login" class="space-y-4">
                            <div class="mb-4">
                                <label class="block text-gray-700 text-sm font-bold mb-2">請選擇您的身分：</label>
                                <div class="flex gap-4">
                                    <label class="flex items-center cursor-pointer">
                                        <input type="radio" name="loginType" id="login-type-student" value="student" class="mr-2 text-sky-500 focus:ring-sky-500" checked onchange="AuthSystem.toggleLoginFields()">
                                        <span class="text-gray-700 font-bold">太巴塱附幼</span>
                                    </label>
                                    <label class="flex items-center cursor-pointer">
                                        <input type="radio" name="loginType" id="login-type-public" value="public" class="mr-2 text-sky-500 focus:ring-sky-500" onchange="AuthSystem.toggleLoginFields()">
                                        <span class="text-gray-700">一般民眾</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label id="login-id-label" class="block text-gray-700 text-sm font-bold mb-2">座號</label>
                                <input type="text" id="login-id" class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition" placeholder="請輸入座號 (例如: 01)">
                            </div>
                            
                            <div id="login-password-container" style="display: none;">
                                <label class="block text-gray-700 text-sm font-bold mb-2">密碼</label>
                                <input type="password" id="login-password" class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 outline-none transition" placeholder="請輸入密碼">
                            </div>

                            <button onclick="AuthSystem.handleLogin()" id="btn-login" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-xl transition shadow-md mt-4 flex justify-center items-center">
                                <span>登入</span>
                            </button>
                        </div>

                        <div id="form-register" class="space-y-3 hidden">
                            <div>
                                <label class="block text-gray-700 text-sm font-bold mb-1">帳號</label>
                                <input type="text" id="reg-id" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-sky-500 outline-none" placeholder="設定登入帳號">
                            </div>
                            <div>
                                <label class="block text-gray-700 text-sm font-bold mb-1">密碼</label>
                                <input type="password" id="reg-password" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-sky-500 outline-none" placeholder="設定密碼">
                            </div>
                            <div>
                                <label class="block text-gray-700 text-sm font-bold mb-1">真實姓名 / 暱稱</label>
                                <input type="text" id="reg-name" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-sky-500 outline-none" placeholder="您在網站上的顯示名稱">
                            </div>
                            
                            <div>
                                <label class="block text-gray-700 text-sm font-bold mb-1">族別</label>
                                <select id="reg-tribe" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-sky-500 outline-none bg-white">
                                    <option value="">請選擇族別...</option>
                                    <option value="阿美族">阿美族 (Amis)</option>
                                    <option value="泰雅族">泰雅族 (Atayal)</option>
                                    <option value="排灣族">排灣族 (Paiwan)</option>
                                    <option value="布農族">布農族 (Bunun)</option>
                                    <option value="太魯閣族">太魯閣族 (Truku)</option>
                                    <option value="卑南族">卑南族 (Puyuma)</option>
                                    <option value="其他原住民族">其他原住民族</option>
                                    <option value="非原住民族">非原住民族</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-gray-700 text-sm font-bold mb-1">出生年月</label>
                                <input type="month" id="reg-birth" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-sky-500 outline-none text-gray-600">
                            </div>

                            <button onclick="AuthSystem.handleRegister()" id="btn-register" class="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition shadow-md mt-4 flex justify-center items-center">
                                <span>註冊</span>
                            </button>
                        </div>

                    </div>
                </div>
            </div>

            <div id="user-widget" class="fixed bottom-4 right-4 z-40 hidden">
                <div class="bg-white rounded-full shadow-lg border border-gray-200 p-2 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition" onclick="AuthSystem.logout()">
                    <div class="w-10 h-10 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center font-bold">
                        <i class="fa-solid fa-user"></i>
                    </div>
                    <div class="pr-4">
                        <div class="text-xs text-gray-400">登入中</div>
                        <div class="font-bold text-sm text-gray-700" id="widget-username">Name</div>
                    </div>
                    <div class="pr-2 text-gray-400 hover:text-red-500" title="登出">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // 切換登入身分的欄位顯示
    toggleLoginFields() {
        const isStudent = document.getElementById('login-type-student').checked;
        const pwdContainer = document.getElementById('login-password-container');
        const idLabel = document.getElementById('login-id-label');
        const idInput = document.getElementById('login-id');

        if (isStudent) {
            pwdContainer.style.display = 'none';
            idLabel.innerText = '座號';
            idInput.placeholder = '請輸入座號 (例如: 01)';
        } else {
            pwdContainer.style.display = 'block';
            idLabel.innerText = '帳號';
            idInput.placeholder = '請輸入帳號';
        }
    }

    showLoginModal() {
        document.getElementById('auth-modal').classList.remove('hidden');
        document.getElementById('auth-modal').classList.add('flex');
    }

    closeModal() {
        document.getElementById('auth-modal').classList.add('hidden');
        document.getElementById('auth-modal').classList.remove('flex');
    }

    switchTab(tab) {
        if (tab === 'login') {
            document.getElementById('form-login').classList.remove('hidden');
            document.getElementById('form-register').classList.add('hidden');
            document.getElementById('tab-login').className = "flex-1 pb-2 font-bold text-sky-500 border-b-2 border-sky-500";
            document.getElementById('tab-register').className = "flex-1 pb-2 font-bold text-gray-400 hover:text-gray-600 border-b-2 border-transparent";
            document.getElementById('auth-title').innerText = "登入學習網";
        } else {
            document.getElementById('form-login').classList.add('hidden');
            document.getElementById('form-register').classList.remove('hidden');
            document.getElementById('tab-register').className = "flex-1 pb-2 font-bold text-orange-500 border-b-2 border-orange-500";
            document.getElementById('tab-login').className = "flex-1 pb-2 font-bold text-gray-400 hover:text-gray-600 border-b-2 border-transparent";
            document.getElementById('auth-title').innerText = "註冊新帳號";
        }
    }

    // ==========================================
    // 登入邏輯
    // ==========================================
    async handleLogin() {
        const isStudent = document.getElementById('login-type-student').checked;
        const userID = document.getElementById('login-id').value.trim();
        let password = document.getElementById('login-password').value.trim();

        if (!userID) {
            alert(isStudent ? "請輸入座號！" : "請輸入帳號！");
            return;
        }

        // 如果是附幼學生，自動將密碼設定為跟座號一樣
        if (isStudent) {
            password = userID; 
        } else if (!password) {
            alert("請輸入密碼！");
            return;
        }

        const btn = document.getElementById('btn-login');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 登入中...';
        btn.disabled = true;

        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "login",
                    userID: userID,
                    password: password
                })
            });

            const result = await response.json();
            
            if (result.status === "success" || result.result === "success") {
                this.currentUser = {
                    userID: userID,
                    name: result.name || "同學",
                    role: result.role || (isStudent ? "student" : "public")
                };
                localStorage.setItem('amis_user', JSON.stringify(this.currentUser));
                this.updateUIAfterLogin();
                this.closeModal();
                alert(`Nga'ay ho! 歡迎回來，${this.currentUser.name}！`);
                
                // 如果在首頁，重新載入貼紙
                if (typeof loadStickers === 'function') loadStickers();
                
            } else {
                alert("登入失敗：" + (result.message || "帳號或密碼錯誤。如果是學生，請確認座號是否正確。"));
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert("系統連線發生錯誤，請稍後再試。如果您尚未設定 API，請確認 auth.js 中的 API_URL。");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    // ==========================================
    // 註冊邏輯
    // ==========================================
    async handleRegister() {
        const userID = document.getElementById('reg-id').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const name = document.getElementById('reg-name').value.trim();
        const tribe = document.getElementById('reg-tribe').value;
        const birthDate = document.getElementById('reg-birth').value;

        if (!userID || !password || !name) {
            alert("帳號、密碼、姓名為必填欄位喔！");
            return;
        }

        const btn = document.getElementById('btn-register');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 註冊中...';
        btn.disabled = true;

        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "register",
                    userID: userID,
                    password: password,
                    name: name,
                    tribe: tribe,         
                    birthDate: birthDate  
                })
            });

            const result = await response.json();
            
            if (result.status === "success" || result.result === "success") {
                alert("註冊成功！請使用新帳號登入。");
                this.switchTab('login');
                // 將註冊的帳號自動帶入一般民眾的登入框
                document.getElementById('login-type-public').click();
                document.getElementById('login-id').value = userID;
            } else {
                alert("註冊失敗：" + (result.message || "帳號可能已存在。"));
            }
        } catch (error) {
            console.error("Register Error:", error);
            alert("系統連線發生錯誤。如果您尚未設定 API，請確認 auth.js 中的 API_URL。");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    logout() {
        if(confirm("確定要登出嗎？")) {
            this.currentUser = null;
            localStorage.removeItem('amis_user');
            location.reload(); // 重新整理頁面
        }
    }

    updateUIAfterLogin() {
        if (!this.currentUser) return;
        
        // 更新右下角小工具
        const widget = document.getElementById('user-widget');
        if (widget) {
            widget.classList.remove('hidden');
            document.getElementById('widget-username').innerText = this.currentUser.name;
        }

        // 更新頂部導覽列的使用者名稱
        const headerLoginBtn = document.getElementById('header-login-btn');
        const headerUserInfo = document.getElementById('header-user-info');
        const headerUsername = document.getElementById('header-username');
        
        if (headerLoginBtn) {
            headerLoginBtn.classList.add('hidden');
        }
        if (headerUserInfo) {
            headerUserInfo.classList.remove('hidden');
            headerUserInfo.classList.add('flex');
        }
        if (headerUsername) {
            headerUsername.innerText = this.currentUser.name;
        }

        // 更新首頁專屬的成就與貼紙區塊
        const stickerSection = document.getElementById('sticker-section');
        const achieveSection = document.getElementById('achievement-section');
        const nameDisplay = document.getElementById('user-name-display');
        
        if (stickerSection) stickerSection.classList.remove('hidden');
        if (achieveSection) {
            achieveSection.classList.remove('hidden');
            achieveSection.classList.add('flex');
        }
        if (nameDisplay) nameDisplay.innerText = this.currentUser.name;
    }

    // ==========================================
    // 遊戲成績上傳邏輯
    // ==========================================
    async submitScore(gameID, score) {
        if (!this.currentUser) return false;

        try {
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "submitScore",
                    userID: this.currentUser.userID,
                    gameID: gameID,
                    score: score
                })
            });

            const result = await response.json();
            if (result.status === "success" || result.result === "success") {
                console.log("成績上傳成功");
                return true;
            } else {
                console.warn("成績上傳失敗:", result.message);
                return false;
            }
        } catch (error) {
            console.error("Submit Score Error:", error);
            return false;
        }
    }

    // ==========================================
    // 結業證書邏輯 (需要 jspdf 與 html2canvas)
    // ==========================================
    async checkAndDownloadCertificate() {
        if (!this.currentUser) {
            this.showLoginModal();
            return;
        }

        // 提示檢查中
        const btn = document.querySelector('#achievement-section button');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>檢查資格中...';
        btn.disabled = true;

        try {
            // 抓取成績
            const response = await fetch(this.API_URL, {
                method: "POST",
                mode: "cors",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({
                    action: "getScores",
                    userID: this.currentUser.userID
                })
            });
            
            const data = await response.json();
            
            // 計算過關數量
            let passedCount = 0;
            let totalGames = 0;
            
            if (typeof appConfig !== 'undefined' && appConfig.stickers) {
                totalGames = appConfig.stickers.length;
                appConfig.stickers.forEach(s => {
                    if (data.scores && data.scores[s.id] >= 60) {
                        passedCount++;
                    }
                });
            } else if (data.scores) {
                passedCount = Object.values(data.scores).filter(s => s >= 60).length;
                totalGames = 1; 
            }

            if (passedCount > 0 && passedCount >= totalGames) {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>製作證書中...';
                await this.generatePDF(this.currentUser.name);
                btn.innerHTML = originalHtml;
            } else {
                alert(`還差一點點喔！\n你目前收集了 ${passedCount} 張貼紙，需要 ${totalGames} 張才能領取證書。繼續加油！`);
                btn.innerHTML = originalHtml;
            }

        } catch (e) {
            console.error(e);
            alert("無法檢查成績，請稍後再試。");
            btn.innerHTML = originalHtml;
        } finally {
            btn.disabled = false;
        }
    }

    async generatePDF(studentName) {
        const template = document.getElementById('certificate-template');
        if (!template) {
            alert("找不到證書模板，請確認 index.html 包含模板代碼。");
            return;
        }

        document.getElementById('cert-student-name').innerText = studentName;
        const today = new Date();
        document.getElementById('cert-date').innerText = `${today.getFullYear()} 年 ${today.getMonth() + 1} 月 ${today.getDate()} 日`;

        template.style.zIndex = "1000";
        template.style.top = "0";
        template.style.left = "0";

        try {
            const { jsPDF } = window.jspdf;
            
            const canvas = await html2canvas(template, { 
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${studentName}_太巴塱附幼族語結業證書.pdf`);
            
        } catch (error) {
            console.error("PDF 產生失敗:", error);
            alert("產生證書時發生錯誤，請稍後再試。");
        } finally {
            template.style.top = "-9999px";
            template.style.left = "-9999px";
            template.style.zIndex = "-1";
        }
    }
}

// 實例化全域物件
const AuthSystem = new AuthSystemClass();
