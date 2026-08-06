package app.twallet.air.uicomponents.widgets.menu

import android.content.Context
import android.graphics.Rect
import androidx.core.graphics.Insets
import androidx.core.view.children
import app.twallet.air.uicomponents.base.WWindow
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.PopupHelpers
import app.twallet.air.uicomponents.widgets.WFrameLayout
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import java.lang.ref.WeakReference

class WPopupHost(context: Context) : WFrameLayout(context), WThemedView {

    private val safeAreaBounds: Rect = Rect()
    private var windowRef: WeakReference<WWindow>? = null
    val windowView: WView? get() = windowRef?.get()?.windowView

    fun attachWindow(window: WWindow) {
        windowRef = WeakReference(window)
        PopupHelpers.attachPopupHost(this)
    }

    fun getContentAreaBounds(): Rect {
        val extraPadding = 8.dp
        val insets = windowRef?.get()?.systemBars ?: Insets.NONE
        return Rect(
            insets.left + extraPadding,
            insets.top + extraPadding,
            measuredWidth - (insets.right + extraPadding),
            measuredHeight - (insets.bottom + safeAreaBounds.bottom)
        )
    }

    override fun updateTheme() {
        children.filterIsInstance<WThemedView>().forEach { it.updateTheme() }
    }
}
