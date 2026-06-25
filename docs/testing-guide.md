# Guide de test pas-à-pas — Tipi

## 1. Flow complet d'inscription

### 1.1 Création de compte (email + mot de passe)

1. Lancer l'app (`npx expo start`)
2. Sur l'écran de login, appuyer sur **"Créer un compte"**
3. Remplir :
   - Email : utiliser un email réel (la confirmation est requise)
   - Mot de passe : minimum 6 caractères
4. Appuyer sur **"S'inscrire"**
5. **Vérifier** : un message confirme l'envoi d'un email de confirmation
6. Aller dans la boîte mail, cliquer sur le lien de confirmation
7. Revenir dans l'app, se connecter avec les identifiants créés
8. **Vérifier** : l'écran "Créer ou rejoindre une coloc" s'affiche

### 1.2 Connexion Magic Link

1. Sur l'écran de login, basculer vers **"Magic link"**
2. Entrer un email existant (compte déjà créé)
3. Appuyer sur **"Envoyer le lien"**
4. **Vérifier** : message de confirmation d'envoi
5. Ouvrir l'email, cliquer sur le lien magique
6. **Vérifier** : l'app s'ouvre et l'utilisateur est connecté

### 1.3 Créer une colocation

1. Après connexion (sans household), appuyer sur **"Créer une coloc"**
2. Entrer un nom de colocation (ex: "Appart Rue de la Paix")
3. Appuyer sur **"Créer"**
4. **Vérifier** :
   - Redirection vers la page d'accueil
   - Le nom de la coloc apparaît sous "Tipi"
   - Un code d'invitation à 6 caractères est généré
   - L'onboarding (tutoriel 3 slides) s'affiche au premier lancement
   - Les 14 tâches ménage par défaut sont créées automatiquement

### 1.4 Rejoindre une colocation

1. Sur un 2e appareil ou avec un 2e compte, se connecter
2. Appuyer sur **"Rejoindre une coloc"**
3. Entrer le code d'invitation à 6 caractères
4. Appuyer sur **"Rejoindre"**
5. **Vérifier** :
   - Redirection vers la page d'accueil
   - Le nom de la coloc s'affiche
   - Les membres existants sont visibles dans les paramètres
   - Le chat, les dépenses, etc. montrent les données partagées

### 1.5 Cas d'erreur à tester

| Scénario | Action | Résultat attendu |
|----------|--------|------------------|
| Email invalide | Entrer "abc" comme email | Message d'erreur |
| Mot de passe trop court | Entrer "123" | Message d'erreur Supabase |
| Compte déjà existant | S'inscrire avec un email déjà utilisé | Message d'erreur approprié |
| Code invitation invalide | Entrer "XXXXXX" | Message d'erreur "Code invalide" |
| Champs vides | Laisser email ou mot de passe vide | Bouton désactivé ou erreur |

---

## 2. Vérification des RLS Policies

Les RLS (Row Level Security) garantissent qu'un utilisateur ne voit que les données de sa colocation.

### 2.1 Prérequis

