/**
 * @name Barres horizontales
 * @description Classement de valeurs (ranking)
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"Paris","value":92},{"label":"Lyon","value":74},{"label":"Marseille","value":68},{"label":"Toulouse","value":61},{"label":"Bordeaux","value":55},{"label":"Nantes","value":49}]
 * @params {"opacity":{"group":"general","type":"range","label":"Opacité de la première barre","min":0,"max":1,"step":0.05,"default":1},"radius":{"group":"general","type":"range","label":"Arrondi des barres","min":0,"max":20,"step":1,"default":5,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":true},"showGrid":{"group":"general","type":"toggle","label":"Afficher la grille","default":true},"ticks":{"group":"general","type":"range","label":"Graduations","min":2,"max":12,"step":1,"default":5},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  // Trier par valeur décroissante
  const sorted = [...data].sort((a, b) => b.value - a.value);

  const xMax = d3.max(sorted, d => d.value) * 1.1;
  const x = d3.scaleLinear()
    .domain([0, xMax])
    .range([0, W]);
  const fmtX = v => formatAxisValue(v, p.unitMode, p.decimals, xMax);

  const y = d3.scaleBand()
    .domain(sorted.map(d => d.label))
    .range([0, H])
    .padding(0.25);

  // Axe X
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(p.ticks ?? 5).tickFormat(fmtX))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', p.fontSize ?? 12)
    .attr('fill', '#7a7a90');

  // Axe Y (labels)
  g.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', (p.fontSize ?? 12) + 1)
    .attr('fill', '#0f0f1a')
    .attr('font-weight', '500');

  g.selectAll('.domain').attr('stroke', '#e4e4ed');
  g.selectAll('.tick line').attr('stroke', 'none');

  // Grille verticale
  if (p.showGrid ?? true) {
    g.append('g').attr('class', 'grid')
      .call(d3.axisBottom(x).ticks(p.ticks ?? 5).tickSize(H).tickFormat(''))
      .attr('transform', 'translate(0,0)')
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();
  }

  // Barres
  g.selectAll('.bar')
    .data(sorted)
    .enter()
    .append('rect')
    .attr('x', 0)
    .attr('y', d => y(d.label))
    .attr('width', d => x(d.value))
    .attr('height', y.bandwidth())
    .attr('fill', color)
    .attr('rx', p.radius ?? 5)
    .attr('opacity', (d, i) => Math.max(0.15, (p.opacity ?? 1) - i * 0.08));

  // Valeurs en bout de barre
  if (p.showLabels ?? true) {
    g.selectAll('.label')
      .data(sorted)
      .enter()
      .append('text')
      .attr('x', d => x(d.value) + 8)
      .attr('y', d => y(d.label) + y.bandwidth() / 2 + 4)
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', p.fontSize ?? 12)
      .attr('fill', '#7a7a90')
      .text(d => fmtX(d.value));
  }
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
