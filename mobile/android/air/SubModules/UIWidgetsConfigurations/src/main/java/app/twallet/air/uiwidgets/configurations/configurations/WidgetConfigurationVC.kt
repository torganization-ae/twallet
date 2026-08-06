package app.twallet.air.uiwidgets.configurations

import android.content.Context
import app.twallet.air.uicomponents.base.WViewController

abstract class WidgetConfigurationVC(
    context: Context
) : WViewController(context) {

    abstract val appWidgetId: Int
    abstract val onResult: (ok: Boolean) -> Unit

}
