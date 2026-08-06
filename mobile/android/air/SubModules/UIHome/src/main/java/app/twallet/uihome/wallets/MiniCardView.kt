package app.twallet.uihome.wallets

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.ImageView
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.MATCH_CONSTRAINT
import androidx.core.view.setPadding
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.AutoScaleContainerView
import app.twallet.air.uicomponents.widgets.WImageView
import app.twallet.air.uicomponents.widgets.WMultichainAddressLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.balance.WBalanceView
import app.twallet.air.uicomponents.widgets.sensitiveDataContainer.SensitiveDataMaskView
import app.twallet.air.uicomponents.widgets.sensitiveDataContainer.WSensitiveDataContainer
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletbasecontext.utils.toBigInteger
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.utils.colorWithAlpha
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.MAccount
import app.twallet.air.walletcore.moshi.ApiNft
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.BalanceStore

@SuppressLint("ViewConstructor")
class MiniCardView(context: Context, private val containerWidth: Int) : WView(context),
    WThemedView {

    private var cardNft: ApiNft? = null

    private val imageView = WImageView(context, 12.dp).apply {
        scaleType = ImageView.ScaleType.CENTER_CROP
    }

    private val balanceView = WBalanceView(context).apply {
        currencySize = 16f
        primarySize = 18f
        decimalsSize = 13f
        typeface = WFont.Balance.typeface
    }

    private val balanceContainerView = WSensitiveDataContainer(
        AutoScaleContainerView(balanceView).apply {
            clipChildren = false
            clipToPadding = false
            minPadding = 12.dp
        },
        WSensitiveDataContainer.MaskConfig(
            6,
            2,
            Gravity.CENTER,
            skin = SensitiveDataMaskView.Skin.DARK_THEME,
            protectContentLayoutSize = false
        )
    ).apply {
        clipChildren = false
        clipToPadding = false
    }

    private val addressLabel: WMultichainAddressLabel by lazy {
        WMultichainAddressLabel(context).apply {
            setStyle(11f, WFont.Medium)
            gravity = Gravity.CENTER
            containerWidth = this@MiniCardView.containerWidth
        }
    }

    private val borderPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 1.5f.dp
    }

    private val containerView by lazy {
        WView(context).apply {
            addView(imageView, LayoutParams(0, 0))
            addView(balanceContainerView, LayoutParams(0, MATCH_PARENT))
            addView(addressLabel, LayoutParams(MATCH_CONSTRAINT, WRAP_CONTENT))

            setConstraints {
                allEdges(imageView)
                toCenterX(balanceContainerView)
                toTop(balanceContainerView, -4f)
                toBottom(balanceContainerView, 4f)
                toCenterX(addressLabel, 2f)
                toBottom(addressLabel, 6f)
            }

            setBackgroundColor(Color.TRANSPARENT, 12f.dp, clipToBounds = true)
        }
    }

    override fun setupViews() {
        super.setupViews()

        addView(containerView, LayoutParams(MATCH_PARENT, MATCH_PARENT))
        updateTheme()
    }

    override fun updateTheme() {
        borderPaint.color = WColor.Tint.color
        cardNft?.let {
            val colors = cardNft?.metadata?.mtwCardColors ?: return@let
            setLabelColors(colors.first, colors.second, drawGradient = true)
            return
        }
        setLabelColors(Color.WHITE, Color.WHITE.colorWithAlpha(191), drawGradient = false)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)

        val cardWidth = w - 8.dp
        balanceContainerView.contentView.maxAllowedWidth = cardWidth
        balanceView.containerWidth = cardWidth
    }

    private var account: MAccount? = null
    fun configure(account: MAccount) {
        this.account = account
        updateCardImage()
        val balance = BalanceStore.totalBalanceInBaseCurrency(account.accountId)
        balanceView.animateText(
            WBalanceView.AnimateConfig(
                amount = balance?.toBigInteger(WalletCore.baseCurrency.decimalsCount),
                decimals = WalletCore.baseCurrency.decimalsCount,
                currency = WalletCore.baseCurrency.sign,
                animated = false,
                setInstantly = true,
                forceCurrencyToRight = LocaleController.isRTL
            )
        )
        setPadding(if (isActive()) 3.dp else 1.dp)
        addressLabel.setPadding(0, 0, 0, if (isActive()) 0 else 2.dp)
    }

    fun notifyBalanceChange() {
        val accountId = account?.accountId ?: return
        val baseCurrency = WalletCore.baseCurrency
        val balance = BalanceStore.totalBalanceInBaseCurrency(accountId)
        balanceView.animateText(
            WBalanceView.AnimateConfig(
                amount = balance?.toBigInteger(baseCurrency.decimalsCount),
                decimals = baseCurrency.decimalsCount,
                currency = baseCurrency.sign,
                animated = true,
                setInstantly = false,
                forceCurrencyToRight = LocaleController.isRTL
            )
        )
    }

    fun updateCardImage() {
        cardNft =
            account?.accountId?.let { activeAccountId ->
                WGlobalStorage.getCardBackgroundNft(activeAccountId)
                    ?.let { ApiNft.fromJson(it) }
            }
        updateTheme()

        if (cardNft == null) {
            imageView.loadRes(app.twallet.air.uicomponents.R.drawable.img_card)
            return
        }
        imageView.hierarchy.setPlaceholderImage(
            context.getDrawableCompat(
                app.twallet.air.uicomponents.R.drawable.img_card
            )
        )
        imageView.loadUrl(cardNft?.metadata?.cardImageUrl(false) ?: "")
    }

    private fun setLabelColors(primaryColor: Int, secondaryColor: Int, drawGradient: Boolean) {
        balanceView.updateColors(primaryColor, secondaryColor, drawGradient)
        addressLabel.setTextColor(primaryColor, secondaryColor, drawGradient)
        val style = when (account?.accountType) {
            MAccount.AccountType.VIEW -> WMultichainAddressLabel.miniCardWalletViewStyle
            MAccount.AccountType.HARDWARE -> WMultichainAddressLabel.miniCardWalletHardwareStyle
            else -> if (isActive()) {
                WMultichainAddressLabel.miniCardWalletSelectedStyle
            } else {
                WMultichainAddressLabel.miniCardWalletStyle
            }
        }
        addressLabel.displayAddresses(account, style)
    }

    override fun dispatchDraw(canvas: Canvas) {
        super.dispatchDraw(canvas)

        if (isActive())
            drawSelectedBorder(canvas)
    }

    private fun drawSelectedBorder(canvas: Canvas) {
        val padding = 0f
        val halfStroke = borderPaint.strokeWidth / 2
        val left = padding + halfStroke
        val top = padding + halfStroke
        val right = width - padding - halfStroke
        val bottom = height - padding - halfStroke

        val cornerRadius = 13.5f.dp
        canvas.drawRoundRect(
            left,
            top,
            right,
            bottom,
            cornerRadius,
            cornerRadius,
            borderPaint
        )
    }

    private fun isActive(): Boolean {
        return account?.accountId == AccountStore.activeAccountId
    }
}
