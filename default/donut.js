/**
 * @name Donut
 * @description Répartition en parts d'un total
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"A","value":35},{"label":"B","value":25},{"label":"C","value":20},{"label":"D","value":12},{"label":"E","value":8}]
 */
export function draw(svg, g, data, W, H, color) {
  const radius = Math.min(W, H) / 2 - 20;
  const cx = W / 2;
  const cy = H / 2;

  // Palette basée sur la couleur principale
  const baseColor = d3.color(color);
  const palette = data.map((_, i) => {
    const c = d3.color(color);
    c.opacity = 1 - i * 0.15;
    return d3.hsl(d3.hsl(color).h + i * 30, 0.7, 0.4 + i * 0.08).toString();
  });

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(radius * 0.52).outerRadius(radius);
  const arcLabel = d3.arc().innerRadius(radius * 0.75).outerRadius(radius * 0.75);

  const pg = svg.append('g')
    .attr('transform', `translate(${g.attr ? 0 : 0},0)`)
    .attr('transform', `translate(${W / 2 + 50},${H / 2 + 20})`);

  // Arcs
  pg.selectAll('.arc')
    .data(pie(data))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => palette[i])
    .attr('stroke', 'white')
    .attr('stroke-width', 2);

  // Labels pourcentage
  pg.selectAll('.pct')
    .data(pie(data))
    .enter()
    .append('text')
    .attr('transform', d => `translate(${arcLabel.centroid(d)})`)
    .attr('text-anchor', 'middle')
    .attr('font-family', 'DM Mono, monospace')
    .attr('font-size', 11)
    .attr('fill', 'white')
    .attr('font-weight', '500')
    .text(d => `${Math.round(d.data.value)}%`);

  // Légende à droite
  const legend = svg.append('g')
    .attr('transform', `translate(${W + 70}, ${H / 2 - data.length * 12})`);

  data.forEach((d, i) => {
    legend.append('rect')
      .attr('x', 0).attr('y', i * 26)
      .attr('width', 12).attr('height', 12)
      .attr('rx', 3)
      .attr('fill', palette[i]);

    legend.append('text')
      .attr('x', 18).attr('y', i * 26 + 10)
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', 12)
      .attr('fill', '#7a7a90')
      .text(`${d.label} (${d.value})`);
  });
}
