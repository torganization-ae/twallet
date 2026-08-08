import Combine
import Kingfisher
import Perception
import SwiftUI
import UIComponents
import WalletContext
import WalletCore
import UIInAppBrowser

extension ExploreVC {
    @MainActor struct ViewOutput {
        let connectedDappDidTap = PassthroughSubject<String, Never>()
        let connectedDappSettingsDidTap = PassthroughSubject<Void, Never>()

        let recentlyViewedDidTap = PassthroughSubject<BrowserHistoryItem, Never>()
        let dappFromCarouselDidTap = PassthroughSubject<ApiSite, Never>()

        let dappCategoryDidTap = PassthroughSubject<Int, Never>()

        let scrollOffsetDidChange = PassthroughSubject<CGFloat, Never>()
    }

    struct SectionItem: Identifiable {
        let identity: Identity
        let items: [ContentItem]

        var id: Identity { identity }

        enum Identity: Hashable {
            case lockdownModeWarning
            case recentlyViewed
            case connectedDapps
            case category(Int)
        }
    }

    enum ContentItem: Equatable, Identifiable {
        case lockdownModeWarning
        case sectionHeader(title: String, isFirstHeader: Bool)
        case recentlyViewed(items: [BrowserHistoryItem])
        case connectedDapps(dapps: [ApiDapp], layoutVariant: LayoutSizeVariant)
        case categorySites(vm: ExploreScreenCategoryVM, isFirstItem: Bool)

        var id: String {
            switch self {
            case .lockdownModeWarning: "lockdownModeWarning_UniqueSingleGroup"
            case let .sectionHeader(title, _): title
            case .recentlyViewed: "recentlyViewed_UniqueSingleGroup"
            case .connectedDapps: "connectedDapps_UniqueSingleGroup"
            case let .categorySites(vm, _): "categorySites_\(vm.category.id)"
            }
        }
    }

    @Perceptible
    final class ObservedViewState {
        enum Content {
            case browsing([SectionItem])
            case search(ComposedSearchResult)

            var isBrowsing: Bool {
                if case .browsing = self { return true }
                return false
            }
        }

        fileprivate private(set) var content: Content = .browsing([])
        fileprivate private(set) var shouldShowWhiteBackground: Bool = false
        fileprivate private(set) var scrollToTopTrigger: UInt64 = 0
        fileprivate private(set) var scrollToTopAnimated: Bool = true

        init() {}

        func updateBrowsing(sections: [SectionItem], animated: Bool = true) {
            if animated {
                withAnimation {
                    self.shouldShowWhiteBackground = false
                    self.content = .browsing(sections)
                }
            } else {
                self.shouldShowWhiteBackground = false
                self.content = .browsing(sections)
            }
        }

        func updateSearch(_ result: ComposedSearchResult) {
            self.shouldShowWhiteBackground = true
            self.content = .search(result)
        }

        fileprivate var firstAnchorID: AnyHashable? {
            switch content {
            case .browsing(let sections): return sections.first.map { AnyHashable($0.id) }
            case .search(let result): return result.sections.first.map { AnyHashable($0.id) }
            }
        }

        func scrollToTop(animated: Bool = true) {
            scrollToTopAnimated = animated
            scrollToTopTrigger += 1
        }
    }

    static func makeBrowsingSections(connectedDapps: [ApiDapp],
                                     exploreSites: [ApiSite],
                                     siteCategories: [ApiSiteCategory],
                                     recentlyViewed: [BrowserHistoryItem],
                                     shouldRestrictSites: Bool,
                                     isLockdownModeEnabled: Bool) -> [SectionItem] {
        let exploreSites = shouldRestrictSites ? exploreSites.filter { !$0.canBeRestricted } : exploreSites
        var sections: [SectionItem] = []

        if isLockdownModeEnabled {
            sections.append(SectionItem(identity: .lockdownModeWarning, items: [.lockdownModeWarning]))
        }
        appendContentItems(to: &sections,
                           connectedDapps: connectedDapps,
                           exploreSites: exploreSites,
                           siteCategories: siteCategories,
                           recentlyViewed: recentlyViewed)
        return sections
    }

