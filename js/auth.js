/**
 * 阿美族語學習網 - 會員與認證系統 (auth.js)
 * 包含：登入、註冊、成績上傳、讀取等功能
 */

class AuthSystemClass {
    constructor() {
        // ★★★ 請將這裡換成您 Google Apps Script 發布後的網址 ★★★
        this.API_URL = "https://script.google.com/macros/s/AKfycbzihyxv1NyH1IgBF8kWBVXLNE1-FVETTYxy-6Y49te7DTULQj5cZeDe6BLtBadEvk44/exec"; 
        
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
                    
                    <!-- 標題區 -->
                    <div class="bg-sky-500 text-white p-6 text-center relative">
                        <h2 class="text-2xl font-bold" id="auth-title">登入學習網</h2>
                        <button onclick="AuthSystem.closeModal()" class="absolute top-4 right-4 text-white/80 hover:text-white text-xl">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>

                    <div class="p-6">
                        <!-- 頁籤切換 -->
                        <div class="flex mb-6 border-b-2 border-gray-100">
                            <button onclick="AuthSystem.switchTab('login')" id="tab-login" class="flex-1 pb-2 font-bold text-sky-500 border-b-2 border-sky-500">登入</button>
                            <button onclick="AuthSystem.switchTab('register')" id="tab-register" class="flex-1 pb-2 font-bold text-gray-400 hover:text-gray-600">註冊新帳號</button>
                        </div>

                        <!-- ==================== 登入表單 ==================== -->
                        <div id="form-login" class="space-y-4">
                            <!-- 身分選擇 -->
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

                        <!-- ==================== 註冊表單 ==================== -->
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
                            
                            <!-- 新增：族別 -->
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

                            <!-- 新增：出生年月 -->
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

            <!-- 網頁右下角的使用者狀態小工具 -->
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
        document.getElementById('aut
