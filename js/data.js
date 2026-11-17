// Initial Mock / Seed Data with User Accounts, Cost Prices, and Algerian Delivery Rates
const DEFAULT_DATA = {
  // حسابات المستخدمين وإدارة الأمان والصلاحيات
  users: [
    {
      id: "USR-001",
      name: "المدير العام (صاحب المتجر)",
      phone: "0550000000",
      password: "admin",
      role: "admin", // admin, rep, driver, pending
      status: "active", // active, pending, rejected
      linkedId: null,
      createdAt: "2026-11-01T08:00:00Z"
    },
    {
      id: "USR-002",
      name: "فاطمة الزهراء",
      phone: "0551234567",
      password: "123",
      role: "rep",
      status: "active",
      linkedId: "REP-01",
      createdAt: "2026-11-05T10:00:00Z"
    },
    {
      id: "USR-003",
      name: "مريم بن علي",
      phone: "0662345678",
      password: "123",
      role: "rep",
      status: "active",
      linkedId: "REP-02",
      createdAt: "2026-11-06T11:30:00Z"
    },
    {
      id: "USR-004",
      name: "سارة بلقاسم",
      phone: "0773456789",
      password: "123",
      role: "rep",
      status: "active",
      linkedId: "REP-03",
      createdAt: "2026-11-08T14:15:00Z"
    },
    {
      id: "USR-005",
      name: "ياسين التوصيل السريع",
      phone: "0555987654",
      password: "123",
      role: "driver",
      status: "active",
      linkedId: "DRV-01",
      createdAt: "2026-11-02T09:00:00Z"
    },
    // مستخدم جديد سجل حسابه وينتظر موافقة وتصنيف المدير!
    {
      id: "USR-006",
      name: "خديجة منصوري",
      phone: "0779998877",
      password: "123",
      role: "pending",
      status: "pending",
      note: "أريد العمل كمندوبة مبيعات، أسوق عبر تيك توك ومجموعات واتساب في قسنطينة.",
      createdAt: "2026-11-17T16:45:00Z"
    }
  ],

  products: [
    {
      id: "PRD-101",
      name: "عطر فاخر رويال 100 مل",
      category: "عطور",
      costPrice: 1400, // سعر الشراء / التكلفة على صاحب المتجر
      basePrice: 2200, // سعر البيع الخاص بصاحب المتجر (سعر الجملة للمندوبة)
      stock: 28,
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
      stock: 3,
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

  // أسعار التوصيل حسب الولايات والبلديات الجزائرية
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
      activeOrdersCount: 2
    }
  ],

  orders: [
    {
      id: "ORD-2024-001",
      date: "2026-11-16 10:30",
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
      repProfit: 800,
      ownerProfit: 800,
      status: "delivered",
      driverId: "DRV-01",
      driverNotes: "تم التسليم بنجاح مع استلام 3600 دج نقداً.",
      createdAt: "2026-11-16T10:30:00Z",
      deliveredAt: "2026-11-17T09:15:00Z"
    },
    {
      id: "ORD-2024-002",
      date: "2026-11-16 15:45",
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
      repProfit: 800,
      ownerProfit: 1200,
      status: "out_for_delivery",
      driverId: "DRV-01",
      driverNotes: "⚠️ اتصلت به مرتين ولم يرد، سأحاول مجدداً بعد العصر.",
      driverInquiryOpen: true,
      createdAt: "2026-11-16T15:45:00Z"
    },
    {
      id: "ORD-2024-003",
      date: "2026-11-17 08:20",
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
      repProfit: 1400,
      ownerProfit: 1600,
      status: "out_for_delivery",
      driverId: "DRV-01",
      driverNotes: "الزبونة أكدت موعد الاستلام اليوم.",
      driverInquiryOpen: false,
      createdAt: "2026-11-17T08:20:00Z"
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
