package app.twallet.air.walletcore.stores

interface IStore {
    // Remove all data and cache (removed all wallets)
    fun wipeData()

    // Remove cached data (switching to Classic)
    fun clearCache()
}
