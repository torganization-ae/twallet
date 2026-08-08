package app.twallet.uihome.tabs.views

import android.content.Context
import android.view.View
import android.widget.FrameLayout
import app.twallet.air.uicomponents.widgets.WThemedView

abstract class IBottomNavigationView(context: Context) : FrameLayout(context), WThemedView {

    companion object {
        const val ID_HOME = 1
        const val ID_EXPLORE = 3
        const val ID_SETTINGS = 4
        const val ID_TMAIL = 5
    }

    interface Listener {
        /**
         * Called when a tab is selected. Return true to accept, false to reject.
         * [isReselect] is true when the already-selected tab is tapped again.
         */
        fun onTabSelected(itemId: Int, isReselect: Boolean): Boolean
    }

    abstract var listener: Listener?

    abstract var selectedItemId: Int

    abstract fun insetsUpdated(bottomInset: Int)

    abstract fun setTabsEnabled(enabled: Boolean)

    open fun getSettingsItemView(): View? = null

    open fun getTabItemView(itemId: Int): View? = null

    open fun getMinimizedWidth(): Int? = null

    open fun pauseBlurring() {}
    open fun resumeBlurring() {}
    open val pausedBlurViews: Boolean get() = false
}
