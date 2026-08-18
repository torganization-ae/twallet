package app.twallet.air.walletcontext.cacheStorage

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit
import org.json.JSONArray
import java.io.File

/**
 * Small flags stay in SharedPreferences. Bulky non-secret cache (token prices, swap list,
 * NFTs, charts) lives as files — same split as web: localStorage for tiny state, IndexedDB
 * for the token/price registry.
 */
object WCacheStorage {
    private lateinit var sharedPreferences: SharedPreferences
    private lateinit var blobsDir: File

    private const val CACHE_PREF_NAME = "airCache"
    private const val CACHE_PREF_TOKENS = "tokens"
    private const val CACHE_PREF_SWAP_ASSETS = "swapAssets"

    private const val CACHE_PREF_NFTS = "nfts."
    private const val CACHE_PREF_NFT_COLLECTIONS = "nftCollections."
    private const val CACHE_PREF_HAS_HIDDEN_NFT = "hasHiddenNFT."
    private const val CACHE_PREF_EXPLORE = "exploreHistory."
    private const val CACHE_PREF_PORTFOLIO = "portfolio."
    private const val CACHE_INITIAL_SCREEN = "initialScreen"

    fun init(context: Context) {
        sharedPreferences = context.getSharedPreferences(CACHE_PREF_NAME, Context.MODE_PRIVATE)
        blobsDir = File(context.filesDir, "airCache")
        blobsDir.mkdirs()
        migratePrefsBlobsToFiles()
    }

    fun getTokens(): String? = readBlob(CACHE_PREF_TOKENS)

    fun setTokens(value: String?) = writeBlob(CACHE_PREF_TOKENS, value)

    fun getSwapAssets(): String? = readBlob(CACHE_PREF_SWAP_ASSETS)

    fun setSwapAssets(value: String?) = writeBlob(CACHE_PREF_SWAP_ASSETS, value)

    fun getNfts(accountId: String): String? = readBlob(CACHE_PREF_NFTS + sanitize(accountId))

    fun setNfts(accountId: String, value: String?) {
        writeBlob(CACHE_PREF_NFTS + sanitize(accountId), value)
    }

    fun getHasHiddenNft(accountId: String): Boolean? {
        val key = CACHE_PREF_HAS_HIDDEN_NFT + accountId
        return if (sharedPreferences.contains(key)) {
            sharedPreferences.getBoolean(key, false)
        } else {
            null
        }
    }

    fun setHasHiddenNft(accountId: String, value: Boolean?) {
        sharedPreferences.edit {
            value?.let {
                putBoolean(CACHE_PREF_HAS_HIDDEN_NFT + accountId, value)
            } ?: run {
                remove(CACHE_PREF_HAS_HIDDEN_NFT + accountId)
            }
        }
    }

    fun getNftCollections(accountId: String): String? =
        readBlob(CACHE_PREF_NFT_COLLECTIONS + sanitize(accountId))

    fun setNftCollections(accountId: String, value: String?) {
        writeBlob(CACHE_PREF_NFT_COLLECTIONS + sanitize(accountId), value)
    }

    fun getExploreHistory(accountId: String): String? =
        readBlob(CACHE_PREF_EXPLORE + sanitize(accountId))

    fun setExploreHistory(accountId: String, value: String?) {
        writeBlob(CACHE_PREF_EXPLORE + sanitize(accountId), value)
    }

    fun getPortfolio(key: String): String? = readBlob(CACHE_PREF_PORTFOLIO + sanitize(key))

    fun setPortfolio(key: String, value: String?) {
        writeBlob(CACHE_PREF_PORTFOLIO + sanitize(key), value)
    }

    fun getPriceHistory(tokenSlug: String, period: String): Array<Array<Double>>? {
        val raw = readBlob(priceHistoryName(tokenSlug, period)) ?: return null
        return try {
            val jsonArray = JSONArray(raw)
            Array(jsonArray.length()) { i ->
                val innerArray = jsonArray.getJSONArray(i)
                Array(innerArray.length()) { j -> innerArray.getDouble(j) }
            }
        } catch (_: Throwable) {
            null
        }
    }

    fun setPriceHistory(tokenSlug: String, period: String, data: Array<Array<Double>>?) {
        if (data == null) {
            writeBlob(priceHistoryName(tokenSlug, period), null)
            return
        }
        val json = JSONArray().apply {
            data.forEach { inner -> put(JSONArray(inner.toList())) }
        }
        writeBlob(priceHistoryName(tokenSlug, period), json.toString())
    }

