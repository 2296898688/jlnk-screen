/* 农垦一张图 — 模拟数据（权限过滤后展示子集） */

const PERMISSIONS = {
  group: { label: "集团总部", farms: ["baicheng", "zhennan", "changlin"] },
  baicheng: { label: "白城牧场", farms: ["baicheng"] },
  zhennan: { label: "镇南种羊场", farms: ["zhennan"] },
  changlin: { label: "长岭种马场", farms: ["changlin"] }
};

const LAND_RIGHT_TYPES = ["国有", "集体", "承包", "租赁"];
const LAND_USE_TYPES = ["耕地", "草地", "林地", "建设用地", "水域", "其他"];
const RENT_TYPES = ["统种地", "外租地", "个人地"];
const SALINE_TYPES = ["轻度盐碱", "中度盐碱", "重度盐碱", "苏打盐碱"];
const HIGH_STD_STATUS = ["已完成", "建设中", "规划中", "非高标"];

const YZT_LAND_STATS = {
  totalArea: 2480,
  certified: { area: 1860, count: 892 },
  registeredPending: { area: 320, count: 156 },
  confirmedUnregistered: { area: 180, count: 98 },
  unconfirmed: { area: 120, count: 140 },
  inputArea: 2380,
  drawArea: 2356,
  useRightArea: 2320
};

const YZT_RENT_STATS = [
  { type: "统种地", area: 1120, count: 486, color: "#00FF88" },
  { type: "外租地", area: 680, count: 312, color: "#00D4FF" },
  { type: "个人地", area: 420, count: 198, color: "#FFB800" }
];

const YZT_HIGH_STD = [
  { status: "已完成", area: 860, count: 420, color: "#00FF88" },
  { status: "建设中", area: 320, count: 156, color: "#00D4FF" },
  { status: "规划中", area: 180, count: 88, color: "#FFB800" },
  { status: "非高标", area: 1120, count: 622, color: "#6B7280" }
];

const YZT_SALINE = [
  { type: "轻度盐碱", area: 280, count: 142, color: "#FFE066" },
  { type: "中度盐碱", area: 156, count: 78, color: "#FF9F43" },
  { type: "重度盐碱", area: 68, count: 32, color: "#FF6B6B" },
  { type: "苏打盐碱", area: 42, count: 18, color: "#B388FF" }
];

const YZT_CROPS = [
  { name: "玉米", area: 680, pct: 32, varieties: ["先玉335", "郑单958", "吉单27"] },
  { name: "大豆", area: 420, pct: 20, varieties: ["吉农17", "东生7号"] },
  { name: "水稻", area: 380, pct: 18, varieties: ["吉粳88", "通系933"] },
  { name: "杂粮", area: 260, pct: 12, varieties: ["高粱", "谷子", "绿豆"] },
  { name: "牧草", area: 220, pct: 10, varieties: ["苜蓿", "黑麦草"] },
  { name: "其他", area: 168, pct: 8, varieties: ["中药材", "果蔬"] }
];

const YZT_PROGRESS = {
  categories: ["粮食作物", "油料作物", "经济作物", "牧草", "杂粮", "其他作物"],
  sowPlan: [820, 180, 120, 220, 260, 95],
  sowDone: [756, 168, 98, 198, 228, 72],
  harvestPlant: [780, 175, 110, 0, 0, 0],
  harvestCut:   [520, 110,  68, 0, 0, 0],
  harvestDone:  [420,  85,  45, 0, 0, 0]
};

/** 各农场播种进度数据 */
const YZT_FARM_SOWING = {
  baicheng: {
    sowPlan: [480, 105, 70, 130, 155, 58],
    sowDone: [442, 98, 58, 118, 136, 45]
  },
  zhennan: {
    sowPlan: [340, 75, 50, 90, 105, 37],
    sowDone: [314, 70, 40, 80, 92, 27]
  },
  changlin: {
    sowPlan: [310, 68, 45, 82, 95, 33],
    sowDone: [282, 62, 36, 73, 82, 24]
  }
};

/** 各农场作物分布数据（万亩） */
const YZT_FARM_CROP_DIST = {
  baicheng: {
    pie: [
      { name: "粮食", value: 30, color: "#00FF88" },
      { name: "油料", value: 14, color: "#00D4FF" },
      { name: "经济作物", value: 9, color: "#FFB800" },
      { name: "牧草", value: 8, color: "#B388FF" },
      { name: "杂粮及其他", value: 5, color: "#FF9F1C" }
    ],
    bar: [
      { label: "小麦", cat: "粮食", area: 18, pct: 27.3, color: "#00FF88" },
      { label: "玉米", cat: "粮食", area: 12, pct: 18.2, color: "#00CC66" },
      { label: "大豆", cat: "油料", area: 9, pct: 13.6, color: "#00D4FF" },
      { label: "油菜", cat: "油料", area: 5, pct: 7.6, color: "#0099CC" },
      { label: "大麦及其他", cat: "经济作物", area: 5, pct: 7.6, color: "#FFB800" },
      { label: "苜蓿、黑麦草", cat: "牧草", area: 8, pct: 12.1, color: "#B388FF" },
      { label: "羊草、杂粮及其他", cat: "杂粮及其他", area: 5, pct: 7.6, color: "#FF9F1C" }
    ]
  },
  zhennan: {
    pie: [
      { name: "粮食", value: 22, color: "#00FF88" },
      { name: "油料", value: 10, color: "#00D4FF" },
      { name: "经济作物", value: 7, color: "#FFB800" },
      { name: "牧草", value: 6, color: "#B388FF" },
      { name: "杂粮及其他", value: 3, color: "#FF9F1C" }
    ],
    bar: [
      { label: "小麦", cat: "粮食", area: 13, pct: 27.1, color: "#00FF88" },
      { label: "玉米", cat: "粮食", area: 9, pct: 18.8, color: "#00CC66" },
      { label: "大豆", cat: "油料", area: 7, pct: 14.6, color: "#00D4FF" },
      { label: "油菜", cat: "油料", area: 3, pct: 6.3, color: "#0099CC" },
      { label: "大麦及其他", cat: "经济作物", area: 4, pct: 8.3, color: "#FFB800" },
      { label: "苜蓿、黑麦草", cat: "牧草", area: 6, pct: 12.5, color: "#B388FF" },
      { label: "羊草、杂粮及其他", cat: "杂粮及其他", area: 3, pct: 6.3, color: "#FF9F1C" }
    ]
  },
  changlin: {
    pie: [
      { name: "粮食", value: 28, color: "#00FF88" },
      { name: "油料", value: 12, color: "#00D4FF" },
      { name: "经济作物", value: 8, color: "#FFB800" },
      { name: "牧草", value: 10, color: "#B388FF" },
      { name: "杂粮及其他", value: 6, color: "#FF9F1C" }
    ],
    bar: [
      { label: "小麦", cat: "粮食", area: 16, pct: 25.0, color: "#00FF88" },
      { label: "玉米", cat: "粮食", area: 12, pct: 18.8, color: "#00CC66" },
      { label: "大豆", cat: "油料", area: 7, pct: 10.9, color: "#00D4FF" },
      { label: "油菜", cat: "油料", area: 5, pct: 7.8, color: "#0099CC" },
      { label: "大麦及其他", cat: "经济作物", area: 4, pct: 6.3, color: "#FFB800" },
      { label: "苜蓿、黑麦草", cat: "牧草", area: 10, pct: 15.6, color: "#B388FF" },
      { label: "羊草、杂粮及其他", cat: "杂粮及其他", area: 6, pct: 9.4, color: "#FF9F1C" }
    ]
  }
};

