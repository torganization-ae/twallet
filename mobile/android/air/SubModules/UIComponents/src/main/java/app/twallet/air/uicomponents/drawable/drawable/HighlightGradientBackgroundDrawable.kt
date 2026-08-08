package app.twallet.air.uicomponents.drawable

import android.graphics.drawable.GradientDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.walletcontext.utils.colorWithAlpha

class HighlightGradientBackgroundDrawable(
    isHighlighted: Boolean,
    cornerRadius: Float = 8f.dp,
    reversedColors: Boolean = false
) :
    GradientDrawable() {

    init {
        shape = RECTANGLE
        this.cornerRadius = cornerRadius
        val left = 0xFF41C433.toInt()
        val right = 0xFF0098EB.toInt()
        colors =
            if (isHighlighted)
                intArrayOf(
                    left.colorWithAlpha(229),
                    right.colorWithAlpha(229)
                ).apply {
                    if (reversedColors)
                        reversed()
                }
            else
                intArrayOf(
                    left.colorWithAlpha(38),
                    right.colorWithAlpha(38)
                ).apply {
                    if (reversedColors)
                        reversed()
                }
        orientation = Orientation.LEFT_RIGHT
    }
}