    fun clearPriceHistory() {
        blobsDir.listFiles()?.forEach { file ->
            if (file.name.startsWith("priceHistory.")) file.delete()
        }
    }

    private fun removePortfolioByKeyPrefix(keyPrefix: String) {
        val filePrefix = CACHE_PREF_PORTFOLIO + sanitize(keyPrefix)
        blobsDir.listFiles()?.forEach { file ->
            if (file.name.startsWith(filePrefix)) file.delete()
        }
        val prefPrefix = CACHE_PREF_PORTFOLIO + keyPrefix
        val toRemove = sharedPreferences.all.keys.filter { it.startsWith(prefPrefix) }
        if (toRemove.isNotEmpty()) {
            sharedPreferences.edit { toRemove.forEach { remove(it) } }
        }
    }

    fun cleanPortfolio(accountId: String) {
        removePortfolioByKeyPrefix(PortfolioCacheKey.accountPrefix(accountId))
    }

    fun cleanPortfolioChart(accountId: String, methodName: String, periodValue: String) {
        removePortfolioByKeyPrefix(
            PortfolioCacheKey.chartPrefix(accountId, methodName, periodValue)
        )
    }

    enum class InitialScreen(val value: Int) {
        INTRO(0),
        HOME(1),
        LOCK(2);
    }

    private var cachedInitialScreen: InitialScreen? = null

    fun getInitialScreen(): InitialScreen? {
        return cachedInitialScreen ?: run {
            val value = sharedPreferences.getInt(CACHE_INITIAL_SCREEN, InitialScreen.INTRO.value)
            InitialScreen.entries.firstOrNull { it.value == value }
                ?.also { cachedInitialScreen = it }
        }
    }

    fun setInitialScreen(initialScreen: InitialScreen) {
        if (cachedInitialScreen == initialScreen) return

        cachedInitialScreen = initialScreen
        sharedPreferences.edit {
            putInt(CACHE_INITIAL_SCREEN, initialScreen.value)
        }
    }

    fun clean(accountIds: Array<String>) {
        for (accountId in accountIds) {
            clean(accountId)
        }
    }

    /** Legacy key read for storage migrations only (staking cache is no longer written). */
    fun getLegacyStakingData(accountId: String): String? {
        return sharedPreferences.getString("stakingData.$accountId", null)
    }

    fun clearAllStakingData() {
        val editor = sharedPreferences.edit()
        sharedPreferences.all.keys
            .filter { it.startsWith("stakingData.") }
            .forEach { editor.remove(it) }
        editor.apply()
    }

    fun clean(accountId: String) {
        setNfts(accountId, null)
        setNftCollections(accountId, null)
        setHasHiddenNft(accountId, null)
        setExploreHistory(accountId, null)
        cleanPortfolio(accountId)
    }

    private fun priceHistoryName(tokenSlug: String, period: String) =
        "priceHistory.${sanitize(tokenSlug)}.$period"

    private fun sanitize(name: String): String =
        name.replace(Regex("""[^\w.\-]+"""), "_")

    private fun readBlob(name: String): String? {
        val file = File(blobsDir, name)
        if (!file.exists()) return null
        return try {
            file.readText()
        } catch (_: Throwable) {
            null
        }
    }

    private fun writeBlob(name: String, value: String?) {
        val file = File(blobsDir, name)
        if (value == null) {
            file.delete()
            return
        }
        val tmp = File(blobsDir, "$name.tmp")
        try {
            tmp.writeText(value)
            if (!tmp.renameTo(file)) {
                file.writeText(value)
                tmp.delete()
            }
        } catch (_: Throwable) {
            tmp.delete()
        }
    }

    private fun migratePrefsBlobsToFiles() {
        fun take(key: String) {
            val value = sharedPreferences.getString(key, null) ?: return
            writeBlob(sanitize(key), value)
            sharedPreferences.edit { remove(key) }
        }
        take(CACHE_PREF_TOKENS)
        take(CACHE_PREF_SWAP_ASSETS)
        sharedPreferences.all.keys.toList().forEach { key ->
            if (
                key.startsWith(CACHE_PREF_NFTS) ||
                key.startsWith(CACHE_PREF_NFT_COLLECTIONS) ||
                key.startsWith(CACHE_PREF_EXPLORE) ||
                key.startsWith(CACHE_PREF_PORTFOLIO)
            ) {
                take(key)
            }
        }
    }
}
