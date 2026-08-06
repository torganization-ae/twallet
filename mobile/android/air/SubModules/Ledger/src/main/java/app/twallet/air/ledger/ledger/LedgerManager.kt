package app.twallet.air.ledger

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.ledger.live.ble.BleManagerFactory
import org.json.JSONObject
import app.twallet.air.ledger.connectionManagers.ILedgerConnectionManager
import app.twallet.air.ledger.connectionManagers.LedgerBleManager
import app.twallet.air.ledger.connectionManagers.LedgerUsbManager
import app.twallet.air.walletcore.WalletCore
import app.twallet.air.walletcore.WalletEvent
import app.twallet.air.walletcore.models.MBridgeError

object LedgerManager : WalletCore.EventObserver {
    enum class ConnectionMode {
        BLE,
        USB
    }

    sealed class ConnectionState {
        data object None : ConnectionState()
        data object Connecting : ConnectionState()
        data class ConnectingToTonApp(val device: LedgerDevice) : ConnectionState()
        data class Done(val device: LedgerDevice) : ConnectionState()
        data class Error(
            val step: Step,
            val shortMessage: CharSequence?,
            val bridgeError: MBridgeError? = null,
        ) :
            ConnectionState() {
            enum class Step {
                CONNECT,
                TON_APP,
                SIGN;
            }
        }
    }

    private var connectionState: ConnectionState = ConnectionState.None
    private var onUpdate: ((ConnectionState) -> Unit)? = null
    private var activeManager: ILedgerConnectionManager? = null
    var activeMode: ConnectionMode? = null
        set(value) {
            field = value
            activeManager?.stopConnection()
            activeManager = null
        }

    fun init(applicationContext: Context) {
        LedgerBleManager.init(applicationContext)
        LedgerUsbManager.init(applicationContext)
        WalletCore.unregisterObserver(this)
        WalletCore.registerObserver(this)
    }

    fun startConnection(
        mode: ConnectionMode,
        onUpdate: (ConnectionState) -> Unit
    ) {
        this.onUpdate = onUpdate
        this.activeMode = mode
        when (mode) {
            ConnectionMode.BLE -> {
                activeManager = LedgerBleManager
                LedgerBleManager.startConnection(onUpdate = {
                    Handler(Looper.getMainLooper()).post {
                        connectionState = it
                        this.onUpdate?.invoke(it)
                    }
                })
            }

            ConnectionMode.USB -> {
                activeManager = LedgerUsbManager
                LedgerUsbManager.startConnection(onUpdate = {
                    Handler(Looper.getMainLooper()).post {
                        connectionState = it
                        this.onUpdate?.invoke(it)
                    }
                })
            }
        }
    }

    fun stopConnection() {
        activeManager?.stopConnection()
        activeManager = null
        onUpdate = null
        BleManagerFactory.destroy()
    }

    override fun onWalletEvent(walletEvent: WalletEvent) {
        when (walletEvent) {
            is WalletEvent.LedgerDeviceModelRequest -> {
                val device = when (val state = connectionState) {
                    is ConnectionState.ConnectingToTonApp -> state.device
                    is ConnectionState.Done -> state.device
                    else -> null
                }
                walletEvent.onResponse(
                    device?.let {
                        JSONObject().apply {
                            put("id", device.model)
                            put("productName", device.productName)
                        }
                    }
                )
            }

            is WalletEvent.LedgerWriteRequest -> {
                try {
                    activeManager?.write(walletEvent.apdu, onSuccess = {
                        walletEvent.onResponse(it)
                    }, onError = {
                        walletEvent.onResponse("")
                    })
                } catch (_: Throwable) {
                    walletEvent.onResponse("")
                }
            }

            else -> {}
        }
    }
}
