/**
 * @name Nuage de points
 * @description Corrélation entre deux variables, colorée par série
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="16.5" r="2"/><circle cx="11" cy="9" r="3.3" opacity=".75"/><circle cx="17" cy="14" r="2.6" opacity=".85"/><circle cx="19.5" cy="6" r="1.6" opacity=".6"/><circle cx="8" cy="5.5" r="1.3" opacity=".5"/></svg>
 * @author datapuzzle
 * @version 1.1
 * @sampleData [{"label":"A","x":12,"y":34,"series":"Nord","weight":120},{"label":"B","x":45,"y":67,"series":"Nord","weight":340},{"label":"C","x":23,"y":12,"series":"Nord","weight":90},{"label":"D","x":78,"y":89,"series":"Nord","weight":610},{"label":"E","x":56,"y":45,"series":"Sud","weight":250},{"label":"F","x":34,"y":78,"series":"Sud","weight":180},{"label":"G","x":89,"y":23,"series":"Sud","weight":430},{"label":"H","x":67,"y":56,"series":"Sud","weight":70}]
 * @dataFields {"x":{"type":"number","required":true,"label":"Abscisse","description":"Première variable, axe horizontal"},"y":{"type":"number","required":true,"label":"Ordonnée","description":"Seconde variable, axe vertical"},"label":{"type":"category","required":false,"label":"Étiquette","description":"Annotation affichée à côté du point, pas un axe"},"series":{"type":"category","required":false,"label":"Série","description":"Une couleur et une entrée de légende par valeur distincte"},"weight":{"type":"number","required":false,"label":"Poids","description":"Fait varier le diamètre du point ; l'aire est proportionnelle au poids"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"pointShape":{"group":"visuel","type":"select","label":"Forme","default":"circle","options":[{"value":"circle","label":"Cercle"},{"value":"square","label":"Carré"},{"value":"triangle","label":"Triangle"},{"value":"diamond","label":"Losange"},{"value":"cross","label":"Croix"},{"value":"star","label":"Étoile"},{"value":"wye","label":"Y"}]},"opacity":{"group":"general","type":"range","label":"Opacité des points","min":0,"max":1,"step":0.05,"default":0.75},"radius":{"group":"general","type":"range","label":"Rayon des points","min":1,"max":20,"step":1,"default":7,"unit":"px"},"stroke":{"group":"general","type":"range","label":"Contour des points","min":0,"max":8,"step":0.5,"default":1.5,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les étiquettes","default":true},"showGrid":{"group":"general","type":"toggle","label":"Afficher la grille","default":true},"ticks":{"group":"general","type":"range","label":"Graduations","min":2,"max":12,"step":1,"default":5},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;
  if (!data || !data.length) return;

  // Le Studio filtre ET agrège en amont : il restreint les lignes avant de les
  // grouper, pour que le mode choisi (somme, moyenne, min, max, comptage)
  // s'applique une seule fois, sur la population réellement concernée. Le
  // visuel n'a donc plus rien à filtrer ni à cumuler — il rappelle seulement
  // quelle valeur a été retenue, sans quoi on lirait un sous-ensemble sans le
  // savoir. Voir CLAUDE.md, « Champ filtre ».
  const shown = String(p.filterValue ?? '').trim() || null;

  // Valeur du filtre, affichée seulement quand un filtre est réellement actif.
  // Le dessin est alors décalé dans un sous-groupe pour lui laisser la place.
  if (shown !== null) {
    const capH = (p.fontSize ?? 12) + 10;
    g.append('text')
      .attr('x', 0).attr('y', (p.fontSize ?? 12))
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', p.fontSize ?? 12)
      .attr('font-weight', '500')
      .attr('fill', '#0f0f1a')
      .text(shown);
    g = g.append('g').attr('transform', `translate(0,${capH})`);
    H = Math.max(10, H - capH);
  }

  // Une série par valeur distincte du champ `series`. Champ absent ou valeur
  // unique : tous les points prennent la couleur principale, pas de légende.
  const seriesNames = [...new Set(data.map(d => d.series))]
    .filter(s => s !== undefined && s !== null && s !== '');
  const grouped = seriesNames.length > 1;
  // Palette dérivée de la couleur principale. La clarté cycle dans une bande
  // bornée au lieu de croître : en 0.4 + i * 0.08 elle dépassait 1 dès la 8e
  // part, qui devenait blanc pur — dessinée, mais invisible sur fond blanc.
  const palette = seriesNames.map((_, i) =>
    d3.hsl((d3.hsl(color).h + i * 30) % 360, 0.7, 0.4 + (i % 4) * 0.09).toString()
  );
  const colorOf = d => {
    if (!grouped) return color;
    const i = seriesNames.indexOf(d.series);
    return i < 0 ? color : palette[i];
  };

  const fontSize = p.fontSize ?? 12;
  const legendH = grouped ? fontSize + 14 : 0; // la légende mange de la hauteur
  const plotH = Math.max(10, H - legendH);

  const xMax = d3.max(data, d => d.x) * 1.1;
  const x = d3.scaleLinear().domain([0, xMax]).range([0, W]);
  const fmtX = v => formatAxisValue(v, p.unitMode, p.decimals, xMax);

  const yMax = d3.max(data, d => d.y) * 1.1;
  const y = d3.scaleLinear().domain([0, yMax]).range([plotH, 0]);
  const fmtY = v => formatAxisValue(v, p.unitMode, p.decimals, yMax);

  const pg = g.append('g').attr('transform', `translate(0,${legendH})`);

  // Grille
  if (p.showGrid ?? true) {
    pg.append('g').attr('class', 'grid-x')
      .call(d3.axisBottom(x).ticks(p.ticks ?? 5).tickSize(plotH).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    pg.select('.grid-x .domain').remove();

    pg.append('g').attr('class', 'grid-y')
      .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    pg.select('.grid-y .domain').remove();
  }

  // Axes
  pg.append('g').attr('transform', `translate(0,${plotH})`)
    .call(d3.axisBottom(x).ticks(p.ticks ?? 5).tickFormat(fmtX))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fontSize)
    .attr('fill', '#7a7a90');

  pg.append('g')
    .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickFormat(fmtY))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fontSize)
    .attr('fill', '#7a7a90');

  pg.selectAll('.domain').attr('stroke', '#e4e4ed');

  // Points — d3.symbol prend une aire : πr² redonne exactement le cercle de rayon r
  const r = p.radius ?? 7;
  const shape = resolveSymbol(p.pointShape);

  // Poids optionnel : le rayon suit la racine carrée du poids, pour que l'aire
  // du point soit proportionnelle à l'effectif et non son rayon, sinon les gros
  // échantillons écrasent visuellement les autres. Un plancher garde les
  // points les plus légers visibles.
  const weights = data.map(d => d.weight).filter(v => Number.isFinite(v) && v > 0);
  const weighted = weights.length > 0;
  const sizeOf = weighted
    ? d3.scaleSqrt().domain([0, d3.max(weights)]).range([r * 0.45, r * 1.9]).clamp(true)
    : null;
  const radiusOf = d => (weighted ? sizeOf(Number.isFinite(d.weight) ? d.weight : 0) : r);
  const symbol = d => d3.symbol().type(shape)
    .size(Math.PI * radiusOf(d) * radiusOf(d))();

  pg.selectAll('.dot')
    .data(data)
    .enter()
    .append('path')
    .attr('d', symbol)
    .attr('transform', d => `translate(${x(d.x)},${y(d.y)})`)
    .attr('fill', colorOf)
    .attr('opacity', p.opacity ?? 0.75)
    .attr('stroke', 'white')
    .attr('stroke-width', p.stroke ?? 1.5);

  // Étiquettes
  if (p.showLabels ?? true) {
    pg.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.x) + radiusOf(d) + 3)
      .attr('y', d => y(d.y) + 4)
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', fontSize - 1)
      .attr('fill', '#7a7a90')
      .text(d => d.label);
  }

  // Légende en haut
  if (grouped) {
    const legend = g.append('g');
    let cursor = 0;
    seriesNames.forEach((name, i) => {
      const item = legend.append('g').attr('transform', `translate(${cursor},0)`);
      item.append('path')
        .attr('d', d3.symbol().type(resolveSymbol(p.pointShape)).size(90))
        .attr('transform', 'translate(5,5)')
        .attr('fill', palette[i]);
      item.append('text')
        .attr('x', 15).attr('y', 9)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', fontSize)
        .attr('fill', '#7a7a90')
        .text(name);
      cursor += 15 + String(name).length * fontSize * 0.58 + 18;
    });
  }
}

// Forme des points. d3.symbolCircle reste le défaut historique.
function resolveSymbol(shape) {
  if (shape === 'square') return d3.symbolSquare;
  if (shape === 'triangle') return d3.symbolTriangle;
  if (shape === 'diamond') return d3.symbolDiamond;
  if (shape === 'cross') return d3.symbolCross;
  if (shape === 'star') return d3.symbolStar;
  if (shape === 'wye') return d3.symbolWye;
  return d3.symbolCircle;
}

// Formatage unité/décimales des valeurs d'axe (cohérent avec le Studio DataViz)
function formatAxisValue(value, unitMode, decimals, domainMax) {
  const divisors = { unit: 1, k: 1e3, M: 1e6, Md: 1e9 };
  const suffixes = { unit: '', k: 'k', M: 'M', Md: 'Md' };
  let unit = unitMode || 'auto';
  if (unit === 'auto') {
    const abs = Math.abs(domainMax || 0);
    unit = abs >= 1e9 ? 'Md' : abs >= 1e6 ? 'M' : abs >= 1e3 ? 'k' : 'unit';
  }
  const div = divisors[unit] ?? 1;
  const suf = suffixes[unit] ?? '';
  return (value / div).toLocaleString('fr-FR', {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 0,
  }) + suf;
}
