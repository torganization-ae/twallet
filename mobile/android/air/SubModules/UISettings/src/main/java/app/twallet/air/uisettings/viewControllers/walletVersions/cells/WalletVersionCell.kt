package app.twallet.air.uisettings.viewControllers.walletVersions.cells

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.text.SpannableStringBuilder
import androidx.core.view.isGone
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.styleDots
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.doubleAbsRepresentation
import app.twallet.air.walletbasecontext.utils.formatStartEndAddress
import app.twallet.air.walletbasecontext.utils.toString
import app.twallet.air.walletcore.TONCOIN_SLUG
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.moshi.api.ApiUpdate
import app.twallet.air.walletcore.stores.TokenStore

class WalletVersionCell(
    context: Context,
) : WCell(context), WThemedView {

    private var identifier: String = ""
    var onTap: ((identifier: String) -> Unit)? = null

    private val topLeftLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(adaptiveFontSize(), WFont.Medium)
        lbl
    }

    private val bottomLeftLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(14f)
        lbl
    }

    private val rightLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(adaptiveFontSize(), WFont.Medium)
        lbl
    }

    init {
        layoutParams.apply {
            height = 72.dp
        }
        addView(topLeftLabel)
        addView(bottomLeftLabel)
        addView(rightLabel)
        setConstraints {
            toTop(topLeftLabel, 14f)
            toStart(topLeftLabel, 20f)
            toTop(bottomLeftLabel, 38f)
            toStart(bottomLeftLabel, 20f)
            toBottom(bottomLeftLabel, 14f)
            toCenterY(rightLabel)
            toEnd(rightLabel, 20f)
        }

        setOnClickListener {
            onTap?.invoke(identifier)
        }

        updateTheme()
    }

    override fun updateTheme() {
        setBackgroundColor(
            WColor.Background.color,
            0f,
            if (isLast) ViewConstants.BLOCK_RADIUS.dp else 0f
        )
        addRippleEffect(WColor.SecondaryBackground.color)
        topLeftLabel.setTextColor(WColor.PrimaryText.color)
        bottomLeftLabel.setTextColor(WColor.SecondaryText.color)
        rightLabel.setTextColor(WColor.SecondaryText.color)
    }

    private var isLast = false
    fun configure(
        walletVersion: ApiUpdate.ApiUpdateWalletVersions.Version,
        isLast: Boolean
    ) {
        this.isLast = isLast
        identifier = walletVersion.version
        topLeftLabel.text = walletVersion.version
        bottomLeftLabel.text =
            SpannableStringBuilder(walletVersion.address.formatStartEndAddress()).apply {
                styleDots()
            }
        val toncoin = TokenStore.getToken(TONCOIN_SLUG)
        toncoin?.price?.let { price ->
            rightLabel.text =
                (walletVersion.balance.doubleAbsRepresentation(toncoin.decimals) * price).toString(
                    WalletCore.baseCurrency.decimalsCount,
                    WalletCore.baseCurrency.sign,
                    WalletCore.baseCurrency.decimalsCount,
                    true
                )
        }
        updateTheme()
    }

}
