package app.twallet.air.uisettings.viewControllers.walletCustomization

import android.animation.ValueAnimator
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.content.Context
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.LinearLayout
import androidx.core.graphics.toColorInt
import androidx.core.view.updateLayoutParams
import app.twallet.air.uicomponents.AnimationConstants
import app.twallet.air.uicomponents.base.WNavigationBar
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.showAlert
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.DirectionalTouchHandler
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.addRippleEffect
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uicomponents.widgets.updateThemeForChildren
import app.twallet.air.uisettings.viewControllers.appearance.views.palette.AppearancePaletteItemView
import app.twallet.air.uisettings.viewControllers.appearance.views.palette.AppearancePaletteView
import app.twallet.air.uisettings.viewControllers.mintCard.MintCardVC
import app.twallet.air.uisettings.viewControllers.walletCustomization.views.availableCards.WalletCustomizationAvailableCardsView
import app.twallet.air.uisettings.viewControllers.walletCustomization.views.cards.WalletCustomizationCardsView
import app.twallet.air.walletbasecontext.R as BaseR
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.DEFAULT_TINT_DARK
import app.twallet.air.walletbasecontext.theme.DEFAULT_TINT_LIGHT
import app.twallet.air.walletbasecontext.theme.NftAccentColors
import app.twallet.air.walletbasecontext.theme.ThemeManager.isDark
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.WalletContextManager
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.utils.AnimUtils.Companion.lerp
import app.twallet.air.walletcore.MTW_CARDS_COLLECTION
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.ApiNft
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.ConfigStore
import app.twallet.air.walletcore.stores.NftStore
import java.lang.ref.WeakReference
import kotlin.math.abs
import kotlin.math.roundToInt

