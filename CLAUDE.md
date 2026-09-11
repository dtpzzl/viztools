# CLAUDE.md — viztools

Repo **public** `dtpzzl/viztools`.
Contient les configurations publiques et les DataTools D3.js de DataPuzzle.
Servi via `raw.githubusercontent.com` (ou un CDN si réseau restreint).

---

## Structure du repo

```
viztools/
├── README.md
├── config/
│   └── apis.json           # Config des APIs (URL, facettes, exemples — PAS de clés)
└── default/                # DataTools D3.js built-in
    ├── bar.js
    ├── bar-horizontal.js
    ├── line.js
    ├── area.js
    ├── heatmap.js
    ├── donut.js
    └── scatter.js
```

---

## config/apis.json

Fichier de configuration des sources de données, chargé au démarrage du back-office
(`api-registry.js`) via `raw.githubusercontent.com`.

### Structure d'une entrée API

```json
{
  "id":           "identifiant-unique",
  "name":         "Nom affiché",
  "url":          "https://url-de-base-de-l-api/",
  "type":         "datagouv | opendatasoft | insee-bdm | meteofrance | eurostat | generic",
  "builtin":      true,
  "status":       "active | key_required | soon",
  "auth":         "none | api_key",
  "env_key":      "NOM_VARIABLE_VERCEL",       // seulement si auth = api_key
  "doc_url":      "https://lien-vers-doc",
  "description":  "Description courte affichée dans la carte",
  "facets": [
    {
      "key":         "nom_parametre_api",
      "label":       "Label affiché",
      "type":        "select | text",
      "values":      ["val1", "val2"],          // seulement si type = select
      "labels":      { "val1": "Label FR" },   // traductions optionnelles
      "placeholder": "ex: valeur"              // seulement si type = text
    }
  ],
  "query_params": { "page_size": 8 },          // params par défaut ajoutés à chaque requête
  "example_queries": ["Exemple 1", "Exemple 2"],
  "notes": "Info affichée dans le panneau des filtres"
}
```

### Types d'API reconnus par le collecteur

| type | Comportement |
|---|---|
| `datagouv` | Workflow en 3 étapes : catalog → dataset → Tabular API |
| `opendatasoft` | Détecté automatiquement par URL `/api/explore/v2.1/` |
| `insee-bdm` | Proxy `/api/insee` — SDMX → JSON plat |
| `meteofrance` | Proxy `/api/meteofrance` — clé via `METEOFRANCE_KEY` ou oneshot |
| `eurostat` | Via proxy générique |
| `generic` | Via proxy générique — tente `?q=mot-clé` |

### Valeurs de facettes data.gouv.fr (topic)
Les identifiants techniques attendus par l'API (pas les libellés français) :
`transport`, `housing`, `health`, `education`, `economy`, `environment`,
`society`, `culture`, `security`, `agriculture`, `energy`, `spatial-planning`,
`justice`, `employment`

### Ajouter une nouvelle API
1. Copier une entrée existante comme base
2. Choisir un `id` unique en kebab-case (ex: `opendata-bordeaux`)
3. Déterminer le `type` — si le portail utilise Opendatasoft v2.1, utiliser `opendatasoft`
4. Documenter les facettes depuis la documentation officielle de l'API
5. Tester via le bouton "+" du back-office avant de valider dans ce fichier
6. Si l'API nécessite une clé : `"status": "key_required"`, `"auth": "api_key"`,
   `"env_key": "NOM_CLE_VERCEL"` — ajouter la clé dans Vercel, jamais ici

---

## DataTools D3.js (default/)

Les DataTools sont des fichiers JS avec une fonction `draw` et des métadonnées JSDoc.

### Signature obligatoire

