#!/bin/bash

# Test script for Smart Schedule UBB Push Notifications API
# Make sure the server is running on localhost:3000

BASE_URL="http://localhost:3000"
USER_ID="test_student_123"

echo "=========================================="
echo "Smart Schedule UBB - Push Notifications API Tests"
echo "=========================================="

# Test 1: Get VAPID public key
echo "1. Testing VAPID public key endpoint..."
VAPID_RESPONSE=$(curl -s -X GET "$BASE_URL/push/vapid-public-key")
echo "$VAPID_RESPONSE" | jq '.'
echo ""

# Extract public key for later use
PUBLIC_KEY=$(echo "$VAPID_RESPONSE" | jq -r '.data.publicKey // empty')

if [ -z "$PUBLIC_KEY" ]; then
    echo "❌ Failed to get VAPID public key, skipping subscription tests"
    exit 1
fi

# Test 2: Register push subscription
echo "2. Testing push subscription registration..."
SUBSCRIPTION_DATA='{
  "userId": "'$USER_ID'",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-'$(date +%s)'",
    "keys": {
      "p256dh": "test-p256dh-key-'$(date +%s | base64)'",
      "auth": "test-auth-key-'$(date +%s | base64)'"
    }
  }
}'

SUBSCRIBE_RESPONSE=$(curl -s -X POST "$BASE_URL/push/subscribe" \
  -H "Content-Type: application/json" \
  -d "$SUBSCRIPTION_DATA")
echo "$SUBSCRIBE_RESPONSE" | jq '.'
echo ""

# Test 3: Get push statistics
echo "3. Testing push statistics endpoint..."
STATS_RESPONSE=$(curl -s -X GET "$BASE_URL/push/stats")
echo "$STATS_RESPONSE" | jq '.'
echo ""

# Test 4: Send push notification to specific user
echo "4. Testing send push notification to specific user..."
SEND_DATA='{
  "userIds": ["'$USER_ID'"],
  "notification": {
    "title": "🎓 Test Push Notification",
    "message": "This is a test push notification for the Smart Schedule UBB system",
    "type": "system",
    "priority": "normal",
    "data": {
      "testId": "push-test-'$(date +%s)'",
      "source": "api-test"
    },
    "actionUrl": "/notifications",
    "actionText": "View Details"
  },
  "pushPayload": {
    "icon": "/icons/test-icon.png",
    "requireInteraction": true,
    "actions": [
      {
        "action": "view",
        "title": "View Details"
      },
      {
        "action": "dismiss",
        "title": "Dismiss"
      }
    ]
  }
}'

SEND_RESPONSE=$(curl -s -X POST "$BASE_URL/push/send" \
  -H "Content-Type: application/json" \
  -d "$SEND_DATA")
echo "$SEND_RESPONSE" | jq '.'
echo ""

# Test 5: Broadcast notification
echo "5. Testing broadcast notification..."
BROADCAST_DATA='{
  "notification": {
    "title": "📢 System Announcement",
    "message": "This is a test broadcast message to all users",
    "type": "announcement",
    "priority": "high",
    "data": {
      "broadcastId": "broadcast-test-'$(date +%s)'",
      "source": "api-test"
    }
  },
  "pushPayload": {
    "icon": "/icons/broadcast-icon.png",
    "badge": "/icons/badge-icon.png",
    "vibrate": [200, 100, 200, 100, 200],
    "requireInteraction": false
  }
}'

BROADCAST_RESPONSE=$(curl -s -X POST "$BASE_URL/push/broadcast" \
  -H "Content-Type: application/json" \
  -d "$BROADCAST_DATA")
echo "$BROADCAST_RESPONSE" | jq '.'
echo ""

# Test 6: Test integration with schedule change notification
echo "6. Testing schedule change notification with push..."
SCHEDULE_CHANGE_DATA='{
  "userId": "'$USER_ID'",
  "changeType": "room",
  "subject": "Data Structures",
  "oldValue": "Room A101",
  "newValue": "Room B205",
  "date": "2025-11-04"
}'

SCHEDULE_RESPONSE=$(curl -s -X POST "$BASE_URL/notifications/schedule-change" \
  -H "Content-Type: application/json" \
  -d "$SCHEDULE_CHANGE_DATA")
echo "$SCHEDULE_RESPONSE" | jq '.'

# Extract notification ID and send as push
NOTIFICATION_ID=$(echo "$SCHEDULE_RESPONSE" | jq -r '.data.id // empty')

if [ ! -z "$NOTIFICATION_ID" ]; then
    echo "✅ Created schedule change notification: $NOTIFICATION_ID"
    
    # Get the notification details
    NOTIFICATION_DETAILS=$(curl -s -X GET "$BASE_URL/notifications/single/$NOTIFICATION_ID")
    
    # Send as push notification (this would normally be done automatically)
    echo "Sending schedule change as push notification..."
    PUSH_SCHEDULE_DATA='{
      "userIds": ["'$USER_ID'"],
      "notification": {
        "title": "🏫 Schedule Change",
        "message": "Your Data Structures class room has changed",
        "type": "schedule_change",
        "priority": "high"
      },
      "pushPayload": {
        "icon": "/icons/schedule-change.png",
        "requireInteraction": true,
        "vibrate": [200, 100, 200]
      }
    }'
    
    PUSH_SCHEDULE_RESPONSE=$(curl -s -X POST "$BASE_URL/push/send" \
      -H "Content-Type: application/json" \
      -d "$PUSH_SCHEDULE_DATA")
    echo "$PUSH_SCHEDULE_RESPONSE" | jq '.'
fi
echo ""

# Test 7: Final statistics
echo "7. Testing final push statistics..."
FINAL_STATS=$(curl -s -X GET "$BASE_URL/push/stats")
echo "$FINAL_STATS" | jq '.'
echo ""

# Test 8: Test error handling - invalid subscription
echo "8. Testing error handling with invalid subscription..."
INVALID_SUB_DATA='{
  "userId": "'$USER_ID'",
  "subscription": {
    "endpoint": "invalid-endpoint"
  }
}'

INVALID_RESPONSE=$(curl -s -X POST "$BASE_URL/push/subscribe" \
  -H "Content-Type: application/json" \
  -d "$INVALID_SUB_DATA")
echo "$INVALID_RESPONSE" | jq '.'
echo ""

# Test 9: Test WebSocket connection info
echo "9. Getting WebSocket connection information..."
echo "WebSocket endpoint: ws://localhost:3000/socket.io/"
echo "To test WebSocket connections, use a WebSocket client and connect to the endpoint above"
echo "Send authentication message: {\"userId\": \"$USER_ID\"}"
echo ""

echo "=========================================="
echo "Push Notifications API tests completed!"
echo "=========================================="

echo ""
echo "💡 Next Steps for Frontend Integration:"
echo "   1. Include Socket.IO client in your web app"
echo "   2. Register service worker for push notifications"
echo "   3. Use the provided client code examples"
echo "   4. Request notification permissions from users"
echo "   5. Test with real browser push subscriptions"
echo ""
echo "📱 Mobile Integration:"
echo "   - For Flutter: Use firebase_messaging plugin"
echo "   - For React Native: Use @react-native-firebase/messaging"
echo "   - For native apps: Integrate platform-specific push services"
echo ""
echo "🔧 Server Configuration:"
echo "   - Replace 'mailto:your-email@example.com' with your actual email in VAPID setup"
echo "   - Configure proper CORS settings for production"
echo "   - Set up HTTPS for production use (required for service workers)"