    private static func appendContentItems(to sections: inout [SectionItem],
                                           connectedDapps: [ApiDapp],
                                           exploreSites: [ApiSite],
                                           siteCategories: [ApiSiteCategory],
                                           recentlyViewed: [BrowserHistoryItem]) {
        var isFirstHeader: Bool { sections.isEmpty }

        if !recentlyViewed.isEmpty {
            sections.append(SectionItem(identity: .recentlyViewed, items: [
                .sectionHeader(title: lang("Recently Viewed"), isFirstHeader: isFirstHeader),
                .recentlyViewed(items: recentlyViewed),
            ]))
        }

        // Connected Dapps Section
        if !connectedDapps.isEmpty {
            sections.append(SectionItem(identity: .connectedDapps, items: [
                .sectionHeader(title: lang("Connected Sites"), isFirstHeader: isFirstHeader),
                .connectedDapps(dapps: connectedDapps,
                                layoutVariant: connectedDapps.count > 3 ? .regular : .compact),
            ]))
        }

        // One section per category: header + horizontal site carousel (matches web Category.tsx).
        let categoryVMs = siteCategories.compactMap { category in
            ExploreScreenCategoryVM(category: category, sites: exploreSites.filter { $0.categoryId == category.id })
        }

        for categoryVM in categoryVMs {
            sections.append(SectionItem(identity: .category(categoryVM.category.id), items: [
                .categorySites(vm: categoryVM, isFirstItem: isFirstHeader),
            ]))
        }
    }
}

// MARK: - View Models

struct ExploreScreenCategoryVM: Equatable {
    let category: ApiSiteCategory
    let sites: [ApiSite]
}

extension ExploreScreenCategoryVM {
    init?(category: ApiSiteCategory, sites: [ApiSite]) {
        guard !sites.isEmpty else { return nil }
        self.category = category
        self.sites = sites
    }
}

// MARK: - Screen View

#if DEBUG
@available(iOS 17.0, *)
#Preview {
    @Previewable @State var showConnectedDapps = true
    @Previewable @State var largeConnectedDapps = false

    let viewOutput = ExploreVC.ViewOutput()
    let viewState = ExploreVC.ObservedViewState()

    var connectedDappsLayout: LayoutSizeVariant { largeConnectedDapps ? .regular : .compact }

    let sections = ExploreVC
        .previewBrowsingSections(showConnectedDapps: showConnectedDapps,
                                 connectedDappsLayout: connectedDappsLayout)

    viewState.updateBrowsing(sections: sections)

    return ExploreVC.ScreenView(viewState: viewState, viewOutput: viewOutput)
        .overlay(alignment: .bottom) {
            VStack(spacing: 2) {
                Toggle(isOn: $showConnectedDapps, label: { Text("Show Connected Dapps") })
                Toggle(isOn: $largeConnectedDapps, label: { Text("Large Connected Dapps") })
            }
            .background { Rectangle().fill(.ultraThinMaterial).opacity(0.97) }
            .padding(EdgeInsets(top: 0, leading: 20, bottom: -20, trailing: 20))
        }
}

extension ExploreVC {
    static func previewBrowsingSections(showConnectedDapps: Bool,
                                        connectedDappsLayout: LayoutSizeVariant) -> [SectionItem] {
        let connectedDapps: [ApiDapp] = if showConnectedDapps {
            switch connectedDappsLayout {
            case .compact: ApiDapp.sampleList.prefix(2).apply(Array.init)
            case .regular: ApiDapp.sampleList
            }
        } else {
            []
        }

        let categories = ApiSiteCategory.sampleCategories

        var exploreSites: [ApiSite] = []
        for (categoryIndex, category) in categories.enumerated() {
            let sitesCount = categoryIndex + 1
            for siteIndex in 0 ..< sitesCount {
                // sampleIndex is added to to name, as name is used as uniqueness identity for SwiftUI
                let sampleIndex = categoryIndex * 50 + siteIndex
                exploreSites.append(.randomSample(categoryId: category.id, uniquenessIndex: sampleIndex))
            }
        }

        return Self.makeBrowsingSections(connectedDapps: connectedDapps,
                                         exploreSites: exploreSites,
                                         siteCategories: categories,
                                         recentlyViewed: [],
                                         shouldRestrictSites: false,
                                         isLockdownModeEnabled: false)
    }
}
#endif

