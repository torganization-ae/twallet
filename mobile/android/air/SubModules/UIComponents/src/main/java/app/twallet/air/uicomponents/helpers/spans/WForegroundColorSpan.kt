package app.twallet.air.uicomponents.helpers.spans

import android.graphics.Color
import android.text.TextPaint
import android.text.style.CharacterStyle
import android.text.style.UpdateAppearance
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

class WForegroundColorSpan() : CharacterStyle(), UpdateAppearance {
    constructor(wColor: WColor) : this() {
        this.wColor = wColor
    }

    constructor(color: Int) : this() {
        this.color = color
    }

    var wColor: WColor? = null
    var color: Int = Color.GREEN

    override fun updateDrawState(textPaint: TextPaint) {
        textPaint.color = wColor?.color ?: color
    }
}
