package app.twallet.air.uibrowser.viewControllers.explore

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.Gravity
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.core.net.toUri
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uibrowser.viewControllers.explore.cells.ExploreCategoryCell
import app.twallet.air.uibrowser.viewControllers.explore.cells.ExploreCategoryTitleCell
import app.twallet.air.uibrowser.viewControllers.explore.cells.ExploreConnectedCell
import app.twallet.air.uibrowser.viewControllers.explore.cells.ExploreRecentlyViewedCell
import app.twallet.air.uibrowser.viewControllers.explore.cells.ExploreTitleCell
import app.twallet.air.uibrowser.viewControllers.exploreCategory.ExploreCategoryVC
import app.twallet.air.uibrowser.viewControllers.search.SearchVC
import app.twallet.air.uicomponents.R
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.WEmptyIconView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.widgets.SwapSearchEditText
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.uicomponents.widgets.fadeIn
import app.twallet.air.uicomponents.widgets.fadeOut
import app.twallet.air.uiinappbrowser.InAppBrowserVC
import app.twallet.air.uisettings.viewControllers.connectedApps.ConnectedAppsVC
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.logger.Logger
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.IndexPath
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.InAppBrowserConfig
import app.twallet.air.walletcore.models.MExploreCategory
import app.twallet.air.walletcore.models.MExploreHistory
import app.twallet.air.walletcore.models.MExploreSite
import app.twallet.air.walletcore.moshi.ApiDapp
import app.twallet.air.walletcore.stores.ExploreHistoryStore
import java.lang.ref.WeakReference

