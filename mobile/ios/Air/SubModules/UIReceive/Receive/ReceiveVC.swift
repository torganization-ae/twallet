//
//  ReceiveVC.swift
//  UIHome
//
//  Created by Sina on 4/22/23.
//

import ContextMenuKit
import SwiftUI
import UIKit
import UIComponents
import WalletContext
import WalletCore
import Perception

/// Fits nav chrome + `$receive_description` + 200pt QR (web parity). Address lives in the table below.
let headerHeight: CGFloat = 420

public class ReceiveVC: WViewController {
    
    private let preferredChain: ApiChain?
    
    private var segmentedController: WSegmentedController!
    private var hostingController: UIHostingController<ReceiveHeaderView>!
    private var chainSelectorModel: ReceiveChainSelectorModel!
    private var previousNavigationBarStyle: UIUserInterfaceStyle = .unspecified
    
    @AccountContext private var account: MAccount

    public init(accountContext: AccountContext, chain: ApiChain? = nil) {
        self._account = accountContext
        self.preferredChain = chain
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    public override func loadView() {
        super.loadView()
        setupViews()
    }
    
    private var visibleChains: [ApiChain] {
        _account.orderedChains.map(\.0)
    }
    
    private func setupViews() {
        let defaultChain = resolveReceiveChain(visibleChains: visibleChains, preferred: preferredChain)
        let defaultItemId = defaultChain?.rawValue
        
        segmentedController = WSegmentedController(
            items: makeChainItems(),
            defaultItemId: defaultItemId,
            barHeight: 0,
            goUnderNavBar: true,
            animationSpeed: .slow,
            primaryTextColor: .white,
            secondaryTextColor: .white,
            capsuleFillColor: .white.withAlphaComponent(0.16),
            style: .colorHeader
        )
        
        segmentedController.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(segmentedController)
        NSLayoutConstraint.activate([
            segmentedController.topAnchor.constraint(equalTo: view.topAnchor),
            segmentedController.leftAnchor.constraint(equalTo: view.leftAnchor),
            segmentedController.rightAnchor.constraint(equalTo: view.rightAnchor),
            segmentedController.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        segmentedController.backgroundColor = .clear
        segmentedController.blurView.isHidden = true
        segmentedController.separator.isHidden = true
        segmentedController.segmentedControl.isHidden = true
        segmentedController.segmentedControl.removeFromSuperview()
        segmentedController.scrollView.isScrollEnabled = false

        self.hostingController = addHostingController(makeHeader()) { hv in
            NSLayoutConstraint.activate([
                hv.topAnchor.constraint(equalTo: self.view.topAnchor),
                hv.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
                hv.trailingAnchor.constraint(equalTo: self.view.trailingAnchor),
                hv.heightAnchor.constraint(equalToConstant: headerHeight)
            ])
        }
        hostingController.disableSafeArea()
        hostingController.view.clipsToBounds = true
        
        view.bringSubviewToFront(segmentedController)
        
        configureNavigationItemWithTransparentBackground()
        setNavigationControlsAppearance()
        
        if #available(iOS 26, *) {
            addCloseNavigationItemIfNeeded()
        } else {
            let image = UIImage(systemName: "xmark")
            let item = UIBarButtonItem(image: image, primaryAction: UIAction { _ in
                topViewController()?.dismiss(animated: true)
            })
            item.tintColor = .white.withAlphaComponent(0.75)
            navigationItem.rightBarButtonItem = item
        }

        let initialChain = defaultChain
            ?? ApiChain(rawValue: segmentedController.model.selectedItem?.id ?? "")
            ?? .ton
        chainSelectorModel = ReceiveChainSelectorModel(chain: initialChain)
        configureNavigationChrome()

        updateTheme()
    }

    private func configureNavigationChrome() {
        let selectorView = HostingView {
            ReceiveChainSelectorTrigger(model: self.chainSelectorModel)
                .contextMenuSource(
                    triggers: [.tap],
                    configuration: makeReceiveChainMenuConfig(
                        accountContext: self._account,
                        selectedChain: { [weak self] in
                            self?.chainSelectorModel.chain ?? .ton
                        },
                        onSelect: { [weak self] chain in
                            self?.selectChain(chain)
                        }
                    )
                )
        }
        selectorView.backgroundColor = .clear
        selectorView.setContentHuggingPriority(.required, for: .horizontal)
        selectorView.setContentCompressionResistancePriority(.required, for: .horizontal)
        let size = selectorView.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
        selectorView.frame = CGRect(origin: .zero, size: size)
        let leftItem = UIBarButtonItem(customView: selectorView)
        leftItem.tintColor = .white
        navigationItem.leftBarButtonItem = leftItem
        // Keep room for logo + chain title; default nav items can compress the leading view.
        navigationItem.leftBarButtonItem?.width = max(size.width, 1)
        navigationItem.titleView = nil
        navigationItem.title = nil
    }

    private func selectChain(_ chain: ApiChain) {
        guard let index = segmentedController.model.getItemIndexById(itemId: chain.rawValue) else { return }
        chainSelectorModel.chain = chain
        segmentedController.model.selection = .init(item1: chain.rawValue)
        segmentedController.handleSegmentChange(to: index, animated: true)
        // Resize leading custom view after title text changes (TON ↔ Hyperliquid, etc.).
        if let selectorView = navigationItem.leftBarButtonItem?.customView {
            selectorView.invalidateIntrinsicContentSize()
            let size = selectorView.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
            selectorView.frame.size = size
            navigationItem.leftBarButtonItem?.width = max(size.width, 1)
            navigationItem.leftBarButtonItem = navigationItem.leftBarButtonItem
        }
    }
    
    public override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        previousNavigationBarStyle = navigationController?.navigationBar.overrideUserInterfaceStyle ?? .unspecified
        navigationController?.navigationBar.overrideUserInterfaceStyle = .dark
    }
    
    public override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        navigationController?.navigationBar.overrideUserInterfaceStyle = .unspecified
        navigationController?.navigationBar.overrideUserInterfaceStyle = previousNavigationBarStyle
    }
    
    public override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        keepUserInterfaceStyleForChildPages()
    }
    
    /// Overrides user interface style to dark to turn off whitish tint for navigation controls
    private func setNavigationControlsAppearance() {
        segmentedController.overrideUserInterfaceStyle = .dark
        keepUserInterfaceStyleForChildPages()
    }
    
    /// Restores system-wide user interface style overridden in `setNavigationControlsAppearance `
    private func keepUserInterfaceStyleForChildPages() {
        segmentedController.model.items.forEach {
             $0.viewController.overrideUserInterfaceStyle = traitCollection.userInterfaceStyle
        }
    }

    private func makeChainItems() -> [SegmentedControlItem] {
        _account.orderedChains.map { (chain, _) in
            SegmentedControlItem(
                id: chain.rawValue,
                title: chain.title,
                viewController: ReceiveTableVC(account: _account, chain: chain),
            )
        }
    }
    
    private func updateTheme() {
        view.backgroundColor = .air.sheetBackground
    }
    
    public override func scrollToTop(animated: Bool) {
        segmentedController?.scrollToTop(animated: animated)
    }
            
    private func makeHeader() -> ReceiveHeaderView {
        ReceiveHeaderView(viewModel: segmentedController.model, accountContext: _account)
    }
}

#if DEBUG
@available(iOS 26, *)
#Preview {
    previewSheet(ReceiveVC(accountContext: AccountContext(source: .current)))
}
#endif
