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
    ├── circular-heatmap.js
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
  // data — array [{label, value}] après agrégation.
  //        Champ `series` optionnel : Aire et Nuage de points groupent dessus
  //        (aires empilées / couleur par série + légende). Absent ou valeur
  //        unique, le rendu est identique à celui d'une série simple.
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
p.unitMode      // 'auto' | 'unit' | 'k' | 'M' | 'Md' — échelle des valeurs affichées
p.decimals      // nombre de décimales (0–3) appliquées après mise à l'échelle
p.donutMode     // 'percent' | 'value' — spécifique au visuel Donut (% du total ou valeur brute)

// Spécifiques à un seul visuel
p.donutMode     // Donut — 'percent' | 'value'
p.thickness     // Donut — épaisseur de l'anneau en px (défaut : 48 % du rayon)
                // Heatmap circulaire — épaisseur d'un anneau en px (défaut : auto)
p.curve         // Courbe — 'catmullRom' | 'monotone' | 'linear' | 'step'
p.areaMode      // Aire — 'value' | 'percent' (part dans la pile, ou du total)
p.pointShape    // Nuage de points — 'circle' | 'square' | 'triangle' |
                // 'diamond' | 'cross' | 'star' | 'wye'
p.radialGap     // Heatmap circulaire — espacement entre anneaux en px
p.angularGap    // Heatmap circulaire — espacement entre secteurs en degrés
p.scaleMin      // Heatmap circulaire — bornes de l'échelle de couleur en dur,
p.scaleMid      // par défaut min / moyenne / max des données
p.scaleMax
p.colorMin      // Heatmap circulaire — couleurs des trois bornes, par défaut
p.colorMid      // #f0f0f5, milieu interpolé, puis la couleur principale
p.colorMax
```

### Déclarer les paramètres applicables — `@params`

Tous les visuels ne lisent pas les mêmes réglages : le Donut ignore `radius`,
l'Aire n'a pas de valeurs à afficher, la Heatmap circulaire a neuf réglages qui
n'existent nulle part ailleurs. Chaque DataTool déclare donc ses paramètres dans
une ligne `@params` du bloc JSDoc, en JSON, à côté de `@sampleData`. Le
back-office lit cette ligne pour n'afficher que les contrôles pertinents, puis
transmet les valeurs à `draw` via l'objet `p`.

```
 * @params {"opacity":{"type":"range","label":"Opacité","min":0,"max":1,"step":0.05,"default":0.9}}
```

| Champ | Rôle |
|---|---|
| `group` | `general` ou `visuel` — voir ci-dessous |
| `type` | `range`, `toggle`, `select`, `color` ou `number` |
| `label` | Libellé affiché dans le panneau de réglages |
| `default` | Valeur par défaut — `null` signifie « calculé automatiquement » |
| `min` / `max` / `step` | Bornes du curseur, pour `range` |
| `options` | Liste `{value, label}`, pour `select` |
| `unit` | Suffixe affiché à côté de la valeur (`px`, `°`) |
| `placeholder` | Texte grisé quand `default` vaut `null` |

`group` dit où le contrôle s'affiche dans l'éditeur. `general` regroupe les
réglages partagés par la plupart des visuels — opacité, trait, arrondi, taille
du texte, valeurs, grille, graduations, unité, décimales — que le main affiche
par défaut. `visuel` regroupe ce qui n'existe que dans ce DataTool, affiché dans
le panneau « paramètres du visuel » une fois le visuel choisi.

**Deux règles à respecter, sinon l'UI ment sur le rendu :**

1. La liste déclarée doit correspondre exactement aux `p.*` lus par `draw`.
   Un paramètre déclaré mais jamais lu produit un curseur sans effet ; un
   paramètre lu mais non déclaré n'est pas réglable.
   `p.margin` est l'exception : il est fourni par le Studio, pas par
   l'utilisateur, et ne se déclare pas.
2. Le `default` déclaré doit être celui du code. Construire `p` uniquement à
   partir des `default` déclarés doit produire exactement le même rendu que
   d'appeler `draw` sans aucun paramètre. Attention aux replis multiples pour
   un même paramètre : un texte secondaire s'écrit `(p.fontSize ?? 12) - 1`,
   jamais `p.fontSize ?? 11`, qui rendrait le défaut déclaré faux.

### Contraintes de sécurité (sandbox buildDrawFn)

Le code est exécuté dans `new Function('d3', …)` avec `"use strict"`.
**Autorisé** : D3.js uniquement (passé en paramètre).
**Interdit** (bloqué avant exécution) :
- `window`, `document`, `fetch`, `XMLHttpRequest`
- `localStorage`, `sessionStorage`
- `setTimeout`, `setInterval`
- `img.src=`, `script.src=`, `iframe.src=`
- `import(`
- `Function`, `constructor`, `globalThis`, `Reflect` (évasions connues du sandbox
  `new Function` — ex: `x.constructor.constructor(...)` pour atteindre `window`)

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

Pour le formatage unité/décimales (`p.unitMode`/`p.decimals`) sur un axe de valeurs,
voir `default/bar.js` — le motif `formatAxisValue()` en fin de fichier est répété à
l'identique dans les 7 DataTools par défaut (aucun `import` possible dans le sandbox,
donc pas de helper partagé : chaque fichier doit être autonome).

### Ajouter un nouveau DataTool

1. Créer `viztools/default/mon-outil.js`
2. Inclure le bloc JSDoc avec `@name`, `@description`, `@sampleData` et `@params`
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
