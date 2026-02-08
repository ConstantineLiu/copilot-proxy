// ── widgets/ApiKeyList.tsx ──────────────────────────────────────────
// [INPUT]: apikey-item model, ApiKeyAddModal
// [OUTPUT]: API key management list with create/copy/delete
// [POS]: Dashboard widget, sibling to TokenList
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
import { getApiKeyList, removeApiKey } from '@/entities/apikey/model/apikey-item';
import ApiKeyAddModal from '@/entities/apikey/ui/ApiKeyAddModal';
import { createAsync, useAction } from '@solidjs/router';
import Copy from 'lucide-solid/icons/copy';
import Trash from 'lucide-solid/icons/trash-2';
import type { Component } from 'solid-js';
import { ErrorBoundary, For, Show, createSignal } from 'solid-js';

const ApiKeyList: Component = () => {
  const apiKeyList = createAsync(getApiKeyList);
  const [isAdding, setIsAdding] = createSignal(false);
  const [newKey, setNewKey] = createSignal<string | null>(null);

  const removeApiKeyAction = useAction(removeApiKey);

  const onClickDelete = (id: string, name: string) => {
    if (window.confirm(`Delete API key "${name}"?`)) {
      removeApiKeyAction(id);
    }
  };

  const onCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  const onCreated = (key: string) => {
    setNewKey(key);
  };

  return (
    <div>
      <ApiKeyAddModal
        isOpen={isAdding}
        onClose={() => setIsAdding(false)}
        onCreated={onCreated}
      />

      <Show when={newKey()}>
        <div class="border border-emerald-600 bg-emerald-950 rounded-lg p-4 mb-4">
          <p class="text-emerald-400 text-sm font-bold mb-2">
            API Key created! Copy it now — it won't be shown again.
          </p>
          <div class="flex items-center gap-2">
            <code class="text-emerald-300 text-sm flex-1 break-all">{newKey()}</code>
            <span
              class="cursor-pointer hover:text-emerald-300 text-emerald-500"
              onClick={() => onCopyKey(newKey())}
              onKeyPress={() => onCopyKey(newKey())}
            >
              <Copy size={16} />
            </span>
          </div>
          <button
            type="button"
            class="d-btn d-btn-ghost d-btn-xs mt-2 text-zinc-500"
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </button>
        </div>
      </Show>

      <div
        onClick={() => setIsAdding(true)}
        onKeyPress={() => setIsAdding(true)}
        class="my-3 text-center rounded-sm text-xs hover:bg-zinc-700 cursor-pointer active:bg-zinc-600 transition-colors duration-200"
      >
        ＋
      </div>

      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <For each={apiKeyList()}>
          {(item) => (
            <div class="border rounded-lg mb-3 border-zinc-600 p-4 flex items-center">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-blue-500">{item.name}</span>
                  <span class="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {item.tokenName || 'Global'}
                  </span>
                </div>
                <div class="text-zinc-400 text-sm mt-1">{item.maskedKey}</div>
                <div class="text-zinc-500 text-xs mt-1">
                  Created at: {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
              <div
                class="cursor-pointer hover:bg-neutral-700 active:bg-neutral-600 transition-colors duration-200 rounded p-1 ml-2"
                onClick={() => onClickDelete(item.id, item.name)}
                onKeyPress={() => onClickDelete(item.id, item.name)}
              >
                <span class="opacity-60 text-rose-400">
                  <Trash size={18} />
                </span>
              </div>
            </div>
          )}
        </For>
      </ErrorBoundary>
    </div>
  );
};

export default ApiKeyList;
