# Spec — Système de progression Sport : niveaux, badges cachés, déblocage de features

> **Statut** : phases 1-3 livrées le 20/07/2026 (P0 complet + P1 hors gates 7/10 ; la
> « notification locale » P1 est implémentée comme notification in-app sur l'accueil,
> via le système existant — pas de dépendance expo-notifications)
> **Couche visuelle (21/07/2026)** : badges rendus en médaillons SVG par exercice
> (`components/BadgeMedallion.tsx`, famille « Médaillon »), page Sport en tableau de bord
> (anneau de niveau + sparkline 7 j par carte via `LevelHeader`/`MiniSparkline`), page
> détail réagencée (graphique + séries prioritaires, badges/titres/records dans une carte
> « Progression » pliable, « Titres actifs » renommé « Cette semaine (7 j glissants) »).
> Migrations ajoutées : `profiles.show_sport_level`/`sport_title`, policy DELETE sur `user_badges`.
> **Base** : branche `feature/sport-gamification-hermes` (badges permanents, titres temporels 7j + grâce 48h, titres collectifs, overlay de déblocage, anneaux de progression)
> **Références** : patterns Habitica (badges "?", classes au niveau 10), Duolingo (streak freeze), Ring Fit (titres identitaires), études de rétention (badge jour 1 = +64 % de rétention ; streaks sociales = +34 % de durée)

## 1. Problème

Le système de badges actuel montre d'emblée tous les paliers jusqu'à 10 000 répétitions : l'utilisateur voit la montagne entière au lieu du prochain pas, ce qui écrase la motivation au lieu de la nourrir. Une fois les premiers badges obtenus, il n'existe aucune raison structurelle de revenir chaque jour (pas d'objectif quotidien, pas de progression globale, rien de nouveau à découvrir). Sans boucle de rétention quotidienne, la feature sport risque le sort classique des trackers : forte utilisation la première semaine, abandon la troisième.

## 2. Objectifs

1. **Créer une raison d'ouvrir l'app chaque jour** : objectif quotidien + titres temporels menacés visibles → cible : ≥ 4 jours actifs/semaine par membre actif du foyer.
2. **Donner un sentiment de progression long terme au-delà des badges** : un niveau sportif par utilisateur, visible par les colocs → cible : 100 % des utilisateurs actifs atteignent le niveau 2 dans leurs 2 premiers jours (early win).
3. **Entretenir la curiosité** : les paliers non atteints sont cachés → le déblocage redevient une découverte, pas une case cochée.
4. **Faire "se déplier" l'app progressivement** : chaque passage de niveau clé débloque une nouvelle capacité, ce qui donne aux niveaux une valeur au-delà du chiffre.
5. **Rester sobre** : aucune surface animée nouvelle en dehors des moments de déblocage déjà existants (réutilisation de `BadgeUnlockOverlay`).

## 3. Non-objectifs

- **Pas de classement inter-foyers ni de social hors du household** — Tipi est une app de colocation, le cercle social est le foyer. (Complexité serveur + risque de comparaison toxique.)
- **Pas d'anti-triche ni de validation serveur des niveaux** — le niveau est dérivé des logs, gates appliqués côté client. Entre colocs, tricher n'a pas de sens ; le coût RLS/fonctions serait disproportionné.
- **Pas de retrait de fonctionnalités existantes derrière un gate** — tout ce qui est accessible aujourd'hui (création d'exercice custom incluse) le reste. On ne gate que du _nouveau_. (Retirer une capacité déjà utilisée = frustration garantie.)
- **Pas de monnaie virtuelle ni de boutique** — l'XP n'est pas dépensable, c'est un compteur de progression. (Hors sujet pour une app de foyer, dérive engagement-piège.)
- **Pas de refonte du graphique ni de la saisie** — la page détail vient d'être retravaillée (RepStepper), on n'y touche pas.

## 4. User stories

