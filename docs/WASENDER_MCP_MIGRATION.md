# Migration Wasender: HTTP REST API → MCP Client Tool

**Date:** 2026-02-20
**Workflow:** Imm supabase (ID: `LTZJrc7tYwv6Qm6a5wtZ0`)
**Statut:** Plan de migration

---

## 📋 Résumé Exécutif

Le workflow utilise actuellement **5 nœuds HTTP REST** pour communiquer avec l'API Wasender. L'intégration MCP offre:

✅ **Avantages:**
- Type-safe via MCP Protocol
- Gestion d'erreur standardisée
- Session management natif
- Meilleure documentation des outils
- Résilience améliorée

---

## 🔍 Nœuds à Migrer

### 1. **Decrypter Image** (n8n ID: `30a85905-eaf8-4baf-b5b3-166d4070c0e8`)
- **Type Actuel:** HTTP POST
- **URL:** `https://www.wasenderapi.com/api/decrypt-media`
- **Fonction:** Déchiffrer les médias image depuis Wasender
- **Corps:** `{ "messageId": "...", "sessionId": "..." }`
- **MCP Remplaçant:** `decrypt_media` tool

### 2. **Decrypter Audio** (n8n ID: `41a2baf6-1971-4306-95a9-b3c46738b384`)
- **Type Actuel:** HTTP POST
- **URL:** `https://www.wasenderapi.com/api/decrypt-media`
- **Fonction:** Déchiffrer les médias audio depuis Wasender
- **MCP Remplaçant:** `decrypt_media` tool

### 3. **Envoyer Reponse WhatsApp** (n8n ID: `32747c58-5651-41a8-a7ac-02525e22307c`)
- **Type Actuel:** HTTP POST
- **URL:** `https://www.wasenderapi.com/api/send-message`
- **Fonction:** Envoyer la réponse de l'agent au client
- **Corps:** `{ "phone": "...", "text": "...", "sessionId": "..." }`
- **MCP Remplaçant:** `send_text_message` tool

### 4. **Notifier Proprietaire** (n8n ID: `ec0d772d-de5d-4b7b-9428-7be541a50e22`)
- **Type Actuel:** HTTP POST
- **URL:** `https://www.wasenderapi.com/api/send-message`
- **Fonction:** Notifier le propriétaire d'une nouvelle visite
- **MCP Remplaçant:** `send_text_message` tool

### 5. **Alerter Agence (Fallback)** (n8n ID: `e08400f3-b3b1-43b5-9c8b-098b89dab530`)
- **Type Actuel:** HTTP POST
- **URL:** `https://www.wasenderapi.com/api/send-message`
- **Fonction:** Alerte fallback si agent échoue
- **MCP Remplaçant:** `send_text_message` tool

---

## 🛠 Configuration MCP Wasender

### Prérequis
1. **n8n MCP Client Tool** disponible
2. **Endpoint MCP:** `https://wasenderapi.com/mcp`
3. **Auth:** `Bearer {{ $env.WASENDER_MCP_TOKEN }}` (header Authorization)

### Structure d'un Nœud MCP Client

```json
{
  "type": "n8n-nodes-base.mcp",
  "typeVersion": 1,
  "name": "MCP: Decrypt Media",
  "parameters": {
    "mcpUrl": "https://wasenderapi.com/mcp",
    "headers": {
      "Authorization": "=Bearer {{ $env.WASENDER_MCP_TOKEN }}"
    },
    "tool": "decrypt_media",
    "arguments": {
      "session_id": "={{ $json.sessionId }}",
      "message_id": "={{ $json.messageId }}"
    }
  }
}
```

---

## 📦 Opérations MCP Wasender Disponibles

### Gestion des Sessions
- `create_session()` → Créer une nouvelle session WhatsApp
- `get_session_qr_code(sessionId)` → Récupérer le code QR
- `connect_session(sessionId)` → Connecter une session
- `disconnect_session(sessionId)` → Déconnecter une session
- `get_session_status(sessionId)` → État de la session

### Messagerie
- `send_text_message(sessionId, phone, text)` → Texte
- `send_media_message(sessionId, phone, url, mediaType, caption)` → Image/Vidéo/Document/Audio
- `send_location_message(sessionId, phone, latitude, longitude)` → Localisation
- `send_poll_message(sessionId, phone, question, options)` → Sondage

### Gestion des Contacts
- `add_contact(sessionId, phone, name)` → Ajouter contact
- `edit_contact(sessionId, phone, newName)` → Renommer
- `block_contact(sessionId, phone)` → Bloquer
- `check_contact_exists(sessionId, phone)` → Vérifier si sur WhatsApp

### Déchiffrage
- `decrypt_media(messageId, sessionId)` → Déchiffrer média

---

## 🚀 Plan de Déploiement

### Phase 1: Préparation (Aujourd'hui)
- [ ] Valider token MCP Wasender en .env
- [ ] Créer fichier de configuration MCP
- [ ] Documenter mapping HTTP → MCP

### Phase 2: Migration Progressive
- [ ] Étape 1: Migrer `Decrypter Image` et `Decrypter Audio`
- [ ] Étape 2: Migrer `Envoyer Reponse WhatsApp`
- [ ] Étape 3: Migrer `Notifier Proprietaire`
- [ ] Étape 4: Migrer `Alerter Agence (Fallback)`

### Phase 3: Test & Validation
- [ ] Tester chaque nœud MCP en isolation
- [ ] Valider workflow complet
- [ ] Vérifier gestion erreurs

### Phase 4: Optimisation
- [ ] Ajouter `get_session_status()` avant chaque envoi
- [ ] Implémenter cache session
- [ ] Ajouter retry logic

---

## 📝 Variables d'Environnement Requises

```bash
# Actuel
WASENDER_API_KEY=eyJhbGciOi...

# Nouveau (MCP)
WASENDER_MCP_TOKEN=eyJhbGciOi...
WASENDER_MCP_ENDPOINT=https://wasenderapi.com/mcp
```

---

## ✅ Checklist Avant Déploiement

- [ ] Tous les 5 nœuds migré
- [ ] Tests avec données réelles
- [ ] Pas de breaking changes en base
- [ ] Documentation mise à jour
- [ ] Token MCP validé
- [ ] Webhook encore fonctionnel
- [ ] Version précédente sauvegardée

---

## 🔄 Rollback Plan

Si problème détecté:
1. Récupérer backup workflow (`Imm supabase.json.backup`)
2. Déployer version précédente
3. Investiguer erreur MCP
4. Revalidation avant nouveau déploiement
