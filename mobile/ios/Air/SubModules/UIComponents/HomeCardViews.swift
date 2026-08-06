import SwiftUI
import UIKit
import WalletCore
import WalletContext

private let baseHomeCardWidth = designScreenWidth - 2 * compactInsetSectionHorizontalPadding

public func homeCardFontScalingFactor(cardWidth: CGFloat, minimumScale: CGFloat = 1) -> CGFloat {
    guard baseHomeCardWidth > 0 else { return 1 }
    return max(minimumScale, cardWidth / baseHomeCardWidth)
}

public func homeCardFontSize(for cardWidth: CGFloat, minimumScale: CGFloat = 1) -> CGFloat {
    56 * homeCardFontScalingFactor(cardWidth: cardWidth, minimumScale: minimumScale)
}

public let homeCollapsedFontSize: CGFloat = 40

// MARK: - AccountAddressLine

public struct AccountAddressLine: View {
    public struct Style: Equatable, Hashable, Sendable {
        public let font: Font
        public let textOpacity: CGFloat
        public let accountTypeIconSpacing: CGFloat
        public let largeAccountTypeIcon: Bool
        public let fullcolorChainIcons: Bool
        public let chainIconWidth: CGFloat
        public let chainIconSpacing: CGFloat
        public let chainSpacing: CGFloat
        public let singlechainAddressCount: Int
        public let multichainEndCount: Int
        public let multichainAddressCount: Int
        public let maxChainCount: Int?
        public let showComma: Bool
        public let showAccessories: Bool

        public static let list = Style(
            font: .system(size: 14, weight: .regular),
            textOpacity: 1,
            accountTypeIconSpacing: 4,
            largeAccountTypeIcon: false,
            fullcolorChainIcons: false,
            chainIconWidth: 13,
            chainIconSpacing: 0,
            chainSpacing: 3,
            singlechainAddressCount: 6,
            multichainEndCount: 6,
            multichainAddressCount: 2,
            maxChainCount: 3,
            showComma: true,
            showAccessories: false
        )

        public static let search = Style(
            font: .system(size: 12, weight: .regular),
            textOpacity: 1,
            accountTypeIconSpacing: 4,
            largeAccountTypeIcon: false,
            fullcolorChainIcons: false,
            chainIconWidth: 13,
            chainIconSpacing: 0,
            chainSpacing: 3,
            singlechainAddressCount: 6,
            multichainEndCount: 6,
            multichainAddressCount: 2,
            maxChainCount: 3,
            showComma: true,
            showAccessories: false
        )

        public static let card = Style(
            font: .compactDisplay(size: 11, weight: .medium),
            textOpacity: 1,
            accountTypeIconSpacing: 3.333,
            largeAccountTypeIcon: false,
            fullcolorChainIcons: false,
            chainIconWidth: 12,
            chainIconSpacing: 0,
            chainSpacing: 1.667,
            singlechainAddressCount: 4,
            multichainEndCount: 4,
            multichainAddressCount: 1,
            maxChainCount: 3,
            showComma: false,
            showAccessories: false
        )

        public static let homeCard = Style(
            font: .compactDisplay(size: 17, weight: .medium),
            textOpacity: 0.75,
            accountTypeIconSpacing: 4,
            largeAccountTypeIcon: true,
            fullcolorChainIcons: true,
            chainIconWidth: 16,
            chainIconSpacing: 4,
            chainSpacing: 6,
            singlechainAddressCount: 6,
            multichainEndCount: 6,
            multichainAddressCount: 2,
            maxChainCount: 3,
            showComma: true,
            showAccessories: true
        )
    }

    public var addressLine: MAccount.AddressLine
    public var style: Style
    public var foregroundColor: Color

    public init(addressLine: MAccount.AddressLine, style: Style, foregroundColor: Color = .primary) {
        self.addressLine = addressLine
        self.style = style
        self.foregroundColor = foregroundColor
    }

