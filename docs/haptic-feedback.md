# Haptic Feedback — Actions clés

Liste des actions avec retour haptique dans l'app Tipi.

## Types de feedback

| Type | Utilisation |
|------|-------------|
| `light` | Sélection, toggle, navigation |
| `medium` | Confirmation d'action réussie |
| `heavy` | Action destructive confirmée |
| `success` | Action complétée avec succès |
| `warning` | Action irréversible (confirmation) |
| `error` | Erreur ou action échouée |

## Actions par page

### Global
- **Pull-to-refresh** déclenché → `light`

### Chat
- **Envoyer un message** → `light`
- **Envoyer une image** → `medium`
- **Créer un sondage** → `medium`
- **Ajouter une réaction** (long press) → `light`
- **Voter dans un sondage** → `light`

### Dépenses
- **Ajouter une dépense** → `success`
- **Supprimer une dépense** → `warning`
- **Changer de catégorie** → `light`
- **Sélectionner un payeur** → `light`

### Ménage
- **Marquer une contribution** (tap cellule grille) → `light`
- **Ajouter une tâche** → `medium`
- **Supprimer une tâche** → `warning`
- **Marquer rappel fait** → `success`

### Courses
- **Ajouter un article** → `light`
- **Cocher/décocher un article** → `light`
- **Supprimer un article** → `warning`
- **Vider les articles cochés** → `warning`

### Courses
- **"J'y vais !"** → `medium`

### Recettes
- **Ajouter une recette** → `medium`
- **Démarrer une instance** → `medium`
- **Avancer une étape** → `success`
- **Revenir à l'étape précédente** → `light`
- **Ouvrir le mode cuisine** → `medium`
- **Démarrer le minuteur** → `medium`
- **Minuteur terminé** → `success`
- **Supprimer une recette/instance** → `warning`

### Documents
- **Importer un document** → `medium`
- **Supprimer un document** → `warning`

### Profil
- **Changer de couleur** → `light`
- **Déconnexion** → `heavy`
- **Quitter la coloc** → `heavy`
