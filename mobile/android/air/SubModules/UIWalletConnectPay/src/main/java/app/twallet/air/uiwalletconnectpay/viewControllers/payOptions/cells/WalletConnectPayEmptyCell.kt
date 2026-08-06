package app.twallet.air.uiwalletconnectpay.viewControllers.payOptions.cells

import android.annotation.SuppressLint
import android.content.Context
import android.view.Gravity
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.LinearLayout
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

/**
 * Empty-state card shown when the wallet has no eligible tokens for the payment.
 */
@SuppressLint("ViewConstructor")
class WalletConnectPayEmptyCell(context: Context) :
    WCell(context, LayoutParams(MATCH_PARENT, WRAP_CONTENT)), WThemedView {

    private val titleLabel = WLabel(context).apply {
        setStyle(14f, WFont.Medium)
        text = LocaleController.getString("You don't have any eligible tokens for this payment")
        gravity = Gravity.CENTER
    }

    private val subtitleLabel = WLabel(context).apply {
        setStyle(14f, WFont.Regular)
        setTextColor(WColor.SecondaryText)
        text = LocaleController.getString("Buy, swap, or receive a supported token to continue.")
        gravity = Gravity.CENTER
    }

    private val card = LinearLayout(context).apply {
        id = generateViewId()
        orientation = LinearLayout.VERTICAL
        setPadding(16.dp, 15.dp, 16.dp, 15.dp)
        addView(titleLabel, LinearLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        addView(
            subtitleLabel, LinearLayout.LayoutParams(
                MATCH_PARENT, WRAP_CONTENT
            ).apply { topMargin = 8.dp }
        )
    }

    init {
        addView(card, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        setConstraints {
            toTop(card)
            toCenterX(card)
            toBottom(card)
        }
    }

    override fun updateTheme() {
        titleLabel.setTextColor(WColor.PrimaryText.color)
        card.setBackgroundColor(WColor.Background.color, ViewConstants.BLOCK_RADIUS.dp)
    }

    fun configure(shouldSwitchWallet: Boolean = false) {
        titleLabel.text = LocaleController.getString(
            if (shouldSwitchWallet) "No matching chains" else "You don't have any eligible tokens for this payment"
        )
        subtitleLabel.text = LocaleController.getString(
            if (shouldSwitchWallet) "Select multichain wallet" else "Buy, swap, or receive a supported token to continue."
        )
        updateTheme()
    }
}
