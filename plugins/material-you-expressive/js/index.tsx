import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { forwardRef } from 'react'
import { M3Radio, M3Switch } from './controls'
import { segmented } from './groups'
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
				withProps<Exports>('FormRadio'),
				exports => replaceExport(exports, 'FormRadio', () => M3Radio, restores),
				// the design barrel and the module defining it
				{ max: 4 },
			),
		)
	},
})
