package app.twallet.air.uiassets.viewControllers.assets

import app.twallet.air.walletcontext.utils.WEquatable
import app.twallet.air.walletcore.moshi.ApiNft

data class AssetRow(
    val nft: ApiNft,
    val interactionMode: AssetsVM.InteractionMode,
    val animationsPaused: Boolean,
    val isSelected: Boolean,
    val daysUntilExpiration: Int? = null
) : WEquatable<AssetRow> {
    override fun isSame(comparing: WEquatable<*>): Boolean {
        return comparing is AssetRow && nft.address == comparing.nft.address
    }

    override fun isChanged(comparing: WEquatable<*>): Boolean {
        return comparing !is AssetRow ||
            nft != comparing.nft ||
            interactionMode != comparing.interactionMode ||
            animationsPaused != comparing.animationsPaused ||
            isSelected != comparing.isSelected ||
            daysUntilExpiration != comparing.daysUntilExpiration
    }
}
