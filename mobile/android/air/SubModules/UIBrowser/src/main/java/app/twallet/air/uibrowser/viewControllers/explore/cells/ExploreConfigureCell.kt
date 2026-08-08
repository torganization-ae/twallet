package app.twallet.air.uibrowser.viewControllers.explore.cells

import android.annotation.SuppressLint
import android.content.Context
import androidx.appcompat.widget.AppCompatImageView
import app.twallet.air.uicomponents.drawable.WRippleDrawable
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat

@SuppressLint("ViewConstructor")
class ExploreConfigureCell(
    context: Context,
    private val onTap: () -> Unit,
) : WCell(context, LayoutParams(36.dp, 36.dp)),
    WThemedView {
    private val ripple = WRippleDrawable.create(10f.dp)

    init {
        background = ripple
    }

    private val imageView =
        AppCompatImageView(context).apply {
            id = generateViewId()
            setImageDrawable(
                context.getDrawableCompat(app.twallet.air.icons.R.drawable.ic_details)
            )
        }

    override fun setupViews() {
        super.setupViews()

        layoutParams =
            (layoutParams as MarginLayoutParams).apply {
                marginStart = 12.dp
            }

        addView(imageView, LayoutParams(20.dp, 20.dp))
        setConstraints {
            allEdges(imageView)
        }

        setOnClickListener {
            onTap()
        }

        updateTheme()
    }

    override fun updateTheme() {
        ripple.backgroundColor = WColor.Background.color
        ripple.rippleColor = WColor.BackgroundRipple.color
    }

    fun configure() {
        updateTheme()
    }
}
