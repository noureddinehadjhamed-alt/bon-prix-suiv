// Production Initial Data (Clean — No Demo Reps, Drivers, or Orders)
const DEFAULT_DATA = {
  users: [
    {
      id: "USR-001",
      name: "المدير العام (صاحب المتجر)",
      email: "fashionbonprix@gmail.com",
      phone: "0550000000",
      password: "admin",
      authProvider: "google",
      role: "admin",
      requestedRole: "admin",
      status: "active",
      linkedId: null,
      securityLevel: "high",
      createdAt: "2026-11-01T08:00:00Z"
    }
  ],

  products: [],

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

  reps: [],
  drivers: [],
  orders: [],
  stockMovements: [],
  securityLogs: [],
  payouts: []
};
