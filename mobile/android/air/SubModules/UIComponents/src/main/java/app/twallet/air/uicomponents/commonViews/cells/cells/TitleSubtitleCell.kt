package app.twallet.air.uicomponents.commonViews.cells

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import app.twallet.air.uicomponents.commonViews.IconView
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcore.models.MTokenBalance
import app.twallet.air.walletcore.stores.TokenStore

class TitleSubtitleCell(
    context: Context,
) : WCell(context), WThemedView {

    private val ripple = WRippleDrawable.create(0f)

    private var identifier: String = ""
    var onTap: ((identifier: String) -> Unit)? = null

    private val iconView: IconView by lazy {
        val iv = IconView(context)
        iv
    }

    private val topLeftLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(adaptiveFontSize(), WFont.Medium)
        lbl
    }

    private val bottomLeftLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.setStyle(13f)
        lbl
    }

    init {
        background = ripple
        layoutParams.apply {
            height = 60.dp
        }
        addView(iconView, LayoutParams(50.dp, 50.dp))
        addView(topLeftLabel)
        addView(bottomLeftLabel)
        setConstraints {
            toTop(iconView, 6f)
            toBottom(iconView, 6f)
            toStart(iconView, 12f)
            toTop(topLeftLabel, 8f)
            toStart(topLeftLabel, 60f)
            toBottom(bottomLeftLabel, 8f)
            toStart(bottomLeftLabel, 60f)
        }

        setOnClickListener {
            onTap?.invoke(identifier)
        }

        updateTheme()
    }

    override fun updateTheme() {
        ripple.backgroundColor = WColor.Background.color
        ripple.rippleColor = WColor.SecondaryBackground.color
        topLeftLabel.setTextColor(WColor.PrimaryText.color)
        bottomLeftLabel.setTextColor(WColor.SecondaryText.color)
    }

    fun configure(tokenBalance: MTokenBalance, isLast: Boolean) {
        val token = TokenStore.getToken(tokenBalance.token)
        identifier = token?.slug ?: ""
        iconView.config(token)
        topLeftLabel.text = token?.name
        bottomLeftLabel.setAmount(
            tokenBalance.amountValue,
            token?.decimals ?: 9,
            token?.symbol ?: "",
            token?.decimals ?: 9,
            true
        )
    }

}
