import { MFA_BOT_URL } from '../../../config';
import { buildMfaStartParam } from '../../../util/mfa';
import { callApi } from '../../../api';
import { openSite } from '../../../components/explore/helpers/utils';
import { addActionHandler, getGlobal, setGlobal } from '../..';
import { updateSettings } from '../../reducers';
import { selectCurrentAccountId } from '../../selectors';

addActionHandler('createInstallMfaRequest', async (global) => {
  const accountId = selectCurrentAccountId(global)!;
  const result = await callApi('publishInstallMfaRequest', accountId);

  global = getGlobal();
  global = updateSettings(global, { installMfa: { requestId: result!.reqId } });
  setGlobal(global);

  const url = new URL(MFA_BOT_URL);
  url.searchParams.set('startapp', buildMfaStartParam(`i-${result!.reqId}`));
  openSite(url.toString(), true);
});

addActionHandler('setAccentColor', (global, actions, payload) => {
  const { index } = payload;
  const accountId = selectCurrentAccountId(global);
  if (!accountId) return;

  global = updateSettings(global, {
    byAccountId: {
      ...global.settings.byAccountId,
      [accountId]: {
        ...global.settings.byAccountId[accountId],
        accentColorIndex: index,
      },
    },
  });
  setGlobal(global);
});

addActionHandler('clearAccentColor', (global) => {
  const accountId = selectCurrentAccountId(global);
  if (!accountId) return;

  const accountSettings = global.settings.byAccountId[accountId];
  if (!accountSettings) return;

  const { accentColorIndex: _, ...rest } = accountSettings;
  global = updateSettings(global, {
    byAccountId: {
      ...global.settings.byAccountId,
      [accountId]: rest,
    },
  });
  setGlobal(global);
});
