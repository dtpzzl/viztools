/**
 * @name Aires hexagonales
 * @description Mosaïque d'hexagones — chaque sous-catégorie en occupe un nombre proportionnel à sa valeur
 * @icon <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.7,4.9L11.7,9.1L8.0,11.3L4.3,9.1L4.3,4.8L8.0,2.7Z"/><path d="M19.7,4.9L19.7,9.1L16.0,11.3L12.3,9.1L12.3,4.8L16.0,2.7Z" opacity=".62"/><path d="M15.7,12.1L15.7,16.3L12.0,18.5L8.3,16.3L8.3,12.0L12.0,9.9Z" opacity=".8"/><path d="M7.7,12.1L7.7,16.3L4.0,18.5L0.3,16.3L0.3,12.0L4.0,9.9Z" opacity=".35"/><path d="M23.7,12.1L23.7,16.3L20.0,18.5L16.3,16.3L16.3,12.0L20.0,9.9Z" opacity=".45"/></svg>
 * @sampleData [{"series":"Transport","label":"Routier","value":128},{"series":"Transport","label":"Aérien","value":47},{"series":"Bâtiment","label":"Résidentiel","value":94},{"series":"Bâtiment","label":"Tertiaire","value":38},{"series":"Industrie","label":"Chimie","value":61}]
 * @dataFields {"series":{"type":"category","required":true,"label":"Groupe","description":"Premier niveau : chaque groupe reçoit une couleur et son propre espace"},"label":{"type":"category","required":true,"label":"Sous-catégorie","description":"Second niveau : une forme par sous-catégorie, à l'intérieur de son groupe"},"value":{"type":"number","required":true,"label":"Valeur","description":"Ce que l'aire représente — les surfaces lui sont proportionnelles"},"filter":{"type":"category","required":false,"label":"Filtre","description":"Restreint le visuel à une valeur ; sans valeur choisie, tout est cumulé"}}
 * @params {"labelMode":{"group":"visuel","type":"select","label":"Étiquettes","default":"valeur","options":[{"value":"nom","label":"Nom seul"},{"value":"valeur","label":"Nom et valeur"},{"value":"pourcentage","label":"Nom et pourcentage"},{"value":"les-deux","label":"Nom, valeur et pourcentage"}]},"percentBase":{"group":"visuel","type":"select","label":"Pourcentage rapporté à","default":"total","options":[{"value":"total","label":"L'ensemble"},{"value":"serie","label":"Son groupe"}]},"showSeriesLabel":{"group":"visuel","type":"toggle","label":"Nommer les groupes","default":true},"showLegend":{"group":"visuel","type":"toggle","label":"Afficher la légende","default":true},"hexCount":{"group":"visuel","type":"range","label":"Nombre d'hexagones","min":60,"max":1200,"step":20,"default":400,"unit":"hex"},"cellGap":{"group":"visuel","type":"range","label":"Écart entre hexagones","min":0,"max":4,"step":0.25,"default":1,"unit":"px"},"groupes":{"group":"visuel","type":"series-map","field":"series","label":"Groupes — ordre, nom, couleur","default":null,"description":"L'ordre des lignes range les groupes. Le nom saisi l'emporte sur la valeur de la colonne, la couleur sur la palette."},"filterValue":{"group":"visuel","type":"text","label":"Valeur du filtre","default":null,"placeholder":"toutes cumulées"},"opacity":{"group":"general","type":"range","label":"Opacité","min":0.1,"max":1,"step":0.05,"default":1},"showLabels":{"group":"general","type":"toggle","label":"Afficher les étiquettes","default":true},"unitMode":{"group":"general","type":"select","label":"Unité","default":"auto","options":[{"value":"auto","label":"Automatique"},{"value":"unit","label":"Unité"},{"value":"k","label":"Milliers (k)"},{"value":"M","label":"Millions (M)"},{"value":"Md","label":"Milliards (Md)"}]},"decimals":{"group":"general","type":"range","label":"Décimales","min":0,"max":3,"step":1,"default":0},"fontSize":{"group":"general","type":"range","label":"Taille du texte","min":8,"max":24,"step":1,"default":12,"unit":"px"}}
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
    if (!Number.isFinite(v) || v <= 0) continue;
    const cle = g1 + '␟' + g2;
    const dejaLa = cumul.get(cle);
    if (dejaLa) dejaLa.value += v;
    else cumul.set(cle, { series: g1, label: g2, value: v, data: d });
  }
  // Rangées dans l'ordre des groupes, puis par valeur : la mosaïque se lit
  // de gauche à droite et de haut en bas, chaque groupe d'un seul tenant.
  const feuilles = [...cumul.values()].sort((a, b) =>
    groupes.indexOf(a.series) - groupes.indexOf(b.series) || b.value - a.value);
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

  // ---- Répartition des hexagones -----------------------------------------
  // Ici la surface n'est pas continue : elle se compte. Chaque sous-catégorie
  // reçoit un NOMBRE d'hexagones au prorata de sa valeur — donc une mesure
  // arrondie, à la différence d'un pavage rectangulaire. C'est le prix de la
  // forme, et ce qui la rend lisible : on compte les cases plutôt que de
  // comparer des aires.
  const vise = Math.max(1, Math.round(nombre(p.hexCount, 400)));

  // Méthode des plus forts restes : répartir à l'arrondi simple perdrait ou
  // ajouterait des cases, et les plus petites parts tomberaient à zéro.
  const exacts = feuilles.map(f => (f.value / total) * vise);
  const parts  = exacts.map(x => Math.max(1, Math.floor(x)));
  let reste = vise - parts.reduce((a, b) => a + b, 0);
  const ordreRestes = exacts
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r);
  for (let k = 0; reste > 0 && ordreRestes.length; k = (k + 1) % ordreRestes.length, reste--) {
    parts[ordreRestes[k].i]++;
  }
  // Le plancher à 1 peut faire dépasser le total visé : on rogne les plus
  // grosses parts, qui le supportent sans changer de rang.
  while (reste < 0) {
    const plusGrosse = parts.indexOf(Math.max(...parts));
    if (parts[plusGrosse] <= 1) break;
    parts[plusGrosse]--; reste++;
  }
  const cases = parts.reduce((a, b) => a + b, 0);

  // ---- Grille hexagonale --------------------------------------------------
  // Hexagones pointe en haut, rangées décalées d'un demi-pas. On cherche le
  // rayon qui fait tenir `cases` cellules dans la zone : une recherche
  // dichotomique évite de résoudre l'équation, que le décalage des rangées
  // rend peu commode.
  const nommerGroupes = p.showSeriesLabel !== false && groupes.length > 1;
  const hautTitres = nommerGroupes ? fs + 4 : 0;
  const zoneH = Math.max(10, hautDessin - hautTitres);
  const ecart = Math.max(0, nombre(p.cellGap, 1));

  const capacite = (r) => {
    const pas = r * Math.sqrt(3) + ecart;        // largeur d'un hexagone + écart
    const pasY = r * 1.5 + ecart * 0.87;         // hauteur entre deux rangées
    const colonnes = Math.floor((W - pas / 2) / pas);
    const rangees  = Math.floor((zoneH - r * 0.5) / pasY);
    return { n: Math.max(0, colonnes * rangees), colonnes, rangees, pas, pasY };
  };

  let bas = 1, haut = Math.max(2, Math.min(W, zoneH) / 2);
  for (let i = 0; i < 40; i++) {
    const mid = (bas + haut) / 2;
    if (capacite(mid).n >= cases) bas = mid; else haut = mid;
  }
  const r = bas;
  const { colonnes, pas, pasY } = capacite(r);
  if (!colonnes) return;

  const scene = g.append('g').attr('transform', `translate(0,${hautFiltre + hautTitres})`);

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

  const contour = (cx, cy) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 180 * (60 * i - 90);
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return 'M' + pts.join('L') + 'Z';
  };

  // ---- Pose des cellules ---------------------------------------------------
  const marques = [];
  let curseur = 0;
  feuilles.forEach((f, idx) => {
    for (let k = 0; k < parts[idx]; k++, curseur++) {
      const ligne = Math.floor(curseur / colonnes);
      const col   = curseur % colonnes;
      const cx = pas / 2 + col * pas + (ligne % 2 ? pas / 2 : 0);
      const cy = r + ligne * pasY;
      marques.push({ cx, cy, f, ligne, col });
    }
  });

  scene.selectAll('.hex').data(marques).enter().append('path')
    .attr('d', m => contour(m.cx, m.cy))
    .attr('fill', m => couleurDe(m.f.series, groupes.indexOf(m.f.series)))
    .attr('opacity', p.opacity ?? 1)
    .each(function (m) { this.__data__ = { ...m.f, data: m.f.data }; });

  // ---- Étiquettes ----------------------------------------------------------
  // Posées au CENTRE DE MASSE du bloc d'une sous-catégorie, et seulement si
  // le bloc est assez large pour les porter : un bloc de trois cases ne peut
  // pas nommer sa part sans mordre sur la voisine.
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
    // Un bloc d'hexagones est un RUBAN : les cases se suivent en lecture, et
    // un bloc de vingt cases peut enjamber trois rangées. Son centre de masse
    // tombe alors hors du bloc, sur le voisin — c'est ce qui faisait se
    // chevaucher les étiquettes. On cherche donc, dans chaque bloc, la plus
    // longue SUITE CONTINUE d'une même rangée : elle est forcément à
    // l'intérieur, et sa largeur borne ce qu'on peut écrire.
    const posees = [];   // boîtes déjà écrites, pour ne pas en superposer deux
    feuilles.forEach((f, idx) => {
      const miennes = marques.filter(m => m.f === f);
      if (!miennes.length) return;

      let meilleure = null;
      let courante = null;
      for (const m of miennes) {
        if (courante && m.ligne === courante.ligne && m.col === courante.finCol + 1) {
          courante.finCol = m.col; courante.n++; courante.fin = m.cx;
        } else {
          courante = { ligne: m.ligne, finCol: m.col, n: 1, debut: m.cx, fin: m.cx };
        }
        if (!meilleure || courante.n > meilleure.n) meilleure = { ...courante };
      }
      if (!meilleure) return;

      const cx = (meilleure.debut + meilleure.fin) / 2;
      const dispo = meilleure.n * pas - 6;
      const taille = Math.min(fs, Math.max(8, r * 0.9));

      // Combien de rangées le bloc occupe-t-il À CET ENDROIT ? Une étiquette
      // sur deux lignes mesure plus haut qu'une rangée : posée sur un bloc
      // qui n'en occupe qu'une, elle mordait sur la rangée voisine, d'une
      // autre couleur. On se replie alors sur une seule ligne, et on y
      // ramène la valeur plutôt que de la perdre.
      const colonnesDuBloc = new Set(miennes.map(m => `${m.ligne}:${m.col}`));
      const colMilieu = Math.round((meilleure.finCol - meilleure.n + 1 + meilleure.finCol) / 2);
      let hautRangees = 1;
      for (let dl = 1; dl <= 3; dl++) {
        if (colonnesDuBloc.has(`${meilleure.ligne + dl}:${colMilieu}`)) hautRangees++; else break;
      }

      let lignes = lignesEtiquette(f);
      if (hautRangees < 2 && lignes.length > 1) {
        const surUneLigne = lignes.join(' · ');
        lignes = largeur(surUneLigne, taille) <= dispo ? [surUneLigne] : [lignes[0]];
      }

      // Le texte reste dans la bande des rangées qu'il occupe, bords compris.
      const hautTexte = lignes.length * taille * 1.2;
      const hautBloc = hautRangees * pasY;
      if (hautTexte > hautBloc) return;
      const cyBrut = r + meilleure.ligne * pasY + (hautRangees - 1) * pasY / 2;
      const cy = Math.max(hautTexte / 2, Math.min(zoneH - hautTexte / 2, cyBrut));

      if (largeur(lignes[0], taille) > dispo) return;

      // Pas deux étiquettes l'une sur l'autre : une suite continue garantit
      // d'être dans son bloc, pas d'être seule à cet endroit de la grille.
      const larg = Math.max(...lignes.map(l => largeur(l, taille)));
      const boite = { x: cx - larg / 2, y: cy - hautTexte / 2, w: larg, h: hautTexte };
      const heurte = posees.some(b => boite.x < b.x + b.w && boite.x + boite.w > b.x
                                   && boite.y < b.y + b.h && boite.y + boite.h > b.y);
      if (heurte) return;
      posees.push(boite);

      const fond = d3.interpolateLab('#ffffff',
        couleurDe(f.series, groupes.indexOf(f.series)))(p.opacity ?? 1);
      const encre = d3.lab(fond).l > 62 ? '#0f0f1a' : '#ffffff';
      const t = scene.append('text')
        .attr('text-anchor', 'middle').attr('fill', encre)
        .attr('font-family', 'DM Sans, sans-serif').attr('pointer-events', 'none');
      lignes.forEach((ligne, i) => {
        if (i && largeur(ligne, taille - 1) > dispo) return;
        t.append('tspan').attr('x', cx)
          .attr('y', cy - (lignes.length - 1) * taille * 0.6 + i * taille * 1.2)
          .attr('font-size', i === 0 ? taille : taille - 1)
          .attr('font-weight', i === 0 ? 500 : 400)
          .attr('opacity', i === 0 ? 1 : 0.85)
          .text(ligne);
      });
    });
    regle.remove();
  }

  // ---- Nom des groupes ------------------------------------------------------
  // Au-dessus de la mosaïque, à l'aplomb de la première case du groupe : la
  // grille est continue, il n'y a pas de bandeau où les loger.
  if (nommerGroupes) {
    const bande = g.append('g').attr('transform', `translate(0,${hautFiltre})`);
    const vus = new Set();
    for (const m of marques) {
      if (vus.has(m.f.series)) continue;
      vus.add(m.f.series);
      if (m.ligne > 0) continue;   // le groupe ne commence pas sur la première rangée
      bande.append('text')
        .attr('x', Math.max(0, m.cx - pas / 2)).attr('y', fs)
        .attr('font-family', 'DM Sans, sans-serif').attr('font-size', fs)
        .attr('font-weight', 500).attr('fill', '#4a4a5e')
        .attr('pointer-events', 'none').text(nomDe(m.f.series));
    }
  }

  // ---- Légende --------------------------------------------------------------
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
      if (x + w > W && x > 0) return;
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
