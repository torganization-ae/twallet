package app.twallet.air.uibrowser.viewControllers.explore.cells

import android.annotation.SuppressLint
import android.content.Context
import android.text.TextUtils
import android.view.Gravity
import android.view.ViewGroup
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
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
import app.twallet.air.walletcore.models.MExploreHistory
import java.net.URI

@SuppressLint("ViewConstructor")
class ExploreRecentlyViewedCell(
    context: Context,
    private val onSiteTap: (site: MExploreHistory.VisitedSite) -> Unit,
) : WCell(context, LayoutParams(MATCH_PARENT, WRAP_CONTENT)),
    WThemedView {
    private val recyclerView =
        WRecyclerView(context).apply {
            layoutManager = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
            isHorizontalScrollBarEnabled = false
            clipToPadding = false
            setPadding(ViewConstants.HORIZONTAL_PADDINGS.dp, 0, ViewConstants.HORIZONTAL_PADDINGS.dp, 0)
        }

    private var sites: List<MExploreHistory.VisitedSite> = emptyList()

    private val adapter =
        object : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
            override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
                val item = SiteItemView(context)
                return object : RecyclerView.ViewHolder(item) {}
            }

            override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
                val site = sites[position]
                (holder.itemView as SiteItemView).configure(site) {
                    onSiteTap(site)
                }
            }

            override fun getItemCount() = sites.size
        }

    init {
        recyclerView.adapter = adapter
        addView(recyclerView, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
        setConstraints {
            toTop(recyclerView)
            toBottom(recyclerView)
            toCenterX(recyclerView)
        }
        updateTheme()
    }

    fun configure(sites: List<MExploreHistory.VisitedSite>) {
        this.sites = sites
        @Suppress("NotifyDataSetChanged")
        adapter.notifyDataSetChanged()
    }

    override fun updateTheme() {
        for (index in 0 until recyclerView.childCount) {
            (recyclerView.getChildAt(index) as? SiteItemView)?.updateTheme()
        }
    }

    @SuppressLint("ViewConstructor")
    private class SiteItemView(
        context: Context
    ) : WView(context, LayoutParams(72.dp, WRAP_CONTENT)), WThemedView {
        private val imageView =
            WCustomImageView(context).apply {
                defaultRounding = Content.Rounding.Radius(14f.dp)
            }
        private val titleLabel =
            WLabel(context).apply {
                setStyle(12f, WFont.Medium)
                gravity = Gravity.CENTER_HORIZONTAL
                setSingleLine()
                ellipsize = TextUtils.TruncateAt.END
            }

        init {
            addView(imageView, LayoutParams(60.dp, 60.dp))
            addView(titleLabel, LayoutParams(MATCH_PARENT, WRAP_CONTENT))
            setConstraints {
                toTop(imageView)
                toCenterX(imageView)
                topToBottom(titleLabel, imageView, 8f)
                toBottom(titleLabel)
                toCenterX(titleLabel)
            }
            updateTheme()
        }

        fun configure(site: MExploreHistory.VisitedSite, onTap: () -> Unit) {
            if (site.favicon.isNotBlank()) {
                imageView.set(Content.ofUrl(site.favicon))
            } else {
                imageView.clear()
            }
            titleLabel.text =
                site.title.ifBlank {
                    runCatching { URI(site.url).host }.getOrNull() ?: site.url
                }
            updateTheme()
            setOnClickListener { onTap() }
        }

        override fun updateTheme() {
            titleLabel.setTextColor(WColor.PrimaryText.color)
        }
    }
}
