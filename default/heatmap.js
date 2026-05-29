/**
 * @name Heatmap
 * @description Intensité de valeurs sur une grille 2D
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"Lun-6h","x":"Lun","y":"6h","value":0.2},{"label":"Lun-9h","x":"Lun","y":"9h","value":0.8},{"label":"Lun-12h","x":"Lun","y":"12h","value":0.6},{"label":"Mar-6h","x":"Mar","y":"6h","value":0.1},{"label":"Mar-9h","x":"Mar","y":"9h","value":0.9},{"label":"Mar-12h","x":"Mar","y":"12h","value":0.5},{"label":"Mer-6h","x":"Mer","y":"6h","value":0.4},{"label":"Mer-9h","x":"Mer","y":"9h","value":0.7},{"label":"Mer-12h","x":"Mer","y":"12h","value":0.3}]
 */
export function draw(svg, g, data, W, H, color) {
  const xVals = [...new Set(data.map(d => d.x))];
  const yVals = [...new Set(data.map(d => d.y))];

  const x = d3.scaleBand().domain(xVals).range([0, W]).padding(0.05);
  const y = d3.scaleBand().domain(yVals).range([0, H]).padding(0.05);
  const colorScale = d3.scaleSequential()
    .interpolator(d3.interpolate('#f0f0f5', color))
    .domain([0, 1]);

  // Axes
  g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', 12)
    .attr('fill', '#7a7a90');

  g.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', 12)
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
    .attr('rx', 4);
}
