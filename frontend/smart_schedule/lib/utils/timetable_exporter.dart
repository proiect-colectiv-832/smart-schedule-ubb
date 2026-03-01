import 'dart:typed_data';
import 'dart:ui' as ui;

import 'dart:html' as html;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:smart_schedule/models/timetable.dart';


class TimetableExporter {
  
  static String generateMarkdownTable(List<TimeTableEntry> entries) {
    if (entries.isEmpty) {
      return '| Day | Hours | Frequency | Room | Format | Type | Subject | Teacher |\n'
          '|---------|---------|------------|-----------|------------|------------|----------------------------------------------|--------------------------------|\n'
          '| No entries | - | - | - | - | - | - | - |';
    }

    final StringBuffer buffer = StringBuffer();

    
    buffer.writeln(
      '| Day       | Hours   | Frequency  | Room      | Format      | Type       | Subject                                      | Teacher                       |',
    );
    buffer.writeln(
      '|-----------|---------|------------|-----------|------------|------------|----------------------------------------------|--------------------------------|',
    );

    
    final sortedEntries = List<TimeTableEntry>.from(entries)
      ..sort((a, b) {
        final dayCompare = a.day.index.compareTo(b.day.index);
        if (dayCompare != 0) return dayCompare;
        return a.interval.start.hour.compareTo(b.interval.start.hour);
      });

    
    for (final entry in sortedEntries) {
      final day = _formatDay(entry.day);
      final hours = _formatHours(entry.interval);
      final frequency = _formatFrequency(entry.frequency);
      final room = entry.room;
      final format = entry.format;
      final type = _formatType(entry.type);
      final subject = entry.subjectName;
      final teacher = entry.teacher.name;

      buffer.writeln(
        '| $day | $hours | $frequency | $room | $format | $type | $subject | $teacher |',
      );
    }

    return buffer.toString();
  }

  static String _formatDay(Day day) {
    switch (day) {
      case Day.monday:
        return 'Monday';
      case Day.tuesday:
        return 'Tuesday';
      case Day.wednesday:
        return 'Wednesday';
      case Day.thursday:
        return 'Thursday';
      case Day.friday:
        return 'Friday';
      case Day.saturday:
        return 'Saturday';
      case Day.sunday:
        return 'Sunday';
    }
  }

  static String _formatHours(TimeInterval interval) {
    final start =
        '${interval.start.hour.toString().padLeft(2, '0')}:${interval.start.minute.toString().padLeft(2, '0')}';
    final end =
        '${interval.end.hour.toString().padLeft(2, '0')}:${interval.end.minute.toString().padLeft(2, '0')}';
    return '$start-$end';
  }

  static String _formatFrequency(Frequency frequency) {
    switch (frequency) {
      case Frequency.weekly:
        return 'weekly';
      case Frequency.oddweeks:
        return 'odd weeks';
      case Frequency.evenweeks:
        return 'even weeks';
    }
  }

  static String _formatType(Type type) {
    switch (type) {
      case Type.lecture:
        return 'Lecture';
      case Type.seminar:
        return 'Seminar';
      case Type.lab:
        return 'Lab';
      case Type.other:
        return 'Other';
    }
  }

  
  static Future<void> exportAsPng({
    required GlobalKey repaintBoundaryKey,
    required String filename,
  }) async {
    if (!kIsWeb) {
      throw Exception('PNG export only supported on web');
    }

    try {
      
      final RenderRepaintBoundary boundary =
          repaintBoundaryKey.currentContext!.findRenderObject()!
              as RenderRepaintBoundary;

      
      final ui.Image image = await boundary.toImage(pixelRatio: 3.0);

      
      final ByteData? byteData = await image.toByteData(
        format: ui.ImageByteFormat.png,
      );

      if (byteData == null) {
        throw Exception('Failed to convert image to PNG');
      }

      final Uint8List pngBytes = byteData.buffer.asUint8List();

      
      final blob = html.Blob(<dynamic>[pngBytes], 'image/png');
      final url = html.Url.createObjectUrlFromBlob(blob);
      final anchor = html.AnchorElement(href: url)
        ..download = filename
        ..style.display = 'none';

      html.document.body?.append(anchor);
      anchor.click();
      anchor.remove();

      html.Url.revokeObjectUrl(url);
    } catch (e) {
      throw Exception('Error exporting timetable as PNG: $e');
    }
  }
}
