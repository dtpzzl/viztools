# VizTools

Bibliothèque open source de visuels D3.js pour le projet [DataPuzzle](https://datapuzzle.io).

## Structure

```
viztools/
├── default/          ← Visuels officiels DataPuzzle
│   ├── bar.js
│   ├── line.js
│   ├── area.js
│   ├── heatmap.js
│   ├── donut.js
│   ├── bar-horizontal.js
│   └── scatter.js
└── community/        ← Contributions externes
```

## Format d'un viztool

Chaque fichier `.js` doit respecter ce format :

```js
/**
 * @name Nom du visuel
 * @description Description courte
 * @author ton-pseudo
 * @version 1.0
 * @sampleData [{"label":"A","value":42}, ...]
 */
export function draw(svg, g, data, W, H, color) {
  // Ton code D3.js v7 ici
  // svg : selection D3 du SVG racine
  // g   : groupe avec marges appliquées
  // data: tableau d'objets
  // W, H: dimensions utiles (sans marges)
  // color: couleur principale (hex)
}
```

## Contribuer

1. Fork ce repo
2. Crée ton fichier dans `community/`
3. Ouvre une Pull Request

## Licence

MIT — libre d'utilisation, modification et distribution.
