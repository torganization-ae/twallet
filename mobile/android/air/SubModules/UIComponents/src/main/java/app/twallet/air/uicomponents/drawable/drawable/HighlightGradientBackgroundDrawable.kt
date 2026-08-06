package app.twallet.air.uicomponents.drawable

import android.graphics.drawable.GradientDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
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
        colors =
            if (isHighlighted)
                intArrayOf(
                    WColor.EarnGradientLeft.color.colorWithAlpha(229),
                    WColor.EarnGradientRight.color.colorWithAlpha(229)
                ).apply {
                    if (reversedColors)
                        reversed()
                }
            else
                intArrayOf(
                    WColor.EarnGradientLeft.color.colorWithAlpha(38),
                    WColor.EarnGradientRight.color.colorWithAlpha(38)
                ).apply {
                    if (reversedColors)
                        reversed()
                }
        orientation = Orientation.LEFT_RIGHT
    }
}
