import { getAssetIdByName } from '@valenced/assets'
import { useEffect, useRef } from 'react'
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native'
import { Roles } from './colors'
import type { ViewProps } from 'react-native'

interface SwitchProps extends ViewProps {
	value: boolean
	onValueChange?(value: boolean): void
	disabled?: boolean
}

// not Animated.View: the plugin bundler rewrites `View` there too, since it's also imported
const AnimatedView = Animated.createAnimatedComponent(View)

const Track = { width: 52, height: 32, border: 2 }
// inside the border
const Inner = {
	width: Track.width - Track.border * 2,
	height: Track.height - Track.border * 2,
}
const Thumb = { off: 16, on: 24 }

export function M3Switch({
	value,
	onValueChange,
	disabled,
	style,
	...rest
}: SwitchProps) {
	const progress = useRef(new Animated.Value(value ? 1 : 0)).current

	useEffect(() => {
		Animated.spring(progress, {
			toValue: value ? 1 : 0,
			useNativeDriver: false,
			speed: 18,
			bounciness: 7,
		}).start()
	}, [value, progress])

	const primary = Roles.primary()
	const onPrimary = Roles.onPrimary()
	const outline = Roles.outline()
	const surface = Roles.surfaceHighest()

	const size = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [Thumb.off, Thumb.on],
	})
	const left = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [
			(Inner.height - Thumb.off) / 2,
			Inner.width - Thumb.on - (Inner.height - Thumb.on) / 2,
		],
	})
	const top = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [
			(Inner.height - Thumb.off) / 2,
			(Inner.height - Thumb.on) / 2,
		],
	})

	return (
		<Pressable
			{...rest}
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled }}
			disabled={disabled}
			hitSlop={8}
			onPress={() => onValueChange?.(!value)}
			style={[{ opacity: disabled ? 0.38 : 1 }, style]}
		>
			<AnimatedView
				style={[
					styles.track,
					{
						backgroundColor: progress.interpolate({
							inputRange: [0, 1],
							outputRange: [surface, primary],
						}),
						borderColor: progress.interpolate({
							inputRange: [0, 1],
							outputRange: [outline, primary],
						}),
					},
				]}
			>
				<AnimatedView
					style={[
						styles.thumb,
						{
							width: size,
							height: size,
							left,
							top,
							backgroundColor: progress.interpolate({
								inputRange: [0, 1],
								outputRange: [outline, onPrimary],
							}),
						},
					]}
				>
					<AnimatedView style={{ opacity: progress }}>
						<Image
							source={getAssetIdByName('CheckmarkSmallIcon')}
							style={[styles.check, { tintColor: primary }]}
						/>
					</AnimatedView>
				</AnimatedView>
			</AnimatedView>
		</Pressable>
	)
}

export function M3Radio({ selected }: { selected: boolean | null }) {
	const primary = Roles.primary()

	return (
		<View
			style={[
				styles.radio,
				{ borderColor: selected ? primary : Roles.onSurfaceVariant() },
			]}
		>
			{selected ? (
				<View style={[styles.dot, { backgroundColor: primary }]} />
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	track: {
		width: Track.width,
		height: Track.height,
		borderRadius: Track.height / 2,
		borderWidth: Track.border,
	},
	thumb: {
		position: 'absolute',
		borderRadius: Thumb.on,
		alignItems: 'center',
		justifyContent: 'center',
	},
	check: { width: 16, height: 16 },
	radio: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dot: { width: 10, height: 10, borderRadius: 5 },
})
