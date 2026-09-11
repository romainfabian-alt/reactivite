(function (global) {
  var FREQUENCE_BIP = 880;              // bip standard, chaque changement de cible
  var DUREE_BIP = 0.07;
  var VOLUME_BIP = 0.25;

  var FREQUENCE_REPRISE = 660;          // signal de reprise après une pause, plus grave que le bip
  var DUREE_REPRISE = 0.18;
  var VOLUME_REPRISE = 0.30;

  // La rampe exponentielle du navigateur lève une exception si on lui demande
  // d'atteindre zéro : on vise donc une valeur minuscule plutôt que le silence exact.
  var VOLUME_PLANCHER_EXTINCTION = 0.0001;

  var VITESSE_ELOCUTION = 1.15; // un peu vif : la consigne doit tomber sans traîner

  function creer() {
    var contexte = null;
    var voixFr = null;

    // iOS n'autorise le son qu'après un geste de l'utilisateur : on saisit
    // l'appui qui lance l'exercice pour ouvrir le contexte audio.
    function debloquer() {
      if (!contexte) {
        var C = global.AudioContext || global.webkitAudioContext;
        if (C) contexte = new C();
      }
      if (contexte && contexte.state === "suspended") contexte.resume();
      choisirVoix();
    }

    function choisirVoix() {
      if (voixFr || !global.speechSynthesis) return;
      var voix = global.speechSynthesis.getVoices() || [];
      for (var i = 0; i < voix.length; i++) {
        if (voix[i].lang && voix[i].lang.indexOf("fr") === 0) { voixFr = voix[i]; return; }
      }
    }

    function ton(frequence, duree, volume) {
      if (!contexte) return;
      var o = contexte.createOscillator(), g = contexte.createGain();
      o.type = "sine";
      o.frequency.value = frequence;
      g.gain.setValueAtTime(volume, contexte.currentTime);
      // Extinction exponentielle : un arrêt net produit un claquement audible.
      g.gain.exponentialRampToValueAtTime(VOLUME_PLANCHER_EXTINCTION, contexte.currentTime + duree);
      o.connect(g); g.connect(contexte.destination);
      o.start(); o.stop(contexte.currentTime + duree);
    }

    function bip()           { ton(FREQUENCE_BIP, DUREE_BIP, VOLUME_BIP); }
    function signalReprise() { ton(FREQUENCE_REPRISE, DUREE_REPRISE, VOLUME_REPRISE); }

    function annoncer(texte) {
      if (!global.speechSynthesis) return;
      choisirVoix();
      var u = new global.SpeechSynthesisUtterance(texte);
      u.lang = "fr-FR";
      u.rate = VITESSE_ELOCUTION;
      if (voixFr) u.voice = voixFr;
      global.speechSynthesis.cancel(); // la consigne précédente n'a plus d'intérêt
      global.speechSynthesis.speak(u);
    }

    function silence() {
      if (global.speechSynthesis) global.speechSynthesis.cancel();
    }

    // La liste des voix se charge de façon asynchrone sur iOS : au tout
    // premier appel elle est souvent vide. On se branche sur l'événement qui
    // signale sa disponibilité pour choisir la voix dès que possible, plutôt
    // que d'attendre la première annonce.
    if (global.speechSynthesis && global.speechSynthesis.addEventListener) {
      global.speechSynthesis.addEventListener("voiceschanged", choisirVoix);
    }

    return {
      debloquer: debloquer, bip: bip, signalReprise: signalReprise,
      annoncer: annoncer, silence: silence
    };
  }

  var Audio = { creer: creer };
  if (typeof module !== "undefined" && module.exports) module.exports = Audio;
  else global.AudioReactivite = Audio;
})(typeof globalThis !== "undefined" ? globalThis : this);