/** 各农场作物分类面积（万亩） */
var CROP_GROUPS = {
  baicheng: [
    { title: "粮食", items: [
      { name: "小麦", val: 72.5, color: "#FFB800" },
      { name: "马铃薯", val: 14.0, color: "#FF5252" },
      { name: "玉米", val: 40.2, color: "#B388FF" }
    ]},
    { title: "油料", items: [
      { name: "油菜", val: 75.8, color: "#CE93D8" },
      { name: "大豆", val: 86.3, color: "#00FF88" }
    ]},
    { title: "经济作物", items: [
      { name: "大麦", val: 5.12, color: "#00D4FF" },
      { name: "水飞蓟", val: 10.2, color: "#00FF88" },
      { name: "甜菜", val: 17.8, color: "#448AFF" },
      { name: "莜麦", val: 3.75, color: "#D7CCC8" },
      { name: "中草药", val: 1.92, color: "#8D6E63" }
    ]},
    { title: "牧草", items: [
      { name: "苜蓿", val: 1.28, color: "#00BFA5" },
      { name: "青贮", val: 0.55, color: "#448AFF" },
      { name: "燕麦草", val: 1.22, color: "#FFB800" }
    ]},
    { title: "杂粮及其他作物", items: [
      { name: "羊草", val: 0.50, color: "#FAFAFA" },
      { name: "杂粮及其他", val: 1.48, color: "#FAFAFA" }
    ]}
  ],
  zhennan: [
    { title: "粮食", items: [
      { name: "小麦", val: 53.7, color: "#FFB800" },
      { name: "马铃薯", val: 10.29, color: "#FF5252" },
      { name: "玉米", val: 28.72, color: "#B388FF" }
    ]},
    { title: "油料", items: [
      { name: "油菜", val: 58.5, color: "#CE93D8" },
      { name: "大豆", val: 62.42, color: "#00FF88" }
    ]},
    { title: "经济作物", items: [
      { name: "大麦", val: 3.71, color: "#00D4FF" },
      { name: "水飞蓟", val: 7.25, color: "#00FF88" },
      { name: "甜菜", val: 12.54, color: "#448AFF" },
      { name: "莜麦", val: 2.75, color: "#D7CCC8" },
      { name: "中草药", val: 1.42, color: "#8D6E63" }
    ]},
    { title: "牧草", items: [
      { name: "苜蓿", val: 0.85, color: "#00BFA5" },
      { name: "青贮", val: 0.39, color: "#448AFF" },
      { name: "燕麦草", val: 0.86, color: "#FFB800" }
    ]},
    { title: "杂粮及其他作物", items: [
      { name: "羊草", val: 0.36, color: "#FAFAFA" },
      { name: "杂粮及其他", val: 1.05, color: "#FAFAFA" }
    ]}
  ]
};

/** 秋收进度 · 各地块数据 */
const YZT_HARVEST_PLOTS = {
  baicheng: [
    { name: "BC-东1号地", plant: 12.5, cut: 9.8, done: 7.2 },
    { name: "BC-东2号地", plant: 10.2, cut: 8.0, done: 5.5 },
    { name: "BC-南1号地", plant: 8.8, cut: 6.5, done: 4.8 },
    { name: "BC-南2号地", plant: 7.5, cut: 5.2, done: 3.6 },
    { name: "BC-西1号地", plant: 6.2, cut: 4.8, done: 2.8 },
    { name: "BC-北1号地", plant: 5.5, cut: 4.0, done: 2.0 },
    { name: "BC-北2号地", plant: 4.8, cut: 2.5, done: 1.2 },
    { name: "BC-中1号地", plant: 4.0, cut: 3.2, done: 1.8 },
    { name: "BC-中2号地", plant: 3.5, cut: 1.8, done: 0.8 },
    { name: "BC-西2号地", plant: 2.8, cut: 0, done: 0 }
  ],
  zhennan: [
    { name: "ZN-东1号地", plant: 9.5, cut: 7.5, done: 5.2 },
    { name: "ZN-东2号地", plant: 8.2, cut: 6.0, done: 4.0 },
    { name: "ZN-南1号地", plant: 7.0, cut: 5.5, done: 3.8 },
    { name: "ZN-南2号地", plant: 6.5, cut: 4.2, done: 2.5 },
    { name: "ZN-西1号地", plant: 5.8, cut: 4.0, done: 2.2 },
    { name: "ZN-西2号地", plant: 5.0, cut: 2.8, done: 1.5 },
    { name: "ZN-北1号地", plant: 4.2, cut: 3.5, done: 2.0 },
    { name: "ZN-中1号地", plant: 3.8, cut: 2.2, done: 1.0 },
    { name: "ZN-中2号地", plant: 3.0, cut: 1.5, done: 0.5 },
    { name: "ZN-东3号地", plant: 2.5, cut: 0, done: 0 }
  ]
};

/** 物联网设备数量统计（三大类分组） */
const YZT_DEVICE_COUNTS = [
  /* 监测类 */
  { name: "土壤墒情站", count: 10, icon: "soil", color: "#B388FF", cat: "监测类" },
  { name: "养分酸碱度传感器", count: 8, icon: "pheno", color: "#536DFE", cat: "监测类" },
  { name: "孢子捕捉仪", count: 4, icon: "insect", color: "#E040FB", cat: "监测类" },
  { name: "虫情测报设备", count: 6, icon: "insect", color: "#AB47BC", cat: "监测类" },
  { name: "气象站", count: 8, icon: "weather", color: "#FF9F1C", cat: "监测类" },
  { name: "监控", count: 15, icon: "camera", color: "#FFB800", cat: "监测类" },
  { name: "遥感无人机", count: 3, icon: "drone", color: "#00D4FF", cat: "监测类" },
  /* 作业机械类 */
  { name: "无人拖拉机", count: 0, icon: "tractor", color: "#00C853", cat: "作业机械类" },
  { name: "播种机", count: 0, icon: "seeder", color: "#64DD17", cat: "作业机械类" },
  { name: "收割机", count: 0, icon: "harvester", color: "#FFD600", cat: "作业机械类" },
  { name: "田间转运车", count: 0, icon: "transporter", color: "#FF9100", cat: "作业机械类" },
  /* 灌溉植保类 */
  { name: "水肥一体机", count: 6, icon: "fertigation", color: "#00B4D8", cat: "灌溉植保类" },
  { name: "灌溉管件阀门", count: 12, icon: "valve", color: "#48CAE4", cat: "灌溉植保类" },
  { name: "无人植保机", count: 4, icon: "sprayer", color: "#7C4DFF", cat: "灌溉植保类" },
  { name: "杀虫防控设备", count: 10, icon: "lamp", color: "#FF5252", cat: "灌溉植保类" }
];

