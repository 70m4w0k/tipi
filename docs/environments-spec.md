# Spécification — Séparation des environnements (prod / préprod / test)

## 1. Contexte & problème

Aujourd'hui il n'existe **qu'un seul projet Supabase** (`rlhkgrhgbnpbxjblyetw`) qui sert à la
fois de production, de terrain de développement et de cible des tests E2E. Conséquences :

- Les tests E2E (CI + local) **écrivent dans la base de prod** : comptes `e2e-*@test.com`,
  colocs jetables, messages/dépenses/recettes créés puis supprimés. Risque de pollution, de
  fausses données, et de casse si un teardown échoue.
- Les migrations SQL sont appliquées **à la main** dans l'éditeur Supabase, sans versioning
  reproductible → plusieurs bugs « migration jamais appliquée » (recipes.icon, admin_kick,
  kick_member, delete_household).
- Aucun filet : une manip de test qui tourne mal impacte directement les vrais utilisateurs.

**Objectif** : trois environnements isolés (prod / préprod / test), une gestion des migrations
versionnée et reproductible, et des tests E2E qui ne touchent **jamais** la prod — au coût le
plus bas possible.

## 2. Architecture cible

| Environnement | Rôle | Cible Supabase | Données | Qui l'utilise |
|---------------|------|----------------|---------|---------------|
| **prod** | Utilisateurs réels | Projet `tipi-prod` (plan **Pro**) | Réelles, sauvegardées | App publiée (APK / web) |
| **préprod / staging** | QA manuelle, démo, recette avant release | Projet `tipi-staging` | Copie/mock de prod | Testeurs, builds `preview` |
| **test / CI** | Tests E2E automatisés | **Supabase local** (CLI/Docker) *ou* projet `tipi-test` | Jetables, recréées à chaque run | GitHub Actions, dev local |

Principe : **prod fiable et payante**, préprod et test gratuites/éphémères. La CI cible en
priorité un **Supabase local** (voir §5) → zéro coût, zéro contact avec la prod.

## 3. Séparation technique

