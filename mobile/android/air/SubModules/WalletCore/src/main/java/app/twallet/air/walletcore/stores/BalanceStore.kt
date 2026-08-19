package app.twallet.air.walletcore.stores

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.json.JSONObject
import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.api.PortfolioBootstrapHolding
import app.twallet.air.walletcore.api.recordPortfolioSnapshot
import app.twallet.air.walletcore.models.MTokenBalance
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import java.math.BigInteger
import app.twallet.air.walletbasecontext.utils.doubleAbsRepresentation
import app.twallet.air.walletcontext.models.MBlockchainNetwork
import app.twallet.air.walletcore.ALL_DEFAULT_TOKENS
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

object BalanceStore : IStore {

    private const val PORTFOLIO_SNAPSHOT_MIN_INTERVAL_MS = 60_000L
    private const val PORTFOLIO_SNAPSHOT_EPSILON_USD = 0.01
    private val lastPortfolioSnapshotByAccount = ConcurrentHashMap<String, PortfolioSnapshotThrottle>()

    // Observable Flow
    private val _balancesFlow = MutableStateFlow<Map<String, Map<String, BigInteger>>>(emptyMap())
    val balancesFlow = _balancesFlow.asStateFlow()
    /////

    fun loadFromCache() {
        processorQueue.execute {
            for (accountId in WGlobalStorage.accountIds()) {
                val updatedBalancesDict = WGlobalStorage.getBalancesDict(accountId) ?: continue
                val accountBalances = ConcurrentHashMap<String, BigInteger>()
                for (key in updatedBalancesDict.keys()) {
                    val amountValueString: String =
                        updatedBalancesDict.optString(key).substringAfter("bigint:")
                    accountBalances[key] = if (amountValueString.isNotEmpty())
                        amountValueString.toBigInteger()
                    else
                        BigInteger.ZERO
                }
                balances[accountId] = accountBalances
                _balancesFlow.value = _balancesFlow.value.toMutableMap().apply {
                    put(accountId, accountBalances.toMap())
                }
            }
            resetBalanceInBaseCurrency()
        }
    }

    fun removeBalances(accountId: String) {
        balances.remove(accountId)
        totalBalanceInBaseCurrency.remove(accountId)
        totalBalanceInBaseCurrencyPerChain.remove(accountId)
        totalBalance24hInBaseCurrency.remove(accountId)
        lastPortfolioSnapshotByAccount.remove(accountId)
    }

    override fun wipeData() {
        clearCache()
    }

    override fun clearCache() {
        _balancesFlow.value = emptyMap()
        balances.clear()
        totalBalanceInBaseCurrency.clear()
        totalBalanceInBaseCurrencyPerChain.clear()
        totalBalance24hInBaseCurrency.clear()
        lastPortfolioSnapshotByAccount.clear()
    }

    private val processorQueue = Executors.newSingleThreadExecutor()

    private val balances = ConcurrentHashMap<String, ConcurrentHashMap<String, BigInteger>>()
    private val totalBalanceInBaseCurrency = ConcurrentHashMap<String, Double>()
    private val totalBalanceInBaseCurrencyPerChain =
        ConcurrentHashMap<String, Map<MBlockchain, Double>>()
    private val totalBalance24hInBaseCurrency = ConcurrentHashMap<String, Double>()

    fun getBalances(accountId: String?): ConcurrentHashMap<String, BigInteger>? {
        if (accountId == null)
            return null
        return balances[accountId]
    }

    fun hasTokenInBalances(accountId: String?, vararg slugs: String): Boolean {
        val balances = getBalances(accountId) ?: return false
        return slugs.any { balances.get(it) != null }
    }

    fun isAccountNew(accountId: String?): Boolean {
        val balances = getBalances(accountId) ?: return false
        val network = MBlockchainNetwork.ofAccountId(accountId ?: return false)
        val defaultTokens = ALL_DEFAULT_TOKENS[network]
        return balances.filter { defaultTokens?.contains(it.key) != true }.isEmpty() &&
            balances.filter {
                if (it.value == BigInteger.ZERO)
                    return@filter false
                val token = TokenStore.getToken(it.key) ?: return@filter false
                return@filter token.priceUsd *
                    it.value.doubleAbsRepresentation(token.decimals) >= 0.01
            }.isEmpty()
    }

    fun setBalances(
        accountId: String,
        accountBalances: HashMap<String, BigInteger>,
        removeOtherTokens: Boolean,
        onCompletion: (() -> Unit)? = null
    ) {
        setBalances(accountId, accountBalances, removeOtherTokens, chain = null, onCompletion)
    }

