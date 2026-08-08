package app.twallet.air.uicomponents.helpers

import android.content.Context
import android.view.View
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.MATCH_CONSTRAINT
import androidx.constraintlayout.widget.ConstraintSet
import androidx.core.view.isGone
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WCounterLabel
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.solidColorWithAlpha
import app.twallet.air.walletcore.SOLANA_USDC_SLUG
import app.twallet.air.walletcore.SOLANA_USDT_SLUG
import app.twallet.air.walletcore.TON_USDT_SLUG
import app.twallet.air.walletcore.TON_USDT_TESTNET_SLUG
import app.twallet.air.walletcore.TRON_USDT_SLUG
import app.twallet.air.walletcore.TRON_USDT_TESTNET_SLUG
import app.twallet.air.walletcore.models.MToken
import app.twallet.air.walletcore.models.MTokenBalance
import kotlin.math.roundToInt

class TokenTagHelper(context: Context) {

    val tagLabel: WCounterLabel = WCounterLabel(context).apply {
        id = View.generateViewId()
        textAlignment = View.TEXT_ALIGNMENT_CENTER
        setPadding(4.5f.dp.roundToInt(), 4.dp, 4.5f.dp.roundToInt(), 0)
        setStyle(11f, WFont.Medium)
    }

    private enum class StaticTagStyle { REGULAR, STOCK }

    private var staticTagStyle: StaticTagStyle? = null
    private var wasShowingTagLabel: Boolean? = null

    fun configure(
        cell: WView,
        topLeftLabel: WLabel,
        topRightView: View,
        accountId: String?,
        token: MToken?,
        tokenBalance: MTokenBalance?
    ) {
        val shouldShow = when (token?.slug) {
            TRON_USDT_SLUG, TRON_USDT_TESTNET_SLUG -> { configureStaticTag("TRC-20"); true }
            TON_USDT_SLUG, TON_USDT_TESTNET_SLUG -> { configureStaticTag("TON"); true }
            SOLANA_USDT_SLUG, SOLANA_USDC_SLUG -> { configureStaticTag("Solana"); true }
            else -> configureLabelTag(token)
        }
        updateLabelSpacing(cell, topLeftLabel, topRightView, shouldShow)
    }

    fun onThemeChanged() {
        tagLabel.updateTheme()
        staticTagStyle?.let { applyStaticTagStyle(it) }
    }

    private fun configureStaticTag(
        text: String,
        style: StaticTagStyle = StaticTagStyle.REGULAR
    ) {
        staticTagStyle = style
        tagLabel.setAmount(text)
        applyStaticTagStyle(style)
    }

    private fun applyStaticTagStyle(style: StaticTagStyle) {
        when (style) {
            StaticTagStyle.REGULAR -> {
                tagLabel.setGradientColor(arrayOf(WColor.SecondaryText, WColor.SecondaryText))
                tagLabel.setBackgroundColor(WColor.BadgeBackground.color, 8f.dp)
            }

            StaticTagStyle.STOCK -> {
                tagLabel.setGradientColor(arrayOf(WColor.StockBadge, WColor.StockBadge))
                tagLabel.setBackgroundColor(
                    WColor.StockBadge.color.solidColorWithAlpha(38),
                    8f.dp
                )
            }
        }
    }

    private fun configureLabelTag(token: MToken?): Boolean {
        val label = token?.label?.takeIf { it.isNotBlank() } ?: return false
        configureStaticTag(
            label,
            if (token.isRwaStock) StaticTagStyle.STOCK else StaticTagStyle.REGULAR
        )
        return true
    }

    private fun updateLabelSpacing(
        cell: WView,
        topLeftLabel: WLabel,
        topRightView: View,
        showTagLabel: Boolean
    ) {
        tagLabel.isGone = !showTagLabel
        if (wasShowingTagLabel == showTagLabel) return
        wasShowingTagLabel = showTagLabel
        topLeftLabel.layoutParams = topLeftLabel.layoutParams.apply {
            width = MATCH_CONSTRAINT
        }
        if (showTagLabel) {
            cell.setConstraints {
                clear(topLeftLabel.id, ConstraintSet.END)
                endToStart(topLeftLabel, tagLabel)
                endToStart(tagLabel, topRightView, 4f)
                constrainedWidth(topLeftLabel.id, true)
                setHorizontalBias(topLeftLabel.id, 0f)
                setHorizontalChainStyle(topLeftLabel.id, ConstraintSet.CHAIN_PACKED)
            }
        } else {
            tagLabel.visibility = View.GONE
            cell.setConstraints {
                clear(topLeftLabel.id, ConstraintSet.END)
                endToStart(topLeftLabel, topRightView, 4f)
                constrainedWidth(topLeftLabel.id, true)
                setHorizontalBias(topLeftLabel.id, 0f)
            }
        }
    }
}
