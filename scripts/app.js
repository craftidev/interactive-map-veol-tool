// bootstraps everything
// owns renderApp()

import { createInitialState } from "./state.js";
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
} from "./actions.js";
import { renderBuilder } from "./render-builder.js";
import { renderStage, syncStageConnections } from "./render-stage.js";
import { generateCMSCode } from "./export.js";

const state = createInitialState();

const builderRootEl = document.getElementById("builder-root");
const stageRootEl = document.getElementById("stage-root");
const stageTabsRootEl = document.getElementById("stage-tabs-root");
const addCategoryBtnEl = document.getElementById("add-category-btn");
const generateCodeBtnEl = document.getElementById("generate-code-btn");
const generatedCodeOutputEl = document.getElementById("generated-code-output");

function readFormValues(formEl) {
    const formData = new FormData(formEl);

    return {
        name: String(formData.get("name") || "").trim(),
        color: String(formData.get("color") || "").trim(),
        iconUrl: String(formData.get("iconUrl") || "").trim(),
        linkUrl: String(formData.get("linkUrl") || "").trim(),
    };
}

function renderApp() {
    renderStage(state, stageTabsRootEl, stageRootEl);
    renderBuilder(state, builderRootEl);
    syncStageConnections(state, stageRootEl);
    bindEvents();
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
    const action = event.currentTarget.dataset.action;
    const categoryId = event.currentTarget.dataset.categoryId || "";
    const itemId = event.currentTarget.dataset.itemId || "";

    switch (action) {
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

        default:
            return;
    }

    renderApp();
}

function handleFormSubmit(event) {
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
    const code = generateCMSCode(state);
    generatedCodeOutputEl.value = code;
});

renderApp();
