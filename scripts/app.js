// bootstraps everything
// owns renderApp()

import {
    cancelAddCategory,
    cancelAddItem,
    cancelEditCategory,
    cancelEditItem,
    clearCategorySelection,
    deleteCategory,
    deleteItem,
    groupSelectedItems,
    moveCategory,
    moveGroupDot,
    moveGroupLabel,
    saveEditedCategory,
    saveEditedItem,
    saveNewCategory,
    saveNewItem,
    setActiveCategory,
    startAddCategory,
    startAddItem,
    startEditCategory,
    startEditItem,
    toggleCategoryCollapsed,
    toggleItemSelection,
    ungroupItemGroup,
    moveItemWithinGroup,
} from "./actions.js";
import {
    renderStage,
    syncStageConnections,
    syncStageLabelMeasures,
} from "./render-stage.js";
import {
    createInitialState,
    normalizeLoadedState,
    APP_STATE_VERSION,
} from "./state.js";
import { renderBuilder } from "./render-builder.js";
import { generateCMSCode } from "./export.js";

function handleError(error, context = "Unknown error") {
    console.error(`[${context}]`, error);

    let message = "Unknown error";

    if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === "string") {
        message = error;
    } else {
        try {
            message = JSON.stringify(error);
        } catch {
            message = String(error);
        }
    }

    window.alert(
        `${context}\n\nError: ${message}\n\nPlease save your map if possible and send it to the dev.`,
    );
}

window.addEventListener("error", (event) => {
    handleError(event.error || event.message, "Unhandled application error");
});

window.addEventListener("unhandledrejection", (event) => {
    handleError(event.reason, "Unhandled async error");
});

const state = createInitialState();

const builderRootEl = document.getElementById("builder-root");
const stageRootEl = document.getElementById("stage-root");
const stageTabsRootEl = document.getElementById("stage-tabs-root");
const addCategoryBtnEl = document.getElementById("add-category-btn");
const generateCodeBtnEl = document.getElementById("generate-code-btn");
const generatedCodeOutputEl = document.getElementById("generated-code-output");
const saveJsonBtnEl = document.getElementById("save-json-btn");
const loadJsonBtnEl = document.getElementById("load-json-btn");
const loadJsonInputEl = document.getElementById("load-json-input");

function readFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        name: String(formData.get("name") || "").trim(),
        color: String(formData.get("color") || "").trim(),
        iconUrl: String(formData.get("iconUrl") || "").trim(),
        linkUrl: String(formData.get("linkUrl") || "").trim(),
    };
}

function replaceStateContents(targetState, nextState) {
    Object.keys(targetState).forEach((key) => {
        delete targetState[key];
    });

    Object.assign(targetState, nextState);
}

function downloadJsonFile(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);

    const linkEl = document.createElement("a");
    linkEl.href = objectUrl;
    linkEl.download = filename;
    document.body.appendChild(linkEl);
    linkEl.click();
    document.body.removeChild(linkEl);

    URL.revokeObjectURL(objectUrl);
}

function handleLoadJsonFile(file) {
    try {
        const reader = new FileReader();

        reader.onload = (e) => {
            const parsed = JSON.parse(e.target.result);
            const parsedVersion = parsed?.meta?.version;

            if (parsedVersion !== APP_STATE_VERSION) {
                window.alert(
                    `This save file is not compatible with this version of the tool.

Expected version: ${APP_STATE_VERSION}
Found version: ${parsedVersion ?? "unknown"}

If you need to retrieve your data, please contact the devs.`,
                );
                return;
            }

            const normalizedState = normalizeLoadedState(parsed);
            replaceStateContents(state, normalizedState);
            renderApp();
        };

        reader.readAsText(file);
    } catch (err) {
        handleError(err, "Failed to load JSON file.");
    }
}

function renderApp() {
    try {
        renderStage(state, stageTabsRootEl, stageRootEl);
        renderBuilder(state, builderRootEl);
        syncStageConnections(state, stageRootEl);
        syncStageLabelMeasures(state, stageRootEl);
        bindEvents();
    } catch (error) {
        handleError(error, "The app failed while rendering.");
    }
}

function bindEvents() {
    document.querySelectorAll("[data-action]").forEach((element) => {
        element.addEventListener("click", handleActionClick);
    });

    document.querySelectorAll("[data-form-action]").forEach((form) => {
        form.addEventListener("submit", handleFormSubmit);
    });

    document.querySelectorAll("[data-drag-kind]").forEach((element) => {
        element.addEventListener("pointerdown", handleDragStart);
    });
}

