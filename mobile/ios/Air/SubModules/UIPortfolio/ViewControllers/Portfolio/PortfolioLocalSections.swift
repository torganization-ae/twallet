import Perception
import SwiftUI
import UIComponents
import WalletCore
import WalletContext

enum PortfolioInsightCardID: String, Hashable {
    case chainSplit
    case assetClasses
}

struct PortfolioInsightSegment: Equatable, Identifiable {
    let id: String
    let title: String
    let value: Double
    let valueText: String
    let colorHex: String
}

struct PortfolioInsightCardModel: Equatable, Identifiable {
    let id: PortfolioInsightCardID
    let title: String
    let segments: [PortfolioInsightSegment]
    let emptyText: String?
}

enum PortfolioInsightCardMetrics {
    static let contentVerticalPadding = CGFloat(16)
    static let barHeight = CGFloat(8)
    static let barToLegendSpacing = CGFloat(12)
    static let emptyContentHeight = CGFloat(48)
    static let estimatedCardHeight = CGFloat(140)

    static func legendRowHeight(segmentCount: Int) -> CGFloat {
        segmentCount > 4 ? 17 : 20
    }

    static func legendRowSpacing(segmentCount: Int) -> CGFloat {
        segmentCount > 4 ? 3 : 8
    }
}

struct PortfolioOverviewSectionView: View {
    let accountContext: AccountContext
    let overview: PortfolioOverviewModel

    var body: some View {
        WithPerceptionTracking {
            VStack(alignment: .leading, spacing: 0) {
                HStack(alignment: .bottom, spacing: 12) {
                    Text(lang("Overview"))
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(Color.air.secondaryLabel)
                        .lineLimit(1)

                    Spacer(minLength: 8)

                    if let dateRangeText = overview.dateRangeText {
                        Text(dateRangeText)
                            .font(.system(size: 14, weight: .regular))
                            .foregroundStyle(Color(uiColor: .air.secondaryLabel))
                            .lineLimit(1)
                            .minimumScaleFactor(0.75)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 9)
                .frame(maxWidth: .infinity, minHeight: 39, maxHeight: 39, alignment: .bottom)

                HStack(alignment: .center, spacing: 16) {
                    overviewColumn(
                        value: accountContext.balance?.formatted(.baseCurrencyEquivalent, roundHalfUp: true),
                        title: lang("Total Balance")
                    )

                    overviewColumn(
                        value: overview.netChangeText,
                        title: lang("Net Change"),
                        trailingText: overview.netChangePercentText,
                        trailingColor: overview.isNetChangePositive ? .air.positiveAmount : .air.negativeAmount
                    )
                }
                .padding(.horizontal, 16)
                .frame(maxWidth: .infinity, minHeight: 66, maxHeight: 66)
                .background(Color.air.groupedItem)
                .clipShape(.rect(cornerRadius: 26, style: .continuous))
            }
        }
    }

    private func overviewColumn(
        value: String?,
        title: String,
        trailingText: String? = nil,
        valueColor: UIColor = .label,
        trailingColor: UIColor = .air.secondaryLabel
    ) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(value ?? "")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color(uiColor: valueColor))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                    .contentTransition(accountContext.isCurrent ? .numericText() : .identity)

                if let trailingText {
                    Text(trailingText)
                        .font(.system(size: 13, weight: .regular))
                        .foregroundStyle(Color(uiColor: trailingColor))
                        .lineLimit(1)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .sensitiveData(
                alignment: .leading,
                cols: 8,
                rows: 2,
                cellSize: 6,
                theme: .adaptive,
                cornerRadius: 6
            )

            Text(title)
                .font(.system(size: 13, weight: .regular))
                .foregroundStyle(Color.air.secondaryLabel)
                .lineLimit(2)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct PortfolioInsightCardView: View {
    let card: PortfolioInsightCardModel

    private var displayedSegments: [PortfolioInsightSegment] {
        card.segments.filter { $0.value > 0 }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(card.title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(Color.air.secondaryLabel)
                .lineLimit(1)
                .padding(.horizontal, 16)
                .padding(.bottom, 9)
                .frame(maxWidth: .infinity, minHeight: 39, maxHeight: 39, alignment: .bottomLeading)

            VStack(alignment: .leading, spacing: PortfolioInsightCardMetrics.barToLegendSpacing) {
                if displayedSegments.isEmpty {
                    Text(card.emptyText ?? lang("No data"))
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(Color.air.secondaryLabel)
                        .lineLimit(2)
                        .frame(
                            maxWidth: .infinity,
                            minHeight: PortfolioInsightCardMetrics.emptyContentHeight,
                            alignment: .center
                        )
                } else {
                    PortfolioInsightBarView(segments: displayedSegments)
                        .frame(height: PortfolioInsightCardMetrics.barHeight)

                    PortfolioInsightLegendView(
                        segments: displayedSegments,
                        totalValue: displayedSegments.reduce(0) { $0 + $1.value }
                    )
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, PortfolioInsightCardMetrics.contentVerticalPadding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.air.groupedItem)
            .clipShape(.rect(cornerRadius: 26, style: .continuous))
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
    }
}

private struct PortfolioInsightBarView: View {
    let segments: [PortfolioInsightSegment]

    var body: some View {
        GeometryReader { proxy in
            let totalValue = segments.reduce(0) { $0 + $1.value }
            let width = proxy.size.width

            HStack(spacing: 0) {
                ForEach(segments) { segment in
                    let segmentWidth = totalValue > 0
                        ? width * CGFloat(segment.value / totalValue)
                        : 0
                    Rectangle()
                        .fill(Color(UIColor(hex: segment.colorHex)))
                        .frame(width: max(segmentWidth, 0))
                }
            }
        }
        .clipShape(Capsule())
        .background(Color.air.secondaryLabel.opacity(0.12), in: Capsule())
    }
}

private struct PortfolioInsightLegendView: View {
    let segments: [PortfolioInsightSegment]
    let totalValue: Double

    var body: some View {
        VStack(alignment: .leading, spacing: rowSpacing) {
            ForEach(segments) { segment in
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color(UIColor(hex: segment.colorHex)))
                        .frame(width: 8, height: 8)

                    Text(segment.title)
                        .font(titleFont)
                        .foregroundStyle(Color.primary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Text(valueText(for: segment))
                        .font(valueFont)
                        .foregroundStyle(Color.air.secondaryLabel)
                        .lineLimit(1)
                }
                .frame(height: rowHeight)
            }
        }
    }

    private var rowHeight: CGFloat {
        PortfolioInsightCardMetrics.legendRowHeight(segmentCount: segments.count)
    }

    private var rowSpacing: CGFloat {
        PortfolioInsightCardMetrics.legendRowSpacing(segmentCount: segments.count)
    }

    private var titleFont: Font {
        .system(size: segments.count > 4 ? 13 : 14, weight: .semibold)
    }

    private var valueFont: Font {
        .system(size: segments.count > 4 ? 13 : 14, weight: .regular)
    }

    private func valueText(for segment: PortfolioInsightSegment) -> String {
        guard totalValue > 0 else {
            return "0%"
        }
        return portfolioInsightPercentageText(segment.value / totalValue)
    }
}

private func portfolioInsightPercentageText(_ value: Double) -> String {
    formatPercent(value, decimals: 0, showPlus: false, showMinus: false)
}
