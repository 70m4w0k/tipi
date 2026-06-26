# 🏠 Tipi - Guide de test multi-appareils

## ✅ Prérequis

- Serveur backend prêt
- App mobile avec ChatScreen
- 2 téléphones/appareils sur le même Wi-Fi
- IP PC connue : `192.168.1.171`

## 📋 Étapes de lancement

### 1️⃣ Lancer le serveur backend

**Terminal 1 (PowerShell) :**

```powershell
cd c:\Users\thomas.pelissier\Documents\interne\tipi\server
npm start
```

✅ Vous devriez voir :

```
Serveur chat running on http://0.0.0.0:3000
API disponible sur http://192.168.1.171:3000/api/chat/messages
```

### 2️⃣ Lancer l'app Expo

**Terminal 2 (PowerShell, dans le dossier principal tipi) :**

```powershell
cd c:\Users\thomas.pelissier\Documents\interne\tipi
npx expo start --lan --port 8081 --clear
```

✅ Vous devriez voir un QR code et une URL `exp://192.168.1.171:8081`

### 3️⃣ Ouvrir l'app sur 2 appareils

**Appareil 1 :**

1. Ouvre Expo Go
2. Scanne le QR code OU tape manuellement `exp://192.168.1.171:8081`
3. Sélectionne l'utilisateur **"Thomas"** en haut

**Appareil 2 :**

1. Ouvre Expo Go
2. Même QR code / URL
3. Sélectionne l'utilisateur **"Camille"** en haut

### 4️⃣ Tester les fonctionnalités

#### 🗨️ **Messages texte :**

- Appareil 1 (Thomas) : tape "Coucou Camille !"
- Appareil 1 : appuie sur ↗️
- ✅ Appareil 2 devrait voir le message en 1-2 secondes (polling toutes les 2s)

#### 📷 **Photos :**

- Appareil 1 : appuie sur 📷
- Sélectionne une photo depuis la galerie
- Appuie sur "Envoyer image"
- ✅ Appareil 2 devrait voir la miniature de la photo

#### 📊 **Sondages :**

- Appareil 1 : appuie sur 📊
- Tape la question : "Quoi manger ce soir ?"
- Ajoute 3 options : "Pizza", "Burger", "Salade"
- Appuie sur "Créer"
- ✅ Appareil 2 voit le sondage
- Appareil 2 : clique sur une option pour voter
- ✅ Appareil 1 voit le vote en quasi-temps réel

#### 👍 **Réactions emoji :**

- Appareil 1 : appuie **longtemps** sur un message reçu
- Sélectionne un emoji (👍, ❤️, 😂, etc.)
- ✅ Appareil 2 voit la réaction avec le compteur

#### ✓✓ **Statut de lecture :**

- Tous les messages montrent ✓✓ si lus par toi
- ✅ Le statut se met à jour en 2s

## 🔧 Dépannage

**Le serveur démarre mais l'app dit "connexion au serveur échouée"**
→ Vérifie que tu peux accéder à `http://192.168.1.171:3000/api/chat/messages` depuis le navigateur du téléphone

**Les messages ne sync pas**
→ Attends 2-3 secondes (polling toutes les 2s)
→ Vérifiez que tu es bien sur le même Wi-Fi
→ Redémarre l'app (R ou secoue)

**Les images ne s'affichent pas**
→ C'est normal — elles sont stockées en local (file:// URI)
→ Sur téléphone 1 OK, sur téléphone 2 KO (chemins différents)
→ À améliorer : upload images sur serveur

## 🎯 Améliorations futures

- [ ] Upload images vers serveur (au lieu de stockage local)
- [ ] WebSocket au lieu de polling (réductions bande)
- [ ] Notifications push quand nouveau message
- [ ] Typing indicator ("Thomas est en train d'écrire...")
- [ ] Suppression/édition de messages
- [ ] Groupes de chat (au lieu de 1 seul groupe)
