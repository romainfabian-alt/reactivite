(function (global) {
  var Modele = (typeof require !== "undefined") ? require("./modele.js") : global.Modele;

  // Ce que l'écran d'exercice montre pendant le décompte 3-2-1 et pendant le
  // repos (refonte du 01/10/2026) : en code couleur ou en conflit, le patient
  // n'a plus à retenir une consigne orale. Donnée pure, dessinée par
  // l'écran d'exercice ; null quand il n'y a rien à expliquer.

  // Les mots d'un patient debout face à l'iPad : la flèche vers le haut veut
  // dire « avance », vers le bas « recule ».
  var MOTS = {
    "haut": "Avant", "haut-droite": "Avant droite", "droite": "Droite", "bas-droite": "Arrière droite",
    "bas": "Arrière", "bas-gauche": "Arrière gauche", "gauche": "Gauche", "haut-gauche": "Avant gauche"
  };
  function mot(direction) { return MOTS[direction] || direction; }

  function pour(e) {
    var titre = "", tuiles = [];
    if (e.mode === "mixte" && e.regle === "code") {
      titre = "La couleur donne la direction";
      e.couleurs.forEach(function (c) {
        if (e.code && e.code[c]) tuiles.push({ type: "code", couleur: c, direction: e.code[c], mot: mot(e.code[c]) });
      });
    } else if (e.mode === "mixte" && e.regle === "conflit" && e.conflit) {
      // La flèche d'exemple pointe à droite : la réponse attendue s'en déduit.
      tuiles.push({ type: "suivre", couleur: e.conflit.suivre, mot: "Suis la flèche", reponse: "droite" });
      tuiles.push({ type: "inverser", couleur: e.conflit.inverser, mot: "Fais l'inverse", reponse: Modele.oppose("droite") });
    } else if (e.mode === "mixte" && e.regle === "distracteur") {
      titre = "Suis la flèche, ignore la couleur";
    }
    if (e.stop && e.stop.actif) {
      tuiles.push({ type: "stop", couleur: e.stop.couleur, forme: e.stop.type, mot: "Ne bouge pas" });
    }
    if (!titre && !tuiles.length) return null;
    return { titre: titre, tuiles: tuiles };
  }

  var Legende = { pour: pour, mot: mot };
  if (typeof module !== "undefined" && module.exports) module.exports = Legende;
  else global.Legende = Legende;
})(typeof globalThis !== "undefined" ? globalThis : this);
