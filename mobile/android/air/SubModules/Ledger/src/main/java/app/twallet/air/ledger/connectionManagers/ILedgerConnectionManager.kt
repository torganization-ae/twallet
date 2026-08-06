package app.twallet.air.ledger.connectionManagers

import app.twallet.air.ledger.LedgerManager

interface ILedgerConnectionManager {
    fun startConnection(onUpdate: (LedgerManager.ConnectionState) -> Unit)
    fun stopConnection()

    fun write(
        apdu: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    )
}
