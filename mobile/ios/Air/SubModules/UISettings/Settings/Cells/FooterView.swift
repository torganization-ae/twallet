
import UIKit
import WalletContext
import WalletCore

final class FooterView: UICollectionReusableView {
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupViews()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    func setupViews() {
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "???"
        let bundleVersion = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"
        let versionLabel = UILabel()
        versionLabel.translatesAutoresizingMaskIntoConstraints = false
        versionLabel.text = "\(APP_NAME) v\(displayedAppVersion(appVersion)) (\(bundleVersion))"
        versionLabel.textColor = .air.secondaryLabel
        versionLabel.font = .systemFont(ofSize: 14)
        addSubview(versionLabel)
        NSLayoutConstraint.activate([
            versionLabel.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            versionLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            versionLabel.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
        ])
        backgroundColor = UIColor.clear

        Task { @MainActor in
            guard let mark = try? await Api.getEnvironmentVariables().apiHostMark, !mark.isEmpty else { return }
            apiHostMark = mark
            versionLabel.text = "\(APP_NAME) v\(displayedAppVersion(appVersion)) (\(bundleVersion))"
        }
    }
}
