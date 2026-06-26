# Fonctionnalités — Tipi

## 1. Authentification et onboarding

### Connexion
- **Email + mot de passe** — Création de compte classique avec confirmation par email
- **Magic link** — Lien de connexion envoyé par email, sans mot de passe

### Gestion de colocation
- **Créer une coloc** — L'utilisateur donne un nom, un code d'invitation à 6 caractères est généré. Le créateur devient admin.
- **Rejoindre une coloc** — Saisir le code d'invitation d'une coloc existante
- **Quitter une coloc** — Possible depuis les paramètres du profil

### Administration (admin uniquement)
- **Renommer la coloc** — Modifier le nom depuis les paramètres
- **Régénérer le code d'invitation** — L'ancien code est invalidé
- **Exclure un membre** — Le membre perd l'accès, son historique est conservé
- **Promouvoir un membre** — Le rendre admin
- **Rétrograder un admin** — Le repasser en membre simple
- **Supprimer la coloc** — Tous les membres sont déconnectés (irréversible)

## 2. Messagerie (Chat)

Chat en temps réel entre les colocataires d'un même household.

### Types de messages
- **Texte** — Message classique
- **Image** — Sélection depuis la galerie, upload vers Supabase Storage
- **Sondage** — Question + options de vote, résultats en temps réel avec barres de progression

### Interactions
- **Réactions** — Long press sur un message pour ajouter un emoji (👍 ❤️ 😂 😮 🔥 😢)
- **Accusés de lecture** — Indicateur de lecture (✓✓) par utilisateur
- **Temps réel** — Synchronisation instantanée via Supabase Realtime (WebSocket)
- **Plein écran** — Le chat masque la barre de navigation pour maximiser l'espace, avec chevron retour dans le header
- **Auto-refresh** — Rechargement automatique au retour au premier plan + bouton rafraîchir si aucun message visible

## 3. Dépenses (Tricount-like)

Suivi et répartition des dépenses partagées.

### Fonctionnalités
- **Ajouter une dépense** — Titre, montant, catégorie, payeur, participants
- **Catégories** — Courses, Loyer, Restaurant, Transport, Loisirs, Autre (avec couleurs)
- **Calcul automatique des parts** — Répartition égale entre les participants sélectionnés
- **Solde personnel** — Affichage en temps réel de ce que chacun doit/est dû
- **Remboursements suggérés** — Algorithme d'optimisation minimisant le nombre de transactions
- **Breakdown par catégorie** — Vue des totaux par catégorie

### Algorithme de settlement
L'algorithme calcule les balances nettes (payeur reçoit, participant doit), trie créanciers et débiteurs par montant décroissant, puis apparie les plus grands pour minimiser les transferts.

## 4. Ménage (Contribution grid)

Système de suivi des contributions au ménage basé sur le volontariat.

### Philosophie
Le système est **contribution-based, PAS assignment-based**. Chaque colocataire indique ce qu'il a fait plutôt que de se voir assigner des tâches. Cela encourage le comportement responsable plutôt que le contrôle.

### Grille de contributions
- **Axe vertical** — Tâches de ménage (personnalisables : Plan de travail, Sol cuisine, etc.)
- **Axe horizontal** — Semaines (numéro de semaine ISO)
- **Cellules** — Tap pour indiquer une contribution avec 3 niveaux d'intensité :
  - Niveau 1 (léger/rapide) — opacité 35%
  - Niveau 2 (partiel) — opacité 65%
  - Niveau 3 (complet) — opacité 100%
