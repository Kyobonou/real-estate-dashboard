import json, sys

WF_PATH = "C:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Imm supabase.json"

with open(WF_PATH, 'r', encoding='utf-8', errors='replace') as f:
    wf = json.load(f)

NEW_BODY = r"""={
  "type_de_bien": {{ JSON.stringify($json.type_de_bien || '') }},
  "type_offre": {{ JSON.stringify($json.type_offre || '') }},
  "zone_geographique": {{ JSON.stringify($json.zone_geographique || '') }},
  "commune": {{ JSON.stringify($json.commune || '') }},
  "quartier": {{ JSON.stringify($json.quartier || '') }},
  "prix": {{ JSON.stringify($json.prix || '') }},
  "telephone": {{ JSON.stringify($json.telephone || '') }},
  "telephone_bien": {{ JSON.stringify($json.telephone || '') }},
  "telephone_expediteur": {{ JSON.stringify($json._source_telephone || '') }},
  "expediteur": {{ JSON.stringify($json._source_expediteur || '') }},
  "caracteristiques": {{ JSON.stringify($json.caracteristiques || '') }},
  "publie_par": {{ JSON.stringify($json.publie_par || '') }},
  "meubles": {{ JSON.stringify($json.meubles || 'Non') }},
  "chambre": {{ JSON.stringify($json.chambre || '') }},
  "disponible": {{ JSON.stringify($json.disponible || 'Oui') }},
  "groupe_whatsapp_origine": {{ JSON.stringify($json._source_groupe || '') }},
  "date_publication": {{ JSON.stringify(new Date().toISOString()) }},
  "lien_image": {{ JSON.stringify($json._source_lien_image || '') }},
  "message_initial": {{ JSON.stringify($json._source_message || '') }},
  "publication_id": {{ JSON.stringify($json._source_publication_id || '') }}
}"""

NEW_DETECTEUR_RETURN = r"""return [{
  json: {
    ...newAnnonce,
    _is_duplicate: isDuplicate,
    _match_score: Math.round(bestScore),
    _matched_with: matchedDesc,
    _source_groupe: sourceData.groupe || '',
    _source_timestamp: sourceData.Timestamp || sourceData.horodatage || '',
    _source_lien_image: sourceData.lien_image || '',
    _source_message: sourceData.message || '',
    _source_expediteur: sourceData.expediteur || '',
    _source_telephone: sourceData.telephone || sourceData.telephone_expediteur || '',
    _source_publication_id: sourceData.publication_id || ''
  }
}];"""

OLD_DETECTEUR_RETURN = r"""return [{
  json: {
    ...newAnnonce,
    _is_duplicate: isDuplicate,
    _match_score: Math.round(bestScore),
    _matched_with: matchedDesc,
    _source_groupe: sourceData.groupe || '',
    _source_timestamp: sourceData.Timestamp || sourceData.horodatage || '',
    _source_lien_image: sourceData.lien_image || ''
  }
}];"""

modified = 0
for n in wf.get('nodes', []):
    params = n.get('parameters', {})
    name = n.get('name', '')

    if name == 'Sauvegarder Nouvelle Annonce':
        params['url'] = 'https://udyfhzyvalansmhkynnc.supabase.co/rest/v1/locaux'
        params['jsonBody'] = NEW_BODY
        modified += 1
        print(f"Fixed: {name}")

    elif name == 'Charger Annonces Recentes':
        params['url'] = params['url'].replace('/annonces', '/locaux')
        modified += 1
        print(f"Fixed: {name}")

    elif name == 'Chercher Bien':
        params['url'] = params['url'].replace('/annonces', '/locaux')
        if 'telephone,' in params['url'] and 'telephone_bien' not in params['url']:
            params['url'] = params['url'].replace('telephone,', 'telephone,telephone_bien,telephone_expediteur,')
        modified += 1
        print(f"Fixed: {name}")

    elif name == 'Enregistrer Visite':
        params['url'] = 'https://udyfhzyvalansmhkynnc.supabase.co/rest/v1/visite_programmee'
        modified += 1
        print(f"Fixed: {name}")

    elif name == 'Verifier Visite Existante':
        old_url = params['url']
        params['url'] = old_url.replace('/visites', '/visite_programmee')
        modified += 1
        print(f"Fixed: {name}")

    elif name == 'Detecteur Doublons':
        code = params.get('jsCode', '')
        if OLD_DETECTEUR_RETURN in code:
            params['jsCode'] = code.replace(OLD_DETECTEUR_RETURN, NEW_DETECTEUR_RETURN)
            modified += 1
            print(f"Fixed: {name} (_source_* enriched)")
        else:
            print(f"WARNING: {name} - return block not found exactly")

with open(WF_PATH, 'w', encoding='utf-8') as f:
    json.dump(wf, f, indent=2, ensure_ascii=False)

print(f"\nTotal fixed: {modified} nodes")
print("File saved.")
