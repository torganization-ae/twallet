package app.twallet.air.walletcore.api

import android.util.Log
import kotlinx.coroutines.launch
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore

suspend fun WalletCore.refreshStoredMfa(accountId: String, password: String? = null) {
    val result = WalletCore.call(ApiMethod.Mfa.RefreshMfaState(accountId, password))
    AccountStore.updateMfa(accountId, result.mfa)
}

fun WalletCore.refreshStoredMfaIfPossible(
    accountIds: Iterable<String>,
    password: String?,
) {
    scope.launch {
        for (accountId in accountIds) {
            try {
                refreshStoredMfa(accountId, password)
            } catch (t: Throwable) {
                Logger.e(
                    Logger.LogTag.WALLET_CORE,
                    "refreshStoredMfa failed for imported account $accountId: $t",
                )
            }
        }
    }
}
