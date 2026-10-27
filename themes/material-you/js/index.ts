/// <reference types="@valenced/themes-api" />

import { callNativeMethodSync } from '@valenced/modules/native'
import { AppState } from 'react-native'
import type {
	DiscordColors,
	ThemeBase,
	ThemeColors,
	ThemesApi,
} from '@valenced/themes-api/types'

const PluginId = 'dim.material-you'
const GroupId = 'material-you'

type PaletteName = 'accent1' | 'accent2' | 'accent3' | 'neutral1' | 'neutral2'
type Palettes = Record<PaletteName, string[]>

type Rgb = [r: number, g: number, b: number]

function parseHex(hex: string): Rgb {
	const n = Number.parseInt(hex.slice(1, 7), 16)
	return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function toHex([r, g, b]: Rgb) {
	return `#${[r, g, b]
		.map(c => Math.round(c).toString(16).padStart(2, '0'))
		.join('')}`
}

function linearize(c: number) {
	const s = c / 255
	return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

// m3 tone = CIE L*
function toneOf([r, g, b]: Rgb) {
	const y =
		0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
	return y <= 216 / 24389 ? (y * 24389) / 27 : 116 * Math.cbrt(y) - 16
}

type TonalPalette = { tone: number; rgb: Rgb }[]

function tonalPalette(shades: string[]): TonalPalette {
	return shades
		.map(parseHex)
		.map(rgb => ({ tone: toneOf(rgb), rgb }))
		.sort((a, b) => a.tone - b.tone)
}

function at(palette: TonalPalette, tone: number) {
	const first = palette[0]!
	const last = palette[palette.length - 1]!
	if (tone <= first.tone) return toHex(first.rgb)
	if (tone >= last.tone) return toHex(last.rgb)

	for (let i = 1; i < palette.length; i++) {
		const hi = palette[i]!
		if (hi.tone < tone) continue

		const lo = palette[i - 1]!
		const t = (tone - lo.tone) / (hi.tone - lo.tone || 1)
		return toHex(
			[0, 1, 2].map(c => lo.rgb[c]! + (hi.rgb[c]! - lo.rgb[c]!) * t) as Rgb,
		)
	}

	return toHex(last.rgb)
}

function withAlpha(hex: string, alpha: number) {
	return (
		hex +
		Math.round(alpha * 255)
			.toString(16)
			.padStart(2, '0')
	)
}

interface Roles {
	lowest: string
	lower: string
	low: string
	high: string
	higher: string
	highest: string

	onSurface: string
	onSurfaceVariant: string
	outline: string
	outlineVariant: string

	primary: string
	onPrimary: string
	primaryContainer: string
	onPrimaryContainer: string
	secondaryContainer: string
	onSecondaryContainer: string
	tertiary: string
}

// lowest -> highest
const SurfaceTones: Record<
	ThemeBase,
	[number, number, number, number, number, number]
> = {
	dark: [4, 6, 10, 12, 17, 22],
	darker: [2, 4, 6, 10, 14, 18],
	midnight: [0, 0, 4, 6, 10, 14],
	light: [90, 94, 96, 98, 99, 100],
}

interface Variant {
	surfaces: PaletteName
}

function rolesOf(
	base: ThemeBase,
	p: Record<PaletteName, TonalPalette>,
	{ surfaces }: Variant,
): Roles {
	const [lowest, lower, low, high, higher, highest] = SurfaceTones[base].map(
		tone => at(p[surfaces], tone),
	) as [string, string, string, string, string, string]

	const roles = { lowest, lower, low, high, higher, highest }

	if (base === 'light')
		return {
			...roles,
			onSurface: at(p.neutral1, 10),
			onSurfaceVariant: at(p.neutral2, 30),
			outline: at(p.neutral2, 50),
			outlineVariant: at(p.neutral2, 80),
			primary: at(p.accent1, 40),
			onPrimary: at(p.accent1, 100),
			primaryContainer: at(p.accent1, 90),
			onPrimaryContainer: at(p.accent1, 10),
			secondaryContainer: at(p.accent2, 90),
			onSecondaryContainer: at(p.accent2, 10),
			tertiary: at(p.accent3, 40),
		}

	return {
		...roles,
		onSurface: at(p.neutral1, 90),
		onSurfaceVariant: at(p.neutral2, 80),
		outline: at(p.neutral2, 60),
		outlineVariant: at(p.neutral2, 30),
		primary: at(p.accent1, 80),
		onPrimary: at(p.accent1, 20),
		primaryContainer: at(p.accent1, 30),
		onPrimaryContainer: at(p.accent1, 90),
		secondaryContainer: at(p.accent2, 30),
		onSecondaryContainer: at(p.accent2, 90),
		tertiary: at(p.accent3, 80),
	}
}

// unknown names are just ignored, so old and new token names can both live here
const SemanticRoles: Partial<Record<keyof Roles, string[]>> = {
	lowest: [
		'BACKGROUND_BASE_LOWEST',
		'BACKGROUND_TERTIARY',
		'BG_BASE_TERTIARY',
		'HOME_BACKGROUND',
	],
	lower: [
		'BACKGROUND_BASE_LOWER',
		'BACKGROUND_PRIMARY',
		'BACKGROUND_MOBILE_PRIMARY',
		'BG_BASE_PRIMARY',
		'CHAT_BACKGROUND',
	],
	low: [
		'BACKGROUND_BASE_LOW',
		'BACKGROUND_SECONDARY',
		'BACKGROUND_SECONDARY_ALT',
		'BACKGROUND_MOBILE_SECONDARY',
		'BG_BASE_SECONDARY',
		'CHANNEL_BACKGROUND_DEFAULT',
		'PANEL_BG',
		'MOBILE_KEYBOARD_PANEL_BACKGROUND',
	],
	high: [
		'BACKGROUND_SURFACE_HIGH',
		'BACKGROUND_CODE',
		'BG_SURFACE_RAISED',
		'CARD_BACKGROUND_DEFAULT',
		'CARD_PRIMARY_BG',
		'CHAT_INPUT_BACKGROUND',
		'CHAT_INPUT_CONTAINER_BACKGROUND',
		'INPUT_BACKGROUND_DEFAULT',
		'MOBILE_CHATINPUT_BACKGROUND_DEFAULT',
		'MOBILE_FLOATINGBAR_BACKGROUND',
	],
	higher: [
		'BACKGROUND_SURFACE_HIGHER',
		'BACKGROUND_NESTED_FLOATING',
		'CARD_SECONDARY_BG',
		'MOBILE_FLOATINGBAR_BACKGROUND_HIGHER',
	],
	highest: [
		'BACKGROUND_SURFACE_HIGHEST',
		'BACKGROUND_FLOATING',
		'BG_SURFACE_OVERLAY',
		'MODAL_BACKGROUND',
	],
	onSurface: [
		'TEXT_DEFAULT',
		'TEXT_NORMAL',
		'TEXT_STRONG',
		'HEADER_PRIMARY',
		'MOBILE_TEXT_HEADING_PRIMARY',
		'INTERACTIVE_ACTIVE',
		'INTERACTIVE_HOVER',
		'INTERACTIVE_TEXT_ACTIVE',
		'INTERACTIVE_TEXT_HOVER',
		'ICON_STRONG',
		'CHANNELS_ACTIVE',
	],
	onSurfaceVariant: [
		'TEXT_MUTED',
		'TEXT_SUBTLE',
		'HEADER_SECONDARY',
		'INTERACTIVE_NORMAL',
		'INTERACTIVE_TEXT_DEFAULT',
		'ICON_DEFAULT',
		'ICON_SUBTLE',
		'CHANNELS_DEFAULT',
		'CHANNEL_ICON',
	],
	outline: [
		'INTERACTIVE_MUTED',
		'ICON_MUTED',
		'TEXT_PLACEHOLDER',
		'BORDER_STRONG',
	],
	outlineVariant: [
		'BORDER_SUBTLE',
		'BORDER_FAINT',
		'BORDER_NORMAL',
		'CONTROL_SECONDARY_BORDER_DEFAULT',
	],
	primary: [
		'BACKGROUND_BRAND',
		'TEXT_BRAND',
		'TEXT_LINK',
		'ICON_BRAND',
		'CONTROL_BRAND_FOREGROUND',
		'CONTROL_BRAND_FOREGROUND_NEW',
		'CONTROL_PRIMARY_BACKGROUND_DEFAULT',
		'CONTROL_PRIMARY_BACKGROUND_HOVER',
		'CONTROL_PRIMARY_BACKGROUND_ACTIVE',
		'REDESIGN_BUTTON_PRIMARY_BACKGROUND',
		'REDESIGN_BUTTON_PRIMARY_PRESSED_BACKGROUND',
		'BUTTON_FILLED_BRAND_BACKGROUND',
		'MENTION_FOREGROUND',
	],
	onPrimary: [
		'CONTROL_PRIMARY_TEXT_DEFAULT',
		'CONTROL_PRIMARY_TEXT_HOVER',
		'CONTROL_PRIMARY_TEXT_ACTIVE',
		'REDESIGN_BUTTON_PRIMARY_TEXT',
		'BUTTON_FILLED_BRAND_TEXT',
	],
	secondaryContainer: [
		'CONTROL_SECONDARY_BACKGROUND_DEFAULT',
		'CONTROL_SECONDARY_BACKGROUND_HOVER',
		'CONTROL_SECONDARY_BACKGROUND_ACTIVE',
		'REDESIGN_BUTTON_SECONDARY_BACKGROUND',
	],
	onSecondaryContainer: [
		'CONTROL_SECONDARY_TEXT_DEFAULT',
		'CONTROL_SECONDARY_TEXT_HOVER',
		'CONTROL_SECONDARY_TEXT_ACTIVE',
		'REDESIGN_BUTTON_SECONDARY_TEXT',
	],
}

const TranslucentSemanticRoles: Record<string, [keyof Roles, number]> = {
	MENTION_BACKGROUND: ['primary', 0.16],
	BACKGROUND_MENTIONED: ['primary', 0.1],
	BACKGROUND_MENTIONED_HOVER: ['primary', 0.14],
	INFO_BOX_BACKGROUND: ['primary', 0.1],
}

const RawPalettes: [RegExp, PaletteName][] = [
	[/^(PRIMARY|NEUTRAL)_\d+$/, 'neutral1'],
	[/^(BRAND|BLURPLE)_\d+$/, 'accent1'],
]

const Bases: ThemeBase[] = ['dark', 'darker', 'midnight', 'light']

function buildColors(
	palettes: Palettes,
	discord: DiscordColors,
	variant: Variant,
): ThemeColors {
	const p = Object.fromEntries(
		Object.entries(palettes).map(([name, shades]) => [
			name,
			tonalPalette(shades),
		]),
	) as Record<PaletteName, TonalPalette>

	// swap discord's grays/blurple for system colors of the same tone
	const raw: Record<string, string> = {}
	for (const [name, value] of Object.entries(discord.raw)) {
		const palette = RawPalettes.find(([pattern]) => pattern.test(name))?.[1]
		if (!palette || !/^#[0-9a-f]{6}/i.test(value)) continue

		raw[name] = at(p[palette], toneOf(parseHex(value))) + value.slice(7)
	}

	const semantic: NonNullable<ThemeColors['semantic']> = {}
	for (const base of Bases) {
		const roles = rolesOf(base, p, variant)
		const colors: Record<string, string> = {}

		for (const [role, names] of Object.entries(SemanticRoles))
			for (const name of names!) colors[name] = roles[role as keyof Roles]

		for (const [name, [role, alpha]] of Object.entries(
			TranslucentSemanticRoles,
		))
			colors[name] = withAlpha(roles[role], alpha)

		semantic[base] = colors
	}

	return { raw, semantic }
}

let palettesJson: string | null = null

function readPalettes() {
	try {
		palettesJson = callNativeMethodSync(`${PluginId}.getPalettes`, [])
	} catch (e) {
		console.error(`[${PluginId}] Failed to read system palettes`, e)
		palettesJson = null
	}
	return palettesJson
}

function currentPalettes(): Palettes | undefined {
	return palettesJson ? JSON.parse(palettesJson) : undefined
}

const Variants: {
	id: string
	name: string
	description: string
	variant: Variant
}[] = [
	{
		id: 'system',
		name: 'Material You',
		description: 'Your system colors, with neutral surfaces.',
		variant: { surfaces: 'neutral1' },
	},
	{
		id: 'tinted',
		name: 'Material You (Tinted)',
		description: 'Your system colors, with surfaces tinted by your accent.',
		variant: { surfaces: 'neutral2' },
	},
]

function registerThemes(themes: ThemesApi) {
	for (const { id, name, description, variant } of Variants)
		themes.registerTheme(GroupId, id, {
			name,
			description,
			getColors: discord => {
				const palettes = currentPalettes()
				// android < 12
				return palettes ? buildColors(palettes, discord, variant) : {}
			},
		})
}

export default plugin({
	start({ themes, cleanup }) {
		themes.registerGroup(GroupId, {
			name: 'Material You',
			description: 'Colors from your Android system theme',
		})

		readPalettes()
		// re-registering re-applies the theme if it's selected
		registerThemes(themes)

		// wallpaper/palette may have changed while backgrounded
		const subscription = AppState.addEventListener('change', state => {
			if (state !== 'active') return

			const previous = palettesJson
			if (readPalettes() !== previous) registerThemes(themes)
		})
		cleanup(() => subscription.remove())
	},
})

declare module '@valenced/modules/native' {
	interface NativeMethods {
		'dim.material-you.getPalettes': [args: [], returnValue: string | null]
	}
}
