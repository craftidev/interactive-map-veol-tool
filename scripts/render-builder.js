// builder HTML rendering
// builder event binding

import {
    getGroupsByCategory,
    getItemsByCategory,
    getItemsForGroup,
    PRESET_CATEGORY_COLORS,
} from "./state.js";

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}

function renderMultilineText(value) {
    return escapeHtml(value || "");
}

function renderColorPalette(selectedColor = "") {
    return `
      <div class="color-palette">
        ${PRESET_CATEGORY_COLORS.map(
            (entry) => `
              <button
                type="button"
                class="color-swatch ${selectedColor.toLowerCase() === entry.value.toLowerCase() ? "is-active" : ""}"
                data-action="apply-color-swatch"
                data-color="${entry.value}"
                title="${escapeHtml(entry.name)} (${escapeHtml(entry.value)})"
                aria-label="${escapeHtml(entry.name)} (${escapeHtml(entry.value)})"
                style="--swatch-color: ${escapeHtml(entry.value)};"
              ></button>
            `,
        ).join("")}
      </div>
    `;
}

function renderCategoryForm(draft, mode, categoryId = "") {
    const title = mode === "edit" ? "Edit category" : "New category";
    const submitLabel = mode === "edit" ? "Save category" : "Create category";
    const cancelAction =
        mode === "edit" ? "cancel-edit-category" : "cancel-add-category";
    const submitAction =
        mode === "edit" ? "save-edit-category" : "save-new-category";

    return `
    <form class="inline-form" data-form-action="${submitAction}" data-category-id="${categoryId}">
      <div class="helper-text">${title}</div>

      <div class="form-grid">
        <div class="field">
          <label>Name</label>
          <input type="text" name="name" value="${escapeHtml(draft?.name || "")}" placeholder="Archives" required />
        </div>

        <div class="field">
          <label>Color</label>
          <input type="text" name="color" value="${escapeHtml(draft?.color || "#1f5eff")}" placeholder="#1f5eff" />
          ${renderColorPalette(draft?.color || "#1f5eff")}
        </div>

        <div class="field field--full">
          <label>Icon URL</label>
          <input type="text" name="iconUrl" value="${escapeHtml(draft?.iconUrl || "")}" placeholder="https://..." />
        </div>
      </div>

      <div class="form-actions">
        <button type="submit">${submitLabel}</button>
        <button type="button" data-action="${cancelAction}">Cancel</button>
      </div>
    </form>
  `;
}

function renderItemForm(draft, mode, categoryId, itemId = "") {
    const title = mode === "edit" ? "Edit item" : "New item";
    const submitLabel = mode === "edit" ? "Save item" : "Create item";
    const cancelAction =
        mode === "edit" ? "cancel-edit-item" : "cancel-add-item";
    const submitAction = mode === "edit" ? "save-edit-item" : "save-new-item";

    return `
    <form
      class="inline-form"
      data-form-action="${submitAction}"
      data-category-id="${categoryId}"
      data-item-id="${itemId}"
    >
      <div class="helper-text">${title}</div>

      <div class="form-grid">
        <div class="field field--full">
          <label>Name</label>
          <textarea
            name="name"
            rows="2"
            placeholder="EDF Smartside"
            required
          >${renderMultilineText(draft?.name || "")}</textarea>
        </div>

        <div class="field field--full">
          <label>Link URL (optional)</label>
          <input
            type="text"
            name="linkUrl"
            value="${escapeHtml(draft?.linkUrl || "")}"
            placeholder="https://..."
          />
        </div>
      </div>

      <div class="form-actions">
        <button type="submit">${submitLabel}</button>
        <button type="button" data-action="${cancelAction}">Cancel</button>
      </div>
    </form>
  `;
}

function renderGroupActionRow(state, category) {
    const selectedItems = state.ui.selectedItemIds.filter((itemId) => {
        const item = state.items.find(
            (currentItem) => currentItem.id === itemId,
        );
        return item && item.categoryId === category.id;
    });

    return `
      <div class="group-actions">
        <div class="group-actions__text">
          ${selectedItems.length} selected
        </div>

        <div class="toolbar">
          <button
            type="button"
            data-action="group-selected-items"
            data-category-id="${category.id}"
            ${selectedItems.length < 2 ? "disabled" : ""}
          >
            Group selected
          </button>

          <button
            type="button"
            data-action="clear-item-selection"
            data-category-id="${category.id}"
            ${selectedItems.length === 0 ? "disabled" : ""}
          >
            Clear selection
          </button>
        </div>
      </div>
    `;
}

function renderGroupContainer(state, category, group) {
    const items = getItemsForGroup(state, group).sort(
        (a, b) => a.order - b.order,
    );
    const groupSize = items.length;
    const isMulti = groupSize > 1;

    if (!isMulti) {
        return `
          <div class="builder-single-item">
            ${renderItemRow(state, items[0])}
          </div>
        `;
    }

    return `
      <section class="builder-group is-multi">
        <div class="builder-group__header">
          <div class="builder-group__title-row">
            <span class="item-badge">Grouped (${groupSize})</span>
          </div>

          <div class="toolbar">
            <button
              type="button"
              data-action="ungroup-item-group"
              data-item-id="${items[0]?.id || ""}"
            >
              Ungroup
            </button>
          </div>
        </div>

        <div class="builder-group__items">
          ${items.map((item) => renderItemRow(state, item)).join("")}
        </div>
      </section>
    `;
}

