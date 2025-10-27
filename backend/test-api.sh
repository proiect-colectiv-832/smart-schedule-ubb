#!/bin/bash

# UBB Timetable Parser API - Test Script
# This script demonstrates all available endpoints

echo "=================================="
echo "UBB Timetable Parser API - Tests"
echo "=================================="
echo ""

BASE_URL="http://localhost:3000"

echo "1. Testing root endpoint (API documentation)..."
curl -s "$BASE_URL/" | python3 -m json.tool
echo ""
echo ""

echo "2. Testing health check..."
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""
echo ""

echo "3. Testing example URLs endpoint..."
curl -s "$BASE_URL/example-urls" | python3 -m json.tool
echo ""
echo ""

echo "4. Testing parse endpoint (this will fetch and parse a real timetable)..."
echo "   URL: https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html"
curl -s "$BASE_URL/parse?url=https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html" | python3 -m json.tool | head -50
echo ""
echo "   (output truncated for brevity)"
echo ""
echo ""

echo "5. Testing parse-multiple endpoint..."
curl -s -X POST "$BASE_URL/parse-multiple" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.cs.ubbcluj.ro/files/orar/2025-1/tabelar/MIE3.html"
    ]
  }' | python3 -m json.tool | head -50
echo ""
echo "   (output truncated for brevity)"
echo ""
echo ""

echo "=================================="
echo "All tests completed!"
echo "=================================="