    /**
     * When [chain] is set, existing balances for that chain are replaced (like iOS / web),
     * so an empty update clears tokens of a disabled network.
     */
    fun setBalances(
        accountId: String,
        accountBalances: HashMap<String, BigInteger>,
        removeOtherTokens: Boolean,
        chain: String?,
        onCompletion: (() -> Unit)? = null
    ) {
        processorQueue.execute {
            val existingBalances = balances[accountId]
            val newBalances: ConcurrentHashMap<String, BigInteger> =
                if (removeOtherTokens || existingBalances.isNullOrEmpty()) {
                    ConcurrentHashMap()
                } else if (chain != null) {
                    ConcurrentHashMap<String, BigInteger>().apply {
                        existingBalances.forEach { (slug, balance) ->
                            val tokenChain = TokenStore.getToken(slug)?.chain
                            if (tokenChain != chain) {
                                put(slug, balance)
                            }
                        }
                    }
                } else {
                    ConcurrentHashMap(existingBalances)
                }
            for ((slug, balanceToUpdate) in accountBalances) {
                newBalances[slug] = balanceToUpdate
            }
            _balancesFlow.value = _balancesFlow.value.toMutableMap().apply {
                put(accountId, newBalances.toMap())
            }
            balances[accountId] = newBalances
            calcTotalBalanceInBaseCurrency(accountId)?.let { result ->
                totalBalanceInBaseCurrency[accountId] = result.total
                totalBalanceInBaseCurrencyPerChain[accountId] = result.perChain
            }
            calcTotalBalance24hInBaseCurrency(accountId)?.let { balance ->
                totalBalance24hInBaseCurrency[accountId] = balance
            }
            val jsonObject = JSONObject()
            for (key in newBalances.keys) {
                jsonObject.put(key, "bigint:${newBalances[key]}")
            }
            WGlobalStorage.setBalancesDict(accountId, jsonObject)
            schedulePortfolioSnapshot(accountId, force = false)
            onCompletion?.invoke()
        }
    }

    fun recordPortfolioSnapshotNow(accountId: String) {
        schedulePortfolioSnapshot(accountId, force = true)
    }

    suspend fun recordPortfolioSnapshotAwait(accountId: String, force: Boolean = true) {
        val snapshot = buildPortfolioSnapshotUsd(accountId) ?: return
        if (!force && !shouldRecordPortfolioSnapshot(accountId, snapshot.totalUsd)) return
        runCatching {
            WalletCore.recordPortfolioSnapshot(accountId, snapshot.totalUsd, snapshot.bySlug)
            markPortfolioSnapshotRecorded(accountId, snapshot.totalUsd)
        }
    }

    fun buildBootstrapHoldings(accountId: String): List<PortfolioBootstrapHolding> {
        val accountBalances = balances[accountId] ?: return emptyList()
        val network = MBlockchainNetwork.ofAccountId(accountId).value
        val amountBySlug = linkedMapOf<String, Double>()
        val priceBySlug = linkedMapOf<String, Double>()

        for ((tokenSlug, balance) in accountBalances) {
            val token = TokenStore.getToken(tokenSlug) ?: continue
            if (ChainVisibilityStore.isHidden(token.chain, network)) continue
            val priceUsd = token.priceUsd
            if (priceUsd <= 0.0) continue
            val amount = balance.doubleAbsRepresentation(token.decimals)
            if (amount <= 0.0) continue
            amountBySlug[tokenSlug] = (amountBySlug[tokenSlug] ?: 0.0) + amount
            priceBySlug[tokenSlug] = priceUsd
        }

        return amountBySlug.mapNotNull { (slug, amount) ->
            val priceUsd = priceBySlug[slug] ?: return@mapNotNull null
            PortfolioBootstrapHolding(slug = slug, amount = amount, priceUsd = priceUsd)
        }
    }

    private fun schedulePortfolioSnapshot(accountId: String, force: Boolean = false) {
        CoroutineScope(Dispatchers.Main).launch {
            recordPortfolioSnapshotAwait(accountId, force = force)
        }
    }

    private fun shouldRecordPortfolioSnapshot(accountId: String, totalUsd: Double): Boolean {
        val previous = lastPortfolioSnapshotByAccount[accountId]
        val now = System.currentTimeMillis()
        if (previous != null
            && now - previous.atMs < PORTFOLIO_SNAPSHOT_MIN_INTERVAL_MS
            && kotlin.math.abs(previous.totalUsd - totalUsd) < PORTFOLIO_SNAPSHOT_EPSILON_USD
        ) {
            return false
        }
        return true
    }

    private fun markPortfolioSnapshotRecorded(accountId: String, totalUsd: Double) {
        lastPortfolioSnapshotByAccount[accountId] = PortfolioSnapshotThrottle(totalUsd, System.currentTimeMillis())
    }

