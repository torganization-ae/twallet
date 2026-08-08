package app.twallet.air.uiportfolio.viewControllers.portfolio.views

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uiportfolio.viewControllers.portfolio.models.PortfolioBreakdownSlice
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

@SuppressLint("ViewConstructor")
class HorizontalBreakdownBarView(
    context: Context
) : View(context),
    WThemedView {
    private val trackPaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
            color = WColor.SecondaryBackground.color
        }
    private val segmentPaint =
        Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.FILL
        }
    private val trackRect = RectF()
    private val segmentRect = RectF()

    private var slices: List<PortfolioBreakdownSlice> = emptyList()

    fun setSlices(slices: List<PortfolioBreakdownSlice>) {
        this.slices = slices
        invalidate()
    }

    override fun updateTheme() {
        trackPaint.color = WColor.SecondaryBackground.color
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        val radius = h / 2f
        trackRect.set(0f, 0f, w, h)
        canvas.drawRoundRect(trackRect, radius, radius, trackPaint)

        val sum = slices.sumOf { it.ratio }
        if (sum <= 0.0 || slices.isEmpty()) return

        canvas.save()
        canvas.clipPath(
            android.graphics.Path().apply {
                addRoundRect(trackRect, radius, radius, android.graphics.Path.Direction.CW)
            }
        )

        var x = 0f
        for (slice in slices) {
            val segmentWidth = (w * (slice.ratio / sum)).toFloat()
            if (segmentWidth <= 0f) continue
            segmentPaint.color = slice.color
            segmentRect.set(x, 0f, x + segmentWidth, h)
            canvas.drawRect(segmentRect, segmentPaint)
            x += segmentWidth
        }

        canvas.restore()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val height =
            if (MeasureSpec.getMode(heightMeasureSpec) == MeasureSpec.EXACTLY) {
                MeasureSpec.getSize(heightMeasureSpec)
            } else {
                BAR_HEIGHT_DP.dp
            }
        val width = MeasureSpec.getSize(widthMeasureSpec)
        setMeasuredDimension(width, height)
    }

    companion object {
        const val BAR_HEIGHT_DP = 8
    }
}
