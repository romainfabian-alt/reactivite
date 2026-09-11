(function (global) {
  var Modele = global.Modele;

  function afficher(racine, app, exercice) {
    var e = JSON.parse(JSON.stringify(exercice)); // brouillon : rien n'est écrit avant Enregistrer

    // Une fois qu'une tentative (Tester ou Enregistrer) a échoué, l'écran
    // surveille l'exercice en continu : le message affiché à chaque
    // redessin reflète l'état réel plutôt que de rester figé sur l'erreur
    // d'origine ou de disparaître dès la première correction. `dernierControle`
    // rejoue le même contrôle que celui qui a échoué (Tester ne contrôle pas
    // le nom, Enregistrer si) pour ne pas faire apparaître une exigence que
    // l'action en cours n'impose pas.
    var unProblemeSignale = false;
    var dernierControle = null;

    function controleTest() { return Modele.valider(e); }

    function controleEnregistrement() {
      var pbs = Modele.valider(e).slice();
      if (!e.nom.trim()) pbs.push("Donnez un nom à l'exercice.");
      return pbs;
    }

    function redessiner() {
      racine.innerHTML = "";
      var page = document.createElement("div");
      page.className = "page";

      var entete = document.createElement("div");
      entete.className = "entete";
      var retour = document.createElement("button");
      retour.className = "icone";
      // Hors d'une .carte, la classe "icone" n'apporte aucune taille : on la
      // fixe ici pour garder une zone tactile d'au moins 44 points.
      retour.style.cssText = "min-width:44px;min-height:44px;font-size:22px;" +
        "display:inline-flex;align-items:center;justify-content:center;";
      retour.textContent = "‹";
      retour.setAttribute("aria-label", "Retour");
      retour.onclick = function () { app.aller("liste", {}); };
      var titre = document.createElement("h1");
      titre.textContent = e.id ? "Modifier" : "Nouvel exercice";
      entete.appendChild(retour); entete.appendChild(titre);

      if (e.id) {
        var dup = document.createElement("button");
        dup.className = "bouton fantome";
        dup.textContent = "Dupliquer";
        dup.onclick = function () {
          var copie = app.stockage.dupliquer(e.id);
          app.aller("reglages", { exercice: copie });
        };
        entete.appendChild(dup);
      }
      page.appendChild(entete);

      page.appendChild(champTexte("Nom", e.nom, function (v) { e.nom = v; }));

      page.appendChild(groupe("Contenu", contenu()));
      page.appendChild(groupe("Rythme", rythme()));
      page.appendChild(groupe("Volume", volume()));
      page.appendChild(groupe("Affichage", affichage()));
      page.appendChild(groupe("Son", son()));

      var erreurs = document.createElement("div");
      erreurs.className = "erreur";
      // Tant qu'aucune tentative n'a échoué, l'écran reste silencieux : on
      // n'assaille pas d'erreurs un exercice encore en cours de composition.
      // Après une première tentative échouée, on rejoue le même contrôle à
      // chaque redessin pour que le message suive l'état réel de l'exercice.
      if (unProblemeSignale) {
        var pbsActuels = dernierControle();
        erreurs.textContent = pbsActuels.length ? pbsActuels[0] : "";
      }
      page.appendChild(erreurs);

      var barre = document.createElement("div");
      barre.className = "barre-bas";
      var tester = bouton("Tester", "fantome", function () {
        dernierControle = controleTest;
        var pbs = controleTest();
        if (pbs.length) { unProblemeSignale = true; erreurs.textContent = pbs[0]; return; }
        app.aller("exercice", { exercice: e });
      });
      var enregistrer = bouton("Enregistrer", "", function () {
        dernierControle = controleEnregistrement;
        var pbs = controleEnregistrement();
        if (pbs.length) { unProblemeSignale = true; erreurs.textContent = pbs[0]; return; }
        try {
          app.stockage.enregistrer(e);
        } catch (erreur) {
          // Message forgé par le stockage (mémoire pleine, données refusées) :
          // il est écrit pour être lu tel quel par le kiné, on ne le reformule pas.
          // Ce problème ne dépend pas de la forme de l'exercice : il persiste
          // tel quel tant qu'aucun enregistrement n'a réussi.
          var messageStockage = (erreur && erreur.message) ? erreur.message : "Enregistrement impossible.";
          unProblemeSignale = true;
          dernierControle = function () { return [messageStockage]; };
          erreurs.textContent = messageStockage;
          return;
        }
        app.aller("liste", {});
      });
      barre.appendChild(tester); barre.appendChild(enregistrer);
      page.appendChild(barre);

      racine.appendChild(page);
    }

    function contenu() {
      var f = document.createDocumentFragment();

      f.appendChild(champChoix("Mode", e.mode, [
        ["directions", "Directions"], ["couleurs", "Couleurs"], ["mixte", "Mixte"]
      ], function (v) { e.mode = v; redessiner(); }));

      if (e.mode === "mixte") {
        f.appendChild(champChoix("Règle", e.regle, [
          ["conflit", "Conflit — la couleur dit suivre ou inverser"],
          ["distracteur", "Distracteur — ignorer la couleur"],
          ["code", "Code couleur — la couleur est la direction"]
        ], function (v) { e.regle = v; redessiner(); }));
      }

      // Centralisé dans Modele.utiliseDirections : voir le commentaire de
      // cette fonction pour la raison de ne jamais la réécrire ici à la main.
      var besoinDirections = Modele.utiliseDirections(e);
      if (besoinDirections) {
        f.appendChild(sousTitre("Directions actives"));
        f.appendChild(jetons(Modele.DIRECTIONS.map(function (d) {
          return [d, libelleDirection(d), e.directions.indexOf(d) !== -1];
        }), function (d) {
          var i = e.directions.indexOf(d);
          if (i === -1) e.directions.push(d); else e.directions.splice(i, 1);
          redessiner();
        }));
      }

      if (e.mode !== "directions") {
        f.appendChild(sousTitre("Couleurs actives"));
        f.appendChild(jetons(Modele.NOMS_COULEURS.map(function (c) {
          return [c, pastille(c) + c, e.couleurs.indexOf(c) !== -1];
        }), function (c) {
          var i = e.couleurs.indexOf(c);
          if (i === -1) e.couleurs.push(c); else e.couleurs.splice(i, 1);
          redessiner();
        }, true));
      }

      if (e.mode === "mixte" && e.regle === "conflit") {
        // Comme la règle « code couleur » reconstruit ses correspondances à
        // partir des couleurs actives, on réaligne ici « suivre »/« inverser »
        // sur la liste actuelle avant d'afficher les menus : le réglage en
        // mémoire ne doit jamais pointer vers une couleur qui vient de
        // disparaître de l'écran.
        ajusterConflit(e);
        var options = e.couleurs.map(function (c) { return [c, c]; });
        f.appendChild(champChoix("Suivre la flèche si", e.conflit.suivre, options,
          function (v) { e.conflit.suivre = v; }));
        f.appendChild(champChoix("Faire l'inverse si", e.conflit.inverser, options,
          function (v) { e.conflit.inverser = v; }));
      }

      if (e.mode === "mixte" && e.regle === "code") {
        // Le menu affiche e.code[c], et rien d'autre : sans cet ajustement,
        // une couleur nouvellement activée montrerait « Haut » par défaut
        // sans que cette valeur ne soit jamais écrite dans l'exercice —
        // l'écran affiche alors un réglage que le modèle ne contient pas.
        ajusterCode(e);
        f.appendChild(sousTitre("Correspondances"));
        e.couleurs.forEach(function (c) {
          var dirs = Modele.DIRECTIONS.map(function (d) { return [d, libelleDirection(d)]; });
          f.appendChild(champChoix(pastille(c) + c, e.code[c], dirs,
            function (v) { e.code[c] = v; }));
        });
      }

      f.appendChild(champCase("Stimulus stop (go / no-go)", e.stop.actif, function (v) {
        e.stop.actif = v; redessiner();
      }));
      if (e.stop.actif) {
        f.appendChild(champNombre("Fréquence des stop (%)", e.stop.frequence, 0, 100, 5,
          function (v) { e.stop.frequence = v; }));
        f.appendChild(champChoix("Nature du stop", e.stop.type, [
          ["croix", "Croix"], ["couleur", "Fond de couleur pleine"]
        ], function (v) { e.stop.type = v; redessiner(); }));
        if (e.stop.type === "couleur") {
          // Cette couleur ne heurte les couleurs actives de l'exercice qu'en
          // mode couleurs ou mixte, où elles s'affichent réellement (voir
          // Modele.utiliseCouleurs) : en mode directions, la palette entière
          // reste proposée puisqu'aucune couleur active n'est visible à l'écran.
          var couleursLibres = Modele.utiliseCouleurs(e)
            ? Modele.NOMS_COULEURS.filter(function (c) { return e.couleurs.indexOf(c) === -1; })
            : Modele.NOMS_COULEURS.slice();
          if (!couleursLibres.length) couleursLibres = Modele.NOMS_COULEURS.slice();
          // Même principe que ajusterCode pour la règle code couleur : si la
          // couleur en mémoire vient de devenir une couleur active (donc plus
          // proposée), on la réaligne sur la première couleur encore libre au
          // lieu de laisser le menu afficher un choix qu'il ne propose plus.
          if (couleursLibres.indexOf(e.stop.couleur) === -1) e.stop.couleur = couleursLibres[0];
          f.appendChild(champChoix("Couleur du stop", e.stop.couleur,
            couleursLibres.map(function (c) { return [c, c]; }),
            function (v) { e.stop.couleur = v; }));
        }
      }
      return f;
    }

    function rythme() {
      var f = document.createDocumentFragment();
      f.appendChild(champCase("Accélérer au fil de l'exercice", e.acceleration.actif, function (v) {
        e.acceleration.actif = v; redessiner();
      }));

      if (e.acceleration.actif) {
        f.appendChild(champNombre("Intervalle au début (ms)", e.acceleration.debut, 300, 6000, 100,
          function (v) { e.acceleration.debut = v; }));
        f.appendChild(champNombre("Intervalle à la fin (ms)", e.acceleration.fin, 300, 6000, 100,
          function (v) { e.acceleration.fin = v; }));
      } else {
        f.appendChild(champChoix("Intervalle", e.intervalle.type, [
          ["fixe", "Fixe"], ["aleatoire", "Aléatoire"]
        ], function (v) { e.intervalle.type = v; redessiner(); }));
        if (e.intervalle.type === "fixe") {
          f.appendChild(champNombre("Valeur (ms)", e.intervalle.valeur, 300, 6000, 100,
            function (v) { e.intervalle.valeur = v; }));
        } else {
          f.appendChild(champNombre("Minimum (ms)", e.intervalle.min, 300, 6000, 100,
            function (v) { e.intervalle.min = v; }));
          f.appendChild(champNombre("Maximum (ms)", e.intervalle.max, 300, 6000, 100,
            function (v) { e.intervalle.max = v; }));
        }
      }

      f.appendChild(champCase("Le stimulus reste affiché jusqu'au suivant",
        e.affichage.persistant, function (v) { e.affichage.persistant = v; redessiner(); }));
      if (!e.affichage.persistant) {
        f.appendChild(champNombre("Durée d'affichage (ms)", e.affichage.duree, 100, 3000, 50,
          function (v) { e.affichage.duree = v; }));
      }
      return f;
    }

    function volume() {
      var f = document.createDocumentFragment();
      f.appendChild(champChoix("Fin de série", e.fin.type, [
        ["duree", "Après une durée"], ["stimuli", "Après un nombre de stimuli"]
      ], function (v) { e.fin.type = v; redessiner(); }));
      if (e.fin.type === "duree") {
        f.appendChild(champNombre("Durée d'une série (s)", e.fin.duree, 5, 600, 5,
          function (v) { e.fin.duree = v; }));
      } else {
        f.appendChild(champNombre("Nombre de stimuli", e.fin.stimuli, 1, 500, 1,
          function (v) { e.fin.stimuli = v; }));
      }
      f.appendChild(champNombre("Nombre de séries", e.series, 1, 20, 1, function (v) {
        e.series = v; redessiner();
      }));
      if (e.series > 1) {
        f.appendChild(champNombre("Repos entre séries (s)", e.repos, 0, 600, 5,
          function (v) { e.repos = v; }));
      }
      return f;
    }

    function affichage() {
      var f = document.createDocumentFragment();

      // Trois préréglages fixes (50/70/100). Une taille venant d'un réglage
      // fin ou d'un exercice importé peut valoir autre chose (63, par
      // exemple) : le menu ne doit alors jamais afficher un des trois
      // libellés fixes, ce qui mentirait sur la distance réelle. On ajoute
      // dans ce cas une option « Personnalisée » qui porte la vraie valeur
      // et disparaît dès que la taille revient sur un préréglage.
      var valeurPreset = String(e.taille);
      var presets = [["50", "1 m"], ["70", "2 m"], ["100", "3 m"]];
      var estPreset = presets.some(function (p) { return p[0] === valeurPreset; });
      var options = estPreset ? presets :
        presets.concat([[valeurPreset, "Personnalisée (" + e.taille + " %)"]]);

      f.appendChild(champChoix("Distance de l'iPad", valeurPreset, options, function (v) {
        e.taille = Number(v); redessiner();
      }));
      f.appendChild(champNombre("Taille précise (% de l'écran)", e.taille, 20, 100, 5,
        function (v) { e.taille = v; redessiner(); }));
      f.appendChild(champCase("Décompte 3, 2, 1 au départ", e.decompte, function (v) {
        e.decompte = v;
      }));
      return f;
    }

    function son() {
      var f = document.createDocumentFragment();
      f.appendChild(champCase("Bip à chaque stimulus", e.son.bip, function (v) { e.son.bip = v; }));
      f.appendChild(champCase("Annoncer le stimulus à voix haute", e.son.voix, function (v) {
        e.son.voix = v; redessiner();
      }));
      if (e.son.voix) {
        var min = e.acceleration.actif ? Math.min(e.acceleration.debut, e.acceleration.fin)
                : e.intervalle.type === "fixe" ? e.intervalle.valeur : e.intervalle.min;
        if (min < 1200) {
          f.appendChild(note("La voix met environ une demi-seconde à prononcer une direction. " +
            "Sous 1,2 s d'intervalle, les annonces risquent de se chevaucher."));
        }
        f.appendChild(champCase("Masquer l'écran (audio seul)", e.son.audioSeul, function (v) {
          e.son.audioSeul = v;
        }));
      }
      f.appendChild(champCase("Signal 3 s avant la reprise", e.son.signalReprise, function (v) {
        e.son.signalReprise = v;
      }));
      return f;
    }

    redessiner();
  }

  // — Fabriques d'éléments —

  function ajusterConflit(e) {
    if (!e.conflit) return;
    reaffecter("suivre", "inverser");
    reaffecter("inverser", "suivre");

    function reaffecter(role, autreRole) {
      if (e.couleurs.indexOf(e.conflit[role]) !== -1) return; // encore active : rien à changer
      for (var i = 0; i < e.couleurs.length; i++) {
        if (e.couleurs[i] !== e.conflit[autreRole]) { e.conflit[role] = e.couleurs[i]; return; }
      }
      // Pas assez de couleurs actives pour tenir les deux rôles : on laisse
      // la validation le signaler à l'enregistrement plutôt que d'inventer
      // un état impossible (les deux rôles sur la même couleur).
    }
  }

  function ajusterCode(e) {
    if (!e.code) e.code = {};
    e.couleurs.forEach(function (c) {
      // hasOwnProperty plutôt que `in` : "toString" in Modele.ANGLES vaut vrai
      // (hérité d'Object.prototype), ce qui laisserait passer une valeur ainsi
      // nommée pour une direction connue.
      if (!Object.prototype.hasOwnProperty.call(Modele.ANGLES, e.code[c])) e.code[c] = "haut";
    });
  }

  function libelleDirection(d) {
    return { "haut": "Haut", "haut-droite": "Haut droite", "droite": "Droite",
             "bas-droite": "Bas droite", "bas": "Bas", "bas-gauche": "Bas gauche",
             "gauche": "Gauche", "haut-gauche": "Haut gauche" }[d];
  }

  function pastille(couleur) {
    return '<span class="pastille" style="background:' + Modele.COULEURS[couleur] + '"></span>';
  }

  function groupe(titre, contenu) {
    var d = document.createElement("details");
    d.className = "groupe";
    d.open = (titre === "Contenu");
    var s = document.createElement("summary");
    s.innerHTML = "<span>" + titre + "</span><span>▾</span>";
    var c = document.createElement("div");
    c.className = "contenu";
    c.appendChild(contenu);
    d.appendChild(s); d.appendChild(c);
    return d;
  }

  // idPourLabel associe le libellé à son contrôle (attribut "for") afin que
  // toucher le texte bascule le contrôle. Utile surtout pour les cases à
  // cocher, dont la zone propre est trop petite pour le doigt ; sans effet
  // indésirable sur les autres champs (un select ou un input reçoivent
  // simplement le focus au toucher du libellé, comportement natif du navigateur).
  function ligne(libelleHtml, controle, idPourLabel) {
    var l = document.createElement("div");
    l.className = "champ";
    var lab = document.createElement("label");
    lab.innerHTML = libelleHtml;
    if (idPourLabel) lab.htmlFor = idPourLabel;
    l.appendChild(lab); l.appendChild(controle);
    return l;
  }

  function champTexte(libelle, valeur, onChange) {
    var i = document.createElement("input");
    i.type = "text"; i.value = valeur; i.placeholder = "Nom de l'exercice";
    i.style.minWidth = "220px";
    i.oninput = function () { onChange(i.value); };
    return ligne(libelle, i);
  }

  function champNombre(libelle, valeur, min, max, pas, onChange) {
    var i = document.createElement("input");
    i.type = "number"; i.value = valeur; i.min = min; i.max = max; i.step = pas;
    i.inputMode = "numeric";
    i.onchange = function () {
      var v = Number(i.value);
      if (v < min) v = min;
      if (v > max) v = max;
      i.value = v;
      onChange(v);
    };
    return ligne(libelle, i);
  }

  var compteurId = 0;

  function champCase(libelle, valeur, onChange) {
    var id = "champ-case-" + (compteurId++);
    var i = document.createElement("input");
    i.type = "checkbox"; i.id = id; i.checked = !!valeur;
    i.onchange = function () { onChange(i.checked); };
    // La case visuelle reste à sa taille d'origine (accent-color, palette
    // inchangés) ; c'est l'enveloppe qui porte la zone tactile de 44 points,
    // via .case-tactile dans style.css.
    var enveloppe = document.createElement("span");
    enveloppe.className = "case-tactile";
    enveloppe.appendChild(i);
    return ligne(libelle, enveloppe, id);
  }

  // Fabrique unique du menu déroulant. Le libellé est toujours inséré via
  // innerHTML (comme pour toutes les lignes de réglage : les pastilles de
  // couleur en dépendent) — appelants : ne jamais y passer une valeur saisie
  // par l'utilisateur (le nom de l'exercice, par exemple), seulement des
  // libellés écrits dans le code.
  function champChoix(libelleHtml, valeur, options, onChange) {
    var s = document.createElement("select");
    options.forEach(function (o) {
      var op = document.createElement("option");
      op.value = o[0]; op.textContent = o[1];
      if (String(o[0]) === String(valeur)) op.selected = true;
      s.appendChild(op);
    });
    s.onchange = function () { onChange(s.value); };
    return ligne(libelleHtml, s);
  }

  function sousTitre(texte) {
    var d = document.createElement("div");
    d.className = "champ";
    d.innerHTML = "<label>" + texte + "</label>";
    return d;
  }

  function jetons(liste, onToggle, html) {
    var d = document.createElement("div");
    d.className = "jetons";
    liste.forEach(function (item) {
      var b = document.createElement("button");
      b.className = "jeton";
      if (html) b.innerHTML = item[1]; else b.textContent = item[1];
      b.setAttribute("aria-pressed", String(item[2]));
      b.onclick = function () { onToggle(item[0]); };
      d.appendChild(b);
    });
    return d;
  }

  function note(texte) {
    var p = document.createElement("p");
    p.style.cssText = "color:#8B949B;font-size:13px;padding:8px 0;margin:0";
    p.textContent = texte;
    return p;
  }

  function bouton(texte, classe, onClick) {
    var b = document.createElement("button");
    b.className = "bouton " + classe;
    b.textContent = texte;
    b.onclick = onClick;
    return b;
  }

  global.EcranReglages = { afficher: afficher };
})(typeof globalThis !== "undefined" ? globalThis : this);
