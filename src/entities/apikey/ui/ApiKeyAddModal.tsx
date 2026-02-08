// ── apikey/ui/ApiKeyAddModal.tsx ────────────────────────────────────
// [INPUT]: apikey-item actions, token-item queries
// [OUTPUT]: Modal dialog for creating new API keys
// [POS]: UI component, consumed by ApiKeyList widget
// [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
// ────────────────────────────────────────────────────────────────────
import { addApiKey } from '@/entities/apikey/model/apikey-item';
import { getTokenList } from '@/entities/token/model/token-item';
import { createAsync, useAction } from '@solidjs/router';
import type { Component } from 'solid-js';
import { Show, createEffect, createSignal } from 'solid-js';
import type { Accessor } from 'solid-js/types/server/reactive.js';

const ApiKeyAddModal: Component<{
  isOpen: Accessor<boolean>;
  onClose: () => void;
  onCreated: (key: string) => void;
}> = ({ isOpen, onClose, onCreated }) => {
  let modalRef: HTMLDialogElement | undefined;
  let nameInputRef: HTMLInputElement;
  const [nameInput, setNameInput] = createSignal('');
  const [selectedTokenId, setSelectedTokenId] = createSignal<string>('');

  const tokenList = createAsync(getTokenList);
  const addApiKeyAction = useAction(addApiKey);

  createEffect(() => {
    if (isOpen()) {
      setNameInput('');
      setSelectedTokenId('');
      modalRef?.showModal();
      setTimeout(() => nameInputRef?.focus(), 100);
    }
  });

  const onClickSave = async () => {
    const tokenId = selectedTokenId() || null;
    const result = await addApiKeyAction(nameInput(), tokenId);
    if (result?.key) {
      onCreated(result.key);
    }
    onClickClose();
  };

  const onClickClose = () => {
    modalRef?.close();
  };

  return (
    <dialog ref={modalRef} class="d-modal" onClose={onClose}>
      <div class="d-modal-box">
        <h3 class="text-lg font-bold">Create API Key</h3>
        <fieldset class="d-fieldset">
          <legend class="d-fieldset-legend">Name</legend>
          <input
            ref={nameInputRef}
            type="text"
            class="d-input"
            placeholder="e.g. my-app"
            value={nameInput()}
            onInput={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onClickSave()}
          />
        </fieldset>
        <fieldset class="d-fieldset mt-2">
          <legend class="d-fieldset-legend">Linked GitHub Token (optional)</legend>
          <select
            class="d-select"
            value={selectedTokenId()}
            onChange={(e) => setSelectedTokenId(e.target.value)}
          >
            <option value="">Global (round-robin all tokens)</option>
            <Show when={tokenList()}>
              {(tokens) =>
                tokens().map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))
              }
            </Show>
          </select>
          <p class="text-xs text-zinc-500 mt-1">
            Global: requests rotate across all tokens. Linked: always use one specific token.
          </p>
        </fieldset>
        <div class="d-modal-action">
          <form method="dialog">
            <button
              type="button"
              class="d-btn d-btn-soft d-btn-primary mr-1"
              onClick={onClickSave}
            >
              Create
            </button>
            <button type="button" class="d-btn d-btn-ghost" onClick={onClickClose}>
              Cancel
            </button>
          </form>
        </div>
      </div>
      <form method="dialog" class="d-modal-backdrop">
        <button type="button" onClick={onClickClose}>Close</button>
      </form>
    </dialog>
  );
};

export default ApiKeyAddModal;
