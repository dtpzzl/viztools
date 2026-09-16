/**
 * @name Barres verticales
 * @description Comparaison de valeurs entre catégories
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4.5" height="9" rx="1" opacity=".5"/><rect x="9.75" y="7" width="4.5" height="14" rx="1" opacity=".78"/><rect x="16.5" y="3" width="4.5" height="18" rx="1"/></svg>
 * @author datapuzzle
 * @version 1.0
 * @sampleData [{"label":"2019","value":42},{"label":"2020","value":58},{"label":"2021","value":51},{"label":"2022","value":67},{"label":"2023","value":73},{"label":"2024","value":69}]
 * @dataFields {"label":{"type":"category","required":true,"label":"Catégorie","description":"Axe des abscisses, une barre ou un point par valeur distincte"},"value":{"type":"number","required":true,"label":"Valeur","description":"Grandeur mesurée"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Isole un sous-ensemble ; sans valeur choisie, tout est cumulé"}}
 * @params {"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"opacity":{"group":"general","type":"range","label":"Opacité des barres","min":0,"max":1,"step":0.05,"default":0.9},"radius":{"group":"general","type":"range","label":"Arrondi des barres","min":0,"max":20,"step":1,"default":5,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":true},"showGrid":{"group":"general","type":"toggle","label":"Afficher la grille","default":true},"ticks":{"group":"general","type":"range","label":"Graduations","min":2,"max":12,"step":1,"default":5},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"},"animate":{"group":"visuel","type":"toggle","label":"Animer à l'affichage","default":false},"animatePace":{"group":"visuel","type":"select","label":"Rythme","default":"duration","options":[{"value":"duration","label":"Même durée pour toutes"},{"value":"speed","label":"Même vitesse pour toutes"}]},"animateDuration":{"group":"visuel","type":"range","label":"Durée d'une marque","min":100,"max":3000,"step":50,"default":450,"unit":"ms"},"animateStagger":{"group":"visuel","type":"range","label":"Décalage entre marques","min":0,"max":2000,"step":10,"default":70,"unit":"ms"},"animateEase":{"group":"visuel","type":"select","label":"Accélération","default":"linear","options":[{"value":"linear","label":"Linéaire"},{"value":"cubic","label":"Douce"},{"value":"back","label":"Léger dépassement"},{"value":"elastic","label":"Rebond"}]}}
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
  const x = d3.scaleBand()
    .domain(data.map(d => d.label))
    .range([0, W])
    .padding(0.28);

  const yMax = d3.max(data, d => d.value) * 1.1;
  const y = d3.scaleLinear()
    .domain([0, yMax])
    .range([H, 0]);
  const fmtY = v => formatAxisValue(v, p.unitMode, p.decimals, yMax);

  // Grille horizontale
  if (p.showGrid ?? true) {
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickSize(-W).tickFormat(''))
      .selectAll('line').attr('stroke', '#e4e4ed').attr('stroke-dasharray', '3,3');
    g.select('.grid .domain').remove();
  }

  // Axes
  const xAxis = g.append('g').attr('transform', `translate(0,${H})`)
    .call(d3.axisBottom(x));

  xAxis.selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', p.fontSize ?? 12)
    .attr('fill', '#7a7a90');

  // Bascule les labels en biais s'ils ne tiennent pas côte à côte
  layoutAxisLabels(xAxis, data.map(d => d.label), x.step(), p.fontSize ?? 12, p.margin);

  g.append('g')
    .call(d3.axisLeft(y).ticks(p.ticks ?? 5).tickFormat(fmtY))
    .selectAll('text')
    .attr('font-family', 'DM Sans, sans-serif')
    .attr('font-size', p.fontSize ?? 12)
    .attr('fill', '#7a7a90');

  g.selectAll('.domain').attr('stroke', '#e4e4ed');
  g.selectAll('.tick line').attr('stroke', 'none');


  // ---- Animation d'apparition -------------------------------------------
  // L'ordre suit l'axe, tel que le Studio l'a trié : aucun réglage d'ordre
  // ici. Pour animer autrement, on change le tri du champ dans le panneau
  // Données & Axes, et l'animation suit.
  const anim = !!p.animate;
  const dureeBase = p.animateDuration ?? 450;
  const decalage = p.animateStagger ?? 70;
  const easing = revealEase(p.animateEase);
  const retard = (d, i) => i * decalage;

  // « Même vitesse » rend la durée proportionnelle à la hauteur : sinon une
  // barre haute et une barre basse mettent le même temps, donc la haute monte
  // plus vite, ce qui se lit comme une accélération.
  const hautMax = H - y(d3.max(data, d => d.value));
  const dureeDe = d => (p.animatePace === 'speed' && hautMax > 0
    ? Math.max(60, dureeBase * (H - y(d.value)) / hautMax)
    : dureeBase);

  // Barres
  const barres = g.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', d => x(d.label))
    .attr('width', x.bandwidth())
    .attr('fill', color)
    .attr('rx', p.radius ?? 5)
    .attr('opacity', p.opacity ?? 0.9);

  if (anim) {
    barres.attr('y', H).attr('height', 0)
      .transition().duration(dureeDe).delay(retard).ease(easing)
      .attr('y', d => y(d.value))
      .attr('height', d => H - y(d.value));
  } else {
    barres.attr('y', d => y(d.value)).attr('height', d => H - y(d.value));
  }

  // Valeurs au-dessus des barres
  if (p.showLabels ?? true) {
    const etiquettes = g.selectAll('.label')
      .data(data)
      .enter()
      .append('text')
      .attr('x', d => x(d.label) + x.bandwidth() / 2)
      .attr('y', d => y(d.value) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-family', 'DM Mono, monospace')
      .attr('font-size', (p.fontSize ?? 12) - 1)
      .attr('fill', '#7a7a90')
      .text(d => fmtY(d.value));

    if (anim) {
      etiquettes.attr('opacity', 0)
        .transition().duration(d => dureeDe(d) * 0.6)
        .delay((d, i) => retard(d, i) + dureeDe(d) * 0.55)
        .attr('opacity', 1);
    }
  }
}

// Accélération de l'animation d'apparition. Linéaire par défaut : une marque
// progresse à vitesse constante du début à la fin. cubicOut couvrait
// l'essentiel de la distance dans les premiers 40 % puis s'attardait, ce qui
// se lit comme une saccade plutôt que comme une montée régulière.
function revealEase(mode) {
  if (mode === 'cubic')   return d3.easeCubicOut;
  if (mode === 'back')    return d3.easeBackOut.overshoot(1.4);
  if (mode === 'elastic') return d3.easeElasticOut.amplitude(1).period(0.4);
  return d3.easeLinear;
}


// Bascule les labels de l'axe des catégories en biais quand ils se chevauchent
// (noms de séries, dates…), avec retour à la ligne automatique. La largeur est
// estimée depuis le nombre de caractères : getBBox() n'est fiable qu'une fois le
// SVG rendu, ce qui n'est pas garanti au moment du draw.
function layoutAxisLabels(axisG, labels, step, fontSize, margin) {
  const charW = fontSize * 0.58;
  const lineHeight = fontSize * 1.15;
  const longest = labels.reduce((max, l) => Math.max(max, String(l).length), 0);

  if (longest * charW + 6 <= step) return; // ça tient à l'horizontale, on ne touche à rien

  // Deux labels inclinés de θ sont deux droites parallèles distantes de
  // step·sin(θ) : cet écart doit dépasser la hauteur du bloc de texte.
  const minAngle = Math.asin(Math.min(1, lineHeight / step)) * 180 / Math.PI;
  const needed = Math.min(60, Math.round(minAngle) + 3);
  // Un nom nettement plus large que son emplacement bascule franchement à 45° :
  // bien plus lisible qu'une inclinaison timide.
  const angle = longest * charW > step ? Math.max(45, needed) : Math.max(30, needed);
  const rad = angle * Math.PI / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);

  // Le texte incliné descend dans la marge basse et déborde vers la gauche, et
  // le SVG coupe sans prévenir ce qui sort du cadre. Chaque ligne supplémentaire
  // décale le bloc un peu plus bas : on dimensionne pour que tout tienne.
  const below = ((margin && margin.bottom) || 40) - fontSize - 8;
  const leftRoom = ((margin && margin.left) || 40) + step / 2 - 4;
  const maxLines = Math.max(1, Math.min(3, Math.floor((step * sin) / lineHeight)));

  // Le plus petit nombre de lignes qui fait tenir le label le plus long ;
  // à défaut, celui qui en affiche le plus.
  let lines = 0;
  let maxChars = 0;
  let best = -1;
  for (let n = 1; n <= maxLines; n++) {
    const width = Math.min((below - (n - 1) * lineHeight * cos) / sin, leftRoom / cos);
    const chars = Math.floor(width / charW);
    // En dessous de 6 caractères une ligne ne porte plus de mot : mieux vaut
    // une seule ligne tronquée que plusieurs bouts illisibles.
    if (chars < (n === 1 ? 3 : 6)) break;
    if (n * chars > best) { best = n * chars; lines = n; maxChars = chars; }
    if (n * chars >= longest) break;
  }
  if (!lines) { lines = 1; maxChars = 3; } // marge basse trop étroite : on fait au mieux

  axisG.selectAll('text')
    .attr('transform', `rotate(-${angle})`)
    .attr('text-anchor', 'end')
    .attr('dy', 0)
    .each(function (d) {
      const sel = d3.select(this);
      sel.text(null);
      wrapLabel(String(d), maxChars, lines).forEach((text, i) => {
        sel.append('tspan')
          .attr('x', -4)
          .attr('dy', i ? lineHeight : fontSize * 0.32)
          .text(text);
      });
    });
}

// Découpe un label en lignes d'au plus maxChars caractères. Coupe d'abord sur
// les espaces, puis sur les traits d'union pour les noms composés du type
// « Auvergne-Rhône-Alpes ». Ce qui ne rentre pas est tronqué par des points
// de suspension sur la dernière ligne.
function wrapLabel(text, maxChars, maxLines) {
  const tokens = [];
  text.split(/\s+/).filter(Boolean).forEach(word => {
    if (word.length <= maxChars) { tokens.push(word); return; }
    const parts = word.split('-');
    parts.forEach((part, i) => tokens.push(i < parts.length - 1 ? part + '-' : part));
  });

  const lines = [];
  let line = '';
  let leftover = false;
  for (const token of tokens) {
    if (!line) { line = token; continue; }
    const glue = line.slice(-1) === '-' ? '' : ' ';
    if ((line + glue + token).length <= maxChars) { line += glue + token; continue; }
    if (lines.length + 1 === maxLines) { leftover = true; break; }
    lines.push(line);
    line = token;
  }
  if (line) lines.push(line);

  if (leftover && lines.length) {
    const last = lines.length - 1;
    lines[last] = lines[last].slice(0, Math.max(1, maxChars - 1)) + '…';
  }
  return lines.map(l => (l.length > maxChars ? l.slice(0, Math.max(1, maxChars - 1)) + '…' : l));
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
