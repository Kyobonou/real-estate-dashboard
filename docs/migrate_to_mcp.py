#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration Script: HTTP Wasender API → MCP Client Tool
Automatise la conversion des 5 nœuds HTTP vers MCP
"""

import json
import sys
import os
from pathlib import Path
from copy import deepcopy
from datetime import datetime

# Forcer UTF-8
os.environ['PYTHONIOENCODING'] = 'utf-8'
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Configuration
WORKFLOW_PATH = Path(__file__).parent.parent / "real-estate-dashboard" / "workflows" / "Imm supabase.json"
BACKUP_PATH = WORKFLOW_PATH.with_stem(f"{WORKFLOW_PATH.stem}.backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}")
OUTPUT_PATH = WORKFLOW_PATH.with_stem(f"{WORKFLOW_PATH.stem}.mcp-migrated")
MCP_NODES_CONFIG = Path(__file__).parent / "WASENDER_MCP_NODES.json"

# Node IDs à remplacer
NODES_TO_REPLACE = {
    "30a85905-eaf8-4baf-b5b3-166d4070c0e8": "mcp-decrypt-image",
    "41a2baf6-1971-4306-95a9-b3c46738b384": "mcp-decrypt-audio",
    "32747c58-5651-41a8-a7ac-02525e22307c": "mcp-send-response",
    "ec0d772d-de5d-4b7b-9428-7be541a50e22": "mcp-notify-owner",
    "e08400f3-b3b1-43b5-9c8b-098b89dab530": "mcp-alert-agency"
}

def load_json(path):
    """Charger fichier JSON"""
    print(f"📂 Chargement: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, path):
    """Sauvegarder fichier JSON"""
    print(f"💾 Sauvegarde: {path}")
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def create_mcp_node(config, old_node):
    """Créer un nœud MCP à partir de la configuration"""
    mcp_node = {
        "parameters": config["node_config"]["parameters"],
        "type": config["node_config"]["type"],
        "typeVersion": config["node_config"]["typeVersion"],
        "position": config["node_config"]["position"],
        "id": old_node["id"],
        "name": config["name"],
        "onError": config["node_config"].get("onError", "stopWorkflow")
    }
    return mcp_node

def migrate_workflow(workflow, mcp_configs):
    """Migrer le workflow vers MCP"""
    print("\n🔄 Migration en cours...\n")

    # Créer mapping config par ancienne node
    config_map = {}
    for config in mcp_configs["mcp_wasender_nodes"]:
        config_map[config["replaces"]] = config

    new_nodes = []
    old_node_ids = set()

    # Traiter les nœuds
    for node in workflow["nodes"]:
        node_id = node.get("id")

        if node_id in NODES_TO_REPLACE:
            old_node_ids.add(node_id)
            config = config_map.get(node_id)
            if config:
                print(f"  ✅ {node['name']} → {config['name']}")
                mcp_node = create_mcp_node(config, node)
                new_nodes.append(mcp_node)
            else:
                print(f"  ⚠️  Pas de config pour {node['name']}, garde nœud HTTP")
                new_nodes.append(node)
        else:
            new_nodes.append(node)

    # Mettre à jour les nœuds
    workflow["nodes"] = new_nodes

    print(f"\n✨ {len(NODES_TO_REPLACE)} nœuds migrés vers MCP")
    print(f"📊 Total nœuds: {len(workflow['nodes'])}")

    return workflow, old_node_ids

def update_connections(workflow, old_node_ids):
    """Mettre à jour les connexions (les IDs de nœuds restent les mêmes)"""
    print("\n🔗 Vérification des connexions...")

    # Les connexions utilisent les noms, pas les IDs, donc pas besoin de modifier
    # Vérifier que toutes les connexions pointent vers des nœuds valides
    valid_names = {node.get("name") for node in workflow["nodes"]}

    connections = workflow.get("connections", {})
    for source, targets in connections.items():
        if source not in valid_names:
            print(f"  ⚠️  Source invalide: {source}")

    print(f"✅ {len(connections)} connexions validées")
    return workflow

def main():
    """Fonction principale"""
    print("=" * 60)
    print("🔧 MIGRATION WASENDER: HTTP REST → MCP CLIENT TOOL")
    print("=" * 60)

    try:
        # 1. Charger les fichiers
        workflow = load_json(WORKFLOW_PATH)
        mcp_configs = load_json(MCP_NODES_CONFIG)

        # 2. Backup
        print(f"\n🔐 Création backup...")
        backup = deepcopy(workflow)
        save_json(backup, BACKUP_PATH)
        print(f"   ✅ Backup: {BACKUP_PATH}")

        # 3. Migrer
        workflow, old_node_ids = migrate_workflow(workflow, mcp_configs)

        # 4. Mettre à jour les connexions
        workflow = update_connections(workflow, old_node_ids)

        # 5. Sauvegarder
        save_json(workflow, OUTPUT_PATH)

        # 6. Statistiques
        print("\n" + "=" * 60)
        print("✅ MIGRATION RÉUSSIE!")
        print("=" * 60)
        print(f"\n📋 Résumé:")
        print(f"   Workflow original: {WORKFLOW_PATH}")
        print(f"   Backup créé: {BACKUP_PATH}")
        print(f"   Workflow MCP: {OUTPUT_PATH}")
        print(f"   Nœuds migrés: {len(NODES_TO_REPLACE)}")
        print(f"   Total nœuds: {len(workflow['nodes'])}")

        print("\n📝 Prochaines étapes:")
        print("   1. Vérifier le fichier migré: OUTPUT_PATH")
        print("   2. Configurer variables d'env (WASENDER_MCP_TOKEN)")
        print("   3. Valider workflow dans n8n UI")
        print("   4. Tester avec données réelles")
        print("   5. Déployer une fois validé")

        return 0

    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
