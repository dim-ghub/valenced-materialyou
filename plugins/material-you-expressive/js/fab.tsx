import { Image, Pressable, StyleSheet } from 'react-native'
import { Roles } from './colors'

interface FabProps {
	icon: number
	onPress(): void
	disabled?: boolean
	positionBottom?: number
	accessibilityLabel?: string
}

const Size = 56
const Margin = 16

/** M3 floating action button: a rounded square in the accent color. */
export function M3Fab({
	icon,
	onPress,
	disabled,
	positionBottom,
	accessibilityLabel,
}: FabProps) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			disabled={disabled}
			onPress={onPress}
			style={({ pressed }) => [
				styles.fab,
				{
					bottom: positionBottom ?? Margin,
					backgroundColor: Roles.primary(),
					opacity: disabled ? 0.38 : 1,
					transform: [{ scale: pressed ? 0.94 : 1 }],
				},
			]}
		>
			<Image
				source={icon}
				style={[styles.icon, { tintColor: Roles.onPrimary() }]}
			/>
		</Pressable>
	)
}

const styles = StyleSheet.create({
	fab: {
		position: 'absolute',
		right: Margin,
		width: Size,
		height: Size,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 6,
	},
	icon: { width: 24, height: 24 },
})
