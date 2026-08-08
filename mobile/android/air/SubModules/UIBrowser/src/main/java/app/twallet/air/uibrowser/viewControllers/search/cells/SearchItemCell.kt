package app.twallet.air.uibrowser.viewControllers.search.cells

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.drawable.Drawable
import android.text.TextUtils
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.appcompat.content.res.AppCompatResources
import androidx.appcompat.widget.AppCompatImageView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.helpers.adaptiveFontSize
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color

@SuppressLint("ViewConstructor")
class SearchItemCell(
    context: Context,
    private val onTap: (keyword: String) -> Unit
) : WCell(context, LayoutParams(MATCH_PARENT, 50.dp)),
    WThemedView {
    private val searchDrawable: Drawable? =
        AppCompatResources
            .getDrawable(
                context,
                app.twallet.air.icons.R.drawable.ic_search_24
            )?.apply {
                setTint(WColor.SecondaryText.color)
            }

    private val searchImageView: AppCompatImageView by lazy {
        AppCompatImageView(context).apply {
            id = generateViewId()
            setImageDrawable(searchDrawable)
        }
    }

    private val titleLabel: WLabel by lazy {
        WLabel(context).apply {
            setStyle(adaptiveFontSize(), WFont.Regular)
            setSingleLine()
            ellipsize = TextUtils.TruncateAt.END
            setTextColor(WColor.PrimaryText)
        }
    }

    override fun setupViews() {
        super.setupViews()
        addView(searchImageView, LayoutParams(24.dp, 24.dp))
        addView(titleLabel, LayoutParams(0, WRAP_CONTENT))
        setConstraints {
            toStart(searchImageView, 16f)
            toCenterY(searchImageView)
            setHorizontalBias(titleLabel.id, 0f)
            toStart(titleLabel, 56f)
            toEnd(titleLabel, 16f)
            toCenterY(titleLabel)
        }

        setOnClickListener {
            onTap(keyword)
        }

        updateTheme()
    }

    var keyword = ""
    var isLastItem = false
    fun configure(keyword: String, isLastItem: Boolean) {
        this.keyword = keyword
        this.isLastItem = isLastItem
        titleLabel.text = keyword
        updateTheme()
    }

    override fun updateTheme() {
        searchDrawable?.setTint(WColor.SecondaryText.color)
        setBackgroundColor(
            WColor.Background.color,
            0f,
            if (isLastItem) ViewConstants.BLOCK_RADIUS.dp else 0f
        )
        addRippleEffect(
            WColor.BackgroundRipple.color,
            0f,
            if (isLastItem) ViewConstants.BLOCK_RADIUS.dp else 0f
        )
    }
}
