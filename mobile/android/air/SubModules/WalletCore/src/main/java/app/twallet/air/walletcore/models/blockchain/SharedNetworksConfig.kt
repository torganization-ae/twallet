package app.twallet.air.walletcore.models.blockchain

import android.content.Context
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * Loads `assets/networks.json` — the same file as `shared/networks.json` and the iOS resource.
 * Dynamic RPC overrides / visibility still come from the JS bridge; this loader covers
 * static metadata (defaultEnabled, apiKeyEligible, endpoints, chainIds).
 */
object SharedNetworksConfig {
    data class Endpoints(val rpc: String, val api: String)
    data class ApiKeyEligible(val rpc: Boolean, val api: Boolean)
    data class Chain(
        val title: String,
        val displayColor: String,
        val endpoints: Map<String, Endpoints>,
        val defaultEnabled: Map<String, Boolean>,
        val apiKeyEligible: ApiKeyEligible,
        val evmChainId: Map<String, Int>?,
    )

    @Volatile
    private var loaded: Map<String, Chain>? = null

    fun ensureLoaded(context: Context) {
        if (loaded != null) return
        synchronized(this) {
            if (loaded != null) return
            loaded = try {
                context.assets.open("networks.json").use { stream ->
                    val text = BufferedReader(InputStreamReader(stream)).readText()
                    parse(text)
                }
            } catch (_: Exception) {
                emptyMap()
            }
        }
    }

    fun chain(id: String): Chain? = loaded?.get(id)

    fun isApiKeyEligible(chain: String, field: String): Boolean {
        val cfg = loaded?.get(chain) ?: return false
        return if (field == "api") cfg.apiKeyEligible.api else cfg.apiKeyEligible.rpc
    }

    fun isDefaultEnabled(chain: String, network: String): Boolean {
        val cfg = loaded?.get(chain) ?: return false
        val enabled = cfg.defaultEnabled[network] ?: false
        val rpc = cfg.endpoints[network]?.rpc.orEmpty()
        return enabled && rpc.isNotEmpty()
    }

    private fun parse(text: String): Map<String, Chain> {
        val root = JSONObject(text)
        val chainsObj = root.getJSONObject("chains")
        val result = mutableMapOf<String, Chain>()
        val keys = chainsObj.keys()
        while (keys.hasNext()) {
            val id = keys.next()
            val c = chainsObj.getJSONObject(id)
            val endpointsObj = c.getJSONObject("endpoints")
            val endpoints = mutableMapOf<String, Endpoints>()
            val epKeys = endpointsObj.keys()
            while (epKeys.hasNext()) {
                val net = epKeys.next()
                val ep = endpointsObj.getJSONObject(net)
                endpoints[net] = Endpoints(ep.optString("rpc"), ep.optString("api"))
            }
            val defaultEnabledObj = c.getJSONObject("defaultEnabled")
            val defaultEnabled = mutableMapOf<String, Boolean>()
            val deKeys = defaultEnabledObj.keys()
            while (deKeys.hasNext()) {
                val net = deKeys.next()
                defaultEnabled[net] = defaultEnabledObj.getBoolean(net)
            }
            val ake = c.getJSONObject("apiKeyEligible")
            val apiKeyEligible = ApiKeyEligible(ake.optBoolean("rpc"), ake.optBoolean("api"))
            val evmChainId = c.optJSONObject("evmChainId")?.let { obj ->
                val map = mutableMapOf<String, Int>()
                val idKeys = obj.keys()
                while (idKeys.hasNext()) {
                    val net = idKeys.next()
                    map[net] = obj.getInt(net)
                }
                map
            }
            result[id] = Chain(
                title = c.optString("title"),
                displayColor = c.optString("displayColor"),
                endpoints = endpoints,
                defaultEnabled = defaultEnabled,
                apiKeyEligible = apiKeyEligible,
                evmChainId = evmChainId,
            )
        }
        return result
    }
}
