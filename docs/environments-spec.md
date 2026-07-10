# Environnements & CI — architecture et workflows

> **Statut : implémenté** (voir §0). Ce document décrit l'architecture des environnements, la
> gestion des migrations et les workflows CI en place, ainsi que le raisonnement coûts Supabase.

## 0. État implémenté (résumé)

- **2 environnements** : **prod** = projet Supabase cloud (plan Free, `rlhkgrhgbnpbxjblyetw`) ;
  **test / préprod** = **Supabase local** (CLI + Docker), utilisé pour le dev local et la CI.
- **Migrations versionnées** via le CLI Supabase : `supabase/config.toml` +
  `supabase/migrations/20260101000000_init.sql`. `supabase db reset` reconstruit la base locale.
- **Tests E2E** (Playwright) : 48 tests, tournent contre le **Supabase local** — **aucun accès
  à la prod**. Comptes de test créés à la volée (`signUp`) via un `global-setup`.
- **Workflows GitHub Actions** :
  - `e2e.yml` → lance les E2E sur chaque **PR vers master** (garde-fou avant merge).
  - `eas-build.yml` → sur push `master`, exécute les E2E **puis** le build APK (`build` `needs: e2e`)
    → pas de release si régression.
  - `_e2e.yml` → workflow réutilisable partagé (Supabase local + Playwright).
  - `paths-ignore` (`docs/**`, `*.md`) : les changements purement docs ne déclenchent rien.

## 1. Contexte & motivation

Historiquement, un **seul projet Supabase** servait à la fois de prod, de bac à sable et de cible
des tests E2E. Problèmes résolus par cette architecture :

- Les tests E2E **écrivaient dans la base de prod** (comptes `e2e-*@test.com`, colocs jetables,
  données créées/supprimées) → risque de pollution et de casse si un teardown échouait.
- Les migrations SQL étaient appliquées **à la main** dans l'éditeur Supabase, sans versioning →
  plusieurs bugs « migration jamais appliquée » (recipes.icon, admin_kick, kick_member,
  delete_household).
- Aucun filet : une manip de test ratée impactait directement les vrais utilisateurs.

## 2. Architecture cible (2 environnements)

Décision : **fusionner préprod et test** en un seul environnement local. Séparer une préprod
cloud d'un environnement de test n'apporte rien tant que l'app n'a que quelques utilisateurs —
le Supabase local sert à la fois de bac à sable de dev et de cible des tests/CI.

| Environnement | Rôle | Cible Supabase | Données | Qui l'utilise |
|---------------|------|----------------|---------|---------------|
| **prod** | Utilisateurs réels (colocs) | Projet cloud `tipi-prod`, plan **Free** | Réelles | App publiée (APK / web) |
| **test / préprod** | Dev local + tests E2E + CI | **Supabase local** (CLI + Docker) | Jetables, recréées à chaque `db reset` | Dev local, GitHub Actions |

