package app.twallet.air.walletcontext

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeeplinkProvenanceContractTest {
    @Test
    fun handleDeeplinkCarriesOpenSource() {
        val method = WalletContextManagerDelegate::class.java.methods
            .single { it.name == "handleDeeplink" }

        assertEquals(
            listOf(String::class.java, getDeeplinkOpenSourceClass()),
            method.parameterTypes.toList()
        )
    }

    @Test
    fun openSourcesSeparateTrustedAndBrowserFlows() {
        val sourceClass = getDeeplinkOpenSourceClass()
        val sourceNames = sourceClass.enumConstants!!.map { (it as Enum<*>).name }

        assertEquals(
            listOf("OS_EXTERNAL", "IN_APP_BROWSER", "INTERNAL_UI", "QR_SCAN"),
            sourceNames
        )

        assertFalse(getBooleanProperty(sourceClass, "INTERNAL_UI", "requiresFreshAuth"))
        assertTrue(getBooleanProperty(sourceClass, "OS_EXTERNAL", "requiresFreshAuth"))
        assertTrue(getBooleanProperty(sourceClass, "IN_APP_BROWSER", "requiresFreshAuth"))
        assertTrue(getBooleanProperty(sourceClass, "QR_SCAN", "requiresFreshAuth"))

    }

    private fun getDeeplinkOpenSourceClass(): Class<*> {
        return Class.forName("app.twallet.air.walletcontext.DeeplinkOpenSource")
    }

    private fun getBooleanProperty(sourceClass: Class<*>, sourceName: String, propertyName: String): Boolean {
        val source = sourceClass.enumConstants!!
            .single { (it as Enum<*>).name == sourceName }
        val getterName = "get${propertyName.replaceFirstChar { it.uppercase() }}"

        return sourceClass.getMethod(getterName).invoke(source) as Boolean
    }
}
