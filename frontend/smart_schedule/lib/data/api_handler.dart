import 'dart:convert';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:smart_schedule/models/field.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';
import 'package:smart_schedule/utils/platform_service.dart';

import 'dart:html' as html;

class ApiHandler {
  static const String baseUrl =
      'https://smart-schedule-ubb-production.up.railway.app';
  const ApiHandler();

  
  Day _parseDay(String dayStr) {
    switch (dayStr.toLowerCase()) {
      case 'monday':
        return Day.monday;
      case 'tuesday':
        return Day.tuesday;
      case 'wednesday':
        return Day.wednesday;
      case 'thursday':
        return Day.thursday;
      case 'friday':
        return Day.friday;
      case 'saturday':
        return Day.saturday;
      case 'sunday':
        return Day.sunday;
      default:
        return Day.monday;
    }
  }

  
  Frequency _parseFrequency(String freqStr) {
    switch (freqStr.toLowerCase()) {
      case 'weekly':
        return Frequency.weekly;
      case 'oddweeks':
        return Frequency.oddweeks;
      case 'evenweeks':
        return Frequency.evenweeks;
      default:
        return Frequency.weekly;
    }
  }

  
  Type _parseType(String typeStr) {
    switch (typeStr.toLowerCase()) {
      case 'lecture':
        return Type.lecture;
      case 'seminar':
        return Type.seminar;
      case 'lab':
        return Type.lab;
      case 'other':
        return Type.other;
      default:
        return Type.lecture;
    }
  }

  
  TimeTableEntry _parseTimeTableEntry(Map<String, dynamic> json) {
    final interval = json['interval'] as Map<String, dynamic>;
    final start = interval['start'] as Map<String, dynamic>;
    final end = interval['end'] as Map<String, dynamic>;

    return TimeTableEntry(
      id: json['id'] as int,
      day: _parseDay(json['day'] as String),
      interval: TimeInterval(
        start: TimeOfDay(
          hour: start['hour'] as int,
          minute: start['minute'] as int,
        ),
        end: TimeOfDay(hour: end['hour'] as int, minute: end['minute'] as int),
      ),
      subjectName: json['subjectName'] as String,
      teacher: TeacherName(name: json['teacher'] as String),
      frequency: _parseFrequency(json['frequency'] as String),
      type: _parseType(json['type'] as String),
      room: json['room'] as String? ?? '',
      format: json['format'] as String? ?? 'In-person',
    );
  }

  Map<String, dynamic> _serializeTimeOfDay(TimeOfDay time) {
    return <String, int>{'hour': time.hour, 'minute': time.minute};
  }

  Map<String, dynamic> _serializeTimeTableEntry(TimeTableEntry entry) {
    return <String, dynamic>{
      'id': entry.id,
      'day': entry.day.name,
      'interval': <String, dynamic>{
        'start': _serializeTimeOfDay(entry.interval.start),
        'end': _serializeTimeOfDay(entry.interval.end),
      },
      'subjectName': entry.subjectName,
      'teacher': entry.teacher.name,
      'frequency': entry.frequency.name,
      'type': entry.type.name,
      'room': entry.room,
      'format': entry.format,
    };
  }

  Future<List<TeacherName>> fetchTeachers() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/teachers'));

