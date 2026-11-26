/**
 * @name Aires rectangulaires
 * @description Pavage proportionnel à deux niveaux — un bloc par groupe, un rectangle par sous-catégorie
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="3" width="11" height="9" rx="1"/><rect x="14" y="3" width="8" height="5" rx="1" opacity=".62"/><rect x="14" y="9" width="8" height="3" rx="1" opacity=".38"/><rect x="2" y="13" width="6" height="8" rx="1" opacity=".8"/><rect x="9" y="13" width="13" height="8" rx="1" opacity=".3"/></svg>
 * @sampleData [{"series":"Transport","label":"Routier","value":128},{"series":"Transport","label":"Aérien","value":47},{"series":"Bâtiment","label":"Résidentiel","value":94},{"series":"Bâtiment","label":"Tertiaire","value":38},{"series":"Industrie","label":"Chimie","value":61}]
 * @dataFields {"series":{"type":"category","required":true,"label":"Groupe","description":"Premier niveau : chaque groupe reçoit une couleur et son propre bloc"},"label":{"type":"category","required":true,"label":"Sous-catégorie","description":"Second niveau : un rectangle par sous-catégorie, à l'intérieur de son groupe"},"value":{"type":"number","required":true,"label":"Valeur","description":"Ce que l'aire représente — les surfaces lui sont proportionnelles"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Restreint le pavage à une valeur ; sans valeur choisie, tout est cumulé"}}
 * @params {"labelMode":{"group":"visuel","type":"select","label":"Étiquettes","default":"valeur","options":[{"value":"nom","label":"Nom seul"},{"value":"valeur","label":"Nom et valeur"},{"value":"pourcentage","label":"Nom et pourcentage"},{"value":"les-deux","label":"Nom, valeur et pourcentage"}]},"percentBase":{"group":"visuel","type":"select","label":"Pourcentage rapporté à","default":"total","options":[{"value":"total","label":"L'ensemble"},{"value":"serie","label":"Son groupe"}]},"showSeriesLabel":{"group":"visuel","type":"toggle","label":"Nommer les groupes","default":true},"showLegend":{"group":"visuel","type":"toggle","label":"Afficher la légende","default":true},"tile":{"group":"visuel","type":"select","label":"Découpe","default":"squarify","options":[{"value":"squarify","label":"Carrés (défaut)"},{"value":"binary","label":"Binaire"},{"value":"slice","label":"Bandes horizontales"},{"value":"dice","label":"Bandes verticales"}]},"cellGap":{"group":"visuel","type":"range","label":"Écart entre rectangles","min":0,"max":8,"step":0.5,"default":1.5,"unit":"px"},"groupGap":{"group":"visuel","type":"range","label":"Écart entre groupes","min":0,"max":16,"step":1,"default":4,"unit":"px"},"groupes":{"group":"visuel","type":"series-map","field":"series","label":"Groupes — ordre, nom, couleur","default":null,"description":"L'ordre des lignes range les groupes dans le pavage. Le nom saisi l'emporte sur la valeur de la colonne, la couleur sur la palette."},"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"opacity":{"group":"general","type":"range","label":"Opacité","min":0.1,"max":1,"step":0.05,"default":1},"radius":{"group":"general","type":"range","label":"Arrondi des rectangles","min":0,"max":12,"step":1,"default":3,"unit":"px"},"showLabels":{"group":"general","type":"toggle","label":"Afficher les étiquettes","default":true},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
 */
