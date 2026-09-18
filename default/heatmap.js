/**
 * @name Heatmap
 * @description Intensité de valeurs sur une grille 2D
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="5.5" height="5.5" rx="1" opacity=".25"/><rect x="9.25" y="3" width="5.5" height="5.5" rx="1" opacity=".9"/><rect x="15.5" y="3" width="5.5" height="5.5" rx="1" opacity=".5"/><rect x="3" y="9.25" width="5.5" height="5.5" rx="1" opacity=".7"/><rect x="9.25" y="9.25" width="5.5" height="5.5" rx="1" opacity=".35"/><rect x="15.5" y="9.25" width="5.5" height="5.5" rx="1"/><rect x="3" y="15.5" width="5.5" height="5.5" rx="1" opacity=".55"/><rect x="9.25" y="15.5" width="5.5" height="5.5" rx="1" opacity=".8"/><rect x="15.5" y="15.5" width="5.5" height="5.5" rx="1" opacity=".3"/></svg>
 * @author datapuzzle
 * @version 1.1
 * @sampleData [{"label":"Lun-6h","x":"Lun","y":"6h","value":0.2},{"label":"Lun-9h","x":"Lun","y":"9h","value":0.8},{"label":"Lun-12h","x":"Lun","y":"12h","value":0.6},{"label":"Mar-6h","x":"Mar","y":"6h","value":0.1},{"label":"Mar-9h","x":"Mar","y":"9h","value":0.9},{"label":"Mar-12h","x":"Mar","y":"12h","value":0.5},{"label":"Mer-6h","x":"Mer","y":"6h","value":0.4},{"label":"Mer-9h","x":"Mer","y":"9h","value":0.7},{"label":"Mer-12h","x":"Mer","y":"12h","value":0.3}]
 * @dataFields {"x":{"type":"category","required":true,"label":"Colonne","description":"Dimension horizontale de la grille"},"y":{"type":"category","required":true,"label":"Ligne","description":"Dimension verticale de la grille"},"value":{"type":"number","required":true,"label":"Intensité","description":"Détermine la couleur de la cellule"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"scaleMin":{"group":"visuel","type":"number","label":"Borne basse","default":null,"placeholder":"min des données"},"scaleMid":{"group":"visuel","type":"number","label":"Borne neutre","default":null,"placeholder":"moyenne des données"},"scaleMax":{"group":"visuel","type":"number","label":"Borne haute","default":null,"placeholder":"max des données"},"colorMin":{"group":"visuel","type":"color","label":"Couleur min","default":null,"placeholder":"#f0f0f5"},"colorMid":{"group":"visuel","type":"color","label":"Couleur neutre","default":null,"placeholder":"interpolée"},"colorMax":{"group":"visuel","type":"color","label":"Couleur max","default":null,"placeholder":"couleur principale"},"showScale":{"group":"visuel","type":"toggle","label":"Afficher l'échelle","default":true},"cellGap":{"group":"visuel","type":"range","label":"Espacement entre les cases","min":0,"max":20,"step":1,"default":2,"unit":"px"},"cellRatio":{"group":"visuel","type":"number","label":"Ratio L/H","default":null,"placeholder":"remplit la surface"},"opacity":{"group":"general","type":"range","label":"Opacité des cases","min":0,"max":1,"step":0.05,"default":1},"radius":{"group":"general","type":"range","label":"Arrondi des cases","min":0,"max":20,"step":1,"default":4,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":false},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":2},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"},"animate":{"group":"visuel","type":"toggle","label":"Animer à l'affichage","default":false},"animateAxis":{"group":"visuel","type":"select","label":"Sens de l'animation","default":"x","options":[{"value":"x","label":"Parcourt l'axe X"},{"value":"y","label":"Parcourt l'axe Y"}]},"animateDuration":{"group":"visuel","type":"range","label":"Durée d'une marque","min":100,"max":3000,"step":50,"default":450,"unit":"ms"},"animateStagger":{"group":"visuel","type":"range","label":"Décalage entre marques","min":0,"max":2000,"step":10,"default":70,"unit":"ms"},"animateEase":{"group":"visuel","type":"select","label":"Accélération","default":"linear","options":[{"value":"linear","label":"Linéaire"},{"value":"cubic","label":"Douce"},{"value":"back","label":"Léger dépassement"},{"value":"elastic","label":"Rebond"}]}}
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

  // Le Studio transmet l'ordre des axes qu'il a calculé via `data.domains`
  // (non énumérable). S'en remettre à l'ordre d'apparition des lignes est
  // faux sur une grille creuse : les lignes sont triées par la PREMIÈRE
  // dimension, donc la seconde n'apparaît dans le bon ordre que si le premier
  // groupe la couvre entièrement. Le repli garde le DataTool autonome quand
  // il est appelé hors Studio (aperçu, @sampleData).
  const xVals = data.domains?.x || [...new Set(data.map(d => d.x))];
  const yVals = data.domains?.y || [...new Set(data.map(d => d.y))];
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

  // ---- Géométrie des cases ----------------------------------------------
  // p.cellRatio fige le rapport largeur/hauteur d'une case (1 = carré) ;
  // sans lui les cases remplissent toute la surface disponible.
  // La légende d'échelle et le nom de la série partagent le bandeau du haut :
  // le nom à gauche, le dégradé à droite. On réserve donc la hauteur du plus
  // encombrant des deux, pas leur somme.
  const legende  = p.showScale !== false;
  const captionH = shown === null ? 0 : (p.fontSize ?? 12) + 10;
  const legendeH = legende ? (p.fontSize ?? 12) + 14 : 0;
  const enTeteH  = Math.max(captionH, legendeH);
  const plotH = Math.max(10, H - enTeteH);

  const ratio = Number.isFinite(+p.cellRatio) && +p.cellRatio > 0 ? +p.cellRatio : null;
  let stepX = W / m;
  let stepY = plotH / n;
  if (ratio) {
    const side = Math.min(W / m, (plotH / n) * ratio);
    stepX = side;
    stepY = side / ratio;
  }
  const gridW = stepX * m;
  const gridH = stepY * n;
  const offX = (W - gridW) / 2; // la grille contrainte est centrée
  const offY = enTeteH + (plotH - gridH) / 2;

  // p.cellGap est un écart en px, converti en padding relatif que d3 attend
  const gap = Math.max(0, p.cellGap ?? 2);
  const padX = Math.min(0.9, gap / stepX);
  const padY = Math.min(0.9, gap / stepY);

  const x = d3.scaleBand().domain(xVals).range([offX, offX + gridW])
    .paddingInner(padX).paddingOuter(padX / 2);
  const y = d3.scaleBand().domain(yVals).range([offY, offY + gridH])
    .paddingInner(padY).paddingOuter(padY / 2);

  // ---- Axes --------------------------------------------------------------
  // Les étiquettes sont éclaircies quand la grille est dense : en abscisse
  // selon la largeur du plus long libellé, en ordonnée selon la hauteur d'une
  // ligne de texte.
  const fs = p.fontSize ?? 12;
  const largeurX = xVals.reduce((m, v) => Math.max(m, String(v).length), 0) * fs * 0.58 + 6;
  const ticksX = thinTicks(xVals, stepX, largeurX);
  const ticksY = thinTicks(yVals, stepY, fs * 1.25);

  g.append('g').attr('transform', `translate(0,${offY + gridH})`)
    .call(d3.axisBottom(x).tickValues(ticksX))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fs)
    .attr('fill', '#7a7a90');

  g.append('g').attr('transform', `translate(${offX},0)`)
    .call(d3.axisLeft(y).tickValues(ticksY))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', fs)
    .attr('fill', '#7a7a90');

  g.selectAll('.domain').attr('stroke', '#e4e4ed');
  g.selectAll('.tick line').attr('stroke', 'none');

  // Nom de la série affichée : sans lui on lit une grille sans savoir laquelle
  if (shown !== null) {
    g.append('text')
      .attr('x', 0).attr('y', (p.fontSize ?? 12))
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('font-size', p.fontSize ?? 12)
      .attr('font-weight', '500')
      .attr('fill', '#0f0f1a')
      .text(shown);
  }

  // ---- Légende de l'échelle de couleur -----------------------------------
  // Une grille colorée sans échelle se regarde mais ne se lit pas : rien ne
  // dit à quelle valeur correspond une teinte. Le dégradé reprend les trois
  // bornes RÉELLEMENT utilisées par colorScale, bornes figées à la main
  // comprises, et non le min/max des données — sans quoi la légende mentirait
  // dès qu'on fige une borne.
  if (legende) {
    const barreW = Math.max(60, Math.min(160, W * 0.32));
    const barreH = 8;
    const texteMin = fmtVal(sMin);
    const texteMax = fmtVal(sMax);
    // Largeur approximative des deux étiquettes, pour caler le dégradé à leur
    // gauche sans jamais sortir du cadre. DM Mono : environ 0,6 em.
    const largeurTexte = (texteMin.length + texteMax.length) * fs * 0.6 + 16;
    const barreX = Math.max(0, W - barreW - largeurTexte);
    const barreY = Math.max(0, enTeteH - barreH - 6);

    // Un identifiant unique par rendu : deux visuels dans la même page
    // partageraient sinon le même dégradé, et le second écraserait le premier.
    const gradId = 'dp-echelle-' + Math.random().toString(36).slice(2, 9);
    const grad = svg.append('defs').append('linearGradient')
      .attr('id', gradId).attr('x1', '0%').attr('x2', '100%');
    grad.append('stop').attr('offset', '0%').attr('stop-color', cMin);
    grad.append('stop').attr('offset', '50%').attr('stop-color', cMid);
    grad.append('stop').attr('offset', '100%').attr('stop-color', cMax);

    const gl = g.append('g');
    gl.append('text')
      .attr('x', barreX - 6).attr('y', barreY + barreH)
      .attr('text-anchor', 'end')
      .attr('font-family', 'DM Mono, monospace').attr('font-size', fs - 1)
      .attr('fill', '#7a7a90').text(texteMin);
    gl.append('rect')
      .attr('x', barreX).attr('y', barreY)
      .attr('width', barreW).attr('height', barreH)
      .attr('rx', barreH / 2)
      .attr('fill', `url(#${gradId})`)
      .attr('stroke', '#e4e4ed');
    gl.append('text')
      .attr('x', barreX + barreW + 6).attr('y', barreY + barreH)
      .attr('font-family', 'DM Mono, monospace').attr('font-size', fs - 1)
      .attr('fill', '#7a7a90').text(texteMax);
  }


  // ---- Animation d'apparition -------------------------------------------
  // L'ordre suit l'axe, tel que le Studio l'a trié : aucun réglage d'ordre
  // ici. Pour animer autrement, on change le tri du champ dans le panneau
  // Données & Axes, et l'animation suit.
  const anim = !!p.animate;
  const dureeBase = p.animateDuration ?? 450;
  const decalage = p.animateStagger ?? 70;
  const easing = revealEase(p.animateEase);
  // Sens de l'animation : quelle dimension défile en premier. Sans ce réglage
  // l'ordre serait celui des lignes reçues, où le premier champ trié commande —
  // avec les mois en abscisse et les années en ordonnée, on verrait tous les
  // janviers de 1950 à 2026 avant de passer à février.
  const iX = new Map(xVals.map((v, i) => [String(v), i]));
  const iY = new Map(yVals.map((v, i) => [String(v), i]));
  const rangDe = d => (p.animateAxis === 'y'
    ? iX.get(String(d.x)) * n + iY.get(String(d.y))
    : iY.get(String(d.y)) * m + iX.get(String(d.x)));
  const retard = d => rangDe(d) * decalage;

  // ---- Cellules ----------------------------------------------------------
  // Les cases arrivent dans l'ordre du couple (colonne, ligne) fixé par le
  // tri des deux champs : la grille se remplit ligne par ligne ou colonne par
  // colonne selon le tri choisi, sans réglage supplémentaire ici. Toutes ont
  // la même taille, donc pas de notion de vitesse : elles apparaissent en fondu.
  const cellules = g.selectAll('.cell')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.x))
    .attr('y', d => y(d.y))
    .attr('width', x.bandwidth())
    .attr('height', y.bandwidth())
    .attr('fill', d => colorScale(d.value))
    .attr('rx', p.radius ?? 4);

  if (anim) {
    cellules.attr('opacity', 0)
      .transition().duration(dureeBase).delay(retard).ease(easing)
      .attr('opacity', p.opacity ?? 1);
  } else {
    cellules.attr('opacity', p.opacity ?? 1);
  }

  // ---- Valeurs dans les cellules ----------------------------------------
  // Une étiquette plus grande que sa case ne se lit pas, elle se superpose à
  // ses voisines et noircit la grille. On la supprime plutôt que de la tasser :
  // la couleur porte déjà l'information, le chiffre n'est qu'un confort. En
  // DM Mono, un caractère occupe environ 0,6 em — il suffit de comparer à la
  // largeur de bande la plus longue des valeurs à écrire.
  const tailleTexte = (p.fontSize ?? 12) - 1;
  const largeurMax  = d3.max(data, d => String(fmtVal(d.value)).length) || 1;
  const tientDansLaCase = y.bandwidth() >= tailleTexte + 2 &&
                          x.bandwidth() >= largeurMax * tailleTexte * 0.6 + 4;

  if (p.showLabels && tientDansLaCase) {
    const etiquettes = g.selectAll('.cell-label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.x) + x.bandwidth() / 2)
      .attr('y', d => y(d.y) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', tailleTexte)
      // Contraste automatique sur la clarté perceptuelle (Lab) et non la
      // clarté HSL, qui surestime les bleus : #6c63ff passe pour clair en HSL
      // alors qu'un texte sombre y est peu lisible.
      .attr('fill', d => (d3.lab(colorScale(d.value)).l > 62 ? '#0f0f1a' : '#ffffff'))
      .text(d => fmtVal(d.value));

    if (anim) {
      etiquettes.attr('opacity', 0)
        .transition().duration(dureeBase * 0.6)
        .delay(d => retard(d) + dureeBase * 0.55)
        .attr('opacity', 1);
    }
  }
}

// Accélération de l'animation d'apparition. Linéaire par défaut : une marque
// progresse à vitesse constante du début à la fin.
function revealEase(mode) {
  if (mode === 'cubic')   return d3.easeCubicOut;
  if (mode === 'back')    return d3.easeBackOut.overshoot(1.4);
  if (mode === 'elastic') return d3.easeElasticOut.amplitude(1).period(0.4);
  return d3.easeLinear;
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

// N'écrit qu'une étiquette sur n quand elles ne tiennent pas côte à côte. Le
// pas se déduit de la place réellement disponible et non d'un seuil arbitraire :
// 77 années sur un axe vertical en gardent une sur 5 ou sur 10 selon la
// hauteur, sans qu'aucun réglage soit nécessaire.
function thinTicks(valeurs, pas, encombrement) {
  const tous = Math.max(1, Math.ceil(encombrement / Math.max(1, pas)));
  return tous === 1 ? valeurs : valeurs.filter((v, i) => i % tous === 0);
}
