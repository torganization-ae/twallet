package app.twallet.air.uicomponents.widgets.segmentedController

import android.view.View
import app.twallet.air.uicomponents.base.WViewController

data class WSegmentedControllerItem(
    val viewController: WViewController,
    val identifier: String?,
    val color: Int? = null,
    var onRemovePressed: ((v: View) -> Unit)? = null,
    var onMenuPressed: ((v: View) -> Unit)? = null,
)
