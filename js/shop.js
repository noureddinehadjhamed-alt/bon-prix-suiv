// Public E-Commerce Storefront (shop.html)
// Directly connected to Bon Prix Suiv Firebase Inventory, Delivery Rates, Owner & Rep Accounts
const shopState = {
  mainData: null,
  products: [],
  deliveryRates: [],
  reps: [],
  settings: {
    storeName: "Bon Prix Suiv",
    whatsappPhone: "0550000000",
    fbPixelId: "",
    tiktokPixelId: ""
  },
  activeRep: null, // populated when URL has ?rep=REP-XX
  searchQuery: "",
  categoryFilter: "all",
  cart: [], // [{ productId, quantity }]
  lastOrder: null,
  pixelsLoaded: false
};

function getUrlRepParam() {
  const params = new URLSearchParams(window.location.search);
  return params.get("rep") || "";
}

function getShopProductPrice(p) {
  if (shopState.activeRep) {
    const margin = shopState.activeRep.storeMargin !== undefined ? parseFloat(shopState.activeRep.storeMargin) : 500;
    return (parseFloat(p.basePrice) || 0) + Math.max(0, margin);
  }
  return (p.storePrice !== undefined && p.storePrice !== "" && parseFloat(p.storePrice) > 0)
    ? parseFloat(p.storePrice)
    : (parseFloat(p.basePrice) || 0);
}

function getShopReservedStock(productId) {
  const orders = (shopState.mainData && shopState.mainData.orders) ? shopState.mainData.orders : [];
  return orders
    .filter(o => (o.status === "out_for_delivery" || o.status === "pending") && !o.stockDeducted)
    .reduce((sum, o) => {
      if (Array.isArray(o.items) && o.items.length > 0) {
        return sum + o.items.filter(it => it.productId === productId).reduce((s, it) => s + (parseInt(it.quantity) || 0), 0);
      }
      return sum + (o.productId === productId ? (parseInt(o.quantity) || 0) : 0);
    }, 0);
}

function getShopAvailableStock(p) {
  if (!p) return 0;
  if (p.unlimitedStock) return 999999;
  return Math.max(0, (parseInt(p.stock) || 0) - getShopReservedStock(p.id));
}

function injectAdPixels() {
  if (shopState.pixelsLoaded) return;
  const { fbPixelId, tiktokPixelId } = shopState.settings || {};
  if (fbPixelId) {
    !(function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', fbPixelId);
    window.fbq('track', 'PageView');
  }
  if (tiktokPixelId) {
    !(function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=d.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=d.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load(tiktokPixelId);ttq.page();})(window,document,'ttq');
  }
  shopState.pixelsLoaded = true;
}

function trackAdEvent(eventName, value = 0) {
  try {
    if (window.fbq) window.fbq('track', eventName, { value, currency: 'DZD' });
    if (window.ttq) window.ttq.track(eventName === 'Purchase' ? 'CompletePayment' : eventName, { value, currency: 'DZD' });
  } catch (e) {}
}

window.initPublicShop = async function() {
  try {
    const { db, doc, getDoc, collection, getDocs, onSnapshot } = window.shopFb;
    const stateRef = doc(db, "bon_prix_suiv", "main_state");
    const productsCol = collection(db, "bon_prix_suiv_products");

    const [mainSnap, prodSnaps] = await Promise.all([getDoc(stateRef), getDocs(productsCol)]);
    if (mainSnap.exists()) {
      shopState.mainData = mainSnap.data();
    } else {
      shopState.mainData = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }

    if (!prodSnaps.empty) {
      const list = [];
      prodSnaps.forEach(d => list.push(d.data()));
      list.sort((a, b) => (b.createdAt || b.id || "").localeCompare(a.createdAt || a.id || ""));
      shopState.products = list;
    } else if (shopState.mainData && Array.isArray(shopState.mainData.products)) {
      shopState.products = shopState.mainData.products;
    }

    hydrateShopFromMainData();
    injectAdPixels();
    renderShop();

    // Real-time sync of products & rates
    onSnapshot(productsCol, (qSnap) => {
      if (!qSnap.empty) {
        const list = [];
        qSnap.forEach(d => list.push(d.data()));
        list.sort((a, b) => (b.createdAt || b.id || "").localeCompare(a.createdAt || a.id || ""));
        shopState.products = list;
        renderShop();
      }
    });

    onSnapshot(stateRef, (dSnap) => {
      if (dSnap.exists()) {
        shopState.mainData = dSnap.data();
        hydrateShopFromMainData();
        renderShop();
      }
    });
  } catch (e) {
    console.error("Shop load error:", e);
    // Fallback to localStorage if offline
    try {
      const saved = localStorage.getItem("BON_PRIX_SUIV_STATE_V4");
      shopState.mainData = saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_DATA));
      shopState.products = shopState.mainData.products || [];
      hydrateShopFromMainData();
      renderShop();
    } catch (e2) {
      document.getElementById("shop-root").innerHTML = `<div class="p-8 text-center text-red-600 font-bold">تعذر تحميل المتجر، يرجى التحقق من الاتصال بالإنترنت وإعادة المحاولة.</div>`;
    }
  }
};

