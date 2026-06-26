/* 种植经营 — 模拟数据 */

const PLANT_SUB_TABS = [
  { id: "crop-dist", label: "作物分布" },
  { id: "variety", label: "品种明细" },
  { id: "sowing", label: "播种进度" },
  { id: "harvest", label: "秋收进度" },
  { id: "remote", label: "遥感检测" },
  { id: "weather", label: "气象监测" }
];

/* 作物品种明细 */
const CROP_VARIETY_DETAIL = {
  "玉米": {
    varieties: ["先玉335", "郑单958", "吉单27", "良玉99", "京科968"],
    colorBase: "#00FF88",
    plantAreaPlan: 720, plantAreaDone: 680,
    traits: { yield: "高", resist: "抗倒伏/抗病", days: "125-130天", water: "中" }
  },
  "大豆": {
    varieties: ["吉农17", "东生7号", "黑农48", "合丰55"],
    colorBase: "#00D4FF",
    plantAreaPlan: 450, plantAreaDone: 420,
    traits: { yield: "中高", resist: "抗病", days: "110-118天", water: "中" }
  },
  "水稻": {
    varieties: ["吉粳88", "通系933", "吉粳816", "九稻68"],
    colorBase: "#4FC3F7",
    plantAreaPlan: 400, plantAreaDone: 380,
    traits: { yield: "高", resist: "耐寒", days: "135-142天", water: "高" }
  },
  "杂粮": {
    varieties: ["高粱-红缨子", "谷子-晋谷21", "绿豆-中绿1号"],
    colorBase: "#66FFBB",
    plantAreaPlan: 280, plantAreaDone: 260,
    traits: { yield: "中", resist: "耐旱", days: "95-110天", water: "低" }
  },
  "牧草": {
    varieties: ["苜蓿-WL343", "黑麦草-冬牧70", "燕麦草"],
    colorBase: "#00CC6A",
    plantAreaPlan: 240, plantAreaDone: 220,
    traits: { yield: "高", resist: "耐寒", days: "多年生", water: "低" }
  },
  "其他": {
    varieties: ["中药材-黄芪", "果蔬-番茄", "甜菜"],
    colorBase: "#9CA3AF",
    plantAreaPlan: 180, plantAreaDone: 168,
    traits: { yield: "—", resist: "—", days: "—", water: "—" }
  }
}

/* 累计投入对比数据 */
const PLANT_INVEST_DATA = {
  categories: ["种子","化肥","农药","柴油","汽油","人工","机械作业","设备维修保养","灌溉水电","仓储","运输","其他杂费"],
  farms: {
    "白城牧场": { 种子: 286, 化肥: 452, 农药: 138, 柴油: 95, 汽油: 42, 人工: 320, 机械作业: 185, 设备维修保养: 68, 灌溉水电: 54, 仓储: 38, 运输: 72, 其他杂费: 45 },
    "镇南种羊场": { 种子: 210, 化肥: 380, 农药: 112, 柴油: 78, 汽油: 35, 人工: 265, 机械作业: 152, 设备维修保养: 55, 灌溉水电: 42, 仓储: 28, 运输: 58, 其他杂费: 32 },
    "长岭种马场": { 种子: 248, 化肥: 415, 农药: 125, 柴油: 86, 汽油: 38, 人工: 290, 机械作业: 168, 设备维修保养: 60, 灌溉水电: 48, 仓储: 32, 运输: 65, 其他杂费: 38 }
  },
  /* 农资/燃油/其他 三大类汇总（万元） */
  summary: {
    "白城牧场": { 农资: 876, 燃油: 137, 其他: 882 },
    "镇南种羊场": { 农资: 702, 燃油: 113, 其他: 732 },
    "长岭种马场": { 农资: 788, 燃油: 124, 其他: 801 }
  }
};;

/* 各作物各品种按地块分配（模拟） */
const CROP_VARIETY_PER_PLOT = {
  "玉米": { v: ["先玉335","郑单958","吉单27","良玉99","京科968"], ratio: [0.28,0.22,0.2,0.18,0.12] },
  "大豆": { v: ["吉农17","东生7号","黑农48","合丰55"], ratio: [0.3,0.25,0.25,0.2] },
  "水稻": { v: ["吉粳88","通系933","吉粳816","九稻68"], ratio: [0.28,0.25,0.25,0.22] },
  "杂粮": { v: ["高粱-红缨子","谷子-晋谷21","绿豆-中绿1号"], ratio: [0.35,0.35,0.3] },
  "牧草": { v: ["苜蓿-WL343","黑麦草-冬牧70","燕麦草"], ratio: [0.4,0.35,0.25] },
  "其他": { v: ["中药材-黄芪","果蔬-番茄","甜菜"], ratio: [0.35,0.35,0.3] }
};

