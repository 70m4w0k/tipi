const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "messages.json");

// Charger les messages au démarrage
let messages = [];
function loadMessages() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      messages = JSON.parse(raw);
    }
  } catch (err) {
    console.error("Erreur lecture messages.json:", err);
    messages = [];
  }
}

// Sauvegarder les messages
function saveMessages() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error("Erreur sauvegarde messages.json:", err);
  }
}

// GET /api/chat/messages - Récupérer tous les messages
app.get("/api/chat/messages", (req, res) => {
  res.json({ messages });
});

// POST /api/chat/send - Envoyer un message
app.post("/api/chat/send", (req, res) => {
  const { id, author, type, content, poll, sentAt } = req.body;

  if (!id || !author || !type || !sentAt) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  const message = {
    id,
    author,
    type, // 'text' | 'image' | 'poll'
    content,
    poll: poll || null,
    reactions: {},
    sentAt,
    readBy: [author], // L'auteur a "lu" son propre message
  };

  messages.push(message);
  saveMessages();
  res.json({ success: true, message });
});

// POST /api/chat/:messageId/reaction - Ajouter une réaction
app.post("/api/chat/:messageId/reaction", (req, res) => {
  const { messageId } = req.params;
  const { emoji, userName } = req.body;

  const msg = messages.find((m) => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: "Message introuvable" });
  }

  if (!msg.reactions[emoji]) {
    msg.reactions[emoji] = [];
  }

  if (!msg.reactions[emoji].includes(userName)) {
    msg.reactions[emoji].push(userName);
  } else {
    msg.reactions[emoji] = msg.reactions[emoji].filter((u) => u !== userName);
    if (msg.reactions[emoji].length === 0) {
      delete msg.reactions[emoji];
    }
  }

  saveMessages();
  res.json({ success: true, message: msg });
});

// POST /api/chat/:messageId/vote - Voter dans un sondage
app.post("/api/chat/:messageId/vote", (req, res) => {
  const { messageId } = req.params;
  const { optionId, userName } = req.body;

  const msg = messages.find((m) => m.id === messageId);
  if (!msg || !msg.poll) {
    return res.status(404).json({ error: "Sondage introuvable" });
  }

  const option = msg.poll.options.find((o) => o.id === optionId);
  if (!option) {
    return res.status(404).json({ error: "Option introuvable" });
  }

  // Enlever le vote précédent si existe
  msg.poll.options.forEach((o) => {
    o.votes = o.votes.filter((v) => v !== userName);
  });

  // Ajouter le nouveau vote
  if (!option.votes.includes(userName)) {
    option.votes.push(userName);
  }

  saveMessages();
  res.json({ success: true, message: msg });
});

// POST /api/chat/:messageId/read - Marquer comme lu
app.post("/api/chat/:messageId/read", (req, res) => {
  const { messageId } = req.params;
  const { userName } = req.body;

  const msg = messages.find((m) => m.id === messageId);
  if (!msg) {
    return res.status(404).json({ error: "Message introuvable" });
  }

  if (!msg.readBy.includes(userName)) {
    msg.readBy.push(userName);
  }

  saveMessages();
  res.json({ success: true, message: msg });
});

// DELETE /api/chat/:messageId - Supprimer un message
app.delete("/api/chat/:messageId", (req, res) => {
  const { messageId } = req.params;
  const { userName } = req.body;

  const msgIndex = messages.findIndex((m) => m.id === messageId);
  if (msgIndex === -1) {
    return res.status(404).json({ error: "Message introuvable" });
  }

  const msg = messages[msgIndex];
  // Seulement l'auteur peut supprimer
  if (msg.author !== userName) {
    return res.status(403).json({ error: "Non autorisé" });
  }

  messages.splice(msgIndex, 1);
  saveMessages();
  res.json({ success: true });
});

const PORT = 3000;
loadMessages();
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur chat running on http://0.0.0.0:${PORT}`);
  console.log(
    `API disponible sur http://192.168.1.171:${PORT}/api/chat/messages`,
  );
});
