package app.twallet.air.uicomponents.widgets

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.view.View
import android.view.ViewGroup
import app.twallet.air.uicomponents.drawable.counter.Counter
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.exactly
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.ViewHelpers
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import kotlin.math.roundToInt

class WTokenMaxButton(context: Context) : View(context), Counter.Callback, WThemedView,
    WProtectedView {
    private val textPaintSecondary = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = WFont.Regular.typeface
        textSize = 14f.dp
    }
    private val textPaintTint = TextPaint(textPaintSecondary)
    private var maxStaticLayout: StaticLayout
    private val counter = Counter(textPaintTint, this)

    init {
        layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, HEIGHT.dp)
        setPaddingDp(PADDING_HORIZONTAL, 0, PADDING_HORIZONTAL, 0)
        updateTheme()

        val maxString = LocaleController.getString("\$max_balance").replace(" %balance%", "")
        maxStaticLayout = StaticLayout(
            maxString,
            textPaintSecondary,
            textPaintSecondary.measureText(maxString)
                .roundToInt(),
            Layout.Alignment.ALIGN_NORMAL,
            1f, 0f, false
        )
    }

    override fun dispatchDraw(canvas: Canvas) {
        super.dispatchDraw(canvas)

        val y = measuredHeight / 2f + 5.dp

        if (LocaleController.isRTL) {
            counter.draw(
                canvas,
                paddingLeft.toFloat(),
                y,
                1f
            )

            maxStaticLayout.let {
                val x = paddingLeft + counter.getVisibleWidth() + GAP.dp
                val textY = y - maxStaticLayout.getLineBaseline(0)

                val a = it.paint.alpha
                it.paint.alpha = (255 * counter.visibility).roundToInt()

                canvas.save()
                canvas.translate(x, textY)
                it.draw(canvas)
                canvas.restore()

                it.paint.alpha = a
            }
        } else {
            maxStaticLayout.let {
                val x =
                    measuredWidth - counter.getVisibleWidth() - paddingRight - GAP.dp - maxStaticLayout.width
                val textY = y - maxStaticLayout.getLineBaseline(0)

                val a = it.paint.alpha
                it.paint.alpha = (255 * counter.visibility).roundToInt()

                canvas.save()
                canvas.translate(x, textY)
                it.draw(canvas)
                canvas.restore()

                it.paint.alpha = a
            }

            counter.draw(
                canvas,
                measuredWidth - counter.getVisibleWidth() - paddingRight,
                y,
                1f
            )
        }
    }


    private var protectedText: String? = null

    fun setAmount(text: String?) {
        if (this.protectedText == text) {
            return
        }
        this.protectedText = text

        isEnabled = !text.isNullOrEmpty()
        counter.setValue(
            if (WGlobalStorage.getIsSensitiveDataProtectionOn()) "*** ${
                protectedText?.split(" ")?.last()
            }" else protectedText,
            isAttachedToWindow
        )
    }

    override val isTinted = true
    override fun updateTheme() {
        textPaintSecondary.color = WColor.SecondaryText.color
        textPaintTint.color = WColor.Tint.color

        background = ViewHelpers.roundedRippleDrawable(
            null,
            WColor.tintRippleColor,
            8f.dp
        )
    }

    override fun updateProtectedView() {
        counter.setValue(
            if (WGlobalStorage.getIsSensitiveDataProtectionOn()) "***" else protectedText,
            isAttachedToWindow
        )
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(
            (counter.requiredWidth + paddingLeft + paddingRight + GAP.dp + maxStaticLayout.width).exactly,
            heightMeasureSpec
        )
    }

    override fun onCounterAppearanceChanged(counter: Counter, sizeChanged: Boolean) {
        invalidate()
    }

    override fun onCounterRequiredWidthChanged(counter: Counter) {
        requestLayout()
    }

    companion object {
        const val PADDING_HORIZONTAL = 6
        const val HEIGHT = 20
        private const val GAP = 4
    }
}
