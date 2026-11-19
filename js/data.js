// Initial Mock / Seed Data with High-Security User Accounts, Reference Prices, Algerian Delivery Rates & Stock Movement Log
const DEFAULT_DATA = {
  // حسابات المستخدمين وإدارة الأمان العالي وطلبات التسجيل
  users: [
    {
      id: "USR-001",
      name: "المدير العام (صاحب المتجر)",
      email: "noureddinehadjhamed1992@gmail.com",
      phone: "0550000000",
      password: "admin",
      securityPin: "1234",
      authProvider: "google",
      role: "admin", // admin, rep, driver, pending
      requestedRole: "admin",
      status: "active", // active, pending, rejected, suspended
      linkedId: null,
      securityLevel: "high",
      createdAt: "2026-11-01T08:00:00Z"
    },
    {
      id: "USR-002",
      name: "فاطمة الزهراء",
      phone: "0551234567",
      password: "123",
      securityPin: "1234",
      role: "rep",
      requestedRole: "rep",
      wilaya: "الجزائر العاصمة",
      status: "active",
      linkedId: "REP-01",
      securityLevel: "high",
      createdAt: "2026-11-05T10:00:00Z"
    },
    {
      id: "USR-003",
      name: "مريم بن علي",
      phone: "0662345678",
      password: "123",
      securityPin: "1234",
      role: "rep",
      requestedRole: "rep",
      wilaya: "وهران",
      status: "active",
      linkedId: "REP-02",
      securityLevel: "high",
      createdAt: "2026-11-06T11:30:00Z"
    },
    {
      id: "USR-004",
      name: "سارة بلقاسم",
      phone: "0773456789",
      password: "123",
      securityPin: "1234",
      role: "rep",
      requestedRole: "rep",
      wilaya: "قسنطينة",
      status: "active",
      linkedId: "REP-03",
      securityLevel: "high",
      createdAt: "2026-11-08T14:15:00Z"
    },
    {
      id: "USR-005",
      name: "ياسين التوصيل السريع",
      phone: "0555987654",
      password: "123",
      securityPin: "1234",
      role: "driver",
      requestedRole: "driver",
      wilaya: "الجزائر العاصمة",
      status: "active",
      linkedId: "DRV-01",
      securityLevel: "high",
      createdAt: "2026-11-02T09:00:00Z"
    },
    // طلب تسجيل رقم 1: مندوبة جديدة تنتظر موافقة صاحب المتجر
    {
      id: "USR-006",
      name: "خديجة منصوري",
      phone: "0779998877",
      password: "123",
      securityPin: "1234",
      role: "pending",
      requestedRole: "rep",
      wilaya: "قسنطينة",
      status: "pending",
      note: "أريد العمل كمندوبة تسويق وحجز طلبيات، أسوق عبر تيك توك ومجموعات واتساب في قسنطينة.",
      securityLevel: "high",
      createdAt: "2026-11-17T16:45:00Z"
    },
    // طلب تسجيل رقم 2: عامل توصيل جديد ينتظر موافقة صاحب المتجر
    {
      id: "USR-007",
      name: "كريم بوعلام للتوصيل",
      phone: "0668112233",
      password: "123",
      securityPin: "1234",
      role: "pending",
      requestedRole: "driver",
      wilaya: "وهران",
      status: "pending",
      note: "طلب تسجيل كعامل توصيل، أملك سيارة نفعية للتوصيل السريع في وهران والمناطق المجاورة.",
      securityLevel: "high",
      createdAt: "2026-11-18T11:20:00Z"
    }
  ],

  products: [
    {
      id: "PRD-101",
      name: "عطر فاخر رويال 100 مل",
      category: "عطور",
      costPrice: 1400, // سعر الشراء / التكلفة على صاحب المتجر
      basePrice: 2200, // السعر المرجعي الذي يحدده صاحب المتجر (وتضيف المندوبة ربحها فوقه)
      stock: 28,       // الكمية الفعلية في المخزون (تنقص مباشرة بعد تأكيد تسليم الطلبية من عامل التوصيل)
      minStockAlert: 5,
      image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&q=80",
      description: "عطر شرقي فرنسي بتركيز عالي وثباتية تدوم طويلاً."
    },
    {
      id: "PRD-102",
      name: "ساعة يد أنيقة بحزام جلدي",
      category: "إكسسوارات",
      costPrice: 2000,
      basePrice: 3200,
      stock: 7,
      minStockAlert: 5,
      image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=300&q=80",
      description: "ساعة كلاسيكية مقاومة للماء مع علبة هدايا فاخرة."
    },
    {
      id: "PRD-103",
      name: "مجموعة العناية بالبشرة الطبيعية",
      category: "تجميل",
      costPrice: 1100,
      basePrice: 1900,
      stock: 14,
      minStockAlert: 5,
      image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&q=80",
      description: "سيروم فيتامين سي وغسول وجه طبيعي 100%."
    },
    {
      id: "PRD-104",
      name: "حقيبة نسائية عصرية كتف",
      category: "حقائب",
      costPrice: 1750,
      basePrice: 2800,
      stock: 4,
      minStockAlert: 5,
      image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=300&q=80",
      description: "حقيبة أنيقة من الجلد الفاخر مناسبة لجميع المناسبات."
    },
    {
      id: "PRD-105",
      name: "سوار ذهبي مطلي عيار 18",
      category: "إكسسوارات",
      costPrice: 800,
      basePrice: 1400,
      stock: 0,
      minStockAlert: 5,
      image: "https://images.unsplash.com/photo-1611591475152-4735d387bd78?w=300&q=80",
      description: "سوار نسائي أنيق مطلي بالذهب ومرصع بالزركون."
    }
  ],

  // أسعار التوصيل المحددة من طرف صاحب المتجر حسب الولايات والبلديات
  deliveryRates: [
    { id: "DEL-16", wilayaCode: "16", wilayaName: "الجزائر العاصمة", defaultFee: 400, communes: "كافة البلديات، سيدي امحمد، باب الواد، زرالدة، الدار البيضاء، القبة، بئر مراد رايس" },
    { id: "DEL-09", wilayaCode: "09", wilayaName: "البليدة", defaultFee: 500, communes: "البليدة مركز، بوفاريك، أولاد يعيش، بوعرفة، موزاية" },
    { id: "DEL-35", wilayaCode: "35", wilayaName: "بومرداس", defaultFee: 500, communes: "بومرداس، بودواو، دلس، برج منايل، خميس الخشنة" },
    { id: "DEL-42", wilayaCode: "42", wilayaName: "تيبازة", defaultFee: 500, communes: "تيبازة، القليعة، بواسماعيل، شرشال، فوكة" },
    { id: "DEL-31", wilayaCode: "31", wilayaName: "وهران", defaultFee: 600, communes: "وهران مركز، بئر الجير، السانية، أرزيو، عين الترك، مسرغين" },
    { id: "DEL-25", wilayaCode: "25", wilayaName: "قسنطينة", defaultFee: 600, communes: "قسنطينة مركز، الخروب، علي منجلي، عين سمارة، حامة بوزيان" },
    { id: "DEL-19", wilayaCode: "19", wilayaName: "سطيف", defaultFee: 600, communes: "سطيف مركز، العلمة، عين أرنات، عين ولمان، بوقاعة" },
    { id: "DEL-15", wilayaCode: "15", wilayaName: "تيزي وزو", defaultFee: 600, communes: "تيزي وزو، دراع بن خدة، أزفون، تيقزيرت، عزازقة" },
    { id: "DEL-06", wilayaCode: "06", wilayaName: "بجاية", defaultFee: 600, communes: "بجاية مركز، أقبو، أميزور، سيدي عيش، القصر" },
    { id: "DEL-13", wilayaCode: "13", wilayaName: "تلمسان", defaultFee: 700, communes: "تلمسان، المنصورة، مغنية، الرمشي، سبدو" },
    { id: "DEL-07", wilayaCode: "07", wilayaName: "بسكرة", defaultFee: 800, communes: "بسكرة، طولقة، أولاد جلال، سيدي عقبة، زريبة الوادي" },
    { id: "DEL-30", wilayaCode: "30", wilayaName: "ورقلة", defaultFee: 850, communes: "ورقلة، حاسي مسعود، الرويسات، تقرت" },
    { id: "DEL-47", wilayaCode: "47", wilayaName: "غرداية", defaultFee: 250, communes: "غرداية، متليلي، بريان، القرارة، العطف" },
    { id: "DEL-01", wilayaCode: "01", wilayaName: "أدرار", defaultFee: 950, communes: "أدرار، تيميمون، رقان، فنوغيل" },
    { id: "DEL-11", wilayaCode: "11", wilayaName: "تمنراست", defaultFee: 1100, communes: "تمنراست، عين قزام، أباليسا" }
  ],

  reps: [
    {
      id: "REP-01",
      userId: "USR-002",
      name: "فاطمة الزهراء",
      phone: "0551234567",
      wilaya: "الجزائر العاصمة",
      notes: "مندوبة نشيطة في تيك توك وإنستغرام",
      totalPaidProfits: 14500
    },
    {
      id: "REP-02",
      userId: "USR-003",
      name: "مريم بن علي",
      phone: "0662345678",
      wilaya: "وهران",
      notes: "تسوق عبر مجموعات فيسبوك وقناة تيليغرام",
      totalPaidProfits: 8200
    },
    {
      id: "REP-03",
      userId: "USR-004",
      name: "سارة بلقاسم",
      phone: "0773456789",
      wilaya: "قسنطينة",
      notes: "تسوق لصديقاتها وعبر ستوري إنستغرام",
      totalPaidProfits: 0
    }
  ],

  drivers: [
    {
      id: "DRV-01",
      userId: "USR-005",
      name: "ياسين التوصيل السريع",
      phone: "0555987654",
      vehicle: "سيارة نقل خفيفة",
      activeOrdersCount: 3
    }
  ],

  orders: [
    {
      id: "ORD-2026-001",
      date: "2026-11-16 10:30",
      orderSource: "rep", // 'rep' (طلبية مندوبة) أو 'owner' (طلبية صاحب المتجر)
      repId: "REP-01",
      repName: "فاطمة الزهراء",
      customerName: "أمينة قدور",
      customerPhone: "0559112233",
      wilaya: "وهران",
      commune: "بئر الجير",
      address: "حي الياسمين عمارة 4",
      productId: "PRD-101",
      productName: "عطر فاخر رويال 100 مل",
      quantity: 1,
      costPrice: 1400,
      basePrice: 2200,
      sellingPrice: 3000,
      standardDeliveryFee: 600,
      chargedDeliveryFee: 600,
      deliverySubsidy: 0,
      totalCustomerAmount: 3600,
      grossRepProfit: 800,
      repProfit: 800,
      ownerProfit: 800,
      status: "delivered",
      stockDeducted: true, // تم خصم الكمية من المخزون بعد تأكيد التسليم من عامل التوصيل
      stockDeductedAt: "2026-11-17T09:15:00Z",
      driverId: "DRV-01",
      driverNotes: "تم التسليم بنجاح مع استلام 3600 دج نقداً وخصم القطعة من المخزون.",
      createdAt: "2026-11-16T10:30:00Z",
      deliveredAt: "2026-11-17T09:15:00Z"
    },
    {
      id: "ORD-2026-002",
      date: "2026-11-16 15:45",
      orderSource: "rep",
      repId: "REP-01",
      repName: "فاطمة الزهراء",
      customerName: "خالد مرابط",
      customerPhone: "0661889900",
      wilaya: "الجزائر العاصمة",
      commune: "سيدي امحمد",
      address: "قرب البريد المركزي، شارع حسيبة",
      productId: "PRD-102",
      productName: "ساعة يد أنيقة بحزام جلدي",
      quantity: 1,
      costPrice: 2000,
      basePrice: 3200,
      sellingPrice: 4200,
      standardDeliveryFee: 400,
      chargedDeliveryFee: 200,
      deliverySubsidy: 200,
      totalCustomerAmount: 4400,
      grossRepProfit: 1000,
      repProfit: 800,
      ownerProfit: 1200,
      status: "out_for_delivery",
      stockDeducted: false, // لم تُخصم من المخزون الفعلي بعد لأنها قيد التوصيل ولم يؤكد عامل التوصيل تسليمها بعد
      driverId: "DRV-01",
      driverNotes: "⚠️ اتصلت به مرتين ولم يرد، سأحاول مجدداً بعد العصر.",
      driverInquiryOpen: true,
      createdAt: "2026-11-16T15:45:00Z"
    },
    {
      id: "ORD-2026-003",
      date: "2026-11-17 08:20",
      orderSource: "rep",
      repId: "REP-02",
      repName: "مريم بن علي",
      customerName: "سهام بوجنان",
      customerPhone: "0770334455",
      wilaya: "غرداية",
      commune: "متليلي",
      address: "حي النخيل رقم 12",
      productId: "PRD-103",
      productName: "مجموعة العناية بالبشرة الطبيعية",
      quantity: 2,
      costPrice: 1100,
      basePrice: 1900,
      sellingPrice: 2600,
      standardDeliveryFee: 250,
      chargedDeliveryFee: 250,
      deliverySubsidy: 0,
      totalCustomerAmount: 5450,
      grossRepProfit: 1400,
      repProfit: 1400,
      ownerProfit: 1600,
      status: "out_for_delivery",
      stockDeducted: false,
      driverId: "DRV-01",
      driverNotes: "الزبونة أكدت موعد الاستلام اليوم.",
      driverInquiryOpen: false,
      createdAt: "2026-11-17T08:20:00Z"
    },
    {
      id: "ORD-2026-004",
      date: "2026-11-18 11:10",
      orderSource: "owner", // طلبية مباشرة من صاحب المتجر مرتبطة بالمخزون وعامل التوصيل
      repId: "OWNER",
      repName: "صاحب المتجر (طلب مباشر)",
      customerName: "عبد الرحمن بوزيد",
      customerPhone: "0554778899",
      wilaya: "البليدة",
      commune: "بوفاريك",
      address: "شارع الأمير عبد القادر رقم 22",
      productId: "PRD-104",
      productName: "حقيبة نسائية عصرية كتف",
      quantity: 1,
      costPrice: 1750,
      basePrice: 2800,
      sellingPrice: 3500,
      standardDeliveryFee: 500,
      chargedDeliveryFee: 500,
      deliverySubsidy: 0,
      totalCustomerAmount: 4000,
      grossRepProfit: 0,
      repProfit: 0,
      ownerProfit: 1750, // كامل الربح لصاحب المتجر في طلبياته المباشرة
      status: "out_for_delivery",
      stockDeducted: false,
      driverId: "DRV-01",
      driverNotes: "طلبية خاصة بصاحب المتجر جاهزة للتسليم اليوم.",
      driverInquiryOpen: false,
      createdAt: "2026-11-18T11:10:00Z"
    }
  ],

  // سجل حركة المخزون التلقائي (يرتبط بتأكيد التسليم من عامل التوصيل)
  stockMovements: [
    {
      id: "MOV-1001",
      date: "2026-11-17 09:15",
      orderId: "ORD-2026-001",
      orderSource: "rep",
      productId: "PRD-101",
      productName: "عطر فاخر رويال 100 مل",
      quantity: 1,
      stockBefore: 29,
      stockAfter: 28,
      type: "delivery_confirmed",
      actor: "ياسين التوصيل السريع (عامل التوصيل)",
      note: "خصم تلقائي من المخزون مباشرة بعد تأكيد تسليم الطلبية #ORD-2026-001 للزبون"
    }
  ],

  // سجل الأمان والعمليات الحساسة (High Security Audit Log)
  securityLogs: [
    {
      id: "SEC-101",
      time: "2026-11-18 11:20",
      event: "طلب تسجيل حساب جديد (عامل توصيل)",
      actor: "كريم بوعلام للتوصيل (0668112233)",
      status: "pending_approval",
      details: "تم حجب الدخول التلقائي وإحالة الطلب لصاحب المتجر للموافقة الأمنية."
    },
    {
      id: "SEC-100",
      time: "2026-11-17 16:45",
      event: "طلب تسجيل حساب جديد (مندوبة مبيعات)",
      actor: "خديجة منصوري (0779998877)",
      status: "pending_approval",
      details: "تم حجب الدخول التلقائي وإحالة الطلب لصاحب المتجر للموافقة الأمنية."
    }
  ],

  payouts: [
    {
      id: "PAY-01",
      date: "2026-11-10",
      repId: "REP-01",
      amount: 14500,
      paymentMethod: "بريدي موب / CCP",
      note: "تسوية أرباح مبيعات الأسبوع الأول"
    },
    {
      id: "PAY-02",
      date: "2026-11-12",
      repId: "REP-02",
      amount: 8200,
      paymentMethod: "نقداً يد بيد",
      note: "تسوية مبيعات سابقة"
    }
  ]
};
