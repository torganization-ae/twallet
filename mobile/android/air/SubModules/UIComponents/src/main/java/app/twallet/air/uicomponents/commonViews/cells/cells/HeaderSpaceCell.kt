package app.twallet.air.uicomponents.commonViews.cells

import android.content.Context
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WThemedView

class HeaderSpaceCell(context: Context) : WCell(context), WThemedView {
    override fun setupViews() {
        super.setupViews()
        updateTheme()
    }

    override fun updateTheme() {
    }
}
