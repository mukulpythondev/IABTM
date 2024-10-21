import Notification from '../models/notificationModel.js';
import { io } from '../../app.js'

async function createNotification(recipientId, type, content, relatedPost = null, senderId = null) {

    const notification = new Notification({
        recipient: recipientId,
        type,
        content,
        relatedPost,
        sender: senderId
    });
    await notification.save();

    if (type == "AGENCY_UPDATE") {
        io.emit('new_notification', notification.content)
    }
    else {
        io.to(recipientId.toString()).emit('new_notification', notification.content);
    }

    return notification;
}

export default createNotification