```js
/**
 * @name Nom affiché
 * @description Description courte
 * @sampleData [{"label":"A","value":10},{"label":"B","value":20}]
 */
function draw(svg, g, data, W, H, color, p) {
  // svg  — sélection D3 du SVG complet
  // g    — groupe principal (déjà translaté aux marges)
  // data — array [{label, value}] après agrégation
  // W    — largeur utile du groupe (SVG width - margin.left - margin.right)
  // H    — hauteur utile du groupe (SVG height - margin.top - margin.bottom)
  // color — couleur principale (hex string)
  // p    — objet params : { margin, opacity, stroke, radius, fontSize,
  //                         showLabels, showGrid, ticks, … }
}
```

### Paramètres disponibles via `p`

```js
p.margin        // { top, right, bottom, left } en pixels
p.opacity       // 0–1
p.stroke        // épaisseur de trait en px
p.radius        // arrondi des barres en px
p.fontSize      // taille police des labels en px
p.showLabels    // boolean
p.showGrid      // boolean
p.ticks         // nombre de ticks sur l'axe Y
```

### Contraintes de sécurité (sandbox buildDrawFn)

Le code est exécuté dans `new Function('d3', …)` avec `"use strict"`.
**Autorisé** : D3.js uniquement (passé en paramètre).
**Interdit** (bloqué avant exécution) :
- `window`, `document`, `fetch`, `XMLHttpRequest`
- `localStorage`, `sessionStorage`
- `setTimeout`, `setInterval`
- `img.src=`, `script.src=`, `iframe.src=`
- `import(`

Ne pas utiliser `eval` ni `arguments` (mots réservés JS en strict mode).
Ne pas faire de requêtes réseau dans un DataTool.
Toutes les données arrivent via le paramètre `data`.

### Exemple minimal — Bar chart

```js
/**
 * @name Barres
 * @description Graphique à barres vertical classique
 * @sampleData [{"label":"Jan","value":120},{"label":"Fév","value":85}]
 */
function draw(svg, g, data, W, H, color, p) {
  const x = d3.scaleBand().domain(data.map(d => d.label)).range([0, W]).padding(0.2);
  const y = d3.scaleLinear().domain([0, d3.max(data, d => d.value)]).nice().range([H, 0]);

  g.append('g').attr('transform', `translate(0,${H})`).call(d3.axisBottom(x));
  g.append('g').call(d3.axisLeft(y).ticks(p.ticks));

  g.selectAll('rect')
    .data(data).join('rect')
    .attr('x', d => x(d.label))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => H - y(d.value))
    .attr('fill', color)
    .attr('opacity', p.opacity)
    .attr('rx', p.radius);
}
```

### Ajouter un nouveau DataTool

1. Créer `viztools/default/mon-outil.js`
2. Inclure le bloc JSDoc avec `@name`, `@description`, `@sampleData`
3. Implémenter `function draw(svg, g, data, W, H, color, p)`
4. Le fichier apparaît automatiquement dans la bibliothèque du Studio au prochain chargement

---

## Workflow de mise à jour

Ce repo est public — tout push est immédiatement visible via `raw.githubusercontent.com`.

```
Modifier apis.json ou ajouter un DataTool
        ↓
git add . && git commit -m "feat: …" && git push
        ↓
Disponible en ~30s (propagation CDN GitHub)
        ↓
Le back-office charge la nouvelle version au prochain rafraîchissement
(ou après les 3 tentatives de retry de loadApiConfig)
```

**Note** : si `raw.githubusercontent.com` est bloqué par ton réseau pro,
utilise le partage de connexion téléphone ou envisage de basculer vers
un hosting self-hosted sur Vercel (voir discussion dans datapuzzle-admin).

---

## Pièges à éviter

- Ne jamais mettre de clé API dans `apis.json` — même commentée
- Les `id` dans `apis.json` doivent correspondre à ceux utilisés dans le JS du collecteur
- Les valeurs de facettes `topic` pour data.gouv.fr sont des identifiants anglais techniques,
  pas des libellés français — l'API retourne une erreur "Topic arg must be an identifier" sinon
- Un DataTool avec une erreur de syntaxe bloque silencieusement le chargement de la bibliothèque
  → toujours tester avec `node --input-type=module < mon-outil.js` avant de pusher