    public var body: some View {
        HStack(spacing: style.accountTypeIconSpacing) {
            if addressLine.isTestnet {
                addressLine.testnetImage
                    .opacity(style.textOpacity)
            }
            if let leadingIcon = addressLine.leadingIcon {
                if style.largeAccountTypeIcon {
                    switch leadingIcon {
                    case .ledger:
                        AccountTypeBadge(.hardware, increasedOpacity: false)
                    case .view:
                        AccountTypeBadge(.view, increasedOpacity: false)
                    }
                } else {
                    leadingIcon.image
                        .imageScale(.small)
                        .opacity(style.textOpacity)
                }
            }
            HStack(spacing: style.chainSpacing) {
                let displayItems = addressLine.displayItems(
                    maxChainCount: style.maxChainCount,
                    multichainAddressCount: style.multichainAddressCount
                )
                ForEach(displayItems.indices, id: \.self) { idx in
                    ItemView(
                        item: displayItems[idx].item,
                        itemsCount: displayItems.count,
                        showAddress: displayItems[idx].showsAddress,
                        style: style
                    )
                }
            }
            if style.showAccessories {
                Image.airBundle("ArrowUpDownSmall")
                    .opacity(style.textOpacity == 1 ? 0.9 : 0.5)
                    .offset(x: -1, y: 0.333)
                    .padding(.vertical, -3)
            }
        }
        .lineLimit(1)
        .font(style.font)
        .allowsTightening(true)
        .foregroundStyle(foregroundColor)
    }
}

private struct ItemView: View {
    var item: MAccount.AddressLine.Item
    var itemsCount: Int
    var showAddress: Bool
    var style: AccountAddressLine.Style

    var body: some View {
        HStack(spacing: showAddress ? style.chainIconSpacing : 0) {
            if style.fullcolorChainIcons {
                Image.airBundle("chain_\(item.chain.rawValue)")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: style.chainIconWidth)
            } else {
                ChainIcon(item.chain)
                    .imageScale(.small)
                    .opacity(style.textOpacity)
            }

            Group {
                let comma = style.showComma && !item.isLast ? "," : ""
                if showAddress {
                    if item.isDomain {
                        Text(item.text + comma)
                            .truncationMode(.middle)
                            .opacity(style.textOpacity)
                    } else {
                        Text(formatStartEndAddress(item.text, prefix: itemsCount == 1 ? style.singlechainAddressCount : 0, suffix: itemsCount == 1 ? style.singlechainAddressCount : style.multichainEndCount) + comma)
                            .opacity(style.textOpacity)
                    }
                } else if !comma.isEmpty {
                    Text(comma)
                        .opacity(style.textOpacity)
                }
            }
        }
        .contentShape(.rect)
        .longTapGesture_ios18(isEnabled: true, onLongTap: onCopy)
    }

    func onCopy() {
        UIPasteboard.general.string = item.textToCopy
        AppActions.showToast(icon: .animatedCopy, message: lang("%chain% Address Copied", arg1: item.chain.title))
        Haptics.play(.lightTap)
    }
}

// MARK: - CardBalanceView

public struct CardBalanceView: View, Equatable {
    public enum Style: Equatable {
        case homeCard(cardWidth: CGFloat, minimumScale: CGFloat)
        case homeCollapsed
        case grid
    }

    public var balance: BaseCurrencyAmount?
    public var isNumericTransitionEnabled: Bool
    public var style: Style
    public var onSensitiveDataReveal: (() -> Void)?

    public init(
        balance: BaseCurrencyAmount?,
        isNumericTransitionEnabled: Bool = true,
        style: Style,
        onSensitiveDataReveal: (() -> Void)? = nil
    ) {
        self.balance = balance
        self.isNumericTransitionEnabled = isNumericTransitionEnabled
        self.style = style
        self.onSensitiveDataReveal = onSensitiveDataReveal
    }

    public var body: some View {
        ZStack {
            if let balance {
                mainView(balance)
            } else {
                placeholderView()
            }
        }
        .backportGeometryGroup()
    }

