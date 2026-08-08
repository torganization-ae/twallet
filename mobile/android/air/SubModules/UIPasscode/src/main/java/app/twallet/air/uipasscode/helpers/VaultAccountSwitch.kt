package app.twallet.air.uipasscode.helpers

import android.content.Context
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeConfirmVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeViewState
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.api.activateAccount
import app.twallet.air.walletcore.helpers.VaultUnlock
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.stores.AccountStore

/** Gates account switches to vault wallets behind passcode (session unlock). */
object VaultAccountSwitch {

    fun activate(
        context: Context,
        window: WWindow?,
        account: MAccount,
        willPopTemporaryPushedWallets: Boolean = false,
        onActivated: (() -> Unit)? = null,
        onFailed: (() -> Unit)? = null,
    ) {
        if (account.isVault && !VaultUnlock.isUnlocked(account.accountId)) {
            val host = window ?: return
            lateinit var passcodeConfirmVC: PasscodeConfirmVC
            passcodeConfirmVC = PasscodeConfirmVC(
                context,
                PasscodeViewState.Default(
                    LocaleController.getString("Unlock Vault"),
                    LocaleController.getString("Enter passcode to open this vault wallet"),
                    LocaleController.getString("Vault"),
                    showNavigationSeparator = false,
                    startWithBiometrics = true
                ),
                task = { _ ->
                    VaultUnlock.unlock(account.accountId)
                    WalletCore.activateAccount(
                        account.accountId,
                        notifySDK = true,
                        willPopTemporaryPushedWallets = willPopTemporaryPushedWallets
                    ) { res, err ->
                        if (res == null || err != null) {
                            onFailed?.invoke()
                        } else {
                            host.dismissLastNav()
                            onActivated?.invoke()
                        }
                    }
                }
            )
            val nav = WNavigationController(host)
            nav.setRoot(passcodeConfirmVC)
            host.present(nav)
            return
        }

        WalletCore.activateAccount(
            account.accountId,
            notifySDK = true,
            willPopTemporaryPushedWallets = willPopTemporaryPushedWallets
        ) { res, err ->
            if (res == null || err != null) {
                onFailed?.invoke()
            } else {
                onActivated?.invoke()
            }
        }
    }

    fun activateById(
        context: Context,
        window: WWindow?,
        accountId: String,
        onActivated: (() -> Unit)? = null,
        onFailed: (() -> Unit)? = null,
    ) {
        val account = AccountStore.accountById(accountId) ?: run {
            // Fall back to activate without vault check if account object unavailable
            WalletCore.activateAccount(accountId, notifySDK = true) { res, err ->
                if (res == null || err != null) onFailed?.invoke() else onActivated?.invoke()
            }
            return
        }
        activate(
            context = context,
            window = window,
            account = account,
            onActivated = onActivated,
            onFailed = onFailed,
        )
    }
}
