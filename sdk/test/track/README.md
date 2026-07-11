Track Tests
===========
This folder holds unit tests for the `track` decorator and its OpenAI chat-completions
patching behavior. The tests are split so future APIs (responses, audio, etc.) can add
their own files without mixing concerns.

What's here
-----------
- test_track_decorator_base.py: core decorator behavior (sync/async, errors, inputs/outputs).
- test_track_openai_chat_completions.py: OpenAI chat.completions tracking (stream and non-stream).
- test_track_project_name.py: project_name parameter handling in the track decorator.
- conftest.py: fake client + context cleanup to keep tests isolated and offline.

Why the split
-------------
The decorator logic and the OpenAI patching logic evolve independently. Keeping them in
separate files makes it easy to add new providers or endpoints later.

How to run
----------
From the repo root:

```bash
pytest test/track/test_track_decorator_base.py
pytest test/track/test_track_openai_chat_completions.py
pytest test/track/test_track_project_name.py
# Or run all track tests together
pytest test/track/
```