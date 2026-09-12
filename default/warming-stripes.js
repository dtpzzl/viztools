/**
 * @name Bandes de réchauffement
 * @description Une bande colorée par période, façon warming stripes
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="2.7" height="16" opacity=".22"/><rect x="6.4" y="4" width="2.7" height="16" opacity=".42"/><rect x="9.8" y="4" width="2.7" height="16" opacity=".3"/><rect x="13.2" y="4" width="2.7" height="16" opacity=".6"/><rect x="16.6" y="4" width="2.7" height="16" opacity=".8"/><rect x="20" y="4" width="1.9" height="16"/></svg>
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"1995","value":-0.42},{"label":"1996","value":-0.31},{"label":"1997","value":-0.18},{"label":"1998","value":0.12},{"label":"1999","value":-0.22},{"label":"2000","value":-0.05},{"label":"2001","value":0.08},{"label":"2002","value":0.21},{"label":"2003","value":0.44},{"label":"2004","value":0.17},{"label":"2005","value":0.35},{"label":"2006","value":0.29},{"label":"2007","value":0.41},{"label":"2008","value":0.19},{"label":"2009","value":0.38},{"label":"2010","value":0.52},{"label":"2011","value":0.33},{"label":"2012","value":0.47},{"label":"2013","value":0.55},{"label":"2014","value":0.68},{"label":"2015","value":0.81},{"label":"2016","value":0.94},{"label":"2017","value":0.79},{"label":"2018","value":0.72},{"label":"2019","value":0.88},{"label":"2020","value":0.97},{"label":"2021","value":0.76},{"label":"2022","value":0.91},{"label":"2023","value":1.12},{"label":"2024","value":1.25}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Période","description":"Une bande par valeur distincte, dans l'ordre reçu"},"value":{"type":"number","required":true,"label":"Écart","description":"Détermine la couleur de la bande"}}
 * @params {"scaleMin":{"group":"visuel","type":"number","label":"Borne basse","default":null,"placeholder":"min des données"},"scaleMid":{"group":"visuel","type":"number","label":"Borne neutre","default":null,"placeholder":"moyenne des données"},"scaleMax":{"group":"visuel","type":"number","label":"Borne haute","default":null,"placeholder":"max des données"},"colorMin":{"group":"visuel","type":"color","label":"Couleur min","default":null,"placeholder":"#2166ac"},"colorMid":{"group":"visuel","type":"color","label":"Couleur neutre","default":null,"placeholder":"#f7f7f7"},"colorMax":{"group":"visuel","type":"color","label":"Couleur max","default":null,"placeholder":"#b2182b"},"stripeGap":{"group":"visuel","type":"range","label":"Espacement entre bandes","min":0,"max":20,"step":1,"default":0,"unit":"px"},"stripeRatio":{"group":"visuel","type":"number","label":"Ratio L/H","default":null,"placeholder":"pleine hauteur"},"showValues":{"group":"visuel","type":"toggle","label":"Afficher les extrêmes","default":false},"opacity":{"group":"general","type":"range","label":"Opacité des bandes","min":0,"max":1,"step":0.05,"default":1},"radius":{"group":"general","type":"range","label":"Arrondi des bandes","min":0,"max":20,"step":1,"default":0,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les périodes","default":false},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":2},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  // Une bande par label, dans l'ordre reçu ; les doublons sont sommés
  const labels = [...new Set(data.map(d => d.label))];
  const totals = new Map(labels.map(l => [l, 0]));
  data.forEach(d => {
    if (Number.isFinite(d.value)) totals.set(d.label, totals.get(d.label) + d.value);
  });
  const values = labels.map(l => totals.get(l));
  const m = labels.length;

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
  if (sMax === sMin) sMax = sMin + 1;

  let sMid = hard(p.scaleMid, d3.mean(values));
  if (!(sMid > sMin && sMid < sMax)) sMid = (sMin + sMax) / 2;

  // Palette divergente par défaut : une bande de réchauffement se lit par
  // l'écart à une valeur neutre, pas par une intensité croissante.
  const cMin = p.colorMin || '#2166ac';
  const cMid = p.colorMid || '#f7f7f7';
  const cMax = p.colorMax || '#b2182b';

  const colorScale = d3.scaleLinear()
    .domain([sMin, sMid, sMax])
    .range([cMin, cMid, cMax])
    .clamp(true);

  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, sMax);
  const fontSize = p.fontSize ?? 12;
  const labelH = p.showLabels ? fontSize + 8 : 0;
  const bandH = Math.max(10, H - labelH);

  // ---- Géométrie des bandes ---------------------------------------------
  // p.stripeRatio fige le rapport largeur/hauteur d'une bande ; sans lui les
  // bandes occupent toute la hauteur, comme l'original.
  const stepX = W / m;
  const gap = Math.max(0, Math.min(p.stripeGap ?? 0, stepX * 0.8));
  const stripeW = Math.max(1, stepX - gap);

  const ratio = Number.isFinite(+p.stripeRatio) && +p.stripeRatio > 0 ? +p.stripeRatio : null;
  const stripeH = ratio ? Math.min(bandH, stripeW / ratio) : bandH;
  const offY = (bandH - stripeH) / 2; // bande contrainte : centrée verticalement

  g.selectAll('.stripe')
    .data(labels)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * stepX + gap / 2)
    .attr('y', offY)
    .attr('width', stripeW)
    .attr('height', stripeH)
    .attr('rx', p.radius ?? 0)
    .attr('fill', d => colorScale(totals.get(d)))
    .attr('opacity', p.opacity ?? 1);

  // ---- Labels sous les bandes -------------------------------------------
  // Ils ne sont écrits que tous les n pour éviter le pâté illisible quand la
  // série est longue : n est déduit de la place réellement disponible.
  if (p.showLabels) {
    const widest = labels.reduce((max, l) => Math.max(max, String(l).length), 0) * fontSize * 0.58;
    const every = Math.max(1, Math.ceil((widest + 8) / stepX));

    g.selectAll('.stripe-label')
      .data(labels.filter((d, i) => i % every === 0))
      .enter()
      .append('text')
      .attr('x', d => labels.indexOf(d) * stepX + stepX / 2)
      .attr('y', offY + stripeH + fontSize)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', fontSize)
      .attr('fill', '#7a7a90')
      .text(d => d);
  }

  // ---- Valeurs extrêmes --------------------------------------------------
  if (p.showValues) {
    const iMin = values.indexOf(d3.min(values));
    const iMax = values.indexOf(d3.max(values));
    [iMin, iMax].forEach(i => {
      g.append('text')
        .attr('x', i * stepX + stepX / 2)
        .attr('y', offY + stripeH / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Mono, monospace')
        .attr('font-size', fontSize - 1)
        // Contraste sur la clarté perceptuelle : le blanc du milieu de palette
        // rendrait un texte blanc invisible.
        .attr('fill', d3.lab(colorScale(values[i])).l > 62 ? '#0f0f1a' : '#ffffff')
        .attr('font-weight', '500')
        .text(fmtVal(values[i]));
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
