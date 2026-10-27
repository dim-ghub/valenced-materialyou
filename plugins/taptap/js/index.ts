import { Dispatcher } from '@valenced/discord/common/flux'
import { Stores } from '@valenced/discord/flux'
import { getModules } from '@valenced/modules/finders'
import { withProps } from '@valenced/modules/finders/filters'
import { registerJSMethod } from '@valenced/modules/native'

interface Message {
	id: string
	type: number
	content: string
	state?: string
	deleted?: boolean
	author: { id: string }
	hasFlag?(flag: number): boolean
}

interface Channel {
	id: string
	guild_id?: string | null
}

interface MessageActions {
	startEditMessage(channelId: string, messageId: string, content: string): void
}

interface MessageTypeConstants {
	MessageTypesSets: { REPLYABLE: Set<number> }
}

const EphemeralFlag = 1 << 6

const store = <T>(name: string) =>
	(Stores as Record<string, unknown>)[name] as T

let enabled = false
let messageActions: MessageActions | undefined
let messageTypes: MessageTypeConstants | undefined

function onDoubleTap(messageId: string) {
	if (!enabled) return

	const channelId = store<{ getChannelId(): string | null }>(
		'SelectedChannelStore',
	).getChannelId()
	if (!channelId) return

	const channel = store<{ getChannel(id: string): Channel | undefined }>(
		'ChannelStore',
	).getChannel(channelId)
	const message = store<{
		getMessage(channelId: string, messageId: string): Message | undefined
	}>('MessageStore').getMessage(channelId, messageId)
	if (!channel || !message || message.deleted) return

	const myId = store<{ getId(): string }>('AuthenticationStore').getId()

	if (message.author.id === myId) {
		if (message.state && message.state !== 'SENT') return
		messageActions?.startEditMessage(channelId, messageId, message.content)
		return
	}

	if (message.hasFlag?.(EphemeralFlag)) return
	if (
		messageTypes &&
		!messageTypes.MessageTypesSets.REPLYABLE.has(message.type)
	)
		return

	Dispatcher.dispatch({
		type: 'CREATE_PENDING_REPLY',
		channel,
		message,
		shouldMention: true,
		showMentionToggle: !!channel.guild_id,
	})
}

// native calls this whenever a message is double tapped
registerJSMethod('dim.taptap.doubleTap', onDoubleTap)

export default plugin({
	start({ cleanup }) {
		enabled = true

		cleanup(
			() => {
				enabled = false
			},
			getModules(withProps<MessageActions>('startEditMessage'), module => {
				messageActions = module
			}),
			getModules(
				withProps<MessageTypeConstants>('MessageTypesSets'),
				module => {
					messageTypes = module
				},
			),
		)
	},
})
