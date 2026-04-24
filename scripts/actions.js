// addCategory
// updateCategory
// deleteCategory
// addItem
// updateItem
// deleteItem
// createGroupForItem
// groupItems
// ungroup
// setActiveCategory
// moveCategory
// moveItem
// moveGroup
// moveDot

import {
    createDefaultGroupPlacement,
    createId,
    getCategoryById,
    getGroupById,
    getItemById,
    getItemsByCategory,
    getItemsForGroup,
    getMapBounds,
    getStageBounds,
    reindexOrders,
} from "./state.js";

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function clearEditingState(state) {
    state.ui.editingCategoryId = null;
    state.ui.editingItemId = null;
    state.ui.draftCategory = null;
    state.ui.draftItem = null;
}

function clearSelection(state) {
    state.ui.selectedItemIds = [];
}

function getCategoryGroups(state, categoryId) {
    return state.groups
        .filter((group) => group.categoryId === categoryId)
        .sort((a, b) => a.order - b.order);
}

function syncGroupCategoryFromItems(state, group) {
    const firstItem = getItemById(state, group.itemIds[0]);
    if (!firstItem) return;
    group.categoryId = firstItem.categoryId;
}

function normalizeGroupOrder(state, categoryId) {
    const groups = getCategoryGroups(state, categoryId);
    reindexOrders(groups);
}

export function setActiveCategory(state, categoryId) {
    const category = getCategoryById(state, categoryId);
    if (!category) return;

    state.ui.activeCategoryId = categoryId;
    ensureCategoryExpanded(state, categoryId);
    clearEditingState(state);
    clearSelection(state);
}

export function startAddCategory(state) {
    state.ui.editingCategoryId = null;
    state.ui.draftCategory = {
        name: "",
        color: "#1f5eff",
        iconUrl: "",
    };
}

export function cancelAddCategory(state) {
    state.ui.draftCategory = null;
}

export function saveNewCategory(state, values) {
    const newCategory = {
        id: createId("cat"),
        name: values.name.trim() || "Untitled category",
        color: values.color.trim() || "#1f5eff",
        iconUrl: values.iconUrl.trim(),
        order: state.categories.length,
    };

    state.categories.push(newCategory);
    state.ui.activeCategoryId = newCategory.id;
    ensureCategoryExpanded(state, newCategory.id);
    state.ui.draftCategory = null;
    clearSelection(state);
}

export function startEditCategory(state, categoryId) {
    const category = getCategoryById(state, categoryId);
    if (!category) return;

    state.ui.editingCategoryId = categoryId;
    state.ui.draftCategory = {
        name: category.name,
        color: category.color,
        iconUrl: category.iconUrl,
    };

    ensureCategoryExpanded(state, categoryId);
}

export function cancelEditCategory(state) {
    state.ui.editingCategoryId = null;
    state.ui.draftCategory = null;
}

export function saveEditedCategory(state, categoryId, values) {
    const category = getCategoryById(state, categoryId);
    if (!category) return;

    category.name = values.name.trim() || "Untitled category";
    category.color = values.color.trim() || "#1f5eff";
    category.iconUrl = values.iconUrl.trim();

    state.ui.editingCategoryId = null;
    state.ui.draftCategory = null;
}

export function deleteCategory(state, categoryId) {
    if (state.categories.length === 1) {
        return;
    }

    state.categories = state.categories.filter(
        (category) => category.id !== categoryId,
    );

    state.items = state.items.filter((item) => item.categoryId !== categoryId);
    state.groups = state.groups.filter(
        (group) => group.categoryId !== categoryId,
    );

    reindexOrders(state.categories);

    const nextActiveCategory = state.categories[0]?.id || null;
    state.ui.activeCategoryId = nextActiveCategory;
    clearEditingState(state);
    clearSelection(state);
}

export function moveCategory(state, categoryId, direction) {
    const ordered = [...state.categories].sort((a, b) => a.order - b.order);
    const currentIndex = ordered.findIndex(
        (category) => category.id === categoryId,
    );
    if (currentIndex === -1) return;

    const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= ordered.length) return;

    const [moved] = ordered.splice(currentIndex, 1);
    ordered.splice(targetIndex, 0, moved);

    state.categories = ordered;
    reindexOrders(state.categories);
}

function ensureCategoryExpanded(state, categoryId) {
    state.ui.collapsedCategoryIds = state.ui.collapsedCategoryIds.filter(
        (id) => id !== categoryId,
    );
}

export function startAddItem(state, categoryId) {
    state.ui.activeCategoryId = categoryId;
    state.ui.editingItemId = null;
    state.ui.draftItem = {
        categoryId,
        name: "",
        a11yText: "",
        linkUrl: "",
    };
    ensureCategoryExpanded(state, categoryId);
}

export function cancelAddItem(state) {
    state.ui.draftItem = null;
}

