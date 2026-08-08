
import SwiftUI
import UIComponents
import WalletContext
import WalletCore
import Perception

struct NotificationsSettingsView: View {
    
    var viewModel: NotificationsSettingsViewModel
    
    var body: some View {
        WithPerceptionTracking {
            InsetList(topPadding: 16, spacing: 24) {
                soundsSection
                    .padding(.bottom, 48)
            }
            .onChange(of: viewModel.playSounds) { playSounds in
                AppStorageHelper.sounds = playSounds
            }
        }
    }
    
    @ViewBuilder
    var soundsSection: some View {
        @Perception.Bindable var viewModel = viewModel
        InsetSection {
            InsetCell(verticalPadding: 0) {
                HStack {
                    Text(lang("Play Sounds"))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Toggle(lang("Play Sounds"), isOn: $viewModel.playSounds)
                        .labelsHidden()
                }
                .frame(minHeight: 44)
            }
        }
    }
}
