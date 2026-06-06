const SUBSIDIARIES = [
  {
    id: "baicheng",
    name: "白城牧场",
    lat: 45.6196,
    lng: 122.8381,
    founded: "1958年10月",
    area: "4.2万公顷",
    confirmRate: "98.2%",
    status: "正常",
    statusClass: "status-active",
    crop: "玉米",
    detail: {
      companyName: "吉林省白城牧场",
      address: "白城市洮北区平安镇",
      legalRep: "张三",
      phone: "0436-xxxxxxx",
      operatingArea: "42000公顷",
      confirmedArea: "41244公顷",
      confirmRate: "98.2%",
      employees: "1286人",
      industries: "农业种植、畜牧养殖",
      profile: "吉林省白城牧场成立于1958年，位于白城市洮北区平安镇，总经营面积4.2万公顷。作为国有大型农场，主要从事粮食种植、畜牧养殖及农产品加工，近年来积极推进智慧农业建设，物联网设备覆盖率达85%。"
    },
    land: { arable: "2.1万", grass: "1.2万", forest: "0.5万", other: "0.4万" },
    business: { revenue: "3.2亿", profit: "0.8亿", scaleRate: "82%", contracts: 156 },
    production: { grain: "12.5万吨", livestock: "8600头", yield: "95.2%" },
    devices: { total: 286, online: 268, sensors: 120, cameras: 86, drones: 12 }
  },
  {
    id: "zhennan",
    name: "镇南种羊场",
    lat: 45.846,
    lng: 123.198,
    founded: "1962年3月",
    area: "3.8万公顷",
    confirmRate: "96.5%",
    status: "正常",
    statusClass: "status-active",
    crop: "畜牧",
    detail: {
      companyName: "吉林省镇南种羊场",
      address: "白城市镇南县",
      legalRep: "李四",
      phone: "0436-yyyyyyy",
      operatingArea: "38000公顷",
      confirmedArea: "36670公顷",
      confirmRate: "96.5%",
      employees: "980人",
      industries: "种羊繁育、畜牧养殖",
      profile: "镇南种羊场是吉林省重点种羊繁育基地，拥有优质细毛羊、湖羊等多个品种，年出栏羊只达2万头，为区域畜牧业发展提供核心种源支撑。"
    },
    land: { arable: "1.5万", grass: "1.8万", forest: "0.3万", other: "0.2万" },
    business: { revenue: "2.1亿", profit: "0.5亿", scaleRate: "78%", contracts: 98 },
    production: { grain: "6.8万吨", livestock: "15000头", yield: "92.8%" },
    devices: { total: 198, online: 185, sensors: 85, cameras: 62, drones: 8 }
  },
  {
    id: "changlin",
    name: "长岭种马场",
    lat: 44.28,
    lng: 123.97,
    founded: "1965年7月",
    area: "3.2万公顷",
    confirmRate: "94.8%",
    status: "正常",
    statusClass: "status-active",
    crop: "玉米",
    detail: {
      companyName: "吉林省长岭种马场",
      address: "松原市长岭县",
      legalRep: "王五",
      phone: "0438-zzzzzzz",
      operatingArea: "32000公顷",
      confirmedArea: "30336公顷",
      confirmRate: "94.8%",
      employees: "760人",
      industries: "种马繁育、农业种植",
      profile: "长岭种马场是吉林省重点种马繁育基地，拥有优质纯血马、蒙古马等多个品种，同时发展现代化农业种植，推进种养结合循环农业模式。"
    },
    land: { arable: "1.8万", grass: "0.9万", forest: "0.3万", other: "0.2万" },
    business: { revenue: "1.8亿", profit: "0.4亿", scaleRate: "75%", contracts: 72 },
    production: { grain: "8.2万吨", livestock: "3200头", yield: "91.5%" },
    devices: { total: 152, online: 142, sensors: 65, cameras: 48, drones: 6 }
  }
];

