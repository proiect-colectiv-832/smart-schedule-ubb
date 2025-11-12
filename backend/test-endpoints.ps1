# Test script for new frontend-compatible endpoints
$baseUrl = "http://localhost:3000"

Write-Host "=== Testing UBB Timetable API Endpoints ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: GET /teachers
Write-Host "1. Testing GET /teachers..." -ForegroundColor Yellow
try {
    $teachers = Invoke-RestMethod -Uri "$baseUrl/teachers" -Method Get
    Write-Host "   ✓ Success! Found $($teachers.Count) teachers" -ForegroundColor Green
    Write-Host "   Sample teachers:" -ForegroundColor Gray
    $teachers | Select-Object -First 3 | ForEach-Object { Write-Host "     - $($_.name)" -ForegroundColor Gray }
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: GET /fields
Write-Host "2. Testing GET /fields..." -ForegroundColor Yellow
try {
    $fields = Invoke-RestMethod -Uri "$baseUrl/fields" -Method Get
    Write-Host "   ✓ Success! Found $($fields.Count) fields" -ForegroundColor Green
    Write-Host "   Sample field:" -ForegroundColor Gray
    $field = $fields[0]
    Write-Host "     ID: $($field.id), Name: $($field.name), Years: $($field.years -join ', ')" -ForegroundColor Gray
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: GET /subjects
Write-Host "3. Testing GET /subjects..." -ForegroundColor Yellow
try {
    $subjects = Invoke-RestMethod -Uri "$baseUrl/subjects" -Method Get
    Write-Host "   ✓ Success! Found $($subjects.Count) subjects" -ForegroundColor Green
    Write-Host "   Sample subject:" -ForegroundColor Gray
    $subject = $subjects[0]
    Write-Host "     ID: $($subject.id), Name: $($subject.name), Entries: $($subject.entries.Count)" -ForegroundColor Gray
    if ($subject.entries.Count -gt 0) {
        $entry = $subject.entries[0]
        Write-Host "     First entry: Day=$($entry.day), Type=$($entry.type), Teacher=$($entry.teacher)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: GET /teacher/{teacherName}/timetable
Write-Host "4. Testing GET /teacher/{teacherName}/timetable..." -ForegroundColor Yellow
try {
    $teachers = Invoke-RestMethod -Uri "$baseUrl/teachers" -Method Get
    if ($teachers.Count -gt 0) {
        $teacherName = $teachers[0].name
        $encodedName = [System.Web.HttpUtility]::UrlEncode($teacherName)
        $timetable = Invoke-RestMethod -Uri "$baseUrl/teacher/$encodedName/timetable" -Method Get
        Write-Host "   ✓ Success! Teacher: $($timetable.teacherName)" -ForegroundColor Green
        Write-Host "     Entries: $($timetable.entries.Count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: GET /field/{fieldId}/year/{year}/timetables
Write-Host "5. Testing GET /field/{fieldId}/year/{year}/timetables..." -ForegroundColor Yellow
try {
    $fields = Invoke-RestMethod -Uri "$baseUrl/fields" -Method Get
    if ($fields.Count -gt 0) {
        $field = $fields[0]
        $year = $field.years[0]
        $timetables = Invoke-RestMethod -Uri "$baseUrl/field/$($field.id)/year/$year/timetables" -Method Get
        Write-Host "   ✓ Success! Found $($timetables.Count) group timetables" -ForegroundColor Green
        if ($timetables.Count -gt 0) {
            $tt = $timetables[0]
            Write-Host "     Sample: Group=$($tt.groupName), Entries=$($tt.entries.Count)" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "   ✗ Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Test Complete ===" -ForegroundColor Cyan

