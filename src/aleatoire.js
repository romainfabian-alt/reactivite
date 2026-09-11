(function (global) {
  // Générateur mulberry32 : court, rapide, de qualité largement suffisante ici,
  // et surtout déterministe, ce qui rend le générateur de stimuli testable.
  function creer(graine) {
    var etat = (graine >>> 0) || 1;

    function reel() {
      etat = (etat + 0x6D2B79F5) >>> 0;
      var t = etat;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function entier(n) { return Math.floor(reel() * n); }
    function parmi(liste) { return liste[entier(liste.length)]; }
    function chance(pourcentage) { return reel() * 100 < pourcentage; }

    return { reel: reel, entier: entier, parmi: parmi, chance: chance };
  }

  var Aleatoire = { creer: creer };
  if (typeof module !== "undefined" && module.exports) module.exports = Aleatoire;
  else global.Aleatoire = Aleatoire;
})(typeof globalThis !== "undefined" ? globalThis : this);
