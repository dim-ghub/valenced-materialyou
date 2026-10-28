import { getModules } from '@valenced/modules/finders'
import { withName, withProps } from '@valenced/modules/finders/filters'
import { forwardRef } from 'react'
import { M3Radio, M3Switch } from './controls'
import { M3Fab } from './fab'
import { segmented } from './groups'
import { Inspector } from './inspector'
import { AccentTitle, tonalIcon } from './rows'
import {
	cardRow,
	largeTitle,
	pillButton,
	pillChatInput,
	pillTab,
	shapedGuild,
	tonalActions,
} from './screens'
import { M3Slider } from './slider'
import type { ComponentType } from 'react'

type Radii = Record<string, number>

// discord's corner sizes, moved up a step towards m3 expressive's rounder shapes
const Radii: Radii = { xs: 8, sm: 12, md: 16, lg: 24, xl: 28, xxl: 36 }
const Pill = 999

type Exports = Record<string, unknown>

/** Swaps a component on every module that exports it, keeping its static members (eg. `TableRow.Arrow`). */
function replaceExport(
	exports: Exports,
	name: string,
	wrap: (original: any) => ComponentType<any>,
	restores: (() => void)[],
) {
	const original = exports[name]
	const descriptor = Object.getOwnPropertyDescriptor(exports, name)
	if (!original || !descriptor?.writable) return

	const replacement = wrap(original) as unknown as Exports
	for (const key of Object.keys(original))
		if (/^[A-Z]/.test(key)) replacement[key] = (original as Exports)[key]

	exports[name] = replacement
	restores.push(() => {
		exports[name] = original
	})
}

/** Discord components found by name, each the default export of its own module. */
const ByName: [name: string, wrap: (original: any) => ComponentType<any>][] = [
	['BaseButton', pillButton],
	['BaseTextButton', pillButton],
	['PrivateChannelButtons', tonalActions],
	['ChannelActionButtons', tonalActions],
	['FloatingChatInputContainer', pillChatInput],
	['LeftAlignedHeaderTitle', largeTitle],
	['GenericHeaderTitle', largeTitle],
	['MessagesItemChannelBase', cardRow],
	['TabItem', pillTab],
	['ActionSheetRowGroup', segmented],
	['GuildsBarAnimatedItemWrapper', shapedGuild],
]

export default plugin({
	preInit({ cleanup, plugin: self }) {
		// discord builds styles once, so enabling this later only applies after a restart
		if (self.startedLate) self.requireReload()

		// before anything builds its styles from them
		cleanup(
			getModules(
				withProps<{
					default: { radii: Radii }
					RawColor: unknown
					SemanticColor: unknown
				}>('RawColor', 'SemanticColor'),
				tokens => {
					const radii = tokens.default.radii
					const original = { ...radii }
					Object.assign(radii, Radii)
					cleanup(() => Object.assign(radii, original))
				},
			),
		)
	},
	start({ cleanup }) {
		// run MaterialExpressiveInspector.start() from Eval JS
		const global = globalThis as {
			MaterialExpressiveInspector?: typeof Inspector
		}
		global.MaterialExpressiveInspector = Inspector
		cleanup(() => {
			Inspector.stop()
			delete global.MaterialExpressiveInspector
		})
	},
	init({ cleanup }) {
		const restores: (() => void)[] = []
		cleanup(() => {
			for (const restore of restores.splice(0)) restore()
		})

		// design/native.tsx, and the modules that define each component
		cleanup(
			getModules(withProps<Exports>('Button', 'TableRow'), exports =>
				replaceExport(
					exports,
					'Button',
					Button =>
						forwardRef((props: any, ref) => (
							<Button cornerRadius={Pill} {...props} ref={ref} />
						)),
					restores,
				),
			),
			getModules(
				withProps<Exports>('TableRowGroup'),
				exports => replaceExport(exports, 'TableRowGroup', segmented, restores),
				// the design barrel and the module defining it
				{ max: 4 },
			),
			getModules(
				withProps<Exports>('FormSwitch'),
				exports =>
					replaceExport(exports, 'FormSwitch', () => M3Switch, restores),
				// the design barrel and the module defining it
				{ max: 4 },
			),
			getModules(
				withProps<Exports>('TableRowGroupTitle'),
				exports =>
					replaceExport(
						exports,
						'TableRowGroupTitle',
						() => AccentTitle,
						restores,
					),
				{ max: 4 },
			),
			getModules(
				withProps<Exports>('TableRowIcon'),
				exports => replaceExport(exports, 'TableRowIcon', tonalIcon, restores),
				{ max: 4 },
			),
			// rows also reach their icon through TableRow.Icon
			getModules(
				withProps<{ TableRow: { Icon?: ComponentType<any> } }>('TableRow'),
				({ TableRow }) => {
					const original = TableRow.Icon
					if (!original) return
					TableRow.Icon = tonalIcon(original)
					restores.push(() => {
						TableRow.Icon = original
					})
				},
			),
			// discord's design modules also export each component's `...Props`, which tells them
			// apart from other libraries exporting the same name
			getModules(
				withProps<Exports>('Slider', 'SliderProps'),
				exports => replaceExport(exports, 'Slider', () => M3Slider, restores),
				{ max: 4 },
			),
			getModules(
				withProps<Exports>('FloatingActionButton', 'FloatingActionButtonProps'),
				exports =>
					replaceExport(exports, 'FloatingActionButton', () => M3Fab, restores),
				{ max: 4 },
			),
			...ByName.map(([name, wrap]) =>
				getModules(
					withName(name),
					exports => {
						const module = exports as unknown as Exports
						if (
							(module.default as { name?: string } | undefined)?.name === name
						)
							replaceExport(module, 'default', wrap, restores)
					},
					{ returnNamespace: true },
				),
			),
			// the newer row group, used by the main settings list
			getModules(
				withProps<Exports>('RowGroup', 'RowGroupProps'),
				exports => replaceExport(exports, 'RowGroup', segmented, restores),
				{ max: 4 },
			),
			getModules(
				withProps<Exports>('FormRadio'),
				exports => replaceExport(exports, 'FormRadio', () => M3Radio, restores),
				// the design barrel and the module defining it
				{ max: 4 },
			),
		)
	},
})
