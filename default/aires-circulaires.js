/**
 * @name Aires circulaires
 * @description Cercles proportionnels — emboîtés par groupe, ou aimantés en une grappe où chaque groupe reste d'un tenant
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="9" r="6"/><circle cx="17.5" cy="7" r="4" opacity=".62"/><circle cx="16" cy="17" r="5" opacity=".38"/><circle cx="5.5" cy="18.5" r="3.5" opacity=".8"/></svg>
 * @sampleData [{"series":"Transport","label":"Routier","value":128},{"series":"Transport","label":"Aérien","value":47},{"series":"Bâtiment","label":"Résidentiel","value":94},{"series":"Bâtiment","label":"Tertiaire","value":38},{"series":"Industrie","label":"Chimie","value":61}]
 * @dataFields {"series":{"type":"category","required":true,"label":"Groupe","description":"Premier niveau : chaque groupe reçoit une couleur et son propre espace"},"label":{"type":"category","required":true,"label":"Sous-catégorie","description":"Second niveau : une forme par sous-catégorie, à l'intérieur de son groupe"},"value":{"type":"number","required":true,"label":"Valeur","description":"Ce que l'aire représente — les surfaces lui sont proportionnelles"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Restreint le visuel à une valeur ; sans valeur choisie, tout est cumulé"}}
 * @params {"disposition":{"group":"visuel","type":"select","label":"Disposition","default":"emboitees","options":[{"value":"emboitees","label":"Cercles emboîtés"},{"value":"aimantees","label":"Bulles aimantées"}]},"labelMode":{"group":"visuel","type":"select","label":"Étiquettes","default":"valeur","options":[{"value":"nom","label":"Nom seul"},{"value":"valeur","label":"Nom et valeur"},{"value":"pourcentage","label":"Nom et pourcentage"},{"value":"les-deux","label":"Nom, valeur et pourcentage"}]},"percentBase":{"group":"visuel","type":"select","label":"Pourcentage rapporté à","default":"total","options":[{"value":"total","label":"L'ensemble"},{"value":"serie","label":"Son groupe"}]},"showSeriesLabel":{"group":"visuel","type":"toggle","label":"Nommer les groupes","default":true},"showLegend":{"group":"visuel","type":"toggle","label":"Afficher la légende","default":true},"cellGap":{"group":"visuel","type":"range","label":"Écart entre cercles","min":0,"max":8,"step":0.5,"default":2,"unit":"px"},"groupGap":{"group":"visuel","type":"range","label":"Marge des groupes","min":0,"max":20,"step":1,"default":6,"unit":"px"},"showGroupCircle":{"group":"visuel","type":"toggle","label":"Cercle de groupe visible","default":true},"clusterForce":{"group":"visuel","type":"range","label":"Cohésion des groupes","min":0,"max":1,"step":0.05,"default":0.45,"description":"Bulles aimantées seulement : à 0 les bulles se répartissent sans égard au groupe, à 1 chaque groupe se serre autour de son point"},"groupes":{"group":"visuel","type":"series-map","field":"series","label":"Groupes — ordre, nom, couleur","default":null,"description":"L'ordre des lignes range les groupes. Le nom saisi l'emporte sur la valeur de la colonne, la couleur sur la palette."},"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"opacity":{"group":"general","type":"range","label":"Opacité","min":0.1,"max":1,"step":0.05,"default":1},"showLabels":{"group":"general","type":"toggle","label":"Afficher les étiquettes","default":true},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  const fs = p.fontSize ?? 12;
  const nombre = (v, repli) => (Number.isFinite(+v) ? +v : repli);

  // Le Studio filtre ET agrège en amont. Voir CLAUDE.md, « Champ filtre ».
  const shown = String(p.filterValue ?? '').trim() || null;

  // ---- Groupes : ordre, nom, couleur -------------------------------------
  const presents = data.domains?.series
    || [...new Set(data.map(d => d.series))].filter(s => s !== undefined && s !== null && s !== '');
  if (!presents.length) return;

  const table = Array.isArray(p.groupes) ? p.groupes.filter(x => x && x.code != null) : [];
  const rang = new Map(table.map((x, i) => [String(x.code), i]));
  const groupes = table.length
    ? [...presents].sort((a, b) => {
        const ra = rang.has(String(a)) ? rang.get(String(a)) : Infinity;
        const rb = rang.has(String(b)) ? rang.get(String(b)) : Infinity;
        return ra - rb || presents.indexOf(a) - presents.indexOf(b);
      })
    : presents;
  const regleDe = x => table[rang.get(String(x))] || null;
  const nomDe   = x => String(regleDe(x)?.nom ?? '').trim() || String(x);
  const couleurDe = (groupe, i) => {
    const reglee = String(regleDe(groupe)?.couleur ?? '').trim();
    if (reglee) return reglee;
    return d3.hsl((d3.hsl(color).h + i * 30) % 360, 0.68, 0.45 + (i % 3) * 0.08).toString();
  };

  // ---- Agrégation par (groupe, sous-catégorie) ---------------------------
  const cumul = new Map();
  for (const d of data) {
    const g1 = d.series, g2 = String(d.label ?? '').trim();
    if (!groupes.includes(g1) || !g2) continue;
    const v = +d.value;
    if (!Number.isFinite(v) || v <= 0) continue;   // une aire négative n'existe pas
    const cle = g1 + '␟' + g2;
    const dejaLa = cumul.get(cle);
    if (dejaLa) dejaLa.value += v;
    else cumul.set(cle, { series: g1, label: g2, value: v, data: d });
  }
  const feuilles = [...cumul.values()];
  if (!feuilles.length) return;

  const total = d3.sum(feuilles, d => d.value);
  const parGroupe = new Map();
  for (const f of feuilles) parGroupe.set(f.series, (parGroupe.get(f.series) || 0) + f.value);

  // ---- Bandeaux ----------------------------------------------------------
  const legende  = p.showLegend !== false && groupes.length > 1;
  const hautFiltre = shown === null ? 0 : fs + 10;
  const basLegende = legende ? fs + 14 : 0;
  const hautDessin = Math.max(20, H - hautFiltre - basLegende);

  if (shown !== null) {
    g.append('text').attr('x', 0).attr('y', fs)
      .attr('font-family', 'DM Mono, monospace').attr('font-size', fs)
      .attr('fill', '#7a7a90').text(shown);
  }

  // ---- Empilement de cercles ---------------------------------------------
  // `d3.pack` donne des disques dont l'AIRE suit la valeur, emboîtés par
  // niveau. À la différence d'un pavage, il laisse des vides entre les
  // cercles : la lecture est moins exacte, mais les proportions se
  // comparent mieux à l'œil qu'entre des rectangles de formes différentes.
  const nommerGroupes = p.showSeriesLabel !== false && groupes.length > 1;
  const margeGroupe = Math.max(0, nombre(p.groupGap, 6)) + (nommerGroupes ? fs : 0);

  const ecartBulles = Math.max(0, nombre(p.cellGap, 2));
  const aimantees = p.disposition === 'aimantees';

  // `cellules` porte ce que les deux dispositions ont en commun : une
  // position, un rayon, et la feuille d'origine. Le reste du dessin ne sait
  // pas laquelle des deux l'a produite.
  let cellules = [];
  let racine = null;

  if (!aimantees) {
    racine = d3.hierarchy({
      enfants: groupes.map(nom => ({ nom, enfants: feuilles.filter(f => f.series === nom) }))
                      .filter(x => x.enfants.length),
    }, n => n.enfants)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    d3.pack()
      .size([W, hautDessin])
      .padding(n => (n.depth === 0 ? margeGroupe : ecartBulles))
      (racine);

    cellules = racine.leaves().filter(n => n.r > 0.5)
      .map(n => ({ x: n.x, y: n.y, r: n.r, data: n.data }));
  } else {
    // ---- Bulles aimantées ------------------------------------------------
    // Pas de disque englobant : les bulles se touchent directement, et c'est
    // un point d'ancrage par groupe qui les garde voisines. L'emboîtement
    // réserve à chaque groupe un disque entier, dont le pourtour reste vide ;
    // ici cette place revient aux bulles.
    //
    // Le rayon suit la racine de la valeur, pour que l'AIRE lui soit
    // proportionnelle. Le facteur de remplissage tient compte de ce qu'un
    // empilement de disques inégaux ne couvre jamais toute la surface.
    const sommeValeurs = d3.sum(feuilles, f => f.value);
    const k = Math.sqrt((0.46 * W * hautDessin) / (Math.PI * sommeValeurs));
    const noeuds = feuilles.map(f => ({
      f, r: Math.max(1.5, k * Math.sqrt(f.value)), x: W / 2, y: hautDessin / 2,
    }));

    // Un point d'ancrage par groupe, posés sur une ellipse dans l'ordre de la
    // table : les groupes voisins dans la liste le restent à l'écran.
    const ancres = new Map();
    const nb = groupes.length;
    groupes.forEach((nom, i) => {
      if (nb === 1) { ancres.set(nom, { x: W / 2, y: hautDessin / 2 }); return; }
      const a = (2 * Math.PI * i) / nb - Math.PI / 2;
      ancres.set(nom, {
        x: W / 2 + Math.cos(a) * W * 0.22,
        y: hautDessin / 2 + Math.sin(a) * hautDessin * 0.22,
      });
    });
    // Départ près de leur ancre plutôt qu'au centre : la simulation converge
    // en bien moins de pas, et les groupes ne se traversent pas en chemin.
    //
    // L'écartement suit une spirale d'angle d'or, et non un tirage au sort.
    // Deux raisons : il ne doit pas rester deux points confondus, que la
    // simulation ne saurait séparer qu'en les secouant au hasard ; et surtout
    // le dessin doit être REPRODUCTIBLE — un article qui ne ressemble pas à
    // l'aperçu du Studio, ni à lui-même d'une visite à l'autre, serait
    // inexploitable.
    const ANGLE_OR = Math.PI * (3 - Math.sqrt(5));
    noeuds.forEach((n, i) => {
      const a = ancres.get(n.f.series);
      const d = 4 + 3 * Math.sqrt(i);
      n.x = a.x + Math.cos(i * ANGLE_OR) * d;
      n.y = a.y + Math.sin(i * ANGLE_OR) * d;
    });

    const cohesion = Math.max(0, Math.min(1, nombre(p.clusterForce, 0.45)));
    const sim = d3.forceSimulation(noeuds)
      .force('collide', d3.forceCollide(n => n.r + ecartBulles / 2).strength(0.95).iterations(4))
      .force('x', d3.forceX(n => ancres.get(n.f.series).x).strength(0.02 + cohesion * 0.12))
      .force('y', d3.forceY(n => ancres.get(n.f.series).y).strength(0.02 + cohesion * 0.12))
      // Un rappel faible vers le centre resserre la grappe entière, sans quoi
      // les groupes restent écartés sur leur ellipse.
      .force('cx', d3.forceX(W / 2).strength(0.012))
      .force('cy', d3.forceY(hautDessin / 2).strength(0.012))
      .stop();
    // Pas à pas et non en animation : le bac à sable n'a pas de minuteur, et
    // un export PNG ou SVG doit saisir un dessin déjà stabilisé.
    for (let i = 0; i < 320; i++) sim.tick();

    // Ce qui dépasse est ramené dans le cadre. Une bulle à moitié coupée se
    // lit comme une valeur plus petite qu'elle n'est.
    const dansLeCadre = () => {
      for (const n of noeuds) {
        n.x = Math.max(n.r, Math.min(W - n.r, n.x));
        n.y = Math.max(n.r, Math.min(hautDessin - n.r, n.y));
      }
    };
    dansLeCadre();

    // Mais remettre dans le cadre CRÉE des recouvrements : deux bulles
    // repoussées contre le même bord se retrouvent l'une sur l'autre, et la
    // première simulation n'a plus d'énergie pour les séparer. Un dernier
    // passage, de collision seule, les écarte — en reprenant le cadre à
    // chaque pas, pour que la collision tienne compte des murs.
    const finition = d3.forceSimulation(noeuds)
      .force('collide', d3.forceCollide(n => n.r + ecartBulles / 2).strength(1).iterations(8))
      .alpha(0.7).alphaDecay(0.015)
      .stop();
    for (let i = 0; i < 220; i++) { finition.tick(); dansLeCadre(); }
    cellules = noeuds.map(n => ({ x: n.x, y: n.y, r: n.r, data: n.f }));
  }

  const scene = g.append('g').attr('transform', `translate(0,${hautFiltre})`);

  // ---- Formatage ----------------------------------------------------------
  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, total);
  const fmtPct = (v, base) => {
    const x = base > 0 ? (v / base) * 100 : 0;
    const d = x < 10 ? 1 : 0;
    return x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' %';
  };
  const mode = p.labelMode || 'valeur';
  const lignesEtiquette = (f) => {
    const out = [f.label];
    const base = (p.percentBase === 'serie') ? (parGroupe.get(f.series) || 0) : total;
    if (mode === 'valeur')            out.push(fmtVal(f.value));
    else if (mode === 'pourcentage')  out.push(fmtPct(f.value, base));
    else if (mode === 'les-deux')     out.push(`${fmtVal(f.value)} · ${fmtPct(f.value, base)}`);
    return out;
  };

  // ---- Cercles de groupe --------------------------------------------------
  if (!aimantees && p.showGroupCircle !== false && groupes.length > 1) {
    scene.selectAll('.groupe').data(racine.children || []).enter().append('circle')
      .attr('cx', n => n.x).attr('cy', n => n.y).attr('r', n => n.r)
      .attr('fill', 'none')
      .attr('stroke', n => couleurDe(n.data.nom, groupes.indexOf(n.data.nom)))
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.35);
  }

  // ---- Cercles de sous-catégorie ------------------------------------------
  const cel = scene.selectAll('.part').data(cellules).enter().append('g');

  cel.append('circle')
    .attr('cx', n => n.x).attr('cy', n => n.y).attr('r', n => n.r)
    .attr('fill', n => couleurDe(n.data.series, groupes.indexOf(n.data.series)))
    .attr('opacity', p.opacity ?? 1);

  // `data` porte la ligne d'origine : c'est elle que l'infobulle de la page
  // de lecture affiche.
  cel.each(function (n) { this.__data__ = { ...n.data, data: n.data.data }; });

  // ---- Étiquettes ---------------------------------------------------------
  // Un cercle n'offre pas sa largeur à hauteur de son centre : le texte doit
  // tenir dans la CORDE à la hauteur où il s'écrit, pas dans le diamètre.
  // Mesurée et non estimée — une estimation sous-évalue les glyphes larges.
  if (p.showLabels !== false) {
    const regle = scene.append('text').attr('opacity', 0);
    const largeur = (t, taille) => {
      const estime = String(t).length * taille * 0.55;
      try {
        const n = regle.attr('font-family', 'DM Sans, sans-serif')
          .attr('font-size', taille).text(String(t)).node().getComputedTextLength();
        return n > 0 ? n : estime;
      } catch (err) { return estime; }
    };
    for (const n of cellules) {
      const lignes = lignesEtiquette(n.data);
      const taille = Math.min(fs, Math.max(8, n.r / 2.2));
      const hautTexte = lignes.length * taille * 1.2;
      if (hautTexte > n.r * 1.5) continue;
      // Demi-corde à la hauteur de la première ligne.
      const dy = taille * 0.5;
      const demiCorde = Math.sqrt(Math.max(0, n.r * n.r - dy * dy));
      if (largeur(lignes[0], taille) > demiCorde * 1.8) continue;

      const fond = d3.interpolateLab('#ffffff',
        couleurDe(n.data.series, groupes.indexOf(n.data.series)))(p.opacity ?? 1);
      const encre = d3.lab(fond).l > 62 ? '#0f0f1a' : '#ffffff';

      const t = scene.append('text')
        .attr('text-anchor', 'middle').attr('fill', encre)
        .attr('font-family', 'DM Sans, sans-serif').attr('pointer-events', 'none');
      lignes.forEach((ligne, i) => {
        if (i && largeur(ligne, taille - 1) > demiCorde * 1.8) return;
        t.append('tspan')
          .attr('x', n.x)
          .attr('y', n.y - hautTexte / 2 + taille + i * taille * 1.2)
          .attr('font-size', i === 0 ? taille : taille - 1)
          .attr('font-weight', i === 0 ? 500 : 400)
          .attr('opacity', i === 0 ? 1 : 0.85)
          .text(ligne);
      });
    }
    regle.remove();
  }

  // ---- Nom des groupes ----------------------------------------------------
  // Au-dessus du disque et non dedans : à l'intérieur il se poserait sur les
  // sous-catégories, qui occupent toute la surface.
  // Dans une grappe il n'y a pas de disque au-dessus duquel écrire, et une
  // étiquette posée sur les bulles couvrirait celles qu'elle désigne. C'est
  // la légende qui nomme les groupes dans cette disposition.
  if (nommerGroupes && !aimantees) {
    const regleG = scene.append('text').attr('opacity', 0)
      .attr('font-family', 'DM Sans, sans-serif').attr('font-size', fs).attr('font-weight', 500);
    const largeurG = t => {
      try { const n = regleG.text(String(t)).node().getComputedTextLength();
            return n > 0 ? n : String(t).length * fs * 0.55; }
      catch (err) { return String(t).length * fs * 0.55; }
    };
    for (const n of racine.children || []) {
      const nom = nomDe(n.data.nom);
      if (largeurG(nom) > n.r * 2) continue;
      scene.append('text')
        .attr('x', n.x).attr('y', n.y - n.r - 3)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', fs)
        .attr('font-weight', 500).attr('fill', '#4a4a5e')
        .attr('pointer-events', 'none').text(nom);
    }
    regleG.remove();
  }

  // ---- Légende ------------------------------------------------------------
  // Marquée pour l'export en calques — voir CLAUDE.md, « Calques d'export ».
  if (legende) {
    const lg = g.append('g').attr('data-calque', 'legende')
      .attr('transform', `translate(0,${hautFiltre + hautDessin + 4})`);
    const taille = fs - 1;
    const regleL = lg.append('text').attr('opacity', 0)
      .attr('font-family', 'DM Sans, sans-serif').attr('font-size', taille);
    const largeurL = t => {
      try { const n = regleL.text(String(t)).node().getComputedTextLength();
            return n > 0 ? n : String(t).length * taille * 0.55; }
      catch (err) { return String(t).length * taille * 0.55; }
    };
    let x = 0;
    groupes.forEach((groupe, i) => {
      const nom = nomDe(groupe);
      const w = largeurL(nom) + taille + 16;
      if (x + w > W && x > 0) return;   // le bandeau fait une ligne
      lg.append('circle').attr('cx', x + taille * 0.34).attr('cy', taille * 0.45)
        .attr('r', taille * 0.34).attr('fill', couleurDe(groupe, i));
      lg.append('text').attr('x', x + taille).attr('y', taille * 0.9)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', taille)
        .attr('fill', '#4a4a5e').text(nom);
      x += w;
    });
    regleL.remove();
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
