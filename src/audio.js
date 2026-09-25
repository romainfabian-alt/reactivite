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

  // Un son demandé pendant que le contexte audio est encore suspendu (juste
  // après debloquer(), avant que la reprise asynchrone n'aboutisse) est
  // rejoué dès la reprise, mais seulement s'il n'est pas trop vieux : un bip
  // qui sonnerait après le stimulus suivant serait plus trompeur que son
  // absence, donc au-delà de ce délai on l'abandonne plutôt que de le jouer
  // en retard.
  var DELAI_MAX_RATTRAPAGE_SON = 150;

  // cancel() suivi aussitôt de speak() fait perdre l'énoncé sur Safari/iOS :
  // le moteur vocal est encore occupé à traiter l'annulation quand la
  // nouvelle demande arrive, et celle-ci est abandonnée sans erreur. On
  // laisse donc ce court délai au moteur pour reprendre la main avant de
  // parler à nouveau.
  var DELAI_REPRISE_APRES_ANNULATION = 120;

  function creer() {
    var contexte = null;
    var voixFr = null;
    var syntheseVocaleDeverrouillee = false;
    var idAnnonceEnAttente = null;

    // iOS n'autorise le son qu'après un geste de l'utilisateur : on saisit
    // l'appui qui lance l'exercice pour ouvrir le contexte audio.
    function debloquer() {
      if (!contexte) {
        var C = global.AudioContext || global.webkitAudioContext;
        if (C) contexte = new C();
      }
      if (contexte && contexte.state === "suspended") contexte.resume();
      choisirVoix();
      deverrouillerSyntheseVocale();
    }

    // iOS n'exécute une demande de synthèse vocale que si le tout premier
    // speak() de la page entière a eu lieu pendant un geste utilisateur ;
    // sinon toutes les demandes suivantes, y compris celles émises depuis la
    // boucle d'animation (l'exercice "Audio seul" en dépend entièrement),
    // sont silencieusement ignorées. On consomme donc ce quota ici, une
    // seule fois par instance, avec une énonciation inaudible : rien ne doit
    // se faire entendre au kiné à cet instant.
    function deverrouillerSyntheseVocale() {
      if (syntheseVocaleDeverrouillee || !global.speechSynthesis) return;
      syntheseVocaleDeverrouillee = true;
      var u = new global.SpeechSynthesisUtterance(" ");
      u.volume = 0;
      u.lang = "fr-FR";
      global.speechSynthesis.speak(u);
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
      if (contexte.state === "suspended") {
        // La reprise du contexte (déclenchée par debloquer()) est
        // asynchrone : un bip demandé avant qu'elle n'aboutisse serait
        // perdu en silence si on l'ignorait ici. On le rejoue dès la
        // reprise, borné dans le temps pour ne pas sonner après le
        // stimulus suivant (voir DELAI_MAX_RATTRAPAGE_SON).
        var demande = Date.now();
        contexte.resume().then(function () {
          if (Date.now() - demande > DELAI_MAX_RATTRAPAGE_SON) return;
          jouer(frequence, duree, volume);
        });
        return;
      }
      jouer(frequence, duree, volume);
    }

    function jouer(frequence, duree, volume) {
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

      // Une annonce déjà programmée n'a plus d'intérêt face à ce nouveau
      // stimulus : on l'écarte plutôt que de la laisser s'empiler avec
      // celle-ci ou retarder son départ.
      if (idAnnonceEnAttente !== null) {
        global.clearTimeout(idAnnonceEnAttente);
        idAnnonceEnAttente = null;
      }

      function parler() {
        idAnnonceEnAttente = null;
        var u = new global.SpeechSynthesisUtterance(texte);
        u.lang = "fr-FR";
        u.rate = VITESSE_ELOCUTION;
        if (voixFr) u.voice = voixFr;
        global.speechSynthesis.speak(u);
      }

      // On n'annule que s'il y a réellement une annonce en cours ou en
      // attente : annuler à vide n'apporte rien et retarderait ce nouvel
      // énoncé pour rien. Quand il y a bien quelque chose à annuler, on
      // laisse le moteur reprendre la main avant de parler, sinon
      // Safari/iOS abandonne la nouvelle demande sans erreur.
      if (global.speechSynthesis.speaking || global.speechSynthesis.pending) {
        global.speechSynthesis.cancel();
        idAnnonceEnAttente = global.setTimeout(parler, DELAI_REPRISE_APRES_ANNULATION);
      } else {
        parler();
      }
    }

    function silence() {
      if (idAnnonceEnAttente !== null) {
        global.clearTimeout(idAnnonceEnAttente);
        idAnnonceEnAttente = null;
      }
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
