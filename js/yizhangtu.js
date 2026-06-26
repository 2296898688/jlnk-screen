(function () {
  "use strict";

  const BASE_W = 3840, BASE_H = 1920;
  const PAGE_TITLE_BASE = "农垦一张图";
  const MAP_DEFAULT = { center: [43.886, 126.55], zoom: 8 };
  const chartColors = ["#00FF88", "#00D4FF", "#FFB800", "#B388FF", "#FF9F43", "#FF6B6B"];
  const chartText = "rgba(160, 200, 230, 0.65)";
  /** 3840 画布侧栏图表字号（与 .yzt-dashboard 正文量级一致） */
  const LAND_FS = { axis: 32, label: 30, tip: 36, center: 44, hero: 56 };
  const LAND_ECHART_IDS = ["left-chart-2", "left-chart-3", "left-chart-2-farm", "left-chart-3-farm", "right-chart-cert-pie", "right-chart-cert-status"];
  /** 集团视图：环形图 + 瀑布图 + 右侧确权图表 */
  const LAND_ECHART_IDS_GROUP = ["left-chart-2", "left-chart-3", "right-chart-cert-pie", "right-chart-cert-status"];
  /** 农场下钻：左侧环形图 + 瀑布图 + 右侧确权图表 */
  const LAND_ECHART_IDS_FARM = ["left-chart-2-farm", "left-chart-3-farm", "right-chart-cert-pie", "right-chart-cert-status"];
  const LAND_DONUT_RING_PX = 35;
  const chartResizeObservers = {};

  /** 土地资源语义色（全页统一） */
  const SEM = {
    core: "#00A86B",
    second: "#66D9A3",
    neutral: "#00B4D8",
    warn: "#FF9F1C",
    muted: "#4A5568"
  };

  const LAND_USE_COLORS = {
    "耕地": SEM.core,
    "草地": SEM.second,
    "林地": SEM.neutral,
    "建设用地": SEM.muted,
    "其他": "#8B9DC3"
  };

  const LAND_CERT_COLORS = {
    "已发证": SEM.core,
    "已登记待发证": SEM.second,
    "已登记未发证": SEM.second,
    "已确权未登记": SEM.neutral,
    "已确权": SEM.neutral,
    "未确权": SEM.warn
  };

  const LAND_PARCEL_COLORS = {
    "耕地": SEM.core,
    "建设用地": SEM.muted,
    "其他": SEM.neutral,
    "草地": SEM.second
  };

  /** 右上梯田图：自上而下为建设用地→草地→其他→耕地（底为最大层） */
  const LAND_PARCEL_TERRACE_TOP_DOWN = ["耕地", "草地", "建设用地", "其他"];
  const LAND_PARCEL_TERRACE_COLORS = {
    "耕地": "#00A86B",
    "其他": "#00B4D8",
    "草地": "#66D9A3",
    "建设用地": "#4A5568"
  };

  let gisMap = null;
  let currentPerm = "group";
  let currentPlots = [];
  let currentLandZones = [];
  let currentDevices = [];
  let layerGroups = {};
  let charts = {};
  let globalFilter = {};
  let iotFilter = { type: null, status: null, farm: null };
  let contextDevice = null;
  let selectedIotDevice = null;
  let mapFilterMode = "land";
  let currentBottomTab = "land";
  let sceneMode = "planting";
  let sceneSub = null;
  let leftSearchQuery = "";
  let activeFarmCardId = null;
  let activePlotId = null;
  /** 土地资源 Tab · 地图农场点位下钻（与种植经营 enterFarmView 分离） */
  let landDrillFarmId = null;
  let selectedLeftFarm = null;
  let selectedLeftPlot = null;
  const LEFT_FARM_OPTIONS = [
    { id: "baicheng", name: "白城牧场" },
    { id: "zhennan", name: "镇南种羊场" }
  ];
  let activeDisasterId = null;
  let disasterHighlightLayer = null;
  let farmPointPopupLatLng = null; /* 弹框跟随地图移动 */
  let farmPointPopupMoveBound = false;
  /** 点击农场点位后聚焦农场：隐藏农场圆点，只显示地块边界 */
  let mapFarmFocusActive = false;
  let baselineOverlayLayer = null;
  let baseTileLayer = null;
  let hoveredFarmParcelId = null;
  /** 宗地详情弹窗 · 主地图图斑选中高亮 */
  let selectedFarmParcelId = null;
  /** 农场下钻地块详情是否占用「通用 yzt-modal」弹窗（与集团本底图斑弹窗同套样式） */
  let farmParcelYztModalActive = false;
  let parcelDetailMiniMap = null;
  let parcelDetailEscHandler = null;

  function sumPlotArea(plots) {
    return plots.reduce((a, p) => a + p.area, 0);
  }

  /** 万公顷 → 万亩（1 万公顷 = 15 万亩） */
  function wanHaToWanMu(wanHa) {
    return wanHa * 15;
  }

  function fmtMu(wanHa, digits) {
    return wanHaToWanMu(wanHa).toFixed(digits == null ? 1 : digits);
  }

  function fmtPct(part, total, digits) {
    if (!total) return "0.0";
    return (part / total * 100).toFixed(digits == null ? 1 : digits);
  }

  function hexToRgba(hex, alpha) {
    if (!hex || typeof hex !== "string") return `rgba(75, 85, 99, ${alpha})`;
    let h = hex.trim().replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return `rgba(75, 85, 99, ${alpha})`;
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // ==================== Sci-Fi Theme System ====================
  const SCI = {
    primary: "#00FF88",
    cyan: "#00D4FF",
    gold: "#FFB800",
    purple: "#B388FF",
    orange: "#FF9F43",
    red: "#FF6B6B",
    bgCard: "rgba(0,20,16,0.55)",
    gridLine: "rgba(0,229,255,0.12)",
    axisLine: "rgba(0,229,255,0.3)",
    textPri: "rgba(220,240,255,0.9)",
    textSec: "rgba(160,210,235,0.65)",
    fontNum: "Orbitron, 'Noto Sans SC', sans-serif"
  };

  /** 纵向渐变柱状图（上亮下暗） */
  function sciBarGradient(color) {
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: color },
      { offset: 1, color: hexToRgba(color, 0.2) }
    ]);
  }

  /** 柱状图发光样式 */
  function sciBarStyle(color) {
    return {
      color: sciBarGradient(color),
      borderRadius: [8, 8, 0, 0],
      shadowBlur: 10,
      shadowColor: hexToRgba(color, 0.45),
      shadowOffsetX: 0,
      shadowOffsetY: 2
    };
  }

  /** 折线图发光样式 */
  function sciLineStyle(color, w) {
    return {
      color: color,
      width: w || 3,
      shadowBlur: 8,
      shadowColor: hexToRgba(color, 0.5)
    };
  }

  /** 折线面积渐变填充 */
  function sciAreaGradient(color) {
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: hexToRgba(color, 0.4) },
      { offset: 1, color: hexToRgba(color, 0.0) }
    ]);
  }

  /** 环形图发光强调 */
  function sciEmphasis(color) {
    return {
      scale: true,
      scaleSize: 12,
      shadowBlur: 24,
      shadowColor: hexToRgba(color || "#00FF88", 0.55)
    };
  }

  /** 通用深色 tooltip */
  function sciTooltip() {
    return {
      backgroundColor: "rgba(4,12,28,0.95)",
      borderColor: "rgba(0,212,255,0.4)",
      borderWidth: 1,
      textStyle: { color: "#e0f0ff", fontSize: 28, fontFamily: "'Noto Sans SC', sans-serif" },
      extraCssText: "box-shadow: 0 8px 32px rgba(0,0,0,0.6); border-radius: 8px;"
    };
  }

  /** 注册全局 ECharts 渐变色 */
  function _ensureSciGradients() {
    if (_ensureSciGradients._done) return;
    _ensureSciGradients._done = true;
    var defs = [
      { id: "sg-primary", c: SCI.primary }, { id: "sg-cyan", c: SCI.cyan },
      { id: "sg-gold", c: SCI.gold }, { id: "sg-purple", c: SCI.purple },
      { id: "sg-orange", c: SCI.orange }, { id: "sg-red", c: SCI.red }
    ];
    defs.forEach(function(d) {
      echarts.registerMap && echarts.graphic && echarts.graphic.LinearGradient;
    });
  }

  // ==================== End Sci-Fi Theme ====================

  function getFilteredLandParcels() {
    return currentLandZones.filter((z) => z.zoneType === "use-patch");
  }

  function isLandFarmDrill() {
    return currentBottomTab === "land" && !!landDrillFarmId;
  }

  function getFarmDrillStats(farmId) {
    const data = typeof FARM_LAND_DRILL !== "undefined"
      ? FARM_LAND_DRILL
      : (typeof window !== "undefined" ? window.FARM_LAND_DRILL : null);
    return data && data[farmId] ? data[farmId] : null;
  }

  function disposeFarmDrillCharts() {
    ["left-chart-2-farm", "left-chart-3-farm", "left-chart-4-farm"].forEach((id) => disposeChart(id));
  }

  function syncLandDrillUI() {
    const left = document.querySelector(".yzt-side-left");
    const groupEl = document.getElementById("land-view-group");
    const farmEl = document.getElementById("land-view-farm");
    const drill = isLandFarmDrill();
    left?.classList.toggle("yzt-land-drill", drill);
    document.querySelector(".yzt-side-right")?.classList.toggle("yzt-land-drill", drill);
    if (groupEl) {
      groupEl.classList.toggle("yzt-hidden", drill);
      groupEl.setAttribute("aria-hidden", drill ? "true" : "false");
    }
    if (farmEl) {
      farmEl.classList.toggle("yzt-hidden", !drill);
      farmEl.setAttribute("aria-hidden", drill ? "false" : "true");
    }
    var mapHint = document.getElementById("map-parcel-click-hint");
    if (mapHint) {
      var showHint = drill && currentBottomTab === "land";
      mapHint.classList.toggle("yzt-hidden", !showHint);
      mapHint.setAttribute("aria-hidden", showHint ? "false" : "true");
    }
  }

  const LAND_PANEL_TITLES = {
    group: { treemap: "各农场土地类型", region: "各行政区确权占比" },
    farm: { treemap: "土地类型", region: "各行政区确权占比" }
  };

  function setLandPanelTitles(mode, stats) {
    const rightWrap = document.getElementById("right-charts-wrap");
    if (!rightWrap) return;
    var titles = rightWrap.querySelectorAll(".yzt-land-chart-title");
    var farmName = "";
    if (mode === "farm" && stats) {
      farmName = stats.name;
    } else if (globalFilter.farm) {
      var s = SUBSIDIARIES.find(function(x) { return x.id === globalFilter.farm; });
      farmName = s ? s.name : "";
    }
    if (farmName) {
      if (titles[0]) titles[0].textContent = farmName + "土地类型";
      if (titles[1]) titles[1].textContent = farmName + "确权对比";
    } else {
      if (titles[0]) titles[0].textContent = "各农场土地类型";
      if (titles[1]) titles[1].textContent = "各农场确权对比";
    }
    if (titles[2]) titles[2].textContent = "各行政区确权占比";
  }

  /** 农场面板从隐藏切为可见后，若 ECharts 实例尺寸为 0 则重建 */
  function ensureVisibleLandChart(id, stubOption) {
    const el = document.getElementById(id);
    if (!el) return null;
    const broken = charts[id] && (!charts[id].getWidth() || charts[id].getWidth() < 4);
    if (broken) {
      if (chartResizeObservers[id]) {
        chartResizeObservers[id].disconnect();
        delete chartResizeObservers[id];
      }
      charts[id].dispose();
      delete charts[id];
    }
    if (!charts[id]) {
      initChart(id, stubOption || { backgroundColor: "transparent", series: [] });
    }
    return charts[id] || null;
  }

  let farmDrillChartPaintTimer = null;
  let farmDrillPaintGen = 0;

  function scheduleFarmDrillChartPaint() {
    farmDrillPaintGen++;
    const gen = farmDrillPaintGen;
    if (farmDrillChartPaintTimer) {
      clearTimeout(farmDrillChartPaintTimer);
      farmDrillChartPaintTimer = null;
    }
    const fid = landDrillFarmId;
    const paintOnce = (attempt) => {
      if (gen !== farmDrillPaintGen || !isLandFarmDrill() || landDrillFarmId !== fid) return;
      /* 不在此整表 dispose：Donut/Waterfall 内已 disposeChart，避免与 paintGen 竞态组合后出现空白实例 */
      renderLandFarmDrillPanelEchartsOnly(fid);
      LAND_ECHART_IDS_FARM.forEach((id) => charts[id]?.resize());
      const el = document.getElementById("left-chart-2-farm");
      const w = el ? el.getBoundingClientRect().width : 0;
      if (w < 12 && attempt < 18) {
        farmDrillChartPaintTimer = setTimeout(() => {
          farmDrillChartPaintTimer = null;
          paintOnce(attempt + 1);
        }, 80);
      }
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (gen !== farmDrillPaintGen) return;
        paintOnce(0);
      });
    });
  }

  function enterLandDrill(farmId) {
    const s = SUBSIDIARIES.find((x) => x.id === farmId);
    if (!s || !isBaseDataTab()) return;
    if (landDrillFarmId === farmId) {
      const stats = getFarmDrillStats(farmId);
      if (stats) renderLandFarmDrillChrome(stats);
      scheduleFarmDrillChartPaint();
      updatePageTitle();
      return;
    }

    landDrillFarmId = farmId;
    activeFarmCardId = farmId;
    globalFilter.farm = farmId;
    currentPerm = "group";

    document.getElementById("yzt-modal-overlay")?.classList.add("hidden");
    closeParcelDetailModal();
    hoveredFarmParcelId = null;
    document.querySelector(".yzt-map-wrap")?.classList.add("yzt-farm-drill-active");
    var bannerEl = document.getElementById("farm-drill-banner");
    var bannerNameEl = document.getElementById("farm-drill-banner-name");
    if (bannerNameEl) bannerNameEl.textContent = s.name;
    if (bannerEl) { bannerEl.classList.remove("yzt-hidden"); bannerEl.setAttribute("aria-hidden", "false"); }
    syncLandDrillUI();
    applyFilter();
    requestAnimationFrame(() => flyToFarmBounds(farmId, 0.85));
    updatePageTitle();
    /* 布局与 scale 生效后再灌一次 DOM+ECharts，避免首帧容器宽为 0 导致左栏「只有标题」 */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!isLandFarmDrill() || landDrillFarmId !== farmId) return;
        const stats = getFarmDrillStats(farmId);
        if (stats) renderLandFarmDrillChrome(stats);
        scheduleFarmDrillChartPaint();
        renderMapLandStats();
      });
    });
  }

  function exitLandDrill() {
    document.getElementById("org-handle")?.classList.add("yzt-hidden");
    document.getElementById("org-panel")?.classList.add("yzt-hidden");
    if (!landDrillFarmId) return;
    farmDrillPaintGen++;
    if (farmDrillChartPaintTimer) {
      clearTimeout(farmDrillChartPaintTimer);
      farmDrillChartPaintTimer = null;
    }
    landDrillFarmId = null;
    activeFarmCardId = null;
    activePlotId = null;
    hoveredFarmParcelId = null;
    document.querySelector(".yzt-map-wrap")?.classList.remove("yzt-farm-drill-active");
    globalFilter.farm = "";
    currentPerm = "group";
    syncLandDrillUI();
    applyFilter();
    if (gisMap && isBaseDataTab()) applyLandMapView(true);
    closeParcelDetailModal();
    updatePageTitle();
  }

  /** 点击地图农场标记：仅飞至农场，不改变左右侧数据、不显示农场名称 */
  function enterFarmFilterMode(farmId) {
    var s = SUBSIDIARIES.find(function(x) { return x.id === farmId; });
    if (!s || !isBaseDataTab()) return;

    flyToFarmBounds(farmId, 0.85);
  }

  function exitFarmFilterMode() {
    if (!globalFilter.farm) return;

    var banner = document.getElementById("farm-drill-banner");
    if (banner) { banner.classList.add("yzt-hidden"); banner.setAttribute("aria-hidden", "true"); }

    globalFilter.farm = "";
    applyFilter();
    if (gisMap && isBaseDataTab()) applyLandMapView(true);
    updateLandAnalysisPanels(getLandAnalysisParcels());
    updateLeftPanelTitlesForFarm(null);
  }

  /** 更新左栏/右栏标题 */
  function updateLeftPanelTitlesForFarm(farmName) {
    var groupView = document.getElementById("land-view-group");
    if (groupView) {
      var titles = groupView.querySelectorAll(".yzt-land-chart-title");
      var defaultTitles = ["确权面积统计", "确权面积分布", "土地利用占比"];
      var farmTitles = [
        farmName ? farmName + "确权面积统计" : "",
        farmName ? farmName + "确权面积分布" : "",
        farmName ? farmName + "土地利用占比" : ""
      ];
      for (var i = 0; i < titles.length; i++) {
        titles[i].textContent = farmName ? farmTitles[i] : defaultTitles[i];
      }
    }
    var rightWrap = document.getElementById("right-charts-wrap");
    if (rightWrap) {
      var terraceTitle = rightWrap.querySelector(".yzt-land-chart-block--terrace .yzt-land-chart-title");
      var regionTitle = rightWrap.querySelector(".yzt-land-chart-block--progress .yzt-land-chart-title");
      if (farmName) {
        if (terraceTitle) terraceTitle.textContent = farmName + "土地类型";
        if (regionTitle) regionTitle.textContent = "各行政区确权占比";
      } else {
        if (terraceTitle) terraceTitle.textContent = "各农场土地类型";
        if (regionTitle) regionTitle.textContent = "各行政区确权占比";
      }
    }
  }

  function getFarmPlotBounds(farmId) {
    const zones = getLandResourceZones([farmId]).filter((z) => z.zoneType === "use-patch");
    const plots = getPlotsForFarms([farmId]);
    let bounds = null;

    const extendFromLatLng = (lat, lng) => {
      const ll = L.latLng(lat, lng);
      bounds = bounds ? bounds.extend(ll) : L.latLngBounds(ll, ll);
    };

    const extendFromPlotFootprint = (p) => {
      const feat = createPlotFieldPolygon(
        p.lat,
        p.lng,
        p.parcelW || 0.014,
        p.parcelH || 0.011,
        p.fieldSeed || p.lat + p.lng
      );
      const ring = feat?.geometry?.coordinates?.[0];
      if (!ring || !ring.length) return;
      ring.forEach((pt) => {
        if (Array.isArray(pt) && pt.length >= 2) extendFromLatLng(pt[1], pt[0]);
      });
    };

    zones.forEach((z) => {
      if (z.parcelW && z.parcelH) {
        const feat = createPlotFieldPolygon(
          z.lat,
          z.lng,
          z.parcelW,
          z.parcelH,
          z.fieldSeed || z.lat + z.lng
        );
        const ring = feat?.geometry?.coordinates?.[0];
        if (ring && ring.length) {
          ring.forEach((pt) => {
            if (Array.isArray(pt) && pt.length >= 2) extendFromLatLng(pt[1], pt[0]);
          });
          return;
        }
      }
      extendFromLatLng(z.lat, z.lng);
    });
    if (!zones.length) plots.forEach((p) => extendFromPlotFootprint(p));

    if (!bounds) {
      const s = SUBSIDIARIES.find((x) => x.id === farmId);
      if (!s) return null;
      return L.latLngBounds(
        [s.lat - 0.18, s.lng - 0.22],
        [s.lat + 0.18, s.lng + 0.22]
      );
    }

    const padLat = 0.028;
    const padLng = 0.034;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return L.latLngBounds(
      [sw.lat - padLat, sw.lng - padLng],
      [ne.lat + padLat, ne.lng + padLng]
    );
  }

  function clearFarmFocus() {
    if (!mapFarmFocusActive) return;
    mapFarmFocusActive = false;
    refreshMap();
  }

  function flyToFarmBounds(farmId, duration) {
    if (!gisMap) return;
    const bounds = getFarmPlotBounds(farmId);
    if (!bounds) return;
    gisMap.flyToBounds(bounds, {
      padding: [72, 72],
      duration: duration ?? 0.85,
      easeLinearity: 0.22
    });
  }

  /** 地图上短暂闪烁标记 */
  function flashMarker(lat, lng) {
    if (!gisMap) return;
    var size = 24;
    var el = document.createElement("div");
    el.className = "yzt-flash-marker";
    el.style.cssText = "width:" + size + "px;height:" + size + "px;border-radius:50%;background:rgba(0,255,136,0.7);box-shadow:0 0 20px rgba(0,255,136,0.8);animation:yztFlashPulse 1.2s ease-out forwards;pointer-events:none;";
    var icon = L.divIcon({ className: "", html: el.outerHTML, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    var marker = L.marker([lat, lng], { icon: icon, interactive: false, zIndexOffset: 3000 }).addTo(gisMap);
    setTimeout(function() { gisMap.removeLayer(marker); }, 1300);
  }

  const LAND_STATS_CERT_ROWS = [
    { status: "已发证", label: "已发证" },
    { status: "已登记待发证", label: "已登记未发证" },
    { status: "已确权未登记", label: "已确权未登记" },
    { status: "未确权", label: "未确权" }
  ];

  function sumParcelAreaWanMu(parcels) {
    return wanHaToWanMu(parcels.reduce((a, z) => a + z.area, 0));
  }

  function buildLandStatCountRow(label, count) {
    return `
      <div class="yzt-land-stats-item">
        <span class="yzt-land-stats-label">${label}</span>
        <div class="yzt-land-stats-val">
          <span class="yzt-land-stats-num">${count}</span><span class="yzt-land-stats-unit">块</span>
        </div>
      </div>`;
  }

  function buildLandStatAreaRow(label, areaMu) {
    const n = typeof areaMu === "number" ? areaMu.toFixed(1) : areaMu;
    return `
      <div class="yzt-land-stats-item">
        <span class="yzt-land-stats-label">${label}</span>
        <div class="yzt-land-stats-val">
          <span class="yzt-land-stats-num">${n}</span><span class="yzt-land-stats-unit">万亩</span>
        </div>
      </div>`;
  }

  function buildLandStatFullRow(label, count, areaMu) {
    const a = typeof areaMu === "number" ? areaMu.toFixed(1) : areaMu;
    return `
      <div class="yzt-land-stats-item">
        <span class="yzt-land-stats-label">${label}</span>
        <div class="yzt-land-stats-val">
          <span class="yzt-land-stats-num">${count}</span><span class="yzt-land-stats-unit">块</span>
          <span class="yzt-land-stats-slash">/</span>
          <span class="yzt-land-stats-num">${a}</span><span class="yzt-land-stats-unit">万亩</span>
        </div>
      </div>`;
  }

  function renderMapLandStats() {
    const panel = document.getElementById("map-land-stats");
    if (!panel) return;

    if (!isBaseDataTab()) {
      panel.classList.add("hidden");
      return;
    }

    panel.classList.remove("hidden");

    if (isLandFarmDrill() && landDrillFarmId) {
      const stats = getFarmDrillStats(landDrillFarmId);
      const parcels = getLandAnalysisParcels();
      let plotCount = stats && stats.plotCount != null ? Math.round(+stats.plotCount) : parcels.length;
      let totalMuNum = stats && stats.totalAreaMu != null ? +Number(stats.totalAreaMu) : sumParcelAreaWanMu(parcels);
      if (landDrillFarmId === "zhennan") {
        plotCount = 72;
        totalMuNum = 139.8;
      }
      const wf = stats && stats.certWaterfall ? stats.certWaterfall.slice(1) : [];
      const segByLabel = {};
      wf.forEach((s) => {
        segByLabel[s.label] = s;
      });
      const wfLabelForStatus = (status) => (status === "已登记待发证" ? "已登记未发证" : status);
      const countMap = stats && stats.certParcelCounts ? stats.certParcelCounts : null;
      const rows = [
        `<div class="yzt-land-stats-head" role="presentation">地图 · 筛选统计</div>`,
        buildLandStatCountRow("宗地数量", Math.round(plotCount)),
        buildLandStatAreaRow("宗地总面积", +(+totalMuNum).toFixed(1))
      ];
      LAND_STATS_CERT_ROWS.forEach(({ status, label }) => {
        const segKey = wfLabelForStatus(status);
        const seg = segByLabel[segKey];
        const areaFromSeg = seg && seg.areaMu != null ? +Number(seg.areaMu).toFixed(1) : null;
        const list = parcels.filter((z) => getPlotBase(z).certStatus === status);
        const areaMu = areaFromSeg != null ? +areaFromSeg : +sumParcelAreaWanMu(list).toFixed(1);
        const nBlk = countMap && countMap[segKey] != null
          ? Math.round(+countMap[segKey])
          : list.length;
        rows.push(buildLandStatFullRow(label, nBlk, areaMu));
      });
      if (globalFilter.useType) {
        const list = parcels.filter((z) => getPlotBase(z).useType === globalFilter.useType);
        rows.push(buildLandStatFullRow(globalFilter.useType, list.length, +sumParcelAreaWanMu(list).toFixed(1)));
      }
      panel.innerHTML = rows
        .map((row, i) => (i === 0 ? row : `<div class="yzt-land-stats-sep" aria-hidden="true"></div>${row}`))
        .join("");
      return;
    }

    const parcels = getLandAnalysisParcels();

    /* 集团总览：使用硬编码集团层级统计数据 */
    const GROUP_MAP_STATS = [
      { label: "宗地数量", count: 158, areaMu: null },
      { label: "宗地总面积", count: null, areaMu: 324.1 },
      { label: "已发证", count: 21, areaMu: 44.3 },
      { label: "已登记未发证", count: 21, areaMu: 43.6 },
      { label: "已确权未登记", count: 21, areaMu: 43.3 },
      { label: "未确权", count: 95, areaMu: 192.9 }
    ];

    const rows = [
      `<div class="yzt-land-stats-head" role="presentation">地图 · 筛选统计</div>`
    ];

    GROUP_MAP_STATS.forEach((s, i) => {
      if (s.label === "宗地数量") {
        rows.push(buildLandStatCountRow(s.label, s.count));
      } else if (s.label === "宗地总面积") {
        rows.push(buildLandStatAreaRow(s.label, s.areaMu));
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
        rows.push(buildLandStatFullRow(s.label, s.count, s.areaMu));
      }
    });

    if (globalFilter.useType) {
      const list = parcels.filter((z) => getPlotBase(z).useType === globalFilter.useType);
      rows.push(buildLandStatFullRow(globalFilter.useType, list.length, +sumParcelAreaWanMu(list).toFixed(1)));
    }

    panel.innerHTML = rows
      .map((row, i) => (i === 0 ? row : `<div class="yzt-land-stats-sep" aria-hidden="true"></div>${row}`))
      .join("");
  }

  function renderMapParcelLegend() {
    const el = document.getElementById("map-parcel-legend");
    if (!el) return;
    if (!isLandFarmDrill() || !isBaseDataTab()) {
      el.classList.add("yzt-hidden");
      el.setAttribute("aria-hidden", "true");
      return;
    }
    const items = [
      { label: "已发证", key: "已发证" },
      { label: "已登记未发证", key: "已登记待发证" },
      { label: "已确权未登记", key: "已确权未登记" },
      { label: "未确权", key: "未确权" }
    ];
    el.innerHTML = `
      <div class="yzt-map-parcel-legend-title">地块权籍</div>
      <ul class="yzt-map-parcel-legend-list">
        ${items.map((it) => {
          const color = typeof getCadastralMapFillColor === "function" ? getCadastralMapFillColor(it.key) : "#6b7280";
          return `<li><span class="yzt-map-parcel-legend-swatch" style="background:${color}"></span><span>${it.label}</span></li>`;
        }).join("")}
      </ul>`;
    el.classList.remove("yzt-hidden");
    el.setAttribute("aria-hidden", "false");
  }

  function groupPlotsBy(plots, key, skipEmpty) {
    const map = {};
    plots.forEach((p) => {
      let k = getPlotFlat(p)[key];
      if (skipEmpty && !k) return;
      k = k || "其他";
      if (!map[k]) map[k] = { count: 0, area: 0 };
      map[k].count += 1;
      map[k].area += p.area;
    });
    return map;
  }

  function groupZonesBy(zones, key, skipEmpty) {
    const map = {};
    zones.forEach((z) => {
      let k = getPlotBase(z)[key];
      if (skipEmpty && !k) return;
      k = k || "其他";
      if (!map[k]) map[k] = { count: 0, area: 0 };
      map[k].count += 1;
      map[k].area += z.area;
    });
    return map;
  }

  function groupZonesByFarmName(zones) {
    const map = {};
    zones.forEach((z) => {
      const name = z.farmName || SUBSIDIARIES.find((s) => s.id === z.farmId)?.name || "其他";
      if (!map[name]) map[name] = { count: 0, area: 0 };
      map[name].count += 1;
      map[name].area += z.area;
    });
    return map;
  }

  function groupZonesByAdminRegion(zones) {
    const map = {};
    zones.forEach((z) => {
      const region = (typeof FARM_ADMIN_REGION !== "undefined" && FARM_ADMIN_REGION[z.farmId]) || "其他";
      if (!map[region]) map[region] = { count: 0, area: 0 };
      map[region].count += 1;
      map[region].area += z.area;
    });
    return map;
  }

  const landChartAxis = {
    axisLabel: { color: "rgba(200, 230, 255, 0.88)", fontSize: LAND_FS.axis },
    axisLine: { lineStyle: { color: "rgba(0, 229, 255, 0.35)" } },
    axisTick: { show: false }
  };

  function landChartGrid(extra) {
    return Object.assign({ left: 4, right: 8, top: 18, bottom: 6, containLabel: true }, extra || {});
  }

  function landChartTooltip() {
    return {
      trigger: "axis",
      backgroundColor: "rgba(4, 14, 26, 0.94)",
      borderColor: "rgba(0, 229, 255, 0.35)",
      textStyle: { color: "#e8f4ff", fontSize: LAND_FS.tip }
    };
  }

  function landChartTooltipItem() {
    return {
      trigger: "item",
      backgroundColor: "rgba(4, 14, 26, 0.94)",
      borderColor: "rgba(0, 229, 255, 0.35)",
      textStyle: { color: "#e8f4ff", fontSize: LAND_FS.tip }
    };
  }

  function landBarGradient(topColor, bottomColor) {
    return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
      { offset: 0, color: topColor || "#00D4FF" },
      { offset: 1, color: bottomColor || "rgba(0, 212, 255, 0.25)" }
    ]);
  }

  function landValueAxis(name) {
    return {
      type: "value",
      name: name || "",
      nameTextStyle: { color: "rgba(160, 220, 255, 0.85)", fontSize: LAND_FS.name, padding: [0, 0, 8, 0] },
      axisLabel: landChartAxis.axisLabel,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: "rgba(0, 255, 160, 0.12)", type: "dashed" } }
    };
  }

  function landCategoryAxis(data, opts) {
    const o = opts || {};
    const axisLabel = Object.assign({}, landChartAxis.axisLabel, {
      fontSize: o.fontSize || LAND_FS.axis,
      interval: 0,
      rotate: o.rotate || 0
    });
    if (o.formatter) axisLabel.formatter = o.formatter;
    return {
      type: "category",
      data,
      axisLabel,
      axisLine: landChartAxis.axisLine,
      axisTick: { show: false }
    };
  }

  function farmUseAreaMu(parcels, farmName, useType) {
    const ha = parcels
      .filter((z) => z.farmName === farmName && getPlotBase(z).useType === useType)
      .reduce((a, z) => a + z.area, 0);
    return +fmtMu(ha, 1);
  }

  function normalizeParcelUseType(useType) {
    if (useType === "林地" || useType === "水域") return "其他";
    const order = typeof LAND_PARCEL_TYPE_ORDER !== "undefined"
      ? LAND_PARCEL_TYPE_ORDER : ["耕地", "建设用地", "其他", "草地"];
    return order.includes(useType) ? useType : "其他";
  }

  function groupZonesByParcelType(zones) {
    const order = typeof LAND_PARCEL_TYPE_ORDER !== "undefined"
      ? LAND_PARCEL_TYPE_ORDER : ["耕地", "建设用地", "其他", "草地"];
    const map = {};
    order.forEach((t) => { map[t] = { area: 0, count: 0 }; });
    zones.forEach((z) => {
      const key = normalizeParcelUseType(getPlotBase(z).useType);
      if (!map[key]) map[key] = { area: 0, count: 0 };
      map[key].area += z.area;
      map[key].count += 1;
    });
    return map;
  }

  function getLandAnalysisParcels() {
    const farmIds = getFarmIds();
    let zones = filterLandZones(getLandResourceZones(farmIds), globalFilter);
    if (globalFilter.farm) zones = zones.filter((z) => z.farmId === globalFilter.farm);
    return zones;
  }

  function disposeChart(id) {
    if (chartResizeObservers[id]) {
      chartResizeObservers[id].disconnect();
      delete chartResizeObservers[id];
    }
    if (charts[id]) {
      charts[id].dispose();
      delete charts[id];
    }
  }

  function bindChartResize(id) {
    const el = document.getElementById(id);
    if (!el || chartResizeObservers[id]) return;
    chartResizeObservers[id] = new ResizeObserver(() => {
      if (!charts[id]) return;
      charts[id].resize();
      if (currentBottomTab === "land" && id === "left-chart-2-farm" && isLandFarmDrill() && landDrillFarmId) {
        const stats = getFarmDrillStats(landDrillFarmId);
        if (stats) charts[id].setOption(buildLandUseDonutOptionFromStats(stats, charts[id]), false);
      }
    });
    chartResizeObservers[id].observe(el);
  }

  function ensureLandEchartsReady() {
    const donutStub = {
      backgroundColor: "transparent",
      series: [{ type: "pie", radius: ["52%", "72%"], center: ["50%", "50%"], label: { show: false }, data: [] }]
    };
    const waterfallStub = {
      backgroundColor: "transparent",
      grid: { left: 4, right: 72, top: 4, bottom: 4, containLabel: true },
      xAxis: { type: "value", show: false, splitLine: { show: false } },
      yAxis: { type: "category", data: [], axisLine: { show: false }, axisTick: { show: false } },
      series: []
    };
    ["left-chart-2-a", "left-chart-2-b"].forEach((id) => disposeChart(id));
    [["left-chart-3", waterfallStub]]
      .forEach(([id, opt]) => {
        if (charts[id]) return;
        if (!document.getElementById(id)) return;
        initChart(id, JSON.parse(JSON.stringify(opt)));
        bindChartResize(id);
      });

    if (isLandFarmDrill()) {
      [["left-chart-2-farm", donutStub], ["left-chart-3-farm", waterfallStub]]
        .forEach(([id, opt]) => {
          if (charts[id]) return;
          if (!document.getElementById(id)) return;
          initChart(id, JSON.parse(JSON.stringify(opt)));
          bindChartResize(id);
        });
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      ["left-chart-2-farm", "left-chart-3-farm"].forEach((id) => disposeChart(id));
    }
  }

  function getLandDonutRadius(chart) {
    const w = chart?.getWidth?.() || 0;
    const h = chart?.getHeight?.() || 0;
    const min = Math.max(160, Math.min(w, h) || 320);
    const outer = Math.round(min * 0.44);
    const ringPx = chart?.getDom?.()?.id === "left-chart-2-farm" ? 35 : LAND_DONUT_RING_PX;
    const inner = Math.max(0, outer - ringPx);
    return [inner, outer];
  }

  function resizeLandEcharts() {
    const run = () => {
      LAND_ECHART_IDS.forEach((id) => charts[id]?.resize());
      if (currentBottomTab === "land" && isLandFarmDrill() && landDrillFarmId && charts["left-chart-2-farm"]) {
        const stats = getFarmDrillStats(landDrillFarmId);
        if (stats) charts["left-chart-2-farm"].setOption(buildLandUseDonutOptionFromStats(stats, charts["left-chart-2-farm"]), false);
      }
    };
    run();
    requestAnimationFrame(run);
    setTimeout(run, 150);
  }

  function renderLandFarmCards(parcels) {
    var el = document.getElementById("land-farm-cards");
    if (!el) return;

    var totalMu, doneMu, undoneMu, rate, prefix;
    if (globalFilter.farm) {
      var stats = getFarmDrillStats(globalFilter.farm);
      if (!stats) return;
      totalMu = stats.totalAreaMu.toFixed(1);
      doneMu = (stats.certWaterfall[1].areaMu).toFixed(1);
      undoneMu = (stats.certWaterfall[4].areaMu).toFixed(1);
      rate = stats.certCompletePct.toFixed(1);
      prefix = "";
    } else {
      var bc = FARM_LAND_DRILL.baicheng;
      var zn = FARM_LAND_DRILL.zhennan;
      totalMu = (bc.totalAreaMu + zn.totalAreaMu).toFixed(1);
      doneMu = (bc.certWaterfall[1].areaMu + zn.certWaterfall[1].areaMu).toFixed(1);
      undoneMu = (bc.certWaterfall[4].areaMu + zn.certWaterfall[4].areaMu).toFixed(1);
      rate = (doneMu / totalMu * 100).toFixed(1);
      prefix = "集团";
    }

    el.innerHTML = '<div class="yzt-group-kpi-hero">' +
      '<div class="gkpi-row gkpi-row--single">' +
        '<div class="gkpi-item"><div class="gkpi-label">' + prefix + '总面积</div><div class="gkpi-val">' + totalMu + '<span class="gkpi-unit">万亩</span></div></div>' +
        '<div class="gkpi-item"><div class="gkpi-label">已确权面积</div><div class="gkpi-val green">' + doneMu + '<span class="gkpi-unit">万亩</span></div></div>' +
        '<div class="gkpi-item"><div class="gkpi-label">未确权面积</div><div class="gkpi-val warn">' + undoneMu + '<span class="gkpi-unit">万亩</span></div></div>' +
        '<div class="gkpi-item"><div class="gkpi-label">确权完成率</div><div class="gkpi-val ' + (rate >= 50 ? 'green' : 'warn') + '">' + rate + '<span class="gkpi-unit">%</span></div></div>' +
      '</div>' +
      '<div class="gkpi-glow"></div><div class="gkpi-scan"></div></div>';
  }

  function buildLandUseDonutOptionCore(slices, cropPct, chart, titleOverrides) {
    const radius = chart ? getLandDonutRadius(chart) : ["58%", "72%"];
    const ov = titleOverrides || {};
    const centerText = ov.centerText != null ? ov.centerText : `${cropPct}%`;
    const centerColor = ov.centerColor != null ? ov.centerColor : SEM.core;
    const centerFont = ov.centerFontSize != null ? ov.centerFontSize : LAND_FS.hero;
    const subFont = ov.subtextFontSize != null ? ov.subtextFontSize : LAND_FS.label;
    const hidePieLabels = !!ov.hidePieLabels;
    const rawSubtext = ov.subtext != null ? ov.subtext : "耕地占比";
    return {
      animationDuration: 1800,
      animationEasing: "cubicOut",
      backgroundColor: "transparent",
      legend: { show: false },
      tooltip: sciTooltip(),
      title: {
        text: centerText,
        subtext: rawSubtext,
        left: "center",
        top: "center",
        textStyle: {
          color: centerColor,
          fontSize: centerFont,
          fontWeight: 700,
          fontFamily: SCI.fontNum,
          textShadowColor: hexToRgba(centerColor, 0.4),
          textShadowBlur: 16
        },
        subtextStyle: rawSubtext
          ? {
            color: SCI.textPri,
            fontSize: subFont,
            fontWeight: 600,
            padding: [6, 0, 0, 0]
          }
          : {
            fontSize: 0,
            lineHeight: 0,
            padding: 0,
            color: "transparent"
          }
      },
      series: [{
        type: "pie",
        radius,
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        minShowLabelAngle: 4,
        label: {
          show: !hidePieLabels,
          position: "outside",
          alignTo: "edge",
          bleedMargin: 6,
          color: "#e8f4ff",
          fontSize: LAND_FS.label,
          fontWeight: 600,
          formatter: (p) => `${p.name}：${p.value}万亩 | ${(+p.percent).toFixed(1)}%`
        },
        labelLine: {
          show: !hidePieLabels,
          length: 22,
          length2: 16,
          lineStyle: { color: "rgba(0,212,255,0.28)", width: 1.5 }
        },
        itemStyle: { borderColor: "rgba(2,10,22,0.88)", borderWidth: 3, borderRadius: 2 },
        emphasis: sciEmphasis(SCI.primary),
        data: slices.map((s) => ({
          name: s.name,
          value: s.value,
          itemStyle: { color: s.color || LAND_USE_COLORS[s.name] || SEM.neutral }
        }))
      }]
    };
  }

  function buildLandUseDonutOption(parcels, chart) {
    const stackOrder = typeof LAND_USE_STACK_ORDER !== "undefined"
      ? LAND_USE_STACK_ORDER : ["耕地", "草地", "林地", "建设用地"];
    const totalHa = parcels.reduce((a, z) => a + z.area, 0) || 1;
    const slices = stackOrder
      .map((useType) => {
        const ha = parcels
          .filter((z) => getPlotBase(z).useType === useType)
          .reduce((a, z) => a + z.area, 0);
        return { name: useType, value: +fmtMu(ha, 1) };
      })
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
    const cropPct = fmtPct(
      parcels.filter((z) => getPlotBase(z).useType === "耕地").reduce((a, z) => a + z.area, 0),
      totalHa,
      1
    );
    return buildLandUseDonutOptionCore(slices, cropPct, chart);
  }

  function buildLandUseDonutOptionFromStats(stats, chart, fontOverrides) {
    const cropRow = stats.landUse.find((u) => u.name === "耕地");
    const cropPctNum = stats.cropPct != null ? +stats.cropPct : (cropRow ? +cropRow.pct : 0);
    const cropPct = cropPctNum.toFixed(1);
    const sliceColors = typeof FARM_DRILL_LAND_USE_COLORS !== "undefined" ? FARM_DRILL_LAND_USE_COLORS : {};
    const slices = stats.landUse
      .map((u) => ({
        name: u.name,
        value: u.areaMu != null ? +Number(u.areaMu).toFixed(1) : +(stats.totalAreaMu * u.pct / 100).toFixed(1),
        color: sliceColors[u.name] || LAND_USE_COLORS[u.name] || SEM.neutral
      }))
      .filter((s) => s.value > 0);
    const fo = fontOverrides || {};
    const titleOverrides = {
      centerText: `${cropPct}%`,
      subtext: fo.subtext != null ? fo.subtext : "",
      centerColor: "#ffffff",
      centerFontSize: fo.centerFontSize || 48,
      subtextFontSize: fo.subtextFontSize || 14,
      hidePieLabels: true
    };
    return buildLandUseDonutOptionCore(slices, cropPct, chart, titleOverrides);
  }

  function renderLandDonutChart(parcels) {
    var data, cropPct;
    if (globalFilter.farm) {
      var stats = getFarmDrillStats(globalFilter.farm);
      if (!stats) return;
      data = stats.landUse.map(function(u) { return { name: u.name, value: u.areaMu }; });
      var cropRow = stats.landUse.find(function(u) { return u.name === "耕地"; });
      cropPct = Math.round(cropRow ? cropRow.pct : 0);
    } else {
      var bc = FARM_LAND_DRILL.baicheng;
      var zn = FARM_LAND_DRILL.zhennan;
      var merged = {};
      bc.landUse.forEach(function(u) { merged[u.name] = (merged[u.name] || 0) + u.areaMu; });
      zn.landUse.forEach(function(u) { merged[u.name] = (merged[u.name] || 0) + u.areaMu; });
      var names = Object.keys(merged);
      data = names.map(function(n) { return { name: n, value: merged[n] }; });
      var totalMu = data.reduce(function(s, d) { return s + d.value; }, 0);
      cropPct = Math.round((merged["耕地"] || 0) / totalMu * 100);
    }

    var colors = ["#00FF88", "#00D4FF", "#FFB800", "#B388FF", "#FF6B6B", "#9CA3AF"];
    disposeChart("left-chart-2");
    initChart("left-chart-2", {
      animationDuration: 1800,
      animationEasing: "cubicOut",
      backgroundColor: "transparent",
      color: colors,
      legend: { show: true, orient: "horizontal", bottom: 4, left: "center", textStyle: { color: SCI.textPri, fontSize: 32, fontWeight: 500 }, itemGap: 18, itemWidth: 18, itemHeight: 14 },
      tooltip: sciTooltip(),
      series: [{ type: "pie", radius: ["42%", "62%"], center: ["50%", "48%"], data: data,
        label: { show: true, position: "outside", fontSize: 30, color: SCI.textPri, formatter: "{b} {d}%", lineHeight: 32 },
        labelLine: { show: true, length: 16, length2: 22, lineStyle: { color: "rgba(0,212,255,0.25)", width: 1.5 } },
        itemStyle: { borderColor: "rgba(2,10,22,0.88)", borderWidth: 3, borderRadius: 2 },
        emphasis: sciEmphasis(SCI.primary)
      }],
      graphic: [{ type: "text", left: "center", top: "42%",
        style: { text: "耕地占比", textAlign: "center", fill: SCI.textSec, fontSize: 26 }, z: 10 },
        { type: "text", left: "center", top: "48%",
        style: { text: cropPct + "%", textAlign: "center", fill: "#00FF88", fontSize: 44, fontWeight: 700, fontFamily: SCI.fontNum, textShadowColor: "rgba(0,255,136,0.4)", textShadowBlur: 16 }, z: 10 }]
    });
  }

  function renderLandWaterfallChart(parcels) {
    var certData;
    if (globalFilter.farm) {
      var stats = getFarmDrillStats(globalFilter.farm);
      if (!stats) return;
      certData = stats.certWaterfall.map(function(d) {
        return { label: d.label, areaMu: d.areaMu, color: d.color };
      });
    } else {
      certData = [
        { label: "总面积", areaMu: 324.1, color: SEM.muted },
        { label: "已发证", areaMu: 44.3, color: "#047857" },
        { label: "已登记未发证", areaMu: 43.6, color: "#6ee7b7" },
        { label: "已确权未登记", areaMu: 43.3, color: "#0891b2" },
        { label: "未确权", areaMu: 192.9, color: "#ea580c" }
      ];
    }

    const totalMu = certData[0].areaMu;

    if (!charts["left-chart-3"]) return;

    const cats = certData.map(function(d) { return d.label; });
    const placeholders = [];
    const values = [];
    var acc = 0;
    placeholders.push(0);
    values.push({
      value: totalMu,
      itemStyle: { color: SEM.muted, borderWidth: 2, borderColor: "rgba(2, 14, 28, 0.92)" },
      label: { show: true, position: "right", formatter: totalMu + "万亩 100%", color: "#ffffff", fontSize: LAND_FS.label, fontWeight: 700 }
    });
    for (var i = 1; i < certData.length; i++) {
      placeholders.push(acc);
      const it = certData[i];
      const pct = (it.areaMu / totalMu * 100).toFixed(1);
      const isWarn = it.label === "未确权";
      values.push({
        value: it.areaMu,
        itemStyle: { color: it.color, borderWidth: 2, borderColor: "rgba(2, 14, 28, 0.92)" },
        label: {
          show: true,
          position: "right",
          formatter: it.areaMu + "万亩 " + pct + "%",
          color: isWarn ? "#ea580c" : "#ffffff",
          fontSize: LAND_FS.label,
          fontWeight: 700
        }
      });
      acc += it.areaMu;
    }

    charts["left-chart-3"].setOption({
      animationDuration: 2000,
      animationEasing: "cubicOut",
      backgroundColor: "transparent",
      tooltip: sciTooltip(),
      grid: { left: 12, right: 136, top: 8, bottom: 8, containLabel: true },
      xAxis: { type: "value", show: false, splitLine: { show: false } },
      yAxis: {
        type: "category",
        data: cats,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: SCI.textPri, fontSize: LAND_FS.axis, fontWeight: 600 }
      },
      series: [
        {
          type: "bar",
          stack: "wf",
          barWidth: 30,
          silent: true,
          itemStyle: { borderColor: "transparent", color: "transparent" },
          emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } },
          data: placeholders
        },
        {
          type: "bar",
          stack: "wf",
          barWidth: 30,
          itemStyle: { borderRadius: [0, 6, 6, 0] },
          data: values
        }
      ]
    }, true);
  }

  /* 右1：各地类确权进度（堆叠柱状图） */
  /* 右1：各农场土地利用类型（堆叠柱状图） */
  function renderLandCertPieChart(parcels) {
    var el = document.getElementById("right-chart-cert-pie");
    if (!el) return;
    disposeChart("right-chart-cert-pie");

    var useTypes = ["耕地", "草地", "林地", "建设用地", "其他"];
    var useColors = { "耕地": "#00FF88", "草地": "#66D9A3", "林地": "#00B4D8", "建设用地": "#FF9F1C", "其他": "#9CA3AF" };

    /* 按农场 × 地类汇总面积 */
    var farmMap = {};
    parcels.forEach(function(z) {
      var fn = z.farmName || "其他";
      var base = getPlotBase(z);
      var t = base.useType || "其他";
      if (useTypes.indexOf(t) < 0) t = "其他";
      if (!farmMap[fn]) farmMap[fn] = {};
      if (!farmMap[fn][t]) farmMap[fn][t] = 0;
      farmMap[fn][t] += z.area;
    });
    /* 补充长岭种马场数据 */
    farmMap["长岭种马场"] = { "耕地": 2.8, "草地": 1.2, "林地": 0.6, "建设用地": 0.3, "其他": 0.2 };
    var farmNames = Object.keys(farmMap);

    var series = useTypes.map(function(t) {
      return {
        name: t, type: "bar", stack: "total",
        data: farmNames.map(function(fn) { return +fmtMu(farmMap[fn][t] || 0, 1); }),
        itemStyle: { color: useColors[t] || "#6B7280" },
        barWidth: "28%",
        label: { show: false }
      };
    });

    /* 计算各农场总面积，用于限制 Y 轴 */
    var farmTotals = farmNames.map(function(fn) {
      return useTypes.reduce(function(s, t) { return s + (farmMap[fn][t] || 0); }, 0);
    });
    var yMax = Math.ceil(Math.max.apply(null, farmTotals) * 1.15 / 5) * 5;

    var c = echarts.init(el, null, { renderer: "canvas" });
    charts["right-chart-cert-pie"] = c;
    c.setOption({
      animationDuration: 1600,
      animationEasing: "cubicOut",
      tooltip: sciTooltip(),
      legend: { bottom: 0, textStyle: { color: SCI.textPri, fontSize: 32, fontWeight: 500 }, itemWidth: 24, itemHeight: 18, itemGap: 24 },
      grid: { left: 88, right: 24, top: 24, bottom: 82 },
      xAxis: { type: "category", data: farmNames, axisLabel: { color: SCI.textPri, fontSize: 26, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
      yAxis: { type: "value", name: "万亩", nameLocation: "middle", nameGap: 52, max: yMax, nameTextStyle: { color: SCI.textSec, fontSize: 28 }, axisLabel: { color: SCI.textSec, fontSize: 24 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: series.map(function(s) { s.itemStyle = Object.assign({ borderRadius: [6, 6, 0, 0] }, s.itemStyle || {}); return s; })
    });
    bindChartResize("right-chart-cert-pie");
  }

  /* 右2：各农场权籍统计（分组柱状图） */
  function renderLandCertStatusChart(parcels) {
    var el = document.getElementById("right-chart-cert-status");
    if (!el) return;
    disposeChart("right-chart-cert-status");

    var statusOrder = ["已发证", "已登记未发证", "已确权未登记", "未确权"];
    var statusColors = { "已发证": "#00E080", "已登记未发证": "#80E0A0", "已确权未登记": "#33B5E5", "未确权": "#FF5533" };

    /* 按农场 × 确权状态汇总宗地数量 */
    var farmMap = {};
    parcels.forEach(function(z) {
      var fn = z.farmName || "其他";
      var base = getPlotBase(z);
      var s = base.certStatus || "未确权";
      if (!farmMap[fn]) farmMap[fn] = {};
      if (!farmMap[fn][s]) farmMap[fn][s] = 0;
      farmMap[fn][s] += 1;
    });
    /* 补充长岭种马场数据 */
    farmMap["长岭种马场"] = { "已发证": 12, "已登记未发证": 8, "已确权未登记": 5, "未确权": 18 };
    var farmNames = Object.keys(farmMap);

    var series = statusOrder.map(function(s) {
      return {
        name: s, type: "bar", stack: "total",
        data: farmNames.map(function(fn) { return farmMap[fn][s] || 0; }),
        itemStyle: { color: statusColors[s] || "#6B7280" },
        barWidth: "28%",
        label: { show: false }
      };
    });

    var farmTotals2 = farmNames.map(function(fn) {
      return statusOrder.reduce(function(s, t) { return s + (farmMap[fn][t] || 0); }, 0);
    });
    var yMax2 = Math.ceil(Math.max.apply(null, farmTotals2) * 1.15 / 10) * 10;

    var c = echarts.init(el, null, { renderer: "canvas" });
    charts["right-chart-cert-status"] = c;
    c.setOption({
      animationDuration: 1600,
      animationEasing: "cubicOut",
      tooltip: sciTooltip(),
      legend: { bottom: 0, textStyle: { color: SCI.textPri, fontSize: 32, fontWeight: 500 }, itemWidth: 24, itemHeight: 18, itemGap: 24 },
      grid: { left: 88, right: 24, top: 24, bottom: 82 },
      xAxis: { type: "category", data: farmNames, axisLabel: { color: SCI.textPri, fontSize: 26, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
      yAxis: { type: "value", name: "宗地数量(块)", nameLocation: "middle", nameGap: 54, max: yMax2, nameTextStyle: { color: SCI.textSec, fontSize: 28 }, axisLabel: { color: SCI.textSec, fontSize: 24 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: series.map(function(s) { s.itemStyle = Object.assign({ borderRadius: [6, 6, 0, 0] }, s.itemStyle || {}); return s; })
    });
    bindChartResize("right-chart-cert-status");
  }

  /* 右3：相关行政区确权占比（横向进度条） */
  /* 右3：相关行政区确权占比（柱状图） */
  function renderLandRegionCards(parcels) {
    var el = document.getElementById("land-region-cards");
    if (!el) return;
    disposeChart("right-chart-region");

    if (globalFilter.farm) {
      var stats = getFarmDrillStats(globalFilter.farm);
      if (!stats) return;
      var villages = (stats.villages || []).slice(0, 8);
      var xData = villages.map(function(v) { return v.name; });
      var data = villages.map(function(v) { return +v.rate.toFixed(1); });
      var c = echarts.init(el, null, { renderer: "canvas" });
      charts["right-chart-region"] = c;
      c.setOption({
        animationDuration: 1500,
        animationEasing: "cubicOut",
        tooltip: sciTooltip(),
        grid: { left: 20, right: 20, top: 14, bottom: 22, containLabel: true },
        xAxis: { type: "category", data: xData, axisLabel: { color: SCI.textPri, fontSize: 28, rotate: 30 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", name: "%", nameLocation: "middle", nameGap: 48, nameTextStyle: { color: SCI.textSec, fontSize: 28 }, axisLabel: { color: SCI.textSec, fontSize: 26 }, max: 100, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: [{
          type: "bar", data: data, barWidth: "45%",
          itemStyle: sciBarStyle(SCI.primary),
          emphasis: sciEmphasis(SCI.primary),
          label: { show: true, position: "top", fontSize: 26, color: SCI.textPri, formatter: "{c}%" }
        }]
      });
      return;
    }

    var regions = [
      { name: "吉林省", rate: 100 },
      { name: "长春市", rate: 88.5 },
      { name: "吉林市", rate: 72.3 },
      { name: "四平市", rate: 65.8 },
      { name: "辽源市", rate: 58.2 },
      { name: "通化市", rate: 51.6 },
      { name: "白山市", rate: 44.1 },
      { name: "松原市", rate: 39.7 },
      { name: "白城市", rate: 35.2 },
      { name: "延边州", rate: 28.8 }
    ];
    var xData = regions.map(function(r) { return r.name; });
    var data = regions.map(function(r) { return r.rate; });

    var c = echarts.init(el, null, { renderer: "canvas" });
    charts["right-chart-region"] = c;
    c.setOption({
      animationDuration: 1500,
      animationEasing: "cubicOut",
      tooltip: sciTooltip(),
      grid: { left: 20, right: 20, top: 14, bottom: 26, containLabel: true },
      xAxis: { type: "category", data: xData, axisLabel: { color: SCI.textPri, fontSize: 28, rotate: 30 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
      yAxis: { type: "value", name: "%", nameLocation: "middle", nameGap: 48, nameTextStyle: { color: SCI.textSec, fontSize: 28 }, axisLabel: { color: SCI.textSec, fontSize: 26 }, max: 100, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: [{
        type: "bar", data: data, barWidth: "45%",
        itemStyle: sciBarStyle(SCI.cyan),
        emphasis: sciEmphasis(SCI.cyan),
        label: { show: true, position: "top", fontSize: 26, color: SCI.textPri, formatter: "{c}%" }
      }]
    });
    bindChartResize("right-chart-region");
  }

  function renderLandFarmDrillKpiCards(stats) {
    const el = document.getElementById("land-farm-kpi-cards");
    const titleEl = document.getElementById("land-farm-drill-title");
    if (titleEl) titleEl.textContent = `${stats.name} · 概况`;
    if (!el) return;
    el.innerHTML = `
      <div class="yzt-farm-kpi-two">
        <div class="yzt-farm-kpi-bigcard">
          <div class="yzt-farm-kpi-bigcard-lbl">总面积</div>
          <div class="yzt-farm-kpi-bigcard-num">${stats.totalAreaMu.toFixed(1)}</div>
          <div class="yzt-farm-kpi-bigcard-unit">万亩</div>
        </div>
        <div class="yzt-farm-kpi-bigcard">
          <div class="yzt-farm-kpi-bigcard-lbl">地块总数</div>
          <div class="yzt-farm-kpi-bigcard-num">${Math.round(stats.plotCount)}</div>
          <div class="yzt-farm-kpi-bigcard-unit">块</div>
        </div>
      </div>`;
  }

  function renderLandFarmDrillDonut(stats) {
    const donutEl = document.getElementById("left-chart-2-farm");
    const sub = document.getElementById("land-farm-donut-conclusion");
    const legEl = document.getElementById("land-farm-donut-legend");
    if (legEl) {
      var sliceColors = typeof FARM_DRILL_LAND_USE_COLORS !== "undefined" ? FARM_DRILL_LAND_USE_COLORS : {};
      var order = ["耕地", "草地", "其他", "建设用地"];
      const rows = order.map((name) => {
        const sw = sliceColors[name] || LAND_USE_COLORS[name] || "#6b7280";
        return `<li><span class="yzt-donut-legend-swatch" style="background:${sw}"></span><span>${name}</span></li>`;
      });
      legEl.innerHTML = `<ul class="yzt-donut-micro-legend-list">${rows.join("")}</ul>`;
    }
    if (!donutEl) return;
    donutEl.style.width = "100%";
    donutEl.style.height = "100%";
    disposeChart("left-chart-2-farm");
    const donut = initChart("left-chart-2-farm", {
      backgroundColor: "transparent",
      series: [{ type: "pie", radius: ["52%", "72%"], center: ["50%", "50%"], label: { show: false }, data: [] }]
    });
    if (donut) {
      donut.setOption(buildLandUseDonutOptionFromStats(stats, donut), true);
      donut.resize();
    }
  }

  function renderLandFarmDrillCertWaterfall(stats) {
    const rows = stats.certWaterfall || [];
    const heroEl = document.getElementById("land-hero-rate-farm");
    const concl = document.getElementById("land-farm-cert-conclusion");
    const wrap = document.querySelector("#land-view-farm .yzt-land-waterfall-wrap--farm-only-chart");
    const chartEl = document.getElementById("left-chart-3-farm");
    if (!rows.length || !chartEl) return;

    const totalMu = rows[0].areaMu;
    const segs = rows.slice(1);

    const paintChart = () => {
      const wrapBox = wrap ? wrap.getBoundingClientRect().height : 0;
      const chartH = Math.max(110, (wrapBox || 320) - 6);
      chartEl.style.width = "100%";
      chartEl.style.height = chartH + "px";
      chartEl.style.minHeight = "110px";

      disposeChart("left-chart-3-farm");
      const chart = initChart("left-chart-3-farm", {
        backgroundColor: "transparent",
        grid: { left: 4, right: 120, top: 4, bottom: 4, containLabel: true },
        xAxis: { type: "value", show: false },
        yAxis: { type: "category", data: [], axisLine: { show: false }, axisTick: { show: false } },
        series: []
      });
      if (!chart) return;

      const cats = rows.map((r) => r.label);
      const placeholders = [];
      const values = [];
      let acc = 0;
      placeholders.push(0);
      values.push({
        value: totalMu,
        itemStyle: {
          color: rows[0].color || SEM.muted,
          borderWidth: 2,
          borderColor: "rgba(2, 10, 22, 0.96)"
        },
        label: {
          show: true,
          position: "right",
          align: "left",
          formatter: `${totalMu.toFixed(1)}万亩 ${100.0}%`,
          color: "#ffffff",
          fontSize: 16,
          fontWeight: 700
        }
      });
      segs.forEach((it) => {
        placeholders.push(acc);
        const pct = it.sharePct != null ? Number(it.sharePct).toFixed(1) : fmtPct(it.areaMu, totalMu, 1);
        values.push({
          value: it.areaMu,
          itemStyle: {
            color: it.color || SEM.muted,
            borderWidth: 2,
            borderColor: "rgba(2, 10, 22, 0.96)"
          },
          label: {
            show: true,
            position: "right",
            align: "left",
            distance: 10,
            formatter: `${Number(it.areaMu).toFixed(1)}万亩 ${pct}%`,
            color: "#ffffff",
            fontSize: 16,
            fontWeight: 700
          }
        });
        acc += it.areaMu;
      });

      chart.setOption({
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "none" },
          backgroundColor: "rgba(4,14,26,0.94)",
          textStyle: { fontSize: LAND_FS.tip, color: "#e8f4ff" },
          formatter: (ps) => {
            const p = ps[1] || ps[0];
            if (!p) return "";
            return `${String(p.name).replace("\n", "")}<br/>${Number(p.value).toFixed(1)}万亩`;
          }
        },
        grid: { left: 138, right: 128, top: 10, bottom: 10, containLabel: false },
        xAxis: { type: "value", show: false, splitLine: { show: false }, max: totalMu },
        yAxis: {
          type: "category",
          data: cats,
          inverse: true,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: "rgba(200,220,235,0.92)",
            fontSize: LAND_FS.axis,
            fontWeight: 600,
            lineHeight: 22,
            width: 132
          }
        },
        series: [
          {
            type: "bar",
            stack: "wf",
            silent: true,
            itemStyle: { borderColor: "transparent", color: "transparent" },
            emphasis: { itemStyle: { borderColor: "transparent", color: "transparent" } },
            data: placeholders
          },
          {
            type: "bar",
            stack: "wf",
            barWidth: 30,
            barCategoryGap: 6,
            data: values
          }
        ]
      }, true);
      chart.resize();
    };

    paintChart();
    requestAnimationFrame(paintChart);
    setTimeout(paintChart, 120);
  }

  function renderLandFarmDrillTerraceDom(stats) {
    const el = document.getElementById("right-chart-1");
    if (!el) return;
    disposeChart("right-chart-1");
    if (chartResizeObservers["right-chart-1"]) {
      chartResizeObservers["right-chart-1"].disconnect();
      delete chartResizeObservers["right-chart-1"];
    }

    const sliceColors = typeof FARM_DRILL_LAND_USE_COLORS !== "undefined" ? FARM_DRILL_LAND_USE_COLORS : LAND_USE_COLORS;
    const order = ["耕地", "草地", "其他", "建设用地"];
    const totalMu = stats.totalAreaMu;
    const rows = order
      .map((name) => {
        const row = stats.landUse.find((u) => u.name === name);
        const areaMu = row && row.areaMu != null ? +Number(row.areaMu).toFixed(1) : 0;
        const pct = row ? +Number(row.pct).toFixed(1) : 0;
        const hPct = totalMu > 0 ? (areaMu / totalMu) * 100 : 0;
        return {
          name,
          areaMu,
          pct,
          hPct,
          color: sliceColors[name] || SEM.neutral
        };
      })
      .filter((r) => r.areaMu > 0);

    el.innerHTML = `
      <div class="yzt-land-terrace yzt-land-terrace--farm" role="img" aria-label="农场宗地类型分层占比">
        ${rows.map((r) => {
          return `
        <div class="yzt-land-terrace-tier yzt-land-terrace-tier--farm-inline" style="flex:0 0 ${r.hPct}%;background:${r.color};">
          <div class="yzt-land-terrace-label yzt-land-terrace-label--farm-inline">
            <span class="yzt-land-terrace-inline">${r.name}<br/>${r.areaMu.toFixed(1)}万亩<br/>${r.pct.toFixed(1)}%</span>
          </div>
        </div>`;
        }).join("")}
      </div>`;
  }

  function renderLandFarmDrillVillageBars(stats) {
    const el = document.getElementById("land-region-cards");
    if (!el) return;
    const rows = [...(stats.villages || [])].sort((a, b) => a.rate - b.rate);

    el.innerHTML = rows.map((r, i) => {
      const low = r.rate < 15;
      const fillClass = low ? "bar-fill--warn" : (i % 2 === 0 ? "bar-fill--core" : "bar-fill--second");
      const barW = Math.min(100, Math.max(8, r.rate));
      const rateCls = low ? "region-area region-area--warn" : "region-area";
      return `
        <div class="yzt-land-region-card${low ? " yzt-land-region-card--village-warn" : ""}">
          <div class="region-head">
            <span class="region-name">${r.name}</span>
            <span class="${rateCls}">${r.rate.toFixed(1)}%</span>
          </div>
          <div class="yzt-land-region-bar">
            <div class="bar-fill ${fillClass}" style="width:${barW}%"></div>
            <span class="bar-rate">完成率 ${r.rate.toFixed(1)}%</span>
          </div>
        </div>`;
    }).join("");
  }

  function renderLandFarmDrillChrome(stats) {
    renderLandFarmDrillKpiCards(stats);
    const donutSub = document.getElementById("land-farm-donut-conclusion");
    renderLandFarmDrillRightPanel(stats);
  }

  function renderLandFarmDrillPanelEchartsOnly(farmId) {
    const stats = getFarmDrillStats(farmId);
    if (!stats) return;
    renderLandFarmDrillDonut(stats);
    renderLandFarmDrillCertWaterfall(stats);
  }

  function renderLandFarmDrillRightPanel(stats) {
    setLandPanelTitles("farm", stats);
    var farmParcels = currentLandZones.filter(function(z) { return z.farmId === landDrillFarmId && z.zoneType === "use-patch"; });
    if (farmParcels.length) {
      renderLandCertPieChart(farmParcels);
      renderLandCertStatusChart(farmParcels);
    }
    /* 农场下钻时不渲染行政区确权占比 */
    var regionBlock = document.querySelector(".yzt-land-chart-block--progress");
    if (regionBlock) { regionBlock.classList.add("yzt-hidden"); regionBlock.style.display = "none"; }
  }

  function updateLandAnalysisPanels(parcels) {
    syncLandDrillUI();
    if (isLandFarmDrill() && landDrillFarmId) {
      const stats = getFarmDrillStats(landDrillFarmId);
      if (!stats) {
        /* 下钻目标无 FARM_LAND_DRILL 数据时退回集团总览，避免左右栏与地图统计空白 */
        exitLandDrill();
        return;
      }
      renderLandFarmDrillChrome(stats);
      scheduleFarmDrillChartPaint();
      return;
    }
    setLandPanelTitles("group", null);
    renderLandFarmCards(parcels);
    renderLandDonutChart(parcels);
    renderLandWaterfallChart(parcels);
    renderLandCertPieChart(parcels);
    renderLandCertStatusChart(parcels);
    /* 点击农场过滤时隐藏行政区确权占比，集团视图时显示 */
    var regionBlock = document.querySelector(".yzt-land-chart-block--progress");
    if (globalFilter.farm) {
      if (regionBlock) { regionBlock.classList.add("yzt-hidden"); regionBlock.style.display = "none"; }
    } else {
      if (regionBlock) { regionBlock.classList.remove("yzt-hidden"); regionBlock.style.display = ""; }
      renderLandRegionCards(parcels);
    }
  }

  function isBaseDataTab() {
    return currentBottomTab === "land";
  }

  function isPlantingDataTab() {
    return currentBottomTab === "plant";
  }

  function filterLandZones(zones, f) {
    let patches = zones.filter((z) => z.zoneType === "use-patch");
    if (f.farm) patches = patches.filter((z) => z.farmId === f.farm);
    if (f.useType) patches = patches.filter((z) => getPlotBase(z).useType === f.useType);
    if (f.rightType) patches = patches.filter((z) => getPlotBase(z).rightType === f.rightType);
    if (f.certStatus) patches = patches.filter((z) => getPlotBase(z).certStatus === f.certStatus);
    return patches;
  }

  function getModeConfig() {
    const modes = isPlantingDataTab() ? MAP_PLANT_MODES : MAP_BASE_MODES;
    return modes.find((m) => m.id === mapFilterMode) || modes[0];
  }

  function getVisibleWarnings() {
    const plotIds = currentPlots.map((p) => p.id);
    return YZT_DISASTER_WARNINGS.filter((w) => {
      if (!plotIds.includes(w.plotId)) return false;
      const farmOk = getFarmIds().includes(w.farmId);
      return farmOk;
    });
  }

  function highlightLeftModule() { /* 新布局无左栏模块 */ }

  function getLeftSearchQuery() {
    return (document.getElementById("left-search")?.value || "").trim().toLowerCase();
  }

  /* ---- 自定义下拉组件 ---- */
  const selectRegistry = {};

  function closeAllSelects(exceptId) {
    document.querySelectorAll(".yzt-select.open").forEach((el) => {
      if (el.id !== exceptId) el.classList.remove("open");
    });
  }

  function updateSelectUI(id) {
    const root = document.getElementById(id);
    const reg = selectRegistry[id];
    if (!root || !reg) return;
    const textEl = root.querySelector(".yzt-select-text");
    const placeholder = root.dataset.placeholder || "请选择";
    if (!reg.value) {
      textEl.textContent = placeholder;
      textEl.classList.add("is-placeholder");
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      const opt = reg.options.find((o) => o.value === reg.value);
      textEl.textContent = opt ? opt.label : placeholder;
      textEl.classList.remove("is-placeholder");
    }
    root.querySelectorAll(".yzt-select-option").forEach((node) => {
      node.classList.toggle("selected", node.dataset.value === reg.value);
    });
  }

  function setSelectValue(id, value, silent) {
    const reg = selectRegistry[id];
    if (!reg) return;
    reg.value = value || "";
    updateSelectUI(id);
    if (!silent) reg.onChange.forEach((fn) => fn(reg.value));
  }

  function getSelectValue(id) {
    return selectRegistry[id]?.value || "";
  }

  function mountCustomSelect(id) {
    const root = document.getElementById(id);
    if (!root || root.dataset.mounted) return;
    root.dataset.mounted = "1";
    root.innerHTML = `
      <button type="button" class="yzt-select-trigger">
        <span class="yzt-select-text is-placeholder">${root.dataset.placeholder || ""}</span>
        <span class="yzt-select-arrow"></span>
      </button>
      <div class="yzt-select-dropdown">
        <div class="yzt-select-dropdown-head">${root.dataset.placeholder || "请选择"}</div>
        <div class="yzt-select-options"></div>
      </div>`;

    selectRegistry[id] = { value: "", options: [], onChange: [] };

    root.querySelector(".yzt-select-trigger").addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = root.classList.contains("open");
      closeAllSelects();
      if (!isOpen) root.classList.add("open");
    });
  }

  function renderSelectOptions(id, options, keepValue) {
    mountCustomSelect(id);
    const root = document.getElementById(id);
    const reg = selectRegistry[id];
    const prev = keepValue ? reg.value : "";
    reg.options = options;
    const dropdown = root.querySelector(".yzt-select-options");
    dropdown.innerHTML = options.map((o) =>
      `<div class="yzt-select-option${o.value === prev ? " selected" : ""}" data-value="${o.value}">${o.label}</div>`
    ).join("");

    dropdown.querySelectorAll(".yzt-select-option").forEach((node) => {
      node.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelectValue(id, node.dataset.value);
        root.classList.remove("open");
      });
    });

    setSelectValue(id, prev, true);
  }

  function onSelectChange(id, fn) {
    mountCustomSelect(id);
    selectRegistry[id].onChange.push(fn);
  }

  document.addEventListener("click", () => closeAllSelects());

  /* ---- 缩放 ---- */
  function scaleDashboard() {
    const inner = document.getElementById("scale-inner");
    const scale = Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H);
    inner.style.transform = `scale(${scale})`;
    inner.style.width = BASE_W + "px";
    inner.style.height = BASE_H + "px";
    Object.values(charts).forEach((c) => c && c.resize());
    if (gisMap) setTimeout(() => gisMap.invalidateSize(), 100);
  }

  window.addEventListener("resize", scaleDashboard);
  scaleDashboard();

  /* ---- 时钟 ---- */
  function updateClock() {
    const el = document.getElementById("clock");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString("zh-CN", { hour12: false });
  }
  setInterval(updateClock, 1000);
  updateClock();

  function updateHeaderWeather() {
    var temps = [24, 25, 26, 27, 28, 29];
    var icons = ["☀", "⛅", "☁", "🌤"];
    var descs = ["晴", "多云", "阴", "晴间多云"];
    var now = new Date();
    var idx = Math.floor(now.getHours() / 6) % 4;
    var temp = temps[idx] + Math.floor(Math.random() * 3);
    var humid = 45 + Math.floor(Math.random() * 20);
    document.getElementById("hw-temp") && (document.getElementById("hw-temp").textContent = temp + "°");
    document.getElementById("hw-icon") && (document.getElementById("hw-icon").textContent = icons[idx]);
    document.getElementById("hw-desc") && (document.getElementById("hw-desc").textContent = descs[idx]);
    document.getElementById("hw-humid") && (document.getElementById("hw-humid").textContent = "湿度" + humid + "%");
  }
  setInterval(updateHeaderWeather, 600000);
  updateHeaderWeather();

  /* ---- 页面标题（下钻农场/公司） ---- */
  function getFarmDisplayName(farmId) {
    const s = SUBSIDIARIES.find((x) => x.id === farmId);
    if (!s) return "";
    return s.detail?.companyName || s.name;
  }

  function resolveViewLabel() {
    if (landDrillFarmId) return getFarmDisplayName(landDrillFarmId);
    if (globalFilter.farm) return getFarmDisplayName(globalFilter.farm);
    if (currentPerm && currentPerm !== "group") {
      const s = SUBSIDIARIES.find((x) => x.id === currentPerm);
      if (s) return getFarmDisplayName(s.id);
      return PERMISSIONS[currentPerm]?.label || "";
    }
    return "";
  }

  function updatePageTitle() {
    const el = document.getElementById("yzt-page-title");
    if (!el) return;
    if (isLandFarmDrill() && landDrillFarmId) {
      const s = SUBSIDIARIES.find((x) => x.id === landDrillFarmId);
      el.textContent = s ? `${PAGE_TITLE_BASE}·${s.name}` : PAGE_TITLE_BASE;
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      const label = resolveViewLabel();
      el.textContent = label ? `${PAGE_TITLE_BASE}-${label}` : PAGE_TITLE_BASE;
    }
  }

  function exitFarmView() {
    exitLandDrill();
    currentPerm = "group";
    activeFarmCardId = null;
    activePlotId = null;
    selectedLeftFarm = "baicheng";
    document.querySelectorAll(".yzt-farm-pick").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.farm === "baicheng");
    });
    renderPlotDetail(null);
    globalFilter.farm = "";
    document.getElementById("yzt-modal-overlay")?.classList.add("hidden");
    closeParcelDetailModal();
    applyFilter();
    if (gisMap && !isBaseDataTab()) {
      gisMap.setView(MAP_DEFAULT.center, MAP_DEFAULT.zoom, { animate: true, duration: 0.8 });
    }
  }

  function enterFarmView(farmId, opts = {}) {
    const s = SUBSIDIARIES.find((x) => x.id === farmId);
    if (!s) return;

    if (isBaseDataTab() && (opts.landDrill || (!opts.openPlot && !opts.openFarmModal))) {
      enterLandDrill(farmId);
      return;
    }

    activeFarmCardId = farmId;
    currentPerm = PERMISSIONS[farmId] ? farmId : "group";
    globalFilter.farm = farmId;

    if (opts.plot) activePlotId = opts.plot.id;
    if (LEFT_FARM_OPTIONS.some((f) => f.id === farmId)) {
      selectedLeftFarm = farmId;
      document.querySelectorAll(".yzt-farm-pick").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.farm === farmId);
      });
    }

    applyFilter();

    if (opts.plot && gisMap) {
      gisMap.flyTo([opts.plot.lat, opts.plot.lng], 11, { duration: 0.8 });
    } else if (gisMap) {
      gisMap.flyTo([s.lat, s.lng], 10, { duration: opts.duration ?? 0.8 });
    }

    if (opts.openPlot && opts.plot) openPlotModal(opts.plot);
    else if (opts.openFarmModal) openFarmModal(farmId);

    renderLeftSidebar();
  }

  /* ---- 权限 ---- */
  function getFarmIds() {
    return PERMISSIONS[currentPerm]?.farms || PERMISSIONS.group.farms;
  }

  /** 地图上展示的农场（土地资源始终标出全部有权农场点位） */
  function getMapFarmMarkers() {
    const ids = isBaseDataTab() ? PERMISSIONS.group.farms : getFarmIds();
    return filterByPermission(ids);
  }

  function createFarmPointIcon(farmId) {
    const active = landDrillFarmId === farmId;
    const dimmed = landDrillFarmId && landDrillFarmId !== farmId;
    const cls = [
      "yzt-marker yzt-farm-point",
      active ? "is-active" : "",
      dimmed ? "is-dimmed" : ""
    ].filter(Boolean).join(" ");
    return L.divIcon({
      className: cls,
      html: `<div class="yzt-farm-pin"><span class="m-ring"></span><span class="m-core"></span></div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  }

  function showFarmPointPopup(farmId, latlng) {
    const s = SUBSIDIARIES.find(function(x) { return x.id === farmId; });
    if (!s) return;
    var stats = getFarmDrillStats(farmId);
    if (!stats) return;

    /* 从 certWaterfall 提取确权各阶段面积 */
    function wfVal(label) {
      var entry = (stats.certWaterfall || []).find(function(w) { return w.label === label; });
      return entry ? entry.areaMu.toFixed(1) : "—";
    }
    var totalArea = wfVal("总面积");
    var certIssued = wfVal("已发证");
    var certRegistered = wfVal("已登记未发证");
    var certConfirmed = wfVal("已确权未登记");
    var certUnconfirmed = wfVal("未确权");

    /* 土地利用类型 */
    var landUseRows = (stats.landUse || []).map(function(lu) {
      return '<div class="yzt-farm-popup-table-row">' +
        '<span class="fp-cell fp-cell--type">' + lu.name + '</span>' +
        '<span class="fp-cell fp-cell--num">' + lu.areaMu.toFixed(1) + '</span>' +
      '</div>';
    }).join("");

    var reason = stats.certConclusion || "暂无";

    var bodyEl = document.getElementById("farm-popup-body");
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="yzt-farm-popup-name">' + s.name + '</div>' +

        /* 土地类型 + 权籍调查面积 */
        '<div class="yzt-farm-popup-section">' +
          '<div class="yzt-farm-popup-table-header">' +
            '<span class="fp-cell fp-cell--type fp-th">土地类型</span>' +
            '<span class="fp-cell fp-cell--num fp-th">权籍调查面积（亩）</span>' +
          '</div>' +
          landUseRows +
          '<div class="yzt-farm-popup-table-row yzt-farm-popup-table-row--total">' +
            '<span class="fp-cell fp-cell--type">合计</span>' +
            '<span class="fp-cell fp-cell--num">' + totalArea + '</span>' +
          '</div>' +
        '</div>' +

        /* 确权状态面积明细 */
        '<div class="yzt-farm-popup-section">' +
          '<div class="yzt-farm-popup-table-header">' +
            '<span class="fp-cell fp-cell--type fp-th">确权状态</span>' +
            '<span class="fp-cell fp-cell--num fp-th">面积（亩）</span>' +
          '</div>' +
          '<div class="yzt-farm-popup-table-row"><span class="fp-cell fp-cell--type">已发证面积</span><span class="fp-cell fp-cell--num">' + certIssued + '</span></div>' +
          '<div class="yzt-farm-popup-table-row"><span class="fp-cell fp-cell--type">已登记未发证面积</span><span class="fp-cell fp-cell--num">' + certRegistered + '</span></div>' +
          '<div class="yzt-farm-popup-table-row"><span class="fp-cell fp-cell--type">确权未登记面积</span><span class="fp-cell fp-cell--num">' + certConfirmed + '</span></div>' +
          '<div class="yzt-farm-popup-table-row"><span class="fp-cell fp-cell--type">未确权面积</span><span class="fp-cell fp-cell--num fp-cell--warn">' + certUnconfirmed + '</span></div>' +
        '</div>' +

        /* 未确权原因 */
        '<div class="yzt-farm-popup-reason">' +
          '<span class="fp-reason-label">未确权原因：</span>' +
          '<span class="fp-reason-text">' + reason + '</span>' +
        '</div>';
    }

    var popup = document.getElementById("farm-point-popup");
    if (!popup) return;

    farmPointPopupLatLng = latlng;
    repositionFarmPointPopup();
    popup.classList.remove("yzt-hidden");

    /* 镇南种羊场：显示右侧"示范产业园区"拉手 */
    if (farmId === "zhennan") {
      document.getElementById("org-handle")?.classList.remove("yzt-hidden");
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      document.getElementById("org-handle")?.classList.add("yzt-hidden");
      document.getElementById("org-panel")?.classList.add("yzt-hidden");
    }

    if (!farmPointPopupMoveBound) {
      farmPointPopupMoveBound = true;
      gisMap.on("move", repositionFarmPointPopup);
      gisMap.on("zoom", repositionFarmPointPopup);
    }
  }

  function repositionFarmPointPopup() {
    var popup = document.getElementById("farm-point-popup");
    if (!popup || !farmPointPopupLatLng) return;
    var px = gisMap.latLngToContainerPoint(farmPointPopupLatLng);
    popup.style.left = px.x + "px";
    popup.style.top = (px.y - 40) + "px";
  }

  function closeFarmPointPopup() {
    farmPointPopupLatLng = null;
    var popup = document.getElementById("farm-point-popup");
    if (popup) popup.classList.add("yzt-hidden");
    document.getElementById("org-handle")?.classList.add("yzt-hidden");
    document.getElementById("org-panel")?.classList.add("yzt-hidden");
  }

  function applyPermission() {
    currentDevices = YZT_DEVICES.filter((d) => {
      const farm = SUBSIDIARIES.find((s) => s.name === d.farm);
      return farm && getFarmIds().includes(farm.id);
    });
    applyFilter();
  }

  /* ---- 图例筛选（点击图例项过滤） ---- */
  function clearBaseFillFilters() {
    MAP_BASE_MODES.forEach((m) => {
      globalFilter[m.fillKey] = "";
    });
  }

  function clearPlantFillFilters() {
    MAP_PLANT_MODES.forEach((m) => {
      globalFilter[m.fillKey] = "";
    });
  }

  function toggleLegendFilter(key, value) {
    if (!key) return;
    if (key === "farm" && isBaseDataTab()) {
      if (landDrillFarmId === value) exitLandDrill();
      else enterLandDrill(value);
      return;
    }
    if (key === "iotType") {
      iotFilter.type = iotFilter.type === value ? null : value;
      applyFilter();
      return;
    }
    if (key === "iotStatus") {
      iotFilter.status = iotFilter.status === value ? null : value;
      applyFilter();
      return;
    }
    if (key === "iotFarm") {
      iotFilter.farm = iotFilter.farm === value ? null : value;
      applyFilter();
      return;
    }
    globalFilter[key] = globalFilter[key] === value ? "" : value;
    applyFilter();
  }

  function applyFilter() {
    let plots = getPlotsForFarms(getFarmIds());
    let landZones = getLandResourceZones(getFarmIds());
    const f = globalFilter;

    if (f.farm) plots = plots.filter((p) => p.farmId === f.farm);
    if (!isPlantingDataTab()) {
      if (f.rightType) plots = plots.filter((p) => getPlotBase(p).rightType === f.rightType);
      if (f.certStatus) plots = plots.filter((p) => getPlotBase(p).certStatus === f.certStatus);
      if (f.useType) plots = plots.filter((p) => getPlotBase(p).useType === f.useType);
    }

    if (isPlantingDataTab()) {
      plots = plots.filter((p) => getPlotBase(p).useType === "耕地");
      if (f.crop) plots = plots.filter((p) => getPlotPlanting(p).crop === f.crop);
      if (f.remoteStatus) {
        plots = plots.filter((p) => getPlotPlanting(p).remoteStatus === f.remoteStatus);
      }
    }

    currentLandZones = (isBaseDataTab() || currentBottomTab === "iot")
      ? filterLandZones(landZones, f)
      : landZones;
    currentPlots = plots;

    /* IoT 设备筛选 */
    if (currentBottomTab === "iot") {
      currentDevices = YZT_DEVICES.filter(function(d) {
        var farm = SUBSIDIARIES.find(function(s) { return s.name === d.farm; });
        if (!farm || !getFarmIds().includes(farm.id)) return false;
        if (iotFilter.type && d.type !== iotFilter.type) return false;
        if (iotFilter.status && d.status !== iotFilter.status) return false;
        if (iotFilter.farm && d.farm !== iotFilter.farm) return false;
        return true;
      });
    }

    highlightLeftModule();
    updateMapFilterScope();
    refreshMap();
    renderAllPanels();
    renderMapLegend();
    renderIotMapLegend();
    renderMapLandStats();
    renderMapWeatherFloat();
    renderLandUseLegend();
    updateJilinOutlineStyle();
    updatePageTitle();
  }

  let legendFiltersBound = false;

  function buildFilterChip(filterKey, value, label, swStyle, active, borderChip) {
    const borderClass = borderChip ? " border-style" : "";
    return `<button type="button" class="yzt-legend-chip filter-chip${borderClass}${active ? " active" : ""}" data-filter-key="${filterKey}" data-filter-value="${value}"><span class="sw" style="${swStyle}"></span>${label}</button>`;
  }

  function bindLegendFilterClicks() {
    if (legendFiltersBound) return;
    legendFiltersBound = true;
    document.getElementById("map-filter-body")?.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;
      toggleLegendFilter(chip.dataset.filterKey, chip.dataset.filterValue);
    });
  }

  function initMapModeTabs() {
    document.querySelectorAll("#map-mode-plant .yzt-mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll("#map-mode-plant .yzt-mode-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        mapFilterMode = tab.dataset.mode;
        MAP_PLANT_MODES.forEach((m) => {
          if (m.id !== mapFilterMode) globalFilter[m.fillKey] = "";
        });
        applyFilter();
      });
    });
  }

  function updateMapFilterScope() {
    const modeTabs = document.getElementById("map-mode-tabs");
    const plantGroup = document.getElementById("map-mode-plant");

    document.querySelectorAll(".yzt-filter-base").forEach((el) => {
      if (el.id === "map-land-stats") return;
      el.classList.toggle("yzt-hidden", !isBaseDataTab());
    });
    document.querySelectorAll(".yzt-filter-plant").forEach((el) => {
      el.classList.toggle("yzt-hidden", !isPlantingDataTab());
    });
    document.querySelectorAll(".yzt-filter-shared").forEach((el) => {
      el.classList.toggle("yzt-hidden", false);
    });

    if (isBaseDataTab()) {
      mapFilterMode = "land";
      document.getElementById("map-filter-bar")?.classList.remove("yzt-hidden");
      document.querySelector(".yzt-map-wrap")?.setAttribute("data-map-scope", "land");
      updateJilinOutlineStyle();
    } else if (isPlantingDataTab()) {
      document.getElementById("map-filter-bar")?.classList.add("yzt-hidden");
      document.querySelector(".yzt-map-wrap")?.setAttribute("data-map-scope", "plant");
      updateJilinOutlineStyle();
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      mapFilterMode = "land";
      document.getElementById("map-filter-bar")?.classList.remove("yzt-hidden");
      document.querySelector(".yzt-map-wrap")?.setAttribute("data-map-scope", "iot");
      updateJilinOutlineStyle();
    }
    syncBaselineOverlayVisibility();
    if (isBaseDataTab() && !isLandFarmDrill() && !globalFilter.farm) applyLandMapView(true);
  }

  function getMapResetView() {
    if (isBaseDataTab() && typeof MAP_LAND_VIEW !== "undefined") {
      return { center: MAP_LAND_VIEW.center, zoom: MAP_LAND_VIEW.zoom };
    }
    return { center: MAP_DEFAULT.center, zoom: MAP_DEFAULT.zoom };
  }

  function applyLandMapView(animate) {
    if (!gisMap) return;
    var allBounds = null;

    if (isPlantingDataTab()) {
      /* 种植经营：适配当前种植地块边界 */
      currentPlots.forEach(function(p) {
        var ll = L.latLng(p.lat, p.lng);
        allBounds = allBounds ? allBounds.extend(ll) : L.latLngBounds(ll, ll);
      });
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      /* 土地资源 / 物联网：适配农场宗地边界 */
      var farmIds = getFarmIds();
      farmIds.forEach(function(fid) {
        var b = getFarmPlotBounds(fid);
        if (b && typeof b.isValid === "function" && b.isValid()) {
          allBounds = allBounds ? allBounds.extend(b) : b;
        }
      });
    }

    if (allBounds && typeof allBounds.isValid === "function" && allBounds.isValid()) {
      var padding = currentBottomTab === "iot" ? [20, 20] : [60, 60];
      gisMap.flyToBounds(allBounds, { padding: padding, animate: !!animate, duration: animate ? 0.8 : 0 });
    } else if (typeof MAP_LAND_VIEW !== "undefined") {
      gisMap.setView(MAP_LAND_VIEW.center, MAP_LAND_VIEW.zoom, { animate: !!animate, duration: animate ? 0.6 : 0 });
    }
  }

  function getLandZoneLineColor(zone) {
    const mode = getModeConfig();
    const base = getPlotBase(zone);
    const fillVal = base[mode.fillKey];
    return mode.fillMap[fillVal] || "#00D4FF";
  }

  function tagLandPath(layer, className) {
    const apply = () => {
      if (layer._path) layer._path.classList.add(className);
    };
    layer.on("add", apply);
    apply();
  }

  function getLandUseFillColor(useType) {
    return LAND_USE_FILL_COLORS[useType] || "rgba(0, 212, 255, 0.18)";
  }

  function applyBaselineOverlayStyle(layer) {
    const spec = typeof LAND_BASELINE_LINE_STYLE !== "undefined" ? LAND_BASELINE_LINE_STYLE : null;
    if (!spec || !layer) return;
    const apply = () => {
      const el = layer.getElement?.();
      if (!el) return;
      el.style.opacity = String(spec.opacity ?? 1);
      el.style.background = spec.background || "rgba(249, 243, 243, 0)";
    };
    layer.on("add", apply);
    apply();
  }

  /** 土地资源：透明勾勒 PNG（叠在底图之上，非替代底图） */
  function initBaselineOverlay() {
    const cfg = typeof LAND_BASELINE_OVERLAY !== "undefined" ? LAND_BASELINE_OVERLAY : null;
    if (!gisMap || !cfg?.url || !cfg.bounds) return;

    if (baselineOverlayLayer) {
      gisMap.removeLayer(baselineOverlayLayer);
      baselineOverlayLayer = null;
    }

    baselineOverlayLayer = L.imageOverlay(cfg.url, cfg.bounds, {
      opacity: cfg.opacity ?? 1,
      interactive: false,
      className: "yzt-land-baseline-overlay"
    });
    applyBaselineOverlayStyle(baselineOverlayLayer);
  }

  function syncBaselineOverlayVisibility() {
    if (!gisMap || !baselineOverlayLayer) return;
    if (isLandFarmDrill()) {
      if (gisMap.hasLayer(baselineOverlayLayer)) gisMap.removeLayer(baselineOverlayLayer);
      return;
    }
    if (isBaseDataTab()) {
      if (!gisMap.hasLayer(baselineOverlayLayer)) baselineOverlayLayer.addTo(gisMap);
    } else if (gisMap.hasLayer(baselineOverlayLayer)) {
      gisMap.removeLayer(baselineOverlayLayer);
    }
  }

  function renderLandUseLegend() {
    document.getElementById("map-land-use-legend")?.classList.add("hidden");
  }

  function updateJilinOutlineStyle() {
    /* 单张静态底图已含省界勾勒，不再叠加 GeoJSON / 在线瓦片 */
  }

  function getLandZoneStyle(zone) {
    const mode = getModeConfig();
    const base = getPlotBase(zone);
    let fillVal = base[mode.fillKey];
    let fillColor = mode.fillMap[fillVal];

    if (mapFilterMode === "saline") {
      fillColor = fillVal ? SALINE_COLORS[fillVal] : "#3a3a3a";
    }

    /* 光谱着色：所有场景子指标 */
    if (sceneSub) {
      var spectralColors = {
        /* 气象 */
        temp: ["#8B0000","#E85000","#FFB800","#87CEEB","#1E3A8A","#1a0066"],
        rain: ["#ef4444","#f97316","#facc15","#4ade80","#0ea5e9","#1E3A8A"],
        wind: ["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6"],
        light: ["#7f1d1d","#dc2626","#f97316","#f59e0b","#fbbf24","#fde68a"],
        humid: ["#0ea5e9","#38bdf8","#7dd3fc","#bae6fd","#e0f2fe","#f0f9ff"],
        /* 土壤 */
        n: ["#006837","#31A354","#78C679","#C2E699","#FDB863","#E34A33"],
        p: ["#006837","#31A354","#78C679","#C2E699","#FDB863","#E34A33"],
        k: ["#006837","#31A354","#78C679","#C2E699","#FDB863","#E34A33"],
        organic: ["#006837","#31A354","#78C679","#C2E699","#FDB863","#E34A33"],
        /* 墒情 / 土壤温度 */
        moist: ["#ef4444","#f97316","#facc15","#a3e635","#4ade80","#22d3ee","#0ea5e9","#1E3A8A","#1a0066"],
        soilT: ["#8B0000","#E85000","#FFB800","#87CEEB","#1E3A8A","#1a0066"],
        /* 作物长势 / 估值 */
        growth: ["#006837","#31A354","#78C679","#C2E699","#FDB863","#E34A33","#7f1d1d"],
        value:  ["#006837","#31A354","#78C679","#C2E699","#FDB863","#E34A33","#7f1d1d"]
      };
      var colors = spectralColors[sceneSub];
      if (colors) {
        var seed = (zone.lat * 1000 + zone.lng * 1000) % 100;
        var level = Math.floor(((Math.sin(seed * (sceneSub.length * 0.31 + 0.47)) + 1) / 2) * colors.length);
        level = Math.max(0, Math.min(colors.length - 1, level));
        fillColor = colors[level];
      }
    }

    if (!fillColor) fillColor = "#4B5563";

    const border = USE_TYPE_BORDERS[base.useType] || USE_TYPE_BORDERS["其他用地"];
    let fillOpacity = mapFilterMode === "saline" && !base.saline ? 0.08 : 0.42;
    if (sceneSub) fillOpacity = 0.55;

    return {
      color: border.color,
      weight: Math.max(border.weight, 2),
      dashArray: border.dashArray || null,
      fillColor,
      fillOpacity,
      smoothFactor: 1.5
    };
  }

  function getPlantPlotStyle(p) {
    var rentType = getPlotBase(p).rentType || "统种地";
    var isTong = rentType !== "外租地";
    var typeKey = isTong ? "tong" : "rent";
    var active = typeof plotTypeFilter !== "undefined" ? plotTypeFilter[typeKey] !== false : true;
    var fillHex = isTong ? "#00FF88" : "#0066FF";
    var style = {
      color: "#ffffff",
      weight: 1.5,
      fillColor: active ? hexToRgba(fillHex, 0.55) : "rgba(100,100,100,0.15)",
      fillOpacity: 1,
      dashArray: null
    };
    if (activePlotId === p.id) {
      style.weight = 2.5;
      style.fillColor = active ? hexToRgba(fillHex, 0.72) : "rgba(120,120,120,0.2)";
    }
    var disaster = getDisasterForPlot(p.id);
    if (disaster && isLayerActive("disaster")) {
      var dc = { yellow: "#FFB800", blue: "#00D4FF", orange: "#FF6B6B", red: "#FF2222" };
      var dh = dc[disaster.level] || "#FF4444";
      style.weight = 2.5;
      style.fillColor = hexToRgba(dh, 0.42);
    }
    return style;
  }

  function addPlotParcelLayers(p, plotG) {
    var feature = createPlotFieldPolygon(
      p.lat,
      p.lng,
      p.parcelW || 0.014,
      p.parcelH || 0.011,
      p.fieldSeed || p.lat + p.lng
    );
    var parcelLayer = L.geoJSON(feature, { style: getPlantPlotStyle(p) });
    parcelLayer.eachLayer(function(layer) {
      tagLandPath(layer, "yzt-plot-parcel");
      layer.bindTooltip(getPlotTooltip(p), { sticky: true, className: "yzt-map-tooltip" });
      layer.on("click", function() { handlePlotClick(p); });
    });
    parcelLayer.addTo(plotG);
  }

  function getPlotStyle(p) {
    const mode = getModeConfig();
    const base = getPlotBase(p);
    const planting = getPlotPlanting(p);
    const source = mode.scope === "planting" ? planting : base;
    let fillVal = source[mode.fillKey];
    let fillColor = mode.fillMap[fillVal];

    if (mapFilterMode === "saline") {
      fillColor = fillVal ? SALINE_COLORS[fillVal] : "#3a3a3a";
    }
    if (!fillColor) {
      fillColor = mapFilterMode === "crop"
        ? (CROP_COLORS[planting.crop] || "#6B7280")
        : "#4B5563";
    }

    const border = USE_TYPE_BORDERS[base.useType] || USE_TYPE_BORDERS["其他用地"];
    let fillOpacity = mapFilterMode === "saline" && !base.saline ? 0.08 : 0.38;

    const disaster = getDisasterForPlot(p.id);
    const style = {
      color: border.color,
      weight: border.weight,
      dashArray: border.dashArray || null,
      fillColor,
      fillOpacity
    };

    if (disaster && isLayerActive("disaster")) {
      const dc = { yellow: "#FFB800", blue: "#00D4FF", orange: "#FF6B6B", red: "#FF2222" };
      style.color = dc[disaster.level] || "#FF4444";
      style.weight = 4;
      style.fillOpacity = 0.55;
      if (activeDisasterId === disaster.id) {
        style.weight = 6;
        style.fillOpacity = 0.7;
      }
    }

    return style;
  }

  function renderMapLegend() {
    const mode = getModeConfig();
    const certEl = document.getElementById("map-cert-legend");
    const fillEl = document.getElementById("map-fill-legend");
    const borderEl = document.getElementById("map-border-legend");
    const fillLabelEl = document.getElementById("map-fill-legend-label");
    const showBaseLegends = isBaseDataTab() || currentBottomTab === "iot";

    if (fillLabelEl) fillLabelEl.textContent = mode.label;

    if (showBaseLegends) {
      if (certEl) {
        certEl.innerHTML = YZT_LAND_INPUT_CHART.categories.map((label) => {
          const active = globalFilter.certStatus === label;
          const color = typeof getCadastralMapFillColor === "function"
            ? getCadastralMapFillColor(label)
            : CERT_STATUS_COLORS[label] || "#9CA3AF";
          return buildFilterChip("certStatus", label, label, `background:${color}`, active);
        }).join("");
      }
      if (fillEl) fillEl.innerHTML = "";
    } else if (fillEl) {
      const fillKey = mode.fillKey;
      fillEl.innerHTML = Object.entries(mode.fillMap).map(([label, color]) => {
        const active = globalFilter[fillKey] === label;
        return buildFilterChip(fillKey, label, label, `background:${color}`, active);
      }).join("");
      if (certEl) certEl.innerHTML = "";
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      if (certEl) certEl.innerHTML = "";
      if (fillEl) fillEl.innerHTML = "";
    }

    if (isPlantingDataTab()) {
      if (borderEl) borderEl.innerHTML = "";
    } else if (borderEl) {
      borderEl.innerHTML = Object.entries(USE_TYPE_BORDERS).map(([label, b]) => {
        const active = globalFilter.useType === label;
        const dash = b.dashArray ? "dashed" : "solid";
        return buildFilterChip(
          "useType",
          label,
          label,
          `background:transparent;border-color:${b.color};border-style:${dash}`,
          active,
          true
        );
      }).join("");
    }
  }

  /* ---- IoT 地图设备图例筛选面板 ---- */
  function renderIotMapLegend() {
    var panel = document.getElementById("map-device-legend");
    if (!panel) return;
    var isIot = currentBottomTab === "iot";
    panel.classList.toggle("yzt-hidden", !isIot);
    if (!isIot) return;

    var statusEl = document.getElementById("iot-status-legend");

    if (statusEl) {
      statusEl.innerHTML = [
        { val: "online", label: "在线", color: "#00FF88" },
        { val: "offline", label: "离线", color: "#9CA3AF" },
        { val: "fault", label: "异常", color: "#FF6B6B" }
      ].map(function(s) {
        return buildFilterChip("iotStatus", s.val, s.label, "background:" + s.color, iotFilter.status === s.val);
      }).join("");
    }
  }

  function getLandZoneTooltip(zone) {
    const mode = getModeConfig();
    const base = getPlotBase(zone);
    const value = base[mode.fillKey] || "—";
    return `<b>${zone.zoneName}</b><br/>${mode.label}: ${value}<br/>用地: ${base.useType}<br/>面积: ${zone.area}万公顷`;
  }

  function getPlotTooltip(p) {
    const mode = getModeConfig();
    const base = getPlotBase(p);
    const planting = getPlotPlanting(p);
    const disaster = getDisasterForPlot(p.id);
    let value = "—";

    if (isPlantingDataTab()) {
      if (mapFilterMode === "remote") {
        value = `NDVI ${planting.ndvi} · ${planting.remoteStatus}`;
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
        value = `${planting.crop} · ${planting.variety || "—"}`;
      }
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      value = base[mode.fillKey] || "—";
    }

    return `<b>${p.plotName}</b><br/>${mode.label}: ${value}<br/>用地: ${base.useType}${disaster ? `<br/><span style="color:#FF6B6B">⚠ ${disaster.type}${disaster.levelLabel}</span>` : ""}`;
  }

  function handleLandZoneClick(zone) {
    if (isBaseDataTab()) openLandParcelDetailModal(zone);
  }

  function handlePlotClick(p) {
    if (!gisMap) return;
    activePlotId = p.id;
    const disaster = getDisasterForPlot(p.id);
    if (disaster && isLayerActive("disaster")) {
      openDisasterModal(disaster, p);
      return;
    }
    gisMap.flyTo([p.lat, p.lng], 12, { duration: 0.6 });
    showMapBanner(formatPlotLabel(p));
    selectLeftPlot(p);
    if (isPlantingDataTab()) {
      refreshMap();
      if (sceneMode === "planting") {
        showPlotInfoCard(p);
        renderPlotDetailPanel(p);
      }
      if (sceneMode === "weather") {
        showPlotInfoCard(p);
        renderWeatherPlotDetail(p);
      }
      if (sceneMode === "soil") {
        showPlotInfoCard(p);
        renderSoilPlotDetail(p);
      }
      return;
    }
    enterFarmView(p.farmId, { plot: p, openPlot: true });
  }

  function certStatusLabel(status) {
    if (status === "已登记待发证") return "已登记未发证";
    return status || "—";
  }

  function getFarmDrillParcels() {
    if (!isLandFarmDrill() || !landDrillFarmId) return [];
    return getFilteredLandParcels().filter((z) => z.farmId === landDrillFarmId);
  }

  function getFarmDrillParcelStyle(zone, hover) {
    const base = getPlotBase(zone);
    const hex = typeof getCadastralMapFillColor === "function"
      ? getCadastralMapFillColor(base.certStatus)
      : LAND_CERT_COLORS[base.certStatus] || "#4b5563";
    const thick = !!hover || hoveredFarmParcelId === zone.id || (selectedFarmParcelId && selectedFarmParcelId === zone.id);
    const un = base.certStatus === "未确权";
    const alpha = un
      ? thick ? 0.42 : 0.36
      : thick ? 0.34 : 0.28;
    const lineWt = thick ? 1.5 : 1;
    return {
      color: "#ffffff",
      weight: lineWt,
      dashArray: null,
      lineCap: "round",
      lineJoin: "round",
      fillColor: hexToRgba(hex, alpha),
      fillOpacity: 1,
      smoothFactor: 1
    };
  }

  function getFarmParcelHoverHtml(zone) {
    const b = getPlotBase(zone);
    const code = zone.plotCode || b.boundaryCode || zone.zoneName || "—";
    return `<div class="yzt-parcel-hover-card yzt-parcel-hover-card--landtip">
      <div class="yzt-parcel-hover-title">${code}</div>
      <div class="yzt-parcel-hover-row"><span class="k">面积</span><span class="v">${fmtMu(zone.area, 1)}万亩</span></div>
      <div class="yzt-parcel-hover-row"><span class="k">权籍状态</span><span class="v">${certStatusLabel(b.certStatus)}</span></div>
    </div>`;
  }

  function escapeHtmlAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function pdRow(label, value, valueHl) {
    const hl = valueHl ? " yzt-pd-hl" : "";
    return `<div class="yzt-pd-row"><span class="yzt-pd-k">${escapeHtmlAttr(label)}</span><span class="yzt-pd-v${hl}">${escapeHtmlAttr(value)}</span></div>`;
  }

  function refreshFarmParcelStyles() {
    const g = layerGroups.farmParcels;
    if (!g || typeof g.eachLayer !== "function") return;
    g.eachLayer((gj) => {
      gj.eachLayer((layer) => {
        if (layer._yztZoneRef && layer.setStyle) {
          const z = layer._yztZoneRef;
          layer.setStyle(getFarmDrillParcelStyle(z, hoveredFarmParcelId === z.id));
        }
      });
    });
  }

  function destroyParcelDetailMiniMap() {
    if (!parcelDetailMiniMap) return;
    try {
      parcelDetailMiniMap.remove();
    } catch (err) {
      /* ignore */
    }
    parcelDetailMiniMap = null;
    const mapEl = document.getElementById("yzt-parcel-detail-map");
    if (mapEl) mapEl.innerHTML = "";
  }

  function closeParcelDetailModal() {
    if (parcelDetailEscHandler) {
      document.removeEventListener("keydown", parcelDetailEscHandler);
      parcelDetailEscHandler = null;
    }
    destroyParcelDetailMiniMap();
    if (farmParcelYztModalActive) {
      document.getElementById("yzt-modal-overlay")?.classList.add("hidden");
      farmParcelYztModalActive = false;
    }
    selectedFarmParcelId = null;
    const ov = document.getElementById("yzt-parcel-detail-overlay");
    if (ov) {
      ov.classList.add("hidden");
      ov.setAttribute("aria-hidden", "true");
    }
    /* 隐藏所属农场行 */
    const farmEl = document.getElementById("yzt-parcel-detail-farm");
    if (farmEl) farmEl.style.display = "none";
    refreshFarmParcelStyles();
  }

  function endFarmParcelYztModalSession() {
    if (parcelDetailEscHandler) {
      document.removeEventListener("keydown", parcelDetailEscHandler);
      parcelDetailEscHandler = null;
    }
    farmParcelYztModalActive = false;
    selectedFarmParcelId = null;
    refreshFarmParcelStyles();
  }

  function initParcelDetailMiniMap(zone) {
    destroyParcelDetailMiniMap();
    const el = document.getElementById("yzt-parcel-detail-map");
    if (!el || typeof L === "undefined") return;
    const feature = createPlotFieldPolygon(
      zone.lat,
      zone.lng,
      zone.parcelW || 0.012,
      zone.parcelH || 0.009,
      zone.fieldSeed || zone.lat + zone.lng
    );
    const mini = L.map(el, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false
    });
    const pb = getPlotBase(zone);
    const fillHex = typeof getCadastralMapFillColor === "function"
      ? getCadastralMapFillColor(pb.certStatus)
      : "#00A86B";
    const gj = L.geoJSON(feature, {
      style: {
        color: "#ffffff",
        weight: 1,
        fillColor: hexToRgba(fillHex, 0.32),
        fillOpacity: 1,
        lineCap: "round",
        lineJoin: "round"
      }
    }).addTo(mini);
    try {
      mini.fitBounds(gj.getBounds(), { padding: [12, 12], maxZoom: 16 });
    } catch (err) {
      mini.setView([zone.lat, zone.lng], 14);
    }
    parcelDetailMiniMap = mini;
    requestAnimationFrame(() => {
      try {
        mini.invalidateSize(true);
      } catch (e) { /* ignore */ }
      setTimeout(() => {
        try {
          mini.invalidateSize(true);
        } catch (e2) { /* ignore */ }
      }, 220);
    });
  }

  function fillParcelDetailModalPanels(zone) {
    const b = getPlotBase(zone);
    const loc = `${zone.farmName}一分场一队`;
    const plotNo = zone.plotCode || "NK-2026-001";
    const useType = b.useType || "耕地";
    const muStr = `${(plotAreaToMu(zone.area)).toFixed(1)}亩`;
    const useHl = true;
    const areaHl = true;

    document.getElementById("yzt-pd-panel-basic").innerHTML = [
      pdRow("坐落", loc, false),
      pdRow("地块编号", plotNo, false),
      pdRow("地类（用途）", useType, useHl),
      pdRow("面积", muStr, areaHl),
      pdRow("地形", "平原", false),
      pdRow("土壤类型", "黑土", false)
    ].join("");

    document.getElementById("yzt-pd-panel-parcel").innerHTML = [
      pdRow("不动产单元号/地号", "230100001001JC00001", false),
      pdRow("权利类型", b.rightType || "国有建设用地使用权", false),
      pdRow("权利性质", "划拨", false),
      pdRow("使用权类型", "农业用地", false)
    ].join("");

    document.getElementById("yzt-pd-panel-cert").innerHTML = [
      pdRow("权属证号", "黑(2026)XX农垦不动产权第000001号", false),
      pdRow("证书编号", "XX202600001", false),
      pdRow("发证机关", "XX市自然资源和规划局", false),
      pdRow("登记日期", "2026-01-15", false),
      pdRow("证载权利人/土地使用权人", "XX农垦集团有限公司", true)
    ].join("");

    document.getElementById("yzt-pd-panel-book").innerHTML = [
      pdRow("权属起始日期", "2026-01-15", false),
      pdRow("权属终止日期", "2056-01-14", false),
      pdRow("共有情况", "单独所有", false),
      pdRow("附记", "农业生产用地", false),
      pdRow("权证备注", "无", false)
    ].join("");
  }

  function resetParcelDetailTabs() {
    const ov = document.getElementById("yzt-parcel-detail-overlay");
    if (!ov) return;
    ov.querySelectorAll(".yzt-parcel-detail-tab").forEach((btn) => {
      const on = btn.dataset.pdTab === "basic";
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    ov.querySelectorAll(".yzt-parcel-detail-panel").forEach((p) => {
      p.classList.toggle("active", p.dataset.pdPanel === "basic");
    });
  }

  function openParcelDetailModal(zone) {
    const ov = document.getElementById("yzt-parcel-detail-overlay");
    if (!ov) return;
    selectedFarmParcelId = zone.id;
    refreshFarmParcelStyles();
    const fg = layerGroups.farmParcels;
    if (fg && fg.eachLayer) {
      fg.eachLayer((gj) => {
        gj.eachLayer((layer) => {
          if (layer._yztZoneRef && layer._yztZoneRef.id === zone.id && layer.bringToFront) {
            layer.bringToFront();
          }
        });
      });
    }
    fillParcelDetailModalPanels(zone);
    resetParcelDetailTabs();
    /* 设置弹窗标题和所属农场 */
    const titleEl = document.getElementById("yzt-parcel-detail-title");
    const farmEl = document.getElementById("yzt-parcel-detail-farm");
    if (titleEl) titleEl.textContent = zone.zoneName || zone.plotCode || "地块详情";
    if (farmEl) {
      farmEl.textContent = `所属农场：${zone.farmName || "—"}`;
      farmEl.style.display = "block";
    }
    ov.classList.remove("hidden");
    ov.setAttribute("aria-hidden", "false");
    initParcelDetailMiniMap(zone);
    if (parcelDetailEscHandler) {
      document.removeEventListener("keydown", parcelDetailEscHandler);
    }
    parcelDetailEscHandler = (e) => {
      if (e.key === "Escape") closeParcelDetailModal();
    };
    document.addEventListener("keydown", parcelDetailEscHandler);
  }

  function openFarmParcelLandModal(zone) {
    if (parcelDetailEscHandler) {
      document.removeEventListener("keydown", parcelDetailEscHandler);
      parcelDetailEscHandler = null;
    }
    destroyParcelDetailMiniMap();
    const pdOv = document.getElementById("yzt-parcel-detail-overlay");
    if (pdOv) {
      pdOv.classList.add("hidden");
      pdOv.setAttribute("aria-hidden", "true");
    }
    selectedFarmParcelId = zone.id;
    farmParcelYztModalActive = true;
    refreshFarmParcelStyles();
    const fg = layerGroups.farmParcels;
    if (fg && fg.eachLayer) {
      fg.eachLayer((gj) => {
        gj.eachLayer((layer) => {
          if (layer._yztZoneRef && layer._yztZoneRef.id === zone.id && layer.bringToFront) {
            layer.bringToFront();
          }
        });
      });
    }
    const b = getPlotBase(zone);
    const plotNo = zone.plotCode || b.boundaryCode || "—";
    const title = zone.zoneName || plotNo;
    const loc = `${zone.farmName}一分场一队`;
    const useType = b.useType || "耕地";
    const muStr = `${plotAreaToMu(zone.area).toFixed(1)}亩`;
    document.getElementById("yzt-modal-title").textContent = title;
    document.getElementById("yzt-modal-sub").textContent = `宗地地块 · ${zone.farmName} · ${certStatusLabel(b.certStatus)} · ${fmtMu(zone.area, 1)}万亩`;
    document.getElementById("yzt-modal-body").innerHTML = `
      <div class="yzt-modal-grid">
        <div class="yzt-modal-card">
          <h3>基本信息</h3>
          <div class="yzt-info-row"><span class="lbl">坐落</span><span class="val">${loc}</span></div>
          <div class="yzt-info-row"><span class="lbl">地块编号</span><span class="val hl">${plotNo}</span></div>
          <div class="yzt-info-row"><span class="lbl">地类（用途）</span><span class="val hl">${useType}</span></div>
          <div class="yzt-info-row"><span class="lbl">面积</span><span class="val hl">${muStr}</span></div>
          <div class="yzt-info-row"><span class="lbl">权籍类型</span><span class="val">${b.rightType || "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">用地类型</span><span class="val">${useType}</span></div>
        </div>
        <div class="yzt-modal-card">
          <h3>宗地信息</h3>
          <div class="yzt-info-row"><span class="lbl">不动产单元号/地号</span><span class="val">230100001001JC00001</span></div>
          <div class="yzt-info-row"><span class="lbl">权利类型</span><span class="val hl">${b.rightType || "国有建设用地使用权"}</span></div>
          <div class="yzt-info-row"><span class="lbl">权利性质</span><span class="val">划拨</span></div>
          <div class="yzt-info-row"><span class="lbl">确权状态</span><span class="val hl">${certStatusLabel(b.certStatus)}</span></div>
          <div class="yzt-info-row"><span class="lbl">确权面积</span><span class="val">${b.confirmedArea ? `${b.confirmedArea}万公顷` : "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">边界编码</span><span class="val">${b.boundaryCode || "—"}</span></div>
        </div>
        <div class="yzt-modal-card">
          <h3>权证信息</h3>
          <div class="yzt-info-row"><span class="lbl">权属证号</span><span class="val">黑(2026)XX农垦不动产权第000001号</span></div>
          <div class="yzt-info-row"><span class="lbl">证书编号</span><span class="val hl">XX202600001</span></div>
          <div class="yzt-info-row"><span class="lbl">发证机关</span><span class="val">XX市自然资源和规划局</span></div>
          <div class="yzt-info-row"><span class="lbl">登记日期</span><span class="val">2026-01-15</span></div>
        </div>
        <div class="yzt-modal-card">
          <h3>证书信息</h3>
          <div class="yzt-info-row"><span class="lbl">权属起始日期</span><span class="val">2026-01-15</span></div>
          <div class="yzt-info-row"><span class="lbl">权属终止日期</span><span class="val">2056-01-14</span></div>
          <div class="yzt-info-row"><span class="lbl">共有情况</span><span class="val">单独所有</span></div>
          <div class="yzt-info-row"><span class="lbl">证载权利人</span><span class="val hl">XX农垦集团有限公司</span></div>
        </div>
      </div>`;
    document.getElementById("yzt-modal-overlay").classList.remove("hidden");
    parcelDetailEscHandler = (e) => {
      if (e.key === "Escape") closeParcelDetailModal();
    };
    document.addEventListener("keydown", parcelDetailEscHandler);
  }

  function openLandParcelDetailModal(zone) {
    /* 使用宗地详情弹窗（左侧地图预览 + 右侧4个Tab） */
    openParcelDetailModal(zone);
  }

  /** 集团总览：地图上渲染所有宗地图斑（可点击） */
  function addGroupViewLandParcelLayers(farmParcelsG) {
    getFilteredLandParcels().forEach((zone) => {
      const w = (zone.parcelW || 0.012) * 1.2;
      const h = (zone.parcelH || 0.009) * 1.2;
      const feature = createPlotFieldPolygon(
        zone.lat,
        zone.lng,
        w,
        h,
        zone.fieldSeed || zone.lat + zone.lng
      );
      const base = getPlotBase(zone);
      const fillHex = typeof getCadastralMapFillColor === "function"
        ? getCadastralMapFillColor(base.certStatus)
        : LAND_CERT_COLORS[base.certStatus] || "#4b5563";
      const gj = L.geoJSON(feature, {
        style: {
          color: "#ffffff",
          weight: 0.8,
          dashArray: null,
          lineCap: "round",
          lineJoin: "round",
          fillColor: hexToRgba(fillHex, 0.22),
          fillOpacity: 1,
          smoothFactor: 1
        }
      });
      gj.eachLayer((layer) => {
        layer._yztZoneRef = zone;
        tagLandPath(layer, "yzt-farm-parcel-path");
        layer.bindTooltip(getFarmParcelHoverHtml(zone), {
          sticky: true,
          direction: "top",
          opacity: 1,
          className: "yzt-map-tooltip yzt-parcel-hover-tip"
        });
        layer.on("mouseover", () => {
          layer.setStyle({
            color: "#ffffff",
            weight: 1.5,
            fillColor: hexToRgba(fillHex, 0.36),
            fillOpacity: 1
          });
          layer.bringToFront();
        });
        layer.on("mouseout", () => {
          layer.setStyle({
            color: "#ffffff",
            weight: 0.8,
            fillColor: hexToRgba(fillHex, 0.22),
            fillOpacity: 1
          });
        });
        layer.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          openLandParcelDetailModal(zone);
        });
      });
      gj.addTo(farmParcelsG);
    });
  }

  function addFarmDrillParcelLayers(farmParcelsG) {
    if (!isLandFarmDrill() || !landDrillFarmId) return;
    getFarmDrillParcels().forEach((zone) => {
      const base = getPlotBase(zone);
      const m = base.certStatus === "未确权" ? 2.25 : 1.5;
      const w = (zone.parcelW || 0.012) * m;
      const h = (zone.parcelH || 0.009) * m;
      const feature = createPlotFieldPolygon(
        zone.lat,
        zone.lng,
        w,
        h,
        zone.fieldSeed || zone.lat + zone.lng
      );
      const gj = L.geoJSON(feature, { style: () => getFarmDrillParcelStyle(zone, false) });
      gj.eachLayer((layer) => {
        layer._yztZoneRef = zone;
        tagLandPath(layer, "yzt-farm-parcel-path");
        layer.bindTooltip(getFarmParcelHoverHtml(zone), {
          sticky: true,
          direction: "top",
          opacity: 1,
          className: "yzt-map-tooltip yzt-parcel-hover-tip"
        });
        layer.on("mouseover", () => {
          hoveredFarmParcelId = zone.id;
          layer.setStyle(getFarmDrillParcelStyle(zone, true));
          layer.bringToFront();
          farmParcelsG.eachLayer((sibling) => {
            if (sibling !== layer && sibling._yztZoneRef && sibling.setStyle) {
              sibling.setStyle(getFarmDrillParcelStyle(sibling._yztZoneRef, false));
            }
          });
        });
        layer.on("mouseout", () => {
          if (hoveredFarmParcelId === zone.id) hoveredFarmParcelId = null;
          layer.setStyle(getFarmDrillParcelStyle(zone, false));
        });
        layer.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          openLandParcelDetailModal(zone);
        });
      });
      gj.addTo(farmParcelsG);
    });
  }

  /* ---- 图层开关 ---- */
  function initLayerToggles() {
    document.querySelectorAll(".yzt-layer-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        chip.classList.toggle("active");
        const layer = chip.dataset.layer;
        const group = layerGroups[layer];
        if (group && gisMap) {
          if (chip.classList.contains("active")) gisMap.addLayer(group);
          else gisMap.removeLayer(group);
        }
        if (layer === "weather") renderMapWeatherFloat();
        if (layer === "disaster") {
          refreshMap();
          if (chip.classList.contains("active") && getVisibleWarnings().length) {
            focusDisaster(getVisibleWarnings()[0].id);
          }
        }
      });
    });
  }

  function isLayerActive(name) {
    const chip = document.querySelector(`.yzt-layer-chip[data-layer="${name}"]`);
    if (chip) return chip.classList.contains("active");
    if (name === "farm") return true;
    if (name === "iot") return currentBottomTab === "iot";
    if (isPlantingDataTab()) {
      if (name === "remote") return mapFilterMode === "remote";
    }
    return false;
  }

  /* ---- 设备标记（卡片式点位） ---- */
  function getDeviceSvgIcon(d) {
    var statusColor = d.status === "online" ? "#00FF88" : d.status === "fault" ? "#FF6B6B" : "#9CA3AF";
    var statusText = d.status === "online" ? "在线" : d.status === "fault" ? "故障" : "离线";
    var statusDot = d.status === "online" ? "●" : d.status === "fault" ? "●" : "●";
    var statusClass = d.status === "online" ? "dm-online" : d.status === "fault" ? "dm-fault" : "dm-offline";
    return L.divIcon({
      className: "yzt-device-marker",
      html: '<div class="dm-card ' + statusClass + '">' +
        '<span class="dm-dot" style="color:' + statusColor + '">' + statusDot + '</span>' +
        '<span class="dm-name">' + d.name + '</span>' +
        '<span class="dm-status" style="color:' + statusColor + '">' + statusText + '</span>' +
        '</div><div class="dm-pin"></div>',
      iconSize: [280, 60],
      iconAnchor: [140, 56],
      popupAnchor: [0, -20]
    });
  }

  /* ---- 地图 ---- */
  function refreshMap() {
    if (!gisMap) return;
    Object.values(layerGroups).forEach((g) => gisMap.removeLayer(g));
    layerGroups = {};

    const plotG = L.layerGroup();
    const iotG = L.layerGroup();
    const remoteG = L.layerGroup();
    const weatherG = L.layerGroup();
    const disasterG = L.layerGroup();
    const farmG = L.featureGroup();
    const farmParcelsG = L.featureGroup();

    if (isBaseDataTab()) {
      renderLandUseLegend();
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      document.getElementById("map-land-use-legend")?.classList.add("hidden");
    }

    if (isPlantingDataTab()) {
      /* 按统种/承租筛选 */
      var visiblePlots = currentPlots.filter(function(p) {
        var rType = getPlotBase(p).rentType || "统种地";
        var tKey = rType !== "外租地" ? "tong" : "rent";
        return typeof plotTypeFilter !== "undefined" ? plotTypeFilter[tKey] !== false : true;
      });
      visiblePlots.forEach(function(p) { addPlotParcelLayers(p, plotG); });
      /* 作物场景：每个地块显示作物图标 */
      if (sceneMode === "planting") {
        var cropIcons = { "玉米": "🌽", "大豆": "🫘", "水稻": "🌾", "畜牧": "🐄", "果蔬": "🍎", "中药材": "🌿", "杂粮": "🌰", "牧草": "🌱" };
        visiblePlots.forEach(function(p) {
          var planting = getPlotPlanting(p);
          var crop = planting.crop || "其他";
          var emoji = cropIcons[crop] || "📍";
          var icon = L.divIcon({
            className: "yzt-crop-marker",
            html: '<div class="crop-icon-wrap"><span class="crop-emoji">' + emoji + '</span><span class="crop-label">' + crop + '</span></div>',
            iconSize: [80, 48], iconAnchor: [40, 24]
          });
          L.marker([p.lat, p.lng], { icon: icon, interactive: false }).addTo(plotG);
        });
      }
    }

    if (isBaseDataTab()) {
      if (isLandFarmDrill()) {
        const b = landDrillFarmId ? getFarmPlotBounds(landDrillFarmId) : null;
        if (b && typeof b.isValid === "function" && b.isValid()) {
          L.rectangle(b, {
            color: "rgba(255,255,255,0.82)",
            weight: 1,
            fill: true,
            fillColor: "#ffffff",
            fillOpacity: 0.06,
            interactive: false,
            className: "yzt-farm-drill-outline"
          }).addTo(farmParcelsG);
        }
        addFarmDrillParcelLayers(farmParcelsG);
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
        addGroupViewLandParcelLayers(farmParcelsG);
      }
    }

    currentDevices.forEach((d) => {
      var icon = getDeviceSvgIcon(d);
      var marker = L.marker([d.lat, d.lng], { icon: icon }).addTo(iotG);
      marker.bindTooltip("<b>" + d.name + "</b><br/>类型: " + d.type + " | 状态: " + (d.online ? "在线" : d.status === "fault" ? "故障" : "离线") + "<br/>当前值: " + d.value, { className: "yzt-map-tooltip yzt-device-tip", direction: "top", offset: [0, -24] });
      marker.on("click", function() {
        openDeviceModal(d);
      });
      marker.on("contextmenu", (e) => {
        L.DomEvent.preventDefault(e);
        showContextMenu(e.originalEvent, d);
      });
    });

    if (isPlantingDataTab()) {
      currentPlots.forEach((p, i) => {
        if (i % 2 === 0) {
          const rColor = chartColors[i % chartColors.length];
          L.circle([p.lat + 0.08, p.lng + 0.06], {
            radius: 8000, color: rColor, fillColor: rColor, fillOpacity: 0.08, weight: 1
          }).addTo(remoteG).bindTooltip(`遥感：${p.plotName}<br/>长势 ${70 + i * 5}% · 估产 ${(p.area * 0.8).toFixed(1)}万吨`, { className: "yzt-map-tooltip" });
        }
      });

      /* 气象标记和灾害预警标记已移除 */
    }

    if (((isBaseDataTab() && !isLandFarmDrill()) || currentBottomTab === "iot" || currentBottomTab === "plant") && !mapFarmFocusActive) {
      getMapFarmMarkers().forEach((s) => {
        const isActive = landDrillFarmId === s.id;
        const marker = L.marker([s.lat, s.lng], {
          icon: createFarmPointIcon(s.id),
          zIndexOffset: isActive ? 2500 : isBaseDataTab() ? 2100 : 2000,
          interactive: true
        }).addTo(farmG);

        const farmDrill = getFarmDrillStats(s.id);
        const farmAreaMu = farmDrill ? farmDrill.totalAreaMu.toFixed(1) : (parseFloat(s.area) * 15).toFixed(1);
        marker.bindTooltip(`<b>${s.name}</b><br/>总面积：${farmAreaMu}万亩`, {
          className: "yzt-map-tooltip yzt-farm-point-tip",
          direction: "top",
          offset: [0, -14],
          permanent: false
        });

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          closeFarmPointPopup();
          mapFarmFocusActive = true;
          refreshMap();
          flyToFarmBounds(s.id, 0.85);
        });
      });
    }

    layerGroups = {
      plots: plotG,
      iot: iotG,
      remote: remoteG,
      weather: weatherG,
      disaster: disasterG,
      farmParcels: farmParcelsG,
      farm: farmG
    };

    if (isPlantingDataTab()) gisMap.addLayer(plotG);
    updateJilinOutlineStyle();
    Object.entries(layerGroups).forEach(([name, group]) => {
      if (name === "plots") return;
      if (name === "farmParcels") {
        if (isBaseDataTab()) gisMap.addLayer(group);
        return;
      }
      if (name === "farm") {
        if (isBaseDataTab() || isLayerActive(name)) {
          gisMap.addLayer(group);
        }
        return;
      }
      if (isLayerActive(name)) gisMap.addLayer(group);
    });
    syncBaselineOverlayVisibility();
    if (isLandFarmDrill() && isBaseDataTab() && layerGroups.farmParcels) {
      layerGroups.farmParcels.bringToFront();
    }
    if (layerGroups.farm && gisMap.hasLayer(layerGroups.farm)) {
      layerGroups.farm.bringToFront();
    }
  }

  function initMap() {
    gisMap = L.map("yzt-gis-map", {
      center: MAP_DEFAULT.center,
      zoom: MAP_DEFAULT.zoom,
      minZoom: 6,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    /* 卫星影像底图 */
    baseTileLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 16, minZoom: 6
    }).addTo(gisMap);

    initBaselineOverlay();
    syncBaselineOverlayVisibility();
    /* 延迟适配边界，确保地图容器已有正确尺寸 */
    setTimeout(function() {
      if (gisMap) { gisMap.invalidateSize(); applyLandMapView(false); }
    }, 350);

    document.getElementById("map-zoom-in").addEventListener("click", () => { clearFarmFocus(); gisMap.zoomIn(); });
    document.getElementById("map-zoom-out").addEventListener("click", () => { clearFarmFocus(); gisMap.zoomOut(); });
    document.getElementById("map-reset").addEventListener("click", () => {
      if (isLandFarmDrill()) {
        exitLandDrill();
        return;
      }
      clearFarmFocus();
      applyLandMapView(true);
    });

    gisMap.on("moveend", () => {
      if (mapFarmFocusActive && gisMap.getZoom() < 10) clearFarmFocus();
    });

    document.getElementById("legend-toggle")?.addEventListener("click", function() {
      var ov = document.getElementById("legend-overlay");
      if (ov) ov.classList.toggle("hidden");
    });

    document.getElementById("map-fullscreen").addEventListener("click", function() {
      var dashboard = document.querySelector(".yzt-dashboard");
      if (dashboard) {
        dashboard.classList.toggle("yzt-map-fullscreen");
        setTimeout(function() { if (gisMap) gisMap.invalidateSize(); }, 350);
      }
    });

    gisMap.on("click", () => { hideContextMenu(); closeFarmPointPopup(); });
    setTimeout(() => gisMap.invalidateSize(), 300);
  }

  function focusDisaster(warnId) {
    const warn = YZT_DISASTER_WARNINGS.find((w) => w.id === warnId);
    if (!warn) return;
    const p = currentPlots.find((x) => x.id === warn.plotId) ||
      getPlotsForFarms(getFarmIds()).find((x) => x.id === warn.plotId);
    if (!p) return;

    activeDisasterId = warnId;
    refreshMap();
    if (gisMap) gisMap.flyTo([p.lat, p.lng], 11, { duration: 0.8 });
    openDisasterModal(warn, p);
  }

  function openDisasterModal(warn, plot) {
    endFarmParcelYztModalSession();
    const levelColors = { yellow: "#FFB800", blue: "#00D4FF", orange: "#FF6B6B", red: "#FF2222" };
    document.getElementById("yzt-modal-title").textContent = warn.title;
    document.getElementById("yzt-modal-sub").textContent = `${plot.plotName} · ${warn.region} · ${warn.publishTime}`;
    document.getElementById("yzt-modal-body").innerHTML = `
      <div class="yzt-modal-grid">
        <div class="yzt-modal-card">
          <h3 style="color:${levelColors[warn.level] || "#FF6B6B"}">预警信息</h3>
          <div class="yzt-info-row"><span class="lbl">预警类型</span><span class="val hl">${warn.type}</span></div>
          <div class="yzt-info-row"><span class="lbl">预警等级</span><span class="val" style="color:${levelColors[warn.level]}">${warn.levelLabel}</span></div>
          <div class="yzt-info-row"><span class="lbl">发布区域</span><span class="val">${warn.region}</span></div>
          <div class="yzt-info-row"><span class="lbl">发布时间</span><span class="val">${warn.publishTime}</span></div>
        </div>
        <div class="yzt-modal-card">
          <h3>关联地块</h3>
          <div class="yzt-info-row"><span class="lbl">地块名称</span><span class="val hl">${plot.plotName}</span></div>
          <div class="yzt-info-row"><span class="lbl">所属农场</span><span class="val">${plot.farmName}</span></div>
          <div class="yzt-info-row"><span class="lbl">用地类型</span><span class="val">${getPlotBase(plot).useType}</span></div>
          <div class="yzt-info-row"><span class="lbl">确权状态</span><span class="val">${getPlotBase(plot).certStatus}</span></div>
          <div class="yzt-info-row"><span class="lbl">面积</span><span class="val">${plot.area}万公顷</span></div>
        </div>
        <div class="yzt-modal-card full">
          <h3>预警内容</h3>
          <p class="profile-text">${warn.text}</p>
          <p class="profile-text" style="margin-top:12px;color:var(--accent-yellow)">处置建议：${warn.advice}</p>
        </div>
      </div>`;
    document.getElementById("yzt-modal-overlay").classList.remove("hidden");
  }

  function renderMapWeatherFloat(focusPlot) {
    const floatEl = document.getElementById("map-weather-float");
    const mapWrap = document.querySelector(".yzt-map-wrap");
    if (!isLayerActive("weather")) {
      floatEl.classList.add("hidden");
      mapWrap?.classList.remove("weather-active");
      return;
    }
    floatEl.classList.remove("hidden");
    mapWrap?.classList.add("weather-active");

    const plots = focusPlot ? [focusPlot] : currentPlots;
    const scopeEl = document.getElementById("map-weather-scope");
    if (!plots.length) {
      scopeEl.textContent = "暂无地块";
      document.getElementById("map-weather-body").innerHTML = "";
      document.getElementById("map-weather-forecast").innerHTML = "";
      return;
    }

    const avg = (key) => (plots.reduce((a, p) => a + p.weather[key], 0) / plots.length).toFixed(1);
    const title = focusPlot ? focusPlot.plotName : `筛选区域（${plots.length}宗地块）`;
    scopeEl.textContent = title;

    document.getElementById("map-weather-body").innerHTML = `
      <div class="yzt-weather-float-item"><span class="wf-val">${avg("temp")}°C</span><span class="wf-lbl">气温</span></div>
      <div class="yzt-weather-float-item"><span class="wf-val">${Math.round(avg("humidity"))}%</span><span class="wf-lbl">湿度</span></div>
      <div class="yzt-weather-float-item"><span class="wf-val">${Math.round(avg("soilMoist"))}%</span><span class="wf-lbl">墒情</span></div>
      <div class="yzt-weather-float-item"><span class="wf-val">${avg("soilTemp")}°C</span><span class="wf-lbl">土温</span></div>
      <div class="yzt-weather-float-item"><span class="wf-val">${avg("precip")}mm</span><span class="wf-lbl">降水</span></div>
      <div class="yzt-weather-float-item"><span class="wf-val">${plots[0].weather.wind}</span><span class="wf-lbl">风向</span></div>`;

    document.getElementById("map-weather-forecast").innerHTML = YZT_WEATHER.forecast.map((f) =>
      `<div class="yzt-weather-forecast-item">
        <span class="fd">${f.day}</span>
        <span class="ft">${f.high}°/${f.low}°</span>
        <span class="fw">${f.weather}</span>
      </div>`
    ).join("");
  }

  /* ---- 弹窗 ---- */
  function openBaseLandModal(zone) {
    endFarmParcelYztModalSession();
    const base = getPlotBase(zone);
    document.getElementById("yzt-modal-title").textContent = zone.zoneName;
    document.getElementById("yzt-modal-sub").textContent = `本底土地图斑 · ${base.boundaryCode || zone.id.toUpperCase()} · ${zone.farmName}`;
    document.getElementById("yzt-modal-body").innerHTML = `
      <div class="yzt-modal-grid">
        <div class="yzt-modal-card">
          <h3>土地资源</h3>
          <div class="yzt-info-row"><span class="lbl">权籍类型</span><span class="val hl">${base.rightType}</span></div>
          <div class="yzt-info-row"><span class="lbl">用地类型</span><span class="val">${base.useType}</span></div>
          <div class="yzt-info-row"><span class="lbl">图斑面积</span><span class="val hl">${zone.area}万公顷</span></div>
          <div class="yzt-info-row"><span class="lbl">所属农场</span><span class="val">${zone.farmName}</span></div>
        </div>
        <div class="yzt-modal-card">
          <h3>确权边界</h3>
          <div class="yzt-info-row"><span class="lbl">确权状态</span><span class="val hl">${base.certStatus}</span></div>
          <div class="yzt-info-row"><span class="lbl">确权面积</span><span class="val">${base.confirmedArea ? `${base.confirmedArea}万公顷` : "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">边界编码</span><span class="val">${base.boundaryCode || "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">租用类型</span><span class="val">${base.rentType}</span></div>
          <div class="yzt-info-row"><span class="lbl">高标状态</span><span class="val">${base.highStd}</span></div>
          <div class="yzt-info-row"><span class="lbl">盐碱类型</span><span class="val">${base.saline || "无"}</span></div>
        </div>
      </div>`;
    document.getElementById("yzt-modal-overlay").classList.remove("hidden");
  }

  function openBasePlotModal(p) {
    openBaseLandModal({ ...p, zoneName: p.plotName });
  }

  function openPlantingPlotModal(p) {
    endFarmParcelYztModalSession();
    const planting = getPlotPlanting(p);
    document.getElementById("yzt-modal-title").textContent = p.plotName;
    document.getElementById("yzt-modal-sub").textContent = `种植经营 · ${p.farmName} · 地块级数据`;
    document.getElementById("yzt-modal-body").innerHTML = `
      <div class="yzt-modal-grid">
        <div class="yzt-modal-card">
          <h3>种植信息</h3>
          <div class="yzt-info-row"><span class="lbl">种植作物</span><span class="val hl">${planting.crop}</span></div>
          <div class="yzt-info-row"><span class="lbl">品种</span><span class="val">${planting.variety || "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">播种日期</span><span class="val">${planting.sowDate || "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">预计产量</span><span class="val">${planting.expectedYield || "—"} kg/亩</span></div>
          <div class="yzt-info-row"><span class="lbl">播种进度</span><span class="val hl">${planting.sowProgress || 0}%</span></div>
          <div class="yzt-info-row"><span class="lbl">秋收进度</span><span class="val">${planting.harvestProgress || 0}%</span></div>
        </div>
        <div class="yzt-modal-card">
          <h3>遥感监测</h3>
          <div class="yzt-info-row"><span class="lbl">监测状态</span><span class="val hl">${planting.remoteStatus || "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">NDVI 指数</span><span class="val">${planting.ndvi ?? "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">影像日期</span><span class="val">${planting.remoteDate || "—"}</span></div>
          <div class="yzt-info-row"><span class="lbl">地块面积</span><span class="val">${p.area}万公顷</span></div>
        </div>
      </div>`;
    document.getElementById("yzt-modal-overlay").classList.remove("hidden");
  }

  function openPlotModal(p) {
    if (isPlantingDataTab()) openPlantingPlotModal(p);
    else openBasePlotModal(p);
  }

  function openDeviceModal(d) {
    endFarmParcelYztModalSession();
    var ov = document.getElementById("yzt-device-detail-overlay");
    if (!ov) return;

    /* 重置为基本信息标签页 */
    ov.querySelectorAll(".yzt-parcel-detail-tab").forEach(function(b, i) {
      b.classList.toggle("active", i === 0);
      b.setAttribute("aria-selected", i === 0 ? "true" : "false");
    });
    ov.querySelectorAll(".yzt-parcel-detail-panel").forEach(function(p, i) {
      p.classList.toggle("active", i === 0);
    });

    document.getElementById("yzt-device-detail-title").textContent = d.name;
    document.getElementById("yzt-device-detail-sub").textContent = d.type + " · " + d.farm + " · " + (d.status === "online" ? "在线" : d.status === "fault" ? "故障" : "离线");

    /* Tab 1: 实时数据 */
    var labelMap = { temperature: "温度(°C)", humidity: "湿度(%)", windSpeed: "风速(m/s)", windDir: "风向", pressure: "气压(hPa)", rainfall: "降雨量(mm)",
      soilMoist: "土壤湿度(%)", soilTemp: "土壤温度(°C)", soilPH: "土壤pH", conductivity: "电导率(mS/cm)", depth10cm: "10cm湿度(%)", depth30cm: "30cm湿度(%)",
      openPct: "阀门开度(%)", flowRate: "流量(m³/h)", totalFlow: "累计流量(m³)",
      resolution: "分辨率", fps: "帧率", storageUsed: "存储占用(%)", signalStrength: "信号强度(dBm)" };
    var rtRows = "";
    if (d.readings) {
      Object.keys(d.readings).forEach(function(k) {
        rtRows += '<div class="yzt-info-row"><span class="lbl">' + (labelMap[k] || k) + '</span><span class="val hl">' + d.readings[k] + '</span></div>';
      });
    }
    document.getElementById("dd-panel-realtime").innerHTML = rtRows || '<div class="yzt-empty-hint">无实时数据</div>';

    /* Tab 2: 远程控制 */
    if (d.type === "智能水阀") {
      var isOpen = d.value && d.value.indexOf("开") >= 0;
      var openAt = d._valveOpenAt || "—";
      var elapsed = "—";
      if (isOpen && _valveTimers[d.id]) {
        var secs = Math.floor((Date.now() - _valveTimers[d.id]) / 1000);
        var h = Math.floor(secs / 3600);
        var m = Math.floor((secs % 3600) / 60);
        var s = secs % 60;
        elapsed = h + "时" + m + "分" + s + "秒";
      }
      document.getElementById("dd-panel-control").innerHTML =
        (isOpen ? '<div class="yzt-valve-status"><div class="yzt-valve-status-item"><span class="lbl">阀门状态</span><span class="val on">● 已开启</span></div><div class="yzt-valve-status-item"><span class="lbl">实时开度</span><span class="val hl">' + d.value + '</span></div><div class="yzt-valve-status-item"><span class="lbl">开启时间</span><span class="val">' + openAt + '</span></div><div class="yzt-valve-status-item"><span class="lbl">累计运行</span><span class="val">' + elapsed + '</span></div></div>' : '<div class="yzt-valve-status"><div class="yzt-valve-status-item"><span class="lbl">阀门状态</span><span class="val off">● 已关闭</span></div></div>') +
        '<div class="yzt-dd-ctrl-row">' +
        '<button class="yzt-dd-ctrl-btn" onclick="window.__toggleValve(\'' + d.id + '\', true)">远程开启</button>' +
        '<button class="yzt-dd-ctrl-btn off" onclick="window.__toggleValve(\'' + d.id + '\', false)">一键关闭</button>' +
        '</div>';
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      document.getElementById("dd-panel-control").innerHTML = '<div class="yzt-empty-hint">该设备类型不支持远程控制</div>';
    }

    ov.classList.remove("hidden");
    ov.setAttribute("aria-hidden", "false");
  }

  function renderDeviceHistoryChart(d) {
    var el = document.getElementById("dd-history-chart");
    if (!el) return;
    var hours = [];
    for (var i = 0; i < 24; i++) hours.push(i + "时");
    var baseVal = d.type === "气象站" ? 23 : d.type === "土壤墒情站" ? 42 : d.type === "智能水阀" ? 68 : 25;
    var data = hours.map(function() { return (baseVal + (Math.random() - 0.5) * 10).toFixed(1); });
    disposeChart("dd-history-chart");
    var c = echarts.init(el, null, { renderer: "canvas" });
    charts["dd-history-chart"] = c;
    c.setOption({
      animationDuration: 1500,
      animationEasing: "cubicOut",
      grid: { left: 48, right: 12, top: 10, bottom: 22 },
      tooltip: sciTooltip(),
      xAxis: { type: "category", data: hours, axisLabel: { color: SCI.textSec, fontSize: 22 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } } },
      yAxis: { type: "value", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: [{ type: "line", data: data, smooth: true, symbol: "circle", symbolSize: 6,
        lineStyle: sciLineStyle("#00FF88"),
        itemStyle: { color: "#00FF88", shadowBlur: 6, shadowColor: hexToRgba("#00FF88", 0.5) },
        areaStyle: { color: sciAreaGradient("#00FF88") } }]
    });
  }

  function renderDeviceHistoryTable(d) {
    var tbody = document.querySelector("#dd-history-table tbody");
    if (!tbody) return;
    var readings = d.readings || {};
    var keys = Object.keys(readings);
    var rows = "";
    /* 生成最近 10 条模拟采集记录 */
    for (var i = 9; i >= 0; i--) {
      var t = new Date();
      t.setMinutes(t.getMinutes() - (i + 1) * (30 + Math.floor(Math.random() * 60)));
      var timeStr = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0") + " " +
        String(t.getHours()).padStart(2, "0") + ":" + String(t.getMinutes()).padStart(2, "0") + ":" + String(t.getSeconds()).padStart(2, "0");
      if (keys.length > 0) {
        var k = keys[Math.floor(Math.random() * keys.length)];
        var baseVal = parseFloat(readings[k]) || (10 + Math.random() * 60);
        var val = (baseVal + (Math.random() - 0.5) * baseVal * 0.1).toFixed(1);
        rows += "<tr><td>" + timeStr + "</td><td>" + k + "</td><td>" + val + "</td><td><span class='rec-ok'>正常</span></td></tr>";
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
        rows += "<tr><td>" + timeStr + "</td><td>—</td><td>" + (d.value || "—") + "</td><td><span class='rec-ok'>正常</span></td></tr>";
      }
    }
    tbody.innerHTML = rows;
  }

  function openFarmModal(id) {
    endFarmParcelYztModalSession();
    const s = SUBSIDIARIES.find((x) => x.id === id);
    if (!s) return;
    document.getElementById("yzt-modal-title").textContent = s.name;
    document.getElementById("yzt-modal-sub").textContent = "点击下钻至农场专属一张图";
    document.getElementById("yzt-modal-body").innerHTML = `
      <div class="yzt-modal-grid">
        <div class="yzt-modal-card">
          <h3>基本信息</h3>
          <div class="yzt-info-row"><span class="lbl">经营面积</span><span class="val hl">${s.area}</span></div>
          <div class="yzt-info-row"><span class="lbl">确权率</span><span class="val hl">${s.confirmRate}</span></div>
          <div class="yzt-info-row"><span class="lbl">主要作物</span><span class="val">${s.crop}</span></div>
        </div>
        <div class="yzt-modal-card">
          <h3>生产概况</h3>
          <div class="yzt-info-row"><span class="lbl">粮食产量</span><span class="val">${s.production.grain}</span></div>
          <div class="yzt-info-row"><span class="lbl">设备总数</span><span class="val">${s.devices.total}</span></div>
          <div class="yzt-info-row"><span class="lbl">在线率</span><span class="val hl">${Math.round(s.devices.online / s.devices.total * 100)}%</span></div>
        </div>
      </div>
      <div style="margin-top:16px;text-align:center">
        <button class="yzt-btn-primary" style="padding:12px 32px;cursor:pointer" onclick="window.__drillFarm('${id}')">进入 ${s.name} 专属视图</button>
      </div>`;
    document.getElementById("yzt-modal-overlay").classList.remove("hidden");
  }

  var _valveTimers = {};
  window.__toggleValve = function (id, open) {
    var d = YZT_DEVICES.find(function(x) { return x.id === id; });
    if (!d) return;
    if (open) {
      d.value = "开 100%";
      d.status = "online";
      d.online = true;
      d._valveOpenAt = new Date().toLocaleTimeString("zh-CN");
      _valveTimers[id] = Date.now();
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      d.value = "关";
      d.status = "offline";
      d.online = false;
      d._valveOpenAt = null;
      delete _valveTimers[id];
    }
    refreshMap();
    openDeviceModal(d);
  };

  window.__drillFarm = function (id) {
    document.getElementById("yzt-modal-overlay").classList.add("hidden");
    endFarmParcelYztModalSession();
    if (currentBottomTab === "land") enterLandDrill(id);
    else enterFarmView(id, { duration: 1, openFarmModal: true });
  };

  function showContextMenu(e, device) {
    contextDevice = device;
    var menu = document.getElementById("device-context");
    /* 根据设备类型显示/隐藏操作按钮 */
    var isValve = device.type === "智能水阀";
    var isClosed = device.value && device.value.includes("关");
    menu.querySelectorAll("button").forEach(function(btn) {
      var act = btn.dataset.action;
      if (act === "toggle-valve") btn.style.display = isValve ? "" : "none";
      if (act === "toggle-valve" && isValve) btn.textContent = isClosed ? "远程开启" : "远程关闭";
      if (act === "reboot") btn.style.display = isValve ? "" : "none";
    });
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    menu.classList.add("show");
  }

  function hideContextMenu() {
    document.getElementById("device-context").classList.remove("show");
    contextDevice = null;
  }

  document.getElementById("device-context").addEventListener("click", function(e) {
    var action = e.target.dataset.action;
    if (!contextDevice) return;
    if (action === "view-detail") openDeviceModal(contextDevice);
    if (action === "toggle-valve" && contextDevice.type === "智能水阀") {
      window.__toggleValve(contextDevice.id, contextDevice.value && contextDevice.value.includes("关"));
    }
    if (action === "reboot" && contextDevice.type === "智能水阀") {
      window.__toggleValve(contextDevice.id, contextDevice.value && contextDevice.value.includes("关"));
      setTimeout(function() {
        window.__toggleValve(contextDevice.id, true);
      }, 1500);
    }
    if (action === "close") { /* just close */ }
    hideContextMenu();
  });

  document.getElementById("yzt-modal-close").addEventListener("click", () => {
    const farm = farmParcelYztModalActive;
    document.getElementById("yzt-modal-overlay").classList.add("hidden");
    if (farm) closeParcelDetailModal();
  });
  document.getElementById("yzt-modal-overlay").addEventListener("click", (e) => {
    if (e.target.id === "yzt-modal-overlay") {
      const farm = farmParcelYztModalActive;
      e.target.classList.add("hidden");
      if (farm) closeParcelDetailModal();
    }
  });

  /* ---- 左栏：农场地块网格 ---- */
  function formatPlotLabel(p) {
    if (p.plotLabel) return p.plotLabel;
    const tail = p.id.split("-").slice(-2).join("-");
    return `${tail}号地`;
  }

  function plotAreaToMu(areaWanHa) {
    return Math.round(areaWanHa * 15000);
  }

  function renderPlotDetail(p) {
    const el = document.getElementById("plot-detail");
    if (!el) return;
    if (!p) {
      el.classList.remove("show");
      el.innerHTML = "";
      return;
    }
    el.classList.add("show");
    const planting = getPlotPlanting(p);
    el.innerHTML = `
      <div class="yzt-plot-detail-title">${formatPlotLabel(p)}</div>
      <div class="yzt-plot-detail-rows">
        <div class="yzt-plot-detail-row">
          <span class="lbl">地块名称</span>
          <span class="val">${p.plotName}</span>
        </div>
        <div class="yzt-plot-detail-row">
          <span class="lbl">占地面积</span>
          <span class="val hl">${plotAreaToMu(p.area).toLocaleString()} 亩</span>
        </div>
        <div class="yzt-plot-detail-row">
          <span class="lbl">种植作物</span>
          <span class="val hl">${planting.crop}</span>
        </div>
        <div class="yzt-plot-detail-row">
          <span class="lbl">品种</span>
          <span class="val">${planting.variety || "—"}</span>
        </div>
        <div class="yzt-plot-detail-row">
          <span class="lbl">播种进度</span>
          <span class="val">${planting.sowProgress || 0}%</span>
        </div>
        <div class="yzt-plot-detail-row">
          <span class="lbl">遥感状态</span>
          <span class="val hl">${planting.remoteStatus || "—"}</span>
        </div>
      </div>`;
  }

  function selectLeftFarm(farmId) {
    selectedLeftFarm = farmId || null;
    selectedLeftPlot = null;
    document.querySelectorAll(".yzt-farm-pick").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.farm === (farmId || ""));
    });
    if (selectedLeftFarm) {
      const keepPlot = activePlotId && currentPlots.some((p) => p.id === activePlotId && p.farmId === farmId);
      if (!keepPlot) activePlotId = null;
      /* 仅飞至农场，不刷新侧栏数据 */
      if (gisMap) {
        var s = SUBSIDIARIES.find(function(x) { return x.id === farmId; });
        if (s) gisMap.flyTo([s.lat, s.lng], 10, { duration: 0.8 });
      }
    }
  }

  function selectLeftPlot(p) {
    if (!p) return;
    selectedLeftPlot = p;
    if (p.farmId) {
      selectedLeftFarm = p.farmId;
      document.querySelectorAll(".yzt-farm-pick").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.farm === p.farmId);
      });
    }
    /* 仅飞至地块，不刷新侧栏数据 */
    if (gisMap) {
      gisMap.flyTo([p.lat, p.lng], 12, { duration: 0.6 });
    }
  }

  function reRenderSidebarCharts() {
    if (!document.getElementById("plant-season-progress-block")?.classList.contains("yzt-hidden")) {
      renderSeasonProgress();
    }
    if (!document.getElementById("plant-farm-rent-ratio-block")?.classList.contains("yzt-hidden")) {
      renderFarmRentRatio();
    }
    if (!document.getElementById("plant-weather-block")?.classList.contains("yzt-hidden")) {
      renderLeftSidebar();
    }
  }

  function renderLeftSidebar() {
    renderAnnualPlan();
    renderFormulaList();
    renderPlantInvestSummary();
  }

  /* ---- 侧栏布局：土地资源/物联网=左右数据分析；种植经营=地块检索+明细 ---- */
  function applySidebarLayout(tab) {
    const isPlant = tab === "plant";
    const isAnalysis = tab === "land" || tab === "iot";
    const leftSide = document.querySelector(".yzt-side-left");
    const rightSide = document.querySelector(".yzt-side-right");

    leftSide?.classList.toggle("yzt-mode-plant", isPlant);
    leftSide?.classList.toggle("yzt-mode-analysis", isAnalysis);
    rightSide?.classList.toggle("yzt-mode-plant", isPlant);
    rightSide?.classList.toggle("yzt-mode-analysis", isAnalysis);

    document.getElementById("yzt-left-plot")?.classList.toggle("yzt-hidden", !isPlant);
    document.getElementById("yzt-left-analysis")?.classList.toggle("yzt-hidden", !isAnalysis);
    document.getElementById("right-analysis-label")?.classList.add("yzt-hidden");
    document.getElementById("yzt-right-detail-section")?.classList.toggle("yzt-hidden", !isPlant);

    const isLand = tab === "land";
    const isIot = tab === "iot";
    document.querySelectorAll(".yzt-land-chart-list").forEach((el) => {
      el.classList.toggle("yzt-hidden", !isLand);
    });
    document.getElementById("yzt-iot-kpi-block")?.classList.toggle("yzt-hidden", !isIot);
    document.getElementById("yzt-iot-summary-block")?.classList.toggle("yzt-hidden", !isIot);
    document.getElementById("yzt-iot-detail-block")?.classList.toggle("yzt-hidden", !isIot);
    document.getElementById("iot-device-list-wrap")?.classList.toggle("yzt-hidden", !isIot);
    document.getElementById("yzt-iot-right-panel")?.classList.toggle("yzt-hidden", !isIot);
    document.getElementById("left-kpi-row")?.classList.toggle("yzt-hidden", !isIot);
    document.getElementById("iot-device-list-title")?.classList.toggle("yzt-hidden", !isIot);
    document.getElementById("right-kpi-row")?.classList.toggle("yzt-hidden", !isPlant);
    document.getElementById("plant-toolbar")?.classList.toggle("yzt-hidden", !isPlant);
    document.getElementById("plot-type-legend")?.classList.toggle("yzt-hidden", !isPlant);
    document.getElementById("plant-stats-table")?.classList.toggle("yzt-hidden", !isPlant);
    if (isPlant) renderPlantStatsTable();

    if (isLand) {
      syncLandDrillUI();
      /* 不在此重复 renderLandAnalysis：renderPanelsByTab / applyFilter 已会调用，否则与
       * scheduleFarmDrillChartPaint 的 paintGen 竞态会导致首次下钻 ECharts 不绘制（需再点一次）。 */
      requestAnimationFrame(() => {
        if (isLandFarmDrill()) scheduleFarmDrillChartPaint();
      });
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      syncLandDrillUI();
    }
  }

  function resizeSideCharts() {
    const ids = LAND_ECHART_IDS.concat([
    ]);
    const run = () => ids.forEach((id) => charts[id]?.resize());
    run();
    requestAnimationFrame(run);
    setTimeout(run, 150);
  }

  function getIotDevicesForPlots() {
    const plotFarmIds = [...new Set(currentPlots.map((p) => p.farmId))];
    return currentDevices.filter((d) => {
      const farm = SUBSIDIARIES.find((s) => s.name === d.farm);
      return farm && plotFarmIds.includes(farm.id);
    });
  }

  function renderLandAnalysis() {
    if (currentBottomTab !== "land") return;
    const parcels = getLandAnalysisParcels();
    ["left-chart-2", "left-chart-3", "right-chart-2"].forEach(function(id) { disposeChart(id); });
    syncLandDrillUI();
    ensureLandEchartsReady();
    updateLandAnalysisPanels(parcels);
    const resizeIds = isLandFarmDrill() ? LAND_ECHART_IDS_FARM : LAND_ECHART_IDS_GROUP;
    const run = () => {
      resizeIds.forEach((id) => charts[id]?.resize());
    };
    run();
    requestAnimationFrame(run);
    setTimeout(run, 280);
    renderMapLandStats();
  }

  /* ---- 选中 IoT 设备 ---- */
  function selectIotDevice(d) {
    selectedIotDevice = d;
    renderIotLeftPanel();
    updateRightChartsIot(currentDevices);
    resizeSideCharts();
  }

  /* ---- IoT 左侧面板（汇总 / 详情） ---- */
  function renderIotLeftPanel() {
    var devs = currentDevices;
    var stats = getIotStats(devs);
    var summaryBlock = document.getElementById("yzt-iot-summary-block");
    var detailBlock = document.getElementById("yzt-iot-detail-block");
    var kpiBlock = document.getElementById("yzt-iot-kpi-block");
    var listWrap = document.getElementById("iot-device-list-wrap");

    if (selectedIotDevice) {
      if (summaryBlock) summaryBlock.classList.add("yzt-hidden");
      if (detailBlock) detailBlock.classList.remove("yzt-hidden");
      if (kpiBlock) kpiBlock.classList.add("yzt-hidden");
      if (listWrap) listWrap.classList.add("yzt-hidden");
      renderIotDeviceDetail(selectedIotDevice);
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      if (summaryBlock) summaryBlock.classList.add("yzt-hidden");
      if (detailBlock) detailBlock.classList.add("yzt-hidden");
      if (kpiBlock) kpiBlock.classList.add("yzt-hidden");
      if (listWrap) listWrap.classList.remove("yzt-hidden");
    }
  }

  function renderIotDeviceDetail(d) {
    var headEl = document.getElementById("iot-detail-head");
    var readingsEl = document.getElementById("iot-detail-readings");
    var controlEl = document.getElementById("iot-detail-control");
    if (headEl) {
      headEl.innerHTML = '<div class="yzt-iot-detail-title">' + d.name + '</div>' +
        '<div class="yzt-iot-detail-sub">' + d.type + ' &middot; ' + d.farm + ' &middot; ' + (d.status === "online" ? "在线" : d.status === "fault" ? "故障" : "离线") + '</div>' +
        '<div class="yzt-iot-detail-value">' + d.value + '</div>';
    }
    if (readingsEl) {
      var labelMap = { temperature: "温度", humidity: "湿度", windSpeed: "风速", windDir: "风向", pressure: "气压", rainfall: "降雨量",
        soilMoist: "土壤湿度", soilTemp: "土壤温度", soilPH: "土壤pH", conductivity: "电导率", depth10cm: "10cm湿度", depth30cm: "30cm湿度",
        openPct: "阀门开度", flowRate: "流量", totalFlow: "累计流量",
        resolution: "分辨率", fps: "帧率", storageUsed: "存储占用", signalStrength: "信号强度" };
      var unitMap = { temperature: "°C", humidity: "%", windSpeed: "m/s", pressure: "hPa", rainfall: "mm",
        soilMoist: "%", soilTemp: "°C", conductivity: "mS/cm",
        openPct: "%", flowRate: "m³/h", totalFlow: "m³",
        storageUsed: "%", signalStrength: "dBm" };
      var rows = "";
      if (d.readings) {
        Object.keys(d.readings).forEach(function(k) {
          rows += '<div class="yzt-iot-reading-row"><span class="lbl">' + (labelMap[k] || k) + '</span><span class="val">' + d.readings[k] + (unitMap[k] || "") + '</span></div>';
        });
      }
      readingsEl.innerHTML = rows || '<div class="yzt-empty-hint">暂无读数数据</div>';
    }
    /* 历史数据图 */
    var histEl = document.getElementById("iot-detail-history-chart");
    if (histEl) {
      var baseVal = d.type === "气象站" ? 23 : d.type === "土壤墒情站" ? 42 : d.type === "智能水阀" ? 68 : 25;
      var histData = [];
      for (var i = 0; i < 12; i++) histData.push((baseVal + (Math.random() - 0.5) * 10).toFixed(1));
      var chartId = "iot-detail-history-chart";
      disposeChart(chartId);
      var c = echarts.init(histEl, null, { renderer: "canvas" });
      charts[chartId] = c;
      c.setOption({
        animationDuration: 1400,
        animationEasing: "cubicOut",
        grid: { left: 42, right: 12, top: 8, bottom: 18 },
        tooltip: sciTooltip(),
        xAxis: { type: "category", data: ["1h","2h","3h","4h","5h","6h","7h","8h","9h","10h","11h","12h"], axisLabel: { color: SCI.textSec, fontSize: 22 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: [{ type: "line", data: histData, smooth: true, symbol: "circle", symbolSize: 6, lineStyle: sciLineStyle("#00FF88"), itemStyle: { color: "#00FF88", shadowBlur: 6, shadowColor: "rgba(0,255,136,0.5)" }, areaStyle: { color: sciAreaGradient("#00FF88") } }]
      });
    }
    /* 远程控制 */
    if (controlEl) {
      if (d.type === "智能水阀") {
        var isOpen = d.value && d.value.indexOf("开") >= 0;
        controlEl.innerHTML = (isOpen ? '<div class="yzt-valve-status"><div class="yzt-valve-status-item"><span class="lbl">阀门状态</span><span class="val on">● 已开启</span></div><div class="yzt-valve-status-item"><span class="lbl">实时开度</span><span class="val hl">' + d.value + '</span></div></div>' : '<div class="yzt-valve-status-item"><span class="lbl">阀门状态</span><span class="val off">● 已关闭</span></div>') +
          '<div class="yzt-dd-ctrl-row"><button class="yzt-dd-ctrl-btn" onclick="window.__toggleValve(\'' + d.id + '\', true)">远程开启</button><button class="yzt-dd-ctrl-btn off" onclick="window.__toggleValve(\'' + d.id + '\', false)">一键关闭</button></div>';
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
        controlEl.innerHTML = '<div class="yzt-empty-hint">该设备不支持远程控制</div>';
      }
    }
  }

  /* ---- IoT 左侧图表 ---- */
  var DEVICE_ICONS = {
    water: '<path d="M12 2C8 8 4 12 4 15a8 8 0 0016 0c0-3-4-7-8-13z"/>',
    pump: '<circle cx="12" cy="11" r="4"/><path d="M12 7V4M12 18v3M7 11H4M20 11h-3"/><path d="M14 8l3-3M10 14l-3 3M14 14l3 3M10 8L7 5" opacity=".5"/>',
    level: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M6 10h12M6 14h12M6 18h12"/><circle cx="12" cy="7" r="2"/>',
    waste: '<path d="M4 4h16v4H4z"/><path d="M6 8v6a6 6 0 006 6 6 6 0 006-6V8"/><path d="M12 14v7"/>',
    camera: '<rect x="3" y="7" width="18" height="12" rx="3"/><circle cx="12" cy="13" r="4"/><path d="M8 7l2-3h4l2 3"/>',
    weather: '<path d="M8 17a5 5 0 01-1-10 6 6 0 0111-2 4.5 4.5 0 01.5 9H8z"/><path d="M12 3v2M12 20v2M3 12h2M19 12h2"/>',
    soil: '<path d="M12 3C9 8 5 12 6 17a6 6 0 0011 3c.5-2 0-5-5-9z"/><path d="M12 17v4M10 21h4" opacity=".6"/>',
    insect: '<circle cx="12" cy="9" r="3"/><ellipse cx="12" cy="14" rx="3" ry="4"/><path d="M9 6l-2-2M15 6l2-2M12 18v4"/><circle cx="8" cy="6" r="1"/><circle cx="16" cy="6" r="1"/>',
    lamp: '<path d="M8 2h8l-2 8H10z"/><rect x="10" y="10" width="4" height="3"/><rect x="8" y="13" width="8" height="2" rx="1"/><path d="M12 15v5M9 20h6"/>',
    pheno: '<rect x="3" y="4" width="10" height="12" rx="2"/><circle cx="8" cy="10" r="3"/><path d="M13 14h8M17 10v8"/><path d="M15 12l4 4"/>',
    transformer: '<rect x="6" y="2" width="12" height="16" rx="2"/><circle cx="12" cy="7" r="3"/><path d="M12 10v4M9 14h6"/><path d="M8 20h8M12 18v2"/>',
    beidou: '<path d="M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/><circle cx="12" cy="12" r="10"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/>',
    drone: '<path d="M12 3l-4 8h3l-2 6 6-8h-3l4-6z"/><circle cx="12" cy="10" r="8"/><circle cx="12" cy="10" r="3" fill="currentColor"/>',
    tractor: '<rect x="2" y="8" width="6" height="6" rx="1"/><circle cx="5" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M8 11h3l3-6h4v6h2"/><rect x="16" y="6" width="4" height="4" rx="1"/>',
    seeder: '<rect x="3" y="4" width="18" height="12" rx="2"/><circle cx="7" cy="18" r="3"/><circle cx="17" cy="18" r="3"/><path d="M6 4v-2M12 4v-2M18 4v-2"/><circle cx="9" cy="9" r="1.5"/><circle cx="15" cy="9" r="1.5"/>',
    harvester: '<rect x="2" y="6" width="20" height="10" rx="2"/><circle cx="6" cy="19" r="3"/><circle cx="18" cy="19" r="3"/><path d="M12 6v-3M16 6v-3"/><rect x="5" y="2" width="4" height="4" rx="1"/>',
    transporter: '<rect x="2" y="5" width="20" height="8" rx="1"/><rect x="2" y="13" width="4" height="4"/><circle cx="6" cy="20" r="3"/><circle cx="18" cy="20" r="3"/><path d="M8 13h8v4H8z"/>',
    fertigation: '<rect x="4" y="2" width="16" height="14" rx="2"/><path d="M12 8v8M8 10h8"/><circle cx="12" cy="6" r="2"/><path d="M8 18l2 3h8l2-3"/>',
    valve: '<circle cx="12" cy="8" r="4"/><rect x="10" y="12" width="4" height="8"/><path d="M14 16h4M14 18h4"/><path d="M6 16h4M6 18h4"/>',
    sprayer: '<rect x="6" y="2" width="12" height="10" rx="2"/><path d="M10 12v6l4 2V12"/><circle cx="7" cy="6" r="1.5"/><circle cx="17" cy="6" r="1.5"/><path d="M12 2v-1M16 4h4v4h-4"/>'
  };

  var CARDS_PER_PAGE = { "监测类": 6, "作业机械类": 4, "灌溉植保类": 4 };

  function renderIotDeviceList() {
    var el = document.getElementById("iot-device-list");
    if (!el) return;
    var html = "";
    var catOrder = typeof IOT_CATEGORY_ORDER !== "undefined" ? IOT_CATEGORY_ORDER : ["监测类", "作业机械类", "灌溉植保类"];
    catOrder.forEach(function(cat, catIdx) {
      var catDevices = YZT_DEVICE_COUNTS.filter(function(d) { return d.cat === cat; });
      if (!catDevices.length) return;
      var catTotal = catDevices.reduce(function(s, d) { return s + d.count; }, 0);
      var perPage = CARDS_PER_PAGE[cat] || 4;
      var totalPages = Math.ceil(catDevices.length / perPage);
      var catId = "dc-cat-" + catIdx;
      html += '<div class="yzt-device-cat-group">';
      html += '<div class="yzt-device-cat-head"><span class="dc-cat-name">' + cat + '</span><span class="dc-cat-count">' + catTotal + ' 台</span></div>';
      /* 卡片区域 + 翻页 */
      html += '<div class="yzt-device-cat-body">';
      for (var p = 0; p < totalPages; p++) {
        var pageCls = p === 0 ? "" : " yzt-hidden";
        html += '<div class="yzt-device-cat-cards' + pageCls + '" data-cat="' + catId + '" data-page="' + p + '">';
        var start = p * perPage;
        var end = Math.min(start + perPage, catDevices.length);
        for (var i = start; i < end; i++) {
          var d = catDevices[i];
          var svgPath = DEVICE_ICONS[d.icon] || DEVICE_ICONS.water;
          var zeroClass = d.count === 0 ? " dc-zero" : "";
          html += '<div class="yzt-device-card' + zeroClass + '" style="color:' + d.color + '" data-device-type="' + d.name + '">' +
            '<div class="dc-glow"></div>' +
            '<div class="dc-base"></div>' +
            '<svg class="dc-icon" viewBox="0 0 24 24">' +
            '<g stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
            svgPath + '</g></svg>' +
            '<div class="dc-name">' + d.name + '</div>' +
            '<div class="dc-count">' + d.count + ' 台</div>' +
            '</div>';
        }
        html += '</div>';
      }
      /* 翻页控件：监测类仅多页显示，作业机械/灌溉植保始终显示占位 */
      var showPager = totalPages > 1 || cat === "作业机械类" || cat === "灌溉植保类";
      if (showPager) {
        var singlePage = totalPages <= 1;
        html += '<div class="dc-pagination">';
        html += '<button class="dc-page-btn dc-page-prev" data-cat="' + catId + '" data-dir="-1"' + (singlePage ? " disabled" : "") + '>◀</button>';
        html += '<span class="dc-page-info"><span class="dc-page-cur">1</span>/<span class="dc-page-total">' + totalPages + '</span></span>';
        html += '<button class="dc-page-btn dc-page-next" data-cat="' + catId + '" data-dir="1"' + (singlePage ? " disabled" : "") + '>▶</button>';
        html += '</div>';
      }
      html += '</div></div>';
    });
    el.innerHTML = html;
    var titleEl = document.getElementById("iot-device-list-title");
    if (titleEl) titleEl.textContent = "物联网设备统计";

    /* 翻页按钮 */
    el.querySelectorAll(".dc-page-btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var cat = btn.dataset.cat;
        var dir = parseInt(btn.dataset.dir);
        var cards = el.querySelectorAll('.yzt-device-cat-cards[data-cat="' + cat + '"]');
        var curPage = -1;
        cards.forEach(function(c, idx) {
          if (!c.classList.contains("yzt-hidden")) curPage = idx;
        });
        var newPage = curPage + dir;
        if (newPage < 0 || newPage >= cards.length) return;
        cards.forEach(function(c) { c.classList.add("yzt-hidden"); });
        cards[newPage].classList.remove("yzt-hidden");
        /* 更新按钮状态与页码 */
        var body = btn.closest(".yzt-device-cat-body");
        var prevBtn = body ? body.querySelector(".dc-page-prev") : null;
        var nextBtn = body ? body.querySelector(".dc-page-next") : null;
        var infoCur = body ? body.querySelector(".dc-page-cur") : null;
        if (prevBtn) prevBtn.disabled = newPage === 0;
        if (nextBtn) nextBtn.disabled = newPage === cards.length - 1;
        if (infoCur) infoCur.textContent = newPage + 1;
      });
    });

    /* 点击卡片：筛选设备 + 显示实体详情 */
    el.querySelectorAll(".yzt-device-card").forEach(function(card) {
      card.addEventListener("click", function() {
        el.querySelectorAll(".yzt-device-card").forEach(function(c) { c.classList.remove("dc-active"); });
        card.classList.add("dc-active");
        selectDeviceTypeAndFilter(card.dataset.deviceType);
        showDeviceEntityCard(card.dataset.deviceType);
      });
    });
  }

  function showDeviceEntityCard(deviceType) {
    var dev = YZT_DEVICE_COUNTS.find(function(d) { return d.name === deviceType; });
    if (!dev) return;
    var entityCard = document.getElementById("iot-entity-card");
    if (!entityCard) return;
    entityCard.classList.remove("yzt-hidden");

    document.getElementById("ec-head").innerHTML =
      '<span class="ec-dot" style="background:' + dev.color + '"></span>' +
      '<span class="ec-title">' + dev.name + '</span>' +
      '<span class="ec-count">共 ' + dev.count + ' 台</span>';

    document.getElementById("ec-grid").innerHTML =
      '<div class="ec-img-wrap"><div class="ec-img">📷<br/><span>设备影像</span></div></div>' +
      '<div class="ec-row"><span class="ec-label">设备类型</span><span class="ec-val">' + dev.name + '-G3</span></div>' +
      '<div class="ec-row"><span class="ec-label">部署数量</span><span class="ec-val">' + dev.count + ' 台</span></div>' +
      '<div class="ec-row"><span class="ec-label">覆盖范围</span><span class="ec-val">白城/镇南全域</span></div>' +
      '<div class="ec-row"><span class="ec-label">在线率</span><span class="ec-val green">' + (88 + Math.floor(Math.random() * 12)) + '%</span></div>' +
      '<div class="ec-row"><span class="ec-label">今日告警</span><span class="ec-val">' + (dev.count > 10 ? Math.floor(Math.random() * 3) : 0) + ' 条</span></div>';
  }

  function selectDeviceTypeAndFilter(deviceType) {
    if (!gisMap) return;
    iotFilter.type = deviceType;
    iotFilter.status = null;
    iotFilter.farm = null;
    selectedIotDevice = null;
    applyFilter();
    /* 聚焦到第一个设备 */
    var devs = currentDevices;
    setTimeout(function() {
      if (devs.length && gisMap) gisMap.flyTo([devs[0].lat, devs[0].lng], 12, { duration: 0.6 });
    }, 300);
  }

  /* 保留兼容：不再使用 donut */
  function renderIotLeftDonut(devs) {
    var catCount = {};
    devs.forEach(function(d) {
      var cat = (IOT_CATEGORY_MAP[d.type] || { cat: "其他" }).cat;
      catCount[cat] = (catCount[cat] || 0) + 1;
    });
    var data = Object.keys(catCount).map(function(name) { return { name: name, value: catCount[name] }; });
    if (!charts["iot-left-donut"]) {
      initChart("iot-left-donut", {
        animationDuration: 1600,
        animationEasing: "cubicOut",
        color: ["#00D4FF", "#00FF88", "#B388FF"],
        tooltip: sciTooltip(),
        series: [{ type: "pie", radius: ["36%", "62%"], center: ["50%", "52%"],
          label: { show: true, position: "outside", formatter: "{b}\n{c}台", fontSize: 28, color: SCI.textPri, lineHeight: 32 },
          labelLine: { show: true, lineStyle: { color: "rgba(0,212,255,0.25)", width: 1.5 } },
          itemStyle: { borderColor: "rgba(2,10,22,0.85)", borderWidth: 3, borderRadius: 2 },
          emphasis: sciEmphasis(SCI.cyan),
          data: [] }]
      });
    }
    if (charts["iot-left-donut"]) charts["iot-left-donut"].setOption({ series: [{ data: data }] }, false);
  }

  function renderIotLeftBar(devs) {
    var statusCount = { online: 0, offline: 0, fault: 0 };
    devs.forEach(function(d) { statusCount[d.status] = (statusCount[d.status] || 0) + 1; });
    var data = [
      { name: "在线", value: statusCount.online, itemStyle: { color: "#00FF88" } },
      { name: "离线", value: statusCount.offline, itemStyle: { color: "#9CA3AF" } },
      { name: "故障", value: statusCount.fault, itemStyle: { color: "#FF6B6B" } }
    ];
    if (!charts["iot-left-bar"]) {
      initChart("iot-left-bar", {
        animationDuration: 1400,
        animationEasing: "cubicOut",
        grid: { left: 42, right: 16, top: 20, bottom: 12 },
        tooltip: sciTooltip(),
        xAxis: { type: "category", data: ["在线", "离线", "故障"], axisLabel: { color: SCI.textPri, fontSize: 26, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: [{ type: "bar", data: [], barWidth: "36%",
          label: { show: true, position: "top", fontSize: 22, color: "#fff", fontWeight: 600, fontFamily: SCI.fontNum },
          emphasis: sciEmphasis(SCI.primary) }]
      });
    }
    if (charts["iot-left-bar"]) charts["iot-left-bar"].setOption({ series: [{ data: data }] }, false);
  }

  function updateLeftChartsIot(devs) {
    renderIotDeviceList();
  }

  /* ---- IoT 右侧图表 ---- */
  function renderIotRightPie(devs) {
    var catCount = {};
    devs.forEach(function(d) {
      var cat = (IOT_CATEGORY_MAP[d.type] || { cat: "其他" }).cat;
      catCount[cat] = (catCount[cat] || 0) + 1;
    });
    var data = Object.keys(catCount).map(function(n) { return { name: n, value: catCount[n] }; });
    if (!charts["iot-right-chart-1"]) {
      initChart("iot-right-chart-1", {
        animationDuration: 1600,
        animationEasing: "cubicOut",
        color: ["#00D4FF", "#FFB800", "#00B4D8", "#B388FF"],
        tooltip: sciTooltip(),
        series: [{ type: "pie", radius: ["40%", "68%"], center: ["50%", "55%"], label: { show: false },
          itemStyle: { borderColor: "rgba(2,10,22,0.85)", borderWidth: 3, borderRadius: 2 },
          emphasis: sciEmphasis(SCI.cyan),
          data: [] }]
      });
    }
    if (charts["iot-right-chart-1"]) {
      charts["iot-right-chart-1"].setOption({
        title: { text: "设备类型分布", textStyle: { color: "#00FF88", fontSize: 28, fontWeight: 700, textShadowColor: "rgba(0,255,136,0.35)", textShadowBlur: 14 }, left: 8, top: 4 },
        series: [{ data: data }]
      }, false);
    }
  }

  function renderIotRightBar(devs) {
    var farms = [];
    var seen = {};
    devs.forEach(function(d) { if (!seen[d.farm]) { seen[d.farm] = true; farms.push(d.farm); } });
    var statuses = ["online", "offline", "fault"];
    var seriesData = statuses.map(function(s) {
      return {
        name: s === "online" ? "在线" : s === "offline" ? "离线" : "故障",
        type: "bar",
        data: farms.map(function(f) { return devs.filter(function(d) { return d.farm === f && d.status === s; }).length; }),
        itemStyle: { color: s === "online" ? "#00FF88" : s === "offline" ? "#9CA3AF" : "#FF6B6B" }
      };
    });
    if (!charts["iot-right-chart-2"]) {
      initChart("iot-right-chart-2", {
        animationDuration: 1400,
        animationEasing: "cubicOut",
        grid: { left: 48, right: 14, top: 42, bottom: 14 },
        tooltip: sciTooltip(),
        legend: { data: ["在线", "离线", "故障"], textStyle: { color: SCI.textPri, fontSize: 24, fontWeight: 500 }, top: 0, itemWidth: 18, itemHeight: 12, itemGap: 20 },
        xAxis: { type: "category", data: [], axisLabel: { color: SCI.textPri, fontSize: 24, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: []
      });
    }
    if (charts["iot-right-chart-2"]) {
      seriesData.forEach(function(s) {
        s.itemStyle = Object.assign({ borderRadius: [6, 6, 0, 0], shadowBlur: 6, shadowColor: hexToRgba(s.itemStyle.color, 0.3) }, s.itemStyle || {});
        s.emphasis = sciEmphasis(s.itemStyle.color);
      });
      charts["iot-right-chart-2"].setOption({
        xAxis: { data: farms },
        series: seriesData
      }, false);
    }
  }

  function renderIotAlertList(devsOrDevice) {
    var el = document.getElementById("iot-alert-list");
    if (!el) return;
    var devList = Array.isArray(devsOrDevice) ? devsOrDevice : [devsOrDevice];
    var alerts = [];
    devList.forEach(function(d) {
      if (d.alerts && d.alerts.length) {
        d.alerts.forEach(function(a) { alerts.push({ title: a.title || a.text, text: a.text, time: a.time, level: a.level, deviceId: d.id, deviceName: d.name }); });
      }
    });
    /* 补充全局告警汇总 */
    if (typeof YZT_DEVICE_ALERTS !== "undefined" && Array.isArray(YZT_DEVICE_ALERTS)) {
      var isAll = !devsOrDevice || (Array.isArray(devsOrDevice) && devsOrDevice.length === currentDevices.length);
      YZT_DEVICE_ALERTS.forEach(function(a) {
        var match = !devsOrDevice || (Array.isArray(devsOrDevice) && devsOrDevice.some(function(d) { return d.id === a.deviceId; }));
        if (match || isAll) {
          var exists = alerts.some(function(ex) { return ex.deviceId === a.deviceId && ex.time === a.time; });
          if (!exists) alerts.push({ title: a.title, text: a.text, time: a.time, level: a.level, deviceId: a.deviceId, deviceName: a.deviceName });
        }
      });
    }
    if (!alerts.length) { el.innerHTML = '<div class="yzt-empty-hint">暂无告警</div>'; return; }
    el.innerHTML = alerts.map(function(a) {
      return '<div class="yzt-iot-alert-item level-' + a.level + '"><div class="alert-text">' + a.deviceName + ': ' + a.text + '</div><div class="alert-time">' + a.time + '</div></div>';
    }).join("");
  }

  function renderIotRealtimeGrid(devs) {
    var el = document.getElementById("iot-rt-grid");
    if (!el) return;
    var online = devs.filter(function(d) { return d.online; }).slice(0, 5);
    el.innerHTML = online.map(function(d) {
      return '<div class="yzt-iot-rt-row"><span class="rt-dev">' + d.name + '</span><span class="rt-val">' + d.value + '</span></div>';
    }).join("") || '<div class="yzt-empty-hint">暂无实时数据</div>';
  }

  function renderIotRightOps(devs) {
    var stats = getIotStats(devs);
    var uptimeEl = document.getElementById("iot-ops-uptime");
    var faultEl = document.getElementById("iot-ops-fault");
    if (uptimeEl) uptimeEl.textContent = stats.onlineRate + "%";
    if (faultEl) faultEl.textContent = (stats.fault / Math.max(stats.total, 1) * 100).toFixed(1) + "%";
  }

  function renderIotCrossStats(devs) {
    var el = document.getElementById("iot-cross-stats");
    if (!el) return;
    var rows = '<table class="yzt-cross-table"><thead><tr><th>名称</th><th>在线</th><th>离线</th><th>故障</th><th>合计</th></tr></thead><tbody>';
    YZT_DEVICE_COUNTS.forEach(function(d) {
      var online = Math.round(d.count * (0.90 + Math.random() * 0.08));
      var fault = Math.round(d.count * (0.01 + Math.random() * 0.04));
      var offline = d.count - online - fault;
      var sc = function(n, s) {
        if (n <= 0) return '<td class="c-zero">0</td>';
        if (s === "offline" || s === "fault") return '<td class="c-warn">' + n + '</td>';
        return '<td class="c-ok">' + n + '</td>';
      };
      rows += '<tr><td class="c-label"><span class="ds-dot" style="background:' + d.color + '"></span>' + d.name + '</td>' + sc(online, "online") + sc(offline, "offline") + sc(fault, "fault") + '<td class="c-total">' + d.count + '</td></tr>';
    });
    rows += '</tbody></table>';
    el.innerHTML = rows;
  }

  function updateRightChartsIot(devs) {
    var d = selectedIotDevice;
    renderIotStationInfo(d);
    renderIotRightLineChart(d || devs);
    renderIotAlertList(d || devs);
  }

  /* 站点设备信息 */
  function renderIotStationInfo(d) {
    var el = document.getElementById("iot-station-info");
    if (!el) return;
    var filterType = iotFilter.type && iotFilter.type !== "all" ? iotFilter.type : null;

    if (!d && !filterType) { el.innerHTML = '<div class="yzt-empty-hint">请选择设备</div>'; return; }

    /* 类型专用颜色 */
    var typeColors = {
      "土壤墒情站": "#B388FF", "气象站": "#FF9F1C", "养分酸碱度传感器": "#536DFE",
      "孢子捕捉仪": "#E040FB", "虫情测报设备": "#AB47BC", "监控": "#FFB800",
      "遥感无人机": "#00D4FF", "水肥一体机": "#00B4D8", "灌溉管件阀门": "#48CAE4",
      "无人植保机": "#7C4DFF", "杀虫防控设备": "#FF5252", "智能水阀": "#48CAE4",
      "摄像头": "#FFB800", "无人拖拉机": "#00C853", "播种机": "#64DD17",
      "收割机": "#FFD600", "田间转运车": "#FF9100"
    };

    if (d) {
      var statusText = d.status === "online" ? "在线" : d.status === "fault" ? "故障" : "离线";
      var statusCls = d.status === "online" ? "st-online" : d.status === "fault" ? "st-fault" : "st-offline";
      var tc = typeColors[d.type] || "#00FF88";
      el.innerHTML =
        '<div class="yzt-station-name"><span class="yzt-station-dot" style="background:' + tc + '"></span>' + d.name + '</div>' +
        '<div class="yzt-station-meta">' +
          '<span>类型：' + d.type + '</span>' +
          '<span>所属：' + d.farm + '</span>' +
          '<span>状态：<span class="' + statusCls + '">' + statusText + '</span></span>' +
        '</div>' +
        '<div class="yzt-station-meta"><span>运行时长：' + (d.runtime || "--") + '</span><span>最后上报：' + (d.lastReport || "--") + '</span></div>';
    } else {
      /* 显示设备类型汇总 —— 统一使用设备详情的展示格式 */
      var typeDevs = currentDevices.filter(function(x) { return x.type === filterType; });
      var onlineCnt = typeDevs.filter(function(x) { return x.status === "online"; }).length;
      var faultCnt = typeDevs.filter(function(x) { return x.status === "fault"; }).length;
      var offlineCnt = typeDevs.filter(function(x) { return x.status === "offline"; }).length;
      var devInfo = YZT_DEVICE_COUNTS.find(function(x) { return x.name === filterType; });
      var tc = typeColors[filterType] || "#00FF88";
      var totalCnt = devInfo ? devInfo.count : typeDevs.length;
      var onlineRate = totalCnt ? Math.round(onlineCnt / totalCnt * 100) : 0;

      el.innerHTML =
        '<div class="yzt-station-name"><span class="yzt-station-dot" style="background:' + tc + '"></span>' + filterType + '</div>' +
        '<div class="yzt-station-meta">' +
          '<span>类型：' + filterType + '</span>' +
          '<span>所属：白城/镇南</span>' +
          '<span>在线率：' + onlineRate + '%</span>' +
        '</div>' +
        '<div class="yzt-station-meta"><span>部署数量：' + totalCnt + ' 台</span><span>在线：' + onlineCnt + '</span><span>故障：' + faultCnt + '</span></div>';
    }
  }

  function renderIotRightLineChart(devsOrDevice) {
    var el = document.getElementById("iot-right-line-chart");
    if (!el) return;
    var hours = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];

    /* 确定设备类型，根据类型显示不同数据 */
    var devType = null;
    var isSingle = devsOrDevice && !Array.isArray(devsOrDevice);
    if (isSingle && devsOrDevice.type) {
      devType = devsOrDevice.type;
    } else if (iotFilter.type && iotFilter.type !== "all") {
      devType = iotFilter.type;
    } else if (Array.isArray(devsOrDevice) && devsOrDevice.length > 0) {
      devType = devsOrDevice[0].type;
    }

    /* 根据设备类型定义需要显示的指标 */
    var seriesConfig = [];
    if (devType === "气象站") {
      seriesConfig = [
        { name: "温度(℃)", color: "#FF9F1C", key: "temperature", base: 22, range: 6 },
        { name: "湿度(%)", color: "#00D4FF", key: "humidity", base: 68, range: 15 },
        { name: "气压(hPa)", color: "#B388FF", key: "pressure", base: 1013, range: 8 }
      ];
    } else if (devType === "土壤墒情站") {
      seriesConfig = [
        { name: "土壤湿度(%)", color: "#00D4FF", key: "soilMoist", base: 42, range: 12 },
        { name: "土壤温度(℃)", color: "#FF9F1C", key: "soilTemp", base: 18.5, range: 5 },
        { name: "电导率(mS/cm)", color: "#B388FF", key: "conductivity", base: 0.8, range: 0.3 }
      ];
    } else if (devType === "养分酸碱度传感器") {
      seriesConfig = [
        { name: "土壤pH", color: "#00D4FF", key: "soilPH", base: 6.8, range: 1.2 },
        { name: "氮(mg/kg)", color: "#00FF88", key: "nitrogen", base: 120, range: 40 },
        { name: "钾(mg/kg)", color: "#FF9F1C", key: "potassium", base: 200, range: 60 }
      ];
    } else if (devType === "孢子捕捉仪") {
      seriesConfig = [
        { name: "孢子密度(个/m³)", color: "#E040FB", key: "sporeDensity", base: 50, range: 80 }
      ];
    } else if (devType === "虫情测报设备") {
      seriesConfig = [
        { name: "虫口数量(头)", color: "#AB47BC", key: "insectCount", base: 30, range: 40 },
        { name: "诱集率(%)", color: "#FF9F1C", key: "trapRate", base: 65, range: 25 }
      ];
    } else if (devType === "水肥一体机") {
      seriesConfig = [
        { name: "流量(m³/h)", color: "#00D4FF", key: "flowRate", base: 12, range: 6 },
        { name: "肥液浓度(%)", color: "#00FF88", key: "fertConc", base: 3.5, range: 2 }
      ];
    } else if (devType === "灌溉管件阀门") {
      seriesConfig = [
        { name: "阀门开度(%)", color: "#00D4FF", key: "openPct", base: 60, range: 40 },
        { name: "流量(m³/h)", color: "#48CAE4", key: "flowRate", base: 8, range: 5 }
      ];
    } else if (devType === "无人植保机") {
      seriesConfig = [
        { name: "飞行高度(m)", color: "#7C4DFF", key: "altitude", base: 5, range: 3 },
        { name: "喷药量(L/min)", color: "#00D4FF", key: "sprayRate", base: 2.5, range: 1.5 }
      ];
    } else if (devType === "杀虫防控设备") {
      seriesConfig = [
        { name: "杀虫数量(只)", color: "#FF5252", key: "killCount", base: 200, range: 150 },
        { name: "电网电压(V)", color: "#FF9F1C", key: "voltage", base: 220, range: 20 }
      ];
    } else if (devType === "监控") {
      seriesConfig = [
        { name: "在线率(%)", color: "#00FF88", key: "uptime", base: 98, range: 3 }
      ];
    } else if (devType === "遥感无人机") {
      seriesConfig = [
        { name: "飞行高度(m)", color: "#00D4FF", key: "altitude", base: 120, range: 40 },
        { name: "覆盖面积(亩)", color: "#00FF88", key: "coverage", base: 500, range: 300 }
      ];
    } else {
      seriesConfig = [
        { name: "温度(℃)", color: "#FF9F1C", key: "temperature", base: 22, range: 6 },
        { name: "湿度(%)", color: "#00D4FF", key: "humidity", base: 68, range: 15 }
      ];
    }

    /* 生成数据 */
    var allSeries = seriesConfig.map(function(cfg) {
      return hours.map(function(_, i) {
        var v = cfg.base + Math.sin(i / 3 + cfg.key.length) * cfg.range * 0.4 + (Math.random() - 0.5) * cfg.range * 0.3;
        return +v.toFixed(1);
      });
    });

    /* 初始化或更新图表 */
    var legendData = seriesConfig.map(function(c) { return c.name; });
    var seriesData = seriesConfig.map(function(cfg, idx) {
      return {
        name: cfg.name, type: "line", smooth: true, data: allSeries[idx],
        symbol: "circle", symbolSize: 8,
        itemStyle: { color: cfg.color, shadowBlur: 6, shadowColor: hexToRgba(cfg.color, 0.5) },
        lineStyle: sciLineStyle(cfg.color),
        areaStyle: { color: sciAreaGradient(cfg.color) }
      };
    });

    disposeChart("iot-right-line-chart");
    var c = echarts.init(el, null, { renderer: "canvas" });
    charts["iot-right-line-chart"] = c;
    c.setOption({
      animationDuration: 2000,
      animationEasing: "cubicOut",
      grid: { left: 56, right: 20, top: 38, bottom: 30 },
      tooltip: sciTooltip(),
      legend: { data: legendData, textStyle: { color: SCI.textPri, fontSize: 30, fontWeight: 500 }, top: 2, itemWidth: 22, itemHeight: 12, itemGap: 24 },
      xAxis: { type: "category", name: "时间", nameTextStyle: { color: SCI.textSec, fontSize: 28 }, data: hours, axisLabel: { color: SCI.textSec, fontSize: 30 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, boundaryGap: false },
      yAxis: { type: "value", axisLabel: { color: SCI.textSec, fontSize: 30 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: seriesData
    });
  }

  function renderIotAnalysis() {
    var devs = currentDevices;
    /* 顶部 KPI 始终显示全部设备统计，不随筛选变化 */
    var allDevs = YZT_DEVICES.filter(function(d) {
      var farm = SUBSIDIARIES.find(function(s) { return s.name === d.farm; });
      return farm && getFarmIds().includes(farm.id);
    });
    var allStats = getIotStats(allDevs);

    var leftKpi = document.getElementById("left-kpi-row");
    if (leftKpi) {
      leftKpi.innerHTML = '<div class="gkpi-item"><div class="gkpi-label">设备总数</div><div class="gkpi-val green">' + allStats.total + '<span class="gkpi-unit">台</span></div></div>' +
        '<div class="gkpi-item"><div class="gkpi-label">在线设备</div><div class="gkpi-val">' + allStats.online + '<span class="gkpi-unit">台</span></div></div>' +
        '<div class="gkpi-item"><div class="gkpi-label">在线率</div><div class="gkpi-val">' + allStats.onlineRate + '<span class="gkpi-unit">%</span></div></div>';
    }
    renderIotLeftPanel();
    updateLeftChartsIot(devs);
    updateRightChartsIot(devs);
    resizeSideCharts();

    /* 默认选中土壤墒情站（仅设置变量，不切换左栏布局） */
    if (!selectedIotDevice && devs.length > 0) {
      var soilDevice = devs.find(function(d) { return d.type === "土壤墒情站"; });
      if (soilDevice) {
        selectedIotDevice = soilDevice;
        updateRightChartsIot(devs);
      }
    }
  }

  function updateRightChartsPlant(plots) {
    const cropG = groupPlotsBy(plots, "crop");
    const names = Object.keys(cropG);
    const total = plots.reduce(function(a, p) { return a + p.area; }, 0);

    if (!charts["right-chart-1"]) {
      initChart("right-chart-1", {
        backgroundColor: "transparent",
        tooltip: sciTooltip(),
        series: [{ type: "pie", radius: ["42%", "66%"], center: ["50%", "52%"], label: { show: false }, data: [] }]
      });
    }
    if (charts["right-chart-1"]) {
      charts["right-chart-1"].setOption({
        color: chartColors,
        tooltip: sciTooltip(),
        series: [{
          type: "pie",
          radius: ["42%", "66%"],
          center: ["50%", "52%"],
          label: { show: false },
          itemStyle: { borderColor: "rgba(2,12,24,0.85)", borderWidth: 3, borderRadius: 2 },
          emphasis: sciEmphasis(SCI.primary),
          data: names.map(function(n) { return { name: n, value: cropG[n].area }; })
        }],
        graphic: [
          { type: "text", left: "center", top: "40%", style: { text: total.toFixed(1) + "万亩", font: "bold 44px " + SCI.fontNum, fill: "#fff", textAlign: "center" } },
          { type: "text", left: "center", top: "52%", style: { text: "作物总面积", font: "26px 'Noto Sans SC', sans-serif", fill: SCI.textSec, textAlign: "center" } }
        ]
      });
    }
    if (charts["right-chart-2"]) {
      var cats = YZT_PROGRESS.categories;
      charts["right-chart-2"].setOption({
        backgroundColor: "transparent",
        grid: { left: 52, right: 20, top: 48, bottom: 32 },
        tooltip: sciTooltip(),
        legend: { data: ["已播", "已收"], textStyle: { color: SCI.textPri, fontSize: 28 }, top: 0, right: 8, itemWidth: 18, itemHeight: 10 },
        xAxis: { type: "category", data: cats, axisLabel: { color: SCI.textPri, fontSize: 28, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", axisLabel: { color: SCI.textSec, fontSize: 26 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: [
          { name: "已播", type: "bar", data: YZT_PROGRESS.sowDone, itemStyle: sciBarStyle(SCI.primary), barWidth: "26%", emphasis: sciEmphasis(SCI.primary) },
          { name: "已收", type: "bar", data: YZT_PROGRESS.harvestDone, itemStyle: sciBarStyle(SCI.cyan), barWidth: "26%", emphasis: sciEmphasis(SCI.cyan) }
        ]
      });
    }
  }

  function showMapBanner(name) {
    var bannerEl = document.getElementById("farm-drill-banner");
    var bannerNameEl = document.getElementById("farm-drill-banner-name");
    if (bannerNameEl) bannerNameEl.textContent = name || "";
    if (bannerEl) { bannerEl.classList.remove("yzt-hidden"); bannerEl.setAttribute("aria-hidden", "false"); }
  }

  function hideMapBanner() {
    var banner = document.getElementById("farm-drill-banner");
    if (banner) { banner.classList.add("yzt-hidden"); banner.setAttribute("aria-hidden", "true"); }
  }

  function togglePlantStatsTable() {
    var table = document.getElementById("plant-stats-table");
    var toggleBtn = document.getElementById("pst-toggle");
    if (!table) return;
    if (table.classList.contains("pst-collapsed")) {
      table.classList.remove("pst-collapsed");
      if (toggleBtn) toggleBtn.textContent = "▲";
    } else {
      table.classList.add("pst-collapsed");
      if (toggleBtn) toggleBtn.textContent = "▼";
    }
  }

  var plantStatsYear = "2026";
  var plantStatsSearch = "";

  function renderPlantStatsTable() {
    var el = document.getElementById("pst-body");
    if (!el) return;
    var plots = currentPlots;
    /* 搜索过滤 */
    var search = plantStatsSearch.trim().toLowerCase();
    if (search) {
      plots = plots.filter(function(p) { return (p.plotName || "").toLowerCase().indexOf(search) >= 0; });
    }
    /* 按农场名称分组 */
    var farmMap = {};
    var totalAllPlots = 0;
    var totalAllArea = 0;
    plots.forEach(function(p) {
      var fn = p.farmName || "";
      if (!fn) return;
      if (!farmMap[fn]) farmMap[fn] = { farmId: p.farmId, plots: [], totalArea: 0 };
      farmMap[fn].plots.push(p);
      farmMap[fn].totalArea += p.area;
      totalAllPlots++;
      totalAllArea += p.area;
    });

    var farmNames = Object.keys(farmMap);
    var html = "";

    // 集团汇总行
    var totalAllMu = +(totalAllArea * 15).toFixed(1);
    html += '<div class="pst-group">';
    html += '<div class="pst-group-row" id="pst-group-row">';
    html += '<span class="pst-group-arrow open">▶</span>';
    html += '<span class="pst-group-name">农发集团</span>';
    html += '<span class="pst-group-count">' + totalAllPlots + '块</span>';
    html += '<span class="pst-group-area">' + totalAllMu + '万亩</span>';
    html += '</div>';
    html += '<div class="pst-group-body open" id="pst-group-body">';

    // 各农场
    farmNames.forEach(function(fn, fi) {
      var fd = farmMap[fn];
      var totalMu = +(fd.totalArea * 15).toFixed(1);
      var openClass = fi === 0 ? " open" : "";
      html += '<div class="pst-farm-group">';
      html += '<div class="pst-farm-row" data-farm-id="' + fd.farmId + '" data-farm-idx="' + fi + '">';
      html += '<span class="pst-farm-arrow' + openClass + '">▶</span>';
      html += '<span class="pst-farm-name">' + fn + '</span>';
      html += '<span class="pst-farm-count">' + fd.plots.length + '块</span>';
      html += '<span class="pst-farm-area">' + totalMu + '万亩</span>';
      html += '</div>';
      html += '<div class="pst-plot-list' + openClass + '" data-farm-list="' + fi + '">';
      fd.plots.forEach(function(p) {
        var mu = +(p.area * 15 * 10000).toFixed(1);
        html += '<div class="pst-plot-row" data-plot-id="' + p.id + '">';
        html += '<span class="pst-plot-name">' + p.plotName + '</span>';
        html += '<span class="pst-plot-area">' + mu + '亩</span>';
        html += '</div>';
      });
      html += '</div>';
      html += '</div>';
    });

    html += '</div>'; // pst-group-body
    html += '</div>'; // pst-group
    el.innerHTML = html;

    // 集团行展开/折叠
    var groupRow = document.getElementById("pst-group-row");
    var groupArrow = groupRow?.querySelector(".pst-group-arrow");
    var groupBody = document.getElementById("pst-group-body");
    if (groupRow && groupArrow && groupBody) {
      groupRow.addEventListener("click", function() {
        groupArrow.classList.toggle("open");
        groupBody.classList.toggle("open");
      });
    }

    /* 展开/折叠（点击箭头） + 定位到农场（点击农场行） */
    el.querySelectorAll(".pst-farm-row").forEach(function(row) {
      var arrow = row.querySelector(".pst-farm-arrow");
      if (arrow) {
        arrow.addEventListener("click", function(e) {
          e.stopPropagation();
          var idx = row.dataset.farmIdx;
          var list = el.querySelector('[data-farm-list="' + idx + '"]');
          arrow.classList.toggle("open");
          if (list) list.classList.toggle("open");
        });
      }
      row.addEventListener("click", function() {
        var fid = row.dataset.farmId;
        if (!fid) return;
        document.getElementById("plot-info-card")?.classList.add("yzt-hidden");
        /* 仅记录选中状态，不刷新侧栏数据 */
        selectedLeftFarm = fid;
        selectedLeftPlot = null;
        document.querySelectorAll(".yzt-farm-pick").forEach(function(btn) {
          btn.classList.toggle("active", btn.dataset.farm === fid);
        });
        /* 地图飞至农场 */
        if (gisMap) {
          var farmPlots = currentPlots.filter(function(p) { return p.farmId === fid; });
          if (farmPlots.length > 0) {
            var lats = farmPlots.map(function(p) { return p.lat; });
            var lngs = farmPlots.map(function(p) { return p.lng; });
            var clat = (Math.min.apply(null, lats) + Math.max.apply(null, lats)) / 2;
            var clng = (Math.min.apply(null, lngs) + Math.max.apply(null, lngs)) / 2;
            gisMap.flyTo([clat, clng], 13, { duration: 0.8 });
          } else {
            var bounds = getFarmPlotBounds(fid);
            if (bounds) {
              var bc = bounds.getCenter();
              gisMap.flyToBounds(bounds, { duration: 0.8, padding: [10, 10], maxZoom: 15 });
            }
          }
        }
      });
    });

    /* 点击地块行：定位到该地块并弹框显示地块信息，更新侧栏数据 */
    el.querySelectorAll(".pst-plot-row").forEach(function(row) {
      row.addEventListener("click", function(e) {
        e.stopPropagation();
        var pid = row.dataset.plotId;
        if (!pid || !gisMap) return;
        var p = currentPlots.find(function(x) { return x.id === pid; });
        if (p) {
          gisMap.flyTo([p.lat, p.lng], 13, { duration: 0.6 });
          showMapBanner(formatPlotLabel(p));
          selectLeftPlot(p);
        }
      });
    });
  }

  /* 绑定农场地块统计表收起按钮 */
  document.getElementById("pst-toggle")?.addEventListener("click", togglePlantStatsTable);
  document.getElementById("pst-head")?.addEventListener("click", function(e) {
    if (e.target === this) togglePlantStatsTable();
  });
  /* 年份筛选（自定义下拉） */
  renderSelectOptions("pst-year-select", [
    { value: "2026", label: "2026年种植季" },
    { value: "2025", label: "2025年种植季" }
  ]);
  onSelectChange("pst-year-select", function(value) {
    plantStatsYear = value;
    renderPlantStatsTable();
  });
  /* 地块名称搜索 */
  document.getElementById("pst-search-input")?.addEventListener("input", function() {
    plantStatsSearch = this.value;
    renderPlantStatsTable();
  });

  var currentInvestTab = "农资";

  /* 左上：土地资源概况 — 双卡片 */
  /* 根据选中项生成变化数据 */
  function _plotSeed(id) {
    var s = String(id || ""); var n = 0;
    for (var i = 0; i < s.length; i++) n += s.charCodeAt(i);
    return n;
  }

  /* 左上2：各农场统种地占比 — 环形图 */
  function renderAnnualPlan() {
    var kpiEl = document.getElementById("annual-plan-kpi");
    var gaugeEl = document.getElementById("annual-plan-gauge");
    if (!kpiEl || !gaugeEl) return;

    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    var t1 = 55 + (seed % 20) - 8;     // 统种占比
    var t2 = 100 - t1;                   // 承租占比

    var totalArea = sumPlotArea(currentPlots);
    var selfArea = (totalArea * t1 / 100).toFixed(1);
    var rentArea = (totalArea * t2 / 100).toFixed(1);
    var rentFee = (rentArea * 0.254).toFixed(1);

    // KPI: 承租/统种
    kpiEl.innerHTML =
      '<div class="ap-kpi-item ap-kpi-rent">' +
        '<div class="ap-kpi-label">承租耕地</div>' +
        '<div class="ap-kpi-val">' + rentArea + '<span class="ap-kpi-unit">万亩</span></div>' +
        '<div class="ap-kpi-rent-fee">租金 <span class="ap-rent-num">' + rentFee + '</span> 亿元</div>' +
      '</div>' +
      '<div class="ap-kpi-item ap-kpi-self">' +
        '<div class="ap-kpi-label">统种耕地</div>' +
        '<div class="ap-kpi-val">' + selfArea + '<span class="ap-kpi-unit">万亩</span></div>' +
        // '<div class="ap-kpi-sub">占比 ' + t1 + '%</div>' +
      '</div>';

    // 仪表盘：计划作物面积占比 — 单环大圈
    var crops = ["大豆", "玉米", "小麦", "其他"];
    var cropColors = ["#00FF88", "#00D4FF", "#FFB800", "#B388FF"];
    var cropValues = crops.map(function(_, ci) { return 30 + (seed * (ci + 3)) % 45; });
    var total = cropValues.reduce(function(a, b) { return a + b; }, 0);

    disposeChart("annual-plan-gauge");
    var c = echarts.init(gaugeEl, null, { renderer: "canvas" });
    charts["annual-plan-gauge"] = c;

    var colorStops = [];
    var accumulated = 0;
    cropValues.forEach(function(v, i) {
      accumulated += v;
      var pct = +(accumulated / total).toFixed(3);
      colorStops.push([pct, cropColors[i]]);
    });

    c.setOption({
      animationDuration: 2000,
      animationEasing: "cubicOut",
      series: [
        // 底层暗色轨道弧
        {
          type: "gauge",
          silent: true,
          startAngle: 195, endAngle: 345,
          center: ["50%", "60%"], radius: "92%",
          min: 0, max: total, splitNumber: 1,
          axisLine: { show: true, lineStyle: { width: 56, color: [[1, "rgba(0,229,255,0.08)"]] } },
          pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
          detail: { show: false }, title: { show: false },
          data: [{ value: total }]
        },
        // 上层数据彩色弧
        {
          type: "gauge",
          silent: true,
          startAngle: 195, endAngle: 345,
          center: ["50%", "60%"], radius: "92%",
          min: 0, max: total, splitNumber: 1,
          axisLine: { show: true, lineStyle: { width: 48, color: colorStops, shadowBlur: 18, shadowColor: "rgba(0,255,136,0.3)" } },
          pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false },
          detail: {
            formatter: "{value}",
            offsetCenter: [0, "30%"],
            fontSize: 56, fontWeight: 700, color: "#fff",
            fontFamily: SCI.fontNum,
            textShadowColor: "rgba(0,255,136,0.4)", textShadowBlur: 20
          },
          title: { offsetCenter: [0, "60%"], fontSize: 36, color: SCI.textSec },
          data: [{ value: total, name: "计划总面积（万亩）" }]
        }
      ],
      legend: {
        bottom: 4, left: "center",
        itemWidth: 20, itemHeight: 14, itemGap: 18,
        textStyle: { color: SCI.textPri, fontSize: 26, fontWeight: 500 },
        formatter: function(name) {
          var idx = crops.indexOf(name);
          if (idx < 0) return name;
          var pct = (cropValues[idx] / total * 100).toFixed(1);
          return name + "  " + cropValues[idx] + "万亩  " + pct + "%";
        }
      }
    });

    // 自定义 hover 提示（ECharts 仪表盘 pointer:false 时不触发原生 tooltip）
    var tipEl = document.getElementById("annual-plan-tooltip");
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.id = "annual-plan-tooltip";
      tipEl.style.cssText = "display:none;position:absolute;z-index:9999;padding:14px 18px;background:rgba(6,20,40,0.96);border:1px solid rgba(0,212,255,0.4);border-radius:8px;color:#e0f0ff;font-size:30px;line-height:2.2;pointer-events:none;white-space:nowrap;box-shadow:0 6px 28px rgba(0,0,0,0.55);top:50%;left:50%;transform:translate(-50%,-50%);";
      gaugeEl.style.position = "relative";
      gaugeEl.appendChild(tipEl);
    }
    var tipRows = crops.map(function(c, i) {
      return '<div><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + cropColors[i] + ';margin-right:8px;vertical-align:middle;"></span>' + c + ' ' + cropValues[i] + ' 万亩 (' + (cropValues[i] / total * 100).toFixed(1) + '%)</div>';
    }).join("");
    tipEl.innerHTML = '<div style="font-weight:700;margin-bottom:6px;color:#fff;font-size:32px;">计划总面积 ' + total + ' 万亩</div>' + tipRows;

    // 用 ECharts zrender 底层事件检测悬浮（比 DOM 事件更可靠）
    c.getZr().on('mousemove', function() { tipEl.style.display = 'block'; });
    c.getZr().on('mouseout', function() { tipEl.style.display = 'none'; });
  }

  /* 左中1：农艺配方滚动列表 */
  function renderFormulaList() {
    var el = document.getElementById("formula-table-wrap");
    if (!el || typeof FORMULA_DATA === "undefined") return;

    var cols = ["农药(种)", "肥料(种)", "助剂(种)", "适用作业", "适用作物"];
    var keys = ["pesticide", "fertilizer", "additive", "operation", "crop"];

    var ths = cols.map(function(c) { return '<th>' + c + '</th>'; }).join("");
    var rows = FORMULA_DATA.map(function(r) {
      var tds = keys.map(function(k, i) {
        var cls = "";
        if (k === "pesticide" || k === "fertilizer" || k === "additive") cls = ' class="ft-count"';
        if (k === "crop") cls = ' class="ft-crop"';
        return '<td' + cls + '>' + r[k] + '</td>';
      }).join("");
      return '<tr>' + tds + '</tr>';
    }).join("");

    el.innerHTML = '<table class="formula-table"><thead><tr>' + ths + '</tr></thead><tbody>' + rows + '</tbody></table>';

    // 自动滚动播放
    var scrollSpeed = 0.4;

    // 如果已有动画则先取消
    if (el._formulaAnimId) cancelAnimationFrame(el._formulaAnimId);

    function step() {
      if (!el._formulaPaused) {
        el.scrollTop += scrollSpeed;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
          el.scrollTop = 0;
        }
      }
      el._formulaAnimId = requestAnimationFrame(step);
    }

    el._formulaAnimId = requestAnimationFrame(step);

    if (!el._formulaHoverInited) {
      el._formulaHoverInited = true;
      el.addEventListener("mouseenter", function() { el._formulaPaused = true; });
      el.addEventListener("mouseleave", function() { el._formulaPaused = false; });
    }
  }

  /* 左中2：累计投入（统种）— 3饼图+3卡片 */
  function renderPlantInvestSummary() {
    var farmName;
    if (selectedLeftPlot) {
      farmName = selectedLeftPlot.farmName || "白城牧场";
    } else if (selectedLeftFarm) {
      var sf = SUBSIDIARIES.find(function(x) { return x.id === selectedLeftFarm; });
      farmName = sf ? sf.name : "白城牧场";
    } else {
      farmName = "白城牧场";
    }
    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    /* 获取明细数据 */
    var detailData = (typeof PLANT_INVEST_DATA !== "undefined" && PLANT_INVEST_DATA.farms)
      ? (PLANT_INVEST_DATA.farms[farmName] || null) : null;
    /* 重新计算三个大类 */
    var nongzi = { 种子: detailData ? detailData["种子"] : 286, 化肥: detailData ? detailData["化肥"] : 452, 农药: detailData ? detailData["农药"] : 138 };
    var nongji = { 柴油: detailData ? detailData["柴油"] : 95, 汽油: detailData ? detailData["汽油"] : 42, 机械作业: detailData ? detailData["机械作业"] : 185, 设备维修保养: detailData ? detailData["设备维修保养"] : 68 };
    var qita = { 人工: detailData ? detailData["人工"] : 320, 灌溉水电: detailData ? detailData["灌溉水电"] : 54, 仓储: detailData ? detailData["仓储"] : 38, 运输: detailData ? detailData["运输"] : 72, 其他杂费: detailData ? detailData["其他杂费"] : 45 };
    var sumNongzi = nongzi.种子 + nongzi.化肥 + nongzi.农药;
    var sumNongji = nongji.柴油 + nongji.汽油 + nongji.机械作业 + nongji.设备维修保养;
    var sumQita = qita.人工 + qita.灌溉水电 + qita.仓储 + qita.运输 + qita.其他杂费;

    var summary = selectedLeftPlot ? {
      农资: sumNongzi + (seed % 200) - 100,
      农机: sumNongji + (seed % 50) - 25,
      其他: sumQita + (seed % 160) - 80
    } : { 农资: sumNongzi, 农机: sumNongji, 其他: sumQita };
    var total = summary.农资 + summary.农机 + summary.其他;

    var detailSubs = {
      "农资": "种子 " + nongzi.种子 + "万<br>化肥 " + nongzi.化肥 + "万<br>农药 " + nongzi.农药 + "万",
      "农机": "柴油 " + nongji.柴油 + "万<br>汽油 " + nongji.汽油 + "万<br>机械 " + nongji.机械作业 + "万<br>维保 " + nongji.设备维修保养 + "万",
      "其他": "人工 " + qita.人工 + "万<br>水电 " + qita.灌溉水电 + "万<br>仓储 " + qita.仓储 + "万<br>运输 " + qita.运输 + "万"
    };

    var items = [
      { id: "invest-pie-1", label: "农资", val: summary.农资, sub: detailSubs["农资"], color: "#00FF88" },
      { id: "invest-pie-2", label: "农机", val: summary.农机, sub: detailSubs["农机"], color: "#FF9F1C" },
      { id: "invest-pie-3", label: "其他", val: summary.其他, sub: detailSubs["其他"], color: "#00D4FF" }
    ];

    items.forEach(function(it) {
      var el = document.getElementById(it.id);
      if (!el) return;
      disposeChart(it.id);
      var c = echarts.init(el, null, { renderer: "canvas" });
      charts[it.id] = c;
      c.setOption({
        animationDuration: 1800,
        animationEasing: "cubicOut",
        tooltip: sciTooltip(),
        graphic: [{
          type: "text", left: "center", top: "36%",
          style: { text: it.val + "万元", textAlign: "center", fill: "#fff", fontSize: 28, fontWeight: 700, fontFamily: SCI.fontNum }
        }],
        series: [{
          type: "pie", radius: ["58%", "88%"], center: ["50%", "50%"],
          roundCap: true,
          data: [
            { value: it.val, itemStyle: { color: it.color, shadowBlur: 14, shadowColor: hexToRgba(it.color, 0.45) } },
            { value: Math.max(0, total - it.val), itemStyle: { color: "rgba(0,229,255,0.08)" } }
          ],
          label: { show: false }, emphasis: { disabled: true }, silent: true
        }]
      });

      /* 卡片：隐藏 */
      var cardEl = document.getElementById(it.id.replace("pie", "card"));
      if (cardEl) { cardEl.style.display = "none"; }
    });
  }

  /* 左下：各农场投入对比 — TAB切换柱状图 */
  var INVEST_TAB_GROUPS = {
    "农资": ["种子", "化肥", "农药"],
    "农机": ["柴油", "汽油", "机械作业", "设备维修保养"],
    "其他": ["人工", "灌溉水电", "仓储", "运输", "其他杂费"]
  };

  function renderFarmInvestChart(tab) {
    currentInvestTab = tab;

    /* TAB 按钮 */
    var tabsEl = document.getElementById("invest-tabs");
    if (tabsEl) {
      var tabs = ["农资", "农机", "其他"];
      tabsEl.innerHTML = tabs.map(function(c) {
        return '<button class="yzt-invest-tab' + (c === tab ? " active" : "") + '" data-tab="' + c + '">' + c + '</button>';
      }).join("");
      tabsEl.querySelectorAll(".yzt-invest-tab").forEach(function(btn) {
        btn.addEventListener("click", function() {
          if (btn.classList.contains("active")) return;
          renderFarmInvestChart(btn.dataset.tab);
        });
      });
    }

    /* 柱状图 */
    var el = document.getElementById("farm-invest-chart");
    if (!el) return;
    disposeChart("farm-invest-chart");
    var farmData = (typeof PLANT_INVEST_DATA !== "undefined" && PLANT_INVEST_DATA.farms)
      ? PLANT_INVEST_DATA.farms
      : {};
    var farms = Object.keys(farmData);
    var groupKeys = INVEST_TAB_GROUPS[tab] || [tab];
    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    var vals = farms.map(function(f, i) {
      var total = 0;
      groupKeys.forEach(function(k) { total += farmData[f][k] || 0; });
      return selectedLeftPlot ? Math.max(0, total + (seed * (i + 1)) % 60 - 30) : total;
    });

    var c = echarts.init(el, null, { renderer: "canvas" });
    charts["farm-invest-chart"] = c;
    c.setOption({
      animationDuration: 1500,
      animationEasing: "cubicOut",
      tooltip: sciTooltip(),
      grid: { left: 48, right: 20, top: 16, bottom: 56, containLabel: true },
      xAxis: { type: "category", data: farms, axisLabel: { color: SCI.textPri, fontSize: 28, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
      yAxis: { type: "value", name: "万元", nameTextStyle: { color: SCI.textSec, fontSize: 24 }, axisLabel: { color: SCI.textSec, fontSize: 26 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: [{
        type: "bar", data: vals, barWidth: "36%",
        itemStyle: sciBarStyle(SCI.primary),
        emphasis: sciEmphasis(SCI.primary),
        label: { show: true, position: "top", fontSize: 26, color: SCI.textPri, fontWeight: 600 }
      }]
    });
  }

  function renderPlantPanel() {
    const plots = currentPlots;
    const totalArea = sumPlotArea(plots);
    const kpiEl = document.getElementById("right-kpi-row");
    const detailEl = document.getElementById("right-detail-list");
    const detailLabel = document.getElementById("right-detail-label");
    if (!kpiEl || !detailEl) return;

    const cropG = groupPlotsBy(plots, "crop");
    const sowPct = YZT_PROGRESS.sowDone.reduce((a, b) => a + b, 0) / YZT_PROGRESS.sowPlan.reduce((a, b) => a + b, 0) * 100;
    const harPct = YZT_PROGRESS.harvestDone.reduce((a, b) => a + b, 0) / YZT_PROGRESS.harvestPlan.reduce((a, b) => a + b, 0) * 100;
    kpiEl.innerHTML = `
      <div class="yzt-kpi-card"><div class="k-label">作物种类</div><div class="k-val green">${Object.keys(cropG).length}</div></div>
      <div class="yzt-kpi-card"><div class="k-label">播种进度</div><div class="k-val">${Math.round(sowPct)}%</div></div>
      <div class="yzt-kpi-card"><div class="k-label">秋收进度</div><div class="k-val">${Math.round(harPct)}%</div></div>
      <div class="yzt-kpi-card"><div class="k-label">种植面积</div><div class="k-val green">${totalArea.toFixed(1)}万</div></div>`;
    detailLabel.textContent = "作物明细";
    detailEl.innerHTML = Object.entries(cropG).length ? Object.entries(cropG).map(([name, v]) =>
      `<div class="yzt-detail-row">
        <span class="dr-main">${name}</span>
        <span class="dr-sub">${v.area.toFixed(1)}万 · ${v.count}宗</span>
      </div>`
    ).join("") : `<div class="yzt-empty-hint">暂无数据</div>`;
    updateRightChartsPlant(plots);
    resizeSideCharts();
  }

  function renderPanelsByTab() {
    applySidebarLayout(currentBottomTab);
    if (currentBottomTab === "plant") {
      renderLeftSidebar();
      renderRightScenePanel();
    } else if (currentBottomTab === "land") {
      renderLandAnalysis();
    } else if (currentBottomTab === "iot") {
      renderIotAnalysis();
    }
  }

  function switchBottomTab(tab) {
    closeParcelDetailModal();
    closeFarmPointPopup();
    /* 切换标签时清除所有选中状态 */
    selectedLeftFarm = null;
    selectedLeftPlot = null;
    globalFilter.farm = "";
    activePlotId = null;
    document.querySelectorAll(".yzt-farm-pick").forEach(function(btn) { btn.classList.remove("active"); });
    document.getElementById("plot-info-card")?.classList.add("yzt-hidden");
    hideMapBanner();
    if (tab !== "land" && landDrillFarmId) exitLandDrill();
    if (tab !== "iot") {
      selectedIotDevice = null;
      var leftKpi = document.getElementById("left-kpi-row");
      if (leftKpi) { leftKpi.innerHTML = ""; leftKpi.classList.add("yzt-hidden"); }
    }
    if (tab !== "plant") {
      hideRemoteSubs();
      document.getElementById("plot-info-card")?.classList.add("yzt-hidden");
      document.getElementById("temp-scale-bar")?.classList.add("yzt-hidden");
      document.getElementById("weather-data-panel")?.classList.add("yzt-hidden");
      document.getElementById("soil-level-card")?.classList.add("yzt-hidden");
      document.getElementById("soil-plot-card")?.classList.add("yzt-hidden");
      document.getElementById("map-weather-float")?.classList.add("hidden");
    }
    currentBottomTab = tab;
    mapFarmFocusActive = false;
    document.querySelectorAll(".yzt-bottom-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    applySidebarLayout(tab);
    if (tab === "land" || tab === "iot") {
      mapFilterMode = "land";
    } else if (tab === "plant") {
      mapFilterMode = "crop";
      document.querySelectorAll("#map-mode-plant .yzt-mode-tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.mode === "crop");
      });
    }
    if (tab === "plant") {
      selectedLeftFarm = null;
      document.querySelectorAll(".yzt-farm-pick").forEach(function(btn) {
        btn.classList.toggle("active", !btn.dataset.farm);
      });
      document.getElementById("disaster-ticker")?.classList.remove("yzt-hidden");
      document.getElementById("iot-ticker")?.classList.add("yzt-hidden");
      renderDisasterTicker();
      clearBaseFillFilters();
      globalFilter.useType = "";
    } else if (tab === "iot") {
      document.getElementById("disaster-ticker")?.classList.add("yzt-hidden");
      document.getElementById("iot-ticker")?.classList.add("yzt-hidden");
      clearPlantFillFilters();
    document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
      document.getElementById("disaster-ticker")?.classList.add("yzt-hidden");
      document.getElementById("iot-ticker")?.classList.add("yzt-hidden");
      clearPlantFillFilters();
    }
    applyFilter();
    setTimeout(function() { applyLandMapView(true); }, 200);
    resizeSideCharts();
  }

  function initBottomTabs() {
    document.querySelectorAll(".yzt-bottom-tab").forEach((btn) => {
      btn.addEventListener("click", () => switchBottomTab(btn.dataset.tab));
    });
  }

  function renderIotPanel() {
    if (currentBottomTab === "iot") renderIotAnalysis();
  }

  function renderLegend() {
    const sections = [
      { title: "本底 · 权籍类型", key: "land" },
      { title: "本底 · 确权状态", key: "cert" },
      { title: "本底 · 租用类型", key: "rent" },
      { title: "本底 · 用地类型（边界）", key: "useBorder" },
      { title: "种植 · 作物分布", key: "crop" },
      { title: "种植 · 遥感监测", key: "remote" },
      { title: "物联网", key: "iot" }
    ];
    document.getElementById("legend-content").innerHTML = sections.map((sec) => {
      const items = YZT_LAYER_LEGEND[sec.key] || [];
      return `<div class="yzt-legend-section"><h4>${sec.title}</h4><div class="yzt-legend-items">${items.map((it) =>
        `<div class="yzt-legend-item"><span class="swatch" style="background:${it.color}"></span>${it.label}</div>`
      ).join("")}</div></div>`;
    }).join("");
  }

  /* ---- ECharts ---- */
  function initChart(id, option) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (charts[id]) {
      charts[id].dispose();
      delete charts[id];
    }
    const c = echarts.init(el, null, { renderer: "canvas" });
    c.setOption(option);
    charts[id] = c;
    bindChartResize(id);
    return c;
  }

  function initCharts() {
    const pieOpt = {
      color: chartColors,
      tooltip: { trigger: "item", textStyle: { fontSize: LAND_FS.tip } },
      series: [{ type: "pie", radius: ["38%", "62%"], center: ["50%", "55%"], label: { show: false }, data: [] }]
    };
    const barOpt = {
      grid: { left: 48, right: 12, top: 36, bottom: 28, containLabel: true },
      tooltip: { trigger: "axis", textStyle: { fontSize: LAND_FS.tip } },
      xAxis: { type: "category", data: [], axisLabel: { color: chartText, fontSize: 30 } },
      yAxis: { type: "value", axisLabel: { color: chartText, fontSize: 30 }, splitLine: { lineStyle: { color: "rgba(0,255,160,0.08)" } } },
      series: [{ type: "bar", data: [], itemStyle: { color: "#00FF88", borderRadius: [3, 3, 0, 0] } }]
    };
  }

  function renderAllPanels() {
    renderPanelsByTab();
  }

  /* ---- 事件绑定 ---- */
  let leftSearchTimer;
  document.getElementById("left-search")?.addEventListener("input", () => {
    clearTimeout(leftSearchTimer);
    leftSearchTimer = setTimeout(renderLeftSidebar, 200);
  });
  document.getElementById("left-search-btn")?.addEventListener("click", renderLeftSidebar);
  document.getElementById("left-search")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") renderLeftSidebar();
  });

  document.querySelectorAll(".yzt-farm-pick").forEach((btn) => {
    btn.addEventListener("click", () => selectLeftFarm(btn.dataset.farm));
  });

  document.getElementById("legend-toggle").addEventListener("click", () => {
    document.getElementById("legend-overlay").classList.remove("hidden");
  });
  document.getElementById("legend-close").addEventListener("click", () => {
    document.getElementById("legend-overlay").classList.add("hidden");
  });
  document.getElementById("legend-overlay").addEventListener("click", (e) => {
    if (e.target.id === "legend-overlay") e.target.classList.add("hidden");
  });

  (function initFarmPointPopupUi() {
    document.getElementById("farm-popup-close")?.addEventListener("click", closeFarmPointPopup);
    var popup = document.getElementById("farm-point-popup");
    if (popup) {
      popup.addEventListener("click", function(e) { e.stopPropagation(); });
    }
  })();

  document.getElementById("farm-drill-banner-close")?.addEventListener("click", function () {
    hideMapBanner();
    selectedLeftFarm = null;
    selectedLeftPlot = null;
    document.querySelectorAll(".yzt-farm-pick").forEach(function(btn) { btn.classList.remove("active"); });
    document.getElementById("plot-info-card")?.classList.add("yzt-hidden");
  });

  (function initParcelDetailModalUi() {
    const ov = document.getElementById("yzt-parcel-detail-overlay");
    const dlg = ov?.querySelector(".yzt-parcel-detail-dialog");
    dlg?.addEventListener("click", (e) => e.stopPropagation());
    ov?.addEventListener("click", (e) => {
      if (e.target === ov) closeParcelDetailModal();
    });
    document.getElementById("yzt-parcel-detail-close")?.addEventListener("click", closeParcelDetailModal);
    document.getElementById("yzt-parcel-detail-btn-close")?.addEventListener("click", closeParcelDetailModal);
    ov?.querySelector(".yzt-parcel-detail-tabs")?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-pd-tab]");
      if (!btn || !ov) return;
      const k = btn.dataset.pdTab;
      ov.querySelectorAll(".yzt-parcel-detail-tab").forEach((b) => {
        const on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      ov.querySelectorAll(".yzt-parcel-detail-panel").forEach((p) => {
        p.classList.toggle("active", p.dataset.pdPanel === k);
      });
    });
  })();

  /* 返回按钮：集团模式跳转汇总导览，下钻模式退出下钻 */
  document.getElementById("yzt-back-btn")?.addEventListener("click", (e) => {
    if (isLandFarmDrill() || landDrillFarmId) {
      e.preventDefault();
      exitLandDrill();
      /* 退出下钻后返回首页 */
      setTimeout(function() { window.location.href = "index.html"; }, 300);
    }
  });

  document.getElementById("weather-float-close").addEventListener("click", () => {
    renderMapWeatherFloat();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#device-context")) hideContextMenu();
  });

  /* 设备详情弹窗 UI */
  (function initDeviceDetailModalUi() {
    var ov = document.getElementById("yzt-device-detail-overlay");
    if (!ov) return;
    var dlg = ov.querySelector(".yzt-parcel-detail-dialog");
    if (dlg) dlg.addEventListener("click", function(e) { e.stopPropagation(); });
    ov.addEventListener("click", function(e) {
      if (e.target === ov) { ov.classList.add("hidden"); ov.setAttribute("aria-hidden", "true"); }
    });
    document.getElementById("yzt-device-detail-close")?.addEventListener("click", function() {
      ov.classList.add("hidden"); ov.setAttribute("aria-hidden", "true");
    });
    document.getElementById("yzt-device-detail-btn-close")?.addEventListener("click", function() {
      ov.classList.add("hidden"); ov.setAttribute("aria-hidden", "true");
    });
    ov.querySelector("#yzt-device-detail-tabs")?.addEventListener("click", function(e) {
      var btn = e.target.closest("[data-dd-tab]");
      if (!btn) return;
      var k = btn.dataset.ddTab;
      ov.querySelectorAll(".yzt-parcel-detail-tab").forEach(function(b) {
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      ov.querySelectorAll(".yzt-parcel-detail-panel").forEach(function(p) {
        p.classList.toggle("active", p.dataset.ddPanel === k);
      });
    });
  })();

  /* 一键筛选异常设备按钮 */
  (function initIotAbnormalBtn() {
    var btn = document.getElementById("iot-abnormal-filter-btn");
    if (btn) {
      btn.addEventListener("click", function() {
        iotFilter.type = null;
        iotFilter.status = "fault";
        iotFilter.farm = null;
        applyFilter();
      });
    }
  })();

  /* ---- 5场景切换（种植经营专用） ---- */
  function switchScene(scene) {
    sceneMode = scene;
    sceneSub = null;
    /* 土壤默认选中第一个二级 */
    if (scene === "soil") sceneSub = "n";
    document.getElementById("plot-info-card")?.classList.add("yzt-hidden");
    var pdPanel = document.getElementById("scene-panel-plot-detail");
    var planting = document.getElementById("scene-panel-planting");
    if (pdPanel) pdPanel.classList.add("yzt-hidden");
    if (planting) planting.classList.remove("yzt-hidden");
    var weatherPlot = document.getElementById("scene-panel-weather-plot");
    var weatherMain = document.getElementById("scene-panel-weather");
    if (weatherPlot) weatherPlot.classList.add("yzt-hidden");
    if (weatherMain) weatherMain.classList.remove("yzt-hidden");
    var soilPlot = document.getElementById("scene-panel-soil-plot");
    var soilMain = document.getElementById("scene-panel-soil");
    var soilPlotCard = document.getElementById("soil-plot-card");
    if (soilPlot) soilPlot.classList.add("yzt-hidden");
    if (soilMain) soilMain.classList.remove("yzt-hidden");
    if (soilPlotCard) soilPlotCard.classList.add("yzt-hidden");
    /* 气象场景专属 UI */
    var isWeather = scene === "weather";
    var isSoil = scene === "soil";
    document.getElementById("temp-scale-bar")?.classList.toggle("yzt-hidden", !isWeather);
    document.getElementById("weather-data-panel")?.classList.toggle("yzt-hidden", !isWeather);
    document.getElementById("soil-level-card")?.classList.toggle("yzt-hidden", !isSoil);
    /* 统种地/承租地图例：气象场景隐藏 */
    document.getElementById("plot-type-legend")?.classList.toggle("yzt-hidden", isWeather);
    document.querySelector(".yzt-map-wrap")?.classList.toggle("yzt-weather-scene", isWeather);
    if (isSoil) renderSoilLevelCard();
    renderRightScenePanel();
    refreshMap();
  }

  function switchSceneSub(sub) {
    sceneSub = sceneSub === sub ? null : sub;

    /* 隐藏所有光谱组件 */
    document.getElementById("spectral-bar")?.classList.add("yzt-hidden");
    document.getElementById("soil-level-card")?.classList.add("yzt-hidden");
    document.getElementById("temp-scale-bar")?.classList.add("yzt-hidden");

    if (sceneSub) {
      if (sceneMode === "soil") {
        renderSoilLevelCard();
      }
      if (sceneMode === "weather") {
        if (sceneSub === "temp") {
          document.getElementById("temp-scale-bar")?.classList.remove("yzt-hidden");
        }
      }
      /* 更新通用光谱色标栏 */
      updateSpectralBar(sceneSub);

      if (activePlotId) {
        var p = currentPlots.find(function(x) { return x.id === activePlotId; });
        if (p && sceneMode === "soil") renderSoilPlotDetail(p);
      }
    }
    refreshMap();
  }

  /* ---- 通用垂直光谱色标栏 ---- */
  function updateSpectralBar(sub) {
    var bar = document.getElementById("spectral-bar");
    if (!bar) return;

    var configs = {
      /* 气象 */
      rain:  { title: "降水 mm", gradient: "linear-gradient(to bottom, #1a0066, #1E3A8A, #0ea5e9, #22d3ee, #4ade80, #a3e635, #facc15, #f97316, #ef4444)", labels: ["100+","50","25","10","5","1","0"] },
      wind:  { title: "风速 m/s", gradient: "linear-gradient(to bottom, #7c3aed, #3b82f6, #06b6d4, #22c55e, #eab308, #f97316, #ef4444)", labels: ["15+","12","9","6","3","1","0"] },
      light: { title: "光照 lux", gradient: "linear-gradient(to bottom, #fbbf24, #f59e0b, #fb923c, #f97316, #ef4444, #dc2626, #7f1d1d)", labels: ["100k","80k","60k","40k","20k","10k","0"] },
      humid: { title: "湿度 %", gradient: "linear-gradient(to bottom, #0ea5e9, #38bdf8, #7dd3fc, #bae6fd, #e0f2fe, #f0f9ff, #fff)", labels: ["100","85","70","55","40","25","10"] },
      /* 土壤 */
      n:  { title: "氮 mg/kg", gradient: "linear-gradient(to bottom, #006837, #31A354, #78C679, #C2E699, #FDB863, #E34A33)", labels: ["200","180","150","120","90","60"] },
      p:  { title: "磷 mg/kg", gradient: "linear-gradient(to bottom, #006837, #31A354, #78C679, #C2E699, #FDB863, #E34A33)", labels: ["50","40","30","20","10","5"] },
      k:  { title: "钾 mg/kg", gradient: "linear-gradient(to bottom, #006837, #31A354, #78C679, #C2E699, #FDB863, #E34A33)", labels: ["250","200","150","100","50","30"] },
      organic: { title: "有机质 g/kg", gradient: "linear-gradient(to bottom, #006837, #31A354, #78C679, #C2E699, #FDB863, #E34A33)", labels: ["50","40","30","20","10","5"] },
      /* 墒情 / 土壤温度 */
      moist:  { title: "墒情 %", gradient: "linear-gradient(to bottom, #1a0066, #1E3A8A, #0ea5e9, #22d3ee, #4ade80, #a3e635, #facc15, #f97316, #ef4444)", labels: ["50+","45","35","25","15","10","5","2","0"] },
      soilT:  { title: "土壤温度 ℃", gradient: "linear-gradient(to bottom, #8B0000, #E85000, #FFB800, #87CEEB, #1E3A8A, #1a0066)", labels: ["35+","30","25","20","15","10"] },
      /* 遥感：作物长势 / 作物估值 */
      growth: { title: "作物长势", gradient: "linear-gradient(to bottom, #006837, #31A354, #78C679, #C2E699, #FDB863, #E34A33, #7f1d1d)", labels: ["很好","好","较好","持平","较差","差","很差"] },
      value:  { title: "作物估值", gradient: "linear-gradient(to bottom, #006837, #31A354, #78C679, #C2E699, #FDB863, #E34A33, #7f1d1d)", labels: ["很好","好","较好","持平","较差","差","很差"] }
    };

    var cfg = configs[sub];
    if (!cfg) return;
    document.getElementById("sb-title").textContent = cfg.title;
    document.getElementById("sb-gradient").style.background = cfg.gradient;
    document.getElementById("sb-labels").innerHTML = cfg.labels.map(function(l) { return "<span>" + l + "</span>"; }).join("");
    bar.classList.remove("yzt-hidden");
  }

  function renderRightScenePanel() {
    if (!isPlantingDataTab()) return;
    requestAnimationFrame(function() {
      renderFarmRentRatio();
      renderSeasonProgress();
      renderFarmInvest();
      resizeSideCharts();
    });
  }

  function renderFarmRentRatio() {
    var el = document.getElementById("farm-rent-ratio-list");
    if (!el) return;

    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    var farms = [
      { name: "白城牧场", rent: 42 + (seed % 12) - 5, self: 38 + (seed % 10) - 4 },
      { name: "镇南种羊场", rent: 33 + (seed % 8) - 3, self: 35 + (seed % 9) - 3 },
      { name: "长岭种马场", rent: 25 + (seed % 6) - 2, self: 27 + (seed % 7) - 2 }
    ];

    var rows = farms.map(function(f) {
      var total = f.rent + f.self;
      var rentPct = (f.rent / total * 100).toFixed(1);
      var selfPct = (100 - parseFloat(rentPct)).toFixed(1);
      var amount = (f.rent * 0.052).toFixed(1);
      return '<div class="frr-row">' +
        '<div class="frr-row-name">' + f.name + '</div>' +
        '<div class="frr-row-bar-wrap">' +
          '<div class="frr-row-bar-rent" style="width:' + rentPct + '%">' +
            '<span class="frr-row-bar-label">承租 ' + amount + '亿 ' + rentPct + '%</span>' +
          '</div>' +
          '<div class="frr-row-bar-self" style="width:' + selfPct + '%">' +
            '<span class="frr-row-bar-label">统种 ' + selfPct + '%</span>' +
          '</div>' +
        '</div>' +
        '</div>';
    }).join("");

    el.innerHTML = '<div class="frr-grid">' + rows + '</div>';
  }


  function _buildProgressHtml(farms, crops, cropColors, seed, isHarvest) {
    var rows = farms.map(function(f, fi) {
      var cropData = crops.map(function(c, ci) {
        var plan = isHarvest ? (30 + ci * 10 + fi * 6 + (seed * (fi + ci + 2)) % 30) : (35 + ci * 12 + fi * 8 + (seed * (fi + ci + 1)) % 35);
        var donePct = isHarvest ? (0.35 + (seed * (ci + 2)) % 45 / 100) : (0.55 + (seed * (ci + 1)) % 40 / 100);
        var done = Math.round(plan * donePct);
        return { plan: plan, done: done, color: cropColors[ci], name: c };
      });
      var totalPlan = cropData.reduce(function(s, d) { return s + d.plan; }, 0);
      var totalDone = cropData.reduce(function(s, d) { return s + d.done; }, 0);
      var pct = Math.round(totalDone / totalPlan * 100);

      // 只显示已完成部分，按作物分段
      var segs = cropData.filter(function(d) { return d.done > 0; }).map(function(d) {
        var w = (d.done / totalPlan * 100).toFixed(1);
        return '<div class="yzt-progress-seg" style="width:' + w + '%; background:' + d.color +
          ';" title="' + d.name + ' ' + d.done + '万亩"></div>';
      }).join("");

      return '<div class="yzt-progress-row">' +
        '<span class="yzt-progress-name">' + f + '</span>' +
        '<div class="yzt-progress-bar-wrap">' + segs + '</div>' +
        '<span class="yzt-progress-pct">' + pct + '%</span>' +
        '</div>';
    }).join("");

    var legend = crops.map(function(c, ci) {
      return '<span class="yzt-progress-legend-item"><span class="yzt-progress-legend-dot" style="background:' + cropColors[ci] + '"></span>' + c + '</span>';
    }).join("");

    return '<div class="yzt-progress-legend">' + legend + '</div><div class="yzt-progress-list">' + rows + '</div>';
  }

  var seasonTab = "sowing";

  function renderSeasonProgress() {
    var el = document.getElementById("season-progress-body");
    if (!el) return;
    el.innerHTML = "";
    var farms = ["白城牧场", "镇南种羊场", "长岭种马场"];
    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);

    // 计算三农场汇总的整体进度
    var totalPlan = 0, totalDone = 0;
    var items = [], colors = [];

    if (seasonTab === "summer") {
      items = ["施肥", "打药"];
      colors = ["#00FF88", "#FF6B6B"];
    } else {
      var isHarvest = seasonTab === "harvest";
      items = ["粮食", "油料", "经济", "牧草", "杂粮及其他"];
      colors = ["#00FF88", "#00D4FF", "#FFB800", "#B388FF", "#FF6B6B"];
    }

    items.forEach(function(_, i) {
      farms.forEach(function(_, fi) {
        var plan;
        if (seasonTab === "summer") {
          plan = 28 + fi * 5 + i * 8 + (seed * (fi + i + 3)) % 22;
        } else {
          var isHarvest = seasonTab === "harvest";
          plan = isHarvest ? (30 + i * 10 + fi * 6 + (seed * (fi + i + 2)) % 30) : (35 + i * 12 + fi * 8 + (seed * (fi + i + 1)) % 35);
        }
        var donePct;
        if (seasonTab === "summer") {
          donePct = 0.4 + (seed * (i + 2)) % 35 / 100;
        } else {
          var isHv = seasonTab === "harvest";
          donePct = isHv ? (0.35 + (seed * (i + 2)) % 45 / 100) : (0.55 + (seed * (i + 1)) % 40 / 100);
        }
        totalPlan += plan;
        totalDone += Math.round(plan * donePct);
      });
    });
    // 整体进度条（春播/秋收才有，夏管不显示）
    if (seasonTab !== "summer") {
      var overallPct = totalPlan > 0 ? Math.round(totalDone / totalPlan * 100) : 0;
      var progressBar = document.createElement("div");
      progressBar.className = "sp-overall-bar";
      progressBar.innerHTML = '<span class="sp-overall-label">整体进度</span>' +
        '<div class="sp-bar-track"><div class="sp-bar-fill" style="width:' + overallPct + '%"></div></div>' +
        '<span class="sp-overall-pct">' + overallPct + '%</span>';
      el.appendChild(progressBar);
    }

    // 柱状图
    var chartWrap = document.createElement("div");
    chartWrap.style.flex = "1";
    chartWrap.style.minHeight = "0";
    el.appendChild(chartWrap);

    if (seasonTab === "summer") {
      var actSeries = items.map(function(a, ai) {
        var data = farms.map(function(_, fi) {
          var plan = 28 + fi * 5 + ai * 8 + (seed * (fi + ai + 3)) % 22;
          return Math.round(plan * (0.4 + (seed * (ai + 2)) % 35 / 100) * 10000);
        });
        return { name: a, type: "bar", data: data, itemStyle: sciBarStyle(colors[ai]), barWidth: "30%", barGap: "15%", emphasis: sciEmphasis(colors[ai]) };
      });
      _initOrUpdateChartEl("season-progress-chart", chartWrap, {
        animationDuration: 1400,
        animationEasing: "cubicOut",
        tooltip: sciTooltip(),
        legend: { data: items, bottom: 0, textStyle: { color: SCI.textPri, fontSize: 26 }, itemWidth: 16, itemHeight: 12, itemGap: 20 },
        grid: { left: 12, right: 36, top: 12, bottom: 40, containLabel: true },
        xAxis: { type: "category", data: farms, axisLabel: { color: SCI.textPri, fontSize: 26, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", name: "亩", nameTextStyle: { color: SCI.textSec, fontSize: 24 }, axisLabel: { color: SCI.textSec, fontSize: 22, formatter: function(v) { return (v / 10000).toFixed(1) + "万"; } }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: actSeries
      });
    } else {
      var cropSeries = items.map(function(c, ci) {
        var data = farms.map(function(_, fi) {
          var isHarvest = seasonTab === "harvest";
          var plan = isHarvest ? (30 + ci * 10 + fi * 6 + (seed * (fi + ci + 2)) % 30) : (35 + ci * 12 + fi * 8 + (seed * (fi + ci + 1)) % 35);
          var donePct = isHarvest ? (0.35 + (seed * (ci + 2)) % 45 / 100) : (0.55 + (seed * (ci + 1)) % 40 / 100);
          return Math.round(plan * donePct);
        });
        return { name: c, type: "bar", data: data, itemStyle: sciBarStyle(colors[ci]), barWidth: "14%", barGap: "0%", emphasis: sciEmphasis(colors[ci]) };
      });
      _initOrUpdateChartEl("season-progress-chart", chartWrap, {
        animationDuration: 1400,
        animationEasing: "cubicOut",
        tooltip: sciTooltip(),
        legend: { data: items, bottom: 0, textStyle: { color: SCI.textPri, fontSize: 26 }, itemWidth: 16, itemHeight: 12, itemGap: 16 },
        grid: { left: 12, right: 36, top: 12, bottom: 40, containLabel: true },
        xAxis: { type: "category", data: farms, axisLabel: { color: SCI.textPri, fontSize: 26, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", name: "万亩", nameTextStyle: { color: SCI.textSec, fontSize: 24 }, axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: cropSeries
      });
    }
  }

  function _initOrUpdateChartEl(id, el, option) {
    el.innerHTML = "";
    disposeChart(id);
    var c = echarts.init(el, null, { renderer: "canvas" });
    c.setOption(option);
    charts[id] = c;
  }

  function _initOrUpdateChart(id, el, option) {
    el.innerHTML = "";
    var container = document.createElement("div");
    container.style.width = "100%";
    container.style.height = "100%";
    el.appendChild(container);
    disposeChart(id);
    var c = echarts.init(container, null, { renderer: "canvas" });
    c.setOption(option);
    charts[id] = c;
  }

  // keep old renderPlantSowingBar for backward compatibility
  function renderPlantSowingBar() { renderSeasonProgress(); }

  function renderPlantSowingChart() {
    var el = document.getElementById("plant-sowing-bar-chart");
    if (!el) return;

    var plots;
    if (selectedLeftPlot) {
      var seed = _plotSeed(selectedLeftPlot.id);
      var pn = formatPlotLabel(selectedLeftPlot);
      var stEl = document.getElementById("sowing-chart-title");
      if (stEl) stEl.textContent = "春播进度 · " + pn;
      plots = [];
      var baseNames = ["东1号地","东2号地","南1号地","南2号地","西1号地","北1号地","北2号地","中1号地","中2号地","西2号地"];
      for (var i = 0; i < 10; i++) {
        var plan = 2000 + (seed * (i + 3)) % 10000;
        var sown = Math.round(plan * (0.3 + (seed * (i + 5)) % 70 / 100));
        plots.push({ name: pn + "-" + baseNames[i], plan: plan, sown: sown });
      }
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
      document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
    } else if (selectedLeftFarm) {
      var sf = SUBSIDIARIES.find(function(x) { return x.id === selectedLeftFarm; });
      var farmName = sf ? sf.name : "白城牧场";
      var stEl2 = document.getElementById("sowing-chart-title");
      if (stEl2) stEl2.textContent = "春播进度 · " + farmName;
      if (selectedLeftFarm === "baicheng") {
        plots = [
          { name: "BC-东1号地", plan: 12500, sown: 10800 },
          { name: "BC-东2号地", plan: 10200, sown: 8500 },
          { name: "BC-南1号地", plan: 8800, sown: 7200 },
          { name: "BC-南2号地", plan: 7500, sown: 6300 },
          { name: "BC-西1号地", plan: 6200, sown: 5800 },
          { name: "BC-北1号地", plan: 5500, sown: 5500 },
          { name: "BC-北2号地", plan: 4800, sown: 3900 },
          { name: "BC-中1号地", plan: 4000, sown: 3200 },
          { name: "BC-中2号地", plan: 3500, sown: 2800 },
          { name: "BC-西2号地", plan: 2800, sown: 1600 }
        ];
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      } else {
        plots = [
        { name: "ZN-东1号地", plan: 9500, sown: 7800 },
        { name: "ZN-东2号地", plan: 8200, sown: 6500 },
        { name: "ZN-南1号地", plan: 7000, sown: 5200 },
        { name: "ZN-南2号地", plan: 6500, sown: 4800 },
        { name: "ZN-西1号地", plan: 5800, sown: 5000 },
        { name: "ZN-西2号地", plan: 5000, sown: 3500 },
        { name: "ZN-北1号地", plan: 4200, sown: 3800 },
        { name: "ZN-中1号地", plan: 3800, sown: 2800 },
        { name: "ZN-中2号地", plan: 3000, sown: 1500 },
        { name: "ZN-东3号地", plan: 2500, sown: 0 }
      ];
      document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
      document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
      }
    } else {
      /* 未选农场：合并两农场全部地块 */
      var stEl3 = document.getElementById("sowing-chart-title");
      if (stEl3) stEl3.textContent = "春播进度 · 集团全部";
      var bcPlots = [
        { name: "BC-东1号地", plan: 12500, sown: 10800 },
        { name: "BC-东2号地", plan: 10200, sown: 8500 },
        { name: "BC-南1号地", plan: 8800, sown: 7200 },
        { name: "BC-南2号地", plan: 7500, sown: 6300 },
        { name: "BC-西1号地", plan: 6200, sown: 5800 },
        { name: "BC-北1号地", plan: 5500, sown: 5500 },
        { name: "BC-北2号地", plan: 4800, sown: 3900 },
        { name: "BC-中1号地", plan: 4000, sown: 3200 },
        { name: "BC-中2号地", plan: 3500, sown: 2800 },
        { name: "BC-西2号地", plan: 2800, sown: 1600 }
      ];
      var znPlots = [
        { name: "ZN-东1号地", plan: 9500, sown: 7800 },
        { name: "ZN-东2号地", plan: 8200, sown: 6500 },
        { name: "ZN-南1号地", plan: 7000, sown: 5200 },
        { name: "ZN-南2号地", plan: 6500, sown: 4800 },
        { name: "ZN-西1号地", plan: 5800, sown: 5000 },
        { name: "ZN-西2号地", plan: 5000, sown: 3500 },
        { name: "ZN-北1号地", plan: 4200, sown: 3800 },
        { name: "ZN-中1号地", plan: 3800, sown: 2800 },
        { name: "ZN-中2号地", plan: 3000, sown: 1500 },
        { name: "ZN-东3号地", plan: 2500, sown: 0 }
      ];
      plots = [].concat(
        bcPlots.map(function(p) { p.name = "【白城】" + p.name; return p; }),
        znPlots.map(function(p) { p.name = "【镇南】" + p.name; return p; })
      );
    }

    var names = plots.map(function(p) { return p.name; });
    var sownData = plots.map(function(p) { return +(p.sown / 10000).toFixed(2); });
    var remainData = plots.map(function(p) { return +((p.plan - p.sown) / 10000).toFixed(2); });

    if (!charts["plant-sowing-bar-chart"]) {
      initChart("plant-sowing-bar-chart", {
        animationDuration: 1600,
        animationEasing: "cubicOut",
        grid: { left: 24, right: 200, top: 40, bottom: 12, containLabel: true },
        legend: { data: ["已播", "计划待播"], textStyle: { color: SCI.textPri, fontSize: 28 }, top: 0, itemWidth: 20, itemHeight: 14, itemGap: 24 },
        tooltip: {
          trigger: "axis", axisPointer: { type: "shadow" }, textStyle: { fontSize: 26 },
          formatter: function(ps) { var i = ps[0].dataIndex; var p = plots[i]; var pct = (p.sown / p.plan * 100).toFixed(1); return p.name + "<br/>已播亩数: " + p.sown.toLocaleString() + " 亩<br/>计划播亩数: " + p.plan.toLocaleString() + " 亩<br/>播种进度: " + pct + "%"; }
        },
        xAxis: { type: "value", name: "万亩", nameTextStyle: { color: SCI.textSec, fontSize: 26 }, axisLabel: { color: SCI.textSec, fontSize: 24 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        yAxis: { type: "category", data: names, axisLabel: { color: SCI.textPri, fontSize: 26, fontWeight: 500 }, axisLine: { show: false }, axisTick: { show: false }, inverse: true },
        series: [
          { name: "已播", type: "bar", stack: "total", data: sownData, barWidth: 18, itemStyle: { color: SCI.primary, shadowBlur: 8, shadowColor: hexToRgba(SCI.primary, 0.35) },
            label: { show: true, position: "inside", fontSize: 22, fontWeight: 700, color: "#042818", formatter: function(p) { var i = p.dataIndex; return plots[i].sown.toLocaleString() + "亩"; } }
          },
          { name: "计划待播", type: "bar", stack: "total", data: remainData, barWidth: 18, itemStyle: { color: "rgba(0,212,255,0.3)", borderColor: "rgba(0,212,255,0.55)", borderWidth: 1, borderRadius: [0, 8, 8, 0] },
            label: { show: true, position: "right", fontSize: 22, fontWeight: 700, color: "#FFB800", formatter: function(p) { var i = p.dataIndex; var d = plots[i]; var pct = (d.sown / d.plan * 100).toFixed(1); return d.plan.toLocaleString() + "亩 " + pct + "%"; } }
          }
        ]
      });
    }
    if (charts["plant-sowing-bar-chart"]) {
      charts["plant-sowing-bar-chart"].setOption({
        yAxis: { data: names },
        series: [{ data: sownData }, { data: remainData }]
      }, false);
    }
  }

  /* 左下角：春播进度按作物类型统计 */
  function renderPlantSowingCropChart() {
    var el = document.getElementById("plant-sowing-left-chart");
    if (!el) return;
    var cats = YZT_PROGRESS.categories;
    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    var farmData = selectedLeftFarm ? YZT_FARM_SOWING[selectedLeftFarm] : null;
    var planData = farmData ? farmData.sowPlan : YZT_PROGRESS.sowPlan;
    var doneData = farmData ? farmData.sowDone : YZT_PROGRESS.sowDone;
    if (selectedLeftPlot) {
      planData = YZT_PROGRESS.sowPlan.map(function(v, i) { return Math.max(20, v + (seed * (i + 1)) % 40 - 18); });
      doneData = planData.map(function(v) { return Math.round(v * (0.6 + (seed % 30) / 100)); });
    }

    if (!charts["plant-sowing-left-chart"]) {
      initChart("plant-sowing-left-chart", {
        animationDuration: 1600,
        animationEasing: "cubicOut",
        grid: { left: 20, right: 20, top: 44, bottom: 14, containLabel: true },
        tooltip: sciTooltip(),
        legend: {
          data: ["计划面积", "已播面积"], selectedMode: true,
          textStyle: { color: SCI.textPri, fontSize: 30 },
          top: 0, itemWidth: 22, itemHeight: 16, itemGap: 28
        },
        xAxis: { type: "category", data: cats, axisLabel: { color: SCI.textPri, fontSize: 28, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", name: "万亩", nameTextStyle: { color: SCI.textSec, fontSize: 26 }, axisLabel: { color: SCI.textSec, fontSize: 26 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: [
          { name: "计划面积", type: "bar", data: planData, itemStyle: { color: hexToRgba(SCI.cyan, 0.45), borderColor: SCI.cyan, borderWidth: 1, borderRadius: [8, 8, 0, 0], shadowBlur: 6, shadowColor: "rgba(0,212,255,0.3)" }, barWidth: 22, barGap: "30%", emphasis: sciEmphasis(SCI.cyan) },
          { name: "已播面积", type: "bar", data: doneData, itemStyle: sciBarStyle(SCI.primary), barWidth: 22, emphasis: sciEmphasis(SCI.primary) }
        ]
      });
    }
    if (charts["plant-sowing-left-chart"]) {
      charts["plant-sowing-left-chart"].setOption({
        xAxis: { data: cats },
        series: [{ data: planData }, { data: doneData }]
      }, false);
    }
  }

  /* ---- 秋收进度 ---- */
  function renderPlantHarvestBar() { renderSeasonProgress(); }

  function initSeasonTabs() {
    var tabs = document.querySelectorAll("#season-tabs .sp-tab");
    tabs.forEach(function(tab) {
      tab.addEventListener("click", function() {
        tabs.forEach(function(t) { t.classList.remove("active"); });
        tab.classList.add("active");
        seasonTab = tab.dataset.season;
        renderSeasonProgress();
      });
    });
  }

  var investFarmTab = "农资";

  function renderFarmInvest() {
    var el = document.getElementById("farm-invest-body");
    if (!el) return;
    var farms = ["白城牧场", "镇南种羊场", "长岭种马场"];
    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    var colors = { "农资": "#00FF88", "农机": "#00D4FF", "其他": "#FFB800" };

    var data = farms.map(function(f, fi) {
      var v = 40 + fi * 10 + (seed * (fi + 3)) % 35;
      if (investFarmTab === "农机") v = 25 + fi * 6 + (seed * (fi + 5)) % 28;
      if (investFarmTab === "其他") v = 15 + fi * 3 + (seed * (fi + 7)) % 18;
      var amount = (v * 0.038).toFixed(1);
      return { name: f, value: v, amount: amount };
    });

    var color = colors[investFarmTab] || "#00FF88";

    _initOrUpdateChartEl("farm-invest-chart", el, {
      animationDuration: 1200,
      animationEasing: "cubicOut",
      tooltip: sciTooltip(),
      grid: { left: 12, right: 64, top: 6, bottom: 4, containLabel: true },
      xAxis: { type: "value", name: "亿元", nameTextStyle: { color: SCI.textSec, fontSize: 24 }, axisLabel: { color: SCI.textSec, fontSize: 22, formatter: function(v) { return (v * 0.038).toFixed(1) + "亿"; } }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      yAxis: { type: "category", data: farms, axisLabel: { color: SCI.textPri, fontSize: 26, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
      series: [{ type: "bar", data: data.map(function(d) { return { value: d.value, itemStyle: { color: sciBarGradient(color), borderRadius: [0, 8, 8, 0], shadowBlur: 8, shadowColor: hexToRgba(color, 0.4) } }; }), barWidth: "50%",
        label: { show: true, position: "right", fontSize: 24, color: SCI.textPri, fontFamily: SCI.fontNum, formatter: function(p) { return p.value + "%"; } }, emphasis: sciEmphasis(color) }]
    });
  }

  function initFarmInvestTabs() {
    var tabs = document.querySelectorAll("#invest-farm-tabs .sp-tab");
    tabs.forEach(function(tab) {
      tab.addEventListener("click", function() {
        tabs.forEach(function(t) { t.classList.remove("active"); });
        tab.classList.add("active");
        investFarmTab = tab.dataset.invest;
        renderFarmInvest();
      });
    });
  }

  function renderPlantHarvestCropChart() {
    var el = document.getElementById("plant-harvest-left-chart");
    if (!el) return;
    var cats = YZT_PROGRESS.categories;
    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    var plantData = YZT_PROGRESS.harvestPlant;
    var cutData = YZT_PROGRESS.harvestCut;
    var doneData = YZT_PROGRESS.harvestDone;
    if (selectedLeftPlot) {
      plantData = YZT_PROGRESS.harvestPlant.map(function(v, i) { return Math.max(15, v + (seed * (i + 1)) % 30 - 12); });
      cutData = plantData.map(function(v) { return Math.round(v * (0.4 + (seed % 25) / 100)); });
      doneData = cutData.map(function(v) { return Math.round(v * (0.5 + (seed % 35) / 100)); });
    }

    if (!charts["plant-harvest-left-chart"]) {
      initChart("plant-harvest-left-chart", {
        animationDuration: 1600,
        animationEasing: "cubicOut",
        grid: { left: 20, right: 20, top: 44, bottom: 14, containLabel: true },
        tooltip: sciTooltip(),
        legend: {
          data: ["播种", "割晒", "收获"], selectedMode: true,
          textStyle: { color: SCI.textPri, fontSize: 30 },
          top: 0, itemWidth: 22, itemHeight: 16, itemGap: 28
        },
        xAxis: { type: "category", data: cats, axisLabel: { color: SCI.textPri, fontSize: 28, fontWeight: 500 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
        yAxis: { type: "value", name: "万亩", nameTextStyle: { color: SCI.textSec, fontSize: 26 }, axisLabel: { color: SCI.textSec, fontSize: 26 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
        series: [
          { name: "播种", type: "bar", data: plantData, itemStyle: { color: hexToRgba("#00D4FF", 0.5), borderColor: "#00D4FF", borderWidth: 1, borderRadius: [8, 8, 0, 0], shadowBlur: 6, shadowColor: "rgba(0,212,255,0.3)" }, barWidth: 20, barGap: "20%", emphasis: sciEmphasis(SCI.cyan) },
          { name: "割晒", type: "bar", data: cutData, itemStyle: sciBarStyle(SCI.gold), barWidth: 20, emphasis: sciEmphasis(SCI.gold) },
          { name: "收获", type: "bar", data: doneData, itemStyle: sciBarStyle(SCI.primary), barWidth: 20, emphasis: sciEmphasis(SCI.primary) }
        ]
      });
    }
    if (charts["plant-harvest-left-chart"]) {
      charts["plant-harvest-left-chart"].setOption({
        xAxis: { data: cats },
        series: [{ data: plantData }, { data: cutData }, { data: doneData }]
      }, false);
    }
  }

  var weatherYearKey = "thisYear";

  function renderWeatherCharts() {
    var months = (typeof WEATHER_MONTHS !== "undefined") ? WEATHER_MONTHS : ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
    var d = (typeof WEATHER_YEAR_DATA !== "undefined" && WEATHER_YEAR_DATA[weatherYearKey])
      ? WEATHER_YEAR_DATA[weatherYearKey]
      : { temp: [], humidity: [], rainfall: [], accumTemp: [], accumRain: [], et0: [] };

    var chartFont = { color: "rgba(180,200,220,0.7)", fontSize: 28 };

    /* 左栏：温度 */
    renderWeatherSingleChart("weather-left-temp-chart", months, d.temp, "℃", "#FF9F1C");
    /* 左栏：湿度 */
    renderWeatherSingleChart("weather-left-humid-chart", months, d.humidity, "%", "#00D4FF");
    /* 左栏：降水量 */
    renderWeatherSingleChart("weather-left-rain-chart", months, d.rainfall, "mm", "#48CAE4");

    /* 右栏：积温 */
    renderWeatherSingleChart("weather-right-acc-temp-chart", months, d.accumTemp, "℃·d", "#FF6B6B");
    /* 右栏：积雨 */
    renderWeatherSingleChart("weather-right-acc-rain-chart", months, d.accumRain, "mm", "#B388FF");
    /* 右栏：ET₀ */
    renderWeatherSingleChart("weather-right-et0-chart", months, d.et0, "mm/d", "#00FF88");

    resizeSideCharts();
  }

  function renderWeatherSingleChart(id, months, data, unit, color) {
    var el = document.getElementById(id);
    if (!el) return;
    disposeChart(id);
    var c = echarts.init(el, null, { renderer: "canvas" });
    charts[id] = c;
    c.setOption({
      animationDuration: 1800,
      animationEasing: "cubicOut",
      tooltip: sciTooltip(),
      grid: { left: 24, right: 24, top: 10, bottom: 22, containLabel: true },
      xAxis: { type: "category", data: months, axisLabel: { color: SCI.textSec, fontSize: 26 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
      yAxis: { type: "value", name: unit, nameTextStyle: { color: SCI.textSec, fontSize: 24 }, axisLabel: { color: SCI.textSec, fontSize: 24 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: [{
        type: "line", smooth: true, data: data, symbol: "circle", symbolSize: 8,
        lineStyle: sciLineStyle(color),
        itemStyle: { color: color, shadowBlur: 6, shadowColor: hexToRgba(color, 0.5) },
        areaStyle: { color: sciAreaGradient(color) }
      }]
    });
  }

  (function initWeatherYearTabs() {
    ["weather-left-year-tabs", "weather-right-year-tabs"].forEach(function(tabId) {
      var el = document.getElementById(tabId);
      if (!el) return;
      el.addEventListener("click", function(e) {
        var tab = e.target.closest(".yzt-weather-year-tab");
        if (!tab) return;
        weatherYearKey = tab.dataset.wy;
        el.querySelectorAll(".yzt-weather-year-tab").forEach(function(t) { t.classList.toggle("active", t === tab); });
        /* 同步另一个 TAB 组 */
        var otherId = tabId === "weather-left-year-tabs" ? "weather-right-year-tabs" : "weather-left-year-tabs";
        var otherEl = document.getElementById(otherId);
        if (otherEl) {
          otherEl.querySelectorAll(".yzt-weather-year-tab").forEach(function(t) { t.classList.toggle("active", t.dataset.wy === weatherYearKey); });
        }
        renderWeatherCharts();
      });
    });
  })();

  function renderSowingCard() {
    var card = document.getElementById("sowing-card");
    if (!card) return;

    var seed = selectedLeftPlot ? _plotSeed(selectedLeftPlot.id) : (selectedLeftFarm ? _plotSeed(selectedLeftFarm) : 0);
    var farmData = selectedLeftFarm ? YZT_FARM_SOWING[selectedLeftFarm] : null;
    var planArr = farmData ? farmData.sowPlan : YZT_PROGRESS.sowPlan;
    var doneArr = farmData ? farmData.sowDone : YZT_PROGRESS.sowDone;
    if (selectedLeftPlot) {
      planArr = YZT_PROGRESS.sowPlan.map(function(v, i) { return Math.max(20, v + (seed * (i + 1)) % 40 - 18); });
      doneArr = planArr.map(function(v) { return Math.round(v * (0.6 + (seed % 30) / 100)); });
    }
    var totalPlan = planArr.reduce(function(a, b) { return a + b; }, 0);
    var totalSown = doneArr.reduce(function(a, b) { return a + b; }, 0);
    var totalPct = Math.round(totalSown / totalPlan * 100);

    /* 标题跟随农场/地块切换 */
    var titleEl = document.getElementById("sw-main-title");
    if (titleEl) {
      titleEl.textContent = selectedLeftPlot
        ? formatPlotLabel(selectedLeftPlot) + "播种总进度"
        : (selectedLeftFarm
          ? (function(){ var sf = SUBSIDIARIES.find(function(x) { return x.id === selectedLeftFarm; }); return (sf ? sf.name : "白城牧场"); })() + "播种总进度"
          : "集团播种总进度");
    }

    /* 统种/外租按比例估算（统种≈60%，外租≈40%） */
    var tongPlan = +(totalPlan * 0.62).toFixed(1);
    var tongSown = +(totalSown * 0.68).toFixed(1);
    var tongPct = Math.round(tongSown / tongPlan * 100);
    var rentPlan = +(totalPlan * 0.38).toFixed(1);
    var rentSown = +(totalSown * 0.32).toFixed(1);
    var rentPct = Math.round(rentSown / rentPlan * 100);

    document.getElementById("sw-sown-area").textContent = totalSown.toFixed(1) + " 万亩";
    document.getElementById("sw-plan-area").textContent = totalPlan.toFixed(1) + " 万亩";
    document.getElementById("sw-tong-pct").textContent = tongPct + "%";
    document.getElementById("sw-tong-plan").textContent = tongPlan.toFixed(1) + " 万亩";
    document.getElementById("sw-tong-done").textContent = tongSown.toFixed(1) + " 万亩";
    document.getElementById("sw-rent-pct").textContent = rentPct + "%";
    document.getElementById("sw-rent-plan").textContent = rentPlan.toFixed(1) + " 万亩";
    document.getElementById("sw-rent-done").textContent = rentSown.toFixed(1) + " 万亩";

    var ringEl = document.getElementById("sw-main-ring");
    if (ringEl) {
      if (charts["sw-main-ring"]) charts["sw-main-ring"].dispose();
      var c = echarts.init(ringEl, null, { renderer: "canvas" });
      charts["sw-main-ring"] = c;
      c.setOption({
        animationDuration: 1600,
        animationEasing: "cubicOut",
        series: [{
          type: "pie", radius: ["70%", "88%"], center: ["50%", "50%"], silent: true, roundCap: true,
          label: { show: true, position: "center", formatter: totalPct + "%", fontSize: 34, fontWeight: 800, color: "#00FF88", fontFamily: SCI.fontNum, textShadowColor: "rgba(0,255,136,0.4)", textShadowBlur: 14 },
          data: [
            { value: totalSown, itemStyle: { color: "#00FF88", shadowBlur: 10, shadowColor: "rgba(0,255,136,0.4)" } },
            { value: Math.max(0, totalPlan - totalSown), itemStyle: { color: "rgba(0,229,255,0.08)" } }
          ]
        }]
      });
    }
  }

  function renderHarvestCard() {
    var card = document.getElementById("harvest-card");
    if (!card) return;

    var totalSown = 65.2;    // 集团播种总面积（万亩）
    var totalHarvest = 38.5; // 集团收获总面积（万亩）
    var totalPct = Math.round(totalHarvest / totalSown * 100);

    var tongSown = 40.0;
    var tongHarvest = 28.2;
    var tongPct = Math.round(tongHarvest / tongSown * 100);

    var rentSown = 25.2;
    var rentHarvest = 10.3;
    var rentPct = Math.round(rentHarvest / rentSown * 100);

    document.getElementById("hv-sown-area").textContent = totalSown.toFixed(1) + " 万亩";
    document.getElementById("hv-harvest-area").textContent = totalHarvest.toFixed(1) + " 万亩";
    document.getElementById("hv-tong-pct").textContent = tongPct + "%";
    document.getElementById("hv-tong-sown").textContent = tongSown.toFixed(1) + " 万亩";
    document.getElementById("hv-tong-harvest").textContent = tongHarvest.toFixed(1) + " 万亩";
    document.getElementById("hv-rent-pct").textContent = rentPct + "%";
    document.getElementById("hv-rent-sown").textContent = rentSown.toFixed(1) + " 万亩";
    document.getElementById("hv-rent-harvest").textContent = rentHarvest.toFixed(1) + " 万亩";

    var ringEl = document.getElementById("hv-main-ring");
    if (ringEl) {
      if (charts["hv-main-ring"]) charts["hv-main-ring"].dispose();
      var c = echarts.init(ringEl, null, { renderer: "canvas" });
      charts["hv-main-ring"] = c;
      c.setOption({
        animationDuration: 1600,
        animationEasing: "cubicOut",
        series: [{
          type: "pie", radius: ["70%", "88%"], center: ["50%", "50%"], silent: true, roundCap: true,
          label: { show: true, position: "center", formatter: totalPct + "%", fontSize: 34, fontWeight: 800, color: "#FF9F1C", fontFamily: SCI.fontNum, textShadowColor: "rgba(255,159,28,0.4)", textShadowBlur: 14 },
          data: [
            { value: totalHarvest, itemStyle: { color: "#FF9F1C", shadowBlur: 10, shadowColor: "rgba(255,159,28,0.4)" } },
            { value: Math.max(0, totalSown - totalHarvest), itemStyle: { color: "rgba(0,229,255,0.08)" } }
          ]
        }]
      });
    }
  }

  function renderScenePlanting() {
    var plots = currentPlots;
    var totalArea = plots.reduce(function(s,p){return s+p.area;},0);
    var totalMu = Math.round(totalArea * 150);
    var sownMu = Math.round(totalMu * 0.78);
    var harvestMu = Math.round(totalMu * 0.32);
    var goodRate = 82;

    /* 1. KPI 卡片 */
    var kpiEl = document.getElementById("planting-kpi-row");
    if (kpiEl) kpiEl.innerHTML =
      '<div class="pkpi-card"><div class="pkpi-label">总种植面积</div><div class="pkpi-val">' + totalMu.toLocaleString() + '<span class="pkpi-unit"> 亩</span></div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">已播种面积</div><div class="pkpi-val green">' + sownMu.toLocaleString() + '<span class="pkpi-unit"> 亩</span></div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">已收获面积</div><div class="pkpi-val">' + harvestMu.toLocaleString() + '<span class="pkpi-unit"> 亩</span></div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">长势优良率</div><div class="pkpi-val ' + (goodRate >= 80 ? 'green' : 'warn') + '">' + goodRate + '<span class="pkpi-unit">%</span></div></div>';

    /* 2. 种植结构占比环形图 */
    var cropColors = { "水稻":"#4FC3F7", "小麦":"#FFB800", "玉米":"#00FF88", "大豆":"#00D4FF", "油料":"#FF9F43", "经济作物":"#B388FF" };
    var cropData = [{ name:"水稻", val: 28 }, { name:"小麦", val: 15 }, { name:"玉米", val: 32 }, { name:"大豆", val: 18 }, { name:"油料", val: 10 }, { name:"经济作物", val: 8 }];
    var pieColors = cropData.map(function(d){ return cropColors[d.name]; });
    var pieItems = cropData.map(function(d){ return { name: d.name, value: d.val, itemStyle: { color: cropColors[d.name] } }; });
    if (!charts["scene-planting-chart-1"]) initChart("scene-planting-chart-1", { animationDuration: 1600, animationEasing: "cubicOut", color: pieColors, tooltip: sciTooltip(), series: [{ type: "pie", radius: ["42%","68%"], center: ["50%","48%"], label: { show: true, fontSize: 26, color: SCI.textPri, formatter: "{b}\n{d}%" }, labelLine: { lineStyle: { color: "rgba(0,212,255,0.2)" } }, itemStyle: { borderColor: "rgba(2,10,22,0.85)", borderWidth: 3 }, emphasis: sciEmphasis(SCI.primary), data: [] }] });
    if (charts["scene-planting-chart-1"]) charts["scene-planting-chart-1"].setOption({ series: [{ data: pieItems }] }, false);

    /* 3. 各农场种植面积对比分组柱状图 */
    var farms = ["白城牧场", "镇南种羊场", "长岭种马场"];
    var cropsForBar = ["玉米", "大豆", "水稻", "小麦"];
    var barSeries = cropsForBar.map(function(c, ci) {
      return { name: c, type: "bar", data: farms.map(function(){ return 5 + Math.floor(Math.random() * 25); }), itemStyle: sciBarStyle(cropColors[c]), emphasis: sciEmphasis(cropColors[c]) };
    });
    if (!charts["scene-planting-chart-2"]) initChart("scene-planting-chart-2", { animationDuration: 1400, animationEasing: "cubicOut", grid: { left: 48, right: 14, top: 40, bottom: 14 }, tooltip: sciTooltip(), legend: { data: cropsForBar, textStyle: { color: SCI.textPri, fontSize: 24, fontWeight: 500 }, top: 0 }, xAxis: { type: "category", data: [], axisLabel: { color: SCI.textPri, fontSize: 24 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } }, yAxis: { type: "value", name: "万亩", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } }, series: [] });
    if (charts["scene-planting-chart-2"]) charts["scene-planting-chart-2"].setOption({ xAxis: { data: farms }, series: barSeries }, false);

    /* 4. 播种/秋收进度 */
    var categories = ["粮食", "油料", "经济作物"];
    var planData = [32, 12, 8];
    var doneData = [28, 9, 5];
    if (!charts["scene-planting-chart-3"]) initChart("scene-planting-chart-3", { animationDuration: 1400, animationEasing: "cubicOut", grid: { left: 48, right: 14, top: 40, bottom: 14 }, tooltip: sciTooltip(), legend: { data: ["计划", "完成"], textStyle: { color: SCI.textPri, fontSize: 24, fontWeight: 500 }, top: 0 }, xAxis: { type: "category", data: categories, axisLabel: { color: SCI.textPri, fontSize: 24 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } }, yAxis: { type: "value", name: "万亩", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } }, series: [] });
    if (charts["scene-planting-chart-3"]) charts["scene-planting-chart-3"].setOption({ series: [{ name: "计划", type: "bar", data: planData, itemStyle: { color: hexToRgba(SCI.cyan, 0.4), borderColor: SCI.cyan, borderWidth: 1, borderRadius: [8,8,0,0], shadowBlur: 6, shadowColor: "rgba(0,212,255,0.3)" }, barGap: "20%", emphasis: sciEmphasis(SCI.cyan) }, { name: "完成", type: "bar", data: doneData, itemStyle: sciBarStyle(SCI.primary), emphasis: sciEmphasis(SCI.primary) }] }, false);
  }

  function renderPlotDetailPanel(p) {
    var panel = document.getElementById("scene-panel-plot-detail");
    var planting = document.getElementById("scene-panel-planting");
    if (!panel) return;
    if (planting) planting.classList.add("yzt-hidden");
    panel.classList.remove("yzt-hidden");
    /* 隐藏灾害播报避免遮挡 */
    document.getElementById("disaster-ticker")?.classList.add("yzt-hidden");
    document.getElementById("plot-detail-title").textContent = formatPlotLabel(p);
    var base = getPlotBase(p);
    var idx = (p.lat + "").slice(-4) % 10;
    document.getElementById("pd-info-grid").innerHTML =
      '<div class="pd-row"><span class="pd-label">积温</span><span class="pd-val">' + (2800 + idx * 50) + '°C·d</span></div>' +
      '<div class="pd-row"><span class="pd-label">无霜期</span><span class="pd-val">' + (140 + idx * 2) + ' 天</span></div>' +
      '<div class="pd-row"><span class="pd-label">年降水量</span><span class="pd-val">' + (380 + idx * 20) + ' mm</span></div>' +
      '<div class="pd-row"><span class="pd-label">地理情况</span><span class="pd-val">平原，海拔' + (120 + idx * 15) + 'm</span></div>';
    resizeSideCharts();
  }

  var _weatherTab = "temp";
  function renderWeatherPlotDetail(p) {
    var panel = document.getElementById("scene-panel-weather-plot");
    var mainPanel = document.getElementById("scene-panel-weather");
    if (!panel) return;
    if (mainPanel) mainPanel.classList.add("yzt-hidden");
    panel.classList.remove("yzt-hidden");
    /* 隐藏气象全局卡片 */
    document.getElementById("temp-scale-bar")?.classList.add("yzt-hidden");
    document.getElementById("weather-data-panel")?.classList.add("yzt-hidden");
    document.getElementById("weather-plot-title").textContent = formatPlotLabel(p) + " 气象实况";

    var idx = (p.lat + "").slice(-4) % 10;
    var kpiEl = document.getElementById("weather-plot-kpi");
    if (kpiEl) kpiEl.innerHTML =
      '<div class="pkpi-card"><div class="pkpi-label">温度</div><div class="pkpi-val">' + (22 + idx) + '<span class="pkpi-unit">°C</span></div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">风速</div><div class="pkpi-val">' + (2 + idx * 0.5).toFixed(1) + '<span class="pkpi-unit">m/s</span></div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">风向</div><div class="pkpi-val">' + (["东南","南","西南","北","东北","东","西","西北"][idx % 8]) + '</div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">降水</div><div class="pkpi-val">' + (idx % 5 === 0 ? idx * 0.5 : 0).toFixed(1) + '<span class="pkpi-unit">mm</span></div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">光照度</div><div class="pkpi-val">' + (800 + idx * 200) + '<span class="pkpi-unit">lux</span></div></div>' +
      '<div class="pkpi-card"><div class="pkpi-label">湿度</div><div class="pkpi-val">' + (55 + idx * 3) + '<span class="pkpi-unit">%</span></div></div>';

    _weatherTab = "temp";
    document.querySelectorAll("#weather-tabs .pic-tab").forEach(function(t) { t.classList.toggle("active", t.dataset.wt === _weatherTab); });
    renderWeatherTabChart(idx);
    resizeSideCharts();
  }

  function renderWeatherTabChart(idx) {
    var months = ["1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"];
    var tabData = {
      temp: { name: "温度(°C)", data: [-15,-10,2,12,20,26,28,27,22,14,4,-8], color: "#FF9F1C" },
      wind: { name: "风速(m/s)", data: [4,5,5,6,5,4,3,3,4,5,5,4], color: "#00D4FF" },
      rain: { name: "降水量(mm)", data: [5,8,15,25,40,80,120,100,50,25,10,5], color: "#4FC3F7" },
      light: { name: "光照度(lux)", data: [400,600,900,1200,1500,1800,2000,1900,1500,1100,700,450], color: "#FFB800" },
      humid: { name: "湿度(%)", data: [65,60,55,50,55,65,75,78,72,68,70,68], color: "#B388FF" }
    };
    var cfg = tabData[_weatherTab];
    var chartId = "weather-plot-chart";
    disposeChart(chartId);
    var el = document.getElementById(chartId);
    if (!el) return;
    var c = echarts.init(el, null, { renderer: "canvas" });
    charts[chartId] = c;
    c.setOption({
      animationDuration: 1200,
      animationEasing: "cubicOut",
      grid: { left: 46, right: 12, top: 10, bottom: 22 },
      xAxis: { type: "category", data: months, axisLabel: { color: SCI.textSec, fontSize: 22, rotate: 30 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } },
      yAxis: { type: "value", name: cfg.name, axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } },
      series: [{ type: "bar", data: cfg.data, itemStyle: sciBarStyle(cfg.color), barWidth: "50%", emphasis: sciEmphasis(cfg.color) }]
    });
  }

  function renderSceneWeather() {
    /* 分析1: 未来两周温度预报折线图 */
    var days = ["今天", "明天", "后天", "周四", "周五", "周六", "周日", "周一", "周二", "周三"];
    var highs = [26, 24, 22, 25, 28, 31, 33, 29, 27, 30];
    var lows = [15, 14, 13, 16, 18, 21, 23, 19, 17, 20];
    if (!charts["scene-weather-chart-1"]) initChart("scene-weather-chart-1", { animationDuration: 1600, animationEasing: "cubicOut", grid: { left: 42, right: 14, top: 40, bottom: 14 }, tooltip: sciTooltip(), legend: { data: ["最高温","最低温"], textStyle: { color: SCI.textPri, fontSize: 24, fontWeight: 500 }, top: 2 }, xAxis: { type: "category", data: days, axisLabel: { color: SCI.textSec, fontSize: 22, rotate: 30 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } }, yAxis: { type: "value", name: "°C", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } }, series: [] });
    if (charts["scene-weather-chart-1"]) charts["scene-weather-chart-1"].setOption({ series: [{ name: "最高温", type: "line", data: highs, smooth: true, symbol: "circle", symbolSize: 8, lineStyle: sciLineStyle("#FF9F1C"), itemStyle: { color: "#FF9F1C", shadowBlur: 6, shadowColor: "rgba(255,159,28,0.5)" }, label: { show: true, fontSize: 22, color: "#FF9F1C", formatter: "{c}°" } }, { name: "最低温", type: "line", data: lows, smooth: true, symbol: "circle", symbolSize: 8, lineStyle: sciLineStyle("#00D4FF"), itemStyle: { color: "#00D4FF", shadowBlur: 6, shadowColor: "rgba(0,212,255,0.5)" }, label: { show: true, fontSize: 22, color: "#00D4FF", formatter: "{c}°" }, areaStyle: { color: sciAreaGradient("#00D4FF") } }] }, false);

    /* 分析2: 历史温度折线图 */
    var histDays = ["05-15","05-16","05-17","05-18","05-19","05-20"];
    var histHigh = [26, 28, 24, 29, 27, 30];
    var histLow = [14, 16, 15, 18, 17, 19];
    var histAvg = [20, 22, 19.5, 23.5, 22, 24.5];
    if (!charts["scene-weather-chart-2"]) initChart("scene-weather-chart-2", { animationDuration: 1600, animationEasing: "cubicOut", grid: { left: 42, right: 14, top: 40, bottom: 14 }, tooltip: sciTooltip(), legend: { data: ["最高","最低","平均"], textStyle: { color: SCI.textPri, fontSize: 22, fontWeight: 500 }, top: 2 }, xAxis: { type: "category", data: histDays, axisLabel: { color: SCI.textSec, fontSize: 22 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } }, yAxis: { type: "value", name: "°C", min: 0, max: 35, axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } }, series: [] });
    if (charts["scene-weather-chart-2"]) charts["scene-weather-chart-2"].setOption({ series: [{ name: "最高", type: "line", data: histHigh, smooth: true, symbol: "circle", symbolSize: 8, lineStyle: sciLineStyle("#FF9F1C"), itemStyle: { color: "#FF9F1C", shadowBlur: 6, shadowColor: "rgba(255,159,28,0.5)" }, areaStyle: { color: sciAreaGradient("#FF9F1C") } }, { name: "最低", type: "line", data: histLow, smooth: true, symbol: "circle", symbolSize: 8, lineStyle: sciLineStyle("#00D4FF"), itemStyle: { color: "#00D4FF", shadowBlur: 6, shadowColor: "rgba(0,212,255,0.5)" } }, { name: "平均", type: "line", data: histAvg, smooth: true, symbol: "circle", symbolSize: 8, lineStyle: sciLineStyle("#FF6B6B"), itemStyle: { color: "#FF6B6B", shadowBlur: 6, shadowColor: "rgba(255,107,107,0.5)" } }] }, false);

    /* 分析3: 气象预警列表 */
    var alertsEl = document.getElementById("scene-weather-alerts");
    if (alertsEl && typeof YZT_WEATHER !== "undefined" && YZT_WEATHER.alerts) {
      alertsEl.innerHTML = '<div class="yzt-iot-section-title">气象预警</div>' + YZT_WEATHER.alerts.map(function(a) {
        return '<div class="yzt-iot-alert-item level-' + (a.level === "yellow" ? "info" : "danger") + '"><div class="alert-text">' + a.text + '</div></div>';
      }).join("");
    }
  }

  function renderSoilLevelCard() {
    var card = document.getElementById("soil-level-card");
    if (!card) return;
    var subLabelMap = { n: "氮", p: "磷", k: "钾", organic: "有机质" };
    var label = subLabelMap[sceneSub] || "养分";
    var unitMap = { n: "mg/kg", p: "mg/kg", k: "mg/kg", organic: "g/kg" };
    var unit = unitMap[sceneSub] || "mg/kg";
    document.getElementById("slc-title").textContent = "土壤" + label + "含量等级";

    /* 根据指标生成6级图例 */
    var ranges = {
      n:  [{ name: "一级", color: "#006837", range: "> 180" }, { name: "二级", color: "#31A354", range: "150-180" }, { name: "三级", color: "#78C679", range: "120-150" }, { name: "四级", color: "#C2E699", range: "90-120" }, { name: "五级", color: "#FDB863", range: "60-90" }, { name: "六级", color: "#E34A33", range: "< 60" }],
      p:  [{ name: "一级", color: "#006837", range: "> 40" }, { name: "二级", color: "#31A354", range: "30-40" }, { name: "三级", color: "#78C679", range: "20-30" }, { name: "四级", color: "#C2E699", range: "10-20" }, { name: "五级", color: "#FDB863", range: "5-10" }, { name: "六级", color: "#E34A33", range: "< 5" }],
      k:  [{ name: "一级", color: "#006837", range: "> 200" }, { name: "二级", color: "#31A354", range: "150-200" }, { name: "三级", color: "#78C679", range: "100-150" }, { name: "四级", color: "#C2E699", range: "50-100" }, { name: "五级", color: "#FDB863", range: "30-50" }, { name: "六级", color: "#E34A33", range: "< 30" }],
      organic: [{ name: "一级", color: "#006837", range: "> 40" }, { name: "二级", color: "#31A354", range: "30-40" }, { name: "三级", color: "#78C679", range: "20-30" }, { name: "四级", color: "#C2E699", range: "10-20" }, { name: "五级", color: "#FDB863", range: "5-10" }, { name: "六级", color: "#E34A33", range: "< 5" }]
    };
    var levels = ranges[sceneSub] || ranges.n;
    document.getElementById("slc-list").innerHTML = levels.map(function(l) {
      return '<div class="slc-row"><span class="slc-swatch" style="background:' + l.color + '"></span><span class="slc-name">' + l.name + '</span><span class="slc-mu">' + l.range + '</span><span class="slc-pct">' + unit + '</span></div>';
    }).join("");
    card.classList.remove("yzt-hidden");
  }

  function renderSoilPlotDetail(p) {
    var panel = document.getElementById("scene-panel-soil-plot");
    var mainPanel = document.getElementById("scene-panel-soil");
    if (!panel) return;
    if (mainPanel) mainPanel.classList.add("yzt-hidden");
    panel.classList.remove("yzt-hidden");
    /* 隐藏土壤全局卡片 */
    document.getElementById("soil-level-card")?.classList.add("yzt-hidden");
    document.getElementById("soil-plot-title").textContent = formatPlotLabel(p) + " 土壤分析";
    var subLabelMap = { n: "氮", p: "磷", k: "钾", organic: "有机质" };
    var label = subLabelMap[sceneSub] || "养分";
    var sectionEl = document.getElementById("soil-plot-section-label");
    if (sectionEl) sectionEl.textContent = "土壤" + label + "指标";

    /* 左侧肥料等级卡片 */
    var card = document.getElementById("soil-plot-card");
    if (card) {
      card.classList.remove("yzt-hidden");
      var idx = (p.lat + "").slice(-4) % 10;
      document.getElementById("spc-title").textContent = "土壤" + label + "等级";
      var levels = [
        { name: "一级", pct: 12 + idx, mu: 180 + idx * 20, color: "#006837" },
        { name: "二级", pct: 16 + idx, mu: 240 + idx * 15, color: "#31A354" },
        { name: "三级", pct: 22 - idx, mu: 330 - idx * 10, color: "#78C679" },
        { name: "四级", pct: 20, mu: 300, color: "#C2E699" },
        { name: "五级", pct: 18 - idx, mu: 270 - idx * 10, color: "#FDB863" },
        { name: "六级", pct: 12, mu: 180, color: "#E34A33" }
      ];
      document.getElementById("spc-list").innerHTML = levels.map(function(l) {
        return '<div class="slc-row"><span class="slc-swatch" style="background:' + l.color + '"></span><span class="slc-name">' + l.name + '</span><span class="slc-mu">' + l.mu + '亩</span><span class="slc-pct">' + l.pct + '%</span></div>';
      }).join("");
    }

    /* 右侧土壤指标 */
    var gridEl = document.getElementById("soil-plot-grid");
    if (gridEl) {
      var base = getPlotBase(p);
      var idx2 = (p.lng + "").slice(-4) % 15;
      var indicators = [
        { name: "有效磷", val: (18 + idx2 * 0.8).toFixed(1), unit: "mg/kg" },
        { name: "有效氮", val: (95 + idx2 * 3).toFixed(1), unit: "mg/kg" },
        { name: "缓释钾", val: (120 + idx2 * 5).toFixed(0), unit: "mg/kg" },
        { name: "速效钾", val: (85 + idx2 * 4).toFixed(0), unit: "mg/kg" },
        { name: "全氮", val: (1.2 + idx2 * 0.05).toFixed(2), unit: "g/kg" },
        { name: "有机质", val: (22 + idx2 * 0.8).toFixed(1), unit: "g/kg" },
        { name: "全钾", val: (18 + idx2 * 0.5).toFixed(1), unit: "g/kg" },
        { name: "有机质碳", val: (12 + idx2 * 0.6).toFixed(1), unit: "g/kg" },
        { name: "土壤pH", val: (5.5 + idx2 * 0.15).toFixed(1), unit: "" }
      ];
      gridEl.innerHTML = indicators.map(function(d) {
        return '<div class="pd-row"><span class="pd-label">' + d.name + '</span><span class="pd-val">' + d.val + ' ' + d.unit + '</span></div>';
      }).join("");
    }
    resizeSideCharts();
  }

  function renderSceneSoil() {
    var subLabelMap = { n: "氮", p: "磷", k: "钾", organic: "有机质" };
    var label = subLabelMap[sceneSub] || "养分";
    var dataMap = {
      n:  { trend: [65,68,72,75,80,78,82], bar: [42,45,48,52,55,58,62] },
      p:  { trend: [55,58,60,63,65,68,72], bar: [38,40,43,46,50,53,55] },
      k:  { trend: [70,72,75,78,80,82,85], bar: [45,48,50,55,58,60,65] },
      organic: { trend: [50,52,55,58,62,65,68], bar: [35,38,42,45,48,52,55] }
    };
    var d = dataMap[sceneSub] || dataMap.n;
    var years = ["2019","2020","2021","2022","2023","2024","2025"];
    /* 更新 HTML 标签 */
    document.querySelector("#scene-soil-chart-1").previousElementSibling.textContent = "历史遥感" + label + "数据变化";
    document.querySelector("#scene-soil-chart-2").previousElementSibling.textContent = "土壤表层" + label + "年际监测";

    var chart1Id = "scene-soil-chart-1";
    if (!charts[chart1Id]) initChart(chart1Id, { animationDuration: 1600, animationEasing: "cubicOut", grid: { left: 46, right: 14, top: 12, bottom: 14 }, tooltip: sciTooltip(), xAxis: { type: "category", data: years, axisLabel: { color: SCI.textSec, fontSize: 24 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } }, yAxis: { type: "value", name: "指数", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } }, series: [] });
    if (charts[chart1Id]) charts[chart1Id].setOption({ series: [{ type: "line", data: d.trend, smooth: true, symbol: "circle", symbolSize: 8, lineStyle: sciLineStyle("#B388FF"), itemStyle: { color: "#B388FF", shadowBlur: 6, shadowColor: "rgba(179,136,255,0.5)" }, areaStyle: { color: sciAreaGradient("#B388FF") }, label: { show: true, fontSize: 24, color: "#B388FF" } }] }, false);
    var chart2Id = "scene-soil-chart-2";
    if (!charts[chart2Id]) initChart(chart2Id, { animationDuration: 1400, animationEasing: "cubicOut", grid: { left: 46, right: 14, top: 12, bottom: 14 }, tooltip: sciTooltip(), xAxis: { type: "category", data: years, axisLabel: { color: SCI.textSec, fontSize: 24 }, axisLine: { lineStyle: { color: SCI.axisLine, width: 1.5 } }, axisTick: { show: false } }, yAxis: { type: "value", axisLabel: { color: SCI.textSec, fontSize: 22 }, splitLine: { lineStyle: { color: SCI.gridLine, type: "dashed" } } }, series: [] });
    if (charts[chart2Id]) charts[chart2Id].setOption({ series: [{ type: "bar", data: d.bar.map(function(v, i) { var colors = ["#E34A33","#FDB863","#C2E699","#78C679","#78C679","#31A354","#31A354"]; return { value: v, itemStyle: { color: colors[i], borderRadius: [8,8,0,0], shadowBlur: 6, shadowColor: hexToRgba(colors[i], 0.35) } }; }), barWidth: "50%" }] }, false);
  }

  function renderSceneMgmt() {
    var mgmtData = [{ name: "自营", value: 45 }, { name: "托管", value: 25 }, { name: "流转", value: 18 }, { name: "散户", value: 10 }, { name: "休耕", value: 2 }];
    if (!charts["scene-mgmt-chart"]) initChart("scene-mgmt-chart", { animationDuration: 1600, animationEasing: "cubicOut", color: ["#00FF88","#00D4FF","#FFB800","#B388FF","#9CA3AF"], tooltip: sciTooltip(), series: [{ type: "pie", radius: ["38%","62%"], center: ["50%","52%"], label: { show: true, fontSize: 24, color: SCI.textPri }, labelLine: { lineStyle: { color: "rgba(0,212,255,0.2)" } }, itemStyle: { borderColor: "rgba(2,10,22,0.85)", borderWidth: 3 }, emphasis: sciEmphasis(SCI.primary), data: [] }] });
    if (charts["scene-mgmt-chart"]) charts["scene-mgmt-chart"].setOption({ title: { text: "经营结构占比", textStyle: { color: "#FFB800", fontSize: 28, fontWeight: 700, textShadowColor: "rgba(255,184,0,0.4)", textShadowBlur: 12 }, left: 8, top: 4 }, series: [{ data: mgmtData }] }, false);
    var statsEl = document.getElementById("scene-mgmt-stats");
    if (statsEl) statsEl.innerHTML = '<div class="yzt-kpi-card"><div class="k-label">经营类型</div><div class="k-val green">5</div></div><div class="yzt-kpi-card"><div class="k-label">自营面积</div><div class="k-val">6.8 万亩</div></div>';
  }

  function renderDisasterTicker() {
    var el = document.getElementById("dt-marquee");
    if (!el) return;
    var warns = typeof YZT_DISASTER_WARNINGS !== "undefined" ? YZT_DISASTER_WARNINGS : [];
    if (!warns.length) { el.innerHTML = '<span>当前无灾害预警</span>'; return; }
    var levelCls = { red: "dt-level-red", orange: "dt-level-orange", yellow: "dt-level-yellow" };
    var items = warns.map(function(w, i) {
      return '<span class="' + (levelCls[w.level] || "") + '" data-warn-id="' + w.id + '">【' + w.levelLabel + '】' + w.region + '：' + w.title + ' — ' + w.publishTime + '</span>';
    }).join("");
    el.innerHTML = '<div class="dt-scroll-inner">' + items + items + '</div>'; /* 双份内容实现无缝滚动 */
    /* 点击定位 */
    el.querySelectorAll("span[data-warn-id]").forEach(function(sp) {
      sp.addEventListener("click", function() {
        var warn = YZT_DISASTER_WARNINGS.find(function(w) { return w.id === sp.dataset.warnId; });
        if (!warn || !gisMap) return;
        var p = currentPlots.find(function(x) { return x.id === warn.plotId; }) || getPlotsForFarms(getFarmIds()).find(function(x) { return x.id === warn.plotId; });
        if (p) {
          gisMap.flyTo([p.lat, p.lng], 12, { duration: 0.8 });
          openDisasterModal(warn, p);
        }
      });
    });
  }

  function renderSceneDisaster() {
    var kpiEl = document.getElementById("scene-disaster-kpi");
    if (kpiEl) kpiEl.innerHTML = '<div class="yzt-kpi-card"><div class="k-label">受灾地块</div><div class="k-val warn">3</div></div><div class="yzt-kpi-card"><div class="k-label">受灾面积</div><div class="k-val warn">1.2 万亩</div></div><div class="yzt-kpi-card"><div class="k-label">预警等级</div><div class="k-val warn">黄色</div></div>';
    var listEl = document.getElementById("scene-disaster-list");
    if (listEl) {
      var warns = typeof YZT_DISASTER_WARNINGS !== "undefined" ? YZT_DISASTER_WARNINGS : [];
      listEl.innerHTML = '<div class="yzt-iot-section-title" style="margin-top:8px">预警列表</div>' + (warns.length ? warns.map(function(w) { return '<div class="yzt-iot-alert-item level-' + w.level + '"><div class="alert-text">' + w.title + '</div><div class="alert-time">' + w.region + ' · ' + w.publishTime + '</div></div>'; }).join("") : '<div class="yzt-empty-hint">暂无预警</div>');
    }
  }

  function renderIotTicker() {
    var el = document.getElementById("it-marquee");
    if (!el) return;
    var devs = currentDevices || (typeof YZT_DEVICES !== "undefined" ? YZT_DEVICES : []);
    var alerts = [];
    devs.forEach(function(d) {
      if (d.alerts && d.alerts.length) {
        d.alerts.forEach(function(a) { alerts.push({ deviceName: d.name, text: a.text, time: a.time, level: a.level, deviceId: d.id }); });
      }
    });
    if (!alerts.length) { el.innerHTML = '<span>当前无设备告警</span>'; return; }
    var items = alerts.map(function(a) {
      return '<span class="it-level-' + a.level + '" data-device-id="' + a.deviceId + '">【' + a.deviceName + '】' + a.text + ' — ' + a.time + '</span>';
    }).join("");
    el.innerHTML = '<div class="it-scroll-inner">' + items + items + '</div>';
    el.querySelectorAll("span[data-device-id]").forEach(function(sp) {
      sp.addEventListener("click", function() {
        var dev = (typeof YZT_DEVICES !== "undefined" ? YZT_DEVICES : []).find(function(x) { return x.id === sp.dataset.deviceId; });
        if (dev && gisMap) {
          gisMap.flyTo([dev.lat, dev.lng], 13, { duration: 0.6 });
          openDeviceModal(dev);
        }
      });
    });
  }

  /* 地块信息卡片 */
  function showPlotInfoCard(p) {
    if (!gisMap) return;
    var seed = _plotSeed(p.id);
    var rentType = getPlotBase(p).rentType || "统种地";
    var isTong = rentType !== "外租地";
    var mgmtType = isTong ? "统种地" : "承租地";
    var pn = formatPlotLabel(p);

    var card = document.getElementById("plot-info-card");
    if (!card) return;
    card.querySelector(".pic-close").onclick = function() { card.classList.add("yzt-hidden"); };

    document.getElementById("pic-title").textContent = pn;
    var tagEl = document.getElementById("pic-tag");
    tagEl.textContent = mgmtType;
    tagEl.className = "pic-tag" + (isTong ? "" : " rent");

    /* 动态数据（先定义，后续多处使用） */
    var muArea = +(p.area * 150).toFixed(1);
    var yieldPerMu = 600 + seed % 150;
    var totalYield = (yieldPerMu * muArea / 1000).toFixed(2);
    var price = (2.5 + (seed % 10) / 10).toFixed(2);
    var totalRevenue = Math.round(parseFloat(totalYield) * 1000 * parseFloat(price));
    var totalCost = Math.round(totalRevenue * 0.566);
    var netProfit = totalRevenue - totalCost;
    var profitPerMu = (netProfit / (muArea || 1)).toFixed(1);
    var costRate = ((netProfit / totalCost) * 100).toFixed(1);
    var fertilizerCost = 28000 + seed % 8000;
    var pesticideCost = 3500 + seed % 2000;
    var fuelCost = 2400 + seed % 1000;
    var seedCostVal = 9000 + seed % 4000;
    var fmtNum = function(n) { return n.toLocaleString ? n.toLocaleString() : n; };
    var perMu = function(cost) { return Math.round(cost / (muArea || 1)); };
    /* 作物徽章 */
    var cropName = isTong ? "玉米" : "大豆";
    var cropVariety = isTong ? "先玉335" : "黑农84";
    document.getElementById("pic-crop-badge").textContent = "种植作物：" + cropName + "  品种：" + cropVariety;

    var muTotal = muArea.toFixed(0);

    /* 地块基础信息 */
    var prevCrop = cropName === "玉米" ? "大豆" : "玉米";
    document.getElementById("pic-basic-grid").innerHTML =
      '<div class="pi-row"><span class="pi-lbl">地块面积</span><span class="pi-val hl">' + muTotal + '亩</span></div>' +
      '<div class="pi-row"><span class="pi-lbl">地块类型</span><span class="pi-val">水浇地</span></div>' +
      '<div class="pi-row"><span class="pi-lbl">当前作物</span><span class="pi-val hl">' + cropName + '（' + cropVariety + '）</span></div>' +
      '<div class="pi-row"><span class="pi-lbl">前茬作物</span><span class="pi-val">' + prevCrop + '</span></div>';

    /* 承租地显示合同按钮（模拟PDF合同） */
    var contractRow = document.getElementById("pic-contract-row");
    if (!isTong) {
      contractRow?.classList.remove("yzt-hidden");
      document.getElementById("pic-contract-btn").onclick = function() {
        var contractHtml = '<html><head><meta charset="UTF-8"><style>' +
          'body{font-family:SimSun,serif;padding:60px 80px;color:#000;line-height:2;font-size:16px}' +
          'h1{text-align:center;font-size:24px;margin-bottom:40px}' +
          'h3{margin-top:30px}' +
          'table{width:100%;border-collapse:collapse;margin:20px 0}' +
          'td{padding:8px 12px;border:1px solid #000}' +
          '.sign{display:flex;justify-content:space-between;margin-top:60px}' +
          '.sign>div{width:45%}' +
          '</style></head><body>' +
          '<h1>农村土地经营权出租合同</h1>' +
          '<p>合同编号：CZ-2026-0' + (100 + seed % 900) + '</p>' +
          '<h3>一、租赁土地概况</h3>' +
          '<table><tr><td>地块名称</td><td>' + pn + '</td></tr>' +
          '<tr><td>承租面积</td><td>' + muTotal + '亩</td></tr>' +
          '<tr><td>土地类型</td><td>水浇地</td></tr>' +
          '<tr><td>承租用途</td><td>' + (seed % 2 ? '玉米种植' : '大豆种植') + '</td></tr></table>' +
          '<h3>二、合同双方</h3>' +
          '<table><tr><td>出租方（甲方）</td><td>' + (seed % 2 ? '吉林省农垦集团' : '白城农垦有限公司') + '</td></tr>' +
          '<tr><td>承租方（乙方）</td><td>' + (seed % 2 ? '丰瑞农业合作社' : '鑫源农业发展有限公司') + '</td></tr></table>' +
          '<h3>三、租赁期限</h3>' +
          '<p>租赁期限为' + (3 + seed % 8) + '年，自2026年0' + (3 + seed % 8) + '月01日起至202' + (29 + seed % 3) + '年0' + (3 + seed % 8) + '月01日止。</p>' +
          '<h3>四、租金及支付方式</h3>' +
          '<table><tr><td>年租金</td><td>' + (420 + seed % 180) + ' 元/亩，合计 ' + (Math.round((420 + seed % 180) * muArea)).toLocaleString() + ' 元/年</td></tr>' +
          '<tr><td>支付方式</td><td>年度预付，次年1月15日前支付下一年度租金</td></tr></table>' +
          '<h3>五、双方权利与义务</h3>' +
          '<p>1. 甲方负责土地基础设施维护，保证土地符合农业生产经营条件。</p>' +
          '<p>2. 乙方享有土地经营权，按合同约定用途开展农业生产活动，承担日常田间管理。</p>' +
          '<p>3. 乙方不得擅自改变土地用途，不得破坏土地生态环境。</p>' +
          '<h3>六、违约责任</h3>' +
          '<p>任何一方违约，应向守约方支付相当于一年租金的违约金。</p>' +
          '<h3>七、其他约定</h3>' +
          '<p>合同到期后，在同等条件下乙方享有优先续租权。</p>' +
          '<div class="sign"><div><p>甲方（盖章）：</p><p>日期：2026年0' + (3 + seed % 8) + '月01日</p></div>' +
          '<div><p>乙方（盖章）：</p><p>日期：2026年0' + (3 + seed % 8) + '月01日</p></div></div>' +
          '</body></html>';
        var blob = new Blob([contractHtml], {type: 'text/html;charset=UTF-8'});
        var url = URL.createObjectURL(blob);
        var overlay = document.getElementById("pdf-viewer-overlay");
        var iframe = document.getElementById("pdf-viewer-iframe");
        var titleEl = document.getElementById("pdf-viewer-title");
        if (overlay && iframe) {
          iframe.src = url;
          if (titleEl) titleEl.textContent = '承租合同 - ' + pn;
          overlay.classList.remove('hidden');
        }
      };
    } else {
      contractRow?.classList.add("yzt-hidden");
    }

    /* TAB 内容按统种/承租区分 */
    var archiveHtml, bizHtml;
    if (isTong) {
      /* ---- 统种地：田间作业档案 ---- */
      archiveHtml =
        '<div class="pic-archive-meta">' + pn + '（春玉米） · 档案编号：TZ-2026-0' + (100 + seed % 900) + '</div>' +
        '<div class="pic-archive-block"><h4>收获</h4>' +
        '<p>采收周期：2026-09-' + (10 + seed % 10) + '至2026-09-' + (16 + seed % 10) + '，机械化联合收割、秸秆还田<br>' +
        '产量品质：亩产' + yieldPerMu + 'kg，总产' + totalYield + '吨，含水率' + (20 + seed % 6) + '.' + (seed % 10) + '%，杂质率1.' + (seed % 5) + '%，达标入库<br>' +
        '经营效益：销售单价' + price + '元/kg，总营收' + totalRevenue + '元；总投入成本' + totalCost + '元，纯利润' + netProfit + '元，亩均利润' + profitPerMu + '元，成本利润率' + costRate + '%</p></div>' +
        '<div class="pic-archive-block"><h4>田间管理</h4>' +
        '<div class="pic-timeline">' +
          '<div class="pic-tl-item"><div class="pic-tl-dot"></div><div class="pic-tl-line"></div><div class="pic-tl-content">' +
            '<div class="pic-tl-head"><span class="pic-tl-title">旋耕</span><span class="pic-tl-date">2026-04-' + (15 + seed % 5) + '</span></div>' +
            '<div class="pic-tl-info"><span>作业面积 ' + muTotal + '亩</span><span>张德发</span><span>约翰迪尔 8R-3004</span><span>液压翻转犁</span></div>' +
          '</div></div>' +
          '<div class="pic-tl-item"><div class="pic-tl-dot"></div><div class="pic-tl-line"></div><div class="pic-tl-content">' +
            '<div class="pic-tl-head"><span class="pic-tl-title">播种</span><span class="pic-tl-date">2026-04-' + (20 + seed % 5) + '</span></div>' +
            '<div class="pic-tl-info"><span>作业面积 ' + muTotal + '亩</span><span>李建军</span><span>约翰迪尔 1775NT</span><span>免耕精量播种机</span></div>' +
          '</div></div>' +
          '<div class="pic-tl-item"><div class="pic-tl-dot"></div><div class="pic-tl-line"></div><div class="pic-tl-content">' +
            '<div class="pic-tl-head"><span class="pic-tl-title">施肥</span><span class="pic-tl-date">2026-05-' + (8 + seed % 8) + '</span></div>' +
            '<div class="pic-tl-info"><span>作业面积 ' + muTotal + '亩</span><span>王建国</span><span>凯斯 6200</span><span>变量施肥机</span></div>' +
          '</div></div>' +
          '<div class="pic-tl-item"><div class="pic-tl-dot"></div><div class="pic-tl-line"></div><div class="pic-tl-content">' +
            '<div class="pic-tl-head"><span class="pic-tl-title">植保</span><span class="pic-tl-date">2026-06-' + (10 + seed % 12) + '</span></div>' +
            '<div class="pic-tl-info"><span>作业面积 ' + muTotal + '亩</span><span>赵志强</span><span>约翰迪尔 R4045</span><span>自走式喷药机</span></div>' +
          '</div></div>' +
          '<div class="pic-tl-item"><div class="pic-tl-dot"></div><div class="pic-tl-line"></div><div class="pic-tl-content">' +
            '<div class="pic-tl-head"><span class="pic-tl-title">灌溉</span><span class="pic-tl-date">2026-07-' + (2 + seed % 15) + '</span></div>' +
            '<div class="pic-tl-info"><span>作业面积 ' + muTotal + '亩</span><span>刘长河</span><span>指针式喷灌机</span><span>智能精准灌溉系统</span></div>' +
          '</div></div>' +
          '<div class="pic-tl-item"><div class="pic-tl-dot"></div><div class="pic-tl-content">' +
            '<div class="pic-tl-head"><span class="pic-tl-title">收割</span><span class="pic-tl-date">2026-09-' + (10 + seed % 10) + '</span></div>' +
            '<div class="pic-tl-info"><span>作业面积 ' + muTotal + '亩</span><span>孙大伟</span><span>凯斯 8250</span><span>谷物联合收割台</span></div>' +
          '</div></div>' +
        '</div></div>' +
        '<div class="pic-archive-block"><h4>播种 <span class="pic-field-tag">免耕</span></h4>' +
        '<div class="pi-row"><span class="pi-lbl">作业面积</span><span class="pi-val hl">' + muTotal + '亩</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">作业人</span><span class="pi-val">李建军</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">农机</span><span class="pi-val">约翰迪尔 1775NT</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">农机具</span><span class="pi-val">免耕精量播种机</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">作业时间</span><span class="pi-val">2026-04-' + (20 + seed % 5) + '</span></div></div>';

      /* 统种地：经营统计 */
      var h1 = Math.round(totalCost * 0.39);
      var h2 = Math.round(totalCost * 0.16);
      var h3 = totalCost - h1 - h2;
      bizHtml =
        '<div class="pic-biz-section"><div class="pic-biz-section-title">成本统计</div><div class="pic-biz-cards">' +
        '<div class="pic-biz-card"><div class="pic-biz-card-icon">📦</div><div class="pic-biz-card-data">' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">总农资</span><span class="pic-biz-data-val">' + fmtNum(h1) + ' 元</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">亩农资</span><span class="pic-biz-data-val">' + fmtNum(perMu(h1)) + ' 元/亩</span></div></div></div>' +
        '<div class="pic-biz-card"><div class="pic-biz-card-icon">⛽</div><div class="pic-biz-card-data">' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">油耗</span><span class="pic-biz-data-val">' + fmtNum(fuelCost) + ' 元</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">亩油耗</span><span class="pic-biz-data-val">' + fmtNum(perMu(fuelCost)) + ' 元/亩</span></div></div></div>' +
        '<div class="pic-biz-card"><div class="pic-biz-card-icon">🔧</div><div class="pic-biz-card-data">' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">其他费用</span><span class="pic-biz-data-val">' + fmtNum(h3) + ' 元</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">亩其他费用</span><span class="pic-biz-data-val">' + fmtNum(perMu(h3)) + ' 元/亩</span></div></div></div>' +
        '</div></div>' +
        '<div class="pic-biz-section"><div class="pic-biz-section-title">农资明细</div><div class="pic-biz-sub-detail">' +
        '<div class="pic-biz-detail-card"><div class="pic-biz-detail-title">总明细 (元)</div><div class="pic-biz-detail-grid">' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">种子成本</span><span class="pic-biz-data-val">' + fmtNum(seedCostVal) + '</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">农药成本</span><span class="pic-biz-data-val">' + fmtNum(pesticideCost) + '</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">肥料成本</span><span class="pic-biz-data-val">' + fmtNum(fertilizerCost) + '</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">助剂成本</span><span class="pic-biz-data-val">' + fmtNum(Math.round(totalCost * 0.01)) + '</span></div></div></div>' +
        '<div class="pic-biz-detail-card"><div class="pic-biz-detail-title">亩明细 (元/亩)</div><div class="pic-biz-detail-grid">' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">种子成本</span><span class="pic-biz-data-val">' + fmtNum(perMu(seedCostVal)) + '</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">农药成本</span><span class="pic-biz-data-val">' + fmtNum(perMu(pesticideCost)) + '</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">肥料成本</span><span class="pic-biz-data-val">' + fmtNum(perMu(fertilizerCost)) + '</span></div>' +
        '<div class="pic-biz-data-item"><span class="pic-biz-data-label">助剂成本</span><span class="pic-biz-data-val">' + fmtNum(perMu(Math.round(totalCost * 0.01))) + '</span></div></div></div>' +
        '</div></div>' +
        '<div class="pic-biz-section"><div class="pic-biz-section-title">产量统计</div>' +
        '<div class="pic-biz-yield-row"><div class="pic-biz-yield-item"><span class="pic-biz-yield-label">播种面积</span><span class="pic-biz-yield-val">' + muArea.toFixed(0) + ' 亩</span></div>' +
        '<div class="pic-biz-yield-item"><span class="pic-biz-yield-label">割晒面积</span><span class="pic-biz-yield-val">' + muArea.toFixed(0) + ' 亩</span></div>' +
        '<div class="pic-biz-yield-item"><span class="pic-biz-yield-label">收获面积</span><span class="pic-biz-yield-val">' + muArea.toFixed(0) + ' 亩</span></div></div>' +
        '<div class="pic-biz-yield-row" style="margin-top:8px"><div class="pic-biz-yield-item"><span class="pic-biz-yield-label">预估产量</span><span class="pic-biz-yield-val">' + (yieldPerMu * muArea / 1000).toFixed(2) + ' 吨</span></div>' +
        '<div class="pic-biz-yield-item"><span class="pic-biz-yield-label">进场产量</span><span class="pic-biz-yield-val">' + totalYield + ' 吨</span></div>' +
        '<div class="pic-biz-yield-item"><span class="pic-biz-yield-label">亩产量</span><span class="pic-biz-yield-val">' + yieldPerMu + ' kg</span></div></div>' +
        '</div>';
    } else {
      /* ---- 承租地：承租基本信息 ---- */
      var rentYears = 3 + seed % 8;
      var rentPerMu = 420 + seed % 180;
      var totalRent = Math.round(rentPerMu * muArea);
      var lessor = seed % 2 ? '吉林省农垦集团' : '白城农垦有限公司';
      var lessee = seed % 2 ? '丰瑞农业合作社' : '鑫源农业发展有限公司';
      var rentUse = seed % 2 ? '玉米种植' : '大豆种植';
      var startDate = '2026-0' + (3 + seed % 8);
      var endDate = '202' + (29 + seed % 3) + '-0' + (3 + seed % 8);
      archiveHtml =
        '<div class="pic-archive-meta">' + pn + ' · 合同编号：CZ-2026-0' + (100 + seed % 900) + '</div>' +
        '<div class="pic-archive-block"><h4>承租信息</h4>' +
        '<div class="pi-row"><span class="pi-lbl">承租面积</span><span class="pi-val hl">' + muTotal + '亩</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">出租方</span><span class="pi-val">' + lessor + '</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">承租方</span><span class="pi-val">' + lessee + '</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">租赁期限</span><span class="pi-val">' + rentYears + '年（' + startDate + '至' + endDate + '）</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">年租金</span><span class="pi-val hl">' + fmtNum(totalRent) + ' 元（' + rentPerMu + ' 元/亩）</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">租金支付</span><span class="pi-val">年度预付，次年1月15日前支付</span></div>' +
        '<div class="pi-row"><span class="pi-lbl">承租用途</span><span class="pi-val">' + rentUse + '</span></div></div>';
      bizHtml = ''; /* 承租地不显示经营统计Tab */
    }
    document.getElementById("pic-archive-body").innerHTML = archiveHtml;
    document.getElementById("pic-biz-body").innerHTML = bizHtml;

    /* 默认选中TAB1 */
    card.querySelectorAll(".pic-tab").forEach(function(t, i) { t.classList.toggle("active", i === 0); });
    document.getElementById("pic-panel-archive").classList.add("active");
    document.getElementById("pic-panel-biz").classList.remove("active");

    /* 承租地TAB标签改名，隐藏第二个Tab */
    var archiveTab = card.querySelector('.pic-tab[data-ptab="archive"]');
    var bizTab = card.querySelector('.pic-tab[data-ptab="biz"]');
    var bizPanel = document.getElementById("pic-panel-biz");
    if (archiveTab) archiveTab.textContent = isTong ? '田间作业档案' : '承租信息';
    if (!isTong) {
      if (bizTab) bizTab.style.display = 'none';
      if (bizPanel) bizPanel.style.display = 'none';
    } else {
      if (bizTab) { bizTab.style.display = ''; bizTab.textContent = '经营统计'; }
      if (bizPanel) bizPanel.style.display = '';
    }

    card.classList.remove("yzt-hidden");
  }

  /* 地块卡片Tab切换 */
  (function initPlotInfoCard() {
    document.getElementById("pic-close")?.addEventListener("click", function() {
      document.getElementById("plot-info-card")?.classList.add("yzt-hidden");
    });
    document.getElementById("plot-info-card")?.addEventListener("click", function(e) {
      var ptab = e.target.closest(".pic-tab");
      if (ptab) {
        var k = ptab.dataset.ptab;
        document.querySelectorAll(".pic-tab").forEach(function(t) { t.classList.toggle("active", t.dataset.ptab === k); });
        document.getElementById("pic-panel-archive").classList.toggle("active", k === "archive");
        document.getElementById("pic-panel-biz").classList.toggle("active", k === "biz");
      }
    });
  })();

  /* 种植经营底部5场景按钮 */
  function updatePlantToolbarActive() {
    var tb = document.getElementById("plant-toolbar");
    if (!tb) return;
    var activeMode = window._plantToolbarMode || "crop";
    tb.querySelectorAll(".pt-btn").forEach(function(b) {
      b.classList.toggle("active", b.dataset.pt === activeMode);
    });
  }

  (function initPlantToolbar() {
    var tb = document.getElementById("plant-toolbar");
    if (!tb) return;
    tb.addEventListener("click", function(e) {
      var btn = e.target.closest(".pt-btn");
      if (!btn) return;
      tb.querySelectorAll(".pt-btn").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var mode = btn.dataset.pt;
      window._plantToolbarMode = mode;
      document.getElementById("plot-info-card")?.classList.add("yzt-hidden");
      hideMapBanner();
      selectedLeftPlot = null;
      if (mode === "crop")       { mapFilterMode = "crop"; sceneMode = "planting"; }
      else if (mode === "remote")  { mapFilterMode = "remote"; sceneMode = "planting"; }
      else if (mode === "weather") { mapFilterMode = "crop"; sceneMode = "weather"; }
      applyFilter();
      /* ---- 统一隐藏所有特殊面板 ---- */
      document.getElementById("plant-farm-rent-ratio-block")?.classList.add("yzt-hidden");
      document.getElementById("plant-season-progress-block")?.classList.add("yzt-hidden");
      document.getElementById("plant-farm-invest-block")?.classList.add("yzt-hidden");
      document.getElementById("plant-weather-block")?.classList.add("yzt-hidden");
      document.getElementById("plant-weather-left-panel")?.classList.add("yzt-hidden");
      hideRemoteSubs();
      /* 统种地/承租地图例：遥感监测和气象监测隐藏，其他显示 */
      var showPlotType = mode !== "remote" && mode !== "weather";
      document.getElementById("plot-type-legend")?.classList.toggle("yzt-hidden", !showPlotType);

      if (mode === "remote") {
        document.querySelector(".yzt-side-left")?.classList.add("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.add("yzt-hidden");
        document.getElementById("plant-weather-left-panel")?.classList.add("yzt-hidden");
        document.getElementById("plant-weather-block")?.classList.add("yzt-hidden");
        document.getElementById("plant-farm-rent-ratio-block")?.classList.add("yzt-hidden");
        document.getElementById("plant-season-progress-block")?.classList.add("yzt-hidden");
        showRemoteSubs();
      } else if (mode === "weather") {
        selectLeftFarm(null);
        document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
        /* 隐藏种植模块，显示气象模块 */
        document.querySelectorAll(".yzt-plant-annual-plan, .yzt-plant-formula-list, .yzt-plant-invest-summary").forEach(function(el) { el.classList.add("yzt-hidden"); });
        document.getElementById("plant-weather-left-panel")?.classList.remove("yzt-hidden");
        document.getElementById("plant-weather-block")?.classList.remove("yzt-hidden");
        document.getElementById("map-weather-float")?.classList.remove("hidden");
        document.getElementById("temp-scale-bar")?.classList.remove("yzt-hidden");
        document.getElementById("weather-data-panel")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-map-wrap")?.classList.add("yzt-weather-scene");
        renderMapWeatherFloat();
        requestAnimationFrame(function() {
          renderWeatherCharts();
        });
      } else {
        /* crop 模式 */
        document.querySelector(".yzt-side-left")?.classList.remove("yzt-hidden");
        document.querySelector(".yzt-side-right")?.classList.remove("yzt-hidden");
        selectLeftFarm(null);
        document.querySelectorAll(".yzt-plant-annual-plan, .yzt-plant-formula-list, .yzt-plant-invest-summary").forEach(function(el) { el.classList.remove("yzt-hidden"); });
        document.getElementById("plant-weather-left-panel")?.classList.add("yzt-hidden");
        document.getElementById("plant-weather-block")?.classList.add("yzt-hidden");
        /* 显示作物模式右侧模块 */
        document.getElementById("plant-farm-rent-ratio-block")?.classList.remove("yzt-hidden");
        document.getElementById("plant-season-progress-block")?.classList.remove("yzt-hidden");
        document.getElementById("plant-farm-invest-block")?.classList.remove("yzt-hidden");
        requestAnimationFrame(function() {
          renderLeftSidebar();
          renderFarmRentRatio();
          renderSeasonProgress();
          renderFarmInvest();
        });
      }
      if (mode === "crop" || mode === "remote") {
        setTimeout(function() { renderFarmRentRatio(); }, 200);
      }
      if (mode !== "weather") {
        document.getElementById("map-weather-float")?.classList.add("hidden");
        document.getElementById("temp-scale-bar")?.classList.add("yzt-hidden");
        document.getElementById("weather-data-panel")?.classList.add("yzt-hidden");
        document.querySelector(".yzt-map-wrap")?.classList.remove("yzt-weather-scene");
        document.getElementById("plant-weather-left-panel")?.classList.add("yzt-hidden");
      }
    });
    /* 初次显示时同步激活状态 */
    updatePlantToolbarActive();
  })();

  /* ---- 地块类型图例 ---- */
  var plotTypeFilter = { tong: true, rent: true };
  function updatePlotTypeLegendUI() {
    document.querySelectorAll("#plot-type-legend .ptl-item").forEach(function(el) {
      var type = el.dataset.ptl;
      el.classList.toggle("active", plotTypeFilter[type]);
    });
  }
  function applyPlotTypeFilter() {
    if (!isPlantingDataTab()) return;
    refreshMap();
  }
  (function initPlotTypeLegend() {
    var el = document.getElementById("plot-type-legend");
    if (!el) return;
    el.addEventListener("click", function(e) {
      var item = e.target.closest(".ptl-item");
      if (!item) return;
      var type = item.dataset.ptl;
      var other = type === "tong" ? "rent" : "tong";
      if (plotTypeFilter[type] && !plotTypeFilter[other]) {
        // both selected → show all
        plotTypeFilter.tong = true;
        plotTypeFilter.rent = true;
      } else {
        // exclusive: only this type
        plotTypeFilter.tong = false;
        plotTypeFilter.rent = false;
        plotTypeFilter[type] = true;
      }
      updatePlotTypeLegendUI();
      applyPlotTypeFilter();
    });
  })();

  /* ---- 遥感监测二级按钮 ---- */
  var remoteSubMode = "nitrogen";
  function showRemoteSubs() {
    document.getElementById("dashboard")?.classList.add("yzt-remote-fullscreen");
    document.getElementById("remote-subs")?.classList.remove("yzt-hidden");
    setRemoteSubMode("nitrogen");
    showRSReportPanel();
  }
  function hideRemoteSubs() {
    document.getElementById("dashboard")?.classList.remove("yzt-remote-fullscreen");
    document.getElementById("remote-subs")?.classList.add("yzt-hidden");
    document.getElementById("remote-nutrient-card")?.classList.add("yzt-hidden");
    document.getElementById("remote-spectral-bar")?.classList.add("yzt-hidden");
    document.getElementById("remote-temp-bar")?.classList.add("yzt-hidden");
    document.getElementById("remote-quality-card")?.classList.add("yzt-hidden");
    hideRSReportPanel();
  }
  function setRemoteSubMode(mode) {
    remoteSubMode = mode;
    document.querySelectorAll("#remote-subs .rs-btn").forEach(function(b) {
      b.classList.toggle("active", b.dataset.rs === mode);
    });
    hideAllRemoteCards();
    if (mode === "nitrogen" || mode === "phosphorus" || mode === "potassium" || mode === "organic") {
      showRemoteNutrientCard(mode);
    } else if (mode === "moisture") {
      document.getElementById("remote-spectral-bar")?.classList.remove("yzt-hidden");
    } else if (mode === "soiltemp") {
      document.getElementById("remote-temp-bar")?.classList.remove("yzt-hidden");
    } else if (mode === "growth" || mode === "valuation") {
      showRemoteQualityCard(mode);
    }
  }
  function hideAllRemoteCards() {
    document.getElementById("remote-nutrient-card")?.classList.add("yzt-hidden");
    document.getElementById("remote-spectral-bar")?.classList.add("yzt-hidden");
    document.getElementById("remote-temp-bar")?.classList.add("yzt-hidden");
    document.getElementById("remote-quality-card")?.classList.add("yzt-hidden");
  }
  function showRemoteNutrientCard(mode) {
    var nameMap = { nitrogen: "氮含量等级", phosphorus: "磷含量等级", potassium: "钾含量等级", organic: "有机质含量等级" };
    var colors = ["#00FF88", "#88DD44", "#FFEB3B", "#FFB800", "#FF8C00", "#FF4444"];
    var labels = ["一级 · 极丰富", "二级 · 丰富", "三级 · 适量", "四级 · 偏低", "五级 · 缺乏", "六级 · 极缺"];
    document.getElementById("rnc-title").textContent = nameMap[mode] || "";
    document.getElementById("rnc-list").innerHTML = labels.map(function(l, i) {
      return '<div class="rnc-row"><span class="sw" style="background:' + colors[i] + '"></span>' + l + '</div>';
    }).join("");
    document.getElementById("remote-nutrient-card")?.classList.remove("yzt-hidden");
  }
  function showRemoteQualityCard(mode) {
    var nameMap = { growth: "作物长势等级", valuation: "作物估值等级" };
    var colors = ["#006837", "#1a9641", "#a6d96a", "#ffffbf", "#fdae61", "#f46d43", "#a50026"];
    var labels = ["很好", "好", "较好", "持平", "较差", "差", "很差"];
    document.getElementById("rqc-title").textContent = nameMap[mode] || "";
    document.getElementById("rqc-list").innerHTML = labels.map(function(l, i) {
      return '<div class="rqc-row"><span class="sw" style="background:' + colors[i] + '"></span>' + l + '</div>';
    }).join("");
    document.getElementById("remote-quality-card")?.classList.remove("yzt-hidden");
  }

  (function initRemoteSubs() {
    var el = document.getElementById("remote-subs");
    if (!el) return;
    el.addEventListener("click", function(e) {
      var btn = e.target.closest(".rs-btn");
      if (!btn) return;
      setRemoteSubMode(btn.dataset.rs);
    });
  })();

  /* ---- 遥感监测报告卡片 ---- */
  var RS_REPORTS = [
    { id: 1, name: "吉林省西部农田长势遥感监测报告", date: "2025年7月", area: "白城地区", filename: "report-01.html" },
    { id: 2, name: "吉林农垦耕地质量遥感评估报告",   date: "2025年6月", area: "松原地区", filename: "report-02.html" },
    { id: 3, name: "吉林省中部黑土地保护遥感监测",   date: "2025年5月", area: "长春地区", filename: "report-03.html" },
    { id: 4, name: "吉林西部盐碱地治理遥感评估",     date: "2025年8月", area: "白城/松原", filename: "report-04.html" },
    { id: 5, name: "吉林省农作物种植结构遥感提取",   date: "2025年4月", area: "全省",       filename: "report-05.html" },
    { id: 6, name: "吉林农垦土壤墒情遥感反演报告",   date: "2025年7月", area: "中西部地区", filename: "report-06.html" },
    { id: 7, name: "吉林省农业灾害遥感应急监测报告", date: "2025年6月", area: "全省",       filename: "report-07.html" },
    { id: 8, name: "吉林农垦高标准农田建设遥感监管", date: "2025年9月", area: "全省",       filename: "report-08.html" }
  ];

  function renderRSReportList() {
    var body = document.getElementById("rs-report-body");
    if (!body) return;
    body.innerHTML = RS_REPORTS.map(function(r) {
      return '<div class="yzt-rs-report-item" data-filename="' + r.filename + '" data-name="' + r.name + '">' +
        '<div class="yzt-rs-report-num">' + String(r.id).padStart(2, "0") + '</div>' +
        '<div class="yzt-rs-report-info">' +
          '<div class="yzt-rs-report-name">' + r.name + '</div>' +
          '<div class="yzt-rs-report-meta">' + r.date + ' · ' + r.area + '</div>' +
        '</div>' +
        '<div class="yzt-rs-report-arrow">▶</div>' +
      '</div>';
    }).join("");
  }

  function showRSReportPanel() {
    document.getElementById("rs-report-panel")?.classList.remove("yzt-hidden", "yzt-rs-collapsed");
    updateRSReportToggleArrow();
  }

  function hideRSReportPanel() {
    document.getElementById("rs-report-panel")?.classList.add("yzt-hidden");
  }

  function updateRSReportToggleArrow() {
    var toggle = document.getElementById("rs-report-toggle");
    var panel = document.getElementById("rs-report-panel");
    if (!toggle || !panel) return;
    var collapsed = panel.classList.contains("yzt-rs-collapsed");
    toggle.textContent = collapsed ? "▶" : "◀";
    toggle.title = collapsed ? "展开" : "收起";
  }

  function toggleRSReportPanel() {
    var panel = document.getElementById("rs-report-panel");
    if (!panel) return;
    if (panel.classList.contains("yzt-hidden")) {
      showRSReportPanel();
    } else {
      panel.classList.toggle("yzt-rs-collapsed");
      updateRSReportToggleArrow();
    }
  }

  function openPDFViewer(filename, title) {
    var overlay = document.getElementById("pdf-viewer-overlay");
    var iframe = document.getElementById("pdf-viewer-iframe");
    var titleEl = document.getElementById("pdf-viewer-title");
    if (!overlay || !iframe) return;
    iframe.src = "assets/reports/" + filename;
    if (titleEl) titleEl.textContent = title;
    overlay.classList.remove("hidden");
  }

  function closePDFViewer() {
    var overlay = document.getElementById("pdf-viewer-overlay");
    var iframe = document.getElementById("pdf-viewer-iframe");
    if (!overlay) return;
    overlay.classList.add("hidden");
    if (iframe) iframe.src = "";
  }

  function togglePDFFullscreen() {
    var dialog = document.querySelector(".yzt-pdf-viewer-dialog");
    if (!dialog) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      dialog.requestFullscreen();
    }
  }

  (function initRSReportPanel() {
    renderRSReportList();

    document.getElementById("rs-report-toggle")?.addEventListener("click", toggleRSReportPanel);

    document.getElementById("rs-report-body")?.addEventListener("click", function(e) {
      var item = e.target.closest(".yzt-rs-report-item");
      if (!item) return;
      openPDFViewer(item.dataset.filename, item.dataset.name);
    });

    document.getElementById("pdf-viewer-close")?.addEventListener("click", closePDFViewer);
    document.getElementById("pdf-viewer-fs")?.addEventListener("click", togglePDFFullscreen);
    document.getElementById("pdf-viewer-overlay")?.addEventListener("click", function(e) {
      if (e.target === this || e.target.classList.contains("yzt-pdf-viewer-bg")) {
        closePDFViewer();
      }
    });
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        var ov = document.getElementById("pdf-viewer-overlay");
        if (ov && !ov.classList.contains("hidden")) closePDFViewer();
      }
    });
  })();

  /* IoT 详情返回按钮 */
  document.getElementById("iot-detail-back")?.addEventListener("click", function() {
    selectedIotDevice = null;
    document.getElementById("iot-entity-card")?.classList.add("yzt-hidden");
    iotFilter.type = null;
    applyFilter();
    renderIotLeftPanel();
    resizeSideCharts();
  });

	/* 场景地块详情返回全局 */
	function restoreSceneOverview() {
		var pdCrop = document.getElementById("scene-panel-plot-detail");
		var pdWeather = document.getElementById("scene-panel-weather-plot");
		var pdSoil = document.getElementById("scene-panel-soil-plot");
		var mainCrop = document.getElementById("scene-panel-planting");
		var mainWeather = document.getElementById("scene-panel-weather");
		var mainSoil = document.getElementById("scene-panel-soil");
		var soilCard = document.getElementById("soil-plot-card");
		var plotCard = document.getElementById("plot-info-card");

		if (pdCrop) pdCrop.classList.add("yzt-hidden");
		if (pdWeather) pdWeather.classList.add("yzt-hidden");
		if (pdSoil) pdSoil.classList.add("yzt-hidden");
		if (soilCard) soilCard.classList.add("yzt-hidden");
		if (plotCard) plotCard.classList.add("yzt-hidden");

		if (sceneMode === "planting" && mainCrop) mainCrop.classList.remove("yzt-hidden");
		if (sceneMode === "weather" && mainWeather) mainWeather.classList.remove("yzt-hidden");
		if (sceneMode === "soil" && mainSoil) mainSoil.classList.remove("yzt-hidden");

		if (sceneMode === "weather") {
			document.getElementById("temp-scale-bar")?.classList.remove("yzt-hidden");
			document.getElementById("weather-data-panel")?.classList.remove("yzt-hidden");
		}
		if (sceneMode === "soil") {
			document.getElementById("soil-level-card")?.classList.remove("yzt-hidden");
			renderSoilLevelCard();
		}
		if (sceneMode === "planting") {
			document.getElementById("disaster-ticker")?.classList.remove("yzt-hidden");
		}

		activePlotId = null;
		resizeSideCharts();
	}

	document.getElementById("pd-back-crop")?.addEventListener("click", function() {
		restoreSceneOverview();
		renderScenePlanting();
	});
	document.getElementById("pd-back-weather")?.addEventListener("click", function() {
		restoreSceneOverview();
		renderSceneWeather();
	});
	document.getElementById("pd-back-soil")?.addEventListener("click", function() {
		restoreSceneOverview();
		renderSceneSoil();
	});

  /* 气象地块详情 Tab 切换 */
  (function() {
    var el = document.getElementById("weather-tabs");
    if (!el) return;
    el.addEventListener("click", function(e) {
      var tab = e.target.closest(".pic-tab");
      if (!tab) return;
      _weatherTab = tab.dataset.wt;
      el.querySelectorAll(".pic-tab").forEach(function(t) { t.classList.toggle("active", t.dataset.wt === _weatherTab); });
      var idx = 5;
      if (activePlotId) {
        var p = currentPlots.find(function(x) { return x.id === activePlotId; });
        if (p) idx = (p.lat + "").slice(-4) % 10;
      }
      renderWeatherTabChart(idx);
    });
  })();

  /* ---- 镇南组织结构图 ---- */
  var ORG_STRUCT = {
    title: "镇南种羊场 示范产业园区",
    groups: [
      { name: "科技创新中心", color: "#00D4FF", size: "lg", items: [
        { name: "耐碱作物现代制种基地", desc: "建设耐碱作物制种基地5000亩，配套现代化育种实验室及种子加工车间" },
        { name: "耐碱作物绿色种植示范", desc: "推广耐碱水稻、玉米等作物绿色高效种植技术，示范面积2万亩" },
        { name: "肉羊良种繁育基地", desc: "引进优质种羊5000只，建设标准化繁育舍及疫病防控体系" },
        { name: "生物有机肥加工", desc: "年产生物有机肥10万吨，实现种养循环利用" }
      ]},
      { name: "种业创新园（核心区）", color: "#00FF88", size: "xl", items: [
        { name: "耐碱作物现代制种基地", desc: "核心育种区2000亩，配套分子育种实验室及智能温室" },
        { name: "耐碱作物绿色种植示范", desc: "核心示范区1万亩，集成水肥一体化及智慧农业技术" },
        { name: "肉羊良种繁育基地", desc: "核心繁育区，引进澳洲白、杜泊等优质品种" },
        { name: "生物有机肥加工", desc: "核心加工区，采用好氧发酵工艺，年产5万吨" }
      ]},
      { name: "现代设施农业园", color: "#FFB800", size: "lg", items: [
        { name: "智能连栋温室建设", desc: "建设智能连栋温室10万㎡，配备自动环控及水肥系统" },
        { name: "工厂化食用菌建设", desc: "建设食用菌工厂化生产车间，年产食用菌3000吨" },
        { name: "新型日光温室建设", desc: "建设新型日光温室200栋，采用双层膜保温技术" },
        { name: "育苗育秧工厂建设", desc: "建设智能化育苗工厂，年供苗能力5000万株" }
      ]},
      { name: "智慧水稻种植园", color: "#4FC3F7", size: "lg", items: [
        { name: "大面积单产提升建设", desc: "推广水稻高产栽培技术，目标单产提升15%以上" },
        { name: "水稻无人农场建设", desc: "建设无人农场示范区，实现耕、种、管、收全程无人化" },
        { name: "稻虾/渔绿色共生基地", desc: "建设稻渔综合种养基地3000亩，实现一水两用、一田双收" },
        { name: "稻梦空间创意景观基地", desc: "打造稻田创意景观区，配套观景台及农耕文化展示" }
      ]},
      { name: "生态休闲园", color: "#B388FF", size: "sm", items: [
        { name: "玉米大地景观", desc: "打造百亩玉米大地艺术景观，结合灯光秀和夜间游览" },
        { name: "玉米工坊全产业链体验馆", desc: "建设玉米加工体验馆，展示从种植到餐桌的全产业链" },
        { name: "牧草循环经济体验馆", desc: "展示牧草种植-养殖-有机肥循环经济模式" },
        { name: "玉米迷宫矩阵", desc: "建设大型玉米迷宫，占地200亩，配套亲子游乐设施" },
        { name: "候鸟迁徙驿站", desc: "建设候鸟栖息保护区和观鸟平台，打造生态旅游亮点" },
        { name: "游客接待中心", desc: "建设游客服务中心，配套停车场、餐饮及住宿设施" }
      ]}
    ]
  };

  function showOrgPanel() {
    closeFarmPointPopup();
    document.getElementById("org-panel")?.classList.remove("yzt-hidden");
    document.getElementById("org-handle")?.classList.add("yzt-hidden");
  }

  function hideOrgPanel() {
    document.getElementById("org-panel")?.classList.add("yzt-hidden");
    document.getElementById("org-handle")?.classList.remove("yzt-hidden");
  }

  function renderOrgGrid() {
    var el = document.getElementById("org-grid");
    var detailEl = document.getElementById("org-detail");
    if (!el) return;
    if (detailEl) detailEl.innerHTML = "";
    el.innerHTML = ORG_STRUCT.groups.map(function(g) {
      return '<div class="org-group" data-size="' + g.size + '" style="background:linear-gradient(160deg, ' + g.color + '18 0%, rgba(8,20,35,0.85) 100%);border-color:' + g.color + '33">' +
        '<div class="org-group-head">' + g.name + '<span class="org-group-sub">' + g.items.length + '个项目</span></div>' +
        '</div>';
    }).join("");

    el.querySelectorAll(".org-group").forEach(function(groupEl, i) {
      groupEl.addEventListener("click", function() {
        var g = ORG_STRUCT.groups[i];
        var detailEl = document.getElementById("org-detail");
        if (!detailEl) return;
        var itemsHtml = g.items.map(function(item) {
          return '<div class="org-item" data-desc="' + item.desc + '">' +
            '<div class="org-item-name">' + item.name + '</div>' +
            '</div>';
        }).join("");
        detailEl.innerHTML = '<div class="org-detail-head">' + g.name + '</div>' +
          '<div class="org-detail-sub">共 ' + g.items.length + ' 个项目</div>' +
          '<div class="org-item-list">' + itemsHtml + '</div>' +
          '<button class="org-detail-back" id="org-detail-back">← 返回园区总览</button>';
        document.getElementById("org-detail-back")?.addEventListener("click", renderOrgGrid);

        /* 点击具体项目显示描述 */
        detailEl.querySelectorAll(".org-item").forEach(function(itemEl) {
          itemEl.addEventListener("click", function(e) {
            e.stopPropagation();
            var desc = itemEl.dataset.desc;
            detailEl.innerHTML = '<div class="org-detail-head">' + itemEl.querySelector(".org-item-name").textContent + '</div>' +
              '<div class="org-detail-sub">所属板块：' + g.name + '</div>' +
              '<div class="org-detail-body">' + desc + '</div>' +
              '<button class="org-detail-back" id="org-detail-back">← 返回项目列表</button>';
            document.getElementById("org-detail-back")?.addEventListener("click", function() { groupEl.click(); });
          });
        });
      });
    });
  }

  document.getElementById("org-close")?.addEventListener("click", hideOrgPanel);
  document.getElementById("org-handle")?.addEventListener("click", showOrgPanel);

  /* ---- 宗地明细拉手 & 表格弹窗 ---- */
  function showParcelTable() {
    document.getElementById("parcel-table-overlay")?.classList.remove("hidden");
    renderParcelTable();
  }

  function hideParcelTable() {
    document.getElementById("parcel-table-overlay")?.classList.add("hidden");
  }

  function renderParcelTable() {
    var tbody = document.getElementById("parcel-table-body");
    var subEl = document.getElementById("parcel-table-sub");
    if (!tbody) return;

    var parcels = getLandAnalysisParcels();
    var farmName = "";
    if (globalFilter.farm) {
      var s = (typeof SUBSIDIARIES !== "undefined" ? SUBSIDIARIES : []).find(function(x) { return x.id === globalFilter.farm; });
      farmName = s ? s.name : "";
    }
    if (subEl) {
      subEl.textContent = farmName ? farmName + " · 共 " + parcels.length + " 条宗地" : "集团全部 · 共 " + parcels.length + " 条宗地";
    }

    tbody.innerHTML = parcels.map(function(z, i) {
      var areaMu = (z.area * 15).toFixed(2);
      var base = z.base || {};
      return '<tr>' +
        '<td class="col-idx">' + (i + 1) + '</td>' +
        '<td class="col-name">' + escapeHtmlAttr(z.zoneName || "") + '</td>' +
        '<td class="col-code">' + escapeHtmlAttr(z.plotCode || "") + '</td>' +
        '<td class="col-area">' + areaMu + ' 亩</td>' +
        '<td class="col-right">' + escapeHtmlAttr(base.rightType || "—") + '</td>' +
        '<td class="col-use">' + escapeHtmlAttr(base.useType || "—") + '</td>' +
        '<td class="col-cert">' + escapeHtmlAttr(base.certStatus || "—") + '</td>' +
        '<td class="col-contractor">' + escapeHtmlAttr(base.contractor || "—") + '</td>' +
        '<td class="col-deadline">' + escapeHtmlAttr(base.certDeadline || "—") + '</td>' +
        '</tr>';
    }).join("");
  }

  document.getElementById("parcel-table-handle")?.addEventListener("click", showParcelTable);
  document.getElementById("parcel-table-close")?.addEventListener("click", hideParcelTable);
  document.getElementById("parcel-table-overlay")?.addEventListener("click", function(e) {
    if (e.target === this) hideParcelTable();
  });

  /* ---- Init ---- */
  initBottomTabs();
  bindLegendFilterClicks();
  initLayerToggles();
  initMap();
  applySidebarLayout("land");
  updateMapFilterScope();
  initCharts();
  initSeasonTabs();
  initFarmInvestTabs();
  renderLegend();
  renderMapLegend();
  applyPermission();
  renderMapLandStats();
  renderMapParcelLegend();
  requestAnimationFrame(() => {
    if (currentBottomTab === "land") renderLandAnalysis();
    else resizeSideCharts();
  });
  /* 延迟二次渲染，确保 ECharts 容器已完成布局并拥有正确尺寸 */
  setTimeout(() => {
    if (currentBottomTab === "land") renderLandAnalysis();
  }, 400);

  /* 从首页"示范园区一张图"卡片跳转时自动展示示范产业园区 */
  if (new URLSearchParams(window.location.search).get("show") === "park") {
    switchBottomTab("land");
    setTimeout(() => {
      showOrgPanel();
    }, 500);
  }

  /* ---- 交互说明弹窗 ---- */
  (function initHelpOverlay() {
    var overlay = document.getElementById("help-overlay");
    var btn = document.getElementById("help-btn");
    var closeBtn = document.getElementById("help-close");
    if (!overlay || !btn) return;

    btn.addEventListener("click", function() {
      overlay.classList.remove("hidden");
    });
    closeBtn?.addEventListener("click", function() {
      overlay.classList.add("hidden");
    });
    overlay.addEventListener("click", function(e) {
      if (e.target === overlay) overlay.classList.add("hidden");
    });

    /* Tab 切换 */
    overlay.querySelectorAll(".yzt-help-tab").forEach(function(tab) {
      tab.addEventListener("click", function() {
        var htab = tab.dataset.htab;
        overlay.querySelectorAll(".yzt-help-tab").forEach(function(t) { t.classList.remove("active"); });
        tab.classList.add("active");
        overlay.querySelectorAll(".yzt-help-panel").forEach(function(p) { p.classList.remove("active"); });
        var panel = overlay.querySelector('[data-hpanel="' + htab + '"]');
        if (panel) panel.classList.add("active");
      });
    });
  })();
})();