const YZT_DEVICES = [
  // ---- 气象站 (8) ----
  { id: "ws001", name: "气象站-WS01", type: "气象站", farm: "白城牧场", lat: 45.625, lng: 122.842, online: true, status: "online",
    value: "23.6°C", runtime: "1680h", lastReport: "2026-05-22 08:30:15",
    readings: { temperature: 23.6, humidity: 68, windSpeed: 3.2, windDir: "东南", pressure: 1013.2, rainfall: 0.2 },
    alerts: [{ level: "info", text: "风速传感器校准提醒", time: "2026-05-22 08:00" }] },
  { id: "ws002", name: "气象站-WS02", type: "气象站", farm: "白城牧场", lat: 45.618, lng: 122.828, online: true, status: "online",
    value: "22.1°C", runtime: "1650h", lastReport: "2026-05-22 08:28:42",
    readings: { temperature: 22.1, humidity: 72, windSpeed: 2.8, windDir: "南", pressure: 1012.8, rainfall: 0.0 },
    alerts: [{ level: "info", text: "气压波动异常，请注意天气变化", time: "2026-05-22 06:45" }] },
  { id: "ws003", name: "气象站-WS03", type: "气象站", farm: "白城牧场", lat: 45.610, lng: 122.860, online: true, status: "online",
    value: "24.8°C", runtime: "1720h", lastReport: "2026-05-22 08:31:02",
    readings: { temperature: 24.8, humidity: 65, windSpeed: 4.1, windDir: "东北", pressure: 1013.5, rainfall: 0.0 },
    alerts: [] },
  { id: "ws004", name: "气象站-WS04", type: "气象站", farm: "镇南种羊场", lat: 45.850, lng: 123.205, online: true, status: "online",
    value: "21.3°C", runtime: "1580h", lastReport: "2026-05-22 08:29:55",
    readings: { temperature: 21.3, humidity: 70, windSpeed: 3.5, windDir: "西", pressure: 1013.0, rainfall: 0.5 },
    alerts: [] },
  { id: "ws005", name: "气象站-WS05", type: "气象站", farm: "镇南种羊场", lat: 45.842, lng: 123.215, online: true, status: "online",
    value: "20.9°C", runtime: "1610h", lastReport: "2026-05-22 08:30:38",
    readings: { temperature: 20.9, humidity: 74, windSpeed: 2.5, windDir: "东南", pressure: 1012.5, rainfall: 0.0 },
    alerts: [] },
  { id: "ws006", name: "气象站-WS06", type: "气象站", farm: "白城牧场", lat: 45.632, lng: 122.810, online: false, status: "offline",
    value: "--", runtime: "1420h", lastReport: "2026-05-21 14:22:10",
    readings: null,
    alerts: [{ level: "warning", text: "设备离线超过12小时", time: "2026-05-22 02:22" }] },
  { id: "ws007", name: "气象站-WS07", type: "气象站", farm: "镇南种羊场", lat: 45.858, lng: 123.190, online: true, status: "online",
    value: "22.7°C", runtime: "1550h", lastReport: "2026-05-22 08:31:20",
    readings: { temperature: 22.7, humidity: 69, windSpeed: 3.0, windDir: "北", pressure: 1013.1, rainfall: 0.1 },
    alerts: [] },
  { id: "ws008", name: "气象站-WS08", type: "气象站", farm: "白城牧场", lat: 45.605, lng: 122.845, online: true, status: "online",
    value: "25.1°C", runtime: "1690h", lastReport: "2026-05-22 08:30:50",
    readings: { temperature: 25.1, humidity: 62, windSpeed: 3.8, windDir: "西南", pressure: 1013.8, rainfall: 0.0 },
    alerts: [] },
  // ---- 土壤墒情站 (10) ----
  { id: "sm001", name: "土壤墒情站-SM01", type: "土壤墒情站", farm: "白城牧场", lat: 45.628, lng: 122.835, online: true, status: "online",
    value: "墒情 42%", runtime: "720h", lastReport: "2026-05-22 08:25:10",
    readings: { soilMoist: 42, soilTemp: 18.4, soilPH: 6.8, conductivity: 0.82, depth10cm: 38, depth30cm: 45 },
    alerts: [{ level: "warning", text: "30cm土壤湿度偏低，建议灌溉", time: "2026-05-22 07:30" }] },
  { id: "sm002", name: "土壤墒情站-SM02", type: "土壤墒情站", farm: "白城牧场", lat: 45.622, lng: 122.822, online: true, status: "online",
    value: "墒情 38%", runtime: "710h", lastReport: "2026-05-22 08:24:55",
    readings: { soilMoist: 38, soilTemp: 19.1, soilPH: 7.0, conductivity: 0.75, depth10cm: 35, depth30cm: 40 },
    alerts: [{ level: "warning", text: "30cm土壤湿度偏低，建议灌溉", time: "2026-05-22 07:30" }] },
  { id: "sm003", name: "土壤墒情站-SM03", type: "土壤墒情站", farm: "白城牧场", lat: 45.615, lng: 122.855, online: true, status: "online",
    value: "墒情 45%", runtime: "735h", lastReport: "2026-05-22 08:26:02",
    readings: { soilMoist: 45, soilTemp: 18.0, soilPH: 6.5, conductivity: 0.88, depth10cm: 42, depth30cm: 48 },
    alerts: [{ level: "warning", text: "土壤pH偏低，建议施用石灰调节", time: "2026-05-22 04:50" }] },
  { id: "sm004", name: "土壤墒情站-SM04", type: "土壤墒情站", farm: "镇南种羊场", lat: 45.848, lng: 123.210, online: true, status: "online",
    value: "墒情 40%", runtime: "700h", lastReport: "2026-05-22 08:25:30",
    readings: { soilMoist: 40, soilTemp: 19.5, soilPH: 7.2, conductivity: 0.70, depth10cm: 36, depth30cm: 42 },
    alerts: [] },
  { id: "sm005", name: "土壤墒情站-SM05", type: "土壤墒情站", farm: "镇南种羊场", lat: 45.840, lng: 123.200, online: false, status: "offline",
    value: "--", runtime: "680h", lastReport: "2026-05-21 18:30:00",
    readings: null,
    alerts: [{ level: "warning", text: "设备离线超过12小时", time: "2026-05-22 06:30" }] },
  { id: "sm006", name: "土壤墒情站-SM06", type: "土壤墒情站", farm: "白城牧场", lat: 45.630, lng: 122.818, online: true, status: "online",
    value: "墒情 48%", runtime: "728h", lastReport: "2026-05-22 08:26:15",
    readings: { soilMoist: 48, soilTemp: 17.8, soilPH: 6.9, conductivity: 0.85, depth10cm: 44, depth30cm: 50 },
    alerts: [] },
  { id: "sm007", name: "土壤墒情站-SM07", type: "土壤墒情站", farm: "镇南种羊场", lat: 45.855, lng: 123.195, online: true, status: "fault",
    value: "传感器异常", runtime: "690h", lastReport: "2026-05-22 07:15:00",
    readings: { soilMoist: 99, soilTemp: 99.9, soilPH: 0, conductivity: 9.99, depth10cm: 99, depth30cm: 99 },
    alerts: [{ level: "danger", text: "传感器数据异常，请检修", time: "2026-05-22 07:15" }] },
  { id: "sm008", name: "土壤墒情站-SM08", type: "土壤墒情站", farm: "白城牧场", lat: 45.608, lng: 122.850, online: true, status: "online",
    value: "墒情 41%", runtime: "715h", lastReport: "2026-05-22 08:24:40",
    readings: { soilMoist: 41, soilTemp: 18.6, soilPH: 6.7, conductivity: 0.78, depth10cm: 37, depth30cm: 43 },
    alerts: [] },
  { id: "sm009", name: "土壤墒情站-SM09", type: "土壤墒情站", farm: "镇南种羊场", lat: 45.862, lng: 123.208, online: true, status: "online",
    value: "墒情 43%", runtime: "705h", lastReport: "2026-05-22 08:26:40",
    readings: { soilMoist: 43, soilTemp: 18.9, soilPH: 7.1, conductivity: 0.80, depth10cm: 39, depth30cm: 44 },
    alerts: [] },
  { id: "sm010", name: "土壤墒情站-SM10", type: "土壤墒情站", farm: "白城牧场", lat: 45.620, lng: 122.860, online: true, status: "online",
    value: "墒情 39%", runtime: "740h", lastReport: "2026-05-22 08:25:50",
    readings: { soilMoist: 39, soilTemp: 18.2, soilPH: 6.6, conductivity: 0.77, depth10cm: 34, depth30cm: 41 },
    alerts: [] },
  // ---- 智能水阀 (4) ----
  { id: "vl001", name: "智能水阀-VL01", type: "智能水阀", farm: "白城牧场", lat: 45.626, lng: 122.840, online: true, status: "online",
    value: "开 68%", runtime: "126h", lastReport: "2026-05-22 08:32:00",
    readings: { openPct: 68, flowRate: 2.4, pressure: 0.35, totalFlow: 1280.5 },
    alerts: [{ level: "info", text: "流量低于正常范围", time: "2026-05-22 06:00" }] },
  { id: "vl002", name: "智能水阀-VL02", type: "智能水阀", farm: "白城牧场", lat: 45.612, lng: 122.832, online: true, status: "online",
    value: "开 100%", runtime: "132h", lastReport: "2026-05-22 08:31:45",
    readings: { openPct: 100, flowRate: 3.8, pressure: 0.42, totalFlow: 2150.2 },
    alerts: [{ level: "warning", text: "累计流量超2000m³，建议检查管道密封", time: "2026-05-22 08:31" }] },
  { id: "vl003", name: "智能水阀-VL03", type: "智能水阀", farm: "镇南种羊场", lat: 45.852, lng: 123.212, online: true, status: "online",
    value: "开 55%", runtime: "118h", lastReport: "2026-05-22 08:30:20",
    readings: { openPct: 55, flowRate: 1.9, pressure: 0.30, totalFlow: 980.3 },
    alerts: [] },
  { id: "vl004", name: "智能水阀-VL04", type: "智能水阀", farm: "镇南种羊场", lat: 45.845, lng: 123.202, online: false, status: "offline",
    value: "--", runtime: "115h", lastReport: "2026-05-21 20:00:00",
    readings: null,
    alerts: [{ level: "warning", text: "设备离线超过8小时", time: "2026-05-22 04:00" }] },
  // ---- 摄像头 (2) ----
  { id: "ca001", name: "摄像头-CA01", type: "摄像头", farm: "白城牧场", lat: 45.630, lng: 122.844, online: true, status: "online",
    value: "正常录像", runtime: "2200h", lastReport: "2026-05-22 08:32:10",
    readings: { resolution: "1080P", fps: 25, storageUsed: 68, signalStrength: 92 },
    alerts: [{ level: "info", text: "存储空间使用68%，请及时清理历史录像", time: "2026-05-22 08:32" }] },
  { id: "ca002", name: "摄像头-CA02", type: "摄像头", farm: "镇南种羊场", lat: 45.860, lng: 123.205, online: true, status: "online",
    value: "正常录像", runtime: "2180h", lastReport: "2026-05-22 08:31:55",
    readings: { resolution: "1080P", fps: 25, storageUsed: 72, signalStrength: 88 },
    alerts: [] },
  // ---- 监测类新增 ----
  { id: "ph001", name: "养分酸碱度传感器-PH01", type: "养分酸碱度传感器", farm: "白城牧场", lat: 45.622, lng: 122.838, online: true, status: "online",
    value: "pH 6.8", runtime: "520h", lastReport: "2026-05-22 08:20:00",
    readings: { soilPH: 6.8, soilTemp: 18.5, conductivity: 0.82 },
    alerts: [] },
  { id: "sp001", name: "孢子捕捉仪-SP01", type: "孢子捕捉仪", farm: "镇南种羊场", lat: 45.848, lng: 123.198, online: true, status: "online",
    value: "孢子数 12", runtime: "380h", lastReport: "2026-05-22 08:15:00",
    readings: { sporeCount: 12, risk: "低" },
    alerts: [{ level: "info", text: "孢子数较上周上升50%，需持续监测", time: "2026-05-22 08:15" }] },
  { id: "ic001", name: "虫情测报设备-IC01", type: "虫情测报设备", farm: "白城牧场", lat: 45.615, lng: 122.848, online: true, status: "online",
    value: "虫量 3头", runtime: "450h", lastReport: "2026-05-22 08:18:00",
    readings: { insectCount: 3, species: "玉米螟" },
    alerts: [{ level: "warning", text: "诱捕玉米螟成虫3头，建议田间调查", time: "2026-05-22 08:18" }] },
  { id: "dr001", name: "遥感无人机-DR01", type: "遥感无人机", farm: "白城牧场", lat: 45.635, lng: 122.820, online: true, status: "online",
    value: "飞行中", runtime: "280h", lastReport: "2026-05-22 08:30:00",
    readings: { flightAlt: 120, coverage: "85%", imageCount: 420 },
    alerts: [{ level: "info", text: "电池剩余35%，建议返航充电", time: "2026-05-22 08:30" }] },
  // ---- 作业机械类新增 ----
  { id: "tc001", name: "无人拖拉机-TC01", type: "无人拖拉机", farm: "白城牧场", lat: 45.620, lng: 122.855, online: true, status: "online",
    value: "作业中", runtime: "620h", lastReport: "2026-05-22 08:25:00",
    readings: { speed: 8.5, fuelLevel: 72, workingWidth: 6.2 },
    alerts: [] },
  { id: "sd001", name: "播种机-SD01", type: "播种机", farm: "镇南种羊场", lat: 45.855, lng: 123.210, online: true, status: "online",
    value: "待机", runtime: "480h", lastReport: "2026-05-22 07:50:00",
    readings: { seedRate: 0, speed: 0, hopperLevel: 85 },
    alerts: [] },
  { id: "hv001", name: "收割机-HV01", type: "收割机", farm: "白城牧场", lat: 45.628, lng: 122.812, online: true, status: "online",
    value: "待机", runtime: "520h", lastReport: "2026-05-22 07:30:00",
    readings: { cutWidth: 0, grainTank: 22, speed: 0 },
    alerts: [] },
  // ---- 灌溉植保类新增 ----
  { id: "wf001", name: "水肥一体机-WF01", type: "水肥一体机", farm: "白城牧场", lat: 45.618, lng: 122.845, online: true, status: "online",
    value: "运行中", runtime: "380h", lastReport: "2026-05-22 08:22:00",
    readings: { flowRate: 3.2, mixRatio: "1:500", pressure: 0.38 },
    alerts: [{ level: "info", text: "肥液混合比例偏差2%，已自动校准", time: "2026-05-22 07:00" }] },
  { id: "sp001b", name: "无人植保机-SP02", type: "无人植保机", farm: "镇南种羊场", lat: 45.850, lng: 123.215, online: true, status: "online",
    value: "充电中", runtime: "190h", lastReport: "2026-05-22 08:10:00",
    readings: { battery: 95, tankLevel: 100, sprayWidth: 8 },
    alerts: [{ level: "info", text: "电池已充满，可执行植保作业", time: "2026-05-22 08:10" }] },
  { id: "ik001", name: "杀虫防控设备-IK01", type: "杀虫防控设备", farm: "白城牧场", lat: 45.612, lng: 122.835, online: true, status: "online",
    value: "监测中", runtime: "720h", lastReport: "2026-05-22 08:28:00",
    readings: { pestCount: 5, lampStatus: "正常", trapCount: 2 },
    alerts: [{ level: "info", text: "本月累计诱杀害虫128只，诱杀效率正常", time: "2026-05-22 08:28" }] }
];

