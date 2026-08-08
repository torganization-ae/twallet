package app.twallet.air.uicreatewallet.viewControllers.importWallet

import android.app.Activity
import android.os.Handler
import android.os.Looper
import app.twallet.air.walletbasecontext.logger.LogMessage
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcontext.secureStorage.WSecureStorage
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.api.importPrivateKey
import app.twallet.air.walletcore.api.importWallet
import app.twallet.air.walletcore.api.refreshStoredMfaIfPossible
import app.twallet.air.walletcore.api.validateMnemonic
import app.twallet.air.walletcore.helpers.PrivateKeyHelper
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.models.MBridgeError
import app.twallet.air.walletcore.utils.jsonObject
import java.lang.ref.WeakReference

class ImportWalletVM(delegate: Delegate) {
    interface Delegate {
        fun walletCanBeImported(words: Array<String>)
        fun finalizedImport(accountId: String, importedAccountsCount: Int)
        fun showError(error: MBridgeError?)
    }

    val delegate: WeakReference<Delegate> = WeakReference(delegate)

    // Called to import a wallet into js-logic accounts
    fun importWallet(words: Array<String>) {
        val privateKeyWords = PrivateKeyHelper.normalizeMnemonicPrivateKey(words)
        if (privateKeyWords != null) {
            delegate.get()?.walletCanBeImported(privateKeyWords)
            return
        }
        WalletCore.doOnBridgeReady {
            WalletCore.validateMnemonic(words) { success, error ->
                if (!success || error != null) {
                    delegate.get()?.showError(error)
                } else {
                    delegate.get()?.walletCanBeImported(words)
                }
            }
        }
    }

    // Add the account into logics
    fun finalizeAccount(
        window: Activity,
        network: MBlockchainNetwork,
        words: Array<String>,
        passcode: String,
        biometricsActivated: Boolean?,
        retriesLeft: Int = 3
    ) {
        fun onResult(importedAccounts: List<MAccount>?, error: MBridgeError?) {
            if (error != null) {
                if (retriesLeft > 0) {
                    Handler(Looper.getMainLooper()).postDelayed({
                        finalizeAccount(
                            window,
                            network,
                            words,
                            passcode,
                            biometricsActivated,
                            retriesLeft - 1
                        )
                    }, 3000)
                } else {
                    delegate.get()?.showError(error)
                }
                return
            }
            val primaryAccount = importedAccounts?.firstOrNull() ?: return
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
            importedAccounts.forEach { account ->
                WGlobalStorage.addAccount(
                    accountId = account.accountId,
                    accountType = MAccount.AccountType.MNEMONIC.value,
                    byChain = account.byChain.jsonObject,
                    importedAt = account.importedAt
                )
            }
            WalletCore.refreshStoredMfaIfPossible(
                importedAccounts.map { it.accountId },
                passcode,
            )
            if (biometricsActivated != null) {
                if (biometricsActivated) {
                    val activated = WSecureStorage.setBiometricPasscode(window, passcode)
                    WGlobalStorage.setIsBiometricActivated(activated)
                } else {
                    WSecureStorage.deleteBiometricPasscode(window)
                    WGlobalStorage.setIsBiometricActivated(false)
                }
            }
            delegate.get()?.finalizedImport(primaryAccount.accountId, importedAccounts.size)
        }

        val privateKeyWords = PrivateKeyHelper.normalizeMnemonicPrivateKey(words)
        if (privateKeyWords != null) {
            WalletCore.importPrivateKey(network, privateKeyWords[0], passcode) { account, error ->
                onResult(account?.let { listOf(it) }, error)
            }
        } else {
            WalletCore.importWallet(network, words, passcode, false) { accounts, error ->
                onResult(accounts, error)
            }
        }
    }
}
