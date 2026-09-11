/**
 * @name Heatmap circulaire
 * @description Intensité de valeurs selon deux dimensions : angle et rayon
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"Lun-0h","x":"0h","y":"Lun","value":12},{"label":"Lun-3h","x":"3h","y":"Lun","value":8},{"label":"Lun-6h","x":"6h","y":"Lun","value":34},{"label":"Lun-9h","x":"9h","y":"Lun","value":96},{"label":"Lun-12h","x":"12h","y":"Lun","value":71},{"label":"Lun-15h","x":"15h","y":"Lun","value":63},{"label":"Lun-18h","x":"18h","y":"Lun","value":88},{"label":"Lun-21h","x":"21h","y":"Lun","value":41},{"label":"Mar-0h","x":"0h","y":"Mar","value":9},{"label":"Mar-3h","x":"3h","y":"Mar","value":6},{"label":"Mar-6h","x":"6h","y":"Mar","value":38},{"label":"Mar-9h","x":"9h","y":"Mar","value":92},{"label":"Mar-12h","x":"12h","y":"Mar","value":68},{"label":"Mar-15h","x":"15h","y":"Mar","value":59},{"label":"Mar-18h","x":"18h","y":"Mar","value":84},{"label":"Mar-21h","x":"21h","y":"Mar","value":37},{"label":"Mer-0h","x":"0h","y":"Mer","value":14},{"label":"Mer-3h","x":"3h","y":"Mer","value":7},{"label":"Mer-6h","x":"6h","y":"Mer","value":29},{"label":"Mer-9h","x":"9h","y":"Mer","value":78},{"label":"Mer-12h","x":"12h","y":"Mer","value":74},{"label":"Mer-15h","x":"15h","y":"Mer","value":52},{"label":"Mer-18h","x":"18h","y":"Mer","value":91},{"label":"Mer-21h","x":"21h","y":"Mer","value":45}]
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  // x = dimension angulaire (tour du cercle), y = dimension radiale (anneaux, du centre vers l'extérieur)
  const xVals = [...new Set(data.map(d => d.x))];
  const yVals = [...new Set(data.map(d => d.y))];
  const m = xVals.length;
  const n = yVals.length;

  const values = data.map(d => d.value).filter(v => Number.isFinite(v));
  if (!values.length) return;

  // ---- Échelle de couleur ------------------------------------------------
  // Bornes calculées sur les données (min / moyenne / max), chacune
  // remplaçable par une valeur en dur via p.scaleMin / p.scaleMid / p.scaleMax.
  const hard = (v, fallback) => {
    if (v === null || v === undefined || v === '') return fallback;
    const num = +v;
    return Number.isFinite(num) ? num : fallback;
  };

  let sMin = hard(p.scaleMin, d3.min(values));
  let sMax = hard(p.scaleMax, d3.max(values));
  if (sMax < sMin) { const swap = sMin; sMin = sMax; sMax = swap; }
  if (sMax === sMin) sMax = sMin + 1; // toutes les valeurs identiques

  let sMid = hard(p.scaleMid, d3.mean(values));
  // La moyenne peut tomber hors des bornes si l'utilisateur les fige à la main
  if (!(sMid > sMin && sMid < sMax)) sMid = (sMin + sMax) / 2;

  const cMin = p.colorMin || '#f0f0f5';
  const cMax = p.colorMax || color;
  const cMid = p.colorMid || d3.interpolate(cMin, cMax)(0.5);

  const colorScale = d3.scaleLinear()
    .domain([sMin, sMid, sMax])
    .range([cMin, cMid, cMax])
    .clamp(true); // les valeurs hors bornes figées restent lisibles

  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, sMax);

  // ---- Géométrie ---------------------------------------------------------
  const legendH = H > 170 ? 42 : 0;
  const labelPad = 26; // place réservée aux labels de catégories à l'extérieur
  const cx = W / 2;
  const cy = (H - legendH) / 2;
  const maxR = Math.max(10, Math.min(W, H - legendH) / 2 - labelPad);

  // Espacement radial : marge blanche entre deux anneaux
  const radialGap = Math.max(0, Math.min(p.radialGap ?? 2, maxR / (n + 1)));

  // Épaisseur d'un anneau : libre si p.thickness est fourni, sinon l'espace
  // disponible est réparti entre les anneaux. Toujours bornée pour ne pas
  // déborder du cercle — une épaisseur plus faible creuse le trou central.
  // Le trou par défaut (35 % du rayon) donne assez de circonférence à
  // l'anneau intérieur pour que ses cellules restent lisibles.
  const fit = Math.max(2, (maxR * 0.65 - (n - 1) * radialGap) / n);
  let t = Number.isFinite(+p.thickness) && +p.thickness > 0 ? Math.min(+p.thickness, fit) : fit;
  let r0 = maxR - (n * t + (n - 1) * radialGap);
  if (r0 < 0) {
    t = Math.max(1, (maxR - (n - 1) * radialGap) / n);
    r0 = Math.max(0, maxR - (n * t + (n - 1) * radialGap));
  }

  // Espacement circulaire : écart angulaire entre deux secteurs, en degrés
  const band = (2 * Math.PI) / m;
  const pad = Math.min(Math.max(0, p.angularGap ?? 1) * Math.PI / 180, band * 0.8);

  const xi = new Map(xVals.map((v, i) => [v, i]));
  const yi = new Map(yVals.map((v, k) => [v, k]));
  const rIn = d => r0 + yi.get(d.y) * (t + radialGap);
  const rOut = d => rIn(d) + t;
  const a0 = d => xi.get(d.x) * band + pad / 2;
  const a1 = d => (xi.get(d.x) + 1) * band - pad / 2;

  const arc = d3.arc().cornerRadius(p.radius ?? 2);
  const cg = g.append('g').attr('transform', `translate(${cx},${cy})`);

  // ---- Cellules ----------------------------------------------------------
  cg.selectAll('.cell')
    .data(data)
    .enter()
    .append('path')
    .attr('d', d => arc({
      innerRadius: rIn(d),
      outerRadius: rOut(d),
      startAngle: a0(d),
      endAngle: a1(d),
    }))
    .attr('fill', d => colorScale(d.value))
    .attr('opacity', p.opacity ?? 1)
    .attr('stroke', (p.stroke ?? 0) > 0 ? 'white' : 'none')
    .attr('stroke-width', p.stroke ?? 0);

  // ---- Valeurs dans les cellules ----------------------------------------
  if (p.showLabels) {
    cg.selectAll('.cell-label')
      .data(data)
      .enter()
      .append('text')
      .attr('transform', d => {
        const a = (a0(d) + a1(d)) / 2;
        const r = (rIn(d) + rOut(d)) / 2;
        return `translate(${Math.sin(a) * r},${-Math.cos(a) * r})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', (p.fontSize ?? 12) - 2)
      // Contraste automatique selon le remplissage de la cellule
      .attr('fill', d => (d3.hsl(colorScale(d.value)).l > 0.62 ? '#0f0f1a' : '#ffffff'))
      .text(d => fmtVal(d.value));
  }

  // ---- Labels de la dimension angulaire (autour du cercle) ---------------
  const lr = maxR + 12;
  xVals.forEach((v, i) => {
    const a = (i + 0.5) * band;
    const sx = Math.sin(a);
    cg.append('text')
      .attr('x', sx * lr)
      .attr('y', -Math.cos(a) * lr)
      .attr('text-anchor', sx > 0.15 ? 'start' : sx < -0.15 ? 'end' : 'middle')
      .attr('dy', (-Math.cos(a) * 0.4 + 0.35) + 'em')
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', p.fontSize ?? 12)
      .attr('fill', '#7a7a90')
      .text(v);
  });

  // ---- Labels de la dimension radiale (verticale, sur les anneaux) -------
  yVals.forEach((v, k) => {
    cg.append('text')
      .attr('x', 0)
      .attr('y', -(r0 + k * (t + radialGap) + t / 2))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', (p.fontSize ?? 12) - 1)
      .attr('fill', '#0f0f1a')
      .attr('font-weight', '500')
      .attr('stroke', 'white')
      .attr('stroke-width', 3)
      .attr('paint-order', 'stroke')
      .text(v);
  });

  // ---- Légende de l'échelle de couleur ----------------------------------
  if (legendH) {
    const gradId = 'circheat-grad-' + Math.random().toString(36).slice(2);
    const grad = svg.append('defs').append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0').attr('y1', '0')
      .attr('x2', '1').attr('y2', '0');
    const midPct = ((sMid - sMin) / (sMax - sMin)) * 100;
    grad.append('stop').attr('offset', '0%').attr('stop-color', cMin);
    grad.append('stop').attr('offset', midPct + '%').attr('stop-color', cMid);
    grad.append('stop').attr('offset', '100%').attr('stop-color', cMax);

    const lw = Math.min(220, W * 0.6);
    const lx = (W - lw) / 2;
    const ly = H - legendH + 14;
    const lg = g.append('g');

    lg.append('rect')
      .attr('x', lx).attr('y', ly)
      .attr('width', lw).attr('height', 8)
      .attr('rx', 4)
      .attr('fill', `url(#${gradId})`);

    [[sMin, lx, 'start'], [sMid, lx + (lw * midPct) / 100, 'middle'], [sMax, lx + lw, 'end']]
      .forEach(stop => {
        lg.append('text')
          .attr('x', stop[1])
          .attr('y', ly + 22)
          .attr('text-anchor', stop[2])
          .attr('font-family', 'DM Mono, monospace')
          .attr('font-size', (p.fontSize ?? 12) - 1)
          .attr('fill', '#7a7a90')
          .text(fmtVal(stop[0]));
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