function handleActionClick(event) {
    try {
        const action = event.currentTarget.dataset.action;
        const categoryId = event.currentTarget.dataset.categoryId || "";
        const itemId = event.currentTarget.dataset.itemId || "";

        switch (action) {
            case "apply-color-swatch": {
                const formEl = event.currentTarget.closest("form");
                const colorInputEl = formEl?.querySelector(
                    'input[name="color"]',
                );
                const nextColor = event.currentTarget.dataset.color || "";

                if (colorInputEl && nextColor) {
                    colorInputEl.value = nextColor;
                }
                return;
            }
            case "set-active-category":
                setActiveCategory(state, categoryId);
                break;

            case "edit-category":
                startEditCategory(state, categoryId);
                break;

            case "delete-category":
                deleteCategory(state, categoryId);
                break;

            case "move-category-up":
                moveCategory(state, categoryId, "up");
                break;

            case "move-category-down":
                moveCategory(state, categoryId, "down");
                break;

            case "cancel-add-category":
                cancelAddCategory(state);
                break;

            case "cancel-edit-category":
                cancelEditCategory(state);
                break;

            case "toggle-category-collapsed":
                toggleCategoryCollapsed(state, categoryId);
                break;

            case "add-item":
                startAddItem(state, categoryId);
                break;

            case "edit-item":
                startEditItem(state, itemId);
                break;

            case "delete-item":
                deleteItem(state, itemId);
                break;

            case "cancel-add-item":
                cancelAddItem(state);
                break;

            case "cancel-edit-item":
                cancelEditItem(state);
                break;

            case "toggle-item-selection":
                toggleItemSelection(state, itemId);
                break;

            case "group-selected-items":
                groupSelectedItems(state, categoryId);
                break;

            case "clear-item-selection":
                clearCategorySelection(state, categoryId);
                break;

            case "ungroup-item-group":
                ungroupItemGroup(state, itemId);
                break;

            case "move-item-up":
                moveItemWithinGroup(state, itemId, "up");
                break;

            case "move-item-down":
                moveItemWithinGroup(state, itemId, "down");
                break;

            default:
                return;
        }

        renderApp();
    } catch (error) {
        handleError(error, "This action failed.");
    }
}

function handleFormSubmit(event) {
    try {
        event.preventDefault();

        const formEl = event.currentTarget;
        const formAction = formEl.dataset.formAction;
        const categoryId = formEl.dataset.categoryId || "";
        const itemId = formEl.dataset.itemId || "";
        const values = readFormValues(formEl);

        switch (formAction) {
            case "save-new-category":
                saveNewCategory(state, values);
                break;

            case "save-edit-category":
                saveEditedCategory(state, categoryId, values);
                break;

            case "save-new-item":
                saveNewItem(state, categoryId, values);
                break;

            case "save-edit-item":
                saveEditedItem(state, itemId, values);
                break;

            default:
                return;
        }

        renderApp();
    } catch (error) {
        handleError(error, "This form submission failed.");
    }
}

function handleDragStart(event) {
    event.preventDefault();

    const target = event.currentTarget;
    const dragKind = target.dataset.dragKind;
    const groupId = target.dataset.groupId;

    if (!dragKind || !groupId) return;

    const startClientX = event.clientX;
    const startClientY = event.clientY;

    const activeGroup = state.groups.find((group) => group.id === groupId);
    const targetRect = target.getBoundingClientRect();
    if (!activeGroup) return;

    const initialLabelX = activeGroup.labelX;
    const initialLabelY = activeGroup.labelY;
    const initialDotX = activeGroup.dotX;
    const initialDotY = activeGroup.dotY;

    target.setPointerCapture?.(event.pointerId);

    function onPointerMove(moveEvent) {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;

        if (dragKind === "group") {
            moveGroupLabel(
                state,
                groupId,
                initialLabelX + dx,
                initialLabelY + dy,
                Math.round(targetRect.width),
                Math.round(targetRect.height),
            );
        }

        if (dragKind === "dot") {
            moveGroupDot(state, groupId, initialDotX + dx, initialDotY + dy);
        }

        renderApp();
    }

    function onPointerUp() {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
}

addCategoryBtnEl.addEventListener("click", () => {
    startAddCategory(state);
    renderApp();
});

generateCodeBtnEl.addEventListener("click", () => {
    try {
        const code = generateCMSCode(state);
        generatedCodeOutputEl.value = code;
    } catch (error) {
        handleError(error, "Could not generate code.");
    }
});

saveJsonBtnEl.addEventListener("click", () => {
    const filename = `interactive-map-${Date.now()}.json`;
    const json = JSON.stringify(state, null, 2);
    downloadJsonFile(filename, json);
});

loadJsonBtnEl.addEventListener("click", () => {
    loadJsonInputEl.click();
});

loadJsonInputEl.addEventListener("change", async (event) => {
    const file = event.target.files?.[0] || null;
    await handleLoadJsonFile(file);
    event.target.value = "";
});

renderApp();
