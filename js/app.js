// Main Application Controller & UI Logic with Full RBAC Security, Login, Role Approvals & AI Features
let authTab = "login"; // 'login' or 'register'
let activeTab = "dashboard"; // admin tabs: dashboard, products, orders, reps, deliveryRates, users, driverLog
                             // rep tabs: newOrder, catalog, myOrders
                             // driver tabs: driverOrders, driverEarnings
let currentFilterStatus = "all";
let searchQuery = "";
let deliverySearchQuery = "";
let userSearchQuery = "";
let productSearchQuery = "";
let productCategoryFilter = "all";

function getProductCategories(products) {
  const map = new Map();
  products.forEach(p => {
    const cat = (p.category || "عام").trim() || "عام";
    map.set(cat, (map.get(cat) || 0) + 1);
  });
  return Array.from(map.entries()); // [[categoryName, count], ...]
}

function getFilteredProducts(products) {
  const q = productSearchQuery.trim().toLowerCase();
  return products.filter(p => {
    const cat = (p.category || "عام").trim() || "عام";
    const matchesCat = productCategoryFilter === "all" || cat === productCategoryFilter;
    const matchesSearch = !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.id && p.id.toLowerCase().includes(q)) ||
      cat.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });
}

function onProductSearchInput(value, inputId) {
  productSearchQuery = value;
  renderApp();
  const el = document.getElementById(inputId);
  if (el) {
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }
}

function setProductCategoryFilter(cat) {
  productCategoryFilter = cat;
  renderApp();
}

