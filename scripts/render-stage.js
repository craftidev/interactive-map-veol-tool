import {
    getCategoryById,
    getGroupsByCategory,
    getItemsForGroup,
    getMapBounds,
} from "./state.js";

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function renderStageItemText(value) {
    return escapeHtml(value || "");
}

function buildStageTabs(state) {
    if (state.categories.length === 0) {
        return '<div class="empty-state">No categories yet.</div>';
    }

    return `
    <div class="stage-tabs">
      ${state.categories
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((category) => {
              const isActive = category.id === state.ui.activeCategoryId;

              return `
            <button
              type="button"
              class="stage-tab ${isActive ? "is-active" : ""}"
              data-action="set-active-category"
              data-category-id="${category.id}"
              style="color: ${escapeHtml(category.color)};"
            >
              <span class="stage-tab__swatch"></span>
              <span class="stage-tab__label">${escapeHtml(category.name)}</span>
            </button>
          `;
          })
          .join("")}
    </div>
  `;
}

function buildConnectorPathWithUnderline(
    leftPoint,
    rightPoint,
    dotCenter,
    side,
) {
    const underlineStart = side === "left" ? rightPoint : leftPoint;
    const underlineEnd = side === "left" ? leftPoint : rightPoint;

    const dotRadius = 8;

    const end = {
        x: side === "left" ? dotCenter.x + dotRadius : dotCenter.x - dotRadius,
        y: dotCenter.y,
    };

    const start = underlineEnd;
    const dx = end.x - start.x;
    const absDx = Math.abs(dx);
    const horizontalPush = Math.max(34, Math.min(96, absDx * 0.35));
    const firstDirection = side === "left" ? -1 : 1;

    const c1 = {
        x: start.x + horizontalPush * firstDirection,
        y: start.y,
    };

    const c2 = {
        x: end.x - horizontalPush * firstDirection,
        y: end.y,
    };

    return `M ${underlineStart.x} ${underlineStart.y} L ${underlineEnd.x} ${underlineEnd.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function buildStageGroupItem(category, item, isBottomItem, forcedWidth = null) {
    const iconStyle = category.iconUrl
        ? `style="background-image: url('${escapeHtml(category.iconUrl)}'); --stage-icon-fallback: transparent;"`
        : "";

    return `
      <div
        class="stage-group-row ${isBottomItem ? "has-underline is-bottom" : "is-background"}"
        data-role="${isBottomItem ? "connector-anchor" : "stack-row"}"
        style="color: ${escapeHtml(category.color)};"
      >
        <div class="stage-group__icon" ${iconStyle}></div>

        <div class="stage-group__textblock">
          <div class="stage-group__item stage-group__item-text">${renderStageItemText(item.name)}</div>
        </div>
      </div>
    `;
}

function buildStageGroup(category, group, items, isSelected) {
    return `
    <div
      class="stage-group ${isSelected ? "is-selected" : ""}"
      style="left: ${group.labelX}px; top: ${group.labelY}px;"
      data-group-id="${group.id}"
      data-drag-kind="group"
    >
      ${items
          .map((item, index) =>
              buildStageGroupItem(
                  category,
                  item,
                  index === items.length - 1,
                  index === items.length - 1 ? group.labelWidth : null,
              ),
          )
          .join("")}
    </div>
  `;
}

function buildStageDot(category, group) {
    return `
    <button
      type="button"
      class="stage-dot"
      data-group-id="${group.id}"
      data-drag-kind="dot"
      aria-label="Move map point"
      style="
        left: ${group.dotX}px;
        top: ${group.dotY}px;
        color: ${escapeHtml(category.color)};
      "
    ></button>
  `;
}

function buildStageCanvas(state) {
    const activeCategory = getCategoryById(state, state.ui.activeCategoryId);

    if (!activeCategory) {
        return `
      <div class="stage-shell">
        <div class="stage-canvas">
          <div class="stage-empty">No active category.</div>
        </div>
      </div>
    `;
    }

    const groups = getGroupsByCategory(state, activeCategory.id);
    const mapBounds = getMapBounds(state.map);

    return `
    <div class="stage-shell">
      <div class="stage-canvas" id="stage-canvas">
        <div class="stage-map-area"></div>

        <svg
          id="stage-connections"
          class="stage-connections"
          viewBox="0 0 ${state.map.stageWidth} ${state.map.stageHeight}"
          preserveAspectRatio="none"
          aria-hidden="true"
        ></svg>

        ${
            groups.length === 0
                ? `<div class="stage-empty">This category has no items on stage yet.</div>`
                : groups
                      .map((group) => {
                          const items = getItemsForGroup(state, group);
                          const isSelected = items.some((item) =>
                              state.ui.selectedItemIds.includes(item.id),
                          );

                          return buildStageGroup(
                              activeCategory,
                              group,
                              items,
                              isSelected,
                          );
                      })
                      .join("") +
                  groups
                      .map((group) => buildStageDot(activeCategory, group))
                      .join("")
        }

        <div
          class="stage-map-hitbox"
          style="
            left: ${mapBounds.left}px;
            top: ${mapBounds.top}px;
            width: ${mapBounds.width}px;
            height: ${mapBounds.height}px;
          "
          aria-hidden="true"
        ></div>
      </div>
    </div>
  `;
}

export function renderStage(state, tabsRootEl, stageRootEl) {
    tabsRootEl.innerHTML = buildStageTabs(state);
    stageRootEl.innerHTML = buildStageCanvas(state);
}

export function syncStageConnections(state, stageRootEl) {
    const stageCanvasEl = stageRootEl.querySelector("#stage-canvas");
    const svgEl = stageRootEl.querySelector("#stage-connections");

    if (!stageCanvasEl || !svgEl) {
        return;
    }

    const activeCategory = getCategoryById(state, state.ui.activeCategoryId);
    if (!activeCategory) {
        svgEl.innerHTML = "";
        return;
    }

    const groups = getGroupsByCategory(state, activeCategory.id);
    const canvasRect = stageCanvasEl.getBoundingClientRect();

    const paths = groups.map((group) => {
        const groupEl = stageRootEl.querySelector(
            `.stage-group[data-group-id="${group.id}"]`,
        );
        if (!groupEl) return "";

        const anchorEl = groupEl.querySelector(
            '[data-role="connector-anchor"]',
        );
        if (!anchorEl) return "";

        const anchorRect = anchorEl.getBoundingClientRect();

        const leftPoint = {
            x: anchorRect.left - canvasRect.left,
            y: anchorRect.bottom - canvasRect.top,
        };

        const rightPoint = {
            x: anchorRect.right - canvasRect.left,
            y: anchorRect.bottom - canvasRect.top,
        };

        const underlineMidX = (leftPoint.x + rightPoint.x) / 2;
        const side = group.dotX < underlineMidX ? "left" : "right";

        const dotCenter = {
            x: group.dotX,
            y: group.dotY,
        };

        return `
            <path
              class="stage-connector"
              d="${buildConnectorPathWithUnderline(leftPoint, rightPoint, dotCenter, side)}"
              style="stroke: ${escapeHtml(activeCategory.color)};"
            ></path>
        `;
    });

    svgEl.innerHTML = paths.join("");
}

export function syncStageLabelWidths(state, stageRootEl) {
    const groups = state.groups || [];

    groups.forEach((group) => {
        const groupEl = stageRootEl.querySelector(
            `.stage-group[data-group-id="${group.id}"]`,
        );
        const anchorEl = groupEl?.querySelector('[data-role="connector-anchor"]');

        if (!anchorEl) return;

        const measuredWidth = Math.round(anchorEl.offsetWidth);

        if (!Number.isFinite(measuredWidth) || measuredWidth <= 0) {
            return;
        }

        if (group.labelWidth !== measuredWidth) {
            group.labelWidth = measuredWidth;
        }
    });
}
