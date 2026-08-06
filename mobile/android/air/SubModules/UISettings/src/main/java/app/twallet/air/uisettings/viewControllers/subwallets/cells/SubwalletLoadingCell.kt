package app.twallet.air.uisettings.viewControllers.subwallets.cells

import android.content.Context
import android.widget.ProgressBar
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

class SubwalletLoadingCell(
    context: Context,
) : WCell(context), WThemedView {

    private val progressBar = ProgressBar(context).apply {
        id = generateViewId()
        isIndeterminate = true
    }

    private val loadingLabel = WLabel(context).apply {
        setStyle(15f, WFont.Regular)
        text = LocaleController.getString("Loading more")
    }

    init {
        layoutParams.apply {
            height = 50.dp
        }
        addView(progressBar, LayoutParams(20.dp, 20.dp))
        addView(loadingLabel)
        setConstraints {
            toStart(progressBar, 20f)
            toCenterY(progressBar)
            toCenterY(loadingLabel)
            startToEnd(loadingLabel, progressBar, 12f)
        }

        isClickable = false
        isFocusable = false

        updateTheme()
    }

    override fun updateTheme() {
        loadingLabel.setTextColor(WColor.SecondaryText.color)
    }
}