/* 示范园区一张图 */
const DEMO_PARK = {
  title: "示范园区一张图",
  radiation: "辐射区",
  core: "核心区",
  zones: [
    {
      id: "leisure",
      name: "生态休闲园",
      pos: "tl",
      items: [
        "玉米大地景观项目",
        "玉米工坊全产业链体验馆项目",
        "牧草循环经济体验馆项目",
        "玉米迷宫矩阵项目",
        "候鸟迁徙驿站项目",
        "游客接待中心项目"
      ]
    },
    {
      id: "rice",
      name: "智慧水稻种植园",
      pos: "bl",
      items: [
        "大面积单产提升建设项目",
        "水稻无人农场建设项目",
        "稻虾/渔绿色共生基地基地建设",
        "稻梦空间创意景观基地建设"
      ]
    },
    {
      id: "facility",
      name: "现代设施农业园",
      pos: "cl",
      items: [
        "智能连栋温室建设项目",
        "工厂化食用菌建设项目",
        "新型日光温室建设项目",
        "育苗育秧工厂建设项目"
      ]
    },
    {
      id: "tech",
      name: "科技创新中心",
      pos: "tr",
      items: [
        "农业科技实验站建设项目",
        "数智平台建设项目",
        "综合农事服务体系建设项目",
        "配套管理与生活服务建设项目",
        "品牌创建与营销体系建设项目",
        "品牌质量追溯体系建设项目"
      ]
    },
    {
      id: "seed",
      name: "种业创新园",
      pos: "br",
      items: [
        "耐碱作物现代制种基地建设项目",
        "耐碱作物绿色高效种植示范基地",
        "肉羊良种繁育基地建设项目",
        "生物有机肥加工建设项目"
      ]
    }
  ]
};

/* 核心产业园区规划板块（旧数据保留兼容） */
const PARK_ZONES = [
  { id: "zone-smart", name: "智慧农业示范区", shortName: "智慧农业", area: "680公顷", color: "#00FF88", x: 8, y: 12, w: 42, h: 28 },
  { id: "zone-grain", name: "粮食仓储物流区", shortName: "仓储物流", area: "520公顷", color: "#00D4FF", x: 52, y: 8, w: 38, h: 32 },
  { id: "zone-food", name: "食品加工产业园", shortName: "食品加工", area: "410公顷", color: "#FFB800", x: 8, y: 44, w: 35, h: 26 },
  { id: "zone-livestock", name: "畜牧养殖基地", shortName: "畜牧养殖", area: "890公顷", color: "#FF9F43", x: 46, y: 44, w: 44, h: 30 },
  { id: "zone-seed", name: "种业研发中心", shortName: "种业研发", area: "180公顷", color: "#B388FF", x: 8, y: 74, w: 28, h: 20 },
  { id: "zone-service", name: "综合服务区", shortName: "综合服务", area: "220公顷", color: "#66FFBB", x: 40, y: 78, w: 50, h: 16 }
];

const TIMELINE_DATA = [
  { year: "1999", event: "集团成立，整合省内农垦资源" },
  { year: "2010", event: "完成产权制度改革，建立现代企业制度" },
  { year: "2015", event: "核心产业园区启动规划建设" },
  { year: "2020", event: "启动智慧农业转型，物联网全覆盖" },
  { year: "2024", event: "产业园区二期扩容，形成六大功能板块" }
];

const HONOR_DATA = [
  { title: "全国农业产业化重点龙头企业", level: "国家级" },
  { title: "国家绿色农业示范基地", level: "国家级" },
  { title: "吉林省先进农业集团", level: "省级" },
  { title: "智慧农业示范园区", level: "省级" },
  { title: "粮食安全保障先进单位", level: "集团级" }
];

