/**
 * @name Bandes
 * @description Une bande colorée par période, façon warming stripes
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="4" width="2.7" height="16" opacity=".22"/><rect x="6.4" y="4" width="2.7" height="16" opacity=".42"/><rect x="9.8" y="4" width="2.7" height="16" opacity=".3"/><rect x="13.2" y="4" width="2.7" height="16" opacity=".6"/><rect x="16.6" y="4" width="2.7" height="16" opacity=".8"/><rect x="20" y="4" width="1.9" height="16"/></svg>
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"1995","value":-0.42},{"label":"1996","value":-0.31},{"label":"1997","value":-0.18},{"label":"1998","value":0.12},{"label":"1999","value":-0.22},{"label":"2000","value":-0.05},{"label":"2001","value":0.08},{"label":"2002","value":0.21},{"label":"2003","value":0.44},{"label":"2004","value":0.17},{"label":"2005","value":0.35},{"label":"2006","value":0.29},{"label":"2007","value":0.41},{"label":"2008","value":0.19},{"label":"2009","value":0.38},{"label":"2010","value":0.52},{"label":"2011","value":0.33},{"label":"2012","value":0.47},{"label":"2013","value":0.55},{"label":"2014","value":0.68},{"label":"2015","value":0.81},{"label":"2016","value":0.94},{"label":"2017","value":0.79},{"label":"2018","value":0.72},{"label":"2019","value":0.88},{"label":"2020","value":0.97},{"label":"2021","value":0.76},{"label":"2022","value":0.91},{"label":"2023","value":1.12},{"label":"2024","value":1.25}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Période","description":"Une bande par valeur distincte, dans l'ordre reçu"},"value":{"type":"number","required":true,"label":"Écart","description":"Détermine la couleur de la bande"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"scaleMin":{"group":"visuel","type":"number","label":"Borne basse","default":null,"placeholder":"min des données"},"scaleMid":{"group":"visuel","type":"number","label":"Borne neutre","default":null,"placeholder":"moyenne des données"},"scaleMax":{"group":"visuel","type":"number","label":"Borne haute","default":null,"placeholder":"max des données"},"colorMin":{"group":"visuel","type":"color","label":"Couleur min","default":null,"placeholder":"#2166ac"},"colorMid":{"group":"visuel","type":"color","label":"Couleur neutre","default":null,"placeholder":"#f7f7f7"},"colorMax":{"group":"visuel","type":"color","label":"Couleur max","default":null,"placeholder":"#b2182b"},"showScale":{"group":"visuel","type":"toggle","label":"Afficher l'échelle","default":true},"opacityMin":{"group":"visuel","type":"range","label":"Opacité borne basse","min":0,"max":1,"step":0.05,"default":1},"opacityMid":{"group":"visuel","type":"number","label":"Opacité borne neutre","default":null,"placeholder":"entre les deux"},"opacityMax":{"group":"visuel","type":"range","label":"Opacité borne haute","min":0,"max":1,"step":0.05,"default":1},"stripeGap":{"group":"visuel","type":"range","label":"Espacement entre bandes","min":0,"max":20,"step":1,"default":0,"unit":"px"},"stripeRatio":{"group":"visuel","type":"number","label":"Ratio L/H","default":null,"placeholder":"pleine hauteur"},"showValues":{"group":"visuel","type":"toggle","label":"Afficher les extrêmes","default":false},"opacity":{"group":"general","type":"range","label":"Opacité des bandes","min":0,"max":1,"step":0.05,"default":1},"radius":{"group":"general","type":"range","label":"Arrondi des bandes","min":0,"max":20,"step":1,"default":0,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les périodes","default":false},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":2},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"},"animate":{"group":"visuel","type":"toggle","label":"Animer à l'affichage","default":false},"animateDuration":{"group":"visuel","type":"range","label":"Durée d'une marque","min":100,"max":3000,"step":50,"default":450,"unit":"ms"},"animateStagger":{"group":"visuel","type":"range","label":"Décalage entre marques","min":0,"max":2000,"step":10,"default":70,"unit":"ms"},"animateEase":{"group":"visuel","type":"select","label":"Accélération","default":"linear","options":[{"value":"linear","label":"Linéaire"},{"value":"cubic","label":"Douce"},{"value":"back","label":"Léger dépassement"},{"value":"elastic","label":"Rebond"}]}}
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

  // Une bande par label, dans l'ordre reçu ; les doublons sont sommés, ce qui
  // cumule aussi les valeurs des différents filtres quand aucun n'est choisi
  // Le Studio transmet l'ordre des axes qu'il a calculé via `data.domains`
  // (non énumérable). S'en remettre à l'ordre d'apparition des lignes est
  // faux sur une grille creuse : les lignes sont triées par la PREMIÈRE
  // dimension, donc la seconde n'apparaît dans le bon ordre que si le premier
  // groupe la couvre entièrement. Le repli garde le DataTool autonome quand
  // il est appelé hors Studio (aperçu, @sampleData).
  const labels = data.domains?.label || [...new Set(data.map(d => d.label))];
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

  // ---- Opacité le long de l'échelle -------------------------------------
  // Une série où la plupart des valeurs sont au plancher se lit mal quand ce
  // plancher est aussi opaque que le reste : il forme un aplat qui pèse autant
  // que l'information. Estomper une borne la fait reculer sans l'effacer.
  // `p.opacity` reste le réglage d'ensemble et multiplie le tout : les deux
  // bornes à 1, le rendu est exactement celui d'avant.
  const dans01 = (v, repli) => {
    const n = +v;
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : repli;
  };
  const oMin = dans01(p.opacityMin, 1);
  const oMax = dans01(p.opacityMax, 1);
  // Trois bornes comme pour la couleur, et pour la même raison : sur une
  // échelle DIVERGENTE — les bandes, typiquement — ce qui encombre n'est pas
  // une extrémité mais le milieu, l'écart nul. Estomper la borne neutre le
  // fait reculer en gardant le froid et le chaud lisibles. Laissée vide, elle
  // se place à mi-chemin : l'opacité varie alors linéairement, comme si les
  // deux bornes seules existaient.
  const oMid = dans01(p.opacityMid, (oMin + oMax) / 2);
  const opacityScale = d3.scaleLinear()
    .domain([sMin, sMid, sMax]).range([oMin, oMid, oMax]).clamp(true);
  const opaciteDe = valeur => (p.opacity ?? 1) * opacityScale(valeur);

  // Couleur PERÇUE une fois la marque estompée sur le fond blanc. Sans cette
  // correction, une étiquette blanche restait posée sur une marque devenue
  // presque blanche : le contraste se calculait sur une couleur qui n'est
  // plus celle qu'on voit.
  const couleurPercue = valeur =>
    d3.interpolateLab('#ffffff', colorScale(valeur))(opaciteDe(valeur));
  const fontSize = p.fontSize ?? 12;
  const labelH = p.showLabels ? fontSize + 8 : 0;
  // La légende d'échelle et le nom du filtre partagent le bandeau du haut :
  // le nom à gauche, le dégradé à droite. On réserve la hauteur du plus
  // encombrant des deux, pas leur somme.
  const legende  = p.showScale !== false;
  const captionH = shown === null ? 0 : fontSize + 10;
  const legendeH = legende ? fontSize + 14 : 0;
  const enTeteH  = Math.max(captionH, legendeH);
  const bandH = Math.max(10, H - labelH - enTeteH);

  // ---- Géométrie des bandes ---------------------------------------------
  // p.stripeRatio fige le rapport largeur/hauteur d'une bande ; sans lui les
  // bandes occupent toute la hauteur, comme l'original.
  const stepX = W / m;
  const gap = Math.max(0, Math.min(p.stripeGap ?? 0, stepX * 0.8));
  const stripeW = Math.max(1, stepX - gap);

  const ratio = Number.isFinite(+p.stripeRatio) && +p.stripeRatio > 0 ? +p.stripeRatio : null;
  const stripeH = ratio ? Math.min(bandH, stripeW / ratio) : bandH;
  const offY = enTeteH + (bandH - stripeH) / 2; // bande contrainte : centrée

  // ---- Légende de l'échelle de couleur -----------------------------------
  // Des bandes colorées sans échelle se regardent mais ne se lisent pas : rien
  // ne dit à quelle valeur correspond une teinte. Le dégradé reprend les trois
  // bornes RÉELLEMENT utilisées par colorScale, bornes figées à la main
  // comprises — sans quoi la légende mentirait dès qu'on en fige une.
  if (legende) {
    const barreW = Math.max(60, Math.min(160, W * 0.32));
    const barreH = 8;
    const texteMin = fmtVal(sMin);
    const texteMax = fmtVal(sMax);
    // Largeur approximative des deux étiquettes, pour caler le dégradé à leur
    // gauche sans jamais sortir du cadre. DM Mono : environ 0,6 em.
    const largeurTexte = (texteMin.length + texteMax.length) * fontSize * 0.6 + 16;
    const barreX = Math.max(0, W - barreW - largeurTexte);
    const barreY = Math.max(0, enTeteH - barreH - 6);

    // Un identifiant unique par rendu : deux visuels dans la même page
    // partageraient sinon le même dégradé, et le second écraserait le premier.
    const gradId = 'dp-echelle-' + Math.random().toString(36).slice(2, 9);
    const grad = svg.append('defs').append('linearGradient')
      .attr('id', gradId).attr('x1', '0%').attr('x2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', cMin)
      .attr('stop-opacity', oMin === 1 ? null : oMin);
    grad.append('stop').attr('offset', '50%').attr('stop-color', cMid)
      .attr('stop-opacity', oMid === 1 ? null : oMid);
    grad.append('stop').attr('offset', '100%').attr('stop-color', cMax)
      .attr('stop-opacity', oMax === 1 ? null : oMax);

    const gl = g.append('g');
    gl.append('text')
      .attr('x', barreX - 6).attr('y', barreY + barreH)
      .attr('text-anchor', 'end')
      .attr('font-family', 'DM Mono, monospace').attr('font-size', fontSize - 1)
      .attr('fill', '#7a7a90').text(texteMin);
    gl.append('rect')
      .attr('x', barreX).attr('y', barreY)
      .attr('width', barreW).attr('height', barreH)
      .attr('rx', barreH / 2)
      .attr('fill', `url(#${gradId})`)
      .attr('stroke', '#e4e4ed');
    gl.append('text')
      .attr('x', barreX + barreW + 6).attr('y', barreY + barreH)
      .attr('font-family', 'DM Mono, monospace').attr('font-size', fontSize - 1)
      .attr('fill', '#7a7a90').text(texteMax);
  }

  // Nom du filtre appliqué : sans lui on lit un sous-ensemble sans le savoir
  if (shown !== null) {
    g.append('text')
      .attr('x', 0).attr('y', fontSize)
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', fontSize)
      .attr('font-weight', '500')
      .attr('fill', '#0f0f1a')
      .text(shown);
  }


  // ---- Animation d'apparition -------------------------------------------
  // L'ordre suit l'axe, tel que le Studio l'a trié : aucun réglage d'ordre
  // ici. Pour animer autrement, on change le tri du champ dans le panneau
  // Données & Axes, et l'animation suit.
  const anim = !!p.animate;
  const dureeBase = p.animateDuration ?? 450;
  const decalage = p.animateStagger ?? 70;
  const easing = revealEase(p.animateEase);
  const retard = (d, i) => i * decalage;

  // Toutes les bandes ont la même hauteur : elles s'ouvrent depuis leur
  // milieu, ce qui donne un balayage lisible sans notion de vitesse.
  const bandes = g.selectAll('.stripe')
    .data(labels)
    .enter()
    .append('rect')
    .attr('x', (d, i) => i * stepX + gap / 2)
    .attr('width', stripeW)
    .attr('rx', p.radius ?? 0)
    .attr('fill', d => colorScale(totals.get(d)))
    .attr('opacity', d => opaciteDe(totals.get(d)));

  if (anim) {
    bandes.attr('y', offY + stripeH / 2).attr('height', 0)
      .transition().duration(dureeBase).delay(retard).ease(easing)
      .attr('y', offY).attr('height', stripeH);
  } else {
    bandes.attr('y', offY).attr('height', stripeH);
  }

  // ---- Labels sous les bandes -------------------------------------------
  // Ils ne sont écrits que tous les n pour éviter le pâté illisible quand la
  // série est longue : n est déduit de la place réellement disponible.
  if (p.showLabels) {
    const widest = labels.reduce((max, l) => Math.max(max, String(l).length), 0) * fontSize * 0.58;
    const every = Math.max(1, Math.ceil((widest + 8) / stepX));

    const etiquettes = g.selectAll('.stripe-label')
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

    if (anim) {
      etiquettes.attr('opacity', 0)
        .transition().duration(dureeBase * 0.6)
        .delay(d => labels.indexOf(d) * decalage + dureeBase * 0.55)
        .attr('opacity', 1);
    }
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
        .attr('fill', d3.lab(couleurPercue(values[i])).l > 62 ? '#0f0f1a' : '#ffffff')
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

// Accélération de l'animation d'apparition. Linéaire par défaut : une marque
// progresse à vitesse constante du début à la fin.
function revealEase(mode) {
  if (mode === 'cubic')   return d3.easeCubicOut;
  if (mode === 'back')    return d3.easeBackOut.overshoot(1.4);
  if (mode === 'elastic') return d3.easeElasticOut.amplitude(1).period(0.4);
  return d3.easeLinear;
}
