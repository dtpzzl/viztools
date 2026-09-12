/**
 * @name Heatmap circulaire
 * @description Intensité de valeurs selon deux dimensions : angle et rayon
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"Lun-0h","theta":"0h","r":"Lun","value":12},{"label":"Lun-3h","theta":"3h","r":"Lun","value":8},{"label":"Lun-6h","theta":"6h","r":"Lun","value":34},{"label":"Lun-9h","theta":"9h","r":"Lun","value":96},{"label":"Lun-12h","theta":"12h","r":"Lun","value":71},{"label":"Lun-15h","theta":"15h","r":"Lun","value":63},{"label":"Lun-18h","theta":"18h","r":"Lun","value":88},{"label":"Lun-21h","theta":"21h","r":"Lun","value":41},{"label":"Mar-0h","theta":"0h","r":"Mar","value":9},{"label":"Mar-3h","theta":"3h","r":"Mar","value":6},{"label":"Mar-6h","theta":"6h","r":"Mar","value":38},{"label":"Mar-9h","theta":"9h","r":"Mar","value":92},{"label":"Mar-12h","theta":"12h","r":"Mar","value":68},{"label":"Mar-15h","theta":"15h","r":"Mar","value":59},{"label":"Mar-18h","theta":"18h","r":"Mar","value":84},{"label":"Mar-21h","theta":"21h","r":"Mar","value":37},{"label":"Mer-0h","theta":"0h","r":"Mer","value":14},{"label":"Mer-3h","theta":"3h","r":"Mer","value":7},{"label":"Mer-6h","theta":"6h","r":"Mer","value":29},{"label":"Mer-9h","theta":"9h","r":"Mer","value":78},{"label":"Mer-12h","theta":"12h","r":"Mer","value":74},{"label":"Mer-15h","theta":"15h","r":"Mer","value":52},{"label":"Mer-18h","theta":"18h","r":"Mer","value":91},{"label":"Mer-21h","theta":"21h","r":"Mer","value":45}]
 * @dataFields {"theta":{"type":"category","required":true,"label":"Secteur","description":"Dimension angulaire, déployée autour du cercle"},"r":{"type":"category","required":true,"label":"Anneau","description":"Dimension radiale, du centre vers l'extérieur"},"value":{"type":"number","required":true,"label":"Intensité","description":"Détermine la couleur de la cellule"}}
 * @params {"thickness":{"group":"visuel","type":"number","label":"Épaisseur des anneaux","default":null,"placeholder":"auto","unit":"px"},"radialGap":{"group":"visuel","type":"range","label":"Espacement radial","min":0,"max":30,"step":1,"default":2,"unit":"px"},"angularGap":{"group":"visuel","type":"range","label":"Espacement circulaire","min":0,"max":15,"step":0.5,"default":1,"unit":"°"},"scaleMin":{"group":"visuel","type":"number","label":"Borne basse","default":null,"placeholder":"min des données"},"scaleMid":{"group":"visuel","type":"number","label":"Borne neutre","default":null,"placeholder":"moyenne des données"},"scaleMax":{"group":"visuel","type":"number","label":"Borne haute","default":null,"placeholder":"max des données"},"colorMin":{"group":"visuel","type":"color","label":"Couleur min","default":null,"placeholder":"#f0f0f5"},"colorMid":{"group":"visuel","type":"color","label":"Couleur neutre","default":null,"placeholder":"interpolée"},"colorMax":{"group":"visuel","type":"color","label":"Couleur max","default":null,"placeholder":"couleur principale"},"opacity":{"group":"general","type":"range","label":"Opacité des cellules","min":0,"max":1,"step":0.05,"default":1},"stroke":{"group":"general","type":"range","label":"Bordure des cellules","min":0,"max":8,"step":0.5,"default":0,"unit":"px"},"radius":{"group":"general","type":"range","label":"Arrondi des cellules","min":0,"max":12,"step":1,"default":2,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":false},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  // theta = dimension angulaire (tour du cercle), r = dimension radiale
  // (anneaux, du centre vers l'extérieur). Les variables internes restent
  // nommées sectors/rings : r0, rIn et rOut sont déjà des rayons en pixels.
  const sectors = [...new Set(data.map(d => d.theta))];
  const rings = [...new Set(data.map(d => d.r))];
  const m = sectors.length;
  const n = rings.length;

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

  const sectorIndex = new Map(sectors.map((v, i) => [v, i]));
  const ringIndex = new Map(rings.map((v, k) => [v, k]));
  const rIn = d => r0 + ringIndex.get(d.r) * (t + radialGap);
  const rOut = d => rIn(d) + t;
  const a0 = d => sectorIndex.get(d.theta) * band + pad / 2;
  const a1 = d => (sectorIndex.get(d.theta) + 1) * band - pad / 2;

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
      // Contraste automatique sur la clarté perceptuelle (Lab) et non la
      // clarté HSL, qui surestime les bleus : #6c63ff passe pour clair en HSL
      // alors qu'un texte sombre y est peu lisible.
      .attr('fill', d => (d3.lab(colorScale(d.value)).l > 62 ? '#0f0f1a' : '#ffffff'))
      .text(d => fmtVal(d.value));
  }

  // ---- Labels de la dimension angulaire (autour du cercle) ---------------
  const lr = maxR + 12;
  sectors.forEach((v, i) => {
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
  rings.forEach((v, k) => {
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
