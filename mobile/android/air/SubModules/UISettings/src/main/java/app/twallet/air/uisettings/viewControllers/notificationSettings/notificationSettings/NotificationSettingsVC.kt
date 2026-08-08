package app.twallet.air.uisettings.viewControllers.notificationSettings

import android.content.Context
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.LinearLayoutManagerAccurateOffset
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.uisettings.viewControllers.notificationSettings.cells.NotificationSettingsFooterCell
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.IndexPath
import java.lang.ref.WeakReference

class NotificationSettingsVC(
    context: Context,
) :
    WViewController(context),
    WRecyclerViewAdapter.WRecyclerViewDataSource {
    override val TAG = "NotificationSettings"

    override val shouldDisplayBottomBar = true

    companion object {
        val FOOTER_CELL = WCell.Type(1)
    }

    private val rvAdapter =
        WRecyclerViewAdapter(WeakReference(this), arrayOf(FOOTER_CELL))

    private val recyclerView: WRecyclerView by lazy {
        val rv = WRecyclerView(this)
        rv.adapter = rvAdapter
        val layoutManager = LinearLayoutManagerAccurateOffset(context)
        layoutManager.isSmoothScrollbarEnabled = true
        rv.setLayoutManager(layoutManager)
        rv.setItemAnimator(null)
        rv.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                if (dx == 0 && dy == 0)
                    return
                updateBlurViews(recyclerView)
            }

            override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
                super.onScrollStateChanged(recyclerView, newState)
                if (recyclerView.scrollState != RecyclerView.SCROLL_STATE_IDLE)
                    updateBlurViews(recyclerView)
            }
        })
        rv
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle(LocaleController.getString("Sounds"))
        setupNavBar(true)

        view.addView(recyclerView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        recyclerView.clipToPadding = false

        updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        recyclerView.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + ViewConstants.ADDITIONAL_TABLET_PADDING + systemBarStartInset,
            navigationBar?.calculatedMinHeight ?: 0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            (navigationController?.bottomInset ?: 0)
        )
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
    }

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int {
        return 1
    }

    override fun recyclerViewNumberOfItems(
        rv: RecyclerView,
        section: Int
    ): Int {
        return 1
    }

    override fun recyclerViewCellType(
        rv: RecyclerView,
        indexPath: IndexPath
    ): WCell.Type {
        return FOOTER_CELL
    }

    override fun recyclerViewCellView(
        rv: RecyclerView,
        cellType: WCell.Type
    ): WCell {
        return NotificationSettingsFooterCell(context)
    }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        (cellHolder.cell as NotificationSettingsFooterCell).configure()
    }
}
