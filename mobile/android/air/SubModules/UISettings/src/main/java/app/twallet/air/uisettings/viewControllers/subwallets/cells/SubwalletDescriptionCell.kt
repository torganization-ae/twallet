package app.twallet.air.uisettings.viewControllers.subwallets.cells

import android.content.Context
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.walletbasecontext.theme.WColor

class SubwalletDescriptionCell(context: Context) :
    WCell(context, LayoutParams(LayoutParams.MATCH_PARENT, WRAP_CONTENT)) {
    private val label = WLabel(context).apply {
        setStyle(13f, WFont.Regular)
        setTextColor(WColor.SecondaryText)
    }

    init {
        addView(label, LayoutParams(0, WRAP_CONTENT))
        setConstraints {
            toStart(label, 16f)
            toEnd(label, 16f)
            toTop(label, 20f)
            toBottom(label, 16f)
        }
    }

    fun configure(text: String) {
        label.text = text
    }
}
