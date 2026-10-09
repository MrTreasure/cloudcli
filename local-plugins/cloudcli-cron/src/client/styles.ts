const STYLE_ID = "workspace-scheduled-prompts-styles";

/** Scoped scheduler styles, used by the plugin app in both CloudCLI themes. */
export function ensureStyles(): void {
  document.getElementById(STYLE_ID)?.remove();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.workspace-scheduled-prompts {
  --wsp-bg:#fafafa; --wsp-panel:#fff; --wsp-subtle:#f5f5f5; --wsp-border:#e4e4e7;
  --wsp-text:#18181b; --wsp-muted:#62626d; --wsp-accent:#16665e; --wsp-accent-soft:#edf7f4;
  --wsp-success:#197449; --wsp-success-soft:#eaf5ed; --wsp-danger:#b42332; --wsp-danger-soft:#fff0f1;
  --wsp-warning:#925c09; --wsp-warning-soft:#fff8e6; --wsp-on-accent:#fff; --wsp-ring:#237e73;
  color:var(--wsp-text); background:var(--wsp-bg); min-height:100%; padding:28px clamp(16px,3vw,40px) 48px;
  font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
  container-type:inline-size; color-scheme:light;
}
.workspace-scheduled-prompts[data-theme="dark"] {
  --wsp-bg:#090909; --wsp-panel:#141414; --wsp-subtle:#1b1b1b; --wsp-border:#303034;
  --wsp-text:#f0f0f2; --wsp-muted:#aaaab3; --wsp-accent:#8dd7c4; --wsp-accent-soft:#182c26;
  --wsp-success:#91d5ab; --wsp-success-soft:#18271e; --wsp-danger:#ffacb4; --wsp-danger-soft:#301a20;
  --wsp-warning:#eed197; --wsp-warning-soft:#302717; --wsp-on-accent:#10221d; --wsp-ring:#8dd7c4;
  color-scheme:dark;
}
.workspace-scheduled-prompts *, .workspace-scheduled-prompts *::before, .workspace-scheduled-prompts *::after {box-sizing:border-box;}
.workspace-scheduled-prompts [hidden] {display:none!important;}
.workspace-scheduled-prompts :is(h1,h2,h3,p) {margin:0;}
.workspace-scheduled-prompts :is(h1,h2,h3) {line-height:1.4;letter-spacing:-.02em;text-wrap:balance;}
.workspace-scheduled-prompts svg {flex-shrink:0;vertical-align:middle;}
.wsp-shell {max-width:1440px;margin:0 auto;display:grid;gap:24px;min-width:0;}
.wsp-header {display:flex;justify-content:space-between;align-items:center;gap:20px;}
.wsp-header-heading {display:flex;gap:14px;align-items:center;min-width:0;}
.wsp-heading-icon {display:grid;place-items:center;width:48px;height:48px;border:1px solid var(--wsp-border);background:var(--wsp-panel);border-radius:14px;color:var(--wsp-accent);flex-shrink:0;}
.wsp-heading-icon svg {width:24px;height:24px;}
.wsp-header h1 {font-size:24px;font-weight:650;}
.wsp-header p {color:var(--wsp-muted);font-size:13px;margin-top:4px;}
.wsp-header-actions {display:flex;gap:10px;align-items:center;flex-shrink:0;}
.wsp-toolbar {display:flex;align-items:center;justify-content:space-between;gap:16px;min-width:0;border-bottom:1px solid var(--wsp-border);padding-bottom:16px;}
.wsp-tabs {display:flex;padding:4px;gap:4px;background:var(--wsp-subtle);border-radius:10px;flex-shrink:0;}
.workspace-scheduled-prompts .wsp-tab {min-height:44px;padding:6px 18px;border:1px solid transparent;background:transparent;color:var(--wsp-muted);}
.workspace-scheduled-prompts .wsp-tab[data-active="true"] {background:var(--wsp-panel);border-color:var(--wsp-border);color:var(--wsp-text);}
.wsp-workspace-chip {font-size:12px;color:var(--wsp-muted);max-width:55%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;}
.wsp-stats {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--wsp-border);border-radius:14px;background:var(--wsp-panel);overflow:hidden;}
.wsp-stat {padding:18px 22px;min-width:0;}
.wsp-stat + .wsp-stat {border-left:1px solid var(--wsp-border);}
.wsp-stat-label {display:flex;align-items:center;gap:6px;color:var(--wsp-muted);font-size:12px;}
.wsp-stat-label svg {width:15px;height:15px;}
.wsp-stat strong {font-size:26px;line-height:1.5;font-weight:650;display:block;font-variant-numeric:tabular-nums;margin-top:5px;}
.wsp-stat strong.wsp-stat-time {font-size:18px;margin-top:10px;}
.wsp-stat small {display:block;font-size:12px;color:var(--wsp-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.wsp-main {display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,.42fr);gap:24px;align-items:start;}
.wsp-stack {display:grid;gap:24px;min-width:0;}
.wsp-panel, .schedule-list, .run-history, .task-form {border:1px solid var(--wsp-border);border-radius:14px;background:var(--wsp-panel);padding:22px;min-width:0;}
.wsp-section-heading {margin-bottom:20px;}
.wsp-section-heading h2, .schedule-list h2, .run-history h2, .execution-banner h2 {font-size:16px;font-weight:650;}
.wsp-section-heading p {color:var(--wsp-muted);font-size:13px;margin-top:4px;}
.wsp-section-title {display:flex;align-items:center;gap:8px;}
.wsp-count {font-size:12px;color:var(--wsp-muted);border:1px solid var(--wsp-border);border-radius:6px;padding:0 6px;font-variant-numeric:tabular-nums;}
.wsp-list-heading {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:18px;}
.workspace-scheduled-prompts :is(input,select,textarea,button) {font:inherit;}
.workspace-scheduled-prompts :is(input,select,textarea) {width:100%;border:1px solid var(--wsp-border);border-radius:8px;background:var(--wsp-panel);color:var(--wsp-text);padding:10px 12px;min-height:44px;}
.workspace-scheduled-prompts :is(input,select,textarea):focus {outline:2px solid var(--wsp-ring);outline-offset:2px;}
.workspace-scheduled-prompts :is(input,textarea)::placeholder {color:var(--wsp-muted);opacity:.85;}
.workspace-scheduled-prompts textarea {resize:vertical;min-height:120px;line-height:1.65;}
.workspace-scheduled-prompts button {display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;max-width:100%;border:1px solid var(--wsp-border);border-radius:8px;padding:8px 14px;background:var(--wsp-panel);color:var(--wsp-text);cursor:pointer;font-weight:550;transition:background .16s,border-color .16s,color .16s;}
.workspace-scheduled-prompts button:hover:not(:disabled) {background:var(--wsp-subtle);border-color:var(--wsp-muted);}
.workspace-scheduled-prompts button:active:not(:disabled) {filter:brightness(.93);}
.workspace-scheduled-prompts :is(button,summary):focus-visible {outline:2px solid var(--wsp-ring);outline-offset:3px;}
.workspace-scheduled-prompts button:disabled {opacity:.5;cursor:not-allowed;}
.workspace-scheduled-prompts :is(button[type="submit"],.wsp-primary-button) {background:var(--wsp-accent);border-color:var(--wsp-accent);color:var(--wsp-on-accent);}
.workspace-scheduled-prompts :is(button[type="submit"],.wsp-primary-button):hover:not(:disabled) {background:var(--wsp-accent);border-color:var(--wsp-accent);filter:brightness(.94);}
.workspace-scheduled-prompts .wsp-danger-button {color:var(--wsp-danger);border-color:transparent;}
.workspace-scheduled-prompts .wsp-danger-button:hover:not(:disabled) {background:var(--wsp-danger-soft);border-color:var(--wsp-danger-soft);}
.wsp-inline-actions {display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;}
.wsp-inline-actions button {font-size:13px;padding:6px 12px;}
.wsp-form {display:grid;gap:20px;}
.task-form .wsp-form {grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);}
.task-form .wsp-panel {padding:0;border:0;border-radius:0;}
.task-form .wsp-panel:nth-child(2) {padding-left:24px;border-left:1px solid var(--wsp-border);}
.task-form .wsp-panel:nth-child(3), .task-form .wsp-form-actions {grid-column:1/-1;}
.wsp-panel-title {font-size:13px;font-weight:650;margin-bottom:16px;display:flex;gap:8px;align-items:center;}
.wsp-step {display:grid;place-items:center;width:22px;height:22px;background:var(--wsp-subtle);border:1px solid var(--wsp-border);border-radius:6px;color:var(--wsp-muted);font-size:11px;}
.wsp-form-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}
.wsp-field {display:grid;gap:7px;min-width:0;}
.wsp-field + .wsp-field {margin-top:14px;}
.wsp-form-grid .wsp-field + .wsp-field {margin-top:0;}
.wsp-field label, .wsp-field > span {font-weight:550;font-size:13px;}
.wsp-field p, .wsp-preview-note {font-size:12px;color:var(--wsp-muted);line-height:1.6;}
.wsp-field-span-2 {grid-column:span 2;}
.wsp-checkbox-group {display:flex;flex-wrap:wrap;gap:8px;}
.wsp-checkbox {display:flex;align-items:center;gap:6px;min-height:44px;padding:8px 10px;border:1px solid var(--wsp-border);border-radius:8px;cursor:pointer;}
.wsp-checkbox:has(:checked) {background:var(--wsp-accent-soft);border-color:var(--wsp-accent);color:var(--wsp-accent);}
.workspace-scheduled-prompts input[type="checkbox"] {width:16px;min-height:16px;height:16px;accent-color:var(--wsp-accent);margin:0;}
.wsp-preview {padding:14px 16px;border-radius:8px;background:var(--wsp-subtle);line-height:1.7;overflow-wrap:anywhere;}
.wsp-preview strong {font-size:13px;}
.wsp-runtime-help {grid-column:1/-1;font-size:12px;color:var(--wsp-muted);}
.wsp-runtime-help summary {min-height:44px;display:flex;align-items:center;font-size:13px;color:var(--wsp-text);}
.wsp-runtime-help[open] summary {margin-bottom:10px;}
.wsp-preview-note {margin-top:8px!important;}
.wsp-feedback {color:var(--wsp-danger);font-size:13px;}
.wsp-feedback:empty {display:none;}
.wsp-form-actions {display:flex;gap:10px;align-items:center;border-top:1px solid var(--wsp-border);padding-top:18px;}
.wsp-empty {padding:34px 12px;text-align:center;display:flex;align-items:center;flex-direction:column;gap:10px;}
.wsp-empty-icon {display:grid;place-items:center;width:48px;height:48px;border-radius:14px;background:var(--wsp-subtle);color:var(--wsp-muted);margin-bottom:4px;}
.wsp-empty strong {font-size:14px;font-weight:600;}
.wsp-empty p {color:var(--wsp-muted);max-width:32ch;font-size:13px;}
.wsp-empty button {margin-top:8px;}
.wsp-status-chip {display:inline-flex;align-items:center;gap:5px;flex-shrink:0;border-radius:6px;padding:3px 8px;font-size:12px;white-space:nowrap;background:var(--wsp-subtle);color:var(--wsp-muted);font-weight:550;}
.wsp-status-chip[data-status="running"], .wsp-status-chip[data-status="scheduled"] {background:var(--wsp-accent-soft);color:var(--wsp-accent);}
.wsp-status-chip[data-status="enabled"], .wsp-status-chip[data-status="ready"], .wsp-status-chip[data-status="succeeded"] {background:var(--wsp-success-soft);color:var(--wsp-success);}
.wsp-status-chip[data-status="failed"], .wsp-status-chip[data-status="invalid"] {background:var(--wsp-danger-soft);color:var(--wsp-danger);}
.wsp-status-chip[data-status="needs_config"], .wsp-status-chip[data-status="missed"] {background:var(--wsp-warning-soft);color:var(--wsp-warning);}
.wsp-task-head, .wsp-run-head {display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.wsp-task-head strong {font-size:15px;font-weight:600;overflow-wrap:anywhere;}
.wsp-task-head p {color:var(--wsp-muted);font-size:13px;margin-top:5px;}
.wsp-task-meta {display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:14px;color:var(--wsp-muted);font-size:12px;}
.wsp-next-time {color:var(--wsp-text);font-variant-numeric:tabular-nums;}
.wsp-prompt-preview {margin-top:14px!important;color:var(--wsp-muted);font-size:13px;line-height:1.65;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;overflow-wrap:anywhere;}
.schedule-list ul, .run-history ul, .wsp-global-job-list {list-style:none;margin:0;padding:0;}
.schedule-list li {padding:20px 0;border-top:1px solid var(--wsp-border);}
.schedule-list li:first-child {border-top:0;padding-top:0;}
.schedule-list li:last-child {padding-bottom:0;}
.schedule-list li[data-highlighted="true"] {background:var(--wsp-accent-soft);border-radius:10px;padding:16px;margin:0 -8px;}
.run-history ul {margin-top:22px;}
.run-history li {position:relative;margin-left:5px;border-left:1px solid var(--wsp-border);padding:0 0 24px 22px;}
.run-history li::before {content:"";position:absolute;left:-4px;top:7px;width:7px;height:7px;border-radius:50%;background:var(--wsp-muted);outline:4px solid var(--wsp-panel);}
.run-history li[data-status="succeeded"]::before {background:var(--wsp-success);}
.run-history li[data-status="failed"]::before {background:var(--wsp-danger);}
.run-history li:last-child {border-left-color:transparent;padding-bottom:0;}
.wsp-run-head {gap:8px;align-items:center;}
.wsp-run-head strong {font-size:13px;font-weight:600;overflow-wrap:anywhere;}
.wsp-run-meta {display:grid;gap:7px;color:var(--wsp-muted);font-size:12px;margin-top:8px;overflow-wrap:anywhere;}
.wsp-run-failure {color:var(--wsp-danger);}
.wsp-more-history {margin-top:16px;}
.wsp-more-history summary {font-size:13px;color:var(--wsp-muted);min-height:44px;display:flex;align-items:center;}
.execution-banner {border:1px solid var(--wsp-border);background:var(--wsp-panel);border-radius:12px;}
.workspace-scheduled-prompts summary {cursor:pointer;list-style:none;}
.workspace-scheduled-prompts summary::-webkit-details-marker {display:none;}
.wsp-execution-summary {display:flex;justify-content:space-between;align-items:center;gap:14px;padding:16px 20px;min-height:64px;}
.wsp-execution-title {display:flex;align-items:center;gap:10px;min-width:0;}
.wsp-execution-title > svg {color:var(--wsp-muted);}
.wsp-execution-title strong {font-weight:550;font-size:14px;}
.wsp-execution-title small {overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--wsp-muted);font-size:12px;margin-left:8px;}
.wsp-execution-summary > div:last-child {display:flex;align-items:center;gap:12px;}
.wsp-execution-summary .wsp-chevron {width:16px;height:16px;color:var(--wsp-muted);transition:transform .16s;}
.execution-banner details[open] .wsp-chevron {transform:rotate(90deg);}
.wsp-execution-body {padding:0 20px 20px;border-top:1px solid var(--wsp-border);}
.wsp-execution-body > p {color:var(--wsp-muted);font-size:13px;padding:16px 0;}
.wsp-execution-body > .wsp-form {grid-template-columns:minmax(0,1fr) minmax(0,1fr);}
.wsp-execution-body > .wsp-form > .wsp-field {align-self:start;}
.wsp-execution-body > .wsp-form > .wsp-preview, .wsp-execution-body > .wsp-form > .wsp-feedback, .wsp-execution-body > .wsp-form > .wsp-form-actions {grid-column:1/-1;}
.workspace-scheduled-prompts code {font:12px/1.6 ui-monospace,monospace;background:var(--wsp-subtle);border:1px solid var(--wsp-border);border-radius:4px;padding:1px 4px;overflow-wrap:anywhere;}
.wsp-banner {padding:12px 16px;border:1px solid var(--wsp-border);border-radius:10px;font-size:13px;display:flex;gap:12px;align-items:baseline;}
.wsp-banner strong {flex-shrink:0;}
.wsp-banner span {overflow-wrap:anywhere;}
.wsp-banner-error {background:var(--wsp-danger-soft);color:var(--wsp-danger);border-color:transparent;}
.wsp-banner-success {background:var(--wsp-success-soft);color:var(--wsp-success);border-color:transparent;}
.wsp-banner-info {background:var(--wsp-accent-soft);color:var(--wsp-accent);border-color:transparent;}
.wsp-global-dashboard {display:grid;gap:24px;}
.wsp-global-dashboard-head {display:flex;justify-content:space-between;gap:16px;align-items:center;}
.wsp-global-dashboard-head .wsp-section-heading {margin:0;}
.wsp-global-controls {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;}
.wsp-global-controls .wsp-field {margin:0;}
.wsp-global-summary {display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border:1px solid var(--wsp-border);border-radius:10px;overflow:hidden;}
.wsp-global-card {padding:14px 18px;}
.wsp-global-card + .wsp-global-card {border-left:1px solid var(--wsp-border);}
.wsp-global-card strong {display:block;font-size:24px;font-variant-numeric:tabular-nums;}
.wsp-global-card span {color:var(--wsp-muted);font-size:12px;}
.wsp-global-workspaces {display:flex;gap:8px;flex-wrap:wrap;}
.wsp-global-workspace-pill {font-size:12px;color:var(--wsp-muted);padding:4px 10px;border:1px solid var(--wsp-border);border-radius:6px;background:var(--wsp-subtle);}
.wsp-global-workspace-pill[data-status="unavailable"] {color:var(--wsp-danger);}
.wsp-global-warning-list {margin:8px 0;padding-left:18px;}
.wsp-global-job-list {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}
.wsp-global-job {padding:20px;border:1px solid var(--wsp-border);border-radius:12px;background:var(--wsp-panel);min-width:0;}
.wsp-global-job[data-problem="true"] {border-left:3px solid var(--wsp-warning);}
.wsp-global-job[data-status="failed"] {border-left-color:var(--wsp-danger);}
.wsp-global-job .wsp-task-meta {display:grid;gap:6px;overflow-wrap:anywhere;}
@container (max-width:960px) {
  .wsp-main {grid-template-columns:minmax(0,1fr);}
  .wsp-global-job-list {grid-template-columns:1fr;}
  .task-form .wsp-form, .wsp-execution-body > .wsp-form {grid-template-columns:minmax(0,1fr);}
  .task-form .wsp-panel:nth-child(2) {padding:20px 0 0;border-left:0;border-top:1px solid var(--wsp-border);}
  .wsp-stat {padding:16px;}
}
@container (max-width:600px) {
  .wsp-header {align-items:flex-start;flex-wrap:wrap;}
  .wsp-header h1 {font-size:21px;}
  .wsp-header-actions {width:100%;justify-content:flex-end;}
  .wsp-toolbar {flex-wrap:wrap;}
  .wsp-workspace-chip {max-width:100%;width:100%;}
  .wsp-stats {grid-template-columns:repeat(2,minmax(0,1fr));}
  .wsp-stat:nth-child(3) {border-left:0;}
  .wsp-stat:nth-child(n+3) {border-top:1px solid var(--wsp-border);}
  .wsp-form-grid,.wsp-global-controls,.wsp-global-summary {grid-template-columns:1fr;}
  .wsp-global-card + .wsp-global-card {border-left:0;border-top:1px solid var(--wsp-border);}
  .wsp-field-span-2 {grid-column:auto;}
  .wsp-panel,.schedule-list,.run-history,.task-form {padding:18px;}
  .wsp-execution-title small {display:none;}
  .wsp-inline-actions {gap:8px;}
  .wsp-banner {display:block;}
  .wsp-banner strong {display:block;margin-bottom:4px;}
  .wsp-task-head {gap:8px;}
  .wsp-stats strong.wsp-stat-time {font-size:16px;}
}
@media (prefers-reduced-motion:reduce) {
  .workspace-scheduled-prompts *, .workspace-scheduled-prompts *::before {transition:none!important;scroll-behavior:auto!important;}
}
  `;
  document.head.append(style);
}
