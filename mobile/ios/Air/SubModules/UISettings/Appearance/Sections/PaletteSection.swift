import Foundation
import SwiftUI
import UIKit
import UIComponents
import WalletContext
import WalletCore
import Perception
import Dependencies

struct PaletteSection: View {
    @Dependency(\.accountStore) var accountStore
    @Dependency(\.accountSettings) var accountSettingsStore

    var body: some View {
        WithPerceptionTracking {
            let accountId = accountStore.currentAccountId
            let settings = accountSettingsStore.for(accountId: accountId)
            let selectedIndex = settings.accentColorIndex

            InsetSection {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 40))], spacing: 12) {
                    ForEach(Array(ACCENT_COLORS.enumerated()), id: \.offset) { index, color in
                        Button {
                            settings.setAccentColorIndex(index)
                        } label: {
                            Color(uiColor: color)
                                .aspectRatio(contentMode: .fit)
                                .clipShape(.circle)
                                .overlay(
                                    Circle()
                                        .stroke(selectedIndex == index ? Color.air.tint : Color.clear, lineWidth: 2)
                                        .padding(2)
                                )
                                .overlay {
                                    if selectedIndex == index {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 12, weight: .bold))
                                            .foregroundStyle(.white)
                                            .shadow(color: .black.opacity(0.45), radius: 1, x: 0, y: 1)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 12)
            } header: {
                Text(lang("Palette"))
            }
        }
    }

}