/* 播种进度详细数据 */
const SOWING_STATUS_VALS = ["未播", "播种中", "已完成"];
const SOWING_DELAY_REASONS = ["等待农机调度", "土壤墒情不足", "种子未到位", "天气影响暂缓"];

/* 各作物播种计划 */
const SOWING_PLAN = {
  "粮食": { plan: 820, done: 756, unit: "万亩" },
  "油料": { plan: 180, done: 168, unit: "万亩" },
  "经济作物": { plan: 120, done: 98, unit: "万亩" },
  "牧草": { plan: 220, done: 198, unit: "万亩" },
  "杂粮": { plan: 260, done: 228, unit: "万亩" }
};

/* 秋收进度详细数据 */
const HARVEST_STATUS_VALS = ["未收", "收获中", "已完成"];
const HARVEST_PLAN = {
  "玉米": { plant: 680, harvested: 546, remain: 134, pct: 80 },
  "大豆": { plant: 420, harvested: 316, remain: 104, pct: 75 },
  "水稻": { plant: 380, harvested: 228, remain: 152, pct: 60 },
  "杂粮": { plant: 260, harvested: 124, remain: 136, pct: 48 },
  "牧草": { plant: 220, harvested: 86, remain: 134, pct: 39 },
  "其他": { plant: 168, harvested: 52, remain: 116, pct: 31 }
};

/* 近7天秋收进度趋势 */
const HARVEST_TREND_7DAYS = {
  dates: ["5/16","5/17","5/18","5/19","5/20","5/21","5/22"],
  pct: [48.2, 50.5, 53.1, 55.8, 58.3, 61.2, 64.5]
};

/* 遥感检测指标 */
const REMOTE_INDICATORS = [
  { id: "nitrogen", label: "氮素(N)", unit: "mg/g", low: 15, high: 45, colors: ["#ff6b6b","#ffb800","#00ff88","#00d4ff"] },
  { id: "phosphorus", label: "磷素(P)", unit: "mg/g", low: 2, high: 12, colors: ["#ff6b6b","#ffb800","#00ff88","#00d4ff"] },
  { id: "potassium", label: "钾素(K)", unit: "mg/g", low: 8, high: 30, colors: ["#ff6b6b","#ffb800","#00ff88","#00d4ff"] },
  { id: "organic", label: "有机质", unit: "g/kg", low: 10, high: 40, colors: ["#8b4513","#cd853f","#daa520","#228b22"] },
  { id: "moisture", label: "土壤墒情", unit: "%", low: 15, high: 55, colors: ["#ffb800","#ffd700","#00ff88","#00d4ff"] },
  { id: "soilTemp", label: "土壤温度", unit: "°C", low: 5, high: 35, colors: ["#00d4ff","#00ff88","#ffb800","#ff6b6b"] },
  { id: "ndvi", label: "作物长势(NDVI)", unit: "", low: 0.2, high: 0.9, colors: ["#8b0000","#ff8c00","#32cd32","#006400"] },
  { id: "yieldEst", label: "估产(kg/亩)", unit: "kg", low: 200, high: 800, colors: ["#ff6b6b","#ffb800","#00ff88","#00d4ff"] }
];

/* 15天逐日气象预报 */
const WEATHER_FORECAST_15DAYS = (function() {
  const days = [];
  const base = new Date();
  for (let i = 0; i < 15; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    days.push({
      date: `${m}/${dd}`,
      high: +(22 + Math.sin(i * 0.8) * 8 + (i % 3) * 2).toFixed(0),
      low: +(10 + Math.sin(i * 0.6) * 5 + (i % 2) * 3).toFixed(0),
      weather: ["晴","多云","阴","小雨","晴","多云","晴","阵雨","多云","晴","晴","阴","小雨","多云","晴"][i],
      precip: [0, 5, 15, 2, 0, 8, 0, 3, 12, 0, 0, 5, 0, 8, 0][i],
      humidity: [55, 62, 78, 70, 52, 65, 48, 58, 80, 55, 45, 60, 72, 55, 42][i],
      wind: ["东南风2级","东风3级","南风4级","西风2级","东北风2级","南风3级","东风2级","西南风3级","北风4级","东风2级","南风2级","东风3级","西北风3级","东南风2级","东风2级"][i]
    });
  }
  return days;
})();

