package app.twallet.air.uisettings.viewControllers.appearance.views.palette

import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.constraintlayout.helper.widget.Flow
import app.twallet.air.uicomponents.commonViews.cells.HeaderCell
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.NftAccentColors
import app.twallet.air.walletbasecontext.theme.ThemeManager
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletcontext.WalletContextManager
import app.twallet.air.walletcontext.globalStorage.WGlobalStorage
import app.twallet.air.walletcore.models.MAccount

@SuppressLint("ViewConstructor")
class AppearancePaletteView(
    context: Context
) : WView(context), WThemedView {

    var overrideTintColor: Int? = null

    private val titleLabel = HeaderCell(context).apply {
        configure(
            LocaleController.getString("Palette"),
            titleColor = WColor.Tint,
            HeaderCell.TopRounding.NORMAL
        )
    }

    private val horizontalGap = 12.dp
    private val itemWidth = 34.dp
    private val flowHelper = Flow(context).apply {
        id = generateViewId()
        setWrapMode(Flow.WRAP_CHAIN)
        setHorizontalStyle(Flow.CHAIN_PACKED)
        setHorizontalBias(0f)
        setHorizontalGap(horizontalGap)
        setVerticalGap(horizontalGap)
    }

    private var paletteItemViews: List<AppearancePaletteItemView>
    private val palettesView = WView(context).apply {
        val viewIds = IntArray(NftAccentColors.light.size + 1)
        var paletteItemViews = mutableListOf<AppearancePaletteItemView>()
        (listOf(null) + (0 until NftAccentColors.light.size).toList()).forEachIndexed { index, accentColorId ->
            val itemView =
                AppearancePaletteItemView(context, accentColorId, onTap = { accentColorId, _ ->
                    val accountId = accountId ?: return@AppearancePaletteItemView
                    if (accentColorId == null) {
                        WGlobalStorage.setAccentColorIndex(accountId, null)
                        ThemeManager.setDefaultAccentColor()
                    } else {
                        WGlobalStorage.setAccentColorIndex(accountId, accentColorId)
                        ThemeManager.setNftAccentColor(accentColorId)
                    }
                    WalletContextManager.delegate?.get()?.themeChanged()
                    reloadViews()
                })
            paletteItemViews.add(itemView)
            addView(itemView, LayoutParams(itemWidth, itemWidth))
            viewIds[index] = itemView.id
        }
        this@AppearancePaletteView.paletteItemViews = paletteItemViews
        addView(flowHelper, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        flowHelper.referencedIds = viewIds
    }

    override fun setupViews() {
        super.setupViews()

        addView(titleLabel)
        addView(palettesView, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))

        setConstraints {
            toTop(titleLabel)
            toStart(titleLabel)
            topToBottom(palettesView, titleLabel, 9f)
            toCenterX(palettesView)
            toBottom(palettesView, 16f)
        }

        updateTheme()
    }

    override val isTinted = true
    override fun updateTheme() {
        setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp
        )
        titleLabel.setTitleColor(overrideTintColor ?: WColor.Tint.color)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        val numberOfItems =
            (width + 8 - 40.dp + horizontalGap) / (itemWidth + horizontalGap)
        val additionalSpace =
            width + 8 - 40.dp - numberOfItems * (itemWidth + horizontalGap) + horizontalGap
        flowHelper.setMaxElementsWrap(numberOfItems)
        flowHelper.setHorizontalGap(horizontalGap + additionalSpace / numberOfItems)
        palettesView.post {
            palettesView.requestLayout()
        }
    }

    private var accountId: String? = null

    fun configure(account: MAccount?) {
        accountId = account?.accountId
        reloadViews()
    }

    fun reloadViews() {
        val accountId = accountId ?: return
        val selectedIndex = WGlobalStorage.getAccentColorIndex(accountId)
        paletteItemViews.forEach { item ->
            val itemIndex = item.nftAccentId
            val isSelected = itemIndex == selectedIndex
            item.configure(
                if (isSelected) AppearancePaletteItemView.State.SELECTED
                else AppearancePaletteItemView.State.AVAILABLE
            )
        }
    }
}
