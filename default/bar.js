/**
 * @name Barres verticales
 * @description Comparaison de valeurs entre catégories
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"2019","value":42},{"label":"2020","value":58},{"label":"2021","value":51},{"label":"2022","value":67},{"label":"2023","value":73},{"label":"2024","value":69}]
 */
export function draw(svg, g, data, W, H, color) {
  const x = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, W])
    .padding(0.28);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value) * 1.1])
    .range([H, 0]);

  // Grille horizontale
  g.append('g').attr('class', 'grid')
    .call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat(''))
    .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
  g.select('.grid .domain').remove();

  // Axes
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', 12)
    .attr('fill', '#7a7a90');

  g.append('g')
    .call(d3.axisLeft(y).ticks(5))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', 12)
    .attr('fill', '#7a7a90');

  g.selectAll('.domain').attr('stroke', '#e4e4ed');
  g.selectAll('.tick line').attr('stroke', 'none');

  // Barres
  g.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.label))
    .attr('y', d => y(d.value))
    .attr('width', x.bandwidth())
    .attr('height', d => H - y(d.value))
    .attr('fill', color)
    .attr('rx', 5)
    .attr('opacity', 0.9);

  // Valeurs au-dessus des barres
  g.selectAll('.label')
    .data(data)
    .enter()
    .append('text')
    .attr('x', d => x(d.label) + x.bandwidth() / 2)
    .attr('y', d => y(d.value) - 6)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'DM Mono, monospace')
    .attr('font-size', 11)
    .attr('fill', '#7a7a90')
    .text(d => d.value);
}
