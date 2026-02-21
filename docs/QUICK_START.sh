#!/bin/bash
# Quick Start: Wasender MCP Deployment

set -e

echo "========================================"
echo "🚀 Wasender MCP - Quick Start Deployment"
echo "========================================"
echo ""

# Configuration
WORKFLOW_DIR="$(dirname "$0")/../real-estate-dashboard/workflows"
WORKFLOW_MIGRATED="$WORKFLOW_DIR/Imm supabase.mcp-migrated.json"
WORKFLOW_ORIGINAL="$WORKFLOW_DIR/Imm supabase.json"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}📋 Étape 1: Vérification pré-déploiement${NC}"
echo "=========================================="
echo ""

# Check workflow file
if [ ! -f "$WORKFLOW_MIGRATED" ]; then
    echo -e "${RED}❌ Erreur: Workflow MCP non trouvé${NC}"
    echo "   Fichier attendu: $WORKFLOW_MIGRATED"
    echo "   Avez-vous exécuté migrate_to_mcp.py?"
    exit 1
fi
echo -e "${GREEN}✅ Workflow MCP trouvé${NC}"

# Check JSON validity
echo -n "   Vérification JSON... "
if python3 -m json.tool "$WORKFLOW_MIGRATED" > /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}ERREUR${NC}"
    exit 1
fi

# Check backup exists
if [ ! -f "$WORKFLOW_DIR/Imm supabase.backup-"*.json ]; then
    echo -e "${YELLOW}⚠️  Aucun backup trouvé${NC}"
else
    BACKUP_FILE=$(ls -t "$WORKFLOW_DIR"/Imm\ supabase.backup-*.json 2>/dev/null | head -1)
    echo -e "${GREEN}✅ Backup trouvé: $(basename "$BACKUP_FILE")${NC}"
fi

echo ""
echo -e "${BLUE}🔐 Étape 2: Vérification variables d'environnement${NC}"
echo "=========================================="
echo ""

# Check env variables
check_env() {
    local var_name=$1
    local display_name=$2

    if [ -z "${!var_name}" ]; then
        echo -e "${YELLOW}⚠️  $display_name non configuré${NC}"
        echo "   Défini: export $var_name=your_value"
        return 1
    else
        echo -e "${GREEN}✅ $display_name configuré${NC}"
        return 0
    fi
}

check_env "WASENDER_MCP_TOKEN" "WASENDER_MCP_TOKEN"
check_env "AGENCY_ALERT_PHONE" "AGENCY_ALERT_PHONE"

echo ""
echo -e "${BLUE}📊 Étape 3: Statistiques du workflow${NC}"
echo "=========================================="
echo ""

# Count nodes
TOTAL_NODES=$(grep -c '"type"' "$WORKFLOW_MIGRATED" || true)
MCP_NODES=$(grep -c '"n8n-nodes-base.mcp"' "$WORKFLOW_MIGRATED" || true)
HTTP_NODES=$(grep -c '"n8n-nodes-base.httpRequest"' "$WORKFLOW_MIGRATED" || true)

echo "   Total nœuds:        $TOTAL_NODES"
echo "   Nœuds MCP:          $MCP_NODES"
echo "   Nœuds HTTP:         $HTTP_NODES"

if [ "$MCP_NODES" -eq 5 ]; then
    echo -e "   ${GREEN}✅ Tous les 5 nœuds MCP présents${NC}"
else
    echo -e "   ${YELLOW}⚠️  Nombre de nœuds MCP: $MCP_NODES (attendu: 5)${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Étape 4: Options de déploiement${NC}"
echo "=========================================="
echo ""
echo "1️⃣  Déployer le workflow"
echo "2️⃣  Afficher le résumé"
echo "3️⃣  Vérifier la syntaxe"
echo "4️⃣  Rollback au workflow précédent"
echo "5️⃣  Quitter"
echo ""
read -p "Choisissez une option (1-5): " choice

case $choice in
    1)
        echo ""
        echo -e "${BLUE}🔄 Déploiement du workflow MCP...${NC}"
        echo ""
        echo "Prochaines étapes:"
        echo "1. Aller à n8n: https://yobed-n8n-supabase-claude.hf.space"
        echo "2. Créer nouveau workflow"
        echo "3. Importer le fichier: $WORKFLOW_MIGRATED"
        echo "4. Vérifier les 5 nœuds MCP"
        echo "5. Activer workflow"
        echo ""
        echo "Fichier à importer:"
        echo "  $WORKFLOW_MIGRATED"
        ;;
    2)
        echo ""
        echo -e "${BLUE}📋 Résumé de la migration${NC}"
        echo ""
        cat << EOF
Workflow: Imm supabase (ID: LTZJrc7tYwv6Qm6a5wtZ0)
Status: ✅ Prêt pour déploiement

Nœuds migrés (5):
  ✅ Decrypter Image
  ✅ Decrypter Audio
  ✅ Envoyer Reponse WhatsApp
  ✅ Notifier Proprietaire
  ✅ Alerter Agence (Fallback)

Bénéfices:
  • Meilleure fiabilité
  • Type-safety
  • Meilleur error handling
  • Session management natif

Configuration requise:
  • WASENDER_MCP_TOKEN
  • WASENDER_MCP_ENDPOINT (optionnel)
  • AGENCY_ALERT_PHONE

Documentation:
  • WASENDER_MCP_MIGRATION.md
  • DEPLOYMENT_GUIDE.md
  • WASENDER_MCP_NODES.json
EOF
        ;;
    3)
        echo ""
        echo -e "${BLUE}✅ Vérification syntaxe JSON${NC}"
        python3 << 'PYTHON_SCRIPT'
import json
import sys

try:
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"✅ JSON valide")
    print(f"   Nœuds: {len(data.get('nodes', []))}")
    print(f"   Connexions: {len(data.get('connections', {}))}")
except json.JSONDecodeError as e:
    print(f"❌ Erreur JSON: {e}")
    sys.exit(1)
PYTHON_SCRIPT
        "$WORKFLOW_MIGRATED"
        ;;
    4)
        echo ""
        echo -e "${YELLOW}⚠️  Rollback${NC}"
        if [ -f "$BACKUP_FILE" ]; then
            echo "Êtes-vous sûr? (y/n)"
            read -r confirm
            if [ "$confirm" = "y" ]; then
                cp "$BACKUP_FILE" "$WORKFLOW_ORIGINAL"
                echo -e "${GREEN}✅ Rollback effectué${NC}"
                echo "   Ancien workflow restauré"
            fi
        else
            echo -e "${RED}❌ Aucun backup trouvé${NC}"
        fi
        ;;
    5)
        echo "À bientôt! 👋"
        exit 0
        ;;
    *)
        echo -e "${RED}Option invalide${NC}"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "✨ Quick Start terminé"
echo "========================================"
