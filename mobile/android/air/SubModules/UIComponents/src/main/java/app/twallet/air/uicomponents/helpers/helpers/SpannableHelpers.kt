package app.twallet.air.uicomponents.helpers

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.StyleSpan
import app.twallet.air.uicomponents.extensions.dp
import app.twallet.air.walletbasecontext.localization.LocaleController
import app.twallet.air.walletbasecontext.utils.getDrawableCompat
import app.twallet.air.walletcontext.utils.VerticalImageSpan

object SpannableHelpers {
    fun encryptedCommentSpan(context: Context): SpannableStringBuilder {
        val builder = SpannableStringBuilder()
        context.getDrawableCompat(
            app.twallet.air.uicomponents.R.drawable.ic_lock
        )?.let { drawable ->
            drawable.mutate()
            drawable.setTint(Color.WHITE)
            val width = 16.dp
            val height = 16.dp
            drawable.setBounds(0, 0, width, height)
            val imageSpan = VerticalImageSpan(drawable)
            builder.append(" ", imageSpan, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        builder.append(" ${LocaleController.getString("Encrypted Message")}")
        builder.setSpan(StyleSpan(Typeface.ITALIC), 0, builder.length, 0)
        return builder
    }
}
