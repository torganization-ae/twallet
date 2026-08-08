package app.twallet.air.uibrowser.viewControllers.exploreCategory

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uibrowser.viewControllers.exploreCategory.cells.ExploreCategorySiteCell
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.LastItemPaddingDecoration
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.IndexPath
import app.twallet.air.walletcore.models.InAppBrowserConfig
import app.twallet.air.walletcore.models.MExploreCategory
import app.twallet.air.walletcore.models.MExploreSite
import java.lang.ref.WeakReference

class ExploreCategoryVC(
    context: Context,
    val category: MExploreCategory
) : WViewController(context),
    WRecyclerViewAdapter.WRecyclerViewDataSource {
    override val TAG = "ExploreCategory"

    companion object {
        val EXPLORE_SITE_CELL = WCell.Type(1)
    }

    override val shouldDisplayTopBar = true
    override val shouldDisplayBottomBar = true

    override var title = category.name

    private val rvAdapter =
        WRecyclerViewAdapter(
            WeakReference(this),
            arrayOf(EXPLORE_SITE_CELL)
        )

    private val scrollListener =
        object : RecyclerView.OnScrollListener() {
            override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
                super.onScrollStateChanged(recyclerView, newState)
                if (recyclerView.computeVerticalScrollOffset() == 0) {
                    updateBlurViews(recyclerView)
                }
            }

            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                if (dx == 0 && dy == 0) {
                    return
                }
                updateBlurViews(recyclerView)
            }
        }

    private val recyclerView: WRecyclerView by lazy {
        val rv = WRecyclerView(this)
        rv.adapter = rvAdapter
        val layoutManager = LinearLayoutManager(context)
        layoutManager.isSmoothScrollbarEnabled = true
        rv.layoutManager = layoutManager
        rv.setLayoutManager(layoutManager)
        rv.addItemDecoration(
            LastItemPaddingDecoration(
                navigationController?.getSystemBars()?.bottom ?: 0
            )
        )
        rv.addOnScrollListener(scrollListener)
        rv.clipToPadding = false
        rv
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        recyclerView.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding + systemBarStartInset,
            navigationBar?.calculatedMinHeight ?: 0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            0
        )
        recyclerView.removeItemDecorationAt(0)
        recyclerView.addItemDecoration(
            LastItemPaddingDecoration(
                navigationController?.bottomInset ?: 0
            )
        )
    }

    override fun setupViews() {
        super.setupViews()

        setupNavBar(true)

        view.addView(recyclerView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        view.setConstraints {
            allEdges(recyclerView)
        }
        recyclerView.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding + systemBarStartInset,
            navigationBar?.calculatedMinHeight ?: 0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            0
        )

        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
    }

    private fun onSiteTap(app: MExploreSite) {
        if (app.url.isNullOrEmpty()) {
            return
        }
        if (app.isExternal ||
            (!app.url!!.startsWith("http://") && !app.url!!.startsWith("https://")) ||
            app.isTelegram
        ) {
            val intent = Intent(Intent.ACTION_VIEW)
            intent.setData(Uri.parse(app.url))
            try {
                window!!.startActivity(intent)
            } catch (_: Exception) {
            }
            return
        }
        val inAppBrowserVC =
            InAppBrowserVC(
                context,
                navigationController?.tabBarController,
                InAppBrowserConfig(
                    url = app.url!!,
                    title = app.name,
                    thumbnail = app.iconUrl,
                    injectDappConnect = true,
                    saveInVisitedHistory = true,
                )
            )
        val nav = WNavigationController(window!!)
        nav.setRoot(inAppBrowserVC)
        window!!.present(nav)
    }

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int = 1

    override fun recyclerViewNumberOfItems(rv: RecyclerView, section: Int): Int = category.sites.size

    override fun recyclerViewCellType(rv: RecyclerView, indexPath: IndexPath): WCell.Type = EXPLORE_SITE_CELL

    override fun recyclerViewCellView(rv: RecyclerView, cellType: WCell.Type): WCell {
        val weakThis = WeakReference(this)
        return ExploreCategorySiteCell(context) {
            weakThis.get()?.onSiteTap(it)
        }
    }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        (cellHolder.cell as ExploreCategorySiteCell).configure(
            category.sites[indexPath.row],
            indexPath.row == 0,
            indexPath.row == category.sites.size - 1
        )
    }

    override fun onDestroy() {
        super.onDestroy()
        recyclerView.removeOnScrollListener(scrollListener)
    }
}
