import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';

import { Codex } from '@openai/codex-sdk';
import type { Thread, ThreadOptions } from '@openai/codex-sdk';

import { codexRuntime } from '@/modules/providers/list/codex/codex-runtime.provider.js';
import { CodexSessionsProvider } from '@/modules/providers/list/codex/codex-sessions.provider.js';
import type { NormalizedMessage, ProviderRuntimeContext } from '@/shared/index.js';

test('SDK todo started/updated/completed events retain one id and explicit unfinished steps', async (t) => {
  const thread = {
    id: 'sdk-plan-thread',
    async runStreamed() {
      return { events: (async function* () {
        yield { type: 'thread.started', thread_id: 'sdk-plan-thread' };
        for (const type of ['item.started', 'item.updated', 'item.completed']) {
          yield { type, item: { type: 'todo_list', id: 'sdk-plan', items: [
            { text: 'Inspect', completed: type !== 'item.started' },
            { text: 'Verify', completed: false },
          ] } };
        }
      })() };
    },
  } as unknown as Thread;
  t.mock.method(Codex.prototype, 'startThread', () => thread);
  const provider = new CodexSessionsProvider();
  const messages: NormalizedMessage[] = [];
  await codexRuntime.run('Work through the task', { codexRuntimeMode: 'sdk' }, {
    isWebSocketWriter: true,
    send: (message) => messages.push(message as NormalizedMessage),
  }, {
    resolveProviderSessionId: () => null,
    resolveResumeModel: async () => 'test-model',
    getProviderModels: async () => ({ OPTIONS: [], DEFAULT: 'test-model' }),
    normalizeMessage: (raw, sessionId) => provider.normalizeMessage(raw, sessionId),
    isProviderInstalled: async () => true,
  });
  const plans = messages.filter((message) => message.toolName === 'TodoWrite');
  assert.deepEqual(plans.map((message) => message.id), ['sdk-plan', 'sdk-plan', 'sdk-plan']);
  assert.deepEqual(plans[0].toolInput, { todos: [
    { content: 'Inspect', status: 'pending' }, { content: 'Verify', status: 'pending' },
  ] });
  assert.deepEqual(plans[2].toolInput, { todos: [
    { content: 'Inspect', status: 'completed' }, { content: 'Verify', status: 'pending' },
  ] });
  assert.equal(plans[2].status, 'completed');
  assert.deepEqual(plans[2].toolResult, { content: '', isError: false });
});

for (const resumed of [false, true]) {
  for (const permissionMode of [undefined, 'default', 'unknown', 'acceptEdits', 'bypassPermissions']) {
    test(`Codex ${resumed ? 'resumes' : 'starts'} with supported permissions (${permissionMode ?? 'omitted'})`, async (t) => {
      let capturedOptions: ThreadOptions | undefined;
      let capturedPrompt: unknown;
      const messages: unknown[] = [];
      const thread = {
        id: 'native-thread',
        async runStreamed(prompt: unknown) {
          capturedPrompt = prompt;
          return { events: (async function* () {
            yield { type: 'thread.started', thread_id: 'native-thread' };
          })() };
        },
      } as unknown as Thread;

      const start = t.mock.method(Codex.prototype, 'startThread', (options?: ThreadOptions) => {
        capturedOptions = options;
        return thread;
      });
      const resume = t.mock.method(Codex.prototype, 'resumeThread', (id: string, options?: ThreadOptions) => {
        assert.equal(id, 'native-thread');
        capturedOptions = options;
        return thread;
      });
      const context: ProviderRuntimeContext = {
        resolveProviderSessionId: () => resumed ? 'native-thread' : null,
        resolveResumeModel: async () => 'test-model',
        getProviderModels: async () => ({ OPTIONS: [], DEFAULT: 'test-model' }),
        normalizeMessage: () => [],
        isProviderInstalled: async () => true,
      };

      await codexRuntime.run('hey there', {
        codexRuntimeMode: 'sdk',
        sessionId: resumed ? 'app-session' : undefined,
        permissionMode,
        cwd: process.cwd(),
      }, { isWebSocketWriter: true, send: (message) => messages.push(message) }, context);

      assert.equal(start.mock.callCount(), resumed ? 0 : 1);
      assert.equal(resume.mock.callCount(), resumed ? 1 : 0);
      assert.equal(capturedPrompt, 'hey there');
      assert.equal(capturedOptions?.sandboxMode, permissionMode === 'bypassPermissions' ? 'danger-full-access' : 'workspace-write');
      assert.equal(capturedOptions?.approvalPolicy, permissionMode === 'acceptEdits' || permissionMode === 'bypassPermissions' ? 'never' : 'on-request');
      assert.ok(messages.some((message: any) => message.kind === 'complete' && message.exitCode === 0));
      assert.ok(!messages.some((message: any) => message.kind === 'error'));
    });
  }
}

for (const command of ['', '  \n\t']) {
  test(`Codex supplies a prompt for an image-only turn (${JSON.stringify(command)})`, async (t) => {
    let capturedPrompt: unknown;
    const imagePath = path.join(process.cwd(), 'public', 'favicon.png');
    const thread = {
      id: 'native-thread',
      async runStreamed(prompt: unknown) {
        capturedPrompt = prompt;
        return { events: (async function* () {
          yield { type: 'thread.started', thread_id: 'native-thread' };
        })() };
      },
    } as unknown as Thread;

    t.mock.method(Codex.prototype, 'startThread', () => thread);
    const context: ProviderRuntimeContext = {
      resolveProviderSessionId: () => null,
      resolveResumeModel: async () => 'test-model',
      getProviderModels: async () => ({ OPTIONS: [], DEFAULT: 'test-model' }),
      normalizeMessage: () => [],
      isProviderInstalled: async () => true,
    };

    await codexRuntime.run(command, {
      codexRuntimeMode: 'sdk',
      cwd: process.cwd(),
      images: [{ path: imagePath, mimeType: 'image/png' }],
    }, { isWebSocketWriter: true, send: () => {} }, context);

    assert.deepEqual(capturedPrompt, [
      { type: 'text', text: 'Please analyze the attached image(s).' },
      { type: 'local_image', path: imagePath },
    ]);
  });
}

for (const resumed of [false, true]) {
  for (const codexFast of [true, false, undefined]) {
    test(`SDK Fast ${String(codexFast)} overrides global and resumed tier (${resumed})`, async (t) => {
      let capturedTier: unknown;
      t.mock.method(Codex.prototype, resumed ? 'resumeThread' : 'startThread', function (this: Codex) {
        const options = (this as unknown as { options: { config: { service_tier: unknown } } }).options;
        capturedTier = options.config.service_tier;
        return {
          async runStreamed() {
            return { events: (async function* () { yield { type: 'thread.started', thread_id: 'native-thread' }; })() };
          },
        } as unknown as Thread;
      });
      const context: ProviderRuntimeContext = {
        resolveProviderSessionId: () => resumed ? 'native-thread' : null,
        resolveResumeModel: async () => 'gpt-6.1-sol',
        getProviderModels: async () => ({ OPTIONS: [], DEFAULT: 'gpt-6.1-sol' }),
        normalizeMessage: () => [], isProviderInstalled: async () => true,
      };
      await codexRuntime.run('test', { codexRuntimeMode: 'sdk', codexFast }, { send: () => {} }, context);
      assert.equal(capturedTier, codexFast === true ? 'priority' : 'default');
    });
  }
}
