import 'dart:convert';
import 'package:flutter/material.dart' show TimeOfDay;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smart_schedule/data/api_handler.dart';
import 'package:smart_schedule/data/base_provider.dart';
import 'package:smart_schedule/models/field.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/models/timetables.dart';

class MobileDataProvider extends BaseProvider {
  final ApiHandler api;
  MobileDataProvider({required this.api});

  @override
  bool get isPersonalizationEnabled => true;

  @override
  Future<void> loadTeachers() async {
    setIsLoading(true);
    try {
      teachers = await api.fetchTeachers();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> selectTeacherAndLoadTimeTable(TeacherName teacher) async {
    selectedTeacher = teacher;
    setIsLoading(true);
    try {
      final TeacherTimeTable tt = await api.fetchTeacherTimeTable(
        teacher: teacher,
      );
      currentTimeTable = tt;
      subjects = _buildSubjectsFromEntries(tt.entries);
      await _persistPersonalizedIfStudent();
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> loadFields() async {
    setIsLoading(true);
    try {
      fields = await api.fetchFields();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> selectFieldYearAndLoadTimeTable({
    required Field field,
    required int year,
  }) async {
    selectedField = field;
    selectedYear = year;
    setIsLoading(true);
    try {
      final StudentTimeTable tt = await api.fetchStudentTimeTable(
        field: field,
        year: year,
      );
      currentTimeTable = tt;
      subjects = _buildSubjectsFromEntries(tt.entries);
      await _persistPersonalizedIfStudent();
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> loadFieldYearTimetables({
    required Field field,
    required int year,
  }) async {
    setIsLoading(true);
    try {
      fieldYearTimetables = await api.fetchFieldYearTimeTables(
        field: field,
        year: year,
      );
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  void addEntry(TimeTableEntry entry) {
    if (currentTimeTable == null) return;
    currentTimeTable!.addEntry(entry);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    _persistPersonalizedIfStudent();
    notifyListeners();
  }

  @override
  void removeEntry(int id) {
    if (currentTimeTable == null) return;
    currentTimeTable!.removeEntry(id);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    _persistPersonalizedIfStudent();
    notifyListeners();
  }

  @override
  void updateEntry(TimeTableEntry entry) {
    if (currentTimeTable == null) return;
    currentTimeTable!.updateEntry(entry);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    _persistPersonalizedIfStudent();
    notifyListeners();
  }

  @override
  void addSubject(Subject subject) {
    if (currentTimeTable == null) return;
    currentTimeTable!.addSubject(subject);
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    _persistPersonalizedIfStudent();
    notifyListeners();
  }

  @override
  void importFromTimeTable(TimeTable timetable) {
    currentTimeTable ??= TimeTable(entries: <TimeTableEntry>[]);
    for (final e in timetable.entries) {
      currentTimeTable!.addEntry(e);
    }
    subjects = _buildSubjectsFromEntries(currentTimeTable!.entries);
    _persistPersonalizedIfStudent();
    notifyListeners();
  }

  List<Subject> _buildSubjectsFromEntries(List<TimeTableEntry> entries) {
    final Map<String, List<TimeTableEntry>> byName =
        <String, List<TimeTableEntry>>{};
    for (final TimeTableEntry e in entries) {
      byName.putIfAbsent(e.subjectName, () => <TimeTableEntry>[]).add(e);
    }
    int idx = 0;
    return byName.entries
        .map(
          (MapEntry<String, List<TimeTableEntry>> en) =>
              Subject(name: en.key, id: idx++, entries: en.value),
        )
        .toList(growable: false);
  }

  Future<void> _persistPersonalizedIfStudent() async {
    if (isTeacher == false && currentTimeTable != null) {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final List<Map<String, dynamic>> serialized = currentTimeTable!.entries
          .map(
            (e) => <String, dynamic>{
              'id': e.id,
              'day': e.day.index,
              'sh': e.interval.start.hour,
              'sm': e.interval.start.minute,
              'eh': e.interval.end.hour,
              'em': e.interval.end.minute,
              'subject': e.subjectName,
              'teacher': e.teacher.name,
              'freq': e.frequency.index,
              'type': e.type.index,
              'room': e.room,
              'format': e.format,
            },
          )
          .toList();
      await prefs.setString('personal_timetable', jsonEncode(serialized));
    }
  }

  Future<void> restorePersonalizedIfAny() async {
    if (isTeacher == false) {
      final SharedPreferences prefs = await SharedPreferences.getInstance();
      final String? raw = prefs.getString('personal_timetable');
      if (raw != null) {
        final List<dynamic> list = jsonDecode(raw) as List<dynamic>;
        final entries = list.map((m) {
          final Map<String, dynamic> x = Map<String, dynamic>.from(m as Map);
          return TimeTableEntry(
            id: x['id'] as int,
            day: Day.values[x['day'] as int],
            interval: TimeInterval(
              start: TimeOfDay(hour: x['sh'] as int, minute: x['sm'] as int),
              end: TimeOfDay(hour: x['eh'] as int, minute: x['em'] as int),
            ),
            subjectName: x['subject'] as String,
            teacher: TeacherName(name: x['teacher'] as String),
            frequency: Frequency.values[x['freq'] as int],
            type: Type.values[x['type'] as int],
            room: x['room'] as String,
            format: x['format'] as String,
          );
        }).toList();
        currentTimeTable ??= TimeTable(entries: <TimeTableEntry>[]);
        currentTimeTable!.entries = entries;
        subjects = _buildSubjectsFromEntries(entries);
        notifyListeners();
      }
    }
  }
}

class WebDataProvider extends BaseProvider {
  final ApiHandler api;
  WebDataProvider({required this.api});

  @override
  bool get isPersonalizationEnabled => false;

  @override
  Future<void> loadTeachers() async {
    setIsLoading(true);
    try {
      teachers = await api.fetchTeachers();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> selectTeacherAndLoadTimeTable(TeacherName teacher) async {
    selectedTeacher = teacher;
    setIsLoading(true);
    try {
      final TeacherTimeTable tt = await api.fetchTeacherTimeTable(
        teacher: teacher,
      );
      currentTimeTable = tt;
      subjects = const <Subject>[]; // hidden on web
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> loadFields() async {
    setIsLoading(true);
    try {
      fields = await api.fetchFields();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> selectFieldYearAndLoadTimeTable({
    required Field field,
    required int year,
  }) async {
    selectedField = field;
    selectedYear = year;
    setIsLoading(true);
    try {
      final StudentTimeTable tt = await api.fetchStudentTimeTable(
        field: field,
        year: year,
      );
      currentTimeTable = tt;
      subjects = const <Subject>[]; // hidden on web
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  @override
  Future<void> loadFieldYearTimetables({
    required Field field,
    required int year,
  }) async {
    setIsLoading(true);
    try {
      fieldYearTimetables = await api.fetchFieldYearTimeTables(
        field: field,
        year: year,
      );
      notifyListeners();
    } finally {
      setIsLoading(false);
    }
  }

  // No-op mutations in web
  @override
  void addEntry(TimeTableEntry entry) {}
  @override
  void removeEntry(int id) {}
  @override
  void updateEntry(TimeTableEntry entry) {}
  @override
  void addSubject(Subject subject) {}

  @override
  void importFromTimeTable(TimeTable timetable) {}
}
