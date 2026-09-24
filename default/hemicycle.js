/**
 * @name Hémicycle
 * @description Sièges d'une assemblée en demi-cercle, un point par votant, coloré par groupe
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="4" cy="17" r="1.6" opacity=".45"/><circle cx="7.2" cy="11.5" r="1.6" opacity=".7"/><circle cx="12" cy="9" r="1.6"/><circle cx="16.8" cy="11.5" r="1.6" opacity=".7"/><circle cx="20" cy="17" r="1.6" opacity=".45"/><circle cx="6.5" cy="21" r="1.4" opacity=".3"/><circle cx="12" cy="14.5" r="1.4" opacity=".85"/><circle cx="17.5" cy="21" r="1.4" opacity=".3"/></svg>
 * @sampleData [{"series":"Groupe A","label":"Pour","value":90},{"series":"Groupe A","label":"Contre","value":12},{"series":"Groupe B","label":"Contre","value":64},{"series":"Groupe B","label":"Abstention","value":9}]
 * @dataFields {"series":{"type":"category","required":true,"label":"Groupe","description":"Groupe politique : chaque groupe occupe des sièges contigus, dans l'ordre du tri choisi"},"label":{"type":"category","required":true,"label":"Sens du vote","description":"Pour, Contre, ou tout autre valeur traitée comme abstention"},"value":{"type":"number","required":false,"label":"Effectif","description":"Nombre de votants que représente la ligne — à laisser vide si une ligne = un votant"},"votant":{"type":"category","required":false,"label":"Votant","description":"Nom ou identifiant du votant : au survol, l'infobulle le nomme. Suppose une ligne par votant"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Restreint l'hémicycle à une valeur, par exemple un scrutin"}}
 * @params {"votePour":{"group":"visuel","type":"text","label":"Valeur « pour »","default":"Pour"},"voteContre":{"group":"visuel","type":"text","label":"Valeur « contre »","default":"Contre"},"rowCount":{"group":"visuel","type":"number","label":"Nombre de rangées","default":null,"placeholder":"auto"},"innerRatio":{"group":"visuel","type":"range","label":"Trou central","min":0.1,"max":0.8,"step":0.05,"default":0.35},"seatGap":{"group":"visuel","type":"range","label":"Écart entre sièges","min":0,"max":6,"step":0.5,"default":1.5,"unit":"px"},"abstentionStroke":{"group":"visuel","type":"range","label":"Épaisseur de l'anneau d'abstention","min":0.1,"max":0.6,"step":0.02,"default":0.28},"showLegend":{"group":"visuel","type":"toggle","label":"Afficher la légende","default":true},"showResume":{"group":"visuel","type":"toggle","label":"Résumé au centre","default":true},"effectifTotal":{"group":"visuel","type":"number","label":"Sièges de l'assemblée","default":null,"placeholder":"nombre de votants"},"colorSerie1":{"group":"visuel","type":"color","label":"Couleur groupe 1","default":null,"placeholder":"palette automatique"},"colorSerie2":{"group":"visuel","type":"color","label":"Couleur groupe 2","default":null,"placeholder":"palette automatique"},"colorSerie3":{"group":"visuel","type":"color","label":"Couleur groupe 3","default":null,"placeholder":"palette automatique"},"colorSerie4":{"group":"visuel","type":"color","label":"Couleur groupe 4","default":null,"placeholder":"palette automatique"},"colorSerie5":{"group":"visuel","type":"color","label":"Couleur groupe 5","default":null,"placeholder":"palette automatique"},"colorSerie6":{"group":"visuel","type":"color","label":"Couleur groupe 6","default":null,"placeholder":"palette automatique"},"colorSerie7":{"group":"visuel","type":"color","label":"Couleur groupe 7","default":null,"placeholder":"palette automatique"},"colorSerie8":{"group":"visuel","type":"color","label":"Couleur groupe 8","default":null,"placeholder":"palette automatique"},"colorSerie9":{"group":"visuel","type":"color","label":"Couleur groupe 9","default":null,"placeholder":"palette automatique"},"colorSerie10":{"group":"visuel","type":"color","label":"Couleur groupe 10","default":null,"placeholder":"palette automatique"},"colorSerie11":{"group":"visuel","type":"color","label":"Couleur groupe 11","default":null,"placeholder":"palette automatique"},"colorSerie12":{"group":"visuel","type":"color","label":"Couleur groupe 12","default":null,"placeholder":"palette automatique"},"colorSerie13":{"group":"visuel","type":"color","label":"Couleur groupe 13","default":null,"placeholder":"palette automatique"},"colorSerie14":{"group":"visuel","type":"color","label":"Couleur groupe 14","default":null,"placeholder":"palette automatique"},"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"opacity":{"group":"general","type":"range","label":"Opacité","min":0.1,"max":1,"step":0.05,"default":1},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les effectifs","default":true}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  // Le Studio filtre ET agrège en amont. Le visuel rappelle seulement quelle
  // valeur a été retenue. Voir CLAUDE.md, « Champ filtre ».
  const shown = String(p.filterValue ?? '').trim() || null;

  const fontSize = p.fontSize ?? 12;
  const dans01 = (v, repli) => {
    const n = +v;
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : repli;
  };
  const POUR   = String(p.votePour   ?? 'Pour').trim().toLowerCase();
  const CONTRE = String(p.voteContre ?? 'Contre').trim().toLowerCase();

  // Trois sens de vote seulement. Tout ce qui n'est ni « pour » ni « contre »
  // — abstention, non-votant, absent — tombe dans la même catégorie : le
  // visuel ne prétend pas les distinguer, il montre qui ne tranche pas.
  const sensDe = etiquette => {
    const v = String(etiquette ?? '').trim().toLowerCase();
    if (v === POUR)   return 'pour';
    if (v === CONTRE) return 'contre';
    return 'abstention';
  };

  // ---- Groupes, dans l'ordre du tri choisi -------------------------------
  // `data.domains` porte l'ordre calculé par le Studio : sur un hémicycle il
  // ne s'agit pas d'un tri quelconque mais du PLACEMENT, de la gauche vers la
  // droite. C'est à l'auteur de ranger ses groupes, pas au visuel d'en
  // décider. Repli sur l'ordre d'apparition hors Studio.
  const groupes = data.domains?.series
    || [...new Set(data.map(d => d.series))].filter(s => s !== undefined && s !== null && s !== '');
  if (!groupes.length) return;

  // Effectif par groupe et par sens, puis total : c'est lui qui donne le
  // nombre de sièges à dessiner.
  // Deux formes de données acceptées, et c'est le champ `value` qui tranche.
  // Renseigné, la ligne vaut N sièges — c'est le cas d'une source déjà
  // comptée. Absent, une ligne EST un siège : c'est la forme qui permet de
  // nommer chaque votant au survol, puisque la ligne source voyage alors
  // jusqu'à sa marque.
  const parGroupe = new Map();
  for (const groupe of groupes) parGroupe.set(groupe, { pour: [], abstention: [], contre: [] });
  for (const d of data) {
    const seau = parGroupe.get(d.series);
    if (!seau) continue;
    const n = Number.isFinite(+d.value) ? Math.max(0, Math.round(+d.value)) : 1;
    for (let k = 0; k < n; k++) seau[sensDe(d.label)].push(d);
  }
  const effectif = new Map();
  let total = 0;
  for (const [groupe, seau] of parGroupe) {
    const e = { pour: seau.pour.length, abstention: seau.abstention.length,
                contre: seau.contre.length };
    e.total = e.pour + e.abstention + e.contre;
    effectif.set(groupe, e);
    total += e.total;
  }
  if (!total) return;

  // ---- Palette ----------------------------------------------------------
  // Une couleur par groupe, réglable siège par siège dans le panneau. Non
  // renseignée, elle est dérivée de la couleur principale — même bande de
  // clarté que les autres visuels, pour qu'aucune part ne blanchisse.
  const couleurDe = (groupe, i) => {
    const reglee = p[`colorSerie${i + 1}`];
    if (reglee) return reglee;
    return d3.hsl((d3.hsl(color).h + i * 30) % 360, 0.7, 0.4 + (i % 4) * 0.09).toString();
  };

  // ---- Légende ----------------------------------------------------------
  const legende = p.showLegend !== false;
  const hautCaption = shown === null ? 0 : fontSize + 8;
  // Deux lignes : les groupes, puis le rappel des trois symboles.
  const hautLegende = legende ? fontSize * 2 + 26 : 0;
  const hauteurArc = Math.max(40, H - hautCaption - hautLegende);

  if (shown !== null) {
    g.append('text')
      .attr('x', 0).attr('y', fontSize)
      .attr('font-family', 'DM Sans, sans-serif').attr('font-size', fontSize)
      .attr('font-weight', '500').attr('fill', '#0f0f1a')
      .text(shown);
  }

  // ---- Géométrie de l'hémicycle -----------------------------------------
  // Un demi-disque : le rayon est borné par la largeur (deux rayons) ET par
  // la hauteur (un seul). C'est presque toujours la hauteur qui contraint.
  const rayonMax = Math.min(W / 2, hauteurArc);
  const trou = Math.min(0.8, Math.max(0.1, +p.innerRatio || 0.35));
  const rInt = rayonMax * trou;

  // Nombre de rangées : à défaut de réglage, on cherche celui qui donne des
  // sièges à peu près aussi espacés en profondeur qu'en largeur — c'est ce
  // qui donne l'aspect régulier d'un vrai hémicycle.
  const rangeesVoulues = Number.isFinite(+p.rowCount) && +p.rowCount >= 1
    ? Math.round(+p.rowCount)
    : Math.max(3, Math.round(Math.sqrt(total / 2.2)));
  const rangees = Math.max(1, Math.min(rangeesVoulues, 40));

  // Chaque rangée reçoit un nombre de sièges proportionnel à son rayon : les
  // rangées du fond, plus longues, en portent davantage. Sans cela les sièges
  // seraient serrés devant et clairsemés derrière.
  // Écarter les rangées sur tout le rayon disponible les transforme en anneaux
  // concentriques dès qu'elles sont peu nombreuses : on voit des arcs séparés,
  // pas un banc. La profondeur entre deux rangées ne doit donc pas dépasser
  // l'écart entre deux sièges d'une même rangée, qui est imposé, lui, par le
  // nombre de sièges. On resserre le rayon extérieur en conséquence.
  const pasAngulaireEstime = Math.PI * rInt / Math.max(1, Math.ceil(total / rangees));
  const profondeurMax = rangees > 1 ? (rayonMax - rInt) / (rangees - 1) : rayonMax - rInt;
  const profondeur = Math.min(profondeurMax, pasAngulaireEstime * 1.15);
  const rExt = rangees > 1 ? rInt + profondeur * (rangees - 1) : rayonMax;

  const rayons = [];
  for (let i = 0; i < rangees; i++) {
    rayons.push(rangees === 1 ? (rInt + rExt) / 2
                              : rInt + (rExt - rInt) * (i / (rangees - 1)));
  }
  const sommeRayons = d3.sum(rayons);
  const parRangee = rayons.map(r => Math.max(1, Math.floor(total * r / sommeRayons)));
  // L'arrondi vers le bas laisse des sièges à placer : on les ajoute aux
  // rangées les plus longues, qui ont le plus de place.
  let reste = total - d3.sum(parRangee);
  const ordreLongueur = rayons.map((r, i) => i).sort((a, b) => rayons[b] - rayons[a]);
  for (let k = 0; reste > 0; k = (k + 1) % ordreLongueur.length, reste--) {
    parRangee[ordreLongueur[k]]++;
  }

  // Positions, puis tri par ANGLE : un hémicycle se lit de gauche à droite,
  // toutes rangées confondues. Les groupes occuperont ensuite des sièges
  // contigus dans cet ordre-là.
  const sieges = [];
  for (let i = 0; i < rangees; i++) {
    const n = parRangee[i];
    const r = rayons[i];
    for (let j = 0; j < n; j++) {
      // Demi-tour de π à 0 ; le demi-pas évite d'aligner tous les sièges de
      // toutes les rangées sur le même rayon, ce qui ferait des colonnes.
      const t = n === 1 ? 0.5 : (j + 0.5) / n;
      const angle = Math.PI * (1 - t);
      sieges.push({ angle, r, x: Math.cos(angle) * r, y: -Math.sin(angle) * r });
    }
  }
  sieges.sort((a, b) => b.angle - a.angle || a.r - b.r);

  // Taille d'un point : la moitié de l'écart disponible le long de la rangée
  // la plus chargée, moins l'espacement demandé.
  const pasAngulaire = Math.PI / Math.max(...parRangee);
  const ecartRangees = rangees > 1 ? (rExt - rInt) / (rangees - 1) : rExt - rInt;
  const place = Math.min(pasAngulaire * rInt, ecartRangees);
  const rayonPoint = Math.max(1.2, place / 2 - (p.seatGap ?? 1.5) / 2);

  // ---- Attribution des sièges -------------------------------------------
  // Chaque groupe prend ses sièges d'un bloc, et à l'intérieur : pour,
  // abstentions, contre. On lit ainsi la fracture de chaque groupe d'un coup
  // d'œil, sans avoir à compter.
  let curseur = 0;
  const marques = [];
  groupes.forEach((groupe, i) => {
    const seau = parGroupe.get(groupe);
    const couleur = couleurDe(groupe, i);
    for (const sens of ['pour', 'abstention', 'contre']) {
      for (const ligne of seau[sens]) {
        const siege = sieges[curseur++];
        // `data` porte la ligne d'origine : c'est elle que l'infobulle de la
        // page de lecture affiche. Avec une ligne par votant, elle le nomme.
        if (siege) marques.push({ ...siege, groupe, sens, couleur, data: ligne });
      }
    }
  });

  // Centre de l'arc : au bas de la zone utile, sous le rappel du filtre.
  const cx = W / 2;
  const cy = hautCaption + hauteurArc;
  const arc = g.append('g').attr('transform', `translate(${cx},${cy})`);

  // ---- Sièges ------------------------------------------------------------
  // Trois écritures pour trois sens : un disque plein pour « pour », une
  // croix pour « contre », un disque à demi effacé pour l'abstention. La
  // forme porte l'information autant que la couleur : la lecture reste
  // possible en noir et blanc, ou pour un œil qui distingue mal les teintes.
  arc.selectAll('.pour')
    .data(marques.filter(m => m.sens === 'pour')).enter().append('circle')
    .attr('cx', d => d.x).attr('cy', d => d.y)
    .attr('r', rayonPoint)
    .attr('fill', d => d.couleur)
    .attr('opacity', p.opacity ?? 1);

  // L'abstention est un ANNEAU : contour de la couleur du groupe, intérieur
  // blanc à demi transparent. Un disque simplement rendu translucide se
  // confondait avec les teintes claires des groupes voisins — on ne voyait
  // plus à quel groupe le siège appartenait. Le contour, lui, reste à pleine
  // opacité et garde le groupe identifiable.
  // L'épaisseur du trait est réglable : trop épais, l'anneau redevient un
  // disque et le blanc central disparaît ; trop fin, le groupe ne se lit plus.
  // Le rayon est calculé pour que le bord EXTÉRIEUR coïncide avec celui d'un
  // siège plein — sinon les abstentions paraissent plus petites que les
  // autres sièges, ce qui se lit comme une différence d'importance.
  const epaisseurAnneau = Math.max(0.6, rayonPoint * dans01(p.abstentionStroke, 0.28));
  arc.selectAll('.abstention')
    .data(marques.filter(m => m.sens === 'abstention')).enter().append('circle')
    .attr('cx', d => d.x).attr('cy', d => d.y)
    .attr('r', Math.max(0.5, rayonPoint - epaisseurAnneau / 2))
    .attr('fill', '#ffffff')
    .attr('fill-opacity', 0.5)
    .attr('stroke', d => d.couleur)
    .attr('stroke-width', epaisseurAnneau)
    .attr('opacity', p.opacity ?? 1);

  const croix = marques.filter(m => m.sens === 'contre');
  const bras = rayonPoint * 0.78;
  arc.selectAll('.contre')
    .data(croix).enter().append('path')
    .attr('d', d => `M${d.x - bras},${d.y - bras}L${d.x + bras},${d.y + bras}` +
                    `M${d.x - bras},${d.y + bras}L${d.x + bras},${d.y - bras}`)
    .attr('stroke', d => d.couleur)
    .attr('stroke-width', Math.max(1, rayonPoint * 0.45))
    .attr('stroke-linecap', 'round')
    .attr('fill', 'none')
    .attr('opacity', p.opacity ?? 1);

  // ---- Résumé au centre ---------------------------------------------------
  // Le demi-disque central est vide par construction : c'est la place
  // naturelle du décompte, là où l'œil arrive après avoir parcouru l'arc.
  if (p.showResume !== false) {
    const nPour   = marques.filter(m => m.sens === 'pour').length;
    const nContre = marques.filter(m => m.sens === 'contre').length;
    const nAbst   = marques.filter(m => m.sens === 'abstention').length;
    const votants = nPour + nContre + nAbst;
    const sieges  = Number.isFinite(+p.effectifTotal) && +p.effectifTotal > 0
      ? Math.round(+p.effectifTotal) : null;

    // La taille du texte suit le trou : sur un petit visuel le résumé doit
    // rétrécir plutôt que déborder sur les premiers sièges.
    const tailleResume = Math.max(7, Math.min(fontSize * 1.15, rInt * 0.17));
    // « Sièges » et non « votants » : la ligne compte les sièges DESSINÉS.
    // Sur une motion de censure, l'Assemblée ne recense comme votants que
    // ceux qui la soutiennent — 146 en juillet 2022 — alors que l'hémicycle
    // en montre 577. Annoncer « votants » contredirait le chiffre officiel.
    const lignes = [
      ['Sièges', sieges ? `${votants} / ${sieges}` : String(votants)],
      ['Pour', String(nPour)],
      ['Contre', String(nContre)],
      ['Abstention', String(nAbst)],
    ];

    const res = arc.append('g');
    const hauteurLigne = tailleResume * 1.5;
    // Posé au-dessus du centre, pour rester dans le demi-disque.
    const y0 = -(lignes.length - 1) * hauteurLigne - tailleResume * 0.8;
    lignes.forEach(([libelle, valeur], i) => {
      const y = y0 + i * hauteurLigne;
      res.append('text')
        .attr('x', -6).attr('y', y).attr('text-anchor', 'end')
        .attr('font-family', 'DM Mono, monospace').attr('font-size', tailleResume)
        .attr('fill', '#7a7a90').text(libelle);
      res.append('text')
        .attr('x', 6).attr('y', y)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', tailleResume * 1.15)
        .attr('font-weight', i === 0 ? 700 : 500)
        .attr('fill', '#0f0f1a').text(valeur);
    });
  }

  // ---- Légende -----------------------------------------------------------
  if (legende) {
    const lg = g.append('g').attr('transform', `translate(0,${cy + 16})`);
    const taille = fontSize - 1;

    // Groupes, sur une ligne qui revient à la ligne quand elle déborde.
    let x = 0, y = taille;
    groupes.forEach((groupe, i) => {
      const e = effectif.get(groupe);
      const texte = p.showLabels !== false ? `${groupe} (${e.total})` : String(groupe);
      const largeur = texte.length * taille * 0.55 + 16;
      if (x + largeur > W && x > 0) { x = 0; y += taille + 6; }
      lg.append('circle').attr('cx', x + 4).attr('cy', y - taille * 0.32)
        .attr('r', taille * 0.34).attr('fill', couleurDe(groupe, i));
      lg.append('text').attr('x', x + 12).attr('y', y)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', taille)
        .attr('fill', '#4a4a5e').text(texte);
      x += largeur;
    });

    // Rappel des trois symboles, sous les groupes.
    const yS = y + taille + 10;
    const total3 = marques.length;
    const parSens = sens => marques.filter(m => m.sens === sens).length;
    // Les décomptes sont déjà au centre quand le résumé est affiché : la
    // légende n'est plus alors qu'une clé de lecture des trois symboles.
    const avec = n => (p.showResume !== false ? '' : ` (${n})`);
    const items = [
      ['pour', `Pour${avec(parSens('pour'))}`],
      ['abstention', `Abstention${avec(parSens('abstention'))}`],
      ['contre', `Contre${avec(parSens('contre'))}`],
    ];
    let xs = 0;
    items.forEach(([sens, texte]) => {
      if (sens === 'contre') {
        const b = taille * 0.3;
        lg.append('path')
          .attr('d', `M${xs},${yS - taille * 0.32 - b}L${xs + 2 * b},${yS - taille * 0.32 + b}` +
                     `M${xs},${yS - taille * 0.32 + b}L${xs + 2 * b},${yS - taille * 0.32 - b}`)
          .attr('stroke', '#4a4a5e').attr('stroke-width', 1.4)
          .attr('stroke-linecap', 'round').attr('fill', 'none');
      } else if (sens === 'abstention') {
        lg.append('circle').attr('cx', xs + taille * 0.3).attr('cy', yS - taille * 0.32)
          .attr('r', taille * 0.26).attr('fill', '#ffffff').attr('fill-opacity', 0.5)
          .attr('stroke', '#4a4a5e').attr('stroke-width', taille * 0.16);
      } else {
        lg.append('circle').attr('cx', xs + taille * 0.3).attr('cy', yS - taille * 0.32)
          .attr('r', taille * 0.3).attr('fill', '#4a4a5e');
      }
      lg.append('text').attr('x', xs + taille * 0.9).attr('y', yS)
        .attr('font-family', 'DM Mono, monospace').attr('font-size', taille - 1)
        .attr('fill', '#7a7a90').text(texte);
      xs += texte.length * (taille - 1) * 0.58 + 26;
    });

    if (total3 !== total) {
      lg.append('text').attr('x', 0).attr('y', yS + taille + 6)
        .attr('font-family', 'DM Mono, monospace').attr('font-size', taille - 2)
        .attr('fill', '#b0b0c0')
        .text(`${total - total3} siège(s) non placé(s) — arrondi des rangées`);
    }
  }
}
