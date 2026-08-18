package app.twallet.air.walletcore.models

import org.json.JSONObject
import app.twallet.air.walletbasecontext.utils.doubleAbsRepresentation
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcontext.utils.WEquatable
import app.twallet.air.walletcore.DEFAULT_SHOWN_TOKENS
import app.twallet.air.walletcore.PRICELESS_TOKEN_HASHES
import app.twallet.air.walletcore.TONCOIN_SLUG
import app.twallet.air.walletcore.TRON_USDT_SLUG
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.IApiToken
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.BalanceStore
import app.twallet.air.walletcore.stores.ChainVisibilityStore
import app.twallet.air.walletcore.stores.TokenStore
import java.math.BigDecimal
import java.math.BigInteger
import java.math.RoundingMode

val DIESEL_TOKENS = arrayOf(
    "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT", // NOT
    "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs", // USDT
    "EQCvxJy4eG8hyHBFsZ7eePxrRsUQSFE_jpptRAYBmcG_DOGS", // DOGS
    "EQD-cvR0Nz6XAyRBvbhz-abTrRC6sI5tvHvvpeQraV9UAAD7", // CATI
    "EQAJ8uWd7EBqsmpSWaRdf_I-8R8-XHwh3gsNKhy-UrdrPcUo", // HAMSTER
)

class MToken(json: JSONObject) : IApiToken, WEquatable<MToken> {

    override val decimals: Int = json.optInt("decimals")
    override val slug: String = json.optString("slug")
    override val symbol: String = json.optString("symbol")
    override var name: String = json.optString("name")
    override var image: String = json.optString("image")
    override val tokenAddress: String? =
        json.optString("minterAddress")
            .ifBlank { json.optString("tokenAddress") }
            .ifBlank { null }
    override val isPopular: Boolean = json.optBoolean("isPopular")
    override val chain: String = json.optString("chain").ifBlank { json.optString("blockchain") }
    val codeHash: String? = json.optString("codeHash")
    override val label: String? = json.optString("label").ifBlank { null }

    var percentChange24hReal: Double = parseJsonDouble(json, "percentChange24h")
    var percentChange24h: Double =
        if (percentChange24hReal.isFinite()) BigDecimal(percentChange24hReal).setScale(
            2,
            RoundingMode.HALF_UP
        ).toDouble() else percentChange24hReal
    var priceUsd: Double = parseJsonDouble(json, "priceUsd")
    val isFromBackend: Boolean = json.optBoolean("isFromBackend")
    /** Backend registry status: whitelist | graylist | blacklist | none. */
    val verification: String? = json.optString("verification").ifBlank { null }
    val isVerified: Boolean = json.optBoolean("isVerified")
    val isSpam: Boolean = json.optBoolean("isSpam")
    val type: String = json.optString("type")
    override val keywords: List<String>? = json.optJSONArray("keywords")?.let {
        List(it.length()) { i -> it.optString(i) }
    }
    val cmcSlug: String? = json.optString("cmcSlug").ifBlank { null }
    var color: String? = json.optString("color").ifBlank { null }
    val isGaslessEnabled: Boolean = json.optBoolean("isGaslessEnabled")
    val isTiny: Boolean = json.optBoolean("isTiny")
    val customPayloadApiUrl: String? = json.optString("customPayloadApiUrl").ifBlank { null }

    override val mBlockchain = MBlockchain.valueOfOrNull(chain)
    override val isUsdt: Boolean
        get() {
            return symbol == "USDT" || symbol == "USD₮"
        }
    val isTon: Boolean
        get() {
            return slug == TONCOIN_SLUG
        }

    val isLpToken: Boolean
        get() {
            return type == "lp_token"
        }

    init {
        // TODO:: Remove this temporary fix for usdt on trc20 after image added to back-end services.
        if (slug == TRON_USDT_SLUG) {
            image =
                "https://cache.tonapi.io/imgproxy/T3PB4s7oprNVaJkwqbGg54nexKE0zzKhcrPv8jcWYzU/rs:fill:200:200:1/g:no/aHR0cHM6Ly90ZXRoZXIudG8vaW1hZ2VzL2xvZ29DaXJjbGUucG5n.webp"
        }
    }

    fun toDictionary(): JSONObject {
        val dict = JSONObject().apply {
            put("decimals", decimals)
            put("slug", slug)
            put("symbol", symbol)
            put("name", name)
            put("image", image)
            put("tokenAddress", tokenAddress)
            if (percentChange24hReal.isFinite())
                put("percentChange24h", percentChange24hReal)
            if (priceUsd.isFinite())
                put("priceUsd", priceUsd)
            put("isPopular", isPopular)
            put("chain", chain)
            put("isFromBackend", isFromBackend)
            put("verification", verification)
            put("isVerified", isVerified)
            put("isSpam", isSpam)
            put("type", type)
            put("keywords", keywords)
            put("cmcSlug", cmcSlug)
            put("color", color)
            put("isGaslessEnabled", isGaslessEnabled)
            put("isTiny", isTiny)
            put("customPayloadApiUrl", customPayloadApiUrl)
            put("codeHash", codeHash)
            put("label", label)
        }
        return dict
    }