function hydrateShopFromMainData() {
  const data = shopState.mainData || {};
  shopState.deliveryRates = (data.deliveryRates && data.deliveryRates.length > 0)
    ? data.deliveryRates.map(r => ({
        ...r,
        homeFee: r.homeFee ?? r.defaultFee ?? 500,
        deskFee: r.deskFee ?? Math.max(150, (r.defaultFee || 500) - 200)
      }))
    : DEFAULT_DATA.deliveryRates;
  shopState.reps = data.reps || [];
  shopState.settings = {
    storeName: "Bon Prix Suiv",
    whatsappPhone: "0550000000",
    fbPixelId: "",
    tiktokPixelId: "",
    ...(data.storeSettings || {})
  };
  const repParam = getUrlRepParam();
  shopState.activeRep = repParam ? shopState.reps.find(r => r.id === repParam) || null : null;
  document.title = `${shopState.settings.storeName} | المتجر الإلكتروني`;
}

function shopToast(msg, type = "success") {
  const c = document.getElementById("shop-toast");
  if (!c) return;
  const el = document.createElement("div");
  el.className = `${type === "error" ? "bg-red-600" : "bg-emerald-600"} text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl animate-fade-in`;
  el.innerText = msg;
  c.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

function getShopCartCount() {
  return shopState.cart.reduce((s, it) => s + it.quantity, 0);
}

function getShopCartQty(productId) {
  const f = shopState.cart.find(it => it.productId === productId);
  return f ? f.quantity : 0;
}

function shopAddToCart(productId, openCheckout = false) {
  const p = shopState.products.find(x => x.id === productId);
  if (!p) return;
  const avail = getShopAvailableStock(p);
  const existing = shopState.cart.find(it => it.productId === productId);
  if (existing) {
    if (!p.unlimitedStock && existing.quantity >= avail) {
      shopToast("الكمية المطلوبة غير متوفرة حالياً!", "error");
      return;
    }
    existing.quantity += 1;
  } else {
    if (!p.unlimitedStock && avail < 1) {
      shopToast("هذا المنتج غير متوفر حالياً!", "error");
      return;
    }
    shopState.cart.push({ productId, quantity: 1 });
  }
  trackAdEvent("AddToCart", getShopProductPrice(p));
  renderShop();
  if (openCheckout) {
    openShopCheckoutModal();
  } else {
    shopToast(`تمت إضافة "${p.name}" إلى السلة 🛒`);
  }
}

function shopUpdateCartQty(productId, delta) {
  const p = shopState.products.find(x => x.id === productId);
  const idx = shopState.cart.findIndex(it => it.productId === productId);
  if (idx === -1) return;
  const next = shopState.cart[idx].quantity + delta;
  if (next <= 0) {
    shopState.cart.splice(idx, 1);
  } else {
    const avail = getShopAvailableStock(p);
    if (p && !p.unlimitedStock && next > avail) {
      shopToast(`المتوفر حالياً هو ${avail} قطعة فقط`, "error");
      return;
    }
    shopState.cart[idx].quantity = next;
  }
  renderShop();
  if (document.getElementById("shop-checkout-modal")) {
    openShopCheckoutModal();
  }
}

function onShopSearchInput(val) {
  shopState.searchQuery = val;
  renderShop();
  const el = document.getElementById("shop-search-input");
  if (el) {
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }
}

function setShopCategory(cat) {
  shopState.categoryFilter = cat;
  renderShop();
}

function openShopLightbox(productId) {
  const p = shopState.products.find(x => x.id === productId);
  if (!p) return;
  const imgs = (Array.isArray(p.images) && p.images.length > 0) ? p.images : [p.image];
  document.getElementById("shop-modal").innerHTML = `
    <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onclick="if(event.target===this) closeShopModal()">
      <div class="bg-white rounded-3xl max-w-lg w-full p-4 shadow-2xl space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-bold text-slate-900">${p.name}</h3>
          <button onclick="closeShopModal()" class="text-slate-400 hover:text-slate-700 text-xl">&times;</button>
        </div>
        <div class="w-full h-72 bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center">
          <img id="shop-lb-img" src="${imgs[0]}" class="w-full h-full object-contain" alt="${p.name}" />
        </div>
        ${imgs.length > 1 ? `
          <div class="flex gap-2 overflow-x-auto pb-1">
            ${imgs.map(src => `<img src="${src}" onclick="document.getElementById('shop-lb-img').src='${src}'" class="w-16 h-16 rounded-xl object-cover border-2 border-slate-200 hover:border-red-500 cursor-pointer shrink-0" />`).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function closeShopModal() {
  const m = document.getElementById("shop-modal");
  if (m) m.innerHTML = "";
}

function openShopCheckoutModal() {
  const modal = document.getElementById("shop-modal");
  const resolved = shopState.cart
    .map(it => ({ ...it, product: shopState.products.find(p => p.id === it.productId) }))
    .filter(it => it.product);

  const productsSubtotal = resolved.reduce((s, it) => s + (getShopProductPrice(it.product) * it.quantity), 0);

  modal.innerHTML = `
    <div id="shop-checkout-modal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
      <div class="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl animate-fade-in max-h-[92vh] overflow-y-auto space-y-4">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 class="text-base font-black text-slate-900">🛒 إتمام الطلب — الدفع عند الاستلام</h3>
          <button onclick="closeShopModal()" class="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        ${resolved.length === 0 ? `
          <div class="py-8 text-center text-slate-400 text-xs">السلة فارغة! أضف منتجاً واحداً على الأقل لإتمام الطلب.</div>
        ` : `
          <div class="space-y-2">
            ${resolved.map(it => `
              <div class="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                <div class="flex items-center gap-2 min-w-0">
                  <img src="${it.product.image}" class="w-11 h-11 rounded-xl object-cover shrink-0" />
                  <div class="min-w-0">
                    <div class="font-bold text-slate-900 truncate">${it.product.name}</div>
                    <div class="text-red-600 font-extrabold">${getShopProductPrice(it.product).toLocaleString()} دج</div>
                  </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button type="button" onclick="shopUpdateCartQty('${it.productId}', -1)" class="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold">-</button>
                  <span class="font-black px-1">${it.quantity}</span>
                  <button type="button" onclick="shopUpdateCartQty('${it.productId}', 1)" class="w-7 h-7 rounded-lg bg-white border border-slate-200 font-bold">+</button>
                </div>
              </div>
            `).join('')}
          </div>

          <form onsubmit="handleShopCheckoutSubmit(event)" class="space-y-3 text-xs pt-2 border-t border-slate-100">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block font-bold text-slate-700 mb-1">الاسم الكامل:</label>
                <input type="text" id="sc-name" required placeholder="الاسم واللقب" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">رقم الهاتف:</label>
                <input type="tel" id="sc-phone" required placeholder="05 / 06 / 07 ..." class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono outline-none focus:border-red-600" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block font-bold text-slate-700 mb-1">الولاية:</label>
                <select id="sc-wilaya" required onchange="updateShopCheckoutTotals()" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold outline-none focus:border-red-600">
                  <option value="">-- اختر ولايتك --</option>
                  ${shopState.deliveryRates.map(r => `
                    <option value="${r.wilayaName}" data-homefee="${r.homeFee}" data-deskfee="${r.deskFee}">
                      ${r.wilayaCode ? r.wilayaCode + ' - ' : ''}${r.wilayaName}
                    </option>
                  `).join('')}
                </select>
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">طريقة التوصيل:</label>
                <select id="sc-delivery-type" onchange="updateShopCheckoutTotals()" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold text-blue-700 outline-none focus:border-red-600">
                  <option value="home">🏠 توصيل لباب المنزل</option>
                  <option value="desk">🏢 توصيل للمكتب (Stop Desk)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block font-bold text-slate-700 mb-1">البلدية:</label>
                <input type="text" id="sc-commune" required placeholder="اسم البلدية" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
              </div>
              <div>
                <label class="block font-bold text-slate-700 mb-1">العنوان التفصيلي:</label>
                <input type="text" id="sc-address" required placeholder="الحي / الشارع" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
              </div>
            </div>

            <div>
              <input type="text" id="sc-notes" placeholder="ملاحظة إضافية (اختياري)" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-red-600" />
            </div>

            <div class="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5">
              <div class="flex justify-between text-slate-700">
                <span>مجموع المنتجات:</span>
                <strong id="sc-subtotal" data-val="${productsSubtotal}">${productsSubtotal.toLocaleString()} دج</strong>
              </div>
              <div class="flex justify-between text-slate-700">
                <span>سعر التوصيل:</span>
                <strong id="sc-delivery-fee" class="text-blue-700">0 دج</strong>
              </div>
              <div class="flex justify-between text-sm font-black text-emerald-900 pt-1.5 border-t border-emerald-200">
                <span>المجموع عند الاستلام:</span>
                <span id="sc-grand-total">${productsSubtotal.toLocaleString()} دج</span>
              </div>
            </div>

            <button type="submit" id="sc-submit-btn" class="w-full py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-lg transition-all">
              ✅ تأكيد الطلب الآن (الدفع عند الاستلام)
            </button>
          </form>
        `}
      </div>
    </div>
  `;
}

function updateShopCheckoutTotals() {
  const wilSel = document.getElementById("sc-wilaya");
  const typeSel = document.getElementById("sc-delivery-type");
  const subEl = document.getElementById("sc-subtotal");
  const feeEl = document.getElementById("sc-delivery-fee");
  const grandEl = document.getElementById("sc-grand-total");
  if (!wilSel || !subEl) return;

  const subtotal = parseFloat(subEl.getAttribute("data-val")) || 0;
  const opt = wilSel.options[wilSel.selectedIndex];
  const delType = typeSel ? typeSel.value : "home";
  const fee = opt && opt.value ? (parseFloat(opt.getAttribute(delType === "desk" ? "data-deskfee" : "data-homefee")) || 0) : 0;

  if (feeEl) feeEl.innerText = `${fee.toLocaleString()} دج`;
  if (grandEl) grandEl.innerText = `${(subtotal + fee).toLocaleString()} دج`;
}

async function handleShopCheckoutSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById("sc-submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "جاري تأكيد طلبك...";
  }

  try {
    const resolved = shopState.cart
      .map(it => ({ ...it, product: shopState.products.find(p => p.id === it.productId) }))
      .filter(it => it.product);
    if (resolved.length === 0) throw new Error("السلة فارغة!");

    const wilSel = document.getElementById("sc-wilaya");
    const opt = wilSel.options[wilSel.selectedIndex];
    const delType = document.getElementById("sc-delivery-type").value;
    const deliveryFee = opt && opt.value ? (parseFloat(opt.getAttribute(delType === "desk" ? "data-deskfee" : "data-homefee")) || 0) : 0;

    const isRepOrder = Boolean(shopState.activeRep);
    const items = resolved.map(it => ({
      productId: it.product.id,
      productName: it.product.name,
      quantity: it.quantity,
      costPrice: it.product.costPrice || 0,
      basePrice: it.product.basePrice || 0,
      sellingPrice: getShopProductPrice(it.product)
    }));

    const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
    const totalCost = items.reduce((s, i) => s + (i.costPrice * i.quantity), 0);
    const totalBase = items.reduce((s, i) => s + (i.basePrice * i.quantity), 0);
    const totalProductSelling = items.reduce((s, i) => s + (i.sellingPrice * i.quantity), 0);
    const grossRepProfit = isRepOrder ? Math.max(0, totalProductSelling - totalBase) : 0;
    const repProfit = grossRepProfit;
    const ownerProfit = isRepOrder ? (totalBase - totalCost) : (totalProductSelling - totalCost);
    const totalCustomerAmount = totalProductSelling + deliveryFee;

    const now = new Date();
    const orderId = "ORD-" + now.getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000);
    const summaryProductName = items.length === 1
      ? items[0].productName
      : items.map(it => `${it.productName} (x${it.quantity})`).join(" + ");

    // Fetch latest main_state from Firestore before writing to avoid overwriting concurrent orders
    const { db, doc, getDoc, setDoc } = window.shopFb;
    const stateRef = doc(db, "bon_prix_suiv", "main_state");
    const latestSnap = await getDoc(stateRef);
    const latestData = latestSnap.exists() ? latestSnap.data() : (shopState.mainData || JSON.parse(JSON.stringify(DEFAULT_DATA)));
    if (!Array.isArray(latestData.orders)) latestData.orders = [];

    const defaultDriverId = (latestData.drivers && latestData.drivers.length > 0) ? latestData.drivers[0].id : "";
    const newOrder = {
      id: orderId,
      date: now.toISOString().replace("T", " ").slice(0, 16),
      orderSource: isRepOrder ? "rep" : "owner",
      repId: isRepOrder ? shopState.activeRep.id : "OWNER",
      repName: isRepOrder ? `${shopState.activeRep.name} (متجر إلكتروني)` : "صاحب المتجر (المتجر الإلكتروني)",
      customerName: document.getElementById("sc-name").value.trim(),
      customerPhone: document.getElementById("sc-phone").value.trim(),
      wilaya: wilSel.value,
      commune: document.getElementById("sc-commune").value.trim(),
      address: document.getElementById("sc-address").value.trim(),
      deliveryType: delType,
      items,
      productId: items[0].productId,
      productName: summaryProductName,
      quantity: totalQuantity,
      costPrice: items.length === 1 ? items[0].costPrice : Math.round(totalCost / totalQuantity),
      basePrice: items.length === 1 ? items[0].basePrice : Math.round(totalBase / totalQuantity),
      sellingPrice: items.length === 1 ? items[0].sellingPrice : Math.round(totalProductSelling / totalQuantity),
      totalCost,
      totalBase,
      totalProductSelling,
      standardDeliveryFee: deliveryFee,
      chargedDeliveryFee: deliveryFee,
      deliverySubsidy: 0,
      totalCustomerAmount,
      grossRepProfit,
      repProfit,
      ownerProfit,
      status: "out_for_delivery",
      stockDeducted: false,
      driverId: defaultDriverId,
      driverNotes: document.getElementById("sc-notes").value.trim() ? `طلب من المتجر الإلكتروني — ملاحظة الزبون: ${document.getElementById("sc-notes").value.trim()}` : "طلب جديد من المتجر الإلكتروني 🌐",
      driverInquiryOpen: false,
      createdAt: now.toISOString()
    };

    latestData.orders.unshift(newOrder);
    latestData.products = [];
    await setDoc(stateRef, JSON.parse(JSON.stringify(latestData)));

    trackAdEvent("Purchase", totalCustomerAmount);
    shopState.lastOrder = newOrder;
    shopState.cart = [];
    closeShopModal();
    showOrderSuccessModal(newOrder);
    renderShop();
  } catch (err) {
    console.error(err);
    alert("حدث خطأ أثناء إرسال الطلب: " + err.message);
    if (btn) {
      btn.disabled = false;
      btn.innerText = "✅ تأكيد الطلب الآن (الدفع عند الاستلام)";
    }
  }
}

function showOrderSuccessModal(order) {
  const waPhone = (shopState.activeRep && shopState.activeRep.phone) ? shopState.activeRep.phone : (shopState.settings.whatsappPhone || "0550000000");
  const waMsg = encodeURIComponent(`مرحباً، قمت بتأكيد الطلب رقم ${order.id} (${order.productName}) بمبلغ ${order.totalCustomerAmount} دج.`);
  document.getElementById("shop-modal").innerHTML = `
    <div class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl max-w-md w-full p-6 text-center shadow-2xl animate-fade-in space-y-4">
        <div class="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl">✅</div>
        <h3 class="text-lg font-black text-slate-900">تم استلام طلبك بنجاح!</h3>
        <p class="text-xs text-slate-600 leading-relaxed">
          شكراً لك يا <strong>${order.customerName}</strong>! تم تسجيل طلبك برقم <strong class="font-mono text-slate-900">${order.id}</strong>.
          سيتصل بك فريقنا قريباً لتأكيد التوصيل إلى <strong>${order.wilaya} - ${order.commune}</strong>.
        </p>
        <div class="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
          <div class="font-bold text-slate-800">${order.productName}</div>
          <div class="font-black text-emerald-700 text-sm">المبلغ عند الاستلام: ${order.totalCustomerAmount.toLocaleString()} دج</div>
        </div>
        <div class="flex flex-col gap-2">
          <a href="https://wa.me/213${waPhone.replace(/^0/, '')}?text=${waMsg}" target="_blank" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs">
            💬 تأكيد سريع عبر واتساب
          </a>
          <button onclick="closeShopModal()" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs">
            متابعة التسوق
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderShop() {
  const root = document.getElementById("shop-root");
  if (!root) return;

  const visibleProducts = shopState.products.filter(p => p.unlimitedStock || getShopAvailableStock(p) > 0);
  const categoriesMap = new Map();
  visibleProducts.forEach(p => {
    const c = (p.category || "عام").trim() || "عام";
    categoriesMap.set(c, (categoriesMap.get(c) || 0) + 1);
  });
  const categories = Array.from(categoriesMap.entries());

  const q = shopState.searchQuery.trim().toLowerCase();
  const filtered = visibleProducts.filter(p => {
    const c = (p.category || "عام").trim() || "عام";
    const matchCat = shopState.categoryFilter === "all" || c === shopState.categoryFilter;
    const matchQ = !q || (p.name && p.name.toLowerCase().includes(q)) || c.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q));
    return matchCat && matchQ;
  });

  const cartCount = getShopCartCount();
  const waPhone = (shopState.activeRep && shopState.activeRep.phone) ? shopState.activeRep.phone : (shopState.settings.whatsappPhone || "0550000000");

  root.innerHTML = `
    <!-- Storefront Top Header -->
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-xl bg-white border border-slate-200 overflow-hidden p-0.5 shrink-0">
            <img src="./assets/logo.jpg" alt="${shopState.settings.storeName}" class="w-full h-full object-contain" />
          </div>
          <div>
            <h1 class="text-base sm:text-lg font-black text-red-600 leading-tight">${shopState.settings.storeName}</h1>
            <p class="text-[11px] text-slate-500">
              ${shopState.activeRep ? `🌸 بإشراف المندوبة: ${shopState.activeRep.name}` : 'المتجر الإلكتروني الرسمي — الدفع عند الاستلام'}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <a href="https://wa.me/213${waPhone.replace(/^0/, '')}" target="_blank" class="hidden sm:inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200">
            <span>💬 واتساب</span>
          </a>
          <button onclick="openShopCheckoutModal()" class="px-3.5 py-2 rounded-xl ${cartCount > 0 ? 'bg-red-600 hover:bg-red-700 text-white shadow-md' : 'bg-slate-100 text-slate-800'} font-extrabold text-xs flex items-center gap-1.5 transition-all">
            <span>🛒</span>
            <span>السلة</span>
            <span class="${cartCount > 0 ? 'bg-white text-red-600' : 'bg-slate-300 text-slate-800'} text-[11px] px-1.5 py-0.5 rounded-full font-black">${cartCount}</span>
          </button>
        </div>
      </div>
    </header>

    <!-- Trust Hero Banner -->
    <section class="bg-gradient-to-r from-slate-900 via-red-900 to-slate-900 text-white py-6 px-4">
      <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        <div>
          <h2 class="text-xl sm:text-2xl font-black">مرحباً بك في متجر ${shopState.settings.storeName} ✨</h2>
          <p class="text-xs sm:text-sm text-slate-200 mt-1">توصيل سريع إلى كافة الولايات (للمكتب أو لباب المنزل) — الدفع عند الاستلام 💵</p>
        </div>
        <div class="flex items-center gap-2 text-[11px] font-bold flex-wrap justify-center">
          <span class="bg-white/15 px-3 py-1.5 rounded-full">🚚 توصيل سريع</span>
          <span class="bg-white/15 px-3 py-1.5 rounded-full">💵 الدفع عند الاستلام</span>
          <span class="bg-white/15 px-3 py-1.5 rounded-full">✅ جودة مضمونة</span>
        </div>
      </div>
    </section>

    <!-- Main Catalog -->
    <main class="max-w-6xl w-full mx-auto px-4 py-6 flex-1 space-y-5">
      <!-- Search & Category Filter -->
      <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div class="relative">
          <input
            type="text"
            id="shop-search-input"
            value="${shopState.searchQuery.replace(/"/g, '&quot;')}"
            oninput="onShopSearchInput(this.value)"
            placeholder="🔍 ابحث عن المنتج الذي تريده..."
            class="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-9 outline-none focus:border-red-600"
          />
          <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute right-3 top-3"></i>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <button onclick="setShopCategory('all')" class="px-3 py-1.5 rounded-xl text-xs font-bold ${shopState.categoryFilter === 'all' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
            الكل (${visibleProducts.length})
          </button>
          ${categories.map(([cat, cnt]) => `
            <button onclick="setShopCategory('${cat.replace(/'/g, "\\'")}')" class="px-3 py-1.5 rounded-xl text-xs font-bold ${shopState.categoryFilter === cat ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}">
              ${cat} (${cnt})
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Products Grid -->
      ${filtered.length === 0 ? `
        <div class="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 text-sm">
          لا توجد منتجات متوفرة حالياً مطابقة لبحثك.
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          ${filtered.map(p => {
            const price = getShopProductPrice(p);
            const inCart = getShopCartQty(p.id);
            const imgs = (Array.isArray(p.images) && p.images.length > 0) ? p.images : [p.image];
            return `
              <div class="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div class="relative h-56 bg-slate-100 overflow-hidden">
                    <img id="shop-img-${p.id}" src="${imgs[0]}" onclick="openShopLightbox('${p.id}')" class="w-full h-full object-cover cursor-pointer" alt="${p.name}" />
                    <span class="absolute top-3 right-3 bg-slate-900/75 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg">${p.category || 'عام'}</span>
                    ${imgs.length > 1 ? `<button type="button" onclick="openShopLightbox('${p.id}')" class="absolute top-3 left-3 bg-slate-900/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">🖼️ ${imgs.length} صور</button>` : ''}
                  </div>
                  ${imgs.length > 1 ? `
                    <div class="flex gap-1.5 px-3 pt-2.5 overflow-x-auto">
                      ${imgs.map(src => `<img src="${src}" onclick="document.getElementById('shop-img-${p.id}').src='${src}'" class="w-11 h-11 rounded-lg object-cover border border-slate-200 hover:border-red-500 cursor-pointer shrink-0" />`).join('')}
                    </div>
                  ` : ''}
                  <div class="p-4 space-y-2">
                    <h3 class="font-extrabold text-slate-900 text-sm">${p.name}</h3>
                    <p class="text-xs text-slate-500 line-clamp-2">${p.description || 'منتج عالي الجودة متوفر الآن للتوصيل الفوري.'}</p>
                    <div class="flex items-center justify-between pt-2">
                      <span class="text-lg font-black text-red-600">${price.toLocaleString()} <span class="text-xs font-bold">دج</span></span>
                      <span class="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">متوفر الآن ✅</span>
                    </div>
                  </div>
                </div>

                <div class="p-3 bg-slate-50 border-t border-slate-100">
                  ${inCart > 0 ? `
                    <div class="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-3 py-2 text-xs">
                      <span class="font-bold text-red-800">🛒 في السلة (${inCart})</span>
                      <div class="flex items-center gap-1.5">
                        <button type="button" onclick="shopUpdateCartQty('${p.id}', -1)" class="w-7 h-7 rounded-lg bg-white border border-red-200 font-bold text-red-700">-</button>
                        <button type="button" onclick="shopUpdateCartQty('${p.id}', 1)" class="w-7 h-7 rounded-lg bg-white border border-red-200 font-bold text-red-700">+</button>
                        <button type="button" onclick="openShopCheckoutModal()" class="px-2.5 py-1.5 rounded-xl bg-red-600 text-white font-extrabold text-[11px]">إتمام الطلب</button>
                      </div>
                    </div>
                  ` : `
                    <div class="grid grid-cols-2 gap-2">
                      <button type="button" onclick="shopAddToCart('${p.id}', false)" class="py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs">
                        🛒 أضف للسلة
                      </button>
                      <button type="button" onclick="shopAddToCart('${p.id}', true)" class="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-sm">
                        ⚡ اطلب الآن
                      </button>
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </main>

    <!-- Floating Checkout Bar on Mobile when Cart has items -->
    ${cartCount > 0 ? `
      <div class="sticky bottom-3 px-4 z-30 max-w-md mx-auto w-full">
        <button onclick="openShopCheckoutModal()" class="w-full py-3.5 px-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-2xl flex items-center justify-between">
          <span>🛒 إتمام الطلب (${cartCount} منتج)</span>
          <span>الدفع عند الاستلام ←</span>
        </button>
      </div>
    ` : ''}

    <footer class="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 mt-8">
      © ${new Date().getFullYear()} ${shopState.settings.storeName} — جميع الحقوق محفوظة
    </footer>
  `;

  if (window.lucide) window.lucide.createIcons();
}
