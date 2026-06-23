# Local Development Setup

On Windows, use the repeatable startup script from the repo root:

```powershell
.\start-local.ps1
```

This starts:

```text
ADK      -> http://127.0.0.1:8080
Backend  -> http://127.0.0.1:5001
Frontend -> usually http://127.0.0.1:3001
```

To stop the local processes:

```powershell
.\stop-local.ps1
```

If you want to run things manually, keep the same order: ADK first, backend second, frontend last.
