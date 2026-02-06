
import { getValidToken } from './googleOAuth';

/**
 * Deletes an event from Google Calendar
 */
export async function deleteGoogleEvent(userId: string, calendarId: string, eventId: string): Promise<boolean> {
    try {
        console.log(`🗑️ Attempting to delete Google Event: ${eventId} from calendar ${calendarId}`);
        const tokenData = await getValidToken(userId);

        if (!tokenData || !tokenData.access_token) {
            console.error('❌ No valid Google Token found for user', userId);
            return false;
        }

        const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        if (response.ok || response.status === 410) { // 410 = Already deleted
            console.log('✅ Google Event deleted successfully');
            return true;
        } else {
            const err = await response.json();
            console.error('❌ Failed to delete Google Event:', err);
            return false;
        }
    } catch (error) {
        console.error('❌ Error deleting Google Event:', error);
        return false;
    }
}
