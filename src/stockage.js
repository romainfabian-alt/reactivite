(function (global) {
  var Modele = (typeof require !== "undefined") ? require("./modele.js") : global.Modele;
  var Livres = (typeof require !== "undefined") ? require("./exercices-livres.js") : global.ExercicesLivres;

  var CLE = "reactivite.bibliotheque";
  // Clé distincte, jamais touchée par ecrire() : un exercice écarté au
  // chargement (parce qu'un durcissement de valider() ne l'accepte plus) y
  // est rangé au lieu d'être perdu. Voir le commentaire de charger() et la
  // note dans CLAUDE.md.
  var CLE_ECARTES = "reactivite.bibliotheque.ecartes";
  var VERSION = 1;

  function copie(o) { return JSON.parse(JSON.stringify(o)); }

  function creer(magasin) {
    var ecartes = []; // rempli par charger(), jamais réécrit par ecrire()
    var exercices = charger();

    function ecartesDejaConnus() {
      try {
        var brut = magasin.getItem(CLE_ECARTES);
        if (!brut) return [];
        var d = JSON.parse(brut);
        return (d && Array.isArray(d.exercices)) ? d.exercices : [];
      } catch (e) {
        return [];
      }
    }

    function charger() {
      var brut = null;
      try { brut = magasin.getItem(CLE); } catch (e) { brut = null; }
      if (!brut) return Livres.tous();
      try {
        var d = JSON.parse(brut);
        if (!d || !Array.isArray(d.exercices)) return Livres.tous();
        // Un exercice structurellement présent mais sémantiquement invalide
        // (réglages incohérents, ou devenu invalide par un durcissement de
        // valider() depuis son enregistrement) est écarté de la bibliothèque
        // active : le lancer devant un patient planterait la séance. Mais il
        // n'est plus perdu pour autant : il rejoint, sous une clé de stockage
        // distincte que la sauvegarde ordinaire ne touche jamais, les
        // exercices déjà écartés lors d'un chargement précédent. Rien n'est
        // jamais écrasé, seulement accumulé — et il ressort intact via
        // Exporter, que le kiné peut corriger et réimporter.
        var valides = [];
        var nouveauxEcartes = [];
        d.exercices.forEach(function (e) {
          if (Modele.valider(e).length === 0) valides.push(e); else nouveauxEcartes.push(e);
        });
        if (nouveauxEcartes.length) {
          ecartes = ecartesDejaConnus().concat(nouveauxEcartes);
          try {
            magasin.setItem(CLE_ECARTES, JSON.stringify({ version: VERSION, exercices: ecartes }));
          } catch (e) {
            // Non persisté cette fois (mémoire pleine) : les exercices écartés
            // restent au moins disponibles en mémoire pour l'export de cette
            // session, plutôt que de disparaître sans trace.
          }
        } else {
          ecartes = ecartesDejaConnus();
        }
        return valides.length ? valides : Livres.tous();
      } catch (e) {
        // Magasin corrompu : mieux vaut repartir des exercices livrés que
        // laisser l'app refuser de s'ouvrir en pleine séance.
        return Livres.tous();
      }
    }

    // Écrit un nouvel état sur le disque et ne le rend visible en mémoire que
    // si l'écriture a réussi. Si `ecrire()` levait après avoir déjà remplacé
    // `exercices`, l'écran rafraîchi montrerait un travail qui n'a en réalité
    // jamais quitté la mémoire de l'iPad : au prochain lancement, il aurait
    // disparu sans explication.
    function ecrire(nouvelEtat) {
      try {
        magasin.setItem(CLE, JSON.stringify({ version: VERSION, exercices: nouvelEtat }));
      } catch (e) {
        throw new Error("Enregistrement impossible : la mémoire de l'appareil est pleine.");
      }
      exercices = nouvelEtat;
    }

    function nouvelId() {
      return "ex-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 1e6).toString(36);
    }

    function lister()      { return copie(exercices); }
    function obtenir(id)   {
      for (var i = 0; i < exercices.length; i++) if (exercices[i].id === id) return copie(exercices[i]);
      return null;
    }

    function enregistrer(exercice) {
      var erreurs = Modele.valider(exercice);
      if (erreurs.length) throw new Error(erreurs[0]);
      var e = copie(exercice);
      if (!e.id) e.id = nouvelId();
      var nouvelEtat = exercices.slice();
      var remplace = false;
      for (var i = 0; i < nouvelEtat.length; i++) {
        if (nouvelEtat[i].id === e.id) { nouvelEtat[i] = e; remplace = true; break; }
      }
      if (!remplace) nouvelEtat.push(e);
      ecrire(nouvelEtat);
      return copie(e);
    }

    function supprimer(id) {
      var nouvelEtat = exercices.filter(function (e) { return e.id !== id; });
      ecrire(nouvelEtat);
    }

    function dupliquer(id) {
      var source = obtenir(id);
      if (!source) return null;
      source.id = null;
      source.nom = source.nom + " (copie)";
      return source; // non enregistré : l'écran de réglages s'en charge après relecture
    }

    function nbEcartes() { return ecartes.length; }

    // Les exercices écartés voyagent avec l'export : c'est le moyen le plus
    // simple de les rendre récupérables (le kiné corrige le fichier à la
    // main puis réimporte), sans construire un second écran ni un second
    // bouton juste pour ça. importer() ignore ce champ en lecture, ce qui
    // garde le format rétrocompatible avec un export produit avant ce lot.
    function exporter() {
      return JSON.stringify({ version: VERSION, exercices: exercices, exercicesEcartes: ecartes }, null, 2);
    }

    function importer(json) {
      var d;
      try { d = JSON.parse(json); }
      catch (e) { throw new Error("Lecture impossible : ce fichier n'est pas un export de Réactivité."); }
      if (!d || !Array.isArray(d.exercices)) {
        throw new Error("Format inattendu : ce fichier n'est pas un export de Réactivité.");
      }
      for (var i = 0; i < d.exercices.length; i++) {
        var erreurs = Modele.valider(d.exercices[i]);
        if (erreurs.length) {
          var ex = d.exercices[i];
          var nomEx = (ex && typeof ex === 'object' && ex.nom) || "sans nom";
          throw new Error("Exercice invalide dans le fichier : " + nomEx);
        }
      }
      var nouvelEtat = d.exercices.map(function (e) {
        if (!e.id) e.id = nouvelId();
        return e;
      });
      ecrire(nouvelEtat);
    }

    function restaurerLivres() {
      var presents = {};
      exercices.forEach(function (e) { presents[e.id] = true; });
      var nouvelEtat = exercices.slice();
      Livres.tous().forEach(function (l) { if (!presents[l.id]) nouvelEtat.push(l); });
      ecrire(nouvelEtat);
    }

    return {
      lister: lister, obtenir: obtenir, enregistrer: enregistrer,
      supprimer: supprimer, dupliquer: dupliquer,
      exporter: exporter, importer: importer, restaurerLivres: restaurerLivres,
      nbEcartes: nbEcartes
    };
  }

  var Stockage = { creer: creer, CLE: CLE };
  if (typeof module !== "undefined" && module.exports) module.exports = Stockage;
  else global.Stockage = Stockage;
})(typeof globalThis !== "undefined" ? globalThis : this);
