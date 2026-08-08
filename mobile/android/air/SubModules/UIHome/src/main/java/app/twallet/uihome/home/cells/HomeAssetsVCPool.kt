package app.twallet.uihome.home.cells

import android.content.Context
import app.twallet.air.uiassets.viewControllers.assets.AssetsVC
import app.twallet.air.uiassets.viewControllers.tokens.TokensVC
import app.twallet.air.uicomponents.base.WNavigationController
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.base.WWindow

/**
 * Owns home assets ViewControllers ([TokensVC], collectibles [AssetsVC], pinned collections) so
 * they outlive [HomePhoneAssetsCell] rebuilds (e.g. account swipe prev/current/next). A cell pulls
 * VCs from the pool, mounts their views, and re-points per-host callbacks via [IHomeAssetsHost].
 * The pool is the single place that ever calls [WViewController.onDestroy] on them (see [destroy]).
 *
 * Constructor callbacks of [TokensVC]/[AssetsVC] are immutable (`private val`), so they are wired
 * here once to forward to the current [host].
 */
class HomeAssetsVCPool(
    private val context: Context,
    private val window: WWindow,
    private val navigationController: WNavigationController,
    private var accountId: String,
) {
    var host: IHomeAssetsHost? = null

    private val tokensVCLazy = lazy {
        TokensVC(
            context,
            accountId,
            TokensVC.Mode.HOME,
            onHeightChanged = { host?.onVcHeightChanged() },
            onAssetsShown = { host?.onVcAssetsShown(tokensVC) },
            onScroll = { host?.onVcScroll(tokensVC) },
        ).apply {
            navigationController = this@HomeAssetsVCPool.navigationController
        }
    }
    val tokensVC: TokensVC by tokensVCLazy

    private val collectiblesVCLazy = lazy {
        AssetsVC(
            context,
            accountId,
            AssetsVC.ViewMode.THUMB,
            injectedWindow = window,
            isShowingSingleCollection = false,
            onHeightChanged = { host?.onVcHeightChanged() },
            onScroll = { host?.onVcScroll(collectiblesVC) },
            onReorderingRequested = { host?.requestReordering(true) },
            onNftsShown = { host?.onVcNftsShown(collectiblesVC) },
            shouldAnimateHeight = { host?.areAssetsShown == true },
        ).apply {
            navigationController = this@HomeAssetsVCPool.navigationController
        }
    }
    val collectiblesVC: AssetsVC by collectiblesVCLazy

    private val pinned = LinkedHashMap<String, AssetsVC>()

    fun pinnedVC(collectionMode: AssetsVC.CollectionMode): AssetsVC {
        val key = collectionMode.cacheKey
        pinned[key]?.let { return it }
        lateinit var vc: AssetsVC
        vc = AssetsVC(
            context,
            accountId,
            AssetsVC.ViewMode.THUMB,
            injectedWindow = window,
            collectionMode = collectionMode,
            isShowingSingleCollection = false,
            onHeightChanged = { host?.onVcHeightChanged() },
            onScroll = { host?.onVcScroll(vc) },
            onReorderingRequested = { host?.requestReordering(true) },
            onNftsShown = { host?.onVcNftsShown(vc) },
            shouldAnimateHeight = { host?.areAssetsShown == true },
        ).apply {
            navigationController = this@HomeAssetsVCPool.navigationController
        }
        pinned[key] = vc
        return vc
    }

    fun evictPinned(collectionMode: AssetsVC.CollectionMode) {
        pinned.remove(collectionMode.cacheKey)?.onDestroy()
    }

    /**
     * Evicts pinned VCs whose construction account no longer matches when the shown account changes
     * (their accountId is fixed at construction). The persistent token/collectibles VCs are
     * reconfigured by the cell via their own configure(accountId).
     */
    fun onAccountChanged(newAccountId: String) {
        if (accountId == newAccountId) return
        accountId = newAccountId
        pinned.values.forEach { it.onDestroy() }
        pinned.clear()
    }

    /** The sole teardown site for the pooled ViewControllers. */
    fun destroy() {
        host = null
        if (tokensVCLazy.isInitialized()) tokensVC.onDestroy()
        if (collectiblesVCLazy.isInitialized()) collectiblesVC.onDestroy()
        pinned.values.forEach { it.onDestroy() }
        pinned.clear()
    }
}
