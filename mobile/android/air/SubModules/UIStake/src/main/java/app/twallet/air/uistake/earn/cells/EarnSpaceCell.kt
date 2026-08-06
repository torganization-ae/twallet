package app.twallet.air.uistake.earn.cells

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

@SuppressLint("ViewConstructor")
class EarnSpaceCell(context: Context, val isTransparent: Boolean = false) : WCell(context),
    WThemedView {

    override fun updateTheme() {
        setBackgroundColor(
            if (isTransparent) Color.TRANSPARENT else WColor.SecondaryBackground.color
        )
    }

}
