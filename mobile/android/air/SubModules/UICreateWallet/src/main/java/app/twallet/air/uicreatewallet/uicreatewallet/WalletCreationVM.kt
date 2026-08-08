package app.twallet.air.uicreatewallet

import android.app.Activity
import app.twallet.air.walletbasecontext.logger.LogMessage
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcontext.secureStorage.WSecureStorage
import app.twallet.air.walletcore.ALL_DEFAULT_TOKENS
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.api.activateAccount
import app.twallet.air.walletcore.api.importWallet
import app.twallet.air.walletcore.helpers.VaultUnlock
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.models.MBridgeError
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.BalanceStore
import app.twallet.air.walletcore.utils.jsonObject
import java.lang.ref.WeakReference
import java.math.BigInteger

class WalletCreationVM(delegate: Delegate) {
    interface Delegate {
        fun showError(error: MBridgeError?)
        fun finalizedCreation(createdAccount: MAccount, importedAccountsCount: Int)
    }

    val delegate: WeakReference<Delegate> = WeakReference(delegate)

    // Create and add the account into logics
    fun finalizeAccount(
        window: Activity,
        network: MBlockchainNetwork,
        words: Array<String>,
        passcode: String,
        biometricsActivated: Boolean?,
        retriesLeft: Int,
        profile: String = "daily",
    ) {
        WalletCore.importWallet(network, words, passcode, true) { accounts, error ->
            if (accounts.isNullOrEmpty() || error != null) {
                if (retriesLeft > 0) {
                    finalizeAccount(
                        window,
                        network,
                        words,
                        passcode,
                        biometricsActivated,
                        retriesLeft - 1,
                        profile,
                    )
                } else {
                    delegate.get()?.showError(error)
                }
            } else {
                val primaryAccount = accounts[0]
                Logger.d(
                    Logger.LogTag.ACCOUNT,
                    LogMessage.Builder()
                        .append(
                            "finalizeAccount: accountId=${primaryAccount.accountId}",
                            LogMessage.MessagePartPrivacy.PUBLIC
                        )
                        .append(
                            " address=",
                            LogMessage.MessagePartPrivacy.PUBLIC
                        )
                        .append(
                            "${primaryAccount.tonAddress}",
                            LogMessage.MessagePartPrivacy.REDACTED
                        ).build()
                )
                accounts.forEach { account ->
                    WGlobalStorage.addAccount(
                        accountId = account.accountId,
                        accountType = MAccount.AccountType.MNEMONIC.value,
                        byChain = account.byChain.jsonObject,
                        importedAt = account.importedAt,
                        profile = profile,
                    )
                    account.profile = profile
                    WGlobalStorage.setIsHistoryEndReached(account.accountId, null, true)
                    val seededBalances = HashMap<String, BigInteger>().apply {
                        ALL_DEFAULT_TOKENS[account.network]?.forEach { slug ->
                            put(slug, BigInteger.ZERO)
                        }
                    }
                    BalanceStore.setBalances(account.accountId, seededBalances, true)
                }
                if (profile == "vault") {
                    accounts.forEach { account ->
                        WalletCore.call(
                            ApiMethod.Networks.SetAccountVaultProfile(account.accountId, true)
                        ) { _, _ -> }
                        VaultUnlock.unlock(account.accountId)
                    }
                }
                if (biometricsActivated != null) {
                    if (biometricsActivated) {
                        val activated = WSecureStorage.setBiometricPasscode(window, passcode)
                        WGlobalStorage.setIsBiometricActivated(activated)
                    } else {
                        WSecureStorage.deleteBiometricPasscode(window)
                        WGlobalStorage.setIsBiometricActivated(false)
                    }
                }
                WalletCore.activateAccount(
                    primaryAccount.accountId,
                    notifySDK = false
                ) { res, err ->
                    if (res == null || err != null) {
                        // Should not happen!
                        Logger.e(
                            Logger.LogTag.ACCOUNT,
                            LogMessage.Builder()
                                .append(
                                    "activateAccount: Failed after wallet creation err=$err",
                                    LogMessage.MessagePartPrivacy.PUBLIC
                                ).build()
                        )
                    } else {
                        delegate.get()?.finalizedCreation(primaryAccount, accounts.size)
                    }
                }
            }
        }
    }
}