export function saveNewItem(state, categoryId, values) {
    const itemId = createId("item");
    const groupId = createId("group");
    const existingItems = getItemsByCategory(state, categoryId);
    const placement = createDefaultGroupPlacement(state.map);

    const newItem = {
        id: itemId,
        categoryId,
        groupId,
        name: values.name.trim() || "Untitled item",
        a11yText: values.a11yText.trim(),
        linkUrl: values.linkUrl.trim(),
        order: existingItems.length,
    };

    const newGroup = {
        id: groupId,
        categoryId,
        itemIds: [itemId],
        order: getCategoryGroups(state, categoryId).length,
        labelX: placement.labelX,
        labelY: placement.labelY,
        dotX: placement.dotX,
        dotY: placement.dotY,
        labelWidth: null,
        labelHeight: null,
    };

    state.items.push(newItem);
    state.groups.push(newGroup);
    state.ui.draftItem = null;
}

export function startEditItem(state, itemId) {
    const item = getItemById(state, itemId);
    if (!item) return;

    state.ui.editingItemId = itemId;
    state.ui.draftItem = {
        categoryId: item.categoryId,
        name: item.name,
        a11yText: item.a11yText || "",
        linkUrl: item.linkUrl,
    };
    state.ui.activeCategoryId = item.categoryId;
    ensureCategoryExpanded(state, item.categoryId);
}

export function cancelEditItem(state) {
    state.ui.editingItemId = null;
    state.ui.draftItem = null;
}

export function saveEditedItem(state, itemId, values) {
    const item = getItemById(state, itemId);
    if (!item) return;

    item.name = values.name.trim() || "Untitled item";
    item.a11yText = values.a11yText.trim();
    item.linkUrl = values.linkUrl.trim();

    const group = getGroupById(state, item.groupId);
    if (group) {
        group.labelWidth = null;
        group.labelHeight = null;
    }

    state.ui.editingItemId = null;
    state.ui.draftItem = null;
}

export function deleteItem(state, itemId) {
    const item = getItemById(state, itemId);
    if (!item) return;

    const categoryId = item.categoryId;
    const group = getGroupById(state, item.groupId);

    state.items = state.items.filter(
        (currentItem) => currentItem.id !== itemId,
    );

    if (group) {
        group.itemIds = group.itemIds.filter(
            (currentItemId) => currentItemId !== itemId,
        );

        if (group.itemIds.length === 0) {
            state.groups = state.groups.filter(
                (currentGroup) => currentGroup.id !== group.id,
            );
        } else {
            group.itemIds.forEach((groupItemId) => {
                const groupItem = getItemById(state, groupItemId);
                if (groupItem) {
                    groupItem.groupId = group.id;
                }
            });
            group.labelWidth = null;
            group.labelHeight = null;
            syncGroupCategoryFromItems(state, group);
        }
    }

    const categoryItems = state.items
        .filter((currentItem) => currentItem.categoryId === categoryId)
        .sort((a, b) => a.order - b.order);

    reindexOrders(categoryItems);
    normalizeGroupOrder(state, categoryId);

    state.ui.editingItemId = null;
    state.ui.draftItem = null;
    state.ui.selectedItemIds = state.ui.selectedItemIds.filter(
        (id) => id !== itemId,
    );
}

export function moveGroupLabel(
    state,
    groupId,
    nextX,
    nextY,
    groupWidth = 240,
    groupHeight = 84,
) {
    const group = getGroupById(state, groupId);
    if (!group) return;

    const stageBounds = getStageBounds(state.map);

    group.labelX = clamp(nextX, 0, stageBounds.width - groupWidth);
    group.labelY = clamp(nextY, 0, stageBounds.height - groupHeight);
}

export function moveGroupDot(state, groupId, nextX, nextY) {
    const group = getGroupById(state, groupId);
    if (!group) return;

    const mapBounds = getMapBounds(state.map);
    const dotRadius = 8;

    group.dotX = clamp(
        nextX,
        mapBounds.left + dotRadius,
        mapBounds.right - dotRadius,
    );
    group.dotY = clamp(
        nextY,
        mapBounds.top + dotRadius,
        mapBounds.bottom - dotRadius,
    );
}

export function toggleItemSelection(state, itemId) {
    const item = getItemById(state, itemId);
    if (!item) return;

    const selected = new Set(state.ui.selectedItemIds);

    if (selected.has(itemId)) {
        selected.delete(itemId);
    } else {
        const selectedItems = [...selected]
            .map((selectedItemId) => getItemById(state, selectedItemId))
            .filter(Boolean);

        const mixedCategory = selectedItems.some(
            (selectedItem) => selectedItem.categoryId !== item.categoryId,
        );

        if (mixedCategory) {
            selected.clear();
        }

        selected.add(itemId);
    }

    state.ui.activeCategoryId = item.categoryId;
    state.ui.selectedItemIds = [...selected];
}

