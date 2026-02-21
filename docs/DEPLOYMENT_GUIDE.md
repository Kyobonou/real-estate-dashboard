# Guide Déploiement: Workflow MCP Wasender

**Date:** 2026-02-20
**Workflow:** Imm supabase MCP
**Fichier Migré:** `Imm supabase.mcp-migrated.json`

---

## 📋 Checklist Pré-Déploiement

### Variables d'Environnement ✅
- [ ] `WASENDER_MCP_TOKEN` configuré en n8n
  - Format: `Bearer eyJhbGciOi...`
  - Source: https://wasenderapi.com/settings/tokens

- [ ] `WASENDER_MCP_ENDPOINT` configuré (optionnel)
  - Default: `https://wasenderapi.com/mcp`

- [ ] `AGENCY_ALERT_PHONE` configuré
  - Format: `225XXXXXXXXX`
  - Utilisé par: MCP: Alerter Agence (Fallback)

### Validation Locale
- [ ] Workflow JSON bien formé
  ```bash
  python3 -m json.tool "Imm supabase.mcp-migrated.json" > /dev/null
  ```

- [ ] Backup créé
  - ✅ Fichier: `Imm supabase.backup-20260220_164810.json`

---

## 🚀 Étapes de Déploiement

### Phase 1: Préparation (15 min)

#### 1.1 Vérifier les tokens
```bash
# Tester la connexion MCP
curl -H "Authorization: Bearer $WASENDER_MCP_TOKEN" \
  https://wasenderapi.com/mcp/schema
```

#### 1.2 Préparer l'environnement n8n
```bash
# Ajouter variables en .env ou via n8n UI
WASENDER_MCP_TOKEN=your_token_here
WASENDER_MCP_ENDPOINT=https://wasenderapi.com/mcp
AGENCY_ALERT_PHONE=225xxxxxxxxxx
```

### Phase 2: Import du Workflow (10 min)

#### 2.1 Importer le workflow MCP
- Option A: Via UI n8n
  1. Aller à "Workflows" → "Import"
  2. Sélectionner `Imm supabase.mcp-migrated.json`
  3. Créer nouveau workflow

- Option B: Via API
  ```bash
  curl -X POST https://yobed-n8n-supabase-claude.hf.space/api/v1/workflows \
    -H "Authorization: Bearer $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @Imm supabase.mcp-migrated.json
  ```

#### 2.2 Valider les nodes
- ✅ 5 nodes MCP présents (Decrypter Image, Audio, Send, Notify, Alert)
- ✅ 40 autres nodes intacts
- ✅ Toutes les connexions intactes

### Phase 3: Test Unitaire des Nodes (20 min)

#### 3.1 Tester MCP: Decrypter Image
```json
Input:
{
  "messageId": "test-message-123",
  "sessionId": "default"
}

Expected Output:
{
  "decryptedUrl": "https://...",
  "mediaType": "image",
  "success": true
}
```

#### 3.2 Tester MCP: Decrypter Audio
```json
Input:
{
  "messageId": "test-audio-456",
  "sessionId": "default"
}

Expected Output:
{
  "decryptedUrl": "https://...",
  "mediaType": "audio",
  "duration": 45.2,
  "success": true
}
```

#### 3.3 Tester MCP: Envoyer Reponse WhatsApp
```json
Input:
{
  "sessionId": "default",
  "phone": "225xxxxxxxxxx",
  "reply": "Bonjour! Comment puis-je vous aider?"
}

Expected Output:
{
  "messageId": "msg-xxxxx",
  "status": "sent",
  "timestamp": "2026-02-20T16:48:10.000Z"
}
```

#### 3.4 Tester MCP: Notifier Proprietaire
```json
Input:
{
  "sessionId": "default",
  "owner_phone": "225xxxxxxxxxx",
  "visitor_name": "Jean Dupont",
  "visitor_phone": "225yyyyyyyyy",
  "visit_date": "2026-02-21 14:30"
}

Expected Output:
{
  "messageId": "msg-xxxxx",
  "status": "sent",
  "timestamp": "2026-02-20T16:48:10.000Z"
}
```

#### 3.5 Tester MCP: Alerter Agence
```json
Input:
{
  "sessionId": "default",
  "client_phone": "225xxxxxxxxxx",
  "error_message": "Agent timeout",
  "property_ref": "BG-000123"
}

Expected Output:
{
  "messageId": "msg-xxxxx",
  "status": "sent",
  "timestamp": "2026-02-20T16:48:10.000Z"
}
```

