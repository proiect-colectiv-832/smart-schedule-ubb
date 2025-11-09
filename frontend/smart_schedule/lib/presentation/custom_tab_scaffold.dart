import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

class CustomTabScaffold extends StatefulWidget {
  final List<BottomNavigationBarItem> items;
  final IndexedWidgetBuilder tabBuilder;

  const CustomTabScaffold({
    super.key,
    required this.items,
    required this.tabBuilder,
  });

  @override
  State<CustomTabScaffold> createState() => _CustomTabScaffoldState();
}

class _CustomTabScaffoldState extends State<CustomTabScaffold> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: List.generate(
          widget.items.length,
          (index) => widget.tabBuilder(context, index),
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(
            top: BorderSide(color: CupertinoColors.separator, width: 0.5),
          ),
        ),
        child: SafeArea(
          child: Container(
            height: 80,
            padding: const EdgeInsets.only(bottom: 20),
            child: Row(
              children: List.generate(
                widget.items.length,
                (index) => Expanded(
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _currentIndex = index;
                      });
                    },
                    child: Container(
                      color: CupertinoColors.systemBackground,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            (widget.items[index].icon as Icon).icon,
                            size: 24,
                            color: _currentIndex == index
                                ? CupertinoColors.activeBlue
                                : CupertinoColors.inactiveGray,
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.items[index].label ?? '',
                            style: TextStyle(
                              fontSize: 10,
                              color: _currentIndex == index
                                  ? CupertinoColors.activeBlue
                                  : CupertinoColors.inactiveGray,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