export function groupSelectedItems(state, categoryId) {
    const selectedItems = state.ui.selectedItemIds
        .map((itemId) => getItemById(state, itemId))
        .filter(Boolean)
        .filter((item) => item.categoryId === categoryId);

    if (selectedItems.length < 2) {
        return;
    }

    const uniqueGroupIds = [
        ...new Set(selectedItems.map((item) => item.groupId)),
    ];
    const sourceGroups = uniqueGroupIds
        .map((groupId) => getGroupById(state, groupId))
        .filter(Boolean);

    if (sourceGroups.length === 0) return;

    const anchorGroup = sourceGroups[0];
    const mergedItemIds = [];
    const seenIds = new Set();

    selectedItems
        .slice()
        .sort((a, b) => a.order - b.order)
        .forEach((item) => {
            if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                mergedItemIds.push(item.id);
            }
        });

    sourceGroups.slice(1).forEach((group) => {
        const groupItems = getItemsForGroup(state, group)
            .slice()
            .sort((a, b) => a.order - b.order);

        groupItems.forEach((item) => {
            if (!seenIds.has(item.id)) {
                seenIds.add(item.id);
                mergedItemIds.push(item.id);
            }
        });
    });

    anchorGroup.itemIds = mergedItemIds;
    anchorGroup.categoryId = categoryId;
    anchorGroup.labelWidth = null;
    anchorGroup.labelHeight = null;

    mergedItemIds.forEach((itemId) => {
        const item = getItemById(state, itemId);
        if (item) {
            item.groupId = anchorGroup.id;
        }
    });

    const sourceGroupIdsToRemove = sourceGroups
        .slice(1)
        .map((group) => group.id);

    state.groups = state.groups.filter(
        (group) => !sourceGroupIdsToRemove.includes(group.id),
    );
    normalizeGroupOrder(state, categoryId);

    state.ui.selectedItemIds = mergedItemIds;
}

export function ungroupItemGroup(state, itemId) {
    const item = getItemById(state, itemId);
    if (!item) return;

    const group = getGroupById(state, item.groupId);
    if (!group || group.itemIds.length <= 1) {
        return;
    }

    const categoryId = item.categoryId;
    const originalItemIds = [...group.itemIds];
    const originalDotX = group.dotX;
    const originalDotY = group.dotY;
    const originalLabelX = group.labelX;
    const originalLabelY = group.labelY;

    const firstItemId = originalItemIds[0];
    group.itemIds = [firstItemId];
    group.labelWidth = null;
    group.labelHeight = null;

    const firstItem = getItemById(state, firstItemId);
    if (firstItem) {
        firstItem.groupId = group.id;
    }

    originalItemIds.slice(1).forEach((groupItemId, index) => {
        const newGroupId = createId("group");
        const groupItem = getItemById(state, groupItemId);
        if (!groupItem) return;

        groupItem.groupId = newGroupId;

        state.groups.push({
            id: newGroupId,
            categoryId,
            itemIds: [groupItemId],
            order: state.groups.length,
            labelX: originalLabelX + 18 * (index + 1),
            labelY: originalLabelY + 18 * (index + 1),
            dotX: originalDotX,
            dotY: originalDotY,
            labelWidth: null,
            labelHeight: null,
        });
    });

    normalizeGroupOrder(state, categoryId);
    clearSelection(state);
}

export function toggleCategoryCollapsed(state, categoryId) {
    const isCollapsed = state.ui.collapsedCategoryIds.includes(categoryId);

    if (isCollapsed) {
        state.ui.collapsedCategoryIds = state.ui.collapsedCategoryIds.filter(
            (id) => id !== categoryId,
        );
        return;
    }

    state.ui.collapsedCategoryIds = [
        ...state.ui.collapsedCategoryIds,
        categoryId,
    ];
}

export function clearCategorySelection(state, categoryId) {
    state.ui.selectedItemIds = state.ui.selectedItemIds.filter((itemId) => {
        const item = getItemById(state, itemId);
        return !item || item.categoryId !== categoryId;
    });
}

export function moveItemWithinGroup(state, itemId, direction) {
    const item = getItemById(state, itemId);
    if (!item) return;

    const group = getGroupById(state, item.groupId);
    if (!group || group.itemIds.length <= 1) return;

    const currentIndex = group.itemIds.findIndex((id) => id === itemId);
    if (currentIndex === -1) return;

    const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= group.itemIds.length) return;

    const [movedId] = group.itemIds.splice(currentIndex, 1);
    group.itemIds.splice(targetIndex, 0, movedId);

    const orderedItems = group.itemIds
        .map((groupItemId) => getItemById(state, groupItemId))
        .filter(Boolean);

    reindexOrders(orderedItems);

    group.labelWidth = null;
    group.labelHeight = null;
}
