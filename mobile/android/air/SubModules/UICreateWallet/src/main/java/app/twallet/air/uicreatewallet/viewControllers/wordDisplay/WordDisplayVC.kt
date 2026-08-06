package app.twallet.air.uicreatewallet.viewControllers.wordDisplay

import android.annotation.SuppressLint
import android.content.Context
import app.twallet.air.uicomponents.helpers.ToastHelper
import app.twallet.air.uicreatewallet.WalletCreationVM
import app.twallet.air.uicreatewallet.viewControllers.walletAdded.WalletAddedVC
import app.twallet.air.uipasscode.viewControllers.setPasscode.SetPasscodeVC
import app.twallet.air.uisettings.viewControllers.RecoveryPhraseVC
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletcontext.helpers.WordCheckMode
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.models.MBridgeError

@SuppressLint("ViewConstructor")
class WordDisplayVC(
    context: Context,
    private val network: MBlockchainNetwork,
    private val words: Array<String>,
    private val isFirstWalletToAdd: Boolean,
    private val isFirstPasscodeProtectedWallet: Boolean,
    // Used when adding new account (not first account!)
    private val passedPasscode: String?
) : RecoveryPhraseVC(context, network, words), WalletCreationVM.Delegate {

    override val shouldDisplayTopBar = false
    override val isBackAllowed = isFirstWalletToAdd

    override val skipTitle = LocaleController.getString("Open wallet without checking")
    override val checkMode =
        WordCheckMode.CheckAndImport(
            isFirstWalletToAdd = isFirstWalletToAdd,
            isFirstPasscodeProtectedWallet = isFirstPasscodeProtectedWallet,
            passedPasscode = passedPasscode
        )

    private val walletCreationVM by lazy {
        WalletCreationVM(this)
    }

    override fun setupViews() {
        super.setupViews()

        if (!isFirstWalletToAdd)
            navigationBar?.addCloseButton()
    }

    override fun skipPressed() {
        if (isFirstPasscodeProtectedWallet) {
            push(SetPasscodeVC(context, true, null) { passcode, biometricsActivated ->
                walletCreationVM.finalizeAccount(window!!, network, words, passcode, biometricsActivated, 0)
            }, onCompletion = {
                navigationController?.removePrevViewControllers()
            })
        } else {
            skipButton.isLoading = true
            view.lockView()
            walletCreationVM.finalizeAccount(window!!, network, words, passedPasscode ?: "", null, 0)
        }
    }

    override fun showError(error: MBridgeError?) {
        super.showError(error)

        skipButton.isLoading = false
        view.unlockView()
    }

    override fun finalizedCreation(createdAccount: MAccount, importedAccountsCount: Int) {
        if (isFirstWalletToAdd) {
            push(WalletAddedVC(context, true, importedAccountsCount), {
                navigationController?.removePrevViewControllers()
            })
        } else {
            WalletCore.notifyEvent(WalletEvent.AddNewWalletCompletion)
            ToastHelper.notifyWalletCreated(
                viewController = this,
                account = createdAccount
            )
            window!!.dismissLastNav()
        }
    }
}