/** 农艺配方 */
const FORMULA_DATA = [
  { name: "五队玉米", pesticide: 2, fertilizer: 0, additive: 0, operation: "播种", method: "精量点播", crop: "玉米", variety: "垦沃-2号" },
  { name: "玉米苗前封闭除草", pesticide: 4, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "玉米", variety: "" },
  { name: "大豆苗前除草药", pesticide: 5, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "大豆", variety: "" },
  { name: "玉米苗前封闭除草药", pesticide: 4, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "玉米", variety: "" },
  { name: "玉米苗前封闭除草药", pesticide: 4, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "玉米", variety: "" },
  { name: "2026年大豆播种", pesticide: 0, fertilizer: 3, additive: 0, operation: "播种", method: "精量点播", crop: "大豆", variety: "龙垦" },
  { name: "大豆苗前药1", pesticide: 4, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "大豆", variety: "" },
  { name: "玉米苗前药", pesticide: 2, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "玉米", variety: "" },
  { name: "大豆-苗前药(2026)", pesticide: 1, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "大豆", variety: "" },
  { name: "玉米-苗前药(2026)", pesticide: 3, fertilizer: 0, additive: 0, operation: "田间管理", method: "苗前灭草", crop: "玉米", variety: "" }
];

/* 集团组织架构（上层辐射 6 家 + 下层农垦分支） */
const ORG_HUB = {
  center: "吉林省农业发展集团",
  satellites: [
    { name: "土地公司" },
    { name: "粮食集团" },
    { name: "生态食品公司" },
    { name: "种业公司" },
    { name: "基金公司" },
    { name: "三依数科" }
  ],
  nongken: {
    name: "农垦集团",
    ranches: ["白城牧场", "镇南种羊场", "长岭种马场"]
  },
  layout: {
    center: { x: 50, y: 28 },
    satellite: { cx: 50, cy: 36, radius: 28, startDeg: 205, endDeg: 335 },
    nongken: { x: 50, y: 54 },
    ranches: { y: 76, xs: [20, 50, 80] }
  }
};

/** @deprecated 兼容旧引用 */
Object.defineProperty(ORG_HUB, "companies", {
  get() {
    return [
      ...ORG_HUB.satellites,
      { name: ORG_HUB.nongken.name, ranches: ORG_HUB.nongken.ranches }
    ];
  }
});

