import { IS_TWALLETGRAM_WALLET } from '../config';

export function buildMfaStartParam(id: string) {
  return `${IS_TWALLETGRAM_WALLET ? 'g' : 'm'}_${id}`;
}
