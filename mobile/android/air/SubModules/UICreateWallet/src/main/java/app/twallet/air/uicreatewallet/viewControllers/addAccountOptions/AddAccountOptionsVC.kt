package app.twallet.air.uicreatewallet.viewControllers.addAccountOptions

import android.content.Context
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.FrameLayout
import androidx.constraintlayout.widget.ConstraintLayout
import app.twallet.air.ledger.screens.ledgerConnect.LedgerConnectVC
import app.twallet.air.uicomponents.base.WNavigationBar
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.LinedCenteredTitleView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uicreatewallet.viewControllers.importViewWallet.ImportViewWalletVC
import app.twallet.air.uicreatewallet.viewControllers.importWallet.ImportWalletVC
import app.twallet.air.uicreatewallet.viewControllers.wordDisplay.WordDisplayVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeConfirmVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeViewState
import app.twallet.air.uisettings.viewControllers.settings.cells.SettingsItemCell
import app.twallet.air.uisettings.viewControllers.settings.models.SettingsItem
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.logger.LogMessage
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.helpers.BiometricHelpers
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.api.activateAccount
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore
import java.lang.ref.WeakReference

class AddAccountOptionsVC(
    context: Context,
    val network: MBlockchainNetwork,
    val isOnIntro: Boolean
) :
    WViewController(context) {
    override val TAG = "AddAccountOptions"

    private val showCreateButton = !isOnIntro

    override val shouldDisplayTopBar = false

    private val showCreateSubWalletButton: Boolean =
        showCreateButton && AccountStore.currentAccountSupportsSubWallets()

    private val accountId: String
        get() = AccountStore.activeAccountId ?: ""

    private val createDailyWalletRow: SettingsItemCell by lazy {
        SettingsItemCell(context, 64f, SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
            configure(
                item = SettingsItem(
                    SettingsItem.Identifier.NONE,
                    app.twallet.air.uicreatewallet.R.drawable.ic_add_create,
                    LocaleController.getString("Daily Wallet"),
                    LocaleController.getString("Multi-chain everyday use"),
                    value = null,
                    hasTintColor = false
                ),
                subtitle = null,
                isFirst = true,
                isLast = false,
                isEnabled = true,
                onTap = { startCreateWallet(isVault = false) }
            )
        }
    }

    private val createVaultWalletRow: SettingsItemCell by lazy {
        SettingsItemCell(context, 64f, SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
            configure(
                item = SettingsItem(
                    SettingsItem.Identifier.NONE,
                    app.twallet.air.uicomponents.R.drawable.ic_wallet_lock,
                    LocaleController.getString("Vault Wallet"),
                    LocaleController.getString("TON-only cold storage with unlock"),
                    value = null,
                    hasTintColor = false
                ),
                subtitle = null,
                isFirst = false,
                isLast = !showCreateSubWalletButton,
                isEnabled = true,
                onTap = { startCreateWallet(isVault = true) }
            )
        }
    }

    private val createSubWalletRow: SettingsItemCell by lazy {
        SettingsItemCell(context, 64f, SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
            configure(
                item = SettingsItem(
                    SettingsItem.Identifier.NONE,
                    app.twallet.air.uicreatewallet.R.drawable.ic_add_subwallet,
                    LocaleController.getString("New Subwallet"),
                    LocaleController.getString("From current secret words"),
                    value = null,
                    hasTintColor = false
                ),
                subtitle = null,
                isFirst = false,
                isLast = true,
                isEnabled = true,
                onTap = { promptAndCreateSubwallet() }
            )
        }
    }

    private val orImportTitleView: LinedCenteredTitleView by lazy {
        LinedCenteredTitleView(context).apply {
            configure(LocaleController.getString("or import from"), 24.dp, 24.dp)
            configureText(WFont.Regular, WColor.SecondaryText)
            lineColor = WColor.SecondaryText
        }
    }

    private val createNewWalletView: WView by lazy {
        WView(context).apply {
            addView(createDailyWalletRow, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            addView(createVaultWalletRow, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            if (showCreateSubWalletButton) {
                addView(createSubWalletRow, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            }
            addView(orImportTitleView, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            setConstraints {
                toTop(createDailyWalletRow)
                toCenterX(createDailyWalletRow, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                topToBottom(createVaultWalletRow, createDailyWalletRow)
                toCenterX(createVaultWalletRow, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                if (showCreateSubWalletButton) {
                    topToBottom(createSubWalletRow, createVaultWalletRow)
                    toCenterX(createSubWalletRow, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                    topToBottom(orImportTitleView, createSubWalletRow, 2f)
                } else {
                    topToBottom(orImportTitleView, createVaultWalletRow, 2f)
                }
                toCenterX(orImportTitleView)
                toBottom(orImportTitleView)
            }
        }
    }

    private fun startCreateWallet(isVault: Boolean) {
        view.lockView()
        WalletCore.doOnBridgeReady {
            WalletCore.call(
                ApiMethod.Auth.GenerateMnemonic(isBip39 = !isVault),
                callback = { words, err ->
                    if (words != null) {
                        mnemonicGenerated(words, profile = if (isVault) "vault" else "daily")
                    } else {
                        view.unlockView()
                        showError(err?.parsed)
                    }
                })
        }
    }

    private val secretWordsRow =
        SettingsItemCell(context, 64f, SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
            configure(
                item = SettingsItem(
                    SettingsItem.Identifier.NONE,
                    app.twallet.air.uicreatewallet.R.drawable.ic_add_secret,
                    LocaleController.getPluralOrFormat("%1\$d Secret Words", 12, "12/24"),
                    LocaleController.getString("Restore wallet from 12 or 24 words"),
                    value = null,
                    hasTintColor = false
                ),
                subtitle = null,
                isFirst = true,
                isLast = false,
                isEnabled = true,
                onTap = {
                    if (!WGlobalStorage.isPasscodeSet()) {
                        handlePush(
                            ImportWalletVC(
                                context,
                                network = network,
                                passedPasscode = null
                            )
                        )
                    } else {
                        lateinit var passcodeConfirmVC: PasscodeConfirmVC
                        passcodeConfirmVC = PasscodeConfirmVC(
                            context,
                            PasscodeViewState.Default(
                                LocaleController.getString("Enter Passcode"),
                                "",
                                LocaleController.getString("Import Existing Wallet"),
                                showNavigationSeparator = false,
                                startWithBiometrics = true
                            ),
                            task = { passcode ->
                                val vc = ImportWalletVC(context, network, passcode)
                                passcodeConfirmVC.push(
                                    vc,
                                    onCompletion = {
                                        vc.navigationController?.removePrevViewControllers()
                                    })
                            }
                        )
                        handlePush(passcodeConfirmVC)
                    }
                }
            )
        }

    private val ledgerRow =
        SettingsItemCell(context, 64f, SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
            configure(
                item = SettingsItem(
                    SettingsItem.Identifier.NONE,
                    app.twallet.air.uicreatewallet.R.drawable.ic_add_ledger,
                    LocaleController.getString("Ledger"),
                    LocaleController.getString("Connect your hardware wallet"),
                    value = null,
                    hasTintColor = false
                ),
                subtitle = null,
                isFirst = false,
                isLast = true,
                isEnabled = true,
                onTap = {
                    handlePush(LedgerConnectVC(context, LedgerConnectVC.Mode.AddAccount(network)))
                }
            )
        }

    private val viewRow = SettingsItemCell(context, 64f, SettingsItemCell.SIMPLE_ROW_HEIGHT).apply {
        configure(
            item = SettingsItem(
                SettingsItem.Identifier.NONE,
                app.twallet.air.uicreatewallet.R.drawable.ic_add_view,
                LocaleController.getString("View Any Address"),
                LocaleController.getString("Watch wallet in read-only mode"),
                value = null,
                hasTintColor = false
            ),
            subtitle = null,
            isFirst = true,
            isLast = true,
            isEnabled = true,
            onTap = {
                push(ImportViewWalletVC(context, network, isOnIntro))
            }
        )
    }

    private val scrollingContentView: WView by lazy {
        WView(context).apply {
            if (showCreateButton) {
                addView(createNewWalletView, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            } else {
                // Temporarily removed for now
                // addView(importTitleLabel, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            }
            addView(secretWordsRow, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            addView(ledgerRow, FrameLayout.LayoutParams(0, WRAP_CONTENT))
            addView(viewRow, FrameLayout.LayoutParams(0, WRAP_CONTENT))

            setConstraints {
                if (showCreateButton) {
                    toTop(createNewWalletView, 14f)
                    toCenterX(createNewWalletView)
                    topToBottom(secretWordsRow, createNewWalletView, 1f)
                } else {
                    // toTop(importTitleLabel, 84f)
                    // toCenterX(importTitleLabel, 32f)
                    // topToBottom(secretWordsRow, importTitleLabel, 32f)
                    toTop(secretWordsRow, 14f)
                }
                toCenterX(secretWordsRow, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                topToBottom(ledgerRow, secretWordsRow)
                toCenterX(ledgerRow, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                topToBottom(viewRow, ledgerRow, 16f)
                toCenterX(viewRow, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                toBottomPx(
                    viewRow,
                    32.dp + (navigationController?.getSystemBars()?.bottom ?: 0)
                )
            }
        }
    }

    private val scrollView: WScrollView by lazy {
        WScrollView(WeakReference(this)).apply {
            id = View.generateViewId()
            clipToPadding = false
            addView(scrollingContentView, ConstraintLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))
            onScrollStateChange = {
                updateBlurViews(scrollView = this)
            }
            setOnScrollChangeListener { _, _, _, _, _ ->
                updateBlurViews(scrollView = this)
            }
        }
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle(LocaleController.getString(if (showCreateButton) "Add Wallet" else "Import Wallet") + network.localizedIdentifier)
        setupNavBar(true)

        navigationBar?.addCloseButton()

        view.addView(
            scrollView,
            ConstraintLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT)
        )
        view.setConstraints {
            allEdges(scrollView)
        }
        view.post {
            calculatedHeight = view.measuredHeight
        }

        updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        scrollView.setPaddingRelative(
            systemBarStartInset,
            (navigationBar?.topOffset ?: 0) + WNavigationBar.DEFAULT_HEIGHT.dp,
            systemBarEndInset,
            0
        )
        scrollingContentView.setConstraints {
            toBottomPx(
                viewRow,
                32.dp + (navigationController?.getSystemBars()?.bottom ?: 0)
            )
        }
    }

    override val isTinted = true
    override fun updateTheme() {
        super.updateTheme()

        view.setBackgroundColor(
            WColor.SecondaryBackground.color,
            ViewConstants.BLOCK_RADIUS.dp,
            0f
        )
    }

    private var calculatedHeight: Int? = null
    override val isExpandable = false
    override fun getModalHalfExpandedHeight(): Int? {
        return calculatedHeight ?: super.getModalHalfExpandedHeight()
    }

    private fun mnemonicGenerated(words: Array<String>, profile: String = "daily") {
        view.unlockView()
        val isFirstPasscodeProtectedWallet = !WGlobalStorage.isPasscodeSet()
        if (isFirstPasscodeProtectedWallet) {
            handlePush(
                WordDisplayVC(
                    context,
                    network = network,
                    words = words,
                    isFirstWalletToAdd = false,
                    isFirstPasscodeProtectedWallet = true,
                    passedPasscode = null,
                    profile = profile,
                )
            )
        } else {
            lateinit var passcodeConfirmVC: PasscodeConfirmVC
            passcodeConfirmVC = PasscodeConfirmVC(
                context,
                PasscodeViewState.Default(
                    LocaleController.getString("Enter Passcode"),
                    "",
                    LocaleController.getString("Create New Wallet"),
                    showNavigationSeparator = false,
                    startWithBiometrics = true
                ),
                task = { passcode ->
                    val vc = WordDisplayVC(
                        context,
                        network = network,
                        words = words,
                        isFirstWalletToAdd = false,
                        isFirstPasscodeProtectedWallet = false,
                        passcode,
                        profile = profile,
                    )
                    passcodeConfirmVC.push(
                        vc,
                        onCompletion = {
                            vc.navigationController?.removePrevViewControllers()
                        })
                }
            )
            handlePush(passcodeConfirmVC)
        }
    }

    private fun promptAndCreateSubwallet() {
        val window = window ?: return
        lateinit var passcodeConfirmVC: PasscodeConfirmVC
        passcodeConfirmVC = PasscodeConfirmVC(
            context,
            PasscodeViewState.Default(
                LocaleController.getString("Locked"),
                LocaleController.getString(
                    if (WGlobalStorage.isBiometricActivated() &&
                        BiometricHelpers.canAuthenticate(window)
                    )
                        "Enter passcode or use fingerprint" else "Enter Passcode"
                ),
                LocaleController.getString("New Subwallet"),
                showNavigationSeparator = false,
                startWithBiometrics = true
            ),
            task = { passcode ->
                createSubwallet(passcodeConfirmVC, passcode)
            }
        )
        passcodeConfirmVC.isTaskAsync = true
        handlePush(passcodeConfirmVC)
    }

    private fun createSubwallet(passcodeConfirmVC: PasscodeConfirmVC, passcode: String) {
        passcodeConfirmVC.view.lockView()
        WalletCore.call(
            ApiMethod.Settings.CreateSubWallet(accountId, passcode)
        ) { result, error ->
            if (error != null || result == null) {
                passcodeConfirmVC.view.unlockView()
                passcodeConfirmVC.showError(error?.parsed)
                return@call
            }

            val activeAccount = AccountStore.activeAccount ?: run {
                passcodeConfirmVC.view.unlockView()
                return@call
            }

            if (result.isNew) {
                val byChain = result.byChain ?: run {
                    passcodeConfirmVC.view.unlockView()
                    return@call
                }
                Logger.d(
                    Logger.LogTag.ACCOUNT,
                    LogMessage.Builder()
                        .append(result.accountId, LogMessage.MessagePartPrivacy.PUBLIC)
                        .append("Subwallet Created", LogMessage.MessagePartPrivacy.PUBLIC)
                        .append(
                            "Address: ${result.address}",
                            LogMessage.MessagePartPrivacy.REDACTED
                        )
                        .build()
                )
                val derivationIndex = byChain.values.firstOrNull()?.derivation?.index
                WGlobalStorage.addAccount(
                    accountId = result.accountId,
                    accountType = activeAccount.accountType.value,
                    MAccount.byChainToJson(byChain),
                    name = subwalletTitle(activeAccount.name, derivationIndex),
                    importedAt = System.currentTimeMillis()
                )
            }

            WalletCore.activateAccount(
                accountId = result.accountId,
                notifySDK = false
            ) { _, activateErr ->
                passcodeConfirmVC.view.unlockView()
                if (activateErr != null) {
                    Logger.e(
                        Logger.LogTag.ACCOUNT,
                        LogMessage.Builder()
                            .append(
                                "Activation failed in createSubwallet: $activateErr",
                                LogMessage.MessagePartPrivacy.PUBLIC
                            ).build()
                    )
                    return@activateAccount
                }
                window?.dismissLastNav()
                WalletCore.notifyEvent(WalletEvent.AddNewWalletCompletion)
            }
        }
    }

    private fun subwalletTitle(parentName: String, derivationIndex: Int?): String {
        val suffixDigits = parentName.takeLastWhile { it.isDigit() }
        val base = if (suffixDigits.isNotEmpty()) {
            val dotIndex = parentName.length - suffixDigits.length - 1
            if (dotIndex >= 0 && parentName[dotIndex] == '.') parentName.substring(0, dotIndex)
            else parentName
        } else {
            "${parentName.trim()} "
        }
        val suffix = derivationIndex?.plus(1) ?: return base
        return "$base.$suffix"
    }

    private fun handlePush(
        viewController: WViewController,
        presentAsModal: Boolean = !isOnIntro,
        onCompletion: (() -> Unit)? = null
    ) {
        fun afterDismiss() {
            val window = window ?: return
            if (presentAsModal) {
                val nav = WNavigationController(
                    window,
                    WNavigationController.PresentationConfig.PreferredFullScreen
                )
                nav.setRoot(viewController)
                window.present(nav, onCompletion = onCompletion)
                return
            }
            val lastNav = window.navigationControllers.lastOrNull()
            if (lastNav != null && !lastNav.isBottomSheet) {
                lastNav.push(viewController, onCompletion = onCompletion)
            } else {
                // Underlying nav is still a bottom-sheet (e.g. a stacked sheet).
                // Dismiss it and retry.
                window.dismissLastNav { afterDismiss() }
            }
        }
        window?.dismissLastNav { afterDismiss() }
    }
}