@SuppressLint("ViewConstructor")
class ExploreVC(
    context: Context
) : WViewController(context),
    WRecyclerViewAdapter.WRecyclerViewDataSource,
    ExploreVM.Delegate {
    override val TAG = "Explore"

    override var ignoreSideGuttering: Boolean = false

    companion object {
        val EXPLORE_HEADER_CELL = WCell.Type(1)
        val EXPLORE_TITLE_CELL = WCell.Type(2)
        val EXPLORE_CONNECTED_ROW_CELL = WCell.Type(3)
        val EXPLORE_CATEGORY_CELL = WCell.Type(4)
        val EXPLORE_RECENT_CELL = WCell.Type(5)

        const val SECTION_HEADER = 0
        const val SECTION_RECENT = 1
        const val SECTION_CONNECTED = 2
        const val SECTION_CATEGORIES = 3

        private const val RECENTLY_VIEWED_LIMIT = 10
    }

    override val shouldDisplayTopBar = false

    private var pendingTarget: Uri? = null

    private val exploreVM by lazy {
        ExploreVM(this)
    }

    private val rvAdapter =
        WRecyclerViewAdapter(
            WeakReference(this),
            arrayOf(
                EXPLORE_HEADER_CELL,
                EXPLORE_TITLE_CELL,
                EXPLORE_CONNECTED_ROW_CELL,
                EXPLORE_CATEGORY_CELL,
                EXPLORE_RECENT_CELL,
            )
        )

    private var emptyView: WEmptyIconView? = null

    private val recyclerView: WRecyclerView by lazy {
        val layoutManager = GridLayoutManager(context, 1)
        val rv = WRecyclerView(this)
        rv.adapter = rvAdapter
        layoutManager.isSmoothScrollbarEnabled = true
        layoutManager.spanSizeLookup =
            object : GridLayoutManager.SpanSizeLookup() {
                override fun getSpanSize(position: Int): Int = 1
            }
        rv.layoutManager = layoutManager
        rv.addOnScrollListener(
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
                    if (recyclerView.computeVerticalScrollOffset() > 40.dp) {
                        setNavTitle(LocaleController.getString("Explore"))
                        setTopBlur(true, animated = true)
                    } else {
                        setNavTitle("")
                        setTopBlur(false, animated = true)
                    }
                }
            }
        )
        rv.clipToPadding = false
        rv
    }

    init {
        WalletCore.doOnBridgeReady {
            exploreVM.delegateIsReady()
        }
    }

    override fun setupViews() {
        super.setupViews()

        setupNavBar(true)
        setTopBlur(visible = false, animated = false)
        navigationBar?.setTitleGravity(Gravity.START)

        view.addView(recyclerView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        view.setConstraints {
            allEdges(recyclerView)
        }

        updateEmptyView()

        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
        rvAdapter.updateTheme()
    }

    override fun viewDidEnterForeground() {
        super.viewDidEnterForeground()
        if (exploreVM.showingExploreCategories != null) {
            rvAdapter.reloadData()
        }
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        val topPadding = (navigationController?.getSystemBars()?.top ?: 0)
        recyclerView.setPaddingLocalized(
            additionalTabletPadding + systemBarStartInset,
            topPadding,
            systemBarEndInset,
            navigationController?.bottomInset ?: 0
        )
        bottomReversedCornerView?.setHorizontalPadding(ViewConstants.HORIZONTAL_PADDINGS.dp.toFloat())
        rvAdapter.reloadData()
    }

    override fun scrollToTop() {
        super.scrollToTop()
        recyclerView.layoutManager?.smoothScrollToPosition(recyclerView, null, 0)
    }

    override fun viewWillDisappear() {
        // We don't want to hide keyboard on search, so super.viewWillDisappear is not called here.
        Logger.i(Logger.LogTag.SCREEN, "VCWillDisappear: $TAG ${hashCode()}")
        isDisappeared = true
    }

    private fun onSiteTap(app: MExploreSite) {
        pendingTarget = null
        if (app.url.isNullOrEmpty()) {
            return
        }
        val uri = app.uri ?: return
        openTargetUri(app, uri)
    }

    private fun onVisitedSiteTap(site: MExploreHistory.VisitedSite) {
        val url = site.url
        if (url.isBlank()) return
        val inAppBrowserVC =
            InAppBrowserVC(
                context,
                navigationController?.tabBarController,
                InAppBrowserConfig(
                    url = url,
                    title = site.title,
                    thumbnail = site.favicon,
                    injectDappConnect = true,
                    saveInVisitedHistory = true,
                )
            )
        val window = window ?: return
        val nav = WNavigationController(window)
        nav.setRoot(inAppBrowserVC)
        window.present(nav)
    }

    private fun onCategoryTap(category: MExploreCategory) {
        val categoryVC = ExploreCategoryVC(context, category)
        navigationController?.tabBarController?.mainNavigationController?.push(categoryVC)
    }

    override fun onBackPressed(): Boolean {
        (window?.window?.currentFocus as? SwapSearchEditText)?.let {
            it.clearFocus()
            return false
        }
        return super.onBackPressed()
    }

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int = 4

    val showLargeConnectedApps: Boolean
        get() {
            return (exploreVM.connectedSites?.size ?: 0) > 3
        }

    private val recentlyViewedSites: List<MExploreHistory.VisitedSite>
        get() =
            ExploreHistoryStore.exploreHistory
                ?.visitedSites
                ?.take(RECENTLY_VIEWED_LIMIT)
                ?: emptyList()

    override fun recyclerViewNumberOfItems(rv: RecyclerView, section: Int): Int {
        if (exploreVM.showingExploreCategories == null) {
            return 0
        }
        when (section) {
            SECTION_HEADER -> {
                return 1
            }

            SECTION_RECENT -> {
                return if (recentlyViewedSites.isEmpty()) 0 else 2
            }

            SECTION_CONNECTED -> {
                return if (exploreVM.connectedSites.isNullOrEmpty()) {
                    0
                } else {
                    2
                }
            }

            SECTION_CATEGORIES -> {
                return exploreVM.showingExploreCategories?.size ?: 0
            }

            else -> {
                throw Exception()
            }
        }
    }

    override fun recyclerViewCellType(
        rv: RecyclerView,
        indexPath: IndexPath
    ): WCell.Type =
        when {
            indexPath.section == SECTION_HEADER -> EXPLORE_HEADER_CELL

            indexPath.section == SECTION_RECENT && indexPath.row == 0 -> EXPLORE_TITLE_CELL
            indexPath.section == SECTION_RECENT -> EXPLORE_RECENT_CELL

            indexPath.section == SECTION_CONNECTED && indexPath.row == 0 -> EXPLORE_TITLE_CELL

            indexPath.section == SECTION_CONNECTED -> EXPLORE_CONNECTED_ROW_CELL

            else -> EXPLORE_CATEGORY_CELL
        }

    override fun recyclerViewCellView(rv: RecyclerView, cellType: WCell.Type): WCell =
        when (cellType) {
            EXPLORE_HEADER_CELL -> {
                ExploreTitleCell(context)
            }

            EXPLORE_TITLE_CELL -> {
                ExploreCategoryTitleCell(context)
            }

            EXPLORE_CONNECTED_ROW_CELL -> {
                ExploreConnectedCell(context, dAppPressed = {
                    onDAppTap(it)
                }) {
                    pushConfigure()
                }
            }

            EXPLORE_RECENT_CELL -> {
                ExploreRecentlyViewedCell(context) { site ->
                    onVisitedSiteTap(site)
                }
            }

            else -> {
                ExploreCategoryCell(
                    context,
                    {
                        onSiteTap(it)
                    }
                ) {
                    onCategoryTap(it)
                }
            }
        }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        when (cellHolder.cell) {
            is ExploreTitleCell -> {
                (cellHolder.cell as ExploreTitleCell).configure(
                    LocaleController.getString("Explore"),
                    38.dp,
                    48.dp
                )
            }

            is ExploreConnectedCell -> {
                (cellHolder.cell as ExploreConnectedCell).configure(
                    exploreVM.connectedSites ?: emptyArray()
                )
            }

            is ExploreCategoryTitleCell -> {
                val title =
                    when (indexPath.section) {
                        SECTION_RECENT -> "Recently Viewed"
                        else -> "Connected Apps"
                    }
                val bottomPadding =
                    when (indexPath.section) {
                        SECTION_CONNECTED -> if (showLargeConnectedApps) 7.dp else 11.dp
                        else -> 11.dp
                    }
                (cellHolder.cell as ExploreCategoryTitleCell).apply {
                    configure(
                        LocaleController.getString(title),
                        10.dp,
                        bottomPadding
                    )
                }
            }

            is ExploreRecentlyViewedCell -> {
                (cellHolder.cell as ExploreRecentlyViewedCell).configure(recentlyViewedSites)
            }

            is ExploreCategoryCell -> {
                (cellHolder.cell as ExploreCategoryCell).configure(
                    exploreVM.showingExploreCategories!!.getOrNull(indexPath.row)
                )
            }
        }
    }

    override fun updateEmptyView() {
        if (exploreVM.showingExploreCategories == null) {
            if ((emptyView?.alpha ?: 0f) > 0) {
                emptyView?.fadeOut()
            }
        } else if (exploreVM.showingExploreCategories!!.isEmpty()) {
            // switch from loading view to wallet created view
            if (emptyView == null) {
                emptyView =
                    WEmptyIconView(
                        context,
                        R.raw.animation_empty,
                        LocaleController.getString("No Dapps Found!")
                    )
                view.addView(emptyView!!, ConstraintLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
                view.setConstraints {
                    toCenterX(emptyView!!)
                    toCenterY(emptyView!!)
                }
            } else if ((emptyView?.alpha ?: 0f) < 1) {
                if (emptyView?.startedAnimation == true) {
                    emptyView?.fadeIn()
                }
            }
        } else {
            if ((emptyView?.alpha ?: 0f) > 0) {
                emptyView?.fadeOut()
            }
        }
    }

    override fun sitesUpdated() {
        if (ignoreSideGuttering) {
            ignoreSideGuttering = false
            topReversedCornerView?.setHorizontalPadding(ViewConstants.HORIZONTAL_PADDINGS.dp.toFloat())
        }
        rvAdapter.reloadData()
        pendingTarget?.let { findSiteAndOpenTargetUri(it) }
    }

    override fun accountChanged() {
        navigationController?.popToRoot(false)
    }

    // SUGGESTIONS //////////
    var searchVC: SearchVC? = null
    var isShowingSearch = false
    fun search(query: String?, isFocused: Boolean) {
        val keyword = query ?: ""
        val searchResult = exploreVM.search(keyword)
        val shouldShowSearchScreen =
            !query.isNullOrEmpty() ||
                (
                    isFocused &&
                        query.isNullOrEmpty() &&
                        !ExploreHistoryStore.exploreHistory?.searchHistory.isNullOrEmpty()
                )
        if (!shouldShowSearchScreen) {
            searchVC?.keepKeyboardOpenOnDismiss = true
            navigationController?.popToRoot(false)
            isShowingSearch = false
            return
        }
        if (!isShowingSearch || searchVC?.isDisappeared == true) {
            isShowingSearch = true
            searchVC = SearchVC(context)
            navigationController?.push(searchVC!!, false)
        }
        searchVC?.updateSearchResult(searchResult)
        exploreVM.searchWalletInfo(searchResult) { updated ->
            if (exploreVM.currentSearchKeyword == keyword) {
                searchVC?.updateSearchResult(updated)
            }
        }
    }

    private fun onDAppTap(it: ApiDapp?) {
        it?.let {
            val url = it.url ?: return
            if (it.sse != null) {
                val intent = Intent(Intent.ACTION_VIEW)
                intent.setData(url.toUri())
                try {
                    window?.startActivity(intent)
                } catch (_: Exception) {
                }
                return
            }
            val window = window ?: return
            val inAppBrowserVC =
                InAppBrowserVC(
                    context,
                    navigationController?.tabBarController,
                    InAppBrowserConfig(
                        url = url,
                        title = it.name,
                        thumbnail = it.iconUrl,
                        injectDappConnect = true,
                        saveInVisitedHistory = true,
                    )
                )
            val nav = WNavigationController(window)
            nav.setRoot(inAppBrowserVC)
            window.present(nav)
        } ?: run {
            pushConfigure()
        }
    }

    private fun pushConfigure() {
        navigationController?.tabBarController?.mainNavigationController?.push(
            ConnectedAppsVC(context)
        )
    }

    fun findSiteAndOpenTargetUri(targetUri: Uri) {
        val sites = exploreVM.allSites
        if (sites == null) {
            pendingTarget = targetUri
            return
        }
        pendingTarget = null

        val targetHost = targetUri.host?.lowercase()
        if (targetHost.isNullOrEmpty()) {
            return
        }

        val matchedSite =
            sites.firstOrNull { site ->
                site.url
                    ?.toUri()
                    ?.host
                    ?.lowercase() == targetHost
            } ?: return

        openTargetUri(matchedSite, targetUri)
    }

    private fun openTargetUri(app: MExploreSite, uri: Uri) {
        val window = this.window ?: return
        if (app.isExternal || (uri.scheme != "http" && uri.scheme != "https") || app.isTelegram) {
            try {
                window.startActivity(
                    Intent(Intent.ACTION_VIEW).apply {
                        setData(uri)
                    }
                )
            } catch (_: Exception) {
            }
            return
        }
        val inAppBrowserVC =
            InAppBrowserVC(
                context,
                navigationController?.tabBarController,
                InAppBrowserConfig(
                    url = uri.toString(),
                    title = app.name,
                    thumbnail = app.iconUrl,
                    injectDappConnect = true,
                    saveInVisitedHistory = true,
                )
            )
        window.present(
            WNavigationController(window).apply {
                setRoot(inAppBrowserVC)
            }
        )
    }
}
