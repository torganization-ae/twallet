package app.twallet.air.uisettings.viewControllers.connectedApps

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.launch
import app.twallet.air.uicomponents.adapter.BaseListItem
import app.twallet.air.walletcore.JSWebViewBridge
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.api.requestDAppList
import app.twallet.air.walletcore.moshi.ApiDapp
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore
import app.twallet.air.walletcore.stores.DappsStore

class ConnectedAppsViewModel : ViewModel(), WalletCore.EventObserver {
    private val _accountIdFlow = MutableStateFlow(AccountStore.activeAccountId)

    val uiItemsFlow =
        combine(_accountIdFlow, DappsStore.dAppsFlow, ::buildUiItems)
            .filterNotNull()

    override fun onWalletEvent(walletEvent: WalletEvent) {
        if (walletEvent is WalletEvent.AccountChanged) {
            _accountIdFlow.value = walletEvent.accountId
        }
    }

    init {
        WalletCore.registerObserver(this)
        WalletCore.requestDAppList()
    }

    override fun onCleared() {
        WalletCore.unregisterObserver(this)
        super.onCleared()
    }


    fun deleteConnectedApp(dapp: ApiDapp) {
        val accountId = _accountIdFlow.value ?: return
        viewModelScope.launch {
            try {
                dapp.url?.let { dappUrl ->
                    WalletCore.call(
                        ApiMethod.DApp.DeleteDapp(
                            accountId,
                            dapp.sse?.appClientId ?: "jsbridge",
                            dappUrl,
                        )
                    )
                }
                WalletCore.notifyEvent(WalletEvent.DappRemoved(dapp))
                WalletCore.requestDAppList()
            } catch (_: JSWebViewBridge.ApiError) {

            } catch (_: IllegalArgumentException) {

            }
        }
    }

    fun deleteAllConnectedApp() {
        val accountId = _accountIdFlow.value ?: return
        viewModelScope.launch {
            try {
                WalletCore.call(ApiMethod.DApp.DeleteAllDapps(accountId))
                WalletCore.requestDAppList()
            } catch (e: JSWebViewBridge.ApiError) {

            } catch (e: IllegalArgumentException) {

            }
        }
    }

    private fun buildUiItems(
        accountId: String?,
        dApps: Map<String, List<ApiDapp>>?
    ): List<BaseListItem>? {
        val accId = accountId ?: return null
        val dAppsList = dApps?.get(accId) ?: return null

        val list: MutableList<BaseListItem> = dAppsList.mapIndexed { index, apiDapp ->
            Item.DApp(
                app = apiDapp,
                isLastItem = index == dAppsList.size - 1
            )
        }.toMutableList()
        list.add(0, Item.Header(""))
        return list
    }
}