/* 5天土壤温湿度预报 */
const SOIL_5DAY_FORECAST = [
  { depth: "0-10cm", temp: [18.2, 17.8, 16.5, 15.8, 17.2], moist: [42, 44, 48, 50, 46] },
  { depth: "10-20cm", temp: [16.5, 16.2, 15.8, 15.2, 16.0], moist: [38, 40, 44, 46, 42] },
  { depth: "20-40cm", temp: [14.8, 14.5, 14.2, 13.8, 14.5], moist: [35, 37, 40, 42, 38] },
  { depth: "40-60cm", temp: [12.5, 12.3, 12.0, 11.8, 12.2], moist: [32, 34, 36, 38, 34] }
];

/* 气象灾害预警 */
const WEATHER_DISASTER_ALERTS = [
  { id: "wa-001", level: "red", type: "暴雨", title: "暴雨红色预警", region: "白城市洮北区", text: "预计未来3小时降雨量将达100毫米以上", time: "2025-05-22 08:30", advice: "立即启动防汛应急预案，暂停一切户外作业" },
  { id: "wa-002", level: "orange", type: "大风", title: "大风橙色预警", region: "镇南县", text: "平均风力8-9级，阵风可达10-11级", time: "2025-05-22 09:00", advice: "加固温室大棚，人员避免户外活动" },
  { id: "wa-003", level: "yellow", type: "冰雹", title: "冰雹黄色预警", region: "白城市", text: "预计未来6小时可能出现冰雹天气", time: "2025-05-22 10:15", advice: "做好防雹准备，检查作物覆盖设施" },
  { id: "wa-004", level: "blue", type: "低温", title: "低温蓝色预警", region: "镇南县东部", text: "预计夜间最低气温将降至5°C以下", time: "2025-05-22 16:00", advice: "注意苗期防寒，覆盖地膜保温" }
];

/* 生成遥感数据（按地块） */
function getRemoteDataForPlot(idx, cropName) {
  const baseVal = (idx * 1.7 + 10) % 28;
  return {
    nitrogen: +(25 + (idx % 18) - (idx % 5)).toFixed(1),
    phosphorus: +(6 + (idx % 8) - (idx % 3)).toFixed(1),
    potassium: +(16 + (idx % 12) - (idx % 4)).toFixed(1),
    organic: +(22 + (idx % 15) - (idx % 6)).toFixed(1),
    moisture: +(28 + (idx % 22) - (idx % 7)).toFixed(1),
    soilTemp: +(18 + (idx % 8) - (idx % 3)).toFixed(1),
    ndvi: +(0.55 + (idx % 30) * 0.012).toFixed(2),
    yieldEst: +(380 + (idx % 22) * 15 - (idx % 9) * 5).toFixed(0)
  };
}

/* 气象监测 — 按月模拟数据 */
var WEATHER_MONTHS = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
var WEATHER_YEAR_DATA = {
  /* 近一年（当前年，2026） */
  thisYear: {
    temp:     [-12, -8, 2, 10, 18, 24, 27, 25, 19, 10, 0, -8],
    humidity: [58, 55, 48, 45, 50, 58, 68, 72, 65, 58, 55, 60],
    rainfall: [3, 5, 12, 25, 48, 85, 150, 132, 55, 22, 10, 5],
    accumTemp: [0, 0, 60, 300, 558, 720, 837, 775, 570, 310, 0, 0],
    accumRain: [0, 0, 12, 37, 85, 170, 320, 452, 507, 529, 539, 544],
    et0:      [0.5, 0.8, 2.1, 3.5, 4.8, 5.6, 5.2, 4.5, 3.2, 1.8, 0.9, 0.4]
  },
  /* 近五年（2022-2026 平均） */
  fiveYear: {
    temp:     [-10, -7, 3, 11, 19, 25, 28, 26, 20, 11, 1, -7],
    humidity: [60, 56, 50, 46, 52, 60, 70, 73, 67, 60, 57, 62],
    rainfall: [4, 6, 14, 28, 52, 90, 160, 140, 60, 25, 12, 6],
    accumTemp: [0, 0, 90, 330, 570, 750, 868, 806, 600, 330, 0, 0],
    accumRain: [0, 0, 14, 42, 94, 184, 344, 484, 544, 569, 581, 587],
    et0:      [0.6, 0.9, 2.3, 3.8, 5.0, 5.8, 5.5, 4.8, 3.4, 2.0, 1.0, 0.5]
  }
};
