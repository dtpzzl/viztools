/**
 * @name Nuage de points
 * @description Corrélation entre deux variables
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"A","x":12,"y":34},{"label":"B","x":45,"y":67},{"label":"C","x":23,"y":12},{"label":"D","x":78,"y":89},{"label":"E","x":56,"y":45},{"label":"F","x":34,"y":78},{"label":"G","x":89,"y":23},{"label":"H","x":67,"y":56}]
 */
function draw(svg, g, data, W, H, color, p) {
  const xMax = d3.max(data, d => d.x) * 1.1;
  const x = d3.scaleLinear()
    .domain([0, xMax])
    .range([0, W]);
  const fmtX = v => formatAxisValue(v, p.unitMode, p.decimals, xMax);

  const yMax = d3.max(data, d => d.y) * 1.1;
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([H, 0]);
  const fmtY = v => formatAxisValue(v, p.unitMode, p.decimals, yMax);

  // Grille
  if (p.showGrid ?? true) {
    g.append('g').attr('class', 'grid-x')
      .call(d3.axisBottom(x).ticks(p.ticks ?? 5).tickSize(H).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    g.select('.grid-x .domain').remove();

    g.append('g').attr('class', 'grid-y')
      .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    g.select('.grid-y .domain').remove();
  }

  // Axes
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(p.ticks ?? 5).tickFormat(fmtX))
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

  // Points
  g.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.x))
    .attr('cy', d => y(d.y))
    .attr('r', p.radius ?? 7)
    .attr('fill', color)
    .attr('opacity', p.opacity ?? 0.75)
    .attr('stroke', 'white')
    .attr('stroke-width', p.stroke ?? 1.5);

  // Labels
  if (p.showLabels ?? true) {
    g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.x) + 10)
      .attr('y', d => y(d.y) + 4)
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', p.fontSize ?? 11)
      .attr('fill', '#7a7a90')
      .text(d => d.label);
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
