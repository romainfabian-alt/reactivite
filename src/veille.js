(function (global) {
  function creer() {
    var verrou = null;
    var demandeEnCours = false;

    function prendre() {
      if (!global.navigator || !global.navigator.wakeLock) return;
      // Pas de nouvelle demande si un verrou est déjà détenu ou si une demande
      // est déjà en attente : sinon la réponse la plus récente écrase la
      // référence de la précédente, qui n'est alors jamais relâchée.
      if (verrou || demandeEnCours) return;
      demandeEnCours = true;
      global.navigator.wakeLock.request("screen").then(function (v) {
        demandeEnCours = false;
        verrou = v;
      }).catch(function () {
        demandeEnCours = false;
        // Refus possible si l'onglet n'est pas au premier plan. Sans gravité :
        // l'exercice se déroule, seul le verrou manque.
      });
    }

    function relacher() {
      if (verrou) { verrou.release(); verrou = null; }
    }

    // iOS relâche le verrou dès que l'app passe en arrière-plan. Au retour,
    // on retente systématiquement : prendre() ignore l'appel si un verrou est
    // déjà détenu ou une demande déjà en cours, ce qui couvre aussi bien le
    // cas où la demande initiale avait échoué faute de premier plan.
    function surChangementVisibilite() {
      if (global.document.visibilityState === "visible") prendre();
    }

    if (global.document) {
      global.document.addEventListener("visibilitychange", surChangementVisibilite);
    }

    // Détache l'instance : retire l'écouteur et relâche le verrou. relacher()
    // garde son rôle actuel (rendre le verrou sans démonter l'instance) ;
    // detacher() sert quand une instance ne doit plus jamais être réutilisée.
    function detacher() {
      if (global.document) {
        global.document.removeEventListener("visibilitychange", surChangementVisibilite);
      }
      relacher();
    }

    return { prendre: prendre, relacher: relacher, detacher: detacher };
  }

  var Veille = { creer: creer };
  if (typeof module !== "undefined" && module.exports) module.exports = Veille;
  else global.Veille = Veille;
})(typeof globalThis !== "undefined" ? globalThis : this);
