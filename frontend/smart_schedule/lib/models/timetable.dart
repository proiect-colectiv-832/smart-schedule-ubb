import 'package:flutter/material.dart';

enum Day { monday, tuesday, wednesday, thursday, friday, saturday, sunday }

class TimeInterval {
  final TimeOfDay start;
  final TimeOfDay end;

  TimeInterval({required this.start, required this.end});

  @override
  String toString() {
    return '${start.hour}:${start.minute} - ${end.hour}:${end.minute}';
  }
}

class Subject {
  final String name;
  final int id;
  List<TimeTableEntry> entries;
  Subject({required this.name, required this.id, required this.entries});
  @override
  String toString() {
    return entries.toString();
  }
}

class TeacherName {
  final String name;
  TeacherName({required this.name});
  @override
  String toString() {
    return name;
  }
}

enum Frequency { weekly, oddweeks, evenweeks }

enum Type { lecture, seminar, lab, other }

class TimeTableEntry {
  final int id;
  final Day day;
  final TimeInterval interval;
  final String subjectName;
  final TeacherName teacher;
  final Frequency frequency;
  final Type type;
  final String room;
  final String format;
  TimeTableEntry({
    required this.id,
    required this.day,
    required this.interval,
    required this.subjectName,
    required this.teacher,
    required this.frequency,
    required this.type,
    required this.room,
    required this.format,
  });
}

class TimeTable {
  List<TimeTableEntry> entries;
  TimeTable({required this.entries});
  void addEntry(TimeTableEntry entry) {
    entries.add(entry);
  }

  void removeEntry(int id) {
    entries.removeWhere((entry) => entry.id == id);
  }

  void updateEntry(TimeTableEntry entry) {
    entries.removeWhere((entry) => entry.id == entry.id);
    entries.add(entry);
  }

  List<TimeTableEntry> getEntries() {
    return entries;
  }

  TimeTableEntry getEntry(int id) {
    return entries.firstWhere((entry) => entry.id == id);
  }

  void addSubject(Subject subject) {
    for (var entry in subject.entries) {
      entries.add(entry);
    }
  }
}
