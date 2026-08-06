package app.twallet.air.uicomponents.commonViews

import android.annotation.SuppressLint
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.content.Context
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

@SuppressLint("ViewConstructor")
class WEmptyView(
    context: Context,
    val title: String,
    val text: String
) : WView(context), WThemedView {

    private val titleLabel: WLabel by lazy {
        val v = WLabel(context)
        v.setStyle(adaptiveFontSize(), WFont.Medium)
        v.textAlignment = TEXT_ALIGNMENT_CENTER
        v
    }

    private val textLabel: WLabel by lazy {
        val v = WLabel(context)
        v.setStyle(14f)
        v.textAlignment = TEXT_ALIGNMENT_CENTER
        v
    }

    override fun setupViews() {
        super.setupViews()

        addView(titleLabel)
        addView(textLabel)

        setConstraints {
            toTop(titleLabel, 40f)
            toCenterX(titleLabel)
            topToBottom(textLabel, titleLabel, 8F)
            toCenterX(textLabel)
            toBottom(textLabel)
        }

        titleLabel.text = title
        textLabel.text = text

        updateTheme()
    }

    override fun updateTheme() {
        titleLabel.setTextColor(WColor.PrimaryText.color)
        textLabel.setTextColor(WColor.SecondaryText.color)
    }
}
