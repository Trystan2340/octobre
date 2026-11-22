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
