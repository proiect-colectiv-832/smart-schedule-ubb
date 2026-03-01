import 'package:flutter/cupertino.dart';
import 'package:overlay_support/overlay_support.dart';
import 'package:smart_schedule/models/timetable.dart';
import 'package:smart_schedule/utils/platform_service.dart';
import 'package:smart_schedule/utils/timetable_exporter.dart';


class DownloadTimetableButton extends StatefulWidget {
  final List<TimeTableEntry> entries;
  final GlobalKey repaintBoundaryKey;

  const DownloadTimetableButton({
    required this.entries,
    required this.repaintBoundaryKey,
    super.key,
  });

  @override
  State<DownloadTimetableButton> createState() =>
      _DownloadTimetableButtonState();
}

class _DownloadTimetableButtonState extends State<DownloadTimetableButton> {
  bool _isGenerating = false;

  Future<void> _handleDownload() async {
    if (_isGenerating) return;

    setState(() {
      _isGenerating = true;
    });

    try {
      await TimetableExporter.exportAsPng(
        repaintBoundaryKey: widget.repaintBoundaryKey,
        filename: 'my_timetable.png',
      );
      toast('Timetable downloaded successfully!');
    } catch (e) {
      toast('Failed to download timetable: ${e.toString()}');
    } finally {
      if (mounted) {
        setState(() {
          _isGenerating = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    
    if (!PlatformService.isStandalonePwa) {
      return const SizedBox.shrink();
    }

    final bool isDisabled = widget.entries.isEmpty || _isGenerating;

    return CupertinoButton.filled(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 24),
      borderRadius: BorderRadius.circular(10),
      onPressed: isDisabled ? null : _handleDownload,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (_isGenerating)
            const CupertinoActivityIndicator(
              color: CupertinoColors.white,
              radius: 10,
            )
          else
            Icon(
              CupertinoIcons.arrow_down_circle,
              size: 20,
              color: widget.entries.isEmpty
                  ? CupertinoColors.systemGrey
                  : CupertinoColors.white,
            ),
          const SizedBox(width: 8),
          Text(
            _isGenerating ? 'Generating...' : 'Download as PNG',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: isDisabled
                  ? CupertinoColors.systemGrey
                  : CupertinoColors.white,
            ),
          ),
        ],
      ),
    );
  }
}
