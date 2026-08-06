package app.twallet.air.uiswap.screens.cex.receiveAddressInput.views

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.text.TextUtils
import android.util.TypedValue
import androidx.appcompat.widget.AppCompatTextView
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

class SwapHeaderView(context: Context) : AppCompatTextView(context), WThemedView {
    init {
        setTextSize(TypedValue.COMPLEX_UNIT_SP, adaptiveFontSize())
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        setPaddingDp(20, 16, 20, 8)
        typeface = WFont.Medium.typeface
        isSingleLine = true
        ellipsize = TextUtils.TruncateAt.END

        updateTheme()
    }

    override fun updateTheme() {
        setTextColor(WColor.PrimaryText.color)
    }
}
