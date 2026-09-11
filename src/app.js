(function (global) {
  var racine = document.getElementById("racine");
  var app = {
    stockage: global.Stockage.creer(global.localStorage),
    audio: global.AudioReactivite.creer(),
    veille: global.Veille.creer(),
    aller: aller,
    racine: function () { return racine; }
  };

  var demonterEcranCourant = null; // ménage de l'écran affiché, tel que déclaré par lui

  // Point de passage unique pour changer d'écran : que la navigation vienne
  // d'un bouton, d'un raccourci futur ou d'un appel ailleurs dans l'app,
  // l'écran sortant est toujours démonté ici avant que le suivant ne
  // s'installe. Un écran qui retient des ressources (verrou de veille, voix,
  // boucle d'animation) n'a ainsi qu'un seul endroit où déclarer comment les
  // rendre, au lieu de compter sur la discipline de chacun de ses boutons.
  //
  // Le try/catch couvre toute navigation, pas seulement la toute première au
  // démarrage : un écran qui échoue en pleine séance (réglages mal formés,
  // exception dans le rendu) doit afficher un message plutôt que de laisser
  // la page vide devant le patient. Le démontage de l'écran précédent est
  // couvert lui aussi : un écran qui lève en se démontant ne doit pas faire
  // échouer toute navigation ultérieure. demonterEcranCourant est remis à
  // null avant l'essai, donc un écran qui plante en cours de démontage ou de
  // construction ne laisse pas de fonction de démontage périmée pour la
  // prochaine navigation.
  function aller(nom, parametres) {
    // Retiré puis remis à null avant l'essai (jamais dans le try) : si
    // demonter() lui-même lève, demonterEcranCourant est déjà vide et ne
    // pointe pas vers une fonction de démontage déjà exécutée en partie.
    var demonter = demonterEcranCourant;
    demonterEcranCourant = null;
    try {
      if (demonter) demonter();
      racine.innerHTML = "";
      if (nom === "liste")         demonterEcranCourant = global.EcranListe.afficher(racine, app) || null;
      else if (nom === "reglages") demonterEcranCourant = global.EcranReglages.afficher(racine, app, parametres.exercice) || null;
      else if (nom === "exercice") demonterEcranCourant = global.EcranExercice.afficher(racine, app, parametres.exercice) || null;
    } catch (erreur) {
      afficherErreurNavigation(erreur);
    }
  }

  // Un échec pendant l'affichage d'un écran (stockage qui refuse d'écrire,
  // exercice mal formé, exception dans le rendu) ne doit jamais laisser la
  // page blanche : le kiné qui se relève d'à côté d'un patient doit voir un
  // message et un moyen de revenir à la liste, pas un écran vide et
  // silencieux. Le bouton retour rappelle aller() : si c'est la liste
  // elle-même qui échoue, cette fonction réaffiche cet écran d'erreur au
  // lieu de replanter en silence.
  function afficherErreurNavigation(erreur) {
    racine.innerHTML = "";
    var page = document.createElement("div");
    page.className = "page";
    var titre = document.createElement("h1");
    titre.textContent = "Réactivité a rencontré un problème";
    var message = document.createElement("p");
    message.className = "erreur";
    // Le message technique (souvent en anglais, forgé par le navigateur ou
    // une exception JavaScript) n'est pas compréhensible par un kiné en
    // pleine séance : la phrase principale reste toujours en français
    // simple, le détail technique ne sert qu'à un diagnostic éventuel.
    message.textContent = "Un réglage n'a pas pu s'afficher correctement. " +
      "Fermez l'application et relancez-la si le problème persiste.";
    var detail = document.createElement("p");
    detail.className = "detail-technique";
    detail.style.cssText = "font-size:12px;color:#8B949B;margin-top:4px;";
    detail.textContent = (erreur && erreur.message) ? erreur.message : "Erreur inattendue.";
    var retour = document.createElement("button");
    retour.className = "bouton";
    retour.textContent = "Retour à la liste des exercices";
    retour.onclick = function () { aller("liste", {}); };
    page.appendChild(titre);
    page.appendChild(message);
    page.appendChild(detail);
    page.appendChild(retour);
    racine.appendChild(page);
  }

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(function () {
      // Sans service worker l'app fonctionne toujours, elle perd seulement
      // le mode hors ligne. Rien à signaler à l'utilisateur.
    });
  }

  // Affecté avant le lancement de l'écran : même si celui-ci échoue, le
  // reste de l'app (et les tests) trouvent un global.App exploitable.
  global.App = app;

  aller("liste", {});
})(typeof globalThis !== "undefined" ? globalThis : this);
