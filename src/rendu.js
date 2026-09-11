(function (global) {
  var Modele = (typeof require !== "undefined") ? require("./modele.js") : global.Modele;

  // Géométrie unique, définie une fois pour toutes dans un carré 100×100 et
  // pointant vers le haut. Toutes les autres directions en sont une rotation :
  // épaisseur, longueur et centre optique sont donc rigoureusement identiques.
  var HAMPE = "M50 82 L50 26";
  var POINTE = "M22 46 L50 18 L78 46";

  // Dimension du carré de dessin : seule source de vérité pour le viewBox.
  var TAILLE_CARRE = 100;
  // Le centre de rotation se déduit du carré : jamais un second nombre magique
  // à maintenir à la main, jamais de rotation qui se décentre en silence.
  var CENTRE = TAILLE_CARRE / 2;
  var EPAISSEUR_FLECHE = 14;
  var EPAISSEUR_STOP = 16;

  var FORME_HEX = /^#[0-9A-Fa-f]{6}$/;

  // La taille et la couleur viennent de l'écran de réglages ou d'un exercice importé :
  // on ne les insère jamais telles quelles dans le balisage vu par le patient.
  function validerTaille(taillePct) {
    var n = Number(taillePct);
    if (isNaN(n)) {
      throw new Error("Taille invalide : " + taillePct);
    }
    return n;
  }

  function validerCouleur(couleurHex) {
    if (typeof couleurHex !== "string" || !FORME_HEX.test(couleurHex)) {
      throw new Error("Couleur invalide : " + couleurHex);
    }
    return couleurHex;
  }

  function fleche(direction, couleurHex, taillePct) {
    // hasOwnProperty plutôt que `in` : "toString" in Modele.ANGLES vaut vrai
    // (hérité d'Object.prototype), ce qui ferait passer une direction ainsi
    // nommée pour une direction connue.
    if (!Object.prototype.hasOwnProperty.call(Modele.ANGLES, direction)) {
      throw new Error("Direction inconnue : " + direction);
    }
    var taille = validerTaille(taillePct);
    var couleur = validerCouleur(couleurHex);
    var angle = Modele.ANGLES[direction];
    return '<svg viewBox="0 0 ' + TAILLE_CARRE + ' ' + TAILLE_CARRE + '" style="width: ' + taille + '%; height: auto;" ' +
           'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
             '<g transform="rotate(' + angle + ' ' + CENTRE + ' ' + CENTRE + ')" fill="none" stroke="' + couleur + '" ' +
             'stroke-width="' + EPAISSEUR_FLECHE + '" stroke-linecap="round" stroke-linejoin="round">' +
               '<path d="' + HAMPE + '"/><path d="' + POINTE + '"/>' +
             '</g>' +
           '</svg>';
  }

  function stop(couleurHex, taillePct) {
    var taille = validerTaille(taillePct);
    var couleur = validerCouleur(couleurHex);
    return '<svg viewBox="0 0 ' + TAILLE_CARRE + ' ' + TAILLE_CARRE + '" style="width: ' + taille + '%; height: auto;" ' +
           'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
             '<g fill="none" stroke="' + couleur + '" stroke-width="' + EPAISSEUR_STOP + '" stroke-linecap="round">' +
               '<path d="M26 26 L74 74"/><path d="M74 26 L26 74"/>' +
             '</g>' +
           '</svg>';
  }

  function fond(couleurNom) {
    // Contrairement à fleche(), qui lève pour une direction inconnue, fond() retombe
    // silencieusement sur le noir : un écran noir laisse l'exercice se poursuivre,
    // là où une exception l'interromprait devant le patient. Asymétrie volontaire,
    // à ne pas uniformiser.
    if (!couleurNom) return "#000000";
    return Modele.COULEURS[couleurNom] || "#000000";
  }

  var Rendu = { fleche: fleche, stop: stop, fond: fond };
  if (typeof module !== "undefined" && module.exports) module.exports = Rendu;
  else global.Rendu = Rendu;
})(typeof globalThis !== "undefined" ? globalThis : this);
