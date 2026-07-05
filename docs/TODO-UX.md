# TODO UX — Tipi

Propositions pour rendre l'app intuitive et sans friction.

## Top 5 prioritaires

- [x] **1. États vides engageants** — Quand une section est vide, afficher une illustration + CTA clair au lieu d'un écran blanc (Impact: Fort, Effort: Faible)
- [x] **2. Partage code invitation simplifié** — Bouton "Inviter mes colocs" avec share sheet natif et message pré-rédigé (Impact: Fort, Effort: Faible)
- [x] **3. Bouton "+" flottant dépenses** — FAB sur l'écran dépenses, payeur pré-rempli (Impact: Moyen, Effort: Faible)
- [x] **4. Accueil contextuel amélioré** — Afficher ce qui est pertinent maintenant : solde, rappel ménage, courses en attente (Impact: Fort, Effort: Moyen)
- [x] **5. Thème sombre** — Support du mode sombre natif (Impact: Moyen, Effort: Moyen)

## Backlog

### Onboarding
- [x] Tutoriel interactif au premier lancement (overlay 3 slides, persisté AsyncStorage)
- [x] Bouton "Revoir le tutoriel" dans les paramètres profil

### Chat
- [ ] Prévisualisation des liens (titre + image)
- [ ] Messages épinglés en haut du chat

### Dépenses
- [ ] Scan de ticket (OCR via API)
- [ ] Rappel de remboursement ("Thomas te doit 12,50€")

### Ménage
- [ ] Gamification légère (streaks, badges)
- [x] Suggestions contextuelles ("2 semaines sans nettoyage SDB")

### Courses
- [x] Suggestions intelligentes basées sur l'historique
- [x] Catégorisation auto par rayon
- [x] Bouton "J'y vais !" avec notification aux autres

### Recettes
- [x] Mode cuisine (plein écran, grandes polices, pas de veille)
- [x] Minuteur intégré (un par recette, persistant entre pages)
- [x] Navigation étape précédente en mode cuisine
- [x] Drag & drop pour réorganiser les étapes
- [x] Icône personnalisable par recette
- [x] Modaux custom (remplacement Alert.alert)
- [x] Description visible sur la page détail
- [x] Feedback complétion + sauvegarde notes
- [x] Empty state avec CTA
- [x] Stepper scrollable avec labels lisibles
- [x] LiquidProgress auto-height (plus de gap blanc)

### Navigation & global
- [ ] Quick actions (long press icône app)
- [x] Haptic feedback sur actions clés
- [x] Pull-to-refresh partout

### Social & engagement
- [ ] Notification de bienvenue dans le chat (nouveau membre)
- [ ] Anniversaires avec rappel auto
- [ ] Réactions sur les dépenses
