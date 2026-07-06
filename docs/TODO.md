# TODO — Tipi

## Fait récemment
- [x] Retirer la card "Mon solde" de la page d'accueil
- [x] Uniformiser les boutons d'ajout (FAB) sur toutes les pages
- [x] Fix APK crash (icône PNG + env vars safe)
- [x] Remplacer Alert.alert par erreurs inline (compatibilité web mobile)
- [x] Fix attribution couleur RLS-aware
- [x] Chat plein écran avec chevron retour
- [x] Auto-refresh réseau + bouton rafraîchir
- [x] Onboarding scrollable
- [x] Tâches ménage par défaut (14 tâches)

## Fait récemment (suite)
- [x] Page Calendrier avec vue mensuelle et dots multi-couleurs par type
- [x] Filtres calendrier (événements, anniversaires, recettes)
- [x] Planification de recettes avec validation de faisabilité
- [x] Étapes groupées par recette dans le détail du jour
- [x] Lien direct calendrier → mode Cuisine
- [x] Recettes planifiées dans l'onglet En cours (card grisée + bouton Démarrer)
- [x] Historique de démarrage dans les notes de recette
- [x] Refactoring durée : duration_value/duration_unit remplace duration_hint/rest_days
- [x] Champ anniversaire dans le profil utilisateur

- [x] Couleur unifiée pour toutes les recettes dans le calendrier
- [x] Étapes affichées pour les recettes actives (sans planification) dans le calendrier
- [x] Bouton "Vérifier les mises à jour" dans les paramètres du profil
- [x] Fermer les modaux et menus flottants au clic extérieur (overlay transparent)
- [x] Marqueur "Prêt" dans le calendrier (jour de fin de recette)
- [x] Refactoring recettes : page unique → routes imbriquées (index, [id], instance/[id])
- [x] Icône personnalisable par recette (sélecteur Ionicons)
- [x] Modaux custom (remplacement Alert.alert) pour recettes
- [x] Feedback visuel de complétion d'étape (banner animée)
- [x] Description de recette visible sur la page détail
- [x] Drag & drop pour réorganiser les étapes (DraggableStepList)
- [x] Date cible dans le modal de démarrage de recette
- [x] Synchronisation des notes en temps réel
- [x] Feedback "Sauvegardé" sur les notes
- [x] Empty state avec CTA sur la liste de recettes
- [x] Progress bar corrigée (0% pour étapes sans durée, auto-height LiquidProgress)
- [x] Stepper horizontal scrollable avec labels sur 2 lignes
- [x] Fix bouton "Suivant" onboarding (getItemLayout manquant sur FlatList)
- [x] Lien d'invitation avec URL web (tipi-tau.vercel.app/invite?code=XXX)
- [x] Page d'installation (/install) : APK, PWA, Web
- [x] Membres pré-ajoutés par l'admin (table pending_members, page claim)
- [x] Tâches ménage récurrentes interactives sur la page d'accueil (ChoreReminderCard)
- [x] Récurrence bi-hebdomadaire "une semaine sur deux" (week_parity)
- [x] Retrait du filtre "Moi" sur la page ménage (toujours vue "Tous")
- [x] Auto-join invitation : le code est persisté via AsyncStorage à travers le signup
- [x] Lien APK redirigé vers GitHub Releases (pas besoin de compte Expo)

## En cours

## Backlog
- [ ] Améliorer l'UI du chat (prévisualisation liens, messages épinglés)
- [ ] Scan de ticket (OCR)
- [ ] Rappel de remboursement
- [ ] Gamification ménage (streaks, badges)
- [ ] Quick actions (long press icône app)
- [ ] Notifications push
- [ ] Notification de bienvenue dans le chat (nouveau membre)
- [ ] Réactions sur les dépenses