### 3.1 Variables d'environnement
Chaque environnement a son couple `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

- **App (EAS)** : définir les variables par profil dans `eas.json` via `eas env:create`
  (cf. CLAUDE.md — `eas secret:create` est déprécié). Un profil `production` pointe sur
  `tipi-prod`, un profil `preview` sur `tipi-staging`.
- **CI E2E** : secrets GitHub pointant sur la cible de test (local ou `tipi-test`), jamais prod.
- **Local dev** : `.env` (gitignoré) pointant sur `tipi-staging` ou le Supabase local.

### 3.2 Profils de build EAS (`eas.json`)
```jsonc
{
  "build": {
    "preview":    { "channel": "preview",    "env": { "APP_ENV": "staging" } },
    "production": { "channel": "production",  "env": { "APP_ENV": "production" } }
  }
}
```
Les `EXPO_PUBLIC_*` sont injectées par `eas env` selon l'environnement (`production` / `preview`).

### 3.3 Migrations versionnées (fin du SQL à la main)
Adopter le **Supabase CLI** et le dossier `supabase/migrations/` :

- `supabase migration new <nom>` → fichier horodaté versionné dans le repo.
- `supabase db push` applique les migrations en attente à la cible (`--db-url` ou projet lié).
- La CI applique les migrations à la base de test **avant** de lancer les E2E.
- Les migrations manuelles actuelles (`migration_*.sql`) sont converties en migrations CLI.

Bénéfice : chaque environnement est reconstructible à l'identique → plus de « ça marche en prod
mais pas ici » ni de policy oubliée.

### 3.4 Pipeline CI
```
PR ─────────────► e2e.yml : supabase start (local) → db push → playwright test
push master ────► eas-build.yml : e2e (local) ──✓──► build APK (prod) + release
```
Le job E2E démarre un Supabase local éphémère, y applique les migrations, seed les comptes
fixtures, lance les tests, puis le détruit. La prod n'est jamais sollicitée.

## 4. Limites et coûts Supabase

Repères (à revérifier sur https://supabase.com/pricing — susceptibles d'évoluer) :

| | **Free** | **Pro** (~25 $/mois / org) | **Team** (~599 $/mois) |
|---|---|---|---|
| Projets actifs / org | **2** (les autres en pause) | illimités (compute facturé/projet) | illimités |
| Mise en pause | **après 7 j d'inactivité** | non | non |
| Base de données | 500 Mo | 8 Go inclus puis ~0,125 $/Go | 8 Go+ |
| Bande passante (egress) | 5 Go/mois | 250 Go inclus puis ~0,09 $/Go | 250 Go+ |
| Stockage fichiers | 1 Go | 100 Go inclus puis ~0,021 $/Go | 100 Go+ |
| MAU (Auth) | 50 000 | 100 000 inclus puis ~0,00325 $/MAU | 100 000+ |
| Sauvegardes | ❌ | quotidiennes 7 j (PITR en option payante) | PITR inclus |
| Compute | partagé (nano) | crédit 10 $ inclus, puis à l'usage | dédié |
| Branching (DB de preview par branche) | ❌ | ✅ (facturé par branche active) | ✅ |
| Support | communauté | email | prioritaire |

Points structurants :
- La facturation **Pro est par organisation** (base ~25 $) **+ compute par projet**. Deux projets
  Pro dans la même org = ~25 $ + le compute du 2ᵉ projet (souvent ~10 $/mois en nano au-delà du
  crédit).
- Le **Free plafonne à 2 projets actifs par org** et **met en pause** après inactivité → inadapté
  à une vraie prod, mais parfait pour préprod/test.

## 5. Réduire les coûts — options

Classées de la plus économique à la plus confortable :

1. **Supabase local pour les tests (recommandé, 0 $)**
   `supabase start` (Docker) lance une stack complète en local/CI. Éphémère, isolée, gratuite,
   sans quota. Idéal pour l'E2E : la CI n'a besoin d'aucun projet cloud de test.
   *Limite* : ne teste pas la config cloud réelle (edge functions managées, etc.) — négligeable ici.

2. **Organisation dédiée « non-prod » (0 $)**
   Créer une **org séparée** (ou un **compte dédié**) pour préprod + test : chaque org dispose de
   son propre quota Free (2 projets). On obtient ainsi `tipi-staging` et `tipi-test` gratuits, sans
   toucher au quota de l'org de prod. *Limites* : mise en pause après inactivité (un simple ping
   cron/CI réveille le projet), et bien rester dans les usages autorisés (ne pas fractionner une
   même charge de prod sur plusieurs orgs Free pour éluder le Pro).

3. **Un seul projet Free de test, réveillé par la CI**
   `tipi-test` en Free : la CI qui tourne régulièrement empêche la mise en pause (< 7 j). Simple,
   mais base partagée entre tous les runs (bien nettoyer via teardown).

4. **Branching Supabase (Pro)**
   Sur le projet Pro, activer le **branching** : chaque PR obtient une base de preview éphémère
   (migrations rejouées automatiquement). Très propre pour la préprod par PR. *Coût* : facturé par
   branche active (faible si les branches sont courtes).

5. **Prod sur Pro, le reste gratuit**
   Combinaison conseillée : `tipi-prod` en **Pro** (pas de pause, sauvegardes), `tipi-staging` en
   Free (org dédiée), test en **local**. Coût récurrent ≈ **25 $/mois** pour la seule prod.

### Recommandation
- **Prod** : `tipi-prod` en **Pro** (fiabilité + backups). ~25 $/mois.
- **Préprod** : `tipi-staging` en **Free** dans une **org dédiée** (réveillée par un cron si besoin).
- **Test/CI** : **Supabase local** via CLI → 0 $, aucun risque pour la prod.
- **Migrations** : CLI + `supabase/migrations/` versionnées, appliquées par CI à chaque env.

## 6. Plan de mise en place

1. **CLI & migrations** : installer le Supabase CLI, `supabase init`, convertir les
   `migration_*.sql` existantes en migrations versionnées, vérifier `supabase db reset` en local.
2. **Test local en CI** : ajouter `supabase start` + `supabase db push` au workflow `_e2e.yml`,
   basculer les secrets E2E sur l'URL/clé locales. Retirer l'accès prod des tests.
3. **Préprod** : créer l'org dédiée + `tipi-staging`, y pousser les migrations, créer le profil
   EAS `preview` pointant dessus.
4. **Prod** : créer/isoler `tipi-prod` (Pro), migrer les données réelles, profil EAS `production`.
5. **Nettoyage prod** : purger les comptes/données `e2e-*` créés pendant cette phase de mise au point.
6. **Doc** : consigner les URLs/refs par environnement (hors secrets) et la procédure de migration.

## 7. Risques & notes

- **Migration de données prod** (étape 4) : prévoir un export/import (pg_dump / `supabase db dump`)
  et une fenêtre de bascule ; les `EXPO_PUBLIC_*` des builds déjà installés pointeront encore sur
  l'ancien projet tant qu'une nouvelle version n'est pas diffusée.
- **Suppression de coloc / cascade** : la fonction `delete_household()` purge manuellement les
  tables liées ; si de nouvelles tables `household_id` apparaissent, les ajouter (ou passer les FK
  en `ON DELETE CASCADE`).
- **Comptes de test** : les creds fixtures (`e2e-*`, `claude@test.com`) ne doivent exister que
  dans l'environnement de test, pas en prod.
- **Coûts variables** : surveiller egress/compute sur Pro (le `$10` de crédit couvre le nano ;
  un projet chargé peut dépasser). Mettre une alerte de dépense dans le dashboard Supabase.