class WalletCustomizationVC(context: Context, defaultSelectedAccountId: String) :
    WViewController(context), WalletCore.EventObserver {
    override val TAG = "WalletCustomization"

    override val shouldDisplayBottomBar = true
    override var title: String? = LocaleController.getString("Customize Wallet")

    override val isSwipeBackAllowed = false
    override val isEdgeSwipeBackAllowed = true

    private val accounts = WalletCore.getAllAccounts()
    private var tintColor: Int = 0
    private var tintId: Int? = null
        set(value) {
            field = value
            updateTintColor()
            updateTheme()
            updateThemeForChildren(view, true)
        }

    private fun updateTintColor() {
        tintColor = tintId?.let {
            (if (isDark) NftAccentColors.dark else NftAccentColors.light)[it].toColorInt()
        } ?: run {
            if (isDark) DEFAULT_TINT_DARK else DEFAULT_TINT_LIGHT
        }
        availableCardsView.tintColor = tintColor
        availableCardsView.reloadSelectedItem()
        appPaletteView.overrideTintColor = tintColor
    }

    private var selectedAccount =
        accounts.firstOrNull { it.accountId == defaultSelectedAccountId } ?: accounts.first()
        set(value) {
            field = value
            tintId = WGlobalStorage.getNftAccentColorIndex(value.accountId)
        }
    private var leftIndex = accounts.indexOfFirst {
        it.accountId == defaultSelectedAccountId
    }
    private var rightIndex = leftIndex
    private var offsetPercent = 0f

    private var loadedCards = mutableMapOf<String, List<ApiNft>>()
    private var loadingCards = mutableSetOf<String>()
    private var tabHeights = mutableMapOf<Int, Int>()
    private var hintVisibilities = mutableMapOf<Int, Float>()

    private val availableCardsHeight: Int
        get() {
            return lerp(
                (tabHeights[leftIndex]
                    ?: WalletCustomizationAvailableCardsView.DEFAULT_HEIGHT.dp).toFloat(),
                (tabHeights[rightIndex]
                    ?: WalletCustomizationAvailableCardsView.DEFAULT_HEIGHT.dp).toFloat(),
                offsetPercent
            ).roundToInt()
        }

    private val hintVisibility: Float
        get() {
            return lerp(
                (hintVisibilities[leftIndex] ?: 0).toFloat(),
                (hintVisibilities[rightIndex] ?: 0).toFloat(),
                offsetPercent
            )
        }

    private val isPresentedOverWalletTabs: Boolean
        get() {
            return navigationController?.viewControllers?.size == 1
        }

    private val cardsView: WalletCustomizationCardsView by lazy {
        object : WalletCustomizationCardsView(context, accounts, selectedAccount.accountId) {
            override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
                return touchHandler.dispatchTouch(cardsView, ev) ?: super.dispatchTouchEvent(ev)
            }
        }.apply {
            onItemChangeListener =
                object : WalletCustomizationCardsView.OnItemChangeListener {
                    override fun onItemOffsetChanged(
                        fromIndex: Int,
                        toIndex: Int,
                        offsetPercent: Float
                    ) {
                        leftIndex = fromIndex
                        this@WalletCustomizationVC.rightIndex = toIndex
                        this@WalletCustomizationVC.offsetPercent = offsetPercent
                        availableCardsView.updateLayoutParams {
                            height = availableCardsHeight
                        }
                        availableCardsView.setContentAlpha(2 * abs(offsetPercent - 0.5f))
                        updateHintVisibility()
                        if (offsetPercent == 0f) {
                            val centerAccount = accounts.getOrNull(fromIndex)
                            selectedAccount = centerAccount ?: selectedAccount
                            loadCards(accounts.getOrNull(fromIndex - 1)?.accountId)
                            loadCards(centerAccount?.accountId)
                            loadCards(accounts.getOrNull(fromIndex + 1)?.accountId)
                        } else if (offsetPercent < 0.5f) {
                            val centerAccount = accounts.getOrNull(fromIndex)
                            if (selectedAccount.accountId != centerAccount?.accountId) {
                                selectedAccount = centerAccount ?: selectedAccount
                                loadCards(centerAccount?.accountId)
                            }
                        } else if (offsetPercent > 0.5f) {
                            val centerAccount = accounts.getOrNull(toIndex)
                            if (selectedAccount.accountId != centerAccount?.accountId) {
                                selectedAccount = centerAccount ?: selectedAccount
                                loadCards(centerAccount?.accountId)
                            }
                        }
                    }
                }
        }
    }

    private val availableCardsView: WalletCustomizationAvailableCardsView by lazy {
        WalletCustomizationAvailableCardsView(
            context
        ).apply {
            onCardChanged = { accountId, nft ->
                cardsView.reload(accountId)
                if (AccountStore.activeAccountId == accountId || isPresentedOverWalletTabs)
                    WalletCore.notifyEvent(WalletEvent.NftCardUpdated)
            }
        }
    }

    private val hintLabel by lazy {
        WLabel(context).apply {
            text =
                LocaleController.getString("This card will be installed for this wallet and will be displayed on the home screen and in the wallets list.")
            setTextColor(WColor.SecondaryText)
            setStyle(14f)
            setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        }
    }

    private val appPaletteView: AppearancePaletteView by lazy {
        AppearancePaletteView(context, showUnlockButton = false).apply {
            onPaletteSelected = { accountId, nftAccentId, state, nft ->
                when (state) {
                    AppearancePaletteItemView.State.LOCKED -> {
                        showAlert(
                            LocaleController.getString("Unlock New Palettes"),
                            LocaleController.getString("Get a unique My Wallet Card to unlock new palettes.")
                        )
                    }

                    AppearancePaletteItemView.State.AVAILABLE -> {
                        nftAccentId?.let {
                            WGlobalStorage.setNftAccentColor(
                                accountId,
                                nftAccentId,
                                nft?.toDictionary()
                            )
                            tintId = nftAccentId
                        } ?: run {
                            WGlobalStorage.setNftAccentColor(
                                accountId,
                                null,
                                null
                            )
                            tintId = null
                        }
                        WalletContextManager.delegate?.get()?.themeChanged()
                        appPaletteView.reloadViews()
                    }

                    else -> {}
                }
            }
        }
    }

    private val getMoreCardsButton by lazy {
        WLabel(context).apply {
            setStyle(adaptiveFontSize())
            gravity = Gravity.START or Gravity.CENTER_VERTICAL
            setPadding(20.dp, 0, 20.dp, 0)
            setOnClickListener {
                val account = AccountStore.activeAccount
                val accountId = account?.accountId
                val eligible = account?.isMainnet == true &&
                    !account.isViewOnly &&
                    ConfigStore.isLimited != true
                val canMint = eligible && accountId != null &&
                    (WGlobalStorage.getCardsInfo(accountId) != null ||
                        NftStore.isCardMinting(accountId))
                if (canMint) {
                    navigationController?.let { MintCardVC.present(it) }
                    return@setOnClickListener
                }
                val url = context.getString(BaseR.string.app_cards_url)
                if (url.isNotEmpty()) WalletCore.notifyEvent(WalletEvent.OpenUrl(url))
            }
        }
    }

    private val contentView by lazy {
        LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            addView(
                cardsView,
                LinearLayout.LayoutParams(
                    MATCH_PARENT,
                    WalletCustomizationCardsView.heightForWidth(window!!.windowView.width)
                ).apply {
                    topMargin = 17.dp
                })
            addView(
                availableCardsView,
                LinearLayout.LayoutParams(MATCH_PARENT, availableCardsHeight).apply {
                    topMargin = (-3).dp
                    leftMargin = ViewConstants.HORIZONTAL_PADDINGS.dp
                    rightMargin = ViewConstants.HORIZONTAL_PADDINGS.dp
                })
            addView(
                hintLabel, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                    topMargin = 4.dp
                    leftMargin = ViewConstants.HORIZONTAL_PADDINGS.dp + 16.dp
                    rightMargin = ViewConstants.HORIZONTAL_PADDINGS.dp + 16.dp
                })
            addView(
                appPaletteView,
                LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                    topMargin = ViewConstants.GAP.dp
                    leftMargin = ViewConstants.HORIZONTAL_PADDINGS.dp
                    rightMargin = ViewConstants.HORIZONTAL_PADDINGS.dp
                })
            addView(
                WLabel(context).apply {
                    text =
                        LocaleController.getString("Get a unique My Wallet Card to unlock new palettes.")
                    setTextColor(WColor.SecondaryText)
                    setStyle(14f)
                    setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
                }, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                    topMargin = 4.dp
                    leftMargin = ViewConstants.HORIZONTAL_PADDINGS.dp + 16.dp
                    rightMargin = ViewConstants.HORIZONTAL_PADDINGS.dp + 16.dp
                })
            addView(getMoreCardsButton, LinearLayout.LayoutParams(MATCH_PARENT, 50.dp).apply {
                topMargin = ViewConstants.GAP.dp
                leftMargin = ViewConstants.HORIZONTAL_PADDINGS.dp
                rightMargin = ViewConstants.HORIZONTAL_PADDINGS.dp
            })
            addView(
                WLabel(context).apply {
                    text =
                        LocaleController.getString("Browse My Wallet Cards available for purchase.")
                    setTextColor(WColor.SecondaryText)
                    setStyle(14f)
                    setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
                }, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                    topMargin = 4.dp
                    leftMargin = ViewConstants.HORIZONTAL_PADDINGS.dp + 16.dp
                    rightMargin = ViewConstants.HORIZONTAL_PADDINGS.dp + 16.dp
                })
        }
    }

    private val scrollView: WScrollView by lazy {
        object : WScrollView(WeakReference(this@WalletCustomizationVC)) {
            override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
                return touchHandler.dispatchTouch(scrollView, ev) ?: super.dispatchTouchEvent(ev)
            }
        }.apply {
            addView(
                contentView,
                ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT)
            )
            clipToPadding = false
            onScrollStateChange = {
                updateBlurViews(scrollView)
            }
            setOnScrollChangeListener { _, _, scrollY, _, _ ->
                if (scrollY > 0) {
                    topReversedCornerView?.resumeBlurring()
                } else {
                    topReversedCornerView?.pauseBlurring(false)
                }
                if (scrollY > ViewConstants.BLOCK_RADIUS.dp) {
                    setTopBlur(true, animated = true)
                    topReversedCornerView?.setHorizontalPadding(0f)
                } else {
                    setTopBlur(false, animated = true)
                }
            }
        }
    }

    private val touchHandler by lazy {
        DirectionalTouchHandler(
            verticalView = scrollView,
            horizontalView = cardsView,
            interceptedViews = listOf(),
            interceptedByVerticalScrollViews = listOf(cardsView),
            isDirectionalScrollAllowed = { _, _ ->
                true
            }
        )
    }

    override fun setupViews() {
        super.setupViews()

        WalletCore.registerObserver(this)

        setupNavBar(true)
        setTopBlur(false, animated = false)

        view.addView(scrollView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        loadCards(selectedAccount.accountId)

        if ((navigationController?.viewControllers?.size ?: 0) < 2) {
            navigationBar?.addCloseButton()
        }

        updateTheme()
    }

    override fun updateTheme() {
        updateTintColor()
        super.updateTheme()

        view.setBackgroundColor(WColor.SecondaryBackground.color)
        getMoreCardsButton.setBackgroundColor(WColor.Background.color, 28f.dp)
        getMoreCardsButton.addRippleEffect(WColor.BackgroundRipple.color, 28f.dp)
        getMoreCardsButton.setTextColor(tintColor)
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        scrollView.setPaddingLocalized(
            additionalTabletPadding + systemBarStartInset,
            (navigationController?.getSystemBars()?.top ?: 0) +
                WNavigationBar.DEFAULT_HEIGHT.dp,
            systemBarEndInset,
            20.dp + (navigationController?.getSystemBars()?.bottom ?: 0)
        )
    }

    private fun updateGetMoreCardsButton(isFirstCard: Boolean) {
        getMoreCardsButton.text =
            LocaleController.getString(if (isFirstCard) "Get First Card" else "Get More Cards")
    }

    private fun loadCards(accountId: String?) {
        val accountId = accountId ?: return
        loadedCards[accountId]?.let { loadedCards ->
            if (selectedAccount.accountId == accountId) {
                val finalHeight = if (loadedCards.isNotEmpty())
                    WalletCustomizationAvailableCardsView.calculateHeight(
                        view.width,
                        loadedCards.size + 1
                    )
                else WalletCustomizationAvailableCardsView.DEFAULT_HEIGHT.dp
                val accountIndex =
                    accounts.indexOfFirst { it.accountId == selectedAccount.accountId }
                tabHeights[accountIndex] = finalHeight
                availableCardsView.configure(
                    selectedAccount.accountId,
                    if (loadedCards.isNotEmpty()) listOf(null) + loadedCards else listOf()
                )
                appPaletteView.updatePaletteView(accountId, loadedCards)
                updateGetMoreCardsButton(loadedCards.isEmpty())
            }
            return
        }
        if (selectedAccount.accountId == accountId) {
            availableCardsView.configure(selectedAccount.accountId, null)
            appPaletteView.updatePaletteView(accountId, null)
            updateGetMoreCardsButton(true)
        }
        if (!loadingCards.contains(accountId)) {
            loadingCards.add(accountId)
            WalletCore.call(
                ApiMethod.Nft.FetchNftsFromCollection(
                    accountId, ApiMethod.Nft.FetchNftsFromCollection.Collection(
                        chain = MBlockchain.ton.name, address = MTW_CARDS_COLLECTION
                    )
                )
            ) { _, _ -> }
        }
    }

    override fun onWalletEvent(walletEvent: WalletEvent) {
        when (walletEvent) {
            is WalletEvent.BalanceChanged,
            is WalletEvent.TokensChanged -> {
                availableCardsView.reload()
                cardsView.reload()
            }

            is WalletEvent.CollectionNftsReceived -> {
                if (walletEvent.collectionAddress != MTW_CARDS_COLLECTION)
                    return
                loadedCards[walletEvent.accountId] = walletEvent.nfts
                loadingCards.remove(walletEvent.accountId)
                if (walletEvent.accountId == selectedAccount.accountId) {
                    availableCardsView.configure(
                        selectedAccount.accountId,
                        if (walletEvent.nfts.isNotEmpty()) listOf(null) + walletEvent.nfts else listOf()
                    )
                    appPaletteView.updatePaletteView(walletEvent.accountId, walletEvent.nfts)
                    updateGetMoreCardsButton(walletEvent.nfts.isEmpty())
                }
                val finalHeight =
                    if (walletEvent.nfts.isNotEmpty())
                        WalletCustomizationAvailableCardsView.calculateHeight(
                            view.width,
                            walletEvent.nfts.size + 1
                        )
                    else WalletCustomizationAvailableCardsView.DEFAULT_HEIGHT.dp
                val targetHintVisibility = if (walletEvent.nfts.isEmpty()) 0f else 1f
                val accountIndex =
                    accounts.indexOfFirst { it.accountId == walletEvent.accountId }
                if (leftIndex == accountIndex || rightIndex == accountIndex) {
                    val currentHeight = tabHeights[accountIndex]
                        ?: WalletCustomizationAvailableCardsView.DEFAULT_HEIGHT.dp
                    val currentHintVisibility = hintVisibilities[accountIndex] ?: 0f
                    ValueAnimator.ofInt(currentHeight, finalHeight).apply {
                        duration = AnimationConstants.VERY_QUICK_ANIMATION
                        interpolator = AccelerateDecelerateInterpolator()

                        addUpdateListener { animation ->
                            if (isDestroyed) return@addUpdateListener
                            tabHeights[accountIndex] = animation.animatedValue as Int
                            availableCardsView.updateLayoutParams {
                                height = availableCardsHeight
                            }
                            hintVisibilities[accountIndex] = lerp(
                                currentHintVisibility,
                                targetHintVisibility,
                                animation.animatedFraction
                            )
                            updateHintVisibility()
                        }

                        start()
                    }
                } else {
                    tabHeights[accountIndex] = finalHeight
                    hintVisibilities[accountIndex] = targetHintVisibility
                }
            }

            else -> {}
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        WalletCore.unregisterObserver(this)
        cardsView.onDestroy()
        availableCardsView.onDestroy()
    }

    private fun updateHintVisibility() {
        hintLabel.alpha = hintVisibility
        appPaletteView.layoutParams =
            (appPaletteView.layoutParams as ViewGroup.MarginLayoutParams).apply {
                topMargin =
                    ViewConstants.GAP.dp - ((hintLabel.height + 4.dp) * (1 - hintVisibility)).roundToInt()
            }
    }
}
