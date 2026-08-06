package app.twallet.air.uiwalletconnectpay.viewControllers.signData.cells

import android.annotation.SuppressLint
import android.content.Context
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import androidx.appcompat.widget.AppCompatImageView
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.uicomponents.helpers.WFont
import app.twallet.air.uicomponents.widgets.WCell
import app.twallet.air.uicomponents.widgets.WLabel
import app.twallet.air.uicomponents.widgets.WThemedView
import app.twallet.air.uicomponents.widgets.setBackgroundColor
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.theme.ViewConstants
import app.twallet.air.walletbasecontext.theme.WColor
import app.twallet.air.walletbasecontext.theme.color
import app.twallet.air.walletbasecontext.utils.getDrawableCompat

@SuppressLint("ViewConstructor")
class WalletConnectPaySignDataTransferInfoCell(context: Context) : WCell(context), WThemedView {

    private val titleLabel = WLabel(context).apply {
        id = generateViewId()
        setStyle(17f, WFont.Regular)
        text = LocaleController.getString("Transfer Info")
    }

    private val chevron = AppCompatImageView(context).apply {
        id = generateViewId()
    }

    var onTap: (() -> Unit)? = null

    init {
        layoutParams.apply { height = 48.dp }
        addView(titleLabel, LayoutParams(WRAP_CONTENT, WRAP_CONTENT))
        addView(chevron, LayoutParams(24.dp, 24.dp))
        setConstraints {
            toCenterY(titleLabel)
            toStart(titleLabel, 16f)
            toCenterY(chevron)
            toEnd(chevron, 12f)
        }
        setOnClickListener { onTap?.invoke() }
        updateTheme()
    }

    override fun updateTheme() {
        setBackgroundColor(
            WColor.Background.color,
            ViewConstants.BLOCK_RADIUS.dp,
            ViewConstants.BLOCK_RADIUS.dp
        )
        addRippleEffect(
            WColor.SecondaryBackground.color,
            ViewConstants.BLOCK_RADIUS.dp,
            ViewConstants.BLOCK_RADIUS.dp
        )
        titleLabel.setTextColor(WColor.PrimaryText.color)
        chevron.setImageDrawable(
            context.getDrawableCompat(
                app.twallet.air.icons.R.drawable.ic_arrow_right_24
            )?.apply { setTint(WColor.SecondaryText.color) }
        )
    }
}
