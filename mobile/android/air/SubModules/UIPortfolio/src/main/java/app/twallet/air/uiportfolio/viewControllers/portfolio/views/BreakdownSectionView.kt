package app.twallet.air.uiportfolio.viewControllers.portfolio.views

import android.annotation.SuppressLint
import android.content.Context
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.LinearLayout
import androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.MATCH_CONSTRAINT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uiportfolio.viewControllers.portfolio.models.PortfolioBreakdownSlice
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletcore.stores.AccountStore

@SuppressLint("ViewConstructor")
class BreakdownSectionView(
    context: Context
) : WView(context),
    WThemedView {
    private val byChainCard =
        BreakdownCardView(
            context = context,
            titleText = LocaleController.getString("By Chain"),
            showLegend = true,
            emptyText = LocaleController.getString("No chain balances"),
        )
    private val assetMixCard =
        BreakdownCardView(
            context = context,
            titleText = LocaleController.getString("Asset Mix"),
            showLegend = true,
            emptyText = LocaleController.getString("No asset balances"),
        )
    private var cards =
        buildVisibleCards(
            showByChain = AccountStore.activeAccount?.isMultichain == true,
        )

    private val allCards = listOf(byChainCard, assetMixCard)

    private fun buildVisibleCards(showByChain: Boolean): List<BreakdownCardView> =
        buildList {
            if (showByChain) add(byChainCard)
            add(assetMixCard)
        }

    private val stack =
        LinearLayout(context).apply {
            id = generateViewId()
            orientation = LinearLayout.VERTICAL
        }

    init {
        addView(stack, LayoutParams(MATCH_CONSTRAINT, WRAP_CONTENT))
        setConstraints {
            allEdges(stack)
        }
        rebuildStack()
    }

    private fun rebuildStack() {
        stack.removeAllViews()
        cards.forEachIndexed { index, card ->
            (card.parent as? android.view.ViewGroup)?.removeView(card)
            stack.addView(
                card,
                LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT).apply {
                    if (index > 0) topMargin = ViewConstants.GAP.dp
                    marginStart = ViewConstants.HORIZONTAL_PADDINGS.dp
                    marginEnd = ViewConstants.HORIZONTAL_PADDINGS.dp
                }
            )
        }
    }

    fun render(
        chainSlices: List<PortfolioBreakdownSlice>,
        assetSlices: List<PortfolioBreakdownSlice>,
        animated: Boolean,
    ) {
        val newCards =
            buildVisibleCards(
                showByChain = AccountStore.activeAccount?.isMultichain == true,
            )
        if (newCards != cards) {
            cards = newCards
            rebuildStack()
        }
        byChainCard.render(chainSlices)
        assetMixCard.render(assetSlices)
        if (animated) {
            newCards.forEach { it.fadeInLegend() }
        }
    }

    fun maskTargets(): List<Pair<View, Float>> =
        cards.map { it.maskTarget() }

    fun crossFadeTargets(): List<View> =
        cards.flatMap { it.crossFadeTargets() }

    fun showPlaceholders(animated: Boolean = false) {
        allCards.forEach { it.showPlaceholders(animated) }
    }

    fun hidePlaceholders() {
        allCards.forEach { it.hidePlaceholders() }
    }

    override fun updateTheme() {
        allCards.forEach { it.updateTheme() }
    }
}
