(function (global) {
  var Modele = global.Modele;

  var filtreActif = "tous";

  function afficher(racine, app) {
    var exercices;
    try {
      exercices = app.stockage.lister();
    } catch (erreur) {
      afficherErreur(racine, erreur, app);
      return;
    }

    racine.innerHTML = "";

    var page = document.createElement("div");
    page.className = "page";

    var entete = document.createElement("div");
    entete.className = "entete";
    entete.innerHTML = '<img src="assets/logo.svg" alt=""><h1>Réactivité</h1>';
    var plus = document.createElement("button");
    plus.className = "bouton";
    plus.textContent = "+ Nouvel exercice";
    plus.onclick = function () { app.aller("reglages", { exercice: Modele.defaut() }); };
    entete.appendChild(plus);
    page.appendChild(entete);

    // Un exercice écarté au chargement (devenu invalide depuis son dernier
    // enregistrement) n'est pas perdu — voir Stockage.charger() — mais reste
    // invisible tant qu'on ne le dit pas : le kiné doit savoir qu'il existe
    // encore et comment le récupérer, sans quoi il croira l'avoir perdu.
    var nbEcartes = 0;
    try { nbEcartes = app.stockage.nbEcartes(); } catch (erreur) { nbEcartes = 0; }
    if (nbEcartes > 0) page.appendChild(avisEcartes(nbEcartes));

    // Le filtre n'apparaît qu'au-delà de six exercices : en dessous, il occupe
    // de la place sans rien résoudre.
    if (exercices.length > 6) page.appendChild(barreFiltres(racine, app));

    var visibles = exercices.filter(function (e) {
      return filtreActif === "tous" || e.mode === filtreActif;
    });

    if (visibles.length === 0) {
      var vide = document.createElement("p");
      vide.className = "vide";
      // Un filtre actif qui masque tout n'est pas la même situation qu'une
      // bibliothèque vraiment vide : le kiné ne doit pas croire qu'il a tout
      // perdu alors que ses exercices existent toujours, juste filtrés.
      if (filtreActif !== "tous" && exercices.length > 0) {
        vide.textContent = "Aucun exercice pour ce filtre. D'autres exercices existent : touchez « Tous » pour les revoir, ou « + Nouvel exercice » pour en créer un.";
      } else {
        vide.textContent = "Aucun exercice ici. Touchez « + Nouvel exercice » pour en créer un.";
      }
      page.appendChild(vide);
    }

    visibles.forEach(function (e) { page.appendChild(carte(e, racine, app)); });

    page.appendChild(outils(racine, app));
    racine.appendChild(page);
  }

  // Filet de sécurité pour toute lecture du stockage qui échoue : la page ne
  // doit jamais rester blanche, même en dehors du tout premier lancement.
  // Même titre et même bouton de retour que l'écran d'erreur de app.js : le
  // kiné qui voit l'un ou l'autre doit reconnaître la même situation.
  function afficherErreur(racine, erreur, app) {
    racine.innerHTML = "";
    var page = document.createElement("div");
    page.className = "page";
    var titre = document.createElement("h1");
    titre.textContent = "Réactivité a rencontré un problème";
    var message = document.createElement("p");
    message.className = "erreur";
    message.textContent = "La liste des exercices n'a pas pu s'afficher. " +
      "Fermez l'application et relancez-la si le problème persiste.";
    var detail = document.createElement("p");
    detail.style.cssText = "font-size:12px;color:#8B949B;margin-top:4px;";
    detail.textContent = (erreur && erreur.message) ? erreur.message : "Erreur inattendue.";
    var retour = document.createElement("button");
    retour.className = "bouton";
    retour.textContent = "Retour à la liste des exercices";
    retour.onclick = function () { app.aller("liste", {}); };
    page.appendChild(titre);
    page.appendChild(message);
    page.appendChild(detail);
    page.appendChild(retour);
    racine.appendChild(page);
  }

  function avisEcartes(nb) {
    var p = document.createElement("p");
    p.className = "vide";
    p.textContent = (nb === 1
        ? "1 exercice n'a pas pu être chargé (réglages devenus incompatibles)."
        : nb + " exercices n'ont pas pu être chargés (réglages devenus incompatibles).") +
      " Ils sont conservés et restent récupérables via « Exporter ».";
    return p;
  }

  function barreFiltres(racine, app) {
    var barre = document.createElement("div");
    barre.className = "filtres";
    [["tous", "Tous"], ["directions", "Directions"],
     ["couleurs", "Couleurs"], ["mixte", "Mixte"]].forEach(function (f) {
      var b = document.createElement("button");
      b.className = "filtre";
      b.textContent = f[1];
      b.setAttribute("aria-pressed", String(filtreActif === f[0]));
      b.onclick = function () { filtreActif = f[0]; afficher(racine, app); };
      barre.appendChild(b);
    });
    return barre;
  }

  function carte(e, racine, app) {
    var c = document.createElement("div");
    c.className = "carte";

    var infos = document.createElement("button");
    infos.className = "infos";
    infos.style.textAlign = "left";
    infos.innerHTML = '<div class="nom"></div><div class="detail"></div>';
    infos.querySelector(".nom").textContent = e.nom;
    infos.querySelector(".detail").textContent = Modele.resume(e);
    infos.onclick = function () { app.aller("exercice", { exercice: e }); };

    var crayon = document.createElement("button");
    crayon.className = "icone";
    crayon.setAttribute("aria-label", "Modifier " + e.nom);
    crayon.textContent = "✎";
    crayon.onclick = function () { app.aller("reglages", { exercice: e }); };

    var poubelle = document.createElement("button");
    poubelle.className = "icone";
    poubelle.setAttribute("aria-label", "Supprimer " + e.nom);
    poubelle.textContent = "🗑";
    poubelle.onclick = function () {
      if (confirm("Supprimer « " + e.nom + " » ?")) {
        try {
          app.stockage.supprimer(e.id);
          afficher(racine, app);
        } catch (err) {
          // Sans ce filet, l'exception meurt dans le gestionnaire de clic et
          // le kiné croit l'exercice supprimé alors qu'il ne l'est pas.
          alert(err.message);
        }
      }
    };

    c.appendChild(infos); c.appendChild(crayon); c.appendChild(poubelle);
    return c;
  }

  function outils(racine, app) {
    var barre = document.createElement("div");
    barre.className = "barre-bas";

    var exporter = document.createElement("button");
    exporter.className = "bouton fantome";
    exporter.textContent = "Exporter";
    exporter.onclick = function () { exporterSauvegarde(racine, app); };

    var importer = document.createElement("button");
    importer.className = "bouton fantome";
    importer.textContent = "Importer";
    var champ = document.createElement("input");
    champ.type = "file";
    champ.accept = "application/json";
    champ.hidden = true;
    champ.onchange = function () {
      var f = champ.files[0];
      // Vidé tout de suite : sinon réimporter deux fois de suite le même
      // fichier ne redéclenche pas onchange, faute de changement de valeur.
      champ.value = "";
      if (!f) return;
      var lecteur = new FileReader();
      lecteur.onload = function () {
        try { app.stockage.importer(lecteur.result); afficher(racine, app); }
        catch (err) { alert(err.message); }
      };
      lecteur.readAsText(f);
    };
    importer.appendChild(champ);
    importer.onclick = function () { champ.click(); };

    var restaurer = document.createElement("button");
    restaurer.className = "bouton fantome";
    restaurer.textContent = "Exercices d'origine";
    restaurer.onclick = function () {
      try {
        app.stockage.restaurerLivres();
        afficher(racine, app);
      } catch (err) {
        // Même filet que pour la suppression : une restauration silencieusement
        // ratée est pire qu'un message d'erreur.
        alert(err.message);
      }
    };

    barre.appendChild(exporter); barre.appendChild(importer); barre.appendChild(restaurer);
    return barre;
  }

  function autonome() {
    return global.navigator.standalone === true ||
      (typeof global.matchMedia === "function" &&
       global.matchMedia("(display-mode: standalone)").matches);
  }

  // L'export est l'unique sauvegarde d'exercices qui représentent des heures
  // de réglage : on essaie les moyens du plus fiable sur iPad au plus
  // universel, plutôt que de supposer qu'un lien de téléchargement suffit.
  function exporterSauvegarde(racine, app) {
    var contenu = app.stockage.exporter();
    var nomFichier = "reactivite-exercices.json";
    var fichier;
    try {
      fichier = new File([contenu], nomFichier, { type: "application/json" });
    } catch (e) {
      fichier = new Blob([contenu], { type: "application/json" });
    }

    // 1. Le partage natif : le bon geste sur iPad, mais seulement si le
    // navigateur confirme savoir partager CE fichier précis, pas juste texte.
    var partage = global.navigator && typeof global.navigator.share === "function" &&
      typeof global.navigator.canShare === "function" &&
      global.navigator.canShare({ files: [fichier] });

    if (partage) {
      global.navigator.share({ files: [fichier], title: "Exercices Réactivité" }).catch(function (err) {
        // L'utilisateur qui ferme la feuille de partage sans rien choisir
        // n'a commis aucune erreur : rien à lui signaler.
        if (err && err.name === "AbortError") return;
        secoursExport(racine, contenu, nomFichier);
      });
      return;
    }

    // 2. Le téléchargement classique par lien, réservé aux contextes où il a
    // une chance de fonctionner : jamais dans une app installée sur l'écran
    // d'accueil, où ce mécanisme est notoirement silencieux en cas d'échec.
    if (!autonome() && document.createElement("a").download !== undefined) {
      try {
        var a = document.createElement("a");
        var url = URL.createObjectURL(fichier);
        a.href = url;
        a.download = nomFichier;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Certains navigateurs traitent le téléchargement de façon différée :
        // on ne libère l'adresse temporaire qu'après un court délai.
        global.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
        return;
      } catch (e) {
        // On tombe dans le dernier recours ci-dessous.
      }
    }

    // 3. Dernier recours qui ne peut pas échouer : le contenu affiché,
    // sélectionnable, avec un bouton pour le copier dans le presse-papiers.
    secoursExport(racine, contenu, nomFichier);
  }

  function secoursExport(racine, contenu, nomFichier) {
    var voile = document.createElement("div");
    voile.className = "voile";

    var titre = document.createElement("h2");
    titre.textContent = "Sauvegarde de vos exercices";
    voile.appendChild(titre);

    var explication = document.createElement("p");
    explication.className = "bilan";
    explication.textContent = "Le partage et le téléchargement ne sont pas possibles ici. Copiez ce texte et collez-le dans un fichier (" + nomFichier + ") ou un message pour le conserver.";
    voile.appendChild(explication);

    var zone = document.createElement("textarea");
    zone.className = "secours-export";
    zone.value = contenu;
    zone.readOnly = true;
    voile.appendChild(zone);

    var copier = document.createElement("button");
    copier.className = "bouton";
    copier.textContent = "Copier";
    copier.onclick = function () {
      zone.focus();
      zone.select();
      var revenirAuLibelle = function () {
        global.setTimeout(function () { copier.textContent = "Copier"; }, 1500);
      };
      if (global.navigator.clipboard && global.navigator.clipboard.writeText) {
        global.navigator.clipboard.writeText(contenu).then(function () {
          copier.textContent = "Copié";
          revenirAuLibelle();
        }).catch(function () {
          try { document.execCommand("copy"); copier.textContent = "Copié"; revenirAuLibelle(); }
          catch (e) { /* le texte reste sélectionné, le kiné peut copier à la main */ }
        });
      } else {
        try { document.execCommand("copy"); copier.textContent = "Copié"; revenirAuLibelle(); }
        catch (e) { /* le texte reste sélectionné, le kiné peut copier à la main */ }
      }
    };
    voile.appendChild(copier);

    var fermer = document.createElement("button");
    fermer.className = "bouton fantome";
    fermer.textContent = "Fermer";
    fermer.onclick = function () { voile.remove(); };
    voile.appendChild(fermer);

    racine.appendChild(voile);
    zone.focus();
    zone.select();
  }

  global.EcranListe = { afficher: afficher };
})(typeof globalThis !== "undefined" ? globalThis : this);
