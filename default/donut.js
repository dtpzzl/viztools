/**
 * @name Donut
 * @description Répartition en parts d'un total
 * @icon <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="5"><circle cx="12" cy="12" r="7" opacity=".3"/><path d="M12 5a7 7 0 0 1 6.06 10.5" stroke-linecap="round"/></svg>
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"A","value":35},{"label":"B","value":25},{"label":"C","value":20},{"label":"D","value":12},{"label":"E","value":8}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Catégorie","description":"Une part du total par valeur distincte"},"value":{"type":"number","required":true,"label":"Valeur","description":"Grandeur mesurée, sommée pour obtenir le total"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"showName":{"group":"visuel","type":"toggle","label":"Étiquette","default":false},"showValue":{"group":"visuel","type":"toggle","label":"Valeur","default":false},"showPercent":{"group":"visuel","type":"toggle","label":"Pourcentage","default":true},"thickness":{"group":"visuel","type":"number","label":"Épaisseur de l'anneau","default":null,"placeholder":"48 % du rayon","unit":"px"},"stroke":{"group":"general","type":"range","label":"Liseré entre les parts","min":0,"max":8,"step":0.5,"default":2,"unit":"px"},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  // Le Studio filtre ET agrège en amont : il restreint les lignes avant de les
  // grouper, pour que le mode choisi (somme, moyenne, min, max, comptage)
  // s'applique une seule fois, sur la population réellement concernée. Le
  // visuel n'a donc plus rien à filtrer ni à cumuler — il rappelle seulement
  // quelle valeur a été retenue, sans quoi on lirait un sous-ensemble sans le
  // savoir. Voir CLAUDE.md, « Champ filtre ».
  const shown = String(p.filterValue ?? '').trim() || null;

  const fontSize = p.fontSize ?? 12;
  const captionH = shown === null ? 0 : fontSize + 10;

  // La légende est posée à droite : on lui réserve sa largeur et on décale le
  // cercle vers la gauche, sinon les libellés sortent du cadre et sont coupés.
  const legendChars = data.reduce(
    (max, d) => Math.max(max, `${d.label} (${formatAxisValue(d.value, p.unitMode, p.decimals, d.value)})`.length), 0);
  const legendW = Math.min(W * 0.45, 24 + legendChars * fontSize * 0.58);
  const dispoW = Math.max(40, W - legendW - 16);
  const dispoH = Math.max(40, H - captionH);

  const radius = Math.min(dispoW, dispoH) / 2 - 20;
  const cx = dispoW / 2;
  const cy = captionH + dispoH / 2;
  const total = d3.sum(data, d => d.value) || 1;
  const valueMax = d3.max(data, d => d.value);
  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, valueMax);

  // Palette dérivée de la couleur principale. La clarté cycle dans une bande
  // bornée au lieu de croître : en 0.4 + i * 0.08 elle dépassait 1 dès la 8e
  // part, qui devenait blanc pur — dessinée, mais invisible sur fond blanc.
  const palette = data.map((_, i) =>
    d3.hsl((d3.hsl(color).h + i * 30) % 360, 0.7, 0.4 + (i % 4) * 0.09).toString()
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
    .attr('transform', `translate(${cx},${cy})`);

  // Valeur du filtre, affichée seulement quand un filtre est réellement actif
  if (shown !== null) {
    g.append('text')
      .attr('x', 0).attr('y', fontSize)
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', fontSize)
      .attr('font-weight', '500')
      .attr('fill', '#0f0f1a')
      .text(shown);
  }

  // Arcs
  pg.selectAll('.arc')
    .data(pie(data))
    .enter()
    .append('path')
    .attr('d', arc)
    .attr('fill', (d, i) => palette[i])
    .attr('stroke', 'white')
    .attr('stroke-width', p.stroke ?? 2);

  // Étiquettes sur les parts : trois cases indépendantes plutôt qu'une liste
  // fermée, pour couvrir « nom seul », « nom + valeur », « % seul » et le reste
  // sans maintenir la liste des combinaisons.
  const showName = p.showName ?? false;
  const showValue = p.showValue ?? false;
  const showPercent = p.showPercent ?? true;

  if (showName || showValue || showPercent) {
    pg.selectAll('.pct')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('transform', d => `translate(${arcLabel.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', (p.fontSize ?? 12) - 1)
      // Contraste sur la clarté perceptuelle : du blanc sur une part claire
      // est illisible, et c'est justement ce qui masquait les dernières parts.
      .attr('fill', (d, i) => (d3.lab(palette[i]).l > 62 ? '#0f0f1a' : '#ffffff'))
      .attr('font-weight', '500')
      .text(d => {
        const parts = [];
        if (showName) parts.push(d.data.label);
        if (showValue) parts.push(fmtVal(d.data.value));
        // Le pourcentage se calcule sur le total, jamais sur la valeur brute
        if (showPercent) parts.push(`${Math.round(d.data.value / total * 100)}%`);
        return parts.join(' ');
      });
  }

  // Légende à droite, dans la bande qui lui a été réservée. L'interligne se
  // resserre plutôt que de déborder quand les parts sont nombreuses.
  const rowH = Math.min(26, dispoH / data.length);
  const legend = g.append('g')
    .attr('transform', `translate(${dispoW + 16}, ${Math.max(captionH, cy - data.length * rowH / 2)})`);

  data.forEach((d, i) => {
    legend.append('rect')
      .attr('x', 0).attr('y', i * rowH)
      .attr('width', 12).attr('height', 12)
      .attr('rx', 3)
      .attr('fill', palette[i]);

    legend.append('text')
      .attr('x', 18).attr('y', i * rowH + 10)
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', fontSize)
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
