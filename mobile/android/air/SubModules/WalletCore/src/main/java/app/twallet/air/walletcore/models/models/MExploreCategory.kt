package app.twallet.air.walletcore.models

import org.json.JSONObject

class MExploreCategory(json: JSONObject, allSites: ArrayList<MExploreSite>) {
    val id: Int = json.getInt("id")
    val name: String? = json.optString("name")
    val sites: Array<MExploreSite> = allSites.filter { it.categoryId == id }.toTypedArray()
}
