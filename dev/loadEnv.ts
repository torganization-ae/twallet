import path from 'path';
import dotenv from 'dotenv';

// Resolve from this file so webpack still sees `.env` if cwd is not the repo root.
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

if (process.env.NO_WALLETCONNECT !== '1' && !process.env.WALLET_CONNECT_PROJECT_ID) {
  // eslint-disable-next-line no-console
  console.warn(
    '[env] WALLET_CONNECT_PROJECT_ID is empty — WalletConnect will not initialize. Set it in .env and rebuild.',
  );
}
