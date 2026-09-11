(function (global) {
  var Modele    = (typeof require !== "undefined") ? require("./modele.js")    : global.Modele;
  var Aleatoire = (typeof require !== "undefined") ? require("./aleatoire.js") : global.Aleatoire;

  // Plancher appliqué à tout intervalle calculé. Un intervalle nul ou négatif
  // empêche « t » d'avancer et fige la boucle de génération (donc l'iPad, en
  // pleine séance) ; en dessous de ce seuil, aucun patient n'a de toute façon
  // le temps de réagir au stimulus précédent avant le suivant.
  var INTERVALLE_MINIMUM_MS = 100;

  // Ceinture de sécurité indépendante du plancher ci-dessus : même avec un
  // intervalle valide, une durée aberrante venue d'un fichier édité à la main
  // ne doit jamais produire une série qui sature la mémoire de l'iPad. Une
  // séance réelle dépasse rarement quelques centaines de stimuli ; ce plafond
  // ne peut donc jamais brider un usage normal.
  // Note : cette borne s'appuie délibérément sur le compteur index, pas sur
  // le temps écoulé, ce qui la maintient efficace même si t devient NaN.
  var STIMULI_MAXIMUM = 20000;

  // Progression de 0 à 1, utilisée par l'accélération. Sur un critère de durée,
  // elle se déduit du temps déjà écoulé, ce qui reste cohérent puisque t croît.
  function progression(e, index, t) {
    if (e.fin.type === "stimuli") {
      return e.fin.stimuli <= 1 ? 0 : Math.min(1, index / (e.fin.stimuli - 1));
    }
    return Math.max(0, Math.min(1, t / (e.fin.duree * 1000)));
  }

  function intervalle(e, rng, index, t) {
    var brut;
    if (e.acceleration && e.acceleration.actif) {
      var p = progression(e, index, t);
      brut = Math.round(e.acceleration.debut + (e.acceleration.fin - e.acceleration.debut) * p);
    } else if (e.intervalle.type === "aleatoire") {
      brut = e.intervalle.min + rng.entier(e.intervalle.max - e.intervalle.min + 1);
    } else {
      brut = e.intervalle.valeur;
    }
    // Un fichier d'exercice édité ou tronqué peut fournir des bornes incohérentes
    // (intervalle nul/négatif, min > max, accélération qui croise zéro).
    // Le plancher traite les intervalles nuls ou négatifs, mais ne rattrape pas NaN
    // (Math.max(100, NaN) vaut NaN) : c'est la borne sur le nombre de stimuli
    // (STIMULI_MAXIMUM) qui constitue la protection ultime en ce cas.
    return Math.max(INTERVALLE_MINIMUM_MS, brut);
  }

  // Tire un élément différent du précédent. Sur une liste à un seul élément,
  // la répétition est inévitable et acceptée.
  function tirerDifferent(rng, liste, precedent) {
    if (liste.length < 2) return liste[0];
    var v;
    do { v = rng.parmi(liste); } while (v === precedent);
    return v;
  }

  function serie(e, graine) {
    var rng = Aleatoire.creer(graine);
    var stimuli = [], t = 0, index = 0;
    var precedenteDirection = null, precedenteCouleur = null, precedentStop = false;
    var limiteMs = e.fin.duree * 1000;

    while (true) {
      if (e.fin.type === "stimuli") { if (index >= e.fin.stimuli) break; }
      else if (t >= limiteMs) break;
      // Ceinture de sécurité : quoi qu'il arrive, une série s'arrête ici. Voir
      // STIMULI_MAXIMUM plus haut.
      if (index >= STIMULI_MAXIMUM) break;

      // Centralisé dans Modele.utiliseDirections : voir le commentaire de
      // cette fonction pour la raison de ne jamais la réécrire ici à la main.
      var afficheFleche = Modele.utiliseDirections(e);
      var afficheCouleur = (e.mode === "couleurs") || (e.mode === "mixte");

      var direction = null, couleur = null, reponse = null;
      // Un stop ne peut jamais suivre immédiatement un autre stop : deux croix
      // d'affilée affichent exactement le même écran, ce qui fige visuellement
      // la séance aux yeux du patient.
      var stop = !precedentStop &&
                 !!(e.stop && e.stop.actif && rng.chance(e.stop.frequence));
      precedentStop = stop;

      if (afficheFleche) {
        direction = tirerDifferent(rng, e.directions, precedenteDirection);
        precedenteDirection = direction;
      }
      if (afficheCouleur) {
        // En règle code couleur, la couleur porte l'information : deux couleurs
        // identiques d'affilée figeraient l'écran. Ailleurs elle peut se répéter,
        // mais on évite la répétition partout pour rester homogène.
        couleur = tirerDifferent(rng, e.couleurs, precedenteCouleur);
        precedenteCouleur = couleur;
      }

      if (!stop) {
        if (e.mode === "mixte" && e.regle === "conflit") {
          reponse = (couleur === e.conflit.inverser) ? Modele.oppose(direction) : direction;
        } else if (e.mode === "mixte" && e.regle === "code") {
          reponse = e.code[couleur];
        } else {
          reponse = direction; // null en mode couleurs simple
        }
      }

      stimuli.push({
        index: index, t: t,
        direction: direction, couleur: couleur,
        stop: stop, reponse: reponse
      });

      t += intervalle(e, rng, index, t);
      index++;
    }

    return stimuli;
  }

  var Generateur = { serie: serie };
  if (typeof module !== "undefined" && module.exports) module.exports = Generateur;
  else global.Generateur = Generateur;
})(typeof globalThis !== "undefined" ? globalThis : this);
