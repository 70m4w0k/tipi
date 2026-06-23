# Tipi — App de gestion de colocation

Application mobile pour gérer le quotidien d'une colocation : messagerie, dépenses partagées, ménage collaboratif, événements et documents.

## Fonctionnalités

- **Messagerie** — Chat en temps réel entre colocataires (texte, images, sondages, réactions)
- **Dépenses** — Suivi des dépenses partagées avec calcul automatique des remboursements (type Tricount)
- **Ménage** — Grille de contributions hebdomadaire (chacun indique ce qu'il a fait, pas d'assignation)
- **Événements** — Calendrier partagé pour noter les événements de la coloc
- **Documents** — Stockage partagé de fichiers (factures, bail, etc.)

## Prérequis

- [Node.js](https://nodejs.org/) >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- Un compte [Supabase](https://supabase.com/) (gratuit)
- Expo Go sur ton téléphone (ou un émulateur)

## Setup Supabase

1. Crée un projet sur [supabase.com](https://supabase.com/)
2. Va dans **SQL Editor** et exécute le contenu de `supabase/schema.sql`
3. (Optionnel) Exécute `supabase/seed.sql` pour des données de test
4. Va dans **Settings > API** et copie :
   - L'URL du projet (`https://xxx.supabase.co`)
   - La clé `anon` (public)
5. Pour le magic link : va dans **Authentication > URL Configuration** et ajoute `tipi://` dans les Redirect URLs

## Installation

```bash
git clone <repo-url>
cd tipi
npm install
```

Crée un fichier `.env` à la racine :

```env
EXPO_PUBLIC_SUPABASE_URL=https://ton-projet.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=ta-cle-anon
```

## Lancement

```bash
npx expo start
```

Scanne le QR code avec Expo Go (Android) ou l'app Camera (iOS).

## Inviter des colocataires

1. Connecte-toi et crée une colocation
2. Un code d'invitation à 6 caractères s'affiche
3. Partage ce code avec tes colocataires
4. Ils créent un compte et entrent le code pour rejoindre la coloc

## Structure du projet

```
app/                 # Routes (Expo Router)
  (auth)/            # Écrans non connecté (login, join)
  (app)/             # Écrans connecté (chat, expenses, chores, other)
components/          # Composants réutilisables
lib/
  supabase.ts        # Client Supabase
  types.ts           # Types TypeScript
  hooks/             # Hooks React (useAuth, useMessages, etc.)
supabase/
  schema.sql         # Schéma BDD + politiques RLS
  seed.sql           # Données de test
docs/                # Documentation technique
```

## Tech Stack

- **Frontend** — React Native (Expo SDK 56), TypeScript, Expo Router
- **Backend** — Supabase (PostgreSQL, Auth, Realtime, Storage)
- **Temps réel** — Supabase Realtime (WebSocket)
