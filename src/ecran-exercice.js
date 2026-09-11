(function (global) {
  var Rendu   = global.Rendu;
  var Moteur  = global.Moteur;
  var Modele  = global.Modele;

  function afficher(racine, app, exercice) {
    var moteur = Moteur.creer(exercice, Date.now() % 100000);
    var scene, zone, voile = null, boucle = null, origine = null, termine = false;
    var idAffiche = null; // identifiant du stimulus actuellement affiché, pour valider les "effacer"

    app.audio.debloquer();   // le geste de lancement est notre seule fenêtre sur iOS
    app.veille.prendre();

    scene = document.createElement("div");
    scene.className = "scene";
    zone = document.createElement("div");
    zone.className = "stimulus";
    scene.appendChild(zone);
    scene.onclick = basculerPause;
    racine.appendChild(scene);

    function poser(html) { zone.innerHTML = html; }
    function fondEcran(couleur) { scene.style.backgroundColor = Rendu.fond(couleur); }

    function appliquer(ev) {
      if (ev.type === "decompte") {
        fondEcran(null);
        poser('<div class="decompte">' + ev.valeur + "</div>");
        if (exercice.son.bip) app.audio.bip();
        return;
      }
      if (ev.type === "debut-serie") { fondEcran(null); poser(""); return; }

      if (ev.type === "stimulus") {
        var s = ev.stimulus;
        idAffiche = ev.idStimulus;
        if (exercice.son.bip) app.audio.bip();
        if (exercice.son.voix) app.audio.annoncer(annonce(s));

        if (exercice.son.audioSeul) { fondEcran(null); poser(""); return; }

        if (s.stop) {
          if (exercice.stop.type === "couleur") { fondEcran(exercice.stop.couleur); poser(""); }
          else { fondEcran(null); poser(Rendu.stop(Rendu.fond(exercice.stop.couleur), exercice.taille)); }
          return;
        }

        if (Modele.utiliseDirections(exercice)) {
          fondEcran(null);
          poser(Rendu.fleche(s.direction, Rendu.fond(s.couleur) === "#000000" ? "#FFFFFF" : Rendu.fond(s.couleur), exercice.taille));
        } else {
          fondEcran(s.couleur);
          poser("");
        }
        return;
      }

      if (ev.type === "effacer") {
        // Le moteur peut émettre un effacement périmé, arrivé après le
        // stimulus suivant : ne rien faire évite d'effacer à tort un
        // stimulus déjà à l'écran, faute de correspondance d'identifiant.
        if (ev.idStimulus !== idAffiche) return;
        idAffiche = null;
        fondEcran(null);
        poser("");
        return;
      }

      if (ev.type === "repos") {
        fondEcran(null);
        poser('<div class="repos"><div class="restant"></div>' +
              '<div class="suite">Série ' + ev.suivante + " sur " + exercice.series + "</div></div>");
        return;
      }

      if (ev.type === "signal-reprise") {
        if (exercice.son.signalReprise) app.audio.signalReprise();
        return;
      }

      if (ev.type === "fin") { terminer(ev); }
    }

    // Le stimulus, pas la réponse : annoncer la réponse en règle conflit
    // supprimerait tout le travail d'inhibition.
    function annonce(s) {
      if (s.stop) return "stop";
      if (s.direction) return libelle(s.direction);
      return s.couleur;
    }

    function libelle(d) {
      return { "haut": "haut", "haut-droite": "haut droite", "droite": "droite",
               "bas-droite": "bas droite", "bas": "bas", "bas-gauche": "bas gauche",
               "gauche": "gauche", "haut-gauche": "haut gauche" }[d];
    }

    function tourner(horloge) {
      // Sans ce filet, une exception levée en traitant un événement saute la
      // dernière ligne (la replanification) : la boucle s'arrête pour de bon
      // et l'exercice reste figé sur son dernier stimulus, sans le moindre
      // message pour le kinésithérapeute.
      try {
        if (origine === null) origine = horloge;
        var t = horloge - origine;

        var evts = moteur.evenementsJusqua(t);
        for (var i = 0; i < evts.length; i++) appliquer(evts[i]);

        var etat = moteur.etat(t);
        if (etat.phase === "repos") {
          var champ = zone.querySelector(".restant");
          if (champ) champ.textContent = etat.restant;
        }

        if (!termine) boucle = requestAnimationFrame(tourner);
      } catch (erreur) {
        interrompre();
      }
    }

    function interrompre() {
      // On réutilise le démontage normal (mêmes libérations qu'une sortie
      // propre), puis on affiche un écran explicite : mieux vaut un exercice
      // qui s'arrête en le disant qu'un exercice qui fait semblant de
      // continuer. Chaque étape est protégée pour qu'une seconde exception,
      // ici, ne relance jamais la boucle et ne reste jamais silencieuse.
      try {
        nettoyer();
      } catch (erreurNettoyage) {
        // Le ménage a déjà fait de son mieux ; on continue vers l'affichage
        // du message quoi qu'il arrive.
      }
      try {
        var ecran = document.createElement("div");
        ecran.className = "voile";
        var titre = document.createElement("h2");
        titre.textContent = "Exercice interrompu";
        var message = document.createElement("div");
        message.className = "bilan";
        message.textContent = "Une erreur inattendue a arrêté l'exercice.";
        ecran.appendChild(titre);
        ecran.appendChild(message);
        ecran.appendChild(bouton("Retour à la liste", function () { app.aller("liste", {}); }, "fantome"));
        racine.appendChild(ecran);
      } catch (erreurAffichage) {
        // Rien de plus à tenter : la boucle est déjà arrêtée, on ne la
        // relance pas et on ne propage pas cette seconde exception.
      }
    }

    function basculerPause() {
      if (termine) return;
      // Aucune image encore rendue : origine n'est posée qu'à la première
      // frame de tourner(). Un appui plus rapide que ça n'arrive jamais avec
      // un doigt humain, mais la garde ne coûte rien et évite un calcul sur
      // une référence absente.
      if (origine === null) return;
      var maintenant = performance.now() - origine;
      if (moteur.enPause()) return; // le voile porte les boutons, pas la scène
      moteur.pause(maintenant);
      app.audio.silence();
      voile = document.createElement("div");
      voile.className = "voile";
      voile.appendChild(bouton("Reprendre", function () {
        fermerVoile();
        moteur.reprendre(performance.now() - origine);
      }));
      voile.appendChild(bouton("Recommencer", function () {
        app.aller("exercice", { exercice: exercice });
      }));
      voile.appendChild(bouton("Quitter", function () {
        app.aller("liste", {});
      }, "fantome"));
      racine.appendChild(voile);
    }

    function fermerVoile() {
      if (voile) { voile.remove(); voile = null; }
    }

    function terminer(ev) {
      termine = true;
      app.audio.silence();
      app.veille.relacher();
      // La scène et son gestionnaire de clic n'ont plus lieu d'être sous
      // l'écran de fin : ils sont retirés plutôt que juste vidés, pour ne
      // rien laisser traîner qu'une garde doive neutraliser.
      scene.onclick = null;
      scene.remove();
      var fin = document.createElement("div");
      fin.className = "voile";
      var titre = document.createElement("h2");
      titre.textContent = "Terminé";
      var bilan = document.createElement("div");
      bilan.className = "bilan";
      bilan.textContent = ev.series + (ev.series > 1 ? " séries" : " série") +
                          " · " + ev.stimuli + " stimuli";
      fin.appendChild(titre); fin.appendChild(bilan);
      fin.appendChild(bouton("Refaire", function () { app.aller("exercice", { exercice: exercice }); }));
      fin.appendChild(bouton("Retour à la liste", function () { app.aller("liste", {}); }, "fantome"));
      racine.appendChild(fin);
    }

    // Fonction de démontage de l'écran : le routeur (app.aller) l'appelle
    // systématiquement avant d'afficher l'écran suivant, quel que soit le
    // chemin de navigation emprunté. Les boutons ci-dessus ne relâchent donc
    // plus rien eux-mêmes : ils naviguent via app.aller et laissent le
    // routeur déclencher ce ménage, qui reste ainsi unique. Sûre à appeler
    // deux fois : chaque relâchement est lui-même sans effet de bord au
    // second appel.
    function nettoyer() {
      termine = true;
      if (boucle) cancelAnimationFrame(boucle);
      app.veille.relacher();
      app.audio.silence();
      racine.innerHTML = "";
    }

    function bouton(texte, onClick, classe) {
      var b = document.createElement("button");
      b.className = "bouton " + (classe || "");
      b.textContent = texte;
      b.onclick = function (ev) { ev.stopPropagation(); onClick(); };
      return b;
    }

    boucle = requestAnimationFrame(tourner);

    return nettoyer; // rendu au routeur, qui l'appellera avant le prochain écran
  }

  global.EcranExercice = { afficher: afficher };
})(typeof globalThis !== "undefined" ? globalThis : this);