function draw(svg, g, data, W, H, color, p) {
  if (!data || !data.length) return;

  const fs = p.fontSize ?? 12;

  // Le Studio filtre ET agrège en amont ; le visuel se contente de rappeler
  // quelle valeur a été retenue. Voir CLAUDE.md, « Champ filtre ».
  const shown = String(p.filterValue ?? '').trim() || null;

  // ---- Groupes : ordre, nom, couleur -------------------------------------
  // Le tri du Studio range les groupes par ordre alphabétique de leur code.
  // Dans un pavage ce n'est pas neutre : les blocs se lisent du plus gros au
  // plus petit, et l'auteur veut souvent imposer le sien. La table le lui
  // permet, et sert en même temps de nom et de couleur.
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
    // Même bande de clarté que les autres visuels, pour qu'aucun bloc ne
    // blanchisse au point de ne plus se distinguer du fond.
    return d3.hsl((d3.hsl(color).h + i * 30) % 360, 0.68, 0.45 + (i % 3) * 0.08).toString();
  };

  // ---- Agrégation par (groupe, sous-catégorie) ---------------------------
  // Deux lignes portant la même paire se cumulent : le pavage n'a qu'un
  // rectangle à leur offrir, et en dessiner deux superposés serait pire que
  // de les additionner.
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
  const hautPavage = Math.max(20, H - hautFiltre - basLegende);

  if (shown !== null) {
    g.append('text').attr('x', 0).attr('y', fs)
      .attr('font-family', 'DM Mono, monospace').attr('font-size', fs)
      .attr('fill', '#7a7a90').text(shown);
  }

  // ---- Pavage ------------------------------------------------------------
  const decoupes = {
    squarify: d3.treemapSquarify,
    binary:   d3.treemapBinary,
    slice:    d3.treemapSlice,
    dice:     d3.treemapDice,
  };
  // `+p.x ?? repli` rend NaN : `+undefined` vaut NaN, et `??` ne rattrape que
  // null et undefined. Le repli doit donc tester la finitude, sinon le pavage
  // reçoit des espacements NaN dès qu'on dessine sans paramètre.
  const nombre = (v, repli) => (Number.isFinite(+v) ? +v : repli);
  const ecartCase   = Math.max(0, nombre(p.cellGap, 1.5));
  const ecartGroupe = Math.max(0, nombre(p.groupGap, 4));
  // Le bandeau de nom d'un groupe est pris SUR son bloc : sans cette réserve
  // le titre se poserait sur le premier rectangle et deviendrait illisible.
  const nommerGroupes = p.showSeriesLabel !== false && groupes.length > 1;
  const hautTitre = nommerGroupes ? fs + 4 : 0;

  const racine = d3.hierarchy({
    enfants: groupes.map(nom => ({
      nom,
      enfants: feuilles.filter(f => f.series === nom),
    })).filter(x => x.enfants.length),
  }, n => n.enfants)
    .sum(d => d.value || 0)
    // Le pavage range les plus grandes aires en premier : un bloc qui
    // alternerait gros et petits se lirait mal.
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .tile(decoupes[p.tile] || decoupes.squarify)
    .size([W, hautPavage])
    .paddingOuter(ecartGroupe / 2)
    .paddingTop(hautTitre + ecartGroupe / 2)
    .paddingInner(ecartCase)
    (racine);

  const pavage = g.append('g').attr('transform', `translate(0,${hautFiltre})`);

  // ---- Formatage des étiquettes ------------------------------------------
  const fmtVal = v => formatAxisValue(v, p.unitMode, p.decimals, total);
  const fmtPct = (v, base) => {
    const d = base > 0 ? (v / base) * 100 : 0;
    return d.toLocaleString('fr-FR', { minimumFractionDigits: d < 10 ? 1 : 0,
                                       maximumFractionDigits: d < 10 ? 1 : 0 }) + ' %';
  };
  const mode = p.labelMode || 'valeur';
  const lignesEtiquette = (f) => {
    const out = [f.label];
    const base = (p.percentBase === 'serie') ? (parGroupe.get(f.series) || 0) : total;
    if (mode === 'valeur')       out.push(fmtVal(f.value));
    else if (mode === 'pourcentage') out.push(fmtPct(f.value, base));
    else if (mode === 'les-deux')    out.push(`${fmtVal(f.value)} · ${fmtPct(f.value, base)}`);
    return out;
  };

  // ---- Rectangles --------------------------------------------------------
  const cellules = racine.leaves().filter(n => n.x1 - n.x0 > 0.5 && n.y1 - n.y0 > 0.5);

  const cel = pavage.selectAll('.pave').data(cellules).enter().append('g')
    .attr('transform', n => `translate(${n.x0},${n.y0})`);

  cel.append('rect')
    .attr('width',  n => n.x1 - n.x0)
    .attr('height', n => n.y1 - n.y0)
    .attr('rx', p.radius ?? 3)
    .attr('fill', n => couleurDe(n.data.series, groupes.indexOf(n.data.series)))
    .attr('opacity', p.opacity ?? 1);

  // `data` porte la ligne d'origine : c'est elle que l'infobulle de la page
  // de lecture affiche.
  cel.each(function (n) { this.__data__ = { ...n.data, data: n.data.data }; });

  // ---- Étiquettes ---------------------------------------------------------
  // Une étiquette qui déborde de son rectangle se lit sur le voisin : on ne
  // l'écrit que si elle tient. La largeur est estimée — mesurer chaque
  // cellule d'un pavage qui en compte des centaines coûterait plus que le
  // dessin lui-même.
  if (p.showLabels !== false && mode !== 'aucun') {
    // Mesurée et non estimée. Une largeur devinée à `longueur x taille x 0.55`
    // sous-estime les glyphes larges : « Voitures particulières » passait le
    // test puis débordait sur la cellule voisine. Un seul noeud jetable sert
    // de règle pour toutes les cellules, ce qui reste bien moins coûteux que
    // d'en créer une par mesure.
    const regle = pavage.append('text').attr('opacity', 0);
    const largeur = (t, taille) => {
      const estime = String(t).length * taille * 0.55;
      try {
        const n = regle.attr('font-family', 'DM Sans, sans-serif')
          .attr('font-size', taille).text(String(t)).node().getComputedTextLength();
        return n > 0 ? n : estime;
      } catch (err) { return estime; }
    };
    for (const n of cellules) {
      const lw = n.x1 - n.x0, lh = n.y1 - n.y0;
      const lignes = lignesEtiquette(n.data);
      const tailleNom = Math.min(fs, Math.max(8, lh / 3));
      const hauteurTotale = lignes.length * tailleNom * 1.25;
      if (hauteurTotale > lh - 6) continue;
      if (largeur(lignes[0], tailleNom) > lw - 8) continue;

      // Contraste calculé sur la couleur réellement posée, opacité comprise.
      const fond = d3.interpolateLab('#ffffff',
        couleurDe(n.data.series, groupes.indexOf(n.data.series)))(p.opacity ?? 1);
      const encre = d3.lab(fond).l > 62 ? '#0f0f1a' : '#ffffff';

      const t = pavage.append('text')
        .attr('x', n.x0 + 6).attr('y', n.y0 + tailleNom + 2)
        .attr('font-family', 'DM Sans, sans-serif')
        .attr('fill', encre).attr('pointer-events', 'none');
      lignes.forEach((ligne, i) => {
        if (i && largeur(ligne, tailleNom - 1) > lw - 8) return;
        t.append('tspan')
          .attr('x', n.x0 + 6)
          .attr('dy', i === 0 ? 0 : tailleNom * 1.2)
          .attr('font-size', i === 0 ? tailleNom : tailleNom - 1)
          .attr('font-weight', i === 0 ? 500 : 400)
          .attr('opacity', i === 0 ? 1 : 0.85)
          .text(ligne);
      });
    }
    regle.remove();
  }

  // ---- Nom des groupes ----------------------------------------------------
  if (nommerGroupes) {
    const regleG = pavage.append('text').attr('opacity', 0)
      .attr('font-family', 'DM Sans, sans-serif').attr('font-size', fs).attr('font-weight', 500);
    const largeurG = t => {
      try { const n = regleG.text(String(t)).node().getComputedTextLength();
            return n > 0 ? n : String(t).length * fs * 0.55; }
      catch (err) { return String(t).length * fs * 0.55; }
    };
    for (const n of racine.children || []) {
      const lw = n.x1 - n.x0;
      const nom = nomDe(n.data.nom);
      if (largeurG(nom) > lw - 4) continue;
      pavage.append('text')
        .attr('x', n.x0 + 2).attr('y', n.y0 + fs - 1)
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
      .attr('transform', `translate(0,${hautFiltre + hautPavage + 4})`);
    const taille = fs - 1;
    let x = 0;
    groupes.forEach((groupe, i) => {
      const nom = nomDe(groupe);
      const w = String(nom).length * taille * 0.55 + taille + 16;
      if (x + w > W && x > 0) return;   // on ne replie pas : le bandeau fait une ligne
      lg.append('circle').attr('cx', x + taille * 0.34).attr('cy', taille * 0.45)
        .attr('r', taille * 0.34).attr('fill', couleurDe(groupe, i));
      lg.append('text').attr('x', x + taille).attr('y', taille * 0.9)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', taille)
        .attr('fill', '#4a4a5e').text(nom);
      x += w;
    });
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
