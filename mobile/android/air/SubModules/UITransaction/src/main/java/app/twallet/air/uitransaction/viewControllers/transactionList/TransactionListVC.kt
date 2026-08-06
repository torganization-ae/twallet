package app.twallet.air.uitransaction.viewControllers.transactionList

import android.content.Context
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uicomponents.base.WNavigationBar
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.cells.activity.ActivityCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.uitransaction.viewControllers.transaction.TransactionVC
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcontext.utils.IndexPath
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.moshi.MApiTransaction
import java.lang.ref.WeakReference

class TransactionListVC(
    context: Context,
    private val accountId: String,
    private val transactions: List<MApiTransaction>
) :
    WViewController(context),
    WRecyclerViewAdapter.WRecyclerViewDataSource, WalletCore.EventObserver {
    override val TAG = "Transaction"

    override val shouldDisplayBottomBar = true

    // TODO:: Should this be determined based on accountId here?
    private var isShowingAccountMultichain = WGlobalStorage.isMultichain(accountId)

    companion object {
        val TRANSACTION_CELL = WCell.Type(1)
    }

    private val rvAdapter =
        WRecyclerViewAdapter(WeakReference(this), arrayOf(TRANSACTION_CELL)).apply {
            setHasStableIds(true)
        }

    private val recyclerView: WRecyclerView by lazy {
        val rv = WRecyclerView(this)
        rv.adapter = rvAdapter
        val layoutManager = LinearLayoutManager(context)
        layoutManager.isSmoothScrollbarEnabled = true
        rv.setLayoutManager(layoutManager)
        rv.setItemAnimator(null)
        rv.setPadding(
            0,
            (navigationController?.getSystemBars()?.top ?: 0) +
                WNavigationBar.DEFAULT_HEIGHT.dp,
            0,
            navigationController?.getSystemBars()?.bottom ?: 0
        )
        rv.clipToPadding = false
        rv.addOnScrollListener(object : RecyclerView.OnScrollListener() {
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
        })
        rv
    }

    override fun setupViews() {
        super.setupViews()

        setNavTitle(LocaleController.getString("Transfer Info"))
        setupNavBar(true)
        if (navigationController?.viewControllers?.size == 1) {
            navigationBar?.addCloseButton()
        }

        view.addView(recyclerView, ViewGroup.LayoutParams(MATCH_PARENT, MATCH_PARENT))
        view.setConstraints {
            allEdges(recyclerView)
        }

        WalletCore.registerObserver(this)

        updateTheme()
    }

    override fun insetsUpdated() {
        super.insetsUpdated()

        recyclerView.setPaddingRelative(
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarStartInset,
            (navigationController?.getSystemBars()?.top ?: 0) +
                WNavigationBar.DEFAULT_HEIGHT.dp,
            ViewConstants.HORIZONTAL_PADDINGS.dp + systemBarEndInset,
            navigationController?.getSystemBars()?.bottom ?: 0
        )
    }

    private var _isDarkThemeApplied: Boolean? = null
    override fun updateTheme() {
        super.updateTheme()

        val darkModeChanged = ThemeManager.isDark != _isDarkThemeApplied
        if (!darkModeChanged)
            return
        _isDarkThemeApplied = ThemeManager.isDark

        view.setBackgroundColor(WColor.SecondaryBackground.color)
        rvAdapter.reloadData()
    }

    override fun onDestroy() {
        super.onDestroy()
        WalletCore.unregisterObserver(this)
    }

    private fun onTransactionTap(transaction: MApiTransaction) {
        navigationController?.push(
            TransactionVC(
                context,
                accountId,
                transaction,
                isInBottomSheet = false
            )
        )
    }

    override fun onWalletEvent(walletEvent: WalletEvent) {
        when (walletEvent) {
            WalletEvent.BaseCurrencyChanged,
            WalletEvent.TokensChanged,
            WalletEvent.AccountSavedAddressesChanged,
            is WalletEvent.ByChainUpdated -> {
                rvAdapter.reloadData()
            }

            else -> {}
        }
    }

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int {
        return 1
    }

    override fun recyclerViewNumberOfItems(
        rv: RecyclerView,
        section: Int
    ): Int {
        return transactions.size
    }

    override fun recyclerViewCellType(
        rv: RecyclerView,
        indexPath: IndexPath
    ): WCell.Type {
        return TRANSACTION_CELL
    }

    override fun recyclerViewCellView(
        rv: RecyclerView,
        cellType: WCell.Type
    ): WCell {
        return ActivityCell(recyclerView, withoutTagAndComment = false, isFirstInDay = null).apply {
            onTap = {
                onTransactionTap(it)
            }
        }
    }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        (cellHolder.cell as ActivityCell).configure(
            transaction = transactions[indexPath.row],
            accountId = accountId,
            isMultichain = isShowingAccountMultichain,
            positioning = ActivityCell.Positioning(
                isFirst = indexPath.row == 0,
                isFirstInDay = false,
                isLastInDay = false,
                isLast = indexPath.row == transactions.size - 1,
            ),
        )
    }

    override fun recyclerViewCellItemId(rv: RecyclerView, indexPath: IndexPath): String? {
        return transactions[indexPath.row].id
    }
}
