package app.twallet.uihome.wallets.cells

interface IWalletCardCell {
    var isShowingPopup: Boolean
    fun notifyBalanceChange()
}