/** 组织架构节点详情（浮窗展示） */
const ORG_DETAILS = {
  center: {
    tag: "管控中心",
    entity: "吉林省政府出资设立的唯一省属国有农业专业化企业集团",
    stats: [
      { label: "二级企业", value: "7", unit: "家" },
      { label: "下属农场", value: "4", unit: "家" },
      { label: "成立时间", value: "2016", unit: "年" }
    ],
    details: [
      { label: "集团定位", text: "落实吉林省农业产业化战略部署，打造现代农业综合发展载体、现代化大农业新增长极、保障粮食安全主力军。" },
      { label: "历史沿革", text: "前身为吉林省农业投资集团，2016年8月成立；按照省属国有企业布局优化和重组整合安排，以省农投集团为主体打造现代化大农业产业集团。" },
      { label: "管控职能", text: "统筹战略发展、资源配置、风险管控与品牌塑造，对旗下土地开发、农垦生产、粮食贸易、精深加工、种业服务与数字农业等板块实施集团化管控。" }
    ]
  },
  "土地公司": {
    tag: "二级企业",
    entity: "土地综合治理与高标准农田建设运营主体",
    stats: [
      { label: "承接规模", value: "70", unit: "万亩" },
      { label: "盐碱地试点", value: "10", unit: "万亩" }
    ],
    details: [
      { label: "创新模式", text: "全国首创「投融建运管」五位一体运营模式，推动耕地保护利用「吉林样板」。" },
      { label: "核心业务", text: "推进高标准农田建设、盐碱地治理、耕地集约开发，实现土地规模化规范化经营。" },
      { label: "行业标准", text: "制定并实施《高标准农田「建运管」一体化标准》，推动上升为行业标准。" }
    ]
  },
  "农垦集团": {
    tag: "二级企业",
    entity: "现代化农场与产业基地建设运营主体",
    stats: [
      { label: "下属牧场", value: "2", unit: "家" },
      { label: "经营面积", value: "8.0", unit: "万公顷" }
    ],
    subsidiaries: ["白城牧场", "镇南种羊场"],
    details: [
      { label: "核心定位", text: "打造中国弱碱功能性食品全产业链创新高地，以「一心五园」布局、「四区融合」功能推动吉林西部价值跃迁。" },
      { label: "核心举措", text: "统领农牧场建设现代化农场与产业基地，构建自有品牌矩阵，落地重点产业项目。" },
      { label: "机制创新", text: "建立垦地融合利益共享机制，实现农场增效、地方发展、群众受益三方共赢。" }
    ]
  },
  "粮食集团": {
    tag: "二级企业",
    entity: "粮食仓储流通与储备保障主体",
    stats: [
      { label: "累计交易", value: "51", unit: "万吨" },
      { label: "智慧粮库", value: "升级", unit: "云仓" }
    ],
    details: [
      { label: "基础能力", text: "依托自有粮库资源，升级智慧云仓，完善跨区域粮食仓储流通网络。" },
      { label: "责任担当", text: "主动承担国家粮食储备任务，通过设备技术改造提升粮库运营效能。" },
      { label: "民生价值", text: "切实解决农民卖粮难题，推动粮食贸易高质量转型，筑牢国家粮食安全防线。" }
    ]
  },
  "生态食品公司": {
    tag: "二级企业",
    entity: "鲜食与品牌食品精深加工主体",
    stats: [
      { label: "鲜食日产", value: "40", unit: "万穗" },
      { label: "年销量", value: "1", unit: "亿穗" }
    ],
    details: [
      { label: "品牌矩阵", text: "打造「重谷」「翠源禾郁」等知名品牌，线上线下市场占有率稳步提升。" },
      { label: "品质认证", text: "获 BRC 全球权威认证，产品拓欧盟及高端消费市场。" },
      { label: "加工能力", text: "鲜食玉米日产突破 40 万穗、年销量超 1 亿穗，形成从田间到餐桌的品控体系。" }
    ]
  },
  "种业公司": {
    tag: "二级企业",
    entity: "育繁推一体化种业振兴主体",
    stats: [
      { label: "单产提升", value: "8.5", unit: "%" },
      { label: "合作机构", value: "3", unit: "家+" }
    ],
    details: [
      { label: "种业振兴", text: "建设种业研发中心，构建「育繁推」一体化体系，培育自主知识产权高产优质抗逆品种。" },
      { label: "种源安全", text: "与先正达、良玉种业、铁岭农科院等合作育种，保障农业种源安全。" },
      { label: "示范推广", text: "开展玉米、水稻等主粮作物良种示范，带动区域单产稳步提升。" }
    ]
  },
  "基金公司": {
    tag: "二级企业",
    entity: "产业投资与资本运营平台",
    stats: [
      { label: "服务板块", value: "全", unit: "产业链" },
      { label: "金融赋能", value: "供应链", unit: "金融" }
    ],
    details: [
      { label: "功能定位", text: "围绕农发集团主责主业，开展产业投资、基金管理和资本运营，服务重大项目和产业链补链强链。" },
      { label: "投资方向", text: "聚焦高标准农田、智慧农业、精深加工、品牌培育等领域，推动优质资源向核心主业集中。" },
      { label: "协同价值", text: "联动金融机构开展供应链金融服务，破解产业链上下游企业融资难题。" }
    ]
  },
  "三依数科": {
    tag: "二级企业",
    entity: "数字农业与「农发云」平台运营主体",
    stats: [
      { label: "核心平台", value: "农发", unit: "云" },
      { label: "覆盖场景", value: "全", unit: "产业链" }
    ],
    details: [
      { label: "数字底座", text: "搭建「农发云」平台，集成在线交易、智慧仓储、供应链金融等功能，构建全产业链数字化生态。" },
      { label: "生产赋能", text: "针对高标准农田和盐碱地治理，打造空天地一体化数字化田间管理系统。" },
      { label: "融合创新", text: "推动数字技术与农业生产、经营、管理深度融合，助力集团智慧管控能力提升。" }
    ]
  }
};

/** 牧场名称 → SUBSIDIARIES.id */
const ORG_RANCH_IDS = {
  "白城牧场": "baicheng",
  "镇南种羊场": "zhennan"
};

