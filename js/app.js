(function () {
  "use strict";

  /* ---- 横6竖3 (6:3 = 2:1) 等比缩放至视口 ---- */
  const RATIO_W = 6;
  const RATIO_H = 3;
  const BASE_W = 3840;
  const BASE_H = BASE_W * RATIO_H / RATIO_W; // 1920

  let gisMap = null;

  function scaleDashboard() {
    const inner = document.getElementById("scale-inner");
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / BASE_W, h / BASE_H);
    inner.style.transform = `scale(${scale})`;
    inner.style.width = BASE_W + "px";
    inner.style.height = BASE_H + "px";
    if (gisMap) setTimeout(() => gisMap.invalidateSize(), 100);
    if (typeof drawOrgLinesRef === "function") setTimeout(drawOrgLinesRef, 120);
  }

  let drawOrgLinesRef = null;

  window.addEventListener("resize", scaleDashboard);
  scaleDashboard();

  /* ---- ECharts 数字孪生主题 ---- */
  const chartColors = ["#00FF88", "#00D4FF", "#FF9F43", "#00CC6A", "#66FFBB"];
  const chartText = "rgba(160, 200, 230, 0.65)";
  const chartFontSm = 34;
  const chartFontMd = 36;
  const chartFontLg = 40;
  const chartSplit = "rgba(0, 255, 160, 0.08)";
  const chartGlowLine = "rgba(0, 229, 255, 0.15)";
  const chartAxisLine = "rgba(0, 229, 255, 0.35)";
  const chartTextPri = "rgba(220, 240, 255, 0.9)";
  const chartFontNum = "'Orbitron', 'Noto Sans SC', sans-serif";

  function hexToRgba2(hex, alpha) {
    if (!hex || typeof hex !== "string") return "rgba(75, 85, 99, " + alpha + ")";
    var h = hex.trim().replace("#", "");
    if (h.length === 3) h = h.split("").map(function(c) { return c + c; }).join("");
    var n = parseInt(h, 16);
    if (isNaN(n)) return "rgba(75, 85, 99, " + alpha + ")";
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  function focusSubsidiary(id) {
    selectSubsidiary(id);
    openModal(id);
  }

  /* ---- 详情浮窗（业务板块 / 核心拓展共用） ---- */
  function openDetailPopover({ num = "", title, entity = "", bodyHtml }) {
    const overlay = document.getElementById("business-popover-overlay");
    const popNum = document.getElementById("business-pop-num");
    const popTitle = document.getElementById("business-pop-title");
    const popEntity = document.getElementById("business-pop-entity");
    const popBody = document.getElementById("business-pop-body");
    if (!overlay) return;
    popNum.textContent = num;
    popTitle.textContent = title;
    popEntity.textContent = entity;
    popEntity.style.display = entity ? "" : "none";
    popBody.innerHTML = bodyHtml;
    overlay.classList.remove("hidden");
  }

  function closeDetailPopover() {
    document.getElementById("business-popover-overlay")?.classList.add("hidden");
  }

  function bindDetailPopover() {
    document.getElementById("business-popover-close")?.addEventListener("click", closeDetailPopover);
    document.getElementById("business-popover-overlay")?.addEventListener("click", (e) => {
      if (e.target.id === "business-popover-overlay") closeDetailPopover();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeDetailPopover();
    });
  }

  function buildOrgStatsHtml(stats) {
    if (!stats?.length) return "";
    return `<div class="org-pop-stats">${stats.map((s) =>
      `<div class="org-pop-stat">
        <div class="org-pop-stat-val">${s.value}${s.unit ? `<em>${s.unit}</em>` : ""}</div>
        <div class="org-pop-stat-label">${s.label}</div>
      </div>`
    ).join("")}</div>`;
  }

  function buildOrgPopoverBody(detail) {
    const statsHtml = buildOrgStatsHtml(detail.stats);
    const detailsHtml = (detail.details || []).map((d) =>
      `<div class="business-detail-item"><div class="business-detail-label">${d.label}</div><div class="business-detail-text">${d.text}</div></div>`
    ).join("");
    const subsHtml = detail.subsidiaries?.length
      ? `<div class="expansion-pop-section">
          <div class="expansion-pop-section-title">下属单位</div>
          <ul class="achieve-pop-list">${detail.subsidiaries.map((s) => `<li>${s}</li>`).join("")}</ul>
        </div>`
      : "";
    return statsHtml + detailsHtml + subsHtml;
  }

  function buildRanchPopoverBody(sub) {
    const d = sub.detail;
    const statsHtml = buildOrgStatsHtml([
      { label: "经营面积", value: sub.area },
      { label: "确权率", value: sub.confirmRate },
      { label: "从业人数", value: d.employees }
    ]);
    const detailsHtml = [
      { label: "企业简介", text: d.profile },
      { label: "主导产业", text: d.industries },
      { label: "注册地址", text: d.address },
      { label: "成立时间", text: sub.founded }
    ].map((item) =>
      `<div class="business-detail-item"><div class="business-detail-label">${item.label}</div><div class="business-detail-text">${item.text}</div></div>`
    ).join("");
    const metricsHtml = `<div class="expansion-pop-section">
      <div class="expansion-pop-section-title">经营概况</div>
      <div class="org-pop-stats org-pop-stats-compact">
        <div class="org-pop-stat"><div class="org-pop-stat-val">${sub.business.revenue}</div><div class="org-pop-stat-label">营业收入</div></div>
        <div class="org-pop-stat"><div class="org-pop-stat-val">${sub.production.grain}</div><div class="org-pop-stat-label">粮食产量</div></div>
        <div class="org-pop-stat"><div class="org-pop-stat-val">${sub.devices.online}/${sub.devices.total}</div><div class="org-pop-stat-label">设备在线</div></div>
      </div>
    </div>`;
    return statsHtml + detailsHtml + metricsHtml;
  }

  function openOrgPopover(type, name) {
    if (type === "ranch") {
      const subId = ORG_RANCH_IDS?.[name];
      const sub = subId ? SUBSIDIARIES.find((s) => s.id === subId) : SUBSIDIARIES.find((s) => s.name === name);
      if (sub) {
        openDetailPopover({
          title: sub.name,
          entity: sub.detail.companyName,
          bodyHtml: buildRanchPopoverBody(sub)
        });
      }
      return;
    }
    const detail = type === "center" ? ORG_DETAILS?.center : ORG_DETAILS?.[name];
    if (!detail) return;
    openDetailPopover({
      title: type === "center" ? ORG_HUB.center : name,
      entity: detail.entity || detail.tag || "",
      bodyHtml: buildOrgPopoverBody(detail)
    });
  }

  function bindOrgNodeClick(el, handler) {
    el.classList.add("org-compact-clickable");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    el.addEventListener("click", handler);
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handler(e);
      }
    });
  }

  function buildSectorPopoverBody(sector) {
    const highlightsHtml = sector.highlights?.length
      ? `<div class="expansion-pop-section">
          <div class="expansion-pop-section-title">核心成果</div>
          <ul class="achieve-pop-list">${sector.highlights.map((h) => `<li>${h}</li>`).join("")}</ul>
        </div>`
      : "";

    const seen = new Set();
    const businessesHtml = (sector.businessIds || [])
      .map((id) => CORE_BUSINESS_MAP[id])
      .filter((seg) => seg && !seen.has(seg.id) && seen.add(seg.id))
      .map((seg) => `
        <div class="expansion-pop-business">
          <div class="expansion-pop-biz-head">
            <span class="expansion-pop-biz-title">${seg.title}</span>
            <span class="expansion-pop-biz-entity">${seg.entity}</span>
          </div>
          ${seg.details.map((d) =>
            `<div class="business-detail-item"><div class="business-detail-label">${d.label}</div><div class="business-detail-text">${d.text}</div></div>`
          ).join("")}
        </div>`)
      .join("");

    const businessSection = businessesHtml
      ? `<div class="expansion-pop-section">
          <div class="expansion-pop-section-title">业务主体</div>
          ${businessesHtml}
        </div>`
      : "";

    return highlightsHtml + businessSection;
  }

  /* ---- 核心业务拓展（四大板块糅合展示） ---- */
  function initBusinessExpansion() {
    if (typeof BUSINESS_EXPANSION === "undefined") return;

    const sectorsEl = document.getElementById("expansion-sectors");
    if (!sectorsEl) return;

    BUSINESS_EXPANSION.sectors.forEach((sector) => {
      const metrics = sector.metrics || [];
      const metricsHtml = metrics.map((m) =>
        `<div class="expansion-metric">
          <div class="expansion-metric-val"><span class="expansion-metric-num">${m.value}</span><span class="expansion-metric-unit">${m.unit}</span></div>
          <div class="expansion-metric-label">${m.label}</div>
        </div>`
      ).join("");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `expansion-sector expansion-sector-prominent ${sector.theme}`;
      btn.dataset.metrics = String(metrics.length);
      btn.innerHTML = `
        <div class="expansion-sector-title">${sector.title}</div>
        <div class="expansion-sector-metrics">${metricsHtml}</div>`;
      btn.addEventListener("click", () => {
        openDetailPopover({
          num: String(sector.num).padStart(2, "0"),
          title: sector.title,
          entity: sector.metrics?.[0]?.label || "",
          bodyHtml: buildSectorPopoverBody(sector)
        });
      });
      sectorsEl.appendChild(btn);
    });
  }

  function renderCoreBusinessTiles(container) {
    if (!container || typeof CORE_BUSINESS === "undefined") return;
    container.innerHTML = "";
    CORE_BUSINESS.forEach((seg) => {
      const el = document.createElement("button");
      el.type = "button";
      const isLong = seg.title.length > 7;
      el.className = `business-tile strategy-biz-tile ${seg.theme}${isLong ? " business-tile-long" : ""}`;
      el.innerHTML = `<span class="business-tile-title">${seg.title}</span>`;
      el.addEventListener("click", () => {
        openDetailPopover({
          num: seg.num,
          title: seg.title,
          entity: `主体：${seg.entity}`,
          bodyHtml: seg.details.map((d) =>
            `<div class="business-detail-item"><div class="business-detail-label">${d.label}</div><div class="business-detail-text">${d.text}</div></div>`
          ).join("")
        });
      });
      container.appendChild(el);
    });
  }

  function initStrategy12347() {
    const el = document.getElementById("strategy-12347");
    if (!el || typeof STRATEGY_12347 === "undefined") return;

    const s = STRATEGY_12347;
    el.innerHTML = `
      <div class="strategy-head">
        <span class="strategy-badge">12347</span>
        <span class="strategy-head-title">${s.title.replace("12347 ", "")}</span>
      </div>
      <div class="strategy-body">
        <div class="strategy-row strategy-row-top">
          <div class="strategy-block strategy-block-goal">
            <div class="strategy-num">${s.goal.num}<em>${s.goal.unit}</em></div>
            <div class="strategy-text">${s.goal.text}</div>
          </div>
          <div class="strategy-block">
            <div class="strategy-num">${s.transforms.num}<em>${s.transforms.unit}</em></div>
            <div class="strategy-chips">${s.transforms.items.map((t) => `<span class="strategy-chip">${t}</span>`).join("")}</div>
          </div>
          <div class="strategy-block">
            <div class="strategy-num">${s.steps.num}<em>${s.steps.unit}</em></div>
            <div class="strategy-steps">${s.steps.items.map((t, i) =>
              `${i > 0 ? '<span class="strategy-step-arrow">—</span>' : ""}<span class="strategy-chip strategy-chip-step">${t}</span>`
            ).join("")}</div>
          </div>
        </div>
        <div class="strategy-row strategy-row-bottom">
          <div class="strategy-block strategy-block-full">
            <div class="strategy-num">${s.positions.num}<em>${s.positions.unit}</em></div>
            <div class="strategy-chips">${s.positions.items.map((t) => `<span class="strategy-chip strategy-chip-pos">${t}</span>`).join("")}</div>
          </div>
        </div>
        <div class="strategy-seven-block">
          <div class="strategy-seven-head">
            <span class="strategy-num">${s.sectors.num}<em>${s.sectors.unit}</em></span>
            <span class="strategy-seven-hint">点击板块查看详情</span>
          </div>
          <div class="strategy-business-grid" id="business-grid"></div>
        </div>
      </div>`;

    renderCoreBusinessTiles(el.querySelector("#business-grid"));
  }

  function initTargets2026() {
    const el = document.getElementById("targets-2026");
    if (!el || typeof TARGETS_2026 === "undefined") return;

    el.innerHTML = `
      <div class="targets-head">${TARGETS_2026.title}</div>
      <div class="targets-metrics">
        ${TARGETS_2026.metrics.map((m) =>
          `<div class="targets-metric">
            <div class="targets-metric-val">${m.value}<em>${m.unit}${m.suffix || ""}</em></div>
            <div class="targets-metric-label">${m.label}</div>
          </div>`
        ).join("")}
      </div>`;
  }

  /* ---- 集团组织架构（中心辐射） ---- */
  function hubNodePct(stage, el) {
    return hubAnchorPct(stage, el, "center");
  }

  function hubAnchorPct(stage, el, anchor = "center") {
    const sr = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - sr.left;
    let cy;
    if (anchor === "top") cy = r.top - sr.top;
    else if (anchor === "bottom") cy = r.bottom - sr.top;
    else cy = r.top + r.height / 2 - sr.top;
    return {
      x: (cx / sr.width) * 100,
      y: (cy / sr.height) * 100
    };
  }

  function drawOrgHubLines() {
    const stage = document.getElementById("org-iso-stage");
    const svg = document.getElementById("org-hub-svg");
    if (!stage || !svg) return;

    const sr = stage.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${sr.width} ${sr.height}`);
    svg.innerHTML = "";

    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <linearGradient id="org-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(0,255,200,0.15)"/>
        <stop offset="50%" stop-color="rgba(0,255,200,0.85)"/>
        <stop offset="100%" stop-color="rgba(0,200,255,0.35)"/>
      </linearGradient>
      <linearGradient id="org-line-sub-grad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(0,220,255,0.5)"/>
        <stop offset="100%" stop-color="rgba(0,255,160,0.25)"/>
      </linearGradient>
      <filter id="org-line-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>`;
    svg.appendChild(defs);

    const center = stage.querySelector(".org-hub-center");
    if (!center) return;

    const c0 = hubNodePct(stage, center);

    function addArc(from, to, className, glowClass) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const bulge = Math.min(sr.width, sr.height) * 0.07;
      const cx = mx - (dy / Math.hypot(dx, dy || 1)) * bulge;
      const cy = my + (dx / Math.hypot(dx, dy || 1)) * bulge;
      const fx = (from.x / 100) * sr.width;
      const fy = (from.y / 100) * sr.height;
      const tx = (to.x / 100) * sr.width;
      const ty = (to.y / 100) * sr.height;
      const ccx = (cx / 100) * sr.width;
      const ccy = (cy / 100) * sr.height;
      const d = `M ${fx} ${fy} Q ${ccx} ${ccy} ${tx} ${ty}`;

      const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      glow.setAttribute("d", d);
      glow.setAttribute("class", glowClass || "org-hub-line org-hub-line-glow");
      svg.appendChild(glow);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", className);
      svg.appendChild(path);

      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", tx);
      dot.setAttribute("cy", ty);
      dot.setAttribute("r", className.includes("sub") ? 3 : 4);
      dot.setAttribute("class", "org-hub-line-dot");
      svg.appendChild(dot);
    }

    function addLine(from, to, className) {
      const fx = (from.x / 100) * sr.width;
      const fy = (from.y / 100) * sr.height;
      const tx = (to.x / 100) * sr.width;
      const ty = (to.y / 100) * sr.height;
      const d = `M ${fx} ${fy} L ${tx} ${ty}`;

      const glow = document.createElementNS("http://www.w3.org/2000/svg", "path");
      glow.setAttribute("d", d);
      glow.setAttribute("class", "org-hub-line org-hub-line-glow org-hub-line-glow-sub");
      svg.appendChild(glow);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", className);
      svg.appendChild(path);

      const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dot.setAttribute("cx", tx);
      dot.setAttribute("cy", ty);
      dot.setAttribute("r", 3);
      dot.setAttribute("class", "org-hub-line-dot org-hub-line-dot-sub");
      svg.appendChild(dot);
    }

    stage.querySelectorAll(".org-hub-satellite").forEach((node) => {
      const p = hubNodePct(stage, node);
      addArc(c0, p, "org-hub-line org-hub-line-main");
    });

    const nongken = stage.querySelector(".org-hub-nongken-branch");
    if (nongken) {
      const nkCard = nongken.querySelector(".org-hub-company-card") || nongken;
      const nkTop = hubAnchorPct(stage, nkCard, "top");
      const nkBottom = hubAnchorPct(stage, nkCard, "bottom");
      const cBottom = hubAnchorPct(stage, center, "bottom");
      addLine(cBottom, nkTop, "org-hub-line org-hub-line-trunk");

      stage.querySelectorAll(".org-hub-ranch-node").forEach((ranch) => {
        const pr = hubAnchorPct(stage, ranch, "top");
        addLine(nkBottom, pr, "org-hub-line org-hub-line-sub");
      });
    }
  }

  function createOrgCompanyCard(name, extraClass = "") {
    return `<div class="org-hub-company-card org-hub-card-3d ${extraClass}"><span class="org-hub-company-name">${name}</span></div>`;
  }

  function fitOrgHubStage(done) {
    const stage = document.getElementById("org-iso-stage");
    const layer = document.getElementById("org-hub-layer");
    const svg = document.getElementById("org-hub-svg");
    const bg = stage?.querySelector(".org-hub-bg");
    if (!stage || !layer) {
      if (done) done();
      return;
    }

    const baseRotate = "rotateX(7deg)";
    const syncTransform = (transform) => {
      layer.style.transform = transform;
      layer.style.transformOrigin = "50% 50%";
      if (bg) {
        bg.style.transform = transform;
        bg.style.transformOrigin = "50% 50%";
      }
    };

    syncTransform(baseRotate);
    if (svg) {
      svg.style.transform = "";
      svg.style.transformOrigin = "";
    }
    delete layer.dataset.fitScale;

    requestAnimationFrame(() => {
      const sr = stage.getBoundingClientRect();
      const nodes = layer.querySelectorAll(".org-hub-node");
      if (!nodes.length || sr.width < 10 || sr.height < 10) {
        if (done) done();
        return;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      nodes.forEach((node) => {
        const r = node.getBoundingClientRect();
        minX = Math.min(minX, r.left - sr.left);
        minY = Math.min(minY, r.top - sr.top);
        maxX = Math.max(maxX, r.right - sr.left);
        maxY = Math.max(maxY, r.bottom - sr.top);
      });

      const padX = 18;
      const padTop = 10;
      const padBottom = 6;
      const cw = maxX - minX + padX * 2;
      const ch = maxY - minY + padTop + padBottom;
      const scale = Math.min(1, sr.width / cw, sr.height / ch);

      const contentCx = (minX + maxX) / 2;
      const contentCy = (minY + maxY) / 2;
      const stageCx = sr.width / 2;
      const stageCy = sr.height / 2;
      const tx = stageCx - contentCx;
      const ty = stageCy - contentCy + padTop * 0.35;

      const transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) ${baseRotate} scale(${scale.toFixed(3)})`;
      syncTransform(transform);
      layer.dataset.fitScale = String(scale);

      if (done) requestAnimationFrame(done);
    });
  }

  function initOrgChart() {
    const container = document.getElementById("org-compact-container");
    if (!container || typeof ORG_HUB === "undefined") return;

    container.innerHTML = "";

    const tree = document.createElement("div");
    tree.className = "org-compact-tree";

    /* 集团中心 */
    const tierCenter = document.createElement("div");
    tierCenter.className = "org-compact-tier";
    const centerNode = document.createElement("div");
    centerNode.className = "org-compact-node is-center";
    centerNode.textContent = ORG_HUB.center;
    bindOrgNodeClick(centerNode, () => openOrgPopover("center"));
    tierCenter.appendChild(centerNode);
    tree.appendChild(tierCenter);

    /* 分隔 */
    const div1 = document.createElement("div");
    div1.className = "org-compact-divider";
    tree.appendChild(div1);

    /* 二级企业标签 */
    const labelTier = document.createElement("div");
    labelTier.className = "org-compact-tier";
    const label = document.createElement("div");
    label.className = "org-compact-label";
    label.textContent = "二级企业";
    labelTier.appendChild(label);
    tree.appendChild(labelTier);

    /* 卫星企业行 */
    const tierSat = document.createElement("div");
    tierSat.className = "org-compact-tier";
    (ORG_HUB.satellites || []).forEach((co, i) => {
      const node = document.createElement("div");
      node.className = "org-compact-node";
      node.style.animationDelay = `${i * 0.06 + 0.1}s`;
      node.textContent = co.name;
      bindOrgNodeClick(node, () => openOrgPopover("company", co.name));
      tierSat.appendChild(node);
    });
    tree.appendChild(tierSat);

    /* 分隔 */
    const div2 = document.createElement("div");
    div2.className = "org-compact-divider";
    tree.appendChild(div2);

    /* 农垦分支 */
    if (ORG_HUB.nongken) {
      const tierBranch = document.createElement("div");
      tierBranch.className = "org-compact-tier";

      const branchNode = document.createElement("div");
      branchNode.className = "org-compact-node is-branch";
      branchNode.style.animationDelay = "0.4s";
      branchNode.textContent = ORG_HUB.nongken.name;
      bindOrgNodeClick(branchNode, () => openOrgPopover("company", ORG_HUB.nongken.name));
      tierBranch.appendChild(branchNode);
      tree.appendChild(tierBranch);

      const divSm = document.createElement("div");
      divSm.className = "org-compact-divider-sm";
      tree.appendChild(divSm);

      const tierRanches = document.createElement("div");
      tierRanches.className = "org-compact-tier";
      (ORG_HUB.nongken.ranches || []).forEach((name, i) => {
        const leaf = document.createElement("div");
        leaf.className = "org-compact-node is-leaf";
        leaf.style.animationDelay = `${0.5 + i * 0.07}s`;
        leaf.textContent = name;
        bindOrgNodeClick(leaf, (e) => { e.stopPropagation(); openOrgPopover("ranch", name); });
        tierRanches.appendChild(leaf);
      });
      tree.appendChild(tierRanches);
    }

    container.appendChild(tree);
    drawOrgLinesRef = null;
  }

  /* ---- 核心产业园区（已移除右栏，保留兼容） ---- */
  let subIndex = 0;
  let subTimer = null;

  function selectSubsidiary(id) {
    const idx = SUBSIDIARIES.findIndex((s) => s.id === id);
    if (idx < 0) return;
    subIndex = idx;
    const spotName = document.getElementById("spot-name");
    if (!spotName) return;
    const s = SUBSIDIARIES[idx];
    spotName.textContent = s.name;
    document.getElementById("spot-profile").textContent = s.detail.profile;
    document.getElementById("spot-founded").textContent = s.founded;
    document.getElementById("spot-area").textContent = s.area;
    document.getElementById("spot-rate").textContent = s.confirmRate;
    document.getElementById("spot-industry").textContent = s.detail.industries;
    document.querySelectorAll(".sub-nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.id === id);
    });
  }

  function initSubsidiaryIntro() {
    const nav = document.getElementById("subsidiary-nav");
    if (!nav) return;

    SUBSIDIARIES.forEach((s) => {
      const item = document.createElement("div");
      item.className = "sub-nav-item";
      item.dataset.id = s.id;
      item.innerHTML = `<span class="sub-nav-name">${s.name}</span><span class="sub-nav-meta">${s.area} · ${s.crop}</span>`;
      item.addEventListener("click", () => {
        selectSubsidiary(s.id);
        resetSubTimer();
      });
      item.addEventListener("dblclick", () => openModal(s.id));
      nav.appendChild(item);
    });

    selectSubsidiary(SUBSIDIARIES[0].id);

    function resetSubTimer() {
      if (subTimer) clearInterval(subTimer);
      subTimer = setInterval(() => {
        subIndex = (subIndex + 1) % SUBSIDIARIES.length;
        selectSubsidiary(SUBSIDIARIES[subIndex].id);
      }, 6000);
    }
    resetSubTimer();
  }

  /* ---- 勋章墙（横向滚动） ---- */
  function initHonorWall() {
    const container = document.getElementById("honor-wall");
    if (!container || typeof HONOR_DATA === "undefined") return;

    const levelClass = { "国家级": "level-national", "省级": "level-province", "集团级": "level-group" };
    const levelIcon = { "国家级": "🏅", "省级": "🥈", "集团级": "🥉" };
    const levelLabel = { "国家级": "国家级", "省级": "省级", "集团级": "集团级" };

    // 渲染两份以实现无缝循环滚动
    const medals = HONOR_DATA.map((h) => {
      const cls = levelClass[h.level] || "level-group";
      const icon = levelIcon[h.level] || "🎖";
      const lbl = levelLabel[h.level] || h.level;
      return `<div class="honor-medal ${cls}">
        <span class="honor-medal-icon">${icon}</span>
        <span class="honor-medal-title">${h.title}</span>
        <span class="honor-medal-level">${lbl}</span>
      </div>`;
    }).join("");

    container.innerHTML = medals + medals;
    container.classList.add("auto-scroll");
  }

  /* ---- 左侧发展历程 ---- */
  function initTimelineLeft() {
    const container = document.getElementById("timeline-left");
    if (!container || typeof TIMELINE_DATA === "undefined") return;

    container.innerHTML = TIMELINE_DATA.map((t) =>
      `<div class="timeline-item">
        <span class="year">${t.year}</span>
        <span class="event">${t.event}</span>
      </div>`
    ).join("");
  }

  /* ---- PPT 导览进度点 ---- */
  function initPptProgress() {
    const dots = document.querySelectorAll(".ppt-dot");
    const panels = document.querySelectorAll(".ppt-slide");
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const slide = dot.dataset.slide;
        dots.forEach((d) => d.classList.toggle("active", d.dataset.slide === slide));
        panels.forEach((p) => {
          p.style.boxShadow = p.dataset.slide === slide
            ? "inset 0 0 60px rgba(0, 255, 136, 0.08), 0 0 30px rgba(0, 212, 255, 0.1)"
            : "";
        });
      });
    });
  }

  /* ---- Industry donut（保留兼容，首页已不用） ---- */
  function initIndustryChart() {
    const el = document.getElementById("chart-industry");
    if (!el) return;
    const chart = echarts.init(el);
    chart.setOption({
      color: chartColors,
      tooltip: { trigger: "item", formatter: "{b}<br/>占比：{c}%" },
      legend: {
        orient: "horizontal",
        bottom: 4,
        left: "center",
        itemGap: 20,
        textStyle: { color: chartText, fontSize: chartFontMd }
      },
      series: [{
        type: "pie",
        radius: ["32%", "52%"],
        center: ["50%", "42%"],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: "#030810", borderWidth: 2 },
        label: { show: false },
        emphasis: {
          scale: true,
          scaleSize: 6,
          label: { show: true, fontSize: chartFontMd, formatter: "{b}\n{d}%" }
        },
        data: INDUSTRY_DATA
      }]
    });
    window.addEventListener("resize", () => chart.resize());
  }

  /* ---- 土地利用（已移除中栏，保留函数兼容） ---- */
  function initLanduseChart() {
    const el = document.getElementById("chart-landuse");
    if (!el) return;
    const chart = echarts.init(el);
    chart.setOption({
      color: chartColors,
      tooltip: { trigger: "item", formatter: "{b}<br/>占比：{c}%" },
      legend: {
        orient: "horizontal",
        bottom: 12,
        left: "center",
        itemGap: 32,
        textStyle: { color: chartText, fontSize: chartFontLg }
      },
      series: [{
        type: "pie",
        radius: ["22%", "72%"],
        center: ["50%", "46%"],
        roseType: "area",
        itemStyle: { borderRadius: 4, borderColor: "#030810", borderWidth: 2 },
        label: {
          color: "#EAF6FF",
          fontSize: chartFontLg,
          formatter: "{b}\n{c}%"
        },
        labelLine: { length: 20, length2: 14 },
        data: LANDUSE_DATA
      }]
    });
    window.addEventListener("resize", () => chart.resize());
  }

  /* ---- GIS 卫星地图（首页已移除，保留兼容） ---- */
  function initMap() {
    const mapEl = document.getElementById("gis-map");
    if (!mapEl || typeof L === "undefined") return;

    const center = [43.886, 126.55];
    gisMap = L.map("gis-map", {
      center,
      zoom: 8,
      minZoom: 6,
      maxZoom: 16,
      zoomControl: false,
      attributionControl: false
    });

    /* 卫星影像底图 */
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18 }
    ).addTo(gisMap);

    /* 道路/标注叠加 */
    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      { maxZoom: 18, opacity: 0.6 }
    ).addTo(gisMap);

    /* 吉林省边界 - 青色描边 */
    L.geoJSON(JILIN_BOUNDARY, {
      style: {
        color: "#00D4FF",
        weight: 2,
        fillColor: "#001A20",
        fillOpacity: 0.3,
        dashArray: "6 4"
      }
    }).addTo(gisMap);

    SUBSIDIARIES.forEach((s, i) => {
      const plot = createPlotPolygon(s.lat, s.lng, 0.28 + i * 0.02);
      const isHighlight = i === 0;

      L.geoJSON(plot, {
        style: {
          color: isHighlight ? "#00FF88" : "#00D4FF",
          weight: isHighlight ? 3 : 2,
          fillColor: isHighlight ? "#00FF88" : "#00D4FF",
          fillOpacity: isHighlight ? 0.3 : 0.12
        }
      }).addTo(gisMap).on("click", () => focusSubsidiary(s.id));

      const icon = L.divIcon({
        className: "gis-marker" + (isHighlight ? " gis-marker-active" : ""),
        html: `<div class="marker-pulse"></div><div class="marker-core"></div><span class="marker-label">${s.name}</span>`,
        iconSize: [120, 48],
        iconAnchor: [60, 24]
      });

      L.marker([s.lat, s.lng], { icon })
        .addTo(gisMap)
        .on("click", () => focusSubsidiary(s.id));
    });

    /* 地图工具栏 */
    const zoomIn = document.getElementById("map-zoom-in");
    const zoomOut = document.getElementById("map-zoom-out");
    const mapReset = document.getElementById("map-reset");
    if (zoomIn) zoomIn.addEventListener("click", () => gisMap.zoomIn());
    if (zoomOut) zoomOut.addEventListener("click", () => gisMap.zoomOut());
    if (mapReset) mapReset.addEventListener("click", () => gisMap.setView(center, 8));

    setTimeout(() => gisMap.invalidateSize(), 300);
  }

  /* ---- Modal ---- */
  const overlay = document.getElementById("modal-overlay");
  const modalTitle = document.getElementById("modal-title");
  let currentSubsidiary = null;

  function openModal(id) {
    currentSubsidiary = SUBSIDIARIES.find((s) => s.id === id);
    if (!currentSubsidiary) return;
    modalTitle.textContent = currentSubsidiary.name;
    switchTab("basic");
    renderTab("basic");
    overlay.classList.remove("hidden");
  }

  function closeModal() {
    overlay.classList.add("hidden");
    currentSubsidiary = null;
  }

  document.getElementById("modal-close").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  function switchTab(tabName) {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach((p) => {
      p.classList.toggle("active", p.id === `tab-${tabName}`);
    });
  }

  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      switchTab(tab.dataset.tab);
      renderTab(tab.dataset.tab);
    });
  });

  function renderTab(tab) {
    if (!currentSubsidiary) return;
    const d = currentSubsidiary;
    const panel = document.getElementById(`tab-${tab}`);

    if (tab === "basic") {
      panel.innerHTML = `
        <div class="modal-grid">
          <div class="modal-card">
            <h3>基本信息</h3>
            <div class="info-row"><span class="label">公司名称</span><span class="value">${d.detail.companyName}</span></div>
            <div class="info-row"><span class="label">成立时间</span><span class="value">${d.detail.companyName.includes("白城") ? "1958年10月" : d.founded}</span></div>
            <div class="info-row"><span class="label">地址</span><span class="value">${d.detail.address}</span></div>
            <div class="info-row"><span class="label">法定代表人</span><span class="value">${d.detail.legalRep}</span></div>
            <div class="info-row"><span class="label">联系电话</span><span class="value">${d.detail.phone}</span></div>
          </div>
          <div class="modal-card">
            <h3>经营信息</h3>
            <div class="info-row"><span class="label">经营面积</span><span class="value highlight-blue">${d.detail.operatingArea}</span></div>
            <div class="info-row"><span class="label">确权面积</span><span class="value highlight-green">${d.detail.confirmedArea}</span></div>
            <div class="info-row"><span class="label">确权率</span><span class="value highlight-green">${d.detail.confirmRate}</span></div>
            <div class="info-row"><span class="label">员工人数</span><span class="value">${d.detail.employees}</span></div>
            <div class="info-row"><span class="label">主要产业</span><span class="value">${d.detail.industries}</span></div>
          </div>
          <div class="modal-card full">
            <h3>企业简介</h3>
            <p class="profile-text">${d.detail.profile}</p>
          </div>
        </div>`;
    }

    if (tab === "land") {
      panel.innerHTML = `
        <div class="modal-grid">
          <div class="modal-card">
            <h3>土地分类统计</h3>
            <div class="info-row"><span class="label">耕地</span><span class="value highlight-blue">${d.land.arable}公顷</span></div>
            <div class="info-row"><span class="label">草地</span><span class="value highlight-green">${d.land.grass}公顷</span></div>
            <div class="info-row"><span class="label">林地</span><span class="value">${d.land.forest}公顷</span></div>
            <div class="info-row"><span class="label">其他</span><span class="value">${d.land.other}公顷</span></div>
          </div>
          <div class="modal-card">
            <div id="modal-land-chart" class="modal-chart"></div>
          </div>
        </div>`;
      setTimeout(() => {
        const c = echarts.init(document.getElementById("modal-land-chart"));
        c.setOption({
          animationDuration: 1200,
          animationEasing: "cubicOut",
          color: chartColors,
          tooltip: { trigger: "item", backgroundColor: "rgba(4,12,28,0.95)", borderColor: "rgba(0,212,255,0.4)", textStyle: { color: "#e0f0ff", fontSize: 28 } },
          series: [{
            type: "pie", radius: ["40%", "65%"],
            itemStyle: { borderColor: "rgba(2,10,22,0.85)", borderWidth: 3, borderRadius: 2 },
            label: { color: chartTextPri, fontSize: 30 },
            emphasis: { scaleSize: 10, shadowBlur: 20, shadowColor: "rgba(0,255,136,0.45)" },
            data: [
              { name: "耕地", value: parseFloat(d.land.arable) },
              { name: "草地", value: parseFloat(d.land.grass) },
              { name: "林地", value: parseFloat(d.land.forest) },
              { name: "其他", value: parseFloat(d.land.other) }
            ]
          }]
        });
      }, 50);
    }

    if (tab === "business") {
      panel.innerHTML = `
        <div class="modal-grid">
          <div class="modal-card">
            <h3>经营指标</h3>
            <div class="info-row"><span class="label">年营收</span><span class="value highlight-blue">${d.business.revenue}</span></div>
            <div class="info-row"><span class="label">年利润</span><span class="value highlight-green">${d.business.profit}</span></div>
            <div class="info-row"><span class="label">规模化率</span><span class="value">${d.business.scaleRate}</span></div>
            <div class="info-row"><span class="label">合同数量</span><span class="value">${d.business.contracts}份</span></div>
          </div>
          <div class="modal-card">
            <div id="modal-biz-chart" class="modal-chart"></div>
          </div>
        </div>`;
      setTimeout(() => {
        const c = echarts.init(document.getElementById("modal-biz-chart"));
        c.setOption({
          animationDuration: 1200,
          animationEasing: "cubicOut",
          grid: { left: 60, right: 30, top: 30, bottom: 40 },
          xAxis: { type: "category", data: ["Q1", "Q2", "Q3", "Q4"], axisLabel: { color: chartTextPri, fontSize: 30, fontWeight: 500 }, axisLine: { lineStyle: { color: chartAxisLine, width: 1.5 } }, axisTick: { show: false } },
          yAxis: { type: "value", axisLabel: { color: chartText, fontSize: 30 }, splitLine: { lineStyle: { color: chartGlowLine, type: "dashed" } } },
          series: [{
            type: "bar", data: [0.6, 0.8, 0.9, 0.7].map(function(v) { return v * parseFloat(d.business.revenue); }),
            itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:"#00D4FF"},{offset:1,color:"rgba(0,212,255,0.2)"}]), borderRadius: [8,8,0,0], shadowBlur: 8, shadowColor: "rgba(0,212,255,0.4)" },
            barWidth: "36%",
            label: { show: true, position: "top", fontSize: 24, color: chartTextPri, fontFamily: chartFontNum }
          }]
        });
      }, 50);
    }

    if (tab === "production") {
      panel.innerHTML = `
        <div class="modal-grid">
          <div class="modal-card">
            <h3>生产概况</h3>
            <div class="info-row"><span class="label">粮食产量</span><span class="value highlight-blue">${d.production.grain}</span></div>
            <div class="info-row"><span class="label">畜牧存栏</span><span class="value highlight-green">${d.production.livestock}</span></div>
            <div class="info-row"><span class="label">综合产出率</span><span class="value">${d.production.yield}</span></div>
          </div>
          <div class="modal-card">
            <div id="modal-prod-chart" class="modal-chart"></div>
          </div>
        </div>`;
      setTimeout(() => {
        const c = echarts.init(document.getElementById("modal-prod-chart"));
        c.setOption({
          animationDuration: 1200,
          animationEasing: "cubicOut",
          radar: {
            indicator: [
              { name: "粮食", max: 100 },
              { name: "畜牧", max: 100 },
              { name: "产出率", max: 100 },
              { name: "品质", max: 100 },
              { name: "效率", max: 100 }
            ],
            axisName: { color: chartTextPri, fontSize: 30, fontWeight: 500 },
            splitLine: { lineStyle: { color: chartGlowLine } },
            splitArea: { areaStyle: { color: ["rgba(0,60,120,0.12)", "rgba(0,60,120,0.04)"] } }
          },
          series: [{
            type: "radar",
            data: [{ value: [85, 78, 92, 88, 80], areaStyle: { color: "rgba(0,212,255,0.25)" }, lineStyle: { color: "#00D4FF", width: 2, shadowBlur: 6, shadowColor: "rgba(0,212,255,0.4)" }, itemStyle: { color: "#00D4FF", shadowBlur: 6, shadowColor: "rgba(0,212,255,0.5)" } }]
          }]
        });
      }, 50);
    }

    if (tab === "device") {
      const dev = d.devices;
      panel.innerHTML = `
        <div class="device-grid">
          <div class="device-stat"><div class="num">${dev.total}</div><div class="lbl">设备总数</div></div>
          <div class="device-stat"><div class="num">${dev.online}</div><div class="lbl">在线设备</div></div>
          <div class="device-stat"><div class="num">${Math.round(dev.online / dev.total * 100)}%</div><div class="lbl">在线率</div></div>
          <div class="device-stat"><div class="num">${dev.sensors}</div><div class="lbl">传感器</div></div>
          <div class="device-stat"><div class="num">${dev.cameras}</div><div class="lbl">监控摄像头</div></div>
          <div class="device-stat"><div class="num">${dev.drones}</div><div class="lbl">无人机</div></div>
        </div>
        <div class="modal-card" style="margin-top:24px">
          <div id="modal-device-chart" class="modal-chart"></div>
        </div>`;
      setTimeout(() => {
        const c = echarts.init(document.getElementById("modal-device-chart"));
        c.setOption({
          animationDuration: 1200,
          animationEasing: "cubicOut",
          color: chartColors,
          tooltip: { trigger: "item", backgroundColor: "rgba(4,12,28,0.95)", borderColor: "rgba(0,212,255,0.4)", textStyle: { color: "#e0f0ff", fontSize: 28 } },
          legend: { bottom: 0, textStyle: { color: chartTextPri, fontSize: 30, fontWeight: 500 }, itemWidth: 18, itemHeight: 14 },
          series: [{
            type: "pie", radius: "60%",
            itemStyle: { borderColor: "rgba(2,10,22,0.85)", borderWidth: 3, borderRadius: 2 },
            label: { color: chartTextPri, fontSize: 30 },
            emphasis: { scaleSize: 10, shadowBlur: 20, shadowColor: "rgba(0,255,136,0.45)" },
            data: [
              { name: "传感器", value: dev.sensors },
              { name: "摄像头", value: dev.cameras },
              { name: "无人机", value: dev.drones },
              { name: "其他", value: dev.total - dev.sensors - dev.cameras - dev.drones }
            ]
          }]
        });
      }, 50);
    }
  }

  /* ---- 图片浮窗系统 ---- */
  var POPUP_CONFIGS = [
    {
      id: 1,
      hotzone: { left: 302, top: 1318, width: 300, height: 150 },
      float:   { left: 402, top: 1268 }
    },
    {
      id: 2,
      hotzone: { left: 777, top: 1475, width: 300, height: 150 },
      float:   { left: 890, top: 1285 }
    },
    {
      id: 3,
      hotzone: { left: 1274, top: 1531, width: 300, height: 150 },
      float:   { left: 1377, top: 1350 }
    },
    {
      id: 4,
      hotzone: { left: 1823, top: 1541, width: 300, height: 150 },
      float:   { left: 1963, top: 1217 }
    },
    {
      id: 5,
      hotzone: { left: 2412, top: 1524, width: 300, height: 150 },
      float:   { left: 2496, top: 1220 }
    },
    {
      id: 6,
      hotzone: { left: 2903, top: 1485, width: 300, height: 150 },
      float:   { left: 3068, top: 1311 }
    },
    {
      id: 7,
      hotzone: { left: 3397, top: 1344, width: 300, height: 150 },
      float:   { left: 2933, top: 1206 }
    },
    {
      id: 8,
      hotzone: { left: 724, top: 1102, width: 300, height: 150 },
      float:   { left: 729, top: 888 }
    },
    {
      id: 9,
      hotzone: { left: 1081, top: 1227, width: 300, height: 150 },
      float:   { left: 1184, top: 1058 }
    },
    {
      id: 10,
      hotzone: { left: 2464, top: 1174, width: 300, height: 150 },
      float:   { left: 1594, top: 847 }
    },
    {
      id: 11,
      hotzone: { left: 2798, top: 1083, width: 300, height: 150 },
      float:   { left: 3032, top: 960 }
    }
  ];

  POPUP_CONFIGS.forEach(function(cfg) {
    var hotzone = document.getElementById("popup-hotzone-" + cfg.id);
    var floatEl = document.getElementById("popup-float-" + cfg.id);
    if (!hotzone || !floatEl) return;

    hotzone.style.left = cfg.hotzone.left + "px";
    hotzone.style.top = cfg.hotzone.top + "px";
    hotzone.style.width = cfg.hotzone.width + "px";
    hotzone.style.height = cfg.hotzone.height + "px";

    floatEl.style.left = cfg.float.left + "px";
    floatEl.style.top = cfg.float.top + "px";

    hotzone.addEventListener("mouseenter", function() { floatEl.classList.remove("hidden"); });
    hotzone.addEventListener("mouseleave", function() { floatEl.classList.add("hidden"); });
  });

  /* ---- Toast 敬请期待 ---- */
  function openToast() {
    document.getElementById("toast-overlay")?.classList.remove("hidden");
  }
  function closeToast() {
    document.getElementById("toast-overlay")?.classList.add("hidden");
  }
  document.getElementById("toast-close")?.addEventListener("click", closeToast);
  document.getElementById("toast-overlay")?.addEventListener("click", (e) => {
    if (e.target.id === "toast-overlay") closeToast();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeToast();
  });

  /* ---- Footer entries ---- */
  document.querySelectorAll(".entry-card").forEach((card) => {
    card.addEventListener("click", () => {
      const target = card.dataset.target;
      if (target === "nongken") {
        window.location.href = "yizhangtu.html";
        return;
      }
      if (target === "park") {
        openParkOverlay();
        return;
      }
      openToast();
    });
  });

  /* 示范园区全屏覆盖 —— 关闭 / 切换 */
  function switchParkSlide(index) {
    document.querySelectorAll(".park-slide").forEach((s) => s.classList.toggle("active", Number(s.dataset.index) === index));
    document.querySelectorAll(".park-nav-btn").forEach((b) => b.classList.toggle("active", Number(b.dataset.index) === index));
  }
  function closeParkOverlay() {
    const overlay = document.getElementById("park-overlay");
    if (overlay) overlay.classList.add("hidden");
  }
  function openParkOverlay() {
    const overlay = document.getElementById("park-overlay");
    if (overlay) {
      overlay.classList.remove("hidden");
      switchParkSlide(0);
    }
  }
  document.getElementById("park-overlay-close")?.addEventListener("click", closeParkOverlay);
  document.getElementById("park-overlay")?.addEventListener("click", function(e) {
    if (e.target === this) closeParkOverlay();
  });
  document.querySelectorAll(".park-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchParkSlide(Number(btn.dataset.index)));
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const park = document.getElementById("park-overlay");
      if (park && !park.classList.contains("hidden")) closeParkOverlay();
    }
  });

  /* ---- Init ---- */
  initOrgChart();
  initHonorWall();
  initTimelineLeft();
  bindDetailPopover();
  initBusinessExpansion();
  initStrategy12347();
  initTargets2026();
  initPptProgress();
})();
