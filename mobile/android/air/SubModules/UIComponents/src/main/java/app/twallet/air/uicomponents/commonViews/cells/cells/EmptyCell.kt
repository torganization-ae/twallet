package app.twallet.air.uicomponents.commonViews.cells

import android.content.Context
import app.twallet.air.uicomponents.commonViews.WEmptyView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.localization.LocaleController

class EmptyCell(context: Context) : WCell(context), WThemedView {

    val emptyView = WEmptyView(
        context,
        LocaleController.getString("No Activity"),
        LocaleController.getString("\$no_activity_history")
    )

    override fun setupViews() {
        super.setupViews()

        addView(emptyView, LayoutParams(0, 120.dp))
        setConstraints {
            toTop(emptyView)
            toCenterX(emptyView, 8f)
        }

        updateTheme()
    }

    override fun updateTheme() {
        emptyView.updateTheme()
    }
}