    @MainActor
    private var configuration: (
        integerFont: UIFont,
        fractionFont: UIFont,
        symbolFont: UIFont,
        integerColor: UIColor,
        fractionColor: UIColor,
        symbolColor: UIColor,
        showChevron: Bool,
        sensitiveDataCellSize: CGFloat,
        sensitiveDataTheme: ShyMask.Theme
    ) {
        switch style {
        case .homeCard(let cardWidth, let minimumScale):
            let scale = homeCardFontScalingFactor(cardWidth: cardWidth, minimumScale: minimumScale)
            let secondary = UIColor.white.withAlphaComponent(0.75)
            return (
                .compactRounded(ofSize: homeCardFontSize(for: cardWidth, minimumScale: minimumScale), weight: .bold),
                .compactRounded(ofSize: 40 * scale, weight: .bold),
                .compactRounded(ofSize: 48 * scale, weight: .bold),
                .white,
                secondary,
                secondary,
                true,
                16,
                .light
            )
        case .homeCollapsed:
            let secondary = UIColor.air.secondaryLabel
            return (
                .compactRounded(ofSize: homeCollapsedFontSize, weight: .bold),
                .compactRounded(ofSize: 28.5, weight: .bold),
                .compactRounded(ofSize: 34, weight: .bold),
                .label,
                secondary,
                secondary,
                false,
                14,
                .adaptive
            )
        case .grid:
            let scale = homeCardFontScalingFactor(cardWidth: homeCardWidth)
            let secondary = UIColor.white.withAlphaComponent(0.75)
            return (
                .compactRounded(ofSize: 19 * scale, weight: .bold),
                .compactRounded(ofSize: 13 * scale, weight: .bold),
                .compactRounded(ofSize: 16 * scale, weight: .bold),
                .white,
                secondary,
                secondary,
                false,
                6,
                .adaptive
            )
        }
    }

    private func mainView(_ balance: BaseCurrencyAmount) -> some View {
        let config = configuration
        HStack(spacing: 6) {
            Text(
                balance.formatAttributed(
                    format: .init(preset: .baseCurrencyEquivalentWithMinimumFractionDigits, roundHalfUp: true),
                    integerFont: config.integerFont,
                    fractionFont: config.fractionFont,
                    symbolFont: config.symbolFont,
                    integerColor: config.integerColor,
                    fractionColor: config.fractionColor,
                    symbolColor: config.symbolColor
                )
            )
            .contentTransition(isNumericTransitionEnabled ? .numericText() : .identity)
            .lineLimit(1)

            if config.showChevron {
                Image.airBundle("ArrowUpDown")
                    .opacity(0.5)
                    .offset(y: -1)
                    .padding(.vertical, -8)
                    .accessibilityHidden(true)
            }
        }
        .backportGeometryGroup()
        .minimumScaleFactor(0.1)
        .sensitiveData(
            alignment: .center,
            cols: 14,
            rows: 3,
            cellSize: config.sensitiveDataCellSize,
            theme: config.sensitiveDataTheme,
            cornerRadius: 12,
            onReveal: onSensitiveDataReveal
        )
    }

    private func placeholderView() -> some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(.white.opacity(0.12))
            .frame(idealWidth: 120, maxWidth: 120, minHeight: 60, maxHeight: 60)
    }

    public static func == (lhs: Self, rhs: Self) -> Bool {
        lhs.balance == rhs.balance &&
            lhs.isNumericTransitionEnabled == rhs.isNumericTransitionEnabled &&
            lhs.style == rhs.style
    }
}

// MARK: - CardMiniPlaceholders

public struct CardMiniPlaceholders: View {
    public init() {}

    public var body: some View {
        VStack(spacing: 5.5) {
            VStack(spacing: 1.5) {
                Capsule()
                    .frame(width: 16, height: 2)
                Capsule()
                    .opacity(0.6)
                    .frame(width: 6, height: 1.5)
            }
            Capsule()
                .opacity(0.6)
                .frame(width: 8, height: 1.5)
        }
        .padding(.top, 3)
    }
}
