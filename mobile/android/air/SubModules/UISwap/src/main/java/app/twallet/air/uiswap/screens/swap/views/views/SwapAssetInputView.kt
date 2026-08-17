package app.twallet.air.uiswap.screens.swap.views

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.text.InputType
import android.text.TextUtils
import android.text.method.DigitsKeyListener
import android.view.Gravity
import android.view.ViewGroup
import androidx.core.widget.doOnTextChanged
import app.twallet.air.uicomponents.drawable.SeparatorBackgroundDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.ViewHelpers
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WAmountEditText
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WTokenMaxButton
import app.twallet.air.uicomponents.widgets.WTokenSymbolIconView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.smartDecimalsCount
import app.twallet.air.walletbasecontext.utils.toString
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.utils.CoinUtils
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.helpers.TokenEquivalent
import app.twallet.air.walletcore.moshi.IApiToken
import app.twallet.air.walletcore.stores.TokenStore
import java.math.BigInteger

class SwapAssetInputView(context: Context) : WCell(context), WThemedView {
    private val leftTopLabel = WLabel(context).apply {
        id = generateViewId()
        layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT)
        isSingleLine = true
        ellipsize = TextUtils.TruncateAt.END

        setStyle(adaptiveFontSize(), WFont.Regular)
        setLineHeight(24f)
    }

    private val rightTopButton = WTokenMaxButton(context).apply {
        id = generateViewId()
        layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, 24.dp)
    }

    val assetView = WTokenSymbolIconView(context).apply {
        id = generateViewId()
        drawable = context.getDrawableCompat(app.twallet.air.icons.R.drawable.ic_arrows_18)
        defaultSymbol = LocaleController.getString("Select Token")
        layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
    }

    val amountEditText = WAmountEditText(context).apply {
        id = generateViewId()
        hint = "0"
        layoutParams = LayoutParams(0, 48.dp)
        gravity = Gravity.CENTER_VERTICAL or
            (if (LocaleController.isRTL) Gravity.RIGHT else Gravity.LEFT)
        inputType = InputType.TYPE_NUMBER_FLAG_DECIMAL
        keyListener = DigitsKeyListener.getInstance("0123456789.,")
        isHorizontalFadingEdgeEnabled = true
        setSingleLine()
        setHorizontallyScrolling(true)
        setPaddingLocalized(0, 0, 20.dp, 0)
        setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                setSelection(0)
                scrollTo(0, 0)
            }
        }
    }

    private val equivalentLabel = WLabel(context).apply {
        id = generateViewId()
        layoutParams = LayoutParams(0, LayoutParams.WRAP_CONTENT)
        isSingleLine = true
        ellipsize = TextUtils.TruncateAt.END
        setStyle(14f, WFont.Regular)
    }

    private val balanceLabel = WLabel(context).apply {
        id = generateViewId()
        layoutParams = LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
        isSingleLine = true
        ellipsize = TextUtils.TruncateAt.END
        setStyle(14f, WFont.Regular)
    }

    private val separatorBackgroundDrawable: SeparatorBackgroundDrawable by lazy {
        SeparatorBackgroundDrawable().apply {
            backgroundWColor = WColor.Background
            forceSeparator = true
        }
    }

    enum class Mode {
        SELL, BUY
    }

    companion object {
        const val HEIGHT = 118
    }

    init {
        layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, HEIGHT.dp)
        clipChildren = false

        addView(leftTopLabel)
        addView(rightTopButton)
        addView(assetView)
        addView(this.amountEditText)
        addView(equivalentLabel)
        addView(balanceLabel)

        setConstraints {
            toStart(leftTopLabel, 20f)
            endToStart(leftTopLabel, rightTopButton)
            toTop(leftTopLabel, 16f)

            startToEnd(rightTopButton, leftTopLabel, 6f)
            centerYToCenterY(rightTopButton, leftTopLabel)
            toEnd(rightTopButton, 14f)

            toStart(this@SwapAssetInputView.amountEditText, 20f)
            centerYToCenterY(this@SwapAssetInputView.amountEditText, assetView)
            endToStart(this@SwapAssetInputView.amountEditText, assetView)

            startToEnd(assetView, this@SwapAssetInputView.amountEditText, 8f)
            toBottom(assetView, 36f)
            toEnd(assetView, 20f)

            toStart(equivalentLabel, 20f)
            endToStart(equivalentLabel, balanceLabel, 8f)
            topToBottom(equivalentLabel, this@SwapAssetInputView.amountEditText)

            toEnd(balanceLabel, 20f)
            centerYToCenterY(balanceLabel, equivalentLabel)
        }

        amountEditText.doOnTextChanged { _, _, _, _ -> updateEquivalent() }

        updateTheme()
    }

    private fun updateEquivalent() {
        val token = currentAsset
        if (token == null) {
            equivalentLabel.text = null
            return
        }

        val price = TokenStore.getToken(token.slug)?.price ?: 0.0
        val amount = CoinUtils.fromDecimal(amountEditText.text?.toString(), token.decimals)
            ?: BigInteger.ZERO

        equivalentLabel.text = "≈ " + TokenEquivalent.fromToken(
            price = price.toBigDecimal(),
            token = token,
            amount = amount,
            currency = WalletCore.baseCurrency ?: MBaseCurrency.USD
        ).getFmt(currency = true)
    }

    private var currentBalance: BigInteger? = null

    fun setTokenBalance(balance: BigInteger?) {
        currentBalance = balance
        val token = currentAsset
        balanceLabel.text = if (token == null || balance == null) {
            null
        } else {
            balance.toString(
                decimals = token.decimals,
                currency = token.symbol ?: "",
                currencyDecimals = balance.smartDecimalsCount(token.decimals),
                showPositiveSign = false
            )
        }
    }

    private var mode = Mode.SELL
    fun setMode(mode: Mode) {
        this.mode = mode
        if (mode == Mode.SELL) {
            leftTopLabel.text = LocaleController.getString("You sell")
            rightTopButton.visibility = VISIBLE
        } else {
            leftTopLabel.text = LocaleController.getString("You buy")
            rightTopButton.visibility = GONE
        }
        updateTheme()
    }

    private var currentAsset: IApiToken? = null

    fun setAsset(asset: IApiToken?) {
        if (currentAsset?.slug == asset?.slug) {
            return
        }

        currentAsset = asset
        assetView.setAsset(asset, showChain = true)
        asset?.let {
            amountEditText.amountTextWatcher.decimals = it.decimals
            amountEditText.amountTextWatcher.afterTextChanged(amountEditText.text)
        } ?: run {
            amountEditText.amountTextWatcher.decimals = null
            amountEditText.text?.clear()
        }
        updateEquivalent()
        setTokenBalance(currentBalance)
    }

    fun setBalance(subtitle: String?) {
        rightTopButton.setAmount(subtitle)
    }

    fun setOnMaxBalanceClickListener(onClickListener: OnClickListener?) {
        rightTopButton.setOnClickListener(onClickListener)
        balanceLabel.setOnClickListener(onClickListener)
    }

    override fun updateTheme() {
        if (mode == Mode.SELL) {
            setBackgroundColor(WColor.Background.color, ViewConstants.TOOLBAR_RADIUS.dp, 0f)
        } else {
            setBackgroundColor(WColor.Background.color, 0f, ViewConstants.BLOCK_RADIUS.dp)
        }
        separatorBackgroundDrawable.invalidateSelf()
        leftTopLabel.setTextColor(WColor.SecondaryText.color)
        equivalentLabel.setTextColor(WColor.SecondaryText.color)
        balanceLabel.setTextColor(WColor.SubtitleText.color)
        rightTopButton.background = ViewHelpers.roundedRippleDrawable(
            null, WColor.tintRippleColor, 8f.dp
        )
    }
}
