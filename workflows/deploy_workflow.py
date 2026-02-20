import json
import requests
import sys

def deploy():
    workflow_id = 'LTZJrc7tYwv6Qm6a5wtZ0'
    api_url = 'https://yobed-n8n-supabase-claude.hf.space/api/v1/workflows/' + workflow_id
    api_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzcwNDg4MjQwfQ.0fFaf7rPNdxP8swXVBDuEwcOokRZ3HaR4NDWPew8oiM'
    
    headers = {
        'X-N8N-API-KEY': api_key,
        'Content-Type': 'application/json'
    }
    
    # Charger le workflow
    file_path = r'c:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Imm supabase.json'
    
    with open(file_path, 'r', encoding='utf-8') as f:
        workflow_data = json.load(f)
    
    # Préparer le payload avec les propriétés requises
    payload = {
        'name': workflow_data.get('name', 'Imm supabase'),
        'nodes': workflow_data.get('nodes', []),
        'connections': workflow_data.get('connections', {}),
        'settings': workflow_data.get('settings', {
            'executionOrder': 'v1',
            'binaryMode': 'separate',
            'availableInMCP': False,
            'timeSavedMode': 'fixed',
            'callerPolicy': 'workflowsFromSameOwner'
        })
    }
    
    print(f"Payload keys: {list(payload.keys())}")
    print(f"Updating workflow {workflow_id} at {api_url}...")
    
    response = requests.put(api_url, json=payload, headers=headers)
    
    if response.status_code == 200:
        print("Successfully updated workflow!")
        print(response.json())
    else:
        print(f"Failed to update workflow. Status code: {response.status_code}")
        print(response.text)
        sys.exit(1)

if __name__ == '__main__':
    deploy()