/* 兼容旧引用 */
const ORG_3D = { levels: [] };

/* 兼容旧引用 */
const ORG_CHART = {
  headquarters: {
    label: "集团总部",
    items: [
      "办公室", "人力资源部", "党建管理部", "财务管理部", "战略发展部",
      "运营管理部", "风险管理部", "审计部", "安全生产管理部", "纪检监察室", "科技创新部"
    ]
  },
  secondary: {
    label: "二级企业",
    count: 7,
    items: ORG_HUB.companies.map((c) => c.name)
  }
};

/* 七大核心业务（12347 战略） */
const CORE_BUSINESS = [
  {
    id: "farm-dev",
    num: 1,
    title: "农垦开发",
    entity: "农垦集团",
    theme: "pillar-green",
    details: [
      { label: "核心定位", text: "打造中国弱碱功能性食品全产业链创新高地，以「一心五园」布局、「四区融合」功能推动吉林西部从「生态劣势区」向「价值新高地」跃迁" },
      { label: "核心举措", text: "统领农牧场建设现代化农场与产业基地，构建自有品牌矩阵，落地重点产业项目" },
      { label: "机制创新", text: "建立垦地融合利益共享机制，实现农场增效、地方发展、群众受益三方共赢" }
    ]
  },
  {
    id: "land-gov",
    num: 2,
    title: "土地综合治理",
    entity: "土地公司",
    theme: "pillar-teal",
    details: [
      { label: "创新模式", text: "全国首创「投融建运管」五位一体运营模式" },
      { label: "核心业务", text: "推进高标准农田建设、盐碱地治理、耕地集约开发，实现土地规模化规范化经营" },
      { label: "行业标杆", text: "制定并实施《高标准农田「建运管」一体化标准》，推动上升为行业标准，打造耕地保护利用「吉林样板」" }
    ]
  },
  {
    id: "grain-trade",
    num: 3,
    title: "粮食收储与贸易",
    entity: "粮食集团",
    theme: "pillar-cyan",
    details: [
      { label: "基础能力", text: "依托自有粮库资源，升级智慧云仓，完善跨区域粮食仓储流通网络" },
      { label: "责任担当", text: "主动承担国家粮食储备任务，通过设备技术改造提升粮库运营效能" },
      { label: "民生价值", text: "切实解决农民卖粮难题，推动粮食收储与贸易高质量转型，筑牢国家粮食安全防线" }
    ]
  },
  {
    id: "deep-process",
    num: 4,
    title: "农产品精深加工",
    entity: "大成集团 + 生态食品公司",
    theme: "pillar-orange",
    details: [
      { label: "大成集团", text: "聚焦转型焕新，升级玉米深加工产业链，拓展氨基酸产品至健康食品、新材料领域，盘活资产、提升效益、扩大国内外市场" },
      { label: "生态食品公司", text: "鲜食玉米日产突破 40 万穗、年销量超 1 亿穗；打造「重谷」「翠源禾郁」等知名品牌，获 BRC 全球权威认证，线上线下市场占有率稳步提升" }
    ]
  },
  {
    id: "agri-service",
    num: 5,
    title: "农业综合管理与服务",
    entity: "种业公司 + 农机公司",
    theme: "pillar-purple",
    details: [
      { label: "种业振兴", text: "建设种业研发中心，构建「育繁推」一体化体系，培育自主知识产权高产优质抗逆品种，保障农业种源安全" },
      { label: "农机推广", text: "引进久保田、三和等先进农机设备，开展农业机械化示范推广" }
    ]
  },
  {
    id: "digital-agri",
    num: 6,
    title: "数字农业",
    entity: "三侬数科",
    theme: "pillar-blue",
    details: [
      { label: "数字底座", text: "搭建「农发云」平台，集成在线交易、智慧仓储、供应链金融等功能，构建全产业链数字化生态" },
      { label: "金融赋能", text: "联动金融机构开展供应链金融服务，破解产业链企业融资难题" },
      { label: "生产赋能", text: "针对高标准农田和盐碱地治理，打造空天地一体化数字化田间管理系统，推动数字技术与农业生产深度融合" }
    ]
  },
  {
    id: "livestock",
    num: 7,
    title: "畜产品产业",
    entity: "农垦集团 + 养殖板块",
    theme: "pillar-amber",
    details: [
      { label: "产业定位", text: "依托农垦牧场资源，构建从养殖、屠宰到精深加工的全链条畜产品产业体系" },
      { label: "核心能力", text: "推进种羊繁育、肉羊出栏与畜产品加工协同，提升畜产品供给保障能力" },
      { label: "品牌发展", text: "打造区域性畜产品特色品牌，拓展「养殖 + 加工 + 销售」一体化经营" }
    ]
  }
];

