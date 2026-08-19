package app.twallet.air.uicomponents.commonViews.toast

import androidx.annotation.DrawableRes
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

object ToastManager {

    data class Toast(
        @param:DrawableRes
        val iconResId: Int? = null,
        val text: CharSequence,
        val actionTitle: CharSequence? = null,
        val duration: Duration = DURATION_DEFAULT,
        val onAction: (() -> Unit)? = null,
        val isError: Boolean = false,
    ) {

        companion object {
            val DURATION_DEFAULT: Duration = 2.5.seconds
        }
    }

    private val toasts = MutableSharedFlow<Toast>(
        extraBufferCapacity = 8,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    val toastsFlow: SharedFlow<Toast> = toasts.asSharedFlow()

    fun show(toast: Toast) {
        toasts.tryEmit(toast)
    }
}
