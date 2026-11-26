export { appendFilesInputTag, buildCodexInputItems, normalizeImageDescriptors, isImageAttachmentDescriptor } from './image-attachments.js';
export { optimizeImageBuffer, resolveCodexExecutable, AppError, createCompleteMessage, createNormalizedMessage, readObjectRecord } from './utils.js';
export type {
  AnyRecord,
  NormalizedMessage,
  ProviderPermissionDecision,
  ProviderRuntimeContext,
  ProviderSteerInput,
  ProviderRuntimeWriter,
} from './types.js';

export type { JsonRpcId, JsonRpcWireFormat, JsonRpcRequest, JsonRpcNotification, JsonRpcErrorObject, JsonRpcSuccessResponse, JsonRpcErrorResponse, JsonRpcDiagnostic, JsonRpcTransportOptions, CodexAppServerClientInfo, CodexAppServerInitializeParams, CodexAppServerInitializeResult, CodexAppServerProcessState, CodexAppServerHealth, CodexAppServerHandshake, CodexAppServerDiagnostic, CodexAppServerProcess, CodexAppServerSpawn, CodexAppServerProcessManagerOptions, CodexAppServerRuntimeOptions, CodexContextLimits } from './types.js';

export type { OpenCodeCredential, OpenCodeFileCredential } from './types.js';

// Database and Providers share the persisted session-pin summary contract.
export type { SessionPinRecord } from './types.js';
// Providers uses these shared request payloads, validators and response helpers.
export type { CustomProviderModelEffort, CustomProviderModelInput, LLMProvider, McpScope, McpTransport, ProviderSkillCreateFile, ProviderSkillCreateInput, UpsertProviderMcpServerInput } from './types.js';
export { asyncHandler, createApiSuccessResponse, SIDE_QUESTION_ID_PATTERN } from './utils.js';

// Providers uses the shared history and runtime summary contracts through this barrel.
export type { BackgroundTaskSummary, ClearedContextSegment, FetchHistoryOptions, FetchHistoryResult, WorkflowAgentActivity } from './types.js';
export { sliceTailPage } from './utils.js';

// Session persistence uses canonical path normalization and fork/history metadata.
export { normalizeProjectPath } from './utils.js';
export type { SessionForkAncestor } from './types.js';
