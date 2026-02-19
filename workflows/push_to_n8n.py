import json, urllib.request, urllib.error, sys

WF_PATH = "C:/Users/WILFRIED/OneDrive - Gravel Ivoire/Bureau/Files Anti/real-estate-dashboard/workflows/Imm supabase.json"
N8N_URL = "https://yobed-n8n-supabase-claude.hf.space/api/v1"
WF_ID = "LTZJrc7tYwv6Qm6a5wtZ0"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNjY3MjFmNy1iMDEwLTQyYWUtOGJkYS1mODExZjQ4M2UyYzAiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiOWU3YzFlNWQtYWUzMi00ZWRlLWEyZDUtZjkyMTYzNjM3NTUyIiwiaWF0IjoxNzcxMzY2NDk5fQ.At8YzfXtQJnRJWoAOSzJHea-2ccW7EGuYpR3LqssakQ"

with open(WF_PATH, 'r', encoding='utf-8', errors='replace') as f:
    wf = json.load(f)

# Only keep settings keys accepted by n8n API
raw_settings = wf.get("settings", {})
allowed_settings_keys = {"executionOrder", "timezone", "saveManualExecutions",
                         "saveDataErrorExecution", "saveDataSuccessExecution",
                         "saveExecutionProgress", "executionTimeout", "callerPolicy"}
settings = {k: v for k, v in raw_settings.items() if k in allowed_settings_keys}

# Build payload for n8n API (only fields accepted by PUT endpoint)
payload = {
    "name": wf.get("name"),
    "nodes": wf.get("nodes", []),
    "connections": wf.get("connections", {}),
    "settings": settings,
    "staticData": wf.get("staticData")
}

body = json.dumps(payload, ensure_ascii=False).encode('utf-8')

req = urllib.request.Request(
    f"{N8N_URL}/workflows/{WF_ID}",
    data=body,
    method='PUT',
    headers={
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
    }
)

try:
    with urllib.request.urlopen(req, timeout=60) as resp:
        resp_data = json.loads(resp.read().decode('utf-8', errors='replace'))
        print(f"SUCCESS: {resp.status}")
        print(f"Workflow: {resp_data.get('name')} | Nodes: {len(resp_data.get('nodes', []))}")
except urllib.error.HTTPError as e:
    body_err = e.read().decode('utf-8', errors='replace')
    print(f"ERROR HTTP {e.code}: {body_err[:500]}")
except Exception as ex:
    print(f"ERROR: {ex}")