function renderItemRow(state, item) {
    const isEditing = state.ui.editingItemId === item.id;

    if (isEditing) {
        return renderItemForm(
            state.ui.draftItem,
            "edit",
            item.categoryId,
            item.id,
        );
    }

    const isSelected = state.ui.selectedItemIds.includes(item.id);

    return `
      <div class="item-row ${isSelected ? "is-selected" : ""}">
        <div class="item-row__top">
          <div class="item-row__main">
            <label class="item-row__select">
              <input
                type="checkbox"
                data-action="toggle-item-selection"
                data-item-id="${item.id}"
                ${isSelected ? "checked" : ""}
              />
              <span>Select</span>
            </label>

            <div class="item-row__content">
              <div class="item-row__title item-row__title--multiline">${escapeHtml(item.name)}</div>
              <div class="item-row__meta">
                ${
                    item.linkUrl
                        ? `<a class="item-row__link" href="${escapeHtml(item.linkUrl)}" target="_blank" rel="noreferrer noopener">link</a>`
                        : "No link"
                }
              </div>
            </div>
          </div>

          <div class="toolbar">
            <button type="button" data-action="edit-item" data-item-id="${item.id}">Edit</button>
            <button type="button" class="danger" data-action="delete-item" data-item-id="${item.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
}

function renderCategoryCard(state, category) {
    const isEditingCategory = state.ui.editingCategoryId === category.id;
    const isCollapsed = state.ui.collapsedCategoryIds.includes(category.id);
    const items = getItemsByCategory(state, category.id);
    const groups = getGroupsByCategory(state, category.id);
    const realGroupsCount = groups.filter(
        (group) => group.itemIds.length > 1,
    ).length;
    const iconStyle = category.iconUrl
        ? `style="background-image: url('${escapeHtml(category.iconUrl)}');"`
        : "";

    let cardBody = "";

    if (isEditingCategory) {
        cardBody = renderCategoryForm(
            state.ui.draftCategory,
            "edit",
            category.id,
        );
    } else if (!isCollapsed) {
        cardBody = `
          <div class="category-card__body">
            ${renderGroupActionRow(state, category)}

            <div class="category-card__stats">
              <span class="item-badge">${items.length} item${items.length > 1 ? "s" : ""}</span>
              <span class="item-badge">${realGroupsCount} group${realGroupsCount > 1 ? "s" : ""}</span>
            </div>

            ${
                groups.length === 0
                    ? `<div class="empty-state">No items in this category yet.</div>`
                    : groups
                          .map((group) =>
                              renderGroupContainer(state, category, group),
                          )
                          .join("")
            }

            ${
                state.ui.draftItem &&
                state.ui.draftItem.categoryId === category.id &&
                !state.ui.editingItemId
                    ? renderItemForm(state.ui.draftItem, "create", category.id)
                    : `
                      <div class="add-row">
                        <button type="button" data-action="add-item" data-category-id="${category.id}">
                          Add item
                        </button>
                      </div>
                    `
            }
          </div>
        `;
    }

    return `
      <section class="category-card ${isCollapsed ? "is-collapsed" : ""}" style="--category-color: ${escapeHtml(category.color)};">
        <div class="category-card__top">
          <div class="category-card__summary">
            <button
              type="button"
              class="category-card__collapse-btn"
              data-action="toggle-category-collapsed"
              data-category-id="${category.id}"
              aria-label="${isCollapsed ? "Expand category" : "Collapse category"}"
            >
              ${isCollapsed ? "▸" : "▾"}
            </button>

            <div class="category-card__icon" ${iconStyle}></div>

            <div>
              <div class="category-card__title">${escapeHtml(category.name)}</div>
              <div class="category-card__meta">
                ${items.length} item${items.length > 1 ? "s" : ""} · ${realGroupsCount} group${realGroupsCount > 1 ? "s" : ""}
              </div>
            </div>
          </div>

          <div class="toolbar">
            <button type="button" data-action="move-category-up" data-category-id="${category.id}">↑</button>
            <button type="button" data-action="move-category-down" data-category-id="${category.id}">↓</button>
            <button type="button" data-action="edit-category" data-category-id="${category.id}">Edit</button>
            <button type="button" class="danger" data-action="delete-category" data-category-id="${category.id}">Delete</button>
          </div>
        </div>

        ${cardBody}
      </section>
    `;
}

export function renderBuilder(state, builderRootEl) {
    const categories = [...state.categories].sort((a, b) => a.order - b.order);

    if (categories.length === 0) {
        builderRootEl.innerHTML = `
          <div class="empty-state">No categories yet.</div>
          ${state.ui.draftCategory ? renderCategoryForm(state.ui.draftCategory, "create") : ""}
        `;
        return;
    }

    builderRootEl.innerHTML = `
      ${
          state.ui.draftCategory && !state.ui.editingCategoryId
              ? renderCategoryForm(state.ui.draftCategory, "create")
              : ""
      }

      ${categories.map((category) => renderCategoryCard(state, category)).join("")}
    `;
}
