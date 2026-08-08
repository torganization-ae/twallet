package app.twallet.air.uireceive

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.ViewTreeObserver
import android.widget.ImageView
import android.widget.LinearLayout
import androidx.appcompat.widget.AppCompatImageView
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
import androidx.constraintlayout.widget.ConstraintLayout.generateViewId
import androidx.core.view.updateLayoutParams
import app.twallet.air.icons.R
import app.twallet.air.uicomponents.base.WViewControllerWithModelStore
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WAlertLabel
import app.twallet.air.uicomponents.widgets.WBaseView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WScrollView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.menu.WMenuPopup
import app.twallet.air.uicomponents.widgets.menu.WMenuPopup.Item.Config.Icon
import app.twallet.air.uicomponents.widgets.segmentedController.WSegmentedController
import app.twallet.air.uicomponents.widgets.segmentedController.WSegmentedControllerItem
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletbasecontext.utils.toProcessedSpannableStringBuilder
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.stores.AccountStore
import java.lang.ref.WeakReference

@SuppressLint("ViewConstructor")
class ReceiveVC private constructor(
    context: Context,
    private val defaultChain: MBlockchain? = null,
) : WViewControllerWithModelStore(context) {
    override val TAG = "Receive"

    override val displayedAccount =
        DisplayedAccount(AccountStore.activeAccountId, AccountStore.isPushedTemporary)

    override val shouldDisplayTopBar = false

    override val shouldDisplayBottomBar: Boolean
        get() = navigationController?.tabBarController == null

    companion object {
        const val OPTION_ROW_HEIGHT = 50

        fun createIfAvailable(
            context: Context,
            defaultChain: MBlockchain?,
        ): ReceiveVC? {
            val addressByChain = AccountStore.activeAccount?.addressByChain ?: return null
            if (MBlockchain.supportedChains.none { addressByChain.containsKey(it.name) }) return null
            return ReceiveVC(context, defaultChain)
        }
    }

    val availableChains: List<MBlockchain> =
        AccountStore.activeAccount?.visibleSortedChains()?.mapNotNull { entry ->
            MBlockchain.supportedChains.find { it.name == entry.key }
        } ?: emptyList()

    private val isViewOnlyAccount = AccountStore.activeAccount?.isViewOnly == true

    private val resolvedDefaultChain: MBlockchain? =
        resolveReceiveChain(availableChains, defaultChain)

    private val defaultChainIndex =
        availableChains.indexOf(resolvedDefaultChain).coerceAtLeast(0)

    private val onQrLoaded = {
        if (isViewOnlyAccount) {
            viewOnlyWarningView.fadeIn()
        } else {
            optionsContainerView.fadeIn()
        }
    }

    val qrCodeVCs: Map<MBlockchain, QRCodeVC> =
        availableChains
            .mapIndexed { index, blockchain ->
                blockchain to
                    QRCodeVC(
                        context,
                        blockchain,
                        if (index == defaultChainIndex) onQrLoaded else null
                    )
            }.toMap()

    private val gradientColorViews: List<View> =
        availableChains.mapIndexed { i, _ ->
            View(context).apply {
                id = generateViewId()
                alpha = if (i == defaultChainIndex) 1f else 0f
            }
        }

    private val chainIconView: AppCompatImageView by lazy {
        AppCompatImageView(context).apply {
            scaleType = ImageView.ScaleType.FIT_CENTER
        }
    }

    private val chainNameLabel: WLabel by lazy {
        WLabel(context).apply {
            setStyle(15f, WFont.Medium)
            setTextColor(Color.WHITE)
            maxLines = 1
            includeFontPadding = false
            ellipsize = android.text.TextUtils.TruncateAt.END
        }
    }

    private val chainChevronView: AppCompatImageView by lazy {
        AppCompatImageView(context).apply {
            setImageDrawable(
                context.getDrawableCompat(R.drawable.ic_arrow_bottom_8)?.apply {
                    setTint(Color.WHITE)
                    alpha = 191
                }
            )
        }
    }

    private val chainSelectorView: LinearLayout by lazy {
        LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(8.dp, 0, 8.dp, 0)
            addView(
                chainIconView,
                LinearLayout.LayoutParams(22.dp, 22.dp).apply {
                    gravity = Gravity.CENTER_VERTICAL
                }
            )
            addView(
                chainNameLabel,
                LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT).apply {
                    marginStart = 6.dp
                    gravity = Gravity.CENTER_VERTICAL
                    // Keep title visible next to the logo; do not let it collapse to 0.
                    weight = 0f
                }
            )
            addView(
                chainChevronView,
                LinearLayout.LayoutParams(10.dp, 10.dp).apply {
                    marginStart = 4.dp
                    gravity = Gravity.CENTER_VERTICAL
                }
            )
            setOnClickListener { openChainMenu() }
        }
    }

    private val qrSegmentView: WSegmentedController by lazy {
        val defaultIndex = defaultChainIndex
        val segmentedController =
            WSegmentedController(
                navigationController!!,
                availableChains.map { chain ->
                    WSegmentedControllerItem(qrCodeVCs[chain]!!, null)
                } as ArrayList<WSegmentedControllerItem>,
                isTransparent = true,
                applySideGutters = false,
                defaultSelectedIndex = defaultIndex,
                onOffsetChange = { _, currentOffset ->
                    val chainCount = availableChains.size
                    for (i in gradientColorViews.indices) {
                        gradientColorViews[i].alpha =
                            when {
                                chainCount == 1 -> 1f
                                i == 0 -> (1f - currentOffset.coerceIn(0f, 1f))
                                i == chainCount - 1 -> (currentOffset - (i - 1)).coerceIn(0f, 1f)
                                else -> {
                                    val dist = (currentOffset - i).let { kotlin.math.abs(it) }
                                    (1f - dist).coerceIn(0f, 1f)
                                }
                            }
                    }

                    for ((i, chain) in availableChains.withIndex()) {
                        val vc = qrCodeVCs[chain] ?: continue
                        val progress = (currentOffset - i).let { kotlin.math.abs(it) }.coerceIn(0f, 1f)
                        val direction = if (currentOffset > i) -1 else 1
                        animateQrView(
                            vc.qrCodeView,
                            vc.ornamentView,
                            vc.descriptionLabel,
                            direction,
                            progress
                        )
                    }

                    if (chainCount > 1) {
                        val floorIdx = currentOffset.toInt().coerceIn(0, chainCount - 2)
                        val frac = currentOffset - floorIdx
                        val vcA = qrCodeVCs[availableChains[floorIdx]]!!
                        val vcB = qrCodeVCs[availableChains[floorIdx + 1]]!!
                        val height = ((1 - frac) * qrCodeHeight(vcA)) + (frac * qrCodeHeight(vcB))
                        lastAppliedQrHeight = height.toInt()
                        qrSegmentView.updateLayoutParams {
                            this.height = lastAppliedQrHeight
                        }
                    }

                    updateOptionsForOffset(currentOffset)
                },
                onSelectedIndexChanged = { index ->
                    updateChainSelector(index)
                },
                forceCenterTabs = false,
                pilledTabs = true
            )
        segmentedController.addCloseButton()
        segmentedController.setTabsVisible(false)
        segmentedController.disableSwipeNavigation()
        segmentedController.addLeadingView(chainSelectorView)
        updateChainSelector(defaultIndex)
        segmentedController
    }

    private val backgroundColorView =
        WView(context).apply {
            setBackgroundColor(WColor.Background.color, 0f, ViewConstants.BLOCK_RADIUS.dp)
        }

    private val optionsSeparatorView: WBaseView by lazy {
        WBaseView(context)
    }

    private val invoiceIconView: AppCompatImageView by lazy {
        AppCompatImageView(context).apply {
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }
    }

    private val invoiceLabel: WLabel by lazy {
        WLabel(context).apply {
            setStyle(15f, WFont.Medium)
            text = LocaleController.getString("Create Deposit Link")
        }
    }

    private val invoiceChevronView: AppCompatImageView by lazy {
        AppCompatImageView(context).apply {
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }
    }

    private val invoiceView: WView by lazy {
        WView(context).apply {
            addView(invoiceIconView, LayoutParams(30.dp, 30.dp))
            addView(invoiceLabel, LayoutParams(LayoutParams.MATCH_CONSTRAINT, WRAP_CONTENT))
            addView(invoiceChevronView, LayoutParams(16.dp, 16.dp))
            setConstraints {
                toStart(invoiceIconView, 12f)
                toCenterY(invoiceIconView)
                startToEnd(invoiceLabel, invoiceIconView, 8f)
                endToStart(invoiceLabel, invoiceChevronView, 8f)
                toCenterY(invoiceLabel)
                toEnd(invoiceChevronView, 12f)
                toCenterY(invoiceChevronView)
            }
            setOnClickListener {
                navigationController?.push(InvoiceVC(context))
            }
        }
    }

    private val viewOnlyWarningView: WAlertLabel by lazy {
        WAlertLabel(
            context,
            LocaleController
                .getString("\$view_only_wallet_receive_warning")
                .trim()
                .toProcessedSpannableStringBuilder(),
            WColor.Orange.color,
            coloredText = true
        ).apply {
            alpha = 0f
        }
    }

    private val optionsContainerView: WView by lazy {
        val v = WView(context)
        v.addView(invoiceView, LayoutParams(MATCH_PARENT, OPTION_ROW_HEIGHT.dp))
        v.setConstraints {
            toTop(invoiceView)
            toCenterX(invoiceView)
            toBottom(invoiceView)
        }
        v.clipToOutline = true
        v.clipChildren = false
        v.alpha = 0f
        v
    }

    private val scrollingContentView: WView by lazy {
        val v = WView(context)

        for (colorView in gradientColorViews) {
            v.addView(
                colorView,
                LayoutParams(LayoutParams.MATCH_CONSTRAINT, LayoutParams.WRAP_CONTENT)
            )
        }
        v.addView(
            backgroundColorView,
            LayoutParams(LayoutParams.MATCH_CONSTRAINT, LayoutParams.MATCH_CONSTRAINT)
        )
        v.addView(
            qrSegmentView,
            LayoutParams(MATCH_PARENT, qrHeight)
        )
        v.addView(optionsSeparatorView, LayoutParams(MATCH_PARENT, 16.dp))
        if (isViewOnlyAccount) {
            v.addView(viewOnlyWarningView, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        } else {
            v.addView(optionsContainerView, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        }
        v.setPadding(0, 0, 0, navigationController?.getSystemBars()?.bottom ?: 0)
        v
    }

    private val scrollView: WScrollView by lazy {
        val sv = WScrollView(WeakReference(this))
        sv.addView(scrollingContentView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        sv
    }

    override fun setupViews() {
        super.setupViews()

        val layerPaint =
            Paint().apply {
                isAntiAlias = true
            }
        qrCodeVCs.values.forEach { vc ->
            vc.qrCodeView.setLayerType(View.LAYER_TYPE_HARDWARE, layerPaint)
        }

        view.addView(scrollView, LayoutParams(0, 0))
        view.setConstraints {
            allEdges(scrollView)
        }
        scrollingContentView.setConstraints {
            toTop(qrSegmentView)
            toCenterX(qrSegmentView)
            for (colorView in gradientColorViews) {
                topToTop(colorView, qrSegmentView)
                startToStart(colorView, qrSegmentView)
                endToEnd(colorView, qrSegmentView)
            }
            topToBottom(backgroundColorView, gradientColorViews.first())
            bottomToBottom(backgroundColorView, qrSegmentView)
            toCenterX(backgroundColorView)
            topToBottom(optionsSeparatorView, qrSegmentView)
            if (isViewOnlyAccount) {
                topToBottom(viewOnlyWarningView, optionsSeparatorView)
                toBottom(viewOnlyWarningView)
                toCenterX(viewOnlyWarningView, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
            } else {
                topToBottom(optionsContainerView, optionsSeparatorView)
                toBottom(optionsContainerView)
                toCenterX(optionsContainerView, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
            }
        }

        updateTheme()
        updateOptionsForOffset(defaultChainIndex.toFloat())

        val firstVC = qrCodeVCs.values.first()
        gradientColorViews.forEach { colorView ->
            val layoutParams = colorView.layoutParams
            layoutParams.height = qrTransparentHeight(firstVC)
            colorView.layoutParams = layoutParams
        }
    }

    override val isTinted = true
    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
        optionsSeparatorView.setBackgroundColor(WColor.SecondaryBackground.color)
        if (isViewOnlyAccount) {
            viewOnlyWarningView.updateTheme()
        } else {
            optionsContainerView.setBackgroundColor(
                WColor.Background.color,
                ViewConstants.BLOCK_RADIUS.dp
            )
            invoiceView.setBackgroundColor(WColor.Background.color)
            invoiceView.addRippleEffect(WColor.SecondaryBackground.color)
            invoiceLabel.setTextColor(WColor.PrimaryText.color)
            invoiceIconView.setImageDrawable(
                context.getDrawableCompat(R.drawable.ic_link)?.apply {
                    setTint(WColor.Tint.color)
                }
            )
            invoiceChevronView.setImageDrawable(
                context.getDrawableCompat(R.drawable.ic_arrow_right_24)?.apply {
                    setTint(WColor.SecondaryText.color)
                }
            )
        }

        val cacheWidth = ApplicationContextHolder.screenWidth
        val cacheHeight =
            (navigationController?.getSystemBars()?.top ?: 0) + QRCodeVC.HEIGHT.dp + 64.dp
        for ((i, chain) in availableChains.withIndex()) {
            val targetView = gradientColorViews[i]
            ReceiveBackgroundCache.render(chain, cacheWidth, cacheHeight) { drawable ->
                drawable?.let {
                    targetView.post { targetView.background = it }
                }
            }
        }
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        qrSegmentView.insetsUpdated()
        // Insets change top padding inside QR pages — re-measure segment height or address clips.
        applyQrSegmentHeight(force = true)
        if (isViewOnlyAccount) {
            view.setConstraints {
                toStartPx(
                    viewOnlyWarningView,
                    ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarStartInset
                )
                toEndPx(
                    viewOnlyWarningView,
                    ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset
                )
            }
        } else {
            view.setConstraints {
                toStartPx(
                    optionsContainerView,
                    ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarStartInset
                )
                toEndPx(
                    optionsContainerView,
                    ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset
                )
            }
        }
    }

    override fun viewWillAppear() {
        super.viewWillAppear()
        resubscribeQrHeightListener()
        if (navigationController?.isSwipingBack == true) {
            return
        }
        window!!.forceStatusBarLight = true
    }

    override fun viewDidAppear() {
        super.viewDidAppear()
        window!!.forceStatusBarLight = true
    }

    override fun viewWillDisappear() {
        super.viewWillDisappear()
        window!!.forceStatusBarLight = null
    }

    private val activeVC: QRCodeVC
        get() {
            val offset = qrSegmentView.currentOffset
            val idx = offset.toInt().coerceIn(0, availableChains.size - 1)
            return qrCodeVCs[availableChains[idx]]!!
        }

    private val qrHeight: Int
        get() {
            return qrCodeHeight(activeVC)
        }

    private var lastAppliedQrHeight = 0

    private val viewTreeObserver =
        object : ViewTreeObserver.OnPreDrawListener {
            override fun onPreDraw(): Boolean {
                if (applyQrSegmentHeight(force = false)) {
                    val minHeight = defaultVC.minExpectedHeight()
                    if (lastAppliedQrHeight >= minHeight) {
                        defaultVC.addressView.viewTreeObserver.removeOnPreDrawListener(this)
                    }
                }
                return true
            }
        }

    /** Returns true when the applied height is unchanged (stable). */
    private fun applyQrSegmentHeight(force: Boolean): Boolean {
        val calculatedQRHeight = qrHeight
        if (!force && calculatedQRHeight == lastAppliedQrHeight) {
            return true
        }
        lastAppliedQrHeight = calculatedQRHeight
        qrSegmentView.updateLayoutParams {
            height = calculatedQRHeight
        }
        return false
    }

    private val defaultVC get() = qrCodeVCs[resolvedDefaultChain] ?: qrCodeVCs.values.first()

    private fun updateChainSelector(index: Int) {
        val chain = availableChains.getOrNull(index) ?: return
        chainIconView.setImageResource(chain.icon)
        chainNameLabel.text = chain.displayName
    }

    private fun openChainMenu() {
        val currentIndex = qrSegmentView.currentIndex
        val items =
            availableChains
                .mapIndexed { index, chain ->
                    WMenuPopup.Item(
                        WMenuPopup.Item.Config.Item(
                            icon =
                                Icon(
                                    chain.icon,
                                    tintColor = null,
                                    iconSize = 28.dp,
                                    iconMargin = 12.dp
                                ),
                            title = chain.displayName,
                            textMargin = 52.dp
                        ),
                        hasSeparator = index == availableChains.lastIndex,
                    ) {
                        if (index != currentIndex) {
                            qrSegmentView.setActiveIndex(index)
                            updateChainSelector(index)
                            updateOptionsForOffset(index.toFloat())
                        }
                    }
                }.toMutableList()

        items.add(
            WMenuPopup.Item(
                WMenuPopup.Item.Config.Item(
                    icon =
                        Icon(
                            R.drawable.ic_networks_menu,
                            tintColor = WColor.SecondaryText,
                            iconSize = 28.dp,
                            iconMargin = 12.dp
                        ),
                    title = LocaleController.getString("Networks"),
                    textMargin = 52.dp
                ),
                false,
            ) {
                WalletCore.notifyEvent(WalletEvent.OpenNetworksSettings)
            }
        )

        WMenuPopup.present(
            chainSelectorView,
            items,
            popupWidth = 240.dp,
            yOffset = 0,
            positioning = WMenuPopup.Positioning.BELOW,
        )
    }

    private fun resubscribeQrHeightListener() {
        lastAppliedQrHeight = 0
        with(defaultVC.addressView.viewTreeObserver) {
            removeOnPreDrawListener(viewTreeObserver)
            addOnPreDrawListener(viewTreeObserver)
        }
    }

    private fun qrCodeHeight(vc: QRCodeVC): Int = vc.getHeight()

    private fun qrTransparentHeight(vc: QRCodeVC): Int =
        vc.getTransparentHeight() + qrSegmentView.navHeight +
            (navigationController?.getSystemBars()?.top ?: 0)

    private fun animateQrView(
        qrCodeView: View,
        ornamentView: View,
        descriptionView: View,
        direction: Int,
        progress: Float
    ) {
        val rotation = -10 * progress * direction
        qrCodeView.rotationY = rotation
        ornamentView.rotationY = rotation

        val scale = 1f - (0.5f * progress)
        qrCodeView.scaleX = scale
        qrCodeView.scaleY = scale
        ornamentView.scaleX = scale
        ornamentView.scaleY = scale

        val alpha = 1f - (0.75f * progress)
        qrCodeView.alpha = alpha
        descriptionView.alpha = (0.85f * (1f - progress)).coerceIn(0f, 0.85f)

        val translation = progress * 100.dp * -direction
        qrCodeView.translationX = translation
        ornamentView.translationX = translation
        descriptionView.translationX = translation
    }

    override fun onDestroy() {
        super.onDestroy()
        qrSegmentView.onDestroy()
        if (!isViewOnlyAccount) {
            invoiceView.setOnClickListener(null)
        }
        defaultVC.addressView.viewTreeObserver.removeOnPreDrawListener(viewTreeObserver)
    }

    private fun updateOptionsForOffset(offset: Float) {
        if (isViewOnlyAccount) return

        val tonIndex = availableChains.indexOf(MBlockchain.ton)
        val tonFraction =
            if (tonIndex >= 0) {
                (1f - kotlin.math.abs(offset - tonIndex)).coerceIn(0f, 1f)
            } else {
                0f
            }
        invoiceView.layoutParams?.height = (OPTION_ROW_HEIGHT.dp * tonFraction).toInt()
        invoiceView.requestLayout()
        invoiceView.isClickable = tonFraction == 1f
    }
}

internal fun resolveReceiveChain(
    visibleChains: List<MBlockchain>,
    preferred: MBlockchain?,
): MBlockchain? {
    if (visibleChains.isEmpty()) return null
    if (preferred != null && visibleChains.contains(preferred)) return preferred
    if (visibleChains.contains(MBlockchain.ton)) return MBlockchain.ton
    return visibleChains.first()
}
