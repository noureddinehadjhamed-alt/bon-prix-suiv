// Central Data Store & Business Logic with User Authentication, Security & Role Approvals
class Store {
  constructor() {
    this.storageKey = "BON_PRIX_SUIV_STATE_V3";
    this.authKey = "BON_PRIX_SUIV_AUTH_USER";
    this.state = this.loadState();
    this.currentUser = this.loadCurrentUser();
    this.listeners = [];
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.users || parsed.users.length === 0) {
          parsed.users = JSON.parse(JSON.stringify(DEFAULT_DATA.users));
        }
        if (!parsed.deliveryRates || parsed.deliveryRates.length === 0) {
          parsed.deliveryRates = JSON.parse(JSON.stringify(DEFAULT_DATA.deliveryRates));
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
    } catch (e) {
      console.error("Error saving state to localStorage", e);
    }
  }

  loadCurrentUser() {
    try {
      const saved = localStorage.getItem(this.authKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Refresh with latest state
        const userInState = this.getUserById(parsed.id);
        return userInState || parsed;
      }
    } catch (e) {
      console.error("Error reading auth user", e);
    }
    // Default to admin for first-time direct convenience, but allow logging out/switching
    return this.getUserByRole("admin");
  }

  setCurrentUser(user) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(this.authKey, JSON.stringify(user));
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
    this.currentUser = this.getUserByRole("admin");
    localStorage.setItem(this.authKey, JSON.stringify(this.currentUser));
    this.saveState();
  }

  // --- Users & Security RBAC Logic ---
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
    return this.getUsers().find(u => u.phone === phone);
  }

  getUserByRole(role) {
    return this.getUsers().find(u => u.role === role);
  }

  getPendingUsers() {
    return this.getUsers().filter(u => u.status === "pending" || u.role === "pending");
  }

  // Register a new user (initially marked as pending approval by admin)
  registerUser({ name, phone, password, note = "" }) {
    if (!name || !phone || !password) {
      throw new Error("يرجى ملء جميع الحقول المطلوبة (الاسم، الهاتف، وكلمة المرور)");
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const existing = this.getUserByPhone(cleanPhone);
    if (existing) {
      throw new Error("رقم الهاتف هذا مسجل مسبقاً! يرجى تسجيل الدخول أو استخدام رقم آخر.");
    }

    const id = "USR-" + Math.floor(100 + Math.random() * 900);
    const newUser = {
      id,
      name: name.trim(),
      phone: cleanPhone,
      password: password.trim(),
      role: "pending", // Waiting for Owner classification!
      status: "pending",
      note: note.trim(),
      createdAt: new Date().toISOString()
    };

    this.state.users.unshift(newUser);
    this.saveState();
    return newUser;
  }

  // Login authentication
  loginUser(phone, password) {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const user = this.getUserByPhone(cleanPhone);

    if (!user || user.password !== password.trim()) {
      throw new Error("رقم الهاتف أو كلمة المرور غير صحيحة!");
    }

    this.setCurrentUser(user);
    return user;
  }

  // Owner / Admin Approval & Role Classification
  approveUser(userId, assignedRole, details = {}) {
    const user = this.getUserById(userId);
    if (!user) throw new Error("المستخدم غير موجود!");

    if (assignedRole === "rep") {
      // Create or link a rep profile
      let rep = this.state.reps.find(r => r.phone === user.phone || r.userId === user.id);
      if (!rep) {
        const repId = "REP-" + String(this.state.reps.length + 1).padStart(2, "0");
        rep = {
          id: repId,
          userId: user.id,
          name: user.name,
          phone: user.phone,
          wilaya: details.wilaya || "عام",
          notes: details.notes || user.note || "تمت الموافقة من المدير",
          totalPaidProfits: 0
        };
        this.state.reps.push(rep);
      }
      user.role = "rep";
      user.status = "active";
      user.linkedId = rep.id;
    } else if (assignedRole === "driver") {
      // Create or link driver profile
      let driver = this.state.drivers.find(d => d.phone === user.phone || d.userId === user.id);
      if (!driver) {
        const driverId = "DRV-" + String(this.state.drivers.length + 1).padStart(2, "0");
        driver = {
          id: driverId,
          userId: user.id,
          name: user.name,
          phone: user.phone,
          vehicle: details.vehicle || "سيارة نقل",
          activeOrdersCount: 0
        };
        this.state.drivers.push(driver);
      }
      user.role = "driver";
      user.status = "active";
      user.linkedId = driver.id;
    }

    this.saveState();
    return user;
  }

  rejectUser(userId, reason = "تم رفض الحساب من قبل الإدارة") {
    const user = this.getUserById(userId);
    if (!user) return false;
    user.status = "rejected";
    user.role = "rejected";
    user.rejectReason = reason;
    this.saveState();
    return true;
  }

  deleteUser(userId) {
    this.state.users = this.state.users.filter(u => u.id !== userId);
    this.saveState();
  }

  // --- Products & Inventory Logic ---
  getProducts() {
    return this.state.products || [];
  }

  getProductById(id) {
    return this.getProducts().find(p => p.id === id);
  }

  addProduct(product) {
    const id = "PRD-" + Math.floor(100 + Math.random() * 900);
    const costPrice = parseFloat(product.costPrice) || 0;
    const basePrice = parseFloat(product.basePrice) || 0;

    const newProduct = {
      id,
      name: product.name,
      category: product.category || "عام",
      costPrice,
      basePrice,
      stock: parseInt(product.stock) || 0,
      minStockAlert: parseInt(product.minStockAlert) || 5,
      image: product.image || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80",
      description: product.description || ""
    };
    this.state.products.unshift(newProduct);
    this.saveState();
    return newProduct;
  }

  updateProduct(id, updates) {
    const p = this.getProductById(id);
    if (!p) return false;
    Object.assign(p, {
      name: updates.name ?? p.name,
      category: updates.category ?? p.category,
      costPrice: updates.costPrice !== undefined ? parseFloat(updates.costPrice) : p.costPrice,
      basePrice: updates.basePrice !== undefined ? parseFloat(updates.basePrice) : p.basePrice,
      stock: updates.stock !== undefined ? parseInt(updates.stock) : p.stock,
      minStockAlert: updates.minStockAlert !== undefined ? parseInt(updates.minStockAlert) : p.minStockAlert,
      image: updates.image ?? p.image,
      description: updates.description ?? p.description
    });
    this.saveState();
    return true;
  }

  adjustStock(productId, delta) {
    const p = this.getProductById(productId);
    if (!p) return false;
    p.stock = Math.max(0, p.stock + delta);
    this.saveState();
    return true;
  }

  deleteProduct(id) {
    this.state.products = this.state.products.filter(p => p.id !== id);
    this.saveState();
  }

  // --- Delivery Rates Logic ---
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

  // --- Orders Logic ---
  getOrders() {
    return this.state.orders || [];
  }

  getOrderById(id) {
    return this.getOrders().find(o => o.id === id);
  }

  createOrder(data) {
    const product = this.getProductById(data.productId);
    if (!product) throw new Error("المنتج غير موجود!");

    const quantity = parseInt(data.quantity) || 1;
    if (product.stock < quantity) {
      throw new Error(`الكمية المطلوبة (${quantity}) غير متوفرة في المخزون! المتوفر حالياً: ${product.stock}`);
    }

    const sellingPrice = parseFloat(data.sellingPrice) || product.basePrice;
    if (sellingPrice < product.basePrice) {
      throw new Error(`سعر البيع لا يمكن أن يكون أقل من السعر الأساسي للمتجر (${product.basePrice} دج)`);
    }

    const standardDeliveryFee = parseFloat(data.standardDeliveryFee) || 0;
    const chargedDeliveryFee = data.chargedDeliveryFee !== undefined && data.chargedDeliveryFee !== "" 
      ? parseFloat(data.chargedDeliveryFee) 
      : standardDeliveryFee;

    const deliverySubsidy = Math.max(0, standardDeliveryFee - chargedDeliveryFee);
    const grossRepProfit = (sellingPrice - product.basePrice) * quantity;
    const repProfit = Math.max(0, grossRepProfit - deliverySubsidy);
    const totalCustomerAmount = (sellingPrice * quantity) + chargedDeliveryFee;
    const ownerProfit = (product.basePrice - (product.costPrice || 0)) * quantity;

    const rep = this.getRepById(data.repId);
    product.stock = Math.max(0, product.stock - quantity);

    const now = new Date();
    const dateStr = now.toISOString().replace("T", " ").slice(0, 16);
    const orderId = "ORD-" + now.getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);

    const newOrder = {
      id: orderId,
      date: dateStr,
      repId: data.repId,
      repName: rep ? rep.name : (data.repName || "مندوبة"),
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      wilaya: data.wilaya || "",
      commune: data.commune || "",
      address: data.address,
      productId: product.id,
      productName: product.name,
      quantity,
      costPrice: product.costPrice || 0,
      basePrice: product.basePrice,
      sellingPrice,
      standardDeliveryFee,
      chargedDeliveryFee,
      deliverySubsidy,
      totalCustomerAmount,
      repProfit,
      ownerProfit,
      status: "out_for_delivery",
      driverId: "DRV-01",
      driverNotes: data.customerNotes ? `ملاحظة الزبون: ${data.customerNotes}` : "",
      driverInquiryOpen: false,
      createdAt: now.toISOString()
    };

    this.state.orders.unshift(newOrder);
    this.saveState();
    return newOrder;
  }

  markOrderDelivered(orderId, note = "") {
    const order = this.getOrderById(orderId);
    if (!order) return false;

    order.status = "delivered";
    order.deliveredAt = new Date().toISOString();
    order.driverInquiryOpen = false;
    if (note) {
      order.driverNotes = (order.driverNotes ? order.driverNotes + " | " : "") + `[تم التسليم]: ${note}`;
    }
    this.saveState();
    return true;
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

    if (order.status !== "returned") {
      const product = this.getProductById(order.productId);
      if (product) {
        product.stock += (order.quantity || 1);
      }
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

    orders.forEach(o => {
      const orderTotal = (o.totalCustomerAmount !== undefined) 
        ? o.totalCustomerAmount 
        : ((o.sellingPrice || 0) * (o.quantity || 1));
      
      const orderBaseTotal = (o.basePrice || 0) * (o.quantity || 1);
      const orderCostTotal = (o.costPrice || 0) * (o.quantity || 1);
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
      totalProducts: products.length
    };
  }
}

// Global store instance
window.store = new Store();