**Membre du foyer (utilisateur principal)**
- En tant que membre, je veux voir uniquement mon prochain badge et des "?" pour les suivants, afin que chaque déblocage soit une découverte et que la marche à franchir reste petite.
- En tant que membre, je veux un objectif du jour calculé sur mon historique, afin de savoir en ouvrant l'app ce que "réussir ma journée" veut dire.
- En tant que membre, je veux être prévenu quand un titre temporel est sur le point d'expirer, afin de pouvoir le sauver avant la fin de la période de grâce.
- En tant que membre, je veux gagner de l'XP et des niveaux tous exercices confondus, afin que ma régularité globale compte même quand je varie les exercices.
- En tant que membre, je veux voir le niveau et le titre de mes colocs, afin que la progression soit un sujet de conversation (et de chambrage) dans le foyer.
- En tant que membre montant de niveau, je veux découvrir la fonctionnalité que ce niveau débloque, afin d'avoir une raison concrète de viser le suivant.

**Cas limites**
- En tant que nouveau membre rejoignant un foyer actif, je démarre niveau 1 avec mes propres logs (l'XP est individuelle) sans être écrasé par l'historique des autres.
- En tant que membre revenant après une longue pause, je vois mes badges permanents intacts, mes titres temporels perdus, et mon objectif du jour recalculé sur une base basse (pas de punition).
- En tant qu'utilisateur hors ligne au moment d'un passage de niveau, je vois l'overlay au prochain lancement (état "vu" persisté localement).

## 5. Design du système

### 5.1 XP et niveaux

**Formule XP** (dérivée des logs, jamais stockée — rétroactive par construction) :

```
XP = Σ logs (count × poids_unité) + 50 × badges_permanents_débloqués
poids_unité : répétitions = 1, secondes = 0.5, minutes = 30
```

> ✅ Poids validés par Tom le 20/07/2026 (0.5 XP/s de gainage confirmé).

**Courbe de niveaux** (constante `LEVEL_THRESHOLDS` dans `lib/sport-logic.ts`) :

| Niveau | XP cumulé | Ordre de grandeur |
|--------|-----------|-------------------|
| 2 | 150 | jour 1-2 (early win) |
| 3 | 400 | ~1 semaine |
| 4 | 800 | ~2 semaines |
| 5 | 1 500 | ~3-4 semaines |
| 6 | 2 600 | ~6 semaines |
| 7 | 4 200 | ~2 mois |
| 8 | 6 500 | ~3 mois |
| 9 | 9 500 | ~4-5 mois |
| 10 | 13 500 | ~6 mois |

Au-delà du niveau 10 : +5 000 XP par niveau, sans plafond.

### 5.2 Déblocages par niveau

| Niveau | Déblocage | Notes |
|--------|-----------|-------|
| 2 | **Objectif du jour** (rituel quotidien) | La feature phare arrive dès le 2e jour |
| 3 | **Records personnels** (meilleure journée, meilleure série par exercice) | Section sur la page détail |
| 5 | **Choix du titre affiché** (parmi ses badges débloqués) | Le titre remplace "Niv. X" à côté du nom |
| 7 | **Badges custom du foyer** (créer un badge titre+seuil sur un exercice) | Tables et policies déjà en place |
| 10 | **Défis hebdomadaires du foyer** ("Premier à 200 squats") | Phase 3, à spécifier séparément |

### 5.3 Badges cachés

- Badges débloqués : affichés normalement (icône couleur + titre).
- **Prochain palier uniquement** : icône grise + titre visible + anneau de progression + seuil.
- Paliers au-delà : cercle gris avec **"?"** (Ionicons `help-outline`), sans titre ni seuil.
- Les titres temporels restent entièrement visibles (c'est la mécanique de streak, elle doit être lisible pour fonctionner).

### 5.4 Rituel quotidien (objectif du jour)

- **Calcul** : `objectif = max(arrondi(moyenne des 7 derniers jours actifs × 1.1), plus petit seuil de badge / 10)` — par exercice pratiqué au moins une fois les 14 derniers jours. Jamais d'objectif sur un exercice jamais pratiqué.
- **Affichage** : anneau de progression quotidien par carte d'exercice sur la page Sport (remplissage sans animation au mount, `withTiming` 400 ms sur changement).
- **Titres menacés** : si un titre temporel actif tombe dans sa fenêtre de grâce, bannière sobre sur la page Sport : « Encore N répétitions avant demain pour garder _Pompeur Assidu_ ». Pas de rouge criard : `t.accentLight` + icône `flame`.
- **Notification locale** (P1) : une seule par jour maximum, 19h, uniquement si un titre est menacé ET que l'objectif du jour n'est pas atteint. Opt-in explicite.

### 5.5 Moments de célébration (sobriété)

- Passage de niveau : réutilise `BadgeUnlockOverlay` avec variante (icône `arrow-up-circle`, texte « Niveau 5 » + sous-titre « Nouvelle fonctionnalité : choix du titre »). Même timing, même haptique, aucune nouvelle animation.
- File d'attente : si badge + niveau tombent en même temps, les overlays s'enchaînent (badge d'abord), jamais superposés.
- Budget animations inchangé : 3 surfaces (overlay, pulse compteur, anneaux) — le niveau réutilise l'existant.

### 5.6 Parcours & récompenses (ajout post-v1)

- **Parcours** (`workouts`) : enchaînements réutilisables d'exercices (séries × reps, poids, variante, « par côté »), partagés au foyer. 2 parcours par défaut seedés (idempotent) : « Abdos en 8 min » (8 variantes de l'exercice Abdos) et « Haltères — Full body ». Ce dernier gaine via l'exercice `Gainage` (variante `Latéral`), pas d'exercices « Planche » séparés — un backfil migre les foyers existants.
- **Validation** : feuille avec compteur de séries + dépliage pour corriger les reps ; « par côté » double le compte. Écrit une ligne par série dans `exercise_logs` (poids + variante) et une `workout_completions`.
- **Record de tonnage** (par personne, par parcours) : Σ (reps × poids) de la séance ; célébré via `BadgeUnlockOverlay` (icône `barbell`) quand le tonnage dépasse le meilleur précédent. Les parcours au poids du corps (tonnage 0) ne déclenchent jamais de record.
- **Sceaux de parcours** (par personne) : un seul trophée dont la couleur monte — bronze 5×, argent 25×, or 100× complétions. Affiché sur la carte du parcours, célébré au passage de palier. File d'attente : record puis sceau.
- **Badges spécifiques** des exercices du parcours Haltères : titres drôles (5 paliers) + médaillons dédiés (`bench`, `military`, `curl`, `deadlift`, `birddog`, `superman`). Un backfil renomme en base les titres génériques existants.
- **Fix détection badge** : la baseline inclut les badges déjà mérités par le total au montage → une inscription tardive en base (sync paresseux à l'ouverture) ne rejoue plus l'animation.

## 6. Exigences

### P0 — Must-have (v1 ne sort pas sans)

**R1. Badges cachés**
- [ ] Seul le prochain badge non débloqué montre titre + seuil + progression
- [ ] Les badges au-delà affichent un "?" sans information
- [ ] Un badge débloqué révèle son titre définitivement (y compris pour les autres membres du foyer sur P1 profil)
- [ ] Aucun changement pour les titres temporels

**R2. XP + niveau (logique pure)**
- [ ] `computeXp(logs, userBadges, exercises)` et `computeLevel(xp)` dans `lib/sport-logic.ts`, testés unitairement (frontières de paliers, unités mixtes, logs vides)
- [ ] Poids des unités et courbe exportés en constantes
- [ ] Niveau calculable pour n'importe quel membre du foyer (les logs sont household-visibles)

**R3. Affichage du niveau**
- [ ] Chip « Niv. X » à côté du nom/point de couleur sur la page Sport
- [ ] Barre de progression vers le niveau suivant dans l'en-tête de la page Sport (« 320 XP → Niv. 5 »)
- [ ] Overlay de passage de niveau (variante de `BadgeUnlockOverlay`), une seule fois par niveau (état vu en AsyncStorage)
- [ ] **Visibilité par les colocs = option on/off** dans les paramètres utilisateur (colonne `profiles.show_sport_level boolean NOT NULL DEFAULT true`) — si off, les colocs ne voient ni niveau ni XP de cet utilisateur (son propre niveau reste visible pour lui)

**R4. Objectif du jour (gate niveau 2)**
- [ ] Calcul conforme à 5.4, recalculé à chaque ouverture
- [ ] Anneau quotidien sur les cartes d'exercice concernées
- [ ] Invisible au niveau 1 ; révélé par l'overlay du niveau 2

### P1 — Nice-to-have (fast follow)

- [ ] Bannière « titre menacé » pendant la fenêtre de grâce
- [ ] Notification locale quotidienne opt-in (expo-notifications)
- [ ] Records personnels (gate niveau 3)
- [ ] Choix du titre affiché (gate niveau 5)
- [ ] Niveau visible sur l'écran membres du foyer (pas seulement la page Sport)

### P2 — Future considerations

- Badges custom du foyer (gate 7) — les policies `INSERT` sur `exercise_badges` le permettent déjà, ne pas les durcir d'ici là
- Défis hebdomadaires (gate 10) — nécessitera une table `challenges` ; ne rien construire qui suppose son absence
- Événement de foyer dans le fil de messages au déblocage d'un badge (« Tom vient de devenir Pompinator ») — le Realtime est déjà branché sur `user_badges`

## 7. Données & architecture

- **Aucune nouvelle table** en v1 : XP et niveaux sont dérivés des données existantes (`exercise_logs`, `user_badges`). Rétroactif, zéro état à synchroniser.
- **Post-v1 (parcours)** : tables `workouts` (parcours partagés au foyer) et `workout_completions` (une ligne par validation, par personne, avec tonnage) ; colonne `exercise_logs.weight`. RLS foyer en lecture, soi en écriture pour les complétions.
- **Une seule migration** : colonne `profiles.show_sport_level boolean NOT NULL DEFAULT true` (+ `schema.sql` + `lib/types.ts`, convention repo).
- **AsyncStorage** (par appareil) : dernier niveau célébré (`sport_last_level_seen`), opt-in notifications.
- **Convention repo** : logique dans `lib/sport-logic.ts` (testable), état dans `useSport`, UI dans `components/` (`LevelChip`, `DailyGoalRing`), tokens `useTheme()` partout, Ionicons only.

## 8. Métriques de succès

Pas d'infra analytics : on mesure via SQL sur la base prod (script `docs/queries/` à créer).

**Leading (2 semaines post-launch)**
- % d'utilisateurs actifs sport ayant atteint le niveau 2 sous 48h — cible : > 80 %
- Jours actifs/semaine/membre (≥ 1 log) — cible : ≥ 4 (baseline actuelle à mesurer avant launch)
- % de jours où l'objectif du jour est atteint — cible : > 50 % (objectif trop dur si < 30 %)

**Lagging (2 mois)**
- Rétention W4 de la feature sport (membre ayant loggé en semaine 4 / membres ayant loggé en semaine 1) — cible : > 60 %
- Nombre moyen de titres temporels maintenus ≥ 3 semaines consécutives

## 9. Questions ouvertes

- ~~**[Tom — bloquant P0]** Poids des unités XP~~ → **Résolu (20/07/2026)** : poids conservés tels quels (`secondes = 0.5`).
- ~~**[Tom — non bloquant]** Niveau visible par les colocs ?~~ → **Résolu (20/07/2026)** : option on/off dans les paramètres utilisateur, ON par défaut (voir R3).
- **[Design — non bloquant]** Position du chip niveau sur la carte exercice : à côté du point de couleur ou dans l'en-tête uniquement ? À trancher sur maquette Expo Go.
- **[Eng — non bloquant]** L'anneau quotidien réutilise-t-il le composant SVG des badges ou un composant dédié ? (Décision à l'implémentation.)

## 10. Phasage

| Phase | Contenu | Taille estimée |
|-------|---------|----------------|
| **1** | R1 badges cachés + R2 logique XP/niveau + tests | 1 session — aucune dépendance |
| **2** | R3 affichage niveau + overlay + R4 objectif du jour | 1-2 sessions — dépend de la phase 1 |
| **3** | P1 (bannière, notifs, records, choix du titre) | 1-2 sessions — après retours d'usage réels des phases 1-2 |

Chaque phase est shippable indépendamment (rien de cassé si on s'arrête entre deux). Les gates 7 et 10 ne sont **pas** dans ce chantier : ils attendront les métriques des phases 1-2.
