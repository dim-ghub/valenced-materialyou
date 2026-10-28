import { Tokens } from '@valenced/discord/common/tokens'
import { Stores } from '@valenced/discord/flux'
import type { DiscordModules } from '@valenced/discord/types'

type ThemeStore = DiscordModules.Flux.Store<{ theme: string }>

/** Resolves the first semantic color the running Discord has, for the current theme. */
export function color(names: string[], fallback: string) {
	try {
		const { colors, internal } = Tokens.default
		const theme = (Stores.ThemeStore as ThemeStore).theme
		for (const name of names)
			if (name in colors)
				return internal.resolveSemanticColor(theme, colors[name])
	} catch {}
	return fallback
}

export const Roles = {
	primary: () => color(['BACKGROUND_BRAND'], '#80d5c8'),
	// a dark thumb on a light track in dark themes, and the other way around in light ones
	onPrimary: () =>
		color(['BACKGROUND_BASE_LOWEST', 'BACKGROUND_TERTIARY'], '#00382f'),
	outline: () => color(['BORDER_STRONG', 'INTERACTIVE_MUTED'], '#889391'),
	onSurfaceVariant: () =>
		color(['INTERACTIVE_NORMAL', 'TEXT_MUTED', 'ICON_DEFAULT'], '#bdc9c6'),
	surfaceHighest: () =>
		color(['BACKGROUND_SURFACE_HIGHEST', 'BACKGROUND_MOD_STRONG'], '#2f3635'),
}
