/*package app.twallet.air.uisettings.viewControllers.appearance.views.icon

import android.content.Context
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.constraintlayout.widget.ConstraintSet
import app.twallet.air.uicomponents.drawable.SeparatorBackgroundDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletcontext.helpers.LauncherIconController
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

class AppearanceAppIconView(
    applicationContext: Context,
) : WView(applicationContext), WThemedView {

    private val separatorBackgroundDrawable: SeparatorBackgroundDrawable by lazy {
        SeparatorBackgroundDrawable()
    }

    private val titleLabel: WLabel by lazy {
        val lbl = WLabel(context)
        lbl.text = LocaleController.getString("App Icon")
        lbl.setStyle(adaptiveFontSize(), WFont.Medium)
        lbl
    }

    private val airIconView = AppearanceAppIconItemView(
        applicationContext,
        LauncherIconController.LauncherIcon.AIR
    ) {
        updateIcons()
    }

    private val classicIconView = AppearanceAppIconItemView(
        applicationContext,
        LauncherIconController.LauncherIcon.CLASSIC
    ) {
        updateIcons()
    }

    private val iconView: WView by lazy {
        val v = WView(context)
        v.addView(airIconView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        v.addView(classicIconView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        v.setConstraints {
            toTop(airIconView)
            toLeft(airIconView)
            leftToRight(classicIconView, airIconView)
            toRight(classicIconView)
            toBottom(airIconView)
            createHorizontalChain(
                ConstraintSet.PARENT_ID, ConstraintSet.LEFT,
                ConstraintSet.PARENT_ID, ConstraintSet.RIGHT,
                intArrayOf(airIconView.id, classicIconView.id),
                null,
                ConstraintSet.CHAIN_SPREAD
            )
        }
        v
    }

    override fun setupViews() {
        super.setupViews()

        addView(titleLabel)
        addView(iconView, LayoutParams(0, WRAP_CONTENT))

        setConstraints {
            toTop(titleLabel, 16f)
            toStart(titleLabel, 20f)
            topToBottom(iconView, titleLabel, 24f)
            toCenterX(iconView)
            toBottom(iconView, 20f)
        }

        updateTheme()
    }

    override fun updateTheme() {
        setBackgroundColor(WColor.Background.color, ViewConstants.BLOCK_RADIUS.dp)
        titleLabel.setTextColor(WColor.PrimaryText.color)
    }

    private fun updateIcons() {
        airIconView.updateTheme()
        classicIconView.updateTheme()
    }

}
*/
