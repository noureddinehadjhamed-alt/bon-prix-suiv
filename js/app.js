// Main Application Controller & UI Logic with Full RBAC Security, Login, Role Approvals & AI Features
let authTab = "login"; // 'login' or 'register'
let activeTab = "dashboard"; // admin tabs: dashboard, products, orders, reps, deliveryRates, users, driverLog
                             // rep tabs: newOrder, catalog, myOrders
                             // driver tabs: driverOrders, driverEarnings
let currentFilterStatus = "all";
let searchQuery = "";
let deliverySearchQuery = "";
let userSearchQuery = "";

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  renderApp();

  // Listen to store changes
  window.store.subscribe(() => {
    renderApp();
  });
});

function switchTab(tab) {
  activeTab = tab;
  renderApp();
}

function switchAuthTab(tab) {
  authTab = tab;
  renderApp();
}

// Render the entire app UI based on authentication & assigned role
function renderApp() {
  const root = document.getElementById("app-root");
  if (!root) return;

  const currentUser = window.store.getCurrentUser();

  // 1. If not logged in -> Show Auth Screen (Login / Register)
  if (!currentUser) {
    root.innerHTML = renderAuthScreen();
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // 2. If user is pending admin approval -> Show Waiting Screen
  if (currentUser.status === "pending" || currentUser.role === "pending") {
    root.innerHTML = renderPendingScreen(currentUser);
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // 3. If user is rejected -> Show Rejected Screen
  if (currentUser.status === "rejected" || currentUser.role === "rejected") {
    root.innerHTML = renderRejectedScreen(currentUser);
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // 4. Authenticated & Approved User -> Show role-specific interface ONLY!
  root.innerHTML = `
    <!-- Top Header with User Info & Logout -->
    ${renderHeader(currentUser)}

    <!-- Main Container (Strictly isolated by role) -->
    <main class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-24 md:pb-8">
      ${renderRoleView(currentUser)}
    </main>

    <!-- Mobile Floating Action Button (FAB) for Admin to Add Product -->
    ${currentUser.role === 'admin' ? `
      <div class="fixed bottom-20 left-4 z-40 md:hidden">
        <button onclick="openAddProductModal()" class="bg-red-600 hover:bg-red-700 text-white font-bold p-3.5 rounded-full shadow-2xl flex items-center gap-2 transition-transform active:scale-95 border-2 border-white">
          <i data-lucide="plus" class="w-6 h-6"></i>
          <span class="text-xs font-bold pl-1">إضافة منتج</span>
        </button>
      </div>
    ` : ''}

    <!-- Mobile Bottom Navigation -->
    ${renderMobileBottomNav(currentUser)}

    <!-- Modal Container -->
    <div id="modal-container"></div>
    <div id="toast-container" class="fixed bottom-20 md:bottom-5 left-5 z-50 flex flex-col gap-2"></div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ==========================================
// AUTHENTICATION & REGISTRATION SCREENS
// ==========================================
function renderAuthScreen() {
  return `
    <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-fade-in">
        
        <!-- Header Branding -->
        <div class="p-6 bg-slate-50 border-b border-slate-100 text-center">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden flex items-center justify-center p-1 mb-3">
            <img src="./assets/logo.jpg" alt="Bon Prix Suiv" class="w-full h-full object-contain" />
          </div>
          <h1 class="text-xl font-black text-red-600">Bon Prix Suiv</h1>
          <p class="text-xs text-slate-500 mt-1">نظام تسيير المخزون، المندوبات والتوصيل</p>
        </div>

        <!-- Auth Tabs (Login vs Register) -->
        <div class="flex border-b border-slate-200">
          <button onclick="switchAuthTab('login')" class="flex-1 py-3 text-xs sm:text-sm font-bold text-center transition-all ${authTab === 'login' ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}">
            تسجيل الدخول
          </button>
          <button onclick="switchAuthTab('register')" class="flex-1 py-3 text-xs sm:text-sm font-bold text-center transition-all ${authTab === 'register' ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}">
            إنشاء حساب جديد
          </button>
        </div>

        <!-- Tab Body -->
        <div class="p-6">
          ${authTab === 'login' ? renderLoginForm() : renderRegisterForm()}
        </div>

        

      </div>

      <p class="text-xs text-slate-400 mt-4 text-center">تطبيق آمن مع نظام صلاحيات صارم - لا يمكن لأي مستخدم رؤية بيانات غير مخصصة له.</p>
    </div>
    <div id="modal-container"></div>
    <div id="toast-container" class="fixed bottom-5 left-5 z-50 flex flex-col gap-2"></div>
  `;
}

function renderLoginForm() {
  return `
    <div class="space-y-4 text-xs">
      <!-- Google Sign-In Button for Admin -->
      <button type="button" onclick="openGoogleLoginModal()" class="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-blue-500 font-extrabold text-xs sm:text-sm py-3 px-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2.5">
        <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"/>
          <path fill="#FBBC05" d="M5.01 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4-3.14z"/>
          <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24z"/>
        </svg>
        <span>الدخول عبر حساب Google (خاص بالمدير 👑)</span>
      </button>

      <div class="relative flex py-1 items-center">
        <div class="flex-grow border-t border-slate-200"></div>
        <span class="flex-shrink mx-3 text-[11px] text-slate-400 font-bold">أو الدخول برقم الهاتف / البريد</span>
        <div class="flex-grow border-t border-slate-200"></div>
      </div>

      <form onsubmit="handleLoginSubmit(event)" class="space-y-4">
        <div>
          <label class="block font-bold text-slate-700 mb-1">رقم الهاتف أو بريد Google:</label>
          <div class="relative">
            <input type="text" id="login-phone" required placeholder="05 / 06 / 07 أو بريد Gmail..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 font-mono text-slate-800 outline-none focus:border-red-600" />
            <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute right-3 top-3.5"></i>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">كلمة المرور:</label>
          <div class="relative">
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 pr-10 text-slate-800 outline-none focus:border-red-600" />
            <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute right-3 top-3.5"></i>
          </div>
        </div>

        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 mt-2">
          <i data-lucide="log-in" class="w-4 h-4"></i>
          دخول إلى حسابي
        </button>
      </form>
    </div>
  `;
}

function renderRegisterForm() {
  return `
    <form onsubmit="handleRegisterSubmit(event)" class="space-y-3.5 text-xs">
      <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 text-[11px] leading-relaxed">
        🛡️ <strong>ملاحظة أمان:</strong> عند تسجيل حسابك، سيصل إشعار فوري لمدير المتجر ليقوم بتصنيف دورك (مندوبة مبيعات أو عامل توصيل) وتفعيل صلاحياتك الخاصة فقط.
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">الاسم الكامل:</label>
        <input type="text" id="reg-name" required placeholder="مثلاً: خديجة منصوري" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">رقم الهاتف (اسم المستخدم):</label>
        <input type="tel" id="reg-phone" required placeholder="05 / 06 / 07 ..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono focus:border-red-600" />
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">كلمة المرور:</label>
        <input type="password" id="reg-password" required placeholder="اختر كلمة مرور قوية" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">ملاحظة للمدير عن رغبتك بالعمل:</label>
        <textarea id="reg-note" rows="2" placeholder="أريد العمل كمندوبة مبيعات، أو لدي سيارة للتوصيل في ولاية..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600"></textarea>
      </div>

      <button type="submit" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 mt-2">
        <i data-lucide="user-check" class="w-4 h-4"></i>
        إرسال طلب التسجيل للإدارة
      </button>
    </form>
  `;
}

// Waiting Screen for Pending Users
function renderPendingScreen(user) {
  return `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-3xl p-6 text-center shadow-2xl animate-fade-in border border-slate-100 space-y-4">
        
        <div class="w-20 h-20 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl font-bold shadow-inner">
          ⏳
        </div>

        <div>
          <span class="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-2 pulse-badge">
            الحساب قيد المراجعة
          </span>
          <h2 class="text-lg font-black text-slate-900">أهلاً بك يا ${user.name}!</h2>
          <p class="text-xs text-slate-600 mt-2 leading-relaxed">
            تم استلام طلب تسجيلك بنجاح برقم الهاتف (<strong class="font-mono text-slate-800">${user.phone}</strong>).
            <br>
            طلبك الآن معروض في لوحة تحكم صاحب المتجر (المدير العام) لتصنيف وتحديد دورك وصلاحياتك (كمندوبة أو كعامل توصيل).
          </p>
        </div>

        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-right">
          <span class="font-bold text-slate-700 block mb-1">ماذا يحدث الآن؟</span>
          بمجرد أن يوافق المدير ويصنف حسابك، ستتمكن فوراً من الدخول ورؤية شاشة عملك المخصصة.
        </div>

        <div class="pt-2 flex flex-col gap-2">
          <button onclick="window.location.reload()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors">
            تحديث الصفحة والتحقق من التفعيل
          </button>
          <button onclick="handleLogout()" class="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold">
            تسجيل الخروج
          </button>
        </div>

      </div>
    </div>
  `;
}

// Screen for Rejected Users
function renderRejectedScreen(user) {
  return `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-3xl p-6 text-center shadow-2xl border border-red-200 space-y-4">
        <div class="w-16 h-16 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl font-bold">
          ❌
        </div>
        <h2 class="text-lg font-bold text-slate-900">نعتذر، لم يتم تفعيل الحساب</h2>
        <p class="text-xs text-slate-600">
          تمت مراجعة طلبك من قِبل إدارة المتجر ولم تتم الموافقة عليه حالياً.
          ${user.rejectReason ? `<br><span class="text-red-700 font-bold mt-1 inline-block">السبب: ${user.rejectReason}</span>` : ''}
        </p>
        <button onclick="handleLogout()" class="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">
          تسجيل الخروج
        </button>
      </div>
    </div>
  `;
}

// Handlers for Auth
function handleLoginSubmit(e) {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value;
  const password = document.getElementById("login-password").value;

  try {
    const user = window.store.loginUser(phone, password);
    showToast(`مرحباً بك يا ${user.name}! ✨`);
    renderApp();
  } catch (err) {
    alert(err.message);
  }
}

function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value;
  const phone = document.getElementById("reg-phone").value;
  const password = document.getElementById("reg-password").value;
  const note = document.getElementById("reg-note").value;

  try {
    const user = window.store.registerUser({ name, phone, password, note });
    window.store.setCurrentUser(user);
    showToast("تم إرسال طلب تسجيلك للمدير بنجاح ⏳");
    renderApp();
  } catch (err) {
    alert(err.message);
  }
}

function quickLogin(phone, password) {
  try {
    const user = window.store.loginUser(phone, password);
    renderApp();
    showToast(`تم الدخول بحساب: ${user.name} (${user.role === 'admin' ? 'المدير' : user.role === 'rep' ? 'مندوبة' : user.role === 'driver' ? 'موزع' : 'قيد المراجعة'})`);
  } catch (err) {
    alert(err.message);
  }
}

function handleLogout() {
  window.store.logout();
  renderApp();
}

function openGoogleLoginModal() {
  const container = document.getElementById("modal-container");
  if (!container) return;

  const adminUser = window.store.getUserByRole("admin");
  const defaultEmail = (adminUser && adminUser.email) ? adminUser.email : "noureddinehadjhamed1992@gmail.com";

  container.innerHTML = `
    <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div class="text-center space-y-2">
          <div class="w-12 h-12 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center">
            <svg class="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"/>
              <path fill="#FBBC05" d="M5.01 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4-3.14z"/>
              <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24z"/>
            </svg>
          </div>
          <h3 class="text-base font-black text-slate-900">تسجيل الدخول عبر Google</h3>
          <p class="text-[11px] text-slate-500">للمدير العام 👑 أو للمندوبات وعامل التوصيل (مع تصنيف الدور من المدير)</p>
        </div>

        <form onsubmit="handleGoogleLoginSubmit(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">بريد Google الإلكتروني (Gmail):</label>
            <input type="email" id="google-login-email" required value="${defaultEmail}" placeholder="example@gmail.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-800 outline-none focus:border-blue-600" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">كلمة المرور:</label>
            <input type="password" id="google-login-password" required placeholder="كلمة مرور الحساب (للمدير: admin)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 outline-none focus:border-blue-600" />
          </div>

          <div class="pt-2 flex gap-2">
            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors">
              متابعة بحساب Google
            </button>
            <button type="button" onclick="closeModal()" class="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleGoogleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("google-login-email").value;
  const password = document.getElementById("google-login-password").value;

  try {
    const user = window.store.loginWithGoogle({ email, password });
    closeModal();
    renderApp();
    if (user.role === "admin") {
      showToast(`تم تسجيل دخول المدير عبر Google بنجاح! مرحباً ${user.name} 👑`);
    } else if (user.status === "pending" || user.role === "pending") {
      showToast(`تم تسجيل حسابك عبر Google وإرسال إشعار للمدير لتصنيف دورك ⏳`);
    } else {
      showToast(`تم تسجيل الدخول عبر Google بنجاح! مرحباً ${user.name} ✨`);
    }
  } catch (err) {
    alert(err.message);
  }
}

// ==========================================
// TOP HEADER (STRICTLY ROLE-BASED)
// ==========================================
function renderHeader(currentUser) {
  const pendingUsersCount = window.store.getPendingUsers().length;
  const inquiriesCount = window.store.getDashboardStats().inquiriesCount;

  return `
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          
          <!-- Logo & Brand -->
          <div class="flex items-center gap-2.5">
            <div class="w-11 h-11 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-xs flex items-center justify-center shrink-0 p-0.5">
              <img src="./assets/logo.jpg" alt="Bon Prix Suiv" class="w-full h-full object-contain" />
            </div>
            <div>
              <h1 class="text-base sm:text-lg font-black text-red-600 tracking-tight leading-tight">Bon Prix Suiv</h1>
              <p class="text-[11px] text-slate-500 hidden sm:block">
                ${
                  currentUser.role === 'admin' 
                    ? 'لوحة المدير العام 👑' 
                    : currentUser.role === 'rep' 
                    ? 'بوابة مندوبة المبيعات 🌸' 
                    : 'بوابة عامل التوصيل 🚚'
                }
              </p>
            </div>
          </div>

          <!-- User Info & Secure Actions -->
          <div class="flex items-center gap-2">
            
            <!-- Admin Notifications Badge -->
            ${currentUser.role === 'admin' && pendingUsersCount > 0 ? `
              <button onclick="switchTab('users')" class="bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-sm pulse-badge">
                <span>🔔</span>
                <span class="hidden sm:inline">${pendingUsersCount} طلب تسجيل جديد!</span>
                <span class="sm:hidden">${pendingUsersCount}</span>
              </button>
            ` : ''}

            <!-- Current User Badge -->
            <div class="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <span class="font-bold text-slate-800">${currentUser.name}</span>
              <span class="text-[10px] px-2 py-0.5 rounded-md font-bold ${
                currentUser.role === 'admin' 
                  ? 'bg-blue-100 text-blue-800' 
                  : currentUser.role === 'rep' 
                  ? 'bg-pink-100 text-pink-800' 
                  : 'bg-emerald-100 text-emerald-800'
              }">
                ${currentUser.role === 'admin' ? 'المدير' : currentUser.role === 'rep' ? 'مندوبة' : 'عامل توصيل'}
              </span>
            </div>

            <!-- Logout Button -->
            <button onclick="handleLogout()" title="تسجيل الخروج" class="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold border border-slate-200">
              <i data-lucide="log-out" class="w-4 h-4"></i>
              <span class="hidden sm:inline">خروج</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  `;
}

// Render content strictly by role
function renderRoleView(currentUser) {
  if (currentUser.role === "admin") {
    return renderAdminView(currentUser);
  } else if (currentUser.role === "rep") {
    return renderRepView(currentUser);
  } else if (currentUser.role === "driver") {
    return renderDriverView(currentUser);
  }
}

// ==========================================
// 1. ADMIN / OWNER VIEW (صاحب المتجر)
// ==========================================
function renderAdminView(currentUser) {
  const stats = window.store.getDashboardStats();
  const pendingUsers = window.store.getPendingUsers();

  return `
    <div class="animate-fade-in">
      
      <!-- Admin Top Alert / Notification Banner -->
      <div class="mb-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">👑</div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-white">لوحة تحكم المدير العام (أنت من يحدد الصلاحيات)</h2>
            <p class="text-xs text-slate-300">أنت فقط من يرى تكلفة الشراء، أرباح المتجر، وتصنيف أدوار المندوبات والموزعين الجدد.</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <!-- Add Product Button -->
          <button onclick="openAddProductModal()" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ إضافة منتج جديد</span>
          </button>

          <!-- Pending Users Alert Button -->
          ${pendingUsers.length > 0 ? `
            <button onclick="switchTab('users')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow pulse-badge">
              <span>🔔</span>
              <span>${pendingUsers.length} طلب تسجيل بانتظار تصنيفك!</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Desktop Navigation Tabs -->
      <div class="hidden md:flex border-b border-slate-200 mb-6 gap-2 overflow-x-auto">
        <button onclick="switchTab('dashboard')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'dashboard' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="layout-dashboard" class="w-4 h-4"></i>
          المؤشرات العامة
        </button>
        <button onclick="switchTab('users')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'users' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
          المستخدمين وتصنيف الأدوار 🔐
          ${pendingUsers.length > 0 ? `<span class="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold pulse-badge">${pendingUsers.length}</span>` : ''}
        </button>
        <button onclick="switchTab('products')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="package" class="w-4 h-4"></i>
          المخزون وتكلفة الشراء
          ${stats.lowStockCount > 0 ? `<span class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">${stats.lowStockCount}</span>` : ''}
        </button>
        <button onclick="switchTab('deliveryRates')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'deliveryRates' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="map-pin" class="w-4 h-4"></i>
          أسعار التوصيل المرجعية
        </button>
        <button onclick="switchTab('orders')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="shopping-bag" class="w-4 h-4"></i>
          الطلبيات
          <span class="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">${stats.totalOrders}</span>
        </button>
        <button onclick="switchTab('reps')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'reps' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="users" class="w-4 h-4"></i>
          المندوبات والأرباح
        </button>
        <button onclick="switchTab('driverLog')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'driverLog' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="truck" class="w-4 h-4"></i>
          ملاحظات عامل التوصيل
          ${stats.inquiriesCount > 0 ? `<span class="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">${stats.inquiriesCount}</span>` : ''}
        </button>
      </div>

      <!-- Tab Content Area -->
      ${renderAdminTabContent()}
    </div>
  `;
}

function renderAdminTabContent() {
  if (activeTab === "dashboard") return renderAdminDashboard();
  if (activeTab === "users") return renderAdminUsersTab();
  if (activeTab === "products") return renderAdminProducts();
  if (activeTab === "deliveryRates") return renderAdminDeliveryRates();
  if (activeTab === "orders") return renderAdminOrders();
  if (activeTab === "reps") return renderAdminReps();
  if (activeTab === "driverLog") return renderAdminDriverLog();
  return renderAdminDashboard();
}

// 1.1 Admin Users & Approval Tab (تصنيف أدوار المستخدمين الجدد)
function renderAdminUsersTab() {
  const users = window.store.getUsers();
  const adminUser = window.store.getUserByRole("admin") || {};
  const pendingUsers = window.store.getPendingUsers();
  const activeUsers = users.filter(u => u.status === "active" && u.role !== "admin");

  return `
    <div class="space-y-6 animate-fade-in">
      
      <div>
        <h3 class="text-base font-bold text-slate-900">إدارة المستخدمين والأمان وتصنيف الأدوار 🔐</h3>
        <p class="text-xs text-slate-500">عندما يسجل أي شخص جديد، يظهر طلبه هنا للمراجعة. أنت الوحيد الذي يحدد هل هو (مندوبة مبيعات) أو (عامل توصيل)، ويظهر له فقط ما يخصه.</p>
      </div>

      <!-- ADMIN GOOGLE ACCOUNT SETTINGS -->
      <div class="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <span class="text-lg">👑</span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-xs sm:text-sm">حساب المدير المرتبط بـ Google</h4>
            <p class="text-[11px] text-slate-600 font-mono mt-0.5">${adminUser.email || 'noureddinehadjhamed1992@gmail.com'} | الهاتف: ${adminUser.phone || '0550000000'}</p>
          </div>
        </div>
        <button onclick="updateAdminGooglePrompt()" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl self-start sm:self-center transition-colors">
          تعديل بريد Google / كلمة مرور المدير
        </button>
      </div>

      <!-- SECTION 1: PENDING REGISTRATION REQUESTS -->
      <div class="bg-white rounded-2xl border-2 ${pendingUsers.length > 0 ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'} p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">🔔</span>
            <h4 class="font-black text-slate-900 text-sm">طلبات التسجيل الجديدة بانتظار تصنيفك (${pendingUsers.length})</h4>
          </div>
          ${pendingUsers.length > 0 ? `<span class="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full pulse-badge">بحاجة لتحديد الدور</span>` : ''}
        </div>

        ${pendingUsers.length === 0 ? `
          <div class="p-6 text-center text-slate-400 text-xs">
            لا توجد أي طلبات تسجيل جديدة معلقة حالياً ✨
          </div>
        ` : `
          <div class="space-y-3">
            ${pendingUsers.map(u => `
              <div class="bg-white rounded-2xl border border-amber-300 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="space-y-1">
                  <div class="flex items-center gap-2">
                    <span class="font-extrabold text-slate-900 text-sm">${u.name}</span>
                    <span class="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">${u.phone}</span>
                    <span class="text-[10px] text-slate-400 font-mono">${new Date(u.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  ${u.note ? `
                    <div class="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-1 border border-slate-100">
                      📝 ملاحظة مقدم الطلب: <em>"${u.note}"</em>
                    </div>
                  ` : ''}
                </div>

                <!-- Admin Classification Buttons -->
                <div class="flex items-center gap-2 self-start md:self-center flex-wrap">
                  <!-- Assign as Sales Rep -->
                  <button onclick="approveUserAsRepPrompt('${u.id}', '${u.name}')" class="px-3 py-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95">
                    <span>🌸</span>
                    <span>تصنيف كمندوبة مبيعات</span>
                  </button>

                  <!-- Assign as Delivery Driver -->
                  <button onclick="approveUserAsDriverPrompt('${u.id}', '${u.name}')" class="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95">
                    <span>🚚</span>
                    <span>تصنيف كعامل توصيل</span>
                  </button>

                  <!-- Reject -->
                  <button onclick="rejectUserPrompt('${u.id}')" class="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-xs font-bold rounded-xl transition-colors">
                    رفض
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- SECTION 2: ACTIVE USERS LIST -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 class="font-bold text-slate-900 text-sm">قائمة المستخدمين المعتمدين وصلاحياتهم (${activeUsers.length})</h4>
          <span class="text-xs text-slate-500">كل مستخدم لا يمكنه الوصول إلا لواجهته المخصصة فقط</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 font-bold">اسم المستخدم</th>
                <th class="p-3 font-bold">رقم الهاتف</th>
                <th class="p-3 font-bold">الدور المصنف</th>
                <th class="p-3 font-bold">الصلاحية المفعلة</th>
                <th class="p-3 font-bold">تاريخ الاعتماد</th>
                <th class="p-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${activeUsers.map(u => `
                <tr class="hover:bg-slate-50/80">
                  <td class="p-3 font-bold text-slate-900">${u.name}</td>
                  <td class="p-3 font-mono text-slate-700">${u.phone}</td>
                  <td class="p-3">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      u.role === 'rep' ? 'bg-pink-100 text-pink-800' : 'bg-emerald-100 text-emerald-800'
                    }">
                      ${u.role === 'rep' ? '🌸 مندوبة مبيعات' : '🚚 عامل توصيل'}
                    </span>
                  </td>
                  <td class="p-3 text-slate-500 text-[11px]">
                    ${u.role === 'rep' ? 'تسجيل الطلبيات والكتالوج وأرباحها فقط' : 'مهام التوصيل ومستحقات أتعابه فقط'}
                  </td>
                  <td class="p-3 font-mono text-slate-400 text-[10px]">
                    ${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td class="p-3 text-center">
                    <button onclick="confirmDeleteUser('${u.id}')" title="حذف المستخدم" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

function updateAdminGooglePrompt() {
  const adminUser = window.store.getUserByRole("admin") || {};
  const newEmail = prompt("أدخل بريد Google (Gmail) الخاص بالمدير:", adminUser.email || "noureddinehadjhamed1992@gmail.com");
  if (newEmail === null) return;
  const newPassword = prompt("أدخل كلمة مرور المدير الجديدة (أو اتركها كما هي):", adminUser.password || "admin");
  if (newPassword === null) return;

  window.store.updateAdminAccount({
    email: newEmail,
    password: newPassword
  });
  showToast("تم تحديث بيانات حساب المدير على Google بنجاح ✅");
  renderApp();
}

function approveUserAsRepPrompt(userId, name) {
  const wilaya = prompt(`تصنيف (${name}) كمندوبة مبيعات.\nأدخل ولاية أو منطقة المندوبة:`, "الجزائر");
  if (wilaya !== null) {
    window.store.approveUser(userId, "rep", { wilaya });
    showToast(`تم اعتماد وتفعيل (${name}) كمندوبة مبيعات بنجاح 🌸`);
    renderApp();
  }
}

function approveUserAsDriverPrompt(userId, name) {
  const vehicle = prompt(`تصنيف (${name}) كعامل توصيل.\nأدخل وسيلة النقل أو الملاحظة:`, "سيارة نقل");
  if (vehicle !== null) {
    window.store.approveUser(userId, "driver", { vehicle });
    showToast(`تم اعتماد وتفعيل (${name}) كعامل توصيل بنجاح 🚚`);
    renderApp();
  }
}

function rejectUserPrompt(userId) {
  const reason = prompt("سبب رفض طلب الحساب:", "عدم توفر شواغر حالياً");
  if (reason !== null) {
    window.store.rejectUser(userId, reason);
    showToast("تم رفض الطلب.");
    renderApp();
  }
}

function confirmDeleteUser(userId) {
  if (confirm("هل أنت متأكد من حذف هذا المستخدم؟")) {
    window.store.deleteUser(userId);
    showToast("تم حذف المستخدم.");
    renderApp();
  }
}

// 1.2 Admin Dashboard Tab
function renderAdminDashboard() {
  const stats = window.store.getDashboardStats();
  const recentOrders = window.store.getOrders().slice(0, 5);
  const products = window.store.getProducts();
  const lowStock = products.filter(p => p.stock <= (p.minStockAlert || 5));

  return `
    <div class="space-y-6">
      
      <!-- Key Metric Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        
        <!-- Total Collected by Driver -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-500">إجمالي المبالغ المحصلة</span>
            <div class="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              💰
            </div>
          </div>
          <div class="text-lg sm:text-2xl font-extrabold text-slate-900">${stats.totalCollectedRevenue.toLocaleString()} <span class="text-xs text-slate-500 font-normal">دج</span></div>
          <p class="text-[11px] text-emerald-600 mt-1 font-semibold">
            <span>من ${stats.deliveredCount} طلبية تم تسليمها</span>
          </p>
        </div>

        <!-- Store Owner Net Profit -->
        <div class="bg-gradient-to-br from-red-50 to-rose-50 border border-red-200 p-4 sm:p-5 rounded-2xl shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-red-950">أرباحي الصافية (التاجر) 👑</span>
            <div class="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-xs">
              ${stats.ownerProfitMarginPct}%
            </div>
          </div>
          <div class="text-lg sm:text-2xl font-black text-red-700">${stats.totalDeliveredOwnerProfit.toLocaleString()} <span class="text-xs text-red-900 font-normal">دج</span></div>
          <p class="text-[11px] text-red-800 mt-1 font-medium">الفرق بين تكلفة الشراء وسعري المعتمد (هامش ${stats.ownerProfitMarginPct}%)</p>
        </div>

        <!-- Reps Accrued Profits -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-500">مستحقات المندوبات المتبقية</span>
            <div class="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
              🌸
            </div>
          </div>
          <div class="text-lg sm:text-2xl font-extrabold text-pink-600">${stats.totalRemainingPayableReps.toLocaleString()} <span class="text-xs text-slate-500 font-normal">دج</span></div>
          <p class="text-[11px] text-slate-500 mt-1">أرباح مؤكدة جاهزة للتحويل</p>
        </div>

        <!-- Active Deliveries -->
        <div class="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-bold text-slate-500">طلبيات قيد التوصيل</span>
            <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              🚚
            </div>
          </div>
          <div class="text-lg sm:text-2xl font-extrabold text-amber-600">${stats.activeDeliveryCount} <span class="text-xs text-slate-500 font-normal">طلبية</span></div>
          <p class="text-[11px] text-slate-500 mt-1">أرباح معلقة: ${stats.totalPendingRepProfits.toLocaleString()} دج</p>
        </div>

      </div>

      <!-- Quick Action / Alert Banners -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        <!-- Low Stock Alert Box -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">⚠️</span>
              <h3 class="text-sm font-bold text-slate-800">تنبيهات المخزون (منتجات أوشكت على النفاد)</h3>
            </div>
            <button onclick="switchTab('products')" class="text-xs text-red-600 font-bold hover:underline">عرض المنتجات</button>
          </div>

          ${lowStock.length === 0 ? `
            <div class="p-6 text-center text-slate-400 text-xs">
              جميع المنتجات متوفرة بكميات كافية ولا يوجد نقص حالياً ✨
            </div>
          ` : `
            <div class="space-y-2.5">
              ${lowStock.map(p => `
                <div class="flex items-center justify-between p-2.5 rounded-xl ${p.stock === 0 ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'}">
                  <div class="flex items-center gap-3">
                    <img src="${p.image}" class="w-10 h-10 object-cover rounded-lg" alt="${p.name}" />
                    <div>
                      <h4 class="text-xs font-bold text-slate-800">${p.name}</h4>
                      <span class="text-[11px] text-slate-500">سعر الشراء: ${p.costPrice || 0} دج | سعرك للمندوبة: ${p.basePrice} دج</span>
                    </div>
                  </div>
                  <div class="text-left">
                    <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold ${p.stock === 0 ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-900'}">
                      ${p.stock === 0 ? 'نفد (0)' : `متبقي ${p.stock}`}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <!-- Driver Inquiries Box -->
        <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="text-lg">💬</span>
              <h3 class="text-sm font-bold text-slate-800">ملاحظات واستفسارات عامل التوصيل</h3>
            </div>
            <button onclick="switchTab('driverLog')" class="text-xs text-red-600 font-bold hover:underline">عرض السجل</button>
          </div>

          ${recentOrders.filter(o => o.driverNotes).length === 0 ? `
            <div class="p-6 text-center text-slate-400 text-xs">
              لا توجد ملاحظات أو استفسارات مسجلة من عامل التوصيل حالياً.
            </div>
          ` : `
            <div class="space-y-2.5">
              ${recentOrders.filter(o => o.driverNotes).slice(0, 3).map(o => `
                <div class="p-3 rounded-xl border ${o.driverInquiryOpen ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}">
                  <div class="flex items-center justify-between text-xs font-bold mb-1">
                    <span class="text-slate-800">طلب #${o.id} - ${o.customerName} (${o.wilaya || ''})</span>
                    <span class="text-[10px] text-pink-700">🌸 ${o.repName}</span>
                  </div>
                  <p class="text-xs text-slate-700 whitespace-pre-line">${o.driverNotes}</p>
                </div>
              `).join('')}
            </div>
          `}
        </div>

      </div>

      <!-- Recent Orders Table Preview -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-800">أحدث الطلبيات المسجلة</h3>
          <button onclick="switchTab('orders')" class="text-xs text-red-600 font-bold hover:underline">عرض جميع الطلبيات</button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 font-bold">رقم الطلب</th>
                <th class="p-3 font-bold">المندوبة</th>
                <th class="p-3 font-bold">الزبون والولاية</th>
                <th class="p-3 font-bold">المنتج</th>
                <th class="p-3 font-bold">المبلغ من الزبون</th>
                <th class="p-3 font-bold">ربحي (التاجر)</th>
                <th class="p-3 font-bold">فائدة المندوبة</th>
                <th class="p-3 font-bold">الحالة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${recentOrders.map(o => {
                const totalCharged = o.totalCustomerAmount || ((o.sellingPrice * o.quantity) + (o.chargedDeliveryFee || 0));
                return `
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="p-3 font-semibold text-slate-900 font-mono">${o.id}</td>
                  <td class="p-3 text-pink-700 font-bold">🌸 ${o.repName}</td>
                  <td class="p-3">
                    <div class="font-bold text-slate-800">${o.customerName}</div>
                    <div class="text-[10px] text-slate-400">${o.wilaya || ''} - ${o.commune || ''}</div>
                  </td>
                  <td class="p-3 font-medium">${o.productName} (x${o.quantity})</td>
                  <td class="p-3 font-extrabold text-slate-900">${totalCharged.toLocaleString()} دج</td>
                  <td class="p-3 font-bold text-blue-700">+${(o.ownerProfit || 0).toLocaleString()} دج</td>
                  <td class="p-3 font-bold text-emerald-600">+${(o.repProfit || 0).toLocaleString()} دج</td>
                  <td class="p-3">${renderStatusBadge(o.status, o.driverInquiryOpen)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// 1.3 Admin Products Tab
function renderAdminProducts() {
  const products = window.store.getProducts();

  return `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">إدارة المخزون، تكلفة الشراء وسعر الجملة</h3>
          <p class="text-xs text-slate-500">سعر بيعك هو السعر المعتمد للمندوبة (سعر الجملة)، والمندوبة تضيف هامش ربحها فوقه للزبون.</p>
        </div>
        <button onclick="openAddProductModal()" class="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto transition-all">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          إضافة منتج جديد
        </button>
      </div>

      <!-- Products Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${products.map(p => {
          const cost = p.costPrice || 0;
          const base = p.basePrice || 0;
          const profit = base - cost;
          const profitPct = cost > 0 ? Math.round((profit / cost) * 100) : 100;

          return `
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div class="relative h-44 bg-slate-100 overflow-hidden">
                <img src="${p.image}" class="w-full h-full object-cover" alt="${p.name}" />
                <span class="absolute top-2.5 right-2.5 bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ${p.category}
                </span>
                <span class="absolute bottom-2.5 right-2.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
                  p.stock === 0
                    ? 'bg-red-600 text-white'
                    : p.stock <= (p.minStockAlert || 5)
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-600 text-white'
                }">
                  ${p.stock === 0 ? 'نفد من المخزن' : `المتوفر: ${p.stock} قطعة`}
                </span>
              </div>
              
              <div class="p-4">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <h4 class="font-bold text-slate-900 text-sm">${p.name}</h4>
                  <span class="text-[10px] text-slate-400 font-mono">${p.id}</span>
                </div>
                <p class="text-xs text-slate-500 line-clamp-2 mb-3">${p.description || 'لا يوجد وصف'}</p>
                
                <!-- Pricing Box with Owner Cost & Profit -->
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500">سعر الشراء (التكلفة عليك):</span>
                    <span class="font-bold text-slate-800">${cost.toLocaleString()} دج</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-red-700 font-bold">سعر بيعك (للمندوبة):</span>
                    <span class="font-extrabold text-red-900">${base.toLocaleString()} دج</span>
                  </div>
                  <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span class="text-emerald-700 font-bold">ربحك الصافي للقطعة:</span>
                    <span class="font-black text-emerald-600">+${profit.toLocaleString()} دج (${profitPct}%)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer Quick Stock Adjust -->
            <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <div class="flex items-center gap-1.5">
                <span class="text-xs text-slate-500 font-medium">المخزون:</span>
                <button onclick="quickAdjustStock('${p.id}', -1)" class="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 text-sm flex items-center justify-center">-</button>
                <span class="text-xs font-extrabold px-1.5">${p.stock}</span>
                <button onclick="quickAdjustStock('${p.id}', 1)" class="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 text-sm flex items-center justify-center">+</button>
              </div>

              <div class="flex items-center gap-1">
                <button onclick="openEditProductModal('${p.id}')" title="تعديل المنتج والأسعار" class="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <i data-lucide="edit-3" class="w-4 h-4"></i>
                </button>
                <button onclick="confirmDeleteProduct('${p.id}')" title="حذف" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                  <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// 1.4 Admin Delivery Rates & Wilayas Tab
function renderAdminDeliveryRates() {
  const rates = window.store.getDeliveryRates();
  const filtered = rates.filter(r => 
    !deliverySearchQuery ||
    r.wilayaName.toLowerCase().includes(deliverySearchQuery.toLowerCase()) ||
    r.wilayaCode.includes(deliverySearchQuery) ||
    r.communes.toLowerCase().includes(deliverySearchQuery.toLowerCase())
  );

  return `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">أسعار التوصيل المرجعية حسب الولايات والبلديات الجزائرية 🚚</h3>
          <p class="text-xs text-slate-500">هذا السعر المرجعي هو الذي يُحاسب على أساسه عامل التوصيل في مستحقاته، وتعتمد عليه المندوبة عند إدخال الطلب.</p>
        </div>
        <button onclick="openAddDeliveryRateModal()" class="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto transition-all">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          إضافة ولاية / بلدية جديدة
        </button>
      </div>

      <!-- Search & Count -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
        <div class="relative flex-1">
          <input 
            type="text" 
            placeholder="ابحث باسم الولاية، رقمها، أو البلدية..." 
            value="${deliverySearchQuery}"
            oninput="deliverySearchQuery = this.value; renderApp();"
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-9 outline-none focus:border-red-600 transition-colors"
          />
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
        </div>
        <span class="text-xs font-bold text-slate-500 whitespace-nowrap">${filtered.length} ولاية مسجلة</span>
      </div>

      <!-- Table of Delivery Rates -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 font-bold">الرمز</th>
                <th class="p-3 font-bold">اسم الولاية</th>
                <th class="p-3 font-bold">سعر التوصيل القياسي المعتمد</th>
                <th class="p-3 font-bold">البلديات والمناطق المشمولة</th>
                <th class="p-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="5" class="p-8 text-center text-slate-400">لا توجد نتائج مطابقة لبحثك.</td>
                </tr>
              ` : filtered.map(r => `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="p-3 font-mono font-bold text-slate-500">${r.wilayaCode || '-'}</td>
                  <td class="p-3 font-bold text-slate-900">${r.wilayaName}</td>
                  <td class="p-3 font-extrabold text-blue-700">${r.defaultFee.toLocaleString()} دج</td>
                  <td class="p-3 text-slate-500 max-w-md">${r.communes}</td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <button onclick="openEditDeliveryRateModal('${r.id}')" title="تعديل السعر" class="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button onclick="confirmDeleteDeliveryRate('${r.id}')" title="حذف" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// 1.5 Admin Orders Tab
function renderAdminOrders() {
  const orders = window.store.getOrders();
  
  const filtered = orders.filter(o => {
    const matchesStatus = currentFilterStatus === "all" || o.status === currentFilterStatus;
    const matchesSearch = !searchQuery || 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery) ||
      (o.wilaya && o.wilaya.toLowerCase().includes(searchQuery.toLowerCase())) ||
      o.repName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return `
    <div class="space-y-4 animate-fade-in">
      
      <!-- Filter Bar -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="relative flex-1">
          <input 
            type="text" 
            placeholder="ابحث برقم الطلب، اسم الزبون، الولاية، الهاتف أو المندوبة..." 
            value="${searchQuery}"
            oninput="searchQuery = this.value; renderApp();"
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-9 outline-none focus:border-red-600 transition-colors"
          />
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <button onclick="currentFilterStatus = 'all'; renderApp();" class="px-3 py-1.5 rounded-lg transition-all ${currentFilterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}">الكل (${orders.length})</button>
          <button onclick="currentFilterStatus = 'out_for_delivery'; renderApp();" class="px-3 py-1.5 rounded-lg transition-all ${currentFilterStatus === 'out_for_delivery' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}">قيد التوصيل</button>
          <button onclick="currentFilterStatus = 'delivered'; renderApp();" class="px-3 py-1.5 rounded-lg transition-all ${currentFilterStatus === 'delivered' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}">تم التسليم</button>
          <button onclick="currentFilterStatus = 'returned'; renderApp();" class="px-3 py-1.5 rounded-lg transition-all ${currentFilterStatus === 'returned' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'}">مرتجع/ملغى</button>
        </div>
      </div>

      <!-- Orders List Table -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 font-bold">الطلب والتاريخ</th>
                <th class="p-3 font-bold">المندوبة</th>
                <th class="p-3 font-bold">الزبون والولاية</th>
                <th class="p-3 font-bold">المنتج والكمية</th>
                <th class="p-3 font-bold">المبالغ والتوصيل</th>
                <th class="p-3 font-bold">أرباحك / المندوبة</th>
                <th class="p-3 font-bold">الحالة والملاحظات</th>
                <th class="p-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="8" class="p-8 text-center text-slate-400">لا توجد طلبيات مطابقة للبحث أو الفلتر.</td>
                </tr>
              ` : filtered.map(o => {
                const totalCharged = o.totalCustomerAmount || ((o.sellingPrice * o.quantity) + (o.chargedDeliveryFee || 0));
                return `
                <tr class="hover:bg-slate-50/70 transition-colors ${o.driverInquiryOpen ? 'bg-amber-50/40' : ''}">
                  <td class="p-3 font-medium">
                    <span class="font-bold text-slate-900 block font-mono">${o.id}</span>
                    <span class="text-[10px] text-slate-400">${o.date}</span>
                  </td>
                  <td class="p-3 text-pink-700 font-bold whitespace-nowrap">
                    🌸 ${o.repName}
                  </td>
                  <td class="p-3">
                    <div class="font-bold text-slate-800">${o.customerName}</div>
                    <div class="text-[11px] text-slate-500 font-mono">${o.customerPhone}</div>
                    <div class="text-[10px] text-blue-700 font-semibold">${o.wilaya || ''} ${o.commune ? ' - ' + o.commune : ''}</div>
                  </td>
                  <td class="p-3">
                    <span class="font-bold text-slate-900 block">${o.productName}</span>
                    <span class="text-[11px] text-slate-500">الكمية: ${o.quantity}</span>
                  </td>
                  <td class="p-3 whitespace-nowrap">
                    <div class="text-slate-900 font-black">تحصيل: ${totalCharged.toLocaleString()} دج</div>
                    <div class="text-[10px] text-slate-500">منها توصيل: ${(o.chargedDeliveryFee || 0).toLocaleString()} دج</div>
                    ${o.deliverySubsidy > 0 ? `<div class="text-[10px] text-rose-600 font-semibold">(دعم توصيل المندوبة: -${o.deliverySubsidy} دج)</div>` : ''}
                  </td>
                  <td class="p-3 whitespace-nowrap">
                    <div class="text-blue-700 font-bold">ربحك: +${(o.ownerProfit || 0).toLocaleString()} دج</div>
                    <div class="text-emerald-600 font-extrabold">المندوبة: +${(o.repProfit || 0).toLocaleString()} دج</div>
                  </td>
                  <td class="p-3">
                    <div class="mb-1">${renderStatusBadge(o.status, o.driverInquiryOpen)}</div>
                    ${o.driverNotes ? `
                      <div class="text-[11px] p-1.5 rounded-lg ${o.driverInquiryOpen ? 'bg-amber-100 text-amber-900 font-semibold' : 'bg-slate-100 text-slate-600'} max-w-xs">
                        🚚 ${o.driverNotes}
                      </div>
                    ` : ''}
                  </td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1">
                      ${o.driverInquiryOpen ? `
                        <button onclick="openResolveInquiryModal('${o.id}')" title="توضيح استفسار السائق" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold">
                          حل الاستفسار
                        </button>
                      ` : ''}
                      ${o.status === 'out_for_delivery' ? `
                        <button onclick="adminMarkDelivered('${o.id}')" title="تأكيد التوصيل يدوياً" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <i data-lucide="check-circle" class="w-4 h-4"></i>
                        </button>
                        <button onclick="adminMarkReturned('${o.id}')" title="تأكيد الإرجاع" class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                          <i data-lucide="x-circle" class="w-4 h-4"></i>
                        </button>
                      ` : ''}
                      <button onclick="printOrderReceipt('${o.id}')" title="طباعة وصل" class="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// 1.6 Admin Reps Management Tab
function renderAdminReps() {
  const reps = window.store.getReps();

  return `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">إدارة مندوبات المبيعات ومتابعة الأرباح</h3>
          <p class="text-xs text-slate-500">حساب آلي للأرباح المؤكدة والمعلقة، وتسجيل دفعات التحويل المالي (بريدي موب / كاش).</p>
        </div>
        <button onclick="openAddRepModal()" class="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto transition-all">
          <i data-lucide="user-plus" class="w-4 h-4"></i>
          إضافة مندوبة يدوياً
        </button>
      </div>

      <!-- Rep Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${reps.map(r => {
          const fin = window.store.getRepFinancials(r.id);
          return `
            <div class="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center font-bold text-base">
                      🌸
                    </div>
                    <div>
                      <h4 class="font-bold text-slate-900 text-sm">${r.name}</h4>
                      <span class="text-xs text-slate-500 font-mono">${r.phone}</span>
                    </div>
                  </div>
                  <span class="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">${r.id}</span>
                </div>

                <p class="text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded-lg">${r.notes || 'مندوبة مبيعات'}</p>

                <!-- Financial Highlights -->
                <div class="space-y-2 mb-4 text-xs">
                  <div class="flex items-center justify-between p-2 rounded-lg bg-pink-50 text-pink-900 font-semibold">
                    <span>الرصيد المتاح للسحب حالياً:</span>
                    <span class="text-sm font-extrabold text-pink-700">${fin.availableBalance.toLocaleString()} دج</span>
                  </div>
                  
                  <div class="flex items-center justify-between px-2 text-slate-600">
                    <span>أرباح معلقة (قيد التوصيل):</span>
                    <span class="font-bold text-amber-600">${fin.pendingProfits.toLocaleString()} دج</span>
                  </div>

                  <div class="flex items-center justify-between px-2 text-slate-600">
                    <span>إجمالي الأرباح المؤكدة:</span>
                    <span class="font-bold text-emerald-600">${fin.confirmedProfits.toLocaleString()} دج</span>
                  </div>

                  <div class="flex items-center justify-between px-2 text-slate-600">
                    <span>أرباح حُوّلت لها سابقاً:</span>
                    <span class="font-bold text-slate-700">${fin.totalPaidProfits.toLocaleString()} دج</span>
                  </div>

                  <div class="flex items-center justify-between px-2 text-slate-600">
                    <span>إجمالي الطلبات المسلمة:</span>
                    <span class="font-bold text-slate-800">${fin.deliveredOrdersCount} من ${fin.totalOrders}</span>
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center gap-2">
                <button onclick="openPayoutModal('${r.id}')" class="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-sm">
                  <i data-lucide="credit-card" class="w-3.5 h-3.5"></i>
                  تسجيل دفعة أرباح
                </button>
              </div>

            </div>
          `;
        }).join('')}
      </div>

      <!-- Payouts History -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mt-6">
        <h4 class="font-bold text-slate-800 text-sm mb-3">سجل الدفعات والتحويلات المالية السابقة للمندوبات</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-2.5 font-bold">التاريخ</th>
                <th class="p-2.5 font-bold">المندوبة</th>
                <th class="p-2.5 font-bold">المبلغ المحول</th>
                <th class="p-2.5 font-bold">طريقة الدفع</th>
                <th class="p-2.5 font-bold">ملاحظات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${(window.store.state.payouts || []).map(p => {
                const rep = window.store.getRepById(p.repId);
                return `
                  <tr>
                    <td class="p-2.5 text-slate-500 font-mono">${p.date}</td>
                    <td class="p-2.5 font-bold text-pink-700">🌸 ${rep ? rep.name : p.repId}</td>
                    <td class="p-2.5 font-extrabold text-emerald-600">${p.amount.toLocaleString()} دج</td>
                    <td class="p-2.5 font-medium text-slate-700">${p.paymentMethod}</td>
                    <td class="p-2.5 text-slate-500">${p.note || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// 1.7 Admin Driver Log Tab
function renderAdminDriverLog() {
  const orders = window.store.getOrders().filter(o => o.driverNotes);

  return `
    <div class="space-y-4 animate-fade-in">
      <div>
        <h3 class="text-base font-bold text-slate-900">سجل استفسارات وملاحظات عامل التوصيل (ياسين)</h3>
        <p class="text-xs text-slate-500">هنا تظهر كافة التنبيهات الميدانية من الموزع لحلها فوراً بالتنسيق مع المندوبة والزبون.</p>
      </div>

      <div class="space-y-3">
        ${orders.length === 0 ? `
          <div class="p-10 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            لا توجد أي ملاحظات أو استفسارات حالياً من عامل التوصيل ✨
          </div>
        ` : orders.map(o => `
          <div class="bg-white rounded-2xl border p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${o.driverInquiryOpen ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'}">
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-slate-900 text-xs">طلب #${o.id}</span>
                <span class="text-xs font-semibold text-pink-700">المندوبة: 🌸 ${o.repName}</span>
                ${o.driverInquiryOpen ? `<span class="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full pulse-badge">استفسار بحاجة لتوضيح</span>` : `<span class="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">تم التوضيح</span>`}
              </div>
              <div class="text-xs text-slate-800 font-bold">الزبون: ${o.customerName} - هاتف: <a href="tel:${o.customerPhone}" class="text-blue-600 underline">${o.customerPhone}</a></div>
              <div class="text-xs text-slate-500">${o.wilaya || ''} - ${o.address}</div>
              <div class="p-2.5 rounded-xl bg-amber-100/70 border border-amber-200 text-xs text-amber-950 font-medium whitespace-pre-line mt-2">
                🚚 ${o.driverNotes}
              </div>
            </div>

            <div class="flex sm:flex-col items-center gap-2 self-end sm:self-center">
              ${o.driverInquiryOpen ? `
                <button onclick="openResolveInquiryModal('${o.id}')" class="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm whitespace-nowrap">
                  كتابة توضيح للموزع
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ==========================================
// 2. SALES REP VIEW (بوابة المندوبة - محصورة بما يخصها فقط)
// ==========================================
function renderRepView(currentUser) {
  // Find linked rep profile
  let rep = window.store.getReps().find(r => r.userId === currentUser.id || r.phone === currentUser.phone);
  if (!rep) {
    rep = window.store.getReps()[0] || { id: "REP-01", name: currentUser.name };
  }
  const fin = window.store.getRepFinancials(rep.id);

  return `
    <div class="animate-fade-in space-y-6">
      
      <!-- Rep Hero Welcome Banner -->
      <div class="bg-gradient-to-r from-pink-600 to-rose-500 rounded-3xl p-5 sm:p-6 text-white shadow-md">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-2 backdrop-blur-sm">
              <span>🌸</span> حساب مندوبة المبيعات
            </div>
            <h2 class="text-xl sm:text-2xl font-extrabold">مرحباً بكِ، ${currentUser.name}!</h2>
            <p class="text-xs text-pink-100 mt-1">سعر المتجر هو سعر الجملة المعتمد لكِ، ويمكنكِ إضافة هامش ربحكِ في السعر النهائي للزبون.</p>
          </div>

          <!-- Fast Add Order Button -->
          <button onclick="switchTab('newOrder')" class="bg-white text-pink-700 hover:bg-pink-50 font-extrabold text-xs sm:text-sm px-4 py-3 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95">
            <i data-lucide="plus-circle" class="w-5 h-5"></i>
            تسجيل طلبية زبون جديدة
          </button>
        </div>

        <!-- Rep Financial Cards -->
        <div class="grid grid-cols-3 gap-2 sm:gap-4 mt-6">
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20">
            <span class="text-[11px] text-pink-100 block">أرباح مؤكدة متاحة للسحب</span>
            <span class="text-base sm:text-2xl font-black mt-1 block">${fin.availableBalance.toLocaleString()} <span class="text-[10px] font-normal">دج</span></span>
          </div>

          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20">
            <span class="text-[11px] text-pink-100 block">أرباح معلقة (قيد التوصيل)</span>
            <span class="text-base sm:text-2xl font-black mt-1 block text-amber-200">${fin.pendingProfits.toLocaleString()} <span class="text-[10px] font-normal">دج</span></span>
          </div>

          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-white/20">
            <span class="text-[11px] text-pink-100 block">أرباح استلمتها سابقاً</span>
            <span class="text-base sm:text-2xl font-black mt-1 block">${fin.totalPaidProfits.toLocaleString()} <span class="text-[10px] font-normal">دج</span></span>
          </div>
        </div>
      </div>

      <!-- Rep Navigation Tabs -->
      <div class="flex border-b border-slate-200 gap-2">
        <button onclick="switchTab('newOrder')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'newOrder' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="plus" class="w-4 h-4"></i>
          تسجيل طلبية جديدة
        </button>
        <button onclick="switchTab('myOrders')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'myOrders' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="package-check" class="w-4 h-4"></i>
          طلبياتي ومتابعتها
          <span class="bg-pink-100 text-pink-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold">${fin.totalOrders}</span>
        </button>
        <button onclick="switchTab('catalog')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'catalog' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="grid" class="w-4 h-4"></i>
          المنتجات المتاحة والأسعار
        </button>
      </div>

      <!-- Rep Content -->
      ${renderRepTabContent(rep)}
    </div>
  `;
}

function renderRepTabContent(rep) {
  if (activeTab === "newOrder") return renderRepNewOrderForm(rep);
  if (activeTab === "myOrders") return renderRepMyOrders(rep);
  if (activeTab === "catalog") return renderRepCatalog(rep);
  return renderRepNewOrderForm(rep);
}

function renderRepNewOrderForm(rep) {
  const products = window.store.getProducts().filter(p => p.stock > 0);
  const deliveryRates = window.store.getDeliveryRates();

  return `
    <div class="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
      <div class="mb-5 pb-4 border-b border-slate-100">
        <h3 class="text-base font-bold text-slate-900">تسجيل طلبية زبون جديدة 🛍️</h3>
        <p class="text-xs text-slate-500 mt-0.5">حددي سعر بيع المنتج بإضافة هامش ربحكِ، وسعر التوصيل للزبون. إذا خفضتِ سعر التوصيل، سيُخصم الفارق من أرباحكِ آلياً.</p>
      </div>

      <form onsubmit="handleRepSubmitOrder(event, '${rep.id}')" class="space-y-4">
        
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">اختر المنتج المتوفر:</label>
          <select id="order-product-select" onchange="updateRepProfitCalculator()" required class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 outline-none focus:border-pink-500">
            <option value="">-- اختر المنتج من المخزون --</option>
            ${products.map(p => `
              <option value="${p.id}" data-baseprice="${p.basePrice}" data-stock="${p.stock}">
                ${p.name} (المتوفر: ${p.stock} | سعر المتجر المعتمد لكِ: ${p.basePrice} دج)
              </option>
            `).join('')}
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">الكمية المطلوبة:</label>
            <input 
              type="number" 
              id="order-quantity" 
              value="1" 
              min="1" 
              max="50" 
              oninput="updateRepProfitCalculator()" 
              required 
              class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-slate-800 outline-none focus:border-pink-500" 
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              سعر بيع المنتج النهائي للزبون:
            </label>
            <input 
              type="number" 
              id="order-selling-price" 
              placeholder="مثلاً: 3200" 
              oninput="updateRepProfitCalculator()" 
              required 
              class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold text-pink-700 outline-none focus:border-pink-500" 
            />
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i data-lucide="truck" class="w-4 h-4 text-blue-600"></i>
            تحديد الولاية وسعر التوصيل:
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">الولاية:</label>
              <select id="order-wilaya-select" onchange="onOrderWilayaChange()" required class="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-pink-500">
                <option value="">-- اختر ولاية التوصيل --</option>
                ${deliveryRates.map(r => `
                  <option value="${r.wilayaName}" data-fee="${r.defaultFee}" data-communes="${r.communes}">
                    ${r.wilayaCode ? r.wilayaCode + ' - ' : ''}${r.wilayaName} (سعر التوصيل المرجعي: ${r.defaultFee} دج)
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">البلدية أو المنطقة:</label>
              <input type="text" id="order-commune" required placeholder="مثلاً: بئر الجير / متليلي..." class="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 outline-none focus:border-pink-500" />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">سعر التوصيل المرجعي المحدد من التاجر:</label>
              <input type="number" id="order-standard-delivery" readonly class="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-600 outline-none" value="0" />
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">
                سعر التوصيل المفروض على الزبون:
                <span class="text-[10px] text-pink-600 font-normal">(يمكنكِ تخفيضه)</span>
              </label>
              <input 
                type="number" 
                id="order-charged-delivery" 
                value="0" 
                min="0"
                oninput="updateRepProfitCalculator()" 
                required 
                class="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 font-extrabold text-blue-700 outline-none focus:border-pink-500" 
              />
            </div>
          </div>

          <div id="delivery-subsidy-alert" class="hidden text-[11px] p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
            💡 ملاحظة: قمتِ بتخفيض سعر التوصيل بـ <strong id="subsidy-amount-text" class="text-red-600">0</strong> دج للزبون! سيتم خصم هذا الفارق تلقائياً من فائدتكِ الصافية دون المساس بأتعاب الموزع.
          </div>
        </div>

        <div id="rep-calc-box" class="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-2xl p-4">
          <div class="text-xs font-bold text-pink-900 mb-2.5 flex items-center justify-between">
            <span class="flex items-center gap-1.5">
              <i data-lucide="calculator" class="w-4 h-4"></i>
              الحساب الفوري للمبالغ وأرباحكِ الصافية:
            </span>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div class="bg-white/90 p-2 rounded-xl">
              <span class="text-[10px] text-slate-500 block">سعر المتجر (الجملة)</span>
              <span id="calc-base-price" class="font-extrabold text-slate-800">0 دج</span>
            </div>
            
            <div class="bg-white/90 p-2 rounded-xl">
              <span class="text-[10px] text-slate-500 block">سعر المنتجات للزبون</span>
              <span id="calc-product-selling" class="font-extrabold text-slate-800">0 دج</span>
            </div>

            <div class="bg-blue-50 border border-blue-200 p-2 rounded-xl">
              <span class="text-[10px] text-blue-800 font-bold block">إجمالي تحصيل الزبون</span>
              <span id="calc-total-customer" class="font-black text-blue-700">0 دج</span>
              <span class="text-[9px] text-slate-400 block">(منتجات + توصيل)</span>
            </div>

            <div class="bg-emerald-100 border border-emerald-300 p-2 rounded-xl">
              <span class="text-[10px] text-emerald-800 font-bold block">فائدتكِ الصافية 💰</span>
              <span id="calc-rep-profit" class="text-sm font-black text-emerald-700">0 دج</span>
              <span id="calc-subsidy-note" class="text-[9px] text-emerald-900 block">(بعد خصم التوصيل)</span>
            </div>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-100 space-y-3">
          <h4 class="text-xs font-bold text-slate-800">بيانات الزبون وعنوان التسليم:</h4>
          
          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">اسم الزبون الكامل:</label>
            <input type="text" id="order-customer-name" required placeholder="مثلاً: أمينة قدور" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-pink-500" />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">رقم هاتف الزبون:</label>
            <input type="tel" id="order-customer-phone" required placeholder="05 / 06 / 07 ..." class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono outline-none focus:border-pink-500" />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">العنوان التفصيلي / الحي / رقم المنزل:</label>
            <input type="text" id="order-customer-address" required placeholder="مثلاً: حي الياسمين عمارة 4 الشقة 12" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-pink-500" />
          </div>

          <div>
            <label class="block text-[11px] font-bold text-slate-600 mb-1">ملاحظات إضافية لعامل التوصيل (اختياري):</label>
            <input type="text" id="order-customer-notes" placeholder="مثلاً: الاتصال بعد الظهر، التوصيل لمقر العمل..." class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-pink-500" />
          </div>
        </div>

        <button type="submit" class="w-full bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 mt-4">
          <i data-lucide="send" class="w-4 h-4"></i>
          تأكيد وإرسال الطلبية للتوصيل 🚚
        </button>

      </form>
    </div>
  `;
}

function renderRepMyOrders(rep) {
  const orders = window.store.getOrders().filter(o => o.repId === rep.id);

  return `
    <div class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">سجل طلبياتي (${orders.length})</h3>
        <span class="text-xs text-slate-500">يتم تفعيل فائدتكِ فور توصيل الطلبية للزبون واستلام المبلغ.</span>
      </div>

      <div class="space-y-3">
        ${orders.length === 0 ? `
          <div class="p-8 bg-white rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
            لم تسجلي أي طلبيات بعد! ابدئي بتسجيل أول طلبية لزبائنكِ.
          </div>
        ` : orders.map(o => {
          const totalCharged = o.totalCustomerAmount || ((o.sellingPrice * o.quantity) + (o.chargedDeliveryFee || 0));
          return `
          <div class="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="font-mono font-bold text-xs text-slate-900">${o.id}</span>
                <span class="text-[10px] text-slate-400 font-mono">${o.date}</span>
                <span class="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold">${o.wilaya || ''}</span>
              </div>
              <div>${renderStatusBadge(o.status, o.driverInquiryOpen)}</div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3 text-xs">
              <div>
                <span class="text-slate-400 text-[10px] block">المنتج</span>
                <span class="font-bold text-slate-800">${o.productName} (x${o.quantity})</span>
              </div>
              <div>
                <span class="text-slate-400 text-[10px] block">بيانات الزبون</span>
                <span class="font-bold text-slate-800">${o.customerName}</span>
                <span class="text-slate-500 block text-[11px] font-mono">${o.customerPhone}</span>
              </div>
              <div>
                <span class="text-slate-400 text-[10px] block">المبلغ المطلوب وفائدتكِ</span>
                <span class="text-slate-900 font-extrabold">الزبون يدفع: ${totalCharged.toLocaleString()} دج</span>
                <span class="text-emerald-600 font-black block">فائدتكِ الصافية: +${(o.repProfit || 0).toLocaleString()} دج</span>
                ${o.deliverySubsidy > 0 ? `<span class="text-[10px] text-rose-500 block">(مخصوم منها ${o.deliverySubsidy} دج تخفيض توصيل)</span>` : ''}
              </div>
            </div>

            ${o.driverNotes ? `
              <div class="p-2.5 rounded-xl ${o.driverInquiryOpen ? 'bg-amber-50 border border-amber-200 text-amber-900 font-semibold' : 'bg-slate-50 text-slate-600'} text-xs">
                🚚 ملاحظة التوصيل: ${o.driverNotes}
              </div>
            ` : ''}

            <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="text-slate-400 text-[11px]">${o.address}</span>
              <a href="https://wa.me/213${o.customerPhone.replace(/^0/, '')}" target="_blank" class="text-emerald-600 font-bold hover:underline flex items-center gap-1">
                <span>واتساب الزبون</span>
                <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
              </a>
            </div>

          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderRepCatalog(rep) {
  const products = window.store.getProducts();

  return `
    <div class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">كتالوج المنتجات والكميات المتوفرة بالمخزون</h3>
        <span class="text-xs text-slate-500">سعر المتجر هو سعر الجملة المعتمد لكِ وتضيفين ربحكِ فوقه</span>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${products.map(p => `
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              <div class="relative h-40 bg-slate-100">
                <img src="${p.image}" class="w-full h-full object-cover" alt="${p.name}" />
                <span class="absolute top-2.5 right-2.5 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  ${p.category}
                </span>
                <span class="absolute bottom-2.5 right-2.5 text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                  p.stock === 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }">
                  ${p.stock === 0 ? 'غير متوفر' : `متوفر: ${p.stock} قطعة`}
                </span>
              </div>
              <div class="p-4">
                <h4 class="font-bold text-slate-900 text-sm mb-1">${p.name}</h4>
                <p class="text-xs text-slate-500 line-clamp-2 mb-3">${p.description}</p>
                
                <div class="bg-pink-50 border border-pink-100 p-2.5 rounded-xl flex items-center justify-between">
                  <span class="text-xs text-pink-900 font-bold">سعر المتجر المعتمد لكِ:</span>
                  <span class="text-sm font-extrabold text-pink-700">${p.basePrice.toLocaleString()} دج</span>
                </div>
              </div>
            </div>

            <div class="p-3 bg-slate-50 border-t border-slate-100">
              <button 
                onclick="prepareRepOrderWithProduct('${p.id}')" 
                ${p.stock === 0 ? 'disabled' : ''}
                class="w-full text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  p.stock === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-pink-600 hover:bg-pink-700 text-white shadow-sm'
                }"
              >
                ${p.stock === 0 ? 'نفد من المخزن' : 'بيع هذا المنتج وتسجيل طلب 🛍️'}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ==========================================
// 3. DELIVERY DRIVER VIEW (بوابة عامل التوصيل - محصورة بما يخصه فقط)
// ==========================================
function renderDriverView(currentUser) {
  let driver = window.store.state.drivers.find(d => d.userId === currentUser.id || d.phone === currentUser.phone);
  if (!driver) {
    driver = window.store.state.drivers[0] || { id: "DRV-01", name: currentUser.name };
  }
  const driverFin = window.store.getDriverFinancials(driver.id || "DRV-01");
  const allOrders = window.store.getOrders();
  const activeDeliveries = allOrders.filter(o => o.status === "out_for_delivery");

  return `
    <div class="animate-fade-in space-y-5 max-w-3xl mx-auto">
      
      <!-- Driver Hero Banner -->
      <div class="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-md">
        <div class="flex items-center justify-between">
          <div>
            <div class="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-semibold mb-2">
              🚚 حساب عامل التوصيل
            </div>
            <h2 class="text-xl font-extrabold">${currentUser.name}</h2>
            <p class="text-xs text-emerald-100 mt-0.5">تتبع مهام التوصيل، استلام المبالغ، ومتابعة مستحقاتك المرجعية بدقة.</p>
          </div>
          <div class="text-center bg-white/10 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/20">
            <span class="text-[11px] text-emerald-100 block">مهام نشطة</span>
            <span class="text-2xl font-black">${activeDeliveries.length}</span>
          </div>
        </div>

        <!-- Driver Quick Metrics in Header -->
        <div class="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20 text-center text-xs">
          <div>
            <span class="text-[10px] text-emerald-100 block">أتعابي المستحقة (سلمت)</span>
            <span class="text-base sm:text-lg font-black text-white">${driverFin.earnedDeliveryFees.toLocaleString()} دج</span>
          </div>
          <div>
            <span class="text-[10px] text-emerald-100 block">أتعابي المعلقة (بالطريق)</span>
            <span class="text-base sm:text-lg font-black text-amber-200">${driverFin.pendingDeliveryFees.toLocaleString()} دج</span>
          </div>
          <div>
            <span class="text-[10px] text-emerald-100 block">كاش محصل بيدي</span>
            <span class="text-base sm:text-lg font-black text-white">${driverFin.totalCashCollected.toLocaleString()} دج</span>
          </div>
        </div>
      </div>

      <!-- Driver Navigation Tabs -->
      <div class="flex border-b border-slate-200 gap-2">
        <button onclick="switchTab('driverOrders')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'driverOrders' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="truck" class="w-4 h-4"></i>
          مهام التوصيل اليومية
          <span class="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded-full font-bold">${activeDeliveries.length}</span>
        </button>

        <button onclick="switchTab('driverEarnings')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'driverEarnings' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="wallet" class="w-4 h-4"></i>
          مستحقات التوصيل وحساباتي 💰
        </button>
      </div>

      <!-- Tab Content -->
      ${activeTab === 'driverEarnings' ? renderDriverEarningsTab(driverFin) : renderDriverOrdersTab(activeDeliveries, driverFin)}

    </div>
  `;
}

function renderDriverOrdersTab(activeDeliveries, driverFin) {
  return `
    <div class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-800">الطلبيات الجاهزة للتسليم الآن (${activeDeliveries.length})</h3>
        <span class="text-xs text-slate-500">تم تسليم ${driverFin.deliveredCount} طلبية بنجاح</span>
      </div>

      <div class="space-y-4">
        ${activeDeliveries.length === 0 ? `
          <div class="p-10 bg-white rounded-3xl border border-slate-200 text-center">
            <span class="text-4xl block mb-2">🎉</span>
            <h4 class="font-bold text-slate-800 text-sm">عمل رائع! لا توجد طلبيات متبقية للتوصيل</h4>
            <p class="text-xs text-slate-400 mt-1">كافة الطلبيات تم تسليمها بنجاح.</p>
          </div>
        ` : activeDeliveries.map(o => {
          const totalToCollect = o.totalCustomerAmount || ((o.sellingPrice * o.quantity) + (o.chargedDeliveryFee || 0));
          const standardFee = parseFloat(o.standardDeliveryFee) || 0;

          return `
          <div class="bg-white rounded-3xl border-2 ${o.driverInquiryOpen ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'} p-5 shadow-sm space-y-4">
            
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                ${o.id}
              </span>
              <span class="text-xs font-bold text-pink-700">المندوبة: 🌸 ${o.repName}</span>
            </div>

            <div class="bg-slate-50 p-3.5 rounded-2xl space-y-2">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-xs font-extrabold text-slate-900 block">${o.customerName}</span>
                  <span class="text-xs text-slate-500 font-mono block">${o.customerPhone}</span>
                </div>
                
                <div class="flex items-center gap-2">
                  <a href="tel:${o.customerPhone}" class="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-sm">
                    <i data-lucide="phone" class="w-4 h-4"></i>
                  </a>
                  <a href="https://wa.me/213${o.customerPhone.replace(/^0/, '')}" target="_blank" class="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm">
                    <i data-lucide="message-circle" class="w-4 h-4"></i>
                  </a>
                </div>
              </div>

              <div class="text-xs text-slate-700 flex items-start gap-1.5 pt-2 border-t border-slate-200/60">
                <i data-lucide="map-pin" class="w-4 h-4 text-slate-400 shrink-0 mt-0.5"></i>
                <span>${o.wilaya || ''} - ${o.commune || ''} | ${o.address}</span>
              </div>
            </div>

            <div class="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span class="text-[11px] text-emerald-900 font-bold block">${o.productName} (x${o.quantity})</span>
                <span class="text-[11px] text-slate-600">المبلغ الإجمالي المطلوب تحصيله عند الباب:</span>
                <span class="text-xl font-black text-emerald-700 font-mono block">${totalToCollect.toLocaleString()} دج</span>
              </div>
              <div class="text-left sm:text-left pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-200/70">
                <span class="text-[10px] text-slate-500 block">أتعاب التوصيل المعتمدة لك:</span>
                <span class="text-sm font-extrabold text-blue-700 font-mono">+${standardFee.toLocaleString()} دج</span>
                <span class="text-[9px] text-slate-400 block">(السعر المرجعي المحدد)</span>
              </div>
            </div>

            ${o.driverNotes ? `
              <div class="p-3 rounded-2xl ${o.driverInquiryOpen ? 'bg-amber-100 text-amber-950 border border-amber-300 font-semibold' : 'bg-slate-100 text-slate-700'} text-xs whitespace-pre-line">
                📝 ملاحظاتك: ${o.driverNotes}
              </div>
            ` : ''}

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
              <button onclick="driverMarkDeliveredPrompt('${o.id}', ${totalToCollect})" class="sm:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-transform active:scale-95 flex items-center justify-center gap-1.5">
                <i data-lucide="check-check" class="w-4 h-4"></i>
                تم التسليم واستلام المبلغ ✅
              </button>

              <button onclick="openDriverInquiryModal('${o.id}')" class="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-3 rounded-2xl shadow-sm flex items-center justify-center gap-1.5">
                <i data-lucide="alert-circle" class="w-4 h-4"></i>
                استفسار / ملاحظة ⚠️
              </button>
            </div>

            <div class="text-center pt-1">
              <button onclick="driverMarkReturnedPrompt('${o.id}')" class="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline">
                تعذر التسليم / الزبون رفض الاستلام (إرجاع للمخزن)
              </button>
            </div>

          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderDriverEarningsTab(driverFin) {
  const allOrders = driverFin.orders || [];

  return `
    <div class="space-y-5 animate-fade-in">
      
      <div class="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-950 leading-relaxed shadow-sm">
        <div class="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
          <i data-lucide="info" class="w-4 h-4"></i>
          قاعدة حساب مستحقات التوصيل المرجعية:
        </div>
        <p>
          يتم احتساب أتعاب التوصيل الخاصة بك على أساس <strong>السعر المرجعي الذي حدده المدير</strong> لكل ولاية وبلدية، 
          وليس على أساس السعر المخفض الذي قد تقدمه المندوبة للزبونة.
          <br>
          <span class="text-blue-700 font-semibold mt-1 inline-block">
            📌 مثال: إذا قمت بتوصيل 5 طلبيات إلى ولاية غرداية بسعر 250 دج للطلبية، فإن مجموع مستحقاتك هو <strong>1250 دج</strong> بالكامل.
          </span>
        </p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-xs font-bold text-slate-500 block mb-1">أتعاب التوصيل المستحقة لي:</span>
          <div class="text-2xl font-black text-emerald-600">${driverFin.earnedDeliveryFees.toLocaleString()} <span class="text-xs text-slate-500 font-normal">دج</span></div>
          <p class="text-[11px] text-slate-500 mt-1">عن ${driverFin.deliveredCount} طلبية تم تسليمها بنجاح</p>
          ${driverFin.pendingDeliveryFees > 0 ? `
            <div class="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-2 inline-block font-bold">
              + ${driverFin.pendingDeliveryFees.toLocaleString()} دج أتعاب معلقة (بالطريق)
            </div>
          ` : ''}
        </div>

        <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <span class="text-xs font-bold text-slate-500 block mb-1">الكاش المحصل بيدي من الزبائن:</span>
          <div class="text-2xl font-black text-slate-900">${driverFin.totalCashCollected.toLocaleString()} <span class="text-xs text-slate-500 font-normal">دج</span></div>
          <p class="text-[11px] text-slate-500 mt-1">المبالغ المستلمة نقداً عند أبواب الزبائن</p>
        </div>

        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 shadow-sm">
          <span class="text-xs font-bold text-blue-900 block mb-1">الصافي الواجب تسليمه للمتجر:</span>
          <div class="text-2xl font-black text-blue-700">${driverFin.netCashDueToStore.toLocaleString()} <span class="text-xs text-blue-900 font-normal">دج</span></div>
          <p class="text-[11px] text-blue-800 mt-1 font-medium">(الكاش المحصل - أتعاب التوصيل المستحقة لك)</p>
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 class="font-bold text-slate-800 text-xs sm:text-sm">تفصيل أتعاب التوصيل لكل طلبية</h4>
          <span class="text-xs text-slate-500">مجموع الطلبيات: ${allOrders.length}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 font-bold">رقم الطلب</th>
                <th class="p-3 font-bold">الزبون والولاية</th>
                <th class="p-3 font-bold">سعر التوصيل المرجعي</th>
                <th class="p-3 font-bold">المحصل من الزبون</th>
                <th class="p-3 font-bold">حالة الطلب</th>
                <th class="p-3 font-bold">مستحقاتك</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${allOrders.length === 0 ? `
                <tr>
                  <td colspan="6" class="p-8 text-center text-slate-400">لا توجد طلبيات مسجلة بعد.</td>
                </tr>
              ` : allOrders.map(o => {
                const totalCharged = o.totalCustomerAmount || ((o.sellingPrice * o.quantity) + (o.chargedDeliveryFee || 0));
                const stdFee = parseFloat(o.standardDeliveryFee) || 0;
                const isDelivered = o.status === "delivered";

                return `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="p-3 font-mono font-bold text-slate-900">${o.id}</td>
                  <td class="p-3">
                    <span class="font-bold text-slate-800 block">${o.customerName}</span>
                    <span class="text-[10px] text-blue-700 font-semibold">${o.wilaya || ''} - ${o.commune || ''}</span>
                  </td>
                  <td class="p-3 font-extrabold text-blue-700 font-mono">
                    ${stdFee.toLocaleString()} دج
                  </td>
                  <td class="p-3 font-bold text-slate-900">
                    ${isDelivered ? totalCharged.toLocaleString() + ' دج' : '<span class="text-slate-400">قيد التحصيل</span>'}
                  </td>
                  <td class="p-3">
                    ${renderStatusBadge(o.status, o.driverInquiryOpen)}
                  </td>
                  <td class="p-3 whitespace-nowrap">
                    ${isDelivered 
                      ? `<span class="font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+${stdFee.toLocaleString()} دج (مستحقة)</span>` 
                      : `<span class="font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">${stdFee.toLocaleString()} دج (معلقة)</span>`}
                  </td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

// ==========================================
// STATUS BADGES & HELPERS
// ==========================================
function renderStatusBadge(status, hasInquiry = false) {
  if (hasInquiry) {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 pulse-badge"><span>⚠️</span> استفسار توصيل</span>`;
  }
  switch (status) {
    case "pending":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">قيد التجهيز</span>`;
    case "out_for_delivery":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">قيد التوصيل 🚚</span>`;
    case "delivered":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">تم التسليم بنجاح ✅</span>`;
    case "returned":
      return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">مرتجع / ملغى ❌</span>`;
    default:
      return `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">${status}</span>`;
  }
}

// Mobile Bottom Navigation Bar (Strictly Role-Based)
function renderMobileBottomNav(currentUser) {
  if (currentUser.role === "admin") {
    return `
      <nav class="mobile-bottom-nav">
        <button onclick="switchTab('dashboard')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'dashboard' ? 'text-red-600' : 'text-slate-400'}">
          <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
          المؤشرات
        </button>
        <button onclick="switchTab('users')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'users' ? 'text-red-600' : 'text-slate-400'}">
          <i data-lucide="shield-check" class="w-5 h-5"></i>
          المستخدمين
        </button>
        <button onclick="switchTab('products')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'products' ? 'text-red-600' : 'text-slate-400'}">
          <i data-lucide="package" class="w-5 h-5"></i>
          المخزون
        </button>
        <button onclick="switchTab('orders')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'orders' ? 'text-red-600' : 'text-slate-400'}">
          <i data-lucide="shopping-bag" class="w-5 h-5"></i>
          الطلبيات
        </button>
        <button onclick="switchTab('reps')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'reps' ? 'text-red-600' : 'text-slate-400'}">
          <i data-lucide="users" class="w-5 h-5"></i>
          المندوبات
        </button>
      </nav>
    `;
  } else if (currentUser.role === "rep") {
    return `
      <nav class="mobile-bottom-nav">
        <button onclick="switchTab('newOrder')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'newOrder' ? 'text-pink-600' : 'text-slate-400'}">
          <i data-lucide="plus-circle" class="w-5 h-5"></i>
          طلب جديد
        </button>
        <button onclick="switchTab('myOrders')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'myOrders' ? 'text-pink-600' : 'text-slate-400'}">
          <i data-lucide="package-check" class="w-5 h-5"></i>
          طلبياتي
        </button>
        <button onclick="switchTab('catalog')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'catalog' ? 'text-pink-600' : 'text-slate-400'}">
          <i data-lucide="grid" class="w-5 h-5"></i>
          الكتالوج
        </button>
      </nav>
    `;
  } else if (currentUser.role === "driver") {
    return `
      <nav class="mobile-bottom-nav">
        <button onclick="switchTab('driverOrders')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'driverOrders' ? 'text-emerald-600' : 'text-slate-400'}">
          <i data-lucide="truck" class="w-5 h-5"></i>
          مهام اليوم
        </button>
        <button onclick="switchTab('driverEarnings')" class="flex flex-col items-center gap-1 text-[10px] font-bold ${activeTab === 'driverEarnings' ? 'text-emerald-600' : 'text-slate-400'}">
          <i data-lucide="wallet" class="w-5 h-5"></i>
          مستحقاتي
        </button>
      </nav>
    `;
  }
  return "";
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  const bg = type === "success" ? "bg-emerald-600" : type === "error" ? "bg-red-600" : "bg-blue-600";
  toast.className = `${bg} text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : 'ℹ'}</span><span>${message}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// ==========================================
// MODALS & EVENT HANDLERS
// ==========================================

// Add Product Modal with AI Image Generator
function openAddProductModal() {
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">إضافة منتج جديد للمخزون 📦</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleSaveProduct(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">اسم المنتج:</label>
            <input type="text" id="prd-name" required placeholder="مثلاً: ساعة يد نسائية فاخرة" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
          </div>

          <div class="p-3.5 bg-red-50/60 border border-red-200 rounded-2xl space-y-3">
            <span class="text-xs font-bold text-red-950 block">تسعير المنتج وحساب أرباح التاجر:</span>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">سعر الشراء (التكلفة عليك):</label>
                <input 
                  type="number" 
                  id="prd-cost-price" 
                  required 
                  placeholder="مثلاً: 1500" 
                  oninput="updateModalProfitCalc()" 
                  class="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-bold text-slate-800 focus:border-red-600" 
                />
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">
                  سعر بيعك (للمندوبة):
                  <span class="text-[10px] text-red-600 font-normal block">(سعر الجملة المعتمد)</span>
                </label>
                <input 
                  type="number" 
                  id="prd-base-price" 
                  required 
                  placeholder="مثلاً: 2500" 
                  oninput="updateModalProfitCalc()" 
                  class="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-red-700 focus:border-red-600" 
                />
              </div>
            </div>

            <div class="p-2.5 bg-white rounded-xl border border-red-100 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-slate-500 block">ربحك الصافي للقطعة (التاجر):</span>
                <span id="modal-owner-profit" class="text-xs font-black text-emerald-600">0 دج</span>
              </div>
              <div class="text-left">
                <span class="text-[10px] text-slate-500 block">نسبة فائدتك:</span>
                <span id="modal-owner-pct" class="text-xs font-black text-red-600">0%</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">الكمية الأولية بالمخزن:</label>
              <input type="number" id="prd-stock" required value="10" min="0" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600 font-bold" />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">حد تنبيه نقص المخزون:</label>
              <input type="number" id="prd-min-alert" value="5" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600 font-bold" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">التصنيف:</label>
            <input type="text" id="prd-category" placeholder="عطور / تجميل / إكسسوارات..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
          </div>

          <!-- Product Image Box (Upload from Device + AI Generation) -->
          <div class="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div class="flex items-center justify-between">
              <label class="block font-bold text-slate-800 text-xs">صورة المنتج 🖼️:</label>
              <span class="text-[10px] text-slate-500">رفع من الهاتف أو توليد بالذكاء الاصطناعي</span>
            </div>

            <div class="relative w-full h-36 bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center">
              <img id="prd-image-preview" src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80" class="w-full h-full object-cover" alt="معاينة الصورة" />
              
              <div id="image-loading-overlay" class="hidden absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-3 z-10">
                <div class="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin mb-2"></div>
                <span class="text-xs font-bold text-amber-300">جاري توليد صورة احترافية بالذكاء الاصطناعي... ✨</span>
                <span class="text-[10px] text-slate-300 mt-1">يتم تصميم صورة تجارية إعلانية للمنتج</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <label class="cursor-pointer bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 shadow-xs transition-colors">
                <i data-lucide="upload" class="w-3.5 h-3.5 text-blue-600"></i>
                <span>رفع من الهاتف 📷</span>
                <input type="file" accept="image/*" class="hidden" onchange="handleProductImageUpload(event, 'prd-image', 'prd-image-preview')" />
              </label>

              <button type="button" onclick="generateProductImageAI('prd-image', 'prd-image-preview', 'prd-name')" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>توليد بالذكاء الاصطناعي ✨</span>
              </button>
            </div>

            <input type="text" id="prd-image" value="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80" placeholder="أو الصق رابط صورة..." class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-500 outline-none focus:border-red-600" onchange="document.getElementById('prd-image-preview').src = this.value" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">وصف المنتج:</label>
            <textarea id="prd-desc" rows="2" placeholder="وصف موجز للمنتج ومميزاته..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">حفظ المنتج</button>
          </div>
        </form>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function updateModalProfitCalc() {
  const costInput = document.getElementById("prd-cost-price");
  const baseInput = document.getElementById("prd-base-price");
  const profitSpan = document.getElementById("modal-owner-profit");
  const pctSpan = document.getElementById("modal-owner-pct");

  if (!costInput || !baseInput || !profitSpan || !pctSpan) return;

  const cost = parseFloat(costInput.value) || 0;
  const base = parseFloat(baseInput.value) || 0;
  const profit = Math.max(0, base - cost);
  const pct = cost > 0 ? Math.round((profit / cost) * 100) : 0;

  profitSpan.innerText = `+${profit.toLocaleString()} دج`;
  pctSpan.innerText = `${pct}%`;
}

function handleSaveProduct(e) {
  e.preventDefault();
  const name = document.getElementById("prd-name").value;
  const costPrice = document.getElementById("prd-cost-price").value;
  const basePrice = document.getElementById("prd-base-price").value;
  const stock = document.getElementById("prd-stock").value;
  const category = document.getElementById("prd-category").value || "عام";
  const minStockAlert = document.getElementById("prd-min-alert").value;
  const image = document.getElementById("prd-image").value || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80";
  const description = document.getElementById("prd-desc").value;

  window.store.addProduct({ name, costPrice, basePrice, stock, category, minStockAlert, image, description });
  closeModal();
  showToast("تمت إضافة المنتج للمخزون وحساب نسبة أرباحك بنجاح ✨");
}

function openEditProductModal(id) {
  const p = window.store.getProductById(id);
  if (!p) return;

  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">تعديل المنتج: ${p.name}</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleUpdateProduct(event, '${p.id}')" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">اسم المنتج:</label>
            <input type="text" id="edit-prd-name" value="${p.name}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600 font-bold" />
          </div>

          <div class="p-3 bg-red-50/60 border border-red-200 rounded-2xl space-y-3">
            <span class="text-xs font-bold text-red-950 block">تعديل الأسعار وأرباح التاجر:</span>
            
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block font-bold text-slate-700 mb-1">سعر الشراء (التكلفة عليك):</label>
                <input type="number" id="edit-prd-cost" value="${p.costPrice || 0}" required class="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-bold" />
              </div>

              <div>
                <label class="block font-bold text-slate-700 mb-1">سعر بيعك (للمندوبة):</label>
                <input type="number" id="edit-prd-base" value="${p.basePrice}" required class="w-full bg-white border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-red-700" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">الكمية بالمخزن:</label>
              <input type="number" id="edit-prd-stock" value="${p.stock}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600 font-bold" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">التصنيف:</label>
              <input type="text" id="edit-prd-cat" value="${p.category}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
            </div>
          </div>

          <!-- Product Image Box in Edit Modal -->
          <div class="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div class="flex items-center justify-between">
              <label class="block font-bold text-slate-800 text-xs">صورة المنتج 🖼️:</label>
              <span class="text-[10px] text-slate-500">رفع من الهاتف أو توليد بالذكاء الاصطناعي</span>
            </div>

            <div class="relative w-full h-36 bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center">
              <img id="edit-prd-image-preview" src="${p.image}" class="w-full h-full object-cover" alt="معاينة الصورة" />
              
              <div id="edit-image-loading-overlay" class="hidden absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-3 z-10">
                <div class="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin mb-2"></div>
                <span class="text-xs font-bold text-amber-300">جاري توليد صورة احترافية بالذكاء الاصطناعي... ✨</span>
                <span class="text-[10px] text-slate-300 mt-1">يتم تصميم صورة تجارية إعلانية للمنتج</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <label class="cursor-pointer bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 shadow-xs transition-colors">
                <i data-lucide="upload" class="w-3.5 h-3.5 text-blue-600"></i>
                <span>رفع من الهاتف 📷</span>
                <input type="file" accept="image/*" class="hidden" onchange="handleProductImageUpload(event, 'edit-prd-image', 'edit-prd-image-preview')" />
              </label>

              <button type="button" onclick="generateProductImageAI('edit-prd-image', 'edit-prd-image-preview', 'edit-prd-name', 'edit-image-loading-overlay')" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>توليد بالذكاء الاصطناعي ✨</span>
              </button>
            </div>

            <input type="text" id="edit-prd-image" value="${p.image}" class="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-500 outline-none focus:border-red-600" onchange="document.getElementById('edit-prd-image-preview').src = this.value" />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">حفظ التعديلات</button>
          </div>
        </form>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function handleUpdateProduct(e, id) {
  e.preventDefault();
  const name = document.getElementById("edit-prd-name").value;
  const costPrice = document.getElementById("edit-prd-cost").value;
  const basePrice = document.getElementById("edit-prd-base").value;
  const stock = document.getElementById("edit-prd-stock").value;
  const category = document.getElementById("edit-prd-cat").value;
  const image = document.getElementById("edit-prd-image") ? document.getElementById("edit-prd-image").value : undefined;

  window.store.updateProduct(id, { name, costPrice, basePrice, stock, category, image });
  closeModal();
  showToast("تم تحديث بيانات المنتج والصورة بنجاح ✓");
}

function quickAdjustStock(id, delta) {
  window.store.adjustStock(id, delta);
  showToast(`تم تعديل المخزون (${delta > 0 ? '+' + delta : delta})`);
}

function confirmDeleteProduct(id) {
  if (confirm("هل أنت متأكد من حذف هذا المنتج من المخزون؟")) {
    window.store.deleteProduct(id);
    showToast("تم حذف المنتج من المخزون.");
  }
}

// AI Image Generator Helper
function generateProductImageAI(targetInputId = 'prd-image', previewImgId = 'prd-image-preview', nameInputId = 'prd-name', overlayId = 'image-loading-overlay') {
  const nameInput = document.getElementById(nameInputId);
  const productName = nameInput ? nameInput.value.trim() : '';

  if (!productName) {
    showToast("يرجى كتابة اسم المنتج أولاً لتوليد صورة مناسبة له بالذكاء الاصطناعي!", "error");
    if (nameInput) nameInput.focus();
    return;
  }

  const overlay = document.getElementById(overlayId);
  if (overlay) overlay.classList.remove('hidden');

  const prompt = `luxury commercial studio product photography of ${productName}, clean minimal elegant studio background, soft professional lighting, sharp focus, 4k ultra realistic, high-end e-commerce product catalog`;
  const seed = Math.floor(Math.random() * 9999999);
  const aiImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=600&height=600&nologo=true&seed=${seed}`;

  const tempImg = new Image();
  const timeoutId = setTimeout(() => {
    if (overlay) overlay.classList.add('hidden');
    const preview = document.getElementById(previewImgId);
    const targetInput = document.getElementById(targetInputId);
    if (preview) preview.src = aiImageUrl;
    if (targetInput) targetInput.value = aiImageUrl;
    showToast("تم توليد صورة المنتج بالذكاء الاصطناعي ✨");
  }, 12000);

  tempImg.onload = () => {
    clearTimeout(timeoutId);
    if (overlay) overlay.classList.add('hidden');
    const preview = document.getElementById(previewImgId);
    const targetInput = document.getElementById(targetInputId);
    if (preview) preview.src = aiImageUrl;
    if (targetInput) targetInput.value = aiImageUrl;
    showToast("تم توليد صورة المنتج بنجاح بالذكاء الاصطناعي ✨");
  };

  tempImg.onerror = () => {
    clearTimeout(timeoutId);
    if (overlay) overlay.classList.add('hidden');
    const preview = document.getElementById(previewImgId);
    const targetInput = document.getElementById(targetInputId);
    if (preview) preview.src = aiImageUrl;
    if (targetInput) targetInput.value = aiImageUrl;
    showToast("تم إنشاء الصورة وجاري عرضها...");
  };

  tempImg.src = aiImageUrl;
}

// Device / Phone Camera Image Upload Helper
function handleProductImageUpload(event, targetInputId = 'prd-image', previewImgId = 'prd-image-preview') {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showToast("يرجى اختيار ملف صورة صالح!", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = 600;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round(height * (maxDim / width));
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round(width * (maxDim / height));
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const preview = document.getElementById(previewImgId);
      const targetInput = document.getElementById(targetInputId);

      if (preview) preview.src = compressedDataUrl;
      if (targetInput) targetInput.value = compressedDataUrl;

      showToast("تم رفع صورة المنتج من جهازك بنجاح 📷");
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Delivery Rates Modals
function openAddDeliveryRateModal() {
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">إضافة ولاية / بلدية وسعر توصيل مرجعي 🚚</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleSaveDeliveryRate(event)" class="space-y-3.5 text-xs">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">رقم الولاية:</label>
              <input type="text" id="del-code" placeholder="مثلاً: 47" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono focus:border-red-600" />
            </div>
            <div class="col-span-2">
              <label class="block font-bold text-slate-700 mb-1">اسم الولاية:</label>
              <input type="text" id="del-name" required placeholder="مثلاً: غرداية" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold focus:border-red-600" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">سعر التوصيل المرجعي (المعتمد للموزع):</label>
            <input type="number" id="del-fee" required placeholder="مثلاً: 250" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-blue-700 text-sm focus:border-red-600" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">البلديات والمناطق المشمولة:</label>
            <textarea id="del-communes" rows="2" placeholder="كافة البلديات، متليلي، بريان، القرارة..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">حفظ سعر التوصيل</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleSaveDeliveryRate(e) {
  e.preventDefault();
  const wilayaCode = document.getElementById("del-code").value;
  const wilayaName = document.getElementById("del-name").value;
  const defaultFee = document.getElementById("del-fee").value;
  const communes = document.getElementById("del-communes").value;

  window.store.addDeliveryRate({ wilayaCode, wilayaName, defaultFee, communes });
  closeModal();
  showToast("تمت إضافة سعر التوصيل المرجعي للولاية بنجاح 🚚");
}

function openEditDeliveryRateModal(id) {
  const rate = window.store.getDeliveryRates().find(r => r.id === id);
  if (!rate) return;

  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">تعديل سعر التوصيل لـ ${rate.wilayaName}</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleUpdateDeliveryRate(event, '${rate.id}')" class="space-y-3.5 text-xs">
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">الرمز:</label>
              <input type="text" id="edit-del-code" value="${rate.wilayaCode || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono" />
            </div>
            <div class="col-span-2">
              <label class="block font-bold text-slate-700 mb-1">اسم الولاية:</label>
              <input type="text" id="edit-del-name" value="${rate.wilayaName}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-bold" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">سعر التوصيل المرجعي (دج):</label>
            <input type="number" id="edit-del-fee" value="${rate.defaultFee}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-blue-700 text-sm" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">البلديات المشمولة:</label>
            <textarea id="edit-del-communes" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none">${rate.communes}</textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">حفظ التعديلات</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleUpdateDeliveryRate(e, id) {
  e.preventDefault();
  const wilayaCode = document.getElementById("edit-del-code").value;
  const wilayaName = document.getElementById("edit-del-name").value;
  const defaultFee = document.getElementById("edit-del-fee").value;
  const communes = document.getElementById("edit-del-communes").value;

  window.store.updateDeliveryRate(id, { wilayaCode, wilayaName, defaultFee, communes });
  closeModal();
  showToast("تم تحديث سعر التوصيل المرجعي بنجاح ✓");
}

function confirmDeleteDeliveryRate(id) {
  if (confirm("هل تريد حذف هذا السعر؟")) {
    window.store.deleteDeliveryRate(id);
    showToast("تم حذف سعر التوصيل.");
  }
}

// Rep Order Handlers with Delivery Subsidy
function onOrderWilayaChange() {
  const select = document.getElementById("order-wilaya-select");
  const standardInput = document.getElementById("order-standard-delivery");
  const chargedInput = document.getElementById("order-charged-delivery");

  if (!select || !standardInput || !chargedInput) return;

  const opt = select.options[select.selectedIndex];
  if (!opt || !opt.value) {
    standardInput.value = 0;
    chargedInput.value = 0;
  } else {
    const fee = parseFloat(opt.getAttribute("data-fee")) || 500;
    standardInput.value = fee;
    chargedInput.value = fee;
  }

  updateRepProfitCalculator();
}

function updateRepProfitCalculator() {
  const select = document.getElementById("order-product-select");
  const qtyInput = document.getElementById("order-quantity");
  const priceInput = document.getElementById("order-selling-price");
  const standardDeliveryInput = document.getElementById("order-standard-delivery");
  const chargedDeliveryInput = document.getElementById("order-charged-delivery");
  const subsidyAlert = document.getElementById("delivery-subsidy-alert");
  const subsidyAmountText = document.getElementById("subsidy-amount-text");

  if (!select || !qtyInput || !priceInput) return;

  const selectedOpt = select.options[select.selectedIndex];
  const basePrice = selectedOpt && selectedOpt.value ? (parseFloat(selectedOpt.getAttribute("data-baseprice")) || 0) : 0;
  const qty = parseInt(qtyInput.value) || 1;
  const sellingPrice = parseFloat(priceInput.value) || 0;

  const standardDelivery = standardDeliveryInput ? (parseFloat(standardDeliveryInput.value) || 0) : 0;
  const chargedDelivery = chargedDeliveryInput ? (parseFloat(chargedDeliveryInput.value) || 0) : standardDelivery;

  const deliverySubsidy = Math.max(0, standardDelivery - chargedDelivery);

  const totalBase = basePrice * qty;
  const totalProductSelling = sellingPrice * qty;
  const grossRepProfit = Math.max(0, (sellingPrice - basePrice) * qty);
  const netRepProfit = Math.max(0, grossRepProfit - deliverySubsidy);
  const totalCustomerToPay = totalProductSelling + chargedDelivery;

  if (document.getElementById("calc-base-price")) {
    document.getElementById("calc-base-price").innerText = `${totalBase.toLocaleString()} دج`;
    document.getElementById("calc-product-selling").innerText = `${totalProductSelling.toLocaleString()} دج`;
    document.getElementById("calc-total-customer").innerText = `${totalCustomerToPay.toLocaleString()} دج`;
    document.getElementById("calc-rep-profit").innerText = `+${netRepProfit.toLocaleString()} دج`;
  }

  if (subsidyAlert && subsidyAmountText) {
    if (deliverySubsidy > 0) {
      subsidyAlert.classList.remove("hidden");
      subsidyAmountText.innerText = deliverySubsidy.toLocaleString();
    } else {
      subsidyAlert.classList.add("hidden");
    }
  }
}

function handleRepSubmitOrder(e, repId) {
  e.preventDefault();
  const select = document.getElementById("order-product-select");
  const productId = select.value;
  const quantity = document.getElementById("order-quantity").value;
  const sellingPrice = document.getElementById("order-selling-price").value;
  const wilayaSelect = document.getElementById("order-wilaya-select");
  const wilaya = wilayaSelect ? wilayaSelect.value : "";
  const commune = document.getElementById("order-commune").value;
  const standardDeliveryFee = document.getElementById("order-standard-delivery").value;
  const chargedDeliveryFee = document.getElementById("order-charged-delivery").value;
  const customerName = document.getElementById("order-customer-name").value;
  const customerPhone = document.getElementById("order-customer-phone").value;
  const address = document.getElementById("order-customer-address").value;
  const customerNotes = document.getElementById("order-customer-notes").value;

  try {
    const order = window.store.createOrder({
      repId,
      productId,
      quantity,
      sellingPrice,
      wilaya,
      commune,
      standardDeliveryFee,
      chargedDeliveryFee,
      customerName,
      customerPhone,
      address,
      customerNotes
    });

    showToast(`تم تسجيل الطلبية #${order.id} بنجاح وإرسالها للتوصيل 🚚`);
    switchTab("myOrders");
  } catch (err) {
    alert(err.message);
  }
}

function prepareRepOrderWithProduct(productId) {
  switchTab("newOrder");
  setTimeout(() => {
    const select = document.getElementById("order-product-select");
    if (select) {
      select.value = productId;
      updateRepProfitCalculator();
    }
  }, 100);
}

function openAddRepModal() {
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">إضافة مندوبة مبيعات جديدة 🌸</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleSaveRep(event)" class="space-y-3.5 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">اسم المندوبة:</label>
            <input type="text" id="rep-name" required placeholder="مثلاً: خديجة قاسم" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-pink-600" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">رقم الهاتف:</label>
              <input type="tel" id="rep-phone" required placeholder="05 / 06 / 07 ..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono focus:border-pink-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">الولاية:</label>
              <input type="text" id="rep-wilaya" placeholder="مثلاً: وهران" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-pink-600" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">ملاحظات (قنوات التسويق الخاصة بها):</label>
            <textarea id="rep-notes" rows="2" placeholder="تسوق عبر تيك توك، مجموعات فيسبوك..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-pink-600"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold shadow-md">حفظ المندوبة</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleSaveRep(e) {
  e.preventDefault();
  const name = document.getElementById("rep-name").value;
  const phone = document.getElementById("rep-phone").value;
  const wilaya = document.getElementById("rep-wilaya").value;
  const notes = document.getElementById("rep-notes").value;

  window.store.addRep({ name, phone, wilaya, notes });
  closeModal();
  showToast("تمت إضافة المندوبة بنجاح 🌸");
}

function openPayoutModal(repId) {
  const rep = window.store.getRepById(repId);
  const fin = window.store.getRepFinancials(repId);

  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">تسجيل دفعة أرباح للمندوبة: ${rep.name}</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div class="p-3 bg-pink-50 rounded-2xl mb-4 text-xs">
          <div class="flex justify-between font-bold text-pink-900">
            <span>الرصيد المتاح للسحب حالياً:</span>
            <span>${fin.availableBalance.toLocaleString()} دج</span>
          </div>
          <p class="text-[10px] text-pink-700 mt-1">يمثل مجموع فوائد الطلبيات المسلمة للزبائن بعد خصم أي سحوبات سابقة.</p>
        </div>

        <form onsubmit="handleSavePayout(event, '${rep.id}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">المبلغ المراد تحويله (دج):</label>
            <input type="number" id="payout-amount" value="${fin.availableBalance}" max="${fin.availableBalance}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-emerald-700 text-sm" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">طريقة الدفع:</label>
            <select id="payout-method" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-semibold">
              <option value="بريدي موب / CCP">بريدي موب / CCP</option>
              <option value="نقداً يد بيد">نقداً يد بيد</option>
              <option value="حساب بنكي">حساب بنكي</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">ملاحظة أو رقم العملية:</label>
            <input type="text" id="payout-note" placeholder="مثلاً: تحويل عبر بريدي موب" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">تأكيد تحويل الدفعة</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleSavePayout(e, repId) {
  e.preventDefault();
  const amount = document.getElementById("payout-amount").value;
  const method = document.getElementById("payout-method").value;
  const note = document.getElementById("payout-note").value;

  window.store.recordPayout(repId, amount, method, note);
  closeModal();
  showToast(`تم تسجيل دفعة أرباح بقيمة ${amount} دج بنجاح 💵`);
}

function openDriverInquiryModal(orderId) {
  const o = window.store.getOrderById(orderId);
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">تسجيل ملاحظة / استفسار ميداني ⚠️</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <p class="text-xs text-slate-500 mb-3">
          الطلب: <strong>#${o.id}</strong> للزبون <strong>${o.customerName}</strong>. ستظهر هذه الملاحظة فوراً للمدير وللمندوبة <strong>(${o.repName})</strong>.
        </p>

        <form onsubmit="handleSaveDriverInquiry(event, '${o.id}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">اختر نوع المشكلة السريعة:</label>
            <div class="grid grid-cols-2 gap-2 mb-2">
              <button type="button" onclick="document.getElementById('inquiry-text').value = 'الزبون لا يرد على الهاتف (تم الاتصال عدة مرات)'" class="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-[11px] text-right font-medium">📞 لم يرد على الهاتف</button>
              <button type="button" onclick="document.getElementById('inquiry-text').value = 'الزبون طلب تأجيل التسليم إلى الغد في نفس التوقيت'" class="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-[11px] text-right font-medium">⏳ طلب التأجيل</button>
              <button type="button" onclick="document.getElementById('inquiry-text').value = 'العنوان غير دقيق، يرجى الاستفسار من الزبون عن المعلم القريب'" class="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-[11px] text-right font-medium">📍 العنوان غير واضح</button>
              <button type="button" onclick="document.getElementById('inquiry-text').value = 'الزبون مسافر خارج الولاية حالياً ويرجع نهاية الأسبوع'" class="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-[11px] text-right font-medium">🚗 الزبون مسافر</button>
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">نص الملاحظة أو الاستفسار:</label>
            <textarea id="inquiry-text" required rows="3" placeholder="اكتب ملاحظتك بدقة..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-amber-500"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md">إرسال الملاحظة للمتجر والمندوبة</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleSaveDriverInquiry(e, orderId) {
  e.preventDefault();
  const text = document.getElementById("inquiry-text").value;
  window.store.addDriverInquiry(orderId, text, true);
  closeModal();
  showToast("تم إرسال الملاحظة للمدير والمندوبة بنجاح ⚠️", "info");
}

function openResolveInquiryModal(orderId) {
  const o = window.store.getOrderById(orderId);
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">حل استفسار التوصيل للطلب #${o.id}</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div class="p-3 bg-amber-50 rounded-2xl mb-3 text-xs text-amber-950 font-medium">
          ملاحظة السائق: ${o.driverNotes}
        </div>

        <form onsubmit="handleResolveInquiry(event, '${o.id}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">التوضيح أو التعليمات للموزع:</label>
            <textarea id="resolution-text" required rows="3" placeholder="مثلاً: تواصلت المندوبة مع الزبون وهو جاهز للاستلام بعد العصر..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">تأكيد التوضيح وإغلاق الاستفسار</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleResolveInquiry(e, orderId) {
  e.preventDefault();
  const text = document.getElementById("resolution-text").value;
  window.store.resolveInquiry(orderId, text);
  closeModal();
  showToast("تم توضيح الاستفسار وإشعار الموزع ✓");
}

function driverMarkDeliveredPrompt(orderId, totalToCollect) {
  if (confirm(`هل تم تسليم الطلبية بنجاح واستلام مبلغ ${totalToCollect.toLocaleString()} دج من الزبون (شامل المنتجات والتوصيل)؟`)) {
    window.store.markOrderDelivered(orderId);
    showToast("رائع! تم تأكيد التسليم واحتساب فائدة المندوبة بنجاح 🟢");
  }
}

function driverMarkReturnedPrompt(orderId) {
  const reason = prompt("يرجى كتابة سبب تعذر التوصيل / الإرجاع (مثلاً: الزبون غير رأيه):");
  if (reason !== null) {
    window.store.markOrderReturned(orderId, reason);
    showToast("تم تسجيل الطرد كمرتجع وإعادة الكمية للمخزون تلقائياً.");
  }
}

function adminMarkDelivered(orderId) {
  if (confirm("هل تريد تأكيد تسليم هذه الطلبية يدوياً؟")) {
    window.store.markOrderDelivered(orderId);
    showToast("تم تأكيد التوصيل واحتساب الفائدة للمندوبة.");
  }
}

function adminMarkReturned(orderId) {
  if (confirm("هل تريد تأكيد إرجاع هذه الطلبية وإعادة السلعة إلى المخزون؟")) {
    window.store.markOrderReturned(orderId, "إرجاع يدوي من المدير");
    showToast("تم تسجيل الإرجاع واستعادة المخزون.");
  }
}

function printOrderReceipt(orderId) {
  const o = window.store.getOrderById(orderId);
  if (!o) return;

  const totalToCollect = o.totalCustomerAmount || ((o.sellingPrice * o.quantity) + (o.chargedDeliveryFee || 0));

  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl">
        <div id="printable-receipt" class="space-y-4 text-xs font-sans">
          <div class="text-center pb-3 border-b border-slate-200 flex flex-col items-center">
            <img src="./assets/logo.jpg" alt="Bon Prix Suiv" class="h-12 object-contain mb-1" />
            <h2 class="text-base font-black text-slate-900">Bon Prix Suiv - وصل توصيل طلبية</h2>
            <p class="text-slate-500 font-mono text-xs">${o.id} - ${o.date}</p>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <span class="text-slate-400 text-[10px] block">المندوبة:</span>
              <span class="font-bold text-slate-800">🌸 ${o.repName}</span>
            </div>
            <div>
              <span class="text-slate-400 text-[10px] block">عامل التوصيل:</span>
              <span class="font-bold text-slate-800">🚚 ياسين التوصيل</span>
            </div>
          </div>

          <div class="bg-slate-50 p-3 rounded-xl space-y-1">
            <div class="font-bold text-slate-900">الزبون: ${o.customerName}</div>
            <div class="font-mono text-slate-700">الهاتف: ${o.customerPhone}</div>
            <div class="text-slate-700 font-semibold">الولاية والبلدية: ${o.wilaya || ''} - ${o.commune || ''}</div>
            <div class="text-slate-600">العنوان: ${o.address}</div>
          </div>

          <div class="border border-slate-200 rounded-xl p-3 space-y-2">
            <div class="flex justify-between font-bold text-slate-800">
              <span>المنتج: ${o.productName} (x${o.quantity})</span>
              <span>${(o.sellingPrice * o.quantity).toLocaleString()} دج</span>
            </div>
            <div class="flex justify-between text-slate-600">
              <span>سعر التوصيل:</span>
              <span>${(o.chargedDeliveryFee || 0).toLocaleString()} دج</span>
            </div>
            <div class="flex justify-between font-extrabold text-base text-slate-900 pt-2 border-t border-slate-100">
              <span>المبلغ الإجمالي المطلوب تحصيله:</span>
              <span class="font-mono">${totalToCollect.toLocaleString()} دج</span>
            </div>
          </div>

          <div class="text-center text-[10px] text-slate-400 pt-2">
            شكراً لثقتكم بنا!
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4 no-print">
          <button onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs">إغلاق</button>
          <button onclick="window.print()" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5">
            <i data-lucide="printer" class="w-4 h-4"></i>
            طباعة الوصل
          </button>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function closeModal() {
  const modal = document.getElementById("modal-container");
  if (modal) modal.innerHTML = "";
}

function confirmResetDemo() {
  if (confirm("هل تريد إعادة تعيين البيانات إلى البيانات الافتراضية التجريبية؟")) {
    window.store.resetDemo();
    showToast("تمت استعادة البيانات التجريبية الافتراضية.");
  }
}

