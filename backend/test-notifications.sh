#!/bin/bash

# Notifications API Test Script
# This script demonstrates all available notification endpoints

echo "=========================================="
echo "UBB Smart Schedule - Notifications API Tests"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"
USER_ID="student_123"

echo "1. Testing notification creation..."
NOTIFICATION_ID=$(curl -s -X POST "$BASE_URL/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "type": "schedule_change",
    "title": "Room Changed",
    "message": "Your Math class room has been changed from Room 101 to Room 205",
    "priority": "high",
    "data": {
      "subject": "Mathematics",
      "oldRoom": "Room 101",
      "newRoom": "Room 205"
    }
  }' | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])")

echo "✅ Created notification with ID: $NOTIFICATION_ID"
echo ""

echo "2. Creating multiple test notifications..."
curl -s -X POST "$BASE_URL/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "type": "new_course",
    "title": "New Course Available",
    "message": "A new programming course has been added to your curriculum",
    "priority": "normal"
  }' > /dev/null

curl -s -X POST "$BASE_URL/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "type": "reminder",
    "title": "Assignment Due",
    "message": "Your Data Structures assignment is due tomorrow",
    "priority": "urgent",
    "actionUrl": "/assignments/123",
    "actionText": "View Assignment"
  }' > /dev/null

echo "✅ Created additional notifications"
echo ""

echo "3. Testing get all notifications for user..."
curl -s "$BASE_URL/notifications?userId=$USER_ID" | python3 -m json.tool | head -30
echo ""
echo ""

echo "4. Testing notification statistics..."
curl -s "$BASE_URL/notifications/stats?userId=$USER_ID" | python3 -m json.tool
echo ""
echo ""

echo "5. Testing get specific notification..."
curl -s "$BASE_URL/notifications/$NOTIFICATION_ID" | python3 -m json.tool
echo ""
echo ""

echo "6. Testing mark as read..."
curl -s -X PUT "$BASE_URL/notifications/$NOTIFICATION_ID/read" | python3 -m json.tool
echo ""
echo ""

echo "7. Testing schedule change notification (convenience endpoint)..."
curl -s -X POST "$BASE_URL/notifications/schedule-change" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_ID'",
    "changeType": "time",
    "subject": "Physics Lab",
    "oldValue": "14:00-16:00",
    "newValue": "16:00-18:00",
    "date": "2025-11-05"
  }' | python3 -m json.tool
echo ""
echo ""

echo "8. Testing get unread notifications..."
curl -s "$BASE_URL/notifications?userId=$USER_ID&read=false" | python3 -m json.tool | head -20
echo ""
echo ""

echo "9. Testing mark all as read..."
curl -s -X PUT "$BASE_URL/notifications/read-all" \
  -H "Content-Type: application/json" \
  -d '{"userId": "'$USER_ID'"}' | python3 -m json.tool
echo ""
echo ""

echo "10. Testing final statistics..."
curl -s "$BASE_URL/notifications/stats?userId=$USER_ID" | python3 -m json.tool
echo ""
echo ""

echo "=========================================="
echo "All notification tests completed!"
echo "=========================================="