Principe : la **prod reste sur le plan Free** (suffisant pour l'usage actuel) et n'est **jamais**
touchée par les tests ; tout le dev/test se fait sur un **Supabase local** gratuit et éphémère.

## 3. Séparation technique

### 3.1 Variables d'environnement
Chaque environnement a son couple `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

- **App (EAS)** : le profil `production` injecte les `EXPO_PUBLIC_*` de `tipi-prod` via
  `eas env:create` (cf. CLAUDE.md — `eas secret:create` est déprécié).
- **CI / tests E2E** : cible le **Supabase local** (`http://127.0.0.1:54321` + clé anon locale) ;
  aucun accès prod.
- **Local dev** : `.env` (gitignoré) pointant sur le Supabase local, ou sur `tipi-prod` pour
  tester en conditions réelles ponctuellement.

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
Le **Supabase CLI** + le dossier `supabase/migrations/` pilotent le schéma :

- `supabase/migrations/20260101000000_init.sql` : migration initiale = schéma complet, incluant
  les **GRANT** `anon`/`authenticated` et le trigger « premier membre = admin » (deux éléments
  présents en prod mais qui manquaient à `schema.sql`, découverts en montant le local).
- `supabase migration new <nom>` → nouveau fichier horodaté versionné.
- `supabase db reset` reconstruit la base locale (migrations + `seed.sql`).
- `schema.sql` reste un **instantané** de référence ; la source de vérité des changements est
  `supabase/migrations/`. Les anciens `migration_*.sql` à la racine de `supabase/` sont hérités
  (déjà appliqués en prod) et **ignorés par le CLI**.

Bénéfice : chaque environnement est reconstructible à l'identique → plus de « ça marche en prod
mais pas ici » ni de policy oubliée.

### 3.4 Pipeline CI (implémenté)
```
PR vers master ──► e2e.yml ──uses──► _e2e.yml
push master ─────► eas-build.yml : job e2e (uses _e2e.yml) ──✓──► job build (needs: e2e) → APK + release

_e2e.yml (réutilisable) :
  checkout → setup-node 22 → npm ci → supabase/setup-cli
  → supabase start (applique migrations + seed)
  → export EXPO_PUBLIC_SUPABASE_URL/ANON_KEY depuis `supabase status -o json`
  → playwright install chromium → npx playwright test → supabase stop
  → upload du rapport Playwright en artefact
```
Le job E2E démarre un Supabase **local éphémère**, applique migrations + seed, crée les comptes de
test via `signUp` (global-setup), lance les 48 tests, puis détruit la stack. La prod n'est **jamais**
sollicitée. Les secrets GitHub `EXPO_PUBLIC_*` ne sont plus nécessaires côté tests.

### 3.5 Bootstrap des tests (env-agnostique)
`e2e/global-setup.ts` crée, avant toute la suite, l'utilisateur principal (`e2e-main`) et le
household fixture (admin + membre) via `signUp` — donc **sans compte pré-existant**, à l'identique
sur local et cloud. `e2e/fixtures.ts` gère les comptes dédiés (solo, admin, member, leaver,
deleter) et les réinitialise en `beforeEach` ; `e2e/db.ts` nettoie les données préfixées `E2E-`.

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

### Recommandation retenue
- **Prod** : `tipi-prod` en **Free** (usage actuel = quelques colocs ; on migrera vers Pro quand
  la pause après inactivité ou l'absence de backups deviendra un problème).
- **Test/préprod** : **Supabase local** via CLI (`supabase start`) → **0 $**, aucun risque pour la prod.
- **Migrations** : CLI + `supabase/migrations/` versionnées ; `supabase db reset` reconstruit la
  base locale à l'identique, et les mêmes migrations sont poussées en prod (`supabase db push`).

Coût récurrent : **0 $** (tant que la prod tient sur le Free). Passage à Pro (~25 $/mois) le jour
où il faut la fiabilité (pas de pause, sauvegardes).

## 6. Plan de mise en place

1. **CLI & migrations** : `supabase init` (config.toml), créer une migration initiale versionnée
   depuis `schema.sql`, `seed.sql` bootstrappant les données de test. Vérifier `supabase db reset`.
2. **Bootstrap tests env-agnostique** : l'utilisateur principal des tests est créé via `signUp`
   (plus de dépendance à un `claude@test.com` pré-existant en cloud) → les tests tournent
   identiquement sur local et cloud.
3. **CI sur Supabase local** : `_e2e.yml` démarre `supabase start`, `db reset`, puis lance
   Playwright avec `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` et la clé anon locale. Plus
   aucun secret ni accès prod dans les tests.
4. **Nettoyage prod** : purger les comptes/données `e2e-*` créés en prod pendant la mise au point.
5. **Migrations prod** : lier le projet cloud (`supabase link`) et `supabase db push` pour aligner
   la prod sur les migrations versionnées (fin du SQL à la main).
6. **Doc** : consigner la procédure (`supabase start` / `db reset` / `db push`) et les refs.

## 6bis. Utilisation locale (Docker requis)

```bash
# Démarre le Supabase local (applique supabase/migrations/ + seed)
npx supabase start
# Récupère l'URL + clé anon locales (à mettre dans .env, ou exportées)
npx supabase status
# Lance les tests E2E contre le local
npx playwright test
# Repartir d'une base propre
npx supabase db reset
# Nouvelle migration versionnée
npx supabase migration new <nom>
# Aligner la prod (une fois le projet lié via `supabase link`)
npx supabase db push
```

`supabase/schema.sql` reste un **instantané** du schéma complet ; la source de vérité pour
appliquer les changements devient `supabase/migrations/` (le fichier `20260101000000_init.sql`
en est la première migration). Les anciens `migration_*.sql` à la racine de `supabase/` sont
**hérités** (déjà appliqués en prod) et ignorés par le CLI — à archiver/supprimer une fois la
prod alignée via `db push`.

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
