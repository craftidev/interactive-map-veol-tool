// initial state
// id generation
// selectors
// maybe clone/import/export helpers

export const APP_STATE_VERSION = 2;

const DEFAULT_MAP = {
    imageUrl: "",
    imageWidth: 508,
    imageHeight: 501,
    stageWidth: 917,
    stageHeight: 705,
    stagePadding: {
        top: 102,
        right: 205,
        bottom: 102,
        left: 204,
    },
};

export const PRESET_CATEGORY_COLORS = [
    { name: "Dark blue", value: "#001A70" },
    { name: "Medium blue", value: "#1057C8" },
    { name: "Light blue", value: "#1089FF" },
    { name: "Dark orange", value: "#FE5815" },
    { name: "Medium orange", value: "#FF861D" },
    { name: "Light orange", value: "#FFB210" },
    { name: "Dark green", value: "#4F9E30" },
    { name: "Medium green", value: "#88D910" },
    { name: "Light green", value: "#C0E410" },
    { name: "Web dark orange", value: "#D6430A" },
    { name: "Web dark green", value: "#307A10" },
];

let idCounter = 0;

export function createId(prefix) {
    idCounter += 1;
    return `${prefix}_${idCounter}`;
}

export function createInitialState() {
    const categoryId = createId("cat");
    const itemId = createId("item");
    const groupId = createId("group");

    const firstGroupPosition = createDefaultGroupPlacement(DEFAULT_MAP);

    return {
        meta: {
            version: APP_STATE_VERSION,
        },

        map: structuredClone(DEFAULT_MAP),

        categories: [
            {
                id: categoryId,
                name: "Archives",
                color: "#1f5eff",
                iconUrl: "",
                order: 0,
            },
        ],

        items: [
            {
                id: itemId,
                categoryId,
                groupId,
                name: "EDF Smartside",
                linkUrl: "",
                order: 0,
            },
        ],

        groups: [
            {
                id: groupId,
                categoryId,
                itemIds: [itemId],
                order: 0,
                labelX: firstGroupPosition.labelX,
                labelY: firstGroupPosition.labelY,
                dotX: firstGroupPosition.dotX,
                dotY: firstGroupPosition.dotY,
                labelWidth: null,
            },
        ],

        ui: {
            activeCategoryId: categoryId,
            selectedItemIds: [],
            editingCategoryId: null,
            editingItemId: null,
            draftCategory: null,
            draftItem: null,
            collapsedCategoryIds: [],
        },
    };
}

export function sortByOrder(list) {
    return [...list].sort((a, b) => a.order - b.order);
}

export function reindexOrders(list) {
    list.forEach((item, index) => {
        item.order = index;
    });
}

export function getCategoryById(state, categoryId) {
    return (
        state.categories.find((category) => category.id === categoryId) || null
    );
}

export function getItemById(state, itemId) {
    return state.items.find((item) => item.id === itemId) || null;
}

export function getGroupById(state, groupId) {
    return state.groups.find((group) => group.id === groupId) || null;
}

export function getItemsByCategory(state, categoryId) {
    return sortByOrder(
        state.items.filter((item) => item.categoryId === categoryId),
    );
}

export function getGroupsByCategory(state, categoryId) {
    return sortByOrder(
        state.groups.filter((group) => group.categoryId === categoryId),
    );
}

