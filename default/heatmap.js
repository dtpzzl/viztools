/**
 * @name Heatmap
 * @description Intensité de valeurs sur une grille 2D
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"Lun-6h","x":"Lun","y":"6h","value":0.2},{"label":"Lun-9h","x":"Lun","y":"9h","value":0.8},{"label":"Lun-12h","x":"Lun","y":"12h","value":0.6},{"label":"Mar-6h","x":"Mar","y":"6h","value":0.1},{"label":"Mar-9h","x":"Mar","y":"9h","value":0.9},{"label":"Mar-12h","x":"Mar","y":"12h","value":0.5},{"label":"Mer-6h","x":"Mer","y":"6h","value":0.4},{"label":"Mer-9h","x":"Mer","y":"9h","value":0.7},{"label":"Mer-12h","x":"Mer","y":"12h","value":0.3}]
 * @params {"radius":{"group":"general","type":"range","label":"Arrondi des cellules","min":0,"max":20,"step":1,"default":4,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":false},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  const xVals = [...new Set(data.map(d => d.x))];
  const yVals = [...new Set(data.map(d => d.y))];

  const x = d3.scaleBand().domain(xVals).range([0, W]).padding(0.05);
  const y = d3.scaleBand().domain(yVals).range([0, H]).padding(0.05);
  const values = data.map(d => d.value);
  const valueMax = d3.max(values);
  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, valueMax);
  const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolate('#f0f0f5', color))
    .domain([d3.min(values), valueMax]);

  // Axes
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', p.fontSize ?? 12)
    .attr('fill', '#7a7a90');

  g.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', p.fontSize ?? 12)
    .attr('fill', '#7a7a90');

  g.selectAll('.domain').attr('stroke', '#e4e4ed');
  g.selectAll('.tick line').attr('stroke', 'none');

  // Cellules
  g.selectAll('.cell')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.x))
    .attr('y', d => y(d.y))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', d => colorScale(d.value))
    .attr('rx', p.radius ?? 4);

  // Valeurs dans les cellules
  if (p.showLabels) {
    g.selectAll('.cell-label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.x) + x.bandwidth() / 2)
      .attr('y', d => y(d.y) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', (p.fontSize ?? 12) - 1)
      .attr('fill', '#0f0f1a')
      .text(d => fmtVal(d.value));
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
