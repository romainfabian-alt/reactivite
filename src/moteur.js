(function (global) {
  var Generateur = (typeof require !== "undefined") ? require("./generateur.js") : global.Generateur;

  var PREAVIS_REPRISE = 3000; // le patient doit avoir le temps de se remettre en position

  // Durée d'une série : imposée par le réglage quand le critère est une durée,
  // déduite du dernier écart sinon, pour que le dernier stimulus reste visible
  // aussi longtemps que les autres.
  function dureeSerie(e, stimuli) {
    if (e.fin.type === "duree") return e.fin.duree * 1000;
    if (stimuli.length === 0) return 0;
    var dernier = stimuli[stimuli.length - 1];
    var ecart = stimuli.length > 1 ? dernier.t - stimuli[stimuli.length - 2].t : 1000;
    return dernier.t + ecart;
  }

  function construire(e, graine) {
    var programme = [], t = 0, total = 0, s;
    // Identifiant global du stimulus : l'index posé par le générateur repart
    // de zéro à chaque série, il ne peut donc pas servir à lui seul à
    // distinguer un stimulus sur l'ensemble du programme.
    var idStimulus = 0;

    for (s = 1; s <= e.series; s++) {
      if (e.decompte) {
        programme.push({ t: t,        type: "decompte", valeur: 3 });
        programme.push({ t: t + 1000, type: "decompte", valeur: 2 });
        programme.push({ t: t + 2000, type: "decompte", valeur: 1 });
        t += 3000;
      }

      programme.push({ t: t, type: "debut-serie", serie: s });

      // Une graine différente par série : sans cela, la série 2 rejouerait
      // exactement la série 1 et le patient anticiperait.
      var stimuli = Generateur.serie(e, graine + s * 1000);
      var finSerie = t + dureeSerie(e, stimuli);
      var i;
      for (i = 0; i < stimuli.length; i++) {
        var id = idStimulus++;
        programme.push({ t: t + stimuli[i].t, type: "stimulus", serie: s, stimulus: stimuli[i], idStimulus: id });
        if (!e.affichage.persistant) {
          var instantEffacement = t + stimuli[i].t + e.affichage.duree;
          if (i + 1 < stimuli.length) {
            // Le stimulus suivant remplace de toute façon l'affichage : un
            // effacement qui tomberait après lui n'a plus de sens et
            // effacerait à tort ce stimulus suivant.
            var instantSuivant = t + stimuli[i + 1].t;
            if (instantEffacement <= instantSuivant) {
              programme.push({ t: instantEffacement, type: "effacer", idStimulus: id });
            }
          } else {
            // Dernier stimulus de la série : pas de suivant pour le
            // remplacer, l'effacement reste programmé mais ne doit pas
            // déborder au-delà de la fin de série.
            programme.push({ t: Math.min(instantEffacement, finSerie), type: "effacer", idStimulus: id });
          }
        }
      }
      total += stimuli.length;
      t = finSerie;

      if (s < e.series) {
        var repos = e.repos * 1000;
        programme.push({ t: t, type: "repos", serie: s, duree: repos, suivante: s + 1 });
        if (e.son.signalReprise && repos > PREAVIS_REPRISE) {
          programme.push({ t: t + repos - PREAVIS_REPRISE, type: "signal-reprise" });
        }
        t += repos;
      }
    }

    programme.push({ t: t, type: "fin", series: e.series, stimuli: total });

    // Tri stable sur l'instant : un effacement et le stimulus suivant peuvent
    // tomber au même moment, l'ordre d'insertion doit alors être conservé.
    return programme
      .map(function (ev, i) { return { ev: ev, i: i }; })
      .sort(function (a, b) { return (a.ev.t - b.ev.t) || (a.i - b.i); })
      .map(function (x) { return x.ev; });
  }

  function creer(e, graine) {
    var programme = construire(e, graine);
    var curseur = 0;          // index du prochain événement non encore rendu
    var decalage = 0;         // somme des pauses déjà écoulées
    var instantPause = null;

    function logique(t) { return (instantPause === null ? t : instantPause) - decalage; }

    function evenementsJusqua(t) {
      var limite = logique(t), sortie = [];
      while (curseur < programme.length && programme[curseur].t <= limite) {
        sortie.push(programme[curseur]);
        curseur++;
      }
      return sortie;
    }

    function etat(t) {
      var l = logique(t), phase = "attente", serie = 0, restant = 0, i;
      for (i = 0; i < programme.length; i++) {
        if (programme[i].t > l) break;
        var ev = programme[i];
        if (ev.type === "decompte")    { phase = "decompte"; }
        if (ev.type === "debut-serie") { phase = "serie"; serie = ev.serie; }
        if (ev.type === "repos")       { phase = "repos"; restant = Math.ceil((ev.t + ev.duree - l) / 1000); }
        if (ev.type === "fin")         { phase = "fini"; }
      }
      return { phase: phase, serie: serie, restant: restant };
    }

    function pause(t)     { if (instantPause === null) instantPause = t; }
    function reprendre(t) {
      if (instantPause === null) return;
      decalage += t - instantPause;
      instantPause = null;
    }

    var dernier = programme[programme.length - 1];
    return {
      programme: function () { return programme; },
      evenementsJusqua: evenementsJusqua,
      etat: etat,
      pause: pause,
      reprendre: reprendre,
      enPause: function () { return instantPause !== null; },
      total: function () { return { series: dernier.series, stimuli: dernier.stimuli }; }
    };
  }

  var Moteur = { creer: creer };
  if (typeof module !== "undefined" && module.exports) module.exports = Moteur;
  else global.Moteur = Moteur;
})(typeof globalThis !== "undefined" ? globalThis : this);
