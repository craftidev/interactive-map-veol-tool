(function () {
    const builderRootEl = document.getElementById('builder-root');
    const addCategoryBtnEl = document.getElementById('add-category-btn');

    if (!builderRootEl || !addCategoryBtnEl) {
        return;
    }

    const builderState = {
        categories: [
            {
                name: 'Hydro',
                image: '♒',
                order: 1,
                isEditing: false,
                isNew: false,
                elements: [
                    {
                        name: 'Usine marémotrice de la Rance',
                        link: 'https://example.com',
                        order: 1,
                        isEditing: false,
                        isNew: false,
                    }
                ]
            }
        ]
    };

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizeOrders() {
        builderState.categories.forEach((category, categoryIndex) => {
            category.order = categoryIndex + 1;
            category.elements.forEach((element, elementIndex) => {
                element.order = elementIndex + 1;
            });
        });
    }

    function createCategoryDraft() {
        return {
            name: '',
            image: '',
            order: builderState.categories.length + 1,
            isEditing: true,
            isNew: true,
            elements: [],
        };
    }

    function createElementDraft(category) {
        return {
            name: '',
            link: '',
            order: category.elements.length + 1,
            isEditing: true,
            isNew: true,
        };
    }

    function moveItem(array, fromIndex, toIndex) {
        if (toIndex < 0 || toIndex >= array.length) {
            return;
        }

        const [item] = array.splice(fromIndex, 1);
        array.splice(toIndex, 0, item);
    }

    function render() {
        normalizeOrders();

        if (builderState.categories.length === 0) {
            builderRootEl.innerHTML = `
                <div class="empty-state">
                    No categories yet. Click <strong>Add category</strong> to start.
                </div>
            `;
            return;
        }

        builderRootEl.innerHTML = builderState.categories
            .map((category, categoryIndex) => renderCategory(category, categoryIndex))
            .join('');

        bindEvents();
    }

    function renderCategory(category, categoryIndex) {
        if (category.isEditing) {
            return `
                <div class="category-card">
                    <form class="inline-form" data-role="category-form" data-category-index="${categoryIndex}">
                        <div class="form-grid">
                            <div class="field">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value="${escapeHtml(category.name)}"
                                    placeholder="Hydro"
                                    required
                                />
                            </div>

                            <div class="field">
                                <label>Image (text/link)</label>
                                <input
                                    type="text"
                                    name="image"
                                    value="${escapeHtml(category.image)}"
                                    placeholder="♒ or https://..."
                                />
                            </div>

                            <div class="field">
                                <label>Order</label>
                                <input
                                    type="number"
                                    name="order"
                                    value="${category.order}"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit">Save category</button>
                            <button type="button" class="secondary-btn" data-action="cancel-category" data-category-index="${categoryIndex}">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        return `
            <div class="category-card">
                <div class="category-topbar">
                    <div class="category-summary">
                        <div class="category-image">${escapeHtml(category.image || '•')}</div>
                        <div class="category-text">
                            <div class="category-name">${escapeHtml(category.name || 'Untitled category')}</div>
                            <div class="category-meta">
                                Order ${category.order} · ${category.elements.length} element${category.elements.length > 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>

                    <div class="toolbar">
                        <button type="button" data-action="move-category-up" data-category-index="${categoryIndex}">↑</button>
                        <button type="button" data-action="move-category-down" data-category-index="${categoryIndex}">↓</button>
                        <button type="button" data-action="edit-category" data-category-index="${categoryIndex}">Edit</button>
                        <button type="button" data-action="delete-category" data-category-index="${categoryIndex}">Delete</button>
                    </div>
                </div>

                <div class="elements-list">
                    ${category.elements.length > 0
                        ? category.elements.map((element, elementIndex) => renderElement(category, categoryIndex, element, elementIndex)).join('')
                        : `<div class="muted-text">No elements in this category yet.</div>`
                    }
                </div>

                <div class="add-element-row">
                    <button type="button" data-action="add-element" data-category-index="${categoryIndex}">
                        Add element
                    </button>
                </div>
            </div>
        `;
    }

    function renderElement(category, categoryIndex, element, elementIndex) {
        if (element.isEditing) {
            return `
                <div class="element-row">
                    <form
                        class="inline-form"
                        data-role="element-form"
                        data-category-index="${categoryIndex}"
                        data-element-index="${elementIndex}"
                    >
                        <div class="form-grid">
                            <div class="field">
                                <label>Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value="${escapeHtml(element.name)}"
                                    placeholder="Element name"
                                    required
                                />
                            </div>

                            <div class="field">
                                <label>Link</label>
                                <input
                                    type="text"
                                    name="link"
                                    value="${escapeHtml(element.link)}"
                                    placeholder="https://..."
                                />
                            </div>

                            <div class="field">
                                <label>Order</label>
                                <input
                                    type="number"
                                    name="order"
                                    value="${element.order}"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="submit">Save element</button>
                            <button
                                type="button"
                                class="secondary-btn"
                                data-action="cancel-element"
                                data-category-index="${categoryIndex}"
                                data-element-index="${elementIndex}"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            `;
        }

        const categoryOptions = builderState.categories
            .map((item, index) => `
                <option value="${index}" ${index === categoryIndex ? 'selected' : ''}>
                    ${escapeHtml(item.name || `Category ${index + 1}`)}
                </option>
            `)
            .join('');

        return `
            <div class="element-row">
                <div class="element-topbar">
                    <div class="element-text">
                        <div class="element-name">${escapeHtml(element.name || 'Untitled element')}</div>
                        <div class="element-link">${escapeHtml(element.link || 'No link')}</div>
                    </div>

                    <div class="toolbar">
                        <button
                            type="button"
                            data-action="move-element-up"
                            data-category-index="${categoryIndex}"
                            data-element-index="${elementIndex}"
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            data-action="move-element-down"
                            data-category-index="${categoryIndex}"
                            data-element-index="${elementIndex}"
                        >
                            ↓
                        </button>
                        <button
                            type="button"
                            data-action="edit-element"
                            data-category-index="${categoryIndex}"
                            data-element-index="${elementIndex}"
                        >
                            Edit
                        </button>
                        <button
                            type="button"
                            data-action="delete-element"
                            data-category-index="${categoryIndex}"
                            data-element-index="${elementIndex}"
                        >
                            Delete
                        </button>
                    </div>
                </div>

                <div class="form-grid" style="margin-top: 12px;">
                    <div class="field">
                        <label>Move to category</label>
                        <select
                            data-action="move-element-category"
                            data-category-index="${categoryIndex}"
                            data-element-index="${elementIndex}"
                        >
                            ${categoryOptions}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    function bindEvents() {
        builderRootEl.querySelectorAll('[data-action]').forEach((button) => {
            button.addEventListener('click', handleActionClick);
        });

        builderRootEl.querySelectorAll('[data-role="category-form"]').forEach((form) => {
            form.addEventListener('submit', handleCategorySubmit);
        });

        builderRootEl.querySelectorAll('[data-role="element-form"]').forEach((form) => {
            form.addEventListener('submit', handleElementSubmit);
        });

        builderRootEl.querySelectorAll('select[data-action="move-element-category"]').forEach((select) => {
            select.addEventListener('change', handleMoveElementCategory);
        });
    }

    function handleActionClick(event) {
        const action = event.currentTarget.dataset.action;
        const categoryIndex = Number(event.currentTarget.dataset.categoryIndex);
        const elementIndex = Number(event.currentTarget.dataset.elementIndex);

        if (action === 'edit-category') {
            builderState.categories[categoryIndex].isEditing = true;
            render();
            return;
        }

        if (action === 'delete-category') {
            builderState.categories.splice(categoryIndex, 1);
            render();
            return;
        }

        if (action === 'move-category-up') {
            moveItem(builderState.categories, categoryIndex, categoryIndex - 1);
            render();
            return;
        }

        if (action === 'move-category-down') {
            moveItem(builderState.categories, categoryIndex, categoryIndex + 1);
            render();
            return;
        }

        if (action === 'cancel-category') {
            const category = builderState.categories[categoryIndex];

            if (category.isNew) {
                builderState.categories.splice(categoryIndex, 1);
            } else {
                category.isEditing = false;
            }

            render();
            return;
        }

        if (action === 'add-element') {
            const category = builderState.categories[categoryIndex];
            category.elements.push(createElementDraft(category));
            render();
            return;
        }

        if (action === 'edit-element') {
            builderState.categories[categoryIndex].elements[elementIndex].isEditing = true;
            render();
            return;
        }

        if (action === 'delete-element') {
            builderState.categories[categoryIndex].elements.splice(elementIndex, 1);
            render();
            return;
        }

        if (action === 'move-element-up') {
            moveItem(builderState.categories[categoryIndex].elements, elementIndex, elementIndex - 1);
            render();
            return;
        }

        if (action === 'move-element-down') {
            moveItem(builderState.categories[categoryIndex].elements, elementIndex, elementIndex + 1);
            render();
            return;
        }

        if (action === 'cancel-element') {
            const element = builderState.categories[categoryIndex].elements[elementIndex];

            if (element.isNew) {
                builderState.categories[categoryIndex].elements.splice(elementIndex, 1);
            } else {
                element.isEditing = false;
            }

            render();
        }
    }

    function handleCategorySubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const categoryIndex = Number(form.dataset.categoryIndex);
        const category = builderState.categories[categoryIndex];
        const formData = new FormData(form);

        category.name = String(formData.get('name') || '').trim();
        category.image = String(formData.get('image') || '').trim();
        category.order = Math.max(1, Number(formData.get('order')) || 1);
        category.isEditing = false;
        category.isNew = false;

        const currentIndex = categoryIndex;
        const targetIndex = Math.max(0, Math.min(builderState.categories.length - 1, category.order - 1));

        moveItem(builderState.categories, currentIndex, targetIndex);
        render();
    }

    function handleElementSubmit(event) {
        event.preventDefault();

        const form = event.currentTarget;
        const categoryIndex = Number(form.dataset.categoryIndex);
        const elementIndex = Number(form.dataset.elementIndex);
        const element = builderState.categories[categoryIndex].elements[elementIndex];
        const formData = new FormData(form);

        element.name = String(formData.get('name') || '').trim();
        element.link = String(formData.get('link') || '').trim();
        element.order = Math.max(1, Number(formData.get('order')) || 1);
        element.isEditing = false;
        element.isNew = false;

        const elements = builderState.categories[categoryIndex].elements;
        const currentIndex = elementIndex;
        const targetIndex = Math.max(0, Math.min(elements.length - 1, element.order - 1));

        moveItem(elements, currentIndex, targetIndex);
        render();
    }

    function handleMoveElementCategory(event) {
        const select = event.currentTarget;
        const fromCategoryIndex = Number(select.dataset.categoryIndex);
        const elementIndex = Number(select.dataset.elementIndex);
        const toCategoryIndex = Number(select.value);

        if (fromCategoryIndex === toCategoryIndex) {
            return;
        }

        const fromElements = builderState.categories[fromCategoryIndex].elements;
        const [element] = fromElements.splice(elementIndex, 1);

        builderState.categories[toCategoryIndex].elements.push(element);
        render();
    }

    addCategoryBtnEl.addEventListener('click', () => {
        builderState.categories.push(createCategoryDraft());
        render();
    });

    render();
})();
