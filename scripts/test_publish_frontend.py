import base64
import unittest
from publish_frontend import publish, ApiError

NEW = 'a' * 40
OLD = 'b' * 40
class FakeApi:
    def __init__(self, head=NEW, current=OLD, conflict=False):
        self.head, self.current, self.conflict = head, current, conflict
        self.writes = []
    def call(self, repo, path, method='GET', payload=None):
        if path.startswith('git/ref/'):
            return {'object': {'sha': self.head}}
        if method == 'GET':
            return {'sha': 'file-version', 'content': base64.b64encode((self.current+'\n').encode()).decode()}
        self.writes.append(payload)
        if self.conflict:
            self.conflict = False
            raise ApiError(409)
        self.current = base64.b64decode(payload['content']).decode().strip()
        return {'commit': {'sha': 'c' * 40}}

class PublishTests(unittest.TestCase):
    def test_updates_exact_verified_commit(self):
        api = FakeApi(); publish(api, NEW)
        self.assertEqual(api.current, NEW)
        self.assertEqual(api.writes[0]['branch'], 'main')
        self.assertEqual(api.writes[0]['sha'], 'file-version')
    def test_idempotent(self):
        api = FakeApi(current=NEW); publish(api, NEW)
        self.assertEqual(api.writes, [])
    def test_old_run_cannot_overwrite_new_head(self):
        api = FakeApi(head='d' * 40); publish(api, NEW)
        self.assertEqual(api.writes, [])
    def test_conflict_reloads_before_retry(self):
        api = FakeApi(conflict=True); publish(api, NEW, sleep=lambda _: None)
        self.assertEqual(len(api.writes), 2)
        self.assertEqual(api.current, NEW)
    def test_new_head_after_conflict_stops_old_run(self):
        api = FakeApi(conflict=True)
        publish(api, NEW, sleep=lambda _: setattr(api, 'head', 'e' * 40))
        self.assertEqual(len(api.writes), 1)
    def test_invalid_ref_is_rejected(self):
        api = FakeApi()
        with self.assertRaises(ValueError): publish(api, 'main')
        self.assertEqual(api.writes, [])
    def test_missing_file_is_not_created_silently(self):
        api = FakeApi()
        def fail(*args, **kwargs): raise ApiError(404)
        api.call = fail
        with self.assertRaises(ApiError): publish(api, NEW)

if __name__ == '__main__': unittest.main()
