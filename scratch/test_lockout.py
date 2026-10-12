import urllib.request
import urllib.error
import json

url = 'http://localhost:8080/api/admin/login'
payload = json.dumps({'username': 'admin', 'password': 'bad_password'}).encode('utf-8')
headers = {'Content-Type': 'application/json'}

for i in range(1, 7):
    req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
    try:
        urllib.request.urlopen(req)
        print(f"Attempt {i}: Success (unexpected)")
    except urllib.error.HTTPError as e:
        body = json.loads(e.read().decode('utf-8'))
        print(f"Attempt {i}: HTTP {e.code} -> {body.get('error')}")
