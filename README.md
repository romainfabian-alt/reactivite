# Réactivité

Générateur de stimuli visuels (flèches, couleurs, go / no-go) pour le travail
de la réactivité en kinésithérapie du sport. L'app est posée sur l'iPad,
face au patient : c'est lui qui regarde l'écran, pas lui qui le touche.
Elle ne conserve **aucune donnée patient et aucun historique de séance**,
seuls les exercices eux-mêmes (leurs réglages) sont mémorisés.

## Installer sur l'iPad

1. Ouvrir l'adresse de l'app dans Safari.
2. Appuyer sur le bouton Partager (le carré avec la flèche vers le haut).
3. Choisir « Sur l'écran d'accueil ».

Une icône « Réactivité » apparaît alors sur l'écran d'accueil, à côté des
autres apps. En l'ouvrant depuis cette icône, l'app se lance en plein écran,
sans barre d'adresse Safari, et continue de fonctionner même en **mode
avion**. C'est ce qui compte au cabinet : la connexion Wi-Fi n'est pas
toujours fiable, et une séance ne doit jamais dépendre d'elle.

## Sauvegarder ses exercices

Les exercices que vous créez ou réglez ne sont pas stockés en ligne : ils
vivent uniquement dans la mémoire de l'iPad, via l'app installée. Cela veut
dire qu'ils **disparaîtraient** si :

- l'icône de l'app est supprimée de l'écran d'accueil,
- les données de Safari sont effacées (Réglages, une remise à zéro, etc.),
- l'iPad est restauré ou changé.

Le temps passé à régler un exercice (directions, couleurs, durées, règles du
mode mixte...) serait alors perdu. C'est pour ça qu'il faut sauvegarder de
temps en temps :

- Le bouton **Exporter**, sur l'écran d'accueil de l'app, tente d'abord le
  partage natif d'iOS : la feuille de partage s'ouvre, et vous pouvez
  enregistrer le fichier dans l'app Fichiers (par exemple dans iCloud Drive)
  ou l'envoyer par un autre moyen (mail, AirDrop...). C'est le geste à
  privilégier. Rangez le fichier obtenu (`reactivite-exercices.json`)
  quelque part où vous le retrouverez, par exemple dans un dossier
  « Réactivité » sur iCloud Drive.
- Le bouton **Importer** recharge un fichier de ce type et restitue la
  bibliothèque d'exercices à l'identique.

Faites un export après chaque séance de réglage un peu longue.

## Les six exercices livrés

L'app arrive avec six exercices déjà prêts, qui couvrent les trois modes et
toutes les règles du mode mixte :

- **Découverte — 4 directions** : suivre une flèche parmi haut, bas, gauche,
  droite, à rythme fixe. Pour débuter.
- **Huit directions — rythme libre** : suivre une flèche parmi les huit
  directions (cardinales et diagonales), à intervalle aléatoire.
- **Couleurs — consigne orale** : réagir à une couleur affichée, la consigne
  (que faire de chaque couleur) est donnée à l'oral par le kiné.
- **Code couleur — la couleur est la direction** : la couleur remplace la
  flèche et code elle-même la direction à suivre (règle C du mode mixte).
- **Distracteur — ignorer la couleur** : suivre la flèche affichée sans se
  laisser distraire par sa couleur, qui n'a aucun sens ici (règle B du mode
  mixte).
- **Conflit + stop — montée en intensité** : une couleur dit s'il faut suivre
  la flèche ou faire l'inverse (règle A), avec en plus un signal d'arrêt
  (go / no-go) et un rythme qui s'accélère au fil de la série.

Pour mémoire, les trois règles du mode mixte que ces exercices illustrent :
la couleur qui dit s'il faut suivre la flèche ou faire l'inverse, la couleur
qui ne sert que de distracteur (elle n'a pas de sens, elle teste la
concentration), et la couleur qui remplace la flèche en codant elle-même la
direction.

Si un ou plusieurs de ces exercices ont été supprimés ou modifiés par erreur,
le bouton **« Exercices d'origine »** les restaure sans toucher à vos propres
exercices.

## Accès guidé

Pendant une séance, il est utile de verrouiller l'iPad sur l'app pour éviter
qu'un appui accidentel n'en sorte. iOS propose cette fonction sous le nom
**Accès guidé**, dans Réglages > Accessibilité > Accès guidé. Une fois
activée, un triple-clic sur le bouton latéral (ou Accueil) verrouille l'app
au premier plan.

## Développer

