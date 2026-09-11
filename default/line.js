/**
 * @name Courbe temporelle
 * @description Évolution d'une valeur dans le temps
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"2019","value":42},{"label":"2020","value":58},{"label":"2021","value":51},{"label":"2022","value":67},{"label":"2023","value":73},{"label":"2024","value":69}]
 */
function draw(svg, g, data, W, H, color, p) {
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

  // Zone sous la courbe (gradient subtil)
  const area = d3.area()
    .x(d => x(d.label))
    .y0(H)
    .y1(d => y(d.value))
    .curve(d3.curveCatmullRom);

  g.append('path')
    .datum(data)
    .attr('d', area)
    .attr('fill', color)
    .attr('opacity', 0.08);

  // Ligne
  const line = d3.line()
    .x(d => x(d.label))
    .y(d => y(d.value))
    .curve(d3.curveCatmullRom);

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
