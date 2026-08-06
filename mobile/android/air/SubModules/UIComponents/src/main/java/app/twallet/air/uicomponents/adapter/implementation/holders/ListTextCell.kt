package app.twallet.air.uicomponents.adapter.implementation.holders

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup
import app.twallet.air.uicomponents.adapter.BaseListHolder
import app.twallet.air.uicomponents.adapter.implementation.Item
import app.twallet.air.uicomponents.extensions.setPaddingDp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.typeface
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.localization.LocaleController

class ListTextCell(context: Context) : WLabel(context) {
    init {
        layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
        isSingleLine = true
        maxLines = 1
        setLineHeight(TypedValue.COMPLEX_UNIT_SP, 24f)
        setPaddingDp(20f, 16f, 20f, 8f)
        setStyle(adaptiveFontSize(), WFont.Medium)
        gravity =
            if (LocaleController.isRTL)
                Gravity.RIGHT
            else
                Gravity.LEFT
        useCustomEmoji = true
        setTextColor(WColor.PrimaryText)
    }

    class Holder(parent: ViewGroup) :
        BaseListHolder<Item.ListText>(ListTextCell(parent.context)) {
        private val view = itemView as ListTextCell
        override fun onBind(item: Item.ListText) {
            view.text = item.title
            val paddingDp = item.paddingDp
            view.setPaddingDp(paddingDp.left, paddingDp.top, paddingDp.right, paddingDp.bottom)
            view.gravity =
                item.gravity ?: if (LocaleController.isRTL)
                    Gravity.RIGHT
                else
                    Gravity.LEFT
            view.setTextSize(TypedValue.COMPLEX_UNIT_SP, item.textSize ?: adaptiveFontSize())
            view.setTextColor(item.textColor ?: WColor.PrimaryText)
            view.typeface = item.font ?: WFont.Medium.typeface
        }
    }
}