extension ExploreVC {
    struct ScreenView: View {
        let viewState: ObservedViewState
        let viewOutput: ViewOutput

        private let screenEdgesHSpacing: Double = 20

        private static let screenSafeAreaCoordinateSpaceName = "ExploreScreenCoordinateSpace"

        var body: some View {
            WithPerceptionTracking {
                ScrollViewReader { scrollReader in
                    WithPerceptionTracking {
                        ScrollView(showsIndicators: false) {
                            vScrollContent(viewState: viewState)
                        }
                        .backportScrollEdgeEffectHidden(viewState.content.isBrowsing, for: .top)
                        .backportScrollClipDisabled()
                        .scrollDismissesKeyboard(.immediately)
                        .safeAreaInset(edge: .leading, spacing: screenEdgesHSpacing) {
                            Color.clear.frame(width: 0, height: 1)
                        }
                        .safeAreaInset(edge: .trailing, spacing: screenEdgesHSpacing) {
                            Color.clear.frame(width: 0, height: 1)
                        }
                        .background(viewState.shouldShowWhiteBackground ? Color.air.background : Color.air.groupedBackground)
                        .onChange(of: viewState.scrollToTopTrigger) { _ in
                            let scroll = {
                                scrollReader.scrollTo(viewState.firstAnchorID, anchor: .top)
                            }
                            if viewState.scrollToTopAnimated {
                                withAnimation { scroll() }
                            } else {
                                var transaction = Transaction()
                                transaction.disablesAnimations = true
                                withTransaction(transaction, scroll)
                            }
                        }
                    }
                }
                .coordinateSpace(name: Self.screenSafeAreaCoordinateSpaceName)
            }
        } 

        private func vScrollContent(viewState: ObservedViewState) -> some View {
            @ViewBuilder var content: some View {
                Group {
                    switch viewState.content {
                    case .browsing(let sections):
                        ForEach(sections) { sectionItem in
                            viewForSection(sectionItem)
                        }
                    case .search(let result):
                        searchContent(result)
                    }
                }
                .onFrameChange(inCoordinateSpace: Self.screenSafeAreaCoordinateSpaceName) { frame in
                    viewOutput.scrollOffsetDidChange.send(-frame.origin.y)
                }

                Color.clear.frame(height: 70 + 16) // content inset imitation / overScroll
            }

            @ViewBuilder var stack: some View {
                if #available(iOS 18.0, *) {
                    LazyVStack(alignment: .leading, spacing: 0) { content }
                        .id(viewState.shouldShowWhiteBackground)
                    // SwiftUI has a bug and animates layout differences inside ScrollView, causing content to slide from bottom to top
                    // when state changes from search to idle, if search content.height > scrollView.frame.height.
                    // .id(viewState.shouldShowWhiteBackground) forces a full rebuild on mode change, so SwiftUI doesn’t
                    // animate layout changes and only applies the fade. There problem is only with LazyVStack, VStack is ok.
                } else {
                    // In iOS <=17, LazyVStack inside a vertical ScrollView can fail to render horizontal ScrollView content after
                    // state changes, leaving blank areas while preserving their size. This is because SwiftUI incorrectly
                    // caches the layout of nested scroll views, preventing proper re-rendering.
                    VStack(alignment: .leading, spacing: 0) { content }
                }
            }
            return stack
        }

        @ViewBuilder private func viewForSection(_ sectionItem: SectionItem) -> some View {
            ForEach(sectionItem.items) { contentItem in
                viewForItem(contentItem)
            }
            .id(sectionItem.id)
        }

