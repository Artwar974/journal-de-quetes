# APP TDAH — environnement ATHENA

Ce dossier contient uniquement la simulation actuellement active après la refonte.

## Lancer

Ouvrir `index.html` dans un navigateur moderne. La scène utilise l’heure locale de l’appareil pour piloter la lumière, le soleil et la lune.

## Contenu actif

- `index.html` : scène, adaptation à l’écran et moteur de rendu.
- `journal-shell.js` : navigation légère du journal, sans charger l’ancienne application.
- `assets/` : uniquement les états lumineux, masques, astres et animations utilisés par la scène actuelle.

Le moteur actif est aligné sur la définition native de la vidéo (`720 × 1280`, 24 images/s). Les tampons de la mer sont limités à sa zone visible, le premier plan est mis en cache et le raccord de la boucle conserve toujours une image valide pendant la relève des deux lecteurs vidéo. La boucle marine a été rééchantillonnée selon le déplacement perceptuel des vagues afin de supprimer le ralentissement de fin de cycle ; elle ne contient plus de piste audio inutile. La composition reste pilotée par une horloge continue à 24 images/s : elle ne dépend pas des callbacks du décodeur, qui peuvent s'interrompre après une relève sur certains navigateurs. La compression finale pèse environ `2,22 Mo` et conserve `99,7 %` de fidélité visuelle par rapport au master corrigé.

Le ciel utilise quatre fonds nettoyés dérivés des masters lumineux d'origine et la vidéo transparente des nuages peints. Un WebP animé n’est téléchargé qu’en solution de secours sur les téléphones ne décodant pas le WebM transparent.

La composition `9:16` est toujours affichée en entier. Sur les écrans plus longs ou plus larges, les zones restantes sont remplies par un prolongement atmosphérique accordé à l’état lumineux courant : aucun recadrage du paysage et aucun décalage entre les calques.

L’ancienne page d’accueil, la parallaxe, les créatures et les anciens décors ne font pas partie de cette version. Le journal conserve seulement ses quatre entrées utiles (Quêtes, Agenda, Historique et Carnet) et lit la sauvegarde locale `jdq_v1` sans importer l’ancien moteur.

Les anciens prototypes, prompts, outils, versions et ressources sources ne sont plus parcourus par ce dossier. Ils sont conservés dans :

`../app-tdah-archives/app-tdah-complet-avant-nettoyage-2026-09-02.zip`

Les outils de fabrication et ressources intermédiaires retirés lors de la passe mobile sont conservés dans :

`../app-tdah-development-archive/2026-09-03-cleanup/`

Cette archive contient l’état complet antérieur au nettoyage et permet de restaurer n’importe quelle ressource supprimée.

La sauvegarde immédiatement antérieure à l’optimisation 720p est conservée dans :

`../app-tdah-archives/app-actif-avant-optimisation-720-2026-09-02.zip`
