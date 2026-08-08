package app.twallet.air.airasframework.splash

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import androidx.core.graphics.createBitmap
import androidx.core.net.toUri
import androidx.core.view.isVisible
import app.twallet.air.airasframework.AirAsFrameworkApplication
import app.twallet.air.airasframework.MainWindow
import app.twallet.air.ledger.screens.ledgerConnect.LedgerConnectVC
import app.twallet.air.sqscan.screen.QrScannerDialog
import app.twallet.air.uiassets.viewControllers.nft.NftVC
import app.twallet.air.uiassets.viewControllers.renew.RenewVC
import app.twallet.air.uiassets.viewControllers.token.TokenVC
import app.twallet.air.uicomponents.AnimationConstants
import app.twallet.air.uicomponents.base.ITabsVC
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WNavigationController.PresentationConfig
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.base.showAlert
import app.twallet.air.uicomponents.extensions.startActivityCatching
import app.twallet.air.uicomponents.helpers.PopupHelpers
import app.twallet.air.uicomponents.widgets.fadeOut
import app.twallet.air.uicomponents.widgets.hideKeyboard
import app.twallet.air.uicreatewallet.viewControllers.addAccountOptions.AddAccountOptionsVC
import app.twallet.air.uicreatewallet.viewControllers.importViewWallet.ImportViewWalletVC
import app.twallet.air.uicreatewallet.viewControllers.intro.IntroVC
import app.twallet.air.uicreatewallet.viewControllers.walletAdded.WalletAddedVC
import app.twallet.air.uicreatewallet.viewControllers.wordCheck.WordCheckVC
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeConfirmVC
import app.twallet.air.uipasscode.viewControllers.passcodeConfirm.PasscodeViewState
import app.twallet.air.uiportfolio.viewControllers.portfolio.PortfolioVC
import app.twallet.air.uireceive.ReceiveVC
import app.twallet.air.uisend.send.SendVC
import app.twallet.air.uisend.send.SendVC.InitialValues
import app.twallet.air.uisettings.viewControllers.appInfo.AppInfoVC
import app.twallet.air.uisettings.viewControllers.appearance.AppearanceVC
import app.twallet.air.uisettings.viewControllers.assetsAndActivities.AssetsAndActivitiesVC
import app.twallet.air.uisettings.viewControllers.connectedApps.ConnectedAppsVC
import app.twallet.air.uisettings.viewControllers.language.LanguageVC
import app.twallet.air.uisettings.viewControllers.notificationSettings.NotificationSettingsVC
import app.twallet.air.uisettings.viewControllers.userResponsibility.UserResponsibilityVC
import app.twallet.air.uisettings.viewControllers.walletVersions.WalletVersionsVC
import app.twallet.air.uiswap.screens.swap.SwapVC
import app.twallet.air.uitonconnect.TonConnectController
import app.twallet.air.uitonconnect.viewControllers.connect.TonConnectRequestConnectVC
import app.twallet.air.uitonconnect.viewControllers.send.requestSend.TonConnectRequestSendVC
import app.twallet.air.uitransaction.viewControllers.transaction.TransactionVC
import app.twallet.air.uitransaction.viewControllers.transactionList.TransactionListVC
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.logger.LogMessage
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletbasecontext.theme.NftAccentColors
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.DeeplinkOpenSource
import app.twallet.air.walletcontext.WalletContextManager
import app.twallet.air.walletcontext.WalletContextManagerDelegate
import app.twallet.air.walletcontext.cacheStorage.WCacheStorage
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.helpers.AutoLockHelper
import app.twallet.air.walletcontext.helpers.BiometricHelpers
import app.twallet.air.walletcontext.helpers.LaunchConfig
import app.twallet.air.walletcontext.helpers.WordCheckMode
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcontext.models.MWalletSettingsViewMode
import app.twallet.air.walletcontext.secureStorage.WSecureStorage
import app.twallet.air.walletcontext.utils.CoinUtils
import app.twallet.air.walletcontext.utils.ensureMainThread
import app.twallet.air.walletcore.TONCOIN_SLUG
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.api.activateAccount
import app.twallet.air.walletcore.api.resetAccounts
import app.twallet.air.walletcore.api.swapGetAssets
import app.twallet.air.walletcore.api.syncVaultAccountsFromStorage
import app.twallet.air.walletcore.deeplink.Deeplink
import app.twallet.air.walletcore.deeplink.DeeplinkNavigator
import app.twallet.air.walletcore.deeplink.DeeplinkParser
import app.twallet.air.walletcore.helpers.TonConnectHelper
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.models.MBridgeError
import app.twallet.air.walletcore.models.MScreenMode
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.ApiConnectionType
import app.twallet.air.walletcore.moshi.ApiNft
import app.twallet.air.walletcore.moshi.MApiSwapAsset
import app.twallet.air.walletcore.moshi.ReturnStrategy
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.moshi.api.ApiMethod.DApp.TonConnectHandleDeepLink
import app.twallet.air.walletcore.moshi.api.ApiUpdate
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.NftStore
import app.twallet.air.walletcore.stores.TokenStore
import app.twallet.air.walletcore.utils.jsonObject
import app.twallet.uihome.home.HomeVC
import app.twallet.uihome.tabletTabs.TabletTabsVC
import app.twallet.uihome.tabs.BaseTabsVC
import app.twallet.uihome.tabs.PhoneTabsVC
import app.twallet.uihome.walletsTabs.WalletsTabsVC
import java.io.UnsupportedEncodingException
import java.net.URLEncoder

