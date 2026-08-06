package app.twallet.air.uiswap.views

import android.content.Context
import android.content.res.ColorStateList
import android.text.SpannableStringBuilder
import android.text.TextUtils
import android.text.style.RelativeSizeSpan
import android.util.TypedValue
import androidx.appcompat.widget.AppCompatImageView
import androidx.appcompat.widget.AppCompatTextView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.spans.WForegroundColorSpan
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.image.Content
import app.twallet.air.uicomponents.image.WCustomImageView
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.smartDecimalsCount
import app.twallet.air.walletcontext.utils.CoinUtils
import app.twallet.air.walletbasecontext.utils.toString
import app.twallet.air.walletcore.moshi.IApiToken
import java.math.BigInteger

class SwapConfirmView(context: Context) :
    WCell(context, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT)),
    WThemedView {
    private val sizeSpan = RelativeSizeSpan(28f / 36f)
    private val colorSpan = WForegroundColorSpan()

    private val tokenToSendIconView = WCustomImageView(context).apply {
        layoutParams = LayoutParams(80.dp, 80.dp)
        chainSize = 30.dp
        chainSizeGap = 2f.dp
    }

    private val tokenToReceiveIconView = WCustomImageView(context).apply {
        layoutParams = LayoutParams(80.dp, 80.dp)
        chainSize = 30.dp
        chainSizeGap = 2f.dp
    }

    private val iconView = AppCompatImageView(context).apply {
        id = generateViewId()
        layoutParams = LayoutParams(24.dp, 24.dp)
        setImageResource(app.twallet.air.icons.R.drawable.ic_arrow_right_24)
        scaleX = LocaleController.rtlMultiplier.toFloat()
    }

    private val tokenToSendTextView = AppCompatTextView(context).apply {
        id = generateViewId()
        textAlignment = TEXT_ALIGNMENT_CENTER
        typeface = WFont.Balance.typeface
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 28f)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
        setSingleLine()
        ellipsize = TextUtils.TruncateAt.MARQUEE
        isSelected = true
        isHorizontalFadingEdgeEnabled = true
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, lineHeight)
    }

    private val tokenToReceiveTextView = AppCompatTextView(context).apply {
        id = generateViewId()
        textAlignment = TEXT_ALIGNMENT_CENTER
        typeface = WFont.Balance.typeface
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 44f)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 36f)
        setSingleLine()
        ellipsize = TextUtils.TruncateAt.MARQUEE
        isSelected = true
        isHorizontalFadingEdgeEnabled = true
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, lineHeight)
    }


    init {
        setPaddingDp(20, 16, 20, 26)

        addView(tokenToSendIconView)
        addView(iconView)
        addView(tokenToReceiveIconView)
        addView(tokenToSendTextView)
        addView(tokenToReceiveTextView)

        setConstraints {
            toCenterX(iconView)
            centerYToCenterY(iconView, tokenToSendIconView)

            toTop(tokenToSendIconView)
            endToStart(tokenToSendIconView, iconView, 16f)

            toTop(tokenToReceiveIconView)
            startToEnd(tokenToReceiveIconView, iconView, 16f)

            topToBottom(tokenToSendTextView, tokenToReceiveIconView, 22f)
            toCenterX(tokenToSendTextView)

            topToBottom(tokenToReceiveTextView, tokenToSendTextView, 8f)
            toCenterX(tokenToReceiveTextView)
        }

        updateTheme()
    }

    fun config(
        fromToken: IApiToken,
        toToken: IApiToken,
        fromAmount: BigInteger?,
        toAmount: BigInteger?
    ) {
        tokenToSendIconView.set(Content.of(fromToken, showChain = true))
        tokenToReceiveIconView.set(Content.of(toToken, showChain = true))

        val sendAmount =
            fromAmount?.negate()?.toString(
                decimals = fromToken.decimals,
                currency = fromToken.symbol ?: "",
                currencyDecimals = fromAmount.smartDecimalsCount(fromToken.decimals),
                showPositiveSign = false
            )
        tokenToSendTextView.text = sendAmount?.let {
            val ssb = SpannableStringBuilder(it)
            CoinUtils.setSpanToFractionalPart(ssb, colorSpan)
            ssb
        }
        val receiveAmount = toAmount?.toString(
            decimals = toToken.decimals,
            currency = toToken.symbol ?: "",
            currencyDecimals = toAmount.smartDecimalsCount(toToken.decimals),
            showPositiveSign = true
        )
        tokenToReceiveTextView.text = receiveAmount?.let {
            val ssb = SpannableStringBuilder(it)
            CoinUtils.setSpanToFractionalPart(ssb, sizeSpan)
            CoinUtils.setSpanToFractionalPart(ssb, colorSpan)
            ssb
        }
    }

    override fun updateTheme() {
        colorSpan.color = WColor.SecondaryText.color
        tokenToSendTextView.setTextColor(WColor.PrimaryText.color)
        tokenToReceiveTextView.setTextColor(WColor.PrimaryText.color)
        iconView.imageTintList = ColorStateList.valueOf(WColor.SecondaryText.color)
    }
}
