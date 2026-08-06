package app.twallet.air.uiwidgets.configurations.actionsWidget.views

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import androidx.constraintlayout.widget.ConstraintSet
import app.twallet.air.uicomponents.drawable.SeparatorBackgroundDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WBaseView
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.widgets.actionsWidget.ActionsWidget

class ActionsStyleView(
    context: Context,
) : WView(context), WThemedView {

    private val titleLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.text = LocaleController.getString("Theme")
        lbl.setStyle(adaptiveFontSize(), WFont.Medium)
        lbl
    }

    private val separatorBackgroundDrawable: SeparatorBackgroundDrawable by lazy {
        SeparatorBackgroundDrawable().apply {
            backgroundWColor = WColor.Background
        }
    }

    private val vividView = ActionsStyleItemView(
        context,
        ActionsWidget.Config.Style.VIVID,
        onSelect = {
            selectedStyle = it
            updateSelection()
        }
    )
    private val neutralView = ActionsStyleItemView(
        context,
        ActionsWidget.Config.Style.NEUTRAL,
        onSelect = {
            selectedStyle = it
            updateSelection()
        }
    )

    private val themeView: WView by lazy {
        val v = WView(context)
        v.addView(vividView, LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT))
        v.addView(
            neutralView,
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT)
        )
        v.setConstraints {
            toTop(vividView)
            toLeft(vividView)
            leftToRight(neutralView, vividView)
            leftToRight(neutralView, vividView)
            toRight(neutralView)
            toBottom(neutralView)
            createHorizontalChain(
                ConstraintSet.PARENT_ID, ConstraintSet.LEFT,
                ConstraintSet.PARENT_ID, ConstraintSet.RIGHT,
                intArrayOf(vividView.id, neutralView.id),
                null,
                ConstraintSet.CHAIN_SPREAD
            )
        }
        v
    }

    var selectedStyle = ActionsWidget.Config.Style.VIVID

    override fun setupViews() {
        super.setupViews()

        addView(titleLabel)
        addView(themeView, LayoutParams(0, LayoutParams.WRAP_CONTENT))

        setConstraints {
            toTop(titleLabel, 16f)
            toStart(titleLabel, 20f)
            topToBottom(themeView, titleLabel, 24f)
            toCenterX(themeView)
            toBottom(themeView, 20f)
        }

        arrayOf(vividView, neutralView).forEach {
            it.isActive = selectedStyle == it.identifier
        }
        updateTheme()
    }

    private fun updateSelection() {
        arrayOf(vividView, neutralView).forEach {
            it.isActive = selectedStyle == it.identifier
            it.updateTheme()
        }
    }

    override fun updateTheme() {
        setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp
        )
        titleLabel.setTextColor(WColor.Tint.color)
    }

}
