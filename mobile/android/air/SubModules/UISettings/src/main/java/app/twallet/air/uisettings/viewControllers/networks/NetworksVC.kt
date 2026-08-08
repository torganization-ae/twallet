package app.twallet.air.uisettings.viewControllers.networks

import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.cells.HeaderCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.LastItemPaddingDecoration
import app.twallet.air.uicomponents.helpers.LinearLayoutManagerAccurateOffset
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.uicomponents.widgets.menu.WMenuPopup
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.IndexPath
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.models.blockchain.MBlockchain
import app.twallet.air.walletcore.moshi.MNetworkRpcConfigItem
import app.twallet.air.walletcore.moshi.api.ApiMethod
import app.twallet.air.walletcore.stores.AccountStore
import java.lang.ref.WeakReference

class NetworksVC(
    context: Context
) : WViewController(context),
    WRecyclerViewAdapter.WRecyclerViewDataSource {
    override val TAG = "Networks"

    companion object {
        val HEADER_CELL = WCell.Type(1)
        val NETWORK_CELL = WCell.Type(2)
    }

    override val shouldDisplayBottomBar = true

    private var items: List<MNetworkRpcConfigItem> = emptyList()

    private val rvAdapter =
        WRecyclerViewAdapter(
            WeakReference(this),
            arrayOf(HEADER_CELL, NETWORK_CELL)
        )

    private val recyclerView: WRecyclerView by lazy {
        val rv = WRecyclerView(this)
        rv.adapter = rvAdapter
        val layoutManager = LinearLayoutManagerAccurateOffset(context)
        layoutManager.isSmoothScrollbarEnabled = true
        rv.setLayoutManager(layoutManager)
        rv.addItemDecoration(
            LastItemPaddingDecoration(
                navigationController?.bottomInset ?: 0
            )
        )
        rv.setItemAnimator(null)
        rv.addOnScrollListener(
            object : RecyclerView.OnScrollListener() {
                override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                    super.onScrolled(recyclerView, dx, dy)
                    if (dx == 0 && dy == 0) return
                    updateBlurViews(recyclerView)
                }
            }
        )
        rv.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding,
            0,
            ViewConstants.HORIZONTAL_PADDINGS.dp,
            0
        )
        rv
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle(LocaleController.getString("Networks"))
        setupNavBar(true)

        view.addView(recyclerView, ViewGroup.LayoutParams(MATCH_PARENT, 0))
        view.setConstraints {
            topToBottom(recyclerView, navigationBar!!)
            toCenterX(recyclerView)
            toBottom(recyclerView)
        }

        updateTheme()
        reload()
    }

    override fun viewWillAppear() {
        super.viewWillAppear()
        reload()
    }

    override fun updateTheme() {
        super.updateTheme()
        view.setBackgroundColor(WColor.SecondaryBackground.color)
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        recyclerView.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding + systemBarStartInset,
            0,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            0
        )
    }

    private fun networkName(): String = AccountStore.activeAccount?.network?.value ?: "mainnet"

    private fun visibleCount(): Int = items.count { it.isHidden != true }

    private fun canDisable(item: MNetworkRpcConfigItem): Boolean =
        item.isHidden == true || visibleCount() > 1

    private fun reload() {
        WalletCore.call(ApiMethod.Networks.GetRpcConfig(networkName())) { result, err ->
            if (err != null || result == null) return@call
            items = result.toList()
            rvAdapter.reloadData()
        }
    }

    private fun hostLabel(url: String): String =
        try {
            java.net.URI(url).host ?: url
        } catch (_: Exception) {
            url
        }

    private fun statusFor(item: MNetworkRpcConfigItem): NetworkStatus {
        val primaryUrl = item.fields.firstOrNull()?.url?.trim().orEmpty()
        return when {
            item.isHidden == true -> NetworkStatus.INACTIVE
            primaryUrl.isEmpty() -> NetworkStatus.WARNING
            else -> NetworkStatus.ACTIVE
        }
    }

    private fun openDetail(item: MNetworkRpcConfigItem) {
        navigationController?.push(
            NetworkDetailVC(
                context,
                item.chain,
                item.title,
                item.isHidden == true,
                canDisable(item),
            )
        )
    }

    private fun setVisibility(item: MNetworkRpcConfigItem, isHidden: Boolean) {
        if (isHidden && !canDisable(item)) return
        WalletCore.call(
            ApiMethod.Networks.SetChainVisibility(item.chain, networkName(), isHidden)
        ) { result, err ->
            if (err != null || result?.ok != true) return@call
            reload()
        }
    }

    private fun showMenu(anchor: View, item: MNetworkRpcConfigItem) {
        val isHidden = item.isHidden == true
        val allowDisable = canDisable(item)
        val items = mutableListOf(
            WMenuPopup.Item(
                null,
                LocaleController.getString("Edit Network")
            ) {
                openDetail(item)
            },
        )
        if (isHidden || allowDisable) {
            items.add(
                WMenuPopup.Item(
                    null,
                    LocaleController.getString(if (isHidden) "Enable" else "Disable")
                ) {
                    setVisibility(item, !isHidden)
                },
            )
        }
        WMenuPopup.present(
            anchor,
            items,
            popupWidth = WRAP_CONTENT,
            positioning = WMenuPopup.Positioning.ALIGNED
        )
    }

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int = 2

    override fun recyclerViewNumberOfItems(rv: RecyclerView, section: Int): Int =
        when (section) {
            0 -> 1
            else -> items.size
        }

    override fun recyclerViewCellType(rv: RecyclerView, indexPath: IndexPath): WCell.Type =
        when (indexPath.section) {
            0 -> HEADER_CELL
            else -> NETWORK_CELL
        }

    override fun recyclerViewCellView(rv: RecyclerView, cellType: WCell.Type): WCell =
        when (cellType) {
            HEADER_CELL -> HeaderCell(context, 20f)
            else -> NetworkCell(context)
        }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        when (indexPath.section) {
            0 -> {
                (cellHolder.cell as HeaderCell).configure(
                    title = LocaleController.getString("RPC and API endpoints"),
                    titleColor = WColor.Tint
                )
            }

            else -> {
                val item = items[indexPath.row]
                val primary = item.fields.firstOrNull()
                val subtitle =
                    when {
                        primary == null -> LocaleController.getString("No endpoint")
                        primary.url.isBlank() -> LocaleController.getString("No endpoint")
                        else -> hostLabel(primary.url)
                    }
                val chain = MBlockchain.valueOfOrNull(item.chain)
                (cellHolder.cell as NetworkCell).configure(
                    icon = chain?.icon,
                    title = item.title,
                    subtitle = subtitle,
                    status = statusFor(item),
                    isFirst = indexPath.row == 0,
                    isLast = indexPath.row == items.size - 1,
                    onClick = { openDetail(item) },
                    onMenuClick = { anchor -> showMenu(anchor, item) },
                )
            }
        }
    }
}
