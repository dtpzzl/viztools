/**
 * @name Barres horizontales
 * @description Classement de valeurs (ranking)
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"Paris","value":92},{"label":"Lyon","value":74},{"label":"Marseille","value":68},{"label":"Toulouse","value":61},{"label":"Bordeaux","value":55},{"label":"Nantes","value":49}]
 */
export function draw(svg, g, data, W, H, color) {
  // Trier par valeur décroissante
  const sorted = [...data].sort((a, b) => b.value - a.value);

  const x = d3.scaleLinear()
    .domain([0, d3.max(sorted, d => d.value) * 1.1])
    .range([0, W]);

  const y = d3.scaleBand()
    .domain(sorted.map(d => d.label))
    .range([0, H])
    .padding(0.25);

  // Axe X
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(5))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', 12)
    .attr('fill', '#7a7a90');

  // Axe Y (labels)
  g.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', 13)
    .attr('fill', '#0f0f1a')
    .attr('font-weight', '500');

  g.selectAll('.domain').attr('stroke', '#e4e4ed');
  g.selectAll('.tick line').attr('stroke', 'none');

  // Grille verticale
  g.append('g').attr('class', 'grid')
    .call(d3.axisBottom(x).ticks(5).tickSize(H).tickFormat(''))
    .attr('transform', 'translate(0,0)')
    .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
  g.select('.grid .domain').remove();

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
    .attr('rx', 5)
    .attr('opacity', (d, i) => 1 - i * 0.08);

  // Valeurs en bout de barre
  g.selectAll('.label')
    .data(sorted)
    .enter()
    .append('text')
    .attr('x', d => x(d.value) + 8)
    .attr('y', d => y(d.label) + y.bandwidth() / 2 + 4)
    .attr('font-family', 'DM Mono, monospace')
    .attr('font-size', 12)
    .attr('fill', '#7a7a90')
    .text(d => d.value);
}
