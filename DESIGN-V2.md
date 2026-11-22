# OCTOBRE — Refonte d’interface V2

## Direction artistique

L’interface adopte un langage de **studio de création local** : fond graphite, cartes en relief discret, accents cuivre et touches lavande. La mascotte reste au centre de l’identité, sans masquer les tâches de l’utilisateur.

## Système visuel

- **Couleurs et thèmes** : variables CSS redéfinies dans `interface/redesign.css`, avec une variante `body.light`.
- **Rythme** : navigation structurée en sections, en-tête homogène, cadres arrondis et traitement des messages.
- **Accueil** : introduction en deux colonnes, mascotte en mouvement, trois actions de démarrage réelles via `data-prompt`.
- **Actions** : barre de saisie compacte, commandes existantes préservées, labels clairs et raccourcis clavier rappelés.
- **Adaptation** : écran large, tablette et mobile ; sous 761 px, le menu ouvre un tiroir latéral.
- **Accessibilité** : états de focus, boutons nommés et `aria-expanded` sur le menu mobile ; préférences de réduction des animations respectées.

## Fichiers

L’HTML de production `interface/index.html` et celui de l’aperçu `APERCU.html` exposent les mêmes identifiants DOM. Aucun identifiant d’API n’a été changé. Le style est ajouté en surcharge afin de conserver les sources initiales et faciliter un retour arrière.

## Vérifications

Aperçu HTML/JS exécuté sur Chromium : affichage de l’accueil, navigation vers Paramètres, changement d’apparence de la mascotte, menu mobile et clic sur un raccourci de discussion avec réponse fictive. Le serveur réel et les moteurs IA ne sont pas inclus dans ce kit ; leurs intégrations n’ont donc pas été testées ici.

## Aperçus

`apercus/accueil.png`, `apercus/parametres.png`, `apercus/activite.png` et `apercus/mobile.png`.

---

# OCTOBRE — Finitions V3 : boutons, pictogrammes, menus déroulants

La V3 ne remplace pas la V2 : elle ajoute une couche de finition `interface/theme.css`
chargée **après** `redesign.css`, plus le comportement des menus dans `redesign.js`.
Les identifiants DOM et les routes `/api/` restent identiques.

## Boutons

- **Bouton principal** : dégradé cuivré, liseré clair, ombre interne et animation de
  pression ; le survol éclaircit sans changer de couleur de texte.
- **Bouton « Nouvelle discussion »** : pictogramme `+` en pastille de masque CSS,
  libellé centré, flèche discrète qui s’anime au survol.
- **Navigation latérale** : chaque entrée reçoit une pastille de pictogramme qui
  s’éclaire au survol et prend le dégradé cuivre à l’état actif.
- **Boutons de la barre de saisie** : hauteur constante, icône + libellé, survol
  cuivre, pilule « Parler » qui se colore quand la case est cochée, bouton
  « Dicter » à trois états (micro / pastille d’enregistrement / roue de transcription).
- **Boutons secondaires des pages** : `Actualiser`, `Rechercher`, `Exécuter`,
  `Restaurer`, `Révoquer`… reçoivent le pictogramme correspondant (les boutons créés
  dynamiquement par `app.js`/`tools.js` sont décorés automatiquement).

## Pictogrammes

- Jeu de **39 SVG au trait** (24 × 24, extrémités arrondies), livré en variables CSS
  (`--ico-*`) sous forme de masques : ils héritent toujours de la couleur du texte,
  y compris en thème clair, et restent nets à toutes les tailles.
- Plus aucun emoji dans l’interface : micro, capture, image, haut-parleur, arrêt,
  extraction de procédure, import, recherche, corbeille, etc.
- Les menus natifs utilisent un **chevron dessiné** en `background-image` (aucune
  dépendance, aucun appel réseau).

## Menus déroulants

- **Menu rapide de l’en-tête** (bouton `…`) : panneau flottant listant les sept
  sections avec leur rang `1`–`7`, l’état actif, la bascule d’apparence et
  « Nouvelle discussion ». Navigation clavier complète : `Ctrl K` (ou `⌘ K`) pour
  ouvrir, `↑`/`↓`, `1`–`7`, `Échap`, clic extérieur, restitution du focus.
- **Menus natifs `<select>`** (voix active, mode de réponse, aperçu de la mascotte,
  animation, mouvement) : apparence homogène, chevron personnalisé, état de focus
  en anneau cuivre — les options restent celles du système, donc accessibles.
- **Menus repliables** (`<details>`) : chevron rotatif, en-têtes alignés, survol
  cohérent (projets, outils, missions).
- **Cases à cocher et boutons radio** personnalisés : coche dessinée, anneau des
  pastilles de style, contraste vérifié sur les deux thèmes.
- **Tiroir mobile** : pictogrammes et libellés sur une ligne, historique compact
  tronqué proprement, ouverture/fermeture avec `Échap`, clic extérieur et
  restitution du focus.

## Fichiers ajoutés ou modifiés en V3

- `interface/theme.css` (ajouté) : toute la couche V3, sans règle de comportement.
- `interface/redesign.js` : tiroir mobile + menu rapide + décoration des boutons
  générés par `app.js` (aucun appel réseau).
- `interface/app.js`, `interface/tools.js`, `interface/identity.js` : pictogrammes des
  boutons créés à la volée et libellé de dictée à trois états.
- `APERCU.html`, `interface/index.html`, `APPAIRAGE.html`, `interface/pair.html` :
  mêmes identifiants, pictogrammes en ligne, menu rapide, chargement de `theme.css`.

## Accessibilité

- `aria-expanded`, `aria-haspopup`, `aria-controls`, `role="menu"`/`menuitem`,
  `aria-current` synchronisé, focus visible sur tous les contrôles.
- `Échap` referme le menu rapide et le tiroir, le focus revient au déclencheur.
- Les animations (anneau de statut, roue de transcription, ouverture du panneau)
  sont désactivées avec `prefers-reduced-motion`.
- Le titre de page garde `tabindex="-1"` pour l’annonce lecteur d’écran, sans anneau
  de focus parasite.

## Vérifications V3

Rendu exécuté sur Chromium (1440 × 900, 390 × 844) : accueil, menu rapide ouvert au
clavier et à la souris, navigation par le menu, bascule clair/sombre, Paramètres
(cases, radios, menus), Outils, Projets, Diagnostic, tiroir mobile et page
d’appairage. Aucune erreur JavaScript ; les identifiants DOM de `APERCU.html` et de
`interface/index.html` sont restés identiques.

## Aperçus V3

`apercus/accueil.png`, `apercus/menu-rapide.png`, `apercus/parametres.png`,
`apercus/outils-clair.png`, `apercus/mobile.png`, `apercus/mobile-menu.png`,
`apercus/appairage.png`.
