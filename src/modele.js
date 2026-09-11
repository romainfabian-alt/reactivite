(function (global) {
  var ANGLES = {
    "haut": 0, "haut-droite": 45, "droite": 90, "bas-droite": 135,
    "bas": 180, "bas-gauche": 225, "gauche": 270, "haut-gauche": 315
  };
  var DIRECTIONS = ["haut", "haut-droite", "droite", "bas-droite",
                    "bas", "bas-gauche", "gauche", "haut-gauche"];
  // Ces couleurs doivent rester distinguables par la luminosité, pas seulement
  // par la teinte : un patient daltonien (deutéranope notamment, environ un
  // homme sur douze) ne perçoit pas la différence de teinte entre le rouge et
  // le vert. Le vert #3DD87A est volontairement clair (contraste ~2,5:1 avec
  // le rouge #E0322B) pour rester repérable même quand la teinte se confond.
  var COULEURS = {
    rouge:  "#E0322B", vert:   "#3DD87A", bleu:   "#2D7DF6",
    jaune:  "#F2C400", orange: "#F07A1A", blanc:  "#FFFFFF"
  };
  var NOMS_COULEURS = Object.keys(COULEURS);

  // L'opposé se déduit de l'angle : aucune table à maintenir, aucun oubli possible
  // sur les diagonales.
  function oppose(direction) {
    var a = (ANGLES[direction] + 180) % 360;
    for (var i = 0; i < DIRECTIONS.length; i++) {
      if (ANGLES[DIRECTIONS[i]] === a) return DIRECTIONS[i];
    }
    return null;
  }

  function defaut() {
    return {
      id: null,
      nom: "",
      mode: "directions",
      directions: ["haut", "bas", "gauche", "droite"],
      couleurs: ["rouge", "vert"],
      regle: "conflit",
      conflit: { suivre: "vert", inverser: "rouge" },
      code: { rouge: "gauche", vert: "droite" },
      stop: { actif: false, frequence: 20, type: "croix", couleur: "rouge" },
      intervalle: { type: "aleatoire", valeur: 1500, min: 1200, max: 2000 },
      acceleration: { actif: false, debut: 2000, fin: 900 },
      affichage: { persistant: true, duree: 400 },
      fin: { type: "duree", duree: 45, stimuli: 30 },
      series: 1,
      repos: 30,
      taille: 70,
      decompte: true,
      son: { bip: false, voix: false, audioSeul: false, signalReprise: true }
    };
  }

  var MODES = ["directions", "couleurs", "mixte"];
  var REGLES = ["conflit", "distracteur", "code"];

  // Un exercice affiche des flèches sauf en mixte + règle code couleur, où
  // seule la table `code` gouverne la réponse. Centralisé ici pour que
  // valider() et resume() ne puissent pas diverger sur ce critère.
  function utiliseDirections(e) {
    return (e.mode === "directions") || (e.mode === "mixte" && e.regle !== "code");
  }

  // Symétrique de utiliseDirections : un exercice affiche des couleurs en
  // mode couleurs ou mixte, jamais en mode directions. Centralisé pour que
  // valider() et l'écran de réglages (menu « Couleur du stop ») ne puissent
  // pas diverger sur ce qui est réellement visible à l'écran.
  function utiliseCouleurs(e) {
    return (e.mode === "couleurs") || (e.mode === "mixte");
  }

  // "toString" in {} vaut vrai (hérité d'Object.prototype) : un champ nommé
  // ainsi passerait une simple vérification `in`. hasOwnProperty évite ce
  // faux positif sur ANGLES comme sur toute autre table de correspondance.
  function estClePropre(table, cle) {
    return Object.prototype.hasOwnProperty.call(table, cle);
  }

  // Un objet de réglages (conflit, code, stop, acceleration...) ne doit être
  // ni absent, ni un tableau, ni une primitive : ces formes ne lèvent pas
  // toutes en JavaScript à la simple lecture d'une propriété (un nombre ou
  // une chaîne renvoient juste `undefined`), mais royalement aucune n'est un
  // réglage exploitable par l'app.
  function estObjet(v) {
    return v !== null && typeof v === "object" && !Array.isArray(v);
  }

  function valider(e) {
    var erreurs = [], i;

    // Prémunit l'app contre les fichiers d'export édités ou tronqués par l'utilisateur.
    // null, undefined, des primitives ou des tableaux ne peuvent pas être des exercices.
    if (e === null || e === undefined || typeof e !== "object" || Array.isArray(e)) {
      erreurs.push("Impossible de charger cet exercice : données manquantes ou incorrectes.");
      return erreurs;
    }

    if (MODES.indexOf(e.mode) === -1) {
      erreurs.push("Le mode de l'exercice est inconnu : " + e.mode + ".");
    }

    if (REGLES.indexOf(e.regle) === -1) {
      erreurs.push("La règle de l'exercice est inconnue : " + e.regle + ".");
    }

    if (typeof e.nom !== "string") {
      erreurs.push("Le nom de l'exercice est manquant ou invalide.");
    }

    // L'écran de réglages manipule directions, couleurs, conflit, code, stop
    // et acceleration quel que soit le mode courant (un simple changement de
    // mode y donne accès) : leur structure doit donc toujours être exploitable,
    // même quand le mode actif ne les affiche pas à l'écran.
    var besoinDirections = utiliseDirections(e);
    if (!Array.isArray(e.directions)) {
      erreurs.push("La liste des directions actives est manquante ou mal formée.");
    } else {
      for (i = 0; i < e.directions.length; i++) {
        if (!estClePropre(ANGLES, e.directions[i])) {
          erreurs.push("Direction inconnue : " + e.directions[i]);
        }
      }
      if (besoinDirections && e.directions.length < 2) {
        erreurs.push("Il faut au moins deux directions actives.");
      }
    }

    var besoinCouleurs = utiliseCouleurs(e);
    if (!Array.isArray(e.couleurs)) {
      erreurs.push("La liste des couleurs actives est manquante ou mal formée.");
    } else {
      for (i = 0; i < e.couleurs.length; i++) {
        if (NOMS_COULEURS.indexOf(e.couleurs[i]) === -1) {
          erreurs.push("Couleur inconnue : " + e.couleurs[i]);
        }
      }
      if (besoinCouleurs && e.couleurs.length < 2) {
        erreurs.push("Il faut au moins deux couleurs actives.");
      }
    }

    if (!estObjet(e.conflit)) {
      erreurs.push("Les réglages de la règle conflit ne sont pas renseignés.");
    }
    if (!estObjet(e.code)) {
      erreurs.push("Les correspondances couleur → direction ne sont pas renseignées.");
    }
    if (!estObjet(e.stop)) {
      erreurs.push("Les réglages du stimulus stop ne sont pas renseignés.");
    }
    if (!estObjet(e.acceleration)) {
      erreurs.push("Les réglages d'accélération ne sont pas renseignés.");
    }

    if (e.mode === "mixte" && e.regle === "conflit" && Array.isArray(e.couleurs) && estObjet(e.conflit)) {
      if (e.couleurs.indexOf(e.conflit.suivre) === -1 ||
          e.couleurs.indexOf(e.conflit.inverser) === -1) {
        erreurs.push("Les couleurs « suivre » et « inverser » doivent être actives.");
      }
      if (e.conflit.suivre === e.conflit.inverser) {
        erreurs.push("« Suivre » et « inverser » ne peuvent pas être la même couleur.");
      }
      // La règle conflit n'attribue une consigne qu'à deux couleurs (suivre,
      // inverser) : une troisième couleur active s'affiche sans qu'aucune
      // consigne ne lui ait jamais été donnée.
      if (e.couleurs.length > 2) {
        erreurs.push("La règle « conflit » n'a de sens qu'avec deux couleurs actives : « suivre » et « inverser ».");
      }
    }

    if (e.mode === "mixte" && e.regle === "code" && Array.isArray(e.couleurs) && estObjet(e.code)) {
      for (i = 0; i < e.couleurs.length; i++) {
        var c = e.couleurs[i];
        if (!e.code[c]) {
          erreurs.push("Aucune direction associée à la couleur " + c + ".");
        } else if (!estClePropre(ANGLES, e.code[c])) {
          erreurs.push("Direction inconnue pour " + c + " : " + e.code[c]);
        }
      }
    }

    if (estObjet(e.stop) && e.stop.actif) {
      if (!(e.stop.frequence >= 0 && e.stop.frequence <= 100)) {
        erreurs.push("La fréquence des stimuli stop doit être comprise entre 0 et 100 %.");
      }
      if (e.stop.type !== "croix" && e.stop.type !== "couleur") {
        erreurs.push("Le type de stimulus stop doit être « croix » ou « couleur ».");
      } else if (e.stop.type === "couleur") {
        if (NOMS_COULEURS.indexOf(e.stop.couleur) === -1) {
          // Rendu.fond() retombe sur le noir pour une couleur inconnue : sans
          // ce contrôle, le stop « ne fais rien » deviendrait une croix noire
          // invisible sur fond noir.
          erreurs.push("La couleur du stop est inconnue.");
        } else if (besoinCouleurs && Array.isArray(e.couleurs) && e.couleurs.indexOf(e.stop.couleur) !== -1) {
          // Un stop en fond de couleur pleine qui reprendrait une couleur active
          // deviendrait indiscernable d'un stimulus « pars » de cette couleur.
          // Cela ne vaut que si des couleurs sont réellement affichées : en
          // mode directions, aucune couleur active n'est visible à l'écran,
          // donc aucune confusion possible.
          erreurs.push("La couleur du stop ne peut pas être une des couleurs actives de l'exercice.");
        }
      }
    }

    if (!estObjet(e.intervalle)) {
      erreurs.push("L'intervalle entre les stimuli n'est pas renseigné.");
    } else {
      if (e.intervalle.type === "aleatoire") {
        if (!(e.intervalle.min > 0) || !(e.intervalle.max > 0)) {
          erreurs.push("Les bornes d'intervalle doivent être positives.");
        } else if (e.intervalle.min > e.intervalle.max) {
          erreurs.push("L'intervalle minimum ne peut pas dépasser le maximum.");
        }
      } else if (!(e.intervalle.valeur > 0)) {
        erreurs.push("L'intervalle doit être positif.");
      }
    }

    if (estObjet(e.acceleration) && e.acceleration.actif) {
      if (!(e.acceleration.debut > 0) || !(e.acceleration.fin > 0)) {
        erreurs.push("Les intervalles d'accélération doivent être positifs.");
      } else if (e.acceleration.debut === e.acceleration.fin) {
        erreurs.push("L'accélération demande un intervalle de fin différent du début.");
      }
    }

    if (!estObjet(e.fin)) {
      erreurs.push("La condition de fin d'exercice n'est pas renseignée.");
    } else {
      if (e.fin.type === "duree" && !(e.fin.duree > 0)) {
        erreurs.push("La durée doit être positive.");
      }
      if (e.fin.type === "stimuli" && !(e.fin.stimuli > 0)) {
        erreurs.push("Le nombre de stimuli doit être positif.");
      }
    }
    if (!(e.series >= 1)) erreurs.push("Il faut au moins une série.");
    if (e.series > 1 && !(e.repos >= 0)) erreurs.push("Le repos ne peut pas être négatif.");

    // Cette taille finit brute dans le balisage SVG du stimulus (Rendu.fleche/stop) :
    // hors bornes ou non numérique, l'affichage devient illisible pour le patient.
    if (!(typeof e.taille === "number" && e.taille >= 20 && e.taille <= 100)) {
      erreurs.push("La taille d'affichage doit être un nombre compris entre 20 et 100.");
    }

    // Le moteur et l'écran d'exercice lisent son.*, affichage.* et decompte
    // sans garde : un exercice qui les omet doit être arrêté ici, pas
    // planter en pleine séance devant le patient.
    if (!e.son || typeof e.son !== "object") {
      erreurs.push("Les réglages de son ne sont pas renseignés.");
    } else {
      ["bip", "voix", "audioSeul", "signalReprise"].forEach(function (champ) {
        if (typeof e.son[champ] !== "boolean") {
          erreurs.push("Le réglage de son « " + champ + " » est manquant ou invalide.");
        }
      });
    }

    if (!e.affichage || typeof e.affichage !== "object") {
      erreurs.push("Les réglages d'affichage ne sont pas renseignés.");
    } else {
      if (typeof e.affichage.persistant !== "boolean") {
        erreurs.push("Le réglage d'affichage « persistant » est manquant ou invalide.");
      } else if (!e.affichage.persistant && !(e.affichage.duree > 0)) {
        erreurs.push("La durée d'affichage doit être un nombre positif quand l'affichage n'est pas persistant.");
      }
    }

    if (typeof e.decompte !== "boolean") {
      erreurs.push("Le réglage de décompte est manquant ou invalide.");
    }

    return erreurs;
  }

  // Écriture française des secondes, décimale toujours affichée pour que la
  // plage « 1,2–2,0 s » reste alignée : 1,2 s et non 1.2 s, 2,0 s et non 2 s.
  function sec(ms) {
    return (Math.round(ms / 100) / 10).toFixed(1).replace(".", ",");
  }

  function resume(e) {
    var bouts = [];
    var libelleMode = { directions: "Directions", couleurs: "Couleurs", mixte: "Mixte" };
    bouts.push(libelleMode[e.mode]);

    if (utiliseDirections(e)) bouts.push(e.directions.length + " directions");
    if (e.mode !== "directions") bouts.push(e.couleurs.length + " couleurs");
    if (e.stop && e.stop.actif) bouts.push("stop " + e.stop.frequence + " %");

    var volume = (e.fin.type === "duree") ? e.fin.duree + " s" : e.fin.stimuli + " stim.";
    bouts.push(e.series > 1 ? e.series + "×" + volume : volume);

    if (e.acceleration && e.acceleration.actif) {
      bouts.push(sec(e.acceleration.debut) + " → " + sec(e.acceleration.fin) + " s");
    } else if (e.intervalle.type === "aleatoire") {
      bouts.push(sec(e.intervalle.min) + "–" + sec(e.intervalle.max) + " s");
    } else {
      bouts.push(sec(e.intervalle.valeur) + " s");
    }

    return bouts.join(" · ");
  }

  var Modele = {
    ANGLES: ANGLES, DIRECTIONS: DIRECTIONS,
    COULEURS: COULEURS, NOMS_COULEURS: NOMS_COULEURS,
    oppose: oppose, defaut: defaut, valider: valider, resume: resume,
    utiliseDirections: utiliseDirections, utiliseCouleurs: utiliseCouleurs
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Modele;
  else global.Modele = Modele;
})(typeof globalThis !== "undefined" ? globalThis : this);
