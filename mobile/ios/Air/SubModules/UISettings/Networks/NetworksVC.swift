import Foundation
import UIKit
import UIComponents
import WalletCore
import WalletContext

public final class NetworksVC: SettingsBaseVC, UICollectionViewDelegate {

    private var items: [ApiNetworkRpcConfigItem] = []
    private var collectionView: UICollectionView!
    private var dataSource: UICollectionViewDiffableDataSource<Section, Item>?

    private enum Section: Hashable {
        case builtin
    }

    private enum Item: Hashable {
        case chain(String)
    }

    private enum NetworkStatus {
        case active, inactive, warning

        var color: UIColor {
            switch self {
            case .active: return .air.positiveAmount
            case .inactive: return .air.error
            case .warning: return .systemOrange
            }
        }
    }

    public init() {
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    public override func viewDidLoad() {
        super.viewDidLoad()
        setupViews()
    }

    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        Task { await reload() }
    }

    private func setupViews() {
        view.backgroundColor = .air.groupedBackground
        navigationItem.title = lang("Networks")

        var configuration = UICollectionLayoutListConfiguration(appearance: .insetGrouped)
        configuration.headerMode = .supplementary
        configuration.headerTopPadding = 24
        let layout = UICollectionViewCompositionalLayout.list(using: configuration)
        collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = .clear
        collectionView.delegate = self
        collectionView.delaysContentTouches = false
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(collectionView)
        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: view.topAnchor),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        let cellRegistration = UICollectionView.CellRegistration<UICollectionViewListCell, Item> {
            [weak self] cell, _, item in
            guard let self else { return }
            var content = cell.defaultContentConfiguration()
            switch item {
            case .chain(let chain):
                guard let config = self.items.first(where: { $0.chain == chain }) else { return }
                content.text = config.title
                content.image = self.iconWithStatus(chain: chain, status: self.status(for: config))
                content.imageProperties.maximumSize = CGSize(width: 28, height: 28)
                content.imageProperties.cornerRadius = 0
                let primaryUrl = config.fields.first?.url.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                if primaryUrl.isEmpty {
                    content.secondaryText = lang("No endpoint")
                } else {
                    content.secondaryText = URL(string: primaryUrl)?.host ?? primaryUrl
                }
                content.secondaryTextProperties.color = .secondaryLabel
                cell.accessories = [
                    .customView(configuration: self.makeMenuAccessory(for: config))
                ]
            }
            cell.contentConfiguration = content
        }

        let headerRegistration = UICollectionView.SupplementaryRegistration<UICollectionViewListCell>(
            elementKind: UICollectionView.elementKindSectionHeader
        ) { cell, _, _ in
            var content = UIListContentConfiguration.groupedHeader()
            content.text = lang("RPC and API endpoints")
            cell.contentConfiguration = content
        }