const CORE_BUSINESS_MAP = Object.fromEntries(CORE_BUSINESS.map((b) => [b.id, b]));

/** 12347 发展战略 */
const STRATEGY_12347 = {
  title: "12347 发展战略",
  goal: { num: "1", unit: "个目标", text: "区域领先现代大农业产业集团" },
  transforms: { num: "2", unit: "个转型", items: ["实体化", "全产业链化"] },
  steps: { num: "3", unit: "步走", items: ["夯基", "保供", "全国供应商"] },
  positions: { num: "4", unit: "定位", items: ["政策载体", "资源平台", "新质生产力", "粮食安全主力军"] },
  sectors: { num: "7", unit: "大板块", items: ["土地", "农垦", "粮贸", "加工", "服务", "数字", "畜牧"] }
};

/** 2026 核心目标 */
const TARGETS_2026 = {
  title: "2026 核心目标",
  metrics: [
    { label: "资产规模", value: "150", unit: "亿元" },
    { label: "营业收入", value: "85", unit: "亿元", suffix: "+" },
    { label: "利润总额", value: "5000", unit: "万元", suffix: "+" },
    { label: "耕地规模", value: "300", unit: "万亩" }
  ]
};

const BUSINESS_EXPANSION = {
  future: [
    "2026 年：打造 3 个自主品牌，建成数智平台与制种基地，收回 4 万亩耕地经营权",
    "「十五五」：培育 6 个行业影响力品牌，粮食产量达 7 万吨，社会化服务超 500 万亩"
  ],
  sectors: [
    {
      id: "tech",
      num: 1,
      title: "科技农业",
      theme: "pillar-blue",
      headline: "51",
      headlineUnit: "万吨",
      headlineLabel: "粮食交易",
      metrics: [
        { value: "51", unit: "万吨", label: "粮食交易" },
        { value: "8.5", unit: "%", label: "玉米单产提升" },
        { value: "7.1", unit: "%", label: "水稻单产提升" }
      ],
      highlights: [
        "与先正达 / 良玉种业 / 铁岭农科院合作育种",
        "空天地一体化装备：玉米 +8.5%、水稻 +7.1%",
        "东北亚玉米平台：累计交易 51 万吨"
      ],
      businessIds: ["digital-agri", "grain-trade", "agri-service"]
    },
    {
      id: "green",
      num: 2,
      title: "绿色农业",
      theme: "pillar-green",
      headline: "70",
      headlineUnit: "万亩",
      headlineLabel: "高标准农田",
      metrics: [
        { value: "70", unit: "万亩", label: "高标准农田" },
        { value: "10", unit: "万亩", label: "盐碱地试点" },
        { value: "10", unit: "万吨", label: "有机肥产能" }
      ],
      highlights: [
        "承接高标准农田 70 万亩（投融建运管一体化）",
        "镇南县 10 万亩盐碱地治理国家试点",
        "年产 10 万吨有机肥，解决秸秆焚烧污染"
      ],
      businessIds: ["land-gov", "farm-dev"]
    },
    {
      id: "quality",
      num: 3,
      title: "质量农业",
      theme: "pillar-teal",
      headline: "2",
      headlineUnit: "万亩",
      headlineLabel: "标准化种植",
      metrics: [
        { value: "2", unit: "万亩", label: "标准化种植" },
        { value: "20", unit: "万亩", label: "耕地归集" }
      ],
      highlights: [
        "全国首创高标准农田「建运管」企业标准",
        "区块链全程溯源，BRC 认证拓欧盟市场",
        "2 万亩标准化种植基地，全流程技术指导"
      ],
      businessIds: ["deep-process"]
    },
    {
      id: "brand",
      num: 4,
      title: "品牌农业",
      theme: "pillar-cyan",
      headline: "300",
      headlineUnit: "+",
      headlineLabel: "线下终端",
      metrics: [
        { value: "300", unit: "+", label: "线下终端" }
      ],
      highlights: [
        "吉垦 / 翠源禾郁等核心品牌，25 类特色产品",
        "线上 15 店 + 5 直播间，线下 300+ 社区店（8 省）",
        "探索「农业 + 文旅 / 康养」新业态"
      ],
      businessIds: ["farm-dev", "deep-process"]
    }
  ]
};

