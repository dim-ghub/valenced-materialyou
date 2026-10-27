@file:JvmName("MaterialYou")

package dim.materialyou

import android.app.AndroidAppHelper
import android.content.Context
import android.os.Build
import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeMethod
import org.json.JSONArray
import org.json.JSONObject

private val Palettes = listOf("accent1", "accent2", "accent3", "neutral1", "neutral2")

// lightest to darkest
private val Shades = listOf(0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000)

@Suppress("UNUSED")
val materialYou = plugin {
    start {
        var appContext: Context? = null
        withAppContext { appContext = it.applicationContext }

        registerNativeMethod("${manifest.id}.getPalettes") {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return@registerNativeMethod null

            val context = AndroidAppHelper.currentApplication() ?: appContext
                ?: return@registerNativeMethod null
            val res = context.resources

            val palettes = JSONObject()
            for (palette in Palettes) {
                val shades = JSONArray()
                for (shade in Shades) {
                    @Suppress("DiscouragedApi")
                    val id = res.getIdentifier("system_${palette}_$shade", "color", "android")
                    if (id == 0) return@registerNativeMethod null
                    shades.put(String.format("#%06X", res.getColor(id, null) and 0xFFFFFF))
                }
                palettes.put(palette, shades)
            }
            palettes.toString()
        }
    }
}
