package app.twallet.air.walletcore.stores

import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.MApiTransaction
import org.json.JSONObject

/**
 * Tracks which networks are hidden in Settings → Networks.
 * Activity history (and related UI) should only cover enabled chains.
 */
object ChainVisibilityStore : IStore {
    @Volatile
    private var hiddenByNetwork: Map<String, Set<String>> = emptyMap()

    fun update(hiddenChainsByNetwork: Map<String, List<String>>) {
        hiddenByNetwork = hiddenChainsByNetwork.mapValues { (_, chains) -> chains.toSet() }
    }

    fun updateFromJson(json: JSONObject?) {
        if (json == null) {
            hiddenByNetwork = emptyMap()
            return
        }
        val parsed = mutableMapOf<String, Set<String>>()
        val keys = json.keys()
        while (keys.hasNext()) {
            val network = keys.next()
            val array = json.optJSONArray(network) ?: continue
            val chains = buildSet {
                for (i in 0 until array.length()) {
                    val chain = array.optString(i)
                    if (chain.isNotEmpty()) add(chain)
                }
            }
            parsed[network] = chains
        }
        hiddenByNetwork = parsed
    }

    fun isHidden(chain: String, network: String): Boolean {
        return hiddenByNetwork[network]?.contains(chain) == true
    }

    fun isActivityVisible(activity: MApiTransaction, network: String): Boolean {
        return activityChains(activity).all { !isHidden(it, network) }
    }

    private fun activityChains(activity: MApiTransaction): List<String> {
        return when (activity) {
            is MApiTransaction.Transaction -> listOfNotNull(chainForSlug(activity.slug))
            is MApiTransaction.Swap -> listOfNotNull(
                chainForSlug(activity.from),
                chainForSlug(activity.to),
            ).distinct()
        }
    }

    private fun chainForSlug(slug: String): String? {
        TokenStore.getToken(slug)?.chain?.let { return it }
        val parts = slug.split("-", limit = 2)
        if (parts.size == 2) {
            return MBlockchain.valueOfOrNull(parts[0])?.name
        }
        return MBlockchain.entries.firstOrNull { it.nativeSlug == slug }?.name
    }

    override fun wipeData() {
        hiddenByNetwork = emptyMap()
    }

    override fun clearCache() {
        // Visibility is persisted settings, not ephemeral cache
    }
}