    fun isHidden(
        account: MAccount? = null,
        assetsAndActivityData: MAssetsAndActivityData? = null
    ): Boolean {
        val account = account ?: AccountStore.activeAccount ?: return true
        if (ChainVisibilityStore.isHidden(chain, account.network.value)) {
            return true
        }
        val settings = assetsAndActivityData ?: AccountStore.assetsAndActivityData
        if (settings.deletedTokens.contains(slug)) {
            return true
        }
        val balance = BalanceStore.getBalances(account.accountId)?.get(slug) ?: BigInteger.ZERO
        // Same as web `selectAccountTokens`: spam is out of the main list, then `isDisabled`.
        // src/global/selectors/tokens.ts
        if (isSpamAsset(balance, settings, account)) {
            return true
        }
        if (settings.hiddenTokens.contains(slug)) {
            return true
        }
        return !isEnabled(balance, settings, account)
    }

    // Mirrors `isSafeAsset` in src/global/selectors/tokens.ts
    private fun isSafeAsset(
        balance: BigInteger,
        settings: MAssetsAndActivityData,
        account: MAccount
    ): Boolean {
        if (settings.visibleTokens.contains(slug)) return true
        if (settings.addedTokens.contains(slug)) return true
        if (DEFAULT_SHOWN_TOKENS[account.network]?.contains(slug) == true) return true
        if (PRICELESS_TOKEN_HASHES.contains(codeHash)) return true
        if (verification != null) return verification == "whitelist"
        if (isVerified || isPopular || isFromBackend) return true
        return hasCost(balance)
    }

    // Mirrors `isSpamAsset` in src/global/selectors/tokens.ts
    private fun isSpamAsset(
        balance: BigInteger,
        settings: MAssetsAndActivityData,
        account: MAccount
    ): Boolean {
        if (isSpam || verification == "blacklist") return true
        if (settings.addedTokens.contains(slug)) return false
        if (settings.visibleTokens.contains(slug)) return false
        if (isSafeAsset(balance, settings, account)) return false
        return balance > BigInteger.ZERO && !hasCost(balance)
    }

    // Mirrors `isEnabled` in src/global/selectors/tokens.ts
    private fun isEnabled(
        balance: BigInteger,
        settings: MAssetsAndActivityData,
        account: MAccount
    ): Boolean {
        if (settings.visibleTokens.contains(slug)) return true
        if (mBlockchain?.nativeSlug == slug && balance > BigInteger.ZERO) return true
        if (verification == "whitelist") return true
        if (account.isNew) {
            return DEFAULT_SHOWN_TOKENS[account.network]?.contains(slug) == true
        }
        val pricelessWithBalance =
            PRICELESS_TOKEN_HASHES.contains(codeHash) && balance > BigInteger.ZERO
        val hideNoCost = WGlobalStorage.getAreNoCostTokensHidden()
        return isSafeAsset(balance, settings, account) && (
            hasCost(balance) ||
                pricelessWithBalance ||
                (!hideNoCost && balance > BigInteger.ZERO)
            )
    }

    private fun hasCost(balance: BigInteger): Boolean {
        val usd = if (priceUsd.isFinite()) priceUsd else 0.0
        return usd * balance.doubleAbsRepresentation(decimals) >= TINY_TRANSFER_MAX_COST
    }

    val price: Double?
        get() {
            val usd = if (priceUsd.isFinite()) priceUsd else 0.0
            return usd * TokenStore.baseCurrencyRate
        }

    val isOnChain: Boolean
        get() {
            return AccountStore.activeAccount?.isChainSupported(chain) == true
        }

    fun explorerUrl(network: MBlockchainNetwork): String? {
        if (tokenAddress.isNullOrEmpty() && cmcSlug != null)
            return "https://coinmarketcap.com/currencies/${cmcSlug}/"

        val tokenAddress = tokenAddress ?: return null
        return MBlockchain.valueOfOrNull(chain)?.tokenExplorer()?.tokenUrl(network, tokenAddress)
    }

    override fun isSame(comparing: WEquatable<*>): Boolean {
        return comparing is MToken && slug == comparing.slug
    }

    override fun isChanged(comparing: WEquatable<*>): Boolean {
        return true
    }

    companion object {
        // src/config.ts TINY_TRANSFER_MAX_COST
        private const val TINY_TRANSFER_MAX_COST = 0.01

        fun parseJsonDouble(json: JSONObject, key: String): Double {
            if (!json.has(key) || json.isNull(key)) return 0.0
            return when (val value = json.opt(key)) {
                is Number -> value.toDouble()
                is String -> value.toDoubleOrNull() ?: 0.0
                else -> 0.0
            }
        }
    }
}
