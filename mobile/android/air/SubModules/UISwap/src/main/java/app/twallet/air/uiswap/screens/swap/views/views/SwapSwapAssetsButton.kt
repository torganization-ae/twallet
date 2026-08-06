package app.twallet.air.uiswap.screens.swap.views

import android.content.Context
import androidx.appcompat.widget.AppCompatImageView
import com.facebook.drawee.drawable.RoundedColorDrawable
import app.twallet.air.icons.R
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.ViewHelpers
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.theme.colorStateList

class SwapSwapAssetsButton(context: Context) : AppCompatImageView(context), WThemedView {
    init {
        updateTheme()

        setImageResource(R.drawable.ic_switch_24)
        imageTintList = WColor.Tint.colorStateList
        scaleType = ScaleType.CENTER
    }

    override fun updateTheme() {
        background = ViewHelpers.roundedRippleDrawable(
            RoundedColorDrawable(WColor.SecondaryBackground.color).apply {
                setRadius(16f.dp)
            },
            WColor.tintRippleColor, 16f.dp
        )
    }
}