export function getItemsForGroup(state, group) {
    return group.itemIds
        .map((itemId) => getItemById(state, itemId))
        .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Geometry helpers                                                            */
/* -------------------------------------------------------------------------- */

export function getMapBounds(map) {
    return {
        left: map.stagePadding.left,
        top: map.stagePadding.top,
        width: map.imageWidth,
        height: map.imageHeight,
        right: map.stagePadding.left + map.imageWidth,
        bottom: map.stagePadding.top + map.imageHeight,
    };
}

export function getStageBounds(map) {
    return {
        left: 0,
        top: 0,
        width: map.stageWidth,
        height: map.stageHeight,
        right: map.stageWidth,
        bottom: map.stageHeight,
    };
}

export function createDefaultGroupPlacement(map) {
    const stageBounds = getStageBounds(map);
    const mapBounds = getMapBounds(map);

    return {
        labelX: Math.round(stageBounds.width / 2 - 110),
        labelY: Math.round(stageBounds.height / 2 - 42),
        dotX: Math.round(mapBounds.left + mapBounds.width / 2),
        dotY: Math.round(mapBounds.top + mapBounds.height / 2),
    };
}

export function syncIdCounterFromState(state) {
    const allIds = [
        ...(state.categories || []).map((entry) => entry.id),
        ...(state.items || []).map((entry) => entry.id),
        ...(state.groups || []).map((entry) => entry.id),
    ];

    let maxSeen = 0;

    allIds.forEach((id) => {
        const match = String(id).match(/_(\d+)$/);
        if (!match) return;

        const numericPart = Number(match[1]);
        if (Number.isFinite(numericPart)) {
            maxSeen = Math.max(maxSeen, numericPart);
        }
    });

    idCounter = maxSeen;
}

export function normalizeLoadedState(rawState) {
    const fallback = createInitialState();

    const nextState = {
        meta: {
            version:
                Number(rawState?.meta?.version) > 0
                    ? Number(rawState.meta.version)
                    : APP_STATE_VERSION,
        },

        map: {
            ...structuredClone(DEFAULT_MAP),
            ...(rawState?.map || {}),
            stagePadding: {
                ...structuredClone(DEFAULT_MAP.stagePadding),
                ...(rawState?.map?.stagePadding || {}),
            },
        },

        categories: Array.isArray(rawState?.categories)
            ? rawState.categories.map((category, index) => ({
                  id: String(category?.id || createId("cat")),
                  name: String(category?.name || `Category ${index + 1}`),
                  color: String(category?.color || "#1f5eff"),
                  iconUrl: String(category?.iconUrl || ""),
                  order: Number.isFinite(category?.order)
                      ? category.order
                      : index,
              }))
            : structuredClone(fallback.categories),

        items: Array.isArray(rawState?.items)
            ? rawState.items.map((item, index) => ({
                  id: String(item?.id || createId("item")),
                  categoryId: String(item?.categoryId || ""),
                  groupId: String(item?.groupId || ""),
                  name: String(item?.name || `Item ${index + 1}`),
                  linkUrl: String(item?.linkUrl || ""),
                  order: Number.isFinite(item?.order) ? item.order : index,
              }))
            : structuredClone(fallback.items),

        groups: Array.isArray(rawState?.groups)
            ? rawState.groups.map((group, index) => ({
                  id: String(group?.id || createId("group")),
                  categoryId: String(group?.categoryId || ""),
                  itemIds: Array.isArray(group?.itemIds)
                      ? group.itemIds.map((id) => String(id))
                      : [],
                  order: Number.isFinite(group?.order) ? group.order : index,
                  labelX: Number.isFinite(group?.labelX) ? group.labelX : 0,
                  labelY: Number.isFinite(group?.labelY) ? group.labelY : 0,
                  dotX: Number.isFinite(group?.dotX) ? group.dotX : 0,
                  dotY: Number.isFinite(group?.dotY) ? group.dotY : 0,
                  labelWidth: Number.isFinite(group?.labelWidth) ? group.labelWidth : null,
              }))
            : structuredClone(fallback.groups),

        ui: {
            activeCategoryId: rawState?.ui?.activeCategoryId || null,
            selectedItemIds: Array.isArray(rawState?.ui?.selectedItemIds)
                ? rawState.ui.selectedItemIds.map((id) => String(id))
                : [],
            editingCategoryId: null,
            editingItemId: null,
            draftCategory: null,
            draftItem: null,
            collapsedCategoryIds: Array.isArray(
                rawState?.ui?.collapsedCategoryIds,
            )
                ? rawState.ui.collapsedCategoryIds.map((id) => String(id))
                : [],
        },
    };

    const categoryIds = new Set(
        nextState.categories.map((category) => category.id),
    );
    const itemIds = new Set(nextState.items.map((item) => item.id));

    nextState.items = nextState.items.filter((item) =>
        categoryIds.has(item.categoryId),
    );

    const survivingItemIds = new Set(nextState.items.map((item) => item.id));

    nextState.groups = nextState.groups
        .filter((group) => categoryIds.has(group.categoryId))
        .map((group) => ({
            ...group,
            itemIds: group.itemIds.filter((itemId) =>
                survivingItemIds.has(itemId),
            ),
        }))
        .filter((group) => group.itemIds.length > 0);

    const groupIds = new Set(nextState.groups.map((group) => group.id));

    nextState.items = nextState.items.filter((item) =>
        groupIds.has(item.groupId),
    );

    const refreshedItemIds = new Set(nextState.items.map((item) => item.id));

    nextState.groups = nextState.groups
        .map((group) => ({
            ...group,
            itemIds: group.itemIds.filter((itemId) =>
                refreshedItemIds.has(itemId),
            ),
        }))
        .filter((group) => group.itemIds.length > 0);

    reindexOrders(nextState.categories);

    nextState.categories.forEach((category) => {
        const categoryItems = nextState.items
            .filter((item) => item.categoryId === category.id)
            .sort((a, b) => a.order - b.order);
        reindexOrders(categoryItems);

        const categoryGroups = nextState.groups
            .filter((group) => group.categoryId === category.id)
            .sort((a, b) => a.order - b.order);
        reindexOrders(categoryGroups);
    });

    if (
        !nextState.ui.activeCategoryId ||
        !categoryIds.has(nextState.ui.activeCategoryId)
    ) {
        nextState.ui.activeCategoryId = nextState.categories[0]?.id || null;
    }

    nextState.ui.selectedItemIds = nextState.ui.selectedItemIds.filter(
        (itemId) => refreshedItemIds.has(itemId),
    );

    nextState.ui.collapsedCategoryIds =
        nextState.ui.collapsedCategoryIds.filter((categoryId) =>
            categoryIds.has(categoryId),
        );

    if (nextState.categories.length === 0) {
        return createInitialState();
    }

    syncIdCounterFromState(nextState);
    return nextState;
}
