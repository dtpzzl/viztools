/**
 * @name Carte
 * @description Fond de carte coloré par valeur — un aplat par territoire
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 2.2 5.6 4.1 3.2 9.6l2.1 3.4 5.6-1.3 2.3-4.9Z"/><path d="m11.9 7.3 5.7-2.1 3.3 4.4-1.6 4.2-5.5.6-2.2-3.9Z" opacity=".55"/><path d="m5.5 13.9 5.4-1.2 2.1 3.6-1.7 5.3-4.6-1.1-1.9-4.3Z" opacity=".8"/><path d="m13.9 15.2 5.2-.6.8 3.6-3.6 3.3-3.6-1.1Z" opacity=".32"/></svg>
 * @sampleData [{"region":"11","value":12.3},{"region":"84","value":8.1},{"region":"93","value":15.7},{"region":"76","value":6.4}]
 * @dataFields {"region":{"type":"category","required":true,"label":"Territoire","description":"Colonne qui porte le code ou le nom du territoire — c'est elle qui se joint au fond de carte"},"value":{"type":"number","required":true,"label":"Valeur","description":"Ce que la couleur représente"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Restreint la carte à une valeur, par exemple une année"}}
 * @geoSource {"label":"Fond de carte","pivotLabel":"Propriété de jointure","description":"Un GeoJSON — FeatureCollection ou Feature. La propriété choisie est confrontée au champ Territoire pour apparier chaque tracé à sa ligne."}
 * @params {"projection":{"group":"visuel","type":"select","label":"Projection","default":"mercator","options":[{"value":"mercator","label":"Mercator"},{"value":"conicConformal","label":"Conique conforme (France)"},{"value":"naturalEarth1","label":"Natural Earth (monde)"},{"value":"equalEarth","label":"Equal Earth (monde)"},{"value":"identity","label":"Aucune — coordonnées déjà projetées"}]},"scaleMin":{"group":"visuel","type":"number","label":"Borne basse","default":null,"placeholder":"min des données"},"scaleMid":{"group":"visuel","type":"number","label":"Borne neutre","default":null,"placeholder":"moyenne des données"},"scaleMax":{"group":"visuel","type":"number","label":"Borne haute","default":null,"placeholder":"max des données"},"colorMin":{"group":"visuel","type":"color","label":"Couleur min","default":null,"placeholder":"#f0f0f5"},"colorMid":{"group":"visuel","type":"color","label":"Couleur neutre","default":null,"placeholder":"interpolée"},"colorMax":{"group":"visuel","type":"color","label":"Couleur max","default":null,"placeholder":"couleur principale"},"opacityMin":{"group":"visuel","type":"range","label":"Opacité borne basse","min":0,"max":1,"step":0.05,"default":1},"opacityMid":{"group":"visuel","type":"number","label":"Opacité borne neutre","default":null,"placeholder":"entre les deux"},"opacityMax":{"group":"visuel","type":"range","label":"Opacité borne haute","min":0,"max":1,"step":0.05,"default":1},"showScale":{"group":"visuel","type":"toggle","label":"Afficher l'échelle","default":true},"missingColor":{"group":"visuel","type":"color","label":"Territoire sans donnée","default":null,"placeholder":"#ececf2"},"borderColor":{"group":"visuel","type":"color","label":"Couleur des frontières","default":null,"placeholder":"#ffffff"},"borderWidth":{"group":"visuel","type":"range","label":"Épaisseur des frontières","min":0,"max":4,"step":0.25,"default":0.75,"unit":"px"},"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"opacity":{"group":"general","type":"range","label":"Opacité","min":0.1,"max":1,"step":0.05,"default":1},"showLabels":{"group":"general","type":"toggle","label":"Afficher les valeurs","default":false},"labelDensity":{"group":"general","type":"range","label":"Densité des valeurs","min":0,"max":1,"step":0.05,"default":1},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  const fs = p.fontSize ?? 12;

  // Le fond de carte ne peut pas venir du DataTool : le bac à sable n'a ni
  // `fetch` ni accès au DOM. C'est le Studio qui le charge, le joint au jeu
  // de données et le dépose ici, hors énumération pour qu'il ne se mêle pas
  // aux lignes — même convention que `data.domains`.
  const geo = data.geo;

  // d3-geo raisonne sur la SPHÈRE : un anneau parcouru dans le mauvais sens
  // ne décrit pas le territoire, mais tout le reste du monde. Et le sens
  // qu'il attend est l'INVERSE de celui que prescrit la RFC 7946 — que
  // respectent beaucoup de fichiers publics, dont ceux de data.gouv.fr. Sans
  // correction, la carte se remplit d'un seul aplat.
  //
  // On mesure donc chaque anneau : un contour extérieur couvre moins d'un
  // hémisphère, un trou davantage, puisqu'il tourne en sens contraire. Ce
  // qui se mesure à l'envers est retourné, anneau par anneau, ce qui rattrape
  // aussi les fichiers dont seuls les trous sont mal orientés.
  const surLaSphere = (p.projection || 'mercator') !== 'identity';
  const DEMI_SPHERE = Math.PI * 2;
  const redresseAnneau = (anneau, estTrou) => {
    const aire = d3.geoArea({ type: 'Polygon', coordinates: [anneau] });
    if (!Number.isFinite(aire)) return anneau;
    const aLEnvers = estTrou ? aire < DEMI_SPHERE : aire > DEMI_SPHERE;
    return aLEnvers ? anneau.slice().reverse() : anneau;
  };
  const redressePoly = poly => poly.map((a, i) => redresseAnneau(a, i > 0));
  const redresse = f => {
    const geom = f.geometry;
    if (!surLaSphere || !geom) return f;
    if (geom.type === 'Polygon')
      return { ...f, geometry: { ...geom, coordinates: redressePoly(geom.coordinates) } };
    if (geom.type === 'MultiPolygon')
      return { ...f, geometry: { ...geom, coordinates: geom.coordinates.map(redressePoly) } };
    return f;
  };

  // `map` et non une écriture en place : le Studio garde le fond de carte en
  // mémoire pour le re-rendre, et le retourner deux fois le remettrait à
  // l'envers.
  const traces = (geo?.features?.filter(f => f && f.geometry) || []).map(redresse);
  if (!traces.length) {
    g.append('text').attr('x', W / 2).attr('y', H / 2)
      .attr('text-anchor', 'middle').attr('font-family', 'DM Mono, monospace')
      .attr('font-size', fs).attr('fill', '#b0b0c0')
      .text('Aucun fond de carte');
    return;
  }

  // Le Studio rappelle quelle valeur de filtre a été retenue ; lui seul
  // filtre. Voir CLAUDE.md, « Champ filtre ».
  const shown = String(p.filterValue ?? '').trim() || null;

  // ---- Jointure ----------------------------------------------------------
  // Les codes de territoire arrivent tantôt en texte, tantôt en nombre selon
  // la source : « 01 » dans le GeoJSON, 1 dans un CSV relu par un tableur.
  // On indexe donc sur les deux formes, sinon la Corse et l'Ain disparaissent
  // sans que rien ne le signale.
  const clesDe = v => {
    const brut = String(v ?? '').trim();
    if (!brut) return [];
    const formes = [brut, brut.toLowerCase()];
    const n = Number(brut);
    if (Number.isFinite(n)) formes.push(String(n));
    return formes;
  };
  const parCle = new Map();
  for (const ligne of data) {
    for (const k of clesDe(ligne.region)) if (!parCle.has(k)) parCle.set(k, ligne);
  }

  const pivot = geo.pivot || null;
  const valeurDe = f => {
    const props = f.properties || {};
    // Sans pivot choisi, on tente les propriétés usuelles plutôt que de ne
    // rien rendre : un fond de carte français porte presque toujours l'une
    // d'elles, et l'auteur voit sa carte avant d'avoir à régler quoi que ce soit.
    const candidats = pivot ? [props[pivot]]
      : [props.code, props.CODE, props.insee, props.nom, props.name, props.NOM, f.id];
    for (const c of candidats) {
      for (const k of clesDe(c)) if (parCle.has(k)) return parCle.get(k);
    }
    return null;
  };

  const marques = traces.map(f => {
    const ligne = valeurDe(f);
    const v = ligne ? +ligne.value : NaN;
    return { feature: f, data: ligne, value: Number.isFinite(v) ? v : null };
  });
  const values = marques.map(m => m.value).filter(v => v !== null);

  // ---- Échelle de couleur ------------------------------------------------
  // Même construction que la heatmap : bornes calculées sur les données,
  // chacune remplaçable en dur, et opacité le long de l'échelle.
  const hard = (v, repli) => {
    if (v === null || v === undefined || v === '') return repli;
    const num = +v;
    return Number.isFinite(num) ? num : repli;
  };
  let sMin = hard(p.scaleMin, values.length ? d3.min(values) : 0);
  let sMax = hard(p.scaleMax, values.length ? d3.max(values) : 1);
  if (sMax < sMin) { const t = sMin; sMin = sMax; sMax = t; }
  if (sMax === sMin) sMax = sMin + 1;
  let sMid = hard(p.scaleMid, values.length ? d3.mean(values) : (sMin + sMax) / 2);
  if (!(sMid > sMin && sMid < sMax)) sMid = (sMin + sMax) / 2;

  const cMin = p.colorMin || '#f0f0f5';
  const cMax = p.colorMax || color;
  const cMid = p.colorMid || d3.interpolate(cMin, cMax)(0.5);
  const colorScale = d3.scaleLinear()
    .domain([sMin, sMid, sMax]).range([cMin, cMid, cMax]).clamp(true);

  const dans01 = (v, repli) => {
    const n = +v;
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : repli;
  };
  const oMin = dans01(p.opacityMin, 1);
  const oMax = dans01(p.opacityMax, 1);
  const oMid = dans01(p.opacityMid, (oMin + oMax) / 2);
  const opacityScale = d3.scaleLinear()
    .domain([sMin, sMid, sMax]).range([oMin, oMid, oMax]).clamp(true);

  const sansDonnee = p.missingColor || '#ececf2';
  const remplissage = m => (m.value === null ? sansDonnee : colorScale(m.value));
  const opaciteDe   = m => (p.opacity ?? 1) * (m.value === null ? 1 : opacityScale(m.value));

  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, sMax);

  // ---- Bandeau du haut ---------------------------------------------------
  // Le rappel du filtre et l'échelle le partagent : on réserve la hauteur du
  // plus encombrant des deux, pas leur somme.
  const legende  = p.showScale !== false && values.length > 0;
  const captionH = shown === null ? 0 : fs + 10;
  const legendeH = legende ? fs + 14 : 0;
  const enTeteH  = Math.max(captionH, legendeH);

  if (shown !== null) {
    g.append('text').attr('x', 0).attr('y', fs)
      .attr('font-family', 'DM Mono, monospace').attr('font-size', fs)
      .attr('fill', '#7a7a90').text(shown);
  }

  // ---- Projection --------------------------------------------------------
  // `fitExtent` cadre la carte sur la place restante, quel que soit le
  // territoire : ni centrage ni échelle à régler à la main.
  const fabriques = {
    mercator:       () => d3.geoMercator(),
    conicConformal: () => d3.geoConicConformal(),
    naturalEarth1:  () => d3.geoNaturalEarth1(),
    equalEarth:     () => d3.geoEqualEarth(),
    // Coordonnées déjà projetées — un fichier en Lambert-93, par exemple.
    // `reflectY` remet le nord en haut : en SVG l'axe Y descend.
    identity:       () => d3.geoIdentity().reflectY(true),
  };
  const fabrique = fabriques[p.projection] || fabriques.mercator;
  const collection = { type: 'FeatureCollection', features: traces };
  const projection = fabrique();
  const hautCarte = Math.max(10, H - enTeteH);
  projection.fitExtent([[0, enTeteH], [W, enTeteH + hautCarte]], collection);
  const chemin = d3.geoPath(projection);

  // ---- Tracés ------------------------------------------------------------
  const bord = p.borderColor || '#ffffff';
  const epaisseurBord = Math.max(0, +p.borderWidth ?? 0.75);
  const carte = g.append('g');
  carte.selectAll('path')
    .data(marques).enter().append('path')
    .attr('d', m => chemin(m.feature))
    .attr('fill', remplissage)
    .attr('fill-opacity', opaciteDe)
    .attr('stroke', epaisseurBord > 0 ? bord : 'none')
    .attr('stroke-width', epaisseurBord)
    .attr('stroke-linejoin', 'round');

  // ---- Valeurs -----------------------------------------------------------
  if (p.showLabels && values.length) {
    const densite = dans01(p.labelDensity, 1);
    // Les territoires trop petits pour porter leur chiffre le rejettent : une
    // étiquette qui déborde de son aplat se lit sur le voisin.
    const lisibles = marques
      .filter(m => m.value !== null)
      .map(m => ({ m, aire: chemin.area(m.feature), centre: chemin.centroid(m.feature) }))
      .filter(o => Number.isFinite(o.centre[0]) && Number.isFinite(o.centre[1]))
      .sort((a, b) => b.aire - a.aire);
    const garde = Math.round(lisibles.length * densite);
    for (const o of lisibles.slice(0, garde)) {
      const texte = fmtVal(o.m.value);
      // Assez de place pour le texte ? On compare l'aire du tracé au
      // rectangle qu'occuperait l'étiquette.
      if (o.aire < texte.length * fs * 0.6 * fs * 1.6) continue;
      // Contraste calculé sur la couleur PERÇUE, l'aplat pouvant être estompé.
      const percue = d3.interpolateLab('#ffffff', colorScale(o.m.value))(opaciteDe(o.m));
      carte.append('text')
        .attr('x', o.centre[0]).attr('y', o.centre[1])
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('font-family', 'DM Mono, monospace').attr('font-size', fs - 1)
        .attr('fill', d3.lab(percue).l > 62 ? '#0f0f1a' : '#ffffff')
        .attr('pointer-events', 'none')
        .text(texte);
    }
  }

  // ---- Échelle en légende ------------------------------------------------
  // Les bornes affichées sont celles de l'ÉCHELLE, non le min/max des
  // données : sans quoi la légende mentirait dès qu'on fige une borne.
  if (legende) {
    const barreW = Math.max(60, Math.min(160, W * 0.32));
    const barreH = 8;
    const texteMin = fmtVal(sMin);
    const texteMax = fmtVal(sMax);
    const largeurTexte = (texteMin.length + texteMax.length) * fs * 0.6 + 16;
    const barreX = Math.max(0, W - barreW - largeurTexte);
    const barreY = Math.max(0, enTeteH - barreH - 6);

    // Un identifiant unique par rendu : deux visuels dans la même page
    // partageraient sinon le même dégradé.
    const gradId = 'dp-carte-' + Math.random().toString(36).slice(2, 9);
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
}

// Répété à l'identique dans chaque DataTool : aucun `import` n'est possible
// dans le bac à sable, chaque fichier doit être autonome.
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