/* 兼容旧引用 */
const AGRI_ACHIEVEMENTS = {
  pillars: BUSINESS_EXPANSION.sectors.map((s) => ({
    id: s.id,
    title: s.title,
    theme: s.theme,
    headline: s.headline,
    headlineUnit: s.headlineUnit,
    headlineLabel: s.headlineLabel,
    highlights: s.highlights
  })),
  keyMetrics: BUSINESS_EXPANSION.sectors.flatMap((s) => s.metrics || []),
  future: BUSINESS_EXPANSION.future
};

const INDUSTRY_DATA = [
  { name: "种植", value: 35 },
  { name: "畜牧", value: 25 },
  { name: "粮食加工", value: 20 },
  { name: "食品生产", value: 15 },
  { name: "其他", value: 5 }
];

const TOP5_DATA = {
  names: ["白城牧场", "镇南种羊场"],
  values: [42000, 38000]
};

const LANDUSE_DATA = [
  { name: "耕地", value: 42 },
  { name: "草地", value: 28 },
  { name: "林地", value: 12 },
  { name: "建设用地", value: 10 },
  { name: "其他", value: 8 }
];

/* 吉林省边界近似 GeoJSON（简化多边形） */
const JILIN_BOUNDARY = {
  type: "Feature",
  properties: { name: "吉林省" },
  geometry: {
    type: "Polygon",
    coordinates: [[
      [121.38, 46.30], [127.05, 46.28], [131.18, 45.50], [131.30, 43.00],
      [130.50, 41.80], [128.00, 40.85], [125.80, 40.90], [123.50, 41.20],
      [121.60, 42.50], [121.38, 44.00], [121.38, 46.30]
    ]]
  }
};

/* 生成有机弯曲线土地图斑（本底数据 · 土地资源图层） */
function createOrganicLandPolygon(lat, lng, radiusDeg, seed, aspect, detail) {
  const n = detail ? 42 + Math.floor((seed * 10) % 12) : 26 + Math.floor((seed * 10) % 8);
  const coords = [];
  const ax = aspect?.lng ?? 1.18;
  const ay = aspect?.lat ?? 0.84;
  const wobbleScale = detail ? 1.35 : 1;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const w1 = Math.sin(seed * 2.17 + t * 3.3) * 0.2 * wobbleScale;
    const w2 = Math.cos(seed * 1.73 + t * 5.1) * 0.14 * wobbleScale;
    const w3 = Math.sin(seed * 4.2 + t * 7.7) * 0.09 * wobbleScale;
    const w4 = Math.cos(seed * 3.5 + t * 11.2) * 0.06 * wobbleScale;
    const w5 = Math.sin(seed * 6.1 + t * 13.4) * 0.05 * wobbleScale;
    const r = radiusDeg * (0.64 + w1 + w2 + w3 + w4 + w5);
    coords.push([
      lng + Math.cos(t) * r * ax,
      lat + Math.sin(t) * r * ay
    ]);
  }
  coords.push(coords[0]);
  return coords;
}

/** 地籍宗网格描边（闭合四边形拼网，共享边线） */
function cadastralMeshJitter(seed, scale) {
  return (Math.sin(seed * 12.9898) - 0.5) * scale;
}

