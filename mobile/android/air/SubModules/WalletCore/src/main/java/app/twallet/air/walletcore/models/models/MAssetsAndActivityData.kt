package app.twallet.air.walletcore.models

import org.json.JSONArray
import org.json.JSONObject
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcore.DEFAULT_SHOWN_TOKENS
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.BalanceStore
import app.twallet.air.walletcore.stores.TokenStore
import java.math.BigInteger

data class MAssetsAndActivityData(
    var accountId: String = "",
    var hiddenTokens: ArrayList<String> = ArrayList(),
    var visibleTokens: ArrayList<String> = ArrayList(),
    var deletedTokens: ArrayList<String> = ArrayList(),
    var addedTokens: ArrayList<String> = ArrayList(),
    var pinnedTokens: ArrayList<String> = ArrayList(),
) {

    constructor(accountId: String) : this() {
        this.accountId = accountId
        val jsonObject = WGlobalStorage.getAssetsAndActivityData(accountId) ?: return
        hiddenTokens = jsonArrayToArrayList(jsonObject.optJSONArray("alwaysHiddenSlugs"))
        visibleTokens = jsonArrayToArrayList(jsonObject.optJSONArray("alwaysShownSlugs"))
        deletedTokens = jsonArrayToArrayList(
            jsonObject.optJSONArray("deletedSlugs") ?: jsonObject.optJSONArray("deletedTokens")
        )
        addedTokens = jsonArrayToArrayList(jsonObject.optJSONArray("importedSlugs"))
        pinnedTokens = jsonArrayToArrayList(jsonObject.optJSONArray("pinnedSlugs"))
    }

    private fun jsonArrayToArrayList(jsonArray: JSONArray?): ArrayList<String> {
        val list = ArrayList<String>()
        if (jsonArray != null) {
            for (i in 0 until jsonArray.length()) {
                list.add(jsonArray.getString(i))
            }
        }
        return list
    }

    val toJSON: JSONObject
        get() {
            val jsonObject = JSONObject()
            jsonObject.put("alwaysHiddenSlugs", JSONArray(hiddenTokens))
            jsonObject.put("alwaysShownSlugs", JSONArray(visibleTokens))
            jsonObject.put("deletedSlugs", JSONArray(deletedTokens))
            jsonObject.put("importedSlugs", JSONArray(addedTokens))
            jsonObject.put("pinnedSlugs", JSONArray(pinnedTokens))
            return jsonObject
        }

    fun isPinned(slug: String): Boolean {
        return pinnedTokens.contains(slug)
    }

    fun deleteToken(slug: String) {
        pinnedTokens.removeAll { it == slug }
        hiddenTokens.removeAll { it == slug }
        visibleTokens.removeAll { it == slug }
        addedTokens.removeAll { it == slug }
        if (!deletedTokens.contains(slug)) {
            deletedTokens.add(slug)
        }
    }

    fun getAllTokens(
        shouldSort: Boolean = true,
    ): Array<MTokenBalance> {
        val tokensArray =
            ArrayList(
                BalanceStore.getBalances(accountId)?.mapNotNull { (key, _) ->
                    TokenStore.getToken(key)
                }?.filter { t ->
                    !deletedTokens.contains(t.slug)
                }?.toMutableList() ?: mutableListOf()
            )

        val account = AccountStore.accountById(accountId)
        val defaultShownSlugs = DEFAULT_SHOWN_TOKENS[account?.network] ?: emptySet()
        val slugsToAdd = mutableListOf<String>().apply {
            addAll(defaultShownSlugs)
            addAll(addedTokens)
        }
        val addedTokenObjects = slugsToAdd
            .distinct()
            .filterNot { deletedTokens.contains(it) }
            .mapNotNull { tokenSlug -> TokenStore.getToken(tokenSlug) }
            .filter { token -> account == null || account.isChainSupported(token.chain) }
            .toList()

        val shouldBeAddedTokens = addedTokenObjects.filter { addedToken ->
            !tokensArray.any { it.slug == addedToken.slug }
        }

        tokensArray.addAll(shouldBeAddedTokens)

        val tokenBalances = tokensArray.map { token ->
            MTokenBalance.fromParameters(
                token = token,
                amount = BalanceStore.getBalances(accountId)
                    ?.get(token.slug)
                    ?: BigInteger.valueOf(0)
            )
        }.toMutableList()

        if (!shouldSort) {
            return tokenBalances.toTypedArray()
        }
        val pinnedIndexBySlug = pinnedTokens.withIndex().associate { it.value to it.index }

        val ignorePriorities = account?.isNew != true

        val result = tokenBalances.sortedWith { left, right ->
            val leftSlug = left.token ?: ""
            val rightSlug = right.token ?: ""
            val leftPinnedIndex = pinnedIndexBySlug[leftSlug]
            val rightPinnedIndex = pinnedIndexBySlug[rightSlug]

            if (leftPinnedIndex != null && rightPinnedIndex != null) {
                return@sortedWith leftPinnedIndex.compareTo(rightPinnedIndex)
            }
            if (leftPinnedIndex != null) {
                return@sortedWith -1
            }
            if (rightPinnedIndex != null) {
                return@sortedWith 1
            }

            return@sortedWith left.compareByDisplayOrder(right, ignorePriorities)
        }

        return result.toTypedArray()
    }

    fun isTokenRemovable(slug: String): Boolean {
        val tokenBalance = BalanceStore.getBalances(accountId)?.get(slug) ?: BigInteger.ZERO
        return tokenBalance == BigInteger.ZERO
    }
}
