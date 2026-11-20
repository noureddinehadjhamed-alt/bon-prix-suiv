// Central Data Store & Business Logic with High-Security RBAC, Role Approvals,
// Store Owner + Sales Rep Orders, Reference Pricing, Delivery Subsidy Deduction,
// and Immediate Stock Deduction upon Delivery Confirmation by Delivery Driver.
class Store {
  constructor() {
    this.storageKey = "BON_PRIX_SUIV_STATE_V4";
    this.authKey = "BON_PRIX_SUIV_AUTH_SESSION_V4";
    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    try {
      localStorage.removeItem("BON_PRIX_SUIV_AUTH_USER");
    } catch (e) {}
    this.state = this.loadState();
    this.currentUser = this.loadCurrentUser();
    this.listeners = [];
    this.cloudStatus = "connecting"; // connecting, synced, offline
    this._isApplyingRemote = false;
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.users || parsed.users.length === 0) {
          parsed.users = JSON.parse(JSON.stringify(DEFAULT_DATA.users));
        } else {
          const adminUser = parsed.users.find(u => u.role === "admin");
          if (adminUser && !adminUser.email) {
            adminUser.email = "noureddinehadjhamed1992@gmail.com";
            adminUser.authProvider = "google";
          }
          const defaultRepEmails = {
            "USR-002": "fatima.rep@gmail.com",
            "USR-003": "meriem.rep@gmail.com",
            "USR-004": "sara.rep@gmail.com"
          };
          parsed.users.forEach(u => {
            if (!u.securityPin) u.securityPin = "1234";
            if (!u.requestedRole) u.requestedRole = u.role === "pending" ? "rep" : u.role;
            if (!u.email && defaultRepEmails[u.id]) {
              u.email = defaultRepEmails[u.id];
              u.authProvider = "google";
            }
          });
        }
        if (!parsed.deliveryRates || parsed.deliveryRates.length === 0) {
          parsed.deliveryRates = JSON.parse(JSON.stringify(DEFAULT_DATA.deliveryRates));
        }
        if (!parsed.stockMovements) {
          parsed.stockMovements = JSON.parse(JSON.stringify(DEFAULT_DATA.stockMovements || []));
        }
        if (!parsed.securityLogs) {
          parsed.securityLogs = JSON.parse(JSON.stringify(DEFAULT_DATA.securityLogs || []));
        }
        return parsed;
      }
    } catch (e) {
      console.error("Error reading localStorage", e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      this.notifyListeners();
      if (!this._isApplyingRemote) {
        this.syncToCloud();
      }
    } catch (e) {
      console.error("Error saving state to localStorage", e);
    }
  }

  // --- Firebase Cloud Sync (Real-time across devices) ---
  async initCloudSync() {
    if (!window.fbSync || !window.fbSync.db) {
      this.cloudStatus = "offline";
      this.notifyListeners();
      return;
    }

    try {
      const { db, doc, getDoc, setDoc, onSnapshot } = window.fbSync;
      const stateRef = doc(db, "bon_prix_suiv", "main_state");

      const snap = await getDoc(stateRef);
      if (snap.exists()) {
        const remoteData = snap.data();
        if (remoteData && remoteData.users) {
          this._applyRemoteState(remoteData);
        }
      } else {
        await setDoc(stateRef, JSON.parse(JSON.stringify(this.state)));
      }

      this.cloudStatus = "synced";
      this.notifyListeners();

      onSnapshot(stateRef, (docSnap) => {
        if (docSnap.exists() && !docSnap.metadata.hasPendingWrites) {
          const remoteData = docSnap.data();
          if (remoteData && remoteData.users) {
            this._applyRemoteState(remoteData);
            this.cloudStatus = "synced";
            this.notifyListeners();
          }
        }
      }, (err) => {
        console.warn("Firestore snapshot error:", err);
        this.cloudStatus = "offline";
        this.notifyListeners();
      });
    } catch (e) {
      console.warn("Firebase Cloud Sync unavailable, using local storage:", e);
      this.cloudStatus = "offline";
      this.notifyListeners();
    }
  }

  _applyRemoteState(remoteData) {
    this._isApplyingRemote = true;
    try {
      const defaultRepEmails = {
        "USR-002": "fatima.rep@gmail.com",
        "USR-003": "meriem.rep@gmail.com",
        "USR-004": "sara.rep@gmail.com"
      };
      if (remoteData && Array.isArray(remoteData.users)) {
        remoteData.users.forEach(u => {
          if (!u.email && defaultRepEmails[u.id]) {
            u.email = defaultRepEmails[u.id];
            u.authProvider = "google";
          }
        });
      }
      this.state = remoteData;
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
      if (this.currentUser) {
        const refreshed = this.getUserById(this.currentUser.id);
        if (refreshed) {
          this.currentUser = refreshed;
          const sessionObj = {
            ...refreshed,
            sessionToken: this.computeSecurityToken(refreshed),
            loginAt: new Date().toISOString()
          };
          localStorage.setItem(this.authKey, JSON.stringify(sessionObj));
        }
      }
      this.notifyListeners();
    } finally {
      this._isApplyingRemote = false;
    }
  }

  async syncToCloud() {
    if (!window.fbSync || !window.fbSync.db) return false;
    try {
      const { db, doc, setDoc } = window.fbSync;
      const stateRef = doc(db, "bon_prix_suiv", "main_state");
      await setDoc(stateRef, JSON.parse(JSON.stringify(this.state)));
      this.cloudStatus = "synced";
      return true;
    } catch (e) {
      console.warn("Failed to sync to Firestore:", e);
      this.cloudStatus = "offline";
      return false;
    }
  }

  computeSecurityToken(user) {
    if (!user) return "";
    const raw = `${user.id}:${user.role}:${user.status}:BPS_HIGH_SEC_2026`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    return "SEC-" + Math.abs(hash).toString(16).toUpperCase();
  }

  addSecurityLog(event, actor, status = "success", details = "") {
    if (!this.state.securityLogs) this.state.securityLogs = [];
    const now = new Date().toISOString().replace("T", " ").slice(0, 16);
    this.state.securityLogs.unshift({
      id: "SEC-" + Math.floor(100 + Math.random() * 900),
      time: now,
      event,
      actor,
      status,
      details
    });
    if (this.state.securityLogs.length > 50) {
      this.state.securityLogs = this.state.securityLogs.slice(0, 50);
    }
  }

  getSecurityLogs() {
    return this.state.securityLogs || [];
  }

  loadCurrentUser() {
    try {
      const saved = localStorage.getItem(this.authKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const userInState = this.getUserById(parsed.id);
        if (userInState) {
          return userInState;
        }
      }
    } catch (e) {
      console.error("Error reading auth user", e);
    }
    return null;
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      const sessionObj = {
        ...user,
        sessionToken: this.computeSecurityToken(user),
        loginAt: new Date().toISOString()
      };
      localStorage.setItem(this.authKey, JSON.stringify(sessionObj));
    } else {
      localStorage.removeItem(this.authKey);
    }
    this.notifyListeners();
  }

  getCurrentUser() {
    if (this.currentUser) {
      const userInDb = this.getUserById(this.currentUser.id);
      if (userInDb) this.currentUser = userInDb;
    }
    return this.currentUser;
  }

  logout() {
    if (this.currentUser) {
      this.addSecurityLog("تسجيل خروج آمن", `${this.currentUser.name} (${this.currentUser.phone})`, "info", "إنهاء الجلسة المشفرة");
      this.saveState();
    }
    this.setCurrentUser(null);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(cb => cb(this.state));
  }

  resetDemo() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.currentUser = null;
    localStorage.removeItem(this.authKey);
    this.saveState();
  }

  // --- Users & High-Security RBAC Logic ---
  getUsers() {
    if (!this.state.users) {
      this.state.users = JSON.parse(JSON.stringify(DEFAULT_DATA.users));
    }
    return this.state.users;
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  }

  getUserByPhone(phone) {
    if (!phone) return null;
    const clean = phone.trim().replace(/\s+/g, '');
    const users = this.getUsers();
    return users.find(u => u.phone === clean && u.status === "active") || users.find(u => u.phone === clean);
  }

  getUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    return users.find(u => u.email && u.email.toLowerCase() === cleanEmail && u.status === "active") ||
           users.find(u => u.email && u.email.toLowerCase() === cleanEmail);
  }

  getUserByRole(role) {
    return this.getUsers().find(u => u.role === role);
  }

  getPendingUsers() {
    return this.getUsers().filter(u => u.status === "pending" || u.role === "pending");
  }

  // Register a new user (requires Store Owner approval before access!)
  registerUser({ name, phone, email = "", password, requestedRole = "rep", wilaya = "الجزائر العاصمة", note = "" }) {
    if (!name || !phone || !password) {
      throw new Error("يرجى ملء جميع الحقول المطلوبة (الاسم، الهاتف، وكلمة المرور)");
    }

    if (password.trim().length < 3) {
      throw new Error("درجة الأمان: يرجى اختيار كلمة مرور قوية (3 أحرف أو أرقام على الأقل)");
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const existing = this.getUserByPhone(cleanPhone);
    if (existing) {
      throw new Error("رقم الهاتف هذا مسجل مسبقاً! يرجى تسجيل الدخول أو استخدام رقم آخر.");
    }

    const validRequestedRole = requestedRole === "driver" ? "driver" : "rep";
    const roleLabel = validRequestedRole === "driver" ? "عامل توصيل" : "مندوبة مبيعات";

    const id = "USR-" + Math.floor(100 + Math.random() * 900);
    const newUser = {
      id,
      name: name.trim(),
      phone: cleanPhone,
      email: email.trim().toLowerCase(),
      password: password.trim(),
      role: "pending", // Blocked until Store Owner approves!
      requestedRole: validRequestedRole,
      wilaya: (wilaya || "الجزائر العاصمة").trim(),
      status: "pending",
      securityLevel: "high",
      note: note.trim() || `طلب تسجيل جديد للعمل بصفة (${roleLabel}) في ${wilaya || 'الجزائر'}`,
      createdAt: new Date().toISOString()
    };

    this.state.users.unshift(newUser);
    this.addSecurityLog(
      `طلب تسجيل حساب جديد (${roleLabel})`,
      `${newUser.name} (${newUser.phone})`,
      "pending_approval",
      `تم إنشاء الطلب بدرجة أمان عالية وإحالته إلى صاحب المتجر للموافقة.`
    );
    this.saveState();
    return newUser;
  }

  // High-Security Login Authentication (Phone/Email + Password)
  loginUser(identifier, password) {
    const now = Date.now();
    if (this.lockoutUntil && now < this.lockoutUntil) {
      const remainingSec = Math.ceil((this.lockoutUntil - now) / 1000);
      throw new Error(`🔒 حماية الأمان العالي: تم قفل المحاولات مؤقتاً بسبب محاولات خاطئة متكررة. يرجى الانتظار ${remainingSec} ثانية.`);
    }

    const cleanId = identifier.trim();
    let user = null;

    if (cleanId.includes("@")) {
      user = this.getUserByEmail(cleanId);
    } else {
      user = this.getUserByPhone(cleanId.replace(/\s+/g, ''));
    }

    if (!user || user.password !== password.trim()) {
      this.failedAttempts = (this.failedAttempts || 0) + 1;
      if (this.failedAttempts >= 5) {
        this.lockoutUntil = Date.now() + 30000;
        this.addSecurityLog("حظر مؤقت (محاولات دخول فاشلة متكررة)", cleanId, "blocked", "تم تفعيل قفل الحماية الأمني لمدة 30 ثانية");
        this.saveState();
      }
      throw new Error("البريد الإلكتروني / رقم الهاتف أو كلمة المرور غير صحيحة!");
    }

    if (user.status === "suspended") {
      throw new Error("🔒 هذا الحساب مجمد مؤقتاً من طرف صاحب المتجر (المسير العام).");
    }

    this.failedAttempts = 0;
    this.lockoutUntil = 0;
    this.addSecurityLog(
      "تسجيل دخول ناجح",
      `${user.name} (${user.phone})`,
      "success",
      `الدور: ${user.role === 'admin' ? 'صاحب المتجر' : user.role === 'rep' ? 'مندوبة' : user.role === 'driver' ? 'عامل توصيل' : 'قيد انتظار الموافقة'}`
    );
    this.saveState();
    this.setCurrentUser(user);
    return user;
  }

  // Google Sign-In for Sales Reps (المندوبات), Admin (Owner), and Delivery Drivers
  loginWithGoogle({ email, name = "", phone = "", password = "", securityPin = "1234", wilaya = "الجزائر العاصمة", requestedRole = "rep", isOAuthVerified = false }) {
    const cleanEmail = (email || "").trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      throw new Error("يرجى إدخال بريد Google الإلكتروني الصحيح (مثال: name@gmail.com)");
    }

    const adminUser = this.getUserByRole("admin");
    if (
      adminUser &&
      ((adminUser.email && adminUser.email.toLowerCase() === cleanEmail) ||
        cleanEmail === "noureddinehadjhamed1992@gmail.com")
    ) {
      if (!isOAuthVerified && password.trim() !== adminUser.password) {
        throw new Error("كلمة مرور المدير لحساب Google غير صحيحة!");
      }
      adminUser.email = cleanEmail;
      adminUser.authProvider = "google";
      this.addSecurityLog("دخول المدير العام عبر Google", cleanEmail, "success", "صلاحيات المسير العام كاملة");
      this.saveState();
      this.setCurrentUser(adminUser);
      return adminUser;
    }

    const existingUser = this.getUserByEmail(cleanEmail) || (phone ? this.getUserByPhone(phone.trim().replace(/\s+/g, '')) : null);
    if (existingUser) {
      if (!isOAuthVerified && existingUser.password && password.trim() !== "" && existingUser.password !== password.trim()) {
        throw new Error("كلمة المرور غير صحيحة لحساب Google هذا!");
      }
      if (existingUser.status === "suspended") {
        throw new Error("🔒 هذا الحساب مجمد مؤقتاً من طرف صاحب المتجر.");
      }
      existingUser.email = cleanEmail;
      existingUser.authProvider = "google";
      this.addSecurityLog(
        `دخول عبر حساب Google (${existingUser.role === 'rep' ? 'مندوبة' : existingUser.role === 'driver' ? 'عامل توصيل' : 'قيد المراجعة'})`,
        `${existingUser.name} (${cleanEmail})`,
        "success",
        "تم التحقق من بريد Google وتفعيل الجلسة"
      );
      this.saveState();
      this.setCurrentUser(existingUser);
      return existingUser;
    }

    // New Sales Rep (or Driver) signing in with Google for the first time -> Create pending approval request for Store Owner
    const derivedName = name.trim() || cleanEmail.split("@")[0];
    const cleanPhone = phone.trim().replace(/\s+/g, '') || cleanEmail;
    const cleanPin = (securityPin && /^\d{4}$/.test(securityPin.trim())) ? securityPin.trim() : "1234";
    const id = "USR-" + Math.floor(100 + Math.random() * 900);
    const validRole = requestedRole === "driver" ? "driver" : "rep";
    const newPendingUser = {
      id,
      name: derivedName,
      email: cleanEmail,
      phone: cleanPhone,
      password: password.trim() || "123",
      securityPin: cleanPin,
      authProvider: "google",
      role: "pending",
      requestedRole: validRole,
      wilaya: (wilaya || "الجزائر العاصمة").trim(),
      status: "pending",
      securityLevel: "high",
      note: `طلب تسجيل ${validRole === 'rep' ? 'مندوبة مبيعات' : 'عامل توصيل'} عبر حساب Google (${cleanEmail}) بانتظار موافقة صاحب المتجر`,
      createdAt: new Date().toISOString()
    };

    this.state.users.unshift(newPendingUser);
    this.addSecurityLog(
      `طلب تسجيل ${validRole === 'rep' ? 'مندوبة' : 'عامل توصيل'} عبر Google`,
      `${derivedName} (${cleanEmail})`,
      "pending_approval",
      "تم إرسال طلب التسجيل بحساب Google إلى صاحب المتجر للموافقة"
    );
    this.saveState();
    this.setCurrentUser(newPendingUser);
    return newPendingUser;
  }

  updateAdminAccount({ name, email, phone, password, securityPin }) {
    const adminUser = this.getUserByRole("admin");
    if (!adminUser) return null;
    if (name) adminUser.name = name.trim();
    if (email) adminUser.email = email.trim().toLowerCase();
    if (phone) adminUser.phone = phone.trim();
    if (password) adminUser.password = password.trim();
    if (securityPin) adminUser.securityPin = securityPin.trim();
    this.addSecurityLog("تحديث بيانات أمان المدير العام", adminUser.name, "success", "تم تحديث بيانات الحساب المرجعي");
    this.saveState();
    if (this.currentUser && this.currentUser.id === adminUser.id) {
      this.setCurrentUser(adminUser);
    }
    return adminUser;
  }

  // Store Owner Approval & Role Classification
  approveUser(userId, assignedRole, details = {}) {
    const user = this.getUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود!");

    const targetRole = assignedRole || user.requestedRole || "rep";

    if (targetRole === "rep") {
      let rep = this.state.reps.find(r => r.phone === user.phone || r.userId === user.id);
      if (!rep) {
        const repId = "REP-" + String(this.state.reps.length + 1).padStart(2, "0");
        rep = {
          id: repId,
          userId: user.id,
          name: user.name,
          phone: user.phone,
          wilaya: details.wilaya || user.wilaya || "الجزائر العاصمة",
          notes: details.notes || user.note || "تم قبول طلب التسجيل من صاحب المتجر",
          totalPaidProfits: 0
        };
        this.state.reps.push(rep);
      }
      user.role = "rep";
      user.requestedRole = "rep";
      user.status = "active";
      user.linkedId = rep.id;
      user.approvedAt = new Date().toISOString();
      this.addSecurityLog("قبول طلب تسجيل مندوبة", `${user.name} (${user.phone})`, "success", `تم تفعيل حساب المندوبة (${rep.id}) من طرف صاحب المتجر`);
    } else if (targetRole === "driver") {
      let driver = this.state.drivers.find(d => d.phone === user.phone || d.userId === user.id);
      if (!driver) {
        const driverId = "DRV-" + String(this.state.drivers.length + 1).padStart(2, "0");
        driver = {
          id: driverId,
          userId: user.id,
          name: user.name,
          phone: user.phone,
          vehicle: details.vehicle || "سيارة توصيل",
          activeOrdersCount: 0
        };
        this.state.drivers.push(driver);
      }
      user.role = "driver";
      user.requestedRole = "driver";
      user.status = "active";
      user.linkedId = driver.id;
      user.approvedAt = new Date().toISOString();
      this.addSecurityLog("قبول طلب تسجيل عامل توصيل", `${user.name} (${user.phone})`, "success", `تم تفعيل حساب عامل التوصيل (${driver.id}) من طرف صاحب المتجر`);
    }

    this.saveState();
    return user;
  }

  rejectUser(userId, reason = "تم رفض طلب التسجيل من قبل صاحب المتجر") {
    const user = this.getUserById(userId);
    if (!user) return false;
    user.status = "rejected";
    user.role = "rejected";
    user.rejectReason = reason;
    this.addSecurityLog("رفض طلب تسجيل", `${user.name} (${user.phone})`, "blocked", `السبب: ${reason}`);
    this.saveState();
    return true;
  }

  deleteUser(userId) {
    const user = this.getUserById(userId);
    if (user) {
      this.addSecurityLog("حذف حساب مستخدم", `${user.name} (${user.phone})`, "warning", "تم إزالة الحساب من النظام");
    }
    this.state.users = this.state.users.filter(u => u.id !== userId);
    this.saveState();
  }

  // Change own password & PIN (for Sales Rep, Driver, or Admin)
  changeOwnPassword(userId, currentPassword, newPassword, newPin = "") {
    const user = this.getUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود!");

    if (!currentPassword || user.password !== currentPassword.trim()) {
      throw new Error("كلمة المرور الحالية غير صحيحة!");
    }

    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error("يجب أن تتكون كلمة المرور الجديدة من 3 أحرف أو أرقام على الأقل!");
    }

    if (newPin && newPin.trim() !== "") {
      if (!/^\d{4}$/.test(newPin.trim())) {
        throw new Error("رمز الأمان (PIN) يجب أن يتكون من 4 أرقام بالضبط!");
      }
      user.securityPin = newPin.trim();
    }

    user.password = newPassword.trim();
    this.addSecurityLog(
      "تغيير كلمة المرور الشخصية",
      `${user.name} (${user.phone})`,
      "success",
      `قام المستخدم بتحديث كلمة مروره${newPin ? ' ورمز PIN' : ''} بنجاح`
    );
    this.saveState();
    if (this.currentUser && this.currentUser.id === user.id) {
      this.setCurrentUser(user);
    }
    return user;
  }

  // Admin resets a user's password / PIN / Google email
  adminResetUserPassword(userId, newPassword, newPin = "", newEmail = "") {
    const user = this.getUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود!");
    if (!newPassword || newPassword.trim().length < 3) {
      throw new Error("كلمة المرور الجديدة قصيرة جداً (3 أحرف على الأقل)!");
    }
    if (newPin && !/^\d{4}$/.test(newPin.trim())) {
      throw new Error("رمز PIN يجب أن يكون 4 أرقام!");
    }
    user.password = newPassword.trim();
    if (newPin) user.securityPin = newPin.trim();
    if (newEmail !== undefined && newEmail.trim() !== "") {
      user.email = newEmail.trim().toLowerCase();
      user.authProvider = "google";
    }
    this.addSecurityLog(
      "تحديث حساب / كلمة مرور من صاحب المتجر",
      `${user.name} (${user.email || user.phone})`,
      "info",
      "تم تحديث بيانات الدخول وحساب Google بواسطة المسير العام"
    );
    this.saveState();
    return user;
  }

  // --- Products & Inventory Logic (Linked to Orders & Delivery Confirmation) ---
  getProducts() {
    return this.state.products || [];
  }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id);
  }

  // Calculate quantity currently in active orders (pending / out_for_delivery) not yet delivered/deducted
  // Supports both multi-product orders (o.items) and legacy single-product orders
  getReservedStock(productId) {
    return this.getOrders()
      .filter(o => (o.status === "out_for_delivery" || o.status === "pending") && !o.stockDeducted)
      .reduce((sum, o) => {
        if (Array.isArray(o.items) && o.items.length > 0) {
          const itemQty = o.items
            .filter(it => it.productId === productId)
            .reduce((s, it) => s + (parseInt(it.quantity) || 0), 0);
          return sum + itemQty;
        }
        return sum + (o.productId === productId ? (parseInt(o.quantity) || 0) : 0);
      }, 0);
  }

  // Calculate available stock for new bookings (Actual Stock - Reserved in active deliveries)
  getAvailableStock(productId) {
    const p = this.getProductById(productId);
    if (!p) return 0;
    return Math.max(0, p.stock - this.getReservedStock(productId));
  }

  getStockMovements() {
    return this.state.stockMovements || [];
  }

  addProduct(product) {
    const id = "PRD-" + Math.floor(100 + Math.random() * 900);
    const costPrice = parseFloat(product.costPrice) || 0;
    const basePrice = parseFloat(product.basePrice) || 0;
    const defaultImg = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80";

    let images = Array.isArray(product.images)
      ? product.images.filter(img => typeof img === "string" && img.trim() !== "")
      : [];
    if (images.length === 0) {
      images = [product.image || defaultImg];
    }

    const newProduct = {
      id,
      name: product.name,
      category: product.category || "عام",
      costPrice,
      basePrice,
      stock: parseInt(product.stock) || 0,
      minStockAlert: parseInt(product.minStockAlert) || 5,
      image: images[0],
      images,
      description: product.description || ""
    };
    this.state.products.unshift(newProduct);
    this.saveState();
    return newProduct;
  }

  updateProduct(id, updates) {
    const p = this.getProductById(id);
    if (!p) return false;

    let images = p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
    if (Array.isArray(updates.images) && updates.images.length > 0) {
      images = updates.images.filter(img => typeof img === "string" && img.trim() !== "");
    } else if (updates.image && updates.image !== p.image) {
      images = [updates.image, ...images.filter(img => img !== updates.image)];
    }

    Object.assign(p, {
      name: updates.name ?? p.name,
      category: updates.category ?? p.category,
      costPrice: updates.costPrice !== undefined ? parseFloat(updates.costPrice) : p.costPrice,
      basePrice: updates.basePrice !== undefined ? parseFloat(updates.basePrice) : p.basePrice,
      stock: updates.stock !== undefined ? parseInt(updates.stock) : p.stock,
      minStockAlert: updates.minStockAlert !== undefined ? parseInt(updates.minStockAlert) : p.minStockAlert,
      image: images[0] || updates.image || p.image,
      images,
      description: updates.description ?? p.description
    });
    this.saveState();
    return true;
  }

  adjustStock(productId, delta) {
    const p = this.getProductById(productId);
    if (!p) return false;
    const before = p.stock;
    p.stock = Math.max(0, p.stock + delta);
    if (!this.state.stockMovements) this.state.stockMovements = [];
    this.state.stockMovements.unshift({
      id: "MOV-" + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().replace("T", " ").slice(0, 16),
      orderId: "-",
      orderSource: "owner",
      productId: p.id,
      productName: p.name,
      quantity: Math.abs(delta),
      stockBefore: before,
      stockAfter: p.stock,
      type: delta >= 0 ? "manual_add" : "manual_sub",
      actor: "صاحب المتجر (المسير العام)",
      note: `تعديل مخزون يدوي (${delta >= 0 ? '+' + delta : delta}) من صاحب المتجر`
    });
    this.saveState();
    return true;
  }

  deleteProduct(id) {
    this.state.products = this.state.products.filter(p => p.id !== id);
    this.saveState();
  }

  // --- Delivery Rates Logic (Set by Store Owner) ---
  getDeliveryRates() {
    if (!this.state.deliveryRates) {
      this.state.deliveryRates = JSON.parse(JSON.stringify(DEFAULT_DATA.deliveryRates));
    }
    return this.state.deliveryRates;
  }

  getDeliveryRateForWilaya(wilayaName) {
    if (!wilayaName) return null;
    return this.getDeliveryRates().find(r =>
      r.wilayaName.toLowerCase().includes(wilayaName.toLowerCase()) ||
      wilayaName.toLowerCase().includes(r.wilayaName.toLowerCase())
    );
  }

  addDeliveryRate(rate) {
    const id = "DEL-" + String(this.getDeliveryRates().length + 1).padStart(2, "0");
    const newRate = {
      id,
      wilayaCode: rate.wilayaCode || "",
      wilayaName: rate.wilayaName,
      defaultFee: parseFloat(rate.defaultFee) || 500,
      communes: rate.communes || "كافة بلديات الولاية"
    };
    this.state.deliveryRates.push(newRate);
    this.saveState();
    return newRate;
  }

  updateDeliveryRate(id, updates) {
    const rate = this.getDeliveryRates().find(r => r.id === id);
    if (!rate) return false;
    Object.assign(rate, {
      wilayaCode: updates.wilayaCode ?? rate.wilayaCode,
      wilayaName: updates.wilayaName ?? rate.wilayaName,
      defaultFee: updates.defaultFee !== undefined ? parseFloat(updates.defaultFee) : rate.defaultFee,
      communes: updates.communes ?? rate.communes
    });
    this.saveState();
    return true;
  }

  deleteDeliveryRate(id) {
    this.state.deliveryRates = this.state.deliveryRates.filter(r => r.id !== id);
    this.saveState();
    return true;
  }

  // --- Sales Reps Logic ---
  getReps() {
    return this.state.reps || [];
  }

  getRepById(id) {
    return this.getReps().find(r => r.id === id);
  }

  getRepByUserId(userId) {
    return this.getReps().find(r => r.userId === userId);
  }

  addRep(rep) {
    const id = "REP-" + String(this.state.reps.length + 1).padStart(2, "0");
    const newRep = {
      id,
      userId: rep.userId || null,
      name: rep.name,
      phone: rep.phone,
      wilaya: rep.wilaya || "",
      notes: rep.notes || "",
      totalPaidProfits: 0
    };
    this.state.reps.push(newRep);
    this.saveState();
    return newRep;
  }

  getRepFinancials(repId) {
    const orders = this.getOrders().filter(o => o.repId === repId);
    let pendingProfits = 0;
    let confirmedProfits = 0;
    let deliveredOrdersCount = 0;
    let activeOrdersCount = 0;

    orders.forEach(o => {
      if (o.status === "delivered") {
        confirmedProfits += (o.repProfit || 0);
        deliveredOrdersCount++;
      } else if (o.status === "pending" || o.status === "out_for_delivery") {
        pendingProfits += (o.repProfit || 0);
        activeOrdersCount++;
      }
    });

    const rep = this.getRepById(repId);
    const totalPaidProfits = rep ? (rep.totalPaidProfits || 0) : 0;
    const availableBalance = Math.max(0, confirmedProfits - totalPaidProfits);

    return {
      totalOrders: orders.length,
      deliveredOrdersCount,
      activeOrdersCount,
      pendingProfits,
      confirmedProfits,
      totalPaidProfits,
      availableBalance
    };
  }

  recordPayout(repId, amount, paymentMethod = "نقداً", note = "") {
    amount = parseFloat(amount) || 0;
    if (amount <= 0) return false;

    const rep = this.getRepById(repId);
    if (!rep) return false;

    rep.totalPaidProfits = (rep.totalPaidProfits || 0) + amount;

    const payout = {
      id: "PAY-" + (this.state.payouts.length + 1),
      date: new Date().toISOString().slice(0, 10),
      repId,
      amount,
      paymentMethod,
      note
    };

    if (!this.state.payouts) this.state.payouts = [];
    this.state.payouts.unshift(payout);
    this.saveState();
    return true;
  }

  // --- Orders Logic (Supports BOTH Sales Rep Orders & Store Owner Direct Orders) ---
  // IMPORTANT (Requirement 3): Stock quantity does NOT decrease on order creation;
  // it decreases IMMEDIATELY AFTER delivery confirmation by the Delivery Driver!
  getOrders() {
    return this.state.orders || [];
  }

  getOrderById(id) {
    return this.getOrders().find(o => o.id === id);
  }

  createOrder(data) {
    const isOwnerOrder = data.orderSource === "owner" || data.repId === "OWNER";

    // Build normalized items array (supports multi-product orders OR legacy single-product)
    const rawItems = Array.isArray(data.items) && data.items.length > 0
      ? data.items
      : [{ productId: data.productId, quantity: data.quantity, sellingPrice: data.sellingPrice }];

    if (rawItems.length === 0) {
      throw new Error("يرجى اختيار منتج واحد على الأقل!");
    }

    // Aggregate requested quantities per productId to validate stock accurately
    const qtyByProduct = {};
    const resolvedItems = [];

    for (const raw of rawItems) {
      const product = this.getProductById(raw.productId);
      if (!product) throw new Error("أحد المنتجات المختارة غير موجود!");

      const quantity = parseInt(raw.quantity) || 1;
      if (quantity < 1) throw new Error(`الكمية للمنتج (${product.name}) يجب أن تكون 1 على الأقل!`);

      qtyByProduct[product.id] = (qtyByProduct[product.id] || 0) + quantity;

      const sellingPrice = parseFloat(raw.sellingPrice) || product.basePrice;
      if (!isOwnerOrder && sellingPrice < product.basePrice) {
        throw new Error(`سعر البيع للمنتج "${product.name}" (${sellingPrice} دج) لا يمكن أن يكون أقل من السعر المرجعي (${product.basePrice} دج)!`);
      }

      resolvedItems.push({
        productId: product.id,
        productName: product.name,
        quantity,
        costPrice: product.costPrice || 0,
        basePrice: product.basePrice,
        sellingPrice
      });
    }

    // Check stock availability for each distinct product
    for (const [prodId, totalRequestedQty] of Object.entries(qtyByProduct)) {
      const product = this.getProductById(prodId);
      const reserved = this.getReservedStock(prodId);
      const availableForBooking = Math.max(0, product.stock - reserved);

      if (product.stock < totalRequestedQty) {
        throw new Error(`الكمية المطلوبة من "${product.name}" (${totalRequestedQty}) تتجاوز المخزون الفعلي (${product.stock})!`);
      }
      if (availableForBooking < totalRequestedQty) {
        throw new Error(`الكمية المطلوبة من "${product.name}" (${totalRequestedQty}) غير متاحة للحجز! المتوفر: ${product.stock} (محجوز قيد التوصيل: ${reserved}).`);
      }
    }

    const standardDeliveryFee = parseFloat(data.standardDeliveryFee) || 0;
    const chargedDeliveryFee = data.chargedDeliveryFee !== undefined && data.chargedDeliveryFee !== ""
      ? parseFloat(data.chargedDeliveryFee)
      : standardDeliveryFee;

    if (chargedDeliveryFee < 0) {
      throw new Error("سعر التوصيل لا يمكن أن يكون سالباً!");
    }

    if (!isOwnerOrder && chargedDeliveryFee > standardDeliveryFee) {
      throw new Error(`سعر التوصيل الرسمي يحدده صاحب المتجر (${standardDeliveryFee} دج). يمكنكِ الإبقاء عليه أو تخفيضه للزبون مع خصم الفارق من ربحكِ.`);
    }

    const deliverySubsidy = Math.max(0, standardDeliveryFee - chargedDeliveryFee);
    const totalQuantity = resolvedItems.reduce((s, it) => s + it.quantity, 0);
    const totalCost = resolvedItems.reduce((s, it) => s + (it.costPrice * it.quantity), 0);
    const totalBase = resolvedItems.reduce((s, it) => s + (it.basePrice * it.quantity), 0);
    const totalProductSelling = resolvedItems.reduce((s, it) => s + (it.sellingPrice * it.quantity), 0);
    const grossRepProfit = isOwnerOrder ? 0 : (totalProductSelling - totalBase);

    if (!isOwnerOrder && deliverySubsidy > grossRepProfit) {
      throw new Error(`فارق تخفيض سعر التوصيل (${deliverySubsidy} دج) يتجاوز إجمالي ربحكِ المضاف فوق السعر المرجعي (${grossRepProfit} دج)! يرجى زيادة سعر البيع أو تقليل تخفيض التوصيل.`);
    }

    const repProfit = isOwnerOrder ? 0 : (grossRepProfit - deliverySubsidy);
    const totalCustomerAmount = totalProductSelling + chargedDeliveryFee;
    const ownerProfit = isOwnerOrder
      ? ((totalProductSelling - totalCost) - deliverySubsidy)
      : (totalBase - totalCost);

    const rep = isOwnerOrder ? null : this.getRepById(data.repId);

    const now = new Date();
    const dateStr = now.toISOString().replace("T", " ").slice(0, 16);
    const orderId = "ORD-" + now.getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

    const summaryProductName = resolvedItems.length === 1
      ? resolvedItems[0].productName
      : resolvedItems.map(it => `${it.productName} (x${it.quantity})`).join(" + ");

    const defaultDriverId = (this.state.drivers && this.state.drivers.length > 0) ? this.state.drivers[0].id : "";

    const newOrder = {
      id: orderId,
      date: dateStr,
      orderSource: isOwnerOrder ? "owner" : "rep",
      repId: isOwnerOrder ? "OWNER" : data.repId,
      repName: isOwnerOrder ? "صاحب المتجر (طلب مباشر)" : (rep ? rep.name : (data.repName || "مندوبة")),
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      wilaya: data.wilaya || "",
      commune: data.commune || "",
      address: data.address,
      items: resolvedItems,
      productId: resolvedItems[0].productId,
      productName: summaryProductName,
      quantity: totalQuantity,
      costPrice: resolvedItems.length === 1 ? resolvedItems[0].costPrice : Math.round(totalCost / totalQuantity),
      basePrice: resolvedItems.length === 1 ? resolvedItems[0].basePrice : Math.round(totalBase / totalQuantity),
      sellingPrice: resolvedItems.length === 1 ? resolvedItems[0].sellingPrice : Math.round(totalProductSelling / totalQuantity),
      totalCost,
      totalBase,
      totalProductSelling,
      standardDeliveryFee,
      chargedDeliveryFee,
      deliverySubsidy,
      totalCustomerAmount,
      grossRepProfit,
      repProfit,
      ownerProfit,
      status: "out_for_delivery",
      stockDeducted: false, // Deducted immediately upon delivery confirmation by driver
      driverId: data.driverId || defaultDriverId,
      driverNotes: data.customerNotes ? `ملاحظة الزبون: ${data.customerNotes}` : "",
      driverInquiryOpen: false,
      createdAt: now.toISOString()
    };

    this.state.orders.unshift(newOrder);
    this.saveState();
    return newOrder;
  }

  // Requirement 3: Stock decreases IMMEDIATELY AFTER delivery confirmation by the Delivery Driver (for ALL items in the order)
  markOrderDelivered(orderId, note = "", confirmedBy = "عامل التوصيل") {
    const order = this.getOrderById(orderId);
    if (!order) return false;
    if (order.status === "delivered" && order.stockDeducted) return true;

    const orderItems = (Array.isArray(order.items) && order.items.length > 0)
      ? order.items
      : [{ productId: order.productId, productName: order.productName, quantity: order.quantity || 1 }];

    let firstBefore = 0;
    let firstAfter = 0;
    const deductedDetails = [];

    if (!order.stockDeducted) {
      if (!this.state.stockMovements) this.state.stockMovements = [];
      orderItems.forEach((it, idx) => {
        const product = this.getProductById(it.productId);
        if (!product) return;
        const stockBefore = product.stock;
        const qty = parseInt(it.quantity) || 1;
        product.stock = Math.max(0, product.stock - qty);
        const stockAfter = product.stock;
        if (idx === 0) {
          firstBefore = stockBefore;
          firstAfter = stockAfter;
        }
        deductedDetails.push(`${product.name}: -${qty} (${stockBefore} ← ${stockAfter})`);

        this.state.stockMovements.unshift({
          id: "MOV-" + Math.floor(1000 + Math.random() * 9000),
          date: new Date().toISOString().replace("T", " ").slice(0, 16),
          orderId: order.id,
          orderSource: order.orderSource || (order.repId === "OWNER" ? "owner" : "rep"),
          productId: product.id,
          productName: product.name,
          quantity: qty,
          stockBefore,
          stockAfter,
          type: "delivery_confirmed",
          actor: confirmedBy,
          note: `خصم فوري من المخزون (-${qty}) مباشرة بعد تأكيد تسليم الطلبية #${order.id}`
        });
      });

      order.stockDeducted = true;
      order.stockDeductedAt = new Date().toISOString();
    }

    order.status = "delivered";
    order.deliveredAt = new Date().toISOString();
    order.driverInquiryOpen = false;
    if (note) {
      order.driverNotes = (order.driverNotes ? order.driverNotes + " | " : "") + `[تم التسليم وخصم المخزون]: ${note}`;
    } else {
      order.driverNotes = (order.driverNotes ? order.driverNotes + " | " : "") + `[تم تأكيد التسليم وخصم ${order.quantity} قطعة من المخزون]`;
    }

    this.addSecurityLog(
      `تأكيد تسليم الطلبية #${order.id} وخصم المخزون`,
      confirmedBy,
      "success",
      deductedDetails.join(" | ") || `تم خصم (${order.quantity}) قطعة من المخزون`
    );

    this.saveState();
    return {
      order,
      stockBefore: firstBefore,
      stockAfter: firstAfter,
      deductedDetails
    };
  }

  addDriverInquiry(orderId, noteText, isUrgent = true) {
    const order = this.getOrderById(orderId);
    if (!order) return false;

    const timeStr = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const formattedNote = `[${timeStr}] ⚠️ ${noteText}`;
    order.driverNotes = order.driverNotes ? `${formattedNote}\n${order.driverNotes}` : formattedNote;
    order.driverInquiryOpen = isUrgent;
    this.saveState();
    return true;
  }

  resolveInquiry(orderId, resolutionNote = "") {
    const order = this.getOrderById(orderId);
    if (!order) return false;
    order.driverInquiryOpen = false;
    if (resolutionNote) {
      order.driverNotes = `[تم التوضيح]: ${resolutionNote}\n` + (order.driverNotes || "");
    }
    this.saveState();
    return true;
  }

  markOrderReturned(orderId, reason = "") {
    const order = this.getOrderById(orderId);
    if (!order) return false;

    // Only restore stock if it had previously been deducted upon delivery
    if (order.status !== "returned" && order.stockDeducted) {
      const orderItems = (Array.isArray(order.items) && order.items.length > 0)
        ? order.items
        : [{ productId: order.productId, productName: order.productName, quantity: order.quantity || 1 }];

      if (!this.state.stockMovements) this.state.stockMovements = [];
      orderItems.forEach(it => {
        const product = this.getProductById(it.productId);
        if (!product) return;
        const before = product.stock;
        const qty = parseInt(it.quantity) || 1;
        product.stock += qty;
        this.state.stockMovements.unshift({
          id: "MOV-" + Math.floor(1000 + Math.random() * 9000),
          date: new Date().toISOString().replace("T", " ").slice(0, 16),
          orderId: order.id,
          orderSource: order.orderSource || "rep",
          productId: product.id,
          productName: product.name,
          quantity: qty,
          stockBefore: before,
          stockAfter: product.stock,
          type: "order_returned",
          actor: "عامل التوصيل / الإدارة",
          note: `إرجاع الكمية (+${qty}) للمخزون بعد إلغاء/إرجاع الطلبية #${order.id}`
        });
      });
      order.stockDeducted = false;
    }

    order.status = "returned";
    order.driverInquiryOpen = false;
    order.returnedAt = new Date().toISOString();
    order.driverNotes = (order.driverNotes ? order.driverNotes + " | " : "") + `[مرتجع/ملغى]: ${reason || "رفض الاستلام"}`;

    this.saveState();
    return true;
  }

  getDriverFinancials(driverId = "DRV-01") {
    const orders = this.getOrders().filter(o => !driverId || o.driverId === driverId || !o.driverId);

    let deliveredCount = 0;
    let activeDeliveryCount = 0;
    let earnedDeliveryFees = 0;
    let pendingDeliveryFees = 0;
    let totalCashCollected = 0;

    orders.forEach(o => {
      const stdFee = parseFloat(o.standardDeliveryFee) || 0;
      const totalCollected = o.totalCustomerAmount || ((o.sellingPrice * o.quantity) + (o.chargedDeliveryFee || 0));

      if (o.status === "delivered") {
        deliveredCount++;
        earnedDeliveryFees += stdFee;
        totalCashCollected += totalCollected;
      } else if (o.status === "out_for_delivery") {
        activeDeliveryCount++;
        pendingDeliveryFees += stdFee;
      }
    });

    const netCashDueToStore = Math.max(0, totalCashCollected - earnedDeliveryFees);

    return {
      deliveredCount,
      activeDeliveryCount,
      totalOrders: orders.length,
      earnedDeliveryFees,
      pendingDeliveryFees,
      totalExpectedDeliveryFees: earnedDeliveryFees + pendingDeliveryFees,
      totalCashCollected,
      netCashDueToStore,
      orders
    };
  }

  getDashboardStats() {
    const orders = this.getOrders();
    const products = this.getProducts();

    let totalCollectedRevenue = 0;
    let totalBaseSales = 0;
    let totalDeliveredCost = 0;
    let totalDeliveredOwnerProfit = 0;
    let totalDeliveredRepProfits = 0;
    let totalPendingRepProfits = 0;
    let totalStandardDeliveryFees = 0;

    let deliveredCount = 0;
    let activeDeliveryCount = 0;
    let pendingCount = 0;
    let returnedCount = 0;
    let inquiriesCount = 0;
    let ownerOrdersCount = 0;
    let repOrdersCount = 0;

    orders.forEach(o => {
      if (o.orderSource === "owner" || o.repId === "OWNER") {
        ownerOrdersCount++;
      } else {
        repOrdersCount++;
      }

      const orderTotal = (o.totalCustomerAmount !== undefined)
        ? o.totalCustomerAmount
        : ((o.sellingPrice || 0) * (o.quantity || 1));

      const orderBaseTotal = o.totalBase !== undefined ? o.totalBase : ((o.basePrice || 0) * (o.quantity || 1));
      const orderCostTotal = o.totalCost !== undefined ? o.totalCost : ((o.costPrice || 0) * (o.quantity || 1));
      const orderOwnerProfit = orderBaseTotal - orderCostTotal;

      if (o.status === "delivered") {
        deliveredCount++;
        totalCollectedRevenue += orderTotal;
        totalBaseSales += orderBaseTotal;
        totalDeliveredCost += orderCostTotal;
        totalDeliveredOwnerProfit += (o.ownerProfit !== undefined ? o.ownerProfit : orderOwnerProfit);
        totalDeliveredRepProfits += (o.repProfit || 0);
        totalStandardDeliveryFees += (o.standardDeliveryFee || 0);
      } else if (o.status === "out_for_delivery") {
        activeDeliveryCount++;
        totalPendingRepProfits += (o.repProfit || 0);
      } else if (o.status === "pending") {
        pendingCount++;
        totalPendingRepProfits += (o.repProfit || 0);
      } else if (o.status === "returned") {
        returnedCount++;
      }

      if (o.driverInquiryOpen) {
        inquiriesCount++;
      }
    });

    const lowStockCount = products.filter(p => p.stock <= (p.minStockAlert || 5) && p.stock > 0).length;
    const outOfStockCount = products.filter(p => p.stock === 0).length;
    const pendingUsersCount = this.getPendingUsers().length;

    const totalPaidPayouts = (this.state.payouts || []).reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRemainingPayableReps = Math.max(0, totalDeliveredRepProfits - totalPaidPayouts);

    const ownerProfitMarginPct = totalDeliveredCost > 0
      ? Math.round((totalDeliveredOwnerProfit / totalDeliveredCost) * 100)
      : 0;

    return {
      totalCollectedRevenue,
      totalBaseSales,
      totalDeliveredCost,
      totalDeliveredOwnerProfit,
      ownerProfitMarginPct,
      totalDeliveredRepProfits,
      totalPendingRepProfits,
      totalStandardDeliveryFees,
      totalPaidPayouts,
      totalRemainingPayableReps,
      deliveredCount,
      activeDeliveryCount,
      pendingCount,
      returnedCount,
      inquiriesCount,
      pendingUsersCount,
      lowStockCount,
      outOfStockCount,
      totalOrders: orders.length,
      ownerOrdersCount,
      repOrdersCount,
      totalProducts: products.length
    };
  }
}

// Global store instance
window.store = new Store();
