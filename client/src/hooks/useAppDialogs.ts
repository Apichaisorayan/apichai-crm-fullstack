import { useState } from 'react';

type NotificationType = 'success' | 'error' | 'loading';

interface NotificationConfig {
    title: string;
    description: string;
    type: NotificationType;
}

interface ConfirmConfig {
    title: string;
    description: string;
    action: (() => void) | null;
}

export function useAppDialogs() {
    // Confirm Dialog State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
        title: '',
        description: '',
        action: null,
    });

    // Notification Dialog State
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationConfig, setNotificationConfig] = useState<NotificationConfig>({
        title: '',
        description: '',
        type: 'success',
    });

    const showConfirm = (title: string, description: string, action: () => void) => {
        setConfirmConfig({ title, description, action });
        setConfirmOpen(true);
    };

    const showNotification = (title: string, description: string, type: NotificationType = 'success') => {
        setNotificationConfig({ title, description, type });
        setNotificationOpen(true);
    };

    const closeConfirm = () => setConfirmOpen(false);
    const closeNotification = () => setNotificationOpen(false);

    return {
        confirm: {
            isOpen: confirmOpen,
            setIsOpen: setConfirmOpen,
            title: confirmConfig.title,
            description: confirmConfig.description,
            action: confirmConfig.action,
            show: showConfirm,
            close: closeConfirm,
        },
        notification: {
            isOpen: notificationOpen,
            setIsOpen: setNotificationOpen,
            title: notificationConfig.title,
            description: notificationConfig.description,
            type: notificationConfig.type,
            show: showNotification,
            close: closeNotification,
        },
    };
}
