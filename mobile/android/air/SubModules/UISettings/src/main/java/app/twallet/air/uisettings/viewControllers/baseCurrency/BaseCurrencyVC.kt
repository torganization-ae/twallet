package app.twallet.air.uisettings.viewControllers.baseCurrency

import android.content.Context
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import androidx.constraintlayout.widget.ConstraintLayout
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.base.WViewController
import app.twallet.air.uicomponents.commonViews.cells.HeaderCell
import app.twallet.air.uicomponents.commonViews.cells.TitleSubtitleSelectionCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setPaddingLocalized
import app.twallet.air.uicomponents.helpers.LastItemPaddingDecoration
import app.twallet.air.uicomponents.helpers.LinearLayoutManagerAccurateOffset
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.uiwidgets.configurations.WidgetsConfigurations
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.models.MBaseCurrency
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.utils.IndexPath
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.api.setBaseCurrency
import java.lang.ref.WeakReference

class BaseCurrencyVC(context: Context) : WViewController(context),
    WRecyclerViewAdapter.WRecyclerViewDataSource {
    override val TAG = "BaseCurrency"

    companion object {
        val baseCurrencies = arrayOf(
            MBaseCurrency.USD, MBaseCurrency.EUR, MBaseCurrency.RUB,
            MBaseCurrency.CNY, MBaseCurrency.BTC, MBaseCurrency.TON
        )

        val HEADER_CELL = WCell.Type(1)
        val BASE_CURRENCY_CELL = WCell.Type(2)
    }

    override val shouldDisplayBottomBar = true

    private val rvAdapter =
        WRecyclerViewAdapter(WeakReference(this), arrayOf(HEADER_CELL, BASE_CURRENCY_CELL))

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
        rv.addOnScrollListener(object : RecyclerView.OnScrollListener() {
            override fun onScrolled(recyclerView: RecyclerView, dx: Int, dy: Int) {
                super.onScrolled(recyclerView, dx, dy)
                if (dx == 0 && dy == 0)
                    return
                updateBlurViews(recyclerView)
            }
        })
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

        setNavTitle(LocaleController.getString("Base Currency"))
        setupNavBar(true)

        view.addView(recyclerView, ViewGroup.LayoutParams(MATCH_PARENT, 0))
        view.setConstraints {
            topToBottom(recyclerView, navigationBar!!)
            toCenterX(recyclerView)
            toBottom(recyclerView)
        }

        updateTheme()
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

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int {
        return 2
    }

    override fun recyclerViewNumberOfItems(rv: RecyclerView, section: Int): Int {
        return when (section) {
            0 -> 1
            else -> baseCurrencies.size
        }
    }

    override fun recyclerViewCellType(rv: RecyclerView, indexPath: IndexPath): WCell.Type {
        return when (indexPath.section) {
            0 -> HEADER_CELL
            else -> BASE_CURRENCY_CELL
        }
    }

    override fun recyclerViewCellView(rv: RecyclerView, cellType: WCell.Type): WCell {
        return when (cellType) {
            HEADER_CELL -> {
                HeaderCell(
                    context,
                    20f
                )
            }

            else -> {
                TitleSubtitleSelectionCell(context)
            }
        }
    }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        when (indexPath.section) {
            0 -> {
                (cellHolder.cell as HeaderCell).configure(
                    title = LocaleController.getString("Base Currency"),
                    titleColor = WColor.Tint
                )
            }

            else -> {
                val baseCurrency = baseCurrencies[indexPath.row]
                (cellHolder.cell as TitleSubtitleSelectionCell).configure(
                    title = baseCurrency.currencySymbol,
                    subtitle = baseCurrency.currencyName,
                    isSelected = WalletCore.baseCurrency.currencySymbol == baseCurrency.currencySymbol,
                    isFirst = false,
                    isLast = indexPath.row == baseCurrencies.size - 1
                ) {
                    // Item tapped
                    view.lockView()
                    WalletCore.setBaseCurrency(baseCurrency.currencyCode) { done, _ ->
                        view.unlockView()
                        if (done) {
                            navigationController?.pop()
                        }
                    }
                    WidgetsConfigurations.reloadWidgets(context)
                }
            }
        }
    }

}
