package app.twallet.air.uicomponents.commonViews.cells.activity

import android.content.Context
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.exactly
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.ApplicationContextHolder
import java.util.Date

class ActivityDateLabel(context: Context) : WLabel(context) {

    init {
        id = generateViewId()
        setStyle(14f, WFont.Medium)
        setOnClickListener { }
        setPadding(20.dp, 16.dp, 20.dp, 0)
    }

    private var isFirst = false
    fun configure(dt: Date, isFirst: Boolean) {
        this.isFirst = isFirst
        setUserFriendlyDate(dt)
    }

    override fun updateTheme() {
        super.updateTheme()

        setTextColor(WColor.Tint.color)

        setBackgroundColor(
            WColor.Background.color,
            if (isFirst) ViewConstants.BLOCK_RADIUS.dp else 0f,
            0f
        )
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, 40.dp.exactly)
    }

}