        @ViewBuilder private func viewForItem(_ contentItem: ContentItem) -> some View {
            switch contentItem {
            case .lockdownModeWarning:
                lockdownModeWarningView()

            case let .sectionHeader(title, isFirstHeader):
                sectionHeaderView(title: title, isFirstHeader: isFirstHeader)

            case let .recentlyViewed(items):
                recentlyViewedView(items: items)

            case let .connectedDapps(dapps, layoutVariant):
                connectedDappsView(dapps: dapps, layoutVariant: layoutVariant)

            case let .categorySites(vm, isFirstItem):
                ExploreScreenCategoryCarouselView(vm: vm,
                                                  isFirstItem: isFirstItem,
                                                  onTapDapp: { site in
                                                      viewOutput.dappFromCarouselDidTap.send(site)
                                                  }, onTapCategory: { categoryId in
                                                      viewOutput.dappCategoryDidTap.send(categoryId)
                                                  })
            }
        }

        private func recentlyViewedView(items: [BrowserHistoryItem]) -> some View {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .top, spacing: 12) {
                    ForEach(items, id: \.url) { item in
                        Button {
                            viewOutput.recentlyViewedDidTap.send(item)
                        } label: {
                            VStack(spacing: 8) {
                                KFImage(URL(string: item.favicon))
                                    .resizable()
                                    .placeholder {
                                        Image(systemName: "globe")
                                            .foregroundStyle(Color.air.secondaryLabel)
                                    }
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 60, height: 60)
                                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                                Text(item.title.isEmpty ? (URL(string: item.url)?.host ?? item.url) : item.title)
                                    .font(.system(size: 12, weight: .semibold))
                                    .foregroundStyle(Color.air.primaryLabel)
                                    .lineLimit(1)
                                    .frame(width: 72)
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .backportScrollClipDisabled()
        }

        @ViewBuilder private func searchContent(_ result: ComposedSearchResult) -> some View {
            ForEach(Array(result.sections.enumerated()), id: \.element.id) { index, section in
                searchSectionView(section, hasTopGap: index > 0)
            }
        }

        @ViewBuilder private func searchSectionView(_ section: SearchResultSection, hasTopGap: Bool) -> some View {
            Group {
                if let header = section.header {
                    SearchSectionHeaderView(header: header, hasTopGap: hasTopGap)
                }
                ForEach(section.items, id: \.id) { item in
                    item.makeView(isTopMatch: section.isTopMatch)
                }
            }
            .id(section.id)
        }

        private func lockdownModeWarningView() -> some View {
            WarningView(
                header: lang("$lockdown_mode_enabled_title"),
                text: lang("$lockdown_mode_walletconnect_unavailable", arg1: APP_NAME),
                kind: .info
            )
            .padding(.top, 14)
        }

        private func sectionHeaderView(title: String, isFirstHeader: Bool) -> some View {
            HStack(spacing: 0) {
                if isFirstHeader {
                    SectionHeaderView(title: title, topInset: 14)
                } else {
                    SectionHeaderView(title: title)
                }
                Spacer()
            }
        }

        private func connectedDappsView(dapps: [ApiDapp], layoutVariant: LayoutSizeVariant) -> some View {
            let isCompact = switch layoutVariant {
            case .compact: true
            case .regular: false
            }

            return ScrollView(.horizontal, showsIndicators: false) {
                HStack(alignment: .center, spacing: isCompact ? 8 : 12) {
                    ForEach(dapps, id: \.url) { dapp in
                        ConnectedDappButton(dappName: dapp.name,
                                            iconURL: dapp.iconUrl,
                                            layoutVariant: layoutVariant,
                                            onTap: { viewOutput.connectedDappDidTap.send(dapp.url) })
                    }

                    ConnectedDappsSettingsButton(layoutVariant: layoutVariant,
                                                 onTap: { viewOutput.connectedDappSettingsDidTap.send(()) })
                } // end HStack
            } // end ScrollView
            .backportScrollClipDisabled()
            .applyModifierConditionally {
                if #available(iOS 17.0, *) {
                    $0
                } else {
                    $0.frame(height: isCompact ? 36 : 88) // below iOS ScrollView not sized by child views
                }
            }
        }

    }
}

