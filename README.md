# Interactive Map Builder

A tool to create static, CMS-compatible interactive maps with positioned labels, connectors, and category filtering.

The builder is only used to **design and export** maps.
The output is **pure HTML + CSS (no JS)**, ready to paste into a weird and despotic CMS.

## Architecture Overview

### 1. Builder (this app)

- `render-stage.js` → visual map editor (drag labels + dots)
- `render-builder.js` → categories / items UI
- `actions.js` → state mutations
- `state.js` → normalized data model
- `export.js` → converts builder state into CMS HTML

---

### 2. Exported Output (CMS)

Generated structure:

```tree
.im-map
├── .im-map__interactive
│ ├── .im-map__scene-frame
│ │ └── .im-map__scale-shell
│ │ └── .im-map__viewport
│ │ ├── background image
│ │ ├── SVG connectors
│ │ └── positioned groups (labels)
│ └── .im-map__menu
├── .im-map__accordion (accessible)
└── .im-map__fallback-list (mobile)
```

## Constraints

- No JS allowed in final output
- No dynamic layout
- Everything must work with static HTML + CSS only
- CMS may inject unknown styles, wrap tags, refuse some tags inside certain tags → some defensive HTML/CSS is required

