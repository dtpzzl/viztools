/**
 * @name Barres empilées + courbe
 * @description Volumes empilés et un indicateur suivi sur un axe séparé
 * @icon <svg viewBox="0 0 24 24"><g fill="currentColor"><rect x="3" y="14" width="4" height="7" rx="1" opacity=".38"/><rect x="3" y="10" width="4" height="4" rx="1" opacity=".8"/><rect x="10" y="12" width="4" height="9" rx="1" opacity=".38"/><rect x="10" y="7" width="4" height="5" rx="1" opacity=".8"/><rect x="17" y="9" width="4" height="12" rx="1" opacity=".38"/><rect x="17" y="4" width="4" height="5" rx="1" opacity=".8"/></g><path d="M5 7.5l7-3 7-2.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"Jan","value":42,"series":"Nord","line":78},{"label":"Jan","value":31,"series":"Sud","line":78},{"label":"Fév","value":58,"series":"Nord","line":84},{"label":"Fév","value":35,"series":"Sud","line":84},{"label":"Mar","value":51,"series":"Nord","line":72},{"label":"Mar","value":44,"series":"Sud","line":72},{"label":"Avr","value":67,"series":"Nord","line":91},{"label":"Avr","value":39,"series":"Sud","line":91},{"label":"Mai","value":73,"series":"Nord","line":88},{"label":"Mai","value":52,"series":"Sud","line":88},{"label":"Juin","value":69,"series":"Nord","line":95},{"label":"Juin","value":61,"series":"Sud","line":95}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Catégorie","description":"Axe des abscisses, un groupe de barres par valeur distincte"},"value":{"type":"number","required":true,"label":"Valeur","description":"Hauteur des barres, empilée par série"},"series":{"type":"category","required":false,"label":"Série","description":"Empile une couleur par valeur distincte. Absent ou unique : barres simples"},"line":{"type":"number","required":false,"label":"Courbe","description":"Indicateur tracé en courbe sur un axe de droite dédié"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"curve":{"group":"visuel","type":"select","label":"Lissage","default":"monotone","options":[{"value":"monotone","label":"Lissé sans dépassement"},{"value":"catmullRom","label":"Lissé"},{"value":"linear","label":"Linéaire"},{"value":"step","label":"En marches"}]},"lineColor":{"group":"visuel","type":"color","label":"Couleur de la courbe","default":null,"placeholder":"complémentaire"},"opacity":{"group":"general","type":"range","label":"Opacité des barres","min":0,"max":1,"step":0.05,"default":0.9},"radius":{"group":"general","type":"range","label":"Arrondi des barres","min":0,"max":20,"step":1,"default":3,"unit":"px"},"stroke":{"group":"general","type":"range","label":"Épaisseur de la courbe","min":0.5,"max":8,"step":0.5,"default":2.5,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":false},"showGrid":{"group":"general","type":"toggle","label":"Afficher la grille","default":true},"ticks":{"group":"general","type":"range","label":"Graduations","min":2,"max":12,"step":1,"default":5},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"},"animate":{"group":"visuel","type":"toggle","label":"Animer à l'affichage","default":false},"animatePace":{"group":"visuel","type":"select","label":"Rythme","default":"duration","options":[{"value":"duration","label":"Même durée pour toutes"},{"value":"speed","label":"Même vitesse pour toutes"}]},"animateDuration":{"group":"visuel","type":"range","label":"Durée d'une marque","min":100,"max":3000,"step":50,"default":450,"unit":"ms"},"animateStagger":{"group":"visuel","type":"range","label":"Décalage entre marques","min":0,"max":2000,"step":10,"default":70,"unit":"ms"},"animateEase":{"group":"visuel","type":"select","label":"Accélération","default":"linear","options":[{"value":"linear","label":"Linéaire"},{"value":"cubic","label":"Douce"},{"value":"back","label":"Léger dépassement"},{"value":"elastic","label":"Rebond"}]}}
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

  const seriesNames = (data.domains?.series || [...new Set(data.map(d => d.series))])
    .filter(v => v !== undefined && v !== null && v !== '');
  const grouped = seriesNames.length > 1;
  const keys = grouped ? seriesNames : ['value'];
  // Le Studio transmet l'ordre des axes qu'il a calculé via `data.domains`
  // (non énumérable). S'en remettre à l'ordre d'apparition des lignes est
  // faux sur une grille creuse : les lignes sont triées par la PREMIÈRE
  // dimension, donc la seconde n'apparaît dans le bon ordre que si le premier
  // groupe la couvre entièrement. Le repli garde le DataTool autonome quand
  // il est appelé hors Studio (aperçu, @sampleData).
  const labels = data.domains?.label || [...new Set(data.map(d => d.label))];

  // Table label × série pour les barres ; les doublons sont sommés
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

  // La courbe est portée par un champ distinct, une valeur par abscisse.
  // Les lignes d'une même abscisse répètent la même valeur : on prend la
  // première définie plutôt que de les sommer.
  const lineOf = new Map();
  data.forEach(d => {
    if (Number.isFinite(d.line) && !lineOf.has(d.label)) lineOf.set(d.label, d.line);
  });
  const hasLine = lineOf.size > 0;

  const stacked = d3.stack().keys(keys)(rows);

  const fontSize = p.fontSize ?? 12;
  const legendH = (grouped || hasLine) ? fontSize + 14 : 0;
  const plotH = Math.max(10, H - legendH);

  const x = d3.scaleBand().domain(labels).range([0, W]).padding(0.28);

  const barMax = d3.max(stacked[stacked.length - 1], s => s[1]) * 1.1;
  const yBar = d3.scaleLinear().domain([0, barMax]).range([plotH, 0]);
  const fmtBar = v => formatAxisValue(v, p.unitMode, p.decimals, barMax);

  // Axe de droite propre à la courbe : sans lui un indicateur d'échelle
  // différente serait écrasé au ras de l'axe ou sortirait du cadre.
  const lineMax = hasLine ? d3.max([...lineOf.values()]) * 1.15 : 1;
  const yLine = d3.scaleLinear().domain([0, lineMax]).range([plotH, 0]);
  const fmtLine = v => formatAxisValue(v, p.unitMode, p.decimals, lineMax);

  // Palette dérivée de la couleur principale. La clarté cycle dans une bande
  // bornée au lieu de croître : en 0.4 + i * 0.08 elle dépassait 1 dès la 8e
  // part, qui devenait blanc pur — dessinée, mais invisible sur fond blanc.
  const palette = keys.map((_, i) => (grouped
    ? d3.hsl((d3.hsl(color).h + i * 30) % 360, 0.7, 0.4 + (i % 4) * 0.09).toString()
    : color));
  const lineColor = p.lineColor || d3.hsl(d3.hsl(color).h + 180, 0.65, 0.45).toString();

  // ---- Animation d'apparition -------------------------------------------
  // L'ordre suit l'axe, tel que le Studio l'a trié. Les piles montent une à
  // une, puis la courbe se déroule sur toute la séquence : elle se lit comme
  // un commentaire des barres plutôt que comme un élément concurrent.
  const anim = !!p.animate;
  const dureeBase = p.animateDuration ?? 450;
  const decalage = p.animateStagger ?? 70;
  const easing = revealEase(p.animateEase);
  const retard = (d, i) => i * decalage;
  const dureeTotale = Math.max(1, (labels.length - 1) * decalage + dureeBase);

  const pileMax = d3.max(stacked[stacked.length - 1], seg => yBar(seg[0]) - yBar(seg[1]));
  const dureeSeg = seg => (p.animatePace === 'speed' && pileMax > 0
    ? Math.max(60, dureeBase * (yBar(seg[0]) - yBar(seg[1])) / pileMax)
    : dureeBase);

  const pg = g.append('g').attr('transform', `translate(0,${legendH})`);

  // Grille, calée sur l'axe des barres
  if (p.showGrid ?? true) {
    pg.append('g').attr('class', 'grid')
      .call(d3.axisLeft(yBar).ticks(p.ticks ?? 5).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    pg.select('.grid .domain').remove();
  }

  // Axes
  // Éclaircit les étiquettes d'abscisse quand elles ne tiennent plus côte à côte
  const sourceX = labels;
  const ticksX = thinTicks(sourceX, x.step(),
    sourceX.reduce((mx, v) => Math.max(mx, String(v).length), 0) * (p.fontSize ?? 12) * 0.58 + 6);

  pg.append('g').attr('transform', `translate(0,${plotH})`)
    .call(d3.axisBottom(x).tickValues(ticksX))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fontSize)
    .attr('fill', '#7a7a90');

  pg.append('g')
    .call(d3.axisLeft(yBar).ticks(p.ticks ?? 5).tickFormat(fmtBar))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fontSize)
    .attr('fill', '#7a7a90');

  if (hasLine) {
    pg.append('g').attr('transform', `translate(${W},0)`)
      .call(d3.axisRight(yLine).ticks(p.ticks ?? 5).tickFormat(fmtLine))
      .selectAll('text')
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', fontSize)
      .attr('fill', lineColor);
  }

  pg.selectAll('.domain').attr('stroke', '#e4e4ed');
  pg.selectAll('.tick line').attr('stroke', 'none');

  // Barres empilées
  stacked.forEach((layer, i) => {
    const segments = pg.selectAll('.bar-' + i)
      .data(layer)
      .enter()
      .append('rect')
      .attr('x', d => x(d.data.label))
      .attr('width', x.bandwidth())
      .attr('fill', palette[i])
      .attr('opacity', p.opacity ?? 0.9)
      .attr('rx', p.radius ?? 3);

    if (anim) {
      segments.attr('y', d => yBar(d[0])).attr('height', 0)
        .transition().duration(dureeSeg).delay(retard).ease(easing)
        .attr('y', d => yBar(d[1]))
        .attr('height', d => Math.max(0, yBar(d[0]) - yBar(d[1])));
    } else {
      segments.attr('y', d => yBar(d[1]))
        .attr('height', d => Math.max(0, yBar(d[0]) - yBar(d[1])));
    }
  });

  // Valeurs dans les segments
  if (p.showLabels) {
    stacked.forEach((layer, i) => {
      const etiquettes = pg.selectAll('.bar-label-' + i)
        .data(layer)
        .enter()
        .append('text')
        .attr('x', d => x(d.data.label) + x.bandwidth() / 2)
        .attr('y', d => (yBar(d[0]) + yBar(d[1])) / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Mono, monospace')
        .attr('font-size', fontSize - 2)
        .attr('fill', d3.lab(palette[i]).l > 62 ? '#0f0f1a' : '#ffffff')
        .attr('font-weight', '500')
        .text(d => (d[1] - d[0] > 0 ? fmtBar(d[1] - d[0]) : ''));

      if (anim) {
        etiquettes.attr('opacity', 0)
          .transition().duration(d => dureeSeg(d) * 0.6)
          .delay((d, i) => retard(d, i) + dureeSeg(d) * 0.55)
          .attr('opacity', 1);
      }
    });
  }

  // Courbe
  if (hasLine) {
    const points = labels
      .filter(l => lineOf.has(l))
      .map(l => ({ label: l, value: lineOf.get(l) }));

    const line = d3.line()
      .x(d => x(d.label) + x.bandwidth() / 2)
      .y(d => yLine(d.value))
      .curve(resolveCurve(p.curve));

    const trace = pg.append('path')
      .datum(points)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', lineColor)
      .attr('stroke-width', p.stroke ?? 2.5);

    if (anim) {
      trace
        .attr('stroke-dasharray', function () {
          const L = this.getTotalLength();
          return L + ' ' + L;
        })
        .attr('stroke-dashoffset', function () { return this.getTotalLength(); })
        .transition().duration(dureeTotale).ease(easing)
        .attr('stroke-dashoffset', 0)
        .on('end', function () { d3.select(this).attr('stroke-dasharray', null); });
    }

    const reperes = pg.selectAll('.line-dot')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.label) + x.bandwidth() / 2)
      .attr('cy', d => yLine(d.value))
      .attr('fill', lineColor)
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    if (anim) {
      reperes.attr('r', 0)
        .transition().duration(dureeBase).delay(retard).ease(easing)
        .attr('r', 4);
    } else {
      reperes.attr('r', 4);
    }
  }

  // Légende
  if (legendH) {
    const legend = g.append('g');
    let cursor = 0;
    const entries = keys.map((k, i) => ({ nom: grouped ? k : 'Valeur', couleur: palette[i], trait: false }));
    if (hasLine) entries.push({ nom: 'Courbe', couleur: lineColor, trait: true });

    entries.forEach(e => {
      const item = legend.append('g').attr('transform', `translate(${cursor},0)`);
      if (e.trait) {
        item.append('line')
          .attr('x1', 0).attr('y1', 5).attr('x2', 12).attr('y2', 5)
          .attr('stroke', e.couleur).attr('stroke-width', 2.5);
      } else {
        item.append('rect')
          .attr('x', 0).attr('y', 0).attr('width', 10).attr('height', 10)
          .attr('rx', 2).attr('fill', e.couleur);
      }
      item.append('text')
        .attr('x', 16).attr('y', 9)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('font-size', fontSize)
        .attr('fill', '#7a7a90')
        .text(e.nom);
      cursor += 16 + String(e.nom).length * fontSize * 0.58 + 18;
    });
  }
}

// Type de lissage de la courbe superposée aux barres
function resolveCurve(mode) {
  if (mode === 'linear') return d3.curveLinear;
  if (mode === 'catmullRom') return d3.curveCatmullRom;
  if (mode === 'step') return d3.curveStep;
  return d3.curveMonotoneX;
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
