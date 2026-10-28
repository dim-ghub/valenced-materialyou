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

/** Sets the alpha of a `#rrggbb` or `#rrggbbaa` color. */
export function withAlpha(hex: string, alpha: number) {
	if (!/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) return hex
	return (
		hex.slice(0, 7) +
		Math.round(alpha * 255)
			.toString(16)
			.padStart(2, '0')
	)
}

export const Roles = {
	primary: () => color(['BACKGROUND_BRAND'], '#80d5c8'),
	danger: () =>
		color(
			['TEXT_FEEDBACK_CRITICAL', 'TEXT_DANGER', 'STATUS_DANGER'],
			'#ffb4ab',
		),
	// a dark thumb on a light track in dark themes, and the other way around in light ones
	onPrimary: () =>
		color(['BACKGROUND_BASE_LOWEST', 'BACKGROUND_TERTIARY'], '#00382f'),
	outline: () => color(['BORDER_STRONG', 'INTERACTIVE_MUTED'], '#889391'),
	onSurfaceVariant: () =>
		color(['INTERACTIVE_NORMAL', 'TEXT_MUTED', 'ICON_DEFAULT'], '#bdc9c6'),
	surfaceHighest: () =>
		color(['BACKGROUND_SURFACE_HIGHEST', 'BACKGROUND_MOD_STRONG'], '#2f3635'),
}