/** 设备告警汇总列表（供右侧面板展示） */
const YZT_DEVICE_ALERTS = [
  { id: "da001", deviceId: "vl001", deviceName: "智能水阀-VL01", level: "info", title: "流量异常", text: "智能水阀-VL01 流量低于正常范围，当前2.4m³/h", time: "2026-05-22 13:40" },
  { id: "da002", deviceId: "sm007", deviceName: "土壤墒情站-SM07", level: "danger", title: "数据异常", text: "土壤墒情站-SM07 传感器故障，所有读数超出正常范围，需立即检修", time: "2026-05-22 12:15" },
  { id: "da003", deviceId: "ws006", deviceName: "气象站-WS06", level: "warning", title: "设备离线", text: "气象站-WS06 离线超过12小时，最后上报时间 2026-05-21 14:22", time: "2026-05-22 02:22" },
  { id: "da004", deviceId: "sm005", deviceName: "土壤墒情站-SM05", level: "warning", title: "设备离线", text: "土壤墒情站-SM05 离线超过12小时，最后上报时间 2026-05-21 18:30", time: "2026-05-22 06:30" },
  { id: "da005", deviceId: "vl004", deviceName: "智能水阀-VL04", level: "warning", title: "设备离线", text: "智能水阀-VL04 离线超过8小时，可能影响灌溉计划", time: "2026-05-22 04:00" },
  { id: "da006", deviceId: "ws003", deviceName: "气象站-WS03", level: "info", title: "高温预警", text: "气象站-WS03 监测温度24.8°C，预计午后将升至28°C以上，请关注作物蒸散", time: "2026-05-22 08:31" },
  { id: "da007", deviceId: "sm001", deviceName: "土壤墒情站-SM01", level: "info", title: "墒情偏高", text: "土壤墒情站-SM01 10cm土壤湿度42%，前期降雨导致墒情偏高，建议延迟灌溉", time: "2026-05-22 08:25" },
  { id: "da008", deviceId: "sm002", deviceName: "土壤墒情站-SM02", level: "warning", title: "墒情不足", text: "土壤墒情站-SM02 10cm土壤湿度仅35%，30cm湿度40%，建议72小时内启动灌溉", time: "2026-05-22 07:30" },
  { id: "da009", deviceId: "ws001", deviceName: "气象站-WS01", level: "danger", title: "大风预警", text: "气象站-WS01 监测瞬时风速达8.5m/s（5级），预计今晚将增强至6-7级，请注意防护", time: "2026-05-22 08:30" },
  { id: "da010", deviceId: "ph001", deviceName: "养分酸碱度传感器-PH01", level: "info", title: "土壤酸化趋势", text: "养分酸碱度传感器-PH01 pH值6.8，较上月下降0.3，连续监测3个月呈下降趋势", time: "2026-05-22 08:20" },
  { id: "da011", deviceId: "ic001", deviceName: "虫情测报设备-IC01", level: "warning", title: "虫害预警", text: "虫情测报设备-IC01 诱捕到玉米螟成虫3头，较上周增加200%，建议田间调查", time: "2026-05-22 08:18" },
  { id: "da012", deviceId: "sp001", deviceName: "孢子捕捉仪-SP01", level: "info", title: "孢子增量", text: "孢子捕捉仪-SP01 24小时孢子数12个，较上周均值（8个）上升50%，需持续监测", time: "2026-05-22 08:15" }
];

