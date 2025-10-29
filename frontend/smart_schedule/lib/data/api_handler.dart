import 'package:flutter/material.dart';
import 'package:smart_schedule/models/field.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';

class ApiHandler {
  const ApiHandler();

  Future<List<TeacherName>> fetchTeachers() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    return <TeacherName>[
      TeacherName(name: 'Alice Johnson'),
      TeacherName(name: 'Bob Smith'),
      TeacherName(name: 'Carol Lee'),
    ];
  }

  Future<TeacherTimeTable> fetchTeacherTimeTable({
    required TeacherName teacher,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 500));
    final List<TimeTableEntry> entries = <TimeTableEntry>[
      TimeTableEntry(
        id: 1,
        day: Day.monday,
        interval: TimeInterval(
          start: const TimeOfDay(hour: 8, minute: 0),
          end: const TimeOfDay(hour: 10, minute: 0),
        ),
        subjectName: 'Algorithms',
        teacher: teacher,
        frequency: Frequency.weekly,
        type: Type.lecture,
        room: 'A101',
        format: 'On-site',
      ),
      TimeTableEntry(
        id: 2,
        day: Day.wednesday,
        interval: TimeInterval(
          start: const TimeOfDay(hour: 12, minute: 0),
          end: const TimeOfDay(hour: 14, minute: 0),
        ),
        subjectName: 'Data Structures',
        teacher: teacher,
        frequency: Frequency.weekly,
        type: Type.seminar,
        room: 'B203',
        format: 'On-site',
      ),
    ];
    return TeacherTimeTable(name: teacher, entries: entries);
  }

  Future<List<Field>> fetchFields() async {
    await Future<void>.delayed(const Duration(milliseconds: 400));
    return <Field>[
      Field(name: 'Computer Science', id: 1, years: <int>[1, 2, 3]),
      Field(name: 'Mathematics', id: 2, years: <int>[1, 2, 3]),
      Field(name: 'Physics', id: 3, years: <int>[1, 2, 3]),
    ];
  }

  Future<StudentTimeTable> fetchStudentTimeTable({
    required Field field,
    required int year,
  }) async {
    await Future<void>.delayed(const Duration(milliseconds: 600));
    final TeacherName placeholderTeacher = TeacherName(name: 'Staff');
    final List<TimeTableEntry> entries = <TimeTableEntry>[
      TimeTableEntry(
        id: 101,
        day: Day.tuesday,
        interval: TimeInterval(
          start: const TimeOfDay(hour: 10, minute: 0),
          end: const TimeOfDay(hour: 12, minute: 0),
        ),
        subjectName: 'Programming I',
        teacher: placeholderTeacher,
        frequency: Frequency.weekly,
        type: Type.lab,
        room: 'Lab 2',
        format: 'On-site',
      ),
      TimeTableEntry(
        id: 102,
        day: Day.thursday,
        interval: TimeInterval(
          start: const TimeOfDay(hour: 14, minute: 0),
          end: const TimeOfDay(hour: 16, minute: 0),
        ),
        subjectName: 'Linear Algebra',
        teacher: placeholderTeacher,
        frequency: Frequency.weekly,
        type: Type.lecture,
        room: 'C105',
        format: 'On-site',
      ),
    ];
    return StudentTimeTable(
      field: field,
      year: year,
      groupName: 'Group A',
      entries: entries,
    );
  }
}