function createCadastralMeshPolygons(originLat, originLng, spanLat, spanLng, cols, rows, seed) {
  const features = [];
  const latStep = spanLat / rows;
  const lngStep = spanLng / cols;
  const lats = [];
  const lngs = [];

  for (let r = 0; r <= rows; r++) {
    const edge = r === 0 || r === rows;
    lats.push(originLat + r * latStep + cadastralMeshJitter(seed + r * 3.17, latStep * (edge ? 0.02 : 0.12)));
  }
  for (let c = 0; c <= cols; c++) {
    const edge = c === 0 || c === cols;
    lngs.push(originLng + c * lngStep + cadastralMeshJitter(seed + c * 5.73, lngStep * (edge ? 0.02 : 0.12)));
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ring = [
        [lngs[c], lats[r]],
        [lngs[c + 1], lats[r]],
        [lngs[c + 1], lats[r + 1]],
        [lngs[c], lats[r + 1]],
        [lngs[c], lats[r]]
      ];
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: { row: r, col: c }
      });
    }
  }
  return features;
}

/** 图斑内部弯曲线界（模拟行政区划细线） */
function createLandSubdivisionLines(lat, lng, radiusDeg, seed, count) {
  const lines = [];
  const total = count || 4;
  for (let j = 0; j < total; j++) {
    const pts = [];
    const segments = 14 + (j % 3) * 2;
    const angle0 = seed * 1.9 + j * (Math.PI * 2 / total);
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = angle0 + t * Math.PI * (0.65 + j * 0.12);
      const wave = Math.sin(seed * 3.3 + i * 1.4 + j) * 0.12;
      const r = radiusDeg * (0.18 + t * 0.72 + wave);
      pts.push([
        lng + Math.cos(angle) * r * 1.12,
        lat + Math.sin(angle) * r * 0.86
      ]);
    }
    lines.push({
      type: "Feature",
      geometry: { type: "LineString", coordinates: pts }
    });
  }
  return lines;
}

function landPolygonFeature(lat, lng, radiusDeg, seed, aspect) {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [createOrganicLandPolygon(lat, lng, radiusDeg, seed, aspect, true)]
    }
  };
}

/** 用地类型填色（土地资源图层 · 参考 GIS 图例） */
const LAND_USE_FILL_COLORS = {
  "耕地": "rgba(255, 214, 64, 0.28)",
  "草地": "rgba(79, 195, 247, 0.24)",
  "林地": "rgba(102, 187, 106, 0.26)",
  "建设用地": "rgba(255, 152, 0, 0.22)",
  "水域": "rgba(66, 165, 245, 0.28)",
  "其他": "rgba(161, 136, 127, 0.22)",
  "园地": "rgba(129, 199, 132, 0.24)",
  "商服用地": "rgba(121, 134, 203, 0.22)"
};


/* 生成矩形地块（种植经营 · 标准田块，位置自然散落） */
function createPlotFieldPolygon(lat, lng, halfW, halfH, seed) {
  const hw = halfW || 0.014;
  const hh = halfH || 0.011;
  const sx = 0.9 + (Math.abs(Math.sin((seed || 0) * 1.31)) * 0.2);
  const sy = 0.88 + (Math.abs(Math.cos((seed || 0) * 2.07)) * 0.22);
  const w = hw * sx;
  const h = hh * sy;
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [lng - w, lat - h],
        [lng + w, lat - h],
        [lng + w, lat + h],
        [lng - w, lat + h],
        [lng - w, lat - h]
      ]]
    }
  };
}

/* 兼容旧引用 */
function createPlotParcelPolygon(lat, lng, halfW, halfH, seed) {
  return createPlotFieldPolygon(lat, lng, halfW, halfH, seed);
}

/* 生成子公司经营地块多边形（兼容旧引用） */
function createPlotPolygon(lat, lng, sizeDeg) {
  const d = sizeDeg || 0.035;
  return createPlotParcelPolygon(lat, lng, d * 0.52, d * 0.38, lat * 17.3 + lng * 11.7);
}