/** 设备筛选状态 */
const YZT_IOT_FILTERS = {
  types: ["气象站", "土壤墒情站", "智能水阀", "摄像头", "养分酸碱度传感器", "孢子捕捉仪", "虫情测报设备", "监控", "遥感无人机", "无人拖拉机", "播种机", "收割机", "田间转运车", "水肥一体机", "灌溉管件阀门", "无人植保机", "杀虫防控设备"],
  statuses: ["online", "offline", "fault"]
};

/** 设备类型 → 展示分类映射（三大类） */
const IOT_CATEGORY_ORDER = ["监测类", "作业机械类", "灌溉植保类"];
const IOT_CATEGORY_MAP = {
  "土壤墒情站":       { cat: "监测类", icon: "soil",   color: "#B388FF" },
  "养分酸碱度传感器":  { cat: "监测类", icon: "pheno",  color: "#536DFE" },
  "孢子捕捉仪":       { cat: "监测类", icon: "insect", color: "#E040FB" },
  "虫情测报设备":     { cat: "监测类", icon: "insect", color: "#AB47BC" },
  "气象站":           { cat: "监测类", icon: "weather",color: "#FF9F1C" },
  "监控":             { cat: "监测类", icon: "camera", color: "#FFB800" },
  "遥感无人机":        { cat: "监测类", icon: "drone",  color: "#00D4FF" },
  "无人拖拉机":        { cat: "作业机械类", icon: "tractor", color: "#00C853" },
  "播种机":           { cat: "作业机械类", icon: "seeder",  color: "#64DD17" },
  "收割机":           { cat: "作业机械类", icon: "harvester", color: "#FFD600" },
  "田间转运车":        { cat: "作业机械类", icon: "transporter", color: "#FF9100" },
  "水肥一体机":        { cat: "灌溉植保类", icon: "fertigation", color: "#00B4D8" },
  "灌溉管件阀门":      { cat: "灌溉植保类", icon: "valve",      color: "#48CAE4" },
  "无人植保机":        { cat: "灌溉植保类", icon: "sprayer",    color: "#7C4DFF" },
  "杀虫防控设备":      { cat: "灌溉植保类", icon: "lamp",       color: "#FF5252" },
  "摄像头":           { cat: "监测类", icon: "camera", color: "#FFB800" },
  "智能水阀":          { cat: "灌溉植保类", icon: "valve", color: "#00B4D8" },
  "水质监测":          { cat: "监测类", icon: "water",  color: "#00B4D8" },
  "增氧机":            { cat: "灌溉植保类", icon: "pump",   color: "#00D4FF" },
  "水位监测":          { cat: "监测类", icon: "level",  color: "#48CAE4" },
  "尾水处理":          { cat: "灌溉植保类", icon: "waste",  color: "#90E0EF" },
  "北斗基站":          { cat: "监测类", icon: "beidou", color: "#00FF88" }
};
const YZT_DEVICE_CATEGORIES = ["监测类", "作业机械类", "灌溉植保类"];

/** 农场 → 设备标记色系 */
const YZT_FARM_DEVICE_COLORS = {
  "白城牧场":   "#00FF88",
  "镇南种羊场":  "#00D4FF"
};

/** 设备统计 */
function getIotStats(devices) {
  var total = 0;
  YZT_DEVICE_COUNTS.forEach(function(c) { total += c.count; });
  var online = Math.round(total * 0.92);
  var offline = total - online;
  var fault = Math.round(total * 0.03);
  var onlineRate = 92;
  if (devices && devices.length) {
    online = devices.filter(function(d) { return d.online; }).length;
    offline = devices.filter(function(d) { return !d.online && d.status === "offline"; }).length;
    fault = devices.filter(function(d) { return d.status === "fault"; }).length;
    total = devices.length;
    onlineRate = total ? Math.round(online / total * 100) : 0;
  }
  return { total: total, online: online, offline: offline, fault: fault, onlineRate: onlineRate };
}

const YZT_WEATHER = {
  temp: 23.6,
  humidity: 68,
  wind: "东南风 3级",
  precip: 0.2,
  soilTemp: 18.4,
  soilMoist: 42,
  forecast: [
    { day: "今天", high: 26, low: 15, weather: "晴", precip: 0 },
    { day: "明天", high: 24, low: 14, weather: "多云", precip: 10 },
    { day: "后天", high: 22, low: 13, weather: "小雨", precip: 60 },
    { day: "+3", high: 20, low: 12, weather: "阴", precip: 30 },
    { day: "+4", high: 25, low: 14, weather: "晴", precip: 0 }
  ],
  alerts: [
    { level: "yellow", text: "白城市：未来6小时有中到大雨，注意排涝" },
    { level: "blue", text: "镇南县：大风蓝色预警，平均风力5-6级" }
  ]
};

const YZT_ALERTS = [
  { type: "disaster", text: "【灾害预警】白城市洮北区发布暴雨黄色预警，请各农场做好排涝准备", warningId: "warn-001" },
  { type: "farm", text: "【农事提醒】全区玉米进入灌浆期，建议加强水肥管理" },
  { type: "disaster", text: "【灾害预警】镇南县发布大风蓝色预警，注意温室加固", warningId: "warn-002" },
  { type: "device", text: "【设备告警】白城牧场智能水阀-A12 流量异常，当前68%", deviceId: "dv001" }
];

/* 灾害预警 — 绑定具体地块 */
const YZT_DISASTER_WARNINGS = [
  {
    id: "warn-001", plotId: "plot-baicheng-0", farmId: "baicheng",
    level: "yellow", levelLabel: "黄色预警", type: "暴雨",
    title: "暴雨黄色预警", region: "白城市洮北区",
    text: "未来6小时将出现中到大雨，累计雨量40-60mm，请注意排涝。",
    publishTime: "2025-05-20 14:30", advice: "关闭排水闸门检查、加强低洼地块巡查"
  },
  {
    id: "warn-002", plotId: "plot-zhennan-1", farmId: "zhennan",
    level: "blue", levelLabel: "蓝色预警", type: "大风",
    title: "大风蓝色预警", region: "镇南县",
    text: "平均风力5-6级，阵风7级，请注意温室和大棚加固。",
    publishTime: "2025-05-20 13:15", advice: "加固棚膜、暂停无人机作业"
  }
];

function getWeatherForPlot(idx, farmName) {
  const base = YZT_WEATHER;
  return {
    temp: +(base.temp - (idx % 5) + (idx % 3)).toFixed(1),
    humidity: base.humidity - (idx % 12),
    wind: base.wind,
    precip: +(base.precip + (idx % 4) * 0.3).toFixed(1),
    soilTemp: +(base.soilTemp - (idx % 3)).toFixed(1),
    soilMoist: base.soilMoist - (idx % 8),
    station: `${farmName}气象站`
  };
}

function getDisasterForPlot(plotId) {
  return YZT_DISASTER_WARNINGS.find((w) => w.plotId === plotId);
}

function getWarningsForPlots(plotIds) {
  return YZT_DISASTER_WARNINGS.filter((w) => plotIds.includes(w.plotId));
}

const YZT_LAND_INPUT_CHART = {
  categories: ["已发证", "已登记待发证", "已确权未登记", "未确权"],
  area: [1860, 320, 180, 120],
  count: [892, 156, 98, 140]
};

/* 地图筛选模式：填充色 + 边界样式 */
const RIGHT_TYPE_COLORS = { "国有": "#00FF88", "集体": "#00D4FF", "承包": "#FFB800", "租赁": "#B388FF" };
const RENT_TYPE_COLORS = { "统种地": "#00FF88", "外租地": "#00D4FF", "个人地": "#FFB800" };
const HIGH_STD_COLORS = { "已完成": "#00FF88", "建设中": "#00D4FF", "规划中": "#FFB800", "非高标": "#6B7280" };
const SALINE_COLORS = { "轻度盐碱": "#FFE066", "中度盐碱": "#FF9F43", "重度盐碱": "#FF6B6B", "苏打盐碱": "#B388FF" };
const CROP_COLORS = { "玉米": "#00FF88", "大豆": "#00D4FF", "水稻": "#4FC3F7", "畜牧": "#FFB800", "果蔬": "#FF9F43", "中药材": "#B388FF", "杂粮": "#66FFBB", "牧草": "#00CC6A", "其他": "#9CA3AF" };

