package app.twallet.air.uitonconnect.viewControllers.send.commonViews

import android.content.Context
import android.util.TypedValue
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.appcompat.widget.AppCompatTextView
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uitonconnect.viewControllers.send.adapter.TonConnectItem
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

class TotalCurrencyAmountView(
    context: Context
) : AppCompatTextView(context), WThemedView {

    init {
        setPaddingDp(20, 8, 20, 16)
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 28f)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
        typeface = WFont.Medium.typeface
        updateTheme()
    }

    override fun updateTheme() {
        setTextColor(WColor.PrimaryText.color)
    }

    class Holder(parent: ViewGroup) :
        BaseListHolder<TonConnectItem.CurrencyAmount>(TotalCurrencyAmountView(parent.context).apply {
            layoutParams = ViewGroup.LayoutParams(
                MATCH_PARENT,
                WRAP_CONTENT
            )
        }) {
        private val view: AppCompatTextView = itemView as AppCompatTextView
        override fun onBind(item: TonConnectItem.CurrencyAmount) {
            view.text = item.text
        }
    }
}
