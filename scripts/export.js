import { getGroupsByCategory, getItemsForGroup } from "./state.js";
import { renderStage, syncStageConnections } from "./render-stage.js";

// Helpers
// escapeHtml()              → HTML text and attributes
// escapeCssString()         → CSS string fragments inside url('...')
// normalizePlainText()      → flatten user-rich text into plain text
// renderItemTextToHtml()    → rich item label for map/list fallback
// renderAccessibleItemText()→ list override if present, else rich fallback
// getMapLinkText()          → hidden map/SVG link text
// getListLinkText()         → hidden list link text

function normalizePlainText(value) {
    return String(value || "")
        .replace(/^- /gm, "")
        .replace(/\r?\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function escapeCssString(value) {
    return String(value || "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replace(/\r?\n/g, " ");
}

function slugify(value) {
    return (
        String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "item"
    );
}

function renderItemTextToHtml(value) {
    const lines = String(value || "").split(/\r?\n/);
    const parts = [];
    let listBuffer = [];

    function flushList() {
        if (listBuffer.length === 0) return;

        parts.push(`
            <ul class="im-map__text-list">
                ${listBuffer
                    .map((item) => `<li>${escapeHtml(item)}</li>`)
                    .join("")}
            </ul>
        `);

        listBuffer = [];
    }

    lines.forEach((line) => {
        if (line.startsWith("- ")) {
            listBuffer.push(line.slice(2));
            return;
        }

        flushList();

        if (line === "") {
            parts.push("<br>");
            return;
        }

        parts.push(`<p class="im-map__text-line">${escapeHtml(line)}</p>`);
    });

    flushList();

    return parts.join("");
}

function renderAccessibleItemText(item) {
    const listName = normalizePlainText(item.listName);

    if (listName) {
        return escapeHtml(listName);
    }

    return renderItemTextToHtml(item.name);
}

function getMapLinkText(item) {
    if (!item) return "Lien";

    return (
        normalizePlainText(item.a11yText) ||
        normalizePlainText(item.name) ||
        "Lien"
    );
}

function getListLinkText(item) {
    if (!item) return "Lien";

    return (
        normalizePlainText(item.a11yText) ||
        normalizePlainText(item.listName) ||
        normalizePlainText(item.name) ||
        "Lien"
    );
}

function buildExportPathFromLiveStage(pathEl) {
    return pathEl?.getAttribute("d") || "";
}

function toCssUrlVarValue(url) {
    return url ? `url('${escapeHtml(escapeCssString(url))}')` : "none";
}

function toCssIconFallbackValue(url) {
    return url ? "transparent" : "currentColor";
}

function measureCategoryFromLiveStage(state, category, tempMount) {
    const previousActiveCategoryId = state.ui.activeCategoryId;
    state.ui.activeCategoryId = category.id;

    const tabsRoot = document.createElement("div");
    const stageRoot = document.createElement("div");

    tempMount.innerHTML = "";
    tempMount.appendChild(tabsRoot);
    tempMount.appendChild(stageRoot);

    renderStage(state, tabsRoot, stageRoot);
    syncStageConnections(state, stageRoot);

    const pathEls = [...stageRoot.querySelectorAll(".stage-connector")];
    const groups = getGroupsByCategory(state, category.id);

    const measured = groups.map((group, index) => {
        return {
            groupId: group.id,
            pathD: buildExportPathFromLiveStage(pathEls[index]),
            items: getItemsForGroup(state, group).sort(
                (a, b) => a.order - b.order,
            ),
        };
    });

    state.ui.activeCategoryId = previousActiveCategoryId;
    return measured;
}

function buildExportRowHtml(
    item,
    isBottomRow,
    forcedWidth = null,
    forcedHeight = null,
) {
    const textHtml = renderItemTextToHtml(item.name);
    const linkId = `link-${item.id}`;
    const safeWidth = Number.isFinite(forcedWidth) ? forcedWidth : null;
    const safeHeight = Number.isFinite(forcedHeight) ? forcedHeight : null;

    const sizeStyle = isBottomRow
        ? [
              safeWidth ? `width: ${safeWidth}px;` : "",
              safeHeight ? `height: ${safeHeight}px;` : "",
          ].join(" ")
        : "";

    return `
        <div
            class="im-map__row ${isBottomRow ? "im-map__row--anchor" : ""} ${item.linkUrl ? "im-map__row--linked" : ""}"
            style="color: var(--im-map-color); ${sizeStyle}"
        >
            ${
                item.linkUrl
                    ? `
                        <div class="im-map__row-hitbox">
                            <a
                                id="${linkId}"
                                href="${escapeHtml(item.linkUrl)}"
                                target="_blank"
                                rel="noreferrer noopener"
                            >${escapeHtml(getMapLinkText(item))}</a>
                        </div>
                    `
                    : ""
            }

            <div class="im-map__row-content">
                <div class="im-map__row-icon"></div>

                <div class="im-map__row-label">
                    <div class="im-map__row-textblock">
                        <div class="im-map__row-text">${textHtml}</div>
                    </div>

                    ${
                        item.linkUrl
                            ? `<div class="im-map__link-icon" aria-hidden="true"></div>`
                            : ""
                    }
                </div>
            </div>
        </div>
    `;
}

function buildConnectorSvgMarkup(entry, group, category) {
    const anchorItem = entry.items[entry.items.length - 1] || null;
    const href = anchorItem?.linkUrl?.trim() || "";
    const linkText = getMapLinkText(anchorItem);

    const inner = `
        <title>${escapeHtml(linkText)}</title>
        <path
            class="im-map__path"
            d="${escapeHtml(entry.pathD)}"
            style="stroke: ${escapeHtml(category.color)};"
        ></path>
        <circle
            class="im-map__dot-svg"
            cx="${group.dotX}"
            cy="${group.dotY}"
            r="8"
            style="fill: ${escapeHtml(category.color)};"
        ></circle>
    `;

    if (!href) {
        return inner;
    }

    return `
        <a
            class="im-map__connector-link"
            data-group-id="${group.id}"
            href="${escapeHtml(href)}"
            xlink:href="${escapeHtml(href)}"
            target="_blank"
        >
            ${inner}
        </a>
    `;
}

function buildCategoryLayerHtml(
    category,
    groups,
    measuredGroups,
    mapId
) {
    const layerId = `${mapId}-layer-${slugify(category.id)}`;

    const connectorSvgHtml = groups
        .map((group) => {
            const measured = measuredGroups.find(
                (entry) => entry.groupId === group.id,
            );
            if (!measured) return "";

            return buildConnectorSvgMarkup(measured, group, category);
        })
        .join("");

    const groupHtml = groups
        .map((group) => {
            const measured = measuredGroups.find(
                (entry) => entry.groupId === group.id,
            );
            if (!measured) return "";

            const rowsHtml = measured.items
                .map((item, index) =>
                    buildExportRowHtml(
                        item,
                        index === measured.items.length - 1,
                        index === measured.items.length - 1
                            ? group.labelWidth
                            : null,
                        index === measured.items.length - 1
                            ? group.labelHeight
                            : null,
                    ),
                )
                .join("");

            return `
                <div
                    class="im-map__group"
                    data-group-id="${group.id}"
                    style="left: ${group.labelX}px; top: ${group.labelY}px;"
                >
                    ${rowsHtml}
                </div>
            `;
        })
        .join("");

    return `
        <div
            id="${layerId}"
            class="im-map__layer collapse"
            aria-expanded="false"
            data-parent="#${mapId}-layers"
            style="--im-map-color: ${escapeHtml(category.color)}; --im-map-icon: ${toCssUrlVarValue(category.iconUrl)}; --im-map-icon-fallback: ${toCssIconFallbackValue(category.iconUrl)};"
        >
            <svg
                class="im-map__svg"
                viewBox="0 0 917 705"
                preserveAspectRatio="none"
            >
                ${connectorSvgHtml}
            </svg>

            ${groupHtml}
        </div>
    `;
}

function buildCategoryMenuHtml(categories, mapId) {
    return `
        <div class="im-map__menu">
            ${categories
                .map((category) => {
                    const layerId = `${mapId}-layer-${slugify(category.id)}`;

                    return `
                        <div class="im-map__menu-item" style="--im-map-color: ${escapeHtml(category.color)}; --im-map-icon: ${toCssUrlVarValue(category.iconUrl)}; --im-map-icon-fallback: ${toCssIconFallbackValue(category.iconUrl)};">
                            <div class="im-map__menu-link-content" style="color: var(--im-map-color);">
                                <div class="im-map__menu-icon"></div>
                                <div class="im-map__menu-label">${escapeHtml(category.name)}</div>
                            </div>

                            <div class="im-map__menu-hitbox">
                                <a
                                    class="im-map__menu-link collapsed"
                                    href="#${layerId}"
                                    aria-controls="${layerId}"
                                    aria-expanded="false"
                                    data-toggle="collapse"
                                    data-parent="#${mapId}-layers"
                                    role="button"
                                >${escapeHtml(category.name)}</a>
                            </div>
                        </div>
                    `;
                })
                .join("")}
        </div>
    `;
}

function buildAccessibleListHtml(state) {
    const categories = [...state.categories].sort((a, b) => a.order - b.order);

    return categories
        .map((category) => {
            const groups = getGroupsByCategory(state, category.id);

            const items = groups.flatMap((group) =>
                getItemsForGroup(state, group).sort(
                    (a, b) => a.order - b.order,
                ),
            );

            return `
                <div class="im-map__a11y-category">
                    <div class="im-map__a11y-title">${escapeHtml(category.name)}</div>
                    <ul class="im-map__a11y-list">
                        ${items
                            .map((item) => {
                                const linkId = `link-a11y-${item.id}`;

                                return `
                                    <li class="im-map__a11y-item ${item.linkUrl ? "is-linked" : ""}">
                                        <div
                                            class="im-map__a11y-item-content"
                                            style="color: ${escapeHtml(category.color)}; --im-map-icon: ${toCssUrlVarValue(category.iconUrl)}; --im-map-icon-fallback: ${toCssIconFallbackValue(category.iconUrl)};"
                                        >
                                            <div class="im-map__a11y-icon"></div>
                                            <div class="im-map__a11y-text">${renderAccessibleItemText(item)}</div>
                                        </div>

                                        ${
                                            item.linkUrl
                                                ? `
                                                    <a
                                                        id="${linkId}"
                                                        class="im-map__a11y-link"
                                                        href="${escapeHtml(item.linkUrl)}"
                                                        target="_blank"
                                                        rel="noreferrer noopener"
                                                    >${escapeHtml(getListLinkText(item))}</a>
                                                `
                                                : ""
                                        }
                                    </li>
                                `;
                            })
                            .join("")}
                    </ul>
                </div>
            `;
        })
        .join("");
}

function buildAccordionHtml(mapId, accessibleListHtml) {
    const accordionId = `${mapId}-a11y`;

    return `
        <div class="gl-accordeon veolcollapse im-map__accordion">
            <p>
                <a
                    class="gl-accordeon-titre collapsed"
                    href="#${accordionId}"
                    aria-controls="${accordionId}"
                    aria-expanded="false"
                    data-toggle="collapse"
                    role="button"
                    id="im-map-version-accessible-${mapId}"
                >

                    Afficher le contenu de la carte interactive en liste
                    <span class="glyphicon glyphicon-chevron-down">&nbsp;</span>&nbsp;
                </a>
            </p>

            <div class="gl-accordeon-expand collapse" aria-expanded="false" id="${accordionId}">
                <div class="gl-accordeon-content">
                    ${accessibleListHtml}
                </div>
            </div>
        </div>
    `;
}

function buildFallbackListHtml(accessibleListHtml) {
    return `
        <div class="im-map__fallback-list">
            ${accessibleListHtml}
        </div>
    `;
}

function buildPerMapStyleBlock(mapId, state) {
    const categories = [...state.categories].sort((a, b) => a.order - b.order);
    const groups = categories.flatMap((category) =>
        getGroupsByCategory(state, category.id),
    );

    const connectorHoverRules = groups
        .map(
            (group) => `
.${mapId} .im-map__layer:has(.im-map__connector-link[data-group-id="${group.id}"]:is(:hover, :focus)) .im-map__group[data-group-id="${group.id}"] .im-map__row--anchor .im-map__row-text {
    text-decoration: underline;
    background-color: var(--hover-focus-bg-color);
}
`,
        )
        .join("");

    if (!connectorHoverRules.trim()) {
        return "";
    }

    return `
<style>
${connectorHoverRules}
</style>
    `.trim();
}

export function generateCMSCode(state) {
    const mapId = `im-map-${Date.now()}`;
    const categories = [...state.categories].sort((a, b) => a.order - b.order);

    const tempMount = document.createElement("div");
    tempMount.style.position = "absolute";
    tempMount.style.left = "-99999px";
    tempMount.style.top = "0";
    tempMount.style.width = "917px";
    tempMount.style.height = "705px";
    tempMount.style.pointerEvents = "none";
    tempMount.style.opacity = "0";

    document.body.appendChild(tempMount);

    try {
        const measuredByCategory = categories.map((category) => ({
            category,
            measuredGroups: measureCategoryFromLiveStage(
                state,
                category,
                tempMount,
            ),
        }));

        const accessibleListHtml = buildAccessibleListHtml(state);

        // Use of internal VEOL CSS (external from this tool), `assets/interactive-map-base.css` is to be uploaded there and use as steelsheet
        const html = `
    <link rel="stylesheet" href="/documents/d/formation-intranet/interactive-map-base.css" />

    <div class="${mapId} im-map">
        <div><a class="sr-only" href="#im-map-version-accessible-${mapId}">Version accessible de la carte interactive</a></div>
        <div class="im-map__interactive">
            <div class="im-map__scene-frame">
                <div class="im-map__scale-shell">
                    <div class="im-map__viewport">
                        <div
                            class="im-map__map-image"
                            style="background-image: url('/documents/d/formation-intranet/map_913x900');"
                        ></div>

                        <div id="${mapId}-layers">
                            ${measuredByCategory
                                .map(({ category, measuredGroups }) =>
                                    buildCategoryLayerHtml(
                                        category,
                                        getGroupsByCategory(state, category.id),
                                        measuredGroups,
                                        mapId,
                                    ),
                                )
                                .join("")}
                        </div>
                    </div>
                </div>
            </div>

            ${buildCategoryMenuHtml(categories, mapId)}
        </div>

        ${buildAccordionHtml(mapId, accessibleListHtml)}

        ${buildFallbackListHtml(accessibleListHtml)}
    </div>

    ${buildPerMapStyleBlock(mapId, state)}
        `.trim();

        return html;
    } finally {
        if (tempMount.parentNode) {
            tempMount.parentNode.removeChild(tempMount);
        }
    }
}