- **Couleurs** — Chaque utilisateur a sa propre couleur (auto-assignée à l'inscription, configurable dans le profil, couleurs prises marquées comme indisponibles)
- **Filtres** — "Moi" (ses contributions) ou "Tous" (vue d'ensemble)

### Tâches préremplies
- **14 tâches par défaut** — Aspi haut/bas, Serp haut/bas, WC haut/bas, Cuisine, Véranda, Verre, SdB 1/2/3, Escalier, Poubelles
- Seeding automatique lors de la première visite de la page ménage (si aucune tâche n'existe)

### Gestion des tâches
- Ajouter/renommer/supprimer des tâches
- L'historique est conservé par tâche

### Rappels
- Un rappel configurable (ex: "Sortir les poubelles — Tous les lundis, mercredis et vendredis")
- Détection automatique du jour courant pour afficher si le rappel est dû
- Bouton "Marquer fait" pour confirmer

## 5. Événements

Calendrier simple pour noter les événements de la colocation.

- **Ajouter un événement** — Titre, date/heure, note optionnelle
- **Liste chronologique** — Tri par date décroissante
- **Synchronisation** — Temps réel entre les colocataires

## 6. Documents partagés

Stockage centralisé de documents (factures, bail, quittances, etc.).

- **Import** — Sélection de fichier depuis l'appareil
- **Stockage** — Supabase Storage avec accès restreint au household
- **Consultation** — Téléchargement via URL signée
- **Métadonnées** — Nom, uploadeur, date d'upload

## 7. Profil utilisateur

- **Nom d'affichage** — Modifiable
- **Couleur** — Sélection parmi 10 couleurs prédéfinies (auto-assignée à l'inscription, couleurs prises indisponibles avec icône), propagée en temps réel via Realtime
- **Code d'invitation** — Affichage du code de la coloc pour inviter d'autres personnes
- **Partage d'invitation** — Bouton share natif avec message pré-rédigé
- **Déconnexion** — Se déconnecter de l'app
- **Quitter la coloc** — Quitter sa colocation actuelle

## 8. Accueil contextuel

Page d'accueil dynamique avec les informations pertinentes :
- **Solde personnel** — Carte cliquable montrant le solde courant
- **Courses** — Nombre d'articles non cochés
- **Notifications** — Rappels ménage du jour, recettes en dernière étape
- **Invitation** — Carte d'invitation si l'utilisateur est seul dans sa coloc
- **Accès rapide** — Tuiles vers les pages non visibles dans la navbar

## 9. Thème sombre

Support complet du mode sombre sur toutes les pages et composants :
- **3 modes** — Système (suit le réglage OS), Clair, Sombre
- **Toggle** — Accessible depuis les paramètres du profil
- **Persistance** — Le choix est sauvegardé via AsyncStorage
- **21 tokens** — Palette complète (background, card, accent, text, danger, success, etc.)

## 10. Icônes cohérentes

L'app utilise exclusivement Ionicons (via `@expo/vector-icons`) pour toutes les icônes :
- Catégories de dépenses avec icônes dédiées (cart, home, restaurant, car, game-controller, cube)
- Actions (trash, document-text, people, close, checkmark, etc.)
- Navigation et UI (wallet, share, person-circle, etc.)

## 11. Courses améliorées

### Catégorisation automatique par rayon
- **5 rayons** — Frais, Épicerie, Hygiène, Ménage, Autre
- **Détection automatique** — Les articles sont catégorisés via analyse par mots-clés (regex word-boundary)
- **Affichage groupé** — Les articles sont regroupés par rayon avec icônes et couleurs
- **Prévisualisation** — Badge de catégorie affiché en temps réel pendant la saisie

### Suggestions intelligentes
- **Basées sur l'historique** — Les 10 articles les plus fréquemment achetés sont proposés
- **Filtrage** — Les suggestions déjà dans la liste sont masquées
- **Quick-add** — Tap sur une suggestion pour l'ajouter instantanément

### Mode courses
- **Bouton "J'y vais !"** — Notifie les colocataires dans le chat avec le nombre d'articles
- **Mode shopping** — Toggle entre "J'y vais !" et "Courses terminées"

## 12. Suggestions contextuelles ménage

- **Détection d'inactivité** — Alerte si une tâche n'a pas été faite depuis 14+ jours
- **Message contextuel** — "X semaines sans [tâche]"
- **Tri par urgence** — Les suggestions les plus anciennes apparaissent en premier

## 13. Mode cuisine (Recettes)

### Mode plein écran
- **Grandes polices** — Titre 28px, description 20px pour lisibilité en cuisine
- **Écran toujours allumé** — `expo-keep-awake` empêche la mise en veille
- **Barre de progression** — Avancement visuel dans la recette
- **Navigation d'étapes** — Boutons suivant/précédent pour naviguer entre les étapes

### Minuteur intégré
- **Un timer par recette** — Chaque recette en cours a son propre minuteur indépendant
- **Persistant** — Les timers survivent à la navigation entre pages (TimerContext global)
- **Contrôles** — Pause, reprise, arrêt
- **Alerte de fin** — Vibration haptique + alerte quand le temps est écoulé
- **Badge sur les cartes** — Le décompte s'affiche directement sur la carte de la recette en cours
- **Auto-stop** — Le timer s'arrête automatiquement au changement d'étape

## 14. Pull-to-refresh & Haptic feedback

- **Pull-to-refresh** — Disponible sur toutes les pages (chat, dépenses, ménage, courses, recettes, documents, accueil)
- **Retour haptique** — Feedback tactile sur ~25 actions clés (voir `docs/haptic-feedback.md`)

## 15. Onboarding

Tutoriel interactif au premier lancement pour guider les nouveaux utilisateurs.

- **3 slides** — Bienvenue, présentation des outils, invitation des colocs
- **Pagination** — FlatList horizontal avec dots indicator
- **Persistance** — État "déjà vu" sauvegardé via AsyncStorage
- **Skip** — Bouton "Passer" accessible à tout moment
- **Replay** — Bouton "Revoir le tutoriel" dans les paramètres profil

## État d'avancement

| Feature | Status |
|---------|--------|
| Auth (email + magic link) | ✅ Implémenté |
| Household (créer/rejoindre) | ✅ Implémenté |
| Chat temps réel | ✅ Implémenté |
| Dépenses | ✅ Implémenté |
| Ménage (contribution grid) | ✅ Implémenté |
| Événements | ✅ Implémenté |
| Documents partagés | ✅ Implémenté |
| Profil (couleur + sync Realtime) | ✅ Implémenté |
| Gestion coloc (admin, rôles) | ✅ Implémenté |
| Accueil contextuel | ✅ Implémenté |
| Thème sombre (light/dark/system) | ✅ Implémenté |
| Icônes Ionicons (remplacement emojis) | ✅ Implémenté |
| Partage code invitation | ✅ Implémenté |
| États vides engageants | ✅ Implémenté |
| FAB dépenses | ✅ Implémenté |
| Courses (catégorisation, suggestions, J'y vais) | ✅ Implémenté |
| Suggestions contextuelles ménage | ✅ Implémenté |
| Mode cuisine + minuteur multi-instance | ✅ Implémenté |
| Pull-to-refresh + haptic feedback | ✅ Implémenté |
| Onboarding tutoriel (3 slides) | ✅ Implémenté |
| Tests unitaires (124) | ✅ Implémenté |
| Tests d'intégration Supabase (24) | ✅ Implémenté |
| Push notifications | ❌ Pas encore |