class SplashVC(context: Context) : WViewController(context),
    WalletContextManagerDelegate,
    DeeplinkNavigator,
    WalletCore.UpdatesObserver,
    WalletCore.EventObserver {
    override val TAG = "Splash"

    override val shouldDisplayTopBar = false

    private data class PendingDeeplink(
        val deeplink: Deeplink,
        val source: DeeplinkOpenSource
    )

    companion object {
        // Pending deeplink url when launching the app using a deeplink, before creating Splash instance
        private var pendingDeeplink: PendingDeeplink? = null
        var sharedInstance: DeeplinkNavigator? = null

        fun setPendingDeeplink(deeplink: Deeplink) {
            pendingDeeplink = PendingDeeplink(deeplink, DeeplinkOpenSource.OS_EXTERNAL)
        }
    }

    private var appIsUnlocked = false
    private var _isWalletReady = false

    // Pending deeplink to run after the wallet is ready
    private var nextDeeplink: PendingDeeplink? = null
    private var openingSingleWalletWithAddress: String? = null

    init {
        sharedInstance = this
        if (pendingDeeplink != null) {
            nextDeeplink = pendingDeeplink
            pendingDeeplink = null
        }
    }

    override fun setupViews() {
        super.setupViews()
        // Handle possible deep-links right after screen load (like switch to classic on first app launch)
        handleDeeplinkIfRequired()
        updateTheme()
        WalletCore.subscribeToApiUpdates(ApiUpdate.ApiUpdateDappLoading::class.java, this)
        WalletCore.registerObserver(this)
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.Background.color)
    }

    // Presents the view controllers even before bridge becomes ready, to reduce the app start-up time
    var preloadedScreen: WCacheStorage.InitialScreen? = null
    fun preloadScreens() {
        preloadedScreen = null
        view.post { // insets should be loaded first
            if (WalletCore.isBridgeReady)
                return@post // Bridge got ready during view.post process!
            WCacheStorage.getInitialScreen()?.let {
                when (it) {
                    WCacheStorage.InitialScreen.INTRO -> {
                        if (WGlobalStorage.accountIds().isNotEmpty())
                            return@post
                        presentIntro(network = MBlockchainNetwork.MAINNET)
                        preloadedScreen = WCacheStorage.InitialScreen.INTRO
                    }

                    WCacheStorage.InitialScreen.HOME -> {
                        return@post
                    }

                    WCacheStorage.InitialScreen.LOCK -> {
                        if (WGlobalStorage.accountIds().isEmpty())
                            return@post
                        presentTabsAndLockScreen()
                        preloadedScreen = WCacheStorage.InitialScreen.LOCK
                    }
                }
            }
        }
    }

    fun bridgeIsReady() {
        Logger.i(Logger.LogTag.AIR_APPLICATION, "bridgeIsReady: Activating account")
        val accountIds = WGlobalStorage.accountIds()
        if (accountIds.isEmpty()) {
            // Reset and make sure nothing is cached (to handle corrupted global storage conditions)
            resetToIntro()
            return
        }
        var activeAccountId = WGlobalStorage.getActiveAccountId()
        if (nextDeeplink?.deeplink?.accountAddress != null) {
            // Switch to the deeplink account
            val resolvedAccountId =
                AccountStore.accountIdByAddress(nextDeeplink?.deeplink?.accountAddress)
            if (resolvedAccountId != null && accountIds.contains(resolvedAccountId)) {
                activeAccountId = resolvedAccountId
            } else {
                nextDeeplink = null
            }
        }
        activateAccount(
            accountIds = accountIds,
            activeAccountId = activeAccountId,
            isActivatedInSDK = false
        )
        AccountStore.removeTemporaryAccounts()
        WalletCore.syncVaultAccountsFromStorage()
    }

    // Activates an account. Handles corrupted storage data.
    fun activateAccount(
        accountIds: Array<String>,
        activeAccountId: String?,
        isActivatedInSDK: Boolean
    ) {
        val activatingAccountId = activeAccountId ?: accountIds.first()
        WalletCore.activateAccount(
            activatingAccountId,
            notifySDK = !isActivatedInSDK
        ) { res, err ->
            if (res == null || err != null) {
                /* Should not happen normally,
                    Probably failed it's due to partial account removal somehow,
                    Let's recover. */

                // Cancel any deep-links
                nextDeeplink = null

                // Remove the corrupted account from the queue
                val nextTryAccountIds = accountIds.filter { it != activeAccountId }.toTypedArray()
                if (nextTryAccountIds.isNotEmpty()) {
                    // Try the next accessible accountId
                    val nextTryAccountId = nextTryAccountIds.first()
                    Logger.d(
                        Logger.LogTag.ACCOUNT,
                        "activateAccount: Failed to load accountId=$activatingAccountId, trying nextAccountId=$nextTryAccountId"
                    )
                    AccountStore.removeAccount(
                        activatingAccountId,
                        null,
                        null,
                        onCompletion = { _, _ ->
                            activateAccount(
                                accountIds = nextTryAccountIds,
                                activeAccountId = nextTryAccountId,
                                isActivatedInSDK = false
                            )
                        })
                } else {
                    // No more accounts left, let's reset
                    Logger.d(
                        Logger.LogTag.ACCOUNT,
                        "activateAccount: Reset accounts on splash error"
                    )
                    resetToIntro()
                }
            } else {
                // Everything is fine, let's go!
                WalletCore.swapGetAssets(true)
                if (preloadedScreen == null) {
                    if (!WGlobalStorage.isPasscodeSet())
                        appIsUnlocked = true
                    presentTabsAndLockScreen()
                }
            }
            WalletCore.checkPendingBridgeTasks()
        }
    }

    private fun presentIntro(network: MBlockchainNetwork) {
        if (preloadedScreen == WCacheStorage.InitialScreen.INTRO)
            return
        val navigationController = WNavigationController(window!!)
        navigationController.setRoot(IntroVC(context, network))
        window!!.replace(navigationController, false)
        Logger.i(Logger.LogTag.AIR_APPLICATION, "presentIntro: Done")
    }

    private fun presentTabsAndLockScreen() {
        val tabsNav = WNavigationController(window!!)
        val tabsVC: WViewController =
            if (window!!.isWideLayout) TabletTabsVC(context) else PhoneTabsVC(context)
        tabsNav.setRoot(tabsVC)
        tabsVC.view.isVisible = appIsUnlocked
        window!!.replace(tabsNav, appIsUnlocked, onCompletion = {
            Logger.i(Logger.LogTag.AIR_APPLICATION, "presentTabsAndLockScreen: Done")
            if (!appIsUnlocked)
                presentLockScreen()
        })
    }

    private fun resetToIntro() {
        WalletCore.resetAccounts { _, _ ->
            WGlobalStorage.deleteAllWallets()
            WSecureStorage.deleteAllWalletValues()
            appIsUnlocked = true
            presentIntro(MBlockchainNetwork.MAINNET)
        }
    }

    override fun restartApp() {
        // Make sure we are on splash screen
        if ((window?.navigationControllers?.size ?: 1) > 1) {
            for (i in (window?.navigationControllers!!.size - 2) downTo 1) {
                window?.dismissNav(i)
            }
            window?.dismissLastNav {
                restartApp()
            }
            window?.navigationControllers[0]?.visibility = View.INVISIBLE
            return
        }
        // Reset app
        window?.forceStatusBarLight = null
        window?.forceBottomBarLight = null
        window?.updateLayoutDirection()
        (window as? MainWindow)?.restartBridge(forcedRecreation = true)
    }

    override fun getAddAccountVC(network: MBlockchainNetwork): WViewController {
        return AddAccountOptionsVC(context, network = network, isOnIntro = false)
    }

    override fun getWalletAddedVC(isNew: Boolean, importedAccountsCount: Int): Any {
        return WalletAddedVC(context, isNew, importedAccountsCount)
    }

    override fun getWordCheckVC(
        network: MBlockchainNetwork,
        words: Array<String>,
        initialWordIndices: List<Int>,
        mode: WordCheckMode
    ): Any {
        return WordCheckVC(context, network, words, initialWordIndices, mode)
    }

    override fun getImportLedgerVC(network: MBlockchainNetwork): Any {
        return LedgerConnectVC(context, LedgerConnectVC.Mode.AddAccount(network))
    }

    override fun getAddViewAccountVC(network: MBlockchainNetwork): Any {
        return ImportViewWalletVC(context, network, false)
    }

    override fun getWalletsTabsVC(viewMode: MWalletSettingsViewMode): Any {
        return WalletsTabsVC(
            context,
            viewMode
        )
    }

    override fun themeChanged(animated: Boolean) {
        val context = window?.applicationContext ?: return

        val applyTheme = {
            AirAsFrameworkApplication.initTheme(context)
            window?.updateTheme()
        }

        if (animated) {
            animateThemeChange { applyTheme() }
        } else {
            applyTheme()
        }
    }

    override fun protectedModeChanged() {
        window?.updateProtectedView()
    }

    override fun lockScreen() {
        if (!appIsUnlocked || !WGlobalStorage.isPasscodeSet())
            return
        presentLockScreen()
    }

    private fun presentLockScreen() {
        // To prevent ui glitches, make sure window has background
        if (tabsVC?.view?.isVisible != true)
            window?.window?.decorView?.setBackgroundColor(WColor.Background.color)
        // Make sure to dismiss all popups or dialogs when presenting lock screen
        PopupHelpers.dismissAllPopups()
        dismissActiveDialogs()
        window?.topViewController?.dismissActiveDialogs()
        view.hideKeyboard()
        appIsUnlocked = false
        val passcodeConfirmVC = PasscodeConfirmVC(
            context,
            PasscodeViewState.Default(
                LocaleController.getString("Unlock"),
                LocaleController.getString(
                    (if (WGlobalStorage.isBiometricActivated() &&
                        BiometricHelpers.canAuthenticate(window!!)
                    )
                        "Enter passcode or use fingerprint" else "Enter Passcode")
                ),
                showNavBar = false,
                light = !NftAccentColors.veryBrightColors.contains(WColor.Tint.color),
                showMotionBackgroundDrawable = true,
                animated = true,
                startWithBiometrics = true,
                isUnlockScreen = true
            ),
            task = {
                // After unlock:
                window?.forceStatusBarLight = null
                window?.forceBottomBarLight = null
                tabsVC?.view?.isVisible = true
                window?.dismissLastNav(
                    WWindow.DismissAnimation.SCALE_OUT,
                    onCompletion = {
                        appIsUnlocked = true
                        handleDeeplinkIfRequired()
                        window?.doPendingTasks()
                    })
            },
            allowedToCancel = false
        )
        val navigationController = WNavigationController(
            window!!,
            PresentationConfig(style = WNavigationController.PresentationStyle.ForceFullScreen)
        )
        navigationController.setRoot(passcodeConfirmVC)
        window!!.present(
            navigationController,
            presentAnimation = WWindow.PresentAnimation.SCALE_IN,
            onCompletion = {
                // Lock-screen is on, remove unnecessary window background
                window?.window?.decorView?.background = null
            })
    }

    override fun isAppUnlocked(): Boolean {
        return appIsUnlocked
    }

    override fun handleDeeplink(deeplink: String, source: DeeplinkOpenSource): Boolean {
        val parsedDeeplink = DeeplinkParser.parse(deeplink.toUri())
        nextDeeplink = parsedDeeplink?.let { PendingDeeplink(it, source) }
        val isAValidDeeplink = parsedDeeplink != null
        handleDeeplinkIfRequired()
        return isAValidDeeplink
    }

    override fun showError(error: String?) {
        val message = error
            ?.let { raw -> MBridgeError.entries.firstOrNull { it.errorName == raw } }
            ?.toLocalized
            ?: error?.let { LocaleController.getString(it) }
            ?: MBridgeError.UNKNOWN.toLocalized
        showAlertOverTopVC(LocaleController.getString("Error"), message)
    }

    override fun openASingleWallet(
        network: MBlockchainNetwork,
        addressByChainString: Map<String, String>,
        name: String?
    ) {
        if (addressByChainString.isEmpty()) {
            showAlertOverTopVC(
                LocaleController.getString("Error"),
                LocaleController.getString("\$no_valid_view_addresses")
            )
            return
        }

        val addressByChain = mutableMapOf<MBlockchain, String>()
        addressByChainString.forEach { (chainStr, address) ->
            val blockchain = MBlockchain.valueOfOrNull(chainStr) ?: return@forEach
            addressByChain[blockchain] = address
        }

        if (addressByChain.isEmpty()) {
            showAlertOverTopVC(
                LocaleController.getString("Error"),
                LocaleController.getString("\$no_valid_view_addresses")
            )
            return
        }

        if (openingSingleWalletWithAddress == addressByChainString.values.firstOrNull())
            return

        openingSingleWalletWithAddress = addressByChainString.values.firstOrNull()
        val accountIds = WGlobalStorage.accountIds()
        accountIds.forEach { existingAccountId ->
            val existingAccount = AccountStore.accountById(existingAccountId)
            if (existingAccount?.addressByChain?.entries?.containsAll(addressByChainString.entries) == true) {
                WalletCore.activateAccount(
                    accountId = existingAccountId,
                    notifySDK = true,
                    isPushedTemporary = true
                ) { _, err ->
                    if (err != null) {
                        openingSingleWalletWithAddress = null
                        return@activateAccount
                    }
                    window?.dismissToRoot {
                        WalletCore.notifyEvent(
                            WalletEvent.AccountChangedInApp(
                                persistedAccountsModified = false
                            )
                        )
                        openSingleWalletHome(existingAccountId)
                        openingSingleWalletWithAddress = null
                    }
                }
                return
            }
        }
        importTemporaryAccount(
            network = network,
            addressByChain = addressByChain,
            name = name,
        )
    }

    override fun walletIsReady() {
        _isWalletReady = true
        handleDeeplinkIfRequired()
        window?.doPendingTasks()
    }

    override fun isWalletReady(): Boolean {
        return _isWalletReady
    }

    private fun handleDeeplinkIfRequired() {
        if (window?.presentPendingPresentationNav() == true) {
            nextDeeplink = null
            return
        }
        nextDeeplink?.let { handle(it.deeplink, it.source) }
    }

    override fun recreateBridge() {
        ensureMainThread {
            val mainWindow = window as? MainWindow
            if (mainWindow == null) {
                Logger.e(
                    Logger.LogTag.AIR_APPLICATION,
                    "recreateBridge: no MainWindow, cannot restart bridge"
                )
                return@ensureMainThread
            }
            _isWalletReady = false
            preloadedScreen = null
            mainWindow.restartBridge(forcedRecreation = true)
        }
    }

    override fun switchToLegacy() {
        Handler(Looper.getMainLooper()).post {
            LaunchConfig.setShouldStartOnAir(context, false)
            window?.startActivity(WalletContextManager.getMainActivityIntent(context))
            AutoLockHelper.stop()
            window?.finish()
            sharedInstance = null
            WalletContextManager.setDelegate(null)
        }
    }

    override fun bindQrCodeButton(
        context: Context,
        button: View,
        onResult: (String) -> Unit,
        parseDeepLinks: Boolean
    ) {
        button.setOnClickListener {
            QrScannerDialog.build(context) {
                val text = it.trim()
                var address = text
                if (parseDeepLinks) {
                    val deeplink = runCatching { DeeplinkParser.parse(text.toUri()) }.getOrNull()
                    if (deeplink is Deeplink.Invoice) {
                        address = deeplink.address
                    }
                }
                onResult(address)
            }.show()
        }
    }

    private fun showAlertOverTopVC(title: String?, text: CharSequence) {
        if (!appIsUnlocked)
            return
        window?.topViewController?.apply {
            showAlert(title, text)
        }
    }

    override fun handle(deeplink: Deeplink) {
        handle(deeplink, DeeplinkOpenSource.OS_EXTERNAL)
    }

    private fun handle(deeplink: Deeplink, source: DeeplinkOpenSource) {
        if (deeplink is Deeplink.SwitchToLegacy) {
            switchToLegacy()
            return
        }
        if (!_isWalletReady) {
            nextDeeplink = PendingDeeplink(deeplink, source)
            return
        }
        val isHandled = handleInstantDeeplinks(deeplink)
        if (isHandled) {
            nextDeeplink = null
            return
        }
        if (!isAppUnlocked() || window?.isPaused == true) {
            nextDeeplink = PendingDeeplink(deeplink, source)
            return
        }
        if (window?.presentPendingPresentationNav() == true) {
            nextDeeplink = null
            return
        }
        handleWalletReadyDeeplinks(deeplink, source)
    }

    private val tabsVC: BaseTabsVC?
        get() = window?.navigationControllers?.firstOrNull()?.viewControllers?.firstOrNull() as? BaseTabsVC

    private fun openSingleWalletHome(accountId: String) {
        val homeVC = HomeVC(context, MScreenMode.SingleWallet(accountId))
        tabsVC?.mainNavigationController?.push(homeVC)
    }

    private fun handleInstantDeeplinks(deeplink: Deeplink): Boolean {
        when (deeplink) {
            is Deeplink.TonConnect2 -> {
                val uri = try {
                    encodeUriParams(deeplink.requestUri).toString()
                } catch (_: Throwable) {
                    return true
                }
                WalletCore.call(
                    TonConnectHandleDeepLink(
                        url = uri,
                        identifier = TonConnectHelper.generateId()
                    )
                ) { returnStrategy, err ->
                    if (err != null) {
                        return@call
                    }
                    handleReturnStrategy(returnStrategy)
                }
                return true
            }

            is Deeplink.WalletConnect -> {
                WalletCore.call(
                    ApiMethod.DApp.WalletConnectHandleDeepLink(deeplink.requestUri.toString())
                ) { _, _ -> }
                return true
            }

            is Deeplink.WalletConnectPay -> {
                WalletCore.call(
                    ApiMethod.DApp.WalletConnectHandleDeepLink(deeplink.requestUri.toString())
                ) { _, _ -> }
                return true
            }

            else -> {}
        }
        return false
    }

    private fun handleWalletReadyDeeplinks(deeplink: Deeplink, source: DeeplinkOpenSource) {
        if (deeplink.accountAddress != null) {
            val accountId = AccountStore.accountIdByAddress(deeplink.accountAddress)
            if (accountId == null) {
                nextDeeplink = null
                return
            } else {
                val prevAccountId = AccountStore.activeAccountId
                if (accountId != prevAccountId) {
                    val accountExistsInStorage = WGlobalStorage.accountIds().contains(accountId)
                    if (!accountExistsInStorage) {
                        // Account is already removed, ignore the deeplink!
                        nextDeeplink = null
                        return
                    }
                    // Switch to the deeplink account first
                    _isWalletReady = false
                    WalletCore.activateAccount(
                        accountId,
                        notifySDK = true
                    ) { res, err ->
                        if (res == null || err != null) {
                            // Switch account failed, Switch back!
                            prevAccountId?.let {
                                nextDeeplink = null
                                WalletCore.activateAccount(
                                    prevAccountId,
                                    notifySDK = true
                                ) { res, err ->
                                    if (res == null || err != null) {
                                        // Should not happen!
                                        Logger.e(
                                            Logger.LogTag.ACCOUNT,
                                            LogMessage.Builder()
                                                .append(
                                                    "activateAccount: Failed to switch to deeplink account",
                                                    LogMessage.MessagePartPrivacy.PUBLIC
                                                ).build()
                                        )
                                        throw Exception("Switch-Back Account Failure")
                                    }
                                    WalletCore.notifyEvent(
                                        WalletEvent.AccountChangedInApp(
                                            persistedAccountsModified = false
                                        )
                                    )
                                }
                            }
                        } else {
                            WalletCore.notifyEvent(
                                WalletEvent.AccountChangedInApp(
                                    persistedAccountsModified = false
                                )
                            )
                        }
                    }
                    return
                }
            }
        }
        val account = AccountStore.activeAccount
        if (account == null) {
            // Ignore deeplinks when the wallet is not ready yet
            nextDeeplink = null
            return
        }

        when (deeplink) {
            is Deeplink.Invoice -> {
                if (AccountStore.activeAccount?.accountType == MAccount.AccountType.VIEW) {
                    window?.topViewController?.showAlert(
                        LocaleController.getString("Error"),
                        LocaleController.getString("Action is not possible on a view-only wallet.")
                    )
                    nextDeeplink = null
                    return
                }

                val error = LocaleController.getStringOrNull(
                    when {
                        deeplink.hasUnsupportedParams ->
                            "\$unsupported_deeplink_parameter"

                        deeplink.expiry != null && (System.currentTimeMillis() / 1000 > deeplink.expiry!!) ->
                            "\$transfer_link_expired"

                        deeplink.comment != null && deeplink.binary != null ->
                            "\$transfer_text_and_bin_exclusive"

                        else -> null
                    }
                )

                error?.let {
                    showAlertOverTopVC(
                        LocaleController.getString("Error"),
                        error
                    )
                    nextDeeplink = null
                    return
                }

                val token =
                    deeplink.jetton?.let {
                        TokenStore.getToken(deeplink.jetton, true)
                    } ?: deeplink.token?.let {
                        TokenStore.getToken(deeplink.token, false)
                    } ?: TokenStore.getToken(TONCOIN_SLUG)

                val amountString = CoinUtils.toDecimalString(deeplink.amount, token?.decimals)

                val navVC = WNavigationController(
                    window!!,
                    PresentationConfig.PreferredFullScreen
                )
                navVC.setRoot(
                    SendVC(
                        context, token?.slug, InitialValues(
                            address = deeplink.address,
                            amount = amountString,
                            binary = deeplink.binary,
                            comment = deeplink.comment,
                            init = deeplink.init
                        ),
                        shouldRequireFreshAuth = source.requiresFreshAuth
                    )
                )
                window?.present(navVC)
            }

            is Deeplink.Send -> {
                if (AccountStore.activeAccount?.accountType == MAccount.AccountType.VIEW) {
                    showAlertOverTopVC(
                        LocaleController.getString("Error"),
                        LocaleController.getString("Action is not possible on a view-only wallet.")
                    )
                    nextDeeplink = null
                    return
                }

                val error = LocaleController.getStringOrNull(
                    when {
                        deeplink.hasUnsupportedParams ->
                            "\$unsupported_deeplink_parameter"

                        deeplink.expiry != null && (System.currentTimeMillis() / 1000 > deeplink.expiry!!) ->
                            "\$transfer_link_expired"

                        deeplink.comment != null && deeplink.binary != null ->
                            "\$transfer_text_and_bin_exclusive"

                        else -> null
                    }
                )

                error?.let {
                    showAlertOverTopVC(
                        LocaleController.getString("Error"),
                        error
                    )
                    nextDeeplink = null
                    return
                }

                val blockchain = MBlockchain.valueOfOrNull(deeplink.chain)
                val nativeSlug = blockchain?.nativeSlug

                val tokenSlug = deeplink.tokenSlug
                    ?.let { TokenStore.getToken(it, false)?.slug }
                    ?: nativeSlug

                val token = TokenStore.getToken(tokenSlug)
                val amountString = CoinUtils.toDecimalString(deeplink.amount, token?.decimals)

                val navVC = WNavigationController(window!!, PresentationConfig.PreferredFullScreen)
                navVC.setRoot(
                    SendVC(
                        context, tokenSlug, InitialValues(
                            address = deeplink.address,
                            amount = amountString,
                            binary = deeplink.binary,
                            comment = deeplink.comment,
                            init = deeplink.init
                        ),
                        shouldRequireFreshAuth = source.requiresFreshAuth
                    )
                )
                window?.present(navVC)
            }

            is Deeplink.TonConnect2 -> {
                // Already handled
            }

            is Deeplink.WalletConnect -> {
                // Already handled in handleInstantDeeplinks
            }

            is Deeplink.WalletConnectPay -> {
                // Already handled in handleInstantDeeplinks
            }

            is Deeplink.Swap -> {
                if (!account.supportsSwap) {
                    showAlertOverTopVC(
                        null,
                        if (!account.isMainnet)
                            LocaleController.getString("Swap is not supported in Testnet.")
                        else if (AccountStore.activeAccount?.isHardware == true)
                            LocaleController.getString("Swap is not yet supported by Ledger.")
                        else
                            LocaleController.getString("Swap is not supported on this account.")
                    )
                    nextDeeplink = null
                    return
                }
                val fromToken = TokenStore.getToken(deeplink.from)
                val toToken = TokenStore.getToken(deeplink.to)
                val swapVC = SwapVC(
                    context,
                    if (fromToken != null) MApiSwapAsset.from(fromToken) else null,
                    if (toToken != null) MApiSwapAsset.from(toToken) else null,
                    deeplink.amountIn
                )
                val navVC = WNavigationController(window!!, PresentationConfig.PreferredFullScreen)
                navVC.setRoot(swapVC)
                window?.present(navVC)
            }

            is Deeplink.Receive -> {
                if (!account.supportsReceiveScreen) {
                    window?.topViewController?.showAlert(
                        LocaleController.getString("Error"),
                        LocaleController.getString("Action is not possible on a view-only wallet.")
                    )
                    nextDeeplink = null
                    return
                }
                val receiveVC =
                    ReceiveVC.createIfAvailable(
                        context,
                        defaultChain = null,
                    ) ?: return
                val navVC = WNavigationController(window!!, PresentationConfig.PreferredFullScreen)
                navVC.setRoot(receiveVC)
                window?.present(navVC)
            }


            is Deeplink.Portfolio -> {
                val tabsVC = tabsVC
                val homeNav = tabsVC?.navigationController
                if (tabsVC?.isOnHomeScreen == true && homeNav != null) {
                    homeNav.push(PortfolioVC(context))
                } else {
                    val nav =
                        WNavigationController(window!!, PresentationConfig.PreferredFullScreen)
                    nav.setRoot(PortfolioVC(context))
                    window?.present(nav)
                }
            }

            is Deeplink.Explore -> {
                tabsVC?.switchToExplore(deeplink.targetUri)
            }

            is Deeplink.Url -> {
                val inAppBrowserVC = InAppBrowserVC(
                    context,
                    null,
                    deeplink.config
                )
                val nav = WNavigationController(window!!)
                nav.setRoot(inAppBrowserVC)
                window?.present(nav)
            }

            is Deeplink.TokenBySlug -> {
                presentToken(deeplink.slug)
            }

            is Deeplink.TokenByAddress -> {
                WalletCore.call(
                    ApiMethod.Tokens.BuildTokenSlug(deeplink.chain, deeplink.address)
                ) { tokenSlug, _ ->
                    tokenSlug?.let {
                        presentToken(tokenSlug)
                    }
                }
            }


            is Deeplink.Transaction -> {
                val chain = deeplink.chain
                    ?: AccountStore.activeAccount?.addressByChain?.entries?.firstOrNull { it.value == deeplink.accountAddress }?.key
                if (chain == null) {
                    nextDeeplink = null
                    return
                }
                val address =
                    deeplink.accountAddress ?: AccountStore.activeAccount?.addressByChain[chain]
                val accountId = AccountStore.activeAccountId
                if (address == null || accountId == null) {
                    nextDeeplink = null
                    return
                }
                WalletCore.call(
                    ApiMethod.WalletData.FetchTransactionById(
                        ApiMethod.WalletData.FetchTransactionById.Options(
                            chain = chain,
                            network = MBlockchainNetwork.ofAccountId(accountId).value,
                            walletAddress = address,
                            txId = deeplink.txId,
                            txHash = deeplink.txHash
                        )
                    )
                ) { activities, err ->
                    if (activities.isNullOrEmpty()) {
                        showAlertOverTopVC(
                            null,
                            err?.parsed?.toLocalized
                                ?: LocaleController.getString("Transfer not found")
                        )
                        return@call
                    }
                    if (AccountStore.activeAccountId != accountId)
                        return@call // Account changed
                    val isSingleTransaction = activities.size == 1
                    val transactionNav = WNavigationController(
                        window!!, if (isSingleTransaction) PresentationConfig(
                            style = WNavigationController.PresentationStyle.BottomSheet
                        ) else PresentationConfig()
                    )
                    if (isSingleTransaction)
                        transactionNav.setRoot(
                            TransactionVC(
                                context,
                                accountId,
                                activities.first()
                            )
                        )
                    else
                        transactionNav.setRoot(
                            TransactionListVC(
                                context,
                                accountId = accountId,
                                activities
                            )
                        )
                    window!!.present(transactionNav)
                }
            }

            is Deeplink.View -> {
                openASingleWallet(deeplink.network, deeplink.addressByChain, name = null)
            }

            is Deeplink.Nft -> {
                handleNftDeeplink(deeplink)
            }

            is Deeplink.ExpiringDns -> {
                if (AccountStore.activeAccount?.accountType == MAccount.AccountType.VIEW) {
                    nextDeeplink = null
                    return
                }
                val nft =
                    NftStore.nftData?.cachedNfts?.find { it.address == deeplink.domainAddress }
                if (nft != null) {
                    presentDomainRenewal(nft)
                } else {
                    // NFTs not loaded yet, keep nextDeeplink and wait for NftsUpdated event
                    return
                }
            }

            is Deeplink.Settings -> {
                val subVC = when (deeplink.page) {
                    "appearance" -> AppearanceVC(context)
                    "notifications" -> NotificationSettingsVC(context)
                    "assets" -> AssetsAndActivitiesVC(context)
                    "dapps" -> ConnectedAppsVC(context)
                    "language" -> LanguageVC(context)
                    "about" -> AppInfoVC(context)
                    "disclaimer" -> UserResponsibilityVC(context)
                    "wallet-version" -> WalletVersionsVC(context)
                    else -> null
                }
                tabsVC?.switchToSettings(subVC)
            }

            is Deeplink.SwitchToLegacy -> {
                // Already handled!
            }
        }

        nextDeeplink = null
    }

    private fun handleNftDeeplink(deeplink: Deeplink.Nft) {
        WalletCore.call(
            ApiMethod.Nft.FetchNftByAddress(
                network = deeplink.network,
                nftAddress = deeplink.nftAddress
            )
        ) { nft, err ->
            val resolvedNft = nft ?: run {
                showAlertOverTopVC(
                    LocaleController.getString("Error"),
                    err?.parsed?.toLocalized ?: LocaleController.getString("\$nft_not_found")
                )
                return@call
            }
            val ownerAddress = resolvedNft.ownerAddress
            if (ownerAddress.isNullOrBlank()) {
                showAlertOverTopVC(
                    LocaleController.getString("Error"),
                    LocaleController.getString("\$could_not_determine_address")
                )
                return@call
            }
            val nftVC = NftVC(
                context,
                showingAccountId = AccountStore.activeAccountId ?: return@call,
                nft = nft,
                collectionNFTs = listOf(nft),
                shouldShowOwner = true,
            )
            val window = window ?: return@call
            val nav = window.navigationControllers.lastOrNull()
            val tabNav = nav?.tabBarController?.mainNavigationController
            if (tabNav != null) {
                tabNav.push(nftVC)
            } else {
                nav?.push(nftVC)
            }
        }
    }

    private fun encodeUriParams(uri: Uri): Uri {
        val builder = Uri.Builder()
            .scheme(uri.scheme)
            .authority(uri.authority)

        for (param in uri.queryParameterNames) {
            val value = uri.getQueryParameter(param)
            if (value != null) {
                try {
                    val encodedValue = URLEncoder.encode(value, "UTF-8")
                    builder.appendQueryParameter(param, encodedValue)
                } catch (e: UnsupportedEncodingException) {
                    e.printStackTrace()
                }
            }
        }

        return builder.build()
    }

    private fun handleReturnStrategy(strategy: ReturnStrategy?) {
        when (strategy) {
            is ReturnStrategy.Url -> strategy.uri?.let { openExternalUri(it) }
            ReturnStrategy.None, ReturnStrategy.Back, ReturnStrategy.Empty, null -> {
                // Do nothing
            }
        }
    }

    private fun openExternalUri(uri: Uri) {
        window?.startActivityCatching(Intent(Intent.ACTION_VIEW, uri))
    }

    private fun importTemporaryAccount(
        network: MBlockchainNetwork,
        addressByChain: Map<MBlockchain, String>,
        name: String?,
    ) {
        WalletCore.call(
            ApiMethod.Auth.ImportViewAccount(network, addressByChain),
            callback = { result, error ->
                if (result == null || error != null) {
                    error?.parsed?.toLocalized?.let {
                        showAlertOverTopVC(
                            LocaleController.getString("Error"),
                            it
                        )
                    }
                    openingSingleWalletWithAddress = null
                    return@call
                }
                WGlobalStorage.setTemporaryAccountId(result.accountId, false)
                val resolvedName = name?.trim()?.takeIf { it.isNotEmpty() }
                    ?: result.title?.trim()?.takeIf { it.isNotEmpty() }
                WGlobalStorage.addAccount(
                    accountId = result.accountId,
                    accountType = MAccount.AccountType.VIEW.value,
                    byChain = result.byChain.jsonObject,
                    name = resolvedName,
                    importedAt = null,
                    isTemporary = true
                )
                WalletCore.activateAccount(
                    accountId = result.accountId,
                    notifySDK = false,
                    isPushedTemporary = true
                ) { _, err ->
                    if (err != null) {
                        openingSingleWalletWithAddress = null
                        return@activateAccount
                    }
                    window?.dismissToRoot {
                        WalletCore.notifyEvent(
                            WalletEvent.AccountChangedInApp(
                                persistedAccountsModified = false
                            )
                        )
                        openSingleWalletHome(result.accountId)
                        openingSingleWalletWithAddress = null
                    }
                }
            })
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun animateThemeChange(onThemeChanged: () -> Unit) {
        window?.let { window ->
            val rootView = window.windowView

            val bitmap = createBitmap(rootView.width, rootView.height)
            val canvas = Canvas(bitmap)
            rootView.draw(canvas)

            val snapshotView = ImageView(context).apply {
                id = View.generateViewId()
                setImageBitmap(bitmap)
                scaleType = ImageView.ScaleType.FIT_XY
                setOnTouchListener { _, _ -> true }
            }

            rootView.addView(
                snapshotView, ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            )

            onThemeChanged()

            snapshotView.fadeOut(duration = AnimationConstants.VERY_VERY_QUICK_ANIMATION) {
                rootView.removeView(snapshotView)
                bitmap.recycle()
            }
        } ?: onThemeChanged()
    }

    private fun presentTonConnectLoading() {
        window?.let { window ->
            // Don't stack a second request modal if one is already shown (e.g. a connect deeplink tapped twice);
            // the incoming `dappConnect` update replaces the shown connect modal in place instead.
            if (window.navigationControllers.any { nav ->
                    nav.viewControllers.any { it is TonConnectRequestSendVC || it is TonConnectRequestConnectVC }
                }) {
                return
            }
            val tonConnectRequestVC = TonConnectRequestConnectVC(window)
            val isLoadingVCAdded =
                TonConnectController.setLoadingConnectRequestViewController(
                    tonConnectRequestVC
                )
            if (isLoadingVCAdded) {
                val navVC = WNavigationController(
                    window, WNavigationController.PresentationConfig(
                        style = WNavigationController.PresentationStyle.BottomSheet
                    )
                )
                navVC.setRoot(tonConnectRequestVC)
                if (isAppUnlocked())
                    window.present(navVC)
                else
                    window.presentOnWalletReady(navVC)
            }
        }
    }

    private fun presentTonSendLoading(
        connectionType: ApiConnectionType,
        isWaitingForRequest: Boolean = false,
        returnUrl: String? = null,
    ) {
        window?.let { window ->
            // Ignore the placeholder open if a request modal is already shown (SSE event arrived before the deeplink)
            if (isWaitingForRequest && window.navigationControllers.any { nav ->
                    nav.viewControllers.any { it is TonConnectRequestSendVC || it is TonConnectRequestConnectVC }
                }) {
                return
            }
            if (!window.isAnimating &&
                window.pendingPresentationNav?.viewControllers?.firstOrNull() !is TonConnectRequestSendVC
            ) {
                val tonConnectRequestSendVC =
                    TonConnectRequestSendVC(
                        window,
                        connectionType,
                        isWaitingForRequest = isWaitingForRequest,
                        returnUrl = returnUrl
                    )
                val isLoadingVCAdded =
                    TonConnectController.setLoadingSendRequestViewController(
                        tonConnectRequestSendVC
                    )
                if (isLoadingVCAdded) {
                    val navVC =
                        WNavigationController(window, PresentationConfig.PreferredFullScreen)
                    navVC.setRoot(tonConnectRequestSendVC)
                    if (isAppUnlocked())
                        window.present(navVC)
                    else
                        window.presentOnWalletReady(navVC)
                }
            }
        }
    }

    private fun presentToken(tokenSlug: String) {
        val token = TokenStore.getToken(tokenSlug) ?: run {
            showAlertOverTopVC(
                null,
                LocaleController.getString("\$unknown_token_address")
            )
            return
        }
        val account = AccountStore.activeAccount ?: return
        val tokenVC = TokenVC(
            context,
            account,
            token
        )
        (window?.topViewController as? ITabsVC)?.let { tabsVC ->
            (tabsVC.activeNavigationController?.viewControllers?.firstOrNull() as? HomeVC)?.let { homeVC ->
                homeVC.push(tokenVC)
                return
            }
        }
        val nav = WNavigationController(window!!, PresentationConfig.PreferredFullScreen)
        nav.setRoot(tokenVC)
        window?.present(nav)
    }

    private fun presentDomainRenewal(nft: ApiNft) {
        val nav = WNavigationController(
            window!!, PresentationConfig(
                style = WNavigationController.PresentationStyle.BottomSheet
            )
        )
        nav.setRoot(RenewVC(context, nft))
        window?.presentOnWalletReady(nav)
    }

    override fun onWalletEvent(walletEvent: WalletEvent) {
        when (walletEvent) {
            is WalletEvent.NftsUpdated -> {
                (nextDeeplink?.deeplink as? Deeplink.ExpiringDns)?.let { deeplink ->
                    val nft =
                        NftStore.nftData?.cachedNfts?.find { it.address == deeplink.domainAddress }
                    if (nft != null) {
                        nextDeeplink = null
                        presentDomainRenewal(nft)
                    }
                }
            }

            WalletEvent.AppForeground -> handleDeeplinkIfRequired()

            is WalletEvent.AccountRemoved -> {
                if (WGlobalStorage.accountIds().isEmpty()) {
                    _isWalletReady = false
                }
            }

            else -> {}
        }
    }

    override fun onBridgeUpdate(update: ApiUpdate) {
        when (update) {
            is ApiUpdate.ApiUpdateDappLoading -> {
                when (update.connectionType) {
                    ApiConnectionType.CONNECT -> {
                        presentTonConnectLoading()
                    }

                    ApiConnectionType.SEND_TRANSACTION, ApiConnectionType.SIGN_DATA -> {
                        presentTonSendLoading(
                            update.connectionType,
                            update.isWaitingForRequest == true,
                            update.returnUrl,
                        )
                    }
                }
            }

            else -> {}
        }
    }
}
