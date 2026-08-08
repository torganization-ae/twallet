
import Foundation
import WalletCore
import Perception

@Perceptible
@MainActor final class NotificationsSettingsViewModel {
    
    var playSounds: Bool = AppStorageHelper.sounds
}