### Phase 4: Test d'Intégration (30 min)

#### 4.1 Tester le workflow complet
- Simuler message WhatsApp entrant
- Vérifier que le workflow s'exécute
- Confirmer tous les nodes MCP s'exécutent correctement
- Vérifier réponse envoyée au client

#### 4.2 Tester gestion d'erreur
- Tester avec token MCP invalide
  - Expected: Erreur explicite, workflow continue (onError: continueRegularOutput)

- Tester avec phone invalide
  - Expected: Message d'erreur, log créé

#### 4.3 Tester performance
- Mesurer temps d'exécution
  - Target: < 5s par message
- Vérifier pas de fuites mémoire

### Phase 5: Monitoring (Continu)

#### 5.1 Métriques à suivre
```
- Exécutions réussies: > 95%
- Temps moyen: 2-4 secondes
- Erreurs MCP: < 1%
- Taux fallback: < 5%
```

#### 5.2 Alerts
- [ ] Configurer alerte si taux erreur > 5%
- [ ] Configurer alerte si temps > 10s
- [ ] Configurer alerte si MCP endpoint down

---

## ⚠️ Plan de Rollback

Si problèmes détectés:

### Option 1: Revenir à HTTP (2 min)
```bash
# Restaurer backup
cp Imm supabase.backup-20260220_164810.json Imm supabase.json

# Redéployer en n8n
```

### Option 2: Mode Hybride
- Garder nouveaux nœuds MCP
- Revertir 1-2 nodes spécifiques à HTTP
- Investiguer problème avant nouveau déploiement

### Option 3: Désactiver MCP progressivement
- Si erreur, désactiver nœud MCP
- Switch automatique à HTTP fallback
- Laisser temps pour investigation

---

## 📊 Comparatif: HTTP vs MCP

| Métrique | HTTP REST | MCP Client |
|----------|-----------|-----------|
| **Setup** | 5 min | 3 min |
| **Erreurs** | HTTP 5xx | MCP typed |
| **Rate Limit** | Strict | Plus flexible |
| **Monitoring** | Manuelle | Built-in |
| **Type Safety** | Non | Oui |
| **Session Mgmt** | Manual | Auto |

---

## 📝 Notes Importantes

### Migration réussie ✅
- 5/5 nœuds HTTP convertis en MCP
- 0 breaking changes identifiées
- Webhook Wassender inchangé
- Base de données inchangée

### Variables à vérifier
```
WASENDER_MCP_TOKEN      ✅ Requis
WASENDER_MCP_ENDPOINT   ⚠️ Optionnel (default OK)
AGENCY_ALERT_PHONE      ✅ Requis
```

### Points d'attention
1. **Token MCP différent du token API REST**
   - Générer nouveau depuis settings Wasender
   - Format Bearer token

2. **Endpoints MCP vs REST**
   - HTTP: `https://www.wasenderapi.com/api/send-message`
   - MCP: `https://wasenderapi.com/mcp` (base endpoint)

3. **Session Management**
   - MCP gère sessions intelligemment
   - Moins d'erreurs "session not found"

---

## 🆘 Troubleshooting

### Erreur: "MCP endpoint not reachable"
```
Solution:
1. Vérifier WASENDER_MCP_ENDPOINT config
2. Tester connectivity: curl https://wasenderapi.com/mcp
3. Vérifier firewall/proxy settings
```

### Erreur: "Invalid token"
```
Solution:
1. Vérifier WASENDER_MCP_TOKEN est correct
2. Vérifier token pas expiré
3. Générer nouveau token si besoin
4. Format: Bearer eyJhbGciOi... (pas "Bearer Bearer...")
```

### Messages pas envoyés
```
Solution:
1. Vérifier phone format: 225XXXXXXXXX
2. Vérifier session est active
3. Vérifier quotas Wasender
4. Voir logs d'exécution pour détails
```

---

## ✅ Post-Déploiement

Après déploiement réussi:
- [ ] Documenter temps de déploiement
- [ ] Monitorer 24h pour stabilité
- [ ] Archiver version précédente HTTP
- [ ] Communiquer changement à l'équipe
- [ ] Ajouter MCP à documentation interne

---

**Équipe:** DevOps / Engineering
**Contact:** support@immodash.local
**Status:** Prêt pour déploiement ✅