const USE_TYPE_BORDERS = {
  "耕地": { color: "#00FF88", weight: 3, dashArray: null },
  "林地": { color: "#B388FF", weight: 2, dashArray: "6 4" },
  "草地": { color: "#FFB800", weight: 2, dashArray: "10 5" },
  "园林": { color: "#4ADE80", weight: 2, dashArray: "4 4" },
  "商服用地": { color: "#F43F5E", weight: 2, dashArray: "2 4" },
  "工矿仓储用地": { color: "#94A3B8", weight: 2, dashArray: "8 4" },
  "住宅用地": { color: "#FB923C", weight: 2, dashArray: "12 4" },
  "特殊用地": { color: "#A78BFA", weight: 2, dashArray: "3 6" },
  "交通运输用地": { color: "#64748B", weight: 2, dashArray: "15 5 3 5" },
  "水域及水利设施用地": { color: "#00D4FF", weight: 2, dashArray: "12 6" },
  "公共管理与公共服务用地": { color: "#38BDF8", weight: 2, dashArray: "6 3" },
  "其他用地": { color: "#9CA3AF", weight: 1, dashArray: "3 3" }
};

const CERT_STATUS_COLORS = {
  "已发证": "#00FF88",
  "已登记待发证": "#00D4FF",
  "已确权未登记": "#FFB800",
  "未确权": "#FF6B6B"
};

/** 地图地块权籍填色（全局统一语义）：深绿 / 浅绿 / 青 / 橙 */
const MAP_CADASTRAL_LAYER_FILL = {
  已发证: "#047857",
  已登记待发证: "#6ee7b7",
  已登记未发证: "#6ee7b7",
  已确权未登记: "#0891b2",
  未确权: "#ea580c"
};

function getCadastralMapFillColor(certStatus) {
  if (!certStatus) return "#4b5563";
  return MAP_CADASTRAL_LAYER_FILL[certStatus] || "#4b5563";
}

const REMOTE_STATUS_COLORS = {
  "长势良好": "#00FF88",
  "正常": "#00D4FF",
  "需关注": "#FFB800",
  "异常": "#FF6B6B"
};

const MAP_BASE_MODES = [
  { id: "land", label: "权籍类型", fillKey: "rightType", fillMap: RIGHT_TYPE_COLORS, scope: "base" },
  { id: "cert", label: "确权状态", fillKey: "certStatus", fillMap: CERT_STATUS_COLORS, scope: "base" }
];

const MAP_PLANT_MODES = [
  { id: "crop", label: "作物分布", fillKey: "crop", fillMap: CROP_COLORS, scope: "planting" },
  { id: "remote", label: "遥感监测", fillKey: "remoteStatus", fillMap: REMOTE_STATUS_COLORS, scope: "planting" }
];

/** @deprecated 兼容旧引用 */
const MAP_FILTER_MODES = [...MAP_BASE_MODES, ...MAP_PLANT_MODES];

const YZT_LAYER_LEGEND = {
  land: LAND_RIGHT_TYPES.map((t) => ({ label: t, color: RIGHT_TYPE_COLORS[t] })),
  cert: YZT_LAND_INPUT_CHART.categories.map((t) => ({
    label: t,
    color: typeof MAP_CADASTRAL_LAYER_FILL !== "undefined" ? MAP_CADASTRAL_LAYER_FILL[t] : CERT_STATUS_COLORS[t]
  })),
  rent: RENT_TYPES.map((t) => ({ label: t, color: RENT_TYPE_COLORS[t] })),
  highStd: HIGH_STD_STATUS.map((t) => ({ label: t, color: HIGH_STD_COLORS[t] })),
  saline: SALINE_TYPES.map((t) => ({ label: t, color: SALINE_COLORS[t] })),
  crop: Object.entries(CROP_COLORS).slice(0, 6).map(([label, color]) => ({ label, color })),
  remote: Object.entries(REMOTE_STATUS_COLORS).map(([label, color]) => ({ label, color })),
  useBorder: Object.entries(USE_TYPE_BORDERS).map(([label, b]) => ({ label, color: b.color })),
  iot: [
    { label: "在线", color: "#00FF88" },
    { label: "离线", color: "#FF6B6B" }
  ]
};

/** 读取地块本底属性（土地资源、确权边界） */
function getPlotBase(plot) {
  return plot.base || plot;
}

/** 读取地块种植经营属性（作物、遥感等） */
function getPlotPlanting(plot) {
  return plot.planting || plot;
}

/** 合并本底 + 种植字段，供统计/兼容旧逻辑 */
function getPlotFlat(plot) {
  return { ...getPlotBase(plot), ...getPlotPlanting(plot) };
}

function filterByPermission(farmIds) {
  return SUBSIDIARIES.filter((s) => farmIds.includes(s.id));
}

/** 统计/筛选用图斑（不直接绘制农场范围面） */
const FARM_LAND_USE_PATCHES = [
  { useType: "耕地", radius: 0.26, offset: [-0.02, 0.01], seed: 1.15, areaRatio: 0.52 },
  { useType: "草地", radius: 0.14, offset: [0.2, 0.08], seed: 2.35, areaRatio: 0.16 },
  { useType: "林地", radius: 0.11, offset: [-0.16, 0.12], seed: 3.42, areaRatio: 0.12 },
  { useType: "建设用地", radius: 0.09, offset: [0.12, -0.06], seed: 5.12, areaRatio: 0.1 },
  { useType: "水域", radius: 0.07, offset: [0.08, -0.14], seed: 4.68, areaRatio: 0.05 }
];

/** 地图底图（仅一层卫星瓦片，避免多源叠加变慢） */
const MAP_BASE_TILE = {
  url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  options: {
    maxZoom: 16,
    minZoom: 6,
    keepBuffer: 2,
    updateWhenIdle: true,
    updateWhenZooming: false
  }
};

/** 西片勾勒范围：覆盖白城牧场、镇南种羊场（含边距） */
function getWestFarmBaselineBounds() {
  const ids = ["baicheng", "zhennan"];
  const farms = ids.map((id) => SUBSIDIARIES.find((s) => s.id === id)).filter(Boolean);
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  farms.forEach((s) => {
    minLat = Math.min(minLat, s.lat);
    maxLat = Math.max(maxLat, s.lat);
    minLng = Math.min(minLng, s.lng);
    maxLng = Math.max(maxLng, s.lng);
  });
  const padLat = 0.32;
  const padLng = 0.42;
  return [
    [minLat - padLat, minLng - padLng],
    [maxLat + padLat, maxLng + padLng]
  ];
}

const LAND_BASELINE_BOUNDS = getWestFarmBaselineBounds();

/** 土地资源默认视野：西片两农场居中 */
const MAP_LAND_VIEW = {
  center: [
    (SUBSIDIARIES.find((s) => s.id === "baicheng").lat + SUBSIDIARIES.find((s) => s.id === "zhennan").lat) / 2,
    (SUBSIDIARIES.find((s) => s.id === "baicheng").lng + SUBSIDIARIES.find((s) => s.id === "zhennan").lng) / 2
  ],
  zoom: 9
};

/** 土地资源 · 勾勒底线（透明 PNG，对齐西片农场范围） */
const LAND_BASELINE_LINE_STYLE = {
  width: 2579,
  height: 1432,
  opacity: 1,
  background: "rgba(249, 243, 243, 0)",
  border: "5px dashed #FFFFFF",
  boxShadow: "20px 4px 200px rgba(0, 0, 0, 0.302)"
};

const LAND_BASELINE_OVERLAY = {
  url: null,
  bounds: LAND_BASELINE_BOUNDS,
  opacity: LAND_BASELINE_LINE_STYLE.opacity,
  style: LAND_BASELINE_LINE_STYLE
};

const FARM_STATS_PARCEL_COUNT = {
  baicheng: 86,
  zhennan: 72,
  changlin: 60
};