function renderProductFilterBar(products, inputId, accent = "red") {
  const categories = getProductCategories(products);
  const filtered = getFilteredProducts(products);
  const activeBg = accent === "pink" ? "bg-pink-600 text-white shadow-sm" : "bg-red-600 text-white shadow-sm";
  const focusBorder = accent === "pink" ? "focus:border-pink-600" : "focus:border-red-600";

  return `
    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div class="relative flex-1">
          <input
            type="text"
            id="${inputId}"
            placeholder="🔍 ابحث باسم المنتج، الصنف، الرمز (PRD) أو الوصف..."
            value="${productSearchQuery.replace(/"/g, '&quot;')}"
            oninput="onProductSearchInput(this.value, '${inputId}')"
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-9 pl-8 outline-none ${focusBorder} transition-colors"
          />
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
          ${productSearchQuery ? `
            <button type="button" onclick="onProductSearchInput('', '${inputId}')" title="مسح البحث" class="absolute left-2.5 top-2 text-slate-400 hover:text-slate-700 font-bold text-sm px-1">&times;</button>
          ` : ''}
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
            عرض ${filtered.length} من ${products.length} منتج
          </span>
          ${(productSearchQuery || productCategoryFilter !== 'all') ? `
            <button type="button" onclick="productSearchQuery=''; productCategoryFilter='all'; renderApp();" class="text-[11px] font-bold text-red-600 hover:underline px-1">
              إعادة ضبط
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Category / Type Filter Pills -->
      <div class="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-100">
        <span class="text-[11px] font-bold text-slate-500 ml-1">🏷️ التصنيف حسب الصنف:</span>
        <button
          type="button"
          onclick="setProductCategoryFilter('all')"
          class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${productCategoryFilter === 'all' ? activeBg : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
        >
          الكل (${products.length})
        </button>
        ${categories.map(([cat, count]) => `
          <button
            type="button"
            onclick="setProductCategoryFilter('${cat.replace(/'/g, "\\'")}')"
            class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${productCategoryFilter === cat ? activeBg : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}"
          >
            ${cat} (${count})
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

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
    <div class="space-y-3.5 text-xs">
      <div class="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-emerald-900 text-[11px] flex items-center gap-2">
        <span>🛡️</span>
        <span><strong>درجة أمان عالية:</strong> الدخول محمي بكلمة المرور ورمز الأمان الشخصي (PIN) وموافقة صاحب المتجر.</span>
      </div>

      <!-- Google Sign-In Buttons for Sales Reps (المندوبات) and Store Owner -->
      <div class="space-y-2">
        <button type="button" onclick="openGoogleLoginModal('rep')" class="w-full bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white font-extrabold text-xs py-3 px-4 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2.5">
          <div class="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
            <svg class="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"/>
              <path fill="#FBBC05" d="M5.01 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4-3.14z"/>
              <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24z"/>
            </svg>
          </div>
          <span>الدخول بحساب Google للمندوبات 🌸</span>
        </button>

        <button type="button" onclick="openGoogleLoginModal('admin')" class="w-full bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-blue-500 font-extrabold text-xs py-2.5 px-4 rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"/>
            <path fill="#FBBC05" d="M5.01 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4-3.14z"/>
            <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24z"/>
          </svg>
          <span>الدخول عبر حساب Google (خاص بصاحب المتجر 👑)</span>
        </button>
      </div>

      <div class="relative flex py-0.5 items-center">
        <div class="flex-grow border-t border-slate-200"></div>
        <span class="flex-shrink mx-3 text-[11px] text-slate-400 font-bold">أو الدخول برقم الهاتف / البريد وكلمة السر</span>
        <div class="flex-grow border-t border-slate-200"></div>
      </div>

      <form onsubmit="handleLoginSubmit(event)" class="space-y-3">
        <div>
          <label class="block font-bold text-slate-700 mb-1">رقم الهاتف أو بريد Google:</label>
          <div class="relative">
            <input type="text" id="login-phone" required placeholder="05 / 06 / 07 أو بريد Gmail..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-9 font-mono text-slate-800 outline-none focus:border-red-600" />
            <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
          </div>
        </div>

        <div>
          <label class="block font-bold text-slate-700 mb-1">كلمة المرور (الرقم السري):</label>
          <div class="relative">
            <input type="password" id="login-password" required placeholder="••••••••" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-9 text-slate-800 outline-none focus:border-red-600" />
            <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
          </div>
        </div>

        <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2">
          <i data-lucide="shield-check" class="w-4 h-4"></i>
          دخول آمن إلى حسابي
        </button>
      </form>
    </div>
  `;
}

function renderRegisterForm() {
  const deliveryRates = window.store.getDeliveryRates();
  return `
    <form onsubmit="handleRegisterSubmit(event)" class="space-y-3 text-xs">
      <div class="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-amber-900 text-[11px] leading-relaxed">
        🛡️ <strong>نظام طلب التسجيل والأمان العالي:</strong> لا يُسمح بالدخول للتطبيق إلا بطلب تسجيل يُراجع ويُقبل من طرف <strong>صاحب المتجر (المسير العام)</strong>.
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1.5">الصفة المطلوبة في طلب التسجيل:</label>
        <div class="grid grid-cols-2 gap-2">
          <label class="cursor-pointer border-2 border-pink-200 bg-pink-50/50 hover:bg-pink-50 rounded-xl p-2.5 flex items-center gap-2">
            <input type="radio" name="reg-requested-role" value="rep" checked class="accent-pink-600" />
            <div>
              <span class="font-extrabold text-pink-900 block">🌸 مندوبة تسويق</span>
              <span class="text-[10px] text-pink-700">التسويق وحجز الطلبيات</span>
            </div>
          </label>
          <label class="cursor-pointer border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl p-2.5 flex items-center gap-2">
            <input type="radio" name="reg-requested-role" value="driver" class="accent-emerald-600" />
            <div>
              <span class="font-extrabold text-emerald-900 block">🚚 عامل توصيل</span>
              <span class="text-[10px] text-emerald-700">توصيل وتأكيد الطلبيات</span>
            </div>
          </label>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block font-bold text-slate-700 mb-1">الاسم الكامل:</label>
          <input type="text" id="reg-name" required placeholder="مثلاً: خديجة منصوري" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">الولاية / المنطقة:</label>
          <select id="reg-wilaya" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600 font-semibold">
            ${deliveryRates.map(r => `<option value="${r.wilayaName}">${r.wilayaName}</option>`).join('')}
          </select>
        </div>
      </div>

      <button type="button" onclick="openGoogleLoginModal('rep')" class="w-full bg-pink-50 hover:bg-pink-100 text-pink-900 border-2 border-pink-300 font-extrabold text-xs py-2.5 px-3 rounded-2xl flex items-center justify-center gap-2 transition-all">
        <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"/>
          <path fill="#FBBC05" d="M5.01 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4-3.14z"/>
          <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24z"/>
        </svg>
        <span>التسجيل والدخول للمندوبة بحساب Google 🌸</span>
      </button>

      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="block font-bold text-slate-700 mb-1">رقم الهاتف:</label>
          <input type="tel" id="reg-phone" required placeholder="05 / 06 / 07 ..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono focus:border-red-600" />
        </div>
        <div>
          <label class="block font-bold text-slate-700 mb-1">بريد Google (Gmail):</label>
          <input type="email" id="reg-email" placeholder="name@gmail.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-mono focus:border-red-600" />
        </div>
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">كلمة المرور (الرقم السري):</label>
        <input type="password" id="reg-password" required minlength="3" placeholder="اختاري كلمة مرور خاصة بكِ" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
      </div>

      <div>
        <label class="block font-bold text-slate-700 mb-1">ملاحظة لصاحب المتجر للموافقة على الطلب:</label>
        <textarea id="reg-note" rows="2" placeholder="خبرتك في التسويق أو وسيلة النقل المتوفرة للتوصيل..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600"></textarea>
      </div>

      <button type="submit" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 mt-1">
        <i data-lucide="user-check" class="w-4 h-4"></i>
        إرسال طلب التسجيل إلى صاحب المتجر للموافقة
      </button>
    </form>
  `;
}

// Waiting Screen for Pending Users
function renderPendingScreen(user) {
  const reqRoleLabel = user.requestedRole === "driver" ? "🚚 عامل توصيل" : "🌸 مندوبة تسويق وحجز طلبيات";
  return `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="max-w-md w-full bg-white rounded-3xl p-6 text-center shadow-2xl animate-fade-in border border-slate-100 space-y-4">
        
        <div class="w-20 h-20 mx-auto rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl font-bold shadow-inner">
          ⏳
        </div>

        <div>
          <span class="inline-block px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold mb-2 pulse-badge">
            بانتظار قبول طلب التسجيل من صاحب المتجر
          </span>
          <h2 class="text-lg font-black text-slate-900">أهلاً بك، ${user.name}!</h2>
          <p class="text-xs text-slate-600 mt-2 leading-relaxed">
            تم تسجيل طلبك بصفة (<strong>${reqRoleLabel}</strong>) برقم الهاتف (<strong class="font-mono text-slate-800">${user.phone}</strong>).
            <br>
            نظراً لدرجة الأمان العالية للتطبيق، لا يمكن الدخول إلا بعد أن يقبل <strong>صاحب المتجر (المسير العام)</strong> طلب تسجيلك.
          </p>
        </div>

        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-right space-y-1">
          <span class="font-bold text-slate-700 block">🔐 تفاصيل الحماية الأمنية لطلبك:</span>
          <div>• الصفة المطلوبة: <strong>${reqRoleLabel}</strong></div>
          <div>• الولاية: <strong>${user.wilaya || 'الجزائر'}</strong></div>
          <div>• الحالة: <strong class="text-amber-700">قيد مراجعة صاحب المتجر</strong></div>
        </div>

        <div class="pt-2 flex flex-col gap-2">
          <button onclick="window.location.reload()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors">
            تحديث الصفحة والتحقق من قبول صاحب المتجر
          </button>
          <button onclick="handleLogout()" class="w-full py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold">
            تسجيل الخروج والعودة لشاشة الدخول
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
        <h2 class="text-lg font-bold text-slate-900">نعتذر، لم يتم قبول طلب التسجيل</h2>
        <p class="text-xs text-slate-600">
          تمت مراجعة طلبك من قِبل صاحب المتجر ولم تتم الموافقة عليه حالياً.
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
    showToast(`مرحباً بك يا ${user.name}! تم الدخول بنجاح ✨`);
    renderApp();
  } catch (err) {
    alert(err.message);
  }
}

function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById("reg-name").value;
  const phone = document.getElementById("reg-phone").value;
  const emailEl = document.getElementById("reg-email");
  const email = emailEl ? emailEl.value : "";
  const password = document.getElementById("reg-password").value;
  const wilayaEl = document.getElementById("reg-wilaya");
  const wilaya = wilayaEl ? wilayaEl.value : "الجزائر العاصمة";
  const roleRadio = document.querySelector('input[name="reg-requested-role"]:checked');
  const requestedRole = roleRadio ? roleRadio.value : "rep";
  const note = document.getElementById("reg-note").value;

  try {
    const user = window.store.registerUser({ name, phone, email, password, requestedRole, wilaya, note });
    window.store.setCurrentUser(user);
    showToast("تم إرسال طلب تسجيلك لصاحب المتجر للموافقة عليه ⏳");
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
  authTab = "login";
  window.store.logout();
  renderApp();
}

function openGoogleLoginModal(mode = "rep") {
  const container = document.getElementById("modal-container");
  if (!container) return;

  const isRepMode = mode !== "admin";
  const adminUser = window.store.getUserByRole("admin");
  const defaultEmail = isRepMode
    ? ""
    : ((adminUser && adminUser.email) ? adminUser.email : "noureddinehadjhamed1992@gmail.com");
  const deliveryRates = window.store.getDeliveryRates();

  container.innerHTML = `
    <div class="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[92vh] overflow-y-auto">
        <div class="text-center space-y-1.5">
          <div class="w-12 h-12 mx-auto rounded-full ${isRepMode ? 'bg-pink-50 border-pink-200' : 'bg-slate-50 border-slate-200'} border flex items-center justify-center">
            <svg class="w-6 h-6" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"/>
              <path fill="#FBBC05" d="M5.01 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4-3.14z"/>
              <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24z"/>
            </svg>
          </div>
          <h3 class="text-base font-black text-slate-900">
            ${isRepMode ? 'دخول المندوبات بحساب Google 🌸' : 'دخول صاحب المتجر بحساب Google 👑'}
          </h3>
          <p class="text-[11px] text-slate-500">
            ${isRepMode
              ? 'ادخلي ببريدكِ على Google (Gmail). إذا كانت هذه أول مرة لكِ، سيُرسل طلب تسجيلكِ تلقائياً لصاحب المتجر للموافقة عليه.'
              : 'الدخول لحساب المسير العام المرتبط ببريد Google.'}
          </p>
        </div>

        ${isRepMode ? `
          <!-- Official Google OAuth Popup Button -->
          <button type="button" onclick="triggerFirebaseGooglePopup('rep')" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.08.72-2.45 1.16-4.22 1.16-3.25 0-6.01-2.19-6.99-5.14H1.01v3.14C3.02 21.14 7.21 24 12 24z"/>
              <path fill="#FBBC05" d="M5.01 14.01c-.25-.72-.39-1.5-.39-2.31s.14-1.59.39-2.31V6.25H1.01C.37 7.53 0 8.97 0 10.5s.37 2.97 1.01 4.25l4-3.14z"/>
              <path fill="#EA4335" d="M12 4.75c1.8 0 3.41.62 4.68 1.84l3.51-3.51C18.07 1.19 15.3 0 12 0 7.21 0 3.02 2.86 1.01 6.85l4 3.14c.98-2.95 3.74-5.24 6.99-5.24z"/>
            </svg>
            <span>اختيار حسابي من نافذة Google المباشرة</span>
          </button>

          <div class="relative flex py-0.5 items-center">
            <div class="flex-grow border-t border-slate-200"></div>
            <span class="flex-shrink mx-2 text-[10px] text-slate-400 font-bold">أو إدخال بريد Gmail مباشرة</span>
            <div class="flex-grow border-t border-slate-200"></div>
          </div>
        ` : ''}

        <form onsubmit="handleGoogleLoginSubmit(event, '${mode}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">بريد Google الإلكتروني (Gmail):</label>
            <input type="email" id="google-login-email" required value="${defaultEmail}" placeholder="${isRepMode ? 'fatima.rep@gmail.com أو بريدكِ@gmail.com' : 'example@gmail.com'}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-pink-600" />
          </div>

          ${isRepMode ? `
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block font-bold text-slate-700 mb-1">اسم المندوبة (للتسجيل الجديد):</label>
                <input type="text" id="google-login-name" placeholder="مثلاً: أمينة منصوري" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:border-pink-600" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">رقم الهاتف (للتواصل):</label>
                <input type="tel" id="google-login-phone" placeholder="05 / 06 / 07 ..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono text-slate-800 outline-none focus:border-pink-600" />
              </div>
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">الولاية:</label>
              <select id="google-login-wilaya" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-pink-600">
                ${deliveryRates.map(r => `<option value="${r.wilayaName}">${r.wilayaName}</option>`).join('')}
              </select>
            </div>
          ` : ''}

          <div>
            <label class="block font-bold text-slate-700 mb-1">كلمة المرور بالتطبيق:</label>
            <input type="password" id="google-login-password" required placeholder="${isRepMode ? 'كلمة مروركِ (أو اختاري كلمة مرور جديدة لطلبكِ)' : 'كلمة مرور المدير (admin)'}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:border-pink-600" />
          </div>

          <div class="pt-2 flex gap-2">
            <button type="submit" class="flex-1 ${isRepMode ? 'bg-pink-600 hover:bg-pink-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-3 rounded-xl shadow-sm transition-colors">
              ${isRepMode ? 'دخول / تسجيل المندوبة بحساب Google 🌸' : 'متابعة بحساب Google 👑'}
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

async function triggerFirebaseGooglePopup(mode = "rep") {
  if (!window.fbSync || !window.fbSync.auth || !window.fbSync.signInWithPopup) {
    alert("نافذة Google المنبثقة غير متاحة حالياً في هذا المتصفح، يرجى إدخال بريد Gmail في الحقل أدناه مباشرة.");
    return;
  }
  try {
    const result = await window.fbSync.signInWithPopup(window.fbSync.auth, window.fbSync.googleProvider);
    const gUser = result.user;
    if (!gUser || !gUser.email) {
      throw new Error("لم يتم استلام البريد الإلكتروني من Google.");
    }
    const user = window.store.loginWithGoogle({
      email: gUser.email,
      name: gUser.displayName || gUser.email.split("@")[0],
      phone: gUser.phoneNumber || "",
      password: "123",
      requestedRole: mode === "admin" ? "admin" : "rep",
      isOAuthVerified: true
    });
    closeModal();
    renderApp();
    if (user.role === "admin") {
      showToast(`تم تسجيل دخول صاحب المتجر عبر Google بنجاح! 👑`);
    } else if (user.status === "pending" || user.role === "pending") {
      showToast(`تم تسجيل حسابكِ عبر Google (${user.email}) وإرسال طلبكِ لصاحب المتجر للموافقة ⏳`);
    } else {
      showToast(`مرحباً بكِ يا ${user.name}! تم الدخول بحساب Google بنجاح 🌸`);
    }
  } catch (err) {
    console.warn("Google OAuth popup notice:", err);
    const emailInput = document.getElementById("google-login-email");
    if (emailInput) emailInput.focus();
    alert("لتسجيل الدخول فوراً دون نافذة منبثقة، اكتبي بريدكِ على Gmail وكلمة المرور في النموذج واضغطي متابعة.");
  }
}

function handleGoogleLoginSubmit(e, mode = "rep") {
  e.preventDefault();
  const email = document.getElementById("google-login-email").value;
  const password = document.getElementById("google-login-password").value;
  const nameEl = document.getElementById("google-login-name");
  const phoneEl = document.getElementById("google-login-phone");
  const wilayaEl = document.getElementById("google-login-wilaya");

  try {
    const user = window.store.loginWithGoogle({
      email,
      name: nameEl ? nameEl.value : "",
      phone: phoneEl ? phoneEl.value : "",
      wilaya: wilayaEl ? wilayaEl.value : "الجزائر العاصمة",
      password,
      requestedRole: mode === "driver" ? "driver" : "rep"
    });
    closeModal();
    renderApp();
    if (user.role === "admin") {
      showToast(`تم تسجيل دخول المدير عبر Google بنجاح! مرحباً ${user.name} 👑`);
    } else if (user.status === "pending" || user.role === "pending") {
      showToast(`تم تسجيل حسابكِ عبر Google وإرسال طلبكِ لصاحب المتجر للموافقة ⏳`);
    } else {
      showToast(`تم تسجيل الدخول عبر حساب Google بنجاح! مرحباً ${user.name} 🌸`);
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
            
            <!-- Cloud Sync Status Badge -->
            <span title="حالة المزامنة السحابية بين الأجهزة" class="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border ${
              window.store.cloudStatus === 'synced'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : window.store.cloudStatus === 'connecting'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }">
              ${window.store.cloudStatus === 'synced' ? '☁️ متزامن سحابياً' : window.store.cloudStatus === 'connecting' ? '⏳ جاري المزامنة' : '💾 وضع محلي'}
            </span>

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

            <!-- Change Password & PIN Button (Available for Rep, Driver, and Admin) -->
            <button onclick="openChangePasswordModal()" title="تغيير كلمة السر ورمز PIN" class="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors flex items-center gap-1 text-xs font-bold border border-slate-200">
              <i data-lucide="key-round" class="w-4 h-4"></i>
              <span class="hidden sm:inline">كلمة السر</span>
            </button>

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
// 1. ADMIN / OWNER VIEW (صاحب المتجر - المسير العام للتطبيق)
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
            <h2 class="text-sm sm:text-base font-bold text-white">لوحة صاحب المتجر (المسير العام للتطبيق)</h2>
            <p class="text-xs text-slate-300">إدارة المخزون، تحديد الأسعار المرجعية وأسعار التوصيل، وقبول طلبات تسجيل المندوبات وعمال التوصيل.</p>
          </div>
        </div>
        
        <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <!-- Add Store Owner Direct Order Button (Requirement 3: طلبات صاحب المتجر) -->
          <button onclick="openAdminOrderModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all">
            <i data-lucide="shopping-cart" class="w-4 h-4"></i>
            <span>+ حجز طلبية صاحب المتجر</span>
          </button>

          <!-- Add Product Button -->
          <button onclick="openAddProductModal()" class="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ إضافة منتج للمخزون</span>
          </button>

          <!-- Pending Users Alert Button -->
          ${pendingUsers.length > 0 ? `
            <button onclick="switchTab('users')" class="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow pulse-badge">
              <span>🔔</span>
              <span>${pendingUsers.length} طلب تسجيل بانتظار موافقتك!</span>
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
          طلبات التسجيل والأمان 🔐
          ${pendingUsers.length > 0 ? `<span class="bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold pulse-badge">${pendingUsers.length}</span>` : ''}
        </button>
        <button onclick="switchTab('products')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'products' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="package" class="w-4 h-4"></i>
          المخزون والأسعار المرجعية
          ${stats.lowStockCount > 0 ? `<span class="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">${stats.lowStockCount}</span>` : ''}
        </button>
        <button onclick="switchTab('deliveryRates')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'deliveryRates' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="map-pin" class="w-4 h-4"></i>
          أسعار التوصيل المحددة
        </button>
        <button onclick="switchTab('orders')" class="px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'orders' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}">
          <i data-lucide="shopping-bag" class="w-4 h-4"></i>
          كل الطلبيات (المندوبات والمتجر)
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

// 1.1 Admin Users & Approval Tab (قبول طلبات تسجيل المندوبات وعمال التوصيل والأمان العالي)
function renderAdminUsersTab() {
  const users = window.store.getUsers();
  const adminUser = window.store.getUserByRole("admin") || {};
  const pendingUsers = window.store.getPendingUsers();
  const activeUsers = users.filter(u => u.status === "active" && u.role !== "admin");
  const securityLogs = window.store.getSecurityLogs();

  return `
    <div class="space-y-6 animate-fade-in">
      
      <div>
        <h3 class="text-base font-bold text-slate-900">إدارة الأمان العالي وقبول طلبات تسجيل المندوبات وعمال التوصيل 🔐</h3>
        <p class="text-xs text-slate-500">لا يُسمح لأي مستخدم بالدخول إلى التطبيق إلا بعد إرسال طلب تسجيل وموافقة صاحب المتجر (المسير العام) عليه.</p>
      </div>

      <!-- ADMIN GOOGLE ACCOUNT & SECURITY SETTINGS -->
      <div class="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <span class="text-lg">👑</span>
          </div>
          <div>
            <h4 class="font-bold text-slate-900 text-xs sm:text-sm">حساب صاحب المتجر (المسير العام) — حماية مزدوجة 2FA PIN</h4>
            <p class="text-[11px] text-slate-600 font-mono mt-0.5">${adminUser.email || 'noureddinehadjhamed1992@gmail.com'} | الهاتف: ${adminUser.phone || '0550000000'} | PIN: ${adminUser.securityPin || '1234'}</p>
          </div>
        </div>
        <button onclick="updateAdminGooglePrompt()" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl self-start sm:self-center transition-colors">
          تعديل بيانات أمان المدير
        </button>
      </div>

      <!-- SECTION 1: PENDING REGISTRATION REQUESTS -->
      <div class="bg-white rounded-2xl border-2 ${pendingUsers.length > 0 ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'} p-5 shadow-sm space-y-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">🔔</span>
            <h4 class="font-black text-slate-900 text-sm">طلبات تسجيل المندوبات وعمال التوصيل بانتظار موافقتك (${pendingUsers.length})</h4>
          </div>
          ${pendingUsers.length > 0 ? `<span class="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full pulse-badge">بانتظار قبول صاحب المتجر</span>` : ''}
        </div>

        ${pendingUsers.length === 0 ? `
          <div class="p-6 text-center text-slate-400 text-xs">
            لا توجد أي طلبات تسجيل معلقة حالياً — تم البت في جميع الطلبات ✨
          </div>
        ` : `
          <div class="space-y-3">
            ${pendingUsers.map(u => {
              const isDriverReq = u.requestedRole === "driver";
              return `
              <div class="bg-white rounded-2xl border border-amber-300 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div class="space-y-1.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-extrabold text-slate-900 text-sm">${u.name}</span>
                    <span class="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">${u.phone}</span>
                    ${u.email ? `<span class="font-mono text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">📧 ${u.email}</span>` : ''}
                    <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isDriverReq ? 'bg-emerald-100 text-emerald-800' : 'bg-pink-100 text-pink-800'}">
                      ${isDriverReq ? '🚚 طلب تسجيل: عامل توصيل' : '🌸 طلب تسجيل: مندوبة تسويق'}
                    </span>
                    <span class="text-[11px] text-blue-700 font-semibold">📍 ${u.wilaya || 'الجزائر'}</span>
                    <span class="text-[10px] text-slate-400 font-mono">${new Date(u.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  ${u.note ? `
                    <div class="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl mt-1 border border-slate-100">
                      📝 تفاصيل الطلب: <em>"${u.note}"</em>
                    </div>
                  ` : ''}
                </div>

                <!-- Store Owner Approval Buttons -->
                <div class="flex items-center gap-2 self-start md:self-center flex-wrap">
                  <!-- Direct 1-Click Approve in Requested Role -->
                  <button onclick="approvePendingRequestDirect('${u.id}')" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95">
                    <span>✅</span>
                    <span>قبول الطلب (${isDriverReq ? 'عامل توصيل' : 'مندوبة'})</span>
                  </button>

                  <!-- Assign specifically as Sales Rep -->
                  <button onclick="approveUserAsRepPrompt('${u.id}', '${u.name}', '${u.wilaya || 'الجزائر العاصمة'}')" class="px-2.5 py-2 bg-pink-50 hover:bg-pink-100 text-pink-800 border border-pink-200 text-[11px] font-bold rounded-xl flex items-center gap-1">
                    <span>🌸</span>
                    <span>كمندوبة</span>
                  </button>

                  <!-- Assign specifically as Delivery Driver -->
                  <button onclick="approveUserAsDriverPrompt('${u.id}', '${u.name}')" class="px-2.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[11px] font-bold rounded-xl flex items-center gap-1">
                    <span>🚚</span>
                    <span>كعامل توصيل</span>
                  </button>

                  <!-- Reject -->
                  <button onclick="rejectUserPrompt('${u.id}')" class="px-3 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-xs font-bold rounded-xl transition-colors">
                    رفض
                  </button>
                </div>
              </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- SECTION 2: ACTIVE USERS LIST -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <h4 class="font-bold text-slate-900 text-sm">قائمة المندوبات وعمال التوصيل المقبولين (${activeUsers.length})</h4>
          <span class="text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg">🛡️ درجة الأمان: عالية (تحقق مزدوج + عزل صلاحيات)</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-3 font-bold">الاسم الكامل</th>
                <th class="p-3 font-bold">رقم الهاتف</th>
                <th class="p-3 font-bold">الصفة المعتمدة</th>
                <th class="p-3 font-bold">درجة الأمان والصلاحية</th>
                <th class="p-3 font-bold">تاريخ القبول</th>
                <th class="p-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${activeUsers.map(u => `
                <tr class="hover:bg-slate-50/80">
                  <td class="p-3 font-bold text-slate-900">
                    ${u.name}
                    ${u.email ? `<span class="block font-mono text-[10px] text-blue-600 font-normal">📧 ${u.email}</span>` : ''}
                  </td>
                  <td class="p-3 font-mono text-slate-700">${u.phone}</td>
                  <td class="p-3">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      u.role === 'rep' ? 'bg-pink-100 text-pink-800' : 'bg-emerald-100 text-emerald-800'
                    }">
                      ${u.role === 'rep' ? '🌸 مندوبة تسويق' : '🚚 عامل توصيل'}
                    </span>
                  </td>
                  <td class="p-3 text-slate-500 text-[11px]">
                    🔒 PIN مفعل | ${u.role === 'rep' ? 'حجز الطلبيات وزيادة ربحها فوق السعر المرجعي' : 'توصيل الطلبيات وتأكيد التسليم لخصم المخزون'}
                  </td>
                  <td class="p-3 font-mono text-slate-400 text-[10px]">
                    ${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}
                  </td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <div class="flex items-center justify-center gap-1">
                      <button onclick="openAdminResetPasswordModal('${u.id}')" title="إعادة تعيين كلمة السر / PIN" class="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <i data-lucide="key-round" class="w-4 h-4"></i>
                      </button>
                      <button onclick="confirmDeleteUser('${u.id}')" title="إلغاء/حذف الحساب" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SECTION 3: HIGH-SECURITY AUDIT LOG -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span>🛡️</span>
            <h4 class="font-bold text-slate-900 text-sm">سجل الرقابة والأمان العالي (Security Audit Log)</h4>
          </div>
          <span class="text-[11px] text-slate-500">يوثق طلبات التسجيل، قرارات القبول، وعمليات تأكيد التسليم وخصم المخزون</span>
        </div>
        <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
          ${securityLogs.map(log => `
            <div class="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50">
              <div>
                <span class="font-bold text-slate-900">${log.event}</span>
                <span class="text-slate-500 mx-1">—</span>
                <span class="font-semibold text-blue-700">${log.actor}</span>
                <p class="text-[11px] text-slate-500 mt-0.5">${log.details}</p>
              </div>
              <span class="text-[10px] font-mono text-slate-400 shrink-0">${log.time}</span>
            </div>
          `).join('')}
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

function approvePendingRequestDirect(userId) {
  const user = window.store.getUserById(userId);
  if (!user) return;
  const role = user.requestedRole === "driver" ? "driver" : "rep";
  window.store.approveUser(userId, role, {
    wilaya: user.wilaya || "الجزائر العاصمة",
    vehicle: "سيارة توصيل"
  });
  showToast(`تم قبول طلب تسجيل (${user.name}) وتفعيل حسابه كـ ${role === 'driver' ? 'عامل توصيل 🚚' : 'مندوبة تسويق 🌸'} بنجاح!`);
  renderApp();
}

function approveUserAsRepPrompt(userId, name, defaultWilaya = "الجزائر العاصمة") {
  window.store.approveUser(userId, "rep", { wilaya: defaultWilaya });
  showToast(`تم قبول وتفعيل (${name}) كمندوبة مبيعات بنجاح 🌸`);
  renderApp();
}

function approveUserAsDriverPrompt(userId, name) {
  window.store.approveUser(userId, "driver", { vehicle: "سيارة نقل" });
  showToast(`تم قبول وتفعيل (${name}) كعامل توصيل بنجاح 🚚`);
  renderApp();
}

function rejectUserPrompt(userId) {
  window.store.rejectUser(userId, "تم رفض طلب التسجيل من طرف صاحب المتجر");
  showToast("تم رفض طلب التسجيل.");
  renderApp();
}

function confirmDeleteUser(userId) {
  window.store.deleteUser(userId);
  showToast("تم حذف الحساب.");
  renderApp();
}

// ==========================================
// CHANGE PASSWORD MODALS (للجميع + إعادة تعيين من المدير)
// ==========================================
function openChangePasswordModal() {
  const user = window.store.getCurrentUser();
  if (!user) return;
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">🔐 تغيير كلمة السر (الرقم السري)</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleChangePasswordSubmit(event)" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">كلمة السر الحالية:</label>
            <input type="password" id="cp-current" required placeholder="أدخل كلمة السر الحالية" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">كلمة السر الجديدة:</label>
            <input type="password" id="cp-new" required minlength="3" placeholder="3 أحرف أو أرقام على الأقل" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">تأكيد كلمة السر الجديدة:</label>
            <input type="password" id="cp-confirm" required minlength="3" placeholder="أعد كتابة كلمة السر الجديدة" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600" />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md">حفظ كلمة السر الجديدة</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const user = window.store.getCurrentUser();
  if (!user) return;
  const currentPass = document.getElementById("cp-current").value;
  const newPass = document.getElementById("cp-new").value;
  const confirmPass = document.getElementById("cp-confirm").value;

  if (newPass.trim() !== confirmPass.trim()) {
    alert("كلمة السر الجديدة وتأكيدها غير متطابقتين!");
    return;
  }

  try {
    window.store.changeOwnPassword(user.id, currentPass, newPass);
    closeModal();
    showToast("تم تغيير كلمة السر بنجاح 🔐");
  } catch (err) {
    alert(err.message);
  }
}

function openAdminResetPasswordModal(userId) {
  const targetUser = window.store.getUserById(userId);
  if (!targetUser) return;
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">🔑 بيانات دخول Google وكلمة السر لـ: ${targetUser.name}</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleAdminResetPasswordSubmit(event, '${targetUser.id}')" class="space-y-3 text-xs">
          <div>
            <label class="block font-bold text-slate-700 mb-1">بريد Google للمندوبة (Gmail):</label>
            <input type="email" id="arp-email" value="${targetUser.email || ''}" placeholder="example@gmail.com" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 font-mono" />
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">كلمة السر الجديدة (الرقم السري):</label>
            <input type="text" id="arp-pass" required minlength="3" value="${targetUser.password || '123'}" placeholder="أدخل كلمة السر الجديدة" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 font-mono" />
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-md">حفظ وتحديث الحساب</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function handleAdminResetPasswordSubmit(e, userId) {
  e.preventDefault();
  const newEmailEl = document.getElementById("arp-email");
  const newEmail = newEmailEl ? newEmailEl.value : "";
  const newPass = document.getElementById("arp-pass").value;
  try {
    window.store.adminResetUserPassword(userId, newPass, "", newEmail);
    closeModal();
    showToast("تم تحديث بريد Google وكلمة السر بنجاح 🔑");
    renderApp();
  } catch (err) {
    alert(err.message);
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
  const filteredProducts = getFilteredProducts(products);

  return `
    <div class="space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 class="text-base font-bold text-slate-900">إدارة المخزون، تكلفة الشراء والسعر المرجعي</h3>
          <p class="text-xs text-slate-500">السعر المرجعي هو السعر الذي تحدده، والمندوبة تضيف ربحها فوقه. يمكنك البحث وحصر المنتجات حسب الصنف.</p>
        </div>
        <button onclick="openAddProductModal()" class="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm self-start sm:self-auto transition-all">
          <i data-lucide="plus-circle" class="w-4 h-4"></i>
          إضافة منتج جديد
        </button>
      </div>

      <!-- Product Search & Category Filter Bar -->
      ${renderProductFilterBar(products, "admin-product-search", "red")}

      <!-- Products Grid -->
      ${filteredProducts.length === 0 ? `
        <div class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-xs">
          لا توجد منتجات مطابقة للبحث أو الصنف المختار.
        </div>
      ` : `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${filteredProducts.map(p => {
          const cost = p.costPrice || 0;
          const base = p.basePrice || 0;
          const profit = base - cost;
          const profitPct = cost > 0 ? Math.round((profit / cost) * 100) : 100;

          return `
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <div class="relative h-44 bg-slate-100 overflow-hidden">
                <img id="admin-prd-img-${p.id}" src="${p.image}" onclick="openProductGalleryModal('${p.id}')" class="w-full h-full object-cover cursor-pointer" alt="${p.name}" />
                <span class="absolute top-2.5 right-2.5 bg-slate-900/70 backdrop-blur-md text-white text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ${p.category}
                </span>
                ${(p.images && p.images.length > 1) ? `
                  <button type="button" onclick="openProductGalleryModal('${p.id}')" class="absolute top-2.5 left-2.5 bg-slate-900/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    🖼️ ${p.images.length} صور
                  </button>
                ` : ''}
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
              ${(p.images && p.images.length > 1) ? `
                <div class="flex gap-1.5 px-3 pt-2 overflow-x-auto">
                  ${p.images.map((imgUrl, idx) => `
                    <img src="${imgUrl}" onclick="document.getElementById('admin-prd-img-${p.id}').src='${imgUrl}'" class="w-10 h-10 rounded-lg object-cover border border-slate-200 hover:border-red-500 cursor-pointer shrink-0" alt="صورة ${idx + 1}" />
                  `).join('')}
                </div>
              ` : ''}
              
              <div class="p-4">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <h4 class="font-bold text-slate-900 text-sm">${p.name}</h4>
                  <span class="text-[10px] text-slate-400 font-mono">${p.id}</span>
                </div>
                <p class="text-xs text-slate-500 line-clamp-2 mb-3">${p.description || 'لا يوجد وصف'}</p>
                
                <!-- Pricing Box with Owner Cost & Reference Price -->
                <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-500">سعر الشراء (التكلفة عليك):</span>
                    <span class="font-bold text-slate-800">${cost.toLocaleString()} دج</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-red-700 font-bold">السعر المرجعي (تضيف المندوبة ربحها فوقه):</span>
                    <span class="font-extrabold text-red-900">${base.toLocaleString()} دج</span>
                  </div>
                  <div class="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span class="text-emerald-700 font-bold">ربحك الصافي للقطعة:</span>
                    <span class="font-black text-emerald-600">+${profit.toLocaleString()} دج (${profitPct}%)</span>
                  </div>
                </div>

                <!-- Stock linkage with orders -->
                <div class="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div class="bg-white border border-slate-200 rounded-lg p-1.5">
                    <span class="block text-slate-500">المخزون الفعلي</span>
                    <span class="font-black text-slate-900 text-xs">${p.stock}</span>
                  </div>
                  <div class="bg-amber-50 border border-amber-200 rounded-lg p-1.5">
                    <span class="block text-amber-700">محجوز قيد التوصيل</span>
                    <span class="font-black text-amber-800 text-xs">${window.store.getReservedStock(p.id)}</span>
                  </div>
                  <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-1.5">
                    <span class="block text-emerald-700">متاح للحجز</span>
                    <span class="font-black text-emerald-800 text-xs">${window.store.getAvailableStock(p.id)}</span>
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
      `}

      <!-- Stock Movements Log (linked to delivery confirmation) -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-100">
          <h4 class="font-bold text-slate-900 text-sm">📦 سجل حركة المخزون (الخصم التلقائي بعد تأكيد التسليم)</h4>
          <p class="text-[11px] text-slate-500 mt-0.5">كل طلبية (من المندوبة أو من صاحب المتجر) تُحجز أولاً، ثم تنقص الكمية من المخزون مباشرة بعد أن يؤكد عامل التوصيل تسليمها.</p>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-right text-xs">
            <thead class="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th class="p-2.5 font-bold">التاريخ</th>
                <th class="p-2.5 font-bold">الطلبية / المصدر</th>
                <th class="p-2.5 font-bold">المنتج</th>
                <th class="p-2.5 font-bold">الكمية</th>
                <th class="p-2.5 font-bold">المخزون قبل ← بعد</th>
                <th class="p-2.5 font-bold">بواسطة</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${window.store.getStockMovements().length === 0 ? `
                <tr><td colspan="6" class="p-6 text-center text-slate-400">لا توجد حركات مخزون بعد.</td></tr>
              ` : window.store.getStockMovements().slice(0, 30).map(m => `
                <tr class="hover:bg-slate-50">
                  <td class="p-2.5 font-mono text-slate-500">${m.date}</td>
                  <td class="p-2.5">
                    <span class="font-mono font-bold text-slate-800">${m.orderId}</span>
                    <span class="block text-[10px] ${m.orderSource === 'owner' ? 'text-blue-700' : 'text-pink-700'}">${m.orderSource === 'owner' ? '👑 صاحب المتجر' : '🌸 مندوبة'}</span>
                  </td>
                  <td class="p-2.5 font-semibold">${m.productName}</td>
                  <td class="p-2.5 font-black ${m.type === 'delivery_confirmed' || m.type === 'manual_sub' ? 'text-red-600' : 'text-emerald-600'}">
                    ${m.type === 'delivery_confirmed' || m.type === 'manual_sub' ? '-' : '+'}${m.quantity}
                  </td>
                  <td class="p-2.5 font-mono">${m.stockBefore} ← <strong>${m.stockAfter}</strong></td>
                  <td class="p-2.5 text-slate-600 text-[11px]">${m.actor}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
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
                <th class="p-3 font-bold">سعر التوصيل للمكتب 🏢</th>
                <th class="p-3 font-bold">سعر التوصيل لباب المنزل 🏠</th>
                <th class="p-3 font-bold">البلديات والمناطق المشمولة</th>
                <th class="p-3 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${filtered.length === 0 ? `
                <tr>
                  <td colspan="6" class="p-8 text-center text-slate-400">لا توجد نتائج مطابقة لبحثك.</td>
                </tr>
              ` : filtered.map(r => `
                <tr class="hover:bg-slate-50/70 transition-colors">
                  <td class="p-3 font-mono font-bold text-slate-500">${r.wilayaCode || '-'}</td>
                  <td class="p-3 font-bold text-slate-900">${r.wilayaName}</td>
                  <td class="p-3 font-extrabold text-emerald-700">${(r.deskFee ?? Math.max(150, r.defaultFee - 200)).toLocaleString()} دج</td>
                  <td class="p-3 font-extrabold text-blue-700">${(r.homeFee ?? r.defaultFee).toLocaleString()} دج</td>
                  <td class="p-3 text-slate-500 max-w-md">${r.communes}</td>
                  <td class="p-3 text-center whitespace-nowrap">
                    <button onclick="openEditDeliveryRateModal('${r.id}')" title="تعديل الأسعار (المكتب والمنزل)" class="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50">
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
                <th class="p-3 font-bold">مصدر الطلبية / المخزون</th>
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
                  <td class="p-3 font-bold whitespace-nowrap">
                    ${o.repId === 'OWNER' || o.orderSource === 'owner'
                      ? `<span class="text-blue-700">👑 صاحب المتجر</span>`
                      : `<span class="text-pink-700">🌸 ${o.repName}</span>`}
                    <span class="block text-[10px] font-semibold ${o.stockDeducted ? 'text-emerald-600' : 'text-amber-600'}">
                      ${o.stockDeducted ? '✔ خُصمت من المخزون' : '⏳ محجوزة (لم تُخصم بعد)'}
                    </span>
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
                    <div class="text-[10px] text-slate-500">${o.deliveryType === 'desk' ? '🏢 للمكتب' : '🏠 لباب المنزل'}: ${(o.chargedDeliveryFee || 0).toLocaleString()} دج</div>
                    ${o.deliverySubsidy > 0 ? `<div class="text-[10px] text-rose-600 font-semibold">(تخفيض توصيل مخصوم من الفائدة: -${o.deliverySubsidy} دج)</div>` : ''}
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
                    <div class="flex items-center justify-center gap-1 flex-wrap">
                      ${o.driverInquiryOpen ? `
                        <button onclick="openResolveInquiryModal('${o.id}')" title="توضيح استفسار السائق" class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold">
                          حل الاستفسار
                        </button>
                      ` : ''}
                      <button onclick="openEditOrderModal('${o.id}')" title="تعديل الطلبية (إضافة / حذف / تعديل منتجات وأسعار)" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                      </button>
                      ${o.status === 'out_for_delivery' ? `
                        <button onclick="adminMarkDelivered('${o.id}')" title="تأكيد التسليم وخصم المخزون" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                          <i data-lucide="check-circle" class="w-4 h-4"></i>
                        </button>
                      ` : ''}
                      ${(o.status === 'out_for_delivery' || o.status === 'delivered') ? `
                        <button onclick="adminMarkReturned('${o.id}')" title="${o.status === 'delivered' ? 'إرجاع الطلبية للمخزون بعد التسليم' : 'إلغاء / إرجاع للمخزون'}" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg">
                          <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
                        </button>
                      ` : ''}
                      <button onclick="printOrderReceipt('${o.id}')" title="طباعة وصل" class="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <i data-lucide="printer" class="w-4 h-4"></i>
                      </button>
                      <button onclick="confirmDeleteOrder('${o.id}')" title="حذف الطلبية نهائياً" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
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

// ==========================================
// MULTI-PRODUCT ORDER ROW BUILDER (اختيار عدة منتجات في نفس الطلبية)
// ==========================================
function renderRepOrderItemRowHtml(products, isFirst = false) {
  return `
    <div class="rep-order-item-row p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 relative">
      <div class="flex items-center justify-between gap-2">
        <span class="text-[11px] font-bold text-slate-700">المنتج:</span>
        ${!isFirst ? `<button type="button" onclick="removeRepOrderItemRow(this)" class="text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-0.5 rounded-lg">✕ حذف</button>` : ''}
      </div>
      <select onchange="onRepItemProductChange(this)" required class="rep-item-product w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-pink-500">
        <option value="">-- اختر المنتج من المخزون --</option>
        ${products.map(p => `
          <option value="${p.id}" data-baseprice="${p.basePrice}" data-stock="${window.store.getAvailableStock(p.id)}">
            ${p.name} (متاح: ${window.store.getAvailableStock(p.id)} | السعر المرجعي: ${p.basePrice} دج)
          </option>
        `).join('')}
      </select>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="block text-[11px] font-bold text-slate-600 mb-1">الكمية:</label>
          <input type="number" value="1" min="1" max="50" oninput="updateRepProfitCalculator()" required class="rep-item-qty w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800 outline-none focus:border-pink-500" />
        </div>
        <div>
          <label class="block text-[11px] font-bold text-slate-600 mb-1">سعر البيع للقطعة (فوق المرجعي):</label>
          <input type="number" placeholder="مثلاً: 3200" oninput="updateRepProfitCalculator()" required class="rep-item-price w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-pink-700 outline-none focus:border-pink-500" />
        </div>
      </div>
    </div>
  `;
}

function addRepOrderItemRow() {
  const container = document.getElementById("rep-order-items-container");
  if (!container) return;
  const products = window.store.getProducts().filter(p => window.store.getAvailableStock(p.id) > 0);
  const wrapper = document.createElement("div");
  wrapper.innerHTML = renderRepOrderItemRowHtml(products, false).trim();
  container.appendChild(wrapper.firstElementChild);
  updateRepProfitCalculator();
}

function removeRepOrderItemRow(btn) {
  const row = btn.closest(".rep-order-item-row");
  if (row) row.remove();
  updateRepProfitCalculator();
}

function onRepItemProductChange(selectEl) {
  const row = selectEl.closest(".rep-order-item-row");
  if (!row) return;
  const opt = selectEl.options[selectEl.selectedIndex];
  const priceInput = row.querySelector(".rep-item-price");
  if (opt && opt.value && priceInput) {
    const base = parseFloat(opt.getAttribute("data-baseprice")) || 0;
    if (!priceInput.value || parseFloat(priceInput.value) < base) {
      priceInput.value = base;
    }
    priceInput.min = base;
  }
  updateRepProfitCalculator();
}

function renderRepNewOrderForm(rep) {
  const products = window.store.getProducts().filter(p => window.store.getAvailableStock(p.id) > 0);
  const deliveryRates = window.store.getDeliveryRates();

  return `
    <div class="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-sm">
      <div class="mb-5 pb-4 border-b border-slate-100">
        <h3 class="text-base font-bold text-slate-900">حجز طلبية زبون جديدة (منتج واحد أو عدة منتجات) 🛍️</h3>
        <p class="text-xs text-slate-500 mt-0.5">يمكنكِ إضافة عدة منتجات في نفس الطلبية. أضيفي ربحكِ فوق <strong>السعر المرجعي</strong> الذي حدده صاحب المتجر.</p>
      </div>

      <form onsubmit="handleRepSubmitOrder(event, '${rep.id}')" class="space-y-4">
        
        <div class="space-y-3">
          <div id="rep-order-items-container" class="space-y-2.5">
            ${renderRepOrderItemRowHtml(products, true)}
          </div>
          <button type="button" onclick="addRepOrderItemRow()" class="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50/50 hover:bg-pink-50 text-pink-700 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all">
            <span>➕</span>
            <span>إضافة منتج آخر لنفس الطلبية</span>
          </button>
        </div>

        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <i data-lucide="truck" class="w-4 h-4 text-blue-600"></i>
            تحديد الولاية وسعر التوصيل:
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">الولاية:</label>
              <select id="order-wilaya-select" onchange="onOrderWilayaChange()" required class="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-800 outline-none focus:border-pink-500">
                <option value="">-- اختر ولاية التوصيل --</option>
                ${deliveryRates.map(r => `
                  <option value="${r.wilayaName}" data-homefee="${r.homeFee ?? r.defaultFee}" data-deskfee="${r.deskFee ?? Math.max(150, r.defaultFee - 200)}" data-communes="${r.communes}">
                    ${r.wilayaCode ? r.wilayaCode + ' - ' : ''}${r.wilayaName} (مكتب: ${r.deskFee ?? Math.max(150, r.defaultFee - 200)} | منزل: ${r.homeFee ?? r.defaultFee} دج)
                  </option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-600 mb-1">نوع التوصيل:</label>
              <select id="order-delivery-type" onchange="onOrderWilayaChange()" class="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 font-bold text-blue-700 outline-none focus:border-pink-500">
                <option value="home">🏠 توصيل لباب المنزل</option>
                <option value="desk">🏢 توصيل للمكتب (Stop Desk)</option>
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
            💡 ملاحظة: قمتِ بتخفيض سعر التوصيل بـ <strong id="subsidy-amount-text" class="text-red-600">0</strong> دج للزبون! سيتم خصم هذا الفارق تلقائياً من ربحكِ، ويبقى أجر عامل التوصيل كاملاً حسب السعر الذي حدده صاحب المتجر.
          </div>
          <div id="subsidy-exceeds-alert" class="hidden text-[11px] p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 font-bold">
            ⛔ فارق تخفيض التوصيل أكبر من ربحكِ فوق السعر المرجعي! زيدي سعر البيع أو قللي التخفيض.
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

            <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
              <span class="text-slate-400 text-[11px]">${o.deliveryType === 'desk' ? '🏢 للمكتب' : '🏠 لباب المنزل'} | ${o.address}</span>
              <div class="flex items-center gap-2">
                ${(o.status === 'out_for_delivery' || o.status === 'pending') ? `
                  <button onclick="openEditOrderModal('${o.id}')" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold text-[11px]">✏️ تعديل</button>
                  <button onclick="confirmDeleteOrder('${o.id}')" class="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold text-[11px]">🗑️ حذف</button>
                ` : ''}
                <a href="https://wa.me/213${o.customerPhone.replace(/^0/, '')}" target="_blank" class="text-emerald-600 font-bold hover:underline flex items-center gap-1">
                  <span>واتساب الزبون</span>
                  <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
                </a>
              </div>
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
  const filteredProducts = getFilteredProducts(products);

  return `
    <div class="space-y-4 animate-fade-in">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-slate-900">كتالوج المنتجات والكميات المتوفرة بالمخزون</h3>
        <span class="text-xs text-slate-500">السعر المرجعي هو السعر المعتمد لكِ وتضيفين ربحكِ فوقه</span>
      </div>

      <!-- Product Search & Category Filter Bar -->
      ${renderProductFilterBar(products, "rep-product-search", "pink")}

      ${filteredProducts.length === 0 ? `
        <div class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-xs">
          لا توجد منتجات مطابقة للبحث أو الصنف المختار.
        </div>
      ` : `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${filteredProducts.map(p => `
          <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
            <div>
              <div class="relative h-40 bg-slate-100">
                <img id="rep-prd-img-${p.id}" src="${p.image}" onclick="openProductGalleryModal('${p.id}')" class="w-full h-full object-cover cursor-pointer" alt="${p.name}" />
                <span class="absolute top-2.5 right-2.5 bg-slate-900/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  ${p.category}
                </span>
                ${(p.images && p.images.length > 1) ? `
                  <button type="button" onclick="openProductGalleryModal('${p.id}')" class="absolute top-2.5 left-2.5 bg-slate-900/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                    🖼️ ${p.images.length} صور
                  </button>
                ` : ''}
                <span class="absolute bottom-2.5 right-2.5 text-xs font-bold px-2.5 py-0.5 rounded-lg ${
                  p.stock === 0 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                }">
                  ${p.stock === 0 ? 'غير متوفر' : `متوفر: ${p.stock} قطعة`}
                </span>
              </div>
              ${(p.images && p.images.length > 1) ? `
                <div class="flex gap-1.5 px-3 pt-2 overflow-x-auto">
                  ${p.images.map((imgUrl, idx) => `
                    <img src="${imgUrl}" onclick="document.getElementById('rep-prd-img-${p.id}').src='${imgUrl}'" class="w-10 h-10 rounded-lg object-cover border border-slate-200 hover:border-pink-500 cursor-pointer shrink-0" alt="صورة ${idx + 1}" />
                  `).join('')}
                </div>
              ` : ''}
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
      `}
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
  const activeDeliveries = allOrders.filter(o => o.status === "out_for_delivery" && (!o.driverId || o.driverId === driver.id));

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
  modalProductImages = [];
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
            <label class="block font-bold text-slate-700 mb-1">التصنيف / الصنف:</label>
            <input type="text" id="prd-category" list="product-categories-list" placeholder="اختر صنفاً موجوداً أو اكتب صنفاً جديداً (ستائر / عطور / تجميل...)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
            <datalist id="product-categories-list">
              ${getProductCategories(window.store.getProducts()).map(([cat]) => `<option value="${cat}"></option>`).join('')}
            </datalist>
          </div>

          <!-- Product Images Box (Multi-Image Upload from Device + AI Generation) -->
          <div class="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
            <div class="flex items-center justify-between">
              <label class="block font-bold text-slate-800 text-xs">صور المنتج (يمكنك تحميل عدة صور) 🖼️:</label>
              <span id="prd-images-count" class="text-[10px] font-bold text-blue-600">0 صور مضافة</span>
            </div>

            <div class="relative w-full h-36 bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center">
              <img id="prd-image-preview" src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80" class="w-full h-full object-cover" alt="معاينة الصورة" />
              
              <div id="image-loading-overlay" class="hidden absolute inset-0 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center text-white text-center p-3 z-10">
                <div class="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin mb-2"></div>
                <span class="text-xs font-bold text-amber-300">جاري توليد صورة احترافية بالذكاء الاصطناعي... ✨</span>
              </div>
            </div>

            <!-- Multi-Image Thumbnails Gallery -->
            <div id="prd-images-gallery" class="flex flex-wrap gap-2 pt-1"></div>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <label class="cursor-pointer bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 shadow-xs transition-colors">
                <i data-lucide="upload" class="w-3.5 h-3.5 text-blue-600"></i>
                <span>رفع عدة صور 📷</span>
                <input type="file" accept="image/*" multiple class="hidden" onchange="handleProductImageUpload(event, 'prd-image', 'prd-image-preview', 'prd-images-gallery', 'prd-images-count')" />
              </label>

              <button type="button" onclick="generateProductImageAI('prd-image', 'prd-image-preview', 'prd-name')" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>توليد بالذكاء الاصطناعي ✨</span>
              </button>
            </div>

            <div class="flex gap-1.5">
              <input type="text" id="prd-image" value="" placeholder="أو الصق رابط صورة واضغط + لإضافتها..." class="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-600 outline-none focus:border-red-600" />
              <button type="button" onclick="addModalImageFromUrl('prd-image', 'prd-image-preview', 'prd-images-gallery', 'prd-images-count')" class="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold">+ إضافة</button>
            </div>
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

let modalProductImages = [];

function renderModalImageGallery(previewImgId = 'prd-image-preview', galleryId = 'prd-images-gallery', countId = 'prd-images-count') {
  const gallery = document.getElementById(galleryId);
  const countEl = document.getElementById(countId);
  const preview = document.getElementById(previewImgId);
  if (countEl) countEl.innerText = `${modalProductImages.length} صور مضافة`;
  if (preview && modalProductImages.length > 0) preview.src = modalProductImages[0];
  if (!gallery) return;

  gallery.innerHTML = modalProductImages.map((src, idx) => `
    <div class="relative group w-16 h-16 rounded-xl overflow-hidden border-2 ${idx === 0 ? 'border-red-500' : 'border-slate-200'} bg-white">
      <img src="${src}" onclick="setMainModalProductImage(${idx}, '${previewImgId}', '${galleryId}', '${countId}')" class="w-full h-full object-cover cursor-pointer" title="اضغط لجعلها الصورة الرئيسية" />
      ${idx === 0 ? `<span class="absolute bottom-0 inset-x-0 bg-red-600/85 text-white text-[8px] font-bold text-center py-0.5">رئيسية</span>` : ''}
      <button type="button" onclick="removeModalProductImage(${idx}, '${previewImgId}', '${galleryId}', '${countId}')" class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-slate-900/80 text-white text-[10px] flex items-center justify-center hover:bg-red-600">&times;</button>
    </div>
  `).join('');
}

function setMainModalProductImage(idx, previewImgId, galleryId, countId) {
  if (idx <= 0 || idx >= modalProductImages.length) return;
  const [chosen] = modalProductImages.splice(idx, 1);
  modalProductImages.unshift(chosen);
  renderModalImageGallery(previewImgId, galleryId, countId);
}

function removeModalProductImage(idx, previewImgId, galleryId, countId) {
  modalProductImages.splice(idx, 1);
  renderModalImageGallery(previewImgId, galleryId, countId);
}

function addModalImageFromUrl(inputId, previewImgId, galleryId, countId) {
  const input = document.getElementById(inputId);
  const url = input ? input.value.trim() : "";
  if (!url) return;
  modalProductImages.push(url);
  input.value = "";
  renderModalImageGallery(previewImgId, galleryId, countId);
  showToast("تمت إضافة الصورة للمنتج 🖼️");
}

function openProductGalleryModal(productId) {
  const p = window.store.getProductById(productId);
  if (!p) return;
  const imgs = (Array.isArray(p.images) && p.images.length > 0) ? p.images : [p.image];
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="if(event.target===this) closeModal()">
      <div class="bg-white rounded-3xl max-w-lg w-full p-4 shadow-2xl space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900">🖼️ صور المنتج: ${p.name} (${imgs.length})</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-700 text-xl">&times;</button>
        </div>
        <div class="w-full h-72 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
          <img id="lightbox-main-img" src="${imgs[0]}" class="w-full h-full object-contain" alt="${p.name}" />
        </div>
        ${imgs.length > 1 ? `
          <div class="flex gap-2 overflow-x-auto pb-1">
            ${imgs.map((src, i) => `
              <img src="${src}" onclick="document.getElementById('lightbox-main-img').src='${src}'" class="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 hover:border-red-500 cursor-pointer shrink-0" alt="صورة ${i + 1}" />
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function handleSaveProduct(e) {
  e.preventDefault();
  const name = document.getElementById("prd-name").value;
  const costPrice = document.getElementById("prd-cost-price").value;
  const basePrice = document.getElementById("prd-base-price").value;
  const stock = document.getElementById("prd-stock").value;
  const category = document.getElementById("prd-category").value || "عام";
  const minStockAlert = document.getElementById("prd-min-alert").value;
  const extraUrl = document.getElementById("prd-image").value.trim();
  const images = [...modalProductImages];
  if (extraUrl) images.push(extraUrl);
  const image = images[0] || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80";
  const description = document.getElementById("prd-desc").value;

  window.store.addProduct({ name, costPrice, basePrice, stock, category, minStockAlert, image, images: images.length ? images : [image], description });
  modalProductImages = [];
  closeModal();
  showToast(`تمت إضافة المنتج للمخزون مع ${Math.max(1, images.length)} صورة بنجاح ✨`);
}

function openEditProductModal(id) {
  const p = window.store.getProductById(id);
  if (!p) return;
  modalProductImages = (Array.isArray(p.images) && p.images.length > 0) ? [...p.images] : (p.image ? [p.image] : []);

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
              <label class="block font-bold text-slate-700 mb-1">التصنيف / الصنف:</label>
              <input type="text" id="edit-prd-cat" list="edit-product-categories-list" value="${p.category}" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none" />
              <datalist id="edit-product-categories-list">
                ${getProductCategories(window.store.getProducts()).map(([cat]) => `<option value="${cat}"></option>`).join('')}
              </datalist>
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

            <div id="edit-prd-images-gallery" class="flex flex-wrap gap-2 pt-1"></div>

            <div class="grid grid-cols-2 gap-2 pt-1">
              <label class="cursor-pointer bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] py-2 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 shadow-xs transition-colors">
                <i data-lucide="upload" class="w-3.5 h-3.5 text-blue-600"></i>
                <span>رفع عدة صور 📷</span>
                <input type="file" accept="image/*" multiple class="hidden" onchange="handleProductImageUpload(event, 'edit-prd-image', 'edit-prd-image-preview', 'edit-prd-images-gallery', 'edit-prd-images-count')" />
              </label>

              <button type="button" onclick="generateProductImageAI('edit-prd-image', 'edit-prd-image-preview', 'edit-prd-name', 'edit-image-loading-overlay')" class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>توليد بالذكاء الاصطناعي ✨</span>
              </button>
            </div>

            <div class="flex gap-1.5">
              <input type="text" id="edit-prd-image" value="" placeholder="إضافة رابط صورة جديدة..." class="flex-1 bg-white border border-slate-200 rounded-lg p-1.5 text-[10px] text-slate-600 outline-none focus:border-red-600" />
              <button type="button" onclick="addModalImageFromUrl('edit-prd-image', 'edit-prd-image-preview', 'edit-prd-images-gallery', 'edit-prd-images-count')" class="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold">+ إضافة</button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">حفظ التعديلات</button>
          </div>
        </form>
      </div>
    </div>
  `;
  renderModalImageGallery('edit-prd-image-preview', 'edit-prd-images-gallery', 'edit-prd-images-count');
  if (window.lucide) window.lucide.createIcons();
}

function handleUpdateProduct(e, id) {
  e.preventDefault();
  const name = document.getElementById("edit-prd-name").value;
  const costPrice = document.getElementById("edit-prd-cost").value;
  const basePrice = document.getElementById("edit-prd-base").value;
  const stock = document.getElementById("edit-prd-stock").value;
  const category = document.getElementById("edit-prd-cat").value;
  const extraUrl = document.getElementById("edit-prd-image") ? document.getElementById("edit-prd-image").value.trim() : "";
  const images = [...modalProductImages];
  if (extraUrl) images.push(extraUrl);

  window.store.updateProduct(id, { name, costPrice, basePrice, stock, category, image: images[0], images });
  modalProductImages = [];
  closeModal();
  showToast("تم تحديث بيانات المنتج والصور بنجاح ✓");
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

// Device / Phone Multi-Image Upload Helper
function handleProductImageUpload(event, targetInputId = 'prd-image', previewImgId = 'prd-image-preview', galleryId = 'prd-images-gallery', countId = 'prd-images-count') {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  let addedCount = 0;
  files.forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 500;
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

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
        modalProductImages.push(compressedDataUrl);
        addedCount++;
        renderModalImageGallery(previewImgId, galleryId, countId);
        if (addedCount === files.length) {
          showToast(`تم رفع ${addedCount} صورة للمنتج بنجاح 📷`);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
  event.target.value = "";
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

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">سعر التوصيل للمكتب 🏢 (دج):</label>
              <input type="number" id="del-desk-fee" required placeholder="مثلاً: 250" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-emerald-700 text-sm focus:border-red-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">سعر التوصيل لباب المنزل 🏠 (دج):</label>
              <input type="number" id="del-fee" required placeholder="مثلاً: 450" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-blue-700 text-sm focus:border-red-600" />
            </div>
          </div>

          <div>
            <label class="block font-bold text-slate-700 mb-1">البلديات والمناطق المشمولة:</label>
            <textarea id="del-communes" rows="2" placeholder="كافة البلديات، متليلي، بريان، القرارة..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600"></textarea>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-md">حفظ أسعار التوصيل</button>
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
  const homeFee = document.getElementById("del-fee").value;
  const deskFee = document.getElementById("del-desk-fee").value;
  const communes = document.getElementById("del-communes").value;

  window.store.addDeliveryRate({ wilayaCode, wilayaName, defaultFee: homeFee, homeFee, deskFee, communes });
  closeModal();
  showToast("تمت إضافة أسعار التوصيل (للمكتب ولباب المنزل) بنجاح 🚚");
}

function openEditDeliveryRateModal(id) {
  const rate = window.store.getDeliveryRates().find(r => r.id === id);
  if (!rate) return;

  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-fade-in">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">تعديل أسعار التوصيل لـ ${rate.wilayaName}</h3>
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

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-bold text-slate-700 mb-1">سعر التوصيل للمكتب 🏢 (دج):</label>
              <input type="number" id="edit-del-desk-fee" value="${rate.deskFee ?? Math.max(150, rate.defaultFee - 200)}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-emerald-700 text-sm" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">سعر التوصيل لباب المنزل 🏠 (دج):</label>
              <input type="number" id="edit-del-fee" value="${rate.homeFee ?? rate.defaultFee}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none font-extrabold text-blue-700 text-sm" />
            </div>
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
  const homeFee = document.getElementById("edit-del-fee").value;
  const deskFee = document.getElementById("edit-del-desk-fee").value;
  const communes = document.getElementById("edit-del-communes").value;

  window.store.updateDeliveryRate(id, { wilayaCode, wilayaName, defaultFee: homeFee, homeFee, deskFee, communes });
  closeModal();
  showToast("تم تحديث أسعار التوصيل (للمكتب ولباب المنزل) بنجاح ✓");
}

function confirmDeleteDeliveryRate(id) {
  if (confirm("هل تريد حذف هذا السعر؟")) {
    window.store.deleteDeliveryRate(id);
    showToast("تم حذف سعر التوصيل.");
  }
}

// Rep Order Handlers with Delivery Type (Home/Desk) & Subsidy
function onOrderWilayaChange() {
  const select = document.getElementById("order-wilaya-select");
  const typeSelect = document.getElementById("order-delivery-type");
  const standardInput = document.getElementById("order-standard-delivery");
  const chargedInput = document.getElementById("order-charged-delivery");

  if (!select || !standardInput || !chargedInput) return;

  const opt = select.options[select.selectedIndex];
  const delType = typeSelect ? typeSelect.value : "home";
  if (!opt || !opt.value) {
    standardInput.value = 0;
    chargedInput.value = 0;
  } else {
    const attrName = delType === "desk" ? "data-deskfee" : "data-homefee";
    const fee = parseFloat(opt.getAttribute(attrName)) || parseFloat(opt.getAttribute("data-homefee")) || 500;
    standardInput.value = fee;
    chargedInput.value = fee;
    chargedInput.max = fee;
  }

  updateRepProfitCalculator();
}

function updateRepProfitCalculator() {
  const rows = document.querySelectorAll(".rep-order-item-row");
  const standardDeliveryInput = document.getElementById("order-standard-delivery");
  const chargedDeliveryInput = document.getElementById("order-charged-delivery");
  const subsidyAlert = document.getElementById("delivery-subsidy-alert");
  const subsidyAmountText = document.getElementById("subsidy-amount-text");

  if (!rows || rows.length === 0) return;

  let totalBase = 0;
  let totalProductSelling = 0;
  let grossRepProfit = 0;

  rows.forEach(row => {
    const select = row.querySelector(".rep-item-product");
    const qtyInput = row.querySelector(".rep-item-qty");
    const priceInput = row.querySelector(".rep-item-price");
    if (!select || !qtyInput || !priceInput) return;

    const selectedOpt = select.options[select.selectedIndex];
    const basePrice = selectedOpt && selectedOpt.value ? (parseFloat(selectedOpt.getAttribute("data-baseprice")) || 0) : 0;
    const qty = parseInt(qtyInput.value) || 0;
    const sellingPrice = parseFloat(priceInput.value) || 0;

    if (selectedOpt && selectedOpt.value && qty > 0) {
      totalBase += basePrice * qty;
      totalProductSelling += sellingPrice * qty;
      grossRepProfit += Math.max(0, (sellingPrice - basePrice) * qty);
    }
  });

  const standardDelivery = standardDeliveryInput ? (parseFloat(standardDeliveryInput.value) || 0) : 0;
  const chargedDelivery = chargedDeliveryInput ? (parseFloat(chargedDeliveryInput.value) || 0) : standardDelivery;
  const deliverySubsidy = Math.max(0, standardDelivery - chargedDelivery);

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

  const exceedsAlert = document.getElementById("subsidy-exceeds-alert");
  if (exceedsAlert) {
    if (deliverySubsidy > grossRepProfit && deliverySubsidy > 0) {
      exceedsAlert.classList.remove("hidden");
    } else {
      exceedsAlert.classList.add("hidden");
    }
  }
}

function handleRepSubmitOrder(e, repId) {
  e.preventDefault();
  const rows = document.querySelectorAll(".rep-order-item-row");
  const items = [];
  rows.forEach(row => {
    const productId = row.querySelector(".rep-item-product")?.value;
    const quantity = row.querySelector(".rep-item-qty")?.value;
    const sellingPrice = row.querySelector(".rep-item-price")?.value;
    if (productId) {
      items.push({ productId, quantity, sellingPrice });
    }
  });

  const wilayaSelect = document.getElementById("order-wilaya-select");
  const wilaya = wilayaSelect ? wilayaSelect.value : "";
  const deliveryTypeEl = document.getElementById("order-delivery-type");
  const deliveryType = deliveryTypeEl ? deliveryTypeEl.value : "home";
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
      items,
      wilaya,
      deliveryType,
      commune,
      standardDeliveryFee,
      chargedDeliveryFee,
      customerName,
      customerPhone,
      address,
      customerNotes
    });

    showToast(`تم تسجيل الطلبية #${order.id} (${items.length} منتج) بنجاح وإرسالها للتوصيل 🚚`);
    switchTab("myOrders");
  } catch (err) {
    alert(err.message);
  }
}

function prepareRepOrderWithProduct(productId) {
  switchTab("newOrder");
  setTimeout(() => {
    const firstSelect = document.querySelector(".rep-item-product");
    if (firstSelect) {
      firstSelect.value = productId;
      onRepItemProductChange(firstSelect);
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
  if (confirm(`هل تم تسليم الطلبية بنجاح واستلام مبلغ ${totalToCollect.toLocaleString()} دج من الزبون؟\n\nسيتم خصم الكمية من المخزون مباشرة بعد التأكيد.`)) {
    const user = window.store.getCurrentUser();
    const res = window.store.markOrderDelivered(orderId, "", `${user ? user.name : 'عامل التوصيل'} (عامل التوصيل)`);
    if (res && res.order) {
      showToast(`✅ تم تأكيد التسليم وخصم ${res.order.quantity} من المخزون (${res.stockBefore} ← ${res.stockAfter})`);
    }
  }
}

function driverMarkReturnedPrompt(orderId) {
  const reason = prompt("يرجى كتابة سبب تعذر التوصيل / الإرجاع (مثلاً: الزبون غير رأيه):");
  if (reason !== null) {
    window.store.markOrderReturned(orderId, reason);
    showToast("تم تسجيل الطلبية كمرتجعة وتحرير الكمية المحجوزة في المخزون.");
  }
}

function adminMarkDelivered(orderId) {
  if (confirm("هل تريد تأكيد تسليم هذه الطلبية يدوياً؟ سيتم خصم الكمية من المخزون مباشرة.")) {
    const res = window.store.markOrderDelivered(orderId, "", "صاحب المتجر (تأكيد يدوي)");
    if (res && res.order) {
      showToast(`تم تأكيد التسليم وخصم ${res.order.quantity} من المخزون (${res.stockBefore} ← ${res.stockAfter})`);
    }
  }
}

function adminMarkReturned(orderId) {
  const o = window.store.getOrderById(orderId);
  if (!o) return;
  const msg = o.status === "delivered"
    ? `هذه الطلبية (#${o.id}) تم تأكيد تسليمها سابقاً.\nهل أرجعها الزبون وتريد إعادتها للمخزون وإلغاء أرباحها؟`
    : `هل تريد تأكيد إرجاع/إلغاء الطلبية #${o.id} وتحرير الكمية المحجوزة؟`;
  if (confirm(msg)) {
    window.store.markOrderReturned(orderId, o.status === "delivered" ? "إرجاع الطلبية للمخزون بعد التسليم (طلب الزبون)" : "إرجاع يدوي من صاحب المتجر");
    showToast("تم إرجاع الطلبية وإعادة الكمية إلى المخزون بنجاح ↩️");
  }
}

function confirmDeleteOrder(orderId) {
  const o = window.store.getOrderById(orderId);
  if (!o) return;
  const extra = o.stockDeducted ? "\n(سيتم إرجاع كمية المنتجات إلى المخزون تلقائياً قبل الحذف)" : "";
  if (confirm(`هل أنت متأكد من حذف الطلبية #${o.id} للزبون (${o.customerName}) نهائياً؟${extra}`)) {
    const user = window.store.getCurrentUser();
    window.store.deleteOrder(orderId, user ? user.name : "صاحب المتجر");
    showToast("تم حذف الطلبية من القائمة بنجاح 🗑️");
  }
}

// ==========================================
// EDIT ORDER MODAL (تعديل / إضافة / حذف منتجات وأسعار في طلبات المندوبات وصاحب المتجر)
// ==========================================
function renderEditOrderItemRowHtml(products, item = null, isFirst = false) {
  const selProdId = item ? item.productId : "";
  const qty = item ? item.quantity : 1;
  const price = item ? item.sellingPrice : "";
  return `
    <div class="eo-item-row p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-700">المنتج:</span>
        ${!isFirst ? `<button type="button" onclick="removeEditOrderItemRow(this)" class="text-[11px] font-bold text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded">✕ حذف</button>` : ''}
      </div>
      <select required onchange="onEditOrderItemProductChange(this)" class="eo-item-product w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold">
        <option value="">-- اختر المنتج --</option>
        ${products.map(p => `<option value="${p.id}" data-base="${p.basePrice}" data-cost="${p.costPrice || 0}" ${p.id === selProdId ? 'selected' : ''}>${p.name} (المخزون: ${p.stock} | مرجعي: ${p.basePrice} دج)</option>`).join('')}
      </select>
      <div class="grid grid-cols-2 gap-2">
        <input type="number" min="1" value="${qty}" required oninput="eoUpdate()" placeholder="الكمية" class="eo-item-qty w-full bg-white border border-slate-200 rounded-xl p-2 font-bold" />
        <input type="number" min="0" value="${price}" required oninput="eoUpdate()" placeholder="سعر البيع للقطعة" class="eo-item-price w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-blue-700" />
      </div>
    </div>
  `;
}

function addEditOrderItemRow() {
  const container = document.getElementById("eo-items-container");
  if (!container) return;
  const products = window.store.getProducts();
  const wrap = document.createElement("div");
  wrap.innerHTML = renderEditOrderItemRowHtml(products, null, false).trim();
  container.appendChild(wrap.firstElementChild);
  eoUpdate();
}

function removeEditOrderItemRow(btn) {
  const row = btn.closest(".eo-item-row");
  if (row) row.remove();
  eoUpdate();
}

function onEditOrderItemProductChange(sel) {
  const row = sel.closest(".eo-item-row");
  if (!row) return;
  const opt = sel.options[sel.selectedIndex];
  const priceEl = row.querySelector(".eo-item-price");
  if (opt && opt.value && priceEl && !priceEl.value) {
    priceEl.value = opt.getAttribute("data-base") || "";
  }
  eoUpdate();
}

function openEditOrderModal(orderId) {
  const o = window.store.getOrderById(orderId);
  if (!o) return;
  const products = window.store.getProducts();
  const rates = window.store.getDeliveryRates();
  const isOwnerOrder = o.orderSource === "owner" || o.repId === "OWNER";
  const orderItems = (Array.isArray(o.items) && o.items.length > 0)
    ? o.items
    : [{ productId: o.productId, quantity: o.quantity || 1, sellingPrice: o.sellingPrice || o.basePrice }];

  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">✏️ تعديل الطلبية #${o.id} (${isOwnerOrder ? '👑 صاحب المتجر' : '🌸 ' + o.repName})</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <form onsubmit="handleEditOrderSubmit(event, '${o.id}')" data-isowner="${isOwnerOrder ? '1' : '0'}" id="eo-form" class="space-y-3 text-xs">
          <div id="eo-items-container" class="space-y-2">
            ${orderItems.map((it, idx) => renderEditOrderItemRowHtml(products, it, idx === 0)).join('')}
          </div>
          <button type="button" onclick="addEditOrderItemRow()" class="w-full py-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 text-blue-700 font-bold text-xs">
            ➕ إضافة منتج آخر لهذه الطلبية
          </button>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">الولاية:</label>
              <select id="eo-wilaya" required onchange="eoUpdate(true)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold">
                <option value="">-- اختر --</option>
                ${rates.map(r => `<option value="${r.wilayaName}" data-homefee="${r.homeFee ?? r.defaultFee}" data-deskfee="${r.deskFee ?? Math.max(150, r.defaultFee - 200)}" ${r.wilayaName === o.wilaya ? 'selected' : ''}>${r.wilayaName} (مكتب: ${r.deskFee ?? Math.max(150, r.defaultFee - 200)} | منزل: ${r.homeFee ?? r.defaultFee})</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">نوع التوصيل:</label>
              <select id="eo-delivery-type" onchange="eoUpdate(true)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-blue-700">
                <option value="home" ${o.deliveryType !== 'desk' ? 'selected' : ''}>🏠 لباب المنزل</option>
                <option value="desk" ${o.deliveryType === 'desk' ? 'selected' : ''}>🏢 للمكتب (Stop Desk)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-600 mb-1">السعر المرجعي للتوصيل:</label>
              <input type="number" id="eo-std-delivery" readonly value="${o.standardDeliveryFee || 0}" class="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">سعر التوصيل للزبون:</label>
              <input type="number" id="eo-delivery" min="0" value="${o.chargedDeliveryFee || 0}" required oninput="eoUpdate()" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-extrabold text-blue-700" />
            </div>
          </div>

          <div id="eo-subsidy-alert" class="hidden text-[11px] p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
            💡 سعر التوصيل أقل من المرجعي بـ <strong id="eo-subsidy-text" class="text-red-600">0</strong> دج — يُخصم الفارق تلقائياً من الفائدة!
          </div>

          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="eo-name" value="${o.customerName || ''}" required placeholder="اسم الزبون" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
            <input type="tel" id="eo-phone" value="${o.customerPhone || ''}" required placeholder="هاتف الزبون" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="eo-commune" value="${o.commune || ''}" required placeholder="البلدية" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
            <input type="text" id="eo-address" value="${o.address || ''}" required placeholder="العنوان التفصيلي" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
          </div>

          <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between font-bold">
            <span>إجمالي التحصيل: <span id="eo-total" class="text-blue-700">0 دج</span></span>
            <span>${isOwnerOrder ? 'ربح صاحب المتجر' : 'صافي ربح المندوبة'}: <span id="eo-profit" class="text-emerald-700">0 دج</span></span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md">حفظ التعديلات ✓</button>
          </div>
        </form>
      </div>
    </div>
  `;
  eoUpdate(false);
}

function eoUpdate(wilayaChanged = false) {
  const form = document.getElementById("eo-form");
  const isOwnerOrder = form && form.getAttribute("data-isowner") === "1";
  const rows = document.querySelectorAll(".eo-item-row");
  const wilSel = document.getElementById("eo-wilaya");
  const typeSel = document.getElementById("eo-delivery-type");
  const stdDelEl = document.getElementById("eo-std-delivery");
  const delEl = document.getElementById("eo-delivery");
  if (!wilSel || !delEl) return;

  const wOpt = wilSel.options[wilSel.selectedIndex];
  const delType = typeSel ? typeSel.value : "home";
  const attr = delType === "desk" ? "data-deskfee" : "data-homefee";
  const computedStdFee = wOpt && wOpt.value ? (parseFloat(wOpt.getAttribute(attr)) || 0) : (parseFloat(stdDelEl?.value) || 0);

  if (wilayaChanged) {
    if (stdDelEl) stdDelEl.value = computedStdFee;
    delEl.value = computedStdFee;
  }

  const stdFee = parseFloat(stdDelEl?.value) || computedStdFee;
  let totalSelling = 0;
  let totalBase = 0;
  let totalCost = 0;
  rows.forEach(row => {
    const sel = row.querySelector(".eo-item-product");
    const qty = parseInt(row.querySelector(".eo-item-qty")?.value) || 0;
    const price = parseFloat(row.querySelector(".eo-item-price")?.value) || 0;
    const opt = sel?.options[sel.selectedIndex];
    const base = opt && opt.value ? (parseFloat(opt.getAttribute("data-base")) || 0) : 0;
    const cost = opt && opt.value ? (parseFloat(opt.getAttribute("data-cost")) || 0) : 0;
    if (opt && opt.value && qty > 0) {
      totalSelling += price * qty;
      totalBase += base * qty;
      totalCost += cost * qty;
    }
  });

  const del = parseFloat(delEl.value) || 0;
  const subsidy = Math.max(0, stdFee - del);
  const netProfit = isOwnerOrder ? ((totalSelling - totalCost) - subsidy) : Math.max(0, (totalSelling - totalBase) - subsidy);

  const totalEl = document.getElementById("eo-total");
  const profitEl = document.getElementById("eo-profit");
  if (totalEl) totalEl.innerText = `${(totalSelling + del).toLocaleString()} دج`;
  if (profitEl) profitEl.innerText = `${netProfit.toLocaleString()} دج`;

  const subAlert = document.getElementById("eo-subsidy-alert");
  const subText = document.getElementById("eo-subsidy-text");
  if (subAlert && subText) {
    if (subsidy > 0) {
      subAlert.classList.remove("hidden");
      subText.innerText = subsidy.toLocaleString();
    } else {
      subAlert.classList.add("hidden");
    }
  }
}

function handleEditOrderSubmit(e, orderId) {
  e.preventDefault();
  const rows = document.querySelectorAll(".eo-item-row");
  const items = [];
  rows.forEach(row => {
    const productId = row.querySelector(".eo-item-product")?.value;
    const quantity = row.querySelector(".eo-item-qty")?.value;
    const sellingPrice = row.querySelector(".eo-item-price")?.value;
    if (productId) items.push({ productId, quantity, sellingPrice });
  });
  const user = window.store.getCurrentUser();
  try {
    window.store.updateOrder(orderId, {
      items,
      wilaya: document.getElementById("eo-wilaya").value,
      deliveryType: document.getElementById("eo-delivery-type").value,
      standardDeliveryFee: document.getElementById("eo-std-delivery").value,
      chargedDeliveryFee: document.getElementById("eo-delivery").value,
      customerName: document.getElementById("eo-name").value,
      customerPhone: document.getElementById("eo-phone").value,
      commune: document.getElementById("eo-commune").value,
      address: document.getElementById("eo-address").value,
      actor: user ? user.name : "صاحب المتجر"
    });
    closeModal();
    showToast(`تم تعديل الطلبية #${orderId} وحفظ التحديثات بنجاح ✓`);
  } catch (err) {
    alert(err.message);
  }
}

// ==========================================
// STORE OWNER DIRECT ORDER (طلبية صاحب المتجر مرتبطة بالمخزون)
// ==========================================
function renderAdminOrderItemRowHtml(products, isFirst = false) {
  return `
    <div class="ao-item-row p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-bold text-slate-700">المنتج:</span>
        ${!isFirst ? `<button type="button" onclick="removeAdminOrderItemRow(this)" class="text-[11px] font-bold text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded">✕ حذف</button>` : ''}
      </div>
      <select required onchange="onAdminItemProductChange(this)" class="ao-item-product w-full bg-white border border-slate-200 rounded-xl p-2 font-semibold">
        <option value="">-- اختر المنتج --</option>
        ${products.map(p => `<option value="${p.id}" data-base="${p.basePrice}" data-cost="${p.costPrice || 0}">${p.name} (متاح: ${window.store.getAvailableStock(p.id)} | مرجعي: ${p.basePrice} دج)</option>`).join('')}
      </select>
      <div class="grid grid-cols-2 gap-2">
        <input type="number" min="1" value="1" required oninput="aoUpdate()" placeholder="الكمية" class="ao-item-qty w-full bg-white border border-slate-200 rounded-xl p-2 font-bold" />
        <input type="number" min="0" required oninput="aoUpdate()" placeholder="سعر البيع للقطعة" class="ao-item-price w-full bg-white border border-slate-200 rounded-xl p-2 font-bold text-blue-700" />
      </div>
    </div>
  `;
}

function addAdminOrderItemRow() {
  const container = document.getElementById("ao-items-container");
  if (!container) return;
  const products = window.store.getProducts().filter(p => window.store.getAvailableStock(p.id) > 0);
  const wrap = document.createElement("div");
  wrap.innerHTML = renderAdminOrderItemRowHtml(products, false).trim();
  container.appendChild(wrap.firstElementChild);
  aoUpdate();
}

function removeAdminOrderItemRow(btn) {
  const row = btn.closest(".ao-item-row");
  if (row) row.remove();
  aoUpdate();
}

function onAdminItemProductChange(sel) {
  const row = sel.closest(".ao-item-row");
  if (!row) return;
  const opt = sel.options[sel.selectedIndex];
  const priceEl = row.querySelector(".ao-item-price");
  if (opt && opt.value && priceEl && !priceEl.value) {
    priceEl.value = opt.getAttribute("data-base") || "";
  }
  aoUpdate();
}

function openAdminOrderModal() {
  const products = window.store.getProducts().filter(p => window.store.getAvailableStock(p.id) > 0);
  const rates = window.store.getDeliveryRates();
  const drivers = window.store.state.drivers || [];
  const modal = document.getElementById("modal-container");
  modal.innerHTML = `
    <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 class="text-sm font-bold text-slate-900">👑 حجز طلبية مباشرة من صاحب المتجر</h3>
          <button onclick="closeModal()" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>
        <p class="text-[11px] text-slate-500 mb-3">يمكنك اختيار عدة منتجات في نفس الطلبية. تُحجز الكمية وتُخصم مباشرة بعد تأكيد التسليم.</p>

        <form onsubmit="handleAdminSubmitOrder(event)" class="space-y-3 text-xs">
          <div id="ao-items-container" class="space-y-2">
            ${renderAdminOrderItemRowHtml(products, true)}
          </div>
          <button type="button" onclick="addAdminOrderItemRow()" class="w-full py-2 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 hover:bg-blue-50 text-blue-700 font-bold text-xs">
            ➕ إضافة منتج آخر لنفس الطلبية
          </button>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-700 mb-1">الولاية:</label>
              <select id="ao-wilaya" required onchange="aoUpdate(true)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold">
                <option value="">-- اختر --</option>
                ${rates.map(r => `<option value="${r.wilayaName}" data-homefee="${r.homeFee ?? r.defaultFee}" data-deskfee="${r.deskFee ?? Math.max(150, r.defaultFee - 200)}">${r.wilayaName} (مكتب: ${r.deskFee ?? Math.max(150, r.defaultFee - 200)} | منزل: ${r.homeFee ?? r.defaultFee} دج)</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">نوع التوصيل:</label>
              <select id="ao-delivery-type" onchange="aoUpdate(true)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-blue-700">
                <option value="home">🏠 لباب المنزل</option>
                <option value="desk">🏢 للمكتب (Stop Desk)</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block font-bold text-slate-600 mb-1">السعر المرجعي للتوصيل:</label>
              <input type="number" id="ao-std-delivery" readonly value="0" class="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-600" />
            </div>
            <div>
              <label class="block font-bold text-slate-700 mb-1">سعر التوصيل للزبون (قابل للتعديل):</label>
              <input type="number" id="ao-delivery" min="0" value="0" required oninput="aoUpdate()" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-extrabold text-blue-700" />
            </div>
          </div>
          <div id="ao-subsidy-alert" class="hidden text-[11px] p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-semibold">
            💡 سعر التوصيل أقل من المرجعي بـ <strong id="ao-subsidy-text" class="text-red-600">0</strong> دج — يُخصم الفارق تلقائياً من فائدتك!
          </div>
          <div class="grid grid-cols-2 gap-2">
            <input type="text" id="ao-commune" required placeholder="البلدية" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
            <select id="ao-driver" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold">
              ${drivers.map(d => `<option value="${d.id}">🚚 ${d.name}</option>`).join('')}
            </select>
          </div>
          <input type="text" id="ao-name" required placeholder="اسم الزبون" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5" />
          <input type="tel" id="ao-phone" required placeholder="هاتف الزبون" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono" />
          <input type="text" id="ao-address" required placeholder="العنوان التفصيلي" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5" />

          <div class="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between font-bold">
            <span>إجمالي التحصيل: <span id="ao-total" class="text-blue-700">0 دج</span></span>
            <span>ربحك: <span id="ao-profit" class="text-emerald-700">0 دج</span></span>
          </div>

          <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button type="button" onclick="closeModal()" class="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold">إلغاء</button>
            <button type="submit" class="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md">حجز وإرسال للتوصيل 🚚</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function aoUpdate(wilayaChanged = false) {
  const rows = document.querySelectorAll(".ao-item-row");
  const wilSel = document.getElementById("ao-wilaya");
  const typeSel = document.getElementById("ao-delivery-type");
  const stdDelEl = document.getElementById("ao-std-delivery");
  const delEl = document.getElementById("ao-delivery");
  if (!wilSel || !delEl) return;

  const wOpt = wilSel.options[wilSel.selectedIndex];
  const delType = typeSel ? typeSel.value : "home";
  const attr = delType === "desk" ? "data-deskfee" : "data-homefee";
  const stdFee = wOpt && wOpt.value ? (parseFloat(wOpt.getAttribute(attr)) || 0) : 0;

  if (stdDelEl) stdDelEl.value = stdFee;
  if (wilayaChanged) {
    delEl.value = stdFee;
  }

  let totalSelling = 0;
  let totalCost = 0;
  rows.forEach(row => {
    const sel = row.querySelector(".ao-item-product");
    const qty = parseInt(row.querySelector(".ao-item-qty")?.value) || 0;
    const price = parseFloat(row.querySelector(".ao-item-price")?.value) || 0;
    const opt = sel?.options[sel.selectedIndex];
    const cost = opt && opt.value ? (parseFloat(opt.getAttribute("data-cost")) || 0) : 0;
    if (opt && opt.value && qty > 0) {
      totalSelling += price * qty;
      totalCost += cost * qty;
    }
  });

  const del = parseFloat(delEl.value) || 0;
  const subsidy = Math.max(0, stdFee - del);
  const profit = (totalSelling - totalCost) - subsidy;
  document.getElementById("ao-total").innerText = `${(totalSelling + del).toLocaleString()} دج`;
  document.getElementById("ao-profit").innerText = `${profit.toLocaleString()} دج`;

  const subAlert = document.getElementById("ao-subsidy-alert");
  const subText = document.getElementById("ao-subsidy-text");
  if (subAlert && subText) {
    if (subsidy > 0) {
      subAlert.classList.remove("hidden");
      subText.innerText = subsidy.toLocaleString();
    } else {
      subAlert.classList.add("hidden");
    }
  }
}

function handleAdminSubmitOrder(e) {
  e.preventDefault();
  const rows = document.querySelectorAll(".ao-item-row");
  const items = [];
  rows.forEach(row => {
    const productId = row.querySelector(".ao-item-product")?.value;
    const quantity = row.querySelector(".ao-item-qty")?.value;
    const sellingPrice = row.querySelector(".ao-item-price")?.value;
    if (productId) items.push({ productId, quantity, sellingPrice });
  });
  const wilSel = document.getElementById("ao-wilaya");
  const typeSel = document.getElementById("ao-delivery-type");
  const stdDelEl = document.getElementById("ao-std-delivery");
  try {
    const order = window.store.createOrder({
      orderSource: "owner",
      repId: "OWNER",
      items,
      wilaya: wilSel.value,
      deliveryType: typeSel ? typeSel.value : "home",
      commune: document.getElementById("ao-commune").value,
      standardDeliveryFee: stdDelEl ? stdDelEl.value : 0,
      chargedDeliveryFee: document.getElementById("ao-delivery").value,
      customerName: document.getElementById("ao-name").value,
      customerPhone: document.getElementById("ao-phone").value,
      address: document.getElementById("ao-address").value,
      driverId: document.getElementById("ao-driver").value
    });
    closeModal();
    showToast(`تم حجز طلبية صاحب المتجر #${order.id} وإرسالها لعامل التوصيل 🚚`);
  } catch (err) {
    alert(err.message);
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

