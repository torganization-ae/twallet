package app.twallet.air.uicomponents.helpers

import android.content.Context
import android.graphics.Canvas
import android.view.Gravity
import androidx.recyclerview.widget.RecyclerView
import androidx.recyclerview.widget.RecyclerView.ItemDecoration
import app.twallet.air.uicomponents.drawable.RecyclerViewGradientDrawable
import app.twallet.air.uicomponents.extensions.isBottomScrollReached
import app.twallet.air.uicomponents.extensions.isTopScrollReached

class RecyclerViewGradientItemDecoration(context: Context) : ItemDecoration() {
    val top = RecyclerViewGradientDrawable(context, Gravity.TOP)
    val bottom = RecyclerViewGradientDrawable(context, Gravity.BOTTOM)

    override fun onDrawOver(canvas: Canvas, parent: RecyclerView, state: RecyclerView.State) {
        if (!parent.isTopScrollReached) {   // todo animations
            top.setBounds(0, 0, parent.measuredWidth, parent.measuredHeight)
            top.draw(canvas)
        }

        if (!parent.isBottomScrollReached) {
            bottom.setBounds(0, 0, parent.measuredWidth, parent.measuredHeight)
            bottom.draw(canvas)
        }
    }

    var color = 0
        set(value) {
            field = value
            top.color = value
            bottom.color = value
        }
}