    private data class PortfolioSnapshotThrottle(
        val totalUsd: Double,
        val atMs: Long,
    )

    private data class PortfolioSnapshotUsd(
        val totalUsd: Double,
        val bySlug: Map<String, Double>,
    )

    private fun buildPortfolioSnapshotUsd(accountId: String): PortfolioSnapshotUsd? {
        val accountBalances = balances[accountId] ?: return null
        val network = MBlockchainNetwork.ofAccountId(accountId).value
        val bySlug = linkedMapOf<String, Double>()

        var walletUsd = 0.0
        for ((tokenSlug, balance) in accountBalances) {
            val token = TokenStore.getToken(tokenSlug) ?: continue
            if (ChainVisibilityStore.isHidden(token.chain, network)) continue
            val usd = MTokenBalance.fromParameters(token, balance)?.toUsdBaseCurrency ?: continue
            if (usd <= 0.0) continue
            bySlug[tokenSlug] = (bySlug[tokenSlug] ?: 0.0) + usd
            walletUsd += usd
        }

        return PortfolioSnapshotUsd(totalUsd = walletUsd, bySlug = bySlug)
    }

    fun resetBalanceInBaseCurrency() {
        totalBalanceInBaseCurrency.clear()
        totalBalanceInBaseCurrencyPerChain.clear()
        totalBalance24hInBaseCurrency.clear()
        if (TokenStore.tokens.isEmpty() ||
            balances.isEmpty()
        ) {
            return
        }
        val accounts = WGlobalStorage.accountIds()
        accounts.forEach {
            calcTotalBalanceInBaseCurrency(it)?.let { result ->
                totalBalanceInBaseCurrency[it] = result.total
                totalBalanceInBaseCurrencyPerChain[it] = result.perChain
            }
            calcTotalBalance24hInBaseCurrency(it)?.let { balance ->
                totalBalance24hInBaseCurrency[it] = balance
            }
        }
    }

    fun totalBalanceInBaseCurrency(accountId: String): Double? {
        return totalBalanceInBaseCurrency.get(accountId)
            ?: calcTotalBalanceInBaseCurrency(accountId)?.total
    }

    fun totalBalanceInBaseCurrencyPerChain(accountId: String): Map<MBlockchain, Double>? {
        return totalBalanceInBaseCurrencyPerChain.get(accountId)
            ?: calcTotalBalanceInBaseCurrency(accountId)?.perChain
    }

    fun totalBalance24hInBaseCurrency(accountId: String): Double? {
        return totalBalance24hInBaseCurrency.get(accountId)
            ?: calcTotalBalance24hInBaseCurrency(accountId)
    }

    data class TotalBalanceResult(
        val total: Double,
        val perChain: Map<MBlockchain, Double>
    )

    fun calcTotalBalanceInBaseCurrency(
        accountId: String,
        baseCurrency: MBaseCurrency = WalletCore.baseCurrency
    ): TotalBalanceResult? {
        if (isAccountNew(accountId)) {
            return TotalBalanceResult(total = 0.0, perChain = emptyMap())
        }
        val currencyRate = TokenStore.currencyRates?.get(baseCurrency.currencyCode)
            ?: baseCurrency.fallbackExchangeRate
        val accountBalances = balances[accountId] ?: return null

        val perChain = mutableMapOf<MBlockchain, Double>()

        val network = MBlockchainNetwork.ofAccountId(accountId).value
        val walletUsd = accountBalances
            .entries
            .sumOf { (tokenSlug, balance) ->
                val token = TokenStore.getToken(tokenSlug) ?: return@sumOf 0.0
                if (ChainVisibilityStore.isHidden(token.chain, network)) {
                    return@sumOf 0.0
                }
                val usd = MTokenBalance.fromParameters(token, balance)?.toUsdBaseCurrency
                    ?: return@sumOf 0.0
                val blockchain = MBlockchain.supportedChains.find { it.name == token.chain }
                if (blockchain != null) {
                    perChain[blockchain] = (perChain[blockchain] ?: 0.0) + usd
                }
                usd
            }

        return TotalBalanceResult(
            total = walletUsd * currencyRate,
            perChain = perChain.mapValues { it.value * currencyRate }
        )
    }

    fun calcTotalBalance24hInBaseCurrency(
        accountId: String,
    ): Double? {
        val accountBalances = balances[accountId]
        val walletTokens = accountBalances
            ?.mapNotNull { (tokenSlug, balance) ->
                val token = TokenStore.getToken(tokenSlug)
                if (token != null)
                    MTokenBalance.fromParameters(token, balance)
                else
                    null
            } ?: return null

        return walletTokens.sumOf { it.toBaseCurrency24h ?: 0.0 }
    }

}
