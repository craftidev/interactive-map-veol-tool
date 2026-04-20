# Interactive Map Builder

A tool to create static, CMS-compatible interactive maps with positioned labels, connectors, and category filtering.

The builder is only used to **design and export** maps.
The output is **pure HTML + CSS (no JS)**, ready to paste into a weird and despotic CMS.

## Fonctionnalités à tester — Interactive Map Builder (V1)

Les principales fonctionnalités :

### Gestion des catégories

* Ajouter, modifier et supprimer des catégories
* Réorganiser l’ordre des catégories (↑ / ↓)
* Réduire / développer une catégorie
* Définir :
  * un nom
  * une couleur (palette ou saisie hexadecimal)
  * une icône (URL)

---

### Gestion des éléments

* Ajouter, modifier et supprimer des éléments dans une catégorie
* Saisir du texte :
  * simple (une ligne)
  * multi-lignes
  * listes avec `- ` en début de ligne

* Ajouter un lien ou non

---

### Groupement

* Sélectionner plusieurs éléments (checkbox)
* Grouper les éléments sélectionnés
* Dégrouper un groupe

---

### Éditeur visuel

* Changer de catégorie via les onglets
* Déplacer :
  * les blocs de texte
  * les points sur la carte

* Affichage des connecteurs (ligne pointillée)

---

### Export, integration VEOL

* Générer le code HTML/CSS
* Copier-coller sur VEOL
* Rendu:
  * comforme a l'apercu de l'editeur
  * navigation par catégorie

---

### Liste accessible / fallback mobile

* Rendu :
  * liste accessible avec ancre (accordéon)
  * qui devient le fallback petit ecran
  * l'ensemble de la carte se retraici sur petit écran avant le fallback

---

### Sauvegarde / chargement

* Sauvegarder en JSON
* Recharger un JSON :
  * les infos et positions sont conservées

---

### Cas particulier

* Gestion des textes longs, utilisateur peut passer a la ligne
* Items avec et sans icône
* Mélange de texte + listes (`- `)
* Groupes avec plusieurs éléments
* Lien / sans lien

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