- 2 comptes utilisateur dans **2 colocations différentes**
- Accès au dashboard Supabase (https://supabase.com/dashboard)

### 2.2 Test via l'app

1. **Compte A** (coloc "Alpha") : créer un message chat, une dépense, une tâche ménage
2. **Compte B** (coloc "Beta") : vérifier que les données de "Alpha" ne sont PAS visibles
3. **Vérifier** pour chaque table :
   - `messages` : le chat n'affiche que les messages de sa coloc
   - `expenses` : seules les dépenses de sa coloc apparaissent
   - `chores` / `chore_tasks` : la grille ne montre que ses tâches
   - `events` : seuls les événements de sa coloc
   - `shopping_items` : seuls les articles de sa coloc
   - `files` : seuls les documents de sa coloc

### 2.3 Test via SQL Editor (Supabase Dashboard)

Ouvrir le **SQL Editor** dans le dashboard Supabase et exécuter :

```sql
-- Vérifier que RLS est activé sur toutes les tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Toutes les tables doivent avoir `rowsecurity = true`.

```sql
-- Lister les policies par table
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 2.4 Test d'isolation directe

```sql
-- Simuler un utilisateur et vérifier qu'il ne voit que ses données
-- Remplacer USER_ID par l'UUID d'un utilisateur de test

-- 1. Trouver le household_id de l'utilisateur
SELECT household_id FROM profiles WHERE id = 'USER_ID';

-- 2. Vérifier que la fonction helper retourne le bon household
SELECT my_household_id(); -- doit correspondre au household de l'utilisateur connecté

-- 3. Tester une requête sur les messages
-- L'utilisateur ne devrait voir que les messages de sa coloc
SELECT count(*) FROM messages; -- devrait ne compter que les messages de sa coloc
```

### 2.5 Checklist RLS par table

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `households` | Membres uniquement | Tout utilisateur auth | Admin uniquement | Admin uniquement |
| `profiles` | Même household | Propre profil | Propre profil | - |
| `messages` | Même household | Même household | Auteur uniquement | Auteur uniquement |
| `expenses` | Même household | Même household | Même household | Même household |
| `chores` | Même household | Même household | Même household | Même household |
| `chore_tasks` | Même household | Même household | Même household | Même household |
| `chore_reminders` | Même household | Même household | Même household | Même household |
| `shopping_items` | Même household | Même household | Même household | Même household |
| `events` | Même household | Même household | Même household | Même household |
| `files` | Même household | Même household | - | Même household |
| `recipes` | Même household | Même household | Même household | Même household |
| `recipe_instances` | Même household | Même household | Même household | Même household |

---

## 3. Cas d'erreur réseau

### 3.1 Comment rendre Supabase injoignable

#### Méthode 1 : Mode avion (la plus simple)

1. Lancer l'app et naviguer vers une page avec des données
2. Activer le **mode avion** sur l'appareil/émulateur
3. Tester les actions (envoyer un message, ajouter une dépense, etc.)
4. **Vérifier** : messages d'erreur appropriés, pas de crash
5. Désactiver le mode avion
6. **Vérifier** : les données se rechargent correctement

#### Méthode 2 : Bloquer le domaine Supabase (Android)

Sur Android (émulateur ou appareil rooté) :

```bash
# Trouver l'IP du serveur Supabase
nslookup <VOTRE_PROJET>.supabase.co

# Ajouter au fichier hosts (nécessite root sur l'appareil)
adb shell
su
echo "127.0.0.1 <VOTRE_PROJET>.supabase.co" >> /etc/hosts
```

Pour annuler : retirer la ligne ajoutée de `/etc/hosts`.

#### Méthode 3 : Modifier l'URL Supabase (dev uniquement)

1. Dans `lib/supabase.ts`, modifier temporairement l'URL :

```typescript
// TEMPORAIRE — pour tester les erreurs réseau
const SUPABASE_URL = "https://invalide.supabase.co";
```

2. Relancer l'app
3. Tester toutes les pages
4. **Ne pas oublier de remettre l'URL correcte après le test !**

#### Méthode 4 : Throttling réseau (Chrome DevTools — web uniquement)

1. Lancer l'app en mode web (`npx expo start --web`)
2. Ouvrir Chrome DevTools (F12)
3. Onglet **Network** > **Throttling** > choisir "Offline" ou "Slow 3G"
4. Tester les interactions

#### Méthode 5 : Proxy Charles / mitmproxy

1. Installer Charles Proxy ou mitmproxy
2. Configurer le proxy sur l'appareil/émulateur
3. Bloquer les requêtes vers `*.supabase.co`
4. Tester le comportement de l'app

### 3.2 Scénarios à tester

| Scénario | Page | Action | Résultat attendu |
|----------|------|--------|------------------|
| Connexion offline | Login | Se connecter | Message d'erreur réseau |
| Chat offline | Chat | Envoyer un message | Erreur affichée, message non envoyé |
| Dépense offline | Dépenses | Ajouter une dépense | Erreur affichée |
| Pull-to-refresh offline | Toutes | Tirer vers le bas | L'indicateur se termine, pas de crash |
| Retour en ligne | Toutes | Désactiver mode avion | Les données se rechargent au prochain refresh |
| Upload fichier offline | Documents | Uploader un fichier | Erreur affichée |
| Création coloc offline | Join | Créer une coloc | Erreur affichée |
| Realtime déconnexion | Chat | Couper le réseau pendant un chat actif | La connexion Realtime se rétablit automatiquement |

### 3.3 Comportement attendu global

- **Pas de crash** : l'app ne doit jamais crasher en cas d'erreur réseau
- **Messages clairs** : l'utilisateur doit comprendre ce qui s'est passé
- **Données locales préservées** : les données déjà chargées restent affichées
- **Récupération automatique** : au retour du réseau, un pull-to-refresh doit suffire
- **Realtime** : les subscriptions Supabase Realtime se reconnectent automatiquement

### 3.4 Vérification des timeouts

Supabase a des timeouts par défaut. Pour tester le comportement avec des latences élevées :

1. Utiliser le throttling "Slow 3G" dans Chrome DevTools (mode web)
2. Vérifier que les spinners/loaders s'affichent pendant le chargement
3. Vérifier qu'il n'y a pas de double-soumission (boutons désactivés pendant le loading)

---

## 4. Checklist pré-déploiement

- [ ] Inscription email + mot de passe fonctionne
- [ ] Inscription magic link fonctionne
- [ ] Créer une coloc fonctionne (+ 14 tâches par défaut créées)
- [ ] Rejoindre une coloc fonctionne
- [ ] Les données sont isolées entre colocs (RLS)
- [ ] L'app ne crashe pas en mode avion
- [ ] Les erreurs réseau affichent des messages compréhensibles
- [ ] Pull-to-refresh fonctionne sur toutes les pages
- [ ] L'icône de l'app est correcte (tipi_icon)
- [ ] L'onboarding s'affiche au premier lancement
- [ ] Le thème sombre fonctionne correctement
