package app.twallet.air.walletcore.stores

import app.twallet.air.walletcontext.cacheStorage.WCacheStorage
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.MExploreHistory
import java.util.concurrent.Executors

object ExploreHistoryStore : IStore {

    private const val VISITED_SITES_LIMIT = 10

    private val adapter by lazy { WalletCore.moshi.adapter(MExploreHistory::class.java) }
    private var accountId = AccountStore.activeAccountId

    @Volatile
    var exploreHistory: MExploreHistory? = null
        private set
    private var cacheExecutor = Executors.newSingleThreadExecutor()

    fun loadBrowserHistory(accountId: String) {
        this.accountId = accountId
        exploreHistory = null
        cacheExecutor.execute {
            val exploreHistoryString = WCacheStorage.getExploreHistory(accountId)
            val loaded = exploreHistoryString?.let {
                val adapter = WalletCore.moshi.adapter(MExploreHistory::class.java)
                adapter.fromJson(exploreHistoryString)
            } ?: MExploreHistory()
            trimVisitedSites(loaded)
            exploreHistory = loaded
        }
    }

    fun saveSearchHistory(text: String) {
        exploreHistory?.searchHistory?.removeAll {
            it.title.lowercase() == text.lowercase()
        }
        exploreHistory?.searchHistory?.add(
            0, MExploreHistory.HistoryItem(text, System.currentTimeMillis())
        )
        saveBrowserHistory(accountId, exploreHistory)
    }

    fun saveSiteVisit(visitedSite: MExploreHistory.VisitedSite) {
        exploreHistory?.visitedSites?.removeAll {
            it.url.lowercase() == visitedSite.url.lowercase()
        }
        exploreHistory?.visitedSites?.add(0, visitedSite)
        trimVisitedSites(exploreHistory)
        saveBrowserHistory(accountId, exploreHistory)
    }

    private fun trimVisitedSites(history: MExploreHistory?) {
        val visitedSites = history?.visitedSites ?: return
        while (visitedSites.size > VISITED_SITES_LIMIT) {
            visitedSites.removeAt(visitedSites.lastIndex)
        }
    }

    fun clearAccountHistory() {
        exploreHistory = MExploreHistory()
        saveBrowserHistory(accountId, exploreHistory)
    }

    private fun saveBrowserHistory(accountId: String?, browserHistory: MExploreHistory?) {
        if (AccountStore.activeAccountId != accountId)
            return
        accountId?.let {
            WCacheStorage.setExploreHistory(accountId, adapter.toJson(browserHistory))
        }
    }

    override fun wipeData() {
        clearCache()
    }

    override fun clearCache() {
        accountId = null
        exploreHistory = null
        cacheExecutor.shutdownNow()
        cacheExecutor = Executors.newSingleThreadExecutor()
    }
}
