import React, { memo } from '../../lib/teact/teact';
import { getActions, withGlobal } from '../../global';

import type { ToastAction, ToastType } from '../../global/types';

import { pick } from '../../util/iteratees';

import Toast from '../ui/Toast';

type StateProps = {
  toasts: ToastType[];
};

const TOAST_ACTION_HANDLERS: Record<ToastAction, NoneToVoidFunction> = {
  openRenameWallet: () => getActions().openWalletRenameModal(),
};

function Toasts({ toasts }: StateProps) {
  const { dismissToast } = getActions();

  if (!toasts.length) {
    return undefined;
  }

  return (
    <div>
      {toasts.map(({
        id, message, icon, actionText, action,
      }) => (
        <Toast
          key={id}
          icon={icon}
          message={message}
          actionText={actionText}
          onAction={action ? TOAST_ACTION_HANDLERS[action] : undefined}
          onDismiss={() => dismissToast({ id })}
        />
      ))}
    </div>
  );
}

export default memo(withGlobal(
  (global): StateProps => pick(global, ['toasts']),
)(Toasts));
