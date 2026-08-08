package app.twallet.air.uibrowser.viewControllers.explore.cells

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.ImageView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import app.twallet.air.uicomponents.base.WRecyclerViewAdapter
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.image.Content
import app.twallet.air.uicomponents.image.WCustomImageView
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WRecyclerView
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.WView
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.utils.IndexPath
import app.twallet.air.walletcore.models.MExploreCategory
import app.twallet.air.walletcore.models.MExploreSite
import app.twallet.air.walletcore.stores.ConfigStore
import java.lang.ref.WeakReference

@SuppressLint("ViewConstructor")
class ExploreCategoryCell(
    context: Context,
    private val onSiteTap: (site: MExploreSite) -> Unit,
    private val onOpenCategoryTap: (category: MExploreCategory) -> Unit
) : WCell(context, LayoutParams(MATCH_PARENT, WRAP_CONTENT)),
    WRecyclerViewAdapter.WRecyclerViewDataSource,
    WThemedView {
    companion object {
        private val SITE_CELL = Type(1)
        private val SITE_CELL_WIDTH = 72
    }

    private val headerRipple = WRippleDrawable.create(0f)

    private val titleLabel =
        WLabel(context).apply {
            setStyle(17f, WFont.Bold)
            setSingleLine()
            ellipsize = TextUtils.TruncateAt.END
        }

    private val chevronView =
        ImageView(context).apply {
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }

    private val headerView =
        WView(context).apply {
            background = headerRipple
            addView(titleLabel, LayoutParams(0, WRAP_CONTENT))
            addView(chevronView, LayoutParams(20.dp, 20.dp))
            setConstraints {
                toStart(titleLabel, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                toCenterY(titleLabel)
                endToStart(titleLabel, chevronView, 4f)
                toEnd(chevronView, ViewConstants.HORIZONTAL_PADDINGS.toFloat())
                toCenterY(chevronView)
                toTop(titleLabel, 4f)
                toBottom(titleLabel, 4f)
            }
            setOnClickListener {
                category?.let(onOpenCategoryTap)
            }
        }

    private val rvAdapter =
        WRecyclerViewAdapter(
            WeakReference(this),
            arrayOf(SITE_CELL)
        )

    private val recyclerView =
        WRecyclerView(context).apply {
            layoutManager = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
            adapter = rvAdapter
            setPadding(ViewConstants.HORIZONTAL_PADDINGS.dp, 0, ViewConstants.HORIZONTAL_PADDINGS.dp, 0)
            clipToPadding = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }

    private var category: MExploreCategory? = null
    private var sites: List<MExploreSite> = emptyList()

    init {
        addView(headerView, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        addView(recyclerView, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        setConstraints {
            toTop(headerView, 8f)
            toStart(headerView)
            toEnd(headerView)
            topToBottom(recyclerView, headerView, 8f)
            toStart(recyclerView)
            toEnd(recyclerView)
            toBottom(recyclerView, 8f)
        }
        updateTheme()
    }

    fun configure(category: MExploreCategory?) {
        this.category = category
        sites = category?.sites?.filter {
            ConfigStore.isLimited != true || !it.canBeRestricted
        } ?: emptyList()
        titleLabel.text = category?.name.orEmpty()
        rvAdapter.reloadData()
        updateTheme()
    }

    override fun updateTheme() {
        headerRipple.backgroundColor = Color.TRANSPARENT
        headerRipple.rippleColor = WColor.BackgroundRipple.color
        titleLabel.setTextColor(WColor.PrimaryText.color)
        val chevron = context.getDrawableCompat(app.twallet.air.icons.R.drawable.ic_arrow_right_16_24)
        chevronView.setImageDrawable(chevron)
        chevronView.setColorFilter(WColor.SecondaryText.color)
    }

    override fun recyclerViewNumberOfSections(rv: RecyclerView): Int = 1

    override fun recyclerViewNumberOfItems(rv: RecyclerView, section: Int): Int = sites.size

    override fun recyclerViewCellType(rv: RecyclerView, indexPath: IndexPath): Type = SITE_CELL

    override fun recyclerViewCellView(rv: RecyclerView, cellType: Type): WCell =
        CategorySiteItemCell(context, SITE_CELL_WIDTH.dp) { site ->
            onSiteTap(site)
        }

    override fun recyclerViewConfigureCell(
        rv: RecyclerView,
        cellHolder: WCell.Holder,
        indexPath: IndexPath
    ) {
        (cellHolder.cell as CategorySiteItemCell).configure(sites.getOrNull(indexPath.row))
    }
}

@SuppressLint("ViewConstructor")
private class CategorySiteItemCell(
    context: Context,
    cellWidth: Int,
    private val onSiteTap: (site: MExploreSite) -> Unit,
) : WCell(context, LayoutParams(cellWidth, WRAP_CONTENT)),
    WThemedView {
    private val ripple = WRippleDrawable.create(16f.dp)
    private val imagePadding = 4

    private val imageView =
        WCustomImageView(context).apply {
            defaultRounding = Content.Rounding.Radius(16f.dp)
        }

    private val titleLabel =
        WLabel(context).apply {
            setStyle(12f, WFont.Medium)
            setSingleLine()
            ellipsize = TextUtils.TruncateAt.END
            gravity = Gravity.CENTER
        }

    private val imageWidth = cellWidth - 12.dp

    init {
        background = ripple
        addView(imageView, LayoutParams(imageWidth, imageWidth))
        addView(titleLabel, LayoutParams(0, WRAP_CONTENT))
        setConstraints {
            toCenterX(imageView, imagePadding.toFloat())
            toTop(imageView, imagePadding.toFloat())
            topToBottom(titleLabel, imageView, 6f)
            toBottom(titleLabel, 6f)
            toCenterX(titleLabel, 1f)
        }
        setOnClickListener {
            site?.let(onSiteTap)
        }
    }

    private var site: MExploreSite? = null

    fun configure(site: MExploreSite?) {
        this.site = site
        if (site != null) {
            site.iconUrl?.let { imageView.set(Content.ofUrl(it)) } ?: imageView.clear()
            titleLabel.text = site.name
        } else {
            imageView.clear()
            titleLabel.text = ""
        }
        updateTheme()
    }

    override fun updateTheme() {
        ripple.backgroundColor = Color.TRANSPARENT
        ripple.rippleColor = WColor.BackgroundRipple.color
        titleLabel.setTextColor(WColor.PrimaryText.color)
    }
}