        let dataSource = UICollectionViewDiffableDataSource<Section, Item>(
            collectionView: collectionView
        ) { collectionView, indexPath, itemIdentifier in
            collectionView.dequeueConfiguredReusableCell(
                using: cellRegistration,
                for: indexPath,
                item: itemIdentifier
            )
        }
        dataSource.supplementaryViewProvider = { collectionView, elementKind, indexPath in
            guard elementKind == UICollectionView.elementKindSectionHeader else { return nil }
            return collectionView.dequeueConfiguredReusableSupplementary(
                using: headerRegistration,
                for: indexPath
            )
        }
        self.dataSource = dataSource
    }

    private func status(for config: ApiNetworkRpcConfigItem) -> NetworkStatus {
        let primaryUrl = config.fields.first?.url.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if config.isHidden == true {
            return .inactive
        }
        if primaryUrl.isEmpty {
            return .warning
        }
        return .active
    }

    private func iconWithStatus(chain: String, status: NetworkStatus) -> UIImage? {
        let base = UIImage(named: "chain_\(chain)", in: AirBundle, compatibleWith: nil)
            ?? UIImage(systemName: "circle.fill")
        guard let base else { return nil }

        let size = CGSize(width: 28, height: 28)
        let renderer = UIGraphicsImageRenderer(size: size)
        return renderer.image { _ in
            base.draw(in: CGRect(origin: .zero, size: size))
            let dotSize: CGFloat = 10
            let border: CGFloat = 2
            let rect = CGRect(
                x: size.width - dotSize,
                y: size.height - dotSize,
                width: dotSize,
                height: dotSize
            )
            UIColor.air.groupedItem.setFill()
            UIBezierPath(ovalIn: rect).fill()
            status.color.setFill()
            UIBezierPath(ovalIn: rect.insetBy(dx: border / 2, dy: border / 2)).fill()
        }
    }

    private func makeMenuAccessory(for config: ApiNetworkRpcConfigItem) -> UICellAccessory.CustomViewConfiguration {
        let button = UIButton(type: .system)
        let symbol = UIImage.SymbolConfiguration(pointSize: 15, weight: .medium)
        button.setImage(UIImage(systemName: "ellipsis", withConfiguration: symbol), for: .normal)
        button.tintColor = .secondaryLabel
        button.showsMenuAsPrimaryAction = true
        button.menu = makeMenu(for: config)
        return UICellAccessory.CustomViewConfiguration(
            customView: button,
            placement: .trailing(displayed: .always),
            reservedLayoutWidth: .custom(36),
            maintainsFixedSize: true
        )
    }

    private func visibleCount() -> Int {
        items.reduce(0) { $0 + ($1.isHidden == true ? 0 : 1) }
    }

    private func canDisable(_ config: ApiNetworkRpcConfigItem) -> Bool {
        config.isHidden == true || visibleCount() > 1
    }

    private func makeMenu(for config: ApiNetworkRpcConfigItem) -> UIMenu {
        let isHidden = config.isHidden == true
        let edit = UIAction(
            title: lang("Edit Network"),
            image: UIImage(systemName: "pencil")
        ) { [weak self] _ in
            self?.openDetail(config)
        }
        let allowDisable = canDisable(config)
        let toggleTitle = isHidden ? lang("Enable") : lang("Disable")
        var toggle = UIAction(
            title: toggleTitle,
            image: UIImage(systemName: isHidden ? "eye" : "eye.slash")
        ) { [weak self] _ in
            guard isHidden || allowDisable else { return }
            Task { await self?.setVisibility(chain: config.chain, isHidden: !isHidden) }
        }
        if !isHidden && !allowDisable {
            toggle.attributes.insert(.disabled)
        }

        var children: [UIMenuElement] = [edit, toggle]

        if let apiChain = ApiChain(rawValue: config.chain),
           let address = AccountStore.account?.getAddress(chain: apiChain),
           !address.isEmpty {
            let copy = UIAction(
                title: lang("Copy Address"),
                image: UIImage(systemName: "doc.on.doc")
            ) { _ in
                AppActions.copyString(
                    address,
                    toastMessage: lang("%chain% Address Copied", arg1: apiChain.title)
                )
            }
            let showQr = UIAction(
                title: lang("Show Wallet QR"),
                image: UIImage(systemName: "qrcode")
            ) { _ in
                AppActions.showReceive(
                    accountContext: AccountContext(source: .current),
                    chain: apiChain
                )
            }
            children.append(contentsOf: [copy, showQr])
        }

        return UIMenu(children: children)
    }

    private func openDetail(_ config: ApiNetworkRpcConfigItem) {
        navigationController?.pushViewController(
            NetworkDetailVC(
                chain: config.chain,
                title: config.title,
                isHidden: config.isHidden == true,
                canDisable: canDisable(config)
            ),
            animated: true
        )
    }

    private func setVisibility(chain: String, isHidden: Bool) async {
        do {
            let result = try await Api.setChainVisibility(
                chain: chain,
                network: AccountStore.activeNetwork,
                isHidden: isHidden
            )
            guard result.ok else { return }
            await reload()
        } catch {
            // Keep previous list on failure
        }
    }

    private func reload() async {
        do {
            let network = AccountStore.activeNetwork
            let result = try await Api.getRpcConfig(network: network)
            await MainActor.run {
                self.items = result
                var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
                snapshot.appendSections([.builtin])
                snapshot.appendItems(result.map { .chain($0.chain) }, toSection: .builtin)
                snapshot.reconfigureItems(snapshot.itemIdentifiers)
                self.dataSource?.apply(snapshot, animatingDifferences: false)
            }
        } catch {
            // Keep previous list on failure
        }
    }

    public func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        collectionView.deselectItem(at: indexPath, animated: true)
        guard let item = dataSource?.itemIdentifier(for: indexPath) else { return }
        switch item {
        case .chain(let chain):
            guard let config = items.first(where: { $0.chain == chain }) else { return }
            openDetail(config)
        }
    }
}
