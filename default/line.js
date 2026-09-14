/**
 * @name Courbe temporelle
 * @description Évolution d'une valeur dans le temps
 * @icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 9-9"/><circle cx="8" cy="11" r="1.7" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="1.7" fill="currentColor" stroke="none"/><circle cx="21" cy="5" r="1.7" fill="currentColor" stroke="none"/></svg>
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"2019","value":42},{"label":"2020","value":58},{"label":"2021","value":51},{"label":"2022","value":67},{"label":"2023","value":73},{"label":"2024","value":69}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Catégorie","description":"Axe des abscisses, ordonné tel que reçu"},"value":{"type":"number","required":true,"label":"Valeur","description":"Grandeur mesurée"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"curve":{"group":"visuel","type":"select","label":"Lissage","default":"catmullRom","options":[{"value":"catmullRom","label":"Lissé"},{"value":"monotone","label":"Lissé sans dépassement"},{"value":"linear","label":"Linéaire"},{"value":"step","label":"En marches"}]},"opacity":{"group":"general","type":"range","label":"Opacité du remplissage","min":0,"max":1,"step":0.02,"default":0.08},"stroke":{"group":"general","type":"range","label":"Épaisseur de la courbe","min":0.5,"max":8,"step":0.5,"default":2.5,"unit":"px"},"radius":{"group":"general","type":"range","label":"Rayon des points","min":0,"max":12,"step":1,"default":5,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":true},"showGrid":{"group":"general","type":"toggle","label":"Afficher la grille","default":true},"ticks":{"group":"general","type":"range","label":"Graduations","min":2,"max":12,"step":1,"default":5},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
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
  const x = d3.scalePoint()
    .domain(data.map(d => d.label))
    .range([0, W]);

  const yMax = d3.max(data, d => d.value) * 1.15;
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([H, 0]);
  const fmtY = v => formatAxisValue(v, p.unitMode, p.decimals, yMax);

  // Grille
  if (p.showGrid ?? true) {
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();
  }

  // Axes
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', p.fontSize ?? 12)
    .attr('fill', '#7a7a90');

  g.append('g')
    .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickFormat(fmtY))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', p.fontSize ?? 12)
    .attr('fill', '#7a7a90');

  g.selectAll('.domain').attr('stroke', '#e4e4ed');
  g.selectAll('.tick line').attr('stroke', 'none');

  // Zone sous la courbe
  const curve = resolveCurve(p.curve);
  const area = d3.area()
    .x(d => x(d.label))
    .y0(H)
    .y1(d => y(d.value))
    .curve(curve);

  g.append('path')
    .datum(data)
    .attr('d', area)
    .attr('fill', color)
    .attr('opacity', p.opacity ?? 0.08);

  // Ligne
  const line = d3.line()
    .x(d => x(d.label))
    .y(d => y(d.value))
    .curve(curve);

  g.append('path')
    .datum(data)
    .attr('d', line)
    .attr('fill', 'none')
    .attr('stroke', color)
    .attr('stroke-width', p.stroke ?? 2.5);

  // Points
  g.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.label))
    .attr('cy', d => y(d.value))
    .attr('r', p.radius ?? 5)
    .attr('fill', color)
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  // Valeurs
  if (p.showLabels ?? true) {
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.label))
      .attr('y', d => y(d.value) - 12)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', (p.fontSize ?? 12) - 1)
      .attr('fill', '#7a7a90')
      .text(d => fmtY(d.value));
  }
}

// Type de lissage appliqué à la courbe et à sa zone de remplissage.
// curveCatmullRom reste le défaut historique ; curveMonotoneX évite les
// dépassements sous zéro sur des séries très irrégulières.
function resolveCurve(mode) {
  if (mode === 'linear') return d3.curveLinear;
  if (mode === 'monotone') return d3.curveMonotoneX;
  if (mode === 'step') return d3.curveStep;
  return d3.curveCatmullRom;
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
