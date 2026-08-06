
import Foundation
import UIKit
import UIComponents
import WalletCore
import WalletContext
import SwiftUI
import Perception

struct HomeCardBackground: View {
    
    var headerViewModel: HomeHeaderViewModel
    var accountContext: AccountContext
    
    var body: some View {
        WithPerceptionTracking {
            _StaticBackground()
                .opacity(headerViewModel.isCardHidden ? 0 : 1)
        }
    }
}

private struct _StaticBackground: View {
    
    var body: some View {
        Color.air.groupedBackground
            .overlay {
                Image(uiImage: .homeCard)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .transition(.opacity.animation(.smooth(duration: 0.15)))
            }
            .clipShape(.rect(cornerRadius: 26))
            .containerShape(.rect(cornerRadius: 26))
    }
}
