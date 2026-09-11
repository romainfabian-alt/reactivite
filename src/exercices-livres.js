(function (global) {
  var Modele = (typeof require !== "undefined") ? require("./modele.js") : global.Modele;

  function base(modif) {
    var e = Modele.defaut();
    for (var k in modif) e[k] = modif[k];
    return e;
  }

  function tous() {
    return [
      base({
        id: "livre-1", nom: "Découverte — 4 directions",
        mode: "directions",
        directions: ["haut", "bas", "gauche", "droite"],
        intervalle: { type: "fixe", valeur: 2000, min: 1200, max: 2000 },
        fin: { type: "duree", duree: 45, stimuli: 30 },
        series: 1, repos: 30, taille: 70, decompte: true
      }),
      base({
        id: "livre-2", nom: "Huit directions — rythme libre",
        mode: "directions",
        directions: Modele.DIRECTIONS.slice(),
        intervalle: { type: "aleatoire", valeur: 1500, min: 900, max: 1800 },
        fin: { type: "duree", duree: 45, stimuli: 30 },
        series: 3, repos: 30, taille: 70, decompte: true,
        son: { bip: true, voix: false, audioSeul: false, signalReprise: true }
      }),
      base({
        id: "livre-3", nom: "Couleurs — consigne orale",
        mode: "couleurs",
        couleurs: ["rouge", "vert", "bleu", "jaune"],
        intervalle: { type: "aleatoire", valeur: 1500, min: 1200, max: 2200 },
        fin: { type: "duree", duree: 40, stimuli: 30 },
        series: 3, repos: 30, taille: 100, decompte: true
      }),
      base({
        id: "livre-4", nom: "Code couleur — la couleur est la direction",
        mode: "mixte", regle: "code",
        couleurs: ["rouge", "vert", "bleu", "jaune"],
        code: { rouge: "gauche", vert: "droite", bleu: "haut", jaune: "bas" },
        intervalle: { type: "aleatoire", valeur: 1500, min: 1200, max: 2200 },
        fin: { type: "duree", duree: 40, stimuli: 30 },
        series: 3, repos: 30, taille: 100, decompte: true
      }),
      base({
        id: "livre-5", nom: "Distracteur — ignorer la couleur",
        mode: "mixte", regle: "distracteur",
        directions: ["haut", "bas", "gauche", "droite"],
        couleurs: ["rouge", "vert", "bleu", "jaune"],
        intervalle: { type: "aleatoire", valeur: 1500, min: 1000, max: 1800 },
        fin: { type: "duree", duree: 40, stimuli: 30 },
        series: 3, repos: 30, taille: 70, decompte: true
      }),
      base({
        id: "livre-6", nom: "Conflit + stop — montée en intensité",
        mode: "mixte", regle: "conflit",
        directions: Modele.DIRECTIONS.slice(),
        couleurs: ["vert", "rouge"],
        conflit: { suivre: "vert", inverser: "rouge" },
        stop: { actif: true, frequence: 20, type: "croix", couleur: "rouge" },
        acceleration: { actif: true, debut: 2000, fin: 900 },
        affichage: { persistant: false, duree: 500 },
        fin: { type: "duree", duree: 30, stimuli: 30 },
        series: 4, repos: 30, taille: 70, decompte: true,
        son: { bip: true, voix: false, audioSeul: false, signalReprise: true }
      })
    ];
  }

  var ExercicesLivres = { tous: tous };
  if (typeof module !== "undefined" && module.exports) module.exports = ExercicesLivres;
  else global.ExercicesLivres = ExercicesLivres;
})(typeof globalThis !== "undefined" ? globalThis : this);
