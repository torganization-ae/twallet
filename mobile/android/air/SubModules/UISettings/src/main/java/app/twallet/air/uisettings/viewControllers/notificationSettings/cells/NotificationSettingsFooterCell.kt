package app.twallet.air.uisettings.viewControllers.notificationSettings.cells

import android.content.Context
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import app.twallet.air.uicomponents.commonViews.cells.SwitchCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage

class NotificationSettingsFooterCell(
    context: Context,
) : WCell(context, LayoutParams(MATCH_PARENT, WRAP_CONTENT)), WThemedView {

    private val soundsRow = SwitchCell(
        context,
        title = LocaleController.getString("Play Sounds"),
        isChecked = WGlobalStorage.getAreSoundsActive(),
        isFirst = true,
        isLast = true,
        onChange = { isChecked ->
            WGlobalStorage.setAreSoundsActive(isChecked)
        })

    override fun setupViews() {
        super.setupViews()

        addView(soundsRow, LayoutParams(MATCH_PARENT, 50.dp))
        setConstraints {
            toTop(soundsRow, ViewConstants.GAP.toFloat())
            toBottom(soundsRow, ViewConstants.GAP.toFloat())
        }
    }

    override fun updateTheme() {
        soundsRow.updateTheme()
    }

    fun configure() {
        updateTheme()
    }

}
