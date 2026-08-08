package app.twallet.air.uiportfolio.viewControllers.portfolio.views

import android.annotation.SuppressLint
import android.content.Context
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.LinearLayout
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.MATCH_CONSTRAINT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WBaseView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.fadeOut
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.uiportfolio.viewControllers.portfolio.models.PortfolioBreakdownSlice
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import kotlin.math.roundToInt

@SuppressLint("ViewConstructor")
class BreakdownCardView(
    context: Context,
    titleText: String,
    private val showLegend: Boolean,
    private val legendRowCount: Int = 10,
    private val emptyText: String? = null,
) : WView(context),
    WThemedView {
    private val titleLabel =
        WLabel(context).apply {
            id = generateViewId()
            text = titleText
            setStyle(14f, WFont.Medium)
            setTextColor(WColor.Tint)
        }
    private val bar =
        HorizontalBreakdownBarView(context).apply {
            id = generateViewId()
        }
    private val legend =
        LinearLayout(context).apply {
            id = generateViewId()
            orientation = LinearLayout.VERTICAL
        }
    private val emptyLabel =
        WLabel(context).apply {
            id = generateViewId()
            text = emptyText
            setStyle(14f, WFont.Regular)
            setTextColor(WColor.SecondaryText)
            gravity = Gravity.CENTER
            maxLines = 2
            visibility = GONE
        }
    val cardSkeletonPlaceholder =
        WBaseView(context).apply {
            id = generateViewId()
            alpha = 0f
            visibility = GONE
        }

    init {
        setPadding(16.dp, 16.dp, 16.dp, 14.dp)
        addView(titleLabel, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        addView(bar, LayoutParams(MATCH_CONSTRAINT, HorizontalBreakdownBarView.BAR_HEIGHT_DP.dp))
        if (showLegend) {
            addView(legend, LayoutParams(MATCH_CONSTRAINT, WRAP_CONTENT))
        }
        if (emptyText != null) {
            addView(emptyLabel, LayoutParams(MATCH_CONSTRAINT, WRAP_CONTENT))
        }
        addView(cardSkeletonPlaceholder, LayoutParams(MATCH_CONSTRAINT, MATCH_CONSTRAINT))
        setConstraints {
            toTop(titleLabel)
            toStart(titleLabel)
            topToBottom(bar, titleLabel, 12f)
            toStart(bar)
            toEnd(bar)
            if (showLegend) {
                topToBottom(legend, bar, 12f)
                toStart(legend)
                toEnd(legend)
                toBottom(legend)
            } else {
                toBottom(bar)
            }
            if (emptyText != null) {
                toStart(emptyLabel)
                toEnd(emptyLabel)
                topToBottom(emptyLabel, titleLabel, 12f)
                toBottom(emptyLabel)
            }
            toTop(cardSkeletonPlaceholder, 36f)
            toCenterX(cardSkeletonPlaceholder)
            toBottom(cardSkeletonPlaceholder)
        }
    }

    fun render(slices: List<PortfolioBreakdownSlice>) {
        if (slices.isEmpty()) {
            bar.visibility = INVISIBLE
            if (showLegend) legend.visibility = INVISIBLE
            if (emptyText != null) emptyLabel.visibility = VISIBLE
            return
        }
        if (emptyText != null) emptyLabel.visibility = GONE
        bar.visibility = VISIBLE
        bar.setSlices(slices)
        if (showLegend) {
            legend.visibility = VISIBLE
            renderLegend(slices)
        }
    }

    fun fadeInLegend() {
        if (!showLegend || legend.visibility != VISIBLE) return
        legend.alpha = 0f
        legend.fadeIn()
    }

    fun maskTarget(): Pair<android.view.View, Float> =
        cardSkeletonPlaceholder to ViewConstants.BLOCK_RADIUS.dp

    fun crossFadeTargets(): List<android.view.View> =
        if (showLegend) listOf(bar, legend) else listOf(bar)

    fun showPlaceholders(animated: Boolean = false) {
        bar.visibility = VISIBLE
        if (showLegend) legend.visibility = VISIBLE
        cardSkeletonPlaceholder.visibility = VISIBLE
        if (animated) {
            cardSkeletonPlaceholder.fadeIn()
        } else {
            cardSkeletonPlaceholder.alpha = 1f
        }
    }

    fun hidePlaceholders() {
        cardSkeletonPlaceholder.fadeOut { cardSkeletonPlaceholder.visibility = INVISIBLE }
    }

    override fun updateTheme() {
        setBackgroundColor(WColor.Background.color, ViewConstants.BLOCK_RADIUS.dp)
        bar.updateTheme()
        cardSkeletonPlaceholder.setBackgroundColor(
            WColor.SecondaryBackground.color,
            ViewConstants.BLOCK_RADIUS.dp,
        )
    }

    @SuppressLint("SetTextI18n")
    private fun renderLegend(slices: List<PortfolioBreakdownSlice>) {
        legend.removeAllViews()
        slices.take(legendRowCount).forEachIndexed { index, slice ->
            val rowView =
                LinearLayout(context).apply {
                    orientation = LinearLayout.HORIZONTAL
                    gravity = Gravity.CENTER_VERTICAL
                }
            val dot =
                WBaseView(context).apply {
                    setBackgroundColor(slice.color, 4f.dp)
                }
            val label =
                WLabel(context).apply {
                    text = slice.label
                    setStyle(14f, WFont.Medium)
                    setTextColor(WColor.PrimaryText)
                }
            val pct =
                WLabel(context).apply {
                    text = "${(slice.ratio * 100).roundToInt()}%"
                    setStyle(14f, WFont.Regular)
                    setTextColor(WColor.SecondaryText)
                }
            rowView.addView(
                dot,
                LinearLayout.LayoutParams(8.dp, 8.dp).apply {
                    marginEnd = 8.dp
                }
            )
            rowView.addView(label, LinearLayout.LayoutParams(0, WRAP_CONTENT, 1f))
            rowView.addView(pct, LinearLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
            legend.addView(
                rowView,
                LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                    if (index > 0) topMargin = 8.dp
                }
            )
        }
    }
}
