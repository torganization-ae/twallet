
import Foundation
import UIKit
import UIComponents
import WalletCore
import WalletContext
import SwiftUI
import Perception
import Dependencies

struct HomeCardBackground: View {
    
    var headerViewModel: HomeHeaderViewModel
    var accountContext: AccountContext
    @Dependency(\.accountSettings) private var accountSettingsStore
    
    var body: some View {
        WithPerceptionTracking {
            _GradientBackground(
                accentColorIndex: accountSettingsStore
                    .for(accountId: accountContext.account.accountId)
                    .resolvedAccentColorIndex
            )
                .opacity(headerViewModel.isCardHidden ? 0 : 1)
        }
    }
}

private struct _GradientBackground: View {
    let accentColorIndex: Int
    @State private var isShifted = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        LinearGradient(
            colors: cardGradientColors(for: accentColorIndex),
            startPoint: isShifted ? .top : .topLeading,
            endPoint: isShifted ? .bottomTrailing : .bottom
        )
            .clipShape(.rect(cornerRadius: 26))
            .containerShape(.rect(cornerRadius: 26))
            .onAppear {
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 12).repeatForever(autoreverses: true)) {
                    isShifted = true
                }
            }
    }
}
