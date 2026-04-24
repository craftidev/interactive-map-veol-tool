// initial state
// id generation
// selectors
// maybe clone/import/export helpers

export const APP_STATE_VERSION = 4;

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
                a11yText: "",
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
                labelHeight: null,
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

export function normalizeLoadedState(state) {
    return {
        ...state,
        meta: {
            ...(state.meta || {}),
            version: APP_STATE_VERSION,
        },
        items: (state.items || []).map((item) => ({
            ...item,
            a11yText: item?.a11yText || "",
        })),
        groups: (state.groups || []).map((group) => ({
            ...group,
            labelWidth: Number.isFinite(group?.labelWidth)
                ? group.labelWidth
                : null,
            labelHeight: Number.isFinite(group?.labelHeight)
                ? group.labelHeight
                : null,
        })),
    };
}
