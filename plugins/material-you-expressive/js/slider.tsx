import { useEffect, useMemo, useRef, useState } from 'react'
import { PanResponder, StyleSheet, View } from 'react-native'
import { Roles, withAlpha } from './colors'
import type { ReactNode } from 'react'
import type { LayoutChangeEvent } from 'react-native'

interface SliderProps {
	step: number
	value: number
	minimumValue: number
	maximumValue: number
	onValueChange?(value: number): void
	onSlidingStart?(): void
	onSlidingComplete?(value: number): void
	startIcon?: ReactNode
	endIcon?: ReactNode
}

const Track = 16
const Handle = { width: 4, height: 44 }
const Gap = 6

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max)

/** M3 Expressive slider: a thick track split by a tall handle, with a stop at the end. */
export function M3Slider(props: SliderProps) {
	const { step, value, minimumValue, maximumValue, startIcon, endIcon } = props

	const [width, setWidth] = useState(0)
	const [current, setCurrent] = useState(value)

	// the responder is created once, so it reads everything through refs
	const latest = useRef({ props, width, current })
	latest.current = { props, width, current }
	const dragging = useRef(false)
	const startX = useRef(0)

	useEffect(() => {
		if (!dragging.current) setCurrent(value)
	}, [value])

	const responder = useMemo(() => {
		const valueAt = (x: number) => {
			const { props, width } = latest.current
			const { minimumValue: min, maximumValue: max, step } = props
			let next = min + clamp(x / (width || 1), 0, 1) * (max - min)
			if (step > 0) next = Math.round((next - min) / step) * step + min
			return clamp(next, min, max)
		}

		const update = (x: number) => {
			const next = valueAt(x)
			if (next === latest.current.current) return
			latest.current.current = next
			setCurrent(next)
			latest.current.props.onValueChange?.(next)
		}

		return PanResponder.create({
			onStartShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponder: () => true,
			onPanResponderTerminationRequest: () => false,
			onPanResponderGrant: event => {
				dragging.current = true
				startX.current = event.nativeEvent.locationX
				latest.current.props.onSlidingStart?.()
				update(startX.current)
			},
			onPanResponderMove: (_, gesture) => update(startX.current + gesture.dx),
			onPanResponderRelease: () => {
				dragging.current = false
				latest.current.props.onSlidingComplete?.(latest.current.current)
			},
			onPanResponderTerminate: () => {
				dragging.current = false
			},
		})
	}, [])

	const primary = Roles.primary()
	const inactive = withAlpha(primary, 0.24)

	const range = maximumValue - minimumValue || 1
	const x = clamp((current - minimumValue) / range, 0, 1) * width
	const nudge = (by: number) => {
		const next = clamp(
			current + by * (step || range / 100),
			minimumValue,
			maximumValue,
		)
		setCurrent(next)
		props.onValueChange?.(next)
		props.onSlidingComplete?.(next)
	}

	return (
		<View style={styles.row}>
			{startIcon}
			<View
				accessible
				accessibilityRole="adjustable"
				accessibilityValue={{
					min: minimumValue,
					max: maximumValue,
					now: current,
				}}
				accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
				onAccessibilityAction={event =>
					nudge(event.nativeEvent.actionName === 'increment' ? 1 : -1)
				}
				hitSlop={{ top: 8, bottom: 8 }}
				onLayout={(event: LayoutChangeEvent) =>
					setWidth(event.nativeEvent.layout.width)
				}
				style={styles.container}
				{...responder.panHandlers}
			>
				{width ? (
					<View pointerEvents="none" style={StyleSheet.absoluteFill}>
						<View
							style={[
								styles.track,
								styles.active,
								{ width: Math.max(x - Gap, 0), backgroundColor: primary },
							]}
						/>
						<View
							style={[
								styles.track,
								styles.inactive,
								{ left: Math.min(x + Gap, width), backgroundColor: inactive },
							]}
						/>
						<View style={[styles.stop, { backgroundColor: primary }]} />
						<View
							style={[
								styles.handle,
								{ left: x - Handle.width / 2, backgroundColor: primary },
							]}
						/>
					</View>
				) : null}
			</View>
			{endIcon}
		</View>
	)
}

const styles = StyleSheet.create({
	row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	container: { flex: 1, height: Handle.height },
	track: {
		position: 'absolute',
		top: (Handle.height - Track) / 2,
		height: Track,
	},
	active: {
		left: 0,
		borderTopLeftRadius: Track / 2,
		borderBottomLeftRadius: Track / 2,
		borderTopRightRadius: 2,
		borderBottomRightRadius: 2,
	},
	inactive: {
		right: 0,
		borderTopRightRadius: Track / 2,
		borderBottomRightRadius: Track / 2,
		borderTopLeftRadius: 2,
		borderBottomLeftRadius: 2,
	},
	stop: {
		position: 'absolute',
		right: (Track - 4) / 2,
		top: (Handle.height - 4) / 2,
		width: 4,
		height: 4,
		borderRadius: 2,
	},
	handle: {
		position: 'absolute',
		top: 0,
		width: Handle.width,
		height: Handle.height,
		borderRadius: Handle.width / 2,
	},
})
