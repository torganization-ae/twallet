import Kingfisher
import SwiftUI
import UIComponents
import WalletCore

// MARK: - Category Carousel

/// One category block: header (name + chevron, tappable) followed by a horizontal scroll of its sites.
/// Mirrors the web `Category.tsx` component.
struct ExploreScreenCategoryCarouselView: View {
    let vm: ExploreScreenCategoryVM
    let isFirstItem: Bool
    let onTapDapp: (_ site: ApiSite) -> Void
    let onTapCategory: (_ categoryId: Int) -> Void

    private let sitesInterItemSpacing: Double = 16

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            headerView
            sitesScrollView
        }
    }

    private var headerView: some View {
        HStack(spacing: 4) {
            Text(vm.category.displayName)
                .font(.system(size: 17, weight: .bold))
                .kerning(-0.2)
                .lineLimit(1)

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.air.secondaryLabel)

            Spacer()
        }
        .padding(.top, isFirstItem ? 14 : 27)
        .padding(.bottom, 10)
        .contentShape(.rect)
        .onTapWithHighlightInScroll(action: { onTapCategory(vm.category.id) })
    }

    private var sitesScrollView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: sitesInterItemSpacing) {
                ForEach(vm.sites, id: \.url) { site in
                    ExploreScreenCategorySiteView(site: site, onTap: { onTapDapp(site) })
                }
            }
        }
        .backportScrollClipDisabled()
    }
}

// MARK: - Site Icon + Name

private struct ExploreScreenCategorySiteView: View {
    let site: ApiSite
    let onTap: @MainActor () -> Void

    private let iconSideLength: Double = 60
    private let cornerRadius: Double = 16

    var body: some View {
        VStack(spacing: 8) {
            iconView
                .frame(width: iconSideLength, height: iconSideLength)
                .clipShape(.rect(cornerRadius: cornerRadius))

            Text(site.name)
                .font(.system(size: 12, weight: .medium))
                .lineLimit(1)
                .truncationMode(.tail)
                .frame(width: iconSideLength)
        }
        .onTapWithHighlightInScroll(action: onTap)
    }

    @ViewBuilder private var iconView: some View {
        if let url = URL(string: site.icon) {
            KFImage(url).resizable()
                .loadDiskFileSynchronously(false)
                .aspectRatio(contentMode: .fill)
        } else {
            GridCellPlaceholder()
        }
    }
}