- `bash lancer-tests.command` (ou `node --test`) lance la suite de tests :
  elle doit être entièrement verte, dont un test qui vérifie que la liste
  des fichiers mis en cache par le service worker reste cohérente avec le
  reste du projet. Ce test protège le fonctionnement hors ligne d'une
  dérive silencieuse.
- `node ~/.claude/serveur-statique.js . 8123` sert l'app en local, sur
  `http://localhost:8123/`. N'importe quel autre serveur statique fait
  aussi l'affaire, l'app ne dépend d'aucun backend.
- Les règles de modification du projet, notamment l'incrémentation
  obligatoire du numéro de version du cache après toute modification d'un
  fichier servi hors ligne, sont dans `CLAUDE.md`. À lire avant de toucher au
  code.

## Mettre en ligne

L'app doit être hébergée en HTTPS pour fonctionner. **Ce n'est pas
négociable** : sans HTTPS, le navigateur refuse d'activer le service worker
qui met les fichiers en cache, et sans lui, pas de fonctionnement hors ligne.
C'est toute la raison d'être du choix technique de cette app.

Deux hébergements gratuits et simples, tous les deux en HTTPS par défaut :

1. **GitHub Pages** : pousser ce dépôt sur GitHub, puis activer Pages dans
   les réglages du dépôt (Settings > Pages), en pointant sur la branche
   principale. L'adresse est fournie automatiquement par GitHub.
2. **Netlify** : glisser-déposer le dossier du projet sur
   [app.netlify.com/drop](https://app.netlify.com/drop), ou relier le dépôt
   GitHub pour un déploiement automatique à chaque mise à jour.

Ces étapes se font avec vos comptes personnels : ce n'est pas quelque chose
qu'une session d'assistant peut faire à votre place.

Une fois l'app en ligne, c'est cette adresse HTTPS qu'il faut ouvrir dans
Safari sur l'iPad pour l'installer (voir plus haut).

---

## Recette sur l'iPad

À dérouler une fois l'app mise en ligne. Cocher au fur et à mesure.

- [ ] Installer l'app : Partager, puis « Sur l'écran d'accueil ». L'icône
      montre les quatre chevrons cuivre, le libellé est « Réactivité »
- [ ] Activer le mode avion, puis lancer l'app depuis l'icône : elle s'ouvre
      en plein écran, sans barre Safari, et fonctionne normalement
- [ ] Depuis l'ouverture de l'app, lancer un exercice enregistré en deux
      appuis
- [ ] Poser l'iPad à 3 mètres, lancer « Huit directions » : les huit flèches
      sont lisibles à cette distance, avec la même graisse et la même
      longueur, diagonales comme cardinales
- [ ] Laisser tourner un exercice de plusieurs séries sans toucher l'iPad :
      l'écran ne s'éteint jamais pendant l'exercice
- [ ] Lancer les exercices du mode mixte et vérifier chacune des règles :
      la couleur qui dit de suivre la flèche ou de faire l'inverse
      (« Conflit + stop »), la couleur qui ne sert que de distracteur
      (« Distracteur »), la couleur qui remplace la flèche et code
      elle-même la direction (« Code couleur »), et le signal d'arrêt
      go / no-go de « Conflit + stop »
- [ ] Toujours à 3 mètres, lancer « Code couleur » puis « Conflit + stop » :
      le rouge et le vert se distinguent sans hésiter, et le vert ne se
      confond pas avec le jaune. Ces deux couples ont été choisis pour
      rester distinguables par un patient daltonien ; si l'un d'eux hésite
      sur l'écran réel, remplacer une des couleurs de l'exercice concerné
- [ ] Créer un exercice, le dupliquer, le modifier, puis le supprimer
- [ ] Exporter la bibliothèque, supprimer un exercice, réimporter : la
      bibliothèque revient à l'identique
- [ ] Tester le son : bip à chaque changement de cible, voix française sur
      les exercices qui en ont, signal de reprise trois secondes avant la
      fin du repos
- [ ] Verrouiller l'orientation de l'iPad en mode paysage (le rond avec la
      flèche dans le Centre de contrôle) et vérifier que l'app reste bien
      affichée en paysage
- [ ] Activer l'Accès guidé (Réglages, Accessibilité, Accès guidé) et
      vérifier que l'app s'y verrouille
- [ ] Mettre en ligne une nouvelle version de l'app, puis vérifier qu'elle
      finit par arriver sur l'iPad (il peut être nécessaire de rouvrir l'app
      une deuxième fois, le temps que le service worker télécharge la
      nouvelle version en tâche de fond)
