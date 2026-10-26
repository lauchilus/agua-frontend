"""Publica solo el SHA probado, sin desplegar directamente ni modificar la base."""
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

FRONTEND = 'lauchilus/agua-frontend'
BACKEND = 'lauchilus/De-los-santos'
FILE = 'frontend.ref'

class ApiError(Exception):
    def __init__(self, status):
        self.status = status
        super().__init__('GitHub API HTTP ' + str(status))

class Api:
    def __init__(self, backend_token, read_token):
        self.backend_token = backend_token
        self.read_token = read_token
    def call(self, repo, path, method='GET', payload=None):
        token = self.backend_token if repo == BACKEND else self.read_token
        headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json',
                   'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json'}
        request = urllib.request.Request('https://api.github.com/repos/' + repo + '/' + path,
                 data=None if payload is None else json.dumps(payload).encode(), headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            # No imprimir cuerpos ni cabeceras que pudieran contener informacion sensible.
            raise ApiError(exc.code) from None

def publish(api, sha, sleep=time.sleep):
    if not re.fullmatch('[0-9a-f]{40}', sha):
        raise ValueError('SHA de frontend invalido')
    for attempt in range(3):
        head = api.call(FRONTEND, 'git/ref/heads/main')['object']['sha']
        if head != sha:
            return 'Omitido: main avanzo; se publicara la version mas reciente cuando pase sus pruebas.'
        current = api.call(BACKEND, 'contents/' + FILE + '?ref=main')
        value = base64.b64decode(current['content']).decode().strip()
        if value == sha:
            return 'La version ya esta integrada; no se crea otro commit.'
        if not re.fullmatch('[0-9a-f]{40}', value):
            raise ValueError('frontend.ref del backend no contiene un SHA valido')
        payload = {'message': 'ci: actualiza frontend a ' + sha[:12],
                   'content': base64.b64encode((sha + '\n').encode()).decode(),
                   'sha': current['sha'], 'branch': 'main'}
        try:
            result = api.call(BACKEND, 'contents/' + FILE, 'PUT', payload)
            return 'Version integrada en backend: ' + result['commit']['sha']
        except ApiError as exc:
            if exc.status != 409 or attempt == 2:
                raise
            sleep(2)
    raise RuntimeError('No se pudo actualizar la version')

if __name__ == '__main__':
    try:
        token = os.environ.get('BACKEND_SYNC_TOKEN', '')
        if not token:
            raise ValueError('Falta el secret BACKEND_SYNC_TOKEN en el frontend')
        if os.environ.get('GITHUB_REPOSITORY') != FRONTEND or os.environ.get('GITHUB_REF') != 'refs/heads/main':
            raise ValueError('Publicacion permitida solo desde main del frontend original')
        message = publish(Api(token, os.environ['FRONTEND_READ_TOKEN']), os.environ['GITHUB_SHA'])
        print(message)
        summary = os.environ.get('GITHUB_STEP_SUMMARY')
        if summary:
            with open(summary, 'a', encoding='utf-8') as out:
                out.write(message + '\n')
    except (ApiError, ValueError, KeyError, OSError, urllib.error.URLError) as exc:
        print('No se publico la version. ' + str(exc), file=sys.stderr)
        sys.exit(1)
