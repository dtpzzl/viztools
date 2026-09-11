/**
 * @name Donut
 * @description Répartition en parts d'un total
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"A","value":35},{"label":"B","value":25},{"label":"C","value":20},{"label":"D","value":12},{"label":"E","value":8}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Catégorie","description":"Une part du total par valeur distincte"},"value":{"type":"number","required":true,"label":"Valeur","description":"Grandeur mesurée, sommée pour obtenir le total"}}
 * @params {"donutMode":{"group":"visuel","type":"select","label":"Étiquettes","default":"percent","options":[{"value":"percent","label":"Pourcentage du total"},{"value":"value","label":"Valeur brute"}]},"thickness":{"group":"visuel","type":"number","label":"Épaisseur de l'anneau","default":null,"placeholder":"48 % du rayon","unit":"px"},"stroke":{"group":"general","type":"range","label":"Liseré entre les parts","min":0,"max":8,"step":0.5,"default":2,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les étiquettes","default":true},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  const radius = Math.min(W, H) / 2 - 20;
  const total = d3.sum(data, d => d.value) || 1;
  const valueMax = d3.max(data, d => d.value);
  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, valueMax);

  // Palette basée sur la couleur principale
  const palette = data.map((_, i) =>
    d3.hsl(d3.hsl(color).h + i * 30, 0.7, 0.4 + i * 0.08).toString()
  );

  // Épaisseur de l'anneau : 48 % du rayon par défaut, bornée pour que le trou
  // central ne disparaisse pas et que l'anneau ne sorte pas du cercle.
  const thickness = Number.isFinite(+p.thickness) && +p.thickness > 0
    ? Math.min(+p.thickness, radius * 0.95)
    : radius * 0.48;
  const inner = radius - thickness;
  const mid = (inner + radius) / 2;

  const pie = d3.pie().value(d => d.value).sort(null);
  const arc = d3.arc().innerRadius(inner).outerRadius(radius);
  const arcLabel = d3.arc().innerRadius(mid).outerRadius(mid);

  const pg = g.append('g')
    .attr('transform', `translate(${W / 2},${H / 2})`);

  // Arcs
  pg.selectAll('.arc')
    .data(pie(data))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => palette[i])
    .attr('stroke', 'white')
    .attr('stroke-width', p.stroke ?? 2);

  // Labels pourcentage (calculés à partir du total, pas de la valeur brute)
  if (p.showLabels ?? true) {
    pg.selectAll('.pct')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('transform', d => `translate(${arcLabel.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', (p.fontSize ?? 12) - 1)
      .attr('fill', 'white')
      .attr('font-weight', '500')
      .text(d => p.donutMode === 'value' ? fmtVal(d.data.value) : `${Math.round(d.data.value / total * 100)}%`);
  }

  // Légende à droite
  const legend = g.append('g')
    .attr('transform', `translate(${W / 2 + radius + 30}, ${H / 2 - data.length * 13})`);

  data.forEach((d, i) => {
    legend.append('rect')
      .attr('x', 0).attr('y', i * 26)
      .attr('width', 12).attr('height', 12)
      .attr('rx', 3)
      .attr('fill', palette[i]);

    legend.append('text')
      .attr('x', 18).attr('y', i * 26 + 10)
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', p.fontSize ?? 12)
      .attr('fill', '#7a7a90')
      .text(`${d.label} (${fmtVal(d.value)})`);
  });
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
