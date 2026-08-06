package app.twallet.air.uicomponents.base

interface ISortableView {
    fun startSorting()
    fun endSorting()
}

interface ISortableController {
    fun startSorting()
    fun endSorting(save: Boolean)
}
