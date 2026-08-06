package app.twallet.air.uicomponents.widgets

import android.R
import android.content.Context
import android.content.res.ColorStateList
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.StateListDrawable
import androidx.appcompat.widget.SwitchCompat
import androidx.core.graphics.drawable.DrawableCompat
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

class WSwitch(context: Context) : SwitchCompat(context), WThemedView {

    init {
        id = generateViewId()

        updateTheme()
    }

    override val isTinted = true
    override fun updateTheme() {
        val selectedThumb = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setSize(20.dp, 20.dp)
            setColor(WColor.Background.color)
            setStroke(2.dp, WColor.Tint.color)
        }

        val defaultThumb = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setSize(20.dp, 20.dp)
            setColor(WColor.Background.color)
            setStroke(2.dp, WColor.SecondaryText.color)
        }

        thumbDrawable = StateListDrawable().apply {
            addState(intArrayOf(R.attr.state_checked), selectedThumb)
            addState(intArrayOf(), defaultThumb)
        }

        DrawableCompat.setTintList(
            this.trackDrawable, ColorStateList(
                arrayOf(
                    intArrayOf(R.attr.state_checked),
                    intArrayOf()
                ),
                intArrayOf(
                    WColor.Tint.color,
                    WColor.SecondaryText.color
                )
            )
        )
        refreshDrawableState()
    }

}
