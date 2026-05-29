/**
 * @name Nuage de points
 * @description Corrélation entre deux variables
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"A","x":12,"y":34},{"label":"B","x":45,"y":67},{"label":"C","x":23,"y":12},{"label":"D","x":78,"y":89},{"label":"E","x":56,"y":45},{"label":"F","x":34,"y":78},{"label":"G","x":89,"y":23},{"label":"H","x":67,"y":56}]
 */
export function draw(svg, g, data, W, H, color) {
  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.x) * 1.1])
    .range([0, W]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.y) * 1.1])
    .range([H, 0]);

  // Grille
  g.append('g').attr('class', 'grid-x')
    .call(d3.axisBottom(x).ticks(5).tickSize(H).tickFormat(''))
    .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
  g.select('.grid-x .domain').remove();

  g.append('g').attr('class', 'grid-y')
    .call(d3.axisLeft(y).ticks(5).tickSize(-W).tickFormat(''))
    .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
  g.select('.grid-y .domain').remove();

  // Axes
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x).ticks(5))
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

  // Points
  g.selectAll('.dot')
    .data(data)
    .enter()
    .append('circle')
    .attr('cx', d => x(d.x))
    .attr('cy', d => y(d.y))
    .attr('r', 7)
    .attr('fill', color)
    .attr('opacity', 0.75)
    .attr('stroke', 'white')
    .attr('stroke-width', 1.5);

  // Labels
  g.selectAll('.label')
    .data(data)
    .enter()
    .append('text')
    .attr('x', d => x(d.x) + 10)
    .attr('y', d => y(d.y) + 4)
    .attr('font-family', 'DM Mono, monospace')
    .attr('font-size', 11)
    .attr('fill', '#7a7a90')
    .text(d => d.label);
}