/** 农场所属行政区（权籍调查面积按行政区统计） */
const FARM_ADMIN_REGION = {
  baicheng: "白城市",
  zhennan: "镇南县"
};

/** 行政区权籍调查目标面积（万公顷），用于完成率 */
const LAND_ADMIN_REGION_TARGETS = {
  "白城市": 85,
  "镇南县": 72
};

/** 土地利用堆叠顺序（分组水平堆叠条） */
const LAND_USE_STACK_ORDER = ["耕地", "草地", "林地", "建设用地"];

/** 宗地类型 100% 堆叠条顺序（水域/林地等并入「其他」） */
const LAND_PARCEL_TYPE_ORDER = ["耕地", "建设用地", "其他", "草地"];

/** 土地资源 · 农场下钻精准展示数据（万亩 / 占比） */
/** 挂载到 window，确保下钻脚本可读取 */
/** 农场下钻面板语义色：深绿=已完成，浅绿=进行中，青=待处理，橙=预警，灰=基线 */
const FARM_DRILL_LAND_USE_COLORS = {
  耕地: "#047857",
  草地: "#6ee7b7",
  其他: "#0891b2",
  建设用地: "#4b5563"
};

const FARM_DRILL_CERT_COLORS = {
  已发证: "#047857",
  已登记待发证: "#6ee7b7",
  已确权未登记: "#0891b2",
  未确权: "#ea580c",
  总面积: "#4b5563"
};

const FARM_LAND_DRILL = {
  baicheng: {
    name: "白城牧场",
    location: "白城市洮北区平安镇",
    totalAreaMu: 184.3,
    cropAreaMu: 100.0,
    cropPct: 54.2,
    certCompletePct: 14.5,
    plotCount: 86,
    landUseConclusion: "耕地占比54.2%，土地结构稳定",
    certHeroLabel: "总完成率（已发证）",
    certConclusion: "确权进度需持续推进，建议加快登记与颁证衔接",
    villageConclusion: "2个行政村完成率低于15%，需重点督导",
    landUse: [
      { name: "耕地", pct: 54.2, areaMu: 99.9 },
      { name: "其他", pct: 18.3, areaMu: 33.7 },
      { name: "草地", pct: 16.6, areaMu: 30.6 },
      { name: "建设用地", pct: 10.9, areaMu: 20.1 }
    ],
    certWaterfall: [
      { kind: "bar", label: "总面积", areaMu: 184.3, sharePct: 100.0, color: FARM_DRILL_CERT_COLORS.总面积 },
      { kind: "seg", label: "已发证", areaMu: 26.7, sharePct: 14.5, color: FARM_DRILL_CERT_COLORS.已发证 },
      { kind: "seg", label: "已登记未发证", areaMu: 26.3, sharePct: 14.3, color: FARM_DRILL_CERT_COLORS.已登记待发证 },
      { kind: "seg", label: "已确权未登记", areaMu: 24.7, sharePct: 13.4, color: FARM_DRILL_CERT_COLORS.已确权未登记 },
      { kind: "seg", label: "未确权", areaMu: 106.6, sharePct: 57.8, color: FARM_DRILL_CERT_COLORS.未确权 }
    ],
    villages: [
      { name: "平安村", rate: 9.2 },
      { name: "青山村", rate: 11.4 },
      { name: "平台村", rate: 13.8 },
      { name: "洮北村", rate: 15.2 },
      { name: "三联村", rate: 17.6 }
    ],
    certParcelCounts: {
      已发证: 12,
      已登记未发证: 12,
      已确权未登记: 12,
      未确权: 50
    }
  },
  zhennan: {
    name: "镇南种羊场",
    location: "白城市镇南县",
    totalAreaMu: 139.8,
    cropAreaMu: 75.6,
    cropPct: 54.1,
    certCompletePct: 12.9,
    plotCount: 72,
    landUseConclusion: "耕地占比54.1%，土地结构稳定",
    certHeroLabel: "总完成率（已发证）",
    certConclusion: "确权进度偏慢，剩余未确权86.2万亩，需重点推进",
    villageConclusion: "3个行政村完成率低于15%，需重点督导",
    landUse: [
      { name: "耕地", pct: 54.1, areaMu: 75.6 },
      { name: "其他", pct: 18.5, areaMu: 25.9 },
      { name: "草地", pct: 16.5, areaMu: 23.1 },
      { name: "建设用地", pct: 10.9, areaMu: 15.2 }
    ],
    certWaterfall: [
      { kind: "bar", label: "总面积", areaMu: 139.8, sharePct: 100.0, color: FARM_DRILL_CERT_COLORS.总面积 },
      { kind: "seg", label: "已发证", areaMu: 18.0, sharePct: 12.9, color: FARM_DRILL_CERT_COLORS.已发证 },
      { kind: "seg", label: "已登记未发证", areaMu: 18.3, sharePct: 13.1, color: FARM_DRILL_CERT_COLORS.已登记待发证 },
      { kind: "seg", label: "已确权未登记", areaMu: 17.3, sharePct: 12.4, color: FARM_DRILL_CERT_COLORS.已确权未登记 },
      { kind: "seg", label: "未确权", areaMu: 86.2, sharePct: 61.6, color: FARM_DRILL_CERT_COLORS.未确权 }
    ],
    villages: [
      { name: "永治村", rate: 8.7 },
      { name: "新风村", rate: 10.2 },
      { name: "友谊村", rate: 13.5 },
      { name: "建平村", rate: 15.1 },
      { name: "坦途村", rate: 16.5 }
    ],
    /** 地图「筛选统计」与权籍分项块数（整数，合计等于 plotCount） */
    certParcelCounts: {
      已发证: 9,
      已登记未发证: 9,
      已确权未登记: 9,
      未确权: 45
    }
  },
  changlin: {
    name: "长岭种马场",
    location: "松原市长岭县",
    totalAreaMu: 148.5,
    cropAreaMu: 82.3,
    cropPct: 55.4,
    certCompletePct: 13.2,
    plotCount: 60,
    landUseConclusion: "耕地占比55.4%，土地结构稳定",
    certHeroLabel: "总完成率（已发证）",
    certConclusion: "确权进度待加快，未确权面积占比较大，需重点推进",
    villageConclusion: "2个行政村完成率偏低，需加强督导",
    landUse: [
      { name: "耕地", pct: 55.4, areaMu: 82.3 },
      { name: "其他", pct: 17.8, areaMu: 26.4 },
      { name: "草地", pct: 15.2, areaMu: 22.6 },
      { name: "建设用地", pct: 11.6, areaMu: 17.2 }
    ],
    certWaterfall: [
      { kind: "bar", label: "总面积", areaMu: 148.5, sharePct: 100.0, color: FARM_DRILL_CERT_COLORS.总面积 },
      { kind: "seg", label: "已发证", areaMu: 19.6, sharePct: 13.2, color: FARM_DRILL_CERT_COLORS.已发证 },
      { kind: "seg", label: "已登记未发证", areaMu: 22.3, sharePct: 15.0, color: FARM_DRILL_CERT_COLORS.已登记待发证 },
      { kind: "seg", label: "已确权未登记", areaMu: 20.1, sharePct: 13.5, color: FARM_DRILL_CERT_COLORS.已确权未登记 },
      { kind: "seg", label: "未确权", areaMu: 86.5, sharePct: 58.3, color: FARM_DRILL_CERT_COLORS.未确权 }
    ],
    villages: [
      { name: "长岭村", rate: 9.5 },
      { name: "太平村", rate: 11.8 },
      { name: "新发村", rate: 14.2 },
      { name: "永胜村", rate: 16.1 },
      { name: "兴隆村", rate: 17.3 }
    ],
    certParcelCounts: {
      已发证: 8,
      已登记未发证: 9,
      已确权未登记: 8,
      未确权: 35
    }
  }
};
if (typeof window !== "undefined") window.FARM_LAND_DRILL = FARM_LAND_DRILL;

/** 土地资源 · 左右栏五项数据分析标题 */
const LAND_ANALYSIS_CHARTS = {
  farmCadastral: "农场权籍调查面积统计",
  farmLandUse: "农场土地利用类型面积统计",
  parcelTypeRatio: "集团宗地类型占比分析",
  regionCadastral: "相关行政区权籍调查面积统计",
  groupCadastral: "集团权籍调查面积统计"
};

