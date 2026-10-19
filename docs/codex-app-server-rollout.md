# Codex live runtime

The clean NAS branch uses a managed `codex app-server` process for live turns so
`turn/plan/updated` notifications can reach the existing TodoWrite renderer.
The explicit SDK fallback remains available in Codex settings or through
`CLOUDCLI_CODEX_RUNTIME_MODE=sdk`. There is no automatic retry with another runtime.

Both adapters use the host-installed CLI (`CODEX_CLI_PATH`, otherwise `codex` on
PATH), and explicitly set Fast intent on each request (`priority` or `default`).
Each computer supplies its own CLI installation, config, authentication and
provider session files; these are not copied or changed by this branch.

## Official behavior retained

Session history, file-stat caching, pagination and reference-backed fork handling
use the official v1.37.5 JSONL implementation. Fork and edit operations keep the
official per-operation app-server client, adapted only to resolve the host CLI.
No alternate history endpoint, FIFO queue or steer protocol is added. Sending,
background-work confirmation and the persisted queued draft use official code.

## Lifecycle and approvals

The live process is lazy and supervises stdio initialization, RPC correlation,
deadlines, failure and restart. The 30-second RPC deadline bounds the reply to a
request, not the duration of a model turn. Stop during startup/model resolution/
thread setup is remembered and prevents a later turn from being submitted.
The settings restart action refuses to interrupt an active live turn.

Command/file approvals use the existing provider permission banner and WebSocket
response path. Codex session grants never write Claude permission preferences.
Per-turn permissions override resumed thread defaults without changing saved
model or authentication configuration.

## Live plans

Only an explicit notification for the exact active thread and turn is accepted.
Malformed steps are diagnosed and skipped, and late/aborted/terminal updates are
ignored. Stable `codex-plan:<threadId>:<turnId>` IDs replace the existing card in
place. Writing a plan snapshot settles the TodoWrite operation while the steps
remain pending/in progress/completed as reported. Abort never completes steps.
SDK legacy `{ text, completed }` items remain supported.

This change does not persist plan notifications. Live reconnect replay is bounded
by the existing server event buffer; a full page reload, server restart or expired
buffer does not guarantee recovery of this card. Ordinary transcript history is
still read normally. No extra prompt, inferred plan, Task Queue MCP or cross-agent
queue is used.
