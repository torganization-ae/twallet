import ContextMenuKit
import SwiftUI
import UIComponents
import WalletContext
import WalletCore
import Perception

@Perceptible
@MainActor
final class ReceiveChainSelectorModel {
    var chain: ApiChain

    init(chain: ApiChain) {
        self.chain = chain
    }
}

struct ReceiveChainSelectorTrigger: View {
    var model: ReceiveChainSelectorModel

    var body: some View {
        WithPerceptionTracking {
            HStack(spacing: 6) {
                Image(uiImage: model.chain.image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 22, height: 22)

                Text(model.chain.title)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)

                Image(systemName: "chevron.down")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.75))
            }
            .padding(.vertical, 6)
            .padding(.horizontal, 4)
            .fixedSize()
            .contentShape(.rect)
        }
    }
}

@MainActor
func makeReceiveChainMenuConfig(
    accountContext: AccountContext,
    selectedChain: @escaping () -> ApiChain,
    onSelect: @escaping (ApiChain) -> Void
) -> () -> ContextMenuConfiguration {
    {
        let chains = accountContext.orderedChains.map(\.0)
        let current = selectedChain()

        var items: [ContextMenuItem] = chains.map { chain in
            .action(
                ContextMenuAction(
                    title: chain.title,
                    icon: .image(chain.image, renderingMode: .original),
                    handler: {
                        guard chain != current else { return }
                        onSelect(chain)
                    }
                )
            )
        }

        items.append(.separator)
        items.append(
            .action(
                ContextMenuAction(
                    title: lang("Networks"),
                    icon: .airBundle("MenuNetworks28"),
                    handler: {
                        AppActions.showSettings(section: .networks)
                    }
                )
            )
        )

        return ContextMenuConfiguration(
            rootPage: ContextMenuPage(items: items),
            backdrop: .none,
            style: ContextMenuStyle(
                minWidth: 220.0,
                maxWidth: 280.0,
                sourceSpacing: 0.0,
                // Default 20pt separator block looks too heavy for the Networks footer.
                separatorHeight: 8.0
            )
        )
    }
}

func resolveReceiveChain(visibleChains: [ApiChain], preferred: ApiChain?) -> ApiChain? {
    guard !visibleChains.isEmpty else { return nil }
    if let preferred, visibleChains.contains(preferred) {
        return preferred
    }
    if visibleChains.contains(.ton) {
        return .ton
    }
    return visibleChains[0]
}
