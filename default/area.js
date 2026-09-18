/**
 * @name Aire empilée
 * @description Volume d'une valeur dans le temps, empilé par série
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 21V13l5-5 4 4 9-8v17z" opacity=".32"/><path d="M3 21v-4l5-3 4 3 9-6v10z" opacity=".72"/></svg>
 * @author datapuzzle
 * @version 1.1
 * @sampleData [{"label":"2019","value":42,"series":"Nord"},{"label":"2020","value":58,"series":"Nord"},{"label":"2021","value":51,"series":"Nord"},{"label":"2022","value":67,"series":"Nord"},{"label":"2023","value":73,"series":"Nord"},{"label":"2024","value":69,"series":"Nord"},{"label":"2019","value":28,"series":"Sud"},{"label":"2020","value":31,"series":"Sud"},{"label":"2021","value":44,"series":"Sud"},{"label":"2022","value":39,"series":"Sud"},{"label":"2023","value":52,"series":"Sud"},{"label":"2024","value":61,"series":"Sud"}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Catégorie","description":"Axe des abscisses, ordonné tel que reçu"},"value":{"type":"number","required":true,"label":"Valeur","description":"Grandeur mesurée, sommée en cas de doublon label/série"},"series":{"type":"category","required":false,"label":"Série","description":"Empile une aire par valeur distincte. Absent ou unique : aire simple"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"areaMode":{"group":"visuel","type":"select","label":"Étiquettes","default":"value","options":[{"value":"value","label":"Valeur"},{"value":"percent","label":"Pourcentage"}]},"opacity":{"group":"general","type":"range","label":"Opacité de l'aire","min":0,"max":1,"step":0.05,"default":1},"stroke":{"group":"general","type":"range","label":"Épaisseur de la courbe","min":0.5,"max":8,"step":0.5,"default":2.5,"unit":"px"},"radius":{"group":"general","type":"range","label":"Rayon des points","min":0,"max":12,"step":1,"default":4,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":false},"showGrid":{"group":"general","type":"toggle","label":"Afficher la grille","default":true},"ticks":{"group":"general","type":"range","label":"Graduations","min":2,"max":12,"step":1,"default":5},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"},"animate":{"group":"visuel","type":"toggle","label":"Animer à l'affichage","default":false},"animateDuration":{"group":"visuel","type":"range","label":"Durée d'une marque","min":100,"max":3000,"step":50,"default":450,"unit":"ms"},"animateStagger":{"group":"visuel","type":"range","label":"Décalage entre marques","min":0,"max":2000,"step":10,"default":70,"unit":"ms"},"animateEase":{"group":"visuel","type":"select","label":"Accélération","default":"linear","options":[{"value":"linear","label":"Linéaire"},{"value":"cubic","label":"Douce"},{"value":"back","label":"Léger dépassement"},{"value":"elastic","label":"Rebond"}]}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;
  if (!data || !data.length) return;

  // Le Studio filtre ET agrège en amont : il restreint les lignes avant de les
  // grouper, pour que le mode choisi (somme, moyenne, min, max, comptage)
  // s'applique une seule fois, sur la population réellement concernée. Le
  // visuel n'a donc plus rien à filtrer ni à cumuler — il rappelle seulement
  // quelle valeur a été retenue, sans quoi on lirait un sous-ensemble sans le
  // savoir. Voir CLAUDE.md, « Champ filtre ».
  const shown = String(p.filterValue ?? '').trim() || null;

  // Valeur du filtre, affichée seulement quand un filtre est réellement actif.
  // Le dessin est alors décalé dans un sous-groupe pour lui laisser la place.
  if (shown !== null) {
    const capH = (p.fontSize ?? 12) + 10;
    g.append('text')
      .attr('x', 0).attr('y', (p.fontSize ?? 12))
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', p.fontSize ?? 12)
      .attr('font-weight', '500')
      .attr('fill', '#0f0f1a')
      .text(shown);
    g = g.append('g').attr('transform', `translate(0,${capH})`);
    H = Math.max(10, H - capH);
  }

  // Une série par valeur distincte du champ `series`. Champ absent ou valeur
  // unique : rendu simple, identique à la version sans séries.
  const seriesNames = (data.domains?.series || [...new Set(data.map(d => d.series))])
    .filter(s => s !== undefined && s !== null && s !== '');
  const grouped = seriesNames.length > 1;
  const keys = grouped ? seriesNames : ['value'];
  // Le Studio transmet l'ordre des axes qu'il a calculé via `data.domains`
  // (non énumérable). S'en remettre à l'ordre d'apparition des lignes est
  // faux sur une grille creuse : les lignes sont triées par la PREMIÈRE
  // dimension, donc la seconde n'apparaît dans le bon ordre que si le premier
  // groupe la couvre entièrement. Le repli garde le DataTool autonome quand
  // il est appelé hors Studio (aperçu, @sampleData).
  const labels = data.domains?.label || [...new Set(data.map(d => d.label))];

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

  // Palette dérivée de la couleur principale. La clarté cycle dans une bande
  // bornée au lieu de croître : en 0.4 + i * 0.08 elle dépassait 1 dès la 8e
  // part, qui devenait blanc pur — dessinée, mais invisible sur fond blanc.
  const palette = keys.map((_, i) => (grouped
    ? d3.hsl((d3.hsl(color).h + i * 30) % 360, 0.7, 0.4 + (i % 4) * 0.09).toString()
    : color));

  // ---- Animation d'apparition -------------------------------------------
  // L'ordre suit l'axe, tel que le Studio l'a trié. L'aire étant un tracé
  // continu, elle se révèle par un volet qui balaye l'axe des abscisses : les
  // couches empilées apparaissent ensemble à mesure qu'il avance, et chaque
  // point sort quand le volet le dépasse.
  const anim = !!p.animate;
  const dureeBase = p.animateDuration ?? 450;
  const decalage = p.animateStagger ?? 70;
  const easing = revealEase(p.animateEase);
  const dureeTotale = Math.max(1, (labels.length - 1) * decalage + dureeBase);

  const pg = g.append('g').attr('transform', `translate(0,${legendH})`);
  // Les couches vivent dans leur propre groupe : le volet ne doit rogner ni
  // les axes ni la grille.
  const couches = pg.append('g');
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
  // Éclaircit les étiquettes d'abscisse quand elles ne tiennent plus côte à côte
  const sourceX = labels;
  const ticksX = thinTicks(sourceX, (x.step ? x.step() : W / Math.max(1, labels.length)),
    sourceX.reduce((mx, v) => Math.max(mx, String(v).length), 0) * (p.fontSize ?? 12) * 0.58 + 6);

  pg.append('g').attr('transform', `translate(0,${plotH})`)
    .call(d3.axisBottom(x).tickValues(ticksX))
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
    couches.append('path')
      .datum(layer)
      .attr('d', area)
      .attr('fill', `url(#area-grad-${suffix}-${i})`);

    couches.append('path')
      .datum(layer)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', palette[i])
      .attr('stroke-width', p.stroke ?? 2.5);

    couches.selectAll('.dot-' + i)
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

  if (anim) {
    const voletId = 'area-volet-' + suffix;
    defs.append('clipPath').attr('id', voletId)
      .append('rect')
      .attr('x', -4).attr('y', -8)
      .attr('width', 0).attr('height', plotH + 16)
      .transition().duration(dureeTotale).ease(easing)
      .attr('width', W + 8);
    couches.attr('clip-path', `url(#${voletId})`);
  }

  const firstLabel = labels[0];
  const lastLabel = labels[labels.length - 1];
  const edgeAnchor = l => (l === firstLabel ? 'start' : l === lastLabel ? 'end' : 'middle');
  const edgeShift = l => (l === firstLabel ? 3 : l === lastLabel ? -3 : 0);

  // Valeurs ou pourcentages
  if (p.showLabels) {
    stacked.forEach((layer, i) => {
      couches.selectAll('.label-' + i)
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
        .attr('fill', grouped
          ? (d3.lab(palette[i]).l > 62 ? '#0f0f1a' : '#ffffff')
          : '#7a7a90')
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

// Accélération de l'animation d'apparition. Linéaire par défaut : une marque
// progresse à vitesse constante du début à la fin.
function revealEase(mode) {
  if (mode === 'cubic')   return d3.easeCubicOut;
  if (mode === 'back')    return d3.easeBackOut.overshoot(1.4);
  if (mode === 'elastic') return d3.easeElasticOut.amplitude(1).period(0.4);
  return d3.easeLinear;
}

// N'écrit qu'une étiquette sur n quand elles ne tiennent pas côte à côte. Le
// pas se déduit de la place réellement disponible et non d'un seuil arbitraire.
function thinTicks(valeurs, pas, encombrement) {
  const tous = Math.max(1, Math.ceil(encombrement / Math.max(1, pas)));
  return tous === 1 ? valeurs : valeurs.filter((v, i) => i % tous === 0);
}