      if (response.statusCode == 200) {
        final List<dynamic> jsonList =
            jsonDecode(response.body) as List<dynamic>;
        return jsonList
            .map((json) => TeacherName(name: json['name'] as String))
            .toList();
      } else {
        throw Exception('Failed to load teachers: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching teachers: $e');
    }
  }

  Future<TeacherTimeTable> fetchTeacherTimeTable({
    required TeacherName teacher,
  }) async {
    try {
      final encodedTeacherName = Uri.encodeComponent(teacher.name);
      final response = await http.get(
        Uri.parse('$baseUrl/teacher/$encodedTeacherName/timetable'),
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> json =
            jsonDecode(response.body) as Map<String, dynamic>;
        final List<dynamic> entriesJson = json['entries'] as List<dynamic>;

        final List<TimeTableEntry> entries = entriesJson
            .map(
              (entryJson) =>
                  _parseTimeTableEntry(entryJson as Map<String, dynamic>),
            )
            .toList();

        return TeacherTimeTable(name: teacher, entries: entries);
      } else if (response.statusCode == 404) {
        
        return TeacherTimeTable(name: teacher, entries: <TimeTableEntry>[]);
      } else {
        throw Exception(
          'Failed to load teacher timetable: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error fetching teacher timetable: $e');
    }
  }

  Future<List<Field>> fetchFields() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/fields'));

      if (response.statusCode == 200) {
        final List<dynamic> jsonList =
            jsonDecode(response.body) as List<dynamic>;
        return jsonList
            .map(
              (json) => Field(
                id: json['id'] as int,
                name: json['name'] as String,
                years: (json['years'] as List<dynamic>)
                    .map((y) => y as int)
                    .toList(),
              ),
            )
            .toList();
      } else {
        throw Exception('Failed to load fields: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching fields: $e');
    }
  }

  Future<StudentTimeTable> fetchStudentTimeTable({
    required Field field,
    required int year,
  }) async {
    try {
      
      final timetables = await fetchFieldYearTimeTables(
        field: field,
        year: year,
      );

      
      if (timetables.isNotEmpty) {
        return timetables.first;
      } else {
        return StudentTimeTable(
          field: field,
          year: year,
          groupName: 'Unknown',
          entries: <TimeTableEntry>[],
        );
      }
    } catch (e) {
      throw Exception('Error fetching student timetable: $e');
    }
  }

  Future<List<StudentTimeTable>> fetchFieldYearTimeTables({
    required Field field,
    required int year,
  }) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/field/${field.id}/year/$year/timetables'),
      );

      if (response.statusCode == 200) {
        final List<dynamic> jsonList =
            jsonDecode(response.body) as List<dynamic>;
        return jsonList.map((json) {
          final fieldJson = json['field'] as Map<String, dynamic>;
          final fieldObj = Field(
            id: fieldJson['id'] as int,
            name: fieldJson['name'] as String,
            years: (fieldJson['years'] as List<dynamic>)
                .map((y) => y as int)
                .toList(),
          );

          final List<dynamic> entriesJson = json['entries'] as List<dynamic>;
          final List<TimeTableEntry> entries = entriesJson
              .map(
                (entryJson) =>
                    _parseTimeTableEntry(entryJson as Map<String, dynamic>),
              )
              .toList();

          return StudentTimeTable(
            field: fieldObj,
            year: json['year'] as int,
            groupName: json['groupName'] as String,
            entries: entries,
          );
        }).toList();
      } else if (response.statusCode == 404) {
        
        return <StudentTimeTable>[];
      } else {
        throw Exception(
          'Failed to load field/year timetables: ${response.statusCode}',
        );
      }
    } catch (e) {
      throw Exception('Error fetching field/year timetables: $e');
    }
  }

  Future<List<Subject>> fetchSubjects() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/subjects'));

      if (response.statusCode == 200) {
        final List<dynamic> jsonList =
            jsonDecode(response.body) as List<dynamic>;
        return jsonList.map((json) {
          final List<dynamic> entriesJson = json['entries'] as List<dynamic>;
          final List<TimeTableEntry> entries = entriesJson
              .map(
                (entryJson) =>
                    _parseTimeTableEntry(entryJson as Map<String, dynamic>),
              )
              .toList();

          return Subject(
            id: json['id'].toString(),
            name: json['name'] as String,
            entries: entries,
          );
        }).toList();
      } else {
        throw Exception('Failed to load subjects: ${response.statusCode}');
      }
    } catch (e) {
      throw Exception('Error fetching subjects: $e');
    }
  }

  Future<void> postUserTimetable({
    required String userId,
    required List<TimeTableEntry> entries,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/user-timetable'),
        headers: const <String, String>{'Content-Type': 'application/json'},
        body: jsonEncode(<String, dynamic>{
          'userId': userId,
          'entries': entries.map(_serializeTimeTableEntry).toList(),
        }),
      );

      if (response.statusCode >= 400) {
        throw Exception(
          'Failed to sync timetable: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      throw Exception('Error syncing user timetable: $e');
    }
  }

  
  
  
  Future<void> subscribeToCalendar(String userId) async {
    try {
      if (!kIsWeb) {
        throw Exception('Calendar subscription only supported on web/PWA');
      }

      if (PlatformService.isAndroid) {
        
        
        final icsUrl = '$baseUrl/icsfilesforusers/$userId.ics';

        
        
        html.window.open(icsUrl, '_blank');
      } else if (PlatformService.isIOS) {
        
        final webcalUrl = baseUrl.replaceFirst('https://', 'webcal://');
        final subscriptionUrl = '$webcalUrl/icsfilesforusers/$userId.ics';

        
        html.window.location.href = subscriptionUrl;
      } else {
        
        final webcalUrl = baseUrl.replaceFirst('https://', 'webcal://');
        final subscriptionUrl = '$webcalUrl/icsfilesforusers/$userId.ics';
        html.window.location.href = subscriptionUrl;
      }
    } catch (e) {
      throw Exception('Error subscribing to calendar: $e');
    }
  }
}
