package app.twallet.air.uicomponents.widgets

import android.content.Context
import android.util.TypedValue
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.htextview.scale.ScaleTextView

open class WScaleLabel(context: Context) : ScaleTextView(context),
    WThemedView {
    init {
        id = generateViewId()
    }

    fun setStyle(size: Float, font: WFont? = null) {
        typeface = (font ?: WFont.Regular).typeface
        setTextSize(TypedValue.COMPLEX_UNIT_SP, size)
    }

    override fun updateTheme() {
        // To force change color on theme change
        if (!text.isNullOrEmpty()) {
            animateText(text, false)
        }
    }
}
