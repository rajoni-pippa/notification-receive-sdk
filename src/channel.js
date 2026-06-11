

export function subscribeChannel(echo, channel, onNotify) {

    echo

        .private(channel)

        .listenToAll((event, data) => {

            if (event === '.notification.sent') {

                onNotify({
                    short_message: data.data?.short_message ?? '',
                    type: data.data?.type ?? 'general',
                    id: data.id,
                    raw: data,
                });
            }
        })

        .error((error) => {
            console.error('[NotificationService] Channel subscription error:', error);

            if (error?.status === 403) {
                console.warn(
                    '[NotificationService] Token expired or invalid. ' +
                    'Call NotificationService.init() again to reconnect.'
                );
            }
        });
}