if (typeof getCadastralMapFillColor !== "function") {
  const CADASTRAL_MAP_FILL_COLORS = {
    "已发证": "#047857",
    "已登记待发证": "#6ee7b7",
    "已登记未发证": "#6ee7b7",
    "已确权未登记": "#0891b2",
    "未确权": "#ea580c"
  };
  window.getCadastralMapFillColor = function (certStatus) {
    if (!certStatus) return "#4b5563";
    return CADASTRAL_MAP_FILL_COLORS[certStatus] || "#4b5563";
  };
}

function getLandResourceZones(farmIds) {
  const zones = [];
  farmIds.forEach((id, fi) => {
    const s = SUBSIDIARIES.find((x) => x.id === id);
    if (!s) return;
    const count = FARM_STATS_PARCEL_COUNT[id] || 50;
    const farmArea = parseFloat(s.area);

    for (let i = 0; i < count; i++) {
      const patch = FARM_LAND_USE_PATCHES[i % FARM_LAND_USE_PATCHES.length];
      const layout = PLOT_FIELD_LAYOUT[i % PLOT_FIELD_LAYOUT.length];
      const idx = fi * 200 + i;
      const jitterLat = Math.sin(idx * 1.9) * patch.radius * 0.35;
      const jitterLng = Math.cos(idx * 2.2) * patch.radius * 0.42;
      const useType = patch.useType;
      const certStatus = YZT_LAND_INPUT_CHART.categories[idx % 4];
      const area = +(farmArea * patch.areaRatio / FARM_LAND_USE_PATCHES.length * (0.85 + (idx % 5) * 0.03)).toFixed(3);
      const plotCode = `JL-LD-${id.slice(0, 2).toUpperCase()}-${String(i + 1).padStart(4, "0")}`;
      const contractor = ["农垦集团", "家庭农场", "合作社", "种植大户"][idx % 4]
        + ` · ${["张某", "李某", "王某", "赵某"][(idx + i) % 4]}`;
      const certDeadline = certStatus === "未确权"
        ? "—"
        : `202${(idx % 4) + 6}-${String(((idx + i) % 9) + 1).padStart(2, "0")}-${String(((idx * 3 + i) % 26) + 1).padStart(2, "0")}`;

      zones.push({
        id: `stat-${id}-${i}`,
        zoneType: "use-patch",
        farmId: id,
        farmName: s.name,
        zoneName: `宗地${10001 + (idx % 8999)}`,
        plotCode,
        lat: s.lat + patch.offset[0] + jitterLat,
        lng: s.lng + patch.offset[1] + jitterLng,
        area,
        parcelW: layout.hw * (0.72 + (idx % 4) * 0.04),
        parcelH: layout.hh * (0.72 + (idx % 3) * 0.05),
        fieldSeed: s.lat * 3.1 + s.lng * 2.7 + idx * 0.83,
        base: {
          rightType: LAND_RIGHT_TYPES[idx % 4],
          useType,
          certStatus,
          rentType: RENT_TYPES[idx % 3],
          highStd: HIGH_STD_STATUS[idx % 4],
          saline: null,
          boundaryCode: plotCode,
          confirmedArea: certStatus === "未确权" ? null : +(area * 0.92).toFixed(3),
          contractor,
          certDeadline
        }
      });
    }
  });
  return zones;
}

/** 种植地块散落布局（矩形田块，非整齐网格） */
const PLOT_FIELD_LAYOUT = [
  { dl: 0.012, dg: -0.008, hw: 0.016, hh: 0.012 },
  { dl: -0.018, dg: 0.022, hw: 0.014, hh: 0.01 },
  { dl: 0.034, dg: 0.014, hw: 0.018, hh: 0.013 },
  { dl: -0.008, dg: -0.028, hw: 0.013, hh: 0.011 },
  { dl: 0.042, dg: -0.018, hw: 0.015, hh: 0.012 },
  { dl: -0.032, dg: -0.006, hw: 0.017, hh: 0.014 },
  { dl: 0.022, dg: 0.032, hw: 0.012, hh: 0.009 },
  { dl: -0.024, dg: 0.038, hw: 0.016, hh: 0.011 },
  { dl: 0.048, dg: 0.026, hw: 0.014, hh: 0.01 },
  { dl: 0.006, dg: -0.042, hw: 0.015, hh: 0.012 },
  { dl: -0.044, dg: 0.016, hw: 0.013, hh: 0.01 },
  { dl: 0.038, dg: -0.036, hw: 0.016, hh: 0.012 }
];

function getPlotsForFarms(farmIds) {
  const plots = [];
  farmIds.forEach((id, fi) => {
    const s = SUBSIDIARIES.find((x) => x.id === id);
    if (!s) return;
    const count = fi === 0 ? 10 : 8;
    let plotNo = 108 + fi * 20;

    for (let j = 0; j < count; j++) {
      const layout = PLOT_FIELD_LAYOUT[(fi * 3 + j) % PLOT_FIELD_LAYOUT.length];
      const idx = fi * 12 + j;
      const jitterLat = Math.sin(idx * 1.7 + fi) * 0.004;
      const jitterLng = Math.cos(idx * 2.1 + fi) * 0.005;
      plotNo += 1;
      const cropName = j === 0 ? s.crop : YZT_CROPS[idx % YZT_CROPS.length].name;
      const cropMeta = YZT_CROPS.find((item) => item.name === cropName) || YZT_CROPS[0];
      const certStatus = YZT_LAND_INPUT_CHART.categories[idx % 4];
      const area = +(parseFloat(s.area) / (count * 2.8)).toFixed(2);
      const contractor = ["农垦集团", "家庭农场", "合作社", "种植大户"][(idx + j) % 4] + ` · ${["张某", "李某", "王某", "赵某"][(idx + j * 2) % 4]}`;
      const confirmDeadline =
        certStatus === "未确权"
          ? "—"
          : `202${(idx % 4) + 6}-${String(((idx + j) % 9) + 1).padStart(2, "0")}-${String(((idx * 3 + j) % 26) + 1).padStart(2, "0")}`;

      plots.push({
        id: `plot-${id}-${j}`,
        farmId: id,
        farmName: s.name,
        plotName: `${plotNo}号地`,
        plotLabel: `${plotNo}号地`,
        lat: s.lat + layout.dl + jitterLat,
        lng: s.lng + layout.dg + jitterLng,
        area,
        parcelW: layout.hw,
        parcelH: layout.hh,
        fieldSeed: s.lat * 3.1 + s.lng * 2.7 + idx * 0.83,
        base: {
          rightType: LAND_RIGHT_TYPES[idx % 4],
          useType: "耕地",
          certStatus,
          rentType: RENT_TYPES[idx % 3],
          highStd: HIGH_STD_STATUS[idx % 4],
          saline: null,
          boundaryCode: `JL-NF-${id.slice(0, 2).toUpperCase()}-${String(plotNo).padStart(3, "0")}`,
          confirmedArea: certStatus === "未确权" ? null : +(area * 0.94).toFixed(2),
          contractor,
          confirmDeadline,
          issueDate: certStatus === "已发证" ? `202${(idx % 3) + 3}-06-12` : "—",
          registerDate: certStatus === "已发证" || certStatus === "已登记待发证" ? `202${(idx % 2) + 4}-03-20` : "—",
          confirmDate: certStatus !== "未确权" ? `202${(idx % 2) + 5}-08-01` : "—",
          eastTo: "邻接耕地",
          southTo: "田间路",
          westTo: "排水渠",
          northTo: "集体地界"
        },
        planting: {
          crop: cropName,
          variety: cropMeta.varieties[idx % cropMeta.varieties.length],
          sowProgress: 68 + (idx % 28),
          harvestProgress: idx % 2 === 0 ? 42 + (idx % 35) : 0,
          sowDate: `2025-0${(idx % 4) + 4}-${10 + (idx % 18)}`,
          expectedYield: +(420 + idx * 18).toFixed(0),
          ndvi: +(0.62 + (idx % 8) * 0.04).toFixed(2),
          remoteStatus: ["长势良好", "正常", "需关注", "异常"][idx % 4],
          remoteDate: "2025-05-18"
        },
        weather: getWeatherForPlot(idx, s.name)
      });
    }
  });
  return plots;
}
