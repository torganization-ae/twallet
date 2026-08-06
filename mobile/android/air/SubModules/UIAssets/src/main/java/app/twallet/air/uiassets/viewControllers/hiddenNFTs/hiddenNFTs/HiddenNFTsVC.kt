package app.twallet.air.uiassets.viewControllers.hiddenNFTs

import android.content.Context
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uiassets.viewControllers.hiddenNFTs.cells.HiddenNFTsItemCell
import app.twallet.air.uiassets.viewControllers.nft.NftVC
import app.twallet.air.uicomponents.base.WNavigationBar
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.cells.HeaderCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.IndexPath
import app.twallet.air.walletcore.stores.NftStore
import java.lang.ref.WeakReference

class HiddenNFTsVC(context: Context, private val showingAccountId: String) :
    WViewController(context),
    WRecyclerViewAdapter.WRecyclerViewDataSource {
    override val TAG = "HiddenNFTs"

    companion object {
        val HEADER_CELL = WCell.Type(1)
        val NFT_CELL = WCell.Type(2)
    }

    override val shouldDisplayBottomBar = true

    val blacklistedNFTs = NftStore.nftData?.blacklistedNftAddresses?.mapNotNull { blacklistItem ->
        NftStore.nftData?.cachedNfts?.find { it.address == blacklistItem }
    } ?: emptyList()
    val hiddenNFTs = NftStore.nftData?.cachedNfts?.filter { it.isHidden == true } ?: emptyList()

    private val rvAdapter =
        WRecyclerViewAdapter(WeakReference(this), arrayOf(HEADER_CELL, NFT_CELL))

    private val scrollListener = object : RecyclerView.OnScrollListener() {
        override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
            super.onScrolled(recyclerView, dx, dy)
            if (dx == 0 && dy == 0)
                return
            updateBlurViews(recyclerView)
        }

        override fun onScrollStateChanged(recyclerView: RecyclerView, newState: Int) {
            super.onScrollStateChanged(recyclerView, newState)
            if (recyclerView.scrollState != RecyclerView.SCROLL_STATE_IDLE) {
                updateBlurViews(recyclerView)
            }
        }
    }

    private val recyclerView: WRecyclerView by lazy {
        val rv = WRecyclerView(this)
        rv.adapter = rvAdapter
        val layoutManager = LinearLayoutManager(context)
        layoutManager.isSmoothScrollbarEnabled = true
        rv.layoutManager = layoutManager
        rv.setLayoutManager(layoutManager)
        rv.clipToPadding = false
        rv.addOnScrollListener(scrollListener)
        rv.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding,
            (navigationController?.getSystemBars()?.top ?: 0) +
                WNavigationBar.DEFAULT_HEIGHT.dp,
            ViewConstants.HORIZONTAL_PADDINGS.dp,
            (navigationController?.getSystemBars()?.bottom ?: 0)
        )
        rv.clipToPadding = false
        rv
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle(LocaleController.getString("Hidden NFTs"))
        setupNavBar(true)

        view.addView(recyclerView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        view.setConstraints {
            allEdges(recyclerView)
        }

        updateTheme()
    }

    override fun updateTheme() {
        super.updateTheme()

        view.setBackgroundColor(WColor.SecondaryBackground.color)
        rvAdapter.reloadData()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()
        recyclerView.setPaddingLocalized(
            ViewConstants.HORIZONTAL_PADDINGS.dp + additionalTabletPadding + systemBarStartInset,
            WNavigationBar.DEFAULT_HEIGHT.dp + (navigationController?.getSystemBars()?.top ?: 0),
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            (navigationController?.getSystemBars()?.bottom ?: 0)
        )
    }

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int {
        return 2
    }

    override fun recyclerViewNumberOfItems(
        rv: RecyclerView,
        section: Int
    ): Int {
        return when (section) {
            0 -> {
                if (blacklistedNFTs.isEmpty()) {
                    0
                } else {
                    1 + blacklistedNFTs.size
                }
            }

            else -> {
                if (hiddenNFTs.isEmpty()) {
                    0
                } else {
                    1 + hiddenNFTs.size
                }
            }
        }
    }

    override fun recyclerViewCellType(
        rv: RecyclerView,
        indexPath: IndexPath
    ): WCell.Type {
        return when (indexPath.row) {
            0 -> {
                HEADER_CELL
            }

            else -> {
                NFT_CELL
            }
        }
    }

    override fun recyclerViewCellView(
        rv: RecyclerView,
        cellType: WCell.Type
    ): WCell {
        return when (cellType) {
            HEADER_CELL -> {
                HeaderCell(context, startMargin = 16f)
            }

            else -> {
                HiddenNFTsItemCell(recyclerView, onSelect = { nft ->
                    push(NftVC(context, showingAccountId, nft, blacklistedNFTs + hiddenNFTs))
                })
            }
        }
    }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        when (cellHolder.cell) {
            is HeaderCell -> {
                (cellHolder.cell as HeaderCell).configure(
                    LocaleController.getString(if (indexPath.section == 0) "Hidden By Me" else "Probably Scam"),
                    WColor.Tint,
                    topRounding = if (rvAdapter.indexPathToPosition(indexPath) == 0) HeaderCell.TopRounding.FIRST_ITEM else HeaderCell.TopRounding.ZERO
                )
            }

            is HiddenNFTsItemCell -> {
                val list = if (indexPath.section == 0) blacklistedNFTs else hiddenNFTs
                (cellHolder.cell as HiddenNFTsItemCell).configure(
                    list[indexPath.row - 1],
                    indexPath.row == list.size && (hiddenNFTs.isEmpty() || indexPath.section == 1),
                    showSeparator = indexPath.row < list.size
                )
            }
        }
    }

}
