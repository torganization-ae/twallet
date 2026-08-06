package app.twallet.air.uisettings.viewControllers.appearance.views.palette

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Color
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.core.graphics.toColorInt
import androidx.core.view.isGone
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.extensions.setMarginsDp
import app.twallet.air.uicomponents.widgets.WFrameLayout
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.theme.DEFAULT_TINT_DARK
import app.twallet.air.walletbasecontext.theme.DEFAULT_TINT_LIGHT
import app.twallet.air.walletbasecontext.theme.NftAccentColors
import app.twallet.air.walletbasecontext.theme.ThemeManager.isDark

@SuppressLint("ViewConstructor")
class AppearancePaletteItemView(
    context: Context,
    val nftAccentId: Int?,
    val onTap: (nftAccentId: Int?, state: State) -> Unit
) : WFrameLayout(context), WThemedView {
    enum class State {
        AVAILABLE,
        SELECTED,
    }

    var state: State = State.AVAILABLE

    init {
        setOnClickListener {
            onTap(nftAccentId, state)
        }
    }

    private var selectedItemView: View? = null

    fun configure(state: State) {
        this.state = state
        when (state) {
            State.SELECTED -> {
                if (selectedItemView == null) {
                    selectedItemView = View(context)
                    addView(selectedItemView, LayoutParams(MATCH_PARENT, MATCH_PARENT).apply {
                        setMarginsDp(2)
                    })
                } else {
                    selectedItemView?.isGone = false
                }
            }

            State.AVAILABLE -> {
                selectedItemView?.isGone = true
            }
        }
        updateTheme()
    }

    val textOnTint: Int
        get() {
            return if (nftAccentId != 16 || !isDark) Color.WHITE else Color.BLACK
        }

    override fun updateTheme() {
        val color =
            nftAccentId?.let { (if (isDark) NftAccentColors.dark else NftAccentColors.light)[nftAccentId].toColorInt() }
                ?: (if (isDark) DEFAULT_TINT_DARK else DEFAULT_TINT_LIGHT)
        setBackgroundColor(color, 17f.dp)
        val textOnTint = textOnTint
        selectedItemView?.setBackgroundColor(
            color,
            17f.dp,
            17f.dp,
            true,
            textOnTint,
            3.dp
        )
    }
}
