/**
 * @name Aire empilée
 * @description Volume d'une valeur dans le temps, empilé par série
 * @author datapuzzle
 * @version 1.1
 * @sampleData [{"label":"2019","value":42,"series":"Nord"},{"label":"2020","value":58,"series":"Nord"},{"label":"2021","value":51,"series":"Nord"},{"label":"2022","value":67,"series":"Nord"},{"label":"2023","value":73,"series":"Nord"},{"label":"2024","value":69,"series":"Nord"},{"label":"2019","value":28,"series":"Sud"},{"label":"2020","value":31,"series":"Sud"},{"label":"2021","value":44,"series":"Sud"},{"label":"2022","value":39,"series":"Sud"},{"label":"2023","value":52,"series":"Sud"},{"label":"2024","value":61,"series":"Sud"}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Catégorie","description":"Axe des abscisses, ordonné tel que reçu"},"value":{"type":"number","required":true,"label":"Valeur","description":"Grandeur mesurée, sommée en cas de doublon label/série"},"series":{"type":"category","required":false,"label":"Série","description":"Empile une aire par valeur distincte. Absent ou unique : aire simple"}}
 * @params {"areaMode":{"group":"visuel","type":"select","label":"Étiquettes","default":"value","options":[{"value":"value","label":"Valeur"},{"value":"percent","label":"Pourcentage"}]},"opacity":{"group":"general","type":"range","label":"Opacité de l'aire","min":0,"max":1,"step":0.05,"default":1},"stroke":{"group":"general","type":"range","label":"Épaisseur de la courbe","min":0.5,"max":8,"step":0.5,"default":2.5,"unit":"px"},"radius":{"group":"general","type":"range","label":"Rayon des points","min":0,"max":12,"step":1,"default":4,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":false},"showGrid":{"group":"general","type":"toggle","label":"Afficher la grille","default":true},"ticks":{"group":"general","type":"range","label":"Graduations","min":2,"max":12,"step":1,"default":5},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  // Une série par valeur distincte du champ `series`. Champ absent ou valeur
  // unique : rendu simple, identique à la version sans séries.
  const seriesNames = [...new Set(data.map(d => d.series))]
    .filter(s => s !== undefined && s !== null && s !== '');
  const grouped = seriesNames.length > 1;
  const keys = grouped ? seriesNames : ['value'];
  const labels = [...new Set(data.map(d => d.label))];

  // Table label × série ; les doublons sont sommés
  const rows = labels.map(label => {
    const row = { label: label };
    keys.forEach(k => { row[k] = 0; });
    return row;
  });
  const rowOf = new Map(rows.map(r => [r.label, r]));
  data.forEach(d => {
    const row = rowOf.get(d.label);
    const key = grouped ? d.series : 'value';
    if (row && key in row) row[key] += d.value;
  });

  const stacked = d3.stack().keys(keys)(rows);
  const totalOf = new Map(rows.map(r => [r.label, keys.reduce((sum, k) => sum + r[k], 0)]));
  const grandTotal = d3.sum(rows, r => keys.reduce((sum, k) => sum + r[k], 0)) || 1;

  const fontSize = p.fontSize ?? 12;
  const legendH = grouped ? fontSize + 14 : 0; // la légende mange de la hauteur
  const plotH = Math.max(10, H - legendH);

  const x = d3.scalePoint().domain(labels).range([0, W]);
  const yMax = d3.max(stacked[stacked.length - 1], s => s[1]) * 1.15;
  const y = d3.scaleLinear().domain([0, yMax]).range([plotH, 0]);
  const fmtY = v => formatAxisValue(v, p.unitMode, p.decimals, yMax);

  // Palette dérivée de la couleur principale, comme le Donut
  const palette = keys.map((_, i) => (grouped
    ? d3.hsl(d3.hsl(color).h + i * 30, 0.7, 0.4 + i * 0.08).toString()
    : color));

  const pg = g.append('g').attr('transform', `translate(0,${legendH})`);
  const fill = p.opacity ?? 1;

  // Grille
  if (p.showGrid ?? true) {
    pg.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    pg.select('.grid .domain').remove();
  }

  // Dégradés — un par série, atténués par l'opacité
  const suffix = Math.random().toString(36).slice(2);
  const defs = svg.append('defs');
  keys.forEach((k, i) => {
    const grad = defs.append('linearGradient')
      .attr('id', 'area-grad-' + suffix + '-' + i)
      .attr('x1', '0').attr('y1', '0')
      .attr('x2', '0').attr('y2', '1');
    grad.append('stop').attr('offset', '0%')
      .attr('stop-color', palette[i]).attr('stop-opacity', 0.35 * fill);
    grad.append('stop').attr('offset', '100%')
      .attr('stop-color', palette[i]).attr('stop-opacity', 0.02 * fill);
  });

  // Axes
  pg.append('g').attr('transform', `translate(0,${plotH})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fontSize)
    .attr('fill', '#7a7a90');

  pg.append('g')
    .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickFormat(fmtY))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fontSize)
    .attr('fill', '#7a7a90');

  pg.selectAll('.domain').attr('stroke', '#e4e4ed');
  pg.selectAll('.tick line').attr('stroke', 'none');

  const area = d3.area()
    .x(d => x(d.data.label))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveCatmullRom);

  const line = d3.line()
    .x(d => x(d.data.label))
    .y(d => y(d[1]))
    .curve(d3.curveCatmullRom);

  stacked.forEach((layer, i) => {
    pg.append('path')
      .datum(layer)
      .attr('d', area)
      .attr('fill', `url(#area-grad-${suffix}-${i})`);

    pg.append('path')
      .datum(layer)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', palette[i])
      .attr('stroke-width', p.stroke ?? 2.5);

    pg.selectAll('.dot-' + i)
      .data(layer)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.data.label))
      .attr('cy', d => y(d[1]))
      .attr('r', p.radius ?? 4)
      .attr('fill', palette[i])
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
  });

  const firstLabel = labels[0];
  const lastLabel = labels[labels.length - 1];
  const edgeAnchor = l => (l === firstLabel ? 'start' : l === lastLabel ? 'end' : 'middle');
  const edgeShift = l => (l === firstLabel ? 3 : l === lastLabel ? -3 : 0);

  // Valeurs ou pourcentages
  if (p.showLabels) {
    stacked.forEach((layer, i) => {
      pg.selectAll('.label-' + i)
        .data(layer)
        .enter()
        .append('text')
        // Empilé : au milieu de la bande. Série unique : au-dessus de la courbe.
        // Aux deux extrémités le texte est ancré vers l'intérieur, sinon il
        // sort de la bande colorée et devient blanc sur fond blanc.
        .attr('x', d => x(d.data.label) + edgeShift(d.data.label))
        .attr('y', d => (grouped ? y((d[0] + d[1]) / 2) + 4 : y(d[1]) - 12))
        .attr('text-anchor', d => edgeAnchor(d.data.label))
        .attr('font-family', 'DM Mono, monospace')
        .attr('font-size', fontSize - 1)
        .attr('fill', grouped ? '#ffffff' : '#7a7a90')
        .attr('font-weight', grouped ? '500' : null)
        .text(d => {
          const value = d[1] - d[0];
          if (p.areaMode !== 'percent') return fmtY(value);
          // Empilé : part dans la pile du label. Sinon : part du total général.
          const base = grouped ? (totalOf.get(d.data.label) || 1) : grandTotal;
          return `${Math.round((value / base) * 100)}%`;
        });
    });
  }

  // Légende en haut
  if (grouped) {
    const legend = g.append('g');
    let cursor = 0;
    keys.forEach((key, i) => {
      const item = legend.append('g').attr('transform', `translate(${cursor},0)`);
      item.append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', 10).attr('height', 10)
        .attr('rx', 2)
        .attr('fill', palette[i]);
      item.append('text')
        .attr('x', 15).attr('y', 9)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', fontSize)
        .attr('fill', '#7a7a90')
        .text(key);
      cursor += 15 + String(key).length * fontSize * 0.58 + 18;
    });
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
