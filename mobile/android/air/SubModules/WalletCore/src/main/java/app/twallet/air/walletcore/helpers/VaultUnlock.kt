package app.twallet.air.walletcore.helpers

/** Session-scoped vault unlocks (cleared on logout / reset). Matches src/util/vaultUnlock.ts */
object VaultUnlock {
    private val unlockedAccountIds = mutableSetOf<String>()

    @Synchronized
    fun isUnlocked(accountId: String): Boolean = unlockedAccountIds.contains(accountId)

    @Synchronized
    fun unlock(accountId: String) {
        unlockedAccountIds.add(accountId)
    }

    @Synchronized
    fun lockAll() {
        unlockedAccountIds.clear()
    }